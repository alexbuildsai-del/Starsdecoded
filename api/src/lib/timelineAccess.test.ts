/**
 * Timeline's one access check (ADR-262, 264): the signed-in admin, then a live subscription. The admin's answers, a
 * signed-out viewer's, the precedence and the 403 run with no database. A subscription's run on a scratch Postgres when
 * WALK_DATABASE_URL names a bootstrapped one, and skip, saying why, without it.
 */
import { after, test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import express, { type RequestHandler } from "express";
import type { AccessSource } from "./timelineAccess.js";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Without a scratch database the pool points at a closed port, so an answer below that read a table would fail.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL ??= "silent";
const { ACCESS_SOURCES, NO_TIMELINE_LINE, requireTimelineAccess, timelineAccess } = await import("./timelineAccess.js");

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: a subscription is read from a scratch Postgres";

const ENV = { ADMIN_USER_ID: "user_admin" };
const ADMIN = { userId: "user_admin", sessionId: "s-admin" };
const READER = { userId: "user_reader", sessionId: "s-reader" };
const SIGNED_OUT = { userId: null, sessionId: "s-anon" };
const NONE = { access: false, source: null };
const ADMIN_ONLY = ACCESS_SOURCES.filter(({ source }) => source === "admin");

test("the sources are the admin, then a live subscription (ADR-264)", () => {
  assert.deepEqual(ACCESS_SOURCES.map(({ source }) => source), ["admin", "subscription"]);
});

test("the signed-in admin has Timeline on every host, answered before any table is read (ADR-262)", async () => {
  for (const host of [{}, { APP_ENV: "staging" }, { APP_ENV: "production" }, { RAILWAY_ENVIRONMENT_NAME: "production" }]) {
    assert.deepEqual(await timelineAccess(ADMIN, { ...ENV, ...host }), { access: true, source: "admin" }, JSON.stringify(host));
  }
});

test("signed out has none, the admin's own browser session included, and no source is asked", async () => {
  assert.deepEqual(await timelineAccess(SIGNED_OUT, ENV), NONE);
  assert.deepEqual(await timelineAccess({ userId: null, sessionId: ADMIN.sessionId }, ENV), NONE);
  assert.deepEqual(await timelineAccess({ userId: "", sessionId: "s-empty" }, ENV), NONE);
});

test("an unset ADMIN_USER_ID makes no one the admin", async () => {
  for (const env of [{}, { ADMIN_USER_ID: "" }]) {
    for (const viewer of [ADMIN, READER, SIGNED_OUT, { userId: "", sessionId: "s-empty" }]) {
      assert.deepEqual(await timelineAccess(viewer, env, ADMIN_ONLY), NONE, `${JSON.stringify(env)} ${JSON.stringify(viewer)}`);
    }
  }
});

test("the first source that gives it is reported, and a session is never asked about", async () => {
  const asked: string[] = [];
  const subscription: AccessSource = {
    source: "subscription",
    grants: async (userId) => {
      asked.push(userId);
      return userId === READER.userId;
    },
  };
  const sources = [...ADMIN_ONLY, subscription];

  assert.deepEqual(await timelineAccess(READER, ENV, sources), { access: true, source: "subscription" });
  assert.deepEqual(await timelineAccess({ userId: "user_other", sessionId: "s-other" }, ENV, sources), NONE);
  assert.deepEqual(await timelineAccess(ADMIN, ENV, sources), { access: true, source: "admin" }, "the first source that gives it is reported");
  assert.deepEqual(await timelineAccess(SIGNED_OUT, ENV, sources), NONE);
  assert.deepEqual(asked, [READER.userId, "user_other"], "the admin is answered before the subscription, and a session is never asked about");
});

test("a source that throws fails the answer instead of opening Timeline or closing it", async () => {
  const broken: AccessSource = {
    source: "subscription",
    grants: async () => {
      throw new Error("subscription read failed");
    },
  };
  await assert.rejects(timelineAccess(READER, ENV, [...ADMIN_ONLY, broken]), /subscription read failed/);
  assert.deepEqual(await timelineAccess(ADMIN, ENV, [...ADMIN_ONLY, broken]), { access: true, source: "admin" });
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

function withAdmin(t: TestContext, id: string | undefined) {
  const saved = process.env.ADMIN_USER_ID;
  t.after(() => {
    if (saved === undefined) delete process.env.ADMIN_USER_ID;
    else process.env.ADMIN_USER_ID = saved;
  });
  if (id === undefined) delete process.env.ADMIN_USER_ID;
  else process.env.ADMIN_USER_ID = id;
}

test("requireTimelineAccess lets the admin through and answers a signed-out visitor 403 no_timeline", async (t) => {
  withAdmin(t, ADMIN.userId);
  const { base, close } = await serveTimeline();
  t.after(close);

  const admin = await open(base, ADMIN.userId);
  assert.equal(admin.status, 200);
  assert.deepEqual(await admin.json(), { range: "week" });

  const refused = await open(base);
  assert.equal(refused.status, 403, "signed out");
  assert.deepEqual(await refused.json(), { error: "no_timeline", message: NO_TIMELINE_LINE });
});

/** Each run's own accounts, so a second run, or the walk on the same database, finds nothing of the first. */
const run = randomUUID().slice(0, 8);
const account = (name: string) => `user_r1712a_${run}_${name}`;
const made: string[] = [];
const HOUR = 60 * 60 * 1000;

type Plan = { status: string; cancelAtPeriodEnd?: boolean; endsIn?: number | null };

/** A subscription as the webhook leaves it, for a new account of this run. */
async function subscriber(name: string, plan: Plan): Promise<string> {
  const { db, subscriptionsTable } = await import("@workspace/db");
  const userId = account(name);
  made.push(userId);
  const endsIn = plan.endsIn === undefined ? 20 * 24 * HOUR : plan.endsIn;
  await db.insert(subscriptionsTable).values({
    id: `sub_r1712a_${run}_${name}`,
    userId,
    customerId: `cus_r1712a_${run}_${name}`,
    item: "timeline_month",
    status: plan.status,
    currentPeriodEnd: endsIn === null ? null : new Date(Date.now() + endsIn),
    cancelAtPeriodEnd: plan.cancelAtPeriodEnd ?? false,
    isTest: true,
  });
  return userId;
}

const viewerOf = (userId: string) => ({ userId, sessionId: `s-${userId}` });

after(async () => {
  if (!SCRATCH) return;
  const { db, pool, subscriptionsTable } = await import("@workspace/db");
  const { inArray } = await import("drizzle-orm");
  if (made.length > 0) await db.delete(subscriptionsTable).where(inArray(subscriptionsTable.userId, made));
  await pool.end();
});

test("a live subscription opens Timeline: active, trialing or past due, and nothing else does (reading 7)", { skip: NO_DB }, async () => {
  for (const status of ["active", "trialing", "past_due"]) {
    const userId = await subscriber(`live-${status}`, { status });
    assert.deepEqual(await timelineAccess(viewerOf(userId), ENV), { access: true, source: "subscription" }, status);
  }
  for (const status of ["incomplete", "incomplete_expired", "unpaid", "paused", "canceled"]) {
    const userId = await subscriber(`closed-${status}`, { status });
    assert.deepEqual(await timelineAccess(viewerOf(userId), ENV), NONE, status);
  }
  assert.deepEqual(await timelineAccess(viewerOf(account("never-subscribed")), ENV), NONE, "no row, no Timeline");
});

test("a cancel at the period's end keeps Timeline to that end and not past it", { skip: NO_DB }, async () => {
  const ending = await subscriber("ending", { status: "active", cancelAtPeriodEnd: true, endsIn: 3 * 24 * HOUR });
  assert.deepEqual(await timelineAccess(viewerOf(ending), ENV), { access: true, source: "subscription" });

  const ended = await subscriber("ended", { status: "active", cancelAtPeriodEnd: true, endsIn: -HOUR });
  assert.deepEqual(await timelineAccess(viewerOf(ended), ENV), NONE, "past its end before Stripe's deleted event lands");

  const renewing = await subscriber("renewing", { status: "active", endsIn: -HOUR });
  assert.deepEqual(
    await timelineAccess(viewerOf(renewing), ENV),
    { access: true, source: "subscription" },
    "a plan that renews stays open while its renewal is on its way",
  );
});

test("the admin is answered first, so an admin with a plan reads as the admin", { skip: NO_DB }, async () => {
  const userId = await subscriber("admin-with-plan", { status: "active" });
  assert.deepEqual(await timelineAccess(viewerOf(userId), { ADMIN_USER_ID: userId }), { access: true, source: "admin" });
  assert.deepEqual(await timelineAccess(viewerOf(userId), {}), { access: true, source: "subscription" });
});

test("requireTimelineAccess lets a subscriber through and answers a reader without a plan 403", { skip: NO_DB }, async (t) => {
  withAdmin(t, undefined);
  const subscribed = await subscriber("door-in", { status: "past_due" });
  const lapsed = await subscriber("door-out", { status: "canceled" });
  const { base, close } = await serveTimeline();
  t.after(close);

  const through = await open(base, subscribed);
  assert.equal(through.status, 200);
  assert.deepEqual(await through.json(), { range: "week" });

  for (const user of [lapsed, account("door-none"), ADMIN.userId]) {
    const refused = await open(base, user);
    assert.equal(refused.status, 403, user);
    assert.deepEqual(await refused.json(), { error: "no_timeline", message: NO_TIMELINE_LINE });
  }
});
