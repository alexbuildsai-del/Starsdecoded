import type { z } from "zod/v4";
import type { ChartBrief } from "./brief.js";
import type { Check, Validated } from "./checks.js";

export interface SectionSpec<T extends z.ZodType = z.ZodType> {
  /** Prompt key, e.g. "natal:overview". `:system` and `:user` rows derive from it. */
  key: string;
  /** Reader-facing heading. */
  label: string;
  /** Short admin label. */
  adminLabel: string;
  /** Prose word target for the whole section. */
  wordTarget: [number, number];
  /**
   * The band when the horizon is unknown: below the drawn band by about what
   * the horizon pass adds back, so a blind report plus its pass lands inside
   * 3,500 to 5,500 (MB-60). Absent on a section the pass does not amend.
   */
  blindWordTarget?: [number, number];
  /**
   * Ceiling on the reply, not a target: the word target sets length. Sized at
   * roughly twice what the prose and eight claims need, because a reply that
   * hits the cap is cut mid-string and the whole report fails.
   */
  maxTokens: number;
  /** The output contract. Sent as strict JSON schema and used to parse. */
  schema: T;
  /** Static, editable section instructions: what to write and how. */
  instructions: string;
  /** Extra variable context appended after the brief. Default: nothing. */
  extraContext?: (brief: ChartBrief) => string;
  /**
   * Runs on the raw reply before the zod parse: cuts to maxima, drops
   * extras, spells small numbers (ADR-81). Returns the raw as it should be
   * parsed and the checks that fired.
   */
  normalise?: (raw: unknown, brief: ChartBrief) => { raw: unknown; checks: Check[] };
  /**
   * Post-parse validation against the chart: snaps, drops, fills, blocks.
   * A `block` rejects the reply; a `repair` calls the claims-only repair;
   * `fix`, `warn` and `buffer` are logged only (ADR-81, ADR-82).
   */
  validate?: (output: z.infer<T>, brief: ChartBrief) => Validated<z.infer<T>>;
  /** The section is the horizon and nothing else: not written when the birth time is unknown (ADR-34). */
  skipWhenBlind?: true;
  /** Rules appended when the horizon is unknown, replacing the ones they contradict. */
  blindRules?: string[];
  /** The narrower contract sent when the horizon is unknown, for a section that loses a part rather than the whole. */
  blindSchema?: z.ZodType;
}

export type Infer<S> = S extends SectionSpec<infer T> ? z.infer<T> : never;
