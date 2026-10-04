/**
 * Timeline's plain words at their edges (R16-04, reading 9, ADR-256, 257): no line is ever empty or shared between two
 * kinds of thing, whatever the body, point, aspect or house; a house the chart does not give falls back to the plain
 * line, never to "undefined"; the facts line copes with the houses a bad input could hold; and the week's sentence is
 * counted to the millisecond at both ends of the week, in every combination of what starts, peaks and eases.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DOCTRINE, type Aspect, type ContactEvent, type EclipseEvent, type NatalTarget, type RetrogradeEvent } from "./doctrine.js";
import { CYCLE_WORDS, factsOf, headlineOf, weekSentence } from "./plainWords.js";

type Mover = ContactEvent["body"];

const MOVERS: readonly Mover[] = DOCTRINE.bodies;
const TARGETS: readonly NatalTarget[] = DOCTRINE.targets;
const HOUSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const RETRO = ["mercury", "venus", "mars"] as const;
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const OPEN = day("2026-10-05");
const at = (ms: number) => new Date(OPEN.getTime() + ms);
const DAY = 86_400_000;
const WEEK = 7 * DAY;

const contact = (
  body: Mover,
  aspect: Aspect,
  target: NatalTarget,
  { house = null, start = day("2026-01-01"), end = day("2027-01-01"), exact = [] }: { house?: number | null; start?: Date; end?: Date; exact?: Date[] } = {},
): ContactEvent => ({ key: "k", kind: "contact", body, aspect, target, orb: 2, window: { start, end, exact }, house, tone: "mixed" });
const retro = (body: RetrogradeEvent["body"], houses: number[], start: Date, end: Date): RetrogradeEvent => ({ key: "k", kind: "retrograde", body, start, end, houses, tone: "mixed" });
const eclipse = (kind: "solar" | "lunar", house: number | null, when: Date, near: EclipseEvent["near"] = null): EclipseEvent => ({
  key: "k", kind: "eclipse", eclipse: { kind, at: when, lon: 140 }, house, near, tone: near ? "intense" : null,
});

const JARGON = /\b(mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|sun|moon|conjunction|square|opposition|trine|sextile|retrograde|eclipse|transit|natal|ascendant|midheaven|orb|degree|degrees|aspect)\b/i;

test("no headline for any body, point or house is empty, repeats another kind's, or uses the chart's jargon", () => {
  const lines = new Map<string, string>();
  const note = (line: string, from: string) => {
    assert.ok(line.trim().length > 0, `${from}: empty`);
    assert.doesNotMatch(line, /undefined|null|NaN|\[object/, from);
    assert.doesNotMatch(line, JARGON, `${from}: "${line}" names the astronomy, which waits in the facts line`);
    const other = lines.get(line);
    assert.equal(other, undefined, `${from} and ${other} read the same: "${line}"`);
    lines.set(line, from);
  };
  for (const body of MOVERS) for (const target of TARGETS) note(headlineOf(contact(body, "conjunction", target)), `${body} on ${target}`);
  note(headlineOf(contact("uranus", "trine", "saturn")), "uranus trine saturn");
  note(headlineOf(contact("saturn", "square", "midheaven")), "saturn square midheaven");
  for (const body of RETRO) {
    for (const house of HOUSES) note(headlineOf(retro(body, [house], OPEN, at(WEEK))), `${body} retrograde in ${house}`);
    note(headlineOf(retro(body, [], OPEN, at(WEEK))), `${body} retrograde, no house`);
  }
  for (const kind of ["solar", "lunar"] as const) {
    for (const house of HOUSES) note(headlineOf(eclipse(kind, house, OPEN)), `${kind} eclipse in ${house}`);
    note(headlineOf(eclipse(kind, null, OPEN)), `${kind} eclipse, no house`);
  }
  assert.equal(lines.size, 54 + 2 + 3 * 13 + 2 * 13);
});

test("a house the chart cannot give is the plain line, not an error: 0, 13, a fraction, NaN, a negative, null", () => {
  for (const body of RETRO) {
    const plain = headlineOf(retro(body, [], OPEN, at(WEEK)));
    for (const bad of [0, 13, 1.5, Number.NaN, -3, 100]) assert.equal(headlineOf(retro(body, [bad], OPEN, at(WEEK))), plain, `${body} ${bad}`);
    assert.equal(headlineOf(retro(body, [0, 4], OPEN, at(WEEK))), plain, "a retrograde is named by its first house, and an unknown first house names none");
  }
  for (const kind of ["solar", "lunar"] as const) {
    const plain = headlineOf(eclipse(kind, null, OPEN));
    for (const bad of [0, 13, 2.5, Number.NaN, -1]) assert.equal(headlineOf(eclipse(kind, bad, OPEN)), plain, `${kind} ${bad}`);
  }
});

test("the facts line leaves out any house that is not 1 to 12 and never prints a bad one", () => {
  for (const bad of [0, 13, 1.5, Number.NaN, -2]) {
    assert.deepEqual(factsOf(contact("saturn", "square", "sun", { house: bad })), { sky: "Saturn square to your Sun", house: null }, String(bad));
    assert.equal(factsOf(retro("mars", [bad], OPEN, at(WEEK))).house, null, String(bad));
    assert.equal(factsOf(eclipse("solar", bad, OPEN)).house, null, String(bad));
  }
  assert.equal(factsOf(retro("venus", [0, 7, 13, 6], OPEN, at(WEEK))).house, "7th and 6th houses", "the good ones stay, in order");
  assert.equal(factsOf(retro("mercury", [], OPEN, at(WEEK))).house, null);
});

test("every house has its ordinal: 1st 2nd 3rd, then th up to 12th, with the teens right", () => {
  const words = HOUSES.map((house) => factsOf(contact("pluto", "square", "sun", { house })).house);
  assert.deepEqual(words, ["1st house", "2nd house", "3rd house", "4th house", "5th house", "6th house", "7th house", "8th house", "9th house", "10th house", "11th house", "12th house"]);
  assert.equal(factsOf(retro("mercury", [12, 11, 10], OPEN, at(WEEK))).house, "12th, 11th and 10th houses");
});

test("the facts line names every body, aspect and point once, in the order sky-then-house, with the eclipse's near point only when there is one", () => {
  const aspects: [Aspect, string][] = [["conjunction", "on"], ["square", "square to"], ["opposition", "opposite"], ["trine", "trine to"]];
  const names: Record<string, string> = { sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", ascendant: "Ascendant", midheaven: "Midheaven" };
  for (const body of MOVERS) {
    for (const [aspect, word] of aspects) {
      for (const target of TARGETS) {
        const { sky } = factsOf(contact(body, aspect, target, { house: 5 }));
        assert.equal(sky, `${body.charAt(0).toUpperCase()}${body.slice(1)} ${word} your ${names[target]}`);
      }
    }
  }
  assert.equal(factsOf(eclipse("solar", 3, OPEN, { target: "midheaven", orb: 2.5 })).sky, "Solar eclipse near your Midheaven");
  assert.equal(factsOf(eclipse("lunar", 3, OPEN)).sky, "Lunar eclipse");
  for (const body of RETRO) assert.equal(factsOf(retro(body, [1], OPEN, at(WEEK))).sky, `${body.charAt(0).toUpperCase()}${body.slice(1)} retrograde`);
});

test("the week's sentence says one thing or many, in words to twelve and numerals after, and always ends 'this week'", () => {
  const nearby = (n: number) => Array.from({ length: n }, () => contact("mars", "square", "sun", { start: at(-30 * DAY), end: at(2 * DAY) }));
  const words = ["", "One thing eases", "Two things ease", "Three things ease", "Four things ease", "Five things ease", "Six things ease", "Seven things ease", "Eight things ease", "Nine things ease", "Ten things ease", "Eleven things ease", "Twelve things ease"];
  for (let n = 1; n <= 12; n++) assert.equal(weekSentence(nearby(n), OPEN), `${words[n]} and nothing new starts this week`, String(n));
  assert.equal(weekSentence(nearby(13), OPEN), "13 things ease and nothing new starts this week");
  assert.equal(weekSentence(nearby(40), OPEN), "40 things ease and nothing new starts this week");
});

test("every mix of what starts, peaks and eases reads as one sentence with 'and' before the last part", () => {
  const starts = contact("jupiter", "trine", "sun", { start: at(DAY), end: at(60 * DAY) });
  const peaks = contact("jupiter", "trine", "moon", { start: at(-20 * DAY), end: at(60 * DAY), exact: [at(2 * DAY)] });
  const eases = contact("jupiter", "trine", "venus", { start: at(-20 * DAY), end: at(3 * DAY) });
  const cases: [string, ReturnType<typeof contact>[], string][] = [
    ["starts", [starts], "One new thing starts this week"],
    ["peaks", [peaks], "One thing peaks and nothing new starts this week"],
    ["eases", [eases], "One thing eases and nothing new starts this week"],
    ["peaks and starts", [peaks, starts], "One thing peaks and one new thing starts this week"],
    ["eases and starts", [eases, starts], "One thing eases and one new thing starts this week"],
    ["eases and peaks", [eases, peaks], "One thing eases, one peaks and nothing new starts this week"],
    ["all three", [eases, peaks, starts], "One thing eases, one peaks and one new thing starts this week"],
    ["two of each", [eases, eases, peaks, peaks, starts, starts], "Two things ease, two peak and two new things start this week"],
  ];
  for (const [what, events, sentence] of cases) assert.equal(weekSentence(events, OPEN), sentence, what);
});

test("a contact is counted to the millisecond at the week's two ends: the week is [first instant, next week's first)", () => {
  const sentence = (e: ContactEvent) => weekSentence([e], OPEN);
  const old = at(-20 * DAY);
  const far = at(60 * DAY);
  // Eases: the window's end in the week.
  assert.equal(sentence(contact("saturn", "square", "sun", { start: old, end: at(-1) })), "A quiet week for your chart", "ended the millisecond before");
  assert.equal(sentence(contact("saturn", "square", "sun", { start: old, end: at(0) })), "One thing eases and nothing new starts this week", "ends at the first instant");
  assert.equal(sentence(contact("saturn", "square", "sun", { start: old, end: at(WEEK - 1) })), "One thing eases and nothing new starts this week", "ends in the last millisecond");
  assert.equal(sentence(contact("saturn", "square", "sun", { start: old, end: at(WEEK) })), "Nothing new starts this week", "ends at next week's first instant: still going all week");
  // Starts: the window's start in the week.
  assert.equal(sentence(contact("saturn", "square", "sun", { start: at(0), end: far })), "One new thing starts this week");
  assert.equal(sentence(contact("saturn", "square", "sun", { start: at(WEEK - 1), end: far })), "One new thing starts this week");
  assert.equal(sentence(contact("saturn", "square", "sun", { start: at(WEEK), end: far })), "A quiet week for your chart", "starts at next week's first instant");
  assert.equal(sentence(contact("saturn", "square", "sun", { start: at(-1), end: far })), "Nothing new starts this week", "started the millisecond before: under way, not new");
  // Peaks: an exact pass in the week.
  assert.equal(sentence(contact("saturn", "square", "sun", { start: old, end: far, exact: [at(0)] })), "One thing peaks and nothing new starts this week");
  assert.equal(sentence(contact("saturn", "square", "sun", { start: old, end: far, exact: [at(WEEK - 1)] })), "One thing peaks and nothing new starts this week");
  assert.equal(sentence(contact("saturn", "square", "sun", { start: old, end: far, exact: [at(-1)] })), "Nothing new starts this week");
  assert.equal(sentence(contact("saturn", "square", "sun", { start: old, end: far, exact: [at(WEEK)] })), "Nothing new starts this week");
});

test("a contact with three exact passes in the week peaks once, and a window that opens and closes inside it starts and eases", () => {
  const triple = contact("saturn", "conjunction", "ascendant", { start: at(-30 * DAY), end: at(40 * DAY), exact: [at(DAY), at(3 * DAY), at(5 * DAY)] });
  assert.equal(weekSentence([triple], OPEN), "One thing peaks and nothing new starts this week");
  const brief = contact("mars", "square", "sun", { start: at(DAY), end: at(4 * DAY), exact: [at(2 * DAY)] });
  assert.equal(weekSentence([brief], OPEN), "One thing eases, one peaks and one new thing starts this week");
});

test("a retrograde starts and eases but never peaks, and an eclipse only peaks", () => {
  assert.equal(weekSentence([retro("mercury", [3], at(2 * DAY), at(23 * DAY))], OPEN), "One new thing starts this week");
  assert.equal(weekSentence([retro("mercury", [3], at(-21 * DAY), at(2 * DAY))], OPEN), "One thing eases and nothing new starts this week");
  assert.equal(weekSentence([retro("mercury", [3], at(-10 * DAY), at(10 * DAY))], OPEN), "Nothing new starts this week", "under way all week");
  assert.equal(weekSentence([retro("venus", [], at(2 * DAY), at(5 * DAY))], OPEN), "One thing eases and one new thing starts this week");
  assert.equal(weekSentence([eclipse("solar", 3, at(0))], OPEN), "One thing peaks and nothing new starts this week");
  assert.equal(weekSentence([eclipse("solar", 3, at(WEEK - 1))], OPEN), "One thing peaks and nothing new starts this week");
  assert.equal(weekSentence([eclipse("lunar", null, at(-1))], OPEN), "A quiet week for your chart");
  assert.equal(weekSentence([eclipse("lunar", null, at(WEEK))], OPEN), "A quiet week for your chart");
  assert.equal(weekSentence([eclipse("lunar", null, at(DAY), { target: "sun", orb: 0.5 }), retro("mars", [4], at(2 * DAY), at(60 * DAY))], OPEN), "One thing peaks and one new thing starts this week");
});

test("a week nothing reaches is a quiet week, which is no sentence 'this week' for a Monday email to quote", () => {
  const quiet = weekSentence([], OPEN);
  assert.equal(quiet, "A quiet week for your chart");
  assert.doesNotMatch(quiet, / this week$/);
  assert.equal(weekSentence([contact("mars", "square", "sun", { start: at(-60 * DAY), end: at(-DAY) }), eclipse("solar", 1, at(10 * DAY))], OPEN), quiet);
});

test("the week is counted from the instant given, so a reader's local midnight moves its edges with it", () => {
  const lisbonMonday = new Date("2026-10-04T23:00:00Z");
  const e = contact("saturn", "square", "sun", { start: new Date("2026-10-04T23:30:00Z"), end: day("2027-01-01") });
  assert.equal(weekSentence([e], lisbonMonday), "One new thing starts this week", "after Lisbon's midnight, so Monday's");
  assert.equal(weekSentence([e], OPEN), "Nothing new starts this week", "before UTC's, so last week's");
});

test("every cycle has a name and a plain word that agree with its id, and sentence case", () => {
  for (const [id, { name, word }] of Object.entries(CYCLE_WORDS)) {
    const kind = id.split("-").pop()!;
    const body = id.split("-")[0];
    assert.ok(name.length > 0 && word.length > 0, id);
    assert.match(name, /^[A-Z]/, id);
    assert.match(word, /^[A-Z]/, id);
    assert.doesNotMatch(`${name} ${word}`, /undefined|[—–;:!?.]|\d/, id);
    if (body !== "node") assert.ok(name.toLowerCase().startsWith(body) && name.toLowerCase().includes(kind), `${id}: "${name}" names its planet and its kind`);
  }
  assert.equal(CYCLE_WORDS["node-return"].name, "Nodal return");
  assert.match(CYCLE_WORDS["node-opposition"].name, /nodes/i);
});
