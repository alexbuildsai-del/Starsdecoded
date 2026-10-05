/**
 * The dry lab's Timeline and Ask rows at their edges (R16-26; ADR-76, 86, 202, 210; R-4.4): the events a row renders,
 * their window and order, that a row reads the same on any day and makes no model call, and that one prompt that cannot
 * be rendered is one error row beside the others. `labDry.test.ts` has the injection pass and the rows' shape.
 */
import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cannedNatalReplies, installFakeModel } from "./testModel.js";
import type { InjectionFixture, InjectionRenderers } from "./labDry.js";

const { DRY_FROM, dryAsk, dryEvents, dryInjection, dryTimeline, readerZone } = await import("./labDry.js");
const { previewSectionPrompt } = await import("./aiInterpretation.js");
const { previewPairSectionPrompt } = await import("./pairInterpretation.js");
const { calculateNatalChart, lifeCycles, natalLongitudes, readsAs, skyEvents } = await import("./chartCalculation.js");
const { RANGE_DAYS, dayStart } = await import("./timeline.js");
const { readingPrompt } = await import("../prompts/timeline/index.js");
const { ASK_KEYS, askAnswerPrompt, askPlanPrompt } = await import("../prompts/ask/index.js");

const CHARTS = new URL("../../../fixtures/charts/", import.meta.url);
const fixtureOf = (name: string) => ({ fixture: name, ...JSON.parse(readFileSync(new URL(`${name}.json`, CHARTS), "utf8")) }) as InjectionFixture;
const chartOf = (f: InjectionFixture) => calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset, f.birthTimeWindowMinutes ?? 0);

const curie = fixtureOf("marie-curie");
const CURIE = { chart: chartOf(curie), zone: readerZone(curie) };

const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

test("dryEvents: five readable events at most, then the three cycles nearest the day, eight in all on a chart with that much", () => {
  const events = dryEvents(CURIE.chart, CURIE.zone);
  assert.equal(events.length, 8);
  const sky = events.slice(0, 5);
  assert.ok(sky.every((e) => "kind" in e && readsAs(e)), "every one of the five is an event that gets a reading");
  assert.ok(events.slice(5).every((e) => !("kind" in e)), "the rest are life cycles");
  assert.equal(new Set(events.map((e) => e.key)).size, 8);
});

test("dryEvents: the events are the engine's first five that read in the six months from the day, in its own order", () => {
  const start = dayStart(DRY_FROM, CURIE.zone);
  const end = dayStart(addDays(DRY_FROM, RANGE_DAYS["six-months"]), CURIE.zone);
  const expected = skyEvents(CURIE.chart, start, new Date(end.getTime() - 1)).filter(readsAs).slice(0, 5).map((e) => e.key);
  assert.deepEqual(dryEvents(CURIE.chart, CURIE.zone).slice(0, 5).map((e) => e.key), expected);
  // A later start reads a later six months, so its first events are not the same ones.
  const later = dryEvents(CURIE.chart, CURIE.zone, "2027-04-05");
  const laterStart = dayStart("2027-04-05", CURIE.zone);
  const laterEnd = dayStart(addDays("2027-04-05", RANGE_DAYS["six-months"]), CURIE.zone);
  assert.deepEqual(later.slice(0, 5).map((e) => e.key), skyEvents(CURIE.chart, laterStart, new Date(laterEnd.getTime() - 1)).filter(readsAs).slice(0, 5).map((e) => e.key));
  assert.notDeepEqual(later.slice(0, 5).map((e) => e.key), expected);
});

test("dryEvents: the cycles come nearest first, a cycle under way counts as no distance, and the day moves which are nearest", () => {
  const cycles = lifeCycles(natalLongitudes(CURIE.chart), new Date(CURIE.chart.datetimeUtc));
  const distance = (from: string) => {
    const at = dayStart(from, CURIE.zone).getTime();
    return (key: string) => {
      const c = cycles.find((x) => x.key === key)!;
      return Math.max(0, c.window.start.getTime() - at, at - c.window.end.getTime());
    };
  };
  for (const from of [DRY_FROM, "1900-01-01", "2030-06-01"]) {
    const took = dryEvents(CURIE.chart, CURIE.zone, from).filter((e) => !("kind" in e)).map((e) => e.key);
    const away = distance(from);
    assert.equal(took.length, 3, from);
    assert.deepEqual([...took].sort((a, b) => away(a) - away(b)).map(away), took.map(away), `${from}: nearest first`);
    const left = cycles.filter((c) => !took.includes(c.key));
    assert.ok(left.every((c) => away(c.key) >= Math.max(...took.map(away))), `${from}: none left out is nearer than one taken`);
  }
});

test("dryEvents reads the same on any day it is run: it keeps no clock of its own", () => {
  const keys = () => dryEvents(CURIE.chart, CURIE.zone).map((e) => e.key);
  const before = keys();
  mock.timers.enable({ apis: ["Date"], now: new Date("2031-02-03T04:05:06Z") });
  try {
    assert.equal(new Date().getUTCFullYear(), 2031, "the clock the test moved");
    assert.deepEqual(keys(), before);
  } finally {
    mock.timers.reset();
  }
  assert.deepEqual(keys(), before);
});

test("dryTimeline takes the day it is given: its rows are that day's events and cycles, each counted and strict", async () => {
  const rows = await dryTimeline({ fixture: "marie-curie", name: curie.name, ...CURIE, report: null }, "2027-04-05");
  assert.deepEqual(rows.map((r) => r.section), dryEvents(CURIE.chart, CURIE.zone, "2027-04-05").map((e) => e.key));
  assert.ok(rows.every((r) => r.schemaOk && r.error === undefined && r.inputTokens > 0));
});

test("neither family makes a model call: the rows are prompts counted, not replies bought", async () => {
  const fake = installFakeModel({});
  try {
    const reader = { fixture: "marie-curie", name: curie.name, ...CURIE, report: null };
    await dryTimeline(reader);
    await dryAsk(reader);
    await dryInjection([curie], { natal: { subjectName: "Marie Curie", foundation: cannedNatalReplies({ drawn: true }).natal_foundation }, pairs: [] });
    assert.deepEqual(fake.calls, []);
  } finally {
    fake.restore();
  }
});

test("one reading or Ask prompt that cannot be rendered is one error row beside the rows that can", async () => {
  const hostile = [fixtureOf("inject-delimiter"), fixtureOf("inject-instruction")];
  const base = { natal: { subjectName: "Marie Curie", foundation: cannedNatalReplies({ drawn: true }).natal_foundation }, pairs: [] };
  const natalOnly = { natal: previewSectionPrompt, pair: (key: string, input: Parameters<typeof previewPairSectionPrompt>[1]) => previewPairSectionPrompt(key, input) };
  const events = dryEvents(chartOf(hostile[0]), readerZone(hostile[0]));
  const brokenReading = events[1].key;
  const renderers: InjectionRenderers = {
    ...natalOnly,
    timeline: async (input) => {
      if (input.event.key === brokenReading) throw new Error("this reading would not render");
      return readingPrompt(input);
    },
    ask: async (key, input) => {
      if (key === ASK_KEYS.answer && input.cards.some((c) => c.kind === "cycle")) throw new Error("this answer would not render");
      return key === ASK_KEYS.plan ? askPlanPrompt(input) : askAnswerPrompt(input);
    },
  };
  const rows = await dryInjection(hostile, base, renderers);
  const readings = rows.filter((r) => r.set === "timeline" && r.fixture === hostile[0].fixture);
  assert.equal(readings.length, events.length);
  assert.deepEqual(readings.filter((r) => r.error).map((r) => [r.section, r.error, r.blocks, r.leak]), [[brokenReading, "this reading would not render", 0, null]]);
  assert.ok(readings.filter((r) => !r.error).every((r) => r.leak === null && r.blocks > 0));
  const asked = rows.filter((r) => r.set === "ask");
  assert.equal(asked.length, 12);
  assert.deepEqual(asked.filter((r) => r.error).map((r) => r.section), ["cycle answer", "cycle answer"], "one per reader");
  assert.ok(asked.filter((r) => !r.error).every((r) => r.leak === null));
});

test("readerZone: a name Intl cannot read falls through to the place, and a place on the open sea to UTC", () => {
  assert.equal(readerZone({ timezone: "Not/AZone", latitude: 0, longitude: -160 }), "UTC");
  assert.equal(readerZone({ timezone: "", latitude: 48.8566, longitude: 2.3522 }), "Europe/Paris");
  assert.equal(readerZone({ latitude: 38.7223, longitude: -9.1393 }), "Europe/Lisbon");
});
