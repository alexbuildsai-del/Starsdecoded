/**
 * Token accounting for report generation.
 *
 * The engine records what each section's calls actually consumed, so a prompt,
 * model or reasoning-effort change can be judged on cost and time and not on
 * argument. Cost is computed here at generation time and stored with the
 * report, so a later price change never rewrites what a past run cost.
 *
 * Two OpenAI conventions decide the arithmetic and are easy to get wrong:
 * `prompt_tokens` already includes the cached ones, and `completion_tokens`
 * already includes reasoning. So the billable split is
 * `(prompt - cached)`, `cached`, and `completion`, and reasoning rides along
 * as a diagnostic that is never charged a second time.
 */

/** USD per million tokens. Checked against OpenAI's pricing page 2026-09-16. */
export const MODEL_PRICES: Record<string, { input: number; cachedInput: number; output: number }> = {
  "gpt-5.2": { input: 1.75, cachedInput: 0.175, output: 14.0 },
  "gpt-5-mini": { input: 0.25, cachedInput: 0.025, output: 2.0 },
};

/** One section's total across however many attempts it took. */
export interface SectionUsage {
  /** Prompt key, e.g. "natal:overview". */
  section: string;
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

const EMPTY: Omit<SectionUsage, "section"> = {
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

export function emptySection(section: string): SectionUsage {
  return { section, ...EMPTY };
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

/** Null for a model with no price on record. */
export function costUsd(model: string, t: UsageTotals): number | null {
  const p = MODEL_PRICES[model];
  if (!p) return null;
  const perToken = (usd: number) => usd / 1_000_000;
  return t.inputTokens * perToken(p.input)
    + t.cachedInputTokens * perToken(p.cachedInput)
    + t.outputTokens * perToken(p.output);
}

export function buildReportUsage(
  model: string,
  sections: readonly SectionUsage[],
  wallClockMs: number,
): ReportUsage {
  const totals = totalsOf(sections);
  return { model, sections: [...sections], totals, costUsd: costUsd(model, totals), wallClockMs };
}
