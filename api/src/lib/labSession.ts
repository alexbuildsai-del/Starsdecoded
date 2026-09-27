/**
 * A reading session's pure rules (ADR-54, ADR-55, ADR-57, ADR-75): the
 * estimate priced on the base's token shapes, the one-time shuffle whose
 * order is stored, and the tallies the reveal shows. No database here, so
 * every rule is proven against memory.
 */
import { FALLBACK_SHAPE, priceSection, type TokenShape } from "./labRules.js";
import { MODELS, type ServiceTier } from "./models.js";

/**
 * The stored base text costs nothing; `stored:<label>` is the same chart's
 * stored text under another label (r05 against r06 at no spend, MB-72); the
 * control is a fresh baseline replay, hidden until the reveal.
 */
export const STORED = "stored";
export const CONTROL = "control";
export const isStored = (writer: string): boolean => writer === STORED || writer.startsWith("stored:");
export const BASELINE = MODELS.sections;

/** The four levels of reasoning a section asks for (annex), for the reveal's by-tier tallies. */
export const SECTION_TIERS: Record<string, string> = {
  foundation: "open-ended",
  overview: "synthesis", discoveries: "synthesis", superpowers: "synthesis", focus: "synthesis",
  triad: "scaffolded", mind: "scaffolded", career: "scaffolded", money: "scaffolded", relationships: "scaffolded", family: "scaffolded",
  houses: "mechanical",
};

export interface SessionBase {
  key: string;
  shapes: Record<string, TokenShape>;
}

export interface SessionRequest {
  bases: SessionBase[];
  sections: string[];
  writers: string[];
  control: boolean;
}

export interface Estimate {
  cards: number;
  standardUsd: number;
  flexUsd: number;
  perWriter: Array<{ writer: string; standardUsd: number; flexUsd: number; replays: number }>;
}

/** The writers that replay: every ticked catalogue id, plus the control on the baseline. `stored` costs nothing. */
export function replayWriters(req: Pick<SessionRequest, "writers" | "control">): Array<{ writer: string; model: string }> {
  const out = req.writers.filter((w) => !isStored(w)).map((w) => ({ writer: w, model: w }));
  if (req.control) out.push({ writer: CONTROL, model: BASELINE });
  return out;
}

/** Each card priced from the base run's per-section token shape at each writer's price, standard and Flex. */
export function estimateSession(req: SessionRequest): Estimate {
  const cards = req.bases.length * req.sections.length;
  const perWriter = replayWriters(req).map(({ writer, model }) => {
    let standardUsd = 0, flexUsd = 0;
    for (const base of req.bases) for (const section of req.sections) {
      const shape = base.shapes[section] ?? FALLBACK_SHAPE;
      standardUsd += priceSection(model, shape, "standard") ?? 0;
      flexUsd += priceSection(model, shape, "flex") ?? 0;
    }
    return { writer, standardUsd, flexUsd, replays: cards };
  });
  return {
    cards,
    standardUsd: perWriter.reduce((n, w) => n + w.standardUsd, 0),
    flexUsd: perWriter.reduce((n, w) => n + w.flexUsd, 0),
    perWriter,
  };
}

/** A small seeded generator so a stored order can be reproduced in a test; production seeds from random bytes. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates on a copy; the result is stored once and never reshuffled (ADR-54). */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface Picks {
  best: number[];
  notShip: number[];
  same: number[][];
}

/** A variant on a card as the reveal sees it: who wrote it and what it cost. */
export interface RevealVariant {
  index: number;
  writer: string;
  model: string;
  serviceTier: ServiceTier;
  words: number;
  costUsd: number | null;
  faults: number;
}

export interface RevealCard {
  fixture: string;
  section: string;
  variants: RevealVariant[];
  picks: Picks | null;
}

export interface Tally {
  best: number;
  tied: number;
  notShip: number;
  cards: number;
}

const zero = (): Tally => ({ best: 0, tied: 0, notShip: 0, cards: 0 });

/** The best group of a card: every variant marked best, plus everything tied with one of them. */
export function bestGroup(picks: Picks | null): Set<number> {
  const group = new Set<number>(picks?.best ?? []);
  for (const g of picks?.same ?? []) if (g.some((i) => group.has(i))) for (const i of g) group.add(i);
  return group;
}

export interface WriterReveal {
  writer: string;
  serviceTier: ServiceTier;
  bySection: Record<string, Tally>;
  byTier: Record<string, Tally>;
  total: Tally;
  faults: number;
  words: number;
  costUsd: number;
}

/**
 * Per writer: best (marked best), tied (in the best group without being
 * marked), would-not-ship, by section and by reasoning tier; the faults,
 * words and cost of what it wrote.
 */
export function tallyWriters(cards: RevealCard[]): WriterReveal[] {
  const out = new Map<string, WriterReveal>();
  for (const card of cards) {
    const group = bestGroup(card.picks);
    for (const v of card.variants) {
      const key = `${v.writer}|${v.serviceTier}`;
      const w = out.get(key) ?? { writer: v.writer, serviceTier: v.serviceTier, bySection: {}, byTier: {}, total: zero(), faults: 0, words: 0, costUsd: 0 };
      const tier = SECTION_TIERS[card.section] ?? "other";
      const s = (w.bySection[card.section] ??= zero()), t = (w.byTier[tier] ??= zero());
      for (const tally of [s, t, w.total]) {
        tally.cards++;
        if (card.picks?.best.includes(v.index)) tally.best++;
        else if (group.has(v.index)) tally.tied++;
        if (card.picks?.notShip.includes(v.index)) tally.notShip++;
      }
      w.faults += v.faults;
      w.words += v.words;
      w.costUsd += v.costUsd ?? 0;
      out.set(key, w);
    }
  }
  return [...out.values()].sort((a, b) => a.writer.localeCompare(b.writer));
}

/** The writers of the baseline on a card: the stored text and the hidden control. */
const isBaseline = (v: RevealVariant) => isStored(v.writer) || v.writer === CONTROL;

/**
 * A writer is worse than the baseline in a section when, on any card of that
 * section, it was marked would-not-ship, or a baseline variant sat in the
 * best group and the writer did not.
 */
export function sectionsWorse(cards: RevealCard[], writer: string): string[] {
  const worse = new Set<string>();
  for (const card of cards) {
    const mine = card.variants.filter((v) => v.writer === writer);
    if (!mine.length) continue;
    const group = bestGroup(card.picks);
    const baselineBest = card.variants.some((v) => isBaseline(v) && group.has(v.index));
    for (const v of mine) {
      if (card.picks?.notShip.includes(v.index) || (baselineBest && !group.has(v.index))) worse.add(card.section);
    }
  }
  return [...worse].sort();
}

/** The mixes of the spec, read off the section picks; nobody judges a mix. */
export const MIXES: Array<{ mix: string; description: string; writerFor: (section: string) => string }> = [
  { mix: "M0", description: "today: gpt-5.2 everywhere", writerFor: () => BASELINE },
  { mix: "S", description: "successor: gpt-6-sol everywhere", writerFor: () => "gpt-6-sol" },
  { mix: "A", description: "Sol thinks, Luna writes: sol on the foundation and synthesis, luna on the scaffold and houses", writerFor: (s) => (["open-ended", "synthesis"].includes(SECTION_TIERS[s] ?? "") ? "gpt-6-sol" : "gpt-6-luna") },
  { mix: "B", description: "Sol plans only: sol on the foundation, luna on everything else", writerFor: (s) => (s === "foundation" ? "gpt-6-sol" : "gpt-6-luna") },
  { mix: "L", description: "all Luna", writerFor: () => "gpt-6-luna" },
];

export interface MixReveal {
  mix: string;
  description: string;
  costUsd: number | null;
  worseThanBaseline: string[];
}

/** Per mix: a report's cost on the base shapes at each section's writer, and the sections its writer was marked worse than 5.2 in. */
export function tallyMixes(cards: RevealCard[], shapes: Record<string, TokenShape>, allSections: readonly string[]): MixReveal[] {
  return MIXES.map((m) => {
    let cost = 0;
    let priced = true;
    for (const section of allSections) {
      const c = priceSection(m.writerFor(section), shapes[section] ?? FALLBACK_SHAPE, "standard");
      if (c === null) priced = false; else cost += c;
    }
    const worse = new Set<string>();
    for (const section of new Set(cards.map((c) => c.section))) {
      const writer = m.writerFor(section);
      if (writer === BASELINE) continue;
      if (sectionsWorse(cards.filter((c) => c.section === section), writer).length) worse.add(section);
    }
    return { mix: m.mix, description: m.description, costUsd: priced ? cost : null, worseThanBaseline: [...worse].sort() };
  });
}

/**
 * The noise floor: on the cards that carry both the stored 5.2 and the
 * fresh 5.2 control, how often the Owner preferred one over the other.
 */
export function controlAgreement(cards: RevealCard[]): { cards: number; agree: number; rate: number | null } {
  let n = 0, disagree = 0;
  for (const card of cards) {
    const stored = card.variants.find((v) => isStored(v.writer)), control = card.variants.find((v) => v.writer === CONTROL);
    if (!stored || !control) continue;
    n++;
    const group = bestGroup(card.picks);
    const bad = new Set(card.picks?.notShip ?? []);
    const preferred = group.has(stored.index) !== group.has(control.index) || bad.has(stored.index) !== bad.has(control.index);
    if (preferred) disagree++;
  }
  return { cards: n, agree: n - disagree, rate: n ? disagree / n : null };
}
