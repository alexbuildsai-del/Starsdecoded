/**
 * The style contract states what the prose study will measure (ADR-87):
 * sentences of 15 words on average and none over 25, in the natal contract
 * and in the pair writer alike, so every system prompt carries the numbers.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHARED_SYSTEM, STYLE_CONTRACT } from "./system.js";
import { PAIR_SYSTEM, PAIR_WRITER } from "./pair/index.js";

test("rules 7 and 8 carry the sentence numbers and the Owner's line", () => {
  const rule7 = STYLE_CONTRACT.split("\n").find((l) => l.startsWith("7."))!;
  const rule8 = STYLE_CONTRACT.split("\n").find((l) => l.startsWith("8."))!;
  assert.match(rule7, /Simpler sentences over complicated vocabulary, always/);
  assert.match(rule8, /15 words on average or fewer/);
  assert.match(rule8, /never one over 25/);
});

test("the pair writer says the same, and both system prompts carry it", () => {
  assert.match(PAIR_WRITER, /average 15 words or fewer and none is over 25/);
  assert.match(PAIR_WRITER, /simpler sentences over complicated vocabulary, always/i);
  assert.match(SHARED_SYSTEM, /never one over 25/);
  assert.match(PAIR_SYSTEM, /never one over 25/);
  assert.match(PAIR_SYSTEM, /none is over 25/);
});

// Prose is plain text, said in the prompt (ADR-104): rule 3 keeps evidence in
// the claims field and rule 8 opens on the shape of a prose field.
const RULE_3 = `3. Placements are evidence, and evidence lives in the claims field only. "Sun in Scorpio, 11th house" may fill a field that is explicitly a label. It never heads, ends or interrupts a prose field, bold or plain, even alone on a line. A placement stated first and the behaviour after it is still reasoning from a placement. Where a section lifts rule 8 (the link cards), its names sit inside a sentence, never as a heading. Never copy a line from the brief or the foundation into prose. To cite a paragraph is to give it a claim.`;
const RULE_8_OPENING = "8. A prose field is one paragraph of plain sentences, printed exactly as written: no markdown, no asterisks, no headings, no bullet points, no blank lines.";

test("rule 3 is the spec's and rule 8 opens on the plain-text sentence, in both system prompts", () => {
  const rule3 = STYLE_CONTRACT.split("\n").find((l) => l.startsWith("3."))!;
  const rule8 = STYLE_CONTRACT.split("\n").find((l) => l.startsWith("8."))!;
  assert.equal(rule3, RULE_3);
  assert.ok(rule8.startsWith(RULE_8_OPENING), rule8);
  assert.doesNotMatch(rule8, /No bullet points inside prose fields\./);
  assert.match(rule8, /No em dashes\. No semicolons\. No emojis\./);
  assert.match(rule8, /No planet, sign, or house names inside prose fields unless the field is explicitly a label\.$/);
  assert.doesNotMatch(STYLE_CONTRACT, /may appear as a heading or label/);
  for (const system of [SHARED_SYSTEM, PAIR_SYSTEM]) {
    assert.ok(system.includes(RULE_3));
    assert.ok(system.includes(RULE_8_OPENING));
  }
});
