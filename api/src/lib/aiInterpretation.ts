/**
 * Natal report generation.
 *
 * One foundation call, then the ten reader-facing sections in parallel. Every
 * call uses the same byte-identical system prompt (the cached prefix), the
 * section's editable instructions, and then the variable chart brief. Output
 * is constrained by each section's zod schema via strict structured outputs
 * and parsed with the same schema, so a malformed reply is retried once and
 * then fails loudly rather than being stored as a raw string.
 */
import { openai } from "@workspace/integrations-openai-ai-server";
import type { z } from "zod/v4";
import { resolveSection } from "./promptLoader.js";
import type { NatalChartData } from "./chartCalculation.js";
import {
  ALL_SECTIONS, FOUNDATION, REPORT_SECTIONS, SECTION_IDS,
  buildBrief, toStrictJsonSchema,
  type ChartBrief, type ReportSectionId, type SectionSpec,
} from "../prompts/index.js";
import type { AngleMeanings, AspectMeaningPayload } from "../prompts/brief.js";
import { FoundationSchema } from "../prompts/sections/foundation.js";
import { OverviewSchema } from "../prompts/sections/overview.js";
import { TriadSchema } from "../prompts/sections/triad.js";
import { MindSchema } from "../prompts/sections/mind.js";
import { CareerSchema } from "../prompts/sections/career.js";
import { MoneySchema } from "../prompts/sections/money.js";
import { RelationshipsSchema } from "../prompts/sections/relationships.js";
import { FamilySchema } from "../prompts/sections/family.js";
import { SuperpowersSchema } from "../prompts/sections/superpowers.js";
import { DiscoveriesSchema } from "../prompts/sections/discoveries.js";
import { FocusSchema } from "../prompts/sections/focus.js";

export const MODEL = "gpt-5.2";
/** Bump when the section set, schemas, or vocabulary change shape. */
export const PROMPT_VERSION = "v3";

export type FoundationData = z.infer<typeof FoundationSchema>;
export type OverviewSection = z.infer<typeof OverviewSchema>;
export type TriadSection = z.infer<typeof TriadSchema>;
export type MindSection = z.infer<typeof MindSchema>;
export type CareerSection = z.infer<typeof CareerSchema>;
export type MoneySection = z.infer<typeof MoneySchema>;
export type RelationshipsSection = z.infer<typeof RelationshipsSchema>;
export type FamilySection = z.infer<typeof FamilySchema>;
export type SuperpowersSection = z.infer<typeof SuperpowersSchema>;
export type DiscoveriesSection = z.infer<typeof DiscoveriesSchema>;
export type FocusSection = z.infer<typeof FocusSchema>;

export interface ReportInterpretation {
  meta: {
    promptVersion: string;
    model: string;
    houseSystem: "whole-sign";
    generatedAt: string;
    /** Prose words across the ten reader-facing sections. */
    wordCount: number;
  };
  foundation: FoundationData;
  overview: OverviewSection;
  triad: TriadSection;
  mind: MindSection;
  career: CareerSection;
  money: MoneySection;
  relationships: RelationshipsSection;
  family: FamilySection;
  superpowers: SuperpowersSection;
  discoveries: DiscoveriesSection;
  focus: FocusSection;
  /** Composed deterministically for the wheel; no AI call. */
  personalPlanets: Record<string, string>;
  aspectMeanings: Record<string, AspectMeaningPayload>;
  angleMeanings: AngleMeanings;
}

// ---------------------------------------------------------------------------
// Assembly. Static first, variable last, so the cached prefix is shared.
// ---------------------------------------------------------------------------

function assembleUser(instructions: string, brief: ChartBrief, spec: SectionSpec, foundationJson?: string): string {
  const parts = [instructions.trim(), "", "CHART BRIEF", brief.text];
  if (foundationJson) parts.push("", "FOUNDATION (internal editorial handoff, never quote it)", foundationJson);
  const extra = spec.extraContext?.(brief);
  if (extra) parts.push("", extra);
  return parts.join("\n");
}

class SectionError extends Error {
  constructor(public readonly key: string, message: string) {
    super(`${key}: ${message}`);
    this.name = "SectionError";
  }
}

async function callSection<S extends SectionSpec>(
  spec: S,
  system: string,
  user: string,
): Promise<z.infer<S["schema"]>> {
  const jsonSchema = toStrictJsonSchema(spec.schema);
  const name = spec.key.replace(/[^a-zA-Z0-9_]/g, "_");
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: spec.maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema: jsonSchema } },
    });

    const message = response.choices[0]?.message;
    if (message?.refusal) throw new SectionError(spec.key, `model refused: ${message.refusal}`);
    const content = message?.content ?? "";

    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch (err) {
      lastError = `invalid JSON (${(err as Error).message})`;
      continue;
    }
    const parsed = spec.schema.safeParse(raw);
    if (parsed.success) return parsed.data as z.infer<S["schema"]>;
    lastError = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  }

  throw new SectionError(spec.key, `failed schema validation after 2 attempts: ${lastError}`);
}

/** Words across every string leaf of a value. */
export function countWords(value: unknown): number {
  if (typeof value === "string") return value.trim() ? value.trim().split(/\s+/).length : 0;
  if (Array.isArray(value)) return value.reduce((n, v) => n + countWords(v), 0);
  if (value && typeof value === "object") return Object.values(value).reduce((n, v) => n + countWords(v), 0);
  return 0;
}

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

export async function generateInterpretation(
  chart: NatalChartData,
  name: string,
): Promise<ReportInterpretation> {
  const brief = buildBrief(chart, name);

  // Stage 1: foundation runs alone. Its output is the editorial handoff every
  // reader-facing section receives.
  const foundationPrompt = await resolveSection(FOUNDATION.key);
  const foundation = await callSection(
    FOUNDATION,
    foundationPrompt.system,
    assembleUser(foundationPrompt.user, brief, FOUNDATION),
  );
  const foundationJson = JSON.stringify(foundation, null, 2);

  // Stage 2: the ten sections depend only on the foundation, so they run in
  // parallel. Prompts resolve in parallel too, honouring DB overrides.
  const prompts = await Promise.all(REPORT_SECTIONS.map((s) => resolveSection(s.key)));
  const results = await Promise.all(
    REPORT_SECTIONS.map((spec, i) =>
      callSection(spec, prompts[i].system, assembleUser(prompts[i].user, brief, spec, foundationJson)),
    ),
  );

  const byId = Object.fromEntries(SECTION_IDS.map((id, i) => [id, results[i]])) as Record<ReportSectionId, unknown>;

  const sections = {
    overview: byId.overview as OverviewSection,
    triad: byId.triad as TriadSection,
    mind: byId.mind as MindSection,
    career: byId.career as CareerSection,
    money: byId.money as MoneySection,
    relationships: byId.relationships as RelationshipsSection,
    family: byId.family as FamilySection,
    superpowers: byId.superpowers as SuperpowersSection,
    discoveries: byId.discoveries as DiscoveriesSection,
    focus: byId.focus as FocusSection,
  };

  return {
    meta: {
      promptVersion: PROMPT_VERSION,
      model: MODEL,
      houseSystem: "whole-sign",
      generatedAt: new Date().toISOString(),
      wordCount: countWords(sections),
    },
    foundation,
    ...sections,
    personalPlanets: brief.personalPlanets,
    aspectMeanings: brief.aspectMeanings,
    angleMeanings: brief.angleMeanings,
  };
}

/** Exposed for the lab and tests: the exact prompt pair a section would send. */
export async function previewSectionPrompt(sectionKey: string, chart: NatalChartData, name: string, foundationJson?: string) {
  const spec = ALL_SECTIONS.find((s) => s.key === sectionKey);
  if (!spec) throw new Error(`Unknown section ${sectionKey}`);
  const prompt = await resolveSection(spec.key);
  const brief = buildBrief(chart, name);
  return { system: prompt.system, user: assembleUser(prompt.user, brief, spec, foundationJson), schema: toStrictJsonSchema(spec.schema) };
}
