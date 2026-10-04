/**
 * Every line Timeline prints beside the sky, held to the Owner's simple words:
 * each planet the doctrine moves on each of the nine points by each of its
 * aspects, a retrograde and an eclipse in every house, the facts line, the
 * week's sentence and the twelve cycles; then Mira's own six months, so the
 * page's example reads as the artifact showed it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateNatalChart } from "./chartCalculation.js";
import { DOCTRINE, skyEvents, type Aspect, type ContactEvent, type EclipseEvent, type NatalTarget, type RetrogradeEvent } from "./doctrine.js";
import { CYCLE_WORDS, factsOf, headlineOf, weekSentence } from "./plainWords.js";

type Mover = ContactEvent["body"];

const MOVERS: readonly Mover[] = DOCTRINE.bodies;
const ASPECTS: Record<Mover, readonly Aspect[]> = DOCTRINE.aspects;
const TARGETS: readonly NatalTarget[] = DOCTRINE.targets;
const HOUSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** The timeline-page artifact's headlines on Mira's contacts; the artifact wins where it shows one. */
const PAGE_LINES: [Mover, Aspect, NatalTarget, string][] = [
  ["saturn", "conjunction", "ascendant", "Taking yourself more seriously"],
  ["pluto", "conjunction", "saturn", "Big changes to your routines"],
  ["pluto", "opposition", "jupiter", "Rethinking your plans"],
  ["neptune", "trine", "jupiter", "Room to dream"],
  ["mars", "opposition", "saturn", "Wanting to act, feeling held back"],
  ["mars", "conjunction", "jupiter", "A burst of energy"],
  ["uranus", "trine", "saturn", "Easy changes to your routine"],
  ["jupiter", "trine", "venus", "Warmth in love and money"],
  ["saturn", "square", "midheaven", "Work feels heavier"],
  ["mars", "opposition", "moon", "Short-fuse days"],
  ["jupiter", "opposition", "moon", "Big feelings"],
  ["neptune", "conjunction", "mercury", "A dreamier mind"],
];

/** The two page lines that name a feel only their own aspect has. */
const ONE_ASPECT = new Map<string, Aspect>([["uranus.saturn", "trine"], ["saturn.midheaven", "square"]]);

const STOCK = /\b(unlock|unleash|elevate|empower|seamless|journey|delve|navigate|landscape|tapestry|testament|profound|transformative|cosmic|crucial|robust|destiny|fate|karma|soul|universe|crisis|doom|will|should|must|never|always|avoid)\b/i;

/** Simple words as a test can read them: sentence case, short, no dash, mark, number, stock word, forecast or order. */
function assertPlain(line: string): void {
  assert.match(line, /^[A-Z]/, `${line}: opens with a capital`);
  assert.doesNotMatch(line.slice(1), /[A-Z]/, `${line}: sentence case`);
  assert.doesNotMatch(line, /[—–;:!?.]|\d/, `${line}: no dash, semicolon, colon, mark, full stop or number`);
  assert.doesNotMatch(line, STOCK, `${line}: no stock, drama, forecast or do-or-don't word`);
  assert.ok(line.split(/\s+/).length <= 7, `${line}: seven words at most`);
}

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const MONDAY = day("2026-10-05");
const daysFrom = (n: number) => new Date(MONDAY.getTime() + n * 86_400_000);

function contact(
  body: Mover,
  aspect: Aspect,
  target: NatalTarget,
  { house = null, start = day("2026-09-01"), end = day("2026-12-01"), exact = [] }: { house?: number | null; start?: Date; end?: Date; exact?: Date[] } = {},
): ContactEvent {
  return { key: `contact.${body}.${aspect}.${target}.20260901`, kind: "contact", body, aspect, target, orb: 2, window: { start, end, exact }, house, tone: "mixed" };
}

function retrograde(body: RetrogradeEvent["body"], houses: number[], start = day("2026-10-09"), end = day("2026-11-19")): RetrogradeEvent {
  return { key: `retrograde.${body}.-.-.20261009`, kind: "retrograde", body, start, end, houses, tone: "mixed" };
}

function eclipse(kind: "solar" | "lunar", house: number | null, near: EclipseEvent["near"] = null, at = day("2026-08-12")): EclipseEvent {
  return { key: `eclipse.-.-.-.20260812`, kind: "eclipse", eclipse: { kind, at, lon: 140 }, house, near, tone: near ? "mixed" : null };
}

test("the page's lines on Mira's contacts are the artifact's, word for word", () => {
  for (const [body, aspect, target, line] of PAGE_LINES) assert.equal(headlineOf(contact(body, aspect, target)), line);
});

test("every planet the doctrine moves has one plain line on each of the nine points, whatever the aspect", () => {
  const pairLines: string[] = [];
  for (const body of MOVERS) {
    for (const target of TARGETS) {
      const own = ONE_ASPECT.get(`${body}.${target}`);
      const lines = new Set(ASPECTS[body].filter((aspect) => aspect !== own).map((aspect) => headlineOf(contact(body, aspect, target))));
      assert.equal(lines.size, 1, `${body} to ${target}: the tone carries the aspect, so the line stays`);
      const [line] = lines;
      assertPlain(line);
      pairLines.push(line);
    }
  }
  assert.equal(pairLines.length, 54, "six planets on nine points");
  assert.equal(new Set(pairLines).size, 54, "no two contacts read as one line on the dial");
  for (const [body, aspect, target, line] of PAGE_LINES.filter(([b, , t]) => ONE_ASPECT.has(`${b}.${t}`))) {
    assertPlain(line);
    assert.ok(!pairLines.includes(line), `${body} ${aspect} ${target}: its own line stays with its aspect`);
  }
  assert.equal(headlineOf(contact("uranus", "square", "saturn")), "Shaking up your routine");
  assert.equal(headlineOf(contact("saturn", "trine", "midheaven")), "Taking your work more seriously");
});

test("the dial can word a contact it holds as body, aspect and target alone", () => {
  assert.equal(headlineOf({ kind: "contact", body: "saturn", aspect: "conjunction", target: "ascendant" }), "Taking yourself more seriously");
});

test("a retrograde is named by the house it turns back in, in everyday words, and by its planet without one", () => {
  for (const body of ["mercury", "venus", "mars"] as const) {
    const lines = HOUSES.map((house) => headlineOf(retrograde(body, [house])));
    lines.forEach(assertPlain);
    assert.equal(new Set(lines).size, 12, `${body}: each house its own line`);
    const none = headlineOf(retrograde(body, []));
    assertPlain(none);
    assert.ok(!lines.includes(none), `${body}: no birth time, no house named`);
    assert.equal(headlineOf(retrograde(body, [8, 7])), lines[7], `${body}: the first house it is in`);
    assert.equal(headlineOf(retrograde(body, [13])), none);
  }
  assert.equal(headlineOf(retrograde("mercury", [2])), "A second look at money");
  assert.equal(headlineOf(retrograde("venus", [7])), "Rethinking what you want from a partner");
  assert.equal(headlineOf(retrograde("mars", [10])), "Taking it slower in your career");
  assert.equal(headlineOf(retrograde("venus", [])), "Rethinking what you value");
});

test("an eclipse is named by its house in everyday words, and plainly without one", () => {
  for (const kind of ["solar", "lunar"] as const) {
    const lines = HOUSES.map((house) => headlineOf(eclipse(kind, house)));
    lines.forEach(assertPlain);
    assert.equal(new Set(lines).size, 12, `${kind}: each house its own line`);
    const none = headlineOf(eclipse(kind, null, { target: "sun", orb: 1.2 }));
    assertPlain(none);
    assert.ok(!lines.includes(none));
  }
  assert.equal(headlineOf(eclipse("solar", 10)), "More focus on your career");
  assert.equal(headlineOf(eclipse("lunar", 4)), "Feelings about home and family come up");
});

test("the facts line names the sky and the house, and leaves the dates to the page", () => {
  assert.deepEqual(factsOf(contact("saturn", "conjunction", "ascendant", { house: 1 })), { sky: "Saturn on your Ascendant", house: "1st house" });
  assert.deepEqual(factsOf(contact("saturn", "square", "midheaven", { house: 10 })), { sky: "Saturn square to your Midheaven", house: "10th house" });
  assert.deepEqual(factsOf(contact("neptune", "trine", "jupiter", { house: 5 })), { sky: "Neptune trine to your Jupiter", house: "5th house" });
  assert.deepEqual(factsOf(contact("mars", "opposition", "saturn", { house: 11 })), { sky: "Mars opposite your Saturn", house: "11th house" });
  assert.deepEqual(factsOf(contact("jupiter", "conjunction", "sun")), { sky: "Jupiter on your Sun", house: null });
  assert.deepEqual(
    [2, 3, 12].map((house) => factsOf(contact("pluto", "trine", "venus", { house })).house),
    ["2nd house", "3rd house", "12th house"],
  );
  assert.deepEqual(factsOf(retrograde("venus", [8, 7])), { sky: "Venus retrograde", house: "8th and 7th houses" });
  assert.deepEqual(factsOf(retrograde("mercury", [1, 12, 11])), { sky: "Mercury retrograde", house: "1st, 12th and 11th houses" });
  assert.deepEqual(factsOf(retrograde("mars", [])), { sky: "Mars retrograde", house: null });
  assert.deepEqual(factsOf(eclipse("solar", 5, { target: "sun", orb: 1.2 })), { sky: "Solar eclipse near your Sun", house: "5th house" });
  assert.deepEqual(factsOf(eclipse("lunar", null)), { sky: "Lunar eclipse", house: null });
  for (const body of MOVERS) {
    for (const target of TARGETS) {
      for (const aspect of ASPECTS[body]) assert.doesNotMatch(factsOf(contact(body, aspect, target, { house: 3 })).sky, /\d|undefined/);
    }
  }
});

test("the week's sentence counts what eases, peaks and starts in the seven days from its first", () => {
  const ongoing = contact("neptune", "trine", "jupiter", { start: day("2026-01-01"), end: day("2027-01-01") });
  const easing = [
    contact("saturn", "conjunction", "ascendant", { start: day("2026-06-01"), end: daysFrom(2) }),
    contact("pluto", "conjunction", "saturn", { start: day("2025-01-01"), end: daysFrom(6) }),
    ongoing,
  ];
  assert.equal(weekSentence(easing, MONDAY), "Two things ease and nothing new starts this week");

  const busy = [
    contact("saturn", "conjunction", "ascendant", { start: day("2026-06-01"), end: daysFrom(1) }),
    contact("jupiter", "trine", "venus", { start: day("2026-09-20"), end: day("2026-10-30"), exact: [daysFrom(3)] }),
    contact("mars", "opposition", "moon", { start: daysFrom(4), end: day("2026-10-20") }),
    retrograde("mercury", [8], daysFrom(5), day("2026-11-01")),
    ongoing,
  ];
  assert.equal(weekSentence(busy, MONDAY), "One thing eases, one peaks and two new things start this week");

  const peaking = [contact("pluto", "opposition", "jupiter", { start: day("2026-08-01"), end: day("2026-12-01"), exact: [daysFrom(0), daysFrom(6)] })];
  assert.equal(weekSentence(peaking, MONDAY), "One thing peaks and nothing new starts this week");
  assert.equal(weekSentence([eclipse("solar", 4, null, daysFrom(2)), eclipse("lunar", 10, null, daysFrom(3))], MONDAY), "Two things peak and nothing new starts this week");
  assert.equal(weekSentence([ongoing], MONDAY), "Nothing new starts this week");
  assert.equal(weekSentence([retrograde("venus", [7], day("2026-09-01"), daysFrom(4))], MONDAY), "One thing eases and nothing new starts this week");
  const starting = Array.from({ length: 13 }, (_, i) => contact("mars", "square", TARGETS[i % 9], { start: daysFrom(i % 7), end: day("2026-12-01") }));
  assert.equal(weekSentence(starting, MONDAY), "13 new things start this week");
});

test("a week nothing reaches is a quiet week, and the week ends where the next one starts", () => {
  assert.equal(weekSentence([], MONDAY), "A quiet week for your chart");
  const outside = [
    contact("mars", "square", "sun", { start: day("2026-09-01"), end: day("2026-10-04") }),
    contact("mars", "square", "moon", { start: daysFrom(7), end: day("2026-11-01") }),
    eclipse("lunar", 3, null, daysFrom(7)),
  ];
  assert.equal(weekSentence(outside, MONDAY), "A quiet week for your chart");
  assert.equal(weekSentence([contact("mars", "square", "venus", { start: day("2026-09-01"), end: MONDAY })], MONDAY), "One thing eases and nothing new starts this week");
});

test("each of the twelve life cycles has a name and a plain word, the page's where it shows one", () => {
  assert.deepEqual(Object.keys(CYCLE_WORDS).sort(), [
    "jupiter-opposition", "jupiter-return", "neptune-square", "node-opposition", "node-return", "pluto-square",
    "saturn-opposition", "saturn-return", "saturn-square", "uranus-opposition", "uranus-return", "uranus-square",
  ]);
  for (const { name, word } of Object.values(CYCLE_WORDS)) {
    assertPlain(name);
    assertPlain(word);
  }
  assert.equal(new Set(Object.values(CYCLE_WORDS).map(({ word }) => word)).size, 12);
  assert.equal(new Set(Object.values(CYCLE_WORDS).map(({ name }) => name)).size, 12);
  assert.deepEqual(CYCLE_WORDS["jupiter-return"], { name: "Jupiter return", word: "A fresh start" });
  assert.deepEqual(CYCLE_WORDS["node-return"], { name: "Nodal return", word: "A new direction" });
  assert.deepEqual(CYCLE_WORDS["uranus-opposition"], { name: "Uranus opposition", word: "A midlife change" });
  assert.equal(CYCLE_WORDS["saturn-return"].name, "Saturn return");
});

test("Mira's six months from October 2026 read as the page shows them: her contacts' lines, Saturn on her Ascendant, her week", () => {
  const mira = JSON.parse(readFileSync(new URL("../../../fixtures/sample-people/mira.json", import.meta.url), "utf8")) as {
    birthDate: string; birthTime: string; latitude: number; longitude: number; timezone: string;
  };
  const chart = calculateNatalChart(mira.birthDate, mira.birthTime, mira.latitude, mira.longitude, mira.timezone);
  const events = skyEvents(chart, day("2026-10-01"), day("2027-04-01"));
  assert.ok(events.length > 0);
  for (const event of events) {
    const line = headlineOf(event);
    assertPlain(line);
    assert.doesNotMatch(line, /^Changes in /, `${event.key}: a planet the doctrine moves has its own line`);
    assert.doesNotMatch(factsOf(event).sky, /undefined/);
  }
  const contactOf = (body: Mover, aspect: Aspect, target: NatalTarget) =>
    events.find((e): e is ContactEvent => e.kind === "contact" && e.body === body && e.aspect === aspect && e.target === target);
  for (const [body, aspect, target, line] of PAGE_LINES) {
    const event = contactOf(body, aspect, target);
    assert.ok(event, `${body} ${aspect} ${target} is one of Mira's contacts in these months`);
    assert.equal(headlineOf(event), line);
  }
  const saturnOnRising = contactOf("saturn", "conjunction", "ascendant");
  assert.ok(saturnOnRising);
  assert.deepEqual(factsOf(saturnOnRising), { sky: "Saturn on your Ascendant", house: "1st house" });
  assert.equal(weekSentence(events, MONDAY), "Two things ease and nothing new starts this week");
});
