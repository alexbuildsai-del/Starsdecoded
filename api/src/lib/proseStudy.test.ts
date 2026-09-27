/**
 * The prose study (ADR-88) on seeded cards: the picked-minus-passed deltas
 * per card, overall and per writer, and a proposal at 8 of 12 cards and not
 * at 7. No model is called: the client is stubbed to throw.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { openai } = await import("@workspace/integrations-openai-ai-server");
(openai.chat.completions as unknown as { create: unknown }).create = async () => { throw new Error("the prose study never calls the model"); };
const { PROPOSAL_AGREEMENT, notesEstimateTokens, proseStudy } = await import("./proseStudy.js");
type StudyCard = import("./proseStudy.js").StudyCard;

const SHORT = { text: "You wait. You read the room. Then you speak, and only once. Nobody has to ask you twice." };
const LONG = { text: "In the fullness of a deliberative and characteristically unhurried temperament, you tend to survey the situation extensively before committing yourself to any particular utterance whatsoever." };

function card(i: number, pickShort: boolean): StudyCard {
  return {
    id: `c${i}`, fixture: "marie-curie", section: "career",
    variants: [{ index: 0, writer: "control", text: SHORT }, { index: 1, writer: "gpt-6-sol", text: LONG }],
    picks: { best: [pickShort ? 0 : 1], notShip: [], same: [] },
  };
}

test("per card, the picked minus the passed; the admin's own-report columns count like any other", () => {
  const study = proseStudy([{ ...card(0, true), variants: [{ index: 0, writer: "stored:report", text: SHORT }, { index: 1, writer: "gpt-6-sol", text: LONG }] }]);
  assert.equal(study.cards.length, 1);
  assert.ok(study.cards[0].delta.wordsPerSentenceMean! < 0, "the picked text has shorter sentences");
  assert.ok(study.cards[0].delta.longWordShare! < 0, "and simpler words");
  assert.ok(study.cards[0].delta.fleschReadingEase! > 0);
  assert.deepEqual(study.writers.map((w) => w.writer), ["stored:report", "gpt-6-sol"]);
  assert.equal(study.writers[0].picked, 1);
  assert.equal(study.overall.cards, 1);
});

test("a proposal needs 8 of 12 cards to agree, with its numbers and a rule in words", () => {
  const eight = proseStudy(Array.from({ length: 12 }, (_, i) => card(i, i < 8)));
  const mean = eight.proposals.find((p) => p.metric === "wordsPerSentenceMean");
  assert.ok(mean, eight.proposals.map((p) => p.metric).join(","));
  assert.equal(mean!.agree, PROPOSAL_AGREEMENT);
  assert.equal(mean!.cards, 12);
  assert.equal(mean!.direction, "lower");
  assert.match(mean!.rule, /Sentences average .* words in the picked text against/);
  const seven = proseStudy(Array.from({ length: 12 }, (_, i) => card(i, i < 7)));
  assert.equal(seven.proposals.find((p) => p.metric === "wordsPerSentenceMean"), undefined);
});

test("a card with nothing picked or everything tied has no delta and does not count", () => {
  const tied = proseStudy([{ ...card(0, true), picks: { best: [0], notShip: [], same: [[0, 1]] } }, { ...card(1, true), picks: null }]);
  assert.equal(tied.overall.cards, 0);
  assert.equal(tied.cards[0].delta.words, null);
  assert.deepEqual(tied.proposals, []);
});

test("the notes estimate counts every variant's text in and three lines a card out", () => {
  const t = notesEstimateTokens([card(0, true), card(1, false)]);
  assert.ok(t.inputTokens > 400 && t.inputTokens < 1000, String(t.inputTokens));
  assert.equal(t.outputTokens, 240);
});
