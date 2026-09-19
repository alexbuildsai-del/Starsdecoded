import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNatalChart } from "../../lib/chartCalculation.js";
import { chartFromFixture } from "../../lib/testFixtures.js";
import { toStrictJsonSchema } from "../jsonSchema.js";
import { STYLE_CONTRACT } from "../system.js";
import { cannedNatalReplies, installFakeModel } from "../../lib/testModel.js";

const { generateInterpretation } = await import("../../lib/aiInterpretation.js");
const { buildPairBrief, LENSES, LENS_REGISTER } = await import("../../lib/pairBrief.js");
const {
  PAIR_ALL_SECTIONS, PAIR_CHAPTER_IDS, PAIR_DOCTRINE, PAIR_PROMPT_VERSION, PAIR_SECTIONS, PAIR_SECTION_IDS, PAIR_SYSTEM,
  PAIR_WORD_TARGETS, PAIR_CLAIMS_CONTRACT, lensContext, pairChapterTitle, pairHasClaims, pairSectionById, validatePairClaims,
} = await import("./index.js");
const { linkList } = await import("./sections/links.js");
type PairBrief = import("../../lib/pairBrief.js").PairBrief;

const fake = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const curieReport = await generateInterpretation(chartFromFixture("marie-curie"), "Marie Curie");
fake.replies = cannedNatalReplies({ drawn: true, sunSign: "aquarius", sunHouse: 3, sect: "night" });
const winfreyReport = await generateInterpretation(chartFromFixture("oprah-winfrey"), "Oprah Winfrey");
fake.restore();

function pair(lens: "partners" | "parent_child" | "family" = "partners"): PairBrief {
  return buildPairBrief({
    lens,
    a: { name: "Marie Curie", chart: chartFromFixture("marie-curie"), interpretation: curieReport },
    b: { name: "Oprah Winfrey", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
  });
}

test("registry: ten keys and the foundation, the pinned order, version p1", () => {
  assert.deepEqual(PAIR_SECTION_IDS, ["howYouMeet", "twoCharts", "twoWays", "whereItFlows", "whereItRubs", "howYouTalk", "lensOne", "lensTwo", "whatToPractise", "links"]);
  assert.equal(PAIR_ALL_SECTIONS.length, 11);
  assert.equal(PAIR_ALL_SECTIONS[0].key, "pair:foundation");
  assert.equal(PAIR_CHAPTER_IDS.length, 9);
  assert.equal(PAIR_PROMPT_VERSION, "p1");
  for (const s of PAIR_SECTIONS) assert.ok(s.key.startsWith("pair:"), s.key);
  assert.equal(pairSectionById("links")?.chapter, 0);
  assert.deepEqual(PAIR_CHAPTER_IDS.map((id) => pairSectionById(id)!.chapter), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("registry: the nine chapters' bands sum 3,000-4,500, the link cards are measured per card", () => {
  const chapters = PAIR_CHAPTER_IDS.map((id) => PAIR_WORD_TARGETS[id]);
  const min = chapters.reduce((n, [a]) => n + a, 0);
  const max = chapters.reduce((n, [, b]) => n + b, 0);
  assert.ok(min >= 3000 && max <= 4500, `bands ${min}-${max} leave the 3,000-4,500 range`);
  assert.deepEqual(PAIR_WORD_TARGETS.links, [0, 0]);
});

test("lens: chapters 07 and 08 take their titles from the lens, and the register is the lens's", () => {
  assert.equal(pairChapterTitle("lensOne", "partners"), "Love and closeness");
  assert.equal(pairChapterTitle("lensOne", "parent_child"), "What this child needs");
  assert.equal(pairChapterTitle("lensOne", "family"), "Being family");
  assert.equal(pairChapterTitle("lensTwo", "partners"), "Building a life");
  assert.equal(pairChapterTitle("lensTwo", "parent_child"), "How you parent them");
  assert.equal(pairChapterTitle("lensTwo", "family"), "Gatherings, gifts and hard talks");
  assert.equal(pairChapterTitle("howYouMeet", "family"), "How you meet");
  for (const lens of LENSES) {
    const ctx = lensContext(pair(lens));
    for (const example of LENS_REGISTER[lens].examples) assert.ok(ctx.includes(example), `${lens}: ${example}`);
  }
  const parentChild = buildPairBrief({
    lens: "parent_child", parent: "B",
    a: { name: "Marie Curie", chart: chartFromFixture("marie-curie"), interpretation: curieReport },
    b: { name: "Oprah Winfrey", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
  });
  assert.match(lensContext(parentChild), /Oprah Winfrey is the parent and Marie Curie is the child/);
  assert.match(lensContext(parentChild), /potential, never a verdict/);
  assert.match(parentChild.text, /Oprah Winfrey is the parent/);
});

test("no score, rating or percentage is asked for anywhere in any pair prompt", () => {
  const texts = [PAIR_SYSTEM, PAIR_DOCTRINE, PAIR_CLAIMS_CONTRACT, ...PAIR_ALL_SECTIONS.map((s) => s.instructions)];
  for (const t of texts) {
    // The doctrine may forbid a score; no prompt may ask for one.
    const asks = t.split(/[.\n]/).filter((line) => /\b(score|rating|percent|out of ten|\/10)\b/i.test(line) && !/\b(no|never|not)\b/i.test(line));
    assert.deepEqual(asks, [], asks.join(" | "));
  }
  assert.match(PAIR_DOCTRINE, /No score, no number, no rating, no percentage/);
  assert.match(PAIR_SYSTEM, /STYLE CONTRACT/);
  assert.ok(PAIR_SYSTEM.includes(STYLE_CONTRACT));
  assert.match(PAIR_SYSTEM, /potential, never a verdict/);
});

test("schemas: strict JSON schema closes every object; every chapter but links carries claims", () => {
  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`));
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (o.type === "object") {
      assert.equal(o.additionalProperties, false, `${path} not closed`);
      assert.deepEqual(o.required, Object.keys(o.properties as object), `${path} required != all keys`);
    }
    for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
  };
  for (const s of PAIR_ALL_SECTIONS) walk(toStrictJsonSchema(s.schema), s.key);
  for (const s of PAIR_SECTIONS) assert.equal(pairHasClaims(s), s.key !== "pair:links", s.key);
  for (const s of PAIR_SECTIONS) assert.equal(s.schema.safeParse({}).success, false, `${s.key} accepted {}`);
});

const reading = (bodies: string) => `${bodies} meet in the small hours, when one wants the talk finished and the other wants it opened. The weekend plan gets made twice, once out loud and once in private, and the private one wins. Behaviour check: notice who books the table this week.`;

test("links: one card per listed link, 40 to 70 words, a behaviour check, and never a third body", () => {
  const brief = pair();
  const spec = pairSectionById("links")!;
  const list = linkList(brief);
  assert.ok(list.length >= 5, `links: ${list.length}`);
  assert.match(spec.extraContext!(brief), /CARDS TO WRITE/);
  const first = brief.cross[0];
  const card = (over: Partial<{ reading: string; planetA: string; planetB: string; aspect: string; orb: number; kind: string }> = {}) => ({
    kind: first.type === "square" || first.type === "opposition" ? "rubs" : "flows",
    planetA: first.planetA, planetB: first.planetB, aspect: first.type, orb: first.orb,
    planet: "", of: "none", house: 0,
    reading: reading("Your two"),
    ...over,
  });
  const full = { links: list.map((l, i) => {
    if (l.startsWith("overlay")) {
      const m = l.match(/overlay: (A|B) (\w[\w ]*) in (A|B)'s (\d+)/)!;
      const body = m[2].toLowerCase().replace(" ", "_");
      return { kind: "overlay", planetA: "", planetB: "", aspect: "", orb: 0, planet: body, of: m[1], house: Number(m[4]), reading: reading(`Your ${m[2]} and the house it lands in`) };
    }
    const c = brief.cross[i];
    return card({ planetA: c.planetA, planetB: c.planetB, aspect: c.type, orb: c.orb, kind: c.type === "square" || c.type === "opposition" ? "rubs" : "flows" });
  }) };
  assert.deepEqual(spec.validate!(full as never, brief), []);

  const third = { links: full.links.map((l, i) => (i === 0 ? { ...l, reading: reading("Your Saturn and their Chiron") } : l)) };
  const errors = spec.validate!(third as never, brief);
  assert.ok(errors.some((e) => /names (Saturn|Chiron), which is not one of its two bodies/.test(e)), errors.join("\n"));

  const short = { links: full.links.map((l, i) => (i === 0 ? { ...l, reading: "Too short. Behaviour check: no." } : l)) };
  assert.ok(spec.validate!(short as never, brief).some((e) => /words, the card takes 40 to 70/.test(e)));
  const noCheck = { links: full.links.map((l, i) => (i === 0 ? { ...l, reading: reading("Your two").replace("Behaviour check:", "Try this:") } : l)) };
  assert.ok(spec.validate!(noCheck as never, brief).some((e) => /Behaviour check/.test(e)));
  const rated = { links: full.links.map((l, i) => (i === 0 ? { ...l, reading: reading("Your two").replace("the private one wins", "this scores 8/10") } : l)) };
  assert.ok(spec.validate!(rated as never, brief).some((e) => /mark out of ten|rating/.test(e)));
});

test("claims: a source that does not resolve is rejected, naming the report and the section", () => {
  const brief = pair();
  const section = { headline: "You read a room before you speak in it.", passages: [], claims: [] };
  const errors = validatePairClaims(section, [
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "source", report: "B", section: "career", claim: 9 }] },
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "source", report: "A", section: "houses", claim: 1 }] },
  ], brief);
  assert.equal(errors.length, 2, errors.join("\n"));
  assert.match(errors[0], /report B \(Oprah Winfrey\) has no claim 9 in career/);
  assert.match(errors[1], /report A \(Marie Curie\) has no claim 1 in houses/);
  const ok = validatePairClaims(section, [
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "source", report: "A", section: "overview", claim: 1 }] },
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "cross", planetA: brief.cross[0].planetA, planetB: brief.cross[0].planetB, aspect: brief.cross[0].type, orb: brief.cross[0].orb }] },
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "cross", planet: "sun", of: "A", inHouseOf: "B", house: 12 }] },
  ], brief);
  assert.deepEqual(ok, []);
  const wrong = validatePairClaims(section, [
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "cross", planet: "sun", of: "A", inHouseOf: "B", house: 3 }] },
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "cross", planetA: "sun", planetB: "sun", aspect: "trine", orb: 1 }] },
  ], brief);
  assert.match(wrong[0], /falls in B's 12th, not the 3rd/);
  assert.match(wrong[1], /no A sun trine B sun within orb/);
});

test("chapter validator: a natal passage names its report, and a house is never named across a blind pair", () => {
  const blind = calculateNatalChart("1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720);
  const brief = buildPairBrief({
    lens: "family",
    a: { name: "Marie Curie", chart: blind, interpretation: curieReport },
    b: { name: "Oprah Winfrey", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
  });
  assert.equal(brief.blind, true);
  const spec = pairSectionById("howYouMeet")!;
  const out = {
    headline: "You meet at the door and stay there.",
    passages: [
      { text: "You meet at the door and stay there.", source: "new", of: "both" },
      { text: "One of you lands in the other's 7th house.", source: "natal", of: "both" },
    ],
    claims: [1, 2, 3].map(() => ({ quote: "You meet at the door and stay there.", evidence: [{ kind: "cross", planetA: brief.cross[0].planetA, planetB: brief.cross[0].planetB, aspect: brief.cross[0].type, orb: brief.cross[0].orb }] })),
  };
  const errors = spec.validate!(out as never, brief);
  assert.ok(errors.some((e) => /natal passage reads from A or B/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /house is named although a chart has no horizon/.test(e)), errors.join("\n"));
});
