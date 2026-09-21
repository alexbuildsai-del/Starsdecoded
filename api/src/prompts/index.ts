/**
 * The natal prompt registry: the canonical section order and everything the
 * generator, the admin page, the lab and promptDefaults derive from.
 */
import type { z } from "zod/v4";
import { foundation } from "./sections/foundation.js";
import { overview } from "./sections/overview.js";
import { triad } from "./sections/triad.js";
import { houses } from "./sections/houses.js";
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
export { CLAIMS_CONTRACT, ClaimSchema, ClaimsSchema, EvidenceRefSchema, labelEvidence, proseOf, storeClaims, validateClaims, type Claim, type EvidenceRef, type StoredClaim } from "./evidence.js";
export type { SectionSpec, Infer } from "./types.js";
export { FoundationSchema } from "./sections/foundation.js";
export { HousesSchema } from "./sections/houses.js";

/** Reader-facing sections in report order. `houses` writes the explorer's cards. */
export const REPORT_SECTIONS = [
  overview, triad, houses, mind, career, money, relationships, family, superpowers, discoveries, focus,
] as const;

export const FOUNDATION = foundation;

/** Everything the pipeline calls, foundation first. */
export const ALL_SECTIONS = [foundation, ...REPORT_SECTIONS] as const;

export type ReportSectionId = "overview" | "triad" | "houses" | "mind" | "career" | "money" | "relationships" | "family" | "superpowers" | "discoveries" | "focus";

/**
 * A section whose schema has no `claims` field is its own evidence: the house
 * cards sit on the wheel that proves them. Code must not append the claims
 * contract to it or try to store claims from it.
 */
export function hasClaims(spec: SectionSpec): boolean {
  return "claims" in ((spec.schema as unknown as { shape?: Record<string, unknown> }).shape ?? {});
}

export const SECTION_IDS: readonly ReportSectionId[] = REPORT_SECTIONS.map((s) => s.key.split(":")[1] as ReportSectionId);

/**
 * The sections a report with this horizon actually calls. A blind report has
 * no rising sign and no houses, so the sections that are nothing but the
 * horizon are not written at all (ADR-34); the rest are written under their
 * blind rules.
 */
export function sectionsFor(horizon: "known" | "approximate" | "unknown"): readonly SectionSpec[] {
  return horizon === "unknown" ? REPORT_SECTIONS.filter((s) => !s.skipWhenBlind) : REPORT_SECTIONS;
}

/** The section's instructions as sent: the blind rules are appended when the horizon is unknown. */
export function instructionsFor(spec: SectionSpec, instructions: string, blind: boolean): string {
  if (!blind || !spec.blindRules?.length) return instructions;
  return [instructions.trim(), "", "HORIZON UNKNOWN. These rules replace any rule above they contradict:", ...spec.blindRules.map((r) => `- ${r}`)].join("\n");
}

/** The output contract in force: a section may narrow its schema when the horizon is unknown. */
export function schemaFor(spec: SectionSpec, blind: boolean): z.ZodType {
  return blind && spec.blindSchema ? spec.blindSchema : spec.schema;
}

export function sectionById(id: string): SectionSpec | undefined {
  return ALL_SECTIONS.find((s) => s.key === `natal:${id}`);
}

export const WORD_TARGETS: Record<ReportSectionId, [number, number]> = Object.fromEntries(
  REPORT_SECTIONS.map((s) => [s.key.split(":")[1], s.wordTarget]),
) as Record<ReportSectionId, [number, number]>;

export type SectionOutput<S extends SectionSpec> = S extends SectionSpec<infer T> ? z.infer<T> : never;
