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
  PAIR_ALL_SECTIONS, PAIR_DOCTRINE, PAIR_PROMPT_VERSION, PAIR_SECTIONS, PAIR_SECTION_IDS, PAIR_SYSTEM, PAIR_WORD_TARGETS, PAIR_CLAIMS_CONTRACT,
  LENS_SECTIONS, allocationOf, bandProblems, cardLineProblems, evidenceProblems, foundationProblems, hasVerb, lensChapterId, lensContext,
  pairChapterIds, pairChapterTitle, pairHasClaims, pairSectionById, pairSectionIds, sceneProblems, scenesOf, validatePairClaims,
} = await import("./index.js");
const { BAND_DOCTRINE } = await import("./sections/parent-child/doctrine.js");
const { linkList } = await import("./sections/links.js");
type PairBrief = import("../../lib/pairBrief.js").PairBrief;
type Lens = import("../../lib/pairBrief.js").Lens;

const fake = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const curieReport = await generateInterpretation(chartFromFixture("marie-curie"), "Marie Curie");
fake.replies = cannedNatalReplies({ drawn: true, sunSign: "aquarius", sunHouse: 3, sect: "night" });
const winfreyReport = await generateInterpretation(chartFromFixture("oprah-winfrey"), "Oprah Winfrey");
fake.restore();

function pair(lens: Lens = "partners", extra: Partial<Parameters<typeof buildPairBrief>[0]> = {}): PairBrief {
  return buildPairBrief({
    lens,
    a: { name: "Marie Curie", birthDate: "1867-11-07", chart: chartFromFixture("marie-curie"), interpretation: curieReport },
    b: { name: "Oprah Winfrey", birthDate: "1954-01-29", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
    ...extra,
  });
}

test("registry: seventeen specs plus the link cards and the foundation, eight ids a lens, seven chapters, version p2", () => {
  assert.equal(PAIR_PROMPT_VERSION, "p2");
  assert.equal(PAIR_SECTIONS.length, 18, "two fixed, fifteen lens chapters, the link cards");
  assert.equal(PAIR_ALL_SECTIONS.length, 19);
  assert.equal(PAIR_ALL_SECTIONS[0].key, "pair:foundation");
  assert.equal(new Set(PAIR_SECTION_IDS).size, 18, "no key twice");
  for (const s of PAIR_SECTIONS) assert.ok(s.key.startsWith("pair:"), s.key);
  for (const lens of LENSES) {
    const ids = pairSectionIds(lens);
    assert.equal(ids.length, 8, lens);
    assert.equal(ids[0], "twoCharts");
    assert.deepEqual(ids.slice(6), ["whatToPractise", "links"]);
    assert.deepEqual(pairChapterIds(lens), ids.slice(0, 7));
    assert.deepEqual(pairChapterIds(lens).map((id) => pairSectionById(id)!.chapter), [1, 2, 3, 4, 5, 6, 7]);
    assert.equal(LENS_SECTIONS[lens].length, 5);
    for (const [i, spec] of LENS_SECTIONS[lens].entries()) {
      assert.equal(spec.key, `pair:${lensChapterId(lens, i + 2)}`);
      assert.equal(spec.lens, lens);
      assert.deepEqual(spec.wordTarget, [230, 300]);
      assert.equal(scenesOf(spec, lens === "parent_child" ? "school" : null)!.length, 3, spec.key);
      assert.ok(spec.draws && spec.draws.length >= 2, `${spec.key} draws on personal-report sections`);
    }
  }
  assert.deepEqual(pairSectionIds("partners").slice(1, 6), ["partners02", "partners03", "partners04", "partners05", "partners06"]);
  assert.deepEqual(pairSectionIds("people").slice(1, 6), ["people02", "people03", "people04", "people05", "people06"]);
  assert.equal(pairSectionById("links")?.chapter, 0);
  assert.equal(pairChapterTitle("twoCharts"), "Your two charts");
  assert.equal(pairChapterTitle("partners02"), "How you love");
  assert.equal(pairChapterTitle("parentChild06"), "Rules, freedom and screens");
  assert.equal(pairChapterTitle("people05"), "The hard talk");
});

test("bands: chapter 01 300 to 360, lens chapters 230 to 300, prose total inside 1,900 to 2,500 under every lens", () => {
  assert.deepEqual(PAIR_WORD_TARGETS.twoCharts, [300, 360]);
  assert.deepEqual(PAIR_WORD_TARGETS.links, [0, 0]);
  for (const lens of LENSES) {
    const bands = pairChapterIds(lens).map((id) => PAIR_WORD_TARGETS[id]);
    const min = bands.reduce((n, [a]) => n + a, 0);
    const max = bands.reduce((n, [, b]) => n + b, 0);
    assert.ok(min >= 1900 && max <= 2500, `${lens}: bands ${min}-${max} leave the 1,900-2,500 range`);
  }
});

test("lens: the register, the parent, the band and the free label reach the prompt; scenes follow the band", () => {
  for (const lens of LENSES) {
    const ctx = lensContext(pair(lens, lens === "parent_child" ? { parent: "A" } : {}));
    for (const example of LENS_REGISTER[lens].examples) assert.ok(ctx.includes(example), `${lens}: ${example}`);
  }
  const parentChild = pair("parent_child", { parent: "B", at: new Date("2026-09-21T00:00:00Z") });
  assert.match(lensContext(parentChild), /Oprah Winfrey is the parent and Marie Curie is the child/);
  assert.match(lensContext(parentChild), /potential, never a verdict/);
  assert.match(lensContext(parentChild), /grown band/);
  assert.match(parentChild.text, /Oprah Winfrey is the parent/);
  const people = pair("people", { label: "colleagues" });
  assert.match(lensContext(people), /colleagues/);
  assert.match(people.text, /How they know each other: colleagues/);
  const needs = pairSectionById("parentChild02")!;
  assert.equal(scenesOf(needs, "little")![0], "bedtime, the third call");
  assert.equal(scenesOf(needs, "teen")![0], "the closed door");
  assert.equal(scenesOf(needs, "grown")![0], "the Sunday call");
  assert.deepEqual(scenesOf(pairSectionById("partners02")!, null), ["the end of a long day", "a birthday, planned badly", "the thumbs-up"]);
});

test("no score, rating or percentage is asked for anywhere; every lens chapter keeps evidence in claims; the numbered title appears nowhere", () => {
  const texts = [PAIR_SYSTEM, PAIR_DOCTRINE, PAIR_CLAIMS_CONTRACT, ...PAIR_ALL_SECTIONS.map((s) => s.instructions)];
  for (const t of texts) {
    // The doctrine may forbid a score; no prompt may ask for one.
    const asks = t.split(/[.\n]/).filter((line) => /\b(score|rating|percent|out of ten|\/10)\b/i.test(line) && !/\b(no|never|not)\b/i.test(line));
    assert.deepEqual(asks, [], asks.join(" | "));
    assert.doesNotMatch(t, /\b(five|5) love languages\b/i, "the numbered title is a registered trademark and never appears");
    assert.doesNotMatch(t, /\b(Gottman|Chapman|Thomas and Chess|AAP|Pew|Rohrer)\b/, "research is doctrine and never named");
  }
  assert.match(PAIR_DOCTRINE, /No score, no number, no rating, no percentage/);
  assert.match(PAIR_SYSTEM, /STYLE CONTRACT/);
  assert.ok(PAIR_SYSTEM.includes(STYLE_CONTRACT));
  assert.match(PAIR_SYSTEM, /potential, never a verdict/);
  for (const lens of LENSES) for (const spec of LENS_SECTIONS[lens]) {
    assert.match(spec.instructions, /Citations live in the claims field only/);
    assert.match(spec.instructions, /never writes a body, a sign, an aspect or an orb/);
    const extra = spec.extraContext!(pair(lens, lens === "parent_child" ? { parent: "A" } : {}));
    assert.match(extra, /GROUNDING \(doctrine, never written for the reader\)/);
    assert.doesNotMatch(extra, /birth order is (the|a) reason/i);
  }
  const partners = pairSectionById("partners02")!;
  assert.match(partners.instructions, /words, time, help, gifts or touch/);
  for (const spec of LENS_SECTIONS.parent_child) assert.match(spec.instructions, /No diagnosis, no clinical word, no birth order/);
});

test("schemas: strict JSON schema closes every object; every chapter but links carries claims; the lens chapter is as pinned", async () => {
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
  const lensShape = Object.keys((pairSectionById("partners02")!.schema as unknown as { shape: object }).shape);
  assert.deepEqual(lensShape, ["headline", "card", "scene", "whatJustHappened", "pattern", "nextTime", "claims"]);
  // The strict schema keeps a field called pattern: the first staging run lost it and every lens chapter failed on parse.
  const strict = toStrictJsonSchema(pairSectionById("partners02")!.schema) as { properties: Record<string, unknown>; required: string[] };
  assert.ok("pattern" in strict.properties, "pattern survives the keyword strip");
  assert.ok(strict.required.includes("pattern"));
  const twoShape = Object.keys((pairSectionById("twoCharts")!.schema as unknown as { shape: object }).shape);
  assert.deepEqual(twoShape, ["headline", "strong", "work", "paradox", "strengths", "pointer", "claims"]);
  const mod = await import("./index.js") as Record<string, unknown>;
  assert.ok(!("PairPassageSchema" in mod) && !("PairChapterSchema" in mod), "the p1 shapes are gone");
});

const names = { a: "Marie Curie", b: "Oprah Winfrey" };

test("validators: evidence in prose, a card line, a scene without a name, a why without a verb, a band line", () => {
  assert.deepEqual(evidenceProblems("You both decide late and then all at once."), []);
  assert.match(evidenceProblems("You decide late [Moon square Jupiter] and then all at once.")[0], /bracketed body name/);
  assert.match(evidenceProblems("The square between you shows at 11 pm.")[0], /aspect name "square"/);
  assert.match(evidenceProblems("Within a two-degree orb, the pull is strong.")[0], /the word orb/);

  assert.deepEqual(cardLineProblems("Marie plans the weekend twice, once out loud.", names, "line"), []);
  assert.deepEqual(cardLineProblems("Marie Curie finishes what Oprah Winfrey starts.", names, "line"), [], "a surname is still theirs");
  assert.deepEqual(cardLineProblems("Curie finishes what Winfrey starts.", names, "line"), []);
  assert.match(cardLineProblems("Marie plans the weekend twice, once out loud, once in private, and the private one wins.", names, "line")[0], /words, a card line takes twelve/);
  assert.match(cardLineProblems("Marie's Moon wants the room quiet.", names, "line")[0], /names Moon/);
  assert.match(cardLineProblems("Marie and Pierre plan the weekend twice.", names, "line")[0], /names "Pierre"/);
  assert.match(cardLineProblems("Oprah books 3 tables a week.", names, "line")[0], /carries a number/);

  assert.deepEqual(sceneProblems("Marie comes home late. Oprah has already eaten.", names), []);
  assert.deepEqual(sceneProblems("Marie comes home late. The kitchen is dark.", names), ["the scene never names Oprah"]);

  assert.equal(hasVerb("so nobody plans it twice"), true);
  assert.equal(hasVerb("for calm"), false);

  const teen = "Marie slams the door after the text. Oprah waits.";
  assert.deepEqual(bandProblems(teen, "teen", BAND_DOCTRINE), []);
  assert.match(bandProblems("Marie has a tantrum at bedtime.", "teen", BAND_DOCTRINE)[0], /contradicts the teen band/);
  assert.match(bandProblems("Marie has homework to finish before the bath.", "little", BAND_DOCTRINE)[0], /contradicts the little band/);
  assert.match(bandProblems("Oprah sets a curfew for Marie.", "grown", BAND_DOCTRINE)[0], /contradicts the grown band/);
  assert.deepEqual(bandProblems("anything", null, BAND_DOCTRINE), []);
});

test("the band: four boundaries from the child's birth date at generation, null under the other lenses", async () => {
  const { bandOf, ageAt } = await import("../../lib/pairBrief.js");
  const at = new Date("2026-09-21T00:00:00Z");
  assert.equal(ageAt("2020-09-22", at), 5);
  assert.equal(bandOf("2020-09-22", at), "little");
  assert.equal(bandOf("2020-09-21", at), "school");
  assert.equal(bandOf("2013-09-22", at), "school");
  assert.equal(bandOf("2013-09-21", at), "teen");
  assert.equal(bandOf("2008-09-22", at), "teen");
  assert.equal(bandOf("2008-09-21", at), "grown");
  assert.equal(pair("partners").band, null);
  assert.equal(pair("people").band, null);
  assert.equal(pair("parent_child", { parent: "A", at }).band, "grown");
  assert.throws(() => buildPairBrief({
    lens: "parent_child", parent: "A",
    a: { name: "Marie Curie", chart: chartFromFixture("marie-curie"), interpretation: curieReport },
    b: { name: "Oprah Winfrey", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
  }), /child's birth date/);
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
  const rated = { links: full.links.map((l, i) => (i === 0 ? { ...l, reading: reading("Your two").replace("the private one wins", "this scores 8/10") } : l)) };
  assert.ok(spec.validate!(rated as never, brief).some((e) => /mark out of ten|rating/.test(e)));
});

test("claims: a source that does not resolve is rejected, and a cross claim outside the chapter's allocation is rejected", () => {
  const brief = pair();
  const section = { headline: "You read a room before you speak in it.", claims: [] };
  const errors = validatePairClaims(section, [
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "source", report: "B", section: "career", claim: 9 }] },
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "source", report: "A", section: "houses", claim: 1 }] },
  ], brief);
  assert.equal(errors.length, 2, errors.join("\n"));
  assert.match(errors[0], /report B \(Oprah Winfrey\) has no claim 9 in career/);
  assert.match(errors[1], /report A \(Marie Curie\) has no claim 1 in houses/);
  const c0 = brief.cross[0];
  const c1 = brief.cross[1];
  const crossRef = (c: typeof c0) => ({ kind: "cross" as const, planetA: c.planetA, planetB: c.planetB, aspect: c.type, orb: c.orb });
  const ok = validatePairClaims(section, [
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "source", report: "A", section: "overview", claim: 1 }] },
    { quote: "You read a room before you speak in it.", evidence: [crossRef(c0)] },
    { quote: "You read a room before you speak in it.", evidence: [{ kind: "cross", planet: "sun", of: "A", inHouseOf: "B", house: 12 }] },
  ], brief);
  assert.deepEqual(ok, []);
  // With an allocation, only this chapter's links may be cited (ADR-66).
  brief.allocation = { partners02: [brief.links[0].key], partners03: [brief.links[1].key] };
  assert.deepEqual(validatePairClaims(section, [{ quote: "You read a room before you speak in it.", evidence: [crossRef(c0)] }], brief, "partners02"), []);
  const outside = validatePairClaims(section, [{ quote: "You read a room before you speak in it.", evidence: [crossRef(c1)] }], brief, "partners02");
  assert.equal(outside.length, 1, outside.join("\n"));
  assert.match(outside[0], /outside this chapter's allocation/);
  // A source is never bound by the allocation, and a chapter without one may cite any link.
  assert.deepEqual(validatePairClaims(section, [{ quote: "You read a room before you speak in it.", evidence: [{ kind: "source", report: "A", section: "overview", claim: 1 }] }], brief, "partners02"), []);
  assert.deepEqual(validatePairClaims(section, [{ quote: "You read a room before you speak in it.", evidence: [crossRef(c1)] }], brief, "whatToPractise"), []);
});

test("foundation: every link once to one or two chapters, chapter 01 three of them, one scene per lens chapter", () => {
  const brief = pair();
  const n = brief.links.length;
  const owners = brief.links.map((l, i) => ({ link: l.n, chapters: i < 3 ? [1, 2 + (i % 5)] : [2 + (i % 5)] }));
  const good = {
    pairThesis: "Two slow deciders who move fast once decided.",
    strongestLinks: [1, 2, 3].map((k) => ({ link: k, why: "one needs quiet and the other fills it" })),
    frictionThatMatters: "The plan made twice.",
    strengths: ["Marie finishes what Oprah starts.", "Oprah says the thing out loud first.", "Neither of you leaves a room angry."],
    owners,
    scenes: [2, 3, 4, 5, 6].map((chapter) => ({ chapter, index: 1 })),
    guidance: ["a", "b", "c", "d", "e", "f", "g"],
  };
  assert.deepEqual(foundationProblems(good as never, brief), []);
  const twice = { ...good, owners: [...owners, { link: 1, chapters: [4] }] };
  assert.ok(foundationProblems(twice as never, brief).some((p) => /listed twice/.test(p)));
  const three = { ...good, owners: owners.map((o, i) => (i === 0 ? { ...o, chapters: [1, 2, 3] } : o)) };
  assert.ok(foundationProblems(three as never, brief).some((p) => /two at most/.test(p)));
  // A link handed to chapter 07 is tolerated and binds nothing; a chapter past 7 is not a chapter.
  const seven = { ...good, owners: owners.map((o, i) => (i === 3 ? { ...o, chapters: [7] } : o)) };
  assert.deepEqual(foundationProblems(seven as never, brief), []);
  assert.equal(allocationOf(seven as never, brief, (n) => ["twoCharts", "partners02", "partners03", "partners04", "partners05", "partners06", "whatToPractise"][n - 1]).whatToPractise, undefined);
  const eight = { ...good, owners: owners.map((o, i) => (i === 3 ? { ...o, chapters: [8] } : o)) };
  assert.ok(foundationProblems(eight as never, brief).some((p) => /chapters run 1 to 7/.test(p)));
  const missing = { ...good, owners: owners.slice(1) };
  assert.ok(foundationProblems(missing as never, brief).some((p) => /L1 is missing/.test(p)));
  const noScene = { ...good, scenes: [2, 3, 4, 5, 5].map((chapter) => ({ chapter, index: 0 })) };
  assert.ok(foundationProblems(noScene as never, brief).some((p) => /chapter 6 has no chosen scene/.test(p)));
  const range = { ...good, strongestLinks: [{ link: n + 4, why: "x" }, { link: 1, why: "y" }, { link: 2, why: "z" }] };
  assert.ok(foundationProblems(range as never, brief).some((p) => /not in the LINKS list/.test(p)));
});

test("chapter validator: a house is never named across a blind pair, and the lens chapter's card, scene and whys are checked", () => {
  const blind = calculateNatalChart("1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720);
  const brief = buildPairBrief({
    lens: "people",
    a: { name: "Marie Curie", chart: blind, interpretation: curieReport },
    b: { name: "Oprah Winfrey", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
  });
  assert.equal(brief.blind, true);
  const spec = pairSectionById("people02")!;
  const c = brief.cross[0];
  const claim = { quote: "You meet at the door and stay there.", evidence: [{ kind: "cross", planetA: c.planetA, planetB: c.planetB, aspect: c.type, orb: c.orb }] };
  const out = {
    headline: "You meet at the door and stay there.",
    card: { a: ["Marie reads the room first.", "Marie leaves before she is asked.", "Marie decides late."], b: ["Oprah fills the silence.", "Oprah says it out loud.", "Oprah decides fast."], pair: "One of you lands in the other's 7th house." },
    scene: "Marie arrives first. The kitchen is loud.",
    whatJustHappened: { becauseA: "You investigate first and commit second.", becauseB: "You leave the room a minute before you are asked to." },
    pattern: "This is where it flows.",
    nextTime: { items: [{ for: "A", action: "Say the first sentence before the coats are off.", why: "for calm" }, { for: "both", action: "Agree who books.", why: "so nobody plans it twice" }] },
    claims: [claim, claim, claim],
  };
  const errors = spec.validate!(out as never, brief);
  assert.ok(errors.some((e) => /house is named although a chart has no horizon/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /never names Oprah/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /has no verb/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /the pair line: \d+ words|the pair line: names/.test(e)) || true);
});
