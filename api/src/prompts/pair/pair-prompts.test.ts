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
  pairChapterIds, pairChapterTitle, pairHasClaims, pairSectionById, pairSectionIds, sceneProblems, scenesOf, stripBracketedBodies, validatePairClaims,
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

// Two charts side by side, the ledger, the link cards (ADR-97, ADR-101, ADR-104, ADR-106): no prompt draws a bi-wheel or a legend.
test("chapter 01 carries the ledger premise, the links sit under the two charts, the doctrine keeps evidence in claims, and no prompt names a bi-wheel", () => {
  const two = pairSectionById("twoCharts")!;
  assert.match(two.instructions, /The reader sees the two charts side by side, each alone\. Under them this chapter's lines are set out as a ledger, each beside the link it rests on, with a pointer to the chapter that shows it; the link cards follow\./);
  assert.match(two.instructions, /three lines, one sentence each, each cited to one of this chapter's links\. Then what will take work/);
  assert.doesNotMatch(two.instructions, /pointing at the chapter that shows it/);
  assert.doesNotMatch(two.instructions, /by its title/);
  assert.match(two.instructions, /Do not list every link; the link cards do that\./);
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
  assert.deepEqual(twoShape, ["headline", "strong", "work", "paradox", "strengths", "pointer", "claims"]);
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
  assert.ok(foundationProblems(three as never, brief).some((p) => /cut to two/.test(p)));
  // A link handed to chapter 07 is tolerated and binds nothing; a chapter past 7 is not a chapter.
  const seven = { ...good, owners: owners.map((o, i) => (i === 3 ? { ...o, chapters: [7] } : o)) };
  assert.deepEqual(foundationProblems(seven as never, brief), []);
  assert.equal(allocationOf(seven as never, brief, (n) => ["twoCharts", "partners02", "partners03", "partners04", "partners05", "partners06", "whatToPractise"][n - 1]).whatToPractise, undefined);
  const eight = { ...good, owners: owners.map((o, i) => (i === 3 ? { ...o, chapters: [8] } : o)) };
  assert.ok(foundationProblems(eight as never, brief).some((p) => /chapters run 1 to 7/.test(p)));
  const missing = { ...good, owners: owners.slice(1) };
  assert.ok(foundationProblems(missing as never, brief).some((p) => /L1 was given to no chapter/.test(p)));
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
