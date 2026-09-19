/**
 * Compatibility report generation (ADR-39): two finished natal reports in,
 * one report out. One foundation call, then the nine chapters and the link
 * cards in parallel, each schema enforced, each stored as it lands through
 * the same onSection frame the natal generator uses. Nothing in either natal
 * report is regenerated; a failed section fails the report with its message.
 */
import type { z } from "zod/v4";
import { ASPECT_ORBS, EPHEMERIS } from "./chartCalculation.js";
import { callStructured } from "./aiInterpretation.js";
import { resolveSection } from "./promptLoader.js";
import { logger } from "./logger.js";
import { buildReportUsage, type ReportUsage } from "./usage.js";
import { MODELS } from "./models.js";
import { buildPairBrief, CROSS_ORB, type Lens, type PairBrief, type PairInput } from "./pairBrief.js";
import { toStrictJsonSchema, type StoredClaim } from "../prompts/index.js";
import {
  PAIR_CLAIMS_CONTRACT, PAIR_FOUNDATION, PAIR_PROMPT_VERSION, PAIR_SECTIONS,
  PairChapterSchema, PairFoundationSchema, PairLinksSchema, PairPractiseSchema,
  pairHasClaims, storePairClaims, type PairClaim, type PairSectionId, type PairSectionSpec,
} from "../prompts/pair/index.js";

type Stored<T> = Omit<T, "claims"> & { claims: StoredClaim[] };

export type PairFoundationData = z.infer<typeof PairFoundationSchema>;
export type PairChapterSection = Stored<z.infer<typeof PairChapterSchema>>;
export type PairPractiseSection = Stored<z.infer<typeof PairPractiseSchema>>;
export type PairLinksSection = z.infer<typeof PairLinksSchema>;

export interface PairMeta {
  promptVersion: string;
  reportType: "compatibility";
  lens: Lens;
  names: { a: string; b: string };
  model: string;
  houseSystem: "whole-sign";
  zodiac: "tropical";
  ephemeris: string;
  orbs: typeof ASPECT_ORBS;
  /** The orb within which a cross aspect is drawn and cited. */
  crossOrb: number;
  /** True when either chart has no horizon: no overlay card, no house anywhere. */
  blind: boolean;
  generatedAt: string;
  wordCount: number;
  usage: ReportUsage;
}

export interface PairInterpretation {
  meta: PairMeta;
  foundation: PairFoundationData;
  howYouMeet: PairChapterSection;
  twoCharts: PairChapterSection;
  twoWays: PairChapterSection;
  whereItFlows: PairChapterSection;
  whereItRubs: PairChapterSection;
  howYouTalk: PairChapterSection;
  lensOne: PairChapterSection;
  lensTwo: PairChapterSection;
  whatToPractise: PairPractiseSection;
  links: PairLinksSection;
}

export interface PairFrame {
  section: "meta" | PairSectionId;
  patch: Partial<PairInterpretation>;
}

export interface PairGenerateOptions {
  onSection?: (frame: PairFrame) => void | Promise<void>;
}

function assembleUser(instructions: string, brief: PairBrief, spec: PairSectionSpec, foundationJson?: string): string {
  const parts = [instructions.trim()];
  if (spec.key !== PAIR_FOUNDATION.key && pairHasClaims(spec)) parts.push("", PAIR_CLAIMS_CONTRACT);
  parts.push("", "PAIR BRIEF", brief.text);
  if (foundationJson) parts.push("", "FOUNDATION (internal editorial handoff, never quote it)", foundationJson);
  const extra = spec.extraContext?.(brief);
  if (extra) parts.push("", extra);
  return parts.join("\n");
}

function countWords(value: unknown): number {
  if (typeof value === "string") return value.trim() ? value.trim().split(/\s+/).length : 0;
  if (Array.isArray(value)) return value.reduce((n, v) => n + countWords(v), 0);
  if (value && typeof value === "object") {
    return Object.entries(value).reduce((n, [k, v]) => (k === "claims" ? n : n + countWords(v)), 0);
  }
  return 0;
}

function withStoredClaims(data: unknown, brief: PairBrief): unknown {
  const out = data as { claims?: PairClaim[] };
  return out.claims ? { ...out, claims: storePairClaims(out.claims, brief) } : out;
}

export async function generatePairInterpretation(
  input: PairInput,
  options: PairGenerateOptions = {},
): Promise<PairInterpretation> {
  const brief = buildPairBrief(input);
  const startedAt = Date.now();

  const openingMeta = {
    promptVersion: PAIR_PROMPT_VERSION,
    reportType: "compatibility",
    lens: brief.lens,
    names: { a: brief.a.name, b: brief.b.name },
    model: MODELS.sections,
    houseSystem: "whole-sign",
    zodiac: "tropical",
    ephemeris: EPHEMERIS,
    orbs: ASPECT_ORBS,
    crossOrb: CROSS_ORB,
    blind: brief.blind,
    generatedAt: new Date().toISOString(),
  } as PairMeta;
  await options.onSection?.({ section: "meta", patch: { meta: openingMeta } });

  // Stage 1: the pair foundation runs alone, the editorial handoff every chapter receives.
  const foundationPrompt = await resolveSection(PAIR_FOUNDATION.key);
  const foundationCall = await callStructured<PairFoundationData>({
    usageKey: PAIR_FOUNDATION.key,
    model: MODELS.foundation,
    system: foundationPrompt.system,
    user: assembleUser(foundationPrompt.user, brief, PAIR_FOUNDATION),
    schema: PairFoundationSchema,
    maxTokens: PAIR_FOUNDATION.maxTokens,
    validate: (out) => PAIR_FOUNDATION.validate?.(out, brief) ?? [],
  });
  const foundation = foundationCall.data;
  const foundationJson = JSON.stringify(foundation, null, 2);

  // Stage 2: the nine chapters and the link cards, in parallel, stored as each lands.
  const prompts = await Promise.all(PAIR_SECTIONS.map((spec) => resolveSection(spec.key)));
  const calls = await Promise.all(
    PAIR_SECTIONS.map(async (spec, i) => {
      const call = await callStructured<unknown>({
        usageKey: spec.key,
        model: MODELS.sections,
        system: prompts[i].system,
        user: assembleUser(prompts[i].user, brief, spec, foundationJson),
        schema: spec.schema,
        maxTokens: spec.maxTokens,
        validate: (out) => (spec.validate as ((o: unknown, b: PairBrief) => string[]) | undefined)?.(out, brief) ?? [],
      });
      const id = spec.key.split(":")[1] as PairSectionId;
      const stored = withStoredClaims(call.data, brief);
      await options.onSection?.({ section: id, patch: { [id]: stored } as Partial<PairInterpretation> });
      return { id, usage: call.usage, stored };
    }),
  );

  const usage = buildReportUsage([foundationCall.usage, ...calls.map((c) => c.usage)], Date.now() - startedAt);
  logger.info({
    model: usage.model,
    costUsd: usage.costUsd,
    wallClockSeconds: Math.round(usage.wallClockMs / 100) / 10,
    lens: brief.lens,
    blind: brief.blind,
    ...usage.totals,
    retried: usage.sections.filter((s) => s.attempts > 1).map((s) => s.section),
  }, "compatibility interpretation complete");

  const sections = Object.fromEntries(calls.map((c) => [c.id, c.stored])) as unknown as Omit<PairInterpretation, "meta" | "foundation">;
  return {
    meta: { ...openingMeta, model: usage.model, wordCount: countWords(sections), usage },
    foundation,
    ...sections,
  };
}

/** Exposed for the lab and the admin preview: the exact prompt pair a pair section would send. */
export async function previewPairSectionPrompt(sectionKey: string, input: PairInput, foundationJson?: string) {
  const spec = [PAIR_FOUNDATION, ...PAIR_SECTIONS].find((s) => s.key === sectionKey);
  if (!spec) throw new Error(`Unknown pair section ${sectionKey}`);
  const prompt = await resolveSection(spec.key);
  const brief = buildPairBrief(input);
  return { system: prompt.system, user: assembleUser(prompt.user, brief, spec, foundationJson), schema: toStrictJsonSchema(spec.schema) };
}
