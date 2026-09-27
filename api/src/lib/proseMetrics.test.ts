import { test } from "node:test";
import assert from "node:assert/strict";
import { measureProse, proseText, syllables } from "./proseMetrics.js";

test("sentences end at . ? ! before whitespace, never inside a decimal or after e.g.", () => {
  const m = measureProse("You score 3.5 on it. Why? Because, e.g. work matters! Done.");
  assert.equal(m.sentences, 4);
  assert.equal(m.words, 11);
  assert.equal(m.longestSentence, 5);
  assert.equal(m.paragraphs, 1);
});

test("a closing quote after the stop still ends the sentence, and a paragraph break always does", () => {
  const m = measureProse('She said "go." Then she went\n\nA heading line\n\nLast one.');
  assert.equal(m.sentences, 4);
  assert.equal(m.paragraphs, 3);
});

test("means, the p90 by nearest rank, and the longest", () => {
  const text = ["One.", "One two.", "One two three.", "One two three four.", "One two three four five six seven eight nine ten."].join(" ");
  const m = measureProse(text);
  assert.equal(m.sentences, 5);
  assert.equal(m.words, 20);
  assert.equal(m.wordsPerSentenceMean, 4);
  assert.equal(m.wordsPerSentenceP90, 10);
  assert.equal(m.longestSentence, 10);
});

test("second person counts sentences, not mentions", () => {
  const m = measureProse("You wait. Your turn comes, and you take it. They watch. Nobody else knows yourself.");
  assert.equal(m.secondPersonSentenceShare, 3 / 4);
});

test("em dashes and semicolons are counted as characters", () => {
  const m = measureProse("You wait — then act; slowly — surely; always.");
  assert.equal(m.emDashes, 2);
  assert.equal(m.semicolons, 2);
  assert.equal(m.sentences, 1);
});

test("the syllable heuristic holds on ordinary words", () => {
  assert.equal(syllables("the"), 1);
  assert.equal(syllables("make"), 1);
  assert.equal(syllables("people"), 2);
  assert.equal(syllables("reading"), 2);
  assert.equal(syllables("responsibility"), 6);
  assert.equal(syllables("self-aware"), 3);
});

test("long words, word length and Flesch follow the counts", () => {
  const m = measureProse("The cat sat. Responsibility matters.");
  assert.equal(m.words, 5);
  assert.equal(m.longWordShare, 1 / 5);
  assert.equal(m.avgWordLength, (3 + 3 + 3 + 14 + 7) / 5);
  const syl = 1 + 1 + 1 + 6 + 2;
  assert.ok(Math.abs(m.fleschReadingEase - (206.835 - 1.015 * 2.5 - 84.6 * (syl / 5))) < 1e-9);
});

test("empty text is all zeros, never NaN", () => {
  const m = measureProse("   ");
  for (const v of Object.values(m)) assert.equal(v, 0);
});

test("a section flattens to its prose leaves: claims, evidence, ids and headings are left out", () => {
  const section = {
    title: "Quiet authority",
    text: "You lead by example.",
    actions: [{ action: "Ask first.", why: "so you learn the room" }],
    houses: [{ house: 1, reading: "The first house." }],
    claims: [{ quote: "You lead by example.", evidence: [{ ref: { kind: "placement", body: "sun" } }] }],
    id: "abc",
  };
  assert.equal(proseText(section), "You lead by example.\n\nAsk first.\n\nso you learn the room\n\nThe first house.");
  assert.equal(proseText("A raw fallback."), "A raw fallback.");
  assert.equal(proseText(null), "");
});
