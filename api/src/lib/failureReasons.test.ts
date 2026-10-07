/**
 * The four failure codes and their lines (ADR-84), from the errors the
 * generators throw: network is unreachable, a quota 429 is credit, a section
 * that never passed is quality, the rest is ours. And when a failed report is
 * final, with its line that the credit is back (ADR-313).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
// No key is ever sent and the pool connects lazily; the sink is swapped below.
process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.PROMPT_DEFAULTS_ONLY = "1";
const { OutOfCreditError, SectionError } = await import("./aiInterpretation.js");
const { FAILURE_LINES, FINAL_LINE, MAX_TRIES, ReportFailure, failureCodeOf, failureReasonOf, isFinal } = await import("./failureReasons.js");

test("codes from errors", () => {
  assert.equal(failureCodeOf(new OutOfCreditError("natal:mind", "insufficient_quota")), "provider_out_of_credit");
  assert.equal(failureCodeOf(new SectionError("natal:mind", "failed validation after 3 attempts")), "quality");
  assert.equal(failureCodeOf(Object.assign(new Error("Connection error."), { name: "APIConnectionError" })), "provider_unreachable");
  assert.equal(failureCodeOf(Object.assign(new Error("Internal server error"), { status: 502 })), "provider_unreachable");
  assert.equal(failureCodeOf(Object.assign(new Error("Request timed out."), { name: "APIConnectionTimeoutError" })), "provider_unreachable");
  assert.equal(failureCodeOf(Object.assign(new Error("fetch failed"), { cause: { code: "ECONNRESET" } })), "provider_unreachable");
  assert.equal(failureCodeOf(new Error("cannot read properties of undefined")), "internal");
  assert.equal(failureCodeOf(new ReportFailure("quality", "wrapped")), "quality");
  assert.equal(failureCodeOf(null), "internal");
});

test("the customer lines are the spec's, verbatim, and an unknown stored code reads as internal", () => {
  assert.equal(FAILURE_LINES.provider_unreachable, "Our writing service didn't answer. Try again in a few minutes.");
  assert.equal(FAILURE_LINES.provider_out_of_credit, "We can't write reports right now. We've been alerted. Try again later.");
  assert.equal(FAILURE_LINES.quality, "We couldn't get one chapter right after several tries. Please try again.");
  assert.equal(FAILURE_LINES.internal, "Something went wrong on our side. We've been alerted.");
  assert.deepEqual(failureReasonOf("quality"), { code: "quality", line: FAILURE_LINES.quality });
  assert.deepEqual(failureReasonOf("something_else"), { code: "internal", line: FAILURE_LINES.internal });
  assert.equal(failureReasonOf(null), null);
});

test("final: a Personal report at its third failure, a pair at its first; a final report says its credit is back (ADR-313, reading 16)", () => {
  assert.equal(MAX_TRIES, 3);
  const natal = (failedTries: number, status = "failed") => ({ type: "natal", status, failedTries });
  assert.deepEqual([1, 2, 3, 4].map((n) => isFinal(natal(n))), [false, false, true, true]);
  assert.equal(isFinal({ type: "natal", status: "failed" }), false, "a row with no count has failed none");
  for (const status of ["complete", "interpreting", "pending", "computing", "revising"]) {
    assert.equal(isFinal(natal(3, status)), false, `${status} is not failed`);
  }
  assert.equal(isFinal({ type: "compatibility", status: "failed", failedTries: 1 }), true, "a pair has no Try again");
  assert.equal(isFinal({ type: "compatibility", status: "interpreting", failedTries: 0 }), false);

  assert.equal(FINAL_LINE, "We couldn't write this report. Your credit is back in your balance.");
  assert.deepEqual(failureReasonOf("quality", true), { code: "quality", line: FINAL_LINE });
  assert.deepEqual(failureReasonOf("something_else", true), { code: "internal", line: FINAL_LINE });
  assert.deepEqual(failureReasonOf(null, true), { code: "internal", line: FINAL_LINE }, "an old failure with no code still says so");
  assert.deepEqual(failureReasonOf("quality", false), { code: "quality", line: FAILURE_LINES.quality });
});
