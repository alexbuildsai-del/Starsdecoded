import { test } from "node:test";
import assert from "node:assert/strict";
import { addAttempt, buildReportUsage, costUsd, emptySection, reportCostUsd, totalsOf } from "./usage.js";

const G5 = "gpt-5.2";

test("cached tokens are split out of the prompt total, not added to it", () => {
  const s = addAttempt(emptySection("natal:overview", G5), {
    prompt_tokens: 9_700,
    prompt_tokens_details: { cached_tokens: 6_675 },
    completion_tokens: 1_200,
  }, 20_000);
  assert.equal(s.inputTokens, 3_025);
  assert.equal(s.cachedInputTokens, 6_675);
  assert.equal(s.inputTokens + s.cachedInputTokens, 9_700);
});

test("reasoning tokens are carried but never charged twice", () => {
  const s = addAttempt(emptySection("natal:focus", G5), {
    prompt_tokens: 1_000,
    completion_tokens: 3_000,
    completion_tokens_details: { reasoning_tokens: 2_000 },
  }, 1_000);
  assert.equal(s.outputTokens, 3_000, "completion already includes reasoning");
  assert.equal(s.reasoningTokens, 2_000);
  // 1000 in at $1.75/M plus 3000 out at $14/M. Reasoning adds nothing on top.
  assert.equal(costUsd("gpt-5.2", totalsOf([s])), 0.00175 + 0.042);
});

test("a section that retried accumulates every attempt", () => {
  let s = emptySection("natal:career", G5);
  s = addAttempt(s, { prompt_tokens: 9_700, completion_tokens: 2_800 }, 25_000);
  s = addAttempt(s, { prompt_tokens: 9_800, completion_tokens: 2_600 }, 24_000);
  assert.equal(s.attempts, 2);
  assert.equal(s.inputTokens, 19_500);
  assert.equal(s.outputTokens, 5_400);
  assert.equal(s.ms, 49_000);
});

test("a reply with no usage block counts as an attempt and adds no tokens", () => {
  const s = addAttempt(emptySection("natal:mind", G5), undefined, 900);
  assert.equal(s.attempts, 1);
  assert.equal(s.inputTokens, 0);
  assert.equal(s.outputTokens, 0);
  assert.equal(s.ms, 900);
});

test("a cached count larger than the prompt never produces a negative bill", () => {
  const s = addAttempt(emptySection("natal:money", G5), {
    prompt_tokens: 100,
    prompt_tokens_details: { cached_tokens: 250 },
  }, 10);
  assert.equal(s.inputTokens, 0);
  assert.equal(s.cachedInputTokens, 100);
});

test("an unpriced model reports null rather than a wrong number", () => {
  const s = addAttempt(emptySection("natal:triad", G5), { prompt_tokens: 1_000, completion_tokens: 1_000 }, 10);
  assert.equal(costUsd("gpt-6-unreleased", totalsOf([s])), null);
  assert.equal(buildReportUsage([{ ...s, model: "gpt-6-unreleased" }], 10).costUsd, null);
});

test("gpt-5-mini prices the same report seven times cheaper on output", () => {
  const s = addAttempt(emptySection("natal:overview", G5), { prompt_tokens: 0, completion_tokens: 1_000_000 }, 1);
  const t = totalsOf([s]);
  assert.equal(costUsd("gpt-5.2", t), 14);
  assert.equal(costUsd("gpt-5-mini", t), 2);
});

test("summed call time exceeds wall clock, because the sections run at once", () => {
  const foundation = addAttempt(emptySection("natal:foundation", G5), { prompt_tokens: 8_100, completion_tokens: 1_100 }, 22_000);
  // Three sections of 26s each, fired together: 78s of call time, 26s of waiting.
  const parallel = ["overview", "triad", "mind"].map((k) =>
    addAttempt(emptySection(`natal:${k}`, G5), { prompt_tokens: 9_700, completion_tokens: 1_300 }, 26_000));
  const u = buildReportUsage([foundation, ...parallel], 48_000);
  assert.equal(u.totals.attempts, 4);
  assert.equal(u.totals.inputTokens, 8_100 + 3 * 9_700);
  assert.equal(u.totals.ms, 100_000, "22s serial plus 3 x 26s of concurrent call time");
  assert.equal(u.wallClockMs, 48_000, "22s serial plus one 26s parallel wave");
  assert.ok(u.totals.ms > u.wallClockMs, "the gap is what the fan-out buys");
  assert.equal(u.sections.length, 4);
});

test("a report mixing models prices each section on its own", () => {
  const foundation = addAttempt(emptySection("natal:foundation", "gpt-5.2"), { completion_tokens: 1_000_000 }, 1);
  const section = addAttempt(emptySection("natal:overview", "gpt-5-mini"), { completion_tokens: 1_000_000 }, 1);
  const u = buildReportUsage([foundation, section], 2);
  // $14 on the strong model plus $2 on the small one. Pricing the summed
  // totals at either model would give $28 or $4, and the A/B would be a lie.
  assert.equal(u.costUsd, 16);
  assert.equal(u.model, "mixed", "no single model describes this report");
});

test("one unpriced section nulls the whole report rather than undercounting it", () => {
  const priced = addAttempt(emptySection("natal:overview", "gpt-5.2"), { completion_tokens: 1_000 }, 1);
  const unpriced = addAttempt(emptySection("natal:triad", "gpt-6-unreleased"), { completion_tokens: 1_000 }, 1);
  assert.equal(reportCostUsd([priced, unpriced]), null);
  assert.equal(buildReportUsage([priced, unpriced], 1).costUsd, null);
});

test("a single-model report still reports that model, not \"mixed\"", () => {
  const a = addAttempt(emptySection("natal:overview", G5), { completion_tokens: 10 }, 1);
  const b = addAttempt(emptySection("natal:triad", G5), { completion_tokens: 10 }, 1);
  assert.equal(buildReportUsage([a, b], 1).model, G5);
});
