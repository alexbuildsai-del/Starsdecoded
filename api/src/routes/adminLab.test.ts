import { test } from "node:test";
import assert from "node:assert/strict";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { failureCodeOfMessage } = await import("./adminLab.js");

test("a failed run's error reads as one of the four customer codes (ADR-84)", () => {
  assert.equal(failureCodeOfMessage(null), null);
  assert.equal(failureCodeOfMessage("natal:career: out of credit: insufficient_quota"), "provider_out_of_credit");
  assert.equal(failureCodeOfMessage("natal:career: failed validation after 3 attempts: x"), "quality");
  assert.equal(failureCodeOfMessage("Connection error."), "provider_unreachable");
  assert.equal(failureCodeOfMessage("stopped: 502 Bad Gateway"), "provider_unreachable");
  assert.equal(failureCodeOfMessage("job failed: cannot read x"), "internal");
});
