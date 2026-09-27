/**
 * The prose study (ADR-88): after a reveal, every variant of every card is
 * measured in code (`proseMetrics`), and the picked texts are compared with
 * the ones passed over, per card, overall and per writer. A measure that
 * agrees in direction on at least 8 of 12 cards becomes a proposed style
 * rule with its numbers, for the Owner to approve; nothing edits a prompt
 * (R-5.4). No model call here; text never leaves the database.
 */
import { METRIC_KEYS, measureProse, proseText, type ProseMetrics } from "./proseMetrics.js";
import { bestGroup, type Picks } from "./labSession.js";

export type MetricKey = (typeof METRIC_KEYS)[number];

export interface StudyVariant {
  index: number;
  writer: string;
  text: unknown;
}

export interface StudyCard {
  id: string;
  fixture: string;
  section: string;
  variants: StudyVariant[];
  picks: Picks | null;
}

export type MetricDeltas = Record<MetricKey, number | null>;

export interface CardStudy {
  id: string;
  fixture: string;
  section: string;
  picked: number[];
  passed: number[];
  pickedMean: Record<MetricKey, number>;
  passedMean: Record<MetricKey, number>;
  delta: MetricDeltas;
}

export interface WriterStudy {
  writer: string;
  variants: number;
  picked: number;
  mean: Record<MetricKey, number>;
  /** This writer's mean against every other variant's mean. */
  delta: MetricDeltas;
}

export interface Proposal {
  metric: MetricKey;
  direction: "lower" | "higher";
  agree: number;
  cards: number;
  pickedMean: number;
  passedMean: number;
  rule: string;
}

export interface ProseStudy {
  cards: CardStudy[];
  overall: { cards: number; delta: MetricDeltas; pickedMean: Record<MetricKey, number>; passedMean: Record<MetricKey, number> };
  writers: WriterStudy[];
  proposals: Proposal[];
}

export const PROPOSAL_AGREEMENT = 8;
export const PROPOSAL_CARDS = 12;

const emptyMetrics = (): Record<MetricKey, number> => Object.fromEntries(METRIC_KEYS.map((k) => [k, 0])) as Record<MetricKey, number>;

function meanOf(list: ProseMetrics[]): Record<MetricKey, number> {
  const out = emptyMetrics();
  if (!list.length) return out;
  for (const k of METRIC_KEYS) out[k] = list.reduce((n, m) => n + m[k], 0) / list.length;
  return out;
}

function deltaOf(a: Record<MetricKey, number>, b: Record<MetricKey, number>, ok: boolean): MetricDeltas {
  return Object.fromEntries(METRIC_KEYS.map((k) => [k, ok ? a[k] - b[k] : null])) as MetricDeltas;
}

/** What a lower or a higher figure means for the reader, so the proposal reads as a rule and not a number. */
const RULE_TEXT: Record<MetricKey, (direction: "lower" | "higher", picked: number, passed: number) => string> = {
  words: (d, p, q) => `The picked text is ${d === "lower" ? "shorter" : "longer"}: ${Math.round(p)} words against ${Math.round(q)}.`,
  sentences: (d, p, q) => `The picked text has ${d === "lower" ? "fewer" : "more"} sentences: ${p.toFixed(1)} against ${q.toFixed(1)}.`,
  wordsPerSentenceMean: (d, p, q) => `Sentences average ${p.toFixed(1)} words in the picked text against ${q.toFixed(1)}: set the contract's average at about ${Math.round(p)}${d === "lower" ? " or fewer" : ""}.`,
  wordsPerSentenceP90: (d, p, q) => `Nine sentences in ten stay under ${Math.round(p)} words in the picked text against ${Math.round(q)}${d === "lower" ? "; the long tail is what the reader passed over" : ""}.`,
  longestSentence: (d, p, q) => `The longest sentence is ${Math.round(p)} words in the picked text against ${Math.round(q)}: set the ceiling at about ${Math.round(p)}.`,
  longWordShare: (d, p, q) => `${(p * 100).toFixed(0)}% of words have three or more syllables in the picked text against ${(q * 100).toFixed(0)}%: ${d === "lower" ? "simpler vocabulary wins" : "richer vocabulary wins"}.`,
  avgWordLength: (d, p, q) => `Words average ${p.toFixed(2)} letters in the picked text against ${q.toFixed(2)}.`,
  fleschReadingEase: (d, p, q) => `Reading ease ${p.toFixed(0)} in the picked text against ${q.toFixed(0)}: ${d === "higher" ? "easier reads win" : "denser reads win"}.`,
  secondPersonSentenceShare: (d, p, q) => `${(p * 100).toFixed(0)}% of sentences address the reader in the picked text against ${(q * 100).toFixed(0)}%.`,
  emDashes: (d, p, q) => `${p.toFixed(1)} em dashes a text in the picked text against ${q.toFixed(1)}.`,
  semicolons: (d, p, q) => `${p.toFixed(1)} semicolons a text in the picked text against ${q.toFixed(1)}.`,
  paragraphs: (d, p, q) => `${p.toFixed(1)} paragraphs in the picked text against ${q.toFixed(1)}.`,
};

/** The study, pure: measures, deltas and proposals from the cards as the reveal resolved them. */
export function proseStudy(cards: StudyCard[]): ProseStudy {
  const measured = cards.map((card) => ({ card, metrics: card.variants.map((v) => ({ v, m: measureProse(proseText(v.text)) })) }));
  const cardStudies: CardStudy[] = measured.map(({ card, metrics }) => {
    const best = bestGroup(card.picks);
    const notShip = new Set(card.picks?.notShip ?? []);
    const picked = metrics.filter((x) => best.has(x.v.index));
    const passed = metrics.filter((x) => !best.has(x.v.index) || notShip.has(x.v.index));
    const pickedMean = meanOf(picked.map((x) => x.m));
    const passedMean = meanOf(passed.map((x) => x.m));
    return { id: card.id, fixture: card.fixture, section: card.section, picked: picked.map((x) => x.v.index), passed: passed.map((x) => x.v.index), pickedMean, passedMean, delta: deltaOf(pickedMean, passedMean, picked.length > 0 && passed.length > 0) };
  });
  const comparable = cardStudies.filter((c) => c.picked.length && c.passed.length);
  const overallPicked = meanOf(comparable.map((c) => c.pickedMean as unknown as ProseMetrics));
  const overallPassed = meanOf(comparable.map((c) => c.passedMean as unknown as ProseMetrics));

  const byWriter = new Map<string, { list: ProseMetrics[]; picked: number }>();
  const all: ProseMetrics[] = [];
  for (const { card, metrics } of measured) {
    const best = bestGroup(card.picks);
    for (const x of metrics) {
      all.push(x.m);
      const w = byWriter.get(x.v.writer) ?? { list: [], picked: 0 };
      w.list.push(x.m);
      if (best.has(x.v.index)) w.picked += 1;
      byWriter.set(x.v.writer, w);
    }
  }
  const writers: WriterStudy[] = [...byWriter.entries()].map(([writer, w]) => {
    const others = all.filter((m) => !w.list.includes(m));
    const mean = meanOf(w.list);
    return { writer, variants: w.list.length, picked: w.picked, mean, delta: deltaOf(mean, meanOf(others), others.length > 0) };
  }).sort((a, b) => b.picked - a.picked || a.writer.localeCompare(b.writer));

  const proposals: Proposal[] = [];
  for (const metric of METRIC_KEYS) {
    const signs = comparable.map((c) => c.delta[metric]!).filter((d) => d !== 0);
    const lower = signs.filter((d) => d < 0).length;
    const higher = signs.filter((d) => d > 0).length;
    const agree = Math.max(lower, higher);
    if (comparable.length >= 1 && agree >= PROPOSAL_AGREEMENT) {
      const direction = lower >= higher ? "lower" : "higher";
      proposals.push({ metric, direction, agree, cards: comparable.length, pickedMean: overallPicked[metric], passedMean: overallPassed[metric], rule: RULE_TEXT[metric](direction, overallPicked[metric], overallPassed[metric]) });
    }
  }
  return {
    cards: cardStudies,
    overall: { cards: comparable.length, delta: deltaOf(overallPicked, overallPassed, comparable.length > 0), pickedMean: overallPicked, passedMean: overallPassed },
    writers,
    proposals: proposals.sort((a, b) => b.agree - a.agree),
  };
}

/** What the optional notes would cost: every variant's text in, three lines a card out, at the notes model's price. */
export function notesEstimateTokens(cards: StudyCard[]): { inputTokens: number; outputTokens: number } {
  const chars = cards.reduce((n, c) => n + c.variants.reduce((m, v) => m + proseText(v.text).length, 0), 0);
  return { inputTokens: Math.ceil(chars / 4) + cards.length * 200, outputTokens: cards.length * 120 };
}
