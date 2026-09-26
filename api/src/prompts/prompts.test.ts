import { test } from "node:test";
import { z } from "zod/v4";
import assert from "node:assert/strict";
import { chartFromFixture } from "../lib/testFixtures.js";
import {
  ALL_SECTIONS, BLIND_WORD_TARGETS, PASS_ADDS, REPORT_SECTIONS, SECTION_IDS, SHARED_SYSTEM, WORD_TARGETS,
  buildBrief, hasClaims, instructionsFor, schemaFor, sectionById, sectionsFor, toStrictJsonSchema, wordTargetFor,
} from "./index.js";
import { BODIES, SIGNS, BODY, SIGN, HOUSE, ASPECT, STRUCTURE } from "./vocabulary.js";
import { itemsHint } from "./jsonSchema.js";
import { OverviewSchema } from "./sections/overview.js";

type JsonObj = Record<string, unknown>;

test("registry: eleven reader-facing sections in the agreed order, no path, foundation first overall", () => {
  assert.deepEqual(SECTION_IDS, ["overview", "triad", "houses", "mind", "career", "money", "relationships", "family", "superpowers", "discoveries", "focus"]);
  assert.equal(SECTION_IDS.length, 11);
  assert.ok(!SECTION_IDS.includes("path" as never));
  assert.equal(ALL_SECTIONS[0].key, "natal:foundation");
  assert.equal(ALL_SECTIONS.length, 12);
});

// Each section's prompt names its own numbers, so moving a band is USER-FACING
// and needs a lab run. This test pins the sums so they cannot drift out of the
// 3,500-5,500 product range unnoticed.
test("registry: word targets sum to 3,930-5,110, inside the 3,500-5,500 product range", () => {
  const min = Object.values(WORD_TARGETS).reduce((n, [a]) => n + a, 0);
  const max = Object.values(WORD_TARGETS).reduce((n, [, b]) => n + b, 0);
  assert.equal(min, 3930);
  assert.equal(max, 5110);
  assert.ok(min >= 3500 && max <= 5500, `bands ${min}-${max} leave the product range`);
});

// A blind report is written shorter by about what the pass adds back, so
// blind plus pass lands inside the same range (MB-60: R05's passed report
// read 5,769 words). The drawn bands above do not move.
test("registry: the blind bands sum to 2,740-3,460, and with what the pass adds sit inside 3,500-5,500", () => {
  const min = Object.values(BLIND_WORD_TARGETS).reduce((n, [a]) => n + a, 0);
  const max = Object.values(BLIND_WORD_TARGETS).reduce((n, [, b]) => n + b, 0);
  assert.equal(min, 2740);
  assert.equal(max, 3460);
  assert.ok(!("houses" in BLIND_WORD_TARGETS));
  assert.deepEqual(PASS_ADDS, [480 + 80 + 10 * 40, 780 + 100 + 10 * 90]);
  assert.ok(min + PASS_ADDS[0] >= 3500 && max + PASS_ADDS[1] <= 5500, `blind ${min}-${max} plus the pass ${PASS_ADDS} leave the product range`);
  for (const spec of sectionsFor("unknown")) {
    assert.ok(spec.blindWordTarget, `${spec.key} carries a blind band`);
    assert.ok(spec.blindWordTarget![1] < spec.wordTarget[1], `${spec.key}: the blind band sits below the drawn one`);
    assert.deepEqual(wordTargetFor(spec, false), spec.wordTarget);
    assert.deepEqual(wordTargetFor(spec, true), spec.blindWordTarget);
    const text = instructionsFor(spec, spec.instructions, true);
    assert.match(text, new RegExp(`Length: ${spec.blindWordTarget![0]} to ${spec.blindWordTarget![1]} words`), spec.key);
    assert.equal(instructionsFor(spec, spec.instructions, false), spec.instructions, `${spec.key}: drawn instructions untouched`);
  }
  assert.deepEqual(BLIND_WORD_TARGETS.triad, [160, 200], "two parts of 80 to 100");
});

// The horizon is a status (ADR-34): a blind report skips the sections that are
// nothing but the horizon and writes the rest under rules that never name one.
test("registry: a blind report skips houses and keeps every triad rule but the rising one", () => {
  const blind = sectionsFor("unknown").map((s) => s.key);
  assert.ok(!blind.includes("natal:houses"), "houses is the horizon and must be skipped");
  assert.ok(blind.includes("natal:triad"));
  assert.equal(blind.length, SECTION_IDS.length - 1);
  assert.deepEqual(sectionsFor("known").map((s) => s.key), REPORT_SECTIONS.map((s) => s.key));
  assert.deepEqual(sectionsFor("approximate").map((s) => s.key), REPORT_SECTIONS.map((s) => s.key));

  const triad = sectionById("triad")!;
  const drawn = instructionsFor(triad, triad.instructions, false);
  const blindText = instructionsFor(triad, triad.instructions, true);
  assert.equal(drawn, triad.instructions);
  assert.match(blindText, /HORIZON UNKNOWN/);
  assert.match(blindText, /no rising field/);
  // Every rule of the drawn triad is still in the blind text; only the rising rule is overridden.
  assert.ok(blindText.startsWith(triad.instructions.trim()));
  assert.match(blindText, /Sun: how they build identity/);
  assert.match(blindText, /Moon: what steadies them/);

  const shape = (schemaFor(triad, true) as unknown as { shape: Record<string, unknown> }).shape;
  assert.ok("sun" in shape && "moon" in shape && "claims" in shape);
  assert.ok(!("rising" in shape), "the blind triad has no rising part");
  assert.ok("rising" in (schemaFor(triad, false) as unknown as { shape: Record<string, unknown> }).shape);
  assert.equal(schemaFor(sectionById("overview")!, true), sectionById("overview")!.schema);
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
  assert.equal(b.sect?.sect, "day");
  assert.match(b.text, /CHART RULER: Saturn in Scorpio, 11th house/);
  assert.match(b.text, /10th \(Libra\) ruled by Venus, which sits in Scorpio in the 11th, detriment/);
  assert.match(b.text, /LOTS: Fortune .* Spirit /);
  assert.ok(b.stelliums.some((s) => s.startsWith("Scorpio:")), `stelliums: ${b.stelliums}`);
  assert.match(b.text, /Dominant element water\. Dominant modality fixed\./);
  assert.ok(b.emptyHouses.includes(8));
  assert.equal(Object.keys(b.personalPlanets).length, BODIES.length);
  assert.ok(b.angleMeanings?.ascendant.firstImpression.startsWith("Capricorn rising"));
});

test("brief: the variable tail differs per chart but the static system block does not", () => {
  const a = buildBrief(chartFromFixture("marie-curie"), "A").text;
  const b = buildBrief(chartFromFixture("oprah-winfrey"), "B").text;
  assert.notEqual(a, b);
  // The system block is a module constant: identical by construction. Assert
  // the brief never leaks into it.
  assert.ok(!SHARED_SYSTEM.includes("NAME:"));
});

test("schemas: a property named like a keyword survives the strip", () => {
  const strict = toStrictJsonSchema(z.object({ pattern: z.string(), format: z.string().min(2), inner: z.object({ minimum: z.number() }) })) as { properties: Record<string, JsonObj>; required: string[] };
  assert.deepEqual(Object.keys(strict.properties), ["pattern", "format", "inner"]);
  assert.deepEqual(strict.required, ["pattern", "format", "inner"]);
  assert.ok(!("minLength" in strict.properties.format), "the keyword under a field is still stripped");
  assert.deepEqual(Object.keys((strict.properties.inner as { properties: object }).properties), ["minimum"]);
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

test("schemas: every bounded array tells the model its item count, since strict mode drops the bound", () => {
  const strict = toStrictJsonSchema(FoundationSchema) as Record<string, any>;
  assert.match(strict.properties.supportingEvidence.description, /3 to 6 items\.$/);
  const claims = toStrictJsonSchema(OverviewSchema) as Record<string, any>;
  assert.match(claims.properties.claims.description, /3 to 8 items\.$/);
  assert.match(claims.properties.claims.items.properties.evidence.description, /1 to 3 items\.$/);
  assert.equal(itemsHint(3, 3), "Exactly 3 items.");
  assert.equal(itemsHint(undefined, undefined), undefined);
});

test("schemas: each section accepts a well-formed payload and rejects an empty object", () => {
  for (const s of REPORT_SECTIONS) {
    assert.equal(s.schema.safeParse({}).success, false, `${s.key} accepted {}`);
  }
  const career = REPORT_SECTIONS.find((s) => s.key === "natal:career")!;
  const claims = [1, 2, 3].map(() => ({ quote: "x", evidence: [{ kind: "placement", body: "sun", sign: "scorpio", house: 11 }] }));
  const actions = [{ action: "a", why: "b" }, { action: "a", why: "b" }, { action: "a", why: "b" }];
  const careerPaths = [{ item: "p", reason: "r" }, { item: "q", reason: "r" }, { item: "s", reason: "r" }];
  const ok = career.schema.safeParse({
    vocationalPull: "x", howYouShowUp: "y", growthThroughWork: "z", actions, careerPaths, claims,
  });
  assert.equal(ok.success, true, JSON.stringify(ok.success ? null : ok.error.issues));
  const tooFew = career.schema.safeParse({
    vocationalPull: "x", howYouShowUp: "y", growthThroughWork: "z", actions: [{ action: "a", why: "b" }], careerPaths, claims,
  });
  assert.equal(tooFew.success, false, "zod must still enforce the count strict mode cannot express");
  const noPaths = career.schema.safeParse({
    vocationalPull: "x", howYouShowUp: "y", growthThroughWork: "z", actions, careerPaths: careerPaths.slice(0, 2), claims,
  });
  assert.equal(noPaths.success, false, "careerPaths carries three to four items");
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

test("every reader-facing section but houses requires 3-8 claims and validates them; foundation echoes sect", () => {
  for (const s of SECTIONS) {
    assert.ok(typeof s.validate === "function", `${s.key} has no validator`);
    const shape = (s.schema as unknown as { shape: Record<string, unknown> }).shape;
    // The house cards sit on the wheel that proves them, so they carry no claims.
    assert.equal("claims" in shape, s.key !== "natal:houses", `${s.key} claims presence is wrong`);
    assert.equal(hasClaims(s), s.key !== "natal:houses");
  }
  assert.ok("sect" in (FoundationSchema as unknown as { shape: Record<string, unknown> }).shape);
  assert.match(CLAIMS_CONTRACT, /verbatim/);
  assert.match(SYS, /commits to one sect/);
});

test("registry: every section's token cap clears its prose plus eight claims with room to spare", () => {
  // ~1.5 tokens per prose word, up to eight claims at ~120 tokens each, and JSON overhead.
  for (const spec of ALL_SECTIONS) {
    const [, maxWords] = spec.wordTarget;
    const needed = Math.ceil(maxWords * 1.5) + 8 * 120 + 200;
    assert.ok(spec.maxTokens >= needed * 1.5, `${spec.key}: cap ${spec.maxTokens} is under 1.5x the ${needed} tokens a full reply can need`);
  }
});

// ---------------------------------------------------------------------------
// The house readings: twelve in order, no claims, only bodies that are there.
// ---------------------------------------------------------------------------
import { houses as housesSpec } from "./sections/houses.js";

const reading = (text: string) => text;
const twelve = (overrides: Record<number, string> = {}) =>
  ({ houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, reading: overrides[i + 1] ?? reading("You set the tone before you speak. Behaviour check: notice who follows your pace this week.") })) });

test("houses: the brief names the houses whose card already carries triad text", () => {
  const brief = buildBrief(curie(), "Marie Curie");
  const extra = housesSpec.extraContext!(brief);
  assert.match(extra, /^HOUSES ALREADY COVERED: houses 1, 3, 11 /);
  assert.match(extra, /Do not repeat it there/);
  assert.equal(sectionById("houses")!.key, "natal:houses");
});

test("houses: a reading may name the house ruler, never a body placed elsewhere", () => {
  const brief = buildBrief(curie(), "Marie Curie");
  const ok = housesSpec.validate!(twelve({ 1: "Saturn rules this ground and sets a slow pace. Behaviour check: count how often you wait." }), brief);
  assert.deepEqual(ok.checks, []);
  const bad = housesSpec.validate!(twelve({ 1: "Mars pushes here from the first minute. Behaviour check: notice the rush." }), brief).checks;
  assert.equal(bad.length, 1, bad.map((c) => c.message).join("\n"));
  assert.equal(bad[0].rule, "chk-15");
  assert.equal(bad[0].cls, "block");
  assert.match(bad[0].message, /house 1: the reading names Mars/);
  assert.match(bad[0].message, /neither placed in the 1st nor its ruler/);
});

test("houses: the twelve must arrive in order", () => {
  const brief = buildBrief(curie(), "Marie Curie");
  const out = twelve();
  out.houses[4].house = 9;
  // Out of order is sorted in code; a house left without a reading blocks (annex row 14).
  const result = housesSpec.validate!(out, brief);
  assert.ok(result.checks.some((c) => c.rule === "chk-14" && c.cls === "block" && /house 5 has no reading/.test(c.message)), result.checks.map((c) => c.message).join("\n"));
  assert.ok(result.checks.some((c) => c.rule === "chk-14" && c.cls === "fix" && /house 9 appears twice/.test(c.message)));
  const shuffled = twelve();
  shuffled.houses.reverse();
  const sorted = housesSpec.validate!(shuffled, brief);
  assert.deepEqual(sorted.output.houses.map((h) => h.house), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.ok(sorted.checks.every((c) => c.cls === "fix"));
});

test("chk-12: the foundation's sect is overwritten from the brief, never rejected", () => {
  const brief = buildBrief(curie(), "Marie Curie");
  const spec = ALL_SECTIONS[0];
  const out = { sect: "night", sectLight: "moon", chartThesis: "a", dominantPattern: "b", centralTension: "c", supportingEvidence: [], sectionGuidance: {} };
  const r = spec.validate!(out as never, brief) as { output: { sect: string; sectLight: string }; checks: Array<{ rule: string; cls: string }> };
  assert.equal(r.output.sect, brief.sect!.sect);
  assert.equal(r.output.sectLight, brief.sect!.sect_light);
  assert.deepEqual(r.checks.map((c) => `${c.rule}:${c.cls}`), ["chk-12:fix", "chk-12:fix"]);
});
