/**
 * The model catalogue: every model the engine may call, and which one each job
 * calls. Nothing else in the codebase names a model id.
 *
 * To try a different model anywhere, edit `MODELS` (or `SECTION_MODELS` for one
 * section) and ship it. To introduce a model the catalogue has never seen, add
 * its price to `CATALOGUE` first: `ModelId` is derived from that object, so a
 * model with no price on record will not compile. A run can therefore never be
 * billed at a price we do not have.
 *
 * Changing any value here is an engine change: it needs a report-lab run
 * against the fixtures (R-4.4), and a report-content change is USER-FACING
 * (R-5.5) even though no UI moves. Supersedes R-5.6, which pinned model ids to
 * the call sites.
 */

export interface ModelPrice {
  /** USD per million tokens. */
  input: number;
  cachedInput: number;
  output: number;
}

/** Checked against OpenAI's pricing page 2026-09-16. */
export const CATALOGUE = {
  "gpt-5.2": { input: 1.75, cachedInput: 0.175, output: 14.0 },
  "gpt-5-mini": { input: 0.25, cachedInput: 0.025, output: 2.0 },
  "gpt-5-nano": { input: 0.05, cachedInput: 0.005, output: 0.4 },
} as const satisfies Record<string, ModelPrice>;

export type ModelId = keyof typeof CATALOGUE;

/**
 * Which model each job calls.
 *
 * `foundation` reads the chart open-endedly and decides what the whole report
 * says, so it carries the most risk from a weaker model. `sections` write
 * against that analysis inside a strict schema, with every claim checked
 * against the computed chart in code, which is the scaffolding that makes a
 * cheaper model a fair question there.
 */
export const MODELS = {
  foundation: "gpt-5.2",
  sections: "gpt-5.2",
  /** The two on-tap scenes of a lens chapter, written once each and stored (ADR-72). */
  scenes: "gpt-5.2",
  synastry: "gpt-5.2",
  /** Offline, run once by scripts/src/generate-vocabulary.ts and committed. */
  vocabulary: "gpt-5.2",
} as const satisfies Record<string, ModelId>;

/**
 * Per-section overrides, by section id ("overview", "focus", ...). Empty means
 * every section uses `MODELS.sections`. Populate this to measure where a
 * cheaper model holds the style contract and where it does not, rather than
 * deciding the whole report on one number.
 */
export const SECTION_MODELS: Partial<Record<string, ModelId>> = {};

/** The model a natal section calls. Accepts "natal:overview" or "overview". */
export function modelFor(sectionKey: string): ModelId {
  const id = sectionKey.replace(/^natal:/, "");
  return SECTION_MODELS[id] ?? MODELS.sections;
}

export function priceOf(model: string): ModelPrice | undefined {
  return (CATALOGUE as Record<string, ModelPrice>)[model];
}
