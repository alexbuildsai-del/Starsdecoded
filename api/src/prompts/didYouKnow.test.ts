import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNatalChart } from "../lib/chartCalculation.js";
import { chartFromFixture } from "../lib/testFixtures.js";
import { buildBrief, sectionById } from "./index.js";
import { DID_YOU_KNOW_CHAPTERS, DidYouKnowSchema, didYouKnowContext, topicFor } from "./didYouKnow.js";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { countWords } = await import("../lib/aiInterpretation.js");

// The Did you know card in seven chapters (R19-20, ADR-383): which chapters carry one, and when Overview and Discoveries
// have none. The buyer walk's canned replies carry one card; this pins the rule the real writer is asked by.
const RARE = ["venus", "mars", "mercury", "jupiter", "saturn", "uranus", "pluto", "neptune"] as const;
const AUDREY = buildBrief(chartFromFixture("audrey-hepburn"), "Audrey");
const BLIND = buildBrief(calculateNatalChart("1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720), "Marie");
// A day on which none of the eight is going backwards, checked below, so Discoveries has nothing to say.
const STILL = calculateNatalChart("1990-10-15", "12:00", 51.5074, -0.1278, 0);

test("seven chapters carry the card and House by House, Money, Relationships and the Triad do not", () => {
  assert.deepEqual([...DID_YOU_KNOW_CHAPTERS], ["overview", "mind", "career", "family", "superpowers", "discoveries", "focus"]);
  for (const id of ["overview", "triad", "houses", "mind", "career", "money", "relationships", "family", "superpowers", "discoveries", "focus"]) {
    const has = "didYouKnow" in (sectionById(id)!.schema as unknown as { shape: object }).shape;
    assert.equal(has, (DID_YOU_KNOW_CHAPTERS as readonly string[]).includes(id), id);
  }
  for (const id of ["triad", "houses", "money", "relationships", "foundation"]) assert.equal(topicFor(id, AUDREY), null, id);
});

test("a chart with a time and a planet going backwards gives every one of the seven a topic", () => {
  for (const id of DID_YOU_KNOW_CHAPTERS) {
    const found = topicFor(id, AUDREY);
    assert.ok(found && found.topic.length > 0 && found.lesson.length > 0, id);
    const context = didYouKnowContext(id, AUDREY);
    assert.ok(context.includes(found.topic) && !context.includes("set didYouKnow to null"), id);
  }
});

test("Overview has no card without a birth time, and Discoveries none when no planet goes backwards at birth", () => {
  assert.equal(topicFor("overview", BLIND), null);
  assert.match(didYouKnowContext("overview", BLIND), /set didYouKnow to null/);
  for (const id of ["mind", "career", "family", "superpowers", "focus"] as const) assert.ok(topicFor(id, BLIND), `${id} has a card with no hour`);
  assert.ok(topicFor("discoveries", BLIND), "Marie Curie's Uranus goes backwards");

  assert.deepEqual(RARE.filter((body) => STILL.planets[body]?.retrograde), [], "the chosen day has nothing going backwards");
  const still = buildBrief(STILL, "Still");
  assert.equal(topicFor("discoveries", still), null);
  assert.match(didYouKnowContext("discoveries", still), /set didYouKnow to null/);
  assert.ok(topicFor("overview", still), "and a time gives Overview its card");
});

test("a reply with no card field reads as a chapter with none, and a card is a title and a body", () => {
  assert.equal(DidYouKnowSchema.parse(undefined), null);
  assert.equal(DidYouKnowSchema.parse(null), null);
  assert.deepEqual(DidYouKnowSchema.parse({ title: "Each sign covers 30 degrees?", body: "Old astrology tends to say so." }), { title: "Each sign covers 30 degrees?", body: "Old astrology tends to say so." });
  assert.throws(() => DidYouKnowSchema.parse({ title: "No body?" }));
});

test("the card is not prose: a chapter's word count is the same with and without it", () => {
  const prose = { a: "one two three four", b: ["five six"], claims: [{ quote: "one two three four" }] };
  const card = { title: "A title that has words?", body: "Many astrologers read the Sun as your father and the Moon as your mother." };
  assert.equal(countWords({ ...prose, didYouKnow: card }), countWords(prose));
  assert.equal(countWords(prose), 6);
});
