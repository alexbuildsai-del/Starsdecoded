/**
 * History's lines without a database (readings 4 and 9): which rows make a
 * line, what each line reads, and the order; and the 402's two lines. On a
 * scratch Postgres, when WALK_DATABASE_URL names a bootstrapped one, a
 * report's credit (ADR-275, 313): taken in the transaction that writes the
 * report or not at all, one credit to one of two writes racing for it, given
 * back once, and no gift held with none; they skip, saying why, without it.
 * A refund's take-back runs in fulfilment.test.ts, the routes' 402s and a
 * failed report's credit in routes/reports.test.ts.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points nowhere and nothing queries it.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL ??= "silent";
const { getCredits, grantBundle, hasCredit, historyLines, holdCredit, noCredit, refundCredit, writeWithCredit } = await import("./credits.js");
type HistoryRow = import("./credits.js").HistoryRow;

const at = (iso: string) => new Date(iso);
const GONE = "A report you no longer have";
const GRANTED = at("2026-09-26T10:00:00Z");

function spentOn(iso: string, names: string[], opts: { pair?: boolean; stillYours?: boolean; test?: boolean } = {}): HistoryRow {
  return {
    kind: "spent",
    grantedAt: GRANTED,
    test: opts.test ?? false,
    report: { at: at(iso), names, pair: opts.pair ?? false, stillYours: opts.stillYours ?? true },
  };
}

test("bought: a bundle is one line, its count bought", () => {
  assert.deepEqual(historyLines([{ kind: "bundle", at: GRANTED, count: 3, test: false }]), [
    { kind: "bought", count: 3, date: "2026-09-26T10:00:00.000Z", label: "3 credits bought", test: false },
  ]);
  assert.equal(historyLines([{ kind: "bundle", at: GRANTED, count: 1, test: false }])[0].label, "1 credit bought");
});

test("bought: a purchase reads as bought, a sandbox one and the old test checkout's as test credits (reading 4)", () => {
  const lines = historyLines([
    { kind: "bundle", at: GRANTED, count: 5, test: false, source: "purchase" },
    { kind: "bundle", at: GRANTED, count: 3, test: true, source: "purchase" },
    { kind: "bundle", at: GRANTED, count: 1, test: true, source: "test" },
  ]);
  assert.deepEqual(lines.map((l) => [l.kind, l.label]), [
    ["bought", "5 credits bought"],
    ["bought", "3 test credits"],
    ["bought", "1 test credit"],
  ]);
});

test("granted: a grant reads From Stars Decoded and the yearly plan's credit With Timeline, each adding (reading 4)", () => {
  const lines = historyLines([
    { kind: "bundle", at: GRANTED, count: 3, test: false, source: "grant" },
    { kind: "bundle", at: at("2026-10-02T10:00:00Z"), count: 1, test: true, source: "plan" },
  ]);
  assert.deepEqual(lines, [
    { kind: "granted", count: 1, date: "2026-10-02T10:00:00.000Z", label: "With Timeline", test: true },
    { kind: "granted", count: 3, date: "2026-09-26T10:00:00.000Z", label: "From Stars Decoded", test: false },
  ]);
});

test("refunded: what refunds took back from a purchase is one line, Refunded, its count positive, dated the first", () => {
  const refundedAt = at("2026-09-30T09:00:00Z");
  const lines = historyLines([
    { kind: "bundle", at: GRANTED, count: 5, test: false, source: "purchase" },
    { kind: "refunded", at: refundedAt, count: 3, test: false },
    { kind: "refunded", at: refundedAt, count: 0, test: false },
  ]);
  assert.deepEqual(lines, [
    { kind: "refunded", count: 3, date: "2026-09-30T09:00:00.000Z", label: "Refunded", test: false },
    { kind: "bought", count: 5, date: "2026-09-26T10:00:00.000Z", label: "5 credits bought", test: false },
  ]);
});

test("test: a test bundle says so and is marked, and so is a spend of one of its credits (ADR-138)", () => {
  const [five] = historyLines([{ kind: "bundle", at: GRANTED, count: 5, test: true }]);
  assert.deepEqual(five, { kind: "bought", count: 5, date: "2026-09-26T10:00:00.000Z", label: "5 test credits", test: true });
  assert.equal(historyLines([{ kind: "bundle", at: GRANTED, count: 1, test: true }])[0].label, "1 test credit");
  const [spent] = historyLines([spentOn("2026-09-27T09:00:00Z", ["Beatrice"], { test: true })]);
  assert.equal(spent.test, true);
});

test("gift: the recipient's line names the giver, the giver's is Gift to {name}, both dated the claim", () => {
  const claimedAt = at("2026-10-01T08:30:00Z");
  const received = historyLines([{ kind: "gift", side: "recipient", claimedAt, credit: { test: false }, name: "Alex" }]);
  assert.deepEqual(received, [
    { kind: "gift", count: 1, date: "2026-10-01T08:30:00.000Z", label: "A gift from Alex", test: false },
  ]);
  const given = historyLines([{ kind: "gift", side: "giver", claimedAt, credit: { test: true }, name: "Pierre" }]);
  assert.deepEqual(given, [
    { kind: "spent", count: 1, date: "2026-10-01T08:30:00.000Z", label: "Gift to Pierre", test: true },
  ]);
  assert.equal(historyLines([{ kind: "gift", side: "recipient", claimedAt, credit: { test: false }, name: null }])[0].label, "A gift");
  assert.equal(historyLines([{ kind: "gift", side: "giver", claimedAt, credit: { test: false }, name: "  " }])[0].label, "A gift you gave");
});

test("spent: a report still the viewer's reads as the report list names it, on the day it was written", () => {
  const lines = historyLines([
    spentOn("2026-09-26T11:00:00Z", ["Beatrice Young"]),
    spentOn("2026-09-27T11:00:00Z", ["Alex", "Beatrice Young"], { pair: true }),
    spentOn("2026-09-28T11:00:00Z", ["Alex"], { pair: true }),
  ]);
  assert.deepEqual(lines.map((l) => [l.kind, l.count, l.label, l.date]), [
    ["spent", 1, "Compatibility", "2026-09-28T11:00:00.000Z"],
    ["spent", 1, "Alex & Beatrice Young", "2026-09-27T11:00:00.000Z"],
    ["spent", 1, "Beatrice Young", "2026-09-26T11:00:00.000Z"],
  ]);
});

test("spent: a report that left the viewer reads like a deleted one, label and date, so no later step shows (ADR-139)", () => {
  const [moved, deleted] = historyLines([
    spentOn("2026-09-29T11:00:00Z", ["Beatrice"], { stillYours: false }),
    { kind: "spent", grantedAt: GRANTED, test: false, report: null },
  ]);
  assert.deepEqual(moved, deleted);
  assert.equal(moved.label, GONE);
  assert.equal(moved.date, GRANTED.toISOString());
});

test("returned: a gift taken back or expired makes no line, nor a waiting one, nor a claim that moved no credit", () => {
  const claimedAt = at("2026-10-01T08:30:00Z");
  const none: HistoryRow[] = [
    { kind: "gift", side: "giver", claimedAt: null, credit: null, name: "Pierre" },
    { kind: "gift", side: "giver", claimedAt: null, credit: { test: false }, name: "Marie" },
    { kind: "gift", side: "giver", claimedAt, credit: null, name: "George" },
    { kind: "gift", side: "recipient", claimedAt, credit: null, name: "Alex" },
  ];
  assert.deepEqual(historyLines(none), []);
});

test("a gift to oneself is one line each way and nets to nothing", () => {
  const claimedAt = at("2026-10-01T08:30:00Z");
  const lines = historyLines([
    { kind: "gift", side: "giver", claimedAt, credit: { test: false }, name: "Alex" },
    { kind: "gift", side: "recipient", claimedAt, credit: { test: false }, name: "Alex" },
  ]);
  const net = lines.reduce((sum, l) => sum + (l.kind === "spent" ? -l.count : l.count), 0);
  assert.equal(lines.length, 2);
  assert.equal(net, 0);
});

test("newest first; at the same instant a spend reads above the purchase; every count is positive", () => {
  const lines = historyLines([
    { kind: "bundle", at: GRANTED, count: 5, test: false },
    spentOn(GRANTED.toISOString(), ["Beatrice"]),
    { kind: "gift", side: "giver", claimedAt: at("2026-09-29T12:00:00Z"), credit: { test: false }, name: "Pierre" },
    { kind: "bundle", at: at("2026-10-02T10:00:00Z"), count: 3, test: true },
    spentOn("2026-09-27T10:00:00Z", ["Alex", "Beatrice"], { pair: true }),
  ]);
  assert.deepEqual(lines.map((l) => l.label), [
    "3 test credits",
    "Gift to Pierre",
    "Alex & Beatrice",
    "Beatrice",
    "5 credits bought",
  ]);
  assert.ok(lines.every((l) => l.count > 0));
});

test("no credit: a write's 402 and a gift's each say what the credit pays for, on every host (ADR-275, R16-29)", () => {
  assert.deepEqual(noCredit("report"), { error: "no_credit", message: "You need a credit to write this report." });
  assert.deepEqual(noCredit("gift"), { error: "no_credit", message: "You need a credit to give a report." });
});

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the ledger's writes run on a scratch Postgres";

/** Each run's own rows, so a second run, or another test on the same database, finds nothing of this one. */
const run = randomUUID().slice(0, 8);
const mine = (tag: string) => `r1721c-${run}-${tag}`;

const MIRA = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "sample-people", "mira.json"), "utf8"),
);

after(async () => {
  if (!SCRATCH) return;
  const { pool } = await import("@workspace/db");
  const like = `r1721c-${run}-%`;
  await pool.query("delete from invite_tokens where id like $1", [like]);
  // A profile takes its reports along, and an account its bundles and credits.
  await pool.query("delete from profiles where id like $1", [like]);
  await pool.query("delete from users where id like $1", [like]);
  await pool.end();
});

type Reader = { userId: string; profileId: string; sessionId: string };

/** An account with one chart to write about, and the bundle it was granted, if any. */
async function reader(tag: string, bundle?: "solo" | "couple"): Promise<Reader> {
  const { db, profilesTable, usersTable } = await import("@workspace/db");
  const r = { userId: mine(`user-${tag}`), profileId: mine(`p-${tag}`), sessionId: mine(`s-${tag}`) };
  await db.insert(usersTable).values({ id: r.userId, email: `${tag}-${run}@example.com` });
  await db.insert(profilesTable).values({
    id: r.profileId, sessionId: r.sessionId, userId: r.userId, name: MIRA.name, birthDate: MIRA.birthDate, birthTime: MIRA.birthTime,
    birthPlace: "Lisbon", latitude: MIRA.latitude, longitude: MIRA.longitude, timezoneOffset: MIRA.timezoneOffset, timezone: MIRA.timezone,
  });
  if (bundle) await grantBundle(r.userId, bundle, { test: true });
  return r;
}

type Tx = Parameters<Parameters<typeof writeWithCredit>[2]>[0];

/** The report row POST /reports writes, in the transaction it is handed. */
async function insertReport(tx: Tx, r: Reader, reportId: string): Promise<void> {
  const { reportsTable } = await import("@workspace/db");
  await tx.insert(reportsTable).values({ id: reportId, profileId: r.profileId, sessionId: r.sessionId, type: "natal", status: "interpreting" });
}

async function ledgerOf(r: Reader): Promise<Array<[string, string | null]>> {
  const { pool } = await import("@workspace/db");
  const rows = await pool.query("select status, used_for_report_id from credits where user_id = $1 order by created_at, id", [r.userId]);
  return rows.rows.map((c) => [c.status, c.used_for_report_id]);
}

async function reportIdsOf(r: Reader): Promise<string[]> {
  const { pool } = await import("@workspace/db");
  return (await pool.query("select id from reports where profile_id = $1 order by id", [r.profileId])).rows.map((x) => x.id);
}

test("db, a report's credit: with none to take nothing is written; with one, the credit and the report land together (ADR-275)", { skip: NO_DB }, async () => {
  const empty = await reader("empty");
  assert.equal(await hasCredit(empty.userId), false);
  assert.equal(await writeWithCredit(empty.userId, mine("r-empty"), (tx) => insertReport(tx, empty, mine("r-empty"))), null);
  assert.deepEqual(await reportIdsOf(empty), [], "the report went back with the credit it could not take");

  const one = await reader("one", "solo");
  assert.equal(await hasCredit(one.userId), true);
  const made = await writeWithCredit(one.userId, mine("r-one"), async (tx) => {
    await insertReport(tx, one, mine("r-one"));
    return "written";
  });
  assert.deepEqual(made, { value: "written" });
  assert.deepEqual(await ledgerOf(one), [["used", mine("r-one")]]);
  assert.equal(await hasCredit(one.userId), false);
});

test("db, a report's credit: two writes racing for one credit, one takes it and the other leaves nothing (ADR-275)", { skip: NO_DB }, async () => {
  const racer = await reader("race", "solo");
  // Each holds its transaction open a moment before it takes the credit, so the two ask for it together.
  const write = (reportId: string) =>
    writeWithCredit(racer.userId, reportId, async (tx) => {
      await insertReport(tx, racer, reportId);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  const [a, b] = await Promise.all([write(mine("r-race-a")), write(mine("r-race-b"))]);
  assert.deepEqual([a === null, b === null].sort(), [false, true]);
  const won = a ? mine("r-race-a") : mine("r-race-b");
  assert.deepEqual(await ledgerOf(racer), [["used", won]]);
  assert.deepEqual(await reportIdsOf(racer), [won]);
});

test("db, a report's credit: given back once, and never one since spent on another report (ADR-313)", { skip: NO_DB }, async () => {
  const back = await reader("back", "solo");
  await writeWithCredit(back.userId, mine("r-back-1"), (tx) => insertReport(tx, back, mine("r-back-1")));
  assert.equal(await refundCredit(mine("r-back-1")), true);
  assert.equal(await refundCredit(mine("r-back-1")), false, "a second call finds nothing to give back");
  assert.deepEqual(await ledgerOf(back), [["available", null]]);

  await writeWithCredit(back.userId, mine("r-back-2"), (tx) => insertReport(tx, back, mine("r-back-2")));
  assert.equal(await refundCredit(mine("r-back-1")), false, "the credit is the second report's now");
  assert.deepEqual(await ledgerOf(back), [["used", mine("r-back-2")]]);
  const balance = await getCredits(back.userId);
  assert.deepEqual([balance.available, balance.used, balance.held], [0, 1, 0]);
});

test("db, a gift's credit: with none to hold the hold is null; with one it is held and leaves the balance (ADR-123, 275)", { skip: NO_DB }, async () => {
  const { db, inviteTokensTable } = await import("@workspace/db");
  const gift = (r: Reader, tag: string) => ({
    id: mine(`g-${tag}`), tokenHash: mine(`hash-${tag}`), email: "pierre@example.com", kind: "gift", recipientName: "Pierre",
    createdByUserId: r.userId, createdBySessionId: r.sessionId, expiresAt: new Date(Date.now() + 30 * 86_400_000),
  });
  const none = await reader("giver-none");
  const heldNone = await db.transaction(async (tx) => {
    await tx.insert(inviteTokensTable).values(gift(none, "none"));
    return holdCredit(none.userId, mine("g-none"), tx);
  });
  assert.equal(heldNone, null);
  assert.deepEqual(await ledgerOf(none), []);

  const giver = await reader("giver", "solo");
  const held = await db.transaction(async (tx) => {
    await tx.insert(inviteTokensTable).values(gift(giver, "one"));
    return holdCredit(giver.userId, mine("g-one"), tx);
  });
  assert.equal(typeof held, "string");
  assert.deepEqual(await ledgerOf(giver), [["held", null]]);
  assert.equal(await hasCredit(giver.userId), false, "a held credit is its gift's");
});
