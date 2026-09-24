import { test } from "node:test";
import assert from "node:assert/strict";
import { CONTROL, STORED, bestGroup, controlAgreement, estimateSession, mulberry32, replayWriters, sectionsWorse, shuffle, tallyMixes, tallyWriters, type RevealCard, type SessionBase } from "./labSession.js";
import { priceSection } from "./labRules.js";

const shape = { inputTokens: 2_000, cachedInputTokens: 8_000, outputTokens: 1_200 };
const bases: SessionBase[] = [{ key: "marie-curie.r06", shapes: { career: shape } }, { key: "day-angular.r06", shapes: {} }];

test("the estimate prices each card from the base shape at each writer's price, standard and Flex, and the stored text costs nothing", () => {
  const est = estimateSession({ bases, sections: ["career"], writers: [STORED, "gpt-6-luna", "gpt-5.2"], control: true });
  assert.equal(est.cards, 2);
  assert.deepEqual(est.perWriter.map((w) => w.writer), ["gpt-6-luna", "gpt-5.2", CONTROL]);
  const luna = est.perWriter[0];
  const expected = priceSection("gpt-6-luna", shape)! + priceSection("gpt-6-luna", { inputTokens: 2_700, cachedInputTokens: 7_750, outputTokens: 1_260 })!;
  assert.ok(Math.abs(luna.standardUsd - expected) < 1e-9);
  assert.equal(luna.replays, 2);
  assert.equal(luna.flexUsd, luna.standardUsd, "no Flex offered until MB-70, so the Flex figure equals standard");
  assert.equal(est.perWriter[2].standardUsd, est.perWriter[1].standardUsd, "the control is a fresh 5.2 replay");
  assert.ok(est.standardUsd > 0 && est.standardUsd === est.perWriter.reduce((n, w) => n + w.standardUsd, 0));
  assert.deepEqual(replayWriters({ writers: [STORED], control: false }), []);
});

test("the shuffle is stored once: the same seed gives the same order, and every item survives", () => {
  const a = shuffle(["s", "l", "c", "k"], mulberry32(7));
  const b = shuffle(["s", "l", "c", "k"], mulberry32(7));
  assert.deepEqual(a, b);
  assert.deepEqual([...a].sort(), ["c", "k", "l", "s"]);
  assert.notDeepEqual(shuffle([1, 2, 3, 4, 5, 6], mulberry32(1)), [1, 2, 3, 4, 5, 6]);
});

const v = (index: number, writer: string, over: Partial<RevealCard["variants"][number]> = {}) => ({ index, writer, model: writer === STORED || writer === CONTROL ? "gpt-5.2" : writer, serviceTier: "standard" as const, words: 400, costUsd: 0.02, faults: 0, ...over });

const cards: RevealCard[] = [
  // stored best, luna tied with it, sol would not ship
  { fixture: "marie-curie", section: "career", variants: [v(0, STORED), v(1, "gpt-6-luna"), v(2, "gpt-6-sol", { faults: 1 }), v(3, CONTROL)], picks: { best: [0], notShip: [2], same: [[0, 1]] } },
  // sol best alone
  { fixture: "day-angular", section: "career", variants: [v(0, "gpt-6-sol"), v(1, STORED), v(2, "gpt-6-luna"), v(3, CONTROL)], picks: { best: [0], notShip: [], same: [] } },
  // overview: control and stored tied best, luna not
  { fixture: "marie-curie", section: "overview", variants: [v(0, CONTROL), v(1, "gpt-6-luna"), v(2, STORED)], picks: { best: [0], notShip: [], same: [[0, 2]] } },
];

test("the best group is the best marks plus what is tied with them", () => {
  assert.deepEqual([...bestGroup({ best: [0], notShip: [], same: [[0, 1], [2, 3]] })].sort(), [0, 1]);
  assert.deepEqual([...bestGroup(null)], []);
});

test("per writer: best, tied and would-not-ship by section and tier, with faults, words and cost", () => {
  const writers = tallyWriters(cards);
  const luna = writers.find((w) => w.writer === "gpt-6-luna")!;
  assert.deepEqual(luna.bySection.career, { best: 0, tied: 1, notShip: 0, cards: 2 });
  assert.deepEqual(luna.bySection.overview, { best: 0, tied: 0, notShip: 0, cards: 1 });
  assert.deepEqual(luna.byTier.scaffolded, { best: 0, tied: 1, notShip: 0, cards: 2 });
  assert.deepEqual(luna.byTier.synthesis, { best: 0, tied: 0, notShip: 0, cards: 1 });
  const sol = writers.find((w) => w.writer === "gpt-6-sol")!;
  assert.deepEqual(sol.total, { best: 1, tied: 0, notShip: 1, cards: 2 });
  assert.equal(sol.faults, 1);
  assert.equal(sol.words, 800);
  assert.ok(Math.abs(sol.costUsd - 0.04) < 1e-9);
  const stored = writers.find((w) => w.writer === STORED)!;
  assert.deepEqual(stored.total, { best: 1, tied: 1, notShip: 0, cards: 3 });
});

test("a writer is worse than 5.2 in a section when it was refused, or 5.2 was best and it was not tied", () => {
  assert.deepEqual(sectionsWorse(cards, "gpt-6-sol"), ["career"]);
  assert.deepEqual(sectionsWorse(cards, "gpt-6-luna"), ["overview"]);
  assert.deepEqual(sectionsWorse(cards, CONTROL), ["career"], "the control lost the first career card to the stored text");
});

test("mixes are priced on the base shapes and read off the section picks; the control's preference rate is the noise floor", () => {
  const mixes = tallyMixes(cards, { career: shape }, ["foundation", "career", "overview"]);
  const byMix = Object.fromEntries(mixes.map((m) => [m.mix, m]));
  assert.deepEqual(byMix.M0.worseThanBaseline, []);
  assert.deepEqual(byMix.S.worseThanBaseline, ["career"]);
  assert.deepEqual(byMix.A.worseThanBaseline, [], "luna held career (tied once, beaten only by sol) and sol never wrote overview");
  assert.deepEqual(byMix.B.worseThanBaseline, ["overview"], "luna on synthesis lost overview to the tied 5.2s");
  assert.deepEqual(byMix.L.worseThanBaseline, ["overview"]);
  assert.ok(byMix.L.costUsd! < byMix.S.costUsd! && byMix.S.costUsd! < byMix.M0.costUsd!);
  const control = controlAgreement(cards);
  assert.equal(control.cards, 3);
  assert.equal(control.agree, 2, "the overview card tied them and the second career card passed both over; only the first preferred the stored 5.2");
  assert.ok(Math.abs(control.rate! - 1 / 3) < 1e-9);
});
