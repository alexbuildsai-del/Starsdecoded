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
