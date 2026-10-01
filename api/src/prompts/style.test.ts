/**
 * The style contract states what the prose study will measure (ADR-87):
 * sentences of 15 words on average and none over 25, in the natal contract
 * and in the pair writer alike, so every system prompt carries the numbers.
 * Rule 13 is the voice (ADR-185): two friends over coffee, too fancy and too
 * trendy named, in every natal and pair prompt, both foundations included.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHARED_SYSTEM, STYLE_CONTRACT, WRITER } from "./system.js";
import { FOUNDATION } from "./index.js";
import { PAIR_FOUNDATION, PAIR_SYSTEM, PAIR_WRITER } from "./pair/index.js";
import { REGISTER } from "./checks.js";
import { PROMPT_DEFAULTS } from "../lib/promptDefaults.js";

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

const TOO_HIGH = ["oriented to", "predisposed", "proclivity", "dichotomy", "paradigm"];
const TOO_LOW = ["vibe", "vibes", "toxic", "red flag", "lowkey", "main character", "energy"];
const rule13 = () => STYLE_CONTRACT.split("\n").find((l) => l.startsWith("13."))!;
const quoted = (sentence: string) => [...sentence.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

test("rule 13 names two friends over coffee, both lists and one model sentence", () => {
  const rule = rule13();
  assert.match(rule, /^13\. Write the way two friends talk over coffee: plain words, short sentences, warm and direct, never too fancy and never too trendy\./);
  const [fancy, trendy] = ["are too fancy.", "are too trendy."].map((end) => rule.split(/(?<=\.) /).find((s) => s.endsWith(end))!);
  assert.deepEqual(quoted(fancy), TOO_HIGH);
  assert.deepEqual(quoted(trendy), TOO_LOW);
  assert.match(trendy, /"energy" as a mood/);
  assert.equal(rule.match(/Model: "/g)?.length, 1);
  assert.match(rule, /Model: "[^"]+"$/);
  assert.equal(STYLE_CONTRACT.split("\n").filter((l) => /^\d+\. /.test(l)).length, 13, "rule 13 is the last rule, so no other rule's number moved");
});

test("every natal and pair system prompt carries rule 13, the foundations' rows included", () => {
  for (const system of [SHARED_SYSTEM, PAIR_SYSTEM]) assert.ok(system.includes(rule13()));
  const systems = PROMPT_DEFAULTS.filter((p) => p.systemPrompt !== null);
  assert.ok(systems.some((p) => p.key === "natal:foundation:system") && systems.some((p) => p.key === "pair:foundation:system"));
  for (const p of systems) assert.ok(p.systemPrompt!.includes(rule13()), p.key);
});

test("chk-39 counts the words rule 13 names, no more and no fewer", () => {
  for (const [list, named] of [["high", TOO_HIGH], ["low", TOO_LOW]] as const) {
    const counted = REGISTER[list].map(([w]) => w);
    for (const w of counted) assert.ok(named.includes(w), `${w} is counted but rule 13 does not name it`);
    for (const w of named) assert.ok(counted.some((c) => w === c || w === `${c}s`), `rule 13 names ${w} but chk-39 does not count it`);
  }
});

test("the writers lose premium and the semicolon, and both foundations write their handoff in rule 13's words", () => {
  for (const writer of [WRITER, PAIR_WRITER]) {
    assert.doesNotMatch(writer, /premium/i);
    assert.doesNotMatch(writer, /;/);
  }
  assert.doesNotMatch(PAIR_WRITER, /tangible/);
  for (const spec of [FOUNDATION, PAIR_FOUNDATION]) {
    assert.match(spec.instructions, /The style contract does not apply to this internal output, except rule 13: /);
    assert.match(spec.instructions, /in the same plain words as the report\./);
    assert.doesNotMatch(spec.instructions, /does not apply to this internal output, but/);
  }
  assert.match(PAIR_FOUNDATION.instructions, /chapter 1's card carries your three strengths/);
});
