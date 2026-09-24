import { FLEX_DISCOUNT, priceOf, type ServiceTier } from "./models.js";

/**
 * Token accounting for report generation.
 *
 * The engine records what each section's calls actually consumed, so a prompt,
 * model or reasoning-effort change can be judged on cost and time and not on
 * argument. Cost is computed here at generation time and stored with the
 * report, so a later price change never rewrites what a past run cost.
 *
 * Each call carries the model it ran on, so a report that mixes models (the
 * foundation on one, the ten sections on another) is priced correctly rather
 * than at whichever model happened to be passed in.
 *
 * Prices come from the model catalogue, so this file does the arithmetic and
 * `models.ts` decides what anything costs.
 *
 * Two OpenAI conventions decide the arithmetic and are easy to get wrong:
 * `prompt_tokens` already includes the cached ones, and `completion_tokens`
 * already includes reasoning. So the billable split is
 * `(prompt - cached)`, `cached`, and `completion`, and reasoning rides along
 * as a diagnostic that is never charged a second time.
 */

/** One section's total across however many attempts it took. */
export interface SectionUsage {
  /** Prompt key, e.g. "natal:overview". */
  section: string;
  /** The model this section's calls ran on. Sections may differ. */
  model: string;
  /** 1 when the first reply was accepted. */
  attempts: number;
  /** Billable input: prompt tokens that were not served from cache. */
  inputTokens: number;
  cachedInputTokens: number;
  /** Billable output, reasoning included. */
  outputTokens: number;
  /** Of `outputTokens`. Diagnostic only, never charged separately. */
  reasoningTokens: number;
  /** Time in the API for this section, summed over attempts. */
  ms: number;
  /** Absent on the customer path, which always runs standard; a lab replay records the tier it asked for. */
  serviceTier?: ServiceTier;
}

export interface UsageTotals {
  attempts: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  /** Summed call time. Larger than `wallClockMs` because ten sections run at once. */
  ms: number;
}

export interface ReportUsage {
  /** The model every call used, or "mixed" when they differ. */
  model: string;
  sections: SectionUsage[];
  totals: UsageTotals;
  /** Null when the model has no price here, so a stale table cannot invent a figure. */
  costUsd: number | null;
  /** End to end, including the serial foundation hop and the parallel fan-out. */
  wallClockMs: number;
}

/** The shape the OpenAI client returns; every field optional because a reply may omit it. */
export interface RawUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
}

const EMPTY: Omit<SectionUsage, "section" | "model"> = {
  attempts: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, ms: 0,
};

/** Fold one attempt's reply into a section's running total. */
export function addAttempt(
  into: SectionUsage,
  raw: RawUsage | undefined,
  ms: number,
): SectionUsage {
  const prompt = raw?.prompt_tokens ?? 0;
  const cached = raw?.prompt_tokens_details?.cached_tokens ?? 0;
  return {
    ...into,
    attempts: into.attempts + 1,
    // A cached count larger than the prompt would mean a negative bill.
    inputTokens: into.inputTokens + Math.max(0, prompt - cached),
    cachedInputTokens: into.cachedInputTokens + Math.min(cached, prompt),
    outputTokens: into.outputTokens + (raw?.completion_tokens ?? 0),
    reasoningTokens: into.reasoningTokens + (raw?.completion_tokens_details?.reasoning_tokens ?? 0),
    ms: into.ms + ms,
  };
}

export function emptySection(section: string, model: string): SectionUsage {
  return { section, model, ...EMPTY };
}

export function totalsOf(sections: readonly SectionUsage[]): UsageTotals {
  return sections.reduce<UsageTotals>(
    (t, s) => ({
      attempts: t.attempts + s.attempts,
      inputTokens: t.inputTokens + s.inputTokens,
      cachedInputTokens: t.cachedInputTokens + s.cachedInputTokens,
      outputTokens: t.outputTokens + s.outputTokens,
      reasoningTokens: t.reasoningTokens + s.reasoningTokens,
      ms: t.ms + s.ms,
    }),
    { attempts: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, ms: 0 },
  );
}

/**
 * Null for a model with no price on record. The engine cannot select one (the
 * catalogue is the type), but a run stored before a model left the catalogue
 * can still name one, and a missing price must read as unknown, never as free.
 */
export function costUsd(model: string, t: UsageTotals, serviceTier: ServiceTier = "standard"): number | null {
  const p = priceOf(model);
  if (!p) return null;
  const perToken = (usd: number) => usd / 1_000_000;
  const standard = t.inputTokens * perToken(p.input)
    + t.cachedInputTokens * perToken(p.cachedInput)
    + t.outputTokens * perToken(p.output);
  return serviceTier === "flex" ? standard * FLEX_DISCOUNT : standard;
}

/**
 * Each section is priced on its own model and the results summed, so a mixed
 * report costs what it actually cost. One unpriced model makes the whole figure
 * null rather than a total that silently omits it.
 */
export function reportCostUsd(sections: readonly SectionUsage[]): number | null {
  let total = 0;
  for (const s of sections) {
    const c = costUsd(s.model, { ...s }, s.serviceTier);
    if (c === null) return null;
    total += c;
  }
  return total;
}

export function buildReportUsage(
  sections: readonly SectionUsage[],
  wallClockMs: number,
): ReportUsage {
  const models = [...new Set(sections.map((s) => s.model))];
  return {
    model: models.length === 1 ? models[0] : "mixed",
    sections: [...sections],
    totals: totalsOf(sections),
    costUsd: reportCostUsd(sections),
    wallClockMs,
  };
}
