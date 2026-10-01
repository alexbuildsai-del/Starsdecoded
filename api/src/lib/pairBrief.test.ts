import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNatalChart } from "./chartCalculation.js";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, installFakeModel } from "./testModel.js";

const { generateInterpretation } = await import("./aiInterpretation.js");
const { buildPairBrief, chapterBrief, CROSS_ORB } = await import("./pairBrief.js");

const fake = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const curieReport = await generateInterpretation(chartFromFixture("marie-curie"), "Marie Curie");
fake.replies = cannedNatalReplies({ drawn: true, sunSign: "aquarius", sunHouse: 3, sect: "night" });
const winfreyReport = await generateInterpretation(chartFromFixture("oprah-winfrey"), "Oprah Winfrey");
fake.replies = cannedNatalReplies({ drawn: false, sunSign: "scorpio" });
const blindCurieReport = await generateInterpretation(calculateNatalChart("1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720), "Marie Curie");
fake.restore();

const input = () => ({
  lens: "partners" as const,
  a: { name: "Marie Curie", chart: chartFromFixture("marie-curie"), interpretation: curieReport },
  b: { name: "Oprah Winfrey", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
});

test("the pair brief reads both stored reports and both cached charts, numbers every link, and holds the claims out of its head", () => {
  const b = buildPairBrief(input());
  assert.equal(b.blind, false);
  assert.equal(b.a.foundation.chartThesis, "Depth over display.");
  assert.equal(b.b.theChallenge, "You leave the room a minute before you are asked to.");
  assert.equal(b.a.connectBestWith.length, 3);
  assert.ok(b.cross.length > 0 && b.cross.every((c) => c.orb <= CROSS_ORB));
  assert.equal(b.cross[0].orb, Math.min(...b.cross.map((c) => c.orb)), "strongest first");
  assert.equal(b.overlays.length, 20);
  assert.equal(b.notable.length, 4);
  assert.equal(b.links.length, b.cross.length + b.notable.length);
  assert.deepEqual(b.links.map((l) => l.n), b.links.map((_, i) => i + 1));
  assert.match(b.text, /^PAIR: A is Marie Curie\. B is Oprah Winfrey\. LENS: partners\./m);
  assert.match(b.text, /EXAMPLE REGISTER .*the end of a long day, a bill, an argument at 11 pm/);
  assert.match(b.text, /LINKS, numbered \(the cross aspects within \d+ degrees, strongest first, A's body then B's, then the notable overlays\):/);
  assert.match(b.text, /connects best with: Field research \(you test before you trust\), Laboratory work \(you keep going when others stop\), Teaching/);
  assert.match(b.text, /- L1: A \w+ \w+ B \w+ \(orb/);
  assert.match(b.text, /A Sun falls in B's 12th house/);
  assert.match(b.text, /B Sun falls in A's 2nd house/);
  assert.doesNotMatch(b.text, /claim 1:/, "the claims belong to the chapter tails, not the common head");
  assert.ok(Object.keys(b.a.claims).includes("overview"));
  assert.ok(!Object.keys(b.a.claims).includes("houses"), "the house readings carry no claims");
  assert.equal(b.band, null);
  assert.equal(b.label, null);
});

test("a chapter's tail carries only its own links, the claims of the sections it draws on, its one scene and the band", () => {
  const b = buildPairBrief({ ...input(), lens: "parent_child", parent: "B", a: { ...input().a, birthDate: "2018-03-02" }, at: new Date("2026-09-21T00:00:00Z") });
  assert.equal(b.band, "school");
  const tail = chapterBrief(b, {
    owned: [b.links[0].key, b.links[2].key],
    draws: ["overview"],
    scene: "The morning rush",
  });
  assert.match(tail, /THIS CHAPTER'S LINKS/);
  assert.match(tail, new RegExp(`- L1: `));
  assert.match(tail, new RegExp(`- L3: `));
  assert.doesNotMatch(tail, /- L2: /);
  assert.match(tail, /A\/overview claim 1: "You investigate first and commit second\."/);
  assert.doesNotMatch(tail, /A\/relationships claim/);
  assert.match(tail, /^SCENE for this chapter \(write this one and no other\): The morning rush$/m);
  assert.doesNotMatch(tail, /chosen|SCENES/);
  assert.match(tail, /BAND: the child is in the school \(6 to 12\) band, 8 years old today\./);
  const none = chapterBrief(b, { owned: [], draws: [] });
  assert.match(none, /none: cite sources only/);
  assert.doesNotMatch(none, /SCENE/);
});

test("a blind chart on either side: the overlays and every house-based line are omitted, not guessed", () => {
  const b = buildPairBrief({
    lens: "people",
    a: { name: "Marie Curie", chart: calculateNatalChart("1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720), interpretation: blindCurieReport },
    b: { name: "Oprah Winfrey", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
  });
  assert.equal(b.blind, true);
  assert.equal(b.overlays.length, 0);
  assert.equal(b.notable.length, 0);
  assert.ok(b.links.every((l) => l.kind === "aspect"));
  assert.doesNotMatch(b.text, /\d+(st|nd|rd|th) house/);
  assert.doesNotMatch(b.text, /OVERLAYS/);
  assert.match(b.text, /HORIZON: one chart has no recorded birth time/);
  assert.ok(b.cross.length > 0, "the cross aspects need no horizon");
  assert.doesNotMatch(b.text, /Sun 14\.\d Scorpio, \d+/);
  const tail = chapterBrief(b, { owned: [b.links[0].key] });
  assert.doesNotMatch(tail, /\d+(st|nd|rd|th) house/);
});

test("the parent brief prints the child's age on the day and the now-and-later rule; over 18 the past-tense line (ADR-83)", async () => {
  const { buildPairBrief: build } = await import("./pairBrief.js");
  const { chartFromFixture: fixture } = await import("./testFixtures.js");
  const { cannedNatalReplies: canned, installFakeModel: install } = await import("./testModel.js");
  const { generateInterpretation: gen } = await import("./aiInterpretation.js");
  const { lensContext } = await import("../prompts/pair/index.js");
  install(canned({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
  const curie = await gen(fixture("marie-curie"), "Marie Curie");
  const at = new Date("2026-09-25T00:00:00Z");
  const brief = build({ lens: "parent_child", parent: "A", at, a: { name: "Marie Curie", birthDate: "1867-11-07", chart: fixture("marie-curie"), interpretation: curie }, b: { name: "Zoë Curie", birthDate: "2016-03-10", chart: fixture("marie-curie"), interpretation: curie } });
  assert.equal(brief.childAge, 10);
  assert.equal(brief.band, "school");
  assert.match(brief.text, /10 years old on the day this is written/);
  assert.match(brief.text, /Write for this age now\. A later stage may be discussed, framed as later\./);
  assert.match(lensContext(brief), /NOW AND LATER/);
  assert.ok(!/past tense only/.test(lensContext(brief)));
  const grown = build({ lens: "parent_child", parent: "A", at, a: { name: "Marie Curie", birthDate: "1867-11-07", chart: fixture("marie-curie"), interpretation: curie }, b: { name: "Zoë Curie", birthDate: "2004-03-10", chart: fixture("marie-curie"), interpretation: curie } });
  assert.equal(grown.childAge, 22);
  assert.match(grown.text, /framed as later\. Childhood is past tense only\./);
  assert.match(lensContext(grown), /remembered, in the past tense only/);
});

test("a child under 3 is written as 3 wherever a prompt states the age; the band stays little and the brief keeps the real age (ADR-176)", async () => {
  const { lensContext } = await import("../prompts/pair/index.js");
  const { writtenAge } = await import("./pairBrief.js");
  const model = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "leo", sunHouse: 7 }));
  const beatrice = await generateInterpretation(chartFromFixture("beatrice"), "Beatrice York");
  model.replies = cannedNatalReplies({ drawn: true, sunSign: "aquarius", sunHouse: 9 });
  const athena = await generateInterpretation(chartFromFixture("athena"), "Athena Mapelli Mozzi");
  model.restore();
  // Athena Mapelli Mozzi, born 2025-01-22, is ten months old on this day.
  const at = new Date("2025-11-25T00:00:00Z");
  const brief = buildPairBrief({
    lens: "parent_child", parent: "A", at,
    a: { name: "Beatrice York", birthDate: "1988-08-08", chart: chartFromFixture("beatrice"), interpretation: beatrice },
    b: { name: "Athena Mapelli Mozzi", birthDate: "2025-01-22", chart: chartFromFixture("athena"), interpretation: athena },
  });
  assert.equal(brief.band, "little");
  assert.equal(brief.childAge, 0, "the brief keeps the real age; only the words say 3");
  const texts = [brief.text, lensContext(brief), chapterBrief(brief, { owned: [], scene: "Bedtime, the third call" })];
  assert.match(texts[0], /Beatrice York is the parent\. Athena Mapelli Mozzi is the child, 3 years old on the day this is written, in the little \(0 to 5\) band\./);
  assert.match(texts[1], /Athena Mapelli Mozzi is in the little band, 3 years old on the day this is written\./);
  assert.match(texts[2], /BAND: the child is in the little \(0 to 5\) band, 3 years old today\. Write for this age now\. Later stages only as later\./);
  for (const t of texts) assert.doesNotMatch(t, /\b[0-2] years? old\b|\bmonths? old\b/);
  assert.deepEqual([0, 1, 2, 3, 4, 17].map(writtenAge), [3, 3, 3, 3, 4, 17]);
});
