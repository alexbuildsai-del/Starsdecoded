/**
 * The compatibility pipeline without the model: canned, schema-valid replies
 * built from the real pair brief, so the fan-out, the frames, the allocation,
 * the scenes, the stored claims and the failure path are proven end to end.
 */
import { readFileSync } from "node:fs";
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
  assert.equal(out.meta.promptVersion, "p4");
  assert.equal(out.meta.reportType, "compatibility");
  assert.equal(out.meta.lens, "partners");
  assert.equal(out.meta.band, null);
  assert.deepEqual(out.meta.names, { a: "Marie Curie", b: "Oprah Winfrey" });
  assert.equal(out.meta.blind, false);
  assert.ok(out.meta.wordCount > 300);
  assert.equal(out.meta.usage.sections.length, 9);
  // One fixed scene a lens chapter, stored in the p2 shape so both versions read alike (ADR-176).
  assert.deepEqual(Object.keys(out.scenes), ["partners02", "partners03", "partners04", "partners05", "partners06"]);
  assert.deepEqual(out.scenes.partners02, { titles: ["The end of a long day"], written: 0, texts: {} });
  assert.deepEqual(Object.values(out.scenes).map((s) => s.titles), [["The end of a long day"], ["The argument at 11 pm"], ["The bill nobody expected"], ["The weekend away"], ["The job offer in another city"]]);
  // The canned foundation still carries p2's scene picks and chapter 01 a pointer: the schemas drop both before anything is stored.
  assert.ok(!("scenes" in out.foundation), "the foundation picks no scene");
  assert.ok(!("pointer" in out.twoCharts), "chapter 01 stores no pointer");
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
  assert.deepEqual(out.scenes.parentChild02, { titles: ["The Sunday call"], written: 0, texts: {} });
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
  assert.match(preview.user, /^SCENE for this chapter \(write this one and no other\): The end of a long day$/m);
  assert.doesNotMatch(preview.user, /chosen/);
  const partnersSystem = preview.system;
  const peoplePreview = await previewPairSectionPrompt("pair:people02", people);
  assert.equal(peoplePreview.system, partnersSystem, "the cached system prompt is identical across lenses");
  assert.match(peoplePreview.user, /colleagues/);
});

test("a ten-month-old child: every prompt says 3 years old, the band and the meta stay little, the scenes are the little band's own (ADR-176)", async () => {
  fake.replies = cannedNatalReplies({ drawn: true, sunSign: "leo", sunHouse: 7 });
  const beatrice = await generateInterpretation(chartFromFixture("beatrice"), "Beatrice York");
  fake.replies = cannedNatalReplies({ drawn: true, sunSign: "aquarius", sunHouse: 9 });
  const athena = await generateInterpretation(chartFromFixture("athena"), "Athena Mapelli Mozzi");
  // Athena Mapelli Mozzi, born 2025-01-22, is ten months old on this day.
  const baby = {
    lens: "parent_child" as const, parent: "A" as const, at: new Date("2025-11-25T00:00:00Z"),
    a: { name: "Beatrice York", birthDate: "1988-08-08", chart: chartFromFixture("beatrice"), interpretation: beatrice },
    b: { name: "Athena Mapelli Mozzi", birthDate: "2025-01-22", chart: chartFromFixture("athena"), interpretation: athena },
  };
  const brief = buildPairBrief(baby);
  // The canned pair replies speak of Marie and Oprah; here they speak of these two.
  const canned = JSON.parse(JSON.stringify(pairReplies(brief)).replaceAll("Marie", "Beatrice").replaceAll("Oprah", "Athena")) as Record<string, unknown>;
  const users: string[] = [];
  fake.replies = Object.fromEntries(Object.entries(canned).map(([k, v]) => [k, (req: FakeRequest) => { users.push(req.messages[1].content); return v; }]));
  fake.calls = [];
  const out = await generatePairInterpretation(baby);
  assert.equal(out.meta.band, "little");
  assert.equal(users.length, 9, "the foundation, seven chapters and the link cards");
  for (const user of users) {
    assert.match(user, /^A is the parent\. B is the child, 3 years old on the day this is written, in the little \(0 to 5\) band\./m);
    assert.doesNotMatch(user, /\b[0-2] years? old\b/);
  }
  const little = ["Bedtime, the third call", "The supermarket floor", "Tidying before dinner", "The drawing that isn't \"right\"", "Turning off the tablet"];
  assert.deepEqual(Object.values(out.scenes).map((s) => s.titles), little.map((t) => [t]));
  const foundation = users.find((u) => u.includes("CHAPTERS (numbered as owners refer to them):"))!;
  for (const t of little) assert.ok(foundation.includes(`(scene: ${t})`), t);
  const needs = users.find((u) => u.includes("Write What your child needs from you"))!;
  assert.match(needs, /^SCENE for this chapter \(write this one and no other\): Bedtime, the third call$/m);
  assert.match(needs, /BAND: the child is in the little \(0 to 5\) band, 3 years old today\./);
  const practise = users.find((u) => u.includes("NEXT-TIME ITEMS"))!;
  assert.match(practise, /^  - for A, from /m);
  assert.doesNotMatch(practise, /^  - for (?!A,|B,|both,)/m, "an item names its side by letter, never by the name typed");
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

const { proseText } = await import("../prompts/pair/index.js");
const { proseOf, softenQuote } = await import("../prompts/evidence.js");

test("the prose of every reader-facing section is repaired before its checks: labels, word counts and semicolons out, no claim lost, no call spent (annex rows 40 to 42)", async () => {
  const brief = buildPairBrief(input());
  const replies = pairReplies(brief) as Record<string, Record<string, unknown>>;
  // r12b-pair, curie-winfrey under the partners lens: chapter 01's three work lines, each quoted whole by a claim.
  const work = [
    "This is the challenge: Marie needs care when tired, while Oprah may offer another plan; naming the need trains you to pause before either pushes on.",
    "This is the challenge: Marie may hold back her need for space, while Oprah needs time to sort her thoughts; agreeing when to return trains you to trust a pause.",
    "This is the challenge: your shared conversation can open quickly, but the hard parts may stay private; asking plainly what each can offer trains you to keep care mutual.",
  ];
  const two = replies.pair_twoCharts as { strong: string[]; claims: Array<{ quote: string; evidence: unknown[] }> };
  const twoCharts = {
    ...two,
    work,
    strong: [two.strong[0], two.strong[1], `${two.strong[2]} (source: A/overview claim 1; L2)`],
    claims: [...work.map((quote, i) => ({ quote, evidence: two.claims[i].evidence })), two.claims[3]],
  };
  const chapter = replies.pair_partners03 as { card: Record<string, unknown>; whatJustHappened: { becauseA: string; becauseB: string }; pattern: string };
  // r12b-pair, curie-winfrey, parentChild03: the pair line as written. r12b-pair, william-george, parentChild06: the count after a field.
  const partners03 = {
    ...chapter,
    card: { ...chapter.card, pair: "Marie asks; Oprah decides what she wants to share." },
    whatJustHappened: { ...chapter.whatJustHappened, becauseA: `${chapter.whatJustHappened.becauseA} (A/overview claim 1)` },
    pattern: `${chapter.pattern} (56 words)`,
  };
  const cards = (replies.pair_links as { links: Array<{ reading: string }> }).links;
  const links = { links: cards.map((l, i) => (i === 0 ? { ...l, reading: l.reading.replace(", and the private one wins.", "; the private one wins (L1).") } : l)) };
  const practise = { ...replies.pair_whatToPractise, closing: "You leave the room a minute before you are asked to; that is the habit to keep." };
  fake.replies = { ...replies, pair_twoCharts: twoCharts, pair_partners03: partners03, pair_links: links, pair_whatToPractise: practise };
  fake.calls = [];
  failureRows.length = 0;
  const out = await generatePairInterpretation(input());

  for (const id of ["twoCharts", "partners03", "links", "whatToPractise"]) assert.equal(fake.calls.filter((k) => k === `pair_${id}`).length, 1, `${id}: a repair costs no call`);
  const sections = { twoCharts: out.twoCharts, partners03: lensChapterOf(out, "partners03")!, links: out.links, whatToPractise: out.whatToPractise };
  for (const [id, section] of Object.entries(sections)) assert.doesNotMatch(proseText(section), /;|claim \d|\bL\d|words\)/, id);
  assert.equal(lensChapterOf(out, "partners03")!.pattern, chapter.pattern);
  assert.deepEqual(out.twoCharts.work, work.map((w) => w.replace(/; (\w)/, (_, c: string) => `. ${c.toUpperCase()}`)));
  assert.equal(lensChapterOf(out, "partners03")!.card.pair, "Marie asks. Oprah decides what she wants to share.");
  assert.equal(out.whatToPractise.closing, "You leave the room a minute before you are asked to. That is the habit to keep.");
  assert.match(out.links.links[0].reading, /once in private\. The private one wins\. Behaviour check:/);
  assert.equal(out.twoCharts.claims.length, 4, "every claim kept");
  assert.deepEqual(out.twoCharts.claims.slice(0, 3).map((c) => c.quote), out.twoCharts.work);
  for (const section of Object.values(sections)) {
    const prose = softenQuote(proseOf(section));
    for (const c of (section as { claims?: Array<{ quote: string }> }).claims ?? []) assert.ok(prose.includes(softenQuote(c.quote)), c.quote);
  }
  const rows = (section: string) => failureRows.filter((r) => r.section === `pair:${section}`).map((r) => `${r.ruleId}:${r.class}`);
  assert.deepEqual(rows("twoCharts").filter((r) => /^chk-(04|40|41)/.test(r)), ["chk-40:fix", "chk-41:fix", "chk-04:fix", "chk-04:fix", "chk-04:fix"]);
  assert.deepEqual(rows("partners03").filter((r) => /^chk-4[0-2]/.test(r)), ["chk-40:fix", "chk-42:fix", "chk-41:fix"]);
  assert.deepEqual(rows("links").filter((r) => /^chk-(40|41)/.test(r)), ["chk-40:fix", "chk-41:fix"]);
  assert.deepEqual(rows("whatToPractise").filter((r) => /^chk-(40|41)/.test(r)), ["chk-41:fix"]);
  assert.ok(!failureRows.some((r) => r.class === "block"), "a repair never blocks");
});

test("a label left in a sentence blocks: the chapter retries with the message and the clean reply stands (annex row 40)", async () => {
  const brief = buildPairBrief(input());
  const replies = pairReplies(brief);
  const good = replies.pair_partners02 as { pattern: string };
  const seen: string[] = [];
  // r12-pair, charles-william, chapter 01: each line ended on its link's number.
  fake.replies = { ...replies, pair_partners02: (req: FakeRequest) => { seen.push(req.messages[1].content); return seen.length === 1 ? { ...good, pattern: `${good.pattern} L1` } : good; } };
  fake.calls = [];
  failureRows.length = 0;
  const out = await generatePairInterpretation(input());
  assert.equal(seen.length, 2);
  assert.match(seen[1], /EVERY ERROR SO FAR:\n1\. pattern: the brief's label "L1" sits in a sentence\. A citation lives in the claims field only, never in the prose\./);
  assert.equal(lensChapterOf(out, "partners02")!.pattern, good.pattern);
  const rows = failureRows.filter((r) => r.section === "pair:partners02");
  assert.deepEqual(rows.filter((r) => r.ruleId === "chk-40").map((r) => `${r.class}:${r.attempt}`), ["block:1"]);
  assert.ok(rows.some((r) => r.ruleId === "pass" && r.attempt === 2));
  assert.ok(rows.every((r) => !/\bL1\b/.test(r.message)), "the log names the field and the rule, never the label");
});

// A name a reader typed, written back by the writer, reaches the next prompt only as A or B (ADR-240, MB-152, sentinel S8).
const { dataValue, outsideDataBlocks } = await import("../prompts/data.js");

/** The three injection fixtures' names, read from disk so the test plants what the lab plants (security scope 8). */
const INJECTED = ["inject-delimiter", "inject-instruction", "inject-markup"].map((fixture) =>
  (JSON.parse(readFileSync(new URL(`../../../fixtures/charts/${fixture}.json`, import.meta.url), "utf8")) as { name: string }).name);

test("a name the writer wrote back reaches the next prompt as A or B: the foundation, chapter 07's tail, the last reply and the prose as written (ADR-240)", async () => {
  const source = (report: "A" | "B", section: string) => ({ kind: "source", report, section, claim: 1 });
  for (const typed of INJECTED) {
    const where = typed.slice(0, 24);
    const pair = input("partners", { a: { ...input().a, name: typed } });
    const brief = buildPairBrief(pair);
    // The canned replies call A Marie; a writer calls A by the first word typed, and writes the whole name where it planted it below.
    const firstWord = typed.split(/\s+/)[0];
    const canned = JSON.parse(JSON.stringify(pairReplies(brief)).replaceAll("Marie", () => firstWord)) as Record<string, Record<string, unknown>>;
    const scene = `${typed} comes in late and says nothing. Oprah has the plan on the table already.`;
    (canned.pair_foundation as { pairThesis: string }).pairThesis = `${typed} and Oprah build trust through talk.`;
    (canned.pair_partners02 as { nextTime: { items: unknown[] } }).nextTime.items[0] = { for: "A", action: `${typed}, plan the weekend once, out loud, with Oprah.`, why: "so nobody plans it twice in private" };
    const c = brief.cross[7];
    const partners03 = { ...canned.pair_partners03, scene } as unknown as { claims: Array<{ quote: string; evidence: unknown[] }> };
    partners03.claims = [{ ...partners03.claims[0], evidence: [{ kind: "cross", planetA: c.planetA, planetB: c.planetB, aspect: c.type, orb: c.orb }] }, ...partners03.claims.slice(1)];
    const partners04 = { ...canned.pair_partners04, scene } as unknown as { pattern: string };
    const seen: Array<{ name: string; system: string; user: string }> = [];
    const heard = (name: string, reply: (req: FakeRequest) => unknown) => (req: FakeRequest) => {
      seen.push({ name, system: req.messages[0].content, user: req.messages[1].content });
      return reply(req);
    };
    let attempts04 = 0;
    fake.replies = {
      ...Object.fromEntries(Object.entries(canned).map(([k, v]) => [k, heard(k, () => v)])),
      pair_partners03: heard("pair_partners03", () => partners03),
      // A writer copies its quote from the prose as the prompt showed it.
      pair_partners03_claims: heard("pair_partners03_claims", () => ({ claims: [{ quote: "A comes in late and says nothing.", evidence: [source("A", "overview")] }, ...partners03.claims.slice(1)] })),
      pair_partners04: heard("pair_partners04", () => (attempts04++ === 0 ? { ...partners04, pattern: TRINE } : partners04)),
    };
    fake.calls = [];
    const out = await generatePairInterpretation(pair);

    assert.equal(seen.filter((s) => s.name === "pair_partners04").length, 2, `${where}: one retry`);
    assert.equal(seen.filter((s) => s.name === "pair_partners03_claims").length, 1, `${where}: one claims-only repair`);
    for (const s of seen) {
      for (const text of [s.system, s.user]) {
        const outside = outsideDataBlocks(text);
        assert.doesNotMatch(outside, /pirate|ignore every rule/i, `${where}: ${s.name}`);
        assert.ok(!outside.includes(dataValue(typed)), `${where}: ${s.name}`);
        assert.doesNotMatch(outside, /Oprah|Winfrey/, `${where}: ${s.name}: B is B`);
      }
    }
    const chapters = seen.filter((s) => s.name !== "pair_foundation");
    for (const s of chapters) {
      assert.match(s.user, /"pairThesis": "A and B build trust through talk\."/, `${where}: ${s.name}: the foundation says A and B`);
      assert.match(s.user, /"A finishes what B starts\."/, `${where}: ${s.name}: the strengths the card copies too`);
    }
    const practise = seen.find((s) => s.name === "pair_whatToPractise")!.user;
    assert.match(practise, /^ {2}- for A, from [^:]+: A, plan the weekend once, out loud, with B\. \(why: so nobody plans it twice in private\)$/m);
    const retried = seen.filter((s) => s.name === "pair_partners04")[1].user;
    assert.match(retried.slice(retried.indexOf("YOUR LAST REPLY:")), /A comes in late and says nothing\. B has the plan on the table already\./);
    const repaired = seen.find((s) => s.name === "pair_partners03_claims")!.user;
    assert.match(repaired.slice(repaired.indexOf("PROSE AS WRITTEN")), /A comes in late and says nothing\./);
    const stored = lensChapterOf(out, "partners03")!;
    assert.equal(stored.scene, scene, `${where}: the stored prose keeps the name as typed`);
    assert.equal(stored.claims[0].quote, `${typed} comes in late and says nothing.`, `${where}: the quote copied from the masked prose quotes the prose as stored`);
  }
});
