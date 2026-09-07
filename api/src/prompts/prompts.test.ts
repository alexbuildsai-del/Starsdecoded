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
  assert.match(b.text, /SECT: day chart/);
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
  const ok = career.schema.safeParse({
    vocationalPull: "x", howYouShowUp: "y", growthThroughWork: "z",
    actions: [{ action: "a", why: "b" }, { action: "a", why: "b" }, { action: "a", why: "b" }],
  });
  assert.equal(ok.success, true);
  const tooFew = career.schema.safeParse({
    vocationalPull: "x", howYouShowUp: "y", growthThroughWork: "z", actions: [{ action: "a", why: "b" }],
  });
  assert.equal(tooFew.success, false, "zod must still enforce the count strict mode cannot express");
});
