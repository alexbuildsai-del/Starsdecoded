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
export { CLAIMS_CONTRACT, ClaimSchema, ClaimsSchema, EvidenceRefSchema, labelEvidence, proseOf, reconcileClaims, reconcileRef, snapQuote, softenQuote, storeClaims, validateClaims, validateSectionClaims, type Claim, type EvidenceRef, type StoredClaim } from "./evidence.js";
export { RULES, block, blocking, buffered, clean, fixed, needsRepair, repair, warned, type Check, type CheckClass, type Validated } from "./checks.js";
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

/** The section's instructions as sent: the blind rules and the blind band are appended when the horizon is unknown. */
export function instructionsFor(spec: SectionSpec, instructions: string, blind: boolean): string {
  if (!blind) return instructions;
  const rules = [
    ...(spec.blindRules ?? []),
    ...(spec.blindWordTarget ? [`Length: ${spec.blindWordTarget[0]} to ${spec.blindWordTarget[1]} words in total, replacing any count above. Write the section whole at that length; the birth time, when it is added, brings its own paragraph.`] : []),
  ];
  if (!rules.length) return instructions;
  return [instructions.trim(), "", "HORIZON UNKNOWN. These rules replace any rule above they contradict:", ...rules.map((r) => `- ${r}`)].join("\n");
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

/** The bands a blind report is written to: every section the pass amends, at its blind band (MB-60). */
export const BLIND_WORD_TARGETS: Record<string, [number, number]> = Object.fromEntries(
  sectionsFor("unknown").map((s) => [s.key.split(":")[1], s.blindWordTarget ?? s.wordTarget]),
);

/**
 * What the horizon pass adds to a blind report, as bands: the twelve house
 * readings, the rising part, and one addition per amended section of 40 to
 * 90 words. The blind bands plus this must sit inside 3,500 to 5,500.
 */
export const PASS_ADDS: [number, number] = (() => {
  const amended = sectionsFor("unknown").length;
  const houses = sectionById("houses")!.wordTarget;
  return [houses[0] + 80 + amended * 40, houses[1] + 100 + amended * 90];
})();

/** The band in force for a section under this horizon. */
export function wordTargetFor(spec: SectionSpec, blind: boolean): [number, number] {
  return blind && spec.blindWordTarget ? spec.blindWordTarget : spec.wordTarget;
}

export type SectionOutput<S extends SectionSpec> = S extends SectionSpec<infer T> ? z.infer<T> : never;
