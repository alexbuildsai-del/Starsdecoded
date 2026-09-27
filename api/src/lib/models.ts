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
 * Every entry pins its reasoning effort, sent on every call (ADR-74): newer
 * models reason by default and reasoning bills as output, so the effort is
 * decided here and nowhere else. Every model is OpenAI's (ADR-73).
 *
 * Changing any value here is an engine change: it needs a report-lab run
 * against the fixtures (R-4.4), and a report-content change is USER-FACING
 * (R-5.5) even though no UI moves. Supersedes R-5.6, which pinned model ids to
 * the call sites.
 */

export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high";
export type ServiceTier = "flex" | "standard";

export interface ModelPrice {
  /** USD per million tokens. */
  input: number;
  cachedInput: number;
  output: number;
  /** Sent on every call. gpt-5-mini and gpt-5-nano reject `none`, so they pin `minimal`. */
  reasoningEffort: ReasoningEffort;
  /** Whether OpenAI offers the Flex tier for this model; a Flex call is refused otherwise. */
  flex: boolean;
  /** ISO date the price was checked on OpenAI's pricing page; empty while provisional. */
  checked?: string;
}

/** Lab replays on Flex bill at half the standard price (ADR-77). */
export const FLEX_DISCOUNT = 0.5;

export const CATALOGUE = {
  "gpt-5.2": { input: 1.75, cachedInput: 0.175, output: 14.0, reasoningEffort: "none", flex: false, checked: "2026-09-16" },
  "gpt-5-mini": { input: 0.25, cachedInput: 0.025, output: 2.0, reasoningEffort: "minimal", flex: false, checked: "2026-09-16" },
  "gpt-5-nano": { input: 0.05, cachedInput: 0.005, output: 0.4, reasoningEffort: "minimal", flex: false, checked: "2026-09-16" },
  // MB-70 provisional: press prices, ids and Flex unverified from the sandbox (ADR-74).
  "gpt-6-sol": { input: 2.0, cachedInput: 0.2, output: 10.0, reasoningEffort: "none", flex: false, checked: "" },
  "gpt-6-luna": { input: 0.1, cachedInput: 0.01, output: 0.5, reasoningEffort: "none", flex: false, checked: "" },
} as const satisfies Record<string, ModelPrice>;

export type ModelId = keyof typeof CATALOGUE;

export function isModelId(id: string): id is ModelId {
  return Object.prototype.hasOwnProperty.call(CATALOGUE, id);
}

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
  /** The QA agent's reader and its eyes on staging (ADR-86): vision, one vendor, the key already on Railway. */
  qa: "gpt-5.2",
  /** The prose study's optional notes, three lines a card, under a cent (ADR-88; MB-70 provisional price). */
  studyNotes: "gpt-6-luna",
} as const satisfies Record<string, ModelId>;

/** The QA agent's model: `QA_AGENT_MODEL` when it names a catalogue id, else the pinned default. Never a model outside the catalogue. */
export function qaAgentModel(env: NodeJS.ProcessEnv = process.env): ModelId {
  const wanted = env.QA_AGENT_MODEL?.trim();
  return wanted && isModelId(wanted) ? wanted : MODELS.qa;
}

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

/** The effort pinned for a model; a model outside the catalogue cannot be called, so this never guesses. */
export function effortFor(model: ModelId): ReasoningEffort {
  return CATALOGUE[model].reasoningEffort;
}

export function flexOffered(model: string): boolean {
  return priceOf(model)?.flex === true;
}

/** The tier a lab call actually runs at: Flex where the model offers it, standard otherwise. */
export function tierFor(model: string, requested: ServiceTier | undefined): ServiceTier {
  return requested === "flex" && flexOffered(model) ? "flex" : "standard";
}
