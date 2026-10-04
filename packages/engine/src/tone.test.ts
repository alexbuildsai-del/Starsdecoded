/**
 * The tone table as MB-188 recommends it, and a day's tone as reading 17 has
 * it. A cell that moves is a change the Owner made: the page's examples move
 * with it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Aspect, ContactBody, ContactEvent, EclipseEvent, RetrogradeEvent } from "./doctrine.js";
import { TONE_TABLE, dayTone, toneOf, type Tone } from "./tone.js";

const BODIES: ContactBody[] = ["mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const ASPECTS: Aspect[] = ["conjunction", "square", "opposition", "trine"];

/** MB-188's recommendation, rule by rule, written apart from the table it checks. */
function recommended(body: ContactBody, aspect: Aspect): Tone {
  if (aspect === "trine") return "easy";
  if (body === "jupiter") return aspect === "conjunction" ? "easy" : "mixed";
  if (aspect === "conjunction" && (body === "neptune" || body === "mars")) return "mixed";
  return "intense";
}

test("every contact cell is MB-188's recommendation", () => {
  for (const body of BODIES) {
    for (const aspect of ASPECTS) {
      assert.equal(TONE_TABLE.contact[body][aspect], recommended(body, aspect), `${body} ${aspect}`);
      assert.equal(toneOf({ kind: "contact", body, aspect }), recommended(body, aspect), `toneOf ${body} ${aspect}`);
    }
  }
});

test("the cells the page's examples rest on", () => {
  const cases: Array<[ContactBody, Aspect, Tone]> = [
    ["saturn", "conjunction", "intense"],
    ["pluto", "conjunction", "intense"],
    ["pluto", "opposition", "intense"],
    ["neptune", "trine", "easy"],
    ["mars", "opposition", "intense"],
    ["mars", "conjunction", "mixed"],
    ["uranus", "trine", "easy"],
    ["jupiter", "trine", "easy"],
    ["saturn", "square", "intense"],
    ["jupiter", "opposition", "mixed"],
    ["neptune", "conjunction", "mixed"],
  ];
  for (const [body, aspect, tone] of cases) assert.equal(toneOf({ kind: "contact", body, aspect }), tone, `${body} ${aspect}`);
});

test("a retrograde is mixed; an eclipse is intense when near a natal point and has no tone otherwise", () => {
  assert.equal(toneOf({ kind: "retrograde" }), "mixed");
  assert.equal(toneOf({ kind: "eclipse", near: { target: "sun", orb: 1.2 } }), "intense");
  assert.equal(toneOf({ kind: "eclipse", near: null }), null);
});

const window = { start: new Date("2026-10-01T00:00:00Z"), end: new Date("2026-10-20T00:00:00Z"), exact: [] as Date[] };
function contact(tone: Tone): ContactEvent {
  return { key: `contact.${tone}`, kind: "contact", body: "saturn", aspect: "square", target: "sun", orb: 2, window, house: null, tone };
}
const retrograde: RetrogradeEvent = {
  key: "retrograde.mercury.-.-.20261009",
  kind: "retrograde",
  body: "mercury",
  start: window.start,
  end: window.end,
  houses: [3],
  tone: "mixed",
};
const eclipse: EclipseEvent = {
  key: "eclipse.sun.-.-.20261009",
  kind: "eclipse",
  eclipse: { kind: "solar", at: window.start, lon: 10 },
  house: 1,
  near: { target: "ascendant", orb: 0.5 },
  tone: "intense",
};

test("a day takes the tone most of its contacts hold", () => {
  assert.equal(dayTone([contact("easy"), contact("easy"), contact("intense")]), "easy");
  assert.equal(dayTone([contact("mixed"), contact("intense"), contact("mixed")]), "mixed");
  assert.equal(dayTone([contact("intense")]), "intense");
});

test("a tie goes to the more intense tone", () => {
  assert.equal(dayTone([contact("easy"), contact("intense")]), "intense");
  assert.equal(dayTone([contact("easy"), contact("mixed")]), "mixed");
  assert.equal(dayTone([contact("mixed"), contact("intense"), contact("easy")]), "intense");
  assert.equal(dayTone([contact("easy"), contact("easy"), contact("mixed"), contact("mixed")]), "mixed");
});

test("a day with no contact is quiet, whatever retrograde or eclipse it holds", () => {
  assert.equal(dayTone([]), null);
  assert.equal(dayTone([retrograde]), null);
  assert.equal(dayTone([retrograde, eclipse]), null);
  assert.equal(dayTone([retrograde, retrograde, contact("easy")]), "easy");
  assert.equal(dayTone([eclipse, contact("easy")]), "easy");
});
