import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express, { type Express, type RequestHandler } from "express";

// The router's modules read these at import; the pool connects lazily, and a read the breaker makes is refused at once.
process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL = "silent";
process.env.NODE_ENV = "test";
delete process.env.ADMIN_USER_ID;
const { SIGN_IN_LINE, requireAccount } = await import("./requireAccount.js");

const WRITES: Array<[string, string]> = [
  ["POST", "/api/reports"],
  ["POST", "/api/reports/r-1/regenerate"],
  ["POST", "/api/compatibility"],
  ["POST", "/api/synastry"],
  ["PATCH", "/api/profiles/p-1/birth-time"],
];

/** Where the session and sign-in middleware stand in app.ts, as the walk stubs them. */
const viewer: RequestHandler = (req, _res, next) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = req.header("x-session") || "s-test";
  next();
};

async function serve(app: Express) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { base, close };
}

function call(base: string, method: string, path: string, user?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (user) headers["x-user"] = user;
  return fetch(`${base}${path}`, { method, headers, body: "{}" });
}

async function writeBehind(env: NodeJS.ProcessEnv) {
  const app = express();
  app.use(viewer);
  app.post("/api/reports", requireAccount(env), (_req, res) => void res.status(202).json({ started: true }));
  return serve(app);
}

test("on production a signed-out write is asked to sign in, and an account's goes through", async (t) => {
  const { base, close } = await writeBehind({ APP_ENV: "production" });
  t.after(close);

  const refused = await call(base, "POST", "/api/reports");
  assert.equal(refused.status, 401);
  assert.deepEqual(await refused.json(), { error: "sign_in_required", message: SIGN_IN_LINE });
  assert.equal((await call(base, "POST", "/api/reports", "user_writer")).status, 202);
});

test("Railway's own environment name stands in for a missing APP_ENV", async (t) => {
  const { base, close } = await writeBehind({ RAILWAY_ENVIRONMENT_NAME: "production" });
  t.after(close);

  assert.equal((await call(base, "POST", "/api/reports")).status, 401);
});

test("staging and a laptop keep anonymous writes", async (t) => {
  for (const env of [{ APP_ENV: "staging" }, { RAILWAY_ENVIRONMENT_NAME: "staging" }, {}]) {
    const { base, close } = await writeBehind(env);
    t.after(close);
    assert.equal((await call(base, "POST", "/api/reports")).status, 202, JSON.stringify(env));
    assert.equal((await call(base, "POST", "/api/reports", "user_writer")).status, 202, JSON.stringify(env));
  }
});

test("on production every writing route asks a signed-out request to sign in, ahead of the breaker", async (t) => {
  const saved = { appEnv: process.env.APP_ENV, cap: process.env.DAILY_SPEND_CAP_USD };
  t.after(() => {
    for (const [name, value] of [["APP_ENV", saved.appEnv], ["DAILY_SPEND_CAP_USD", saved.cap]] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  // A cap of 0 pauses whatever reaches the breaker, so a 401 can only come from ahead of it.
  process.env.DAILY_SPEND_CAP_USD = "0";
  process.env.APP_ENV = "production";
  const { default: router } = await import("../routes/index.js");
  const app = express();
  app.use(express.json());
  app.use(viewer);
  app.use("/api", router);
  const { base, close } = await serve(app);
  t.after(close);

  for (const [method, path] of WRITES) {
    const res = await call(base, method, path);
    assert.equal(res.status, 401, `${method} ${path}`);
    assert.deepEqual(await res.json(), { error: "sign_in_required", message: SIGN_IN_LINE });
  }

  // The breaker's read of the day's spend is refused, and a cap of 0 pauses all the same.
  const signedIn = await call(base, "POST", "/api/reports", "user_writer");
  assert.equal(signedIn.status, 503, "an account passes the limits and meets the breaker");
  assert.equal(((await signedIn.json()) as { error: string }).error, "paused");

  process.env.APP_ENV = "staging";
  const anonymous = await call(base, "POST", "/api/reports");
  assert.equal(anonymous.status, 503, "staging takes a signed-out write as far as the breaker");
});
