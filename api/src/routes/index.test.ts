import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express, { type RequestHandler } from "express";

// The routers read these at import; the pool connects lazily, and nothing below reaches it.
process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL = "silent";
process.env.NODE_ENV = "test";
const { default: router } = await import("./index.js");

const RETIRED: Array<[string, string]> = [
  ["POST", "/api/synastry"],
  ["GET", "/api/synastry/s-1"],
  ["GET", "/api/synastry/s-1/status"],
  ["GET", "/api/relationships"],
  ["POST", "/api/relationships"],
  ["GET", "/api/relationships/r-1"],
];

/** Where the session and sign-in middleware stand in app.ts, as the walk stubs them. */
const viewer: RequestHandler = (req, _res, next) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = "s-test";
  next();
};

test("the legacy pair routes answer 410 gone to everyone, ahead of the sign-in rule and the breaker (MB-58)", async (t) => {
  const saved = { appEnv: process.env.APP_ENV, cap: process.env.DAILY_SPEND_CAP_USD };
  // Production asks a signed-out write to sign in and a cap of 0 pauses every write, so only a route that stands ahead
  // of both can answer 410 here.
  process.env.APP_ENV = "production";
  process.env.DAILY_SPEND_CAP_USD = "0";
  const app = express();
  app.use(express.json());
  app.use(viewer);
  app.use("/api", router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const [name, value] of [["APP_ENV", saved.appEnv], ["DAILY_SPEND_CAP_USD", saved.cap]] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  for (const [method, path] of RETIRED) {
    for (const user of [null, "user_reader"]) {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (user) headers["x-user"] = user;
      const res = await fetch(`${base}${path}`, { method, headers, body: method === "GET" ? undefined : "{}" });
      assert.equal(res.status, 410, `${method} ${path} as ${user ?? "a visitor"}`);
      assert.deepEqual(await res.json(), { error: "gone" });
    }
  }
  assert.equal((await fetch(`${base}/api/relationships-old`)).status, 404, "only the retired paths themselves");
});
