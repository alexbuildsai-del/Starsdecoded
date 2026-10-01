/**
 * Each limit driven through an in-process app and a stub route, with no database (MB-49). The wiring in routes/index.ts and
 * the breaker behind it are proved end to end in the walk.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express, { type RequestHandler } from "express";

// The pool connects lazily and nothing here queries it; clientKey shares a module with the waitlist's queries.
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { LIMITS, LIMIT_LINES, buildLimits } = await import("./limits.js");
type LimitKind = import("./limits.js").LimitKind;

interface Hit {
  user?: string;
  session?: string;
  address?: string;
  answer?: number;
}

type Answer = { status: number; retryAfter: string | null; body: unknown };

function headersOf(h: Hit): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (h.user) headers["x-user"] = h.user;
  if (h.session) headers["x-session"] = h.session;
  if (h.address) headers["x-vercel-forwarded-for"] = h.address;
  if (h.answer) headers["x-answer"] = String(h.answer);
  return headers;
}

/**
 * The limits stand ahead of a stub route, as routes/index.ts stands them ahead of the real ones. The first stub takes the
 * place of the session and sign-in middleware; the route answers with the status a hit asks for, or, asked to hang, keeps
 * going after its reader leaves, as a route that has started writing does.
 */
async function serve(handlers: RequestHandler[]) {
  let arrived = () => {};
  let left = () => {};
  const app = express();
  app.use((req, _res, next) => {
    req.userId = req.header("x-user") ?? null;
    req.sessionId = req.header("x-session") ?? "s-default";
    next();
  });
  const route: RequestHandler = (req, res) => {
    if (req.header("x-hang")) {
      res.once("close", () => left());
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
  return { hit, hangUp, close };
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
