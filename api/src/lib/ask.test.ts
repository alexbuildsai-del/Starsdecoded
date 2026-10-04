/**
 * Ask (ADR-213, acceptance 10), a test per access. Which reports and people Ask may read is decided over rows, so each
 * access is first tested here with no database. The same cases then run through the real queries, the tools, the
 * thread and the cap on a scratch Postgres when WALK_DATABASE_URL names a bootstrapped one, and skip, saying why,
 * without it. The model is the test stub: nothing here calls a real one.
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
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
// A path that ever reached past the stub would meet a closed port, never the network.
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";

const { installFakeModel, failureRows } = await import("./testModel.js");
const A = await import("./ask.js");
const { setSpendSink } = await import("./spendLedger.js");
const { logger } = await import("./logger.js");
const { readerChart } = await import("./timeline.js");
const { chartFromFixture } = await import("./testFixtures.js");
const { FALLBACK_LINE, HARM_REPLY, OFF_TOPIC_LINE, capLine } = await import("../prompts/ask/index.js");
const E = await import("@workspace/engine");

type Library = import("./ask.js").Library;
type NatalRow = import("./ask.js").NatalRow;
type PairRow = import("./ask.js").PairRow;
type PersonBirth = import("./ask.js").PersonBirth;
type ToolScope = import("./ask.js").ToolScope;
type Viewer = { userId: string | null; sessionId: string };

const ME: Viewer = { userId: "user_reader", sessionId: "s-reader" };
const NO_BIRTH: PersonBirth = {
  birthDate: "1990-01-01", birthTime: "12:00", birthTimeWindowMinutes: 0, latitude: 0, longitude: 0, timezoneOffset: 0, timezone: null, chartData: null,
};

const holder = (id: string, name: string, over: Partial<NatalRow["profile"]> = {}): NatalRow["profile"] => ({
  id, name, userId: null, sessionId: `s-${id}`, claimedByUserId: null, isSelf: false, claimedAsSelf: false, ...over,
});
const OWN = holder("p-own", "Ana Lima", { userId: ME.userId, sessionId: ME.sessionId, isSelf: true });
const SENT = holder("p-sent", "Ben Costa", { userId: "user_writer", sessionId: "s-writer", claimedByUserId: ME.userId });
const SHARED = holder("p-shared", "Cleo Dias", { userId: "user_sharer", sessionId: "s-sharer", isSelf: true });
const STRANGER = holder("p-stranger", "Dan Faro", { userId: "user_stranger", sessionId: "s-stranger", isSelf: true });
const TOMAS = holder("p-tomas", "Tomás Reyes", { userId: ME.userId, sessionId: ME.sessionId });
const CLOSER = holder("p-closer", "Gil Moura", { userId: "user_closer", sessionId: "s-closer", isSelf: true });

let clock = Date.parse("2026-09-01T10:00:00Z");
const natal = (profile: NatalRow["profile"], over: Partial<NatalRow> = {}): NatalRow => ({
  reportId: `r-${profile.id}`, status: "complete", sessionId: profile.sessionId, createdAt: new Date((clock += 60_000)), horizon: "known", profile, ...over,
});
const part = (profile: NatalRow["profile"]) => ({
  profileId: profile.id, name: profile.name, userId: profile.userId, sessionId: profile.sessionId, claimedByUserId: profile.claimedByUserId,
  accessRole: "owner", birth: NO_BIRTH,
});
const pair = (relId: string, parts: NatalRow["profile"][], over: Partial<PairRow> = {}): PairRow => ({
  reportId: `r-${relId}`, status: "complete", createdAt: new Date((clock += 60_000)), promptVersion: "p6",
  relationship: { id: relId, type: "partners", userId: ME.userId, sessionId: ME.sessionId }, parts: parts.map(part), ...over,
});
const NONE: ReadonlySet<string> = new Set();
const ids = (lib: Library) => lib.reports.map((r) => r.reportId);

test("access, the reader's own report: listed first as r1, the house cards one by one, chapter 10 as the web names it", () => {
  const lib = A.libraryOf(ME, [natal(SENT), natal(OWN)], [], NONE, OWN.id);
  assert.equal(lib.reports[0].reportId, "r-p-own");
  assert.equal(lib.reports[0].id, "r1");
  assert.equal(lib.reports[0].own, true);
  const sections = lib.reports[0].sections;
  assert.deepEqual(sections.find((s) => s.id === "house-7"), { id: "house-7", title: "7th house" });
  assert.deepEqual(sections.find((s) => s.id === "focus"), { id: "focus", title: "Closing" });
  // Someone else's Personal report lists its chapters only, and a blind one no house at all.
  assert.ok(!lib.reports[1].sections.some((s) => s.id.startsWith("house-")));
  const blind = A.libraryOf(ME, [natal(OWN, { horizon: "unknown" })], [], NONE, OWN.id);
  assert.ok(!blind.reports[0].sections.some((s) => s.id.startsWith("house-")));
});

test("access, a report sent to the reader: listed, as the person it was sent to reads it (MB-84)", () => {
  assert.deepEqual(ids(A.libraryOf(ME, [natal(SENT)], [], NONE, OWN.id)), ["r-p-sent"]);
});

test("access, a report shared by its owner: listed while R15's grant stands; the default, no grant, denies it", () => {
  assert.deepEqual(ids(A.libraryOf(ME, [natal(SHARED)], [], new Set([SHARED.id]), OWN.id)), ["r-p-shared"]);
  assert.deepEqual(ids(A.libraryOf(ME, [natal(SHARED)], [], NONE, OWN.id)), []);
  // A grant joins two accounts: a session reads nothing through one.
  assert.deepEqual(ids(A.libraryOf({ userId: null, sessionId: "s-x" }, [natal(SHARED)], [], new Set([SHARED.id]), null)), []);
});

test("access, a report not shared: never listed, and a report still being written is not one to read", () => {
  assert.deepEqual(ids(A.libraryOf(ME, [natal(STRANGER)], [], NONE, OWN.id)), []);
  assert.deepEqual(ids(A.libraryOf(ME, [natal(OWN, { status: "interpreting" })], [], NONE, OWN.id)), []);
});

test("access, a pair readable: listed with its two names, its chapters by the web's titles", () => {
  const lib = A.libraryOf(ME, [natal(OWN)], [pair("rel-open", [OWN, TOMAS])], NONE, OWN.id);
  const found = lib.reports.find((r) => r.reportId === "r-rel-open");
  assert.equal(found?.kind, "compatibility");
  assert.deepEqual(found?.names, ["Ana Lima", "Tomás Reyes"]);
  assert.equal(found?.sections[0].title, "Your two charts");
  // A pair written under a prompt version GET /reports no longer lists is not listed here either.
  assert.deepEqual(ids(A.libraryOf(ME, [], [pair("rel-old", [OWN, TOMAS], { promptVersion: "p1" })], NONE, OWN.id)), []);
});

test("access, a pair closed by Stop sharing: gone with its other person; while the grant stood it read", () => {
  const closing = pair("rel-closing", [OWN, CLOSER]);
  const open = A.libraryOf(ME, [], [closing], new Set([CLOSER.id]), OWN.id);
  assert.deepEqual(ids(open), ["r-rel-closing"]);
  assert.deepEqual(open.people.map((p) => p.profileId), [CLOSER.id]);
  const closed = A.libraryOf(ME, [], [closing], NONE, OWN.id);
  assert.deepEqual(ids(closed), []);
  assert.deepEqual(closed.people, []);
});

test("access, a person in a pair the reader can read: someone to ask about, through that pair, never the reader", () => {
  const lib = A.libraryOf(ME, [natal(OWN)], [pair("rel-open", [OWN, TOMAS])], NONE, OWN.id);
  assert.equal(lib.people.length, 1);
  assert.equal(lib.people[0].profileId, TOMAS.id);
  assert.equal(lib.people[0].id, "p1");
  assert.equal(lib.people[0].report, lib.reports.find((r) => r.reportId === "r-rel-open")?.id);
});

test("access, a person not: someone only in a closed pair or in no pair at all is no one Ask can look at", () => {
  const lib = A.libraryOf(ME, [natal(OWN), natal(STRANGER)], [pair("rel-closing", [OWN, CLOSER])], NONE, OWN.id);
  assert.deepEqual(lib.people, []);
});

test("the cap: 50 a UTC calendar month, back on the 1st, never fewer than 0 left", () => {
  assert.equal(A.ASK_MONTHLY_CAP, 50);
  assert.deepEqual(A.usageFrom(50, new Date("2026-10-31T23:59:59Z")), { used: 50, left: 0, cap: 50, resetsOn: "2026-11-01" });
  assert.deepEqual(A.usageFrom(7, new Date("2026-12-15T00:00:00Z")), { used: 7, left: 43, cap: 50, resetsOn: "2027-01-01" });
  assert.equal(A.usageFrom(53, new Date("2026-10-02T00:00:00Z")).left, 0);
  assert.deepEqual(A.capOf(new Date("2026-10-20T12:00:00Z")), { error: "ask_cap", message: capLine("2026-11-01"), resetsOn: "2026-11-01" });
});

test("choices read as the chat shows them: a day, a stretch of days, the year only when it isn't this one", () => {
  assert.equal(A.dateLabel("2026-09-18", 2026), "Fri 18 Sep");
  assert.equal(A.dateLabel("2025-09-18", 2026), "Thu 18 Sep 2025");
  assert.equal(A.windowLabel("2026-10-05", "2026-10-11", 2026), "5 to 11 Oct");
  assert.equal(A.windowLabel("2026-09-28", "2026-10-04", 2026), "28 Sep to 4 Oct");
  assert.equal(A.windowLabel("2026-12-28", "2027-01-03", 2026), "28 Dec 2026 to 3 Jan 2027");
  assert.equal(A.isDay("2026-02-29"), false);
});

test("a passage is the report's own words: whole sentences up to 120 words, cut from the stored text", () => {
  const sentence = "You take your time before you decide, and you like to see the whole picture first.";
  const long = Array.from({ length: 12 }, () => sentence).join(" ");
  const passage = A.passageFrom(long);
  assert.ok(long.startsWith(passage));
  assert.ok(passage.endsWith("."));
  assert.ok(passage.split(/\s+/).length <= 120);
  // A lens chapter's pattern before its scene, and a short line never stands in for a paragraph.
  const pattern = "When one of you goes quiet the other reads it as distance, and the gap grows until someone names it out loud.";
  assert.equal(A.passageOf({ headline: "Short.", scene: `${sentence} ${sentence}`, pattern: `${pattern} ${pattern}` }), `${pattern} ${pattern}`);
  assert.equal(A.passageOf({ label: "Sun in Leo", text: `${sentence} ${sentence}` }), `${sentence} ${sentence}`);
  assert.equal(A.passageOf(null), null);
});

test("the Moon on a day: the 2025 March eclipse's full Moon in Virgo, the 2024 April eclipse's new Moon in Aries", () => {
  assert.deepEqual(A.moonOn("2025-03-14", "UTC"), { sign: "Virgo", phase: "full moon" });
  assert.deepEqual(A.moonOn("2024-04-08", "UTC"), { sign: "Aries", phase: "new moon" });
  const order = ["new moon", "waxing crescent", "first quarter", "waxing gibbous", "full moon", "waning gibbous", "last quarter", "waning crescent"];
  let day = "2026-10-01";
  let last = order.indexOf(A.moonOn(day, "Europe/Lisbon").phase);
  for (let i = 0; i < 45; i++) {
    day = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    const now = order.indexOf(A.moonOn(day, "Europe/Lisbon").phase);
    assert.ok(now === last || now === (last + 1) % 8, `${day}: ${order[last]} then ${order[now]}`);
    // A principal phase is the one day its moment falls in.
    if (now % 2 === 0) assert.notEqual(now, last, `${day}: ${order[now]} on two days`);
    last = now;
  }
});

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: Ask's queries, thread and cap run on a scratch Postgres";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const NOW = new Date("2026-10-20T12:00:00Z");

/** Each run's own rows, so a second run, or the walk on the same database, finds nothing of the first. */
const run = randomUUID().slice(0, 8);
const id = (name: string) => `r1625-${run}-${name}`;
const READER: Viewer = { userId: id("u-reader"), sessionId: id("s-reader") };
const WRITER: Viewer = { userId: id("u-writer"), sessionId: id("s-writer") };
const SHARER: Viewer = { userId: id("u-sharer"), sessionId: id("s-sharer") };
const CLOSING: Viewer = { userId: id("u-closer"), sessionId: id("s-closer") };
const OTHER: Viewer = { userId: id("u-stranger"), sessionId: id("s-stranger") };
const P = { reader: id("p-reader"), sent: id("p-sent"), shared: id("p-shared"), closer: id("p-closer"), stranger: id("p-stranger"), tomas: id("p-tomas") };
const R = {
  reader: id("r-reader"), sent: id("r-sent"), shared: id("r-shared"), closer: id("r-closer"), stranger: id("r-stranger"), tomas: id("r-tomas"),
  open: id("r-open"), closing: id("r-closing"),
};
const REL = { open: id("rel-open"), closing: id("rel-closing") };
const grant = { shared: "", closer: "" };

const PARAGRAPH = (who: string) =>
  `${who}, you take your time before you decide, and you like to see the whole picture before you choose. Once you have chosen you move steadily, and you rarely turn back. People learn to trust that pace.`;
const PATTERN = "When one of you goes quiet the other reads it as distance, and the gap grows until someone names it out loud. Saying it early keeps it small for both of you.";

function natalText(who: string) {
  return {
    overview: { headline: "Steady first, quick later.", concentration: PARAGRAPH(who), claims: [] },
    relationships: { howYouLove: PARAGRAPH(who), claims: [] },
    houses: { houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, reading: `${PARAGRAPH(who)} House ${i + 1}.` })) },
  };
}

function pairText(a: string, b: string) {
  return {
    meta: { promptVersion: "p6", reportType: "compatibility", lens: "partners", names: { a, b } },
    twoCharts: { headline: "Two careful people who need to say things sooner.", claims: [] },
    partners02: { headline: "Quiet is not distance.", scene: `${a} goes quiet. ${b} waits.`, pattern: PATTERN, claims: [] },
  };
}

async function dbm() {
  return import("@workspace/db");
}

let seeded: Promise<void> | null = null;

function seed(): Promise<void> {
  seeded ??= (async () => {
    const { db, profilesTable, reportsTable, relationshipsTable, relationshipParticipantsTable } = await dbm();
    const fx = (name: string) => JSON.parse(readFileSync(join(ROOT, "fixtures", "charts", `${name}.json`), "utf8"));
    const row = (profileId: string, fixture: string, holder: Viewer, over: Record<string, unknown> = {}) => {
      const f = fx(fixture);
      return {
        id: profileId, sessionId: holder.sessionId, userId: holder.userId, name: f.name, birthDate: f.birthDate, birthTime: f.birthTime,
        birthPlace: "fixture", latitude: f.latitude, longitude: f.longitude, timezoneOffset: f.timezoneOffset, timezone: f.timezone ?? null,
        chartData: chartFromFixture(fixture) as unknown as object, ...over,
      };
    };
    await db.insert(profilesTable).values([
      row(P.reader, "beatrice", READER, { isSelf: true }),
      // Written by someone else and sent to the reader, who claimed it.
      row(P.sent, "charles", WRITER, { claimedByUserId: READER.userId }),
      // The sharers' own charts, each shared with the reader by a grant (R15, ADR-235).
      row(P.shared, "oprah-winfrey", SHARER, { isSelf: true }),
      row(P.closer, "george", CLOSING, { isSelf: true }),
      // Someone else's own chart, shared with nobody.
      row(P.stranger, "athena", OTHER, { isSelf: true }),
      // A chart the reader wrote for someone in their life, with whom they made a pair.
      row(P.tomas, "william", READER),
    ]);
    const at = (minute: number) => new Date(Date.UTC(2026, 8, 1, 10, minute));
    const natal = (reportId: string, profileId: string, holder: Viewer, who: string, minute: number) => ({
      id: reportId, profileId, sessionId: holder.sessionId, type: "natal", status: "complete", interpretation: natalText(who), createdAt: at(minute),
    });
    await db.insert(reportsTable).values([
      natal(R.reader, P.reader, READER, "Beatrice", 0),
      natal(R.sent, P.sent, WRITER, "Charles", 1),
      natal(R.shared, P.shared, SHARER, "Oprah", 2),
      natal(R.closer, P.closer, CLOSING, "George", 3),
      natal(R.stranger, P.stranger, OTHER, "Athena", 4),
      natal(R.tomas, P.tomas, READER, "William", 5),
    ]);
    await db.insert(relationshipsTable).values([
      { id: REL.open, sessionId: READER.sessionId, userId: READER.userId, type: "partners" },
      { id: REL.closing, sessionId: READER.sessionId, userId: READER.userId, type: "partners" },
    ]);
    await db.insert(relationshipParticipantsTable).values([
      { id: `${REL.open}-a`, relationshipId: REL.open, profileId: P.reader, role: "primary", position: "0" },
      { id: `${REL.open}-b`, relationshipId: REL.open, profileId: P.tomas, role: "secondary", position: "1" },
      { id: `${REL.closing}-a`, relationshipId: REL.closing, profileId: P.reader, role: "primary", position: "0" },
      { id: `${REL.closing}-b`, relationshipId: REL.closing, profileId: P.closer, role: "secondary", position: "1" },
    ]);
    const pairRow = (reportId: string, relationshipId: string, b: string, minute: number) => ({
      id: reportId, profileId: P.reader, sessionId: READER.sessionId, type: "compatibility", relationshipId, status: "complete",
      interpretation: pairText("Beatrice York", b), createdAt: at(minute),
    });
    await db.insert(reportsTable).values([pairRow(R.open, REL.open, "William Windsor", 6), pairRow(R.closing, REL.closing, "George Windsor", 7)]);
  })();
  return seeded;
}

/** Both grants standing, whatever the test before revoked, and an empty thread. */
async function fresh(): Promise<void> {
  await seed();
  const { db, askMessagesTable } = await dbm();
  const { eq } = await import("drizzle-orm");
  const { grantShare } = await import("./shares.js");
  grant.shared = await grantShare(db, { profileId: P.shared, ownerUserId: SHARER.userId as string, readerUserId: READER.userId as string, inviteId: null });
  grant.closer = await grantShare(db, { profileId: P.closer, ownerUserId: CLOSING.userId as string, readerUserId: READER.userId as string, inviteId: null });
  await db.delete(askMessagesTable).where(eq(askMessagesTable.userId, READER.userId as string));
}

after(async () => {
  if (!SCRATCH || !seeded) return;
  const { db, pool, askMessagesTable, profileSharesTable, profilesTable, relationshipsTable } = await dbm();
  const { eq, inArray } = await import("drizzle-orm");
  await db.delete(askMessagesTable).where(eq(askMessagesTable.userId, READER.userId as string));
  await db.delete(profileSharesTable).where(inArray(profileSharesTable.profileId, Object.values(P)));
  await db.delete(relationshipsTable).where(inArray(relationshipsTable.id, Object.values(REL)));
  // Reports and participants go with their profiles.
  await db.delete(profilesTable).where(inArray(profilesTable.id, Object.values(P)));
  await pool.end();
});

async function scopeFor(library: Library, freshLibrary?: Library): Promise<ToolScope> {
  const reader = await readerChart(READER);
  assert.ok(reader, "the reader has their own finished Personal report");
  return { viewer: READER, reader, zone: reader.zone, now: NOW, library, fresh: freshLibrary ?? library };
}

const reportOf = (lib: Library, reportId: string) => lib.reports.find((r) => r.reportId === reportId);
const personOf = (lib: Library, profileId: string) => lib.people.find((p) => p.profileId === profileId);

test("db, the reader's own report: r1, and a quote from it is its own words", { skip: NO_DB }, async () => {
  await fresh();
  const lib = await A.readableLibrary(READER, P.reader);
  const own = reportOf(lib, R.reader);
  assert.equal(own?.id, "r1");
  assert.equal(own?.own, true);
  const [card] = await A.runTools([{ tool: "quote", report: "r1", section: "overview" }], await scopeFor(lib));
  assert.equal(card?.prompt.kind, "quote");
  assert.ok(card.prompt.kind === "quote" && PARAGRAPH("Beatrice").startsWith(card.prompt.text));
  const [house] = await A.runTools([{ tool: "quote", report: "r1", section: "house-7" }], await scopeFor(lib));
  assert.ok(house?.prompt.kind === "quote" && house.prompt.text.endsWith("House 7."));
});

test("db, a report sent to the reader: listed and quoted", { skip: NO_DB }, async () => {
  await fresh();
  const lib = await A.readableLibrary(READER, P.reader);
  const sent = reportOf(lib, R.sent);
  assert.ok(sent);
  const cards = await A.runTools([{ tool: "quote", report: sent.id, section: "relationships" }], await scopeFor(lib));
  assert.equal(cards.length, 1);
});

test("db, a report shared by its owner: listed while the grant stands, refused at once after Stop sharing", { skip: NO_DB }, async () => {
  await fresh();
  const before = await A.readableLibrary(READER, P.reader);
  const shared = reportOf(before, R.shared);
  assert.ok(shared);
  const tool = { tool: "quote" as const, report: shared.id, section: "overview" };
  assert.equal((await A.runTools([tool], await scopeFor(before))).length, 1);
  const { revokeShare } = await import("./shares.js");
  assert.equal(await revokeShare(grant.shared, SHARER.userId as string), true);
  const afterStop = await A.readableLibrary(READER, P.reader);
  assert.equal(reportOf(afterStop, R.shared), undefined);
  // The plan was shown the report a moment before; the tool reads access again as it runs.
  assert.deepEqual(await A.runTools([tool], await scopeFor(before, afterStop)), []);
});

test("db, a report not shared: never listed, and a tool naming it is refused", { skip: NO_DB }, async () => {
  await fresh();
  const lib = await A.readableLibrary(READER, P.reader);
  assert.equal(reportOf(lib, R.stranger), undefined);
  const forged: Library = {
    reports: [...lib.reports, { id: "r99", reportId: R.stranger, kind: "personal", own: false, names: ["Athena"], sections: [{ id: "overview", title: "Chart Overview" }] }],
    people: lib.people,
  };
  assert.deepEqual(await A.runTools([{ tool: "quote", report: "r99", section: "overview" }], await scopeFor(forged, lib)), []);
});

test("db, a pair readable: listed, quoted from its chapter, its other person someone to ask about", { skip: NO_DB }, async () => {
  await fresh();
  const lib = await A.readableLibrary(READER, P.reader);
  const open = reportOf(lib, R.open);
  assert.equal(open?.kind, "compatibility");
  const [card] = await A.runTools([{ tool: "quote", report: open!.id, section: "partners02" }], await scopeFor(lib));
  assert.ok(card?.prompt.kind === "quote" && card.prompt.text === PATTERN);
  assert.equal(personOf(lib, P.tomas)?.report, open!.id);
});

test("db, a person in a readable pair: their day computed from their own chart, by Timeline's own rule", { skip: NO_DB }, async () => {
  await fresh();
  const lib = await A.readableLibrary(READER, P.reader);
  const tomas = personOf(lib, P.tomas)!;
  const scope = await scopeFor(lib);
  const [card] = await A.runTools([{ tool: "person", person: tomas.id, date: "2026-10-20" }], scope);
  assert.equal(card?.prompt.kind, "person");
  assert.ok(card.stored.kind === "person");
  assert.deepEqual(card.stored, { kind: "person", profileId: P.tomas, date: "2026-10-20", zone: scope.zone });
  // The engine on William's chart for that day in the reader's zone: every event on the card touches it, and none is missed.
  const chart = chartFromFixture("william");
  const { dayStart } = await import("./timeline.js");
  const start = dayStart("2026-10-20", scope.zone);
  const end = dayStart("2026-10-21", scope.zone);
  const expected = E.inEffect(E.skyEvents(chart, start, new Date(end.getTime() - 1)), start).map((e) => E.headlineOf(e));
  assert.ok(card.prompt.kind === "person");
  assert.ok(expected.length > 0, "a day with something on it, so the comparison means something");
  assert.deepEqual(card.prompt.events.map((e) => e.headline).sort(), expected.sort());
});

test("db, a pair closed by Stop sharing, and a person not: gone from the library, refused by each tool, and kept cards go", { skip: NO_DB }, async () => {
  await fresh();
  const before = await A.readableLibrary(READER, P.reader);
  const closing = reportOf(before, R.closing)!;
  const george = personOf(before, P.closer)!;
  assert.ok(closing && george);
  // A thread holding a quote from the pair and George's day, made while both read.
  const fake = installFakeModel({
    ask_plan: { intent: "answer", tools: [{ tool: "quote", report: closing.id, section: "partners02" }, { tool: "person", person: george.id, date: "2026-10-20" }], question: "", choices: [] },
    ask_answer: { text: "Your Compatibility report says how the two of you handle quiet times.", cards: ["c1", "c2"] },
  });
  try {
    const sent = await A.sendAsk(READER, { text: "How was that day for us?" }, { now: NOW });
    assert.equal(sent.kind, "thread");
    assert.ok(sent.kind === "thread");
    assert.deepEqual(sent.thread.messages[1].cards.map((c) => c.kind), ["quote", "person"]);
  } finally {
    fake.restore();
  }
  const { revokeShare } = await import("./shares.js");
  assert.equal(await revokeShare(grant.closer, CLOSING.userId as string), true);
  const afterStop = await A.readableLibrary(READER, P.reader);
  assert.equal(reportOf(afterStop, R.closing), undefined);
  assert.equal(personOf(afterStop, P.closer), undefined);
  const tools = [{ tool: "quote" as const, report: closing.id, section: "partners02" }, { tool: "person" as const, person: george.id, date: "2026-10-20" }];
  assert.deepEqual(await A.runTools(tools, await scopeFor(before, afterStop)), []);
  // The stranger is in no pair at all, so no tool can name her.
  assert.equal(personOf(afterStop, P.stranger), undefined);
  const thread = await A.askThread(READER, { now: NOW });
  assert.deepEqual(thread.messages[1].cards, [], "a kept quote and person card show only while the reader can read them (MB-191)");
});

test("db, a message: the plan, the tools, the answer and its cards in the text's order; spend per call, checks per attempt", { skip: NO_DB }, async () => {
  await fresh();
  const lib = await A.readableLibrary(READER, P.reader);
  const open = reportOf(lib, R.open)!;
  const tomas = personOf(lib, P.tomas)!;
  const spent: { kind: string }[] = [];
  const restoreSpend = setSpendSink(async (entry) => { spent.push(entry); });
  const failuresBefore = failureRows.length;
  const fake = installFakeModel({
    ask_plan: {
      intent: "answer",
      tools: [{ tool: "day", date: "2026-10-20" }, { tool: "quote", report: open.id, section: "partners02" }, { tool: "person", person: tomas.id, date: "2026-10-20" }, { tool: "reports" }],
      question: "",
      choices: [],
    },
    ask_answer: { text: "Your Compatibility report says how the two of you handle quiet times. The cards below show that day for both of you.", cards: ["c2", "c1", "c3"] },
  });
  let result: Awaited<ReturnType<typeof A.sendAsk>>;
  try {
    result = await A.sendAsk(READER, { text: "How were things between us on Tuesday?" }, { now: NOW });
  } finally {
    fake.restore();
    restoreSpend();
  }
  assert.equal(result.kind, "thread");
  assert.ok(result.kind === "thread");
  const [mine, reply] = result.thread.messages;
  assert.equal(mine.role, "reader");
  assert.equal(mine.text, "How were things between us on Tuesday?");
  assert.equal(reply.role, "ask");
  assert.deepEqual(reply.cards.map((c) => c.kind), ["quote", "day", "person"]);
  const [quote, day, person] = reply.cards;
  assert.ok(quote.kind === "quote");
  assert.deepEqual(quote, { kind: "quote", reportId: R.open, reportName: "Beatrice York and William Windsor", section: "How you love", text: PATTERN });
  assert.ok(day.kind === "day");
  assert.equal(day.date, "2026-10-20");
  assert.deepEqual(day.moon, A.moonOn("2026-10-20", "Europe/London"));
  assert.ok(person.kind === "person");
  assert.equal(person.name, "William Windsor");
  assert.equal(person.date, "2026-10-20");
  assert.deepEqual(fake.calls, ["ask_plan", "ask_answer"]);
  assert.equal(spent.length, 2);
  assert.ok(spent.every((e) => e.kind === "ask"));
  const rows = failureRows.slice(failuresBefore).filter((r) => r.kind === "ask");
  assert.ok(rows.some((r) => r.section === "ask:plan" && r.class === "pass" && r.final));
  assert.ok(rows.some((r) => r.section === "ask:answer" && r.class === "pass" && r.final));
  assert.deepEqual(result.thread.usage, { used: 1, left: 49, cap: 50, resetsOn: "2026-11-01" });
});

test("db, harm and a question Ask does not take: their fixed lines, and no second call", { skip: NO_DB }, async () => {
  await fresh();
  const cases = [["harm", HARM_REPLY], ["off_topic", OFF_TOPIC_LINE]] as const;
  for (const [i, [intent, line]] of cases.entries()) {
    const fake = installFakeModel({ ask_plan: { intent, tools: [], question: "", choices: [] } });
    try {
      const result = await A.sendAsk(READER, { text: "A message for the plan" }, { now: new Date(NOW.getTime() + i * 60_000) });
      assert.ok(result.kind === "thread");
      const last = result.thread.messages[result.thread.messages.length - 1];
      assert.equal(last.text, line);
      assert.deepEqual([last.cards, last.choices], [[], []]);
      assert.deepEqual(fake.calls, ["ask_plan"]);
    } finally {
      fake.restore();
    }
  }
});

test("db, ask back: its choices kept and labelled by the server; a tap is the next message; anything else refused", { skip: NO_DB }, async () => {
  await fresh();
  const lib = await A.readableLibrary(READER, P.reader);
  const tomas = personOf(lib, P.tomas)!;
  const asked = installFakeModel({
    ask_plan: { intent: "ask_back", tools: [], question: "Who was it <<name>> with?", choices: [{ kind: "person", person: tomas.id }, { kind: "date", date: "2026-10-16" }, { kind: "date", date: "2026-10-16" }] },
  });
  let back;
  try {
    back = await A.sendAsk(READER, { text: "We had a fight on Friday. Why?" }, { now: NOW });
  } finally {
    asked.restore();
  }
  assert.ok(back.kind === "thread");
  const question = back.thread.messages[1];
  assert.equal(question.text, "Who was it with?", "a marker copied into the question is taken out");
  assert.deepEqual(question.choices.map((c) => [c.kind, c.label]), [["person", "William"], ["date", "Fri 16 Oct"]]);

  let planned = "";
  const tapped = installFakeModel({
    ask_plan: (req: { messages: Array<{ content: string }> }) => {
      planned = req.messages[1].content;
      return { intent: "off_topic", tools: [], question: "", choices: [] };
    },
  });
  try {
    const result = await A.sendAsk(READER, { choiceId: question.choices[0].id }, { now: new Date(NOW.getTime() + 60_000) });
    assert.ok(result.kind === "thread");
    assert.equal(result.thread.messages[2].text, "William");
    assert.ok(planned.includes(`THE READER TAPPED A CHOICE\na person: ${tomas.id}`));
    // The plan reads the conversation before the tap, oldest first.
    assert.ok(planned.includes("Reader: We had a fight on Friday. Why?\nAsk: Who was it with?\n"));
    // The choice belonged to Ask's message before its last.
    const stale = await A.sendAsk(READER, { choiceId: question.choices[1].id }, { now: new Date(NOW.getTime() + 120_000) });
    assert.deepEqual(stale, { kind: "invalid", error: "choice_not_offered", message: A.ASK_CHOICE_GONE_LINE });
    assert.deepEqual(await A.sendAsk(READER, {}, { now: NOW }), { kind: "invalid", error: "validation_error", message: A.ASK_EMPTY_LINE });
    assert.deepEqual(await A.sendAsk(READER, { text: "Hi", choiceId: "x" }, { now: NOW }), { kind: "invalid", error: "validation_error", message: A.ASK_EMPTY_LINE });
    assert.equal((await A.sendAsk(READER, { text: "x".repeat(501) }, { now: NOW })).kind, "invalid");
  } finally {
    tapped.restore();
  }
});

test("db, a message from a report page reads that report only when the reader can read it (reading 16)", { skip: NO_DB }, async () => {
  await fresh();
  const lib = await A.readableLibrary(READER, P.reader);
  const prompts: string[] = [];
  const fake = installFakeModel({
    ask_plan: (req: { messages: Array<{ content: string }> }) => {
      prompts.push(req.messages[1].content);
      return { intent: "off_topic", tools: [], question: "", choices: [] };
    },
  });
  try {
    await A.sendAsk(READER, { text: "What does this chapter mean?", reportId: R.open }, { now: NOW });
    await A.sendAsk(READER, { text: "What does this chapter mean?", reportId: R.stranger }, { now: new Date(NOW.getTime() + 1000) });
  } finally {
    fake.restore();
  }
  assert.ok(prompts[0].includes(`SENT FROM REPORT: ${reportOf(lib, R.open)!.id}`));
  assert.ok(!prompts[1].includes("SENT FROM REPORT"));
});

test("db, one retry carrying the errors, then the fallback line, never the failed text", { skip: NO_DB }, async () => {
  await fresh();
  const spent: unknown[] = [];
  const restoreSpend = setSpendSink(async (entry) => { spent.push(entry); });
  const failuresBefore = failureRows.length;
  const answers: string[] = [];
  const fake = installFakeModel({
    ask_plan: { intent: "answer", tools: [], question: "", choices: [] },
    ask_answer: (req: { messages: Array<{ content: string }> }) => {
      answers.push(req.messages[1].content);
      return { text: "You will get a promotion soon.", cards: [] };
    },
  });
  let result;
  try {
    result = await A.sendAsk(READER, { text: "Will work get better?" }, { now: NOW });
  } finally {
    fake.restore();
    restoreSpend();
  }
  assert.ok(result.kind === "thread");
  assert.equal(result.thread.messages[1].text, FALLBACK_LINE);
  assert.deepEqual(fake.calls, ["ask_plan", "ask_answer", "ask_answer"]);
  assert.ok(!answers[0].includes("EVERY ERROR SO FAR"));
  assert.ok(answers[1].includes("EVERY ERROR SO FAR"));
  assert.ok(answers[1].includes("says what will happen in the reader's life"), "the retry carries the error that blocked the first answer");
  assert.equal(spent.length, 3);
  const blocked = failureRows.slice(failuresBefore).filter((r) => r.section === "ask:answer" && r.ruleId === "chk-45");
  assert.deepEqual(blocked.map((r) => [r.attempt, r.final]), [[1, false], [2, true]]);
});

test("db, nothing the reader types reaches a log line or a failure row (ADR-201)", { skip: NO_DB }, async () => {
  await fresh();
  const marker = `Qz${run}Vx`;
  const lines: string[] = [];
  const levels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
  const loud = logger as unknown as Record<string, (...args: unknown[]) => void>;
  const kept = levels.map((level) => [level, loud[level]] as const);
  for (const level of levels) {
    loud[level] = (...args: unknown[]) => {
      lines.push(args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}\n${a.stack}` : typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    };
  }
  const failuresBefore = failureRows.length;
  const fake = installFakeModel({
    ask_plan: { intent: "answer", tools: [], question: "", choices: [] },
    ask_answer: { text: `You will get a promotion from ${marker} soon.`, cards: [] },
  });
  try {
    await A.sendAsk(READER, { text: `My secret is ${marker}. What does Saturn mean for me?` }, { now: NOW });
    fake.failOn = "ask_plan";
    fake.failWith = () => new Error(`outage while reading ${marker}`);
    await A.sendAsk(READER, { text: `Again, ${marker}` }, { now: new Date(NOW.getTime() + 1000) });
  } finally {
    fake.restore();
    for (const [level, fn] of kept) loud[level] = fn;
  }
  assert.ok(lines.some((l) => l.includes("ask: a call failed")), "the outage was logged, by its class alone");
  assert.ok(!lines.some((l) => l.includes(marker)), "no log line holds the reader's words");
  const rows = failureRows.slice(failuresBefore);
  assert.ok(rows.length > 0);
  assert.ok(!rows.some((r) => r.message.includes(marker)), "no failure row holds the reader's words");
});

test("db, the cap: the 50th message goes, the 51st is refused with its line and date, and askUsage says 0 left until the 1st", { skip: NO_DB }, async () => {
  await fresh();
  const { db, askMessagesTable } = await dbm();
  const { eq } = await import("drizzle-orm");
  const at = (iso: string) => new Date(iso);
  const readerRow = (createdAt: Date) => ({ id: randomUUID(), userId: READER.userId as string, role: "reader" as const, body: { text: "earlier" }, createdAt });
  await db.insert(askMessagesTable).values([
    ...Array.from({ length: 49 }, (_, i) => readerRow(at(`2026-10-01T00:${String(i).padStart(2, "0")}:00Z`))),
    // Last month's count is not this month's, and a message past its 31 days goes on the next read or send (MB-191).
    readerRow(at("2026-09-25T10:00:00Z")),
    readerRow(at("2026-09-10T10:00:00Z")),
  ]);
  assert.deepEqual(await A.askUsage(READER, NOW), { used: 49, left: 1, cap: 50, resetsOn: "2026-11-01" });
  const fake = installFakeModel({ ask_plan: { intent: "harm", tools: [], question: "", choices: [] } });
  try {
    // Two at once at the 49th: the count and the store are one step, so exactly one passes.
    const both = await Promise.all([
      A.sendAsk(READER, { text: "first" }, { now: NOW }),
      A.sendAsk(READER, { text: "second" }, { now: new Date(NOW.getTime() + 1) }),
    ]);
    assert.deepEqual(both.map((r) => r.kind).sort(), ["cap", "thread"]);
    const refused = await A.sendAsk(READER, { text: "one more" }, { now: new Date(NOW.getTime() + 5000) });
    assert.deepEqual(refused, { kind: "cap", cap: { error: "ask_cap", message: capLine("2026-11-01"), resetsOn: "2026-11-01" } });
    assert.deepEqual(fake.calls, ["ask_plan"]);
  } finally {
    fake.restore();
  }
  assert.deepEqual(await A.askUsage(READER, NOW), { used: 50, left: 0, cap: 50, resetsOn: "2026-11-01" });
  const rows = await db.select({ createdAt: askMessagesTable.createdAt }).from(askMessagesTable).where(eq(askMessagesTable.userId, READER.userId as string));
  assert.ok(!rows.some((r) => r.createdAt.getTime() === at("2026-09-10T10:00:00Z").getTime()), "the message past 31 days is gone");
  assert.equal(rows.length, 49 + 1 + 1 + 1, "this month's 50, last month's one inside 31 days, and the one reply");
  assert.deepEqual(await A.askUsage(READER, at("2026-11-01T00:00:01Z")), { used: 0, left: 50, cap: 50, resetsOn: "2026-12-01" });
});
