/**
 * Natal report generation.
 *
 * One foundation call, then the ten reader-facing sections in parallel. Every
 * call uses the same byte-identical system prompt (the cached prefix), the
 * section's editable instructions, and then the variable chart brief. Output
 * is constrained by each section's zod schema via strict structured outputs
 * and parsed with the same schema, so a rejected reply is retried with the
 * problems named, and then fails loudly rather than being stored as a raw
 * string.
 *
 * Every call's token usage is recorded and stored on `meta.usage` (R02, MB-10),
 * so a prompt, model or reasoning-effort change is judged on measured cost and
 * time. It is the only channel the report lab has in `--remote` mode, where it
 * reads a deployed report as an anonymous visitor.
 */
import { openai } from "@workspace/integrations-openai-ai-server";
import type { z } from "zod/v4";
import { resolveSection } from "./promptLoader.js";
import { ASPECT_ORBS, EPHEMERIS, type NatalChartData } from "./chartCalculation.js";
import { sect as computeSect } from "./traditional.js";
import { logger } from "./logger.js";
import { addAttempt, buildReportUsage, emptySection, type ReportUsage, type SectionUsage } from "./usage.js";
import {
  ALL_SECTIONS, CLAIMS_CONTRACT, FOUNDATION, REPORT_SECTIONS, SECTION_IDS,
  buildBrief, storeClaims, toStrictJsonSchema,
  type ChartBrief, type ReportSectionId, type SectionSpec, type StoredClaim,
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

/**
 * The foundation reads the chart open-endedly and decides what the whole report
 * says, so it stays on the strong model.
 */
export const FOUNDATION_MODEL = "gpt-5.2";
/**
 * The ten reader-facing sections. They write against an analysis the foundation
 * already did, inside a strict schema, with every claim checked against the
 * chart in code. That scaffolding is what lets a smaller model be a fair
 * question here when it would not be for the foundation.
 *
 * Overridable so the lab can measure one model against another on staging
 * without a code change. Unset means no change. Production never sets it.
 */
export const SECTION_MODEL = process.env.NATAL_SECTION_MODEL || "gpt-5.2";
/** One blind try, then two informed by the rejection. A lost section loses the whole report. */
const ATTEMPTS = 3;
/** Bump when the section set, schemas, or vocabulary change shape. */
export const PROMPT_VERSION = "v4";

/** A section as stored: the model's fields with claims replaced by their validated, labelled form. */
type Stored<T> = Omit<T, "claims"> & { claims: StoredClaim[] };

export type FoundationData = z.infer<typeof FoundationSchema>;
export type OverviewSection = Stored<z.infer<typeof OverviewSchema>>;
export type TriadSection = Stored<z.infer<typeof TriadSchema>>;
export type MindSection = Stored<z.infer<typeof MindSchema>>;
export type CareerSection = Stored<z.infer<typeof CareerSchema>>;
export type MoneySection = Stored<z.infer<typeof MoneySchema>>;
export type RelationshipsSection = Stored<z.infer<typeof RelationshipsSchema>>;
export type FamilySection = Stored<z.infer<typeof FamilySchema>>;
export type SuperpowersSection = Stored<z.infer<typeof SuperpowersSchema>>;
export type DiscoveriesSection = Stored<z.infer<typeof DiscoveriesSchema>>;
export type FocusSection = Stored<z.infer<typeof FocusSchema>>;

export interface ReportInterpretation {
  meta: {
    promptVersion: string;
    model: string;
    houseSystem: "whole-sign";
    zodiac: "tropical";
    ephemeris: string;
    orbs: typeof ASPECT_ORBS;
    sect: "day" | "night";
    sectLight: "sun" | "moon";
    /** True altitude of the Sun's centre at birth, degrees, no refraction. */
    sunAltitude: number;
    /** Within 5 degrees of the horizon. Methodology box only. */
    sectMarginal: boolean;
    generatedAt: string;
    /** Prose words across the ten reader-facing sections. */
    wordCount: number;
    /** Tokens, cost and time for all eleven calls. */
    usage: ReportUsage;
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
  const parts = [instructions.trim()];
  if (spec.key !== FOUNDATION.key) parts.push("", CLAIMS_CONTRACT);
  parts.push("", "CHART BRIEF", brief.text);
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

interface SectionResult<T> {
  data: T;
  usage: SectionUsage;
}

async function callSection<S extends SectionSpec>(
  spec: S,
  model: string,
  system: string,
  user: string,
  brief: ChartBrief,
): Promise<SectionResult<z.infer<S["schema"]>>> {
  const jsonSchema = toStrictJsonSchema(spec.schema);
  const name = spec.key.replace(/[^a-zA-Z0-9_]/g, "_");
  let lastError = "";
  // Accumulates across attempts: a section that retried twice cost three calls,
  // and hiding that would understate exactly what we are here to measure.
  let usage = emptySection(spec.key, model);

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    // A retry that repeats the identical request mostly repeats the mistake.
    // The problems go at the end of the user turn, so the cached system
    // prefix is untouched and the model knows exactly what to fix.
    const content = attempt === 1
      ? user
      : `${user}\n\nPREVIOUS ATTEMPT REJECTED: ${lastError}\nReturn the complete section again with these fixed. Every claim quote must be copied exactly from the prose in this reply.`;
    const startedAt = Date.now();
    const response = await openai.chat.completions.create({
      model,
      max_completion_tokens: spec.maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content },
      ],
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema: jsonSchema } },
    });
    usage = addAttempt(usage, response.usage, Date.now() - startedAt);

    const choice = response.choices[0];
    const message = choice?.message;
    if (message?.refusal) throw new SectionError(spec.key, `model refused: ${message.refusal}`);
    // A reply cut at the cap is invalid JSON by construction; name the cause
    // instead of the parse error so the cap, not the model, gets fixed.
    if (choice?.finish_reason === "length") {
      const used = response.usage?.completion_tokens;
      const reasoning = response.usage?.completion_tokens_details?.reasoning_tokens;
      lastError = `output truncated at max_completion_tokens ${spec.maxTokens}`
        + (used !== undefined ? ` (${used} completion tokens` + (reasoning ? `, ${reasoning} reasoning` : "") + ")" : "");
      continue;
    }
    const reply = message?.content ?? "";

    let raw: unknown;
    try {
      raw = JSON.parse(reply);
    } catch (err) {
      lastError = `invalid JSON (${(err as Error).message})`;
      continue;
    }
    const parsed = spec.schema.safeParse(raw);
    if (!parsed.success) {
      lastError = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      continue;
    }
    // Chart-grounded checks: claims must cite real placements, foundation
    // must echo the computed sect. A failure here is a hallucination, and it
    // never reaches storage.
    const problems = spec.validate ? spec.validate(parsed.data, brief) : [];
    if (problems.length === 0) return { data: parsed.data as z.infer<S["schema"]>, usage };
    lastError = problems.join("; ");
  }

  throw new SectionError(spec.key, `failed validation after ${ATTEMPTS} attempts: ${lastError}`);
}

/** Words across every string leaf of a value. */
export function countWords(value: unknown): number {
  if (typeof value === "string") return value.trim() ? value.trim().split(/\s+/).length : 0;
  if (Array.isArray(value)) return value.reduce((n, v) => n + countWords(v), 0);
  if (value && typeof value === "object") {
    return Object.entries(value).reduce((n, [k, v]) => (k === "claims" ? n : n + countWords(v)), 0);
  }
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
  const startedAt = Date.now();

  // Stage 1: foundation runs alone. Its output is the editorial handoff every
  // reader-facing section receives.
  const foundationPrompt = await resolveSection(FOUNDATION.key);
  const foundationCall = await callSection(
    FOUNDATION,
    FOUNDATION_MODEL,
    foundationPrompt.system,
    assembleUser(foundationPrompt.user, brief, FOUNDATION),
    brief,
  );
  const foundation = foundationCall.data;
  const foundationJson = JSON.stringify(foundation, null, 2);

  // Stage 2: the ten sections depend only on the foundation, so they run in
  // parallel. Prompts resolve in parallel too, honouring DB overrides.
  const prompts = await Promise.all(REPORT_SECTIONS.map((s) => resolveSection(s.key)));
  const calls = await Promise.all(
    REPORT_SECTIONS.map((spec, i) =>
      callSection(spec, SECTION_MODEL, prompts[i].system, assembleUser(prompts[i].user, brief, spec, foundationJson), brief),
    ),
  );
  const results = calls.map((c) => c.data);

  // Wall clock covers the serial foundation plus one parallel wave, so it is
  // always below the summed call time. The gap is what the fan-out buys.
  const usage = buildReportUsage(
    [foundationCall.usage, ...calls.map((c) => c.usage)],
    Date.now() - startedAt,
  );
  logger.info({
    model: usage.model,
    costUsd: usage.costUsd,
    wallClockSeconds: Math.round(usage.wallClockMs / 100) / 10,
    ...usage.totals,
    retried: usage.sections.filter((s) => s.attempts > 1).map((s) => s.section),
  }, "report interpretation complete");

  const withLabels = results.map((r) => {
    const out = r as { claims: Parameters<typeof storeClaims>[0] };
    return { ...out, claims: storeClaims(out.claims, chart) };
  });
  const byId = Object.fromEntries(SECTION_IDS.map((id, i) => [id, withLabels[i]])) as Record<ReportSectionId, unknown>;

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

  const s = computeSect(chart);
  return {
    meta: {
      promptVersion: PROMPT_VERSION,
      model: SECTION_MODEL,
      houseSystem: "whole-sign",
      zodiac: "tropical",
      ephemeris: EPHEMERIS,
      orbs: ASPECT_ORBS,
      sect: s.sect,
      sectLight: s.light,
      sunAltitude: s.sunAltitude,
      sectMarginal: s.marginal,
      generatedAt: new Date().toISOString(),
      wordCount: countWords(sections),
      usage,
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
