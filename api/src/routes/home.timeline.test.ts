/**
 * GET /home's Timeline part and a reading's open, on a scratch Postgres (MB-49; R16-29, reading 26): who gets Your week,
 * who gets the teaser and who gets neither, whatever state their own Personal report is in; and which opens a paused
 * day still answers. They run when WALK_DATABASE_URL names a bootstrapped database and skip, saying why, without one.
 * The model is never reached: a paused day writes nothing, and the home calls none.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express, { type RequestHandler } from "express";

const SCRATCH = process.env.WALK_DATABASE_URL;
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
// A path that ever reached past the stub would meet a closed port, never the network.
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";
delete process.env.CLERK_SECRET_KEY;
delete process.env.DAILY_SPEND_CAP_USD;

const run = randomUUID().slice(0, 8);
const user = (tag: string) => `user_r16td_${run}_${tag}`;
const id = (tag: string) => `r16td-${run}-${tag}`;
const ADMIN = user("admin");
process.env.ADMIN_USER_ID = ADMIN;

const { logger } = await import("../lib/logger.js");
const { TIMELINE_PAUSED_LINE } = await import("../lib/spendCap.js");
const { loadHome } = await import("../lib/home.js");
const { chartForProfile } = await import("../lib/profiles.js");
const T = await import("../lib/timeline.js");
const Z = await import("@workspace/api-zod");
const { default: router } = await import("./index.js");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MIRA = JSON.parse(readFileSync(join(ROOT, "fixtures", "sample-people", "mira.json"), "utf8"));
const BIRTH = {
  birthDate: MIRA.birthDate as string,
  birthTime: MIRA.birthTime as string,
  birthTimeWindowMinutes: 0,
  latitude: MIRA.latitude as number,
  longitude: MIRA.longitude as number,
  timezoneOffset: MIRA.timezoneOffset as number,
  timezone: MIRA.timezone as string,
};

const viewer: RequestHandler = (req, _res, next) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = req.header("x-session") || `s-r16td-${run}`;
  req.log = logger;
  next();
};
const app = express();
app.use(express.json());
app.use(viewer);
app.use("/api", router);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.on("listening", () => resolve()));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

async function call(method: string, path: string, who: string | null, session?: string, body?: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (who) headers["x-user"] = who;
  if (session) headers["x-session"] = session;
  const res = await fetch(`${base}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: these run on a scratch Postgres";

type Seat = { tag: string; holder: string | null; session?: string; status?: string; claimedBy?: string; chartData?: object | null };
const profileIds: string[] = [];

/** One reader's profile(s) and a natal report, as the dashboard reads them. */
async function seat(s: Seat): Promise<void> {
  const { db, profilesTable, reportsTable } = await import("@workspace/db");
  const session = s.session ?? `s-${s.tag}`;
  const chartData = s.chartData === undefined ? (chartForProfile(BIRTH) as unknown as object) : s.chartData;
  const profileId = id(`p-${s.tag}-0`);
  const reportId = id(`r-${s.tag}-0`);
  profileIds.push(profileId);
  await db.insert(profilesTable).values({
    id: profileId, sessionId: session, userId: s.holder, name: "Mira Costa", birthPlace: "Lisbon, Portugal", ...BIRTH, chartData,
    isSelf: true, ...(s.claimedBy ? { claimedByUserId: s.claimedBy, claimedAsSelf: true } : {}),
  });
  await db.insert(reportsTable).values({
    id: reportId, profileId, sessionId: session, type: "natal", status: s.status ?? "complete", interpretation: { houses: { houses: [] } },
  });
}

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  const { db, pool, profilesTable, reportsTable, timelineReadingsTable } = await import("@workspace/db");
  if (SCRATCH && profileIds.length) {
    const { inArray } = await import("drizzle-orm");
    await db.delete(timelineReadingsTable).where(inArray(timelineReadingsTable.profileId, profileIds));
    await db.delete(reportsTable).where(inArray(reportsTable.profileId, profileIds));
    await db.delete(profilesTable).where(inArray(profilesTable.id, profileIds));
  }
  await pool.end();
});

const timelinePart = (body: { week?: unknown; teaser?: unknown }) => ({ week: "week" in body, teaser: "teaser" in body });

test("db, GET /home: a Personal report counts as finished while it is complete or being revised, and never while it is pending, being written or failed", { skip: NO_DB }, async () => {
  const states: Array<[string, boolean]> = [["complete", true], ["revising", true], ["pending", false], ["generating", false], ["failed", false]];
  for (const [status, teaser] of states) {
    const reader = user(`status-${status}`);
    await seat({ tag: `status-${status}`, holder: reader, status });
    const home = await call("GET", "/home", reader);
    assert.equal(home.status, 200, status);
    assert.deepEqual(timelinePart(home.body), { week: false, teaser }, `${status}: a reader without Timeline`);
    if (teaser) Z.GetHomeResponse.parse(home.body);
  }
});

test("db, GET /home: the admin with a Personal report still being written gets neither Your week nor the teaser, and the dashboard opens", { skip: NO_DB }, async (t) => {
  const admin = user("admin-unfinished");
  await seat({ tag: "admin-unfinished", holder: admin, status: "generating" });
  process.env.ADMIN_USER_ID = admin;
  t.after(() => {
    process.env.ADMIN_USER_ID = ADMIN;
  });
  const home = await call("GET", "/home", admin);
  assert.equal(home.status, 200);
  assert.deepEqual(timelinePart(home.body), { week: false, teaser: false });
});

test("db, GET /home: two charts marked as the reader's own leave it unsettled which is theirs, so neither section shows, subscriber or not", { skip: NO_DB }, async (t) => {
  const reader = user("several");
  // One user cannot hold two self profiles of their own, so the second is a gift they claimed as theirs.
  await seat({ tag: "several", holder: reader });
  await seat({ tag: "several-gift", holder: user("several-giver"), claimedBy: reader });
  const home = await call("GET", "/home", reader);
  assert.equal(home.body.several, true);
  assert.deepEqual(timelinePart(home.body), { week: false, teaser: false });
  process.env.ADMIN_USER_ID = reader;
  t.after(() => {
    process.env.ADMIN_USER_ID = ADMIN;
  });
  assert.deepEqual(timelinePart((await call("GET", "/home", reader)).body), { week: false, teaser: false }, "a subscriber with no settled chart");
});

test("db, GET /home: a chart its writer marked as theirs and its subject claimed is the subject's to read, never the giver's", { skip: NO_DB }, async () => {
  const giver = user("giver");
  const subject = user("subject");
  await seat({ tag: "gift", holder: giver, claimedBy: subject });
  assert.deepEqual(timelinePart((await call("GET", "/home", giver)).body), { week: false, teaser: false }, "the giver has no chart of their own here");
  const given = await call("GET", "/home", subject);
  assert.deepEqual(timelinePart(given.body), { week: false, teaser: true });
  const reader = await T.readerChart({ userId: subject, sessionId: `s-${subject}` });
  assert.deepEqual(Z.GetHomeResponse.parse(given.body).teaser, T.teaserView(reader!));
});

test("db, GET /home: a session that has not signed in has no Timeline, though its own finished report fills its dashboard", { skip: NO_DB }, async () => {
  const session = id("anon-session");
  await seat({ tag: "anon", holder: null, session });
  const home = await call("GET", "/home", null, session);
  assert.equal(home.status, 200);
  assert.ok(home.body.you || home.body.people.length > 0, "the report is on the dashboard");
  assert.deepEqual(timelinePart(home.body), { week: false, teaser: false });
});

test("db, GET /home: a zone the server cannot read, or sent twice, is no failure; Your week then falls back to the birth place's days", { skip: NO_DB }, async () => {
  const sub = user("zones");
  await seat({ tag: "zones", holder: sub });
  const before = process.env.ADMIN_USER_ID;
  process.env.ADMIN_USER_ID = sub;
  try {
    for (const tz of ["Not/AZone", "..%2Fetc", "a%3Bb", "Asia/Tokyo&tz=Europe/Lisbon", "%00", ""]) {
      const before = T.dayIn(new Date(), "Europe/Lisbon");
      const home = await call("GET", `/home?tz=${tz}`, sub);
      const after = T.dayIn(new Date(), "Europe/Lisbon");
      assert.equal(home.status, 200, tz);
      const parsed = Z.GetHomeResponse.parse(home.body);
      assert.ok(parsed.week, tz);
      assert.equal(parsed.week.days.length, 7, tz);
      assert.ok([before, after].includes(parsed.week.days[0].date), `${tz}: ${parsed.week.days[0].date}`);
    }
  } finally {
    process.env.ADMIN_USER_ID = before;
  }
});

test("db, loadHome: a subscriber whose access could not be read is offered neither section, and so is anyone while it is unknown", { skip: NO_DB }, async () => {
  const reader = user("unknown-access");
  await seat({ tag: "unknown-access", holder: reader });
  const viewerOf = { userId: reader, sessionId: `s-unknown-access` };
  const unknown = await loadHome(viewerOf, { access: null });
  assert.deepEqual(timelinePart(unknown), { week: false, teaser: false });
  assert.ok(unknown.you || unknown.people.length > 0);
  assert.deepEqual(timelinePart(await loadHome(viewerOf, { access: true })), { week: true, teaser: false });
  assert.deepEqual(timelinePart(await loadHome(viewerOf, { access: false })), { week: false, teaser: true });
});

test("db, GET /home: a chart stored by an older engine, or not stored yet, still gives the teaser, drawn from the birth data", { skip: NO_DB }, async () => {
  for (const [tag, chartData] of [["old-engine", { chartVersion: 0, planets: {} }], ["no-chart", null]] as const) {
    const reader = user(tag);
    await seat({ tag, holder: reader, chartData });
    const home = await call("GET", "/home", reader);
    assert.equal(home.status, 200, tag);
    assert.deepEqual(timelinePart(home.body), { week: false, teaser: true }, tag);
    assert.equal(Z.GetHomeResponse.parse(home.body).teaser?.cycles.length, 4, tag);
  }
});

// A reading's open on a paused day: only a reading kept for this chart and this basis still opens.

async function putReading(profileId: string, userId: string, eventKey: string, row: Record<string, unknown>) {
  const { db, timelineReadingsTable } = await import("@workspace/db");
  await db.insert(timelineReadingsTable).values({ id: randomUUID(), userId, profileId, eventKey, basis: "x", status: "ready", ...row } as never);
}
const GOOD = (): object => ({ line: "You think harder about what you take on.", body: "A body.", buildsOn: null, writtenAt: new Date().toISOString() });

test("db, a paused day: a reading kept on another basis, one that no longer parses, one that failed and one whose write died each start a write, so each hears the pause", { skip: NO_DB }, async (t) => {
  const reader = user("paused");
  await seat({ tag: "paused", holder: reader });
  const profileId = id("p-paused-0");
  const chart = await T.readerChart({ userId: reader, sessionId: `s-paused` });
  assert.ok(chart);
  process.env.ADMIN_USER_ID = reader;
  process.env.DAILY_SPEND_CAP_USD = "0";
  t.after(() => {
    process.env.ADMIN_USER_ID = ADMIN;
    delete process.env.DAILY_SPEND_CAP_USD;
  });
  const basis = chart.basis;
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
  const keys = T.lifeView(chart, undefined, new Map()).cycles.map((cycle) => cycle.key);
  assert.ok(keys.length >= 7, `${keys.length} cycles`);
  const rows: Array<[Record<string, unknown>, number]> = [
    [{ basis, reading: GOOD() }, 200],
    [{ basis: `${basis}-old`, reading: GOOD() }, 503],
    [{ basis, reading: { not: "a reading" } }, 503],
    [{ basis, reading: null }, 503],
    [{ basis, status: "failed", reading: null }, 503],
    [{ basis, status: "writing", reading: null, updatedAt: minutesAgo(4.9) }, 200],
    [{ basis, status: "writing", reading: null, updatedAt: minutesAgo(5.1) }, 503],
  ];
  const cases = rows.map(([row, status], i) => [keys[i], row, status] as const);
  for (const [key, row] of cases) await putReading(profileId, reader, key, row);
  for (const [key, , status] of cases) {
    const opened = await call("POST", `/timeline/readings/${key}`, reader, undefined, {});
    assert.equal(opened.status, status, `${key}: ${JSON.stringify(opened.body)}`);
    if (status === 503) assert.deepEqual(opened.body, { error: "paused", reason: "paused", message: TIMELINE_PAUSED_LINE }, key);
    else assert.ok(["ready", "writing"].includes(opened.body.status), key);
  }
});

test("db, GET /ask: a zone it cannot read, or sent twice, is no failure and the thread still opens", { skip: NO_DB }, async (t) => {
  const asker = user("ask-zone");
  await seat({ tag: "ask-zone", holder: asker });
  process.env.ADMIN_USER_ID = asker;
  t.after(() => {
    process.env.ADMIN_USER_ID = ADMIN;
  });
  for (const tz of ["Not/AZone", "..%2Fetc", "Asia/Tokyo&tz=Europe/Lisbon", "", "Asia/Tokyo"]) {
    const thread = await call("GET", `/ask?tz=${tz}`, asker);
    assert.equal(thread.status, 200, tz);
    Z.GetAskThreadResponse.parse(thread.body);
  }
});
