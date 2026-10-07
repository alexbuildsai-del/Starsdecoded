/**
 * Each limit driven through an in-process app and a stub route, with no database (MB-49). The stub holds a write for each
 * report it is asked to pass, as the birth-time change does, and can answer after its reader has left. The writing chain
 * from routes/index.ts stands once ahead of a stub route, behind the real session; the breaker in it and the birth-time
 * route itself are proved end to end in the walk.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express, { type RequestHandler } from "express";

// The pool connects lazily; clientKey shares a module with the waitlist's queries. The router's modules read the key at
// import, and the breaker's read of the day's spend is refused, which lets a write through to the stub.
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.LOG_LEVEL = "silent";
// A forwarded address counts only on a call through our edge (ADR-224), so every hit that names one carries the edge's value,
// made up here and past the 32 characters the variable needs to count.
const EDGE = "edge-value-not-real-padded-to-length-x";
process.env.EDGE_PROXY_SECRET = EDGE;
const { LIMITS, LIMIT_LINES, buildLimits, holdWrites } = await import("./limits.js");
type LimitKind = import("./limits.js").LimitKind;

interface Hit {
  user?: string;
  session?: string;
  address?: string;
  answer?: number;
  /** Reports the stub passes, holding a write for each before any starts, as the birth-time change does. */
  reports?: number;
  /** The status the stub answers once its reader has left. */
  late?: number;
}

type Answer = { status: number; retryAfter: string | null; body: unknown };

function headersOf(h: Hit): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (h.user) headers["x-user"] = h.user;
  if (h.session) headers["x-session"] = h.session;
  if (h.address) {
    headers["x-vercel-forwarded-for"] = h.address;
    headers["x-edge-proxy-secret"] = EDGE;
  }
  if (h.answer) headers["x-answer"] = String(h.answer);
  if (h.reports !== undefined) headers["x-reports"] = String(h.reports);
  if (h.late) headers["x-late"] = String(h.late);
  return headers;
}

/**
 * The limits stand ahead of a stub route, as routes/index.ts stands them ahead of the real ones. The first stub takes the
 * place of the session and sign-in middleware; the route answers with the status a hit asks for, or, asked to hang, keeps
 * going after its reader leaves, as a route that has started writing does, and answers then if the hit asks it to.
 */
async function serve(handlers: RequestHandler[]) {
  let arrived = () => {};
  let left = () => {};
  let started = 0;
  const app = express();
  app.use((req, _res, next) => {
    req.userId = req.header("x-user") ?? null;
    req.sessionId = req.header("x-session") ?? "s-default";
    next();
  });
  const route: RequestHandler = async (req, res) => {
    const reports = req.header("x-reports");
    if (reports !== undefined) {
      if (!(await holdWrites(req, res, Number(reports)))) return;
      started += Number(reports);
    }
    if (req.header("x-hang")) {
      const late = req.header("x-late");
      res.once("close", () => {
        if (late) res.status(Number(late)).json({});
        left();
      });
      arrived();
      return;
    }
    res.status(Number(req.header("x-answer") ?? 201)).json({});
  };
  app.post("/limited", handlers, route);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/limited`;

  const hit = async (h: Hit = {}): Promise<Answer> => {
    const res = await fetch(url, { method: "POST", headers: headersOf(h), body: "{}" });
    return { status: res.status, retryAfter: res.headers.get("retry-after"), body: await res.json() };
  };
  const hangUp = async (h: Hit) => {
    const reached = new Promise<void>((resolve) => (arrived = resolve));
    const gone = new Promise<void>((resolve) => (left = resolve));
    const abort = new AbortController();
    const pending = fetch(url, { method: "POST", headers: { ...headersOf(h), "x-hang": "1" }, body: "{}", signal: abort.signal })
      .catch(() => null);
    await reached;
    abort.abort();
    await pending;
    await gone;
  };
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { hit, hangUp, close, started: () => started };
}

async function passes(times: number, hit: () => Promise<Answer>, expected = 201) {
  for (let i = 0; i < times; i++) assert.equal((await hit()).status, expected, `pass ${i + 1} of ${times}`);
}

async function refused(answer: Promise<Answer>, kind: LimitKind): Promise<number> {
  const { status, retryAfter, body } = await answer;
  assert.equal(status, 429);
  const seconds = Number(retryAfter);
  assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= LIMITS[kind].windowMs / 1000, `Retry-After: ${retryAfter}`);
  assert.deepEqual(body, { error: "rate_limited", message: LIMIT_LINES[kind], retryAfterSeconds: seconds });
  return seconds;
}

/** A signed-out write as a script sends it: no cookie, so a session of its own, and an address of its own choosing. */
function forged(n: number): Hit {
  return { session: `forged-${n}`, address: `203.0.113.${n}` };
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

test("writing: the 7th in an hour from one account answers 429 with Retry-After and its line; another account still writes", async () => {
  const app = await serve(buildLimits().generationLimits);
  try {
    await passes(6, () => app.hit({ user: "u1", session: "s1" }));
    await refused(app.hit({ user: "u1", session: "s1" }), "write");
    assert.equal((await app.hit({ user: "u2", session: "s2" })).status, 201);
  } finally {
    await app.close();
  }
});

test("writing: an account is one count in every browser it uses, and signed out the session is the count", async () => {
  const app = await serve(buildLimits().generationLimits);
  try {
    await passes(3, () => app.hit({ user: "u1", session: "s1" }));
    await passes(3, () => app.hit({ user: "u1", session: "s2" }));
    await refused(app.hit({ user: "u1", session: "s3" }), "write");
    await passes(6, () => app.hit({ session: "s1" }));
    await refused(app.hit({ session: "s1" }), "write");
    assert.equal((await app.hit({ session: "s4" })).status, 201);
  } finally {
    await app.close();
  }
});

test("writing: only what succeeded counts, since only that spends", async () => {
  const app = await serve(buildLimits().generationLimits);
  try {
    for (const answer of [400, 401, 404, 409, 500, 503]) {
      assert.equal((await app.hit({ user: "u1", answer })).status, answer);
    }
    await passes(6, () => app.hit({ user: "u1" }));
    await refused(app.hit({ user: "u1" }), "write");
  } finally {
    await app.close();
  }
});

test("writing: 20 a day from one address across sessions, then the address's line; another address still writes", async () => {
  const app = await serve(buildLimits().generationLimits);
  const address = "203.0.113.7";
  try {
    for (const session of ["a", "b", "c", "d"]) await passes(5, () => app.hit({ session, address }));
    const seconds = await refused(app.hit({ session: "e", address }), "writeDaily");
    assert.ok(seconds > LIMITS.write.windowMs / 1000, "the day's wait, not the hour's");
    assert.equal((await app.hit({ session: "e", address: "198.51.100.2" })).status, 201);
  } finally {
    await app.close();
  }
});

test("writing: a refusal by the hour gives the address's day its count back", async () => {
  const app = await serve(buildLimits().generationLimits);
  const address = "203.0.113.8";
  try {
    await passes(6, () => app.hit({ user: "u1", address }));
    await passes(5, () => app.hit({ user: "u1", address }), 429);
    await passes(5, () => app.hit({ session: "t1", address }));
    await passes(5, () => app.hit({ session: "t2", address }));
    await passes(4, () => app.hit({ session: "t3", address }));
    await refused(app.hit({ session: "t4", address }), "writeDaily");
  } finally {
    await app.close();
  }
});

test("writing: a reader who hangs up keeps the count, since the route may already be writing", async () => {
  const app = await serve(buildLimits().generationLimits);
  try {
    await app.hangUp({ user: "u1" });
    await passes(5, () => app.hit({ user: "u1" }));
    await refused(app.hit({ user: "u1" }), "write");
  } finally {
    await app.close();
  }
});

test("the geocoder and the preview: 60 a minute per address, an IPv6 reader's block counted as one, a search that found nothing too", async () => {
  for (const kind of ["geocode", "preview"] as const) {
    const limits = buildLimits();
    const app = await serve(kind === "geocode" ? limits.geocodeLimit : limits.previewLimit);
    try {
      await passes(5, () => app.hit({ address: "2001:db8:1:100::1", answer: 400 }), 400);
      await passes(30, () => app.hit({ address: "2001:db8:1:100::1" }));
      await passes(30, () => app.hit({ address: "2001:db8:1:1ff::2", answer: 404 }), 404);
      const seconds = await refused(app.hit({ address: "2001:db8:1:100::1" }), kind);
      assert.ok(seconds <= 60);
      assert.equal((await app.hit({ address: "2001:db8:2::1" })).status, 201);
      assert.equal((await app.hit({ address: "203.0.113.9" })).status, 201);
    } finally {
      await app.close();
    }
  }
});

test("sending: 10 an hour per account, whichever browser sends", async () => {
  const app = await serve(buildLimits().sendLimit);
  try {
    await passes(5, () => app.hit({ user: "u1", session: "s1" }));
    await passes(5, () => app.hit({ user: "u1", session: "s2" }));
    await refused(app.hit({ user: "u1", session: "s3" }), "send");
    assert.equal((await app.hit({ user: "u2", session: "s3" })).status, 201);
  } finally {
    await app.close();
  }
});

test("sharing your own report and Change address count with the sends: once an account's 10 have gone, routes/index.ts answers each with the send line before its route runs, and Share yours back, which sends nothing, takes no count (ADR-235, 237)", async (t) => {
  const { sendLimit } = await import("./limits.js");
  const { logger } = await import("./logger.js");
  const { default: router } = await import("../routes/index.js");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = req.header("x-user") || null;
    req.sessionId = "s-sends";
    req.log = logger;
    next();
  });
  // The very count the router stands ahead of every send, filled here by sends that went out.
  const sent: RequestHandler = (_req, res) => void res.status(201).json({});
  app.post("/sent", sendLimit, sent);
  app.use("/api", router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = async (path: string, body: unknown, user = "user_sharer"): Promise<Answer> => {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user": user },
      body: JSON.stringify(body),
    });
    return { status: res.status, retryAfter: res.headers.get("retry-after"), body: await res.json() };
  };

  await passes(LIMITS.send.limit, () => post("/sent", {}));
  for (const path of ["/api/shares", "/api/invites/i-1/change-address", "/api/gifts/g-1/change-address", "/api/invites", "/api/gifts"]) {
    await refused(post(path, { email: "sam@example.com", profileId: "p-1", recipientName: "Sam" }), "send");
  }
  assert.equal((await post("/api/shares/back", {})).status, 400, "Share yours back answers for itself, past a full send count");
  assert.equal((await post("/api/shares", { email: "not-an-email" }, "user_other")).status, 400, "another account's count is its own");
});

test("Ask: 6 messages a minute per account, the 7th hears Ask's line, another account still asks", async () => {
  const app = await serve(buildLimits().askLimit);
  try {
    await passes(3, () => app.hit({ user: "u1", session: "s1" }));
    await passes(3, () => app.hit({ user: "u1", session: "s2" }));
    const seconds = await refused(app.hit({ user: "u1", session: "s3" }), "ask");
    assert.ok(seconds <= 60, `a minute's wait at most, Retry-After ${seconds}`);
    assert.equal((await app.hit({ user: "u2", session: "s1" })).status, 201);
  } finally {
    await app.close();
  }
});

test("Ask: a message that cost nothing gives its count back, the month's cap, a body Ask cannot take and a pause among them", async () => {
  const app = await serve(buildLimits().askLimit);
  try {
    for (const answer of [400, 403, 409, 429, 500, 503]) assert.equal((await app.hit({ user: "u1", answer })).status, answer, `${answer}`);
    await passes(LIMITS.ask.limit, () => app.hit({ user: "u1" }));
    await refused(app.hit({ user: "u1" }), "ask");
  } finally {
    await app.close();
  }
});

test("a new Timeline reading: 20 a minute per account, then its line; a key that names no reading gives its count back", async () => {
  const app = await serve(buildLimits().timelineReadingLimit);
  try {
    await passes(5, () => app.hit({ user: "u1", answer: 404 }), 404);
    await passes(LIMITS.timelineReading.limit, () => app.hit({ user: "u1" }));
    const seconds = await refused(app.hit({ user: "u1" }), "timelineReading");
    assert.ok(seconds <= 60, `a minute's wait at most, Retry-After ${seconds}`);
    assert.equal((await app.hit({ user: "u2" })).status, 201);
  } finally {
    await app.close();
  }
});

test("Now and ahead: 30 reads a minute per account in any browser, then its line; a read that cost nothing gives its count back", async () => {
  const app = await serve(buildLimits().timelineNowLimit);
  try {
    for (const answer of [400, 403, 409, 500]) assert.equal((await app.hit({ user: "u1", answer })).status, answer, `${answer}`);
    const half = Math.floor(LIMITS.timelineNow.limit / 2);
    await passes(half, () => app.hit({ user: "u1", session: "s1" }));
    await passes(LIMITS.timelineNow.limit - half, () => app.hit({ user: "u1", session: "s2" }));
    const seconds = await refused(app.hit({ user: "u1", session: "s3" }), "timelineNow");
    assert.ok(seconds <= 60, `a minute's wait at most, Retry-After ${seconds}`);
    assert.equal((await app.hit({ user: "u2", session: "s1" })).status, 201);
  } finally {
    await app.close();
  }
});

test("Ask's, the readings' and Now and ahead's counts are each their own, and none draws on writing's", async () => {
  const limits = buildLimits();
  const asking = await serve(limits.askLimit);
  const reading = await serve(limits.timelineReadingLimit);
  const viewing = await serve(limits.timelineNowLimit);
  const writing = await serve(limits.generationLimits);
  try {
    await passes(LIMITS.ask.limit, () => asking.hit({ user: "u1" }));
    await refused(asking.hit({ user: "u1" }), "ask");
    await passes(LIMITS.timelineNow.limit, () => viewing.hit({ user: "u1" }));
    await refused(viewing.hit({ user: "u1" }), "timelineNow");
    assert.equal((await reading.hit({ user: "u1" })).status, 201);
    assert.equal((await writing.hit({ user: "u1" })).status, 201);
  } finally {
    await Promise.all([asking.close(), reading.close(), viewing.close(), writing.close()]);
  }
});

test("Ask's minute: the last second inside it still refuses, the first after it lets the reader ask again", async (t) => {
  const start = Date.parse("2026-10-04T12:00:00Z");
  t.mock.timers.enable({ apis: ["Date"], now: start });
  const app = await serve(buildLimits().askLimit);
  try {
    await passes(LIMITS.ask.limit, () => app.hit({ user: "u1" }));
    t.mock.timers.setTime(start + LIMITS.ask.windowMs - 1_000);
    await refused(app.hit({ user: "u1" }), "ask");
    t.mock.timers.setTime(start + LIMITS.ask.windowMs + 1);
    await passes(LIMITS.ask.limit, () => app.hit({ user: "u1" }));
    await refused(app.hit({ user: "u1" }), "ask");
  } finally {
    await app.close();
  }
});

test("Ask's, the readings', Now and ahead's and setup's lines: a minute's window the page leaves as written, never restated as a time", () => {
  assert.equal(LIMIT_LINES.ask, "You've sent Ask 6 messages in the last minute. Try again in a minute.");
  assert.equal(LIMIT_LINES.timelineReading, "You've opened 20 new readings in the last minute. Try again in a minute.");
  assert.equal(LIMIT_LINES.timelineNow, "You've loaded your Timeline 30 times in the last minute. Try again in a minute.");
  assert.equal(LIMIT_LINES.timelineSetup, "You've loaded your Timeline setup 30 times in the last minute. Try again in a minute.");
  for (const kind of ["ask", "timelineReading", "timelineNow", "timelineSetup"] as const) {
    assert.equal(LIMITS[kind].windowMs, MINUTE_MS);
    assert.equal(LIMITS[kind].by, "account");
    assert.doesNotMatch(LIMIT_LINES[kind], / within (?:the hour|a day)\.$/, "the web turns only an hour's or a day's window into a time");
  }
});

test("checkout: 10 an hour per account, whichever browser starts it, so a fresh session never starts the count again (R13-08)", async () => {
  const app = await serve(buildLimits().checkoutLimit);
  try {
    await passes(5, () => app.hit({ user: "u1", session: "s1" }));
    await passes(5, () => app.hit({ user: "u1", session: "s2" }));
    await refused(app.hit({ user: "u1", session: "s3" }), "checkout");
    assert.equal((await app.hit({ user: "u2", session: "s3" })).status, 201, "another account keeps its own count");
    assert.equal(LIMITS.checkout.by, "account");
  } finally {
    await app.close();
  }
});

test("the billing page: 10 an hour per account in any browser, its own line, and a count apart from checkout's", async () => {
  const limits = buildLimits();
  const buying = await serve(limits.checkoutLimit);
  const billing = await serve(limits.portalLimit);
  try {
    await passes(LIMITS.checkout.limit, () => buying.hit({ user: "u1" }));
    await refused(buying.hit({ user: "u1" }), "checkout");
    await passes(5, () => billing.hit({ user: "u1", session: "s1" }));
    await passes(5, () => billing.hit({ user: "u1", session: "s2" }));
    await refused(billing.hit({ user: "u1", session: "s3" }), "portal");
    assert.equal(
      LIMIT_LINES.portal,
      "You've opened your billing page 10 times in the last hour. You can open it again within the hour.",
    );
  } finally {
    await Promise.all([buying.close(), billing.close()]);
  }
});

test("buying and the billing page as routes/index.ts stands them: signed out hears 401 and is never counted, and an account's 11th hears 429 before its route runs", async (t) => {
  const { buying, billing } = await import("../routes/index.js");
  const { BUY_SIGN_IN_LINE, PORTAL_SIGN_IN_LINE } = await import("../routes/payments.js");
  const app = express();
  app.use((req, _res, next) => {
    req.userId = req.header("x-user") || null;
    req.sessionId = "s-buyer";
    next();
  });
  let reached = 0;
  const started: RequestHandler = (_req, res) => void (reached++, res.status(201).json({}));
  app.post("/api/checkout", buying, started);
  app.post("/api/billing/portal", billing, started);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = async (path: string, user?: string): Promise<Answer> => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (user) headers["x-user"] = user;
    const res = await fetch(`${base}${path}`, { method: "POST", headers, body: "{}" });
    return { status: res.status, retryAfter: res.headers.get("retry-after"), body: await res.json() };
  };

  for (const [path, line, kind] of [
    ["/api/checkout", BUY_SIGN_IN_LINE, "checkout"],
    ["/api/billing/portal", PORTAL_SIGN_IN_LINE, "portal"],
  ] as const) {
    for (let i = 0; i < LIMITS[kind].limit + 5; i++) {
      assert.deepEqual(await post(path), { status: 401, retryAfter: null, body: { error: "sign_in_required", message: line } });
    }
    await passes(LIMITS[kind].limit, () => post(path, "user_buyer"));
    await refused(post(path, "user_buyer"), kind);
  }
  assert.equal(reached, LIMITS.checkout.limit + LIMITS.portal.limit, "no refusal reached the route");
});

test("Timeline's setup as routes/index.ts stands it: its three routes share 30 a minute per account in any browser, the 31st hears its line before the route runs, and signed out goes on uncounted to the route's own 401", async (t) => {
  const { settingUp } = await import("../routes/index.js");
  // The admin has Timeline with no table read, so the access check ahead of the count passes here without a database.
  const admin = "user_setup_admin";
  const before = process.env.ADMIN_USER_ID;
  process.env.ADMIN_USER_ID = admin;
  const app = express();
  app.use((req, _res, next) => {
    req.userId = req.header("x-user") || null;
    req.sessionId = req.header("x-session") || "s-setup";
    next();
  });
  let reached = 0;
  const setup: RequestHandler = (req, res) => {
    reached++;
    if (!req.userId) return void res.status(401).json({ error: "sign_in_required" });
    res.status(Number(req.header("x-answer") ?? 200)).json({});
  };
  // The chain on routes of its own ahead of the route's, as the index router stands ahead of Timeline's, so a request
  // it lets go on reaches the route.
  app.get("/api/timeline/setup", settingUp);
  app.post("/api/timeline/setup", settingUp);
  app.post("/api/timeline/setup/replay-seen", settingUp);
  app.get("/api/timeline/setup", setup);
  app.post("/api/timeline/setup", setup);
  app.post("/api/timeline/setup/replay-seen", setup);
  const routes = [["GET", "/api/timeline/setup"], ["POST", "/api/timeline/setup"], ["POST", "/api/timeline/setup/replay-seen"]] as const;
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    if (before === undefined) delete process.env.ADMIN_USER_ID;
    else process.env.ADMIN_USER_ID = before;
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const hit = async (at: number, h: { user?: string; session?: string; answer?: number } = {}): Promise<Answer> => {
    const [method, path] = routes[at % routes.length];
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (h.user) headers["x-user"] = h.user;
    if (h.session) headers["x-session"] = h.session;
    if (h.answer) headers["x-answer"] = String(h.answer);
    const res = await fetch(`${base}${path}`, { method, headers, body: method === "GET" ? undefined : "{}" });
    return { status: res.status, retryAfter: res.headers.get("retry-after"), body: await res.json() };
  };

  const limit = LIMITS.timelineSetup.limit;
  for (let i = 0; i < limit + 6; i++) assert.equal((await hit(i)).status, 401, `signed out ${i + 1}`);
  for (let i = 0; i < 3; i++) assert.equal((await hit(i, { user: admin, answer: 409 })).status, 409, "no Personal report costs nothing");
  let n = 0;
  const half = Math.floor(limit / 2);
  await passes(half, () => hit(n++, { user: admin, session: "s1" }), 200);
  await passes(limit - half, () => hit(n++, { user: admin, session: "s2" }), 200);
  const seen = reached;
  for (let i = 0; i < routes.length; i++) {
    const seconds = await refused(hit(i, { user: admin, session: "s3" }), "timelineSetup");
    assert.ok(seconds <= 60, `a minute's wait at most, Retry-After ${seconds}`);
  }
  assert.equal(reached, seen, "no refusal reached the route");
  assert.equal(seen, limit + 6 + 3 + limit, "every signed-out request went on to the route");

  const other = "user_setup_other";
  process.env.ADMIN_USER_ID = other;
  assert.equal((await hit(0, { user: other, session: "s3" })).status, 200, "another account keeps its own count");
});

test("each kind has its own line: what happened with the number its limit counts, then when, and never the time left", () => {
  const kinds = Object.keys(LIMITS) as LimitKind[];
  assert.equal(new Set(kinds.map((kind) => LIMIT_LINES[kind])).size, kinds.length);
  for (const kind of kinds) {
    const line = LIMIT_LINES[kind];
    assert.match(line, new RegExp(`\\b${LIMITS[kind].limit}\\b`), kind);
    assert.equal(line.split(/(?<=\.) /).length, 2, kind);
    assert.doesNotMatch(line, /\d+\s*(second|minute|hour|day)s?\b/i, kind);
    assert.doesNotMatch(line, /[—;!]/, kind);
  }
});

test("sending and checkout: an answer that cost nothing gives its count back, so only what went out is counted", async () => {
  for (const [name, handlers, kind] of [
    ["send", buildLimits().sendLimit, "send"],
    ["checkout", buildLimits().checkoutLimit, "checkout"],
  ] as const) {
    const app = await serve(handlers);
    try {
      for (const answer of [400, 401, 403, 404, 409, 500, 503]) {
        assert.equal((await app.hit({ user: "u1", session: "s1", answer })).status, answer, `${name} ${answer}`);
      }
      await passes(10, () => app.hit({ user: "u1", session: "s1" }));
      await refused(app.hit({ user: "u1", session: "s1" }), kind);
    } finally {
      await app.close();
    }
  }
});

test("a refused request does not extend the wait: hammering a limit leaves its Retry-After no longer", async () => {
  const app = await serve(buildLimits().checkoutLimit);
  try {
    await passes(10, () => app.hit({ session: "s1" }));
    const first = await refused(app.hit({ session: "s1" }), "checkout");
    for (let i = 0; i < 5; i++) await refused(app.hit({ session: "s1" }), "checkout");
    const last = await refused(app.hit({ session: "s1" }), "checkout");
    assert.ok(last <= first, `Retry-After grew from ${first} to ${last}`);
  } finally {
    await app.close();
  }
});

test("an account's count and a session's count never meet, even when their ids are the same string", async () => {
  const app = await serve(buildLimits().generationLimits);
  try {
    await passes(6, () => app.hit({ user: "same-id", session: "x" }));
    await refused(app.hit({ user: "same-id", session: "x" }), "write");
    assert.equal((await app.hit({ session: "same-id" })).status, 201, "a signed-out session named like the account is another count");
  } finally {
    await app.close();
  }
});

test("each limit keeps its own count: writing, sending and the geocoder do not draw on one another", async () => {
  const limits = buildLimits();
  const writing = await serve(limits.generationLimits);
  const sending = await serve(limits.sendLimit);
  const geocoding = await serve(limits.geocodeLimit);
  try {
    await passes(6, () => writing.hit({ user: "u1", address: "203.0.113.20" }));
    await refused(writing.hit({ user: "u1", address: "203.0.113.20" }), "write");
    assert.equal((await sending.hit({ user: "u1", address: "203.0.113.20" })).status, 201);
    assert.equal((await geocoding.hit({ user: "u1", address: "203.0.113.20" })).status, 201);
  } finally {
    await Promise.all([writing.close(), sending.close(), geocoding.close()]);
  }
});

test("a fresh set of limits starts from nothing: a test's counts never leak into the server's", async () => {
  const one = await serve(buildLimits().checkoutLimit);
  const two = await serve(buildLimits().checkoutLimit);
  try {
    await passes(10, () => one.hit({ session: "s1" }));
    await refused(one.hit({ session: "s1" }), "checkout");
    assert.equal((await two.hit({ session: "s1" })).status, 201);
  } finally {
    await Promise.all([one.close(), two.close()]);
  }
});

test("the window: the last second inside it still refuses, the first one after it lets the reader write again", async (t) => {
  const start = Date.parse("2026-10-01T12:00:00Z");
  t.mock.timers.enable({ apis: ["Date"], now: start });
  const app = await serve(buildLimits().generationLimits);
  try {
    await passes(6, () => app.hit({ user: "u1" }));
    t.mock.timers.setTime(start + 30 * 60_000);
    const half = await refused(app.hit({ user: "u1" }), "write");
    assert.ok(half >= 1799 && half <= 1801, `half an hour left, Retry-After ${half}`);
    t.mock.timers.setTime(start + LIMITS.write.windowMs - 1_000);
    await refused(app.hit({ user: "u1" }), "write");
    t.mock.timers.setTime(start + LIMITS.write.windowMs + 1);
    assert.equal((await app.hit({ user: "u1" })).status, 201);
    await passes(5, () => app.hit({ user: "u1" }));
    await refused(app.hit({ user: "u1" }), "write");
  } finally {
    await app.close();
  }
});

test("signed out: every session and address shares 24 writes an hour, the 25th hears its line, and accounts never draw on it", async () => {
  const limits = buildLimits();
  const app = await serve([...limits.anonWriteLimit, ...limits.generationLimits]);
  try {
    for (let i = 1; i <= 6; i++) assert.equal((await app.hit({ user: `u${i}`, ...forged(100 + i) })).status, 201, `account ${i}`);
    for (let i = 1; i <= 24; i++) assert.equal((await app.hit(forged(i))).status, 201, `signed-out write ${i}`);
    await refused(app.hit(forged(25)), "anonWrites");
    assert.equal((await app.hit({ user: "u7", ...forged(26) })).status, 201, "an account still writes");
    assert.match(LIMIT_LINES.anonWrites, /\bSign in\b/);
  } finally {
    await app.close();
  }
});

test("signed out: an answer that cost nothing gives the shared count back, a caller's own refusal included; a reader who hangs up while the route goes on keeps it", async () => {
  const limits = buildLimits();
  const app = await serve([...limits.anonWriteLimit, ...limits.generationLimits]);
  let n = 0;
  try {
    for (const answer of [400, 401, 403, 404, 409, 500, 503]) {
      assert.equal((await app.hit({ ...forged(++n), answer })).status, answer);
    }
    await passes(6, () => app.hit({ session: "one", address: "198.51.100.1" }));
    await refused(app.hit({ session: "one", address: "198.51.100.1" }), "write");
    await app.hangUp(forged(++n));
    await passes(17, () => app.hit(forged(++n)));
    await refused(app.hit(forged(++n)), "anonWrites");
  } finally {
    await app.close();
  }
});

test("signed out: the hour rolls, so no burst fits on both sides of a window's edge", async (t) => {
  const start = Date.parse("2026-10-02T12:00:00Z");
  t.mock.timers.enable({ apis: ["Date"], now: start });
  const app = await serve(buildLimits().anonWriteLimit);
  let n = 0;
  const next = () => app.hit(forged(++n));
  try {
    await passes(12, next);
    t.mock.timers.setTime(start + 30 * MINUTE_MS);
    await passes(12, next);
    t.mock.timers.setTime(start + HOUR_MS - 1_000);
    assert.equal(await refused(next(), "anonWrites"), 1, "the first twelve leave in a second");
    t.mock.timers.setTime(start + HOUR_MS + 1);
    await passes(12, next);
    assert.equal(await refused(next(), "anonWrites"), 30 * 60, "a fixed hour would have opened all 24 again; the next opens as the second twelve leave");
  } finally {
    await app.close();
  }
});

test("signed out: a refused write is not kept, so hammering the shared count holds it shut no longer", async (t) => {
  const start = Date.parse("2026-10-02T12:00:00Z");
  t.mock.timers.enable({ apis: ["Date"], now: start });
  const app = await serve(buildLimits().anonWriteLimit);
  let n = 0;
  const next = () => app.hit(forged(++n));
  try {
    await passes(24, next);
    t.mock.timers.setTime(start + 10 * MINUTE_MS);
    for (let i = 0; i < 50; i++) await refused(next(), "anonWrites");
    t.mock.timers.setTime(start + HOUR_MS + 1);
    await passes(24, next);
    await refused(next(), "anonWrites");
  } finally {
    await app.close();
  }
});

test("a write dropped before it spent: the shared signed-out count gives it back whenever its route answers, one whose route spent keeps it, and an account's own count keeps it as before (MB-158)", async () => {
  const limits = buildLimits();
  const app = await serve([...limits.anonWriteLimit, ...limits.generationLimits]);
  let n = 0;
  try {
    for (let i = 0; i < 23; i++) await app.hangUp({ ...forged(++n), late: 400 });
    await app.hangUp({ ...forged(++n), late: 201 });
    await passes(23, () => app.hit(forged(++n)));
    await refused(app.hit(forged(++n)), "anonWrites");

    await app.hangUp({ user: "u1", late: 400 });
    await passes(5, () => app.hit({ user: "u1" }));
    await refused(app.hit({ user: "u1" }), "write");
  } finally {
    await app.close();
  }
});

test("a birth-time change holds one write per report it passes, and one that passes none holds none (MB-159)", async () => {
  const app = await serve(buildLimits().generationLimits);
  try {
    await passes(1, () => app.hit({ user: "u1", reports: 2 }));
    await passes(1, () => app.hit({ user: "u1", reports: 4 }));
    await refused(app.hit({ user: "u1", reports: 1 }), "write");
    await passes(10, () => app.hit({ user: "u2", reports: 0 }));
    await passes(6, () => app.hit({ user: "u2", reports: 1 }));
    await refused(app.hit({ user: "u2", reports: 1 }), "write");
    assert.equal(app.started(), 12);
  } finally {
    await app.close();
  }
});

test("a birth-time change past the hour's limit hears the usual 429 before any pass starts, and keeps nothing it took (MB-159)", async () => {
  const app = await serve(buildLimits().generationLimits);
  try {
    await passes(1, () => app.hit({ user: "u1", reports: 5 }));
    await refused(app.hit({ user: "u1", reports: 2 }), "write");
    assert.equal(app.started(), 5, "the refused change started no pass");
    await passes(1, () => app.hit({ user: "u1", reports: 1 }));
    await refused(app.hit({ user: "u1", reports: 1 }), "write");
  } finally {
    await app.close();
  }
});

test("a birth-time change holds its writes on the address's day too, which answers first, as in the chain (MB-159)", async () => {
  const app = await serve(buildLimits().generationLimits);
  const address = "203.0.113.31";
  try {
    for (const user of ["a1", "a2", "a3"]) await passes(1, () => app.hit({ user, address, reports: 6 }));
    const seconds = await refused(app.hit({ user: "a4", address, reports: 3 }), "writeDaily");
    assert.ok(seconds > LIMITS.write.windowMs / 1000, "the day's wait, not the hour's");
    await passes(1, () => app.hit({ user: "a4", address, reports: 2 }));
    await refused(app.hit({ user: "a5", address, reports: 1 }), "writeDaily");
    assert.equal(app.started(), 20);
  } finally {
    await app.close();
  }
});

test("signed out: a birth-time change holds its writes on the shared count, and one past what the hour has left waits for enough of it to leave (MB-159)", async (t) => {
  const start = Date.parse("2026-10-02T12:00:00Z");
  t.mock.timers.enable({ apis: ["Date"], now: start });
  const app = await serve(buildLimits().anonWriteLimit);
  let n = 0;
  const change = (reports: number) => app.hit({ ...forged(++n), reports });
  try {
    await passes(3, () => change(4));
    t.mock.timers.setTime(start + 30 * MINUTE_MS);
    await passes(2, () => change(4));
    t.mock.timers.setTime(start + 40 * MINUTE_MS);
    assert.equal(await refused(change(5), "anonWrites"), 20 * 60, "one of the first twelve has to leave");
    assert.equal(await refused(change(17), "anonWrites"), 50 * 60, "thirteen have to leave, the last of them from the second eight");
    assert.equal(app.started(), 20, "a refused change starts no pass");
    await passes(1, () => change(4));
    await refused(change(1), "anonWrites");
  } finally {
    await app.close();
  }
});

test("the writing chain: on staging 24 signed-out writes with no cookie and 24 forged addresses pass and the 25th answers 429; an account still writes; production asks for one before the shared count", async (t) => {
  const saved = process.env.APP_ENV;
  t.after(() => {
    if (saved === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = saved;
  });
  const { writing } = await import("../routes/index.js");
  const { sessionMiddleware } = await import("../middlewares/session.js");
  const app = express();
  app.use(sessionMiddleware);
  // Where Clerk stands in app.ts.
  app.use((req, _res, next) => {
    req.userId = req.header("x-user") || null;
    next();
  });
  const started: RequestHandler = (_req, res) => void res.status(202).json({ started: true });
  app.post("/api/reports", writing, started);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/reports`;
  const write = async (address: string, user?: string) => {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-vercel-forwarded-for": address,
      "x-edge-proxy-secret": EDGE,
    };
    if (user) headers["x-user"] = user;
    const res = await fetch(url, { method: "POST", headers, body: "{}" });
    const session = res.headers.get("set-cookie")?.split(";")[0] ?? null;
    return { status: res.status, retryAfter: res.headers.get("retry-after"), session, body: (await res.json()) as { error?: string } };
  };

  process.env.APP_ENV = "production";
  for (let i = 1; i <= 30; i++) assert.equal((await write(`198.51.100.${i}`)).status, 401, `production, signed out ${i}`);

  process.env.APP_ENV = "staging";
  const sessions = new Set<string | null>();
  for (let i = 1; i <= 24; i++) {
    const answer = await write(`203.0.113.${i}`);
    assert.equal(answer.status, 202, `staging, signed out ${i}`);
    sessions.add(answer.session);
  }
  assert.equal(sessions.size, 24, "no cookie went back, so each write came from a session of its own");
  assert.ok(!sessions.has(null));
  await refused(write("203.0.113.25"), "anonWrites");
  assert.equal((await write("203.0.113.26", "user_writer")).status, 202, "an account never meets the shared count");

  process.env.APP_ENV = "production";
  const production = await write("203.0.113.27");
  assert.equal(production.status, 401, "production asks for an account first, though the shared count is full");
  assert.equal(production.body.error, "sign_in_required");
  assert.equal((await write("203.0.113.28", "user_writer")).status, 202);
});

test("a birth-time change's last allowed hold fits exactly and its first refused one takes nothing: 6 reports pass, 7 hear 429, and the count is whole after (MB-159)", async () => {
  const app = await serve(buildLimits().generationLimits);
  try {
    await passes(1, () => app.hit({ user: "exact", address: "203.0.113.41", reports: 6 }));
    await refused(app.hit({ user: "exact", address: "203.0.113.41", reports: 1 }), "write");

    await refused(app.hit({ user: "over", address: "203.0.113.42", reports: 7 }), "write");
    // The address's day, 20, is asked first and is the first count a million cannot fit.
    await refused(app.hit({ user: "over", address: "203.0.113.42", reports: 1_000_000 }), "writeDaily");
    assert.equal(app.started(), 6, "a refused change started no pass");
    await passes(6, () => app.hit({ user: "over", address: "203.0.113.42", reports: 1 }));
    await refused(app.hit({ user: "over", address: "203.0.113.42", reports: 1 }), "write");
  } finally {
    await app.close();
  }
});

test("a birth-time change whose route then refuses or fails gives every write it held back, on the hour's count and the shared one (MB-158, MB-159)", async () => {
  const limits = buildLimits();
  const app = await serve([...limits.anonWriteLimit, ...limits.generationLimits]);
  let n = 0;
  try {
    for (const answer of [400, 404, 409, 500, 503]) {
      assert.equal((await app.hit({ user: "u1", reports: 4, answer })).status, answer, `account ${answer}`);
      assert.equal((await app.hit({ ...forged(++n), reports: 4, answer })).status, answer, `signed out ${answer}`);
    }
    await passes(6, () => app.hit({ user: "u1" }));
    await refused(app.hit({ user: "u1" }), "write");
    await passes(24, () => app.hit(forged(++n)));
    await refused(app.hit(forged(++n)), "anonWrites");
  } finally {
    await app.close();
  }
});

test("a birth-time change whose route answers 2xx keeps every write it held, however many it held", async () => {
  const app = await serve(buildLimits().generationLimits);
  try {
    for (const [i, answer] of [200, 201, 202, 302, 399].entries()) {
      const hit = { user: `kept-${answer}`, address: `203.0.113.${60 + i}` };
      assert.equal((await app.hit({ ...hit, reports: 5, answer })).status, answer, `${answer}`);
      await passes(1, () => app.hit({ ...hit, answer: 201 }));
      await refused(app.hit(hit), "write");
    }
  } finally {
    await app.close();
  }
});

test("writing, sending and checkout: the last status that spends is 399 and the first that does not is 400", async () => {
  for (const [name, handlers, kind] of [
    ["write", buildLimits().generationLimits, "write"],
    ["send", buildLimits().sendLimit, "send"],
    ["checkout", buildLimits().checkoutLimit, "checkout"],
  ] as const) {
    const app = await serve(handlers);
    try {
      for (let i = 0; i < 20; i++) assert.equal((await app.hit({ user: "u1", session: "s1", answer: 400 })).status, 400, `${name} 400 ${i}`);
      await passes(LIMITS[kind].limit - 1, () => app.hit({ user: "u1", session: "s1", answer: 399 }), 399);
      assert.equal((await app.hit({ user: "u1", session: "s1", answer: 399 })).status, 399);
      await refused(app.hit({ user: "u1", session: "s1" }), kind);
    } finally {
      await app.close();
    }
  }
});

test("the geocoder and the preview: only a malformed request, 400, is given back; a failure, a missing place and a refusal upstream all cost the work", async () => {
  for (const kind of ["geocode", "preview"] as const) {
    for (const answer of [401, 404, 429, 500, 502, 503]) {
      const limits = buildLimits();
      const app = await serve(kind === "geocode" ? limits.geocodeLimit : limits.previewLimit);
      try {
        await passes(100, () => app.hit({ address: "203.0.113.50", answer: 400 }), 400);
        await passes(LIMITS[kind].limit, () => app.hit({ address: "203.0.113.50", answer }), answer);
        await refused(app.hit({ address: "203.0.113.50" }), kind);
      } finally {
        await app.close();
      }
    }
  }
});

test("a route that holds no write through any limit may ask for holds all the same: it goes on, and nothing is counted", async () => {
  const app = await serve([]);
  try {
    await passes(3, () => app.hit({ reports: 5 }));
    assert.equal(app.started(), 15);
    await passes(1, () => app.hit({ reports: 0 }));
  } finally {
    await app.close();
  }
});

test("twelve writes at once from one account: six pass and six hear 429, the last allowed one and the first refused, whichever lands first", async () => {
  const app = await serve(buildLimits().generationLimits);
  try {
    const answers = await Promise.all(Array.from({ length: 12 }, () => app.hit({ user: "racer" })));
    assert.equal(answers.filter((a) => a.status === 201).length, 6);
    assert.equal(answers.filter((a) => a.status === 429).length, 6);
    await refused(app.hit({ user: "racer" }), "write");
  } finally {
    await app.close();
  }
});

test("thirty signed-out writes at once from thirty addresses: twenty-four pass and six hear the shared count's line", async () => {
  const limits = buildLimits();
  const app = await serve([...limits.anonWriteLimit, ...limits.generationLimits]);
  try {
    const answers = await Promise.all(Array.from({ length: 30 }, (_, i) => app.hit(forged(i + 1))));
    assert.equal(answers.filter((a) => a.status === 201).length, 24);
    const refusals = answers.filter((a) => a.status === 429);
    assert.equal(refusals.length, 6);
    for (const { body } of refusals) assert.deepEqual((body as { error: string }).error, "rate_limited");
  } finally {
    await app.close();
  }
});

test("birth-time changes at once on one account never start more passes than the hour allows, and give back every write they did not use (MB-159)", async () => {
  for (const [reports, requests] of [[3, 5], [2, 8], [6, 4], [1, 9], [4, 4]] as const) {
    const app = await serve(buildLimits().generationLimits);
    try {
      const answers = await Promise.all(Array.from({ length: requests }, () => app.hit({ user: "racer", reports })));
      for (const { status } of answers) assert.ok(status === 201 || status === 429, `${status}`);
      const started = app.started();
      assert.ok(started <= LIMITS.write.limit, `${reports} x ${requests}: ${started} passes started, over the limit`);
      assert.equal(started, answers.filter((a) => a.status === 201).length * reports, "every pass that started was in an answered request");
      assert.ok(started > 0, `${reports} x ${requests}: at least one change fits when the account has written nothing`);
      await passes(LIMITS.write.limit - started, () => app.hit({ user: "racer" }));
      await refused(app.hit({ user: "racer" }), "write");
    } finally {
      await app.close();
    }
  }
});

test("signed-out birth-time changes at once never start more passes than the shared hour allows, and keep none they did not use (MB-159)", async () => {
  const limits = buildLimits();
  const app = await serve([...limits.anonWriteLimit, ...limits.generationLimits]);
  let n = 0;
  try {
    const answers = await Promise.all(Array.from({ length: 8 }, () => app.hit({ ...forged(++n), reports: 5 })));
    for (const { status } of answers) assert.ok(status === 201 || status === 429, `${status}`);
    const started = app.started();
    assert.ok(started <= LIMITS.anonWrites.limit, `${started} passes started`);
    assert.equal(started, answers.filter((a) => a.status === 201).length * 5);
    await passes(LIMITS.anonWrites.limit - started, () => app.hit(forged(++n)));
    await refused(app.hit(forged(++n)), "anonWrites");
  } finally {
    await app.close();
  }
});

test("an account's birth-time change holds nothing on the shared signed-out count, so signed-out writers keep all 24 (MB-159)", async () => {
  const limits = buildLimits();
  const app = await serve([...limits.anonWriteLimit, ...limits.generationLimits]);
  let n = 0;
  try {
    for (const user of ["a1", "a2", "a3"]) await passes(1, () => app.hit({ user, ...forged(++n), reports: 6 }));
    await passes(24, () => app.hit(forged(++n)));
    await refused(app.hit(forged(++n)), "anonWrites");
  } finally {
    await app.close();
  }
});

test("a signed-out change is refused by the first count that is full in the chain's order, and the one it did fit keeps nothing (MB-159)", async () => {
  const limits = buildLimits();
  const app = await serve([...limits.anonWriteLimit, ...limits.generationLimits]);
  let n = 0;
  try {
    // The shared count has 20 of 24 left to spend on one session's 5 writes.
    for (let i = 0; i < 5; i++) await passes(1, () => app.hit({ session: "S", address: `203.0.113.${100 + i}` }));
    await passes(15, () => app.hit(forged(++n)));
    // 20 on the shared count. A change of 6 needs 5 more than it holds: 25 > 24 refuses it there, before the hour's count is asked.
    await refused(app.hit({ session: "T", address: "203.0.113.200", reports: 6 }), "anonWrites");
    // Session S has 5 of 6; a change of 2 fits the shared count (21 + 1 of 24) and not S's own hour.
    await refused(app.hit({ session: "S", address: "203.0.113.201", reports: 2 }), "write");
    // The refused change gave back what it took: 20 are spent, so exactly 4 more fit.
    await passes(4, () => app.hit(forged(++n)));
    await refused(app.hit(forged(++n)), "anonWrites");
  } finally {
    await app.close();
  }
});

test("signed out, the shared count rolls on each write's own hour: held writes leave together at their hour's edge, not a millisecond before (MB-159)", async (t) => {
  const start = Date.parse("2026-10-02T12:00:00Z");
  t.mock.timers.enable({ apis: ["Date"], now: start });
  const app = await serve(buildLimits().anonWriteLimit);
  let n = 0;
  try {
    await passes(6, () => app.hit({ ...forged(++n), reports: 4 }));
    await refused(app.hit({ ...forged(++n), reports: 1 }), "anonWrites");
    t.mock.timers.setTime(start + HOUR_MS - 1);
    await refused(app.hit({ ...forged(++n), reports: 1 }), "anonWrites");
    t.mock.timers.setTime(start + HOUR_MS);
    await passes(6, () => app.hit({ ...forged(++n), reports: 4 }));
    await refused(app.hit({ ...forged(++n), reports: 1 }), "anonWrites");
    assert.equal(app.started(), 48);
  } finally {
    await app.close();
  }
});

test("a birth-time change holds its writes for the same hour a single write does: they leave the account's count at the hour's edge (MB-159)", async (t) => {
  const start = Date.parse("2026-10-02T12:00:00Z");
  t.mock.timers.enable({ apis: ["Date"], now: start });
  const app = await serve(buildLimits().generationLimits);
  try {
    await passes(1, () => app.hit({ user: "u1", reports: 6 }));
    t.mock.timers.setTime(start + HOUR_MS - 1_000);
    await refused(app.hit({ user: "u1", reports: 1 }), "write");
    t.mock.timers.setTime(start + HOUR_MS + 1);
    await passes(1, () => app.hit({ user: "u1", reports: 6 }));
    await refused(app.hit({ user: "u1", reports: 1 }), "write");
  } finally {
    await app.close();
  }
});

test("a change refused a hold after the hour has turned does not take off a later hour's count (MB-159)", async (t) => {
  const start = Date.parse("2026-10-02T12:00:00Z");
  t.mock.timers.enable({ apis: ["Date"], now: start });
  const app = await serve(buildLimits().generationLimits);
  try {
    await passes(3, () => app.hit({ user: "u1" }));
    t.mock.timers.setTime(start + HOUR_MS + 1);
    await passes(2, () => app.hit({ user: "u1", reports: 2 }));
    await refused(app.hit({ user: "u1", reports: 3 }), "write");
    await passes(2, () => app.hit({ user: "u1" }));
    await refused(app.hit({ user: "u1" }), "write");
  } finally {
    await app.close();
  }
});

test("Ask, a new reading and Now and ahead: the last status that spends is 399 and the first that does not is 400", async () => {
  for (const [kind, handlers] of [
    ["ask", buildLimits().askLimit],
    ["timelineReading", buildLimits().timelineReadingLimit],
    ["timelineNow", buildLimits().timelineNowLimit],
  ] as const) {
    const app = await serve(handlers);
    try {
      for (let i = 0; i < 40; i++) assert.equal((await app.hit({ user: "u1", answer: 400 })).status, 400, `${kind} 400 ${i}`);
      await passes(LIMITS[kind].limit - 1, () => app.hit({ user: "u1", answer: 399 }), 399);
      assert.equal((await app.hit({ user: "u1", answer: 399 })).status, 399, `${kind}: the last allowed`);
      await refused(app.hit({ user: "u1" }), kind);
    } finally {
      await app.close();
    }
  }
});

test("a new reading's 20th in the minute passes, the 21st is refused, and the minute's end lets 20 more open", async (t) => {
  const start = Date.parse("2026-10-04T12:00:00Z");
  t.mock.timers.enable({ apis: ["Date"], now: start });
  const app = await serve(buildLimits().timelineReadingLimit);
  try {
    await passes(LIMITS.timelineReading.limit, () => app.hit({ user: "u1" }));
    t.mock.timers.setTime(start + LIMITS.timelineReading.windowMs - 1_000);
    const seconds = await refused(app.hit({ user: "u1" }), "timelineReading");
    assert.ok(seconds <= 1, `a second left in the minute, Retry-After ${seconds}`);
    t.mock.timers.setTime(start + LIMITS.timelineReading.windowMs + 1);
    await passes(LIMITS.timelineReading.limit, () => app.hit({ user: "u1" }));
    await refused(app.hit({ user: "u1" }), "timelineReading");
  } finally {
    await app.close();
  }
});

test("Now and ahead's 30th read in the minute passes, the 31st is refused, and the minute's end lets 30 more through", async (t) => {
  const start = Date.parse("2026-10-04T12:00:00Z");
  t.mock.timers.enable({ apis: ["Date"], now: start });
  const app = await serve(buildLimits().timelineNowLimit);
  try {
    await passes(LIMITS.timelineNow.limit, () => app.hit({ user: "u1" }));
    t.mock.timers.setTime(start + LIMITS.timelineNow.windowMs - 1_000);
    await refused(app.hit({ user: "u1" }), "timelineNow");
    t.mock.timers.setTime(start + LIMITS.timelineNow.windowMs + 1);
    await passes(LIMITS.timelineNow.limit, () => app.hit({ user: "u1" }));
    await refused(app.hit({ user: "u1" }), "timelineNow");
  } finally {
    await app.close();
  }
});

test("the wait Ask is told shrinks as the minute runs, and hammering a full count does not push it out", async (t) => {
  const start = Date.parse("2026-10-04T12:00:00Z");
  t.mock.timers.enable({ apis: ["Date"], now: start });
  const app = await serve(buildLimits().askLimit);
  try {
    await passes(LIMITS.ask.limit, () => app.hit({ user: "u1" }));
    t.mock.timers.setTime(start + 45_000);
    assert.equal(await refused(app.hit({ user: "u1" }), "ask"), 15);
    t.mock.timers.setTime(start + 50_000);
    for (let i = 0; i < 20; i++) await app.hit({ user: "u1" });
    assert.equal(await refused(app.hit({ user: "u1" }), "ask"), 10, "refusals added nothing to the count");
    t.mock.timers.setTime(start + 60_001);
    assert.equal((await app.hit({ user: "u1" })).status, 201);
  } finally {
    await app.close();
  }
});

test("eight Ask messages at once from one account: six pass and two hear Ask's line, whichever lands first", async () => {
  const app = await serve(buildLimits().askLimit);
  try {
    const answers = await Promise.all(Array.from({ length: 8 }, () => app.hit({ user: "racer" })));
    assert.equal(answers.filter((a) => a.status === 201).length, LIMITS.ask.limit);
    assert.equal(answers.filter((a) => a.status === 429).length, 2);
    await refused(app.hit({ user: "racer" }), "ask");
  } finally {
    await app.close();
  }
});

test("twenty-five readings opened at once from one account: twenty pass and five hear the readings' line", async () => {
  const app = await serve(buildLimits().timelineReadingLimit);
  try {
    const answers = await Promise.all(Array.from({ length: 25 }, () => app.hit({ user: "racer" })));
    assert.equal(answers.filter((a) => a.status === 201).length, LIMITS.timelineReading.limit);
    assert.equal(answers.filter((a) => a.status === 429).length, 5);
  } finally {
    await app.close();
  }
});

test("Timeline's counts are an account's: a session with no account is its own count, and an account's never meets it", async () => {
  const limits = buildLimits();
  for (const [kind, handlers] of [
    ["ask", limits.askLimit],
    ["timelineReading", limits.timelineReadingLimit],
    ["timelineNow", limits.timelineNowLimit],
  ] as const) {
    const app = await serve(handlers);
    try {
      await passes(LIMITS[kind].limit, () => app.hit({ session: "same" }));
      await refused(app.hit({ session: "same" }), kind);
      assert.equal((await app.hit({ session: "other" })).status, 201, `${kind}: another session`);
      assert.equal((await app.hit({ user: "same", session: "same" })).status, 201, `${kind}: an account named like the session`);
    } finally {
      await app.close();
    }
  }
});

test("a reader who hangs up on Ask keeps the message's count, since the model may already be answering", async () => {
  const app = await serve(buildLimits().askLimit);
  try {
    for (let i = 0; i < LIMITS.ask.limit; i++) await app.hangUp({ user: "u1" });
    await refused(app.hit({ user: "u1" }), "ask");
  } finally {
    await app.close();
  }
});
