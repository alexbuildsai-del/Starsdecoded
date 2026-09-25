/**
 * The four failure codes and their lines (ADR-84), from the errors the
 * generators throw: network is unreachable, a quota 429 is credit, a section
 * that never passed is quality, the rest is ours.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
// No key is ever sent and the pool connects lazily; the sink is swapped below.
process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.PROMPT_DEFAULTS_ONLY = "1";
const { OutOfCreditError, SectionError } = await import("./aiInterpretation.js");
const { FAILURE_LINES, ReportFailure, failureCodeOf, failureReasonOf } = await import("./failureReasons.js");

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
  assert.equal(FAILURE_LINES.quality, "One chapter didn't meet our quality bar after several tries. Try again.");
  assert.equal(FAILURE_LINES.internal, "Something went wrong on our side. We've been alerted.");
  assert.deepEqual(failureReasonOf("quality"), { code: "quality", line: FAILURE_LINES.quality });
  assert.deepEqual(failureReasonOf("something_else"), { code: "internal", line: FAILURE_LINES.internal });
  assert.equal(failureReasonOf(null), null);
});
