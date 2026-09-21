/**
 * The compatibility pipeline without the model: canned, schema-valid replies
 * built from the real pair brief, so the fan-out, the frames, the allocation,
 * the scenes, the stored claims and the failure path are proven end to end.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, installFakeModel, type FakeRequest } from "./testModel.js";

const { generateInterpretation } = await import("./aiInterpretation.js");
const { generatePairInterpretation, previewPairSectionPrompt, lensChapterOf } = await import("./pairInterpretation.js");
const { buildPairBrief } = await import("./pairBrief.js");
const { pairSectionIds, pairChapterIds, pairSectionById } = await import("../prompts/pair/index.js");
const { linkList } = await import("../prompts/pair/sections/links.js");
type PairBrief = import("./pairBrief.js").PairBrief;
type Lens = import("./pairBrief.js").Lens;

const fake = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const curieReport = await generateInterpretation(chartFromFixture("marie-curie"), "Marie Curie");
fake.replies = cannedNatalReplies({ drawn: true, sunSign: "aquarius", sunHouse: 3, sect: "night" });
const winfreyReport = await generateInterpretation(chartFromFixture("oprah-winfrey"), "Oprah Winfrey");

const input = (lens: Lens = "partners", extra: Record<string, unknown> = {}) => ({
  lens,
  at: new Date("2026-09-21T00:00:00Z"),
  a: { name: "Marie Curie", birthDate: "1867-11-07", chart: chartFromFixture("marie-curie"), interpretation: curieReport },
  b: { name: "Oprah Winfrey", birthDate: "1954-01-29", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
  ...extra,
});

const SENTENCE = "You both decide late and then all at once, and the weekend gets planned twice.";
const reading = (bodies: string) => `${bodies} meet in the small hours, when one wants the talk finished and the other wants it opened. The weekend plan gets made twice, once out loud and once in private, and the private one wins. Behaviour check: notice who books the table this week.`;

/** Canned pair replies that validate against the given brief: every link goes to chapter 1 or a lens chapter, and each chapter cites its own. */
export function pairReplies(brief: PairBrief): Record<string, unknown> {
  const sourceA = { kind: "source", report: "A", section: "overview", claim: 1 };
  const sourceB = { kind: "source", report: "B", section: "relationships", claim: 1 };
  const crossRef = (i: number) => {
    const c = brief.cross[i];
    return { kind: "cross", planetA: c.planetA, planetB: c.planetB, aspect: c.type, orb: c.orb };
  };
  // Link i (0-based) goes to lens chapter 2 + i % 5; the first three also to chapter 1.
  const owners = brief.links.map((l, i) => ({ link: l.n, chapters: i < 3 ? [1, 2 + (i % 5)] : [2 + (i % 5)] }));
  const claimsFor = (crossIndex: number) => [
    { quote: SENTENCE, evidence: [crossRef(crossIndex)] },
    { quote: "You investigate first and commit second.", evidence: [sourceA] },
    { quote: "You leave the room a minute before you are asked to.", evidence: [sourceB] },
  ];
  const item = (who: "A" | "B" | "both") => ({ for: who, action: "Plan the weekend once, out loud, on Thursday.", why: "so nobody plans it twice in private" });
  const lensChapter = (n: number) => ({
    headline: SENTENCE,
    card: {
      a: ["Marie investigates first and commits second.", "Marie keeps going after the room gives up.", "Marie decides late, then all at once."],
      b: ["Oprah leaves the room a minute early.", "Oprah says the thing out loud first.", "Oprah plans the weekend twice."],
      pair: "You both plan it twice and the private one wins.",
    },
    scene: "Marie comes in late and says nothing. Oprah has the plan on the table already. \"We said Thursday,\" Oprah says. Marie nods, and reads it twice.",
    whatJustHappened: { becauseA: "You investigate first and commit second.", becauseB: "You leave the room a minute before you are asked to." },
    pattern: `${SENTENCE} This is where it flows.`,
    nextTime: { items: [item("A"), item("B"), item("both")] },
    claims: claimsFor(n - 2),
  });
  const checklist = (intro: string) => ({ intro, items: [item("A"), item("A"), item("A")].map(({ action, why }) => ({ action, why })) });
  const links = linkList(brief).map((l) => {
    const m = l.match(/^overlay: (A|B) (\w[\w ]*) in (A|B)'s (\d+)/);
    if (m) {
      const body = m[2].toLowerCase().replace(" ", "_");
      return { kind: "overlay", planetA: "", planetB: "", aspect: "", orb: 0, planet: body, of: m[1], house: Number(m[4]), reading: reading(`Your ${m[2]} and the house it lands in`) };
    }
    const a = l.match(/^aspect: A (\w[\w ]*) (\w+) B (\w[\w ]*) \(orb ([\d.]+)\)/)!;
    const flows = ["trine", "sextile", "conjunction"].includes(a[2]);
    return { kind: flows ? "flows" : "rubs", planetA: a[1].toLowerCase().replace(" ", "_"), planetB: a[3].toLowerCase().replace(" ", "_"), aspect: a[2], orb: Number(a[4]), planet: "", of: "none", house: 0, reading: reading("Your two") };
  });
  const chapterIds = pairChapterIds(brief.lens);
  return {
    pair_foundation: {
      pairThesis: "Two slow deciders who move fast once decided.",
      strongestLinks: [1, 2, 3].map((k) => ({ link: k, why: "one needs quiet and the other fills it" })),
      frictionThatMatters: "The plan made twice.",
      strengths: ["Marie finishes what Oprah starts.", "Oprah says the thing out loud first.", "Neither of you leaves a room angry."],
      owners,
      scenes: [2, 3, 4, 5, 6].map((chapter) => ({ chapter, index: chapter % 3 })),
      guidance: chapterIds.map(() => "one thing"),
    },
    pair_twoCharts: {
      headline: SENTENCE,
      strong: [SENTENCE, SENTENCE, SENTENCE],
      work: [SENTENCE, SENTENCE, SENTENCE],
      paradox: "You investigate first and commit second.",
      strengths: ["Marie finishes what Oprah starts.", "Oprah says the thing out loud first.", "Neither of you leaves a room angry."],
      pointer: "You leave the room a minute before you are asked to.",
      claims: [{ quote: SENTENCE, evidence: [crossRef(0)] }, { quote: SENTENCE, evidence: [crossRef(1)] }, { quote: SENTENCE, evidence: [crossRef(2)] }, { quote: "You investigate first and commit second.", evidence: [sourceA] }],
    },
    ...Object.fromEntries([2, 3, 4, 5, 6].map((n) => [`pair_${chapterIds[n - 1]}`, lensChapter(n)])),
    pair_whatToPractise: {
      opening: `${SENTENCE} You investigate first and commit second.`,
      forA: checklist("Marie, three things."), forB: checklist("Oprah, three things."), forBoth: checklist("Both of you."),
      closing: "You leave the room a minute before you are asked to.",
      claims: claimsFor(0),
    },
    pair_links: { links },
  };
}

test("one foundation call, then seven sections in parallel, then the practice; each stored as it lands with labelled claims", async () => {
  const brief = buildPairBrief(input());
  fake.replies = pairReplies(brief);
  fake.calls = [];
  const frames: string[] = [];
  const out = await generatePairInterpretation(input(), { onSection: (f) => { frames.push(f.section); } });

  const ids = pairSectionIds("partners");
  assert.equal(fake.calls[0], "pair_foundation");
  assert.equal(fake.calls[fake.calls.length - 1], "pair_whatToPractise", "chapter 07 collects what the five wrote, so it runs last");
  assert.deepEqual(fake.calls.slice(1).sort(), ids.map((id) => `pair_${id}`).sort());
  assert.deepEqual(frames.slice(0, 2), ["meta", "meta"], "the meta frame, then the foundation with the scenes");
  assert.deepEqual(frames.slice(2).sort(), [...ids].sort());
  assert.equal(frames[frames.length - 1], "whatToPractise");
  assert.equal(out.meta.promptVersion, "p2");
  assert.equal(out.meta.reportType, "compatibility");
  assert.equal(out.meta.lens, "partners");
  assert.equal(out.meta.band, null);
  assert.deepEqual(out.meta.names, { a: "Marie Curie", b: "Oprah Winfrey" });
  assert.equal(out.meta.blind, false);
  assert.ok(out.meta.wordCount > 300);
  assert.equal(out.meta.usage.sections.length, 9);
  // The scenes: three titles a lens chapter, the chosen index, no text written yet.
  assert.deepEqual(Object.keys(out.scenes), ["partners02", "partners03", "partners04", "partners05", "partners06"]);
  assert.deepEqual(out.scenes.partners02, { titles: ["the end of a long day", "a birthday, planned badly", "the thumbs-up"], written: 2, texts: {} });
  assert.equal(out.scenes.partners03.written, 0);
  // A source claim carries the natal report's own evidence label; a cross claim names both people.
  const love = lensChapterOf(out, "partners02")!;
  const labels = love.claims.flatMap((c) => c.evidence.map((e) => e.label));
  assert.ok(labels.some((l) => l.startsWith("Marie Curie's report: Sun 14.")), labels.join(" | "));
  assert.ok(labels.some((l) => /^Marie Curie's \w+ \w+ Oprah Winfrey's \w+, [\d.]+° orb$/.test(l)), labels.join(" | "));
  assert.equal(love.card.a.length, 3);
  assert.equal(out.twoCharts.strong.length, 3);
  assert.equal(out.links.links.length, linkList(brief).length);
  assert.ok(out.links.links.some((l) => l.kind === "overlay"));
  assert.equal(out.whatToPractise.forA.items.length, 3);
  assert.ok(!fake.calls.some((c) => c.startsWith("natal_")), "nothing in either natal report was regenerated");
});

test("a cross claim outside the chapter's allocation fails the section, naming the rule", async () => {
  const brief = buildPairBrief(input());
  const replies = pairReplies(brief);
  const broken = JSON.parse(JSON.stringify(replies.pair_partners03)) as { claims: Array<{ evidence: unknown[] }> };
  const c = brief.cross[7];
  broken.claims[0].evidence = [{ kind: "cross", planetA: c.planetA, planetB: c.planetB, aspect: c.type, orb: c.orb }];
  fake.replies = { ...replies, pair_partners03: broken };
  await assert.rejects(
    generatePairInterpretation(input()),
    (err: Error) => /pair:partners03: failed validation after 3 attempts/.test(err.message) && /outside this chapter's allocation/.test(err.message),
  );
});

test("the lens picks the chapters, the band and the label reach the meta, and the brief sits before the instructions", async () => {
  const parent = input("parent_child", { parent: "B" });
  const brief = buildPairBrief(parent);
  assert.equal(brief.band, "grown");
  fake.replies = pairReplies(brief);
  const out = await generatePairInterpretation(parent);
  assert.equal(out.meta.band, "grown");
  assert.deepEqual(Object.keys(out.scenes), ["parentChild02", "parentChild03", "parentChild04", "parentChild05", "parentChild06"]);
  assert.equal(out.scenes.parentChild02.titles[0], "the Sunday call");
  assert.ok(lensChapterOf(out, "parentChild04"));
  assert.equal(lensChapterOf(out, "partners02"), undefined);

  const people = input("people", { label: "colleagues" });
  fake.replies = pairReplies(buildPairBrief(people));
  const peopleOut = await generatePairInterpretation(people);
  assert.equal(peopleOut.meta.label, "colleagues");
  assert.equal(peopleOut.meta.band, null);

  const preview = await previewPairSectionPrompt("pair:partners02", input(), (fake.replies as Record<string, never>).pair_foundation);
  const spec = pairSectionById("partners02")!;
  assert.ok(preview.user.indexOf("PAIR BRIEF") < preview.user.indexOf("THIS CHAPTER'S LINKS"));
  assert.ok(preview.user.indexOf("THIS CHAPTER'S LINKS") < preview.user.indexOf(spec.instructions.slice(0, 40)), "the brief sits before the instructions");
  assert.match(preview.user, /LENS: partners/);
  assert.match(preview.user, /<- chosen/);
  const partnersSystem = preview.system;
  const peoplePreview = await previewPairSectionPrompt("pair:people02", people);
  assert.equal(peoplePreview.system, partnersSystem, "the cached system prompt is identical across lenses");
  assert.match(peoplePreview.user, /colleagues/);
});

test("a failed section fails the report with its message, never a silent degrade", async () => {
  const brief = buildPairBrief(input());
  fake.replies = pairReplies(brief);
  fake.failOn = "pair_partners05";
  try {
    await assert.rejects(generatePairInterpretation(input()), /simulated outage on pair_partners05/);
  } finally {
    fake.failOn = null;
  }
});

test("the request never carries birth data: the brief is built from stored charts and reports alone", async () => {
  const brief = buildPairBrief(input());
  fake.replies = { ...pairReplies(brief), pair_foundation: (req: FakeRequest) => {
    const user = req.messages[1].content;
    assert.doesNotMatch(user, /1867-11-07|1954-01-29|52\.2297|-89\.5878/);
    return (pairReplies(brief) as Record<string, unknown>).pair_foundation;
  } };
  await generatePairInterpretation(input());
});
