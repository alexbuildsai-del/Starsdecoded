/**
 * The failure log (ADR-85) without a database: the rows a write produces,
 * the redaction, the swallowed store error, and the pure counts with the
 * flag at 3 of a section's last 20 writes and not at 2.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
// No key is ever sent and the pool connects lazily; the sink is swapped below.
process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.PROMPT_DEFAULTS_ONLY = "1";
const { failureCounts, recordChecks, redact, rowsFor, setFailureSink } = await import("./failureLog.js");
type FailureRow = import("./failureLog.js").FailureRow;
const { block, fixed, warned } = await import("../prompts/checks.js");

test("redact strips quoted spans and caps the length; never report text", () => {
  assert.equal(redact('claim 2: quote not found: "You leave the room a minute before you are asked to."'), 'claim 2: quote not found: "…"');
  assert.equal(redact("the scene never names “Oprah Winfrey” here"), "the scene never names “…” here");
  assert.equal(redact("x".repeat(400)).length, 160);
  assert.equal(redact("plain  message   with   spaces"), "plain message with spaces");
});

test("rowsFor: one row a check, a pass row on a clean accepted write, no pass row on a blocked or an intermediate attempt", () => {
  const base = { kind: "pair" as const, section: "pair:partners02", model: "gpt-5.2", writeId: "w1" };
  const clean = rowsFor({ ...base, attempt: 1, final: true, checks: [] });
  assert.equal(clean.length, 1);
  assert.equal(clean[0].ruleId, "pass");
  const fixedOnly = rowsFor({ ...base, attempt: 1, final: true, checks: [fixed("chk-04", 'snapped "x"'), warned("chk-19", "word")] });
  assert.deepEqual(fixedOnly.map((r) => r.ruleId), ["chk-04", "chk-19", "pass"]);
  assert.equal(fixedOnly[0].message, 'snapped "…"');
  const blocked = rowsFor({ ...base, attempt: 3, final: true, checks: [block("chk-18", "a score")] });
  assert.deepEqual(blocked.map((r) => r.ruleId), ["chk-18"]);
  assert.deepEqual(rowsFor({ ...base, attempt: 1, final: false, checks: [] }), []);
});

test("recordChecks never throws when the store does", async () => {
  const restore = setFailureSink(async () => { throw new Error("database down"); });
  try {
    await recordChecks({ kind: "natal", section: "natal:mind", model: "gpt-5.2", writeId: "w", attempt: 1, final: true, checks: [] });
  } finally {
    restore();
  }
});

function seeded(section: string, firesOn: number[], writes = 25): FailureRow[] {
  const rows: FailureRow[] = [];
  for (let w = 0; w < writes; w++) {
    const at = new Date(Date.UTC(2026, 8, 1, 0, w)).toISOString();
    rows.push({ section, ruleId: firesOn.includes(w) ? "chk-23" : "pass", class: firesOn.includes(w) ? "buffer" : "pass", writeId: `${section}-${w}`, createdAt: at });
  }
  return rows;
}

test("failureCounts flags a rule at 3 of the section's last 20 writes and not at 2; older writes do not count", () => {
  // Writes 0..24; the last 20 are 5..24. Fires on 24, 20 and 10: three inside the window.
  const three = failureCounts(seeded("pair:partners02", [24, 20, 10]));
  assert.equal(three.length, 1);
  assert.equal(three[0].rule, "chk-23");
  assert.equal(three[0].count, 3);
  assert.equal(three[0].flagged, true);
  assert.equal(three[0].rate, 3 / 20);
  // Fires on 24, 20 and 2: two inside the window, one too old.
  const two = failureCounts(seeded("pair:partners02", [24, 20, 2]));
  assert.equal(two[0].count, 3);
  assert.equal(two[0].flagged, false);
  assert.equal(two[0].rate, 2 / 20);
  // Sections are counted apart.
  const mixed = failureCounts([...seeded("pair:partners02", [24, 20, 10]), ...seeded("natal:mind", [24])]);
  assert.deepEqual(mixed.map((c) => [c.section, c.flagged]), [["pair:partners02", true], ["natal:mind", false]]);
});
