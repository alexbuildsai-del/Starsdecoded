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
  maxTokens: number;
  /** The output contract. Sent as strict JSON schema and used to parse. */
  schema: T;
  /** Static, editable section instructions: what to write and how. */
  instructions: string;
  /** Extra variable context appended after the brief. Default: nothing. */
  extraContext?: (brief: ChartBrief) => string;
}

export type Infer<S> = S extends SectionSpec<infer T> ? z.infer<T> : never;
