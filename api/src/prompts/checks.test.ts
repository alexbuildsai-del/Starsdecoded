/**
 * The check vocabulary (ADR-81): every annex row has a rule, every rule a
 * class, and the helpers tell a block from the rest.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, block, blocking, buffered, clean, fixed, needsRepair, repair, warned } from "./checks.js";

test("every annex row 1 to 38 has a rule, and the engine's four have row 0", () => {
  const rows = new Set(Object.values(RULES).map((r) => r.row));
  for (let n = 1; n <= 38; n++) assert.ok(rows.has(n), `row ${n} has no rule`);
  for (const id of ["chk-00-json", "chk-00-schema", "chk-00-truncated", "chk-00-refused"]) assert.equal(RULES[id].cls, "block");
  assert.equal(RULES["chk-21a"].cls, "block");
  assert.equal(RULES["chk-21b"].cls, "warn");
  // Still blocking after R08: rows 15, 18, 21a, 22, 24, 25, 30, 36.
  for (const id of ["chk-15", "chk-18", "chk-22", "chk-24", "chk-25", "chk-30", "chk-36"]) assert.equal(RULES[id].cls, "block", id);
  for (const id of ["chk-10", "chk-23", "chk-32"]) assert.equal(RULES[id].cls, "buffer", id);
  assert.equal(RULES["chk-09"].cls, "repair");
});

test("helpers: only a block blocks, a repair asks for the claims call, clean carries no checks", () => {
  const checks = [fixed("chk-01", "cut"), warned("chk-19", "word"), buffered("chk-23", "13 words"), repair("chk-09", "two claims")];
  assert.deepEqual(blocking(checks), []);
  assert.equal(needsRepair(checks), true);
  assert.deepEqual(blocking([...checks, block("chk-18", "a score")]).map((c) => c.rule), ["chk-18"]);
  assert.deepEqual(clean({ a: 1 }), { output: { a: 1 }, checks: [] });
});
