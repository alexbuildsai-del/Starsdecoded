import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express, { type RequestHandler } from "express";
import type { AccessSource } from "./timelineAccess.js";

// `@workspace/db` throws on import without a DATABASE_URL, so every answer below is proof that no table is read (reading 3).
delete process.env.DATABASE_URL;
const { ACCESS_SOURCES, NO_TIMELINE_LINE, requireTimelineAccess, timelineAccess } = await import("./timelineAccess.js");

const ENV = { ADMIN_USER_ID: "user_admin" };
const ADMIN = { userId: "user_admin", sessionId: "s-admin" };
const READER = { userId: "user_reader", sessionId: "s-reader" };
const SIGNED_OUT = { userId: null, sessionId: "s-anon" };
const NONE = { access: false, source: null };

test("today there is one source, the admin (MB-197)", () => {
  assert.deepEqual(ACCESS_SOURCES.map(({ source }) => source), ["admin"]);
});

test("the signed-in admin has Timeline on every host (ADR-262)", async () => {
  for (const host of [{}, { APP_ENV: "staging" }, { APP_ENV: "production" }, { RAILWAY_ENVIRONMENT_NAME: "production" }]) {
    assert.deepEqual(await timelineAccess(ADMIN, { ...ENV, ...host }), { access: true, source: "admin" }, JSON.stringify(host));
  }
});

test("a signed-in reader who is not the admin has none", async () => {
  assert.deepEqual(await timelineAccess(READER, ENV), NONE);
});

test("signed out has none, the admin's own browser session included", async () => {
  assert.deepEqual(await timelineAccess(SIGNED_OUT, ENV), NONE);
  assert.deepEqual(await timelineAccess({ userId: null, sessionId: ADMIN.sessionId }, ENV), NONE);
  assert.deepEqual(await timelineAccess({ userId: "", sessionId: "s-empty" }, ENV), NONE);
});

test("an unset ADMIN_USER_ID gives no one access", async () => {
  for (const env of [{}, { ADMIN_USER_ID: "" }]) {
    for (const viewer of [ADMIN, READER, SIGNED_OUT, { userId: "", sessionId: "s-empty" }]) {
      assert.deepEqual(await timelineAccess(viewer, env), NONE, `${JSON.stringify(env)} ${JSON.stringify(viewer)}`);
    }
  }
});

test("a second source is honoured as billing will add it, and no caller changes", async () => {
  const asked: string[] = [];
  const subscription: AccessSource = {
    source: "subscription",
    grants: async (userId) => {
      asked.push(userId);
      return userId === READER.userId;
    },
  };
  const sources = [...ACCESS_SOURCES, subscription];

  assert.deepEqual(await timelineAccess(READER, ENV, sources), { access: true, source: "subscription" });
  assert.deepEqual(await timelineAccess({ userId: "user_other", sessionId: "s-other" }, ENV, sources), NONE);
  assert.deepEqual(await timelineAccess(ADMIN, ENV, sources), { access: true, source: "admin" }, "the first source that gives it is reported");
  assert.deepEqual(await timelineAccess(SIGNED_OUT, ENV, sources), NONE);
  assert.deepEqual(asked, [READER.userId, "user_other"], "the admin is answered before the second source, and a session is never asked about");
});

test("a source that throws fails the answer instead of opening Timeline or closing it", async () => {
  const broken: AccessSource = {
    source: "subscription",
    grants: async () => {
      throw new Error("subscription read failed");
    },
  };
  await assert.rejects(timelineAccess(READER, ENV, [...ACCESS_SOURCES, broken]), /subscription read failed/);
  assert.deepEqual(await timelineAccess(ADMIN, ENV, [...ACCESS_SOURCES, broken]), { access: true, source: "admin" });
});

/** Where the session and sign-in middleware stand in app.ts, as requireAccount's test stubs them. */
const viewer: RequestHandler = (req, _res, next) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = req.header("x-session") || "s-test";
  next();
};

async function serveTimeline() {
  const app = express();
  app.use(viewer);
  app.get("/api/timeline/now", requireTimelineAccess, (_req, res) => void res.json({ range: "week" }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { base, close };
}

function open(base: string, user?: string) {
  return fetch(`${base}/api/timeline/now`, { headers: user ? { "x-user": user } : {} });
}

test("requireTimelineAccess lets the admin through and answers everyone else 403 no_timeline", async (t) => {
  const saved = process.env.ADMIN_USER_ID;
  t.after(() => {
    if (saved === undefined) delete process.env.ADMIN_USER_ID;
    else process.env.ADMIN_USER_ID = saved;
  });
  process.env.ADMIN_USER_ID = ADMIN.userId;
  const { base, close } = await serveTimeline();
  t.after(close);

  const admin = await open(base, ADMIN.userId);
  assert.equal(admin.status, 200);
  assert.deepEqual(await admin.json(), { range: "week" });

  for (const user of [READER.userId, undefined]) {
    const refused = await open(base, user);
    assert.equal(refused.status, 403, user ?? "signed out");
    assert.deepEqual(await refused.json(), { error: "no_timeline", message: NO_TIMELINE_LINE });
  }

  delete process.env.ADMIN_USER_ID;
  const unset = await open(base, ADMIN.userId);
  assert.equal(unset.status, 403, "no ADMIN_USER_ID, no Timeline");
  assert.deepEqual(await unset.json(), { error: "no_timeline", message: NO_TIMELINE_LINE });
});
