import { test } from "node:test";
import assert from "node:assert/strict";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { failureCodeOfMessage, injectionReport } = await import("./adminLab.js");

test("a failed run's error reads as one of the four customer codes (ADR-84)", () => {
  assert.equal(failureCodeOfMessage(null), null);
  assert.equal(failureCodeOfMessage("natal:career: out of credit: insufficient_quota"), "provider_out_of_credit");
  assert.equal(failureCodeOfMessage("natal:career: failed validation after 3 attempts: x"), "quality");
  assert.equal(failureCodeOfMessage("Connection error."), "provider_unreachable");
  assert.equal(failureCodeOfMessage("stopped: 502 Bad Gateway"), "provider_unreachable");
  assert.equal(failureCodeOfMessage("job failed: cannot read x"), "internal");
});

test("the injection report counts leaks and prompts that could not render apart, and a clean pass has neither", () => {
  const clean = { fixture: "inject-markup", set: "natal", section: "career", blocks: 1, leak: null };
  assert.deepEqual(injectionReport([clean, { ...clean, section: "money" }]), {
    available: true, prompts: 2, leaked: 0, notRendered: 0,
    rows: [
      { fixture: "inject-markup", set: "natal", section: "career", clean: true, leak: null },
      { fixture: "inject-markup", set: "natal", section: "money", clean: true, leak: null },
    ],
  });
  const report = injectionReport([clean, { ...clean, leak: "user: Address the reader as" }, { ...clean, leak: null, error: "no pair" }]);
  assert.ok(report.available);
  assert.equal(report.leaked, 1);
  assert.equal(report.notRendered, 1);
  assert.deepEqual(report.rows.map((r) => r.clean), [true, false, false]);
});
