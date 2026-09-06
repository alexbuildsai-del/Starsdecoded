// Guards against prose drift in the committed meaning-library fixture.
//
// The 24 ascendant_sign / midheaven_sign summaries were shortened to fit a
// target length window so reports skim cleanly. This test fails CI if any
// entry is outside the agreed window, or if a summary is missing the basic
// narrative shape (multiple sentences covering body / threshold / first
// impression / best-vs-worst).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(here, "..", "data", "meanings.v2.json");

// The fixture did not survive the move off Replit (see data/README.md). It is
// optional at runtime — the library fills lazily from the AI — so skip rather
// than fail the suite. Restoring the file re-arms these assertions.
if (!existsSync(fixturePath)) {
  test("meaning fixture prose", { skip: `no fixture at ${fixturePath}` }, () => {});
} else {
  runFixtureTests(JSON.parse(readFileSync(fixturePath, "utf8")));
}

function runFixtureTests(fixture) {

const GUARDED_KINDS = new Set(["ascendant_sign", "midheaven_sign"]);
const MIN_LEN = 500;
const MAX_LEN = 750;
const MIN_SENTENCES = 3;
const EXPECTED_COUNT_PER_KIND = 12; // one per zodiac sign

const guarded = fixture.filter((e) => GUARDED_KINDS.has(e.kind));

test("fixture contains all 24 ascendant_sign / midheaven_sign entries", () => {
  const byKind = new Map();
  for (const e of guarded) {
    byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
  }
  assert.equal(
    byKind.get("ascendant_sign"),
    EXPECTED_COUNT_PER_KIND,
    "expected 12 ascendant_sign entries (one per sign)",
  );
  assert.equal(
    byKind.get("midheaven_sign"),
    EXPECTED_COUNT_PER_KIND,
    "expected 12 midheaven_sign entries (one per sign)",
  );
});

test("every guarded summary is within the agreed length window", () => {
  const offenders = [];
  for (const entry of guarded) {
    const summary = entry.payload?.summary;
    if (typeof summary !== "string") {
      offenders.push(`${entry.key}: missing string summary`);
      continue;
    }
    const len = summary.length;
    if (len < MIN_LEN || len > MAX_LEN) {
      offenders.push(`${entry.key}: ${len} chars (expected ${MIN_LEN}-${MAX_LEN})`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Summaries outside the ${MIN_LEN}-${MAX_LEN} char window:\n  ${offenders.join("\n  ")}`,
  );
});

test("every guarded summary has the expected multi-beat narrative shape", () => {
  // Sanity check that each summary still reads as several sentences covering
  // body/threshold/first-impression/best-vs-worst — not a one-liner or
  // bullet stub. We assert sentence count rather than exact wording so
  // future copy edits are not over-constrained.
  const offenders = [];
  for (const entry of guarded) {
    const summary = entry.payload?.summary ?? "";
    const sentenceCount = summary
      .split(/[.!?]+\s+|[.!?]+$/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0).length;
    if (sentenceCount < MIN_SENTENCES) {
      offenders.push(`${entry.key}: only ${sentenceCount} sentence(s)`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Summaries with fewer than ${MIN_SENTENCES} sentences:\n  ${offenders.join("\n  ")}`,
  );
});
}
