import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "../lib/testFixtures.js";
import { calculateNatalChart } from "../lib/chartCalculation.js";
import { deriveTraditional } from "../lib/traditional.js";
import { buildBrief } from "./brief.js";
import { DOCTRINE } from "./system.js";
import { CLAIMS_CONTRACT, EvidenceRefSchema, labelEvidence, onlyQuoteProblems, softenQuote, validateClaims, type Claim } from "./evidence.js";
import { triad } from "./sections/triad.js";

const curie = () => chartFromFixture("marie-curie");
/** The same birth, the time not recorded: a 720-minute band around noon (R-3.1, no fabrication). */
const blindCurie = () => calculateNatalChart("1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720);
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

// ---------------------------------------------------------------------------
// The blind report: the brief never hands the model a fact the hour did not settle (ADR-34).
// ---------------------------------------------------------------------------

test("blind brief: HORIZON: unknown, no house number, no sect line, no ruler, no lot, no angle", () => {
  const b = buildBrief(blindCurie(), "Marie Curie");
  assert.equal(b.horizon, "unknown");
  assert.equal(b.sect, null);
  assert.equal(b.angleMeanings, undefined);
  assert.match(b.text, /^HORIZON: unknown/m);
  assert.doesNotMatch(b.text, /SECT/);
  assert.doesNotMatch(b.text, /ANGLES|CHART RULER|HOUSE RULERS|LOTS|EMPTY HOUSES/);
  assert.doesNotMatch(b.text, /\d+(st|nd|rd|th) house/, "no placement carries a house");
  assert.doesNotMatch(b.text, /in sect|contrary to sect|Ascendant|Midheaven/);
  assert.match(b.text, /Moon travels 340\.2 to 352\.[89] across the band, read as Pisces/);
  assert.equal(b.emptyHouses.length, 0);
  assert.equal(b.personalPlanets.sun.includes("house"), false);
  for (const v of Object.values(b.personalPlanets)) assert.doesNotMatch(v, /\d+(st|nd|rd|th)/);
});

test("blind derivation: sect, rulers, lots and the chart ruler are null, dignity still reads", () => {
  const t = deriveTraditional(blindCurie());
  assert.equal(t.horizon, "unknown");
  assert.equal(t.sect, null);
  assert.equal(t.houseRulers, null);
  assert.equal(t.lots, null);
  assert.equal(t.chartRuler, null);
  const mars = t.planets.find((p) => p.planet === "mars")!;
  assert.equal(mars.dignity, "domicile");
  assert.equal(mars.house, undefined);
  assert.equal(mars.inSect, null);
});

test("blind claims: angle, ruler, sect and lot are rejected by name, and a placement with a house too", () => {
  const chart = blindCurie();
  const bad: Claim[] = [
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "sect", role: "sect_light", body: "sun" }] },
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] },
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "ruler", house: 10, ruler: "venus", rulerSign: "scorpio", rulerHouse: 11, dignity: "detriment" }] },
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "lot", lot: "fortune", sign: "leo", house: 8 }] },
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "placement", body: "sun", sign: "scorpio", house: 11 }] },
  ];
  const errors = validateClaims(section, bad, chart);
  assert.equal(errors.length, 5, errors.join("\n"));
  assert.match(errors[0], /a sect claim cannot be made when the horizon is unknown/);
  assert.match(errors[1], /a angle claim cannot be made/);
  assert.match(errors[2], /a ruler claim cannot be made/);
  assert.match(errors[3], /a lot claim cannot be made/);
  assert.match(errors[4], /cannot carry a house when the horizon is unknown/);
  const ok: Claim[] = [
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "placement", body: "sun", sign: "scorpio", house: null }] },
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "aspect", body1: chart.aspects[0].planet1 as never, body2: chart.aspects[0].planet2 as never, type: chart.aspects[0].type as never, orb: chart.aspects[0].orb }] },
  ];
  assert.deepEqual(validateClaims(section, ok, chart), []);
  assert.match(labelEvidence({ kind: "placement", body: "sun", sign: "scorpio", house: null }, chart), /^Sun 14\.\d° Scorpio$/);
});

test("drawn claims: a placement must carry the house the brief lists", () => {
  const errors = validateClaims(section, [
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "placement", body: "sun", sign: "scorpio", house: null }] },
  ], curie());
  assert.equal(errors.length, 1);
  assert.match(errors[0], /the brief lists the house/);
});

test("doctrine: one rule for the blind report, and the prose never mentions the missing time", () => {
  assert.match(DOCTRINE, /HORIZON: unknown/);
  assert.match(DOCTRINE, /never name a house, the Ascendant, the Midheaven, rising, day or night, or a lot/);
  assert.match(DOCTRINE, /never mention that the time is missing/);
});

test("a quote is matched after the page's softening: curly quotes, dashes and whitespace, nothing more", () => {
  const chart = curie();
  const prose = { text: "You read a room – “slowly” – before you\n speak in it." };
  const ok: Claim[] = [{ quote: 'You read a room - "slowly" - before you speak in it.', evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] }];
  assert.deepEqual(validateClaims(prose, ok, chart), []);
  assert.equal(softenQuote("a – b — c ‘d’ “e”   f"), "a - b - c 'd' \"e\" f");
  const paraphrase: Claim[] = [{ quote: "You read a room before speaking.", evidence: [{ kind: "angle", angle: "ascendant", sign: "capricorn" }] }];
  const problems = validateClaims(prose, paraphrase, chart);
  assert.equal(problems.length, 1);
  assert.equal(onlyQuoteProblems(problems), true);
  assert.equal(onlyQuoteProblems([...problems, "claim 1 evidence 1: the ascendant is in capricorn, not aquarius"]), false);
  assert.equal(onlyQuoteProblems([]), false);
});
