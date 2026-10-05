/**
 * The report routes' pure parts without a database. On a scratch Postgres, when WALK_DATABASE_URL names a
 * bootstrapped one, the writes on hard credits through the routes themselves (ADR-275, 313; reading 16): a 402 with
 * nothing written, two writes racing for one credit, a failed report's free Try again, the third failure, Delete and a
 * failed pair each giving the credit back once. They skip, saying why, without one. The model is an in-process stand-in.
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
// Only a database handed over for this: without one the pool points nowhere and nothing queries it.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "test-key-never-sent";
// A call that ever got past the stand-in would meet a closed port, never the network.
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";
// No first name is asked of Clerk and no mail can leave, whatever the shell holds.
delete process.env.CLERK_SECRET_KEY;
delete process.env.RESEND_API_KEY;
const { cannedNatalReplies, installFakeModel } = await import("../lib/testModel.js");
const { provisionalFor, sectionIdsFor } = await import("./reports.js");

test("status: a chartless report carries thirteen provisional bodies and no angles, at offset zero", () => {
  const p = provisionalFor({ birthDate: "1867-11-07", birthTime: "12:00", latitude: 52.2297, longitude: 21.0122 });
  assert.ok(p);
  assert.equal(Object.keys(p.bodies).length, 13);
  for (const b of Object.values(p.bodies)) {
    assert.deepEqual(Object.keys(b).sort(), ["absoluteDegree", "retrograde"]);
    assert.ok(b.absoluteDegree >= 0 && b.absoluteDegree < 360);
  }
  assert.ok(!("angles" in p));
  assert.equal(p.bodies.north_node.retrograde, true);
});

test("status: a bad date reads as null rather than failing the poll", () => {
  assert.equal(provisionalFor({ birthDate: "not-a-date", birthTime: "12:00", latitude: 0, longitude: 0 }), null);
});

test("status: the section keys come from the registry the report's type uses", () => {
  assert.equal(sectionIdsFor("natal").length, 11);
  assert.ok(sectionIdsFor("natal").includes("houses"));
  assert.equal(sectionIdsFor("compatibility").length, 8);
  assert.ok(sectionIdsFor("compatibility").includes("links"));
  assert.ok(sectionIdsFor("compatibility", undefined, "people").includes("people04"));
  assert.ok(!sectionIdsFor("compatibility", undefined, "people").includes("partners04"));
  assert.ok(!sectionIdsFor("compatibility").includes("houses"));
  assert.equal(sectionIdsFor("natal", "unknown").length, 10);
  assert.ok(!sectionIdsFor("natal", "unknown").includes("houses"));
  assert.equal(sectionIdsFor("natal", "known").length, 11);
});

test("workbook PATCH: a pair's Next time tick and a pin pass the grammar; a malformed key or size is named (ADR-24, ADR-174)", async () => {
  const { workbookPatchFault } = await import("./reports.js");
  const day = "2026-10-01T09:00:00.000Z";
  assert.equal(workbookPatchFault({ "partners02.nextTime.items.0": day }), null);
  assert.equal(workbookPatchFault({ "parentChild03.nextTime.items.2": null, "career.actions.0": day }), null);
  assert.equal(workbookPatchFault({ "pin.partners02.nextTime.items.0": day, "pin.focus.practice.bullets.0": null }), null);
  for (const bad of ["pin.pin.focus.practice.bullets.0", "pin.focus", "02partners.nextTime.items.0", "career.actions"]) {
    assert.equal(workbookPatchFault({ "career.actions.0": day, [bad]: day }), `Not a workbook item key: ${bad}`);
  }
  assert.equal(workbookPatchFault({}), "A workbook patch carries 1 to 200 items");
  const many = Object.fromEntries(Array.from({ length: 201 }, (_, i) => [`career.actions.${i}`, day]));
  assert.equal(workbookPatchFault(many), "A workbook patch carries 1 to 200 items");
});

test("a failed report answers with the coded line and never the internal message (ADR-84)", async () => {
  const { failureReasonOf, FAILURE_LINES } = await import("../lib/failureReasons.js");
  assert.deepEqual(failureReasonOf("provider_unreachable"), { code: "provider_unreachable", line: FAILURE_LINES.provider_unreachable });
  const { failReport } = await import("./reports.js");
  assert.equal(typeof failReport, "function");
});

test("regenerate cooldown: the 429 body names the seconds left and matches the Retry-After it is sent with (ADR-199)", async () => {
  const { regenerateCooldown } = await import("./reports.js");
  const c = regenerateCooldown(15_000);
  assert.ok(c);
  assert.equal(c.retryAfterSeconds, 45);
  assert.deepEqual(c.body, { error: "rate_limited", message: "Please wait 45s before regenerating again", retryAfterSeconds: 45 });
  assert.equal(regenerateCooldown(59_999)?.retryAfterSeconds, 1);
  assert.equal(regenerateCooldown(60_000), null);
});

// Reading 9: three birth times of one person, as the stored chart and the profile spell them.
const T0 = { birthTime: "09:30", birthTimeWindowMinutes: 0, datetimeUtc: "1990-05-01T08:30:00.000Z" };
const T1 = { birthTime: "14:10", birthTimeWindowMinutes: 0, datetimeUtc: "1990-05-01T13:10:00.000Z" };
const T2 = { birthTime: "14:40", birthTimeWindowMinutes: 0, datetimeUtc: "1990-05-01T13:40:00.000Z" };
type Time = typeof T0;
const chartOf = (t: Time, horizon = "known") => ({ datetimeUtc: t.datetimeUtc, windowMinutes: t.birthTimeWindowMinutes, horizon: { status: horizon } });
const profileAt = (t: Time, horizon = "known") => ({ birthTime: t.birthTime, birthTimeWindowMinutes: t.birthTimeWindowMinutes, chartData: chartOf(t, horizon) });
const at = (minute: number) => new Date(Date.UTC(2026, 9, 3, 12, minute));

test("outdated: a report stamped with its profile's birth time is current; another time, window or horizon makes it outdated (reading 9)", async () => {
  const { isOutdated, writtenForStamp } = await import("./reports.js");
  const report = (horizon = "known") => ({
    id: "r1", type: "natal", status: "complete", interpretation: { meta: { horizon } },
    computeData: writtenForStamp(T0, 0), horizonPasses: 0, createdAt: at(0),
  });
  assert.equal(isOutdated(report(), profileAt(T0), []), false);
  assert.equal(isOutdated(report(), profileAt(T1), []), true, "a changed time, even with no pass on record");
  assert.equal(isOutdated(report(), { ...profileAt(T0), birthTimeWindowMinutes: 60 }, []), true, "a changed window");
  assert.equal(isOutdated(report("unknown"), profileAt(T0), []), true, "written blind, the chart now drawn");
  assert.equal(isOutdated({ ...report(), interpretation: {} }, profileAt(T0), []), false, "no stored horizon to differ");
});

test("outdated: only a complete natal report can be; one failing, being written or revised is not (reading 9)", async () => {
  const { isOutdated, writtenForStamp } = await import("./reports.js");
  const base = { id: "r1", type: "natal", interpretation: { meta: { horizon: "known" } }, computeData: writtenForStamp(T0, 0), horizonPasses: 0, createdAt: at(0) };
  for (const status of ["failed", "interpreting", "revising", "pending", "computing"]) {
    assert.equal(isOutdated({ ...base, status }, profileAt(T1), []), false, status);
  }
  assert.equal(isOutdated({ ...base, status: "complete", type: "compatibility" }, profileAt(T1), []), false);
});

test("outdated: a birth-time change passes the newest report and leaves the older one outdated, until Regenerate stamps it again (reading 9, MB-170)", async () => {
  const { isOutdated, writtenForStamp, chartKeyOf } = await import("./reports.js");
  const older = { id: "older", type: "natal", status: "complete", interpretation: { meta: { horizon: "known" } }, computeData: writtenForStamp(T0, 0), horizonPasses: 0, createdAt: at(0) };
  const newest = { ...older, id: "newest", createdAt: at(1), horizonPasses: 1 };
  const passes = [{ reportId: "newest", at: at(5), replaced: chartKeyOf(chartOf(T0)) }];
  assert.equal(isOutdated(older, profileAt(T1), passes), true);
  assert.equal(isOutdated(newest, profileAt(T1), passes), false, "the pass wrote it for the new time");
  const regenerated = { ...older, computeData: writtenForStamp(T1, 0) };
  assert.equal(isOutdated(regenerated, profileAt(T1), passes), false);
});

test("outdated: a report passed since its stamp stays current until a later change passes another report (reading 9)", async () => {
  const { isOutdated, writtenForStamp, chartKeyOf } = await import("./reports.js");
  const passed = { id: "a", type: "natal", status: "complete", interpretation: { meta: { horizon: "known" } }, computeData: writtenForStamp(T0, 0), horizonPasses: 1, createdAt: at(0) };
  const later = { ...passed, id: "b", computeData: writtenForStamp(T1, 0), horizonPasses: 1, createdAt: at(10) };
  const first = { reportId: "a", at: at(5), replaced: chartKeyOf(chartOf(T0)) };
  assert.equal(isOutdated(passed, profileAt(T1), [first]), false);
  const second = { reportId: "b", at: at(20), replaced: chartKeyOf(chartOf(T1)) };
  assert.equal(isOutdated(passed, profileAt(T2), [first, second]), true);
  assert.equal(isOutdated(later, profileAt(T2), [first, second]), false);
});

test("outdated: a report written before stamps reads its passes; a failed pass that put the time back changed nothing (reading 9)", async () => {
  const { isOutdated, chartKeyOf } = await import("./reports.js");
  const legacy = (id: string, minute: number, horizonPasses = 0) => ({
    id, type: "natal", status: "complete", interpretation: { meta: { horizon: "known" } }, computeData: null, horizonPasses, createdAt: at(minute),
  });
  const k0 = chartKeyOf(chartOf(T0));
  assert.equal(isOutdated(legacy("a", 0), profileAt(T0), []), false, "no change since it was written");
  const passB = { reportId: "b", at: at(5), replaced: k0 };
  assert.equal(isOutdated(legacy("a", 0), profileAt(T1), [passB]), true, "written before the change that passed another");
  assert.equal(isOutdated(legacy("c", 9), profileAt(T1), [passB]), false, "written after it");
  // Before MB-170 a change passed every complete report at once: each took it.
  const together = [{ reportId: "a", at: at(5), replaced: k0 }, { reportId: "b", at: new Date(at(5).getTime() + 40), replaced: k0 }];
  assert.equal(isOutdated(legacy("a", 0, 1), profileAt(T1), together), false);
  assert.equal(isOutdated(legacy("b", 1, 1), profileAt(T1), together), false);
  // A failed pass restores the profile it started from, so the chart it replaced is the profile's still.
  const failed = [{ reportId: "b", at: at(5), replaced: k0 }];
  assert.equal(isOutdated(legacy("a", 0), profileAt(T0), failed), false);
  assert.equal(isOutdated(legacy("b", 1), profileAt(T0), failed), false);
});

// Reading 10: who rewrites. The viewer shapes are the ones the routes are handed.
const WRITER = { userId: "user_writer", sessionId: "s-writer" };
const CLAIMER = { userId: "user_claimer", sessionId: "s-claimer" };
const READER = { userId: "user_reader", sessionId: "s-reader" };
const sentAndClaimed = { userId: WRITER.userId, sessionId: WRITER.sessionId, claimedByUserId: CLAIMER.userId, isSelf: false, claimedAsSelf: true };
const handedOver = { ...sentAndClaimed, userId: CLAIMER.userId, sessionId: "s-nobody" };
const ownChart = { userId: WRITER.userId, sessionId: WRITER.sessionId, claimedByUserId: null, isSelf: true, claimedAsSelf: false };
const { PROMPT_VERSION } = await import("../lib/aiInterpretation.js");
const natalOn = (status: string, sessionId = WRITER.sessionId, promptVersion: string | null = PROMPT_VERSION) => ({
  type: "natal", status, sessionId, interpretation: promptVersion ? { meta: { promptVersion } } : null,
});

test("who rewrites: the writer and the holder after a hand-over; never a shared reader, nor a claimer who does not hold the row (reading 10, MB-169)", async () => {
  const { regenerateRefusal, rightsOf } = await import("./reports.js");
  assert.equal(regenerateRefusal(WRITER, natalOn("failed"), ownChart, false), null);
  assert.equal(regenerateRefusal(CLAIMER, natalOn("failed", "s-nobody"), handedOver, false), null, "the holder after Stop sharing");
  assert.equal(regenerateRefusal(CLAIMER, natalOn("failed"), sentAndClaimed, false)?.status, 404, "the claimer while its writer holds it");
  assert.equal(regenerateRefusal(READER, natalOn("failed"), ownChart, true)?.status, 404, "a reader through a grant");
  const signedOut = { userId: null, sessionId: "s-browser" };
  const theirs = { userId: null, sessionId: "s-browser", claimedByUserId: null };
  assert.equal(regenerateRefusal(signedOut, natalOn("failed", "s-browser"), theirs, false), null, "the session that wrote it");
  assert.equal(regenerateRefusal(WRITER, { ...natalOn("failed"), type: "compatibility" }, ownChart, false)?.status, 404);

  const canRegenerate = (viewer: typeof WRITER, profile: typeof ownChart | typeof handedOver, access: "owner" | "claimed" | "shared", sessionId = WRITER.sessionId) =>
    rightsOf(viewer, { report: natalOn("complete", sessionId), profile, access, maker: false }).regenerate;
  assert.equal(canRegenerate(WRITER, ownChart, "owner"), true);
  assert.equal(canRegenerate(CLAIMER, handedOver, "claimed", "s-nobody"), true);
  assert.equal(canRegenerate(CLAIMER, sentAndClaimed, "claimed"), false);
  assert.equal(canRegenerate(READER, ownChart, "shared"), false);
});

test("a final report has no Try again: regenerate answers 409 with the final line, and canRegenerate is false while Delete stays (ADR-313)", async () => {
  const { regenerateRefusal, rightsOf } = await import("./reports.js");
  const { FINAL_LINE, MAX_TRIES } = await import("../lib/failureReasons.js");
  const failedAfter = (failedTries: number) => ({ ...natalOn("failed"), failedTries });
  assert.equal(regenerateRefusal(WRITER, failedAfter(MAX_TRIES - 1), ownChart, false), null, "the second failure keeps Try again");
  assert.deepEqual(regenerateRefusal(WRITER, failedAfter(MAX_TRIES), ownChart, false), { status: 409, body: { error: "final", message: FINAL_LINE } });
  assert.equal(regenerateRefusal(READER, failedAfter(MAX_TRIES), ownChart, true)?.status, 404, "still only for whoever may rewrite it");
  const rights = (report: ReturnType<typeof natalOn> & { failedTries: number }) =>
    rightsOf(WRITER, { report, profile: ownChart, access: "owner", maker: false });
  assert.equal(rights(failedAfter(MAX_TRIES - 1)).regenerate, true);
  assert.deepEqual(rights(failedAfter(MAX_TRIES)), { send: true, delete: true, regenerate: false });
  assert.equal(rights({ ...natalOn("complete"), failedTries: 0 }).regenerate, true);
});

test("regenerate runs on a failed, an outdated or an earlier-version report: a finished one that is current is refused, one being written answers in_progress (R-6.1, reading 9, MB-45, MB-137)", async () => {
  const { regenerateRefusal } = await import("./reports.js");
  assert.equal(regenerateRefusal(WRITER, natalOn("complete"), ownChart, true), null, "Regenerate on an outdated report");
  assert.equal(regenerateRefusal(WRITER, natalOn("failed"), ownChart, false), null, "Try again");
  assert.equal(regenerateRefusal(WRITER, natalOn("complete", WRITER.sessionId, "v5"), ownChart, false), null, "the earlier-version screen's Regenerate");
  assert.equal(regenerateRefusal(WRITER, natalOn("complete", WRITER.sessionId, null), ownChart, false), null, "a report from before meta");
  assert.equal(regenerateRefusal(READER, natalOn("complete", WRITER.sessionId, "v5"), ownChart, false)?.status, 404, "still only for whoever may rewrite it");
  assert.deepEqual(regenerateRefusal(WRITER, natalOn("complete"), ownChart, false), {
    status: 409, body: { error: "up_to_date", message: "This report is already up to date" },
  });
  for (const status of ["pending", "computing", "interpreting", "revising"]) {
    assert.deepEqual(regenerateRefusal(WRITER, natalOn(status), ownChart, true), {
      status: 409, body: { error: "in_progress", message: "Report is already being generated", status },
    });
  }
});

test("a shared reader reads and nothing more: no send, delete or regenerate of the sharer's, and the sharer is the one who sent it (ADR-235)", async () => {
  const { rightsOf, sharerIdOf } = await import("./reports.js");
  assert.deepEqual(rightsOf(READER, { report: natalOn("complete"), profile: ownChart, access: "shared", maker: false }), { send: false, delete: false, regenerate: false });
  assert.deepEqual(rightsOf(WRITER, { report: natalOn("complete"), profile: ownChart, access: "owner", maker: false }), { send: true, delete: true, regenerate: true });
  assert.deepEqual(rightsOf(CLAIMER, { report: natalOn("complete"), profile: sentAndClaimed, access: "claimed", maker: false }), { send: false, delete: true, regenerate: false });
  const pair = { type: "compatibility", status: "complete", sessionId: WRITER.sessionId };
  assert.deepEqual(rightsOf(READER, { report: pair, profile: ownChart, access: "participant", maker: false }), { send: false, delete: false, regenerate: false });
  assert.deepEqual(rightsOf(WRITER, { report: pair, profile: ownChart, access: null, maker: true }), { send: false, delete: true, regenerate: false }, "a closed pair is still its maker's to delete");

  assert.equal(sharerIdOf(ownChart), WRITER.userId, "the writer's own chart");
  assert.equal(sharerIdOf(sentAndClaimed), CLAIMER.userId, "a chart sent to them and claimed as theirs");
  assert.equal(sharerIdOf({ ...sentAndClaimed, claimedAsSelf: false }), null, "nobody's own chart, so no grant of it reads");
});

test("deleting your Personal report ends your sharing of that chart at once, grants and links, and no one else's (ADR-235, R-3.6)", async () => {
  const { shareEndings } = await import("./reports.js");
  const { db } = await import("@workspace/db");
  const now = new Date("2026-10-03T12:00:00.000Z");
  const [grants, links] = shareEndings(db, "p-sharer", WRITER.userId, now).map((q) => q.toSQL());
  assert.equal(
    grants.sql,
    'update "profile_shares" set "revoked_at" = $1 where ("profile_shares"."profile_id" = $2 and "profile_shares"."owner_user_id" = $3 and "profile_shares"."revoked_at" is null)',
  );
  assert.deepEqual(grants.params, [now.toISOString(), "p-sharer", WRITER.userId]);
  // Expired as well as revoked, as Stop sharing leaves a link, so a reader that checks only the expiry refuses it too.
  assert.equal(
    links.sql,
    'update "invite_tokens" set "expires_at" = $1, "revoked_at" = $2 where ("invite_tokens"."profile_id" = $3 and "invite_tokens"."kind" = $4 and "invite_tokens"."created_by_user_id" = $5 and "invite_tokens"."revoked_at" is null)',
  );
  assert.deepEqual(links.params, [now.toISOString(), now.toISOString(), "p-sharer", "share", WRITER.userId]);
});

// The writes on hard credits, through the routes on a scratch Postgres.
const { setSpendSink } = await import("../lib/spendLedger.js");
const { logger } = await import("../lib/logger.js");
const { chartForProfile } = await import("../lib/profiles.js");
const { getCredits, grantBundle } = await import("../lib/credits.js");
const { FAILURE_LINES, FINAL_LINE } = await import("../lib/failureReasons.js");
const { default: reportsRouter, failReport } = await import("./reports.js");
const { default: compatibilityRouter } = await import("./compatibility.js");
const { default: giftsRouter } = await import("./gifts.js");
const { default: homeRouter } = await import("./home.js");

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the writes run on a scratch Postgres";
const NO_CREDIT_TO_WRITE = { error: "no_credit", message: "You need a credit to write this report." };
const NO_CREDIT_TO_GIVE = { error: "no_credit", message: "You need a credit to give a report." };

// Each step sets the replies the next report is written from; a step that leaves none fails every call.
const fake = installFakeModel({});
// The day's ledger is the breaker's, which other tests read, so these writes leave it as they found it.
setSpendSink(async () => {});

const viewer: RequestHandler = (req, _res, next) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = req.header("x-session") || "s-none";
  req.log = logger;
  next();
};
const app = express();
app.use(express.json());
app.use(viewer);
app.use("/api", reportsRouter, compatibilityRouter, giftsRouter, homeRouter);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.on("listening", () => resolve()));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

/** Each run's own rows, so a second run, or another test on the same database, finds nothing of this one. */
const run = randomUUID().slice(0, 8);
const mine = (tag: string) => `r1721-${run}-${tag}`;

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  const { pool } = await import("@workspace/db");
  if (SCRATCH) {
    const like = `%r1721-${run}-%`;
    await pool.query("delete from relationships where user_id like $1", [like]);
    // A profile takes its reports along, and an account its bundles and credits.
    await pool.query("delete from profiles where user_id like $1 or session_id like $1", [like]);
    await pool.query("delete from invite_tokens where created_by_user_id like $1", [like]);
    await pool.query("delete from users where id like $1", [like]);
  }
  await pool.end();
});

type Who = { user: string | null; session: string };

async function call(who: Who, method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { "x-session": who.session, "content-type": "application/json" };
  if (who.user) headers["x-user"] = who.user;
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const q = async (text: string, params: unknown[]) => (await (await import("@workspace/db")).pool.query(text, params)).rows;

/** A signed-in reader with the credits a bundle grants, as a tester's grant gives them. */
async function signIn(tag: string, ...bundles: Array<"solo" | "couple">): Promise<Who & { user: string }> {
  const who = { user: `user_${mine(tag)}`, session: `s-${mine(tag)}` };
  await q("insert into users (id, email) values ($1, $2)", [who.user, `${tag}-${run}@example.com`]);
  for (const bundle of bundles) await grantBundle(who.user, bundle, { test: true });
  return who;
}

type Person = { name: string; birthDate: string; birthTime: string; latitude: number; longitude: number; timezoneOffset: number; timezone: string };
const PEOPLE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "sample-people");
const person = (id: string): Person => JSON.parse(readFileSync(join(PEOPLE, `${id}.json`), "utf8"));
const MIRA = person("mira");
const IDRIS = person("idris");
const TOMAS = person("tomas");

/** What the birth form posts: the reader's own chart, or someone they add. */
function form(p: Person, isForSelf: boolean) {
  return {
    name: p.name, birthDate: p.birthDate, birthTime: p.birthTime, birthTimeWindowMinutes: 0, birthPlace: "Lisbon",
    latitude: p.latitude, longitude: p.longitude, timezoneOffset: p.timezoneOffset, timezone: p.timezone, isForSelf,
  };
}

/** Canned text whose claims cite the Sun where the engine puts it, with the chart's own sect, so the checks pass it. */
function textFor(p: Person): Record<string, unknown> {
  const chart = chartForProfile({ ...p, birthTimeWindowMinutes: 0 });
  const sun = chart.planets.sun;
  return cannedNatalReplies({ drawn: true, sunSign: sun.sign.toLowerCase(), sunHouse: sun.house, sect: (chart.sunAltitude ?? 0) > 0 ? "day" : "night" });
}

/** A report is written after its route answers, so a step waits on its status as the page does, and leaves none writing. */
async function settled(who: Who, reportId: string): Promise<string> {
  const end = Date.now() + 20_000;
  for (;;) {
    const r = await call(who, "GET", `/reports/${reportId}/status`);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    if (r.body.status === "complete" || r.body.status === "failed") return r.body.status;
    if (Date.now() > end) throw new Error(`${reportId} was still ${r.body.status} after 20 s`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

async function written(who: Who & { user: string }, p: Person, isForSelf: boolean): Promise<string> {
  fake.replies = textFor(p);
  const made = await call(who, "POST", "/reports", form(p, isForSelf));
  assert.equal(made.status, 201, JSON.stringify(made.body));
  assert.equal(await settled(who, made.body.id), "complete");
  return made.body.id;
}

/** Writes a report every call of which fails, and waits for the failure to land. */
async function failedOnce(who: Who & { user: string }, p: Person, isForSelf: boolean): Promise<string> {
  fake.replies = {};
  const made = await call(who, "POST", "/reports", form(p, isForSelf));
  assert.equal(made.status, 201, JSON.stringify(made.body));
  assert.equal(await settled(who, made.body.id), "failed");
  return made.body.id;
}

const ledgerOf = async (who: { user: string }) =>
  (await q("select status, used_for_report_id from credits where user_id = $1 order by created_at, id", [who.user])).map((c) => [c.status, c.used_for_report_id]);
const balanceOf = async (who: { user: string }) => {
  const c = await getCredits(who.user);
  return { available: c.available, used: c.used };
};
const triesOf = async (reportId: string) =>
  (await q("select failed_tries, failed_at from reports where id = $1", [reportId])).map((r) => [r.failed_tries, r.failed_at !== null])[0];
const countOf = async (sql: string, param: string) => Number((await q(sql, [param]))[0].n);

test("db: with no credit a Personal report, a pair and a gift each answer 402 with their own line, and nothing is written (ADR-275)", { skip: NO_DB }, async () => {
  const reader = await signIn("zero", "solo", "solo");
  const a = await written(reader, MIRA, true);
  const b = await written(reader, IDRIS, false);
  assert.deepEqual(await balanceOf(reader), { available: 0, used: 2 });

  const report = await call(reader, "POST", "/reports", form(TOMAS, false));
  assert.deepEqual([report.status, report.body], [402, NO_CREDIT_TO_WRITE]);
  const pair = await call(reader, "POST", "/compatibility", { reportAId: a, reportBId: b, lens: "partners" });
  assert.deepEqual([pair.status, pair.body], [402, NO_CREDIT_TO_WRITE]);
  const gift = await call(reader, "POST", "/gifts", { recipientName: "Pierre", email: "pierre@example.com" });
  assert.deepEqual([gift.status, gift.body], [402, NO_CREDIT_TO_GIVE]);

  assert.equal(await countOf("select count(*) as n from profiles where user_id = $1", reader.user), 2, "no profile for the refused write");
  assert.equal(await countOf("select count(*) as n from reports where session_id = $1", reader.session), 2);
  assert.equal(await countOf("select count(*) as n from relationships where user_id = $1", reader.user), 0, "no pair made for the refused one");
  assert.equal(await countOf("select count(*) as n from invite_tokens where created_by_user_id = $1", reader.user), 0, "no gift to send");
  assert.deepEqual(await balanceOf(reader), { available: 0, used: 2 });

  // A session holds no credit, so a signed-out write hears the same, where the host lets it ask at all.
  const signedOut = { user: null, session: `s-${mine("signed-out")}` };
  const anon = await call(signedOut, "POST", "/reports", form(MIRA, true));
  assert.deepEqual([anon.status, anon.body], [402, NO_CREDIT_TO_WRITE]);
  assert.equal(await countOf("select count(*) as n from profiles where session_id = $1", signedOut.session), 0);
});

test("db: two writes racing for one credit: one is written, the other answers 402 and takes nothing (ADR-275)", { skip: NO_DB }, async () => {
  const racer = await signIn("race", "solo");
  fake.replies = textFor(IDRIS);
  const [x, y] = await Promise.all([1, 2].map(() => call(racer, "POST", "/reports", form(IDRIS, false))));
  assert.deepEqual([x.status, y.status].sort(), [201, 402]);
  const [won, lost] = x.status === 201 ? [x, y] : [y, x];
  assert.deepEqual(lost.body, NO_CREDIT_TO_WRITE);
  assert.equal(await settled(racer, won.body.id), "complete");
  assert.deepEqual(await ledgerOf(racer), [["used", won.body.id]]);
  assert.deepEqual((await q("select id from reports where session_id = $1", [racer.session])).map((r) => r.id), [won.body.id]);
});

test("db: a failed Personal report keeps its credit, Try again is free, and its finish spends that one credit (ADR-313, reading 16)", { skip: NO_DB }, async () => {
  const reader = await signIn("retry", "solo");
  const id = await failedOnce(reader, MIRA, true);
  assert.deepEqual(await ledgerOf(reader), [["used", id]], "the credit stays on the report");
  assert.deepEqual(await triesOf(id), [1, true]);
  const failed = await call(reader, "GET", `/reports/${id}`);
  assert.equal(failed.body.canRegenerate, true);
  assert.equal(failed.body.failureReason.line, FAILURE_LINES[failed.body.failureReason.code as keyof typeof FAILURE_LINES]);
  assert.equal((await call(reader, "GET", "/home")).body.you.canRegenerate, true);

  fake.replies = textFor(MIRA);
  const again = await call(reader, "POST", `/reports/${id}/regenerate`);
  assert.equal(again.status, 202, JSON.stringify(again.body));
  assert.equal(await settled(reader, id), "complete");
  assert.deepEqual(await ledgerOf(reader), [["used", id]], "one credit, spent once");
  assert.deepEqual(await triesOf(id), [0, true], "finished, so its count starts again");
});

test("db: the third failure gives the credit back once and makes the report final, with its line and no Try again (ADR-313)", { skip: NO_DB }, async () => {
  const reader = await signIn("final", "solo");
  const id = await failedOnce(reader, MIRA, true);
  const again = await call(reader, "POST", `/reports/${id}/regenerate`);
  assert.equal(again.status, 202, JSON.stringify(again.body));
  assert.equal(await settled(reader, id), "failed");
  assert.deepEqual([await triesOf(id), await ledgerOf(reader)], [[2, true], [["used", id]]], "two failures, the credit still on it");

  // A second Try again within the minute meets the cooldown (ADR-199), so the third failure lands as its write's would.
  await failReport(id, new Error("the third try failed"));
  assert.deepEqual(await triesOf(id), [3, true]);
  assert.deepEqual(await ledgerOf(reader), [["available", null]], "the credit is back in the balance");

  const read = await call(reader, "GET", `/reports/${id}`);
  assert.deepEqual([read.body.status, read.body.canRegenerate, read.body.failureReason.line], ["failed", false, FINAL_LINE]);
  const status = await call(reader, "GET", `/reports/${id}/status`);
  assert.deepEqual([status.body.canRegenerate, status.body.failureReason.line], [false, FINAL_LINE]);
  const listed = (await call(reader, "GET", "/reports")).body.find((r: { id: string }) => r.id === id);
  assert.equal(listed.failureReason.line, FINAL_LINE);
  const home = (await call(reader, "GET", "/home")).body;
  assert.deepEqual([home.you.reportId, home.you.status, home.you.canRegenerate], [id, "failed", false]);
  const refused = await call(reader, "POST", `/reports/${id}/regenerate`);
  assert.deepEqual([refused.status, refused.body], [409, { error: "final", message: FINAL_LINE }]);

  // Once: the credit back pays for the next report, and a stray failure of the final one leaves it there.
  const next = await written(reader, IDRIS, false);
  await failReport(id, new Error("a stray failure"));
  assert.deepEqual(await ledgerOf(reader), [["used", next]]);
});

test("db: Delete gives a failed report's credit back first, once; a finished report's stays spent (ADR-313)", { skip: NO_DB }, async () => {
  const reader = await signIn("delete", "solo", "solo");
  const failed = await failedOnce(reader, MIRA, true);
  assert.deepEqual(await balanceOf(reader), { available: 1, used: 1 });
  assert.equal((await call(reader, "DELETE", `/reports/${failed}`)).status, 204);
  assert.deepEqual(await balanceOf(reader), { available: 2, used: 0 }, "its credit is back");
  assert.equal((await call(reader, "DELETE", `/reports/${failed}`)).status, 404);
  assert.deepEqual(await balanceOf(reader), { available: 2, used: 0 }, "and back once");

  const finished = await written(reader, IDRIS, false);
  assert.equal((await call(reader, "DELETE", `/reports/${finished}`)).status, 204);
  assert.deepEqual(await balanceOf(reader), { available: 1, used: 1 }, "a finished report was paid for");
});

test("db: a pair that fails gives its credit back at once and is final; its Delete gives nothing more (ADR-313)", { skip: NO_DB }, async () => {
  const maker = await signIn("pair", "couple");
  const a = await written(maker, MIRA, true);
  const b = await written(maker, IDRIS, false);
  fake.replies = {};
  const pair = await call(maker, "POST", "/compatibility", { reportAId: a, reportBId: b, lens: "partners" });
  assert.equal(pair.status, 201, JSON.stringify(pair.body));
  assert.equal(await settled(maker, pair.body.id), "failed");
  assert.deepEqual(await balanceOf(maker), { available: 1, used: 2 }, "a pair has no Try again, so its credit is back at once");
  assert.deepEqual(await triesOf(pair.body.id), [1, true]);
  const read = await call(maker, "GET", `/reports/${pair.body.id}`);
  assert.deepEqual([read.body.canRegenerate, read.body.failureReason.line], [false, FINAL_LINE]);
  assert.equal((await call(maker, "DELETE", `/reports/${pair.body.id}`)).status, 204);
  assert.deepEqual(await balanceOf(maker), { available: 1, used: 2 });
});
