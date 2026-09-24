import { test } from "node:test";
import assert from "node:assert/strict";
import { REPETITION_BAR, blindFlags, measurePair, repetitionScore, shingles } from "./report-lab.js";

const clean = { text: "You investigate first and commit second.", claims: [{ quote: "x", evidence: [{ ref: { kind: "placement", body: "sun", sign: "scorpio", house: null }, label: "Sun 14.6° Scorpio" }] }] };

test("the blind flag fires on a house number, rising, the Ascendant, the Midheaven, sect and a lot, in text or claims", () => {
  assert.deepEqual(blindFlags(clean), []);
  assert.deepEqual(blindFlags({ ...clean, text: "Your Sun sits in the 11th house." }), ["blind:house number in text"]);
  assert.deepEqual(blindFlags({ ...clean, text: "With Capricorn rising you wait." }), ["blind:rising in text"]);
  assert.deepEqual(blindFlags({ ...clean, text: "The Ascendant leads." }), ["blind:Ascendant in text"]);
  assert.deepEqual(blindFlags({ ...clean, text: "Your Midheaven points north." }), ["blind:Midheaven in text"]);
  assert.deepEqual(blindFlags({ ...clean, text: "In a day chart the Sun leads." }), ["blind:sect in text"]);
  assert.deepEqual(blindFlags({ ...clean, text: "The Lot of Fortune sits low." }), ["blind:lot in text"]);
  assert.deepEqual(blindFlags({ ...clean, claims: [{ quote: "x", evidence: [{ ref: { kind: "angle" }, label: "" }] }] }), ["blind:angle claim"]);
  assert.deepEqual(blindFlags({ ...clean, claims: [{ quote: "x", evidence: [{ ref: { kind: "placement", house: 11 }, label: "" }] }] }), ["blind:placement claim carries a house"]);
});

const card = (reading: string) => ({ kind: "flows", planetA: "venus", planetB: "moon", aspect: "trine", orb: 1.2, reading });
const fifty = "Your Venus and their Moon agree on what a good evening looks like before either of you has said a word, so the plan gets made once and the bill gets split without a look. The room notices. Behaviour check: count the evenings that need no negotiating this week.";

const scene = "Marie comes in late and says nothing. Oprah has the plan on the table. \"We said Thursday,\" Oprah says. Marie reads it twice.";
const lensChapter = (over: Record<string, unknown> = {}) => ({
  headline: "You plan it twice and the private one wins.",
  card: { a: ["Marie investigates first.", "Marie decides late.", "Marie keeps going."], b: ["Oprah says it out loud.", "Oprah plans twice.", "Oprah leaves early."], pair: "You both plan it twice." },
  scene,
  whatJustHappened: { becauseA: "Marie was still reading the plan.", becauseB: "Oprah had already made it." },
  pattern: "This is where it rubs, and what it trains is patience.",
  nextTime: { items: [{ for: "A", action: "Say Thursday out loud.", why: "so nobody plans it twice" }] },
  claims: [],
  ...over,
});
const base: Record<string, unknown> = {
  meta: { lens: "partners", band: null, names: { a: "Marie Curie", b: "Oprah Winfrey" } },
  twoCharts: { headline: "Two slow deciders.", strong: ["a", "b", "c"], work: ["d", "e", "f"], paradox: "g", strengths: ["Marie finishes what Oprah starts."], pointer: "h", claims: [] },
  partners02: lensChapter(),
  links: { links: [card(fifty)] },
};

test("the pair measure reads the seven chapters of the lens, counts prose without the cards and the items, and flags the cards", () => {
  const ok = measurePair(base);
  assert.equal(ok.rows.length, 7);
  assert.match(ok.rows[0].section, /Your two charts/);
  assert.match(ok.rows[1].section, /How you love/);
  assert.equal(ok.rows[1].words, words(["You plan it twice and the private one wins.", scene, "Marie was still reading the plan.", "Oprah had already made it.", "This is where it rubs, and what it trains is patience."].join(" ")));
  assert.equal(ok.cards.length, 1);
  assert.doesNotMatch(ok.cards[0], /words \d|check|RATING/);
  assert.match(measurePair({ ...base, links: { links: [card("Too short. Behaviour check: no.")] } }).cards[0], /5 words/);
  assert.match(measurePair({ ...base, links: { links: [card(fifty.replace("Behaviour check:", "Try:"))] } }).cards[0], /no behaviour check/);
  assert.match(measurePair({ ...base, links: { links: [card(fifty.replace("The room notices.", "This scores 8/10."))] } }).cards[0], /RATING/);
  assert.match(measurePair({ ...base, meta: { ...(base.meta as object), lens: "people" } }).rows[4].section, /The hard talk/);
});

test("the pair measure flags a rating, evidence in prose, a card line over twelve words, a scene missing a name, and a band line", () => {
  const rated = measurePair({ ...base, partners02: lensChapter({ pattern: "You are 80% compatible." }) });
  assert.ok(rated.rows[1].flags.some((f) => /RATING/.test(f)), rated.rows[1].flags.join(" "));
  const evidence = measurePair({ ...base, partners02: lensChapter({ pattern: "The square between you shows at 11 pm." }) });
  assert.ok(evidence.rows[1].flags.some((f) => /EVIDENCE/.test(f)));
  const long = measurePair({ ...base, partners02: lensChapter({ card: { a: ["Marie plans the weekend twice, once out loud, once in private, and the private one wins."], b: [], pair: "x" } }) });
  assert.ok(long.rows[1].flags.some((f) => /CARD: 1 line/.test(f)));
  const oneName = measurePair({ ...base, partners02: lensChapter({ scene: "Marie comes in late. The kitchen is dark." }) });
  assert.ok(oneName.rows[1].flags.some((f) => /SCENE: the scene never names Oprah/.test(f)));
  const parent = measurePair({ ...base, meta: { lens: "parent_child", band: "little", names: { a: "Marie Curie", b: "Oprah Winfrey" } }, parentChild02: lensChapter({ pattern: "Oprah has homework to finish before the bath." }) });
  assert.equal(parent.band, "little");
  assert.ok(parent.bandFlags.some((f) => /parentChild02: contradicts the little band/.test(f)), parent.bandFlags.join(" "));
});

test("the repetition score is the share of five-word runs that appear in more than one chapter, under a 3% bar", () => {
  assert.equal(REPETITION_BAR, 0.03);
  assert.equal(repetitionScore(["You plan the weekend twice and the private plan wins every time.", "Oprah leaves the room a minute before she is asked to."]), 0);
  const shared = "You plan the weekend twice and the private plan wins.";
  const score = repetitionScore([shared, shared]);
  assert.equal(score, 1);
  assert.equal(shingles("one two three four five six").length, 2);
  const twice = measurePair({ ...base, partners02: lensChapter(), partners03: lensChapter() });
  assert.ok(twice.repetition > REPETITION_BAR, `two identical chapters read ${twice.repetition}`);
  assert.ok(measurePair(base).repetition <= REPETITION_BAR);
});

function words(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}
