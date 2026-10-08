/**
 * Timeline's readings with the model stubbed (R16-24): what a reading builds on, and the report's call path with its
 * retries, round alone, spend and failure log, with no database. The claims run on a scratch Postgres when
 * WALK_DATABASE_URL names a bootstrapped one: one write across two opens, a stale reading's kept text answering, a write
 * that died retried, a failure's line kept, a setup job's write and the statuses, an account's new readings a day, and
 * forgetting. Without one they skip, saying why. Every event is the engine's, computed from a committed fixture at
 * run time.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points nowhere and nothing here queries it.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";

const { installFakeModel, cannedNatalReplies, failureRows } = await import("./testModel.js");
const { setSpendSink } = await import("./spendLedger.js");
const { generateInterpretation, SectionError } = await import("./aiInterpretation.js");
const { chartForProfile } = await import("./profiles.js");
const { MODELS, effortFor } = await import("./models.js");
const T = await import("./timeline.js");
const R = await import("./timelineReadings.js");
const { READING_KEY, checkReading } = await import("../prompts/timeline/index.js");
const { buildBrief } = await import("../prompts/brief.js");
const { blockValues } = await import("../prompts/data.js");
const { ordinal } = await import("../prompts/vocabulary.js");
const E = await import("@workspace/engine");

type ReaderRow = import("./timeline.js").ReaderRow;
type ReaderChart = import("./timeline.js").ReaderChart;
type SkyEvent = import("@workspace/engine").SkyEvent;
type ReadingOutput = import("../prompts/timeline/index.js").ReadingOutput;
type FakeRequest = import("./testModel.js").FakeRequest;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CURIE = "fixtures/charts/marie-curie.json";
const BLIND = "fixtures/charts/marie-curie-unknown.json";
/** A reader alive today: Timeline reads no key long after its reader's birth, so Curie's opens are Mira's. */
const MIRA = "fixtures/sample-people/mira.json";
const FROM = new Date("2026-10-05T00:00:00Z");
const TO = new Date("2027-04-05T00:00:00Z");

interface Birth {
  name: string;
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes?: number;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  timezone?: string;
}

const birthOf = (path: string): Birth => JSON.parse(readFileSync(join(ROOT, path), "utf8")) as Birth;

function rowOf(path: string, ids: { userId: string; profileId: string; reportId: string; sessionId: string }): ReaderRow {
  const f = birthOf(path);
  return {
    report: { id: ids.reportId, status: "complete", sessionId: ids.sessionId, createdAt: new Date("2026-09-01T10:00:00Z") },
    profile: {
      id: ids.profileId,
      userId: ids.userId,
      sessionId: ids.sessionId,
      claimedByUserId: null,
      isSelf: true,
      claimedAsSelf: false,
      birthDate: f.birthDate,
      birthTime: f.birthTime,
      birthTimeWindowMinutes: f.birthTimeWindowMinutes ?? 0,
      latitude: f.latitude,
      longitude: f.longitude,
      timezoneOffset: f.timezoneOffset,
      timezone: f.timezone ?? null,
      chartData: null,
    },
  };
}

function readerOf(path: string, ids = { userId: "user_reader", profileId: "profile-1", reportId: "report-1", sessionId: "s-reader" }): ReaderChart {
  const row = rowOf(path, ids);
  return T.readerOf(ids.userId, row, chartForProfile(row.profile));
}

const curie = readerOf(CURIE);
const blind = readerOf(BLIND);
const mira = readerOf(MIRA);

const readable = (reader: ReaderChart, from = FROM, to = TO) => E.skyEvents(reader.chart, from, to).filter(E.readsAs);
const eventOf = (reader: ReaderChart, key: string, from = FROM, to = TO): SkyEvent => {
  const event = readable(reader, from, to).find((e) => e.key === key);
  assert.ok(event, `${key} is on the chart`);
  return event;
};
const cycles = (reader: ReaderChart) => E.lifeCycles(E.natalLongitudes(reader.chart), reader.birth);

const SATURN_SQUARE = "contact.saturn.square.ascendant.20260529";
/** Saturn on Mira's Ascendant, her 1st house. */
const SATURN_ON_ASC = "contact.saturn.conjunction.ascendant.20260530";

/** Fits any event: no date, degree, life event or order, so only the call path decides what happens to it. */
const CLEAN: ReadingOutput = {
  line: "You think harder about what you take on and why.",
  body: "Astrology reads this stretch as a time when the sky presses on a part of your chart you already know well. Your report describes how you work through things in depth before you commit. This time meets that habit. You may find that old plans feel heavier to carry. You may also find that the plans you still believe in feel clearer. Some days the pressure feels like a weight. Other days it feels like a firm hand on your back. People around you may see you as more serious than usual. You may feel the gap between how calm you look and how you feel inside.",
};
/** The same reading with an order at its end, which chk-46 blocks. */
const ORDER: ReadingOutput = { ...CLEAN, body: `${CLEAN.body} Take your time with it.` };

function houseCards(): { houses: { house: number; reading: string }[] } {
  return {
    houses: Array.from({ length: 12 }, (_, i) => ({
      house: i + 1,
      reading: `Card ${i + 1}. You set the tone in this part of your life before you speak. Behaviour check: see who follows your pace.`,
    })),
  };
}

const ref = (r: Record<string, unknown>) => ({ ref: r, label: "" });
const claim = (quote: string, ...refs: Record<string, unknown>[]) => ({ quote, evidence: refs.map(ref) });

const PLAN = "You like a plan that holds.";
const LONG = `${Array(17).fill(PLAN).join(" ")} You finish what others drop. ${Array(17).fill(PLAN).join(" ")}`;

/** A blind report whose claims cite the Sun twice in career and twice in money, and once in the overview. */
function blindReport(): Record<string, unknown> {
  const sun = { kind: "placement", body: "sun", sign: "scorpio", house: null };
  const venus = { kind: "placement", body: "venus", sign: "scorpio", house: null };
  const trine = { kind: "aspect", body1: "sun", body2: "uranus", type: "trine", orb: 1.3 };
  return {
    overview: { headline: "You go deep before you go wide.", claims: [claim("You go deep before you go wide.", sun)] },
    career: {
      vocationalPull: LONG,
      howYouShowUp: "You keep your own pace at work. People learn to wait for it.",
      claims: [claim("You finish what others drop.", trine), claim("People learn to wait for it.", venus), claim("You keep your own pace at work.", sun)],
    },
    money: {
      relationshipToResources: "You save in quiet ways. You spend in loud ones.",
      claims: [claim("You save in quiet ways.", sun), claim("You spend in loud ones.", sun)],
    },
  };
}

const fake = installFakeModel({ ...cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }) });
const asked: FakeRequest[] = [];

/** Each reading call takes the next reply, the last one again once they run out. */
function answer(...replies: ReadingOutput[]): void {
  let n = 0;
  asked.length = 0;
  fake.replies.timeline_reading = (req: FakeRequest) => {
    asked.push(req);
    return replies[Math.min(n++, replies.length - 1)];
  };
}

const spent: { kind: string; costUsd: number }[] = [];
setSpendSink(async (entry) => {
  spent.push({ kind: entry.kind, costUsd: entry.costUsd });
});

const userTurn = (req: FakeRequest) => req.messages.find((m) => m.role === "user")?.content ?? "";

/** A stored report as a write reads it: the canned natal text, its claims on the reader's own Sun, and a card of its own for each house. */
async function reportFor(reader: ReaderChart, name: string) {
  const sun = reader.chart.planets.sun;
  const sect = (reader.chart.sunAltitude ?? 0) > 0 ? "day" : "night";
  Object.assign(fake.replies, cannedNatalReplies({ drawn: true, sunSign: sun.sign.toLowerCase(), sunHouse: sun.house, sect }));
  return { ...(await generateInterpretation(reader.chart, name)), houses: houseCards() };
}
const curieReport = await reportFor(curie, "Marie Curie");
const miraReport = await reportFor(mira, "Mira Costa");

test("the reply every test writes passes the checks on any event, drawn or blind, and the order does not", () => {
  assert.deepEqual([curie.blind, blind.blind], [false, true]);
  for (const [reader, key] of [[curie, SATURN_SQUARE], [blind, "contact.mars.square.sun.20261024"]] as const) {
    const event = eventOf(reader, key);
    const input = { event, brief: buildBrief(reader.chart, "Marie Curie"), excerpts: [], name: "Marie Curie", blind: reader.blind, ...T.readingTimes(reader, event, FROM) };
    assert.deepEqual(checkReading(CLEAN, input).checks.filter((c) => c.cls === "block"), [], key);
    assert.deepEqual(checkReading(ORDER, input).checks.filter((c) => c.cls === "block").map((c) => c.rule), ["chk-46"], key);
  }
});

test("a reading's times: a contact's stretches are its card's, the age is floored at its first exact pass, and only a cycle behind the reader is passed (reading 27, R16-23)", () => {
  const event = eventOf(mira, SATURN_ON_ASC);
  const keyed = T.eventByKey(mira, SATURN_ON_ASC, FROM);
  assert.ok(keyed?.kind === "sky");
  const times = T.readingTimes(mira, event, FROM);
  assert.deepEqual(times.spans, keyed.view.spans, "the stretches its card shows");
  assert.equal(times.passed, false, "a sky event is never behind");
  assert.ok(event.kind === "contact");
  assert.equal(times.age, E.ageAt(mira.birth, event.window.exact[0] ?? event.window.start));
  // A cycle late in a year of her life, where rounding would give the age she is not yet.
  const years = (at: Date) => (at.getTime() - mira.birth.getTime()) / (365.2425 * 86_400_000);
  const late = cycles(mira).find((c) => years(c.window.exact[0] ?? c.window.start) % 1 > 0.6 && years(c.window.exact[0] ?? c.window.start) % 1 < 0.95);
  assert.ok(late, "a cycle late in one of her years");
  const lateYears = years(late.window.exact[0] ?? late.window.start);
  assert.deepEqual([T.readingTimes(mira, late, FROM).age, late.age], [Math.floor(lateYears), Math.floor(lateYears)]);
  assert.notEqual(Math.round(lateYears), Math.floor(lateYears));
  const behind = cycles(mira).filter((c) => c.window.end.getTime() < FROM.getTime() - 2 * 86_400_000).pop();
  const ahead = cycles(mira).find((c) => c.window.start.getTime() > FROM.getTime());
  assert.ok(behind && ahead);
  assert.deepEqual([T.readingTimes(mira, behind, FROM).passed, T.readingTimes(mira, ahead, FROM).passed], [true, false]);
  assert.equal(T.readingTimes(mira, behind, behind.window.start).passed, false, "under way is not behind");
  assert.deepEqual(T.readingTimes(mira, behind, FROM).spans, [{ start: behind.window.start, end: behind.window.end }], "a cycle's whole window, as Life says it");
});

test("drawn, a reading builds on the house card of the point it touches, cut to 120 words", () => {
  const report = { houses: houseCards() };
  const card = (n: number) => report.houses.houses[n - 1].reading;
  const midheaven = "contact.jupiter.square.midheaven.20260925";
  assert.deepEqual(R.passagesFor(eventOf(curie, SATURN_SQUARE), curie.chart, report), {
    excerpts: [{ source: "Your 1st house card", text: card(1) }],
    buildsOn: { kind: "house", house: 1 },
  });
  // The Midheaven's sign, Scorpio, is her 11th house.
  assert.deepEqual(R.passagesFor(eventOf(curie, midheaven), curie.chart, report).buildsOn, { kind: "house", house: 11 });
  const year = [new Date("2026-01-01T00:00:00Z"), new Date("2026-12-31T00:00:00Z")] as const;
  const eclipse = eventOf(curie, "eclipse.sun.-.-.20260217", ...year);
  assert.ok(eclipse.kind === "eclipse" && eclipse.near?.target === "jupiter");
  assert.deepEqual(R.passagesFor(eclipse, curie.chart, report).buildsOn, { kind: "house", house: curie.chart.planets.jupiter.house });
  const retrograde = eventOf(curie, "retrograde.venus.-.-.20261003");
  assert.ok(retrograde.kind === "retrograde");
  assert.deepEqual(R.passagesFor(retrograde, curie.chart, report).buildsOn, { kind: "house", house: retrograde.houses[0] }, "the house it turns back in");
  for (const id of ["saturn-return", "node-return"] as const) {
    const cycle = cycles(curie).find((c) => c.id === id)!;
    const house = curie.chart.planets[cycle.body].house!;
    assert.deepEqual(R.passagesFor(cycle, curie.chart, report), {
      excerpts: [{ source: `Your ${ordinal(house)} house card`, text: card(house) }],
      buildsOn: { kind: "house", house },
    }, id);
  }
  const long = { houses: { houses: [{ house: 1, reading: `${PLAN} `.repeat(30).trim() }] } };
  const [cut] = R.passagesFor(eventOf(curie, SATURN_SQUARE), curie.chart, long).excerpts;
  assert.equal(cut.text.split(" ").length, 120);
});

test("blind, it builds on the chapter whose claims cite the point most, the earlier on a tie, its passages around the claims", () => {
  const sunContact = eventOf(blind, "contact.mars.square.sun.20261024");
  const out = R.passagesFor(sunContact, blind.chart, blindReport());
  assert.deepEqual(out.buildsOn, { kind: "chapter", chapter: "career" }, "career and money cite the Sun twice each, and career comes first");
  assert.deepEqual(out.excerpts.map((e) => e.source), ["Your Career & Calling chapter", "Your Career & Calling chapter"]);
  const [around, short] = out.excerpts.map((e) => e.text);
  assert.ok(around.includes("You finish what others drop."), "the cited sentence is in its passage");
  assert.ok(around.split(" ").length <= 120);
  assert.ok(around.startsWith(PLAN) && around.endsWith("holds."), "whole sentences, the paragraph's end kept");
  assert.equal(short, "You keep your own pace at work. People learn to wait for it.");
  const venusContact = eventOf(blind, "contact.jupiter.square.venus.20261112");
  assert.deepEqual(R.passagesFor(venusContact, blind.chart, blindReport()).buildsOn, { kind: "chapter", chapter: "career" });
  const jupiterContact = eventOf(blind, "contact.mars.opposition.jupiter.20261121");
  assert.deepEqual(R.passagesFor(jupiterContact, blind.chart, blindReport()), { excerpts: [], buildsOn: null }, "no claim cites Jupiter");
  assert.deepEqual(R.passagesFor(sunContact, blind.chart, null), { excerpts: [], buildsOn: null }, "no report text at all");
});

test("drawn with no house card in the report, as one written blind, it falls to the chapter", () => {
  const sunContact = eventOf(curie, "contact.mars.square.sun.20261024");
  assert.deepEqual(R.passagesFor(sunContact, curie.chart, blindReport()).buildsOn, { kind: "chapter", chapter: "career" });
});

test("a reading in one call: the house card in a quote block, the pinned model, the reader's spend under timeline, a pass in the log", async () => {
  answer(CLEAN);
  const logged = failureRows.length;
  const charged = spent.length;
  const reading = await R.writeReading(curie, SATURN_SQUARE, eventOf(curie, SATURN_SQUARE), { name: "Marie Curie", interpretation: curieReport });
  assert.deepEqual([reading.key, reading.line, reading.body], [SATURN_SQUARE, CLEAN.line, CLEAN.body]);
  assert.deepEqual(reading.buildsOn, { kind: "house", house: 1 });
  assert.equal(asked.length, 1);
  const req = asked[0] as FakeRequest & { model: string; reasoning_effort: string };
  const model = MODELS.timelineReading;
  assert.deepEqual([req.model, req.reasoning_effort, req.response_format.json_schema.name], [model, effortFor(model), "timeline_reading"]);
  assert.ok(blockValues(userTurn(req), "quote").includes(curieReport.houses.houses[0].reading), "the 1st house card, in its block");
  assert.deepEqual(spent.slice(charged).map((s) => s.kind), ["timeline"]);
  const rows = failureRows.slice(logged);
  assert.ok(rows.every((r) => r.kind === "timeline" && r.section === READING_KEY));
  assert.deepEqual(rows.filter((r) => r.ruleId === "pass").map((r) => [r.attempt, r.final]), [[1, true]]);
});

test("a name the report repeats reaches the prompt in a block of its own, never inside the passage's (re-pin 6)", async () => {
  answer(CLEAN);
  const interpretation = { houses: { houses: [{ house: 1, reading: "Marie, you set the tone before you speak. Marie Curie leads by example." }] } };
  await R.writeReading(curie, SATURN_SQUARE, eventOf(curie, SATURN_SQUARE), { name: "Marie Curie", interpretation });
  const user = userTurn(asked[0]);
  assert.deepEqual(blockValues(user, "quote"), [", you set the tone before you speak.", "leads by example."]);
  assert.ok(blockValues(user, "name").includes("Marie") && blockValues(user, "name").includes("Marie Curie"));
});

test("a blocked attempt is logged with its rule, and the retry carries the error and the reply", async () => {
  answer(ORDER, CLEAN);
  const logged = failureRows.length;
  const charged = spent.length;
  const reading = await R.writeReading(curie, SATURN_SQUARE, eventOf(curie, SATURN_SQUARE), { name: "Marie Curie", interpretation: curieReport });
  assert.equal(reading.body, CLEAN.body);
  assert.equal(asked.length, 2);
  const retry = userTurn(asked[1]);
  assert.ok(retry.includes("EVERY ERROR SO FAR:\n1. body: tells the reader what to do"), "the error goes back with the retry");
  assert.ok(retry.includes("Take your time with it."), "and so does the reply it was found in");
  const rows = failureRows.slice(logged);
  const blocked = rows.filter((r) => r.class === "block");
  assert.deepEqual(blocked.map((r) => [r.kind, r.section, r.ruleId, r.attempt, r.final]), [["timeline", READING_KEY, "chk-46", 1, false]]);
  assert.doesNotMatch(blocked[0].message, /Take your time/, "the log names the fault, never the words");
  assert.deepEqual(rows.filter((r) => r.ruleId === "pass").map((r) => [r.attempt, r.writeId === blocked[0].writeId]), [[2, true]]);
  assert.deepEqual(spent.slice(charged).map((s) => s.kind), ["timeline", "timeline"], "the rejected reply was billed too");
});

test("a reading that never passes: three attempts, one round alone that starts from every error, then it fails", async () => {
  answer(ORDER);
  const logged = failureRows.length;
  const charged = spent.length;
  await assert.rejects(
    R.writeReading(curie, SATURN_SQUARE, eventOf(curie, SATURN_SQUARE), { name: "Marie Curie", interpretation: curieReport }),
    (err: unknown) => err instanceof SectionError,
  );
  assert.equal(asked.length, 6);
  const alone = userTurn(asked[3]);
  assert.match(alone, /EVERY ERROR SO FAR:\n1\. [^\n]+\n2\. [^\n]+\n3\. [^\n]+\n/, "the round alone opens knowing all three");
  assert.equal(spent.length - charged, 6);
  const rows = failureRows.slice(logged).filter((r) => r.class === "block");
  assert.deepEqual(rows.map((r) => r.ruleId), Array(6).fill("chk-46"));
  assert.equal(new Set(rows.map((r) => r.writeId)).size, 2, "each round is a write of its own");
  assert.deepEqual(rows.filter((r) => r.final).map((r) => r.attempt), [3, 3]);
});

test("a key nothing on the chart reads answers unknown, with no model call and no row", async () => {
  answer(CLEAN);
  const keys = [
    "contact.saturn.conjunction.ascendant.19000101", "contact.saturn.square.moon.20260530", SATURN_SQUARE, "../../etc/passwd", "x".repeat(81),
  ];
  for (const key of keys) assert.deepEqual(await R.openReading(mira, key), { status: "unknown", reading: null, line: null }, key.slice(0, 40));
  assert.deepEqual(await R.openReading(curie, SATURN_SQUARE), { status: "unknown", reading: null, line: null }, "long after the reader's birth");
  assert.equal(asked.length, 0);
});

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: readings are claimed and kept on a scratch Postgres";

/** Each run's own rows, so a second run, or the walk on the same database, finds nothing of the first. */
const run = randomUUID().slice(0, 8);
const seeded: { userIds: string[]; profileIds: string[] } = { userIds: [], profileIds: [] };

/** A reader of their own, with their profile and finished Personal report as rows, so no test sees another's readings. */
async function seedReader(tag: string, path = MIRA): Promise<ReaderChart> {
  const { db, profilesTable, reportsTable } = await import("@workspace/db");
  const ids = { userId: `user_r1624_${run}_${tag}`, profileId: `r1624-${run}-${tag}-p`, reportId: `r1624-${run}-${tag}-r`, sessionId: `s-r1624-${run}-${tag}` };
  const row = rowOf(path, ids);
  const f = birthOf(path);
  await db.insert(profilesTable).values({ ...row.profile, name: f.name, birthPlace: "Lisbon, Portugal", chartData: chartForProfile(row.profile) });
  await db.insert(reportsTable).values({ id: ids.reportId, profileId: ids.profileId, sessionId: ids.sessionId, type: "natal", status: "complete", interpretation: miraReport });
  seeded.userIds.push(ids.userId);
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

test("two opens at once write the reading once, and a third reads it back with no call", { skip: NO_DB }, async () => {
  const reader = await seedReader("twice");
  answer(CLEAN);
  // Long enough that the second open's claim and read land while the first is still writing.
  fake.delays.timeline_reading = 100;
  let both: Awaited<ReturnType<typeof R.openReading>>[];
  try {
    both = await Promise.all([R.openReading(reader, SATURN_ON_ASC), R.openReading(reader, SATURN_ON_ASC)]);
  } finally {
    delete fake.delays.timeline_reading;
  }
  assert.equal(asked.length, 1, "one write");
  assert.deepEqual(both.map((o) => o.status).sort(), ["ready", "writing"], "the second open finds it writing");
  const ready = both.find((o) => o.status === "ready")!;
  assert.deepEqual([ready.reading?.line, ready.reading?.body, ready.reading?.buildsOn, ready.line], [CLEAN.line, CLEAN.body, { kind: "house", house: 1 }, null]);
  const again = await R.openReading(reader, SATURN_ON_ASC);
  assert.equal(asked.length, 1, "kept, never written twice");
  assert.deepEqual(again, ready);
  const [row] = await rowsFor(reader.profileId);
  assert.deepEqual([row.status, row.model, row.userId], ["ready", MODELS.timelineReading, reader.userId]);
  assert.ok(row.basis.startsWith(`${reader.basis}|`) && row.basis.length > reader.basis.length + 1, "the reader's basis with their report's version (reading 10)");
  assert.deepEqual(await R.readingStatuses(reader.profileId, [SATURN_ON_ASC, "contact.mars.square.sun.20261024"], reader.basis), new Map([[SATURN_ON_ASC, { status: "ready", line: CLEAN.line }]]));
});

test("a reading whose basis moved still answers its kept text, in the statuses and on its open, and neither an open nor a setup job writes it again (reading 10)", { skip: NO_DB }, async () => {
  const reader = await seedReader("basis");
  answer(CLEAN);
  assert.equal((await R.openReading(reader, SATURN_ON_ASC)).status, "ready");
  const [before] = await rowsFor(reader.profileId);
  const moved: ReaderChart = { ...reader, basis: `${reader.basis}-moved` };
  answer({ ...CLEAN, line: "You weigh what you agreed to and what you still want." });
  assert.deepEqual(await R.readingStatuses(reader.profileId, [SATURN_ON_ASC], moved.basis), new Map([[SATURN_ON_ASC, { status: "ready", line: CLEAN.line }]]), "its kept line shows meanwhile");
  const kept = await R.openReading(moved, SATURN_ON_ASC);
  assert.deepEqual([kept.status, kept.reading?.line], ["ready", CLEAN.line], "its open answers the kept text");
  assert.deepEqual(await R.writeQueuedReading(moved, SATURN_ON_ASC), { status: "kept" }, "a start writes nothing again");
  assert.equal(asked.length, 0, "nobody waits on a call: only a refresh the reader's open queued writes it again");
  const rows = await rowsFor(reader.profileId);
  assert.deepEqual(rows.map((r) => [r.basis, r.status]), [[before.basis, "ready"]], "kept as it was");
});

test("a cycle that goes behind the reader is written again once, short, on its basis, and once in all when a new prompt version moves its basis too (Review 05/10 §4)", { skip: NO_DB }, async () => {
  const reader = await seedReader("passed");
  const today = new Date();
  const [moves, both] = cycles(reader).filter((c) => c.window.end.getTime() < today.getTime() - 2 * 86_400_000).slice(-2);
  const keys = [moves.key, both.key];
  answer(CLEAN);
  for (const cycle of [moves, both]) {
    assert.equal((await R.openReading(reader, cycle.key, { now: new Date(cycle.window.start.getTime() - 86_400_000) })).status, "ready", cycle.key);
  }
  assert.equal(asked.length, 2);
  const passedOf = async (key: string) => ((await rowsFor(reader.profileId)).find((r) => r.eventKey === key)?.reading as { passed?: boolean }).passed;
  assert.deepEqual([await passedOf(moves.key), await passedOf(both.key)], [false, false], "each written while it was ahead");
  assert.deepEqual(await R.staleReadings(reader, keys, new Date(moves.window.start.getTime() - 86_400_000)), [], "nothing is behind her then");
  assert.deepEqual(await R.staleReadings(reader, keys), keys, "both behind her today");

  const SHORT = { ...CLEAN, line: "You may look back on what that time changed." };
  answer(SHORT);
  assert.deepEqual(await R.refreshReading(reader, moves.key), { status: "rewritten" }, "on the basis it stands on");
  assert.equal(asked.length, 1);
  const moved: ReaderChart = { ...reader, basis: `${reader.basis}-t2` };
  assert.deepEqual(await R.staleReadings(moved, [both.key]), [both.key]);
  assert.deepEqual(await R.refreshReading(moved, both.key), { status: "rewritten" }, "a new basis and a cycle passed: one write");
  assert.equal(asked.length, 2);
  assert.deepEqual([await passedOf(moves.key), await passedOf(both.key)], [true, true]);
  const rows = await rowsFor(reader.profileId);
  assert.ok(rows.find((r) => r.eventKey === both.key)?.basis.startsWith(`${moved.basis}|`), "kept on the new basis");
  assert.deepEqual(await R.staleReadings(reader, [moves.key]), [], "nothing left to write again");
  assert.deepEqual(await R.staleReadings(moved, [both.key]), []);
  assert.deepEqual(await R.refreshReading(moved, both.key), { status: "left" });
  assert.equal(asked.length, 2, "written again once each");
  answer(CLEAN);
  assert.equal((await R.openReading(reader, SATURN_ON_ASC)).status, "ready");
  assert.deepEqual(await R.staleReadings(reader, [SATURN_ON_ASC]), [], "a sky event's reading never goes behind");
});

test("a write still marked writing answers writing under five minutes, and is written again past five", { skip: NO_DB }, async () => {
  const reader = await seedReader("stale");
  answer(CLEAN);
  await R.openReading(reader, SATURN_ON_ASC);
  await age(reader.profileId, SATURN_ON_ASC, "writing", 4);
  answer(CLEAN);
  assert.deepEqual(await R.openReading(reader, SATURN_ON_ASC), { status: "writing", reading: null, line: null });
  assert.deepEqual(await R.readingStatuses(reader.profileId, [SATURN_ON_ASC]), new Map([[SATURN_ON_ASC, "writing"]]));
  assert.equal(asked.length, 0);
  await age(reader.profileId, SATURN_ON_ASC, "writing", R.WRITING_STALE_MS / 60_000 + 1);
  assert.deepEqual(await R.readingStatuses(reader.profileId, [SATURN_ON_ASC]), new Map(), "a write that died is not shown as writing");
  assert.equal((await R.openReading(reader, SATURN_ON_ASC)).status, "ready");
  assert.equal(asked.length, 1);
});

test("an open that stops waiting answers writing, and the write lands on its own", { skip: NO_DB }, async () => {
  const reader = await seedReader("late");
  answer(CLEAN);
  fake.delays.timeline_reading = 150;
  try {
    assert.deepEqual(await R.openReading(reader, SATURN_ON_ASC, { waitMs: 1 }), { status: "writing", reading: null, line: null });
    let status: unknown;
    for (let i = 0; i < 100 && status === undefined; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      status = (await R.readingStatuses(reader.profileId, [SATURN_ON_ASC])).get(SATURN_ON_ASC);
      if (status === "writing") status = undefined;
    }
    assert.deepEqual(status, { status: "ready", line: CLEAN.line });
  } finally {
    delete fake.delays.timeline_reading;
  }
});

test("a failed write keeps the sheet's line, a setup job leaves it, and the reader's next open writes it again", { skip: NO_DB }, async () => {
  const reader = await seedReader("failed");
  answer(ORDER);
  const failed = await R.openReading(reader, SATURN_ON_ASC);
  assert.deepEqual(failed, { status: "failed", reading: null, line: R.READING_FAILED_LINE });
  assert.equal(asked.length, 6, "three attempts and the round alone");
  const [row] = await rowsFor(reader.profileId);
  assert.deepEqual([row.status, (row.reading as { line: string }).line, (row.reading as { code: string }).code], ["failed", R.READING_FAILED_LINE, "quality"]);
  assert.deepEqual(await R.readingStatuses(reader.profileId, [SATURN_ON_ASC], reader.basis), new Map([[SATURN_ON_ASC, { status: "failed", line: R.READING_FAILED_LINE }]]));
  answer(CLEAN);
  assert.deepEqual(await R.writeQueuedReading(reader, SATURN_ON_ASC), { status: "kept" }, "a failure waits for the reader's own open");
  assert.equal(asked.length, 0);
  const ready = await R.openReading(reader, SATURN_ON_ASC);
  assert.deepEqual([ready.status, ready.reading?.body], ["ready", CLEAN.body]);
});

test("a setup job's write: a missing reading written once, a kept one left, a key that names nothing never claimed, and a paused day writes nothing", { skip: NO_DB }, async () => {
  const reader = await seedReader("queue");
  const [first, second] = readable(reader).map((e) => e.key).sort((a, b) => a.slice(-8).localeCompare(b.slice(-8)) || a.localeCompare(b));
  answer(CLEAN);
  assert.equal((await R.openReading(reader, second)).status, "ready");
  answer(CLEAN);
  assert.deepEqual(await R.writeQueuedReading(reader, second), { status: "kept" }, "the one already kept is left as it is");
  assert.equal(asked.length, 0);
  const before = process.env.DAILY_SPEND_CAP_USD;
  process.env.DAILY_SPEND_CAP_USD = "0";
  try {
    assert.deepEqual(await R.writeQueuedReading(reader, first), { status: "paused" }, "the spend gate's rule, before any row or call");
  } finally {
    if (before === undefined) delete process.env.DAILY_SPEND_CAP_USD;
    else process.env.DAILY_SPEND_CAP_USD = before;
  }
  assert.equal(asked.length, 0);
  assert.equal((await rowsFor(reader.profileId)).length, 1);
  assert.deepEqual(await R.writeQueuedReading(reader, first), { status: "written" });
  assert.equal(asked.length, 1);
  assert.deepEqual(await R.readingStatuses(reader.profileId, [first], reader.basis), new Map([[first, { status: "ready", line: CLEAN.line }]]));
  for (const key of ["contact.saturn.square.ascendant.19000101", "not a key"]) {
    assert.deepEqual(await R.writeQueuedReading(reader, key), { status: "unknown" }, key);
  }
  assert.equal((await rowsFor(reader.profileId)).length, 2);
  await age(reader.profileId, first, "writing", 4);
  const held = await R.writeQueuedReading(reader, first);
  assert.equal(held.status, "held", "a write still going is looked at again once it could have died");
  if (held.status === "held") assert.ok(Math.abs(held.until.getTime() - (Date.now() + 60_000)) < 5_000);
  assert.equal(asked.length, 1);
});

test("an open of a reading a setup job is still to write answers writing at once and writes nothing", { skip: NO_DB }, async () => {
  const { db, jobsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const reader = await seedReader("held");
  answer(CLEAN);
  // A day out, so no worker on this database takes it while the open looks.
  const [job] = await db.insert(jobsTable).values({
    id: randomUUID(), kind: "timeline.reading", payload: { profileId: reader.profileId, key: SATURN_ON_ASC },
    dedupeKey: R.readingJobKey(reader.profileId, SATURN_ON_ASC), status: "queued", runAt: new Date(Date.now() + 86_400_000),
  }).returning({ id: jobsTable.id });
  try {
    assert.deepEqual(await R.readingsQueued(reader.profileId, [SATURN_ON_ASC, "contact.mars.square.sun.20261024"]), new Set([SATURN_ON_ASC]));
    assert.deepEqual(await R.openReading(reader, SATURN_ON_ASC), { status: "writing", reading: null, line: null });
    assert.equal(asked.length, 0);
    assert.deepEqual(await rowsFor(reader.profileId), []);
  } finally {
    await db.delete(jobsTable).where(eq(jobsTable.id, job.id));
  }
  assert.equal((await R.openReading(reader, SATURN_ON_ASC)).status, "ready", "once no job holds it, the open writes it");
  assert.equal(asked.length, 1);
});

test("an account's new readings a UTC day: the 40th writes, the 41st is refused with Timeline's line and no row, a kept one still opens, and the next day writes again (ADR-327)", { skip: NO_DB }, async () => {
  const reader = await seedReader("daily");
  const keys = cycles(reader).map((c) => c.key);
  assert.ok(keys.length > R.NEW_READINGS_A_DAY, `${keys.length} cycles to open`);
  const noon = new Date("2026-10-05T12:00:00Z");
  const opens = (key: string, now = noon) => R.openReading(reader, key, { now });
  answer(CLEAN);
  for (const key of keys.slice(0, R.NEW_READINGS_A_DAY - 1)) assert.equal((await opens(key)).status, "ready", key);

  // Neither a kept reading nor a key the app cannot show takes one of the day's.
  assert.equal((await opens(keys[0])).status, "ready");
  const DAY_MS = 86_400_000;
  const startOf = (e: SkyEvent) => (e.kind === "contact" ? e.window.start : e.kind === "retrograde" ? e.start : e.eclipse.at).getTime();
  const yearOut = readable(reader, new Date(noon.getTime() + 365 * DAY_MS), new Date(noon.getTime() + 395 * DAY_MS))
    .find((e) => startOf(e) >= noon.getTime() + 365 * DAY_MS);
  assert.ok(yearOut, "a real event on her chart a year out");
  assert.deepEqual(await opens(yearOut.key), { status: "unknown", reading: null, line: null }, "a key a year out");
  assert.equal(asked.length, R.NEW_READINGS_A_DAY - 1);

  assert.equal((await opens(keys[R.NEW_READINGS_A_DAY - 1])).status, "ready", "the 40th");
  assert.equal(asked.length, R.NEW_READINGS_A_DAY);
  const refused = await opens(keys[R.NEW_READINGS_A_DAY]);
  assert.deepEqual(refused, { status: "capped", reading: null, line: R.READINGS_CAP_LINE, retryAfterSeconds: 12 * 3600 }, "the 41st waits for UTC midnight");
  assert.equal(R.READINGS_CAP_LINE, "You've opened today's new readings. You can open more tomorrow.");
  assert.equal(asked.length, R.NEW_READINGS_A_DAY, "it calls no model");
  assert.equal((await rowsFor(reader.profileId)).length, R.NEW_READINGS_A_DAY, "and claims no row");

  const kept = await opens(keys[0]);
  assert.deepEqual([kept.status, kept.reading?.line], ["ready", CLEAN.line], "a kept reading opens on a capped day");
  // Writing a failed one again is a new write, so it waits for tomorrow too, and its row stays as it was.
  await age(reader.profileId, keys[1], "failed", 1);
  assert.equal((await opens(keys[1])).status, "capped");
  assert.equal((await rowsFor(reader.profileId)).find((r) => r.eventKey === keys[1])?.status, "failed");
  assert.equal(asked.length, R.NEW_READINGS_A_DAY);

  assert.equal((await opens(keys[R.NEW_READINGS_A_DAY], new Date("2026-10-06T00:00:00Z"))).status, "ready", "a new UTC day counts again");
  assert.equal(asked.length, R.NEW_READINGS_A_DAY + 1);
});

test("forgetTimeline removes a profile's readings and its reader's Ask thread, and nobody else's", { skip: NO_DB }, async () => {
  const { db, askMessagesTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const gone = await seedReader("forget");
  const kept = await seedReader("kept");
  answer(CLEAN);
  for (const reader of [gone, kept]) {
    await R.openReading(reader, SATURN_ON_ASC);
    await db.insert(askMessagesTable).values([
      { id: randomUUID(), userId: reader.userId, role: "reader", body: { text: "When does this ease?" } },
      { id: randomUUID(), userId: reader.userId, role: "ask", body: { text: "It eases in March.", cards: [], choices: [] } },
    ]);
  }
  await R.forgetTimeline(gone.userId, gone.profileId);
  const thread = async (userId: string) => db.select().from(askMessagesTable).where(eq(askMessagesTable.userId, userId));
  assert.deepEqual([(await rowsFor(gone.profileId)).length, (await thread(gone.userId)).length], [0, 0]);
  assert.deepEqual([(await rowsFor(kept.profileId)).length, (await thread(kept.userId)).length], [1, 2]);
});
