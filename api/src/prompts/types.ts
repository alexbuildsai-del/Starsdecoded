import type { z } from "zod/v4";
import type { ChartBrief } from "./brief.js";

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
   * Post-parse validation against the chart. Returns problems; a non-empty
   * list rejects the reply (retried once, then fails loudly).
   */
  validate?: (output: z.infer<T>, brief: ChartBrief) => string[];
  /** The section is the horizon and nothing else: not written when the birth time is unknown (ADR-34). */
  skipWhenBlind?: true;
  /** Rules appended when the horizon is unknown, replacing the ones they contradict. */
  blindRules?: string[];
  /** The narrower contract sent when the horizon is unknown, for a section that loses a part rather than the whole. */
  blindSchema?: z.ZodType;
}

export type Infer<S> = S extends SectionSpec<infer T> ? z.infer<T> : never;
