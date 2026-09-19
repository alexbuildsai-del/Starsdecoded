/**
 * The compatibility pipeline without the model: canned, schema-valid replies
 * built from the real pair brief, so the fan-out, the frames, the stored
 * claims and the failure path are proven end to end for free.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, installFakeModel, type FakeRequest } from "./testModel.js";

const { generateInterpretation } = await import("./aiInterpretation.js");
const { generatePairInterpretation, previewPairSectionPrompt } = await import("./pairInterpretation.js");
const { buildPairBrief } = await import("./pairBrief.js");
const { PAIR_SECTION_IDS, PAIR_CHAPTER_IDS } = await import("../prompts/pair/index.js");
const { linkList } = await import("../prompts/pair/sections/links.js");
type PairBrief = import("./pairBrief.js").PairBrief;

const fake = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const curieReport = await generateInterpretation(chartFromFixture("marie-curie"), "Marie Curie");
fake.replies = cannedNatalReplies({ drawn: true, sunSign: "aquarius", sunHouse: 3, sect: "night" });
const winfreyReport = await generateInterpretation(chartFromFixture("oprah-winfrey"), "Oprah Winfrey");

const input = (lens: "partners" | "parent_child" | "family" = "partners") => ({
  lens,
  a: { name: "Marie Curie", chart: chartFromFixture("marie-curie"), interpretation: curieReport },
  b: { name: "Oprah Winfrey", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
});

const SENTENCE = "You both decide late and then all at once, and the weekend gets planned twice.";
const reading = (bodies: string) => `${bodies} meet in the small hours, when one wants the talk finished and the other wants it opened. The weekend plan gets made twice, once out loud and once in private, and the private one wins. Behaviour check: notice who books the table this week.`;

/** Canned pair replies that validate against the given brief. */
function pairReplies(brief: PairBrief): Record<string, unknown> {
  const c = brief.cross[0];
  const crossRef = { kind: "cross", planetA: c.planetA, planetB: c.planetB, aspect: c.type, orb: c.orb };
  const sourceA = { kind: "source", report: "A", section: "overview", claim: 1 };
  const sourceB = { kind: "source", report: "B", section: "relationships", claim: 1 };
  const chapterClaims = [
    { quote: SENTENCE, evidence: [crossRef] },
    { quote: "You investigate first and commit second.", evidence: [sourceA] },
    { quote: "You leave the room a minute before you are asked to.", evidence: [sourceB] },
  ];
  const chapter = {
    headline: SENTENCE,
    passages: [
      { text: SENTENCE, source: "new", of: "both" },
      { text: "You investigate first and commit second.", source: "natal", of: "A" },
      { text: "You leave the room a minute before you are asked to.", source: "natal", of: "B" },
    ],
    claims: chapterClaims,
  };
  const item = { action: "Plan the weekend once, out loud, on Thursday.", why: "so nobody plans it twice in private" };
  const checklist = (intro: string) => ({ intro, items: [item, item, item] });
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
  return {
    pair_foundation: {
      pairThesis: "Two slow deciders who move fast once decided.",
      strongestLinks: [1, 2, 3].map(() => ({ link: "A Moon square B Jupiter", why: "one needs quiet and the other fills it" })),
      frictionThatMatters: "The plan made twice.",
      sectionGuidance: Object.fromEntries(PAIR_CHAPTER_IDS.map((id) => [id, "one thing"])),
    },
    ...Object.fromEntries(PAIR_CHAPTER_IDS.filter((id) => id !== "whatToPractise").map((id) => [`pair_${id}`, chapter])),
    pair_whatToPractise: {
      opening: `${SENTENCE} You investigate first and commit second.`,
      forA: checklist("Marie, three things."), forB: checklist("Oprah, three things."), forBoth: checklist("Both of you."),
      closing: "You leave the room a minute before you are asked to.",
      claims: chapterClaims,
    },
    pair_links: { links },
  };
}

test("one foundation call, then ten sections in parallel, each stored as it lands with labelled claims", async () => {
  const brief = buildPairBrief(input());
  fake.replies = pairReplies(brief);
  fake.calls = [];
  const frames: string[] = [];
  const out = await generatePairInterpretation(input(), { onSection: (f) => { frames.push(f.section); } });

  assert.equal(fake.calls[0], "pair_foundation");
  assert.deepEqual(fake.calls.slice(1).sort(), PAIR_SECTION_IDS.map((id) => `pair_${id}`).sort());
  assert.equal(frames[0], "meta");
  assert.deepEqual(frames.slice(1).sort(), [...PAIR_SECTION_IDS].sort());
  assert.equal(out.meta.promptVersion, "p1");
  assert.equal(out.meta.reportType, "compatibility");
  assert.equal(out.meta.lens, "partners");
  assert.deepEqual(out.meta.names, { a: "Marie Curie", b: "Oprah Winfrey" });
  assert.equal(out.meta.blind, false);
  assert.ok(out.meta.wordCount > 500);
  assert.equal(out.meta.usage.sections.length, 11);
  // A source claim carries the natal report's own evidence label; a cross claim names both people.
  const labels = out.howYouMeet.claims.flatMap((c) => c.evidence.map((e) => e.label));
  assert.ok(labels.some((l) => l.startsWith("Marie Curie's report: Sun 14.")), labels.join(" | "));
  assert.ok(labels.some((l) => /^Marie Curie's \w+ \w+ Oprah Winfrey's \w+, [\d.]+° orb$/.test(l)), labels.join(" | "));
  assert.equal(out.links.links.length, linkList(brief).length);
  assert.ok(out.links.links.some((l) => l.kind === "overlay"));
  assert.equal(out.whatToPractise.forA.items.length, 3);
  // Nothing in either natal report was regenerated.
  assert.ok(!fake.calls.some((c) => c.startsWith("natal_")));
});

test("the lens changes chapters 07 and 08's titles and the register, and nowhere structurally else", async () => {
  const brief = buildPairBrief(input("family"));
  fake.replies = pairReplies(brief);
  const family = await previewPairSectionPrompt("pair:lensOne", input("family"));
  const partners = await previewPairSectionPrompt("pair:lensOne", input("partners"));
  assert.match(family.user, /LENS: family/);
  assert.match(family.user, /the group chat/);
  assert.match(partners.user, /LENS: partners/);
  assert.match(partners.user, /an argument at 11 pm/);
  assert.equal(family.system, partners.system, "the cached system prompt is identical across lenses");
  assert.deepEqual(family.schema, partners.schema);
  const parent = await previewPairSectionPrompt("pair:lensOne", { ...input("parent_child"), parent: "B" });
  assert.match(parent.user, /Oprah Winfrey is the parent and Marie Curie is the child/);
});

test("a source claim pointing at a claim that does not exist fails the section, naming the report and section", async () => {
  const brief = buildPairBrief(input());
  const replies = pairReplies(brief);
  const broken = JSON.parse(JSON.stringify(replies.pair_howYouTalk)) as { claims: Array<{ evidence: unknown[] }> };
  broken.claims[1].evidence = [{ kind: "source", report: "B", section: "money", claim: 7 }];
  fake.replies = { ...replies, pair_howYouTalk: broken };
  await assert.rejects(
    generatePairInterpretation(input()),
    (err: Error) => /pair:howYouTalk: failed validation after 3 attempts/.test(err.message)
      && /report B \(Oprah Winfrey\) has no claim 7 in money/.test(err.message),
  );
});

test("a failed section fails the report with its message, never a silent degrade", async () => {
  const brief = buildPairBrief(input());
  fake.replies = pairReplies(brief);
  fake.failOn = "pair_whereItRubs";
  try {
    await assert.rejects(generatePairInterpretation(input()), /simulated outage on pair_whereItRubs/);
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
