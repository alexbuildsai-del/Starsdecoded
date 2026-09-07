/**
 * The natal prompt registry: the canonical section order and everything the
 * generator, the admin page, the lab and promptDefaults derive from.
 */
import type { z } from "zod/v4";
import { foundation } from "./sections/foundation.js";
import { overview } from "./sections/overview.js";
import { triad } from "./sections/triad.js";
import { mind } from "./sections/mind.js";
import { career } from "./sections/career.js";
import { money } from "./sections/money.js";
import { relationships } from "./sections/relationships.js";
import { family } from "./sections/family.js";
import { superpowers } from "./sections/superpowers.js";
import { discoveries } from "./sections/discoveries.js";
import { focus } from "./sections/focus.js";
import type { SectionSpec } from "./types.js";

export { SHARED_SYSTEM, STYLE_CONTRACT, DOCTRINE, WRITER } from "./system.js";
export { buildBrief, type ChartBrief } from "./brief.js";
export { toStrictJsonSchema } from "./jsonSchema.js";
export type { SectionSpec, Infer } from "./types.js";
export { FoundationSchema } from "./sections/foundation.js";

/** Reader-facing sections in report order. The wheel renders after overview. */
export const REPORT_SECTIONS = [
  overview, triad, mind, career, money, relationships, family, superpowers, discoveries, focus,
] as const;

export const FOUNDATION = foundation;

/** Everything the pipeline calls, foundation first. */
export const ALL_SECTIONS = [foundation, ...REPORT_SECTIONS] as const;

export type ReportSectionId = "overview" | "triad" | "mind" | "career" | "money" | "relationships" | "family" | "superpowers" | "discoveries" | "focus";

export const SECTION_IDS: readonly ReportSectionId[] = REPORT_SECTIONS.map((s) => s.key.split(":")[1] as ReportSectionId);

export function sectionById(id: string): SectionSpec | undefined {
  return ALL_SECTIONS.find((s) => s.key === `natal:${id}`);
}

export const WORD_TARGETS: Record<ReportSectionId, [number, number]> = Object.fromEntries(
  REPORT_SECTIONS.map((s) => [s.key.split(":")[1], s.wordTarget]),
) as Record<ReportSectionId, [number, number]>;

export type SectionOutput<S extends SectionSpec> = S extends SectionSpec<infer T> ? z.infer<T> : never;
