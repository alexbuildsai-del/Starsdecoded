/**
 * Compatibility report generation (ADR-39, ADR-63): two finished natal
 * reports in, one report out. One foundation call that allocates the links
 * and picks the scenes, then chapter 01, the lens's five chapters and the
 * link cards in parallel, each on its own brief, then chapter 07 collecting
 * the next-time items. Each section is schema enforced and stored as it
 * lands through the same onSection frame the natal generator uses. Nothing
 * in either natal report is regenerated; a failed section fails the report.
 */
import type { z } from "zod/v4";
import { ASPECT_ORBS, EPHEMERIS } from "./chartCalculation.js";
import { callStructured } from "./aiInterpretation.js";
import { resolveSection } from "./promptLoader.js";
import { logger } from "./logger.js";
import { buildReportUsage, type ReportUsage, type SectionUsage } from "./usage.js";
import { MODELS } from "./models.js";
import { buildPairBrief, chapterBrief, CROSS_ORB, type Band, type Lens, type PairBrief, type PairInput } from "./pairBrief.js";
import { toStrictJsonSchema, type StoredClaim } from "../prompts/index.js";
import {
  PAIR_CLAIMS_CONTRACT, PAIR_FOUNDATION, PAIR_PROMPT_VERSION,
  PairFoundationSchema, PairLensChapterSchema, PairLinksSchema, PairPractiseSchema, PairTwoChartsSchema,
  allocationOf, pairChapterId, pairChapterIds, pairHasClaims, pairSectionById, pairSpecsFor, scenesOf, storePairClaims,
  type PairClaim, type PairSectionSpec,
} from "../prompts/pair/index.js";

type Stored<T> = Omit<T, "claims"> & { claims: StoredClaim[] };

export type PairFoundationData = z.infer<typeof PairFoundationSchema>;
export type PairTwoChartsSection = Stored<z.infer<typeof PairTwoChartsSchema>>;
export type PairLensChapterSection = Stored<z.infer<typeof PairLensChapterSchema>>;
export type PairPractiseSection = Stored<z.infer<typeof PairPractiseSchema>>;
export type PairLinksSection = z.infer<typeof PairLinksSchema>;

/** A chapter's three scenes: the titles, which one the foundation wrote, and the texts written on tap since (ADR-65, ADR-72). */
export interface PairChapterScenes {
  titles: string[];
  written: number;
  texts: Record<string, string>;
}
export type PairScenes = Record<string, PairChapterScenes>;

export interface PairMeta {
  promptVersion: string;
  reportType: "compatibility";
  lens: Lens;
  /** How two people know each other, in their words; null under the other lenses. */
  label: string | null;
  /** The child's age band under the parent lens, null otherwise (ADR-67). */
  band: Band | null;
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

/** The lens chapters sit at their own ids (partners02 ... people06); read them with `lensChapterOf`. */
export interface PairInterpretation extends Record<string, unknown> {
  meta: PairMeta;
  foundation: PairFoundationData;
  twoCharts: PairTwoChartsSection;
  whatToPractise: PairPractiseSection;
  links: PairLinksSection;
  scenes: PairScenes;
}

export function lensChapterOf(interpretation: PairInterpretation, id: string): PairLensChapterSection | undefined {
  const v = interpretation[id];
  return v && typeof v === "object" && "card" in (v as object) ? (v as PairLensChapterSection) : undefined;
}

export interface PairFrame {
  section: "meta" | string;
  patch: Partial<PairInterpretation>;
}

export interface PairGenerateOptions {
  onSection?: (frame: PairFrame) => void | Promise<void>;
}

/** The chapters the foundation allocates to, numbered as it sees them, with their scenes. */
function chaptersBlock(brief: PairBrief): string {
  const ids = pairChapterIds(brief.lens);
  const lines = ids.map((id, i) => {
    const spec = pairSectionById(id)!;
    const titles = scenesOf(spec, brief.band);
    const scenes = titles ? `: scenes ${titles.map((s, j) => `${j} ${s}`).join(" · ")}` : "";
    return `  ${i + 1}. ${spec.label}${scenes}`;
  });
  return ["CHAPTERS (numbered as owners and scenes refer to them):", ...lines].join("\n");
}

/** The chapter's own tail of the brief: its links, its claims, its scenes. */
function tailFor(brief: PairBrief, spec: PairSectionSpec, foundation: PairFoundationData | null): string {
  const id = spec.key.split(":")[1];
  const owned = brief.allocation?.[id] ?? [];
  const chosen = foundation?.scenes.find((s) => pairChapterId(brief.lens, s.chapter) === id);
  const titles = scenesOf(spec, brief.band);
  return chapterBrief(brief, {
    owned,
    draws: spec.draws,
    scenes: titles ? { titles, written: chosen?.index ?? 0 } : undefined,
  });
}

/**
 * The user turn: the common brief first, then the foundation, then the
 * chapter's own tail, then the editable instructions, so every parallel
 * call shares the longest possible cached prefix (ADR-66).
 */
export function assemblePairUser(instructions: string, brief: PairBrief, spec: PairSectionSpec, foundation: PairFoundationData | null, extraTail?: string): string {
  const parts = ["PAIR BRIEF", brief.text];
  if (spec.key === PAIR_FOUNDATION.key) parts.push("", chaptersBlock(brief));
  if (foundation) parts.push("", "FOUNDATION (internal editorial handoff, never quote it)", JSON.stringify(foundation, null, 2));
  if (spec.key !== PAIR_FOUNDATION.key && spec.key !== "pair:links") parts.push("", tailFor(brief, spec, foundation));
  if (extraTail) parts.push("", extraTail);
  parts.push("", instructions.trim());
  if (spec.key !== PAIR_FOUNDATION.key && pairHasClaims(spec)) parts.push("", PAIR_CLAIMS_CONTRACT);
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

/** The next-time items of the five lens chapters, as chapter 07 collects them, and the sources they cited. */
function practiseTail(brief: PairBrief, chapters: Record<string, unknown>): string {
  const names = { A: brief.a.name, B: brief.b.name, both: "both" };
  const items: string[] = [];
  const sources = new Set<string>();
  for (const id of pairChapterIds(brief.lens)) {
    const ch = chapters[id] as PairLensChapterSection | undefined;
    if (!ch || !("nextTime" in ch)) continue;
    for (const it of ch.nextTime.items) items.push(`  - for ${names[it.for]}, from ${pairSectionById(id)?.label}: ${it.action} (why: ${it.why})`);
    for (const c of ch.claims) for (const e of c.evidence) {
      const ref = e.ref as unknown as { kind: string; report?: string; section?: string; claim?: number };
      if (ref.kind === "source") sources.add(`  - ${ref.report}/${ref.section} claim ${ref.claim}`);
    }
  }
  return [
    "NEXT-TIME ITEMS from the five chapters (collect these; add nothing new):",
    ...(items.length ? items : ["  - none written"]),
    "",
    "SOURCES YOU MAY CITE (report, section, claim number), and any link in the LINKS list:",
    ...(sources.size ? [...sources] : ["  - none"]),
  ].join("\n");
}

/** The prompt a section's fresh generation would send, and the scene call reuses (ADR-72). */
export async function pairSectionCall(spec: PairSectionSpec, brief: PairBrief, foundation: PairFoundationData | null, extraTail?: string) {
  const prompt = await resolveSection(spec.key);
  return { system: prompt.system, user: assemblePairUser(prompt.user, brief, spec, foundation, extraTail) };
}

export async function generatePairInterpretation(
  input: PairInput,
  options: PairGenerateOptions = {},
): Promise<PairInterpretation> {
  const brief = buildPairBrief(input);
  const startedAt = Date.now();
  const specs = pairSpecsFor(brief.lens);
  const chapterIds = pairChapterIds(brief.lens);

  const openingMeta = {
    promptVersion: PAIR_PROMPT_VERSION,
    reportType: "compatibility",
    lens: brief.lens,
    label: brief.label,
    band: brief.band,
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

  // Stage 1: the pair foundation runs alone. It allocates every link to one
  // or two chapters and picks each chapter's scene: the editorial handoff.
  const foundationPrompt = await pairSectionCall(PAIR_FOUNDATION, brief, null);
  const foundationCall = await callStructured<PairFoundationData>({
    usageKey: PAIR_FOUNDATION.key,
    model: MODELS.foundation,
    system: foundationPrompt.system,
    user: foundationPrompt.user,
    schema: PairFoundationSchema,
    maxTokens: PAIR_FOUNDATION.maxTokens,
    validate: (out) => PAIR_FOUNDATION.validate?.(out, brief) ?? [],
  });
  const foundation = foundationCall.data;
  brief.allocation = allocationOf(foundation, brief, (n) => pairChapterId(brief.lens, n));
  const scenes: PairScenes = {};
  for (const id of chapterIds) {
    const titles = scenesOf(pairSectionById(id)!, brief.band);
    if (!titles) continue;
    const chosen = foundation.scenes.find((s) => pairChapterId(brief.lens, s.chapter) === id);
    scenes[id] = { titles: [...titles], written: chosen?.index ?? 0, texts: {} };
  }
  await options.onSection?.({ section: "meta", patch: { foundation, scenes } });

  const usages: SectionUsage[] = [foundationCall.usage];
  const sections: Record<string, unknown> = {};

  async function run(spec: PairSectionSpec, extraTail?: string): Promise<void> {
    const prompt = await pairSectionCall(spec, brief, foundation, extraTail);
    const call = await callStructured<unknown>({
      usageKey: spec.key,
      model: MODELS.sections,
      system: prompt.system,
      user: prompt.user,
      schema: spec.schema,
      maxTokens: spec.maxTokens,
      validate: (out) => (spec.validate as ((o: unknown, b: PairBrief) => string[]) | undefined)?.(out, brief) ?? [],
    });
    const id = spec.key.split(":")[1];
    const stored = withStoredClaims(call.data, brief);
    sections[id] = stored;
    usages.push(call.usage);
    await options.onSection?.({ section: id, patch: { [id]: stored } as Partial<PairInterpretation> });
  }

  // Stage 2: chapter 01, the lens's five chapters and the link cards, in parallel, each on its own brief.
  await Promise.all(specs.filter((s) => s.key !== "pair:whatToPractise").map((spec) => run(spec)));
  // Stage 3: chapter 07 collects what the five wrote and adds nothing new.
  await run(pairSectionById("whatToPractise")!, practiseTail(brief, sections));

  const usage = buildReportUsage(usages, Date.now() - startedAt);
  logger.info({
    model: usage.model,
    costUsd: usage.costUsd,
    wallClockSeconds: Math.round(usage.wallClockMs / 100) / 10,
    lens: brief.lens,
    band: brief.band,
    blind: brief.blind,
    ...usage.totals,
    retried: usage.sections.filter((s) => s.attempts > 1).map((s) => s.section),
  }, "compatibility interpretation complete");

  return {
    meta: { ...openingMeta, model: usage.model, wordCount: countWords(sections), usage },
    foundation,
    scenes,
    ...sections,
  } as PairInterpretation;
}

/** Exposed for the lab and the admin preview: the exact prompt pair a pair section would send. */
export async function previewPairSectionPrompt(sectionKey: string, input: PairInput, foundation?: PairFoundationData) {
  const spec = pairSectionById(sectionKey.replace(/^pair:/, ""));
  if (!spec) throw new Error(`Unknown pair section ${sectionKey}`);
  const brief = buildPairBrief(input);
  if (foundation) brief.allocation = allocationOf(foundation, brief, (n) => pairChapterId(brief.lens, n));
  const prompt = await pairSectionCall(spec, brief, foundation ?? null);
  return { system: prompt.system, user: prompt.user, schema: toStrictJsonSchema(spec.schema) };
}
