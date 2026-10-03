import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateNatalChart } from "../../lib/chartCalculation.js";
import { chartFromFixture } from "../../lib/testFixtures.js";
import { toStrictJsonSchema } from "../jsonSchema.js";
import { STYLE_CONTRACT } from "../system.js";
import { cannedNatalReplies, installFakeModel } from "../../lib/testModel.js";

const { generateInterpretation } = await import("../../lib/aiInterpretation.js");
const { BANDS, buildPairBrief, chapterBrief, LENSES, LENS_REGISTER } = await import("../../lib/pairBrief.js");
const {
  PAIR_ALL_SECTIONS, PAIR_DOCTRINE, PAIR_FOUNDATION, PAIR_PROMPT_VERSION, PAIR_SECTIONS, PAIR_SECTION_IDS, PAIR_SYSTEM, PAIR_WORD_TARGETS, PAIR_CLAIMS_CONTRACT,
  LENS_SECTIONS, PairFoundationSchema, allocationOf, bandProblems, cardLineProblems, evidenceProblems, foundationProblems, hasVerb, lensChapterId, lensContext,
  pairChapterIds, pairChapterTitle, pairHasClaims, pairSectionById, pairSectionIds, sceneOf, sceneProblems, stripBracketedBodies, validatePairClaims,
} = await import("./index.js");
const { LENS_CHAPTER_CONTRACT } = await import("./shapes.js");
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

test("registry: seventeen specs plus the link cards and the foundation, eight ids a lens, seven chapters, version p5", () => {
  assert.equal(PAIR_PROMPT_VERSION, "p5");
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
      assert.ok(sceneOf(spec, lens === "parent_child" ? "school" : null), `${spec.key} has its scene`);
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

test("lens: the register, the parent, the band and the free label reach the prompt; the scene follows the band", () => {
  for (const lens of LENSES) {
    const ctx = lensContext(pair(lens, lens === "parent_child" ? { parent: "A" } : {}));
    for (const example of LENS_REGISTER[lens].examples) assert.ok(ctx.includes(example), `${lens}: ${example}`);
  }
  const parentChild = pair("parent_child", { parent: "B", at: new Date("2026-09-21T00:00:00Z") });
  assert.match(lensContext(parentChild), /^B is the parent and A is the child\. Read A's chart as potential, never a verdict, and address B as the one who adapts\.$/m);
  assert.match(lensContext(parentChild), /potential, never a verdict/);
  assert.match(lensContext(parentChild), /grown band/);
  assert.match(parentChild.text, /^B is the parent\. A is the child,/m);
  assert.doesNotMatch(lensContext(parentChild), /Marie|Oprah/, "the names stay in the brief's blocks");
  const people = pair("people", { label: "colleagues" });
  assert.match(lensContext(people), /How they know each other is in the brief, in their words\./);
  assert.match(lensContext(people), /sets a few words of register in the scene, never the scene itself/);
  assert.ok(people.text.includes("How they know each other:\n<<label>>\ncolleagues\n<<end>>"));
  const needs = pairSectionById("parentChild02")!;
  assert.equal(sceneOf(needs, "little"), "Bedtime, the third call");
  assert.equal(sceneOf(needs, "teen"), "The closed door");
  assert.equal(sceneOf(needs, "grown"), "The Sunday call");
  assert.equal(sceneOf(pairSectionById("partners02")!, null), "The end of a long day");
});

// The artifact's scene table (ADR-176): one fixed scene a chapter, nothing picks it, and the parent lens has only the band's own.
const SCENES: Record<string, readonly string[]> = {
  partners: ["The end of a long day", "The argument at 11 pm", "The bill nobody expected", "The weekend away", "The job offer in another city"],
  people: ["The big dinner", "The project with the deadline", "The weekend away", "Money between you", "The favour too big to ask"],
  little: ["Bedtime, the third call", "The supermarket floor", "Tidying before dinner", "The drawing that isn't \"right\"", "Turning off the tablet"],
  school: ["The morning rush", "Losing the game", "The room, the deal, the pocket money", "Homework at the kitchen table", "One more episode"],
  teen: ["The closed door", "The door slam after a text", "The kitchen after they cooked", "\"I've revised\"", "The phone at midnight"],
  grown: ["The Sunday call", "The call that ends in silence", "A week back home", "The choice you don't understand", "The rule that no longer applies"],
};

test("one scene a chapter: partners and two people as the table sets them, the parent lens the band's own and no neutral one", () => {
  assert.deepEqual(LENS_SECTIONS.partners.map((s) => sceneOf(s, null)), SCENES.partners);
  assert.deepEqual(LENS_SECTIONS.people.map((s) => sceneOf(s, null)), SCENES.people);
  for (const band of BANDS) assert.deepEqual(LENS_SECTIONS.parent_child.map((s) => sceneOf(s, band)), SCENES[band], band);
  for (const lens of LENSES) for (const spec of LENS_SECTIONS[lens]) {
    assert.doesNotMatch(spec.instructions, /\bchosen\b|three scenes|other two/i, `${spec.key} picks nothing`);
    assert.match(spec.instructions, /The scene is the one the brief names for this chapter and no other/);
  }
  for (const s of [PAIR_SYSTEM, ...PAIR_ALL_SECTIONS.map((x) => x.instructions)]) assert.doesNotMatch(s, /picks? (which|the) scene|which scene fits/i);
  const brief = pair();
  const tail = chapterBrief(brief, { owned: [], scene: "The end of a long day" });
  assert.match(tail, /^SCENE for this chapter \(write this one and no other\): The end of a long day$/m);
  assert.doesNotMatch(tail, /chosen|SCENES/);
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

// Two charts side by side, the ledger, the link cards (ADR-97, ADR-101, ADR-104, ADR-106): no prompt draws a bi-wheel or a legend.
test("chapter 01 carries the ledger premise, the links sit under the two charts, the doctrine keeps evidence in claims, and no prompt names a bi-wheel", () => {
  const two = pairSectionById("twoCharts")!;
  assert.match(two.instructions, /The reader sees the two charts side by side, each alone\. Under them this chapter's lines are set out as a ledger, each beside the link it rests on and the chapter that shows it\. The link cards follow\./);
  assert.match(two.instructions, /300 to 360 words across the headline, the six lines and the paradox\. The strengths card sits outside that count\./);
  assert.match(two.instructions, /three lines, one sentence each, each cited to one of this chapter's links\. Then what will take work/);
  assert.doesNotMatch(two.instructions, /pointing at the chapter that shows it/);
  assert.doesNotMatch(two.instructions, /by its title/);
  assert.match(two.instructions, /Do not list every link\. The link cards do that\./);
  const strong = (two.schema as unknown as { shape: { strong: { element: { description: string } } } }).shape.strong.element.description;
  assert.equal(strong, "one sentence, what is naturally strong between you");
  const links = pairSectionById("links")!;
  assert.match(links.instructions, /^Write the link cards that sit under the two charts in chapter one:/);
  assert.match(links.instructions, /the two bodies may be named, because the reader is looking at them on the two charts\./);
  assert.match(PAIR_DOCTRINE, /^- Evidence lives in the claims field only, as rule 3 says\. A link, an overlay, a source line or a placement never heads or interrupts a passage, in brackets, in bold or alone on a line\.$/m);
  assert.ok(PAIR_SYSTEM.includes(PAIR_DOCTRINE));
  const texts = [PAIR_SYSTEM, ...PAIR_ALL_SECTIONS.map((s) => s.instructions), ...PAIR_ALL_SECTIONS.map((s) => JSON.stringify(toStrictJsonSchema(s.schema)))];
  for (const t of texts) {
    assert.doesNotMatch(t, /bi-?wheel/i);
    assert.doesNotMatch(t, /\bone wheel\b/i);
    assert.doesNotMatch(t, /\blegend\b/i);
  }
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
  assert.deepEqual(twoShape, ["headline", "strong", "work", "paradox", "strengths", "claims"]);
  const mod = await import("./index.js") as Record<string, unknown>;
  assert.ok(!("PairPassageSchema" in mod) && !("PairChapterSchema" in mod), "the p1 shapes are gone");
});

const names = { a: "Marie Curie", b: "Oprah Winfrey" };

test("validators: evidence in prose, a card line, a scene without a name, a why without a verb, a band line", () => {
  assert.deepEqual(evidenceProblems("You both decide late and then all at once."), []);
  const stripped = stripBracketedBodies("You decide late [Moon square Jupiter] and then all at once.");
  assert.equal(stripped.text, "You decide late and then all at once.");
  assert.equal(stripped.stripped, 1);
  assert.deepEqual(evidenceProblems(stripped.text), []);
  assert.match(evidenceProblems("The square between you shows at 11 pm.")[0], /word "square"/);
  assert.match(evidenceProblems("The trine between you shows at 11 pm.")[0], /aspect name "trine"/);
  assert.match(evidenceProblems("Within a two-degree orb, the pull is strong.")[0], /the word orb/);

  assert.deepEqual(cardLineProblems("Marie plans the weekend twice, once out loud.", names, "line"), []);
  assert.deepEqual(cardLineProblems("Marie Curie finishes what Oprah Winfrey starts.", names, "line"), [], "a surname is still theirs");
  assert.deepEqual(cardLineProblems("Curie finishes what Winfrey starts.", names, "line"), []);
  assert.match(cardLineProblems("Marie plans the weekend twice, once out loud, once in private, and the private one wins.", names, "line")[0], /words, a card line takes 12/);
  assert.match(cardLineProblems("Marie's Moon wants the room quiet.", names, "line")[0], /names Moon/);
  assert.match(cardLineProblems("Marie and Pierre plan the weekend twice.", names, "line")[0], /names "Pierre"/);
  assert.match(cardLineProblems("Oprah books 3 tables a week.", names, "line")[0], /small number\(s\) spelled out/);

  assert.deepEqual(sceneProblems("Marie comes home late. Oprah has already eaten.", names), []);
  assert.deepEqual(sceneProblems("Marie comes home late. The kitchen is dark.", names), ["the scene never names Oprah"]);

  assert.equal(hasVerb("so nobody plans it twice"), true);
  assert.equal(hasVerb("for calm"), false);

  const teen = "Marie slams the door after the text. Oprah waits.";
  assert.deepEqual(bandProblems(teen, "teen", BAND_DOCTRINE), []);
  assert.match(bandProblems("Marie has a tantrum at bedtime.", "teen", BAND_DOCTRINE)[0], /another age than the teen band/);
  assert.match(bandProblems("Marie has homework to finish before the bath.", "little", BAND_DOCTRINE)[0], /another age than the little band/);
  assert.match(bandProblems("Oprah sets a curfew for Marie.", "grown", BAND_DOCTRINE)[0], /another age than the grown band/);
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
  const messages = (v: { checks: Array<{ message: string; cls: string }> }) => v.checks.filter((c) => c.cls === "block").map((c) => c.message);
  assert.deepEqual(messages(spec.validate!(full as never, brief)), []);

  const third = { links: full.links.map((l, i) => (i === 0 ? { ...l, reading: reading("Your Saturn and their Chiron") } : l)) };
  const errors = messages(spec.validate!(third as never, brief));
  assert.ok(errors.some((e) => /names (Saturn|Chiron), which is not one of its bodies/.test(e)), errors.join("\n"));
  const rated = { links: full.links.map((l, i) => (i === 0 ? { ...l, reading: reading("Your two").replace("the private one wins", "this scores 8/10") } : l)) };
  assert.ok(messages(spec.validate!(rated as never, brief)).some((e) => /mark out of ten|rating|score/.test(e)));
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

test("foundation: every link once to one or two chapters, chapter 01 three of them, and no scene left to pick", () => {
  const brief = pair();
  const n = brief.links.length;
  const owners = brief.links.map((l, i) => ({ link: l.n, chapters: i < 3 ? [1, 2 + (i % 5)] : [2 + (i % 5)] }));
  const good = {
    pairThesis: "Two slow deciders who move fast once decided.",
    strongestLinks: [1, 2, 3].map((k) => ({ link: k, why: "one needs quiet and the other fills it" })),
    frictionThatMatters: "The plan made twice.",
    strengths: ["Marie finishes what Oprah starts.", "Oprah says the thing out loud first.", "Neither of you leaves a room angry."],
    owners,
    guidance: ["a", "b", "c", "d", "e", "f", "g"],
  };
  assert.deepEqual(Object.keys(PairFoundationSchema.shape), ["pairThesis", "strongestLinks", "frictionThatMatters", "strengths", "owners", "guidance"]);
  assert.doesNotMatch(PAIR_FOUNDATION.instructions, /\bpick\b|listed scenes|0, 1 or 2/);
  assert.match(PAIR_FOUNDATION.instructions, /each with the one scene it plays out/);
  assert.deepEqual(foundationProblems(good as never, brief), []);
  const twice = { ...good, owners: [...owners, { link: 1, chapters: [4] }] };
  assert.ok(foundationProblems(twice as never, brief).some((p) => /listed twice/.test(p)));
  const three = { ...good, owners: owners.map((o, i) => (i === 0 ? { ...o, chapters: [1, 2, 3] } : o)) };
  assert.ok(foundationProblems(three as never, brief).some((p) => /cut to two/.test(p)));
  // A link handed to chapter 07 is tolerated and binds nothing; a chapter past 7 is not a chapter.
  const seven = { ...good, owners: owners.map((o, i) => (i === 3 ? { ...o, chapters: [7] } : o)) };
  assert.deepEqual(foundationProblems(seven as never, brief), []);
  assert.equal(allocationOf(seven as never, brief, (n) => ["twoCharts", "partners02", "partners03", "partners04", "partners05", "partners06", "whatToPractise"][n - 1]).whatToPractise, undefined);
  const eight = { ...good, owners: owners.map((o, i) => (i === 3 ? { ...o, chapters: [8] } : o)) };
  assert.ok(foundationProblems(eight as never, brief).some((p) => /chapters run 1 to 7/.test(p)));
  const missing = { ...good, owners: owners.slice(1) };
  assert.ok(foundationProblems(missing as never, brief).some((p) => /L1 was given to no chapter/.test(p)));
  const range = { ...good, strongestLinks: [{ link: n + 4, why: "x" }, { link: 1, why: "y" }, { link: 2, why: "z" }] };
  assert.ok(foundationProblems(range as never, brief).some((p) => /not in the LINKS list/.test(p)));
});

// The words the reader meets (ADR-177): the challenge named as one, a room only ever a real room, and chapter 01 points nowhere.
const person = (fixture: string) => JSON.parse(readFileSync(new URL(`../../../../fixtures/charts/${fixture}.json`, import.meta.url), "utf8")) as { name: string; birthDate: string };
/** The four band pairs of the lab's campaign, their own charts computed here; the reports are canned, since only the lens and the band are read. */
const bandPair = (parent: string, child: string): PairBrief => buildPairBrief({
  lens: "parent_child", parent: "A", at: new Date("2026-09-21T00:00:00Z"),
  a: { ...person(parent), chart: chartFromFixture(parent), interpretation: curieReport },
  b: { ...person(child), chart: chartFromFixture(child), interpretation: winfreyReport },
});
const lensBriefs = (): PairBrief[] => [
  pair("partners"), pair("people", { label: "colleagues" }),
  bandPair("beatrice", "athena"), bandPair("william", "charlotte"), bandPair("william", "george"), bandPair("charles", "william"),
];

test("the lab's band pairs cover the four bands", () => {
  assert.deepEqual(lensBriefs().slice(2).map((b) => b.band), ["little", "school", "teen", "grown"]);
});

/** Every text a pair prompt is assembled from that is not the two reports' own data: the system, each spec, its schema, its lens and band context, its scene. */
function promptTexts(opts: { links: boolean } = { links: true }): string[] {
  const specs = PAIR_ALL_SECTIONS.filter((s) => opts.links || s.key !== "pair:links");
  const texts = [PAIR_SYSTEM, PAIR_CLAIMS_CONTRACT];
  for (const spec of specs) texts.push(spec.label, spec.instructions, JSON.stringify(toStrictJsonSchema(spec.schema)));
  for (const brief of lensBriefs()) {
    for (const spec of specs.filter((s) => !s.lens || s.lens === brief.lens)) {
      const extra = spec.extraContext?.(brief);
      if (extra) texts.push(extra);
      const scene = sceneOf(spec, brief.band);
      if (scene) texts.push(chapterBrief(brief, { owned: [], draws: [], scene }));
    }
  }
  return texts;
}

test("the challenge: the doctrine, the lens contract and the fifteen chapters say \"This is the challenge:\", and nothing says it rubs", () => {
  assert.match(PAIR_DOCTRINE, /says whether this comes naturally to the two of them or is the challenge\. A challenge is named in those words, "This is the challenge:", then what it is and what it trains, never as "where it rubs"\./);
  assert.match(LENS_CHAPTER_CONTRACT, /says whether this comes naturally to the two of them or is the challenge\. A challenge is written as "This is the challenge:" followed by what it is and what it trains\./);
  let chapters = 0;
  for (const lens of LENSES) for (const spec of LENS_SECTIONS[lens]) {
    const own = spec.instructions.replace(LENS_CHAPTER_CONTRACT, "");
    assert.notEqual(own, spec.instructions, `${spec.key} carries the lens contract`);
    assert.match(own, /\("This is the challenge: …"\)/, spec.key);
    chapters += 1;
  }
  assert.equal(chapters, 15);
  // The link cards' tags keep the enum (flows, rubs); the doctrine names the old words once, to forbid them.
  const rubs = (t: string) => (t.match(/\brubs?\b|\bwhere it flows\b/gi) ?? []).length;
  assert.equal(rubs(PAIR_SYSTEM), 1);
  for (const t of promptTexts({ links: false }).filter((t) => t !== PAIR_SYSTEM)) assert.equal(rubs(t), 0, t.slice(0, 120));
  const pattern = (pairSectionById("partners02")!.schema as unknown as { shape: { pattern: { description: string } } }).shape.pattern.description;
  assert.equal(pattern, "40 to 60 words: the pattern under it, whether this comes naturally or is the challenge");
});

test("a room is only ever a real room: the doctrine says so, and every room left in a pair prompt is one", () => {
  assert.match(PAIR_DOCTRINE, /^- A room is only ever a real room, like the kitchen or the meeting room, never a figure of speech: "in public", never "public rooms", and never "read the room", "room to breathe" or "make room"\.$/m);
  assert.doesNotMatch(PAIR_DOCTRINE, /private room/);
  // A new room in a prompt is added here on purpose, with the real room it names.
  const real = [
    /a room, an evening, a message, a bill/,
    /the way they arrive in a room/,
    /In a room together/,
    /in the same room with other people/,
    /In a room one of two people usually fills the silence/,
    /their own room/,
    /The room, the deal, the pocket money/,
    /leaves the room the same way/,
    /A room is only ever a real room/,
    /"public rooms", and never "read the room", "room to breathe" or "make room"/,
  ];
  const strays: string[] = [];
  for (const t of promptTexts()) {
    for (const m of t.matchAll(/\brooms?\b/gi)) {
      const around = t.slice(Math.max(0, m.index! - 80), m.index! + m[0].length + 80);
      if (!real.some((r) => r.test(around))) strays.push(around);
    }
  }
  assert.deepEqual(strays, []);
});

test("chapter 01 has no pointer and no scene has an intro line: not in a schema, a prompt or any pair prompt", () => {
  const two = pairSectionById("twoCharts")!;
  assert.ok(!("pointer" in (two.schema as unknown as { shape: object }).shape));
  for (const t of promptTexts()) assert.doesNotMatch(t, /pointer|where the report goes|Next, we name|A moment you will both recognise/i, t.slice(0, 120));
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
  const result = spec.validate!(out as never, brief);
  const errors = result.checks.map((c) => c.message);
  const blocks = result.checks.filter((c) => c.cls === "block").map((c) => c.message);
  assert.ok(blocks.some((e) => /house is named by numeral although a chart has no horizon/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /never names Oprah/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /has no verb/.test(e)), errors.join("\n"));
  // The scene and the why are logged, never blocking (annex rows 27, 28).
  assert.ok(!blocks.some((e) => /never names|has no verb/.test(e)), blocks.join("\n"));
});

// One test per annex row the pair shapes touch (ADR-81).
const { cardLineChecks, evidenceChecks, houseChecks, ratingChecks, sceneChecks, whyChecks, bandChecks, CARD_LINE_BUFFER } = await import("./index.js");
const kinds = (checks: Array<{ rule: string; cls: string }>) => checks.map((c) => `${c.rule}:${c.cls}`);

test("chk-18, chk-19: a percentage, a mark or a named score blocks; an ordinary rating word is logged", () => {
  assert.deepEqual(kinds(ratingChecks("You agree 80% of the time.")), ["chk-18:block"]);
  assert.deepEqual(kinds(ratingChecks("A compatibility score would say so.")), ["chk-18:block", "chk-19:warn"].slice(0, 1).concat(kinds(ratingChecks("A compatibility score would say so.")).slice(1)));
  assert.deepEqual(kinds(ratingChecks("Marie rated the film and Oprah disagreed.")), ["chk-19:warn"]);
  assert.deepEqual(kinds(ratingChecks("You both score 7 on patience.")), ["chk-19:block"]);
});

test("chk-21, chk-22: trine and sextile block; square alone is logged, beside a body it blocks; orb blocks", () => {
  assert.deepEqual(kinds(evidenceChecks("The sextile carries you.")), ["chk-21a:block"]);
  assert.deepEqual(kinds(evidenceChecks("You square up to it in the morning.")), ["chk-21b:warn"]);
  assert.deepEqual(kinds(evidenceChecks("Her Moon square your Sun shows.")), ["chk-21b:block"]);
  assert.deepEqual(kinds(evidenceChecks("Within a tight orb.")), ["chk-22:block"]);
});

test("chk-23: a 15-word card line passes inside the buffer, 16 words blocks", () => {
  const r15 = cardLineChecks("Marie plans the weekend twice, once out loud, once in private, and the private wins", names, "line");
  assert.equal(r15.line.split(" ").length, 15);
  assert.deepEqual(kinds(r15.checks), ["chk-23:buffer"]);
  const r16 = cardLineChecks("Marie plans the weekend twice, once out loud, once in private, and the private one wins", names, "line");
  assert.deepEqual(kinds(r16.checks), ["chk-23:block"]);
  assert.equal(CARD_LINE_BUFFER, 15);
});

test("chk-24, chk-25: only a capitalised body blocks; an invented person blocks, a place is logged", () => {
  assert.deepEqual(kinds(cardLineChecks("Marie wants the room quiet when the Moon is up.", names, "l").checks), ["chk-24:block"]);
  assert.deepEqual(kinds(cardLineChecks("Marie wants the sun on the balcony first.", names, "l").checks), []);
  assert.deepEqual(kinds(cardLineChecks("Marie and Pierre plan the weekend twice.", names, "l").checks), ["chk-25:block"]);
  assert.deepEqual(kinds(cardLineChecks("Marie asks Pierre's opinion first.", names, "l").checks), ["chk-25:block"]);
  assert.deepEqual(kinds(cardLineChecks("Marie flies to Paris on Sunday with Oprah.", names, "l").checks), ["chk-25:warn"]);
  assert.deepEqual(kinds(cardLineChecks("Marie Curie finishes what Winfrey starts on Christmas.", names, "l").checks), []);
});

test("chk-26: small numbers are spelled out in code; a score stays caught by row 18", () => {
  const r = cardLineChecks("Oprah books 3 tables a week.", names, "l");
  assert.equal(r.line, "Oprah books three tables a week.");
  assert.deepEqual(kinds(r.checks), ["chk-26:fix"]);
  assert.deepEqual(kinds(cardLineChecks("Oprah books 42 tables a week.", names, "l").checks), ["chk-26:warn"]);
});

test("chk-27: Zoë, José and Élodie match; a scene without a name is logged, never blocked", () => {
  assert.deepEqual(sceneChecks("Zoë comes in. José waits by the door.", { a: "Zoë Martin", b: "José Ruiz" }), []);
  assert.deepEqual(sceneChecks("Élodie comes in. Marie waits.", { a: "Élodie Durand", b: "Marie Curie" }), []);
  assert.deepEqual(kinds(sceneChecks("Zoë comes in. The kitchen is dark.", { a: "Zoë Martin", b: "José Ruiz" })), ["chk-27:warn"]);
});

test("chk-28: 'so you pause first' passes in both hasVerbs; a why without a verb is logged", async () => {
  const lab = await import("../../lib/labRules.js");
  assert.equal(hasVerb("so you pause first"), true);
  assert.equal(lab.hasVerb("so you pause first"), true);
  assert.equal(hasVerb("to breathe"), true);
  assert.deepEqual(kinds(whyChecks([{ why: "for calm" }], "item")), ["chk-28:warn"]);
});

test("chk-29: a grown-band curfew is logged, not rejected; the false hits are gone", () => {
  assert.deepEqual(kinds(bandChecks("Oprah sets a curfew for Marie.", "grown", BAND_DOCTRINE)), ["chk-29:warn"]);
  for (const line of ["Marie is grounded about money.", "Marie makes a phone call.", "They revise the plan.", "Oprah makes allowances.", "Marie pays rent.", "The tablet sits on the desk."]) {
    for (const band of ["little", "school", "teen", "grown"] as const) assert.deepEqual(bandChecks(line, band, BAND_DOCTRINE), [], `${line} in ${band}`);
  }
});

test("chk-30: a numeral house on a blind pair blocks, a word ordinal is logged", () => {
  const blind = { blind: true } as never;
  assert.deepEqual(kinds(houseChecks(blind, "It lands in the 4th house.")), ["chk-30:block"]);
  assert.deepEqual(kinds(houseChecks(blind, "It lands in the fourth house.")), ["chk-30:warn"]);
  assert.deepEqual(houseChecks({ blind: false } as never, "It lands in the 4th house."), []);
});

// Real lines from staging's fixture runs on mix B (report-lab/r12-pair, report-lab/r12b-pair): the fixture people's own words, no chart data.
const { followRepairs, pairProseChecks, proseText, semicolonsToFullStops, stripBriefLabels, stripWordCounts, validatePairSection } = await import("./index.js");
const { proseOf, softenQuote } = await import("../evidence.js");
const { RULES, blocking } = await import("../checks.js");

test("chk-40: a bracket of nothing but brief labels goes with the space before it, in every form the runs wrote", () => {
  const cases: Array<[string, string]> = [
    // r12-pair, curie-winfrey, people02.
    ["In a lively group, you may need a little time to follow the question and decide what you actually think. (source: A/mind claim 1; A/mind claim 3)", "In a lively group, you may need a little time to follow the question and decide what you actually think."],
    // r12-pair, william-george, parentChild06.
    ["You may wait until you have a balanced case, but a clear limit protects the people who depend on you. (source A/focus claim 1; source A/relationships claim 4)", "You may wait until you have a balanced case, but a clear limit protects the people who depend on you."],
    // r12b-pair, charles-william, parentChild04.
    ["That trains you to make care an agreement, not an expectation. (L15; A/overview claim 1)", "That trains you to make care an agreement, not an expectation."],
    ["A defined guest’s share can respect both needs. (B/money claim 1; B/family claim 5; B/family claim 3)", "A defined guest’s share can respect both needs."],
    // r12-pair, curie-winfrey, people05.
    ["This is the challenge: agree on the amount and each person’s limit before either commits, so you can help without turning a favour into a test. (L1, L13)", "This is the challenge: agree on the amount and each person’s limit before either commits, so you can help without turning a favour into a test."],
    ["You may keep contributing after the arrangement feels unfair, then notice the cost late. (Marie: relationships claim 2; Marie: money claim 1)", "You may keep contributing after the arrangement feels unfair, then notice the cost late."],
    // r12b-pair, curie-winfrey, people, chapter 01.
    ["Say what has changed before silence turns into distance. [claim]", "Say what has changed before silence turns into distance."],
    // Not in the runs yet, the same rule: mid-sentence, joined by a full stop, capitals, at the start.
    ["You decide late (A/mind claim 1) and then all at once.", "You decide late and then all at once."],
    ["You decide late (A/mind claim 1. B/Mind Claim 3).", "You decide late."],
    ["(L3) You decide late.", "You decide late."],
  ];
  for (const [line, expected] of cases) assert.deepEqual(stripBriefLabels(line), { text: expected, stripped: 1, bare: [] }, line);
});

test("chk-40: a label left in a sentence is returned to block; claim and source as words are never touched", () => {
  // r12-pair, charles-william, chapter 01: all seven lines ended on their link's number.
  const line = "This is the challenge: Charles, ask what help William wants before offering a solution, so William can answer without feeling managed. L1";
  assert.deepEqual(stripBriefLabels(line), { text: line, stripped: 0, bare: ["L1"] });
  assert.deepEqual(stripBriefLabels("As A/mind claim 1 says, you investigate first.").bare, ["A/mind claim 1"]);
  assert.deepEqual(stripBriefLabels("Oprah decides first (see L3) and Marie follows.").bare, ["L3"], "a bracket with other words in it stays, so its label blocks");
  assert.deepEqual(stripBriefLabels("You decide late (L3: Moon square Jupiter) and then all at once.").bare, [], "row 20 strips that bracket whole");
  for (const plain of [
    // r12b-pair, charles-william, parentChild05.
    "You trace motives and check claims against the past.",
    // r12b-pair, william-george, parentChild05.
    "You notice the feeling beneath a claim and remember where it came from.",
    "George explains the point he now trusts, then William asks one question about the source.",
    // Without the letter, a name or "source" before it, a section word and a number are a sentence.
    "Your relationships claim 2 evenings a week.",
  ]) assert.deepEqual(stripBriefLabels(plain), { text: plain, stripped: 0, bare: [] }, plain);
});

test("chk-41: a semicolon becomes a full stop and the next word opens the sentence; a name stays as written", () => {
  const cases: Array<[string, string]> = [
    // r12b-pair, curie-winfrey, parentChild03, the pair line.
    ["Marie asks; Oprah decides what she wants to share.", "Marie asks. Oprah decides what she wants to share."],
    // r12-pair, curie-winfrey, parentChild, chapter 01.
    ["Marie, ask whether Oprah wants listening or practical help before offering either; this trains you to let her choose.", "Marie, ask whether Oprah wants listening or practical help before offering either. This trains you to let her choose."],
    // r12b-pair, william-george, parentChild04, the headline.
    ["A clean kitchen is useful; a capable thirteen-year-old still needs a say.", "A clean kitchen is useful. A capable thirteen-year-old still needs a say."],
    // r12-pair, charles-william, parentChild06, the scene.
    ["William says, “That rule no longer applies; let’s agree what works now.”", "William says, “That rule no longer applies. Let’s agree what works now.”"],
    // r12-pair, william-charlotte, parentChild03, a next-time item.
    ["Stay beside Charlotte and say, “You’re upset you lost; I’m here when you want to talk.”", "Stay beside Charlotte and say, “You’re upset you lost. I’m here when you want to talk.”"],
    // Not in the runs yet: no space after it, a closing quote, the end of a field, a word cased inside, after a question.
    ["Marie waits;Oprah talks.", "Marie waits. Oprah talks."],
    ["She says “not now;” and leaves.", "She says “not now.” and leaves."],
    ["Keep the plan;", "Keep the plan."],
    ["Put it away; iPhone last.", "Put it away. iPhone last."],
    ["“Ready?”; she nods.", "“Ready?” She nods."],
  ];
  for (const [line, expected] of cases) assert.equal(semicolonsToFullStops(line).text, expected, line);
  assert.equal(semicolonsToFullStops("Marie asks; Oprah decides; both wait.").replaced, 2);
  assert.deepEqual(semicolonsToFullStops("No semicolon here."), { text: "No semicolon here.", replaced: 0 });
});

const cross = (planetA: string, aspect: string, planetB: string, orb: number) => ({ kind: "cross", planetA, planetB, aspect, orb });
const source = (report: "A" | "B", section: string, claim: number) => ({ kind: "source", report, section, claim });
/** r12-pair, curie-winfrey under the people lens, chapter 02 as staging stored it: two label brackets, two semicolons, a claim across one of them. */
const PEOPLE02 = {
  headline: "Oprah, a pause is not a poor answer.",
  card: {
    a: ["You investigate a question before you share a conclusion.", "You notice emotional undercurrents and patterns between people.", "Small, repeated gestures help you feel close."],
    b: ["You register a feeling quickly.", "You connect details quickly and can follow an idea across several conversations.", "You notice the gap between what someone says and what their story leaves out."],
    pair: "Marie and Oprah make space for a careful answer.",
  },
  scene: "At the big dinner, Oprah starts talking early, drawing others into the conversation. Marie listens, notices who has gone quiet, and waits before offering her thought. Within ten minutes, Oprah asks Marie what she thinks; Marie answers carefully, and Oprah follows with another question. Marie reads the pause as a need for time, while Oprah may hear it as uncertainty. Neither has withdrawn from the conversation.",
  whatJustHappened: {
    becauseA: "Marie, you investigate before sharing a conclusion, and you notice emotional undercurrents between people. In a lively group, you may need a little time to follow the question and decide what you actually think. (source: A/mind claim 1; A/mind claim 3)",
    becauseB: "Oprah, you register feelings quickly and work out what they mean through conversation. You connect details across exchanges, so a pause or incomplete answer can prompt another question. You want the conversation to make the meaning clear. (source: B/triad claim 3; B/mind claim 2)",
  },
  pattern: "Your conversation comes naturally: Marie finds words for what Oprah has already felt, and Oprah keeps the exchange moving. When Oprah asks again, Marie may need time to finish thinking; when Marie pauses, Oprah may look for more. This is the challenge: treat different speaking speeds as pace, not as doubt or criticism, so you can stay curious without pressing or retreating.",
  nextTime: { items: [
    { for: "A", action: "Oprah, let Marie finish her thought before asking the next question.", why: "so you give her time to reach a clear answer" },
    { for: "B", action: "Marie, tell Oprah when you are still thinking, rather than leaving a pause unexplained.", why: "so she knows your silence is not a rejection" },
    { for: "both", action: "At the big dinner, each of you leave space for one answer before changing the subject.", why: "so you can hear what the other actually means" },
  ] },
  claims: [
    { quote: "At the big dinner, Oprah starts talking early, drawing others into the conversation.", evidence: [source("B", "triad", 3)] },
    { quote: "Marie listens, notices who has gone quiet, and waits before offering her thought.", evidence: [source("A", "mind", 3)] },
    { quote: "Marie, you investigate before sharing a conclusion, and you notice emotional undercurrents between people.", evidence: [source("A", "mind", 1), source("A", "mind", 3)] },
    { quote: "Oprah, you register feelings quickly and work out what they mean through conversation.", evidence: [source("B", "triad", 3), cross("mercury", "conjunction", "moon", 2.1)] },
    { quote: "Your conversation comes naturally: Marie finds words for what Oprah has already felt, and Oprah keeps the exchange moving.", evidence: [cross("mercury", "conjunction", "moon", 2.1), cross("mercury", "sextile", "sun", 2.4)] },
    { quote: "When Oprah asks again, Marie may need time to finish thinking; when Marie pauses, Oprah may look for more.", evidence: [cross("mercury", "conjunction", "moon", 2.1), cross("mercury", "sextile", "venus", 2.2)] },
  ],
};

test("chk-40, chk-41 on a chapter as written: every prose field repaired, the claims list never walked", () => {
  const reply = structuredClone(PEOPLE02);
  const r = pairProseChecks(reply);
  const out = r.value as typeof PEOPLE02;
  assert.equal(out.whatJustHappened.becauseA, "Marie, you investigate before sharing a conclusion, and you notice emotional undercurrents between people. In a lively group, you may need a little time to follow the question and decide what you actually think.");
  assert.equal(out.whatJustHappened.becauseB, "Oprah, you register feelings quickly and work out what they mean through conversation. You connect details across exchanges, so a pause or incomplete answer can prompt another question. You want the conversation to make the meaning clear.");
  assert.match(out.scene, /Oprah asks Marie what she thinks\. Marie answers carefully/);
  assert.match(out.pattern, /Marie may need time to finish thinking\. When Marie pauses/);
  assert.doesNotMatch(proseText(out), /;|claim \d|\bL\d/);
  assert.equal(out.claims, reply.claims, "the same list, never walked");
  assert.deepEqual(out.claims, PEOPLE02.claims, "its quotes still carry the semicolon as written");
  assert.deepEqual(reply, PEOPLE02, "the reply as parsed is not mutated");
  assert.deepEqual(kinds(r.checks), ["chk-40:fix", "chk-41:fix"]);
  assert.deepEqual(r.checks.map((c) => c.message), ["2 bracket(s) of brief labels stripped from the prose", "2 semicolon(s) in the prose became full stops"]);
  const bare = pairProseChecks({ ...reply, pattern: `${reply.pattern} L1` });
  assert.deepEqual(kinds(bare.checks), ["chk-40:fix", "chk-40:block", "chk-41:fix"]);
  assert.match(bare.checks[1].message, /^pattern: the brief's label "L1" sits in a sentence\. A citation lives in the claims field only/);
  assert.deepEqual(pairProseChecks({ headline: "Oprah, a pause is not a poor answer.", claims: [] }).checks, []);
});

test("the claims stay valid: a quote across a semicolon follows the repaired sentences, so no claim is lost (annex rows 4, 41)", () => {
  const brief = pair("people", { label: "friends" });
  const result = validatePairSection(pairSectionById("people02")!, structuredClone(PEOPLE02), brief);
  const out = result.output as typeof PEOPLE02;
  assert.deepEqual(blocking(result.checks), []);
  assert.equal(out.claims.length, PEOPLE02.claims.length, "no claim lost to the repair");
  assert.equal(out.claims[5].quote, "When Oprah asks again, Marie may need time to finish thinking. When Marie pauses, Oprah may look for more.");
  assert.deepEqual(out.claims.slice(0, 5).map((c) => c.quote), PEOPLE02.claims.slice(0, 5).map((c) => c.quote), "the others were verbatim and stay as written");
  assert.deepEqual(validatePairClaims(out, out.claims as never, brief), [], "every quote is found in what prints");
  assert.deepEqual(result.checks.filter((c) => c.rule === "chk-04").map((c) => `${c.cls}:${c.message}`), ["fix:claim 6: the quote follows the repaired prose"]);

  // r12b-pair, curie-winfrey under the partners lens, chapter 01: all three work lines and the claims that quote them across the semicolon.
  const two = pair("partners");
  const c = two.cross[0];
  const ref = [cross(c.planetA, c.type, c.planetB, c.orb)];
  const work = [
    "This is the challenge: Marie needs care when tired, while Oprah may offer another plan; naming the need trains you to pause before either pushes on.",
    "This is the challenge: Marie may hold back her need for space, while Oprah needs time to sort her thoughts; agreeing when to return trains you to trust a pause.",
    "This is the challenge: your shared conversation can open quickly, but the hard parts may stay private; asking plainly what each can offer trains you to keep care mutual.",
  ];
  const chapter = {
    headline: "Marie and Oprah can make a hard conversation useful, if they leave room for rest and thought.",
    strong: ["During an argument at 11 pm, Marie can find the question Oprah has been carrying and help you both name it.", "At the end of a long day, Oprah's directness can draw Marie close, while Marie's loyalty helps you stay connected.", "You both can turn careful conversation into a shared plan, then take practical steps together."],
    work,
    paradox: "Your easy return to conversation helps you stay close, but can keep Marie giving and Oprah thinking past the moment either needs a break.",
    strengths: ["Marie and Oprah make hard conversations easier to start", "Marie and Oprah can stay close without filling every silence", "Marie and Oprah turn shared plans into practical steps"],
    // The second half as its own quote, lowercase as written: raised to the sentence it now opens.
    claims: [...work.map((quote) => ({ quote, evidence: ref })), { quote: "naming the need trains you", evidence: ref }],
  };
  const repaired = validatePairSection(pairSectionById("twoCharts")!, chapter, two);
  const stored = repaired.output as typeof chapter;
  assert.deepEqual(stored.work, [
    "This is the challenge: Marie needs care when tired, while Oprah may offer another plan. Naming the need trains you to pause before either pushes on.",
    "This is the challenge: Marie may hold back her need for space, while Oprah needs time to sort her thoughts. Agreeing when to return trains you to trust a pause.",
    "This is the challenge: your shared conversation can open quickly, but the hard parts may stay private. Asking plainly what each can offer trains you to keep care mutual.",
  ]);
  assert.deepEqual(stored.claims.map((x) => x.quote), [...stored.work, "Naming the need trains you"]);
  const prose = softenQuote(proseOf(stored));
  for (const x of stored.claims) assert.ok(prose.includes(softenQuote(x.quote)), x.quote);
  assert.deepEqual(kinds(repaired.checks.filter((x) => x.rule === "chk-04" || x.rule === "chk-41")), ["chk-41:fix", "chk-04:fix", "chk-04:fix", "chk-04:fix", "chk-04:fix"]);
});

test("followRepairs leaves a verbatim quote and a paraphrase alone: the snap still judges the paraphrase", () => {
  const section = { pattern: "Marie asks. Oprah decides what she wants to share.", claims: [{ quote: "Oprah decides what she wants to share.", evidence: [] }, { quote: "Oprah decides what to share.", evidence: [] }] };
  const r = followRepairs(section);
  assert.equal(r.value, section);
  assert.deepEqual(r.checks, []);
});

/** r12b-pair, william-george, parentChild06: the model closed three fields on its own word count. */
const COUNTED = {
  pattern: "This is the challenge: George can push for freedom while William needs time to think, and each can read the other as refusing to listen. William can name the limit, explain its purpose, and hear George's objection before ending the discussion. That trains William to be clear before withdrawing and George to argue without pushing harder. (56 words)",
  whatJustHappened: {
    becauseA: "William needs trust and honest talk before sharing what matters. When a decision affects others, he may withdraw to think, then leave them guessing. Explaining the reason before stepping back helps him protect privacy without creating mistrust. (31 words)",
    becauseB: "George is reaching for room to pursue what matters to him and to have his views heard. When a disagreement touches his beliefs, he may press hard, then feel hurt if the other person pulls away. A plain answer helps him check what is happening. (43 words)",
  },
  claims: [
    { quote: "William needs trust and honest talk before sharing what matters.", evidence: [source("A", "relationships", 1)] },
    { quote: "This is the challenge: George can push for freedom while William needs time to think, and each can read the other as refusing to listen.", evidence: [cross("mars", "square", "mars", 3.1)] },
  ],
};

test("chk-42: a bracket of nothing but a word count goes like a label bracket, a count left as its own sentence blocks, a count in an action stays", () => {
  const r = pairProseChecks(structuredClone(COUNTED));
  const out = r.value as typeof COUNTED;
  assert.equal(out.pattern, COUNTED.pattern.replace(" (56 words)", ""));
  assert.equal(out.whatJustHappened.becauseA, COUNTED.whatJustHappened.becauseA.replace(" (31 words)", ""));
  assert.equal(out.whatJustHappened.becauseB, COUNTED.whatJustHappened.becauseB.replace(" (43 words)", ""));
  assert.equal(out.claims, r.value.claims);
  assert.deepEqual(out.claims, COUNTED.claims, "the claims list is never walked");
  assert.deepEqual(r.checks.map((c) => `${c.rule}:${c.cls}:${c.message}`), ["chk-42:fix:3 word count(s) stripped from the prose"]);

  for (const note of ["(56 words)", "(about 40 words)", "(40-60 words)", "(40–60 words)", "(40 to 60 words)", "[56 words]", "(56 words.)", "(Word count: 56)", "(pattern: 56 words)"]) {
    assert.deepEqual(stripWordCounts(`A plain answer helps him check what is happening. ${note}`), { text: "A plain answer helps him check what is happening.", stripped: 1, bare: [] }, note);
  }
  assert.deepEqual(stripWordCounts("A plain answer helps him check what is happening. 43 words").bare, ["43 words"]);
  assert.deepEqual(stripWordCounts("A plain answer helps him check what is happening. About 40 words.").bare, ["About 40 words"]);
  assert.deepEqual(stripWordCounts("Word count: 43. A plain answer helps him check what is happening.").bare, ["Word count: 43"]);
  for (const plain of ["Send George the plan in 10 words or fewer.", "Say it in two words.", "Write a 50-word note for the fridge.", "Keep the message short (10 words or fewer) and plain."]) {
    assert.deepEqual(stripWordCounts(plain), { text: plain, stripped: 0, bare: [] }, plain);
  }
  const left = pairProseChecks({ pattern: "That trains William to be clear before withdrawing. 56 words" });
  assert.deepEqual(kinds(left.checks), ["chk-42:block"]);
  assert.equal(left.checks[0].message, "pattern: the word count \"56 words\" sits in the prose. Never mention a word count.");
});

test("the rules table carries rows 40 to 42, each a fix as designed", () => {
  assert.deepEqual([RULES["chk-40"], RULES["chk-41"], RULES["chk-42"]], [{ row: 40, cls: "fix" }, { row: 41, cls: "fix" }, { row: 42, cls: "fix" }]);
});
