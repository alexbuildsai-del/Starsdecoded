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
// A forwarded address counts only on a call through our edge (ADR-224), so every hit that names one carries the edge's value.
const EDGE = "test-edge";
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

test("checkout: 10 an hour per session, as the table counts it", async () => {
  const app = await serve(buildLimits().checkoutLimit);
  try {
    await passes(10, () => app.hit({ user: "u1", session: "s1" }));
    await refused(app.hit({ user: "u1", session: "s1" }), "checkout");
    assert.equal((await app.hit({ user: "u1", session: "s2" })).status, 201);
  } finally {
    await app.close();
  }
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
