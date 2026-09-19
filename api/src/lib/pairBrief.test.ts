import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNatalChart } from "./chartCalculation.js";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, installFakeModel } from "./testModel.js";

const { generateInterpretation } = await import("./aiInterpretation.js");
const { buildPairBrief, CROSS_ORB } = await import("./pairBrief.js");

const fake = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const curieReport = await generateInterpretation(chartFromFixture("marie-curie"), "Marie Curie");
fake.replies = cannedNatalReplies({ drawn: true, sunSign: "aquarius", sunHouse: 3, sect: "night" });
const winfreyReport = await generateInterpretation(chartFromFixture("oprah-winfrey"), "Oprah Winfrey");
fake.replies = cannedNatalReplies({ drawn: false, sunSign: "scorpio" });
const blindCurieReport = await generateInterpretation(calculateNatalChart("1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720), "Marie Curie");
fake.restore();

test("the pair brief reads both stored reports and both cached charts, and derives the rest in code", () => {
  const b = buildPairBrief({
    lens: "partners",
    a: { name: "Marie Curie", chart: chartFromFixture("marie-curie"), interpretation: curieReport },
    b: { name: "Oprah Winfrey", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
  });
  assert.equal(b.blind, false);
  assert.equal(b.a.foundation.chartThesis, "Depth over display.");
  assert.equal(b.b.theChallenge, "You leave the room a minute before you are asked to.");
  assert.equal(b.a.connectBestWith.length, 3);
  assert.ok(b.cross.length > 0 && b.cross.every((c) => c.orb <= CROSS_ORB));
  assert.equal(b.cross[0].orb, Math.min(...b.cross.map((c) => c.orb)), "strongest first");
  assert.equal(b.overlays.length, 20);
  assert.equal(b.notable.length, 4);
  assert.match(b.text, /^PAIR: A is Marie Curie\. B is Oprah Winfrey\. LENS: partners\./m);
  assert.match(b.text, /EXAMPLE REGISTER .*a weekend, a bill, an argument at 11 pm, a move/);
  assert.match(b.text, /CROSS ASPECTS within 4 degrees/);
  assert.match(b.text, /A Sun falls in B's 12th house/);
  assert.match(b.text, /B Sun falls in A's 2nd house/);
  assert.match(b.text, /NOTABLE OVERLAYS/);
  assert.match(b.text, /A\/overview claim 1: "You investigate first and commit second\."/);
  assert.match(b.text, /B\/relationships claim 1:/);
  assert.ok(Object.keys(b.a.claims).includes("overview"));
  assert.ok(!Object.keys(b.a.claims).includes("houses"), "the house readings carry no claims");
});

test("a blind chart on either side: the overlays and every house-based line are omitted, not guessed", () => {
  const b = buildPairBrief({
    lens: "family",
    a: { name: "Marie Curie", chart: calculateNatalChart("1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720), interpretation: blindCurieReport },
    b: { name: "Oprah Winfrey", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
  });
  assert.equal(b.blind, true);
  assert.equal(b.overlays.length, 0);
  assert.equal(b.notable.length, 0);
  assert.doesNotMatch(b.text, /\d+(st|nd|rd|th) house/);
  assert.doesNotMatch(b.text, /OVERLAYS/);
  assert.match(b.text, /HORIZON: one chart has no recorded birth time/);
  assert.ok(b.cross.length > 0, "the cross aspects need no horizon");
  assert.doesNotMatch(b.text, /Sun 14\.\d Scorpio, \d+/);
});
