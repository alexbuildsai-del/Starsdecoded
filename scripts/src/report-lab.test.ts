import { test } from "node:test";
import assert from "node:assert/strict";
import { blindFlags, measurePair } from "./report-lab.js";

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

test("the pair measure flags a card off 40 to 70 words, one without a behaviour check, and any rating", () => {
  const chapter = { headline: "You meet at the door.", passages: [{ text: "You meet at the door.", source: "new", of: "both" }], claims: [] };
  const base: Record<string, unknown> = { meta: { lens: "partners" }, howYouMeet: chapter, links: { links: [card(fifty)] } };
  const ok = measurePair(base);
  assert.equal(ok.cards.length, 1);
  assert.doesNotMatch(ok.cards[0], /words \d|check|RATING/);
  assert.match(measurePair({ ...base, links: { links: [card("Too short. Behaviour check: no.")] } }).cards[0], /5 words/);
  assert.match(measurePair({ ...base, links: { links: [card(fifty.replace("Behaviour check:", "Try:"))] } }).cards[0], /no behaviour check/);
  assert.match(measurePair({ ...base, links: { links: [card(fifty.replace("The room notices.", "This scores 8/10."))] } }).cards[0], /RATING/);
  const rated = measurePair({ ...base, howYouMeet: { ...chapter, passages: [{ text: "You are 80% compatible.", source: "new", of: "both" }] } });
  assert.ok(rated.rows[0].flags.some((f) => /RATING/.test(f)), rated.rows[0].flags.join(" "));
  assert.match(rated.rows[0].section, /How you meet/);
  assert.match(measurePair({ ...base, meta: { lens: "family" } }).rows[6].section, /Being family/);
});
