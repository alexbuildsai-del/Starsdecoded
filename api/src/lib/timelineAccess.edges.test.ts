/**
 * Timeline access at its edges (R16-18, ADR-262, 264; MB-197): who never gets it, what a broken source does, which
 * source is reported, and that the route fails closed. `timelineAccess.test.ts` has the plain cases.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express, { type RequestHandler } from "express";
import type { AccessSource } from "./timelineAccess.js";

// `@workspace/db` throws on import without a DATABASE_URL, so every answer below is proof that no table is read (reading 3).
delete process.env.DATABASE_URL;
const { ACCESS_SOURCES, NO_TIMELINE_LINE, requireTimelineAccess, timelineAccess } = await import("./timelineAccess.js");

const NONE = { access: false, source: null };
const ADMIN = { userId: "user_admin", sessionId: "s-admin" };
const READER = { userId: "user_reader", sessionId: "s-reader" };

test("a blank ADMIN_USER_ID gives no signed-in reader access, whatever blank it is", async () => {
  for (const blank of ["", " ", "   ", "\t", "\n"]) {
    for (const viewer of [ADMIN, READER, { userId: "user_x", sessionId: "s" }]) {
      assert.deepEqual(await timelineAccess(viewer, { ADMIN_USER_ID: blank }), NONE, JSON.stringify(blank));
    }
  }
});

test("the admin is matched exactly: no case folding, no trimming, no prefix", async () => {
  const env = { ADMIN_USER_ID: "user_admin" };
  for (const userId of ["USER_ADMIN", "User_Admin", " user_admin", "user_admin ", "user_admin2", "user_admi", "user_admin\n"]) {
    assert.deepEqual(await timelineAccess({ userId, sessionId: "s" }, env), NONE, JSON.stringify(userId));
  }
  assert.deepEqual(await timelineAccess(ADMIN, { ADMIN_USER_ID: " user_admin " }), NONE, "a padded env value is not the id either");
});

test("only the account is asked about: a session id that equals the admin's id opens nothing", async () => {
  const env = { ADMIN_USER_ID: "user_admin" };
  assert.deepEqual(await timelineAccess({ userId: null, sessionId: "user_admin" }, env), NONE);
  assert.deepEqual(await timelineAccess({ userId: undefined as unknown as null, sessionId: "user_admin" }, env), NONE);
  assert.deepEqual(await timelineAccess({ userId: "", sessionId: "user_admin" }, env), NONE);
});

test("a source is never asked about a signed-out viewer, an empty id included", async () => {
  const asked: string[] = [];
  const open: AccessSource = { source: "subscription", grants: (userId) => (asked.push(userId), true) };
  for (const userId of [null, "", undefined as unknown as null]) {
    assert.deepEqual(await timelineAccess({ userId, sessionId: "s" }, { ADMIN_USER_ID: "user_admin" }, [open]), NONE);
  }
  assert.deepEqual(asked, [], "even a source that says yes to everyone cannot open Timeline to a session");
});

test("sources are asked in order, the first yes is the one reported, and the env reaches every source", async () => {
  const seen: Array<[string, string, string | undefined]> = [];
  const make = (source: "admin" | "subscription", answer: boolean | Promise<boolean>): AccessSource => ({
    source,
    grants: (userId, env) => {
      seen.push([source, userId, env.ADMIN_USER_ID]);
      return answer;
    },
  });
  const env = { ADMIN_USER_ID: "user_admin" };

  assert.deepEqual(await timelineAccess(READER, env, [make("admin", false), make("subscription", true)]), { access: true, source: "subscription" });
  assert.deepEqual(seen, [["admin", "user_reader", "user_admin"], ["subscription", "user_reader", "user_admin"]]);

  seen.length = 0;
  assert.deepEqual(await timelineAccess(READER, env, [make("subscription", Promise.resolve(true)), make("admin", true)]), { access: true, source: "subscription" }, "the order is the precedence");
  assert.deepEqual(seen.map(([s]) => s), ["subscription"], "a later source is not asked once one has said yes");

  assert.deepEqual(await timelineAccess(READER, env, []), NONE, "no sources, no Timeline");
  assert.deepEqual(await timelineAccess(READER, env, [make("admin", false), make("subscription", Promise.resolve(false))]), NONE);
});

test("only a plain yes opens Timeline: a truthy answer that is not true is no", async () => {
  const sloppy = (value: unknown): AccessSource => ({ source: "subscription", grants: () => value as boolean });
  for (const value of [1, "yes", "true", {}, [], undefined, null, 0, "", NaN]) {
    assert.deepEqual(await timelineAccess(READER, {}, [sloppy(value)]), NONE, String(value));
    assert.deepEqual(await timelineAccess(READER, {}, [sloppy(Promise.resolve(value))]), NONE, `promised ${String(value)}`);
  }
});

test("a source that throws fails the answer wherever it stands, and an earlier yes is still a yes", async () => {
  const boom: AccessSource = {
    source: "subscription",
    grants: () => {
      throw new Error("sync failure");
    },
  };
  const later: AccessSource = { source: "subscription", grants: async () => true };
  await assert.rejects(timelineAccess(READER, { ADMIN_USER_ID: "user_admin" }, [boom, later]), /sync failure/, "a thrown source is not skipped for the next one that says yes");
  await assert.rejects(timelineAccess(READER, { ADMIN_USER_ID: "user_admin" }, [...ACCESS_SOURCES, boom]), /sync failure/);
  assert.deepEqual(await timelineAccess(ADMIN, { ADMIN_USER_ID: "user_admin" }, [...ACCESS_SOURCES, boom]), { access: true, source: "admin" });
  assert.deepEqual(await timelineAccess(READER, {}, [boom]).catch(() => "rejected"), "rejected");
  assert.deepEqual(await timelineAccess({ userId: null, sessionId: "s" }, {}, [boom]), NONE, "a signed-out viewer never reaches the broken source");
});

test("ACCESS_SOURCES names only the sources the type allows, and the admin is first", () => {
  assert.ok(ACCESS_SOURCES.every((s) => s.source === "admin" || s.source === "subscription"));
  assert.equal(ACCESS_SOURCES[0].source, "admin");
  assert.equal(new Set(ACCESS_SOURCES.map((s) => s.source)).size, ACCESS_SOURCES.length, "one entry per source");
});

const viewer: RequestHandler = (req, _res, next) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = req.header("x-session") || "s-test";
  next();
};

async function serve(): Promise<{ base: string; reached: () => number; close: () => Promise<void> }> {
  const app = express();
  // Express prints a handler's error to stderr unless the app runs as "test"; the 500 is what is asserted.
  app.set("env", "test");
  let reached = 0;
  app.use(viewer);
  app.get("/api/timeline/now", requireTimelineAccess, (_req, res) => {
    reached += 1;
    res.json({ ok: true });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  return {
    base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    reached: () => reached,
    close: () => {
      server.closeAllConnections();
      return new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

test("requireTimelineAccess fails closed when a source throws: the route is never reached and no body says access", async (t) => {
  const saved = process.env.ADMIN_USER_ID;
  const sources = ACCESS_SOURCES as AccessSource[];
  // The order is the precedence, so a broken source goes in front: the admin's own yes must not rescue a reader it cannot read.
  const broken: AccessSource = { source: "subscription", grants: async () => { throw new Error("subscription read failed"); } };
  t.after(() => {
    sources.splice(sources.indexOf(broken), 1);
    if (saved === undefined) delete process.env.ADMIN_USER_ID;
    else process.env.ADMIN_USER_ID = saved;
  });
  process.env.ADMIN_USER_ID = "user_admin";
  sources.unshift(broken);

  const { base, reached, close } = await serve();
  t.after(close);
  for (const user of ["user_reader", "user_admin"]) {
    const res = await fetch(`${base}/api/timeline/now`, { headers: { "x-user": user } });
    assert.notEqual(res.status, 200, `${user}: a broken read is not access`);
    assert.notEqual(res.status, 403, `${user}: a broken read is not "this account has no Timeline" either`);
    assert.equal(res.status, 500, user);
    assert.doesNotMatch(await res.text(), /"ok":\s*true|no_timeline/);
  }
  const anonymous = await fetch(`${base}/api/timeline/now`);
  assert.equal(anonymous.status, 403, "signed out never reaches a source, so the broken one changes nothing");
  assert.equal(reached(), 0);
});

test("requireTimelineAccess honours a second source and sends no other header or body with the 403", async (t) => {
  const saved = process.env.ADMIN_USER_ID;
  const sources = ACCESS_SOURCES as AccessSource[];
  const second: AccessSource = { source: "subscription", grants: async (userId) => userId === "user_subscriber" };
  t.after(() => {
    sources.splice(sources.indexOf(second), 1);
    if (saved === undefined) delete process.env.ADMIN_USER_ID;
    else process.env.ADMIN_USER_ID = saved;
  });
  process.env.ADMIN_USER_ID = "user_admin";
  sources.push(second);

  const { base, reached, close } = await serve();
  t.after(close);
  const subscriber = await fetch(`${base}/api/timeline/now`, { headers: { "x-user": "user_subscriber" } });
  assert.equal(subscriber.status, 200);
  const refused = await fetch(`${base}/api/timeline/now`, { headers: { "x-user": "user_reader" } });
  assert.equal(refused.status, 403);
  assert.deepEqual(await refused.json(), { error: "no_timeline", message: NO_TIMELINE_LINE });
  assert.equal(reached(), 1);
});
