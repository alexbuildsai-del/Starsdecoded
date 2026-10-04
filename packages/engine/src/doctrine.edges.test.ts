/**
 * The doctrine's edges (R16-02, readings 5, 6, 7, 17): the numbers the spec gives, held by name; the order a range is
 * listed in; the exact shape and stability of an event's key; the first and last instant of a day an event is in
 * effect; the empty and the inverted range; and what a chart with no horizon never holds. `doctrine.test.ts` checks the
 * events against the planets' own places day by day; here the cases that file does not reach.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateNatalChart, hasHorizon, type NatalChartData } from "./chartCalculation.js";
import {
  DOCTRINE,
  inEffect,
  readsAs,
  skyEvents,
  type ContactEvent,
  type EclipseEvent,
  type RetrogradeEvent,
  type SkyEvent,
} from "./doctrine.js";
import { TONE_TABLE, dayTone, toneOf, type Tone } from "./tone.js";

interface Fixture {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset: number;
  birthTimeWindowMinutes?: number;
}

function chartOf(path: string): NatalChartData {
  const f = JSON.parse(readFileSync(new URL(`../../../fixtures/${path}.json`, import.meta.url), "utf8")) as Fixture;
  return calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset, f.birthTimeWindowMinutes ?? 0);
}

const MIRA = chartOf("sample-people/mira");
const BLIND = chartOf("charts/marie-curie-unknown");
const TIMED = chartOf("charts/marie-curie");
const DAY = 86_400_000;
const at = (iso: string) => new Date(iso);

const BODIES = ["mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const ASPECTS = ["conjunction", "square", "opposition", "trine"];
const TARGETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "ascendant", "midheaven"];

test("the doctrine is the spec's numbers: six bodies, their orbs and aspects, nine points, three retrogrades, 3° for an eclipse", () => {
  assert.deepEqual([...DOCTRINE.bodies], BODIES);
  assert.deepEqual({ ...DOCTRINE.orbs }, { mars: 1, jupiter: 2, saturn: 2, uranus: 1.5, neptune: 1.5, pluto: 1.5 });
  assert.deepEqual([...DOCTRINE.aspects.mars], ["conjunction", "square", "opposition"], "Mars makes no trine");
  for (const body of BODIES.filter((b) => b !== "mars")) assert.deepEqual([...DOCTRINE.aspects[body as "jupiter"]], ASPECTS, body);
  assert.deepEqual({ ...DOCTRINE.angles }, { conjunction: 0, square: 90, opposition: 180, trine: 120 });
  assert.deepEqual([...DOCTRINE.targets], TARGETS);
  assert.deepEqual([...DOCTRINE.horizonTargets].sort(), ["ascendant", "midheaven", "moon"]);
  assert.deepEqual([...DOCTRINE.retrogrades], ["mercury", "venus", "mars"]);
  assert.equal(DOCTRINE.eclipseNear, 3);
  assert.ok(!JSON.stringify(DOCTRINE).match(/chiron|sextile/i), "no Chiron, no sextile");
  assert.ok(DOCTRINE.retrogradeMargin >= 81, "wider than Mars's longest retrograde, so a station is always inside the search");
});

test("every body has a tone for every aspect, Mars's unused trine included, and a tone is one of three words", () => {
  const tones = new Set<string>(["easy", "mixed", "intense"]);
  assert.deepEqual(Object.keys(TONE_TABLE.contact), BODIES);
  for (const body of BODIES) {
    assert.deepEqual(Object.keys(TONE_TABLE.contact[body as "mars"]).sort(), [...ASPECTS].sort(), body);
    for (const tone of Object.values(TONE_TABLE.contact[body as "mars"])) assert.ok(tones.has(tone), `${body}: ${tone}`);
  }
  assert.ok(tones.has(TONE_TABLE.retrograde) && tones.has(TONE_TABLE.closeEclipse));
  assert.equal(TONE_TABLE.contact.mars.trine, "easy", "every trine is easy");
});

test("a range lists contacts first, then retrogrades, then eclipses, each in time order", () => {
  for (const chart of [MIRA, BLIND]) {
    const events = skyEvents(chart, at("2026-01-01T00:00:00Z"), at("2028-12-31T23:59:59Z"));
    const rank = { contact: 0, retrograde: 1, eclipse: 2 } as const;
    events.forEach((event, i) => {
      if (i > 0) assert.ok(rank[events[i - 1].kind] <= rank[event.kind], `${event.key} after ${events[i - 1].key}`);
    });
    assert.ok(new Set(events.map((e) => e.kind)).size === 3, "three years hold all three kinds");
    const contacts = events.filter((e): e is ContactEvent => e.kind === "contact");
    contacts.forEach((c, i) => {
      if (i === 0) return;
      const before = contacts[i - 1];
      const a = before.window.start.getTime();
      const b = c.window.start.getTime();
      assert.ok(a <= b, `${c.key} opens before ${before.key}`);
      if (a === b) assert.ok(BODIES.indexOf(before.body) <= BODIES.indexOf(c.body), "a tie goes by body");
    });
    const retros = events.filter((e): e is RetrogradeEvent => e.kind === "retrograde");
    retros.forEach((r, i) => i > 0 && assert.ok(retros[i - 1].start <= r.start, r.key));
    const eclipses = events.filter((e): e is EclipseEvent => e.kind === "eclipse");
    eclipses.forEach((e, i) => i > 0 && assert.ok(eclipses[i - 1].eclipse.at <= e.eclipse.at, e.key));
  }
});

const KEY: Record<SkyEvent["kind"], RegExp> = {
  contact: new RegExp(`^contact\\.(${BODIES.join("|")})\\.(${ASPECTS.join("|")})\\.(${TARGETS.join("|")})\\.\\d{8}$`),
  retrograde: /^retrograde\.(mercury|venus|mars)\.-\.-\.\d{8}$/,
  eclipse: /^eclipse\.(sun|moon)\.-\.-\.\d{8}$/,
};

test("a key is {kind}.{body}.{aspect or -}.{point or -}.{yyyymmdd}, URL-safe, at most 80 characters, and a real UTC day", () => {
  for (const chart of [MIRA, BLIND, TIMED]) {
    for (const event of skyEvents(chart, at("2026-01-01T00:00:00Z"), at("2028-12-31T23:59:59Z"))) {
      assert.match(event.key, KEY[event.kind], event.key);
      assert.ok(event.key.length <= 80, event.key);
      assert.equal(encodeURIComponent(event.key), event.key, `${event.key} needs no escaping in a URL`);
      const date = event.key.slice(-8);
      const day = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8)));
      assert.equal(day.toISOString().slice(0, 10).replace(/-/g, ""), date, `${event.key}: a calendar day`);
      if (event.kind === "eclipse") {
        assert.equal(event.key.split(".")[1], event.eclipse.kind === "solar" ? "sun" : "moon", "the body slot names the body eclipsed");
      }
    }
  }
});

test("a key is unique across eight years of one chart, so no two events share a reading or a row", () => {
  const events = skyEvents(MIRA, at("2026-01-01T00:00:00Z"), at("2033-12-31T23:59:59Z"));
  const keys = events.map((e) => e.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(events.filter((e) => e.kind === "contact").length > 10);
});

test("an event keeps its key, window and passes whatever range finds it: a year, a month, a single day, an instant", () => {
  const wide = skyEvents(MIRA, at("2026-01-01T00:00:00Z"), at("2027-12-31T23:59:59Z"));
  const span = (e: SkyEvent): number[] =>
    e.kind === "contact" ? [e.window.start, e.window.end, ...e.window.exact].map((d) => d.getTime())
      : e.kind === "retrograde" ? [e.start.getTime(), e.end.getTime()] : [e.eclipse.at.getTime()];
  const narrow = [
    [at("2026-10-05T00:00:00Z"), at("2026-10-05T23:59:59Z")],
    [at("2026-10-05T12:00:00Z"), at("2026-10-05T12:00:00Z")],
    [at("2026-11-01T00:00:00Z"), at("2026-11-30T23:59:59Z")],
    [at("2027-06-15T00:00:00Z"), at("2027-06-15T00:00:00Z")],
  ] as const;
  for (const [from, to] of narrow) {
    const events = skyEvents(MIRA, from, to);
    assert.ok(events.length > 0, `${from.toISOString()} holds something`);
    for (const event of events) {
      const twin = wide.find((e) => e.key === event.key);
      assert.ok(twin, `${event.key} from ${from.toISOString()} is in the wide range`);
      assert.deepEqual(span(twin), span(event), `${event.key}: same window and passes`);
      assert.equal(twin.tone, event.tone);
    }
  }
});

test("an inverted range holds nothing; a range of one instant holds what is in effect at it", () => {
  assert.deepEqual(skyEvents(MIRA, at("2026-12-01T00:00:00Z"), at("2026-11-01T00:00:00Z")), []);
  assert.deepEqual(skyEvents(MIRA, at("2028-01-01T00:00:00Z"), at("2026-01-01T00:00:00Z")), []);
  const instant = at("2026-10-05T12:00:00Z");
  const events = skyEvents(MIRA, instant, instant);
  const contacts = events.filter((e): e is ContactEvent => e.kind === "contact");
  assert.ok(contacts.some((c) => c.body === "saturn" && c.target === "ascendant"), "Saturn is on her Ascendant that Monday");
  for (const c of contacts) assert.ok(c.window.start <= instant && c.window.end >= instant, `${c.key} is in orb at the instant`);
});

const contactAt = (start: string, end: string): ContactEvent => ({
  key: "contact.saturn.square.sun.20261001", kind: "contact", body: "saturn", aspect: "square", target: "sun", orb: 2,
  window: { start: at(start), end: at(end), exact: [] }, house: null, tone: "intense",
});
const retroAt = (start: string, end: string): RetrogradeEvent => ({
  key: "retrograde.mercury.-.-.20261001", kind: "retrograde", body: "mercury", start: at(start), end: at(end), houses: [], tone: "mixed",
});
const eclipseAt = (when: string): EclipseEvent => ({
  key: "eclipse.sun.-.-.20261001", kind: "eclipse", eclipse: { kind: "solar", at: at(when), lon: 10 }, house: null, near: null, tone: null,
});

test("a day is its 24 hours from the start given: an eclipse in its first minute is in, in the next day's first is out", () => {
  const day = at("2026-10-05T00:00:00Z");
  assert.equal(inEffect([eclipseAt("2026-10-05T00:00:00Z")], day).length, 1, "the first instant");
  assert.equal(inEffect([eclipseAt("2026-10-05T23:59:59.999Z")], day).length, 1, "the last millisecond");
  assert.equal(inEffect([eclipseAt("2026-10-06T00:00:00Z")], day).length, 0, "the next day's first instant");
  assert.equal(inEffect([eclipseAt("2026-10-04T23:59:59.999Z")], day).length, 0, "the day before's last");
});

test("a retrograde is in effect from the day of its station to the day of the station back, both ends inclusive", () => {
  const retro = retroAt("2026-10-09T08:00:00Z", "2026-11-19T20:00:00Z");
  const on = (iso: string) => inEffect([retro], at(iso)).length;
  assert.equal(on("2026-10-08T00:00:00Z"), 0, "the day before");
  assert.equal(on("2026-10-09T00:00:00Z"), 1, "the day it turns, though it turns at 08:00");
  assert.equal(on("2026-11-19T00:00:00Z"), 1, "the day it turns back, though it turns at 20:00");
  assert.equal(on("2026-11-20T00:00:00Z"), 0, "the day after");
  assert.equal(inEffect([retroAt("2026-10-06T00:00:00Z", "2026-10-09T00:00:00Z")], at("2026-10-06T00:00:00Z")).length, 1, "a station at the day's first instant");
  assert.equal(inEffect([retroAt("2026-10-04T00:00:00Z", "2026-10-05T00:00:00Z")], at("2026-10-05T00:00:00Z")).length, 1, "ending at the day's first instant");
  assert.equal(inEffect([retroAt("2026-10-06T00:00:00Z", "2026-10-09T00:00:00Z")], at("2026-10-05T00:00:00Z")).length, 0, "starting at the next day's first instant");
});

test("a contact whose window touches a day at all, even by its last instant, is in effect on it; one that misses it by a millisecond is not", () => {
  const c = contactAt("2026-10-05T12:00:00Z", "2026-10-07T12:00:00Z");
  const on = (iso: string) => inEffect([c], at(iso)).length;
  assert.equal(on("2026-10-04T00:00:00Z"), 0);
  assert.equal(on("2026-10-05T00:00:00Z"), 1, "opens at noon, in effect from midnight's day");
  assert.equal(on("2026-10-06T00:00:00Z"), 1, "a whole day inside");
  assert.equal(on("2026-10-07T00:00:00Z"), 1, "closes at noon");
  assert.equal(on("2026-10-08T00:00:00Z"), 0);
  const edge = contactAt("2026-10-06T00:00:00Z", "2026-10-08T00:00:00Z");
  assert.equal(inEffect([edge], at("2026-10-05T00:00:00Z")).length, 0, "opens at the next day's first instant");
  assert.equal(inEffect([edge], at("2026-10-07T00:00:00Z")).length, 1);
  assert.equal(inEffect([edge], at("2026-10-08T00:00:00Z")).length, 1, "closes at this day's first instant, still in orb at it");
  assert.equal(inEffect([edge], at("2026-10-09T00:00:00Z")).length, 0);
});

test("inEffect keeps the order it was given, changes nothing, and works on any midnight, a reader's local one included", () => {
  const events = [eclipseAt("2026-10-05T12:00:00Z"), contactAt("2026-10-01T00:00:00Z", "2026-10-20T00:00:00Z"), retroAt("2026-10-01T00:00:00Z", "2026-10-30T00:00:00Z")];
  const before = JSON.stringify(events);
  const day = at("2026-10-05T00:00:00Z");
  assert.deepEqual(inEffect(events, day).map((e) => e.kind), ["eclipse", "contact", "retrograde"]);
  assert.equal(JSON.stringify(events), before);
  // Lisbon's midnight in October is 23:00 UTC the evening before: that day holds the eclipse at 12:00 UTC on the 5th.
  assert.equal(inEffect([eclipseAt("2026-10-05T12:00:00Z")], at("2026-10-04T23:00:00Z")).length, 1);
  assert.equal(inEffect([eclipseAt("2026-10-05T12:00:00Z")], at("2026-10-05T23:00:00Z")).length, 0);
  assert.deepEqual(inEffect([], day), []);
});

test("readsAs: every contact; a retrograde only when it crosses a known house; an eclipse only near a natal point", () => {
  assert.equal(readsAs(contactAt("2026-10-01T00:00:00Z", "2026-10-02T00:00:00Z")), true);
  assert.equal(readsAs({ ...retroAt("2026-10-01T00:00:00Z", "2026-10-02T00:00:00Z"), houses: [4] }), true);
  assert.equal(readsAs({ ...retroAt("2026-10-01T00:00:00Z", "2026-10-02T00:00:00Z"), houses: [] }), false);
  assert.equal(readsAs(eclipseAt("2026-10-05T12:00:00Z")), false);
  assert.equal(readsAs({ ...eclipseAt("2026-10-05T12:00:00Z"), near: { target: "sun", orb: 0 }, tone: "intense" }), true, "an eclipse exactly on a point");
});

test("a chart with a horizon reads every retrograde and each contact has a house; one without reads only contacts and eclipses near a point", () => {
  const range = [at("2026-01-01T00:00:00Z"), at("2027-12-31T23:59:59Z")] as const;
  const timed = skyEvents(TIMED, ...range);
  const blind = skyEvents(BLIND, ...range);
  assert.equal(hasHorizon(TIMED), true);
  assert.equal(hasHorizon(BLIND), false);
  for (const e of timed) {
    if (e.kind === "retrograde") assert.ok(e.houses.length >= 1 && readsAs(e), e.key);
    if (e.kind === "contact") assert.ok(e.house !== null && e.house >= 1 && e.house <= 12, e.key);
    if (e.kind === "eclipse") assert.ok(e.house !== null && e.house >= 1 && e.house <= 12, e.key);
  }
  for (const e of blind) {
    if (e.kind === "retrograde") assert.ok(e.houses.length === 0 && !readsAs(e), e.key);
    if (e.kind === "contact") assert.equal(e.house, null, e.key);
    if (e.kind === "eclipse") assert.equal(e.house, null, e.key);
  }
  // The same sky, so the retrogrades are the same events in both: only the houses differ.
  assert.deepEqual(blind.filter((e) => e.kind === "retrograde").map((e) => e.key), timed.filter((e) => e.kind === "retrograde").map((e) => e.key));
  assert.deepEqual(blind.filter((e) => e.kind === "eclipse").map((e) => e.key), timed.filter((e) => e.kind === "eclipse").map((e) => e.key));
});

test("a retrograde crossing a sign boundary names both houses, in the order it moves back through them, each once", () => {
  const events = skyEvents(MIRA, at("2026-01-01T00:00:00Z"), at("2030-12-31T23:59:59Z"));
  const crossing = events.filter((e): e is RetrogradeEvent => e.kind === "retrograde" && e.houses.length > 1);
  assert.ok(crossing.length > 0, "five years hold a retrograde that backs into the sign before");
  for (const r of crossing) {
    assert.equal(new Set(r.houses).size, r.houses.length, `${r.key}: no house twice`);
    r.houses.slice(1).forEach((h, i) => assert.equal(h, r.houses[i] === 1 ? 12 : r.houses[i] - 1, `${r.key}: backs into the house before`));
  }
});

test("dayTone counts only contacts, leaves its input as it was, and a three-way tie goes to intense", () => {
  const c = (tone: Tone) => ({ kind: "contact" as const, tone });
  const mixed = [c("easy"), c("mixed"), c("intense")];
  const before = JSON.stringify(mixed);
  assert.equal(dayTone(mixed), "intense");
  assert.equal(JSON.stringify(mixed), before);
  assert.equal(dayTone([c("easy"), c("easy"), c("mixed"), c("mixed"), c("intense")]), "mixed", "easy and mixed tie: the more intense of the two");
  assert.equal(dayTone([c("easy"), c("easy"), c("easy"), c("intense"), c("intense")]), "easy", "the most wins, not the strongest");
  assert.equal(dayTone([{ kind: "eclipse", tone: "intense" }, { kind: "retrograde", tone: "mixed" }, c("easy")]), "easy");
  assert.equal(dayTone([{ kind: "eclipse", tone: null }]), null);
});

test("toneOf on a real range matches the table for every event, and an eclipse far from the chart has none", () => {
  const events = skyEvents(TIMED, at("2026-01-01T00:00:00Z"), at("2028-12-31T23:59:59Z"));
  for (const e of events) {
    if (e.kind === "contact") assert.equal(e.tone, TONE_TABLE.contact[e.body][e.aspect], e.key);
    if (e.kind === "retrograde") assert.equal(e.tone, TONE_TABLE.retrograde, e.key);
    if (e.kind === "eclipse") assert.equal(e.tone, e.near ? TONE_TABLE.closeEclipse : null, e.key);
    assert.equal(toneOf(e), e.tone, e.key);
  }
  assert.ok(events.some((e) => e.kind === "eclipse" && e.near === null && e.tone === null), "some eclipse touches no point");
});
