/**
 * Progress is real, and shown as one percentage, never a count (ADR-47).
 * 4 points once the report exists, 10 when the chart is stored, then 90 ÷ n
 * per landed section for a registry of n. Between events the ring creeps
 * toward a time estimate, capped one point below the next milestone, and a
 * landed section snaps it (MB-55 default). The door opens at 67 of real
 * progress, never the crept value, and only once the two sections a reader
 * needs first have landed.
 */

export const LABELS = {
  inputs: "Analysing your inputs",
  chart: "Computing your chart",
  patterns: "Finding the patterns",
  writing: "Writing your report",
  ready: "Ready",
} as const;

export type ProgressLabel = (typeof LABELS)[keyof typeof LABELS];

export const DOOR_AT = 67;
export const REPORT_EXISTS = 4;
export const CHART_STORED = 10;
/** How fast the creep approaches its cap, in milliseconds of time constant. */
export const CREEP_TAU_MS = 20_000;

/** The natal registry and the pair registry, and what each needs before the door. */
export const NATAL_SECTIONS = ["overview", "triad", "houses", "mind", "career", "money", "relationships", "family", "superpowers", "discoveries", "focus"] as const;
export const PAIR_SECTIONS = ["howYouMeet", "twoCharts", "twoWays", "whereItFlows", "whereItRubs", "howYouTalk", "lensOne", "lensTwo", "whatToPractise", "links"] as const;
export const NATAL_DOOR: readonly string[] = ["overview", "houses"];
export const PAIR_DOOR: readonly string[] = ["howYouMeet", "twoCharts"];

export interface ProgressInput {
  /** The report's status as the API reports it. */
  status: string | undefined;
  chartReady: boolean;
  sections: Record<string, "pending" | "done">;
  /** The section keys this report writes, in order; the blind natal registry has no houses. */
  registry: readonly string[];
  /** The sections the door waits for, filtered to the registry in force. */
  required: readonly string[];
  /** Milliseconds since the last milestone moved. */
  sinceMilestoneMs: number;
}

export interface Progress {
  /** Real progress, 0 to 100. */
  real: number;
  /** What the ring shows: real plus the creep, below the next milestone. */
  shown: number;
  label: ProgressLabel;
  /** The next real value a landed event would bring. */
  next: number;
  door: boolean;
  complete: boolean;
  failed: boolean;
}

export function landed(sections: Record<string, "pending" | "done">, registry: readonly string[]): number {
  return registry.filter((id) => sections[id] === "done").length;
}

/** Real progress for k landed sections of n. 100 only at the last one. */
export function realProgress(chartReady: boolean, k: number, n: number, exists = true): number {
  if (!exists) return 0;
  if (!chartReady) return REPORT_EXISTS;
  if (n <= 0) return CHART_STORED;
  return Math.min(100, Math.round((CHART_STORED + (90 * k) / n) * 100) / 100);
}

/** The creep: a slow approach to one point below the next milestone, never reaching it. */
export function creep(real: number, next: number, sinceMilestoneMs: number): number {
  const cap = Math.max(0, next - real - 1);
  if (cap === 0) return 0;
  const t = Math.max(0, sinceMilestoneMs) / CREEP_TAU_MS;
  return cap * (1 - Math.exp(-t));
}

export function progressOf(input: ProgressInput): Progress {
  const n = input.registry.length;
  const k = landed(input.sections, input.registry);
  const exists = input.status !== undefined;
  const failed = input.status === "failed";
  const complete = input.status === "complete" || input.status === "revising";
  const real = complete ? 100 : realProgress(input.chartReady, k, n, exists);

  let next: number;
  if (!exists) next = REPORT_EXISTS;
  else if (!input.chartReady) next = CHART_STORED;
  else next = Math.min(100, realProgress(true, k + 1, n));

  const shown = complete ? 100 : Math.min(99, real + creep(real, next, input.sinceMilestoneMs));

  let label: ProgressLabel;
  if (complete) label = LABELS.ready;
  else if (!input.chartReady) label = input.status === "computing" ? LABELS.chart : LABELS.inputs;
  else if (k === 0) label = LABELS.patterns;
  else label = LABELS.writing;

  const requiredLanded = input.required.every((id) => input.sections[id] === "done");
  const door = !failed && (complete || (real >= DOOR_AT && requiredLanded));

  return { real, shown: Math.round(shown * 100) / 100, label, next, door, complete, failed };
}

/** The registry and the door's requirement for a report of this type and horizon. */
export function registryFor(type: "natal" | "compatibility", horizon?: string): { registry: readonly string[]; required: readonly string[] } {
  if (type === "compatibility") return { registry: PAIR_SECTIONS, required: PAIR_DOOR };
  const registry: readonly string[] = horizon === "unknown" ? NATAL_SECTIONS.filter((id) => id !== "houses") : NATAL_SECTIONS;
  return { registry, required: NATAL_DOOR.filter((id) => registry.includes(id)) };
}
