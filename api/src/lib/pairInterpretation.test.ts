/**
 * The compatibility pipeline without the model: canned, schema-valid replies
 * built from the real pair brief, so the fan-out, the frames, the allocation,
 * the scenes, the stored claims and the failure path are proven end to end.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, failureRows, installFakeModel, type FakeRequest } from "./testModel.js";

const { generateInterpretation } = await import("./aiInterpretation.js");
const { generatePairInterpretation, previewPairSectionPrompt, lensChapterOf } = await import("./pairInterpretation.js");
const { buildPairBrief } = await import("./pairBrief.js");
const { pairSectionIds, pairSectionById } = await import("../prompts/pair/index.js");
const { linkList } = await import("../prompts/pair/sections/links.js");
const { pairReplies } = await import("./testPair.js");
const { ReportFailure } = await import("./failureReasons.js");
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

test("a cross claim outside the chapter's allocation is dropped, not retried; under three claims the claims-only repair runs once (annex rows 9, 11)", async () => {
  const brief = buildPairBrief(input());
  const replies = pairReplies(brief);
  const broken = JSON.parse(JSON.stringify(replies.pair_partners03)) as { claims: Array<{ evidence: unknown[] }> };
  const c = brief.cross[7];
  broken.claims[0].evidence = [{ kind: "cross", planetA: c.planetA, planetB: c.planetB, aspect: c.type, orb: c.orb }];
  fake.replies = { ...replies, pair_partners03: broken, pair_partners03_claims: { claims: (replies.pair_partners03 as { claims: unknown[] }).claims } };
  fake.calls = [];
  failureRows.length = 0;
  const out = await generatePairInterpretation(input());
  assert.equal(fake.calls.filter((k) => k === "pair_partners03").length, 1, "the prose is never rewritten for a claim problem");
  assert.equal(fake.calls.filter((k) => k === "pair_partners03_claims").length, 1, "one claims-only repair");
  assert.equal(lensChapterOf(out, "partners03")!.claims.length, 3);
  const rows = failureRows.filter((r) => r.section === "pair:partners03");
  assert.ok(rows.some((r) => r.ruleId === "chk-11" && r.class === "fix"), "the allocation drop is logged by rule");
  assert.ok(rows.some((r) => r.ruleId === "chk-09" && r.class === "repair"), "the repair is logged by rule");
  assert.ok(rows.some((r) => r.ruleId === "pass"), "the accepted write logs its pass");
  assert.ok(rows.every((r) => !/decide late|weekend/.test(r.message)), "no report text in the log");
});

const TRINE = "You both decide late and then all at once, and the trine makes the weekend plan twice.";

test("a chapter stubbed to fail three times then pass: the report completes, the others are called once, and the rows are written (acceptance 3)", async () => {
  const brief = buildPairBrief(input());
  const replies = pairReplies(brief);
  const good = replies.pair_partners04 as { pattern: string };
  let n = 0;
  fake.replies = { ...replies, pair_partners04: () => (n++ < 3 ? { ...good, pattern: TRINE } : good) };
  fake.calls = [];
  failureRows.length = 0;
  const frames: string[] = [];
  const out = await generatePairInterpretation(input(), { onSection: (f) => { frames.push(f.section); } });
  assert.equal(fake.calls.filter((k) => k === "pair_partners04").length, 4, "three attempts, then the round alone");
  for (const id of pairSectionIds("partners").filter((id) => id !== "partners04")) assert.equal(fake.calls.filter((k) => k === `pair_${id}`).length, 1, `${id} called once`);
  assert.equal(fake.calls[fake.calls.length - 1], "pair_whatToPractise", "chapter 07 waited for the round alone");
  assert.ok(lensChapterOf(out, "partners04"));
  assert.equal(frames.filter((f) => f === "partners04").length, 1, "the failed attempts were never stored");
  const rows = failureRows.filter((r) => r.section === "pair:partners04");
  assert.equal(rows.filter((r) => r.ruleId === "chk-21a" && r.class === "block").length, 3);
  assert.equal(rows.filter((r) => r.ruleId === "pass").length, 1);
  assert.equal(new Set(rows.map((r) => r.writeId)).size, 2, "the three attempts share a write id; the round alone has its own");
});

test("the round alone carries every earlier error and the previous reply (acceptance 5)", async () => {
  const brief = buildPairBrief(input());
  const replies = pairReplies(brief);
  const good = replies.pair_partners04 as { pattern: string };
  const seen: string[] = [];
  let n = 0;
  fake.replies = { ...replies, pair_partners04: (req: FakeRequest) => { seen.push(req.messages[1].content); return n++ < 3 ? { ...good, pattern: `${TRINE} Attempt ${n}.` } : good; } };
  fake.calls = [];
  await generatePairInterpretation(input());
  assert.equal(seen.length, 4);
  assert.ok(!/EVERY ERROR SO FAR/.test(seen[0]));
  assert.match(seen[1], /EVERY ERROR SO FAR:\n1\. .*trine/);
  assert.match(seen[2], /1\. .*trine[\s\S]*2\. .*trine/);
  assert.match(seen[3], /1\. [\s\S]*2\. [\s\S]*3\. /, "the round alone starts from all three errors");
  assert.match(seen[3], /YOUR LAST REPLY:\n\{[\s\S]*Attempt 3/, "and the reply they were found in");
  assert.match(seen[3], /Fix these and keep the rest\./);
});

test("stubbed to fail every time: the report fails with code quality and the sections still running are aborted (acceptance 4)", async () => {
  const brief = buildPairBrief(input());
  const replies = pairReplies(brief);
  const good = replies.pair_partners05 as { pattern: string };
  fake.replies = { ...replies, pair_partners05: { ...good, pattern: TRINE } };
  fake.delays = { pair_partners06: 400 };
  fake.calls = [];
  const frames: string[] = [];
  try {
    await assert.rejects(
      generatePairInterpretation(input(), { onSection: (f) => { frames.push(f.section); } }),
      (err: unknown) => err instanceof ReportFailure && err.code === "quality" && /pair:partners05: failed validation after 3 attempts/.test(err.message),
    );
  } finally {
    fake.delays = {};
  }
  assert.equal(fake.calls.filter((k) => k === "pair_partners05").length, 6, "three attempts and a round alone of three");
  assert.ok(!frames.includes("partners06"), "the slow chapter was aborted, never stored");
  assert.ok(!fake.calls.includes("pair_whatToPractise"), "chapter 07 never ran");
});

test("a network error gives provider_unreachable; a plain outage is internal", async () => {
  const brief = buildPairBrief(input());
  fake.replies = pairReplies(brief);
  fake.failOn = "pair_partners05";
  fake.failWith = () => Object.assign(new Error("Connection error."), { name: "APIConnectionError", cause: Object.assign(new Error("fetch failed"), { code: "ECONNRESET" }) });
  try {
    await assert.rejects(generatePairInterpretation(input()), (err: unknown) => err instanceof ReportFailure && err.code === "provider_unreachable");
    fake.failWith = undefined;
    await assert.rejects(generatePairInterpretation(input()), (err: unknown) => err instanceof ReportFailure && err.code === "internal" && /simulated outage on pair_partners05/.test(err.message));
  } finally {
    fake.failOn = null;
    fake.failWith = undefined;
  }
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
    assert.equal(fake.calls.filter((k) => k === "pair_partners05").length >= 1, true);
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
