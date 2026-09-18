import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "../lib/testFixtures.js";
import { CLAIMS_CONTRACT, EvidenceRefSchema, labelEvidence, validateClaims, type Claim } from "./evidence.js";
import { triad } from "./sections/triad.js";

const curie = () => chartFromFixture("marie-curie");
const section = { text: "You read a room before you speak in it." };

test("angle: a rising claim citing the ascendant's own sign verifies", () => {
  const chart = curie();
  const claims: Claim[] = [
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] },
  ];
  assert.deepEqual(validateClaims(section, claims, chart), []);
});

test("angle: a sign the ascendant is not in is rejected, and the message names the sign", () => {
  const chart = curie();
  const claims: Claim[] = [
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "angle", angle: "ascendant", sign: "aquarius" }] },
  ];
  const errors = validateClaims(section, claims, chart);
  assert.equal(errors.length, 1, errors.join("\n"));
  assert.match(errors[0], /the ascendant is in capricorn, not aquarius/);
});

test("angle: the label is composed from the chart's own degree", () => {
  const chart = curie();
  assert.equal(labelEvidence({ kind: "angle", angle: "ascendant", sign: "capricorn" }, chart), "Ascendant · 12.1° Capricorn");
  assert.match(labelEvidence({ kind: "angle", angle: "midheaven", sign: "scorpio" }, chart), /^Midheaven · 18\.\d° Scorpio$/);
});

test("angle: the schema admits only the two angles, and the contract names the sixth shape", () => {
  assert.equal(EvidenceRefSchema.safeParse({ kind: "angle", angle: "ascendant", sign: "capricorn" }).success, true);
  assert.equal(EvidenceRefSchema.safeParse({ kind: "angle", angle: "descendant", sign: "cancer" }).success, false);
  assert.match(CLAIMS_CONTRACT, /an angle \(the ascendant or the midheaven, and its sign\)/);
});

test("triad: the rising part reads the sign first and the chart ruler second", () => {
  assert.match(triad.instructions, /Read the rising sign first, then what the chart ruler's condition adds/);
  assert.deepEqual(triad.wordTarget, [250, 320]);
});
