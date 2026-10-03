/**
 * The hand-back (ADR-236) and a birth-time change over many reports (MB-170), each through the real router and drizzle
 * with the pool answered from memory, so every statement a route sends is read here as Postgres would run it. R15-28's
 * walk runs the same paths on a scratch Postgres.
 */
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import express from "express";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL = "silent";
const { pool } = await import("@workspace/db");
const { logger } = await import("../lib/logger.js");
const { buildLimits, LIMIT_LINES } = await import("../lib/limits.js");
const { chartForProfile } = await import("../lib/profiles.js");
const { default: profilesRouter, handBackOf, reportToPass } = await import("./profiles.js");

type Row = Record<string, unknown>;
type Statement = { text: string; params: unknown[] };
type Who = { user?: string; session: string };

const WRITER: Who = { user: "user_writer", session: "s-writer" };
const CLAIMER: Who = { user: "user_claimer", session: "s-claimer" };
const STRANGER: Who = { user: "user_stranger", session: "s-stranger" };
const VISITOR: Who = { session: "s-visitor" };
const viewerOf = (who: Who) => ({ userId: who.user ?? null, sessionId: who.session });

/** The columns a statement reads back, in order: its select list, else its returning list. */
function columnsOf(text: string): string[] {
  const list = text.startsWith("select ") ? text.slice(7, text.indexOf(" from ")) : text.slice(text.indexOf(" returning ") + 11);
  return list.split(", ").map((c) => c.slice(c.lastIndexOf(".") + 1).replaceAll('"', ""));
}

/**
 * Stands in for Postgres under drizzle: every statement, in a transaction or not, is kept, and `answer` gives the rows
 * of the ones that read. Rows are keyed by column name and sent in the order the statement names them.
 */
function fakePool(t: TestContext, answer: (s: Statement) => Row[] | undefined): Statement[] {
  const sent: Statement[] = [];
  const query = async (config: string | { text: string; rowMode?: string }, params: unknown[] = []) => {
    const text = typeof config === "string" ? config : config.text;
    sent.push({ text, params });
    const rows = answer({ text, params }) ?? [];
    const arrays = typeof config !== "string" && config.rowMode === "array";
    return { rows: arrays ? rows.map((r) => columnsOf(text).map((c) => r[c] ?? null)) : rows, rowCount: rows.length };
  };
  t.mock.method(pool, "query", query);
  t.mock.method(pool, "connect", async () => ({ query, release: () => {} }));
  return sent;
}

/** A statement with its parameters written in, so a test reads what Postgres would run; every timestamp reads `now`. */
function bound({ text, params }: Statement): string {
  return text.replace(/\$(\d+)/g, (_, n: string) => {
    const v = params[Number(n) - 1];
    if (v === null || v === undefined) return "null";
    if (typeof v === "string") return /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) ? "now" : `'${v}'`;
    return String(v);
  });
}

/** The profiles router behind the session stub and, on the birth-time change, the writing chain's own limits. */
async function serve(t: TestContext) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = req.header("x-user") || null;
    req.sessionId = req.header("x-session") || "s-none";
    req.log = logger;
    next();
  });
  app.patch("/profiles/:id/birth-time", buildLimits().generationLimits);
  app.use(profilesRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return async (who: Who, method: string, path: string, body?: unknown) => {
    const headers: Record<string, string> = { "content-type": "application/json", "x-session": who.session };
    if (who.user) headers["x-user"] = who.user;
    const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    const json = res.headers.get("content-type")?.includes("application/json");
    return { status: res.status, body: (text && json ? JSON.parse(text) : text) as unknown };
  };
}

/** A chart its writer sent and its subject claimed, as the row the hand-back locks reads it. */
const SENT = { user_id: WRITER.user, session_id: WRITER.session, claimed_by_user_id: CLAIMER.user };
const LOCK = `select "user_id", "session_id", "claimed_by_user_id" from "profiles" where "profiles"."id" = 'P1' for update`;
const SENDER = `select "created_by_user_id" from "invite_tokens" where ("invite_tokens"."profile_id" = 'P1' and "invite_tokens"."kind" = 'send' and "invite_tokens"."claimed_by_user_id" = 'user_claimer') order by "invite_tokens"."created_at" desc limit 1`;
const AFTER_CLAIM_ENDS = [
  `update "relationship_participants" set "access_role" = 'owner' where ("relationship_participants"."profile_id" = 'P1' and "relationship_participants"."access_role" = 'participant')`,
  `update "invite_tokens" set "handed_back_at" = now where ("invite_tokens"."profile_id" = 'P1' and "invite_tokens"."kind" = 'send' and "invite_tokens"."claimed_by_user_id" = 'user_claimer' and "invite_tokens"."handed_back_at" is null)`,
  `update "profile_shares" set "revoked_at" = now where ("profile_shares"."profile_id" = 'P1' and "profile_shares"."owner_user_id" = 'user_claimer' and "profile_shares"."revoked_at" is null)`,
  `update "invite_tokens" set "expires_at" = now, "revoked_at" = now where ("invite_tokens"."profile_id" = 'P1' and "invite_tokens"."kind" = 'share' and "invite_tokens"."created_by_user_id" = 'user_claimer' and "invite_tokens"."claimed_at" is null and "invite_tokens"."revoked_at" is null)`,
];

function handBackDb(t: TestContext, profile: Row | null, senders: Row[] = []) {
  return fakePool(t, ({ text, params }) => {
    if (text.startsWith('select "user_id", "session_id", "claimed_by_user_id" from "profiles"')) {
      return profile && params[0] === "P1" ? [profile] : [];
    }
    if (text.startsWith('select "created_by_user_id" from "invite_tokens"')) return senders;
    return undefined;
  });
}

test("hand-back: the claimer hands a sent chart back in one transaction; the claim ends, its pair grants go to the writer, the send is stamped and their shares of it end (ADR-236, reading 6)", async (t) => {
  const sent = handBackDb(t, SENT);
  const call = await serve(t);
  const r = await call(CLAIMER, "POST", "/profiles/P1/hand-back");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { profileId: "P1" });
  assert.deepEqual(sent.map(bound), [
    "begin",
    LOCK,
    `update "profiles" set "claimed_by_user_id" = null, "claimed_as_self" = false, "updated_at" = now where "profiles"."id" = 'P1'`,
    ...AFTER_CLAIM_ENDS,
    "commit",
  ]);
});

test("hand-back after a hand-over (the claimer's Stop sharing, or the giver's Remove): the chart goes back to whoever sent it, without the holder's own-chart mark or a report in their browser's session (ADR-236, R-3.6)", async (t) => {
  const sent = handBackDb(t, { user_id: CLAIMER.user, session_id: "s-nobody", claimed_by_user_id: CLAIMER.user }, [
    { created_by_user_id: WRITER.user },
  ]);
  const call = await serve(t);
  const r = await call(CLAIMER, "POST", "/profiles/P1/hand-back");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { profileId: "P1" });
  assert.deepEqual(sent.map(bound), [
    "begin",
    LOCK,
    SENDER,
    `update "profiles" set "user_id" = 'user_writer', "claimed_by_user_id" = null, "claimed_as_self" = false, "is_self" = false, "updated_at" = now where "profiles"."id" = 'P1'`,
    `update "reports" set "session_id" = 's-nobody', "updated_at" = now where ("reports"."profile_id" = 'P1' and "reports"."type" = 'natal' and "reports"."session_id" <> 's-nobody')`,
    ...AFTER_CLAIM_ENDS,
    "commit",
  ]);
});

test("hand-back after a hand-over with no send to find its sender in: 404, and nothing is written", async (t) => {
  const sent = handBackDb(t, { user_id: CLAIMER.user, session_id: "s-nobody", claimed_by_user_id: CLAIMER.user });
  const call = await serve(t);
  const r = await call(CLAIMER, "POST", "/profiles/P1/hand-back");
  assert.equal(r.status, 404);
  assert.deepEqual(sent.map(bound), ["begin", LOCK, SENDER, "commit"]);
});

test("hand-back by anyone but the claimer: its giver, a stranger and a missing id read alike as 404 and write nothing; a visitor sends no query", async (t) => {
  const sent = handBackDb(t, SENT);
  const call = await serve(t);
  for (const [who, id] of [[WRITER, "P1"], [STRANGER, "P1"], [CLAIMER, "P-missing"]] as const) {
    const before = sent.length;
    const r = await call(who, "POST", `/profiles/${id}/hand-back`);
    assert.equal(r.status, 404, `${who.user} on ${id}`);
    assert.deepEqual(r.body, { error: "not_found", message: "Profile not found" });
    assert.deepEqual(sent.slice(before).map((s) => s.text.split(" ")[0]), ["begin", "select", "commit"], `${who.user} on ${id}`);
  }
  const before = sent.length;
  assert.equal((await call(VISITOR, "POST", "/profiles/P1/hand-back")).status, 404);
  assert.equal(sent.length, before);
});

test("hand-back on the writer's own chart, which no one has claimed: 409 not_claimed, and nothing is written", async (t) => {
  const sent = handBackDb(t, { ...SENT, claimed_by_user_id: null });
  const call = await serve(t);
  const r = await call(WRITER, "POST", "/profiles/P1/hand-back");
  assert.equal(r.status, 409);
  assert.deepEqual(r.body, { error: "not_claimed", message: "You had this report written, so there's no one to hand it back to." });
  assert.deepEqual(sent.map(bound), ["begin", `select "user_id", "session_id", "claimed_by_user_id" from "profiles" where "profiles"."id" = 'P1' for update`, "commit"]);
});

test("handBackOf: the claimer, also after a hand-over made the row theirs; never its giver, a signed-out browser, a stranger or a reader through a grant", () => {
  const sent = { userId: "user_writer", sessionId: "s-writer", claimedByUserId: "user_claimer" };
  assert.equal(handBackOf(viewerOf(CLAIMER), sent), "hand_back");
  assert.equal(handBackOf(viewerOf(CLAIMER), { ...sent, userId: "user_claimer", sessionId: "s-nobody" }), "hand_back");
  assert.equal(handBackOf(viewerOf(WRITER), sent), "not_found");
  assert.equal(handBackOf({ userId: null, sessionId: "s-writer" }, sent), "not_found");
  // A grant reads only through `shared`, which the hand-back never passes, so its reader stands as a stranger does.
  assert.equal(handBackOf(viewerOf(STRANGER), sent), "not_found");
  assert.equal(handBackOf(viewerOf(CLAIMER), null), "not_found");
  assert.equal(handBackOf(viewerOf(WRITER), { ...sent, claimedByUserId: null }), "not_claimed");
});

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "charts");
const charlotte = JSON.parse(readFileSync(join(FIXTURES, "charlotte.json"), "utf8")) as {
  name: string; birthDate: string; birthTime: string; latitude: number; longitude: number; timezone: string; timezoneOffset: number;
};
const DAY_MS = 24 * 60 * 60 * 1000;

function profileRow(): Row {
  const chart = chartForProfile({ ...charlotte, birthTimeWindowMinutes: 0 });
  return {
    id: "PH", session_id: WRITER.session, user_id: WRITER.user, claimed_by_user_id: null, claimed_as_self: false,
    is_self: false, name: charlotte.name, birth_date: charlotte.birthDate, birth_time: charlotte.birthTime,
    birth_place: "London", latitude: charlotte.latitude, longitude: charlotte.longitude,
    timezone_offset: chart.timezoneOffset, timezone: charlotte.timezone, birth_time_window_minutes: 0,
    chart_data: chart, created_at: new Date("2026-09-01T09:00:00Z"), updated_at: new Date("2026-09-01T09:00:00Z"),
  };
}

/** Seven complete Personal reports of one profile, a day apart, each written for the time it holds now. */
function sevenReports(): Row[] {
  return Array.from({ length: 7 }, (_, i) => ({
    id: `R${i + 1}`, profile_id: "PH", session_id: WRITER.session, type: "natal", status: "complete",
    interpretation: { meta: { horizon: "known" } }, workbook: {}, horizon_passes: 0,
    created_at: new Date(Date.UTC(2026, 8, 1) + i * DAY_MS), updated_at: new Date(Date.UTC(2026, 8, 1) + i * DAY_MS),
  }));
}

test("birth time: a change over seven complete reports passes only the newest and holds one write, where it heard the \"6 reports\" 429 before (MB-170)", async (t) => {
  const reports = sevenReports();
  const sent = fakePool(t, ({ text, params }) => {
    if (text.includes(' from "profiles" where "profiles"."id" = $1 limit $2')) return params[0] === "PH" ? [profileRow()] : [];
    if (text.includes(' from "reports" where ("reports"."profile_id" = $1 and "reports"."type" = $2)')) return reports;
    // The pass reads its report first; finding none, it stops before any model call or write.
    return undefined;
  });
  const call = await serve(t);
  const passLoads = () => sent.filter((s) => s.text.includes(' from "reports" where "reports"."id" = $1')).map((s) => s.params[0]);

  const r = await call(WRITER, "PATCH", "/profiles/PH/birth-time", { birthTime: "06:30", birthTimeWindowMinutes: 0 });
  assert.equal(r.status, 202, JSON.stringify(r.body));
  assert.deepEqual(r.body, { profileId: "PH", horizon: "known", reportIds: ["R7"] });
  const saved = sent.filter((s) => s.text.startsWith('update "profiles" set "birth_time" = $1'));
  assert.equal(saved.length, 1);
  assert.deepEqual(saved[0].params.slice(0, 2), ["06:30", 0]);
  const end = Date.now() + 2000;
  while (passLoads().length === 0 && Date.now() < end) await new Promise((resolve) => setTimeout(resolve, 10));
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepEqual(passLoads(), ["R7"], "one pass, on the newest; the six older are left as written, outdated");
  assert.ok(!sent.some((s) => /^update "reports"/.test(s.text)), "no older report is touched");

  // One write each: five more changes fit the hour's six, and the next is the usual 429.
  for (const time of ["06:31", "06:32", "06:33", "06:34", "06:35"]) {
    const again = await call(WRITER, "PATCH", "/profiles/PH/birth-time", { birthTime: time, birthTimeWindowMinutes: 0 });
    assert.equal(again.status, 202, time);
    assert.deepEqual((again.body as { reportIds: string[] }).reportIds, ["R7"], time);
  }
  const seventh = await call(WRITER, "PATCH", "/profiles/PH/birth-time", { birthTime: "06:36", birthTimeWindowMinutes: 0 });
  assert.equal(seventh.status, 429);
  assert.equal((seventh.body as { message: string }).message, LIMIT_LINES.write);
  while (passLoads().length < 6 && Date.now() < end + 2000) await new Promise((resolve) => setTimeout(resolve, 10));
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepEqual(passLoads(), Array(6).fill("R7"), "the refused change started no pass");
  assert.equal(sent.filter((s) => s.text.startsWith('update "profiles" set "birth_time" = $1')).length, 6, "and saved no time");
});

test("reportToPass: the newest complete report, whichever order the rows come in, when its text can say more", () => {
  const at = (day: number) => new Date(Date.UTC(2026, 8, day));
  const r = (id: string, day: number, status = "complete", horizon = "known") => ({
    id, status, createdAt: at(day), interpretation: { meta: { horizon } },
  });
  const rows = [r("R1", 1), r("R3", 3), r("R2", 2)];
  assert.equal(reportToPass(rows, "known", false)?.id, "R3", "a changed time passes the newest");
  assert.equal(reportToPass(rows, "known", true), null, "the same answer again passes nothing");
  assert.equal(reportToPass([r("R1", 1, "complete", "unknown"), r("R2", 2)], "known", true), null,
    "an older blind report is left outdated, not passed");
  assert.equal(reportToPass([r("R1", 1), r("R2", 2, "complete", "unknown")], "known", true)?.id, "R2",
    "the newest still blind is passed on the same answer");
  assert.equal(reportToPass([r("R1", 1), r("R2", 2, "failed")], "known", false)?.id, "R1", "a failed newer one is not complete");
  assert.equal(reportToPass([{ ...r("R2", 2), interpretation: null }, r("R1", 1)], "known", false)?.id, "R1",
    "a row with no text has nothing to amend");
  assert.equal(reportToPass([r("R2b", 2), r("R2a", 2)], "known", false)?.id, "R2b", "a tie keeps the first, as the query ordered it");
  assert.equal(reportToPass([r("R1", 1, "generating")], "known", false), null);
});

/** Charlotte's chart as its writer holds it once she claimed it, with or without a mark its writer left on it. */
function claimedRow(isSelf: boolean): Row {
  return { ...profileRow(), id: "P1", claimed_by_user_id: CLAIMER.user, claimed_as_self: true, is_self: isSelf };
}

/** The PATCH's one read, the profile among those the viewer holds or claimed; every write is kept and answers nothing. */
function markDb(t: TestContext, row: () => Row) {
  return fakePool(t, ({ text, params }) => {
    if (text.startsWith("select ") && text.includes(' from "profiles" where ("profiles"."id" = $1 and ')) {
      return params[0] === row().id ? [row()] : [];
    }
    return undefined;
  });
}

test("mark: a writer's This is me on a chart its subject claimed is refused, whether or not a mark was left on it, and nothing is written (R-3.6)", async (t) => {
  let row = claimedRow(false);
  const sent = markDb(t, () => row);
  const call = await serve(t);
  for (const isSelf of [false, true]) {
    row = claimedRow(isSelf);
    const before = sent.length;
    const r = await call(WRITER, "PATCH", "/profiles/P1", { isSelf: true });
    assert.equal(r.status, 403, `left marked: ${isSelf}`);
    assert.deepEqual(r.body, { error: "forbidden", message: "Charlotte already has this report, so you can't mark it as yours." });
    assert.deepEqual(sent.slice(before).map((s) => s.text.split(" ")[0]), ["select"], `left marked: ${isSelf}`);
  }
});

test("mark: the writer can still take a mark off a chart its subject claimed, and the chart reads as theirs to no one but her", async (t) => {
  const sent = markDb(t, () => claimedRow(true));
  const call = await serve(t);
  const r = await call(WRITER, "PATCH", "/profiles/P1", { isSelf: false });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((r.body as { isSelf: boolean }).isSelf, false);
  const unmark = sent.find((s) => s.text.startsWith('update "profiles" set "is_self" = $1'));
  assert.deepEqual([unmark?.params[0], unmark?.params.at(-1)], [false, "P1"]);
});
