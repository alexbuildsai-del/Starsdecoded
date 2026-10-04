/**
 * Timeline's readings at their edges (R16-24; ADR-84, 85, 199, 210; readings 7, 8, 10): what a reading builds on when
 * the report is thin or odd, a write that races another or outlives its row, a stale basis rewritten, the queue's order
 * and limits at the spend gate, a failed row's line, what a failure may put in a log, and what forgetting removes.
 * `timelineReadings.test.ts` has the main cases. The parts that need rows run on a scratch Postgres when
 * WALK_DATABASE_URL names a bootstrapped one and skip, saying why, without it.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRATCH = process.env.WALK_DATABASE_URL;
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";

const { installFakeModel, failureRows } = await import("./testModel.js");
const { setSpendSink } = await import("./spendLedger.js");
const { SectionError } = await import("./aiInterpretation.js");
const { chartForProfile } = await import("./profiles.js");
const { logger } = await import("./logger.js");
const T = await import("./timeline.js");
const R = await import("./timelineReadings.js");
const E = await import("@workspace/engine");

type ReaderRow = import("./timeline.js").ReaderRow;
type ReaderChart = import("./timeline.js").ReaderChart;
type ReadingOutput = import("../prompts/timeline/index.js").ReadingOutput;
type FakeRequest = import("./testModel.js").FakeRequest;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CURIE = "fixtures/charts/marie-curie.json";
const BLIND = "fixtures/charts/marie-curie-unknown.json";
const MIRA = "fixtures/sample-people/mira.json";
const FROM = new Date("2026-10-05T00:00:00Z");
const TO = new Date("2027-04-05T00:00:00Z");

interface Birth {
  name: string; birthDate: string; birthTime: string; birthTimeWindowMinutes?: number; latitude: number; longitude: number;
  timezoneOffset: number; timezone?: string;
}
const birthOf = (path: string): Birth => JSON.parse(readFileSync(join(ROOT, path), "utf8")) as Birth;

function rowOf(path: string, ids: { userId: string; profileId: string; reportId: string; sessionId: string }): ReaderRow {
  const f = birthOf(path);
  return {
    report: { id: ids.reportId, status: "complete", sessionId: ids.sessionId, createdAt: new Date("2026-09-01T10:00:00Z") },
    profile: {
      id: ids.profileId, userId: ids.userId, sessionId: ids.sessionId, claimedByUserId: null, isSelf: true, claimedAsSelf: false,
      birthDate: f.birthDate, birthTime: f.birthTime, birthTimeWindowMinutes: f.birthTimeWindowMinutes ?? 0, latitude: f.latitude,
      longitude: f.longitude, timezoneOffset: f.timezoneOffset, timezone: f.timezone ?? null, chartData: null,
    },
  };
}

function readerOf(path: string, ids = { userId: "user_reader", profileId: "profile-1", reportId: "report-1", sessionId: "s-reader" }): ReaderChart {
  const row = rowOf(path, ids);
  return T.readerOf(ids.userId, row, chartForProfile(row.profile));
}

const curie = readerOf(CURIE);
const blind = readerOf(BLIND);
const readable = (reader: ReaderChart) => E.skyEvents(reader.chart, FROM, TO).filter(E.readsAs);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const CLEAN: ReadingOutput = {
  line: "You think harder about what you take on and why.",
  body: "Astrology reads this stretch as a time when the sky presses on a part of your chart you already know well. Your report describes how you work through things in depth before you commit. This time meets that habit. You may find that old plans feel heavier to carry. You may also find that the plans you still believe in feel clearer. Some days the pressure feels like a weight. Other days it feels like a firm hand on your back. People around you may see you as more serious than usual. You may feel the gap between how calm you look and how you feel inside.",
};
const ORDER: ReadingOutput = { ...CLEAN, body: `${CLEAN.body} Take your time with it.` };
const ONE: ReadingOutput = { ...CLEAN, line: "You weigh what you agreed to and what you still want." };
const TWO: ReadingOutput = { ...CLEAN, line: "You notice how much of the week you give to other people." };

const fake = installFakeModel({});
const asked: FakeRequest[] = [];
function answer(...replies: ReadingOutput[]): void {
  let n = 0;
  asked.length = 0;
  fake.replies.timeline_reading = (req: FakeRequest) => {
    asked.push(req);
    return replies[Math.min(n++, replies.length - 1)];
  };
}
setSpendSink(async () => undefined);

const ref = (r: Record<string, unknown>) => ({ ref: r, label: "" });
const claim = (quote: string, ...refs: Record<string, unknown>[]) => ({ quote, evidence: refs.map(ref) });
const SUN = { kind: "placement", body: "sun", sign: "scorpio", house: null };
const sunContact = readable(blind).find((e) => e.key === "contact.mars.square.sun.20261024")!;
const ascContact = readable(curie).find((e) => e.key === "contact.saturn.square.ascendant.20260529")!;

// --- what a reading builds on --------------------------------------------------------------------------------------

test("a house card of only spaces, or a houses list that is not a list, is no card: the reading falls to the chapter", () => {
  const career = { a: "You keep your own pace at work.", claims: [claim("You keep your own pace at work.", SUN)] };
  for (const houses of [{ houses: [{ house: 1, reading: "   \n " }] }, { houses: "none" }, { houses: [] }, null, "text"]) {
    const out = R.passagesFor(sunContact, blind.chart, { houses, career });
    assert.deepEqual(out.buildsOn, { kind: "chapter", chapter: "career" }, JSON.stringify(houses));
  }
  // A drawn chart whose event touches the 1st house takes the card when the report holds it.
  const card = R.passagesFor(ascContact, curie.chart, { houses: { houses: [{ house: 1, reading: "A card of its own." }] }, career });
  assert.deepEqual(card, { excerpts: [{ source: "Your 1st house card", text: "A card of its own." }], buildsOn: { kind: "house", house: 1 } });
});

test("a card of exactly 120 words is kept whole and one of 121 is cut to 120", () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i + 1}`).join(" ");
  const of = (n: number) => R.passagesFor(ascContact, curie.chart, { houses: { houses: [{ house: 1, reading: words(n) }] } }).excerpts[0].text;
  assert.equal(of(120), words(120));
  assert.equal(of(121), words(120));
  assert.equal(of(1), "w1");
});

test("at most three passages, each from a paragraph of its own: five citing claims in five paragraphs give three, in the claims' order", () => {
  const paragraphs = ["First note about work.", "Second note about work.", "Third note about work.", "Fourth note about work.", "Fifth note about work."];
  const report = { career: { p1: paragraphs[0], p2: paragraphs[1], p3: paragraphs[2], p4: paragraphs[3], p5: paragraphs[4], claims: paragraphs.map((p) => claim(p, SUN)) } };
  const out = R.passagesFor(sunContact, blind.chart, report);
  assert.deepEqual(out.excerpts.map((e) => e.text), paragraphs.slice(0, 3));
  assert.ok(out.excerpts.every((e) => e.source === "Your Career & Calling chapter"));
});

test("two claims in one paragraph give one passage, and a claim whose quote the text no longer holds gives the quote itself, cut to 120 words", () => {
  const same = { career: { p: "You start early. You finish late.", claims: [claim("You start early.", SUN), claim("You finish late.", SUN)] } };
  assert.deepEqual(R.passagesFor(sunContact, blind.chart, same).excerpts.map((e) => e.text), ["You start early. You finish late."]);
  const long = Array.from({ length: 150 }, (_, i) => `q${i + 1}`).join(" ");
  const moved = { career: { p: "Something else entirely.", claims: [claim(long, SUN)] } };
  const [passage] = R.passagesFor(sunContact, blind.chart, moved).excerpts;
  assert.equal(passage.text.split(" ").length, 120);
  assert.ok(passage.text.startsWith("q1 q2") && passage.text.endsWith("q120"));
});

test("a claim that cites nothing the event touches, or is not shaped like a claim, builds on nothing", () => {
  const lot = { kind: "lot", lot: "fortune", sign: "scorpio", house: 4 };
  const moon = { kind: "placement", body: "moon", sign: "taurus", house: null };
  const report = {
    career: {
      p: "A paragraph with some words in it.",
      claims: [
        claim("A paragraph with some words in it.", lot),
        claim("A paragraph with some words in it.", moon),
        { quote: "A paragraph with some words in it.", evidence: [{ ref: { kind: "nonsense" }, label: "" }] },
        { quote: "A paragraph with some words in it.", evidence: "none" },
        { quote: "   ", evidence: [ref(SUN)] },
        { quote: 7, evidence: [ref(SUN)] },
        null,
        "text",
      ],
    },
    money: { claims: "not a list" },
    mind: null,
  };
  assert.deepEqual(R.passagesFor(sunContact, blind.chart, report), { excerpts: [], buildsOn: null });
  assert.deepEqual(R.passagesFor(sunContact, blind.chart, "a report that is a string"), { excerpts: [], buildsOn: null });
  assert.deepEqual(R.passagesFor(sunContact, blind.chart, [1, 2, 3]), { excerpts: [], buildsOn: null });
  assert.deepEqual(R.passagesFor(sunContact, blind.chart, undefined), { excerpts: [], buildsOn: null });
});

test("a sect, an angle and an aspect each cite the point they name, and the chapter with the most citations wins", () => {
  const sect = { kind: "sect", role: "sect_light", body: "sun" };
  const aspect = { kind: "aspect", body1: "uranus", body2: "sun", type: "trine", orb: 1.3 };
  const report = {
    overview: { p: "Overview words.", claims: [claim("Overview words.", sect)] },
    mind: { p: "Mind words one. Mind words two.", claims: [claim("Mind words one.", aspect), claim("Mind words two.", SUN)] },
  };
  const out = R.passagesFor(sunContact, blind.chart, report);
  assert.deepEqual(out.buildsOn, { kind: "chapter", chapter: "mind" });
  assert.equal(out.excerpts[0].source, "Your Mind & Communication chapter");
  // An angle names the Ascendant, which is what a contact on it touches; a drawn chart without that card reads the chapter.
  const angle = { kind: "angle", angle: "ascendant", sign: "scorpio" };
  const viaAngle = R.passagesFor(ascContact, curie.chart, { superpowers: { p: "Habit words.", claims: [claim("Habit words.", angle)] } });
  assert.deepEqual(viaAngle.buildsOn, { kind: "chapter", chapter: "superpowers" });
});

test("a retrograde in no known house, and an eclipse near no point, build on nothing even from a rich report", () => {
  const rich = { career: { p: "Words.", claims: [claim("Words.", SUN)] } };
  const retrograde = E.skyEvents(blind.chart, FROM, TO).find((e) => e.kind === "retrograde" && e.houses.length === 0);
  if (retrograde) assert.deepEqual(R.passagesFor(retrograde, blind.chart, rich), { excerpts: [], buildsOn: null });
  const year = E.skyEvents(curie.chart, new Date("2026-01-01T00:00:00Z"), new Date("2026-12-31T00:00:00Z"));
  const far = year.find((e) => e.kind === "eclipse" && e.near === null);
  if (far) assert.deepEqual(R.passagesFor(far, curie.chart, rich), { excerpts: [], buildsOn: null });
  assert.ok(retrograde || far, "the blind chart's six months, or Curie's year, hold one of the two");
});

// --- the call path ---------------------------------------------------------------------------------------------------

test("a model that cannot be reached is not a lost attempt: the write rejects with the outage, and no round alone follows", async () => {
  answer(CLEAN);
  fake.failOn = "timeline_reading";
  try {
    await assert.rejects(
      R.writeReading(curie, "contact.saturn.square.ascendant.20260529", ascContact, { name: "Marie Curie", interpretation: {} }),
      (err: unknown) => !(err instanceof SectionError),
    );
  } finally {
    fake.failOn = null;
  }
});

// --- the queue's limits, before any row ------------------------------------------------------------------------------

test("the queue writes nothing for no keys, a limit of 0 or less, or keys no row could hold", async () => {
  answer(CLEAN);
  const mira = readerOf(MIRA);
  const key = readable(mira)[0].key;
  assert.deepEqual(await R.queueReadings(mira, []), []);
  assert.deepEqual(await R.queueReadings(mira, [key], 0), []);
  assert.deepEqual(await R.queueReadings(mira, [key], -1), []);
  assert.deepEqual(await R.queueReadings(mira, [key], Number.NaN), []);
  assert.deepEqual(await R.queueReadings(mira, ["", "x".repeat(81), 7 as unknown as string, null as unknown as string]), []);
  assert.equal(asked.length, 0);
});

// --- rows ------------------------------------------------------------------------------------------------------------

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: readings are claimed and kept on a scratch Postgres";
const run = randomUUID().slice(0, 8);
const seeded: { userIds: string[]; profileIds: string[] } = { userIds: [], profileIds: [] };

const houseCards = (extra = "") => ({
  houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, reading: `Card ${i + 1}. You set the tone in this part of your life before you speak.${extra}` })),
});

/** A reader of their own with a finished Personal report as rows. */
async function seedReader(tag: string, options: { userId?: string; interpretation?: unknown; self?: boolean } = {}): Promise<ReaderChart> {
  const { db, profilesTable, reportsTable } = await import("@workspace/db");
  const ids = { userId: options.userId ?? `user_r16c_${run}_${tag}`, profileId: `r16c-${run}-${tag}-p`, reportId: `r16c-${run}-${tag}-r`, sessionId: `s-r16c-${run}-${tag}` };
  const row = rowOf(MIRA, ids);
  row.profile.isSelf = options.self ?? true;
  const f = birthOf(MIRA);
  await db.insert(profilesTable).values({ ...row.profile, name: f.name, birthPlace: "Lisbon, Portugal", chartData: chartForProfile(row.profile) });
  await db.insert(reportsTable).values({
    id: ids.reportId, profileId: ids.profileId, sessionId: ids.sessionId, type: "natal", status: "complete",
    interpretation: options.interpretation ?? { houses: houseCards() },
  });
  if (!seeded.userIds.includes(ids.userId)) seeded.userIds.push(ids.userId);
  seeded.profileIds.push(ids.profileId);
  return T.readerOf(ids.userId, row, chartForProfile(row.profile));
}

async function rowsFor(profileId: string) {
  const { db, timelineReadingsTable: t } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  return db.select().from(t).where(eq(t.profileId, profileId));
}

async function age(profileId: string, key: string, status: "writing" | "failed" | "ready", minutes: number): Promise<void> {
  const { db, timelineReadingsTable: t } = await import("@workspace/db");
  const { and, eq } = await import("drizzle-orm");
  await db.update(t).set({ status, updatedAt: new Date(Date.now() - minutes * 60_000) }).where(and(eq(t.profileId, profileId), eq(t.eventKey, key)));
}

if (SCRATCH) {
  after(async () => {
    const { db, pool, profilesTable, reportsTable, timelineReadingsTable, askMessagesTable } = await import("@workspace/db");
    const { inArray } = await import("drizzle-orm");
    if (seeded.profileIds.length) {
      await db.delete(timelineReadingsTable).where(inArray(timelineReadingsTable.profileId, seeded.profileIds));
      await db.delete(reportsTable).where(inArray(reportsTable.profileId, seeded.profileIds));
      await db.delete(profilesTable).where(inArray(profilesTable.id, seeded.profileIds));
    }
    if (seeded.userIds.length) await db.delete(askMessagesTable).where(inArray(askMessagesTable.userId, seeded.userIds));
    await pool.end();
  });
}

/** The reader's events in the order the queue writes them: soonest day first, the key breaking a tie. */
const soonest = (reader: ReaderChart): string[] =>
  readable(reader).map((e) => e.key).sort((a, b) => a.slice(-8).localeCompare(b.slice(-8)) || a.localeCompare(b));

test("the spend gate's last allowed write and first refused one: spent equal to the cap writes nothing, a hair under it writes", { skip: NO_DB }, async () => {
  const { db, spendLedgerTable } = await import("@workspace/db");
  const { and, eq } = await import("drizzle-orm");
  const { utcDay } = await import("./spendLedger.js");
  const { spentTodayUsd } = await import("./spendCap.js");
  const reader = await seedReader("spend");
  const day = utcDay();
  const [before] = await db.select().from(spendLedgerTable).where(and(eq(spendLedgerTable.day, day), eq(spendLedgerTable.kind, "timeline")));
  await db.insert(spendLedgerTable).values({ day, kind: "timeline", costUsd: 5, calls: 1 }).onConflictDoUpdate({ target: [spendLedgerTable.day, spendLedgerTable.kind], set: { costUsd: 5 } });
  const prior = process.env.DAILY_SPEND_CAP_USD;
  try {
    // The gate reads today's sum at most once a minute; asking it the same way means the cap and the queue see one figure.
    const spent = await spentTodayUsd();
    assert.ok(spent >= 5);
    const key = soonest(reader)[0];
    answer(CLEAN);
    process.env.DAILY_SPEND_CAP_USD = String(spent);
    assert.deepEqual(await R.queueReadings(reader, [key]), [], "spent equals the cap: paused");
    assert.equal(asked.length, 0);
    assert.deepEqual(await rowsFor(reader.profileId), [], "and no row is claimed behind a paused day");
    process.env.DAILY_SPEND_CAP_USD = String(spent + 0.000001);
    assert.deepEqual(await R.queueReadings(reader, [key]), [key], "one millionth of a dollar under the cap writes");
    assert.equal(asked.length, 1);
  } finally {
    if (prior === undefined) delete process.env.DAILY_SPEND_CAP_USD;
    else process.env.DAILY_SPEND_CAP_USD = prior;
    if (before) await db.update(spendLedgerTable).set({ costUsd: before.costUsd }).where(and(eq(spendLedgerTable.day, day), eq(spendLedgerTable.kind, "timeline")));
    else await db.delete(spendLedgerTable).where(and(eq(spendLedgerTable.day, day), eq(spendLedgerTable.kind, "timeline")));
  }
});

test("five opens at once write the reading once: one is ready, the rest are told it is writing, and one row is kept", { skip: NO_DB }, async () => {
  const reader = await seedReader("five");
  const key = soonest(reader)[0];
  answer(CLEAN);
  fake.delays.timeline_reading = 120;
  let all;
  try {
    all = await Promise.all(Array.from({ length: 5 }, () => R.openReading(reader, key)));
  } finally {
    delete fake.delays.timeline_reading;
  }
  assert.equal(asked.length, 1);
  assert.deepEqual(all.map((o) => o.status).sort(), ["ready", "writing", "writing", "writing", "writing"]);
  assert.equal((await rowsFor(reader.profileId)).length, 1);
});

test("an open and the queue on the same key at once write it once, whichever claims first", { skip: NO_DB }, async () => {
  const reader = await seedReader("race");
  const key = soonest(reader)[0];
  answer(CLEAN);
  fake.delays.timeline_reading = 100;
  try {
    await Promise.all([R.openReading(reader, key), R.queueReadings(reader, [key])]);
  } finally {
    delete fake.delays.timeline_reading;
  }
  assert.equal(asked.length, 1);
  const [row] = await rowsFor(reader.profileId);
  assert.deepEqual([row.status, row.eventKey], ["ready", key]);
});

test("two queues at once over the same keys write each key once and between them no more than their limits", { skip: NO_DB }, async () => {
  const reader = await seedReader("twoqueues");
  const keys = soonest(reader).slice(0, 5);
  answer(CLEAN);
  fake.delays.timeline_reading = 60;
  let both;
  try {
    both = await Promise.all([R.queueReadings(reader, keys), R.queueReadings(reader, keys)]);
  } finally {
    delete fake.delays.timeline_reading;
  }
  const [a, b] = both;
  assert.ok(a.length <= 3 && b.length <= 3);
  assert.deepEqual(a.filter((k) => b.includes(k)), [], "no key is claimed by both");
  assert.equal(asked.length, a.length + b.length);
  assert.equal((await rowsFor(reader.profileId)).length, a.length + b.length);
});

test("a bad key in front of good ones costs the queue nothing: it is skipped and the limit is still met", { skip: NO_DB }, async () => {
  const reader = await seedReader("skipbad");
  const good = soonest(reader).slice(0, 4);
  answer(CLEAN);
  // 19000101 sorts before every real day, so the queue meets it first.
  const done = await R.queueReadings(reader, ["contact.saturn.square.ascendant.19000101", "contact.sun.-.-.-.bad", ...good]);
  assert.deepEqual(done, good.slice(0, 3));
  assert.equal(asked.length, 3);
  assert.deepEqual(await R.queueReadings(reader, [good[0], good[0], good[0]]), [], "the same key three times is one key, already kept");
});

test("a reading kept on an old basis is written again by the queue, on the new one; one on the right basis is left alone", { skip: NO_DB }, async () => {
  const reader = await seedReader("qbasis");
  const [k0, k1] = soonest(reader);
  answer(CLEAN);
  await R.openReading(reader, k0);
  await R.openReading(reader, k1);
  const moved: ReaderChart = { ...reader, basis: `${reader.basis}-moved` };
  answer(ONE);
  assert.deepEqual(await R.queueReadings(moved, [k0, k1]), [k0, k1], "both were written on another basis");
  assert.equal(asked.length, 2);
  assert.deepEqual((await rowsFor(reader.profileId)).map((r) => r.basis), [moved.basis, moved.basis]);
  answer(TWO);
  assert.deepEqual(await R.queueReadings(moved, [k0, k1]), []);
  assert.equal(asked.length, 0);
  const statuses = await R.readingStatuses(reader.profileId, [k0, k1], moved.basis);
  assert.deepEqual([...statuses.values()], [{ status: "ready", line: ONE.line }, { status: "ready", line: ONE.line }]);
  assert.deepEqual(await R.readingStatuses(reader.profileId, [k0, k1], reader.basis), new Map(), "nothing is shown on the basis it left");
});

test("the queue writes a write that died and leaves one still being written, one that failed and one that is kept", { skip: NO_DB }, async () => {
  const reader = await seedReader("qstates");
  const [kept, fresh, died, failed] = soonest(reader);
  answer(CLEAN);
  for (const key of [kept, fresh, died, failed]) await R.openReading(reader, key);
  await age(reader.profileId, fresh, "writing", 4);
  await age(reader.profileId, died, "writing", 6);
  await age(reader.profileId, failed, "failed", 1);
  answer(ONE);
  assert.deepEqual(await R.queueReadings(reader, [kept, fresh, died, failed]), [died]);
  assert.equal(asked.length, 1);
  const rows = new Map((await rowsFor(reader.profileId)).map((r) => [r.eventKey, r.status]));
  assert.deepEqual([rows.get(kept), rows.get(fresh), rows.get(died), rows.get(failed)], ["ready", "writing", "ready", "failed"]);
  // The five minutes are the line: a write 4:59 old is still going, one 5:01 old is not.
  await age(reader.profileId, fresh, "writing", R.WRITING_STALE_MS / 60_000 - 1 / 60);
  assert.deepEqual(await R.readingStatuses(reader.profileId, [fresh]), new Map([[fresh, "writing"]]));
  await age(reader.profileId, fresh, "writing", R.WRITING_STALE_MS / 60_000 + 1 / 60);
  assert.deepEqual(await R.readingStatuses(reader.profileId, [fresh]), new Map());
});

test("a key nothing on the chart reads leaves no row, however it is opened or queued", { skip: NO_DB }, async () => {
  const reader = await seedReader("norow");
  answer(CLEAN);
  const keys = ["contact.saturn.conjunction.ascendant.19000101", "contact.saturn.square.moon.20260530", "../../etc/passwd", "x".repeat(81), "cycle.saturn-return.19000101"];
  for (const key of keys) {
    assert.equal((await R.openReading(reader, key)).status, "unknown", key.slice(0, 30));
    assert.deepEqual(await R.queueReadings(reader, [key]), [], key.slice(0, 30));
  }
  assert.deepEqual(await rowsFor(reader.profileId), []);
  assert.equal(asked.length, 0);
});

test("a Personal report that is gone fails the reading with the sheet's line, with no model call, and the row keeps only a code and that line", { skip: NO_DB }, async () => {
  const { db, reportsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const reader = await seedReader("gone");
  const key = soonest(reader)[0];
  await db.delete(reportsTable).where(eq(reportsTable.id, reader.reportId));
  answer(CLEAN);
  assert.deepEqual(await R.openReading(reader, key), { status: "failed", reading: null, line: R.READING_FAILED_LINE });
  assert.equal(asked.length, 0);
  const [row] = await rowsFor(reader.profileId);
  assert.equal(row.status, "failed");
  assert.deepEqual(Object.keys(row.reading as object).sort(), ["code", "line"]);
  assert.equal((row.reading as { line: string }).line, R.READING_FAILED_LINE);
});

test("a failed write stores no word of the report or the reply, and logs no word of either (R-3.5)", { skip: NO_DB }, async () => {
  const marker = `Rq${run}Zt`;
  const reader = await seedReader("quiet", { interpretation: { houses: houseCards(` ${marker} is in this card.`) } });
  const key = soonest(reader)[0];
  const lines: string[] = [];
  const levels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
  const loud = logger as unknown as Record<string, (...args: unknown[]) => void>;
  const kept = levels.map((level) => [level, loud[level]] as const);
  for (const level of levels) {
    loud[level] = (...args: unknown[]) => {
      lines.push(args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}\n${a.stack}` : typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    };
  }
  const logged = failureRows.length;
  answer(ORDER);
  try {
    assert.equal((await R.openReading(reader, key)).status, "failed");
  } finally {
    for (const [level, fn] of kept) loud[level] = fn;
  }
  assert.ok(asked.length === 6 && asked.every((r) => JSON.stringify(r).includes(marker)), "the report's words did go to the model, six times");
  assert.ok(lines.length > 0 && lines.every((l) => !l.includes(marker) && !l.includes("Take your time")), "and into no log line");
  const [row] = await rowsFor(reader.profileId);
  assert.ok(!JSON.stringify(row).includes(marker) && !JSON.stringify(row).includes("Take your time"));
  assert.ok(failureRows.slice(logged).every((r) => !r.message.includes(marker) && !r.message.includes("Take your time")));
});

test("a reading forgotten while it is written is not brought back by the write that finishes", { skip: NO_DB }, async () => {
  const reader = await seedReader("forgotten");
  const key = soonest(reader)[0];
  answer(CLEAN);
  fake.delays.timeline_reading = 150;
  try {
    const opening = R.openReading(reader, key);
    await sleep(40);
    assert.equal((await rowsFor(reader.profileId)).length, 1, "claimed and writing");
    await R.forgetTimeline(reader.userId, reader.profileId);
    await opening;
  } finally {
    delete fake.delays.timeline_reading;
  }
  assert.deepEqual(await rowsFor(reader.profileId), []);
});

test("a write that was taken over after it stalled does not overwrite the write that took over", { skip: NO_DB }, async () => {
  const reader = await seedReader("takeover");
  const key = soonest(reader)[0];
  answer(ONE, TWO);
  fake.delays.timeline_reading = 200;
  try {
    const first = R.openReading(reader, key);
    await sleep(40);
    await age(reader.profileId, key, "writing", 6);
    const second = R.openReading(reader, key);
    await Promise.all([first, second]);
  } finally {
    delete fake.delays.timeline_reading;
  }
  assert.equal(asked.length, 2);
  const [row] = await rowsFor(reader.profileId);
  assert.equal(row.status, "ready");
  assert.equal((row.reading as { line: string }).line, TWO.line, "the later claim's reading is the one kept");
});

test("the statuses: a key listed twice is one, no keys is none, a failed row with no line gets the sheet's, and any basis shows when none is asked for", { skip: NO_DB }, async () => {
  const { db, timelineReadingsTable: t } = await import("@workspace/db");
  const { and, eq } = await import("drizzle-orm");
  const reader = await seedReader("statuses");
  const [a, b, c] = soonest(reader);
  answer(CLEAN);
  for (const key of [a, b, c]) await R.openReading(reader, key);
  assert.deepEqual(await R.readingStatuses(reader.profileId, []), new Map());
  assert.equal((await R.readingStatuses(reader.profileId, [a, a, a], reader.basis)).size, 1);
  await db.update(t).set({ status: "failed", reading: null }).where(and(eq(t.profileId, reader.profileId), eq(t.eventKey, b)));
  assert.deepEqual((await R.readingStatuses(reader.profileId, [b])).get(b), { status: "failed", line: R.READING_FAILED_LINE });
  await db.update(t).set({ basis: "an-older-basis" }).where(and(eq(t.profileId, reader.profileId), eq(t.eventKey, a)));
  assert.equal((await R.readingStatuses(reader.profileId, [a])).get(a) !== undefined, true, "with no basis given every row shows");
  assert.equal((await R.readingStatuses(reader.profileId, [a], reader.basis)).has(a), false);
  assert.equal((await R.readingStatuses(reader.profileId, ["contact.never.asked.-.20260101"])).size, 0);
  // Another reader's profile has none of these.
  assert.equal((await R.readingStatuses(`${reader.profileId}-someone-else`, [a, b, c])).size, 0);
});

test("a kept reading that can no longer be read is written again by the next open, not answered 'writing' for good", { skip: NO_DB }, async () => {
  const { db, timelineReadingsTable: t } = await import("@workspace/db");
  const { and, eq } = await import("drizzle-orm");
  const reader = await seedReader("unreadable");
  const key = soonest(reader)[0];
  answer(CLEAN);
  assert.equal((await R.openReading(reader, key)).status, "ready");
  await db.update(t).set({ reading: { somethingElse: true } }).where(and(eq(t.profileId, reader.profileId), eq(t.eventKey, key)));
  assert.equal((await R.readingStatuses(reader.profileId, [key])).has(key), false, "the views show it as having no reading");
  answer(ONE);
  const opened = await R.openReading(reader, key);
  assert.deepEqual([opened.status, opened.reading?.line], ["ready", ONE.line]);
});

test("forgetting removes a profile's readings and its reader's whole thread, and no other profile's readings, or another account's thread", { skip: NO_DB }, async () => {
  const { db, askMessagesTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const userId = `user_r16c_${run}_forget2`;
  const first = await seedReader("forget-a", { userId });
  const second = await seedReader("forget-b", { userId, self: false });
  const other = await seedReader("forget-other");
  answer(CLEAN);
  for (const reader of [first, second, other]) await R.openReading(reader, soonest(reader)[0]);
  const old = new Date("2026-01-01T00:00:00Z");
  for (const owner of [userId, other.userId]) {
    await db.insert(askMessagesTable).values([
      { id: randomUUID(), userId: owner, role: "reader", body: { text: "A question." }, createdAt: old },
      { id: randomUUID(), userId: owner, role: "ask", body: { said: "answer", text: "An answer.", cards: [], choices: [] }, createdAt: new Date() },
    ]);
  }
  const thread = async (who: string) => (await db.select().from(askMessagesTable).where(eq(askMessagesTable.userId, who))).length;
  await R.forgetTimeline(userId, first.profileId);
  assert.deepEqual([(await rowsFor(first.profileId)).length, (await rowsFor(second.profileId)).length, (await rowsFor(other.profileId)).length], [0, 1, 1]);
  assert.deepEqual([await thread(userId), await thread(other.userId)], [0, 2], "the thread is the account's, so it goes with the Personal report, and only that account's");
  await R.forgetTimeline(`${userId}-nobody`, `${first.profileId}-nobody`);
  assert.deepEqual([(await rowsFor(second.profileId)).length, await thread(other.userId)], [1, 2], "ids that match nothing remove nothing");
});
