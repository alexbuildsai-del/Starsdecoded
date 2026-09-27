import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "../lib/testFixtures.js";
import { calculateNatalChart } from "../lib/chartCalculation.js";
import { deriveTraditional } from "../lib/traditional.js";
import { buildBrief } from "./brief.js";
import { DOCTRINE } from "./system.js";
import { CLAIMS_CONTRACT, EvidenceRefSchema, labelEvidence, snapQuote, softenQuote, validateClaims, type Claim } from "./evidence.js";
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
  // The quote problem no longer rewrites prose (ADR-82): it snaps to its sentence or the claim drops.
  const snapped = snapQuote("you read a room before you speak in it", section.text);
  assert.equal(snapped, section.text);
  assert.equal(snapQuote("The weekend gets planned twice.", section.text), null);
});

// ---------------------------------------------------------------------------
// Reconciliation, one test per annex row (ADR-82): claims snap or drop.
// ---------------------------------------------------------------------------

const { reconcileClaims } = await import("./evidence.js");
const PROSE = { text: "You read a room before you speak in it. You leave the room a minute before you are asked to." };
const SUN = { kind: "placement" as const, body: "sun" as const, sign: "scorpio" as const, house: 11 };
const ok = (quote = "You read a room before you speak in it.") => ({ quote, evidence: [SUN] });
const rules = (r: { checks: Array<{ rule: string; cls: string }> }) => r.checks.map((c) => `${c.rule}:${c.cls}`);

test("chk-01: more than three references are cut to three; a claim with none left is dropped", () => {
  const four = { ...ok(), evidence: [SUN, SUN, SUN, SUN] };
  const r = reconcileClaims(PROSE, [four, ok(), ok()], curie());
  assert.equal(r.claims[0].evidence.length, 3);
  assert.ok(rules(r).includes("chk-01:fix"));
  const wrong = { ...ok(), evidence: [{ ...SUN, sign: "aries" as const }] };
  const dropped = reconcileClaims(PROSE, [wrong, ok(), ok(), ok()], curie());
  assert.equal(dropped.claims.length, 3);
  assert.ok(dropped.checks.some((c) => c.rule === "chk-01" && /no reference left/.test(c.message)));
});

test("chk-02: more than eight claims are cut to eight", () => {
  const r = reconcileClaims(PROSE, Array.from({ length: 10 }, () => ok()), curie());
  assert.equal(r.claims.length, 8);
  assert.ok(rules(r).includes("chk-02:fix"));
});

test("chk-03: a quote under eight characters drops the claim", () => {
  const r = reconcileClaims(PROSE, [ok("You"), ok(), ok(), ok()], curie());
  assert.equal(r.claims.length, 3);
  assert.ok(rules(r).includes("chk-03:fix"));
});

test("chk-04: a near-verbatim quote snaps to its sentence, case and punctuation ignored; a stranger drops", () => {
  const r = reconcileClaims(PROSE, [ok("you read a room before you speak in it"), ok(), ok()], curie());
  assert.equal(r.claims[0].quote, "You read a room before you speak in it.");
  assert.ok(r.checks.some((c) => c.rule === "chk-04" && /snapped/.test(c.message)));
  const far = reconcileClaims(PROSE, [ok("The weekend gets planned twice and the private plan wins."), ok(), ok(), ok()], curie());
  assert.equal(far.claims.length, 3);
  assert.ok(far.checks.some((c) => c.rule === "chk-04" && /dropped/.test(c.message)));
});

test("chk-05: a blind chart drops a horizon reference and nulls a house", () => {
  const angle = { quote: "You read a room before you speak in it.", evidence: [{ kind: "angle" as const, angle: "ascendant" as const, sign: "capricorn" as const }, { ...SUN, house: null }] };
  const housed = { quote: "You read a room before you speak in it.", evidence: [SUN] };
  const blind = { quote: "You read a room before you speak in it.", evidence: [{ ...SUN, house: null }] };
  const r = reconcileClaims(PROSE, [angle, housed, blind, blind], blindCurie());
  assert.deepEqual(r.claims[0].evidence, [{ ...SUN, house: null }]);
  assert.deepEqual(r.claims[1].evidence, [{ ...SUN, house: null }]);
  assert.equal(r.checks.filter((c) => c.rule === "chk-05").length, 2);
});

test("chk-06: a reference the chart does not hold is dropped, then the claim when it was the only one", () => {
  const wrongSign = { quote: "You read a room before you speak in it.", evidence: [{ ...SUN, sign: "aries" as const }, SUN] };
  const r = reconcileClaims(PROSE, [wrongSign, ok(), ok()], curie());
  assert.deepEqual(r.claims[0].evidence, [SUN]);
  assert.ok(rules(r).includes("chk-06:fix"));
});

test("chk-07: a drawn chart fills a null house from the chart", () => {
  const r = reconcileClaims(PROSE, [{ quote: "You read a room before you speak in it.", evidence: [{ ...SUN, house: null }] }, ok(), ok()], curie());
  assert.equal(r.claims[0].evidence[0].kind === "placement" && r.claims[0].evidence[0].house, 11);
  assert.ok(rules(r).includes("chk-07:fix"));
});

test("chk-08: an orb off by more than 0.2 snaps to the computed orb", () => {
  const aspect = { quote: "You read a room before you speak in it.", evidence: [{ kind: "aspect" as const, body1: "sun" as const, body2: "moon" as const, type: "trine" as const, orb: 3.5 }] };
  const r = reconcileClaims(PROSE, [aspect, ok(), ok()], curie());
  assert.equal(r.claims[0].evidence[0].kind === "aspect" && r.claims[0].evidence[0].orb, 1.9);
  assert.ok(rules(r).includes("chk-08:fix"));
});

test("chk-09: fewer than three valid claims is a repair, never a rewrite; the rising part needs one", () => {
  const r = reconcileClaims(PROSE, [ok(), ok("Nothing like this is in the prose at all.")], curie());
  assert.equal(r.claims.length, 1);
  assert.ok(rules(r).includes("chk-09:repair"));
  assert.ok(!r.checks.some((c) => c.cls === "block"));
  assert.ok(!rules(reconcileClaims(PROSE, [ok()], curie(), 1)).includes("chk-09:repair"), "chk-10: the rising part's minimum is one");
});
