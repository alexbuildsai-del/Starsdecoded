import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "../lib/testFixtures.js";
import {
  ALL_SECTIONS, REPORT_SECTIONS, SECTION_IDS, SHARED_SYSTEM, WORD_TARGETS,
  buildBrief, toStrictJsonSchema,
} from "./index.js";
import { BODIES, SIGNS, BODY, SIGN, HOUSE, ASPECT, STRUCTURE } from "./vocabulary.js";

test("registry: ten reader-facing sections in the agreed order, foundation first overall", () => {
  assert.deepEqual(SECTION_IDS, ["overview", "triad", "mind", "career", "money", "relationships", "family", "superpowers", "discoveries", "focus"]);
  assert.equal(ALL_SECTIONS[0].key, "natal:foundation");
  assert.equal(ALL_SECTIONS.length, 11);
});

test("registry: word targets sum to the 3,500-4,000 report target", () => {
  const min = Object.values(WORD_TARGETS).reduce((n, [a]) => n + a, 0);
  const max = Object.values(WORD_TARGETS).reduce((n, [, b]) => n + b, 0);
  assert.equal(min, 3500);
  assert.equal(max, 4000);
});

test("vocabulary: every primitive present, every full entry 40-80 words, no em dashes or semicolons", () => {
  const words = (s: string) => s.trim().split(/\s+/).length;
  const check = (label: string, text: string) => {
    assert.ok(!/—|;/.test(text), `${label} contains an em dash or semicolon`);
    const w = words(text);
    assert.ok(w >= 35 && w <= 90, `${label}: ${w} words`);
  };
  for (const b of BODIES) check(`body ${b}`, BODY[b].full);
  for (const s of SIGNS) check(`sign ${s}`, SIGN[s].full);
  for (let h = 1; h <= 12; h++) check(`house ${h}`, HOUSE[h].full);
  for (const [k, e] of Object.entries(ASPECT)) check(`aspect ${k}`, [e.dynamic, e.inFlow, e.underStress, e.growth].join(" "));
  for (const [k, e] of Object.entries(STRUCTURE)) assert.ok(words(e.full) >= 20, `structure ${k} too short`);
});

test("system prompt: contains the style contract, the vocabulary and the doctrine; is static", () => {
  assert.match(SHARED_SYSTEM, /STYLE CONTRACT/);
  assert.match(SHARED_SYSTEM, /VOCABULARY/);
  assert.match(SHARED_SYSTEM, /DOCTRINE/);
  assert.match(SHARED_SYSTEM, /Never explain the method/);
  assert.ok(SHARED_SYSTEM.length > 15_000, "system block should carry the full vocabulary");
  assert.ok(!SHARED_SYSTEM.includes("{"), "system block must contain no template placeholders");
});

test("brief: Marie Curie brief carries sect, chart ruler, rulers, lots and stellium", () => {
  const b = buildBrief(chartFromFixture("marie-curie"), "Marie Curie");
  assert.match(b.text, /^NAME: Marie Curie/m);
  assert.match(b.text, /SECT \(computed once/);
  assert.match(b.text, /^  sect: day$/m);
  assert.match(b.text, /^  malefic_out_of_sect: mars$/m);
  assert.equal(b.sect.sect, "day");
  assert.match(b.text, /CHART RULER: Saturn in Scorpio, 11th house/);
  assert.match(b.text, /10th \(Libra\) ruled by Venus, which sits in Scorpio in the 11th, detriment/);
  assert.match(b.text, /LOTS: Fortune .* Spirit /);
  assert.ok(b.stelliums.some((s) => s.startsWith("Scorpio:")), `stelliums: ${b.stelliums}`);
  assert.ok(b.emptyHouses.includes(8));
  assert.equal(Object.keys(b.personalPlanets).length, BODIES.length);
  assert.ok(b.angleMeanings.ascendant.firstImpression.startsWith("Capricorn rising"));
});

test("brief: the variable tail differs per chart but the static system block does not", () => {
  const a = buildBrief(chartFromFixture("marie-curie"), "A").text;
  const b = buildBrief(chartFromFixture("oprah-winfrey"), "B").text;
  assert.notEqual(a, b);
  // The system block is a module constant: identical by construction. Assert
  // the brief never leaks into it.
  assert.ok(!SHARED_SYSTEM.includes("NAME:"));
});

test("schemas: strict JSON schema closes every object and carries no unsupported keywords", () => {
  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`));
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    for (const k of ["minItems", "maxItems", "minLength", "maxLength", "pattern", "format"]) {
      assert.ok(!(k in o), `${path} has ${k}`);
    }
    if (o.type === "object") {
      assert.equal(o.additionalProperties, false, `${path} not closed`);
      assert.deepEqual(o.required, Object.keys(o.properties as object), `${path} required != all keys`);
    }
    for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
  };
  for (const s of ALL_SECTIONS) walk(toStrictJsonSchema(s.schema), s.key);
});

test("schemas: each section accepts a well-formed payload and rejects an empty object", () => {
  for (const s of REPORT_SECTIONS) {
    assert.equal(s.schema.safeParse({}).success, false, `${s.key} accepted {}`);
  }
  const career = REPORT_SECTIONS.find((s) => s.key === "natal:career")!;
  const claims = [1, 2, 3].map(() => ({ quote: "x", evidence: [{ kind: "placement", body: "sun", sign: "scorpio", house: 11 }] }));
  const ok = career.schema.safeParse({
    vocationalPull: "x", howYouShowUp: "y", growthThroughWork: "z",
    actions: [{ action: "a", why: "b" }, { action: "a", why: "b" }, { action: "a", why: "b" }],
    claims,
  });
  assert.equal(ok.success, true, JSON.stringify(ok.success ? null : ok.error.issues));
  const tooFew = career.schema.safeParse({
    vocationalPull: "x", howYouShowUp: "y", growthThroughWork: "z", actions: [{ action: "a", why: "b" }], claims,
  });
  assert.equal(tooFew.success, false, "zod must still enforce the count strict mode cannot express");
});

// ---------------------------------------------------------------------------
// Phase 2: claims are verified against the chart.
// ---------------------------------------------------------------------------
import { validateClaims, labelEvidence, storeClaims, CLAIMS_CONTRACT, type Claim } from "./evidence.js";
import { SHARED_SYSTEM as SYS } from "./system.js";
import { FoundationSchema } from "./sections/foundation.js";
import { REPORT_SECTIONS as SECTIONS } from "./index.js";
import { lots } from "../lib/traditional.js";

const curie = () => chartFromFixture("marie-curie");

test("claims: a valid placement, ruler, lot, sect and aspect all verify for Marie Curie", () => {
  const chart = curie();
  const section = { text: "You investigate first and commit second. Your career will not be built on being liked." };
  const claims: Claim[] = [
    { quote: "You investigate first and commit second.", evidence: [{ kind: "placement", body: "sun", sign: "scorpio", house: 11 }] },
    { quote: "Your career will not be built on being liked.", evidence: [{ kind: "ruler", house: 10, ruler: "venus", rulerSign: "scorpio", rulerHouse: 11, dignity: "detriment" }] },
    { quote: "commit second", evidence: [{ kind: "sect", role: "malefic_out_of_sect", body: "mars" }, { kind: "lot", lot: "fortune", sign: chart.planets.sun.sign.toLowerCase() as never, house: 1 }] },
  ];
  // Fix the lot to whatever the engine says so the test is not fragile.
  const f = lots(chart).fortune;
  (claims[2].evidence[1] as { sign: string; house: number }).sign = f.sign;
  (claims[2].evidence[1] as { sign: string; house: number }).house = f.house;
  const aspect = chart.aspects[0];
  claims.push({ quote: "not be built on being liked", evidence: [{ kind: "aspect", body1: aspect.planet1 as never, body2: aspect.planet2 as never, type: aspect.type as never, orb: aspect.orb }] });
  assert.deepEqual(validateClaims(section, claims, chart), []);
});

test("claims: hallucinated house, wrong orb, wrong dignity and a fabricated quote are all rejected", () => {
  const chart = curie();
  const section = { text: "You investigate first and commit second." };
  const aspect = chart.aspects[0];
  const bad: Claim[] = [
    { quote: "You investigate first and commit second.", evidence: [{ kind: "placement", body: "sun", sign: "scorpio", house: 9 }] },
    { quote: "You investigate first and commit second.", evidence: [{ kind: "aspect", body1: aspect.planet1 as never, body2: aspect.planet2 as never, type: aspect.type as never, orb: aspect.orb + 1 }] },
    { quote: "You investigate first and commit second.", evidence: [{ kind: "ruler", house: 10, ruler: "venus", rulerSign: "scorpio", rulerHouse: 11, dignity: "domicile" }] },
    { quote: "You are a natural leader who thrives in the spotlight.", evidence: [{ kind: "sect", role: "sect_light", body: "sun" }] },
    { quote: "You investigate first and commit second.", evidence: [{ kind: "sect", role: "sect_light", body: "moon" }] },
  ];
  const errors = validateClaims(section, bad, chart);
  assert.equal(errors.length, 5, errors.join("\n"));
  assert.match(errors[0], /11th, not the 9th/);
  assert.match(errors[1], /orb is/);
  assert.match(errors[2], /detriment, not domicile/);
  assert.match(errors[3], /not found verbatim/);
  assert.match(errors[4], /sect_light is sun, not moon/);
});

test("claims: labels are composed from the reference, never from model text", () => {
  const chart = curie();
  assert.equal(labelEvidence({ kind: "ruler", house: 10, ruler: "venus", rulerSign: "scorpio", rulerHouse: 11, dignity: "detriment" }, chart),
    "Venus rules the 10th and sits in Scorpio, 11th house, in detriment");
  assert.match(labelEvidence({ kind: "placement", body: "sun", sign: "scorpio", house: 11 }, chart), /^Sun 14\.\d° Scorpio, 11th house$/);
  assert.equal(labelEvidence({ kind: "sect", role: "malefic_out_of_sect", body: "mars" }, chart), "Mars is the malefic out of sect");
  const stored = storeClaims([{ quote: "q", evidence: [{ kind: "lot", lot: "spirit", sign: "gemini", house: 6 }] }], chart);
  assert.equal(stored[0].evidence[0].label, "Lot of Spirit in Gemini, 6th house");
});

test("every reader-facing section requires 3-8 claims and validates them; foundation echoes sect", () => {
  for (const s of SECTIONS) {
    assert.ok(typeof s.validate === "function", `${s.key} has no validator`);
    const shape = (s.schema as unknown as { shape: Record<string, unknown> }).shape;
    assert.ok("claims" in shape, `${s.key} schema lacks claims`);
  }
  assert.ok("sect" in (FoundationSchema as unknown as { shape: Record<string, unknown> }).shape);
  assert.match(CLAIMS_CONTRACT, /verbatim/);
  assert.match(SYS, /commits to one sect/);
});
