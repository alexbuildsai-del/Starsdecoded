/**
 * Natal report generation.
 *
 * One foundation call, then the reader-facing sections in parallel. Every
 * call uses the same byte-identical system prompt (the cached prefix), the
 * section's editable instructions, and then the variable chart brief. Output
 * is constrained by each section's zod schema via strict structured outputs
 * and parsed with the same schema, so a rejected reply is retried with the
 * problems named, and then fails loudly rather than being stored as a raw
 * string.
 *
 * The horizon is a status (R-4.6). A chart whose birth time did not settle
 * it is written blind: the sections that are nothing but the horizon are
 * skipped, the rest are written under their blind rules, and `meta.horizon`
 * says so. Adding the time later is a pass, not a regeneration: the horizon
 * blocks are generated and every stored section is amended by quote match
 * (`amendSections`), never rewritten.
 *
 * Every call's token usage is recorded and stored on `meta.usage` (R02, MB-10),
 * so a prompt, model or reasoning-effort change is judged on measured cost and
 * time. It is the only channel the report lab has in `--remote` mode, where it
 * reads a deployed report as an anonymous visitor.
 */
import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod/v4";
import { resolveSection } from "./promptLoader.js";
import { ASPECT_ORBS, EPHEMERIS, hasHorizon, type HorizonStatus, type NatalChartData } from "./chartCalculation.js";
import { sectOf } from "./traditional.js";
import { logger } from "./logger.js";
import { addAttempt, buildReportUsage, emptySection, type ReportUsage, type SectionUsage } from "./usage.js";
import { MODELS, modelFor } from "./models.js";
import {
  ALL_SECTIONS, CLAIMS_CONTRACT, ClaimSchema, EvidenceRefSchema, FOUNDATION, REPORT_SECTIONS, SECTION_IDS,
  buildBrief, hasClaims, instructionsFor, schemaFor, sectionById, sectionsFor, storeClaims, toStrictJsonSchema, validateClaims,
  type ChartBrief, type Claim, type ReportSectionId, type SectionSpec, type StoredClaim,
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
import { HousesSchema } from "../prompts/sections/houses.js";
import { FocusSchema } from "../prompts/sections/focus.js";

// Which model each call uses lives in ./models.ts, never here.
/** One blind try, then two informed by the rejection. A lost section loses the whole report. */
const ATTEMPTS = 3;
/** Bump when the section set, schemas, or vocabulary change shape. v6: ten chapters, the horizon as a status. */
export const PROMPT_VERSION = "v6";

/** A section as stored: the model's fields with claims replaced by their validated, labelled form. */
type Stored<T> = Omit<T, "claims"> & { claims: StoredClaim[] };

export type FoundationData = Partial<Pick<z.infer<typeof FoundationSchema>, "sect" | "sectLight">>
  & Omit<z.infer<typeof FoundationSchema>, "sect" | "sectLight">;
export type OverviewSection = Stored<z.infer<typeof OverviewSchema>>;
/** The rising part is absent when the horizon is unknown (ADR-34). */
export type TriadSection = Stored<Omit<z.infer<typeof TriadSchema>, "rising">> & { rising?: z.infer<typeof TriadSchema>["rising"] };
/** The house readings carry no claims: the card they sit on is the evidence. */
export type HousesSection = z.infer<typeof HousesSchema>;
export type MindSection = Stored<z.infer<typeof MindSchema>>;
export type CareerSection = Stored<z.infer<typeof CareerSchema>>;
export type MoneySection = Stored<z.infer<typeof MoneySchema>>;
export type RelationshipsSection = Stored<z.infer<typeof RelationshipsSchema>>;
export type FamilySection = Stored<z.infer<typeof FamilySchema>>;
export type SuperpowersSection = Stored<z.infer<typeof SuperpowersSchema>>;
export type DiscoveriesSection = Stored<z.infer<typeof DiscoveriesSchema>>;
export type FocusSection = Stored<z.infer<typeof FocusSchema>>;

/** One sentence a horizon pass changed, kept beside the section it changed (ADR-35). */
export interface RevisionMark {
  before: string;
  now: string;
  evidence: StoredClaim["evidence"];
}

export interface SectionAddition {
  text: string;
  claims: StoredClaim[];
}

/** What the last pass changed. The counts are the report's own; the page never recounts them. */
export interface HorizonPassRecord {
  at: string;
  passes: number;
  sentencesRevised: number;
  paragraphsAdded: number;
  sections: Record<string, { amended: RevisionMark[]; added: SectionAddition[] }>;
}

export interface ReportMeta {
  promptVersion: string;
  reportType: "natal";
  model: string;
  houseSystem: "whole-sign";
  zodiac: "tropical";
  ephemeris: string;
  orbs: typeof ASPECT_ORBS;
  /** Mirrors the chart's horizon status (ADR-34). */
  horizon: HorizonStatus;
  horizonPass?: HorizonPassRecord;
  /** Sect and its inputs are absent when the horizon is unknown. */
  sect?: "day" | "night";
  sectLight?: "sun" | "moon";
  /** True altitude of the Sun's centre at birth, degrees, no refraction. */
  sunAltitude?: number;
  /** Within 5 degrees of the horizon. Methodology box only. */
  sectMarginal?: boolean;
  generatedAt: string;
  /** Prose words across the reader-facing sections. */
  wordCount: number;
  /** Tokens, cost and time for every call. */
  usage: ReportUsage;
}

export interface ReportInterpretation {
  meta: ReportMeta;
  foundation: FoundationData;
  overview: OverviewSection;
  triad: TriadSection;
  /** Absent when the horizon is unknown. */
  houses?: HousesSection;
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
  /** Absent when the horizon is unknown. */
  angleMeanings?: AngleMeanings;
}

// ---------------------------------------------------------------------------
// Assembly. Static first, variable last, so the cached prefix is shared.
// ---------------------------------------------------------------------------

function assembleUser(instructions: string, brief: ChartBrief, spec: SectionSpec, foundationJson?: string): string {
  const blind = brief.horizon === "unknown";
  const parts = [instructionsFor(spec, instructions, blind).trim()];
  if (spec.key !== FOUNDATION.key && hasClaims(spec)) parts.push("", CLAIMS_CONTRACT);
  parts.push("", "CHART BRIEF", brief.text);
  if (foundationJson) parts.push("", "FOUNDATION (internal editorial handoff, never quote it)", foundationJson);
  const extra = spec.extraContext?.(brief);
  if (extra) parts.push("", extra);
  return parts.join("\n");
}

export class SectionError extends Error {
  constructor(public readonly key: string, message: string) {
    super(`${key}: ${message}`);
    this.name = "SectionError";
  }
}

export interface SectionResult<T> {
  data: T;
  usage: SectionUsage;
}

export interface StructuredCall<T> {
  /** Named in the usage row and in the JSON schema registration. */
  usageKey: string;
  model: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
  /** Chart-grounded checks; a non-empty list rejects the reply, retried with the problems named. */
  validate?: (output: T) => string[];
}

/**
 * One schema-enforced call with the retry policy every report shares: a
 * blind try, then two informed by the rejection, then a loud failure. The
 * natal sections, the amendment pass and the pair sections all go through
 * here, so a cap or a refusal is handled once.
 */
export async function callStructured<T>(call: StructuredCall<T>): Promise<SectionResult<T>> {
  const jsonSchema = toStrictJsonSchema(call.schema);
  const name = call.usageKey.replace(/[^a-zA-Z0-9_]/g, "_");
  let lastError = "";
  // Accumulates across attempts: a section that retried twice cost three calls,
  // and hiding that would understate exactly what we are here to measure.
  let usage = emptySection(call.usageKey, call.model);

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    // A retry that repeats the identical request mostly repeats the mistake.
    // The problems go at the end of the user turn, so the cached system
    // prefix is untouched and the model knows exactly what to fix.
    const content = attempt === 1
      ? call.user
      : `${call.user}\n\nPREVIOUS ATTEMPT REJECTED: ${lastError}\nReturn the complete reply again with these fixed. Every claim quote must be copied exactly from the prose in this reply.`;
    const startedAt = Date.now();
    const response = await openai.chat.completions.create({
      model: call.model,
      max_completion_tokens: call.maxTokens,
      messages: [
        { role: "system", content: call.system },
        { role: "user", content },
      ],
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema: jsonSchema } },
    });
    usage = addAttempt(usage, response.usage, Date.now() - startedAt);

    const choice = response.choices[0];
    const message = choice?.message;
    if (message?.refusal) throw new SectionError(call.usageKey, `model refused: ${message.refusal}`);
    // A reply cut at the cap is invalid JSON by construction; name the cause
    // instead of the parse error so the cap, not the model, gets fixed.
    if (choice?.finish_reason === "length") {
      const used = response.usage?.completion_tokens;
      const reasoning = response.usage?.completion_tokens_details?.reasoning_tokens;
      lastError = `output truncated at max_completion_tokens ${call.maxTokens}`
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
    const parsed = call.schema.safeParse(raw);
    if (!parsed.success) {
      lastError = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      continue;
    }
    // Chart-grounded checks: claims must cite real placements, foundation
    // must echo the computed sect. A failure here is a hallucination, and it
    // never reaches storage.
    const problems = call.validate ? call.validate(parsed.data) : [];
    if (problems.length === 0) return { data: parsed.data, usage };
    lastError = problems.join("; ");
  }

  throw new SectionError(call.usageKey, `failed validation after ${ATTEMPTS} attempts: ${lastError}`);
}

interface CallOptions<T> {
  /** The schema in force for this call. Defaults to the spec's; a blind or partial call narrows it. */
  schema?: z.ZodType<T>;
  validate?: (output: T, brief: ChartBrief) => string[];
  /** Named in the usage row when the call is not the spec's whole section. */
  usageKey?: string;
}

async function callSection<T>(
  spec: SectionSpec,
  model: string,
  system: string,
  user: string,
  brief: ChartBrief,
  options: CallOptions<T> = {},
): Promise<SectionResult<T>> {
  const schema = (options.schema ?? spec.schema) as z.ZodType<T>;
  const validate = options.validate ?? (spec.validate as ((o: T, b: ChartBrief) => string[]) | undefined);
  return callStructured<T>({
    usageKey: options.usageKey ?? spec.key,
    model, system, user, schema,
    maxTokens: spec.maxTokens,
    validate: validate ? (out) => validate(out, brief) : undefined,
  });
}

/** Claims replaced by their validated, labelled form. A claimless section passes through. */
function withStoredClaims(data: unknown, chart: NatalChartData): unknown {
  const out = data as { claims?: Claim[] };
  return out.claims ? { ...out, claims: storeClaims(out.claims, chart) } : out;
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

/** The meta block every frame and every pass shares: the method, the horizon, the sect when there is one. */
function metaFor(chart: NatalChartData, generatedAt: string): Omit<ReportMeta, "wordCount" | "usage"> {
  const s = sectOf(chart);
  return {
    promptVersion: PROMPT_VERSION,
    reportType: "natal",
    model: MODELS.sections,
    houseSystem: "whole-sign",
    zodiac: "tropical",
    ephemeris: EPHEMERIS,
    orbs: ASPECT_ORBS,
    horizon: chart.horizon.status,
    ...(s ? { sect: s.sect, sectLight: s.light, sunAltitude: s.sunAltitude, sectMarginal: s.marginal } : {}),
    generatedAt,
  };
}

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

/**
 * A piece of the report as soon as it exists, so the page can render it while
 * the rest is still being written (ADR-25). The opening frame is `meta`: the
 * method block and the deterministic wheel text, everything the hero and the
 * explorer need. Each later frame is one finished section.
 */
export interface SectionFrame {
  section: "meta" | ReportSectionId;
  patch: Partial<ReportInterpretation>;
}

export interface GenerateOptions {
  onSection?: (frame: SectionFrame) => void | Promise<void>;
}

export async function generateInterpretation(
  chart: NatalChartData,
  name: string,
  options: GenerateOptions = {},
): Promise<ReportInterpretation> {
  const brief = buildBrief(chart, name);
  const blind = brief.horizon === "unknown";
  const startedAt = Date.now();

  // wordCount and usage are only knowable at the end, so the opening frame
  // carries the meta block without them and the final write completes it.
  const openingMeta = metaFor(chart, new Date().toISOString()) as ReportMeta;
  await options.onSection?.({
    section: "meta",
    patch: {
      meta: openingMeta,
      personalPlanets: brief.personalPlanets,
      aspectMeanings: brief.aspectMeanings,
      ...(brief.angleMeanings ? { angleMeanings: brief.angleMeanings } : {}),
    },
  });

  // Stage 1: foundation runs alone. Its output is the editorial handoff every
  // reader-facing section receives.
  const foundationPrompt = await resolveSection(FOUNDATION.key);
  const foundationCall = await callSection<FoundationData>(
    FOUNDATION,
    MODELS.foundation,
    foundationPrompt.system,
    assembleUser(foundationPrompt.user, brief, FOUNDATION),
    brief,
    { schema: schemaFor(FOUNDATION, blind) as z.ZodType<FoundationData> },
  );
  const foundation = foundationCall.data;
  const foundationJson = JSON.stringify(foundation, null, 2);

  // Stage 2: the sections depend only on the foundation, so they run in
  // parallel. Prompts resolve in parallel too, honouring DB overrides. A
  // blind report skips the sections that are nothing but the horizon.
  const specs = sectionsFor(brief.horizon);
  const prompts = await Promise.all(specs.map((spec) => resolveSection(spec.key)));
  const calls = await Promise.all(
    specs.map(async (spec, i) => {
      const call = await callSection<unknown>(
        spec, modelFor(spec.key), prompts[i].system, assembleUser(prompts[i].user, brief, spec, foundationJson), brief,
        { schema: schemaFor(spec, blind) },
      );
      const id = spec.key.split(":")[1] as ReportSectionId;
      const stored = withStoredClaims(call.data, chart);
      await options.onSection?.({ section: id, patch: { [id]: stored } as Partial<ReportInterpretation> });
      return { id, usage: call.usage, stored };
    }),
  );

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
    horizon: chart.horizon.status,
    ...usage.totals,
    retried: usage.sections.filter((s) => s.attempts > 1).map((s) => s.section),
  }, "report interpretation complete");

  const sections = Object.fromEntries(calls.map((c) => [c.id, c.stored])) as unknown as
    Pick<ReportInterpretation, Exclude<ReportSectionId, "houses">> & { houses?: HousesSection };

  return {
    meta: {
      ...openingMeta,
      model: usage.model,
      wordCount: countWords(sections),
      usage,
    },
    foundation,
    ...sections,
    personalPlanets: brief.personalPlanets,
    aspectMeanings: brief.aspectMeanings,
    ...(brief.angleMeanings ? { angleMeanings: brief.angleMeanings } : {}),
  };
}

/** Exposed for the lab and tests: the exact prompt pair a section would send. */
export async function previewSectionPrompt(sectionKey: string, chart: NatalChartData, name: string, foundationJson?: string) {
  const spec = ALL_SECTIONS.find((s) => s.key === sectionKey);
  if (!spec) throw new Error(`Unknown section ${sectionKey}`);
  const prompt = await resolveSection(spec.key);
  const brief = buildBrief(chart, name);
  const blind = brief.horizon === "unknown";
  return { system: prompt.system, user: assembleUser(prompt.user, brief, spec, foundationJson), schema: toStrictJsonSchema(schemaFor(spec, blind)) };
}

// ---------------------------------------------------------------------------
// The horizon pass: the blocks the hour adds, and the amendments (ADR-35).
// ---------------------------------------------------------------------------

/** The rising part alone, for a report whose triad was written without one. */
const RisingSchema = z.object({
  rising: TriadSchema.shape.rising,
  claims: TriadSchema.shape.claims,
});
export type RisingPart = Stored<z.infer<typeof RisingSchema>>;

const RISING_INSTRUCTIONS = `The Sun and Moon parts of the Core Triad already exist and are not to be rewritten. Write only the rising part: 80 to 100 words on how they come across in the first minute. Read the rising sign first, then what the chart ruler's condition adds to it. Exactly one behavioural example the reader can check against themselves. The label field names the placement; the text field never does. Do not repeat the Sun and Moon parts given below.`;

export interface HorizonBlocks {
  rising: RisingPart;
  houses: HousesSection;
  angleMeanings: AngleMeanings;
  usage: SectionUsage[];
}

/**
 * Generated as in R04, from the now-drawn chart: the rising part of the
 * triad, the twelve house readings and the composed angle text. The
 * foundation of the stored report is handed over as it was written.
 */
export async function generateHorizonBlocks(
  chart: NatalChartData,
  name: string,
  stored: ReportInterpretation,
  options: GenerateOptions = {},
): Promise<HorizonBlocks> {
  if (!hasHorizon(chart)) throw new Error("generateHorizonBlocks needs a chart whose horizon holds");
  const brief = buildBrief(chart, name);
  if (!brief.angleMeanings) throw new Error("a drawn chart composes angle meanings");
  const foundationJson = JSON.stringify(stored.foundation, null, 2);
  const triad = sectionById("triad")!;
  const houses = sectionById("houses")!;
  const [triadPrompt, housesPrompt] = await Promise.all([resolveSection(triad.key), resolveSection(houses.key)]);

  const existingTriad = `EXISTING SUN AND MOON PARTS (keep them; write only rising):\n${JSON.stringify({ sun: stored.triad.sun, moon: stored.triad.moon }, null, 2)}`;
  const risingUser = [RISING_INSTRUCTIONS, "", CLAIMS_CONTRACT, "", "CHART BRIEF", brief.text, "", "FOUNDATION (internal editorial handoff, never quote it)", foundationJson, "", existingTriad].join("\n");

  const [risingCall, housesCall] = await Promise.all([
    callSection<z.infer<typeof RisingSchema>>(triad, modelFor(triad.key), triadPrompt.system, risingUser, brief, {
      schema: RisingSchema,
      validate: (out, b) => validateClaims(out, out.claims, b.chart),
      usageKey: "natal:triad:rising",
    }),
    callSection<HousesSection>(houses, modelFor(houses.key), housesPrompt.system, assembleUser(housesPrompt.user, brief, houses, foundationJson), brief),
  ]);
  const rising = withStoredClaims(risingCall.data, chart) as RisingPart;
  await options.onSection?.({ section: "houses", patch: { houses: housesCall.data } });
  await options.onSection?.({
    section: "triad",
    patch: { triad: { ...stored.triad, rising: rising.rising, claims: [...stored.triad.claims, ...rising.claims] } },
  });
  return { rising, houses: housesCall.data, angleMeanings: brief.angleMeanings, usage: [risingCall.usage, housesCall.usage] };
}

const AmendmentSchema = z.object({
  amendments: z.array(z.object({
    quote: z.string().describe("one sentence or clause copied exactly from the section text below"),
    replacement: z.string().describe("the sentence as it should now read; the rest of the paragraph stays word for word"),
    evidence: z.array(EvidenceRefSchema).min(1).max(3).describe("the horizon fact that changes it: an angle, a house ruler, a sect role, a lot, or a placement with its house"),
  })).max(3),
  additions: z.array(z.object({
    after: z.string().describe("a sentence copied exactly from the section text that the new paragraph follows, or the word end"),
    text: z.string().describe("one new paragraph, 40 to 90 words, that the horizon makes possible"),
    claims: z.array(ClaimSchema).min(1).max(3),
  })).max(1),
});
type Amendment = z.infer<typeof AmendmentSchema>;

const AMENDMENT_INSTRUCTIONS = `A birth time has been added to a report that was written without one. The section below was written with no rising sign, no houses, no sect and no lots. Those facts are now in the brief. Return ONLY what the horizon changes: at most three amendments, each a sentence or clause copied exactly from the section text with the sentence it should now read and the horizon evidence that changes it, and at most one addition, a paragraph of 40 to 90 words the horizon makes possible, placed after a sentence you copy exactly, or at the end. Everything else in the section stays word for word and must not be returned. Return no amendment at all when nothing the horizon settles would change a sentence. Every quote must be verbatim; a quote that does not match is discarded. Amended and added sentences obey the style contract: second person, behaviour the reader can check, no house, sign or planet names in prose.`;

/** Typographic variants the model swaps freely and a reader never notices, as CitedText softens them. */
function soften(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...").replace(/\s+/g, " ").trim();
}

/** A regex that finds the softened quote in the original text, so the match is exact after softening. */
function tolerant(quote: string): RegExp {
  const parts = soften(quote).split("").map((ch) => {
    if (ch === "'") return "[‘’']";
    if (ch === '"') return '[“”"]';
    if (ch === "-") return "[–—-]";
    if (ch === " ") return "\\s+";
    if (ch === ".") return "(?:\\.|…)";
    return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  return new RegExp(parts.join(""));
}

/** Every string leaf of a section except the claims, with its path, in stored order. */
function leaves(section: Record<string, unknown>): Array<{ path: string[]; text: string }> {
  const out: Array<{ path: string[]; text: string }> = [];
  const walk = (v: unknown, path: string[]) => {
    if (path[0] === "claims") return;
    if (typeof v === "string") out.push({ path, text: v });
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, String(i)]));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, [...path, k]);
  };
  walk(section, []);
  return out;
}

function setLeaf(section: Record<string, unknown>, path: string[], text: string): void {
  let node: Record<string, unknown> = section;
  for (const key of path.slice(0, -1)) node = node[key] as Record<string, unknown>;
  node[path[path.length - 1]] = text;
}

/** The end of the sentence a match sits in: the next full stop, question or exclamation mark followed by a space or the end. */
function sentenceEnd(text: string, from: number): number {
  const rest = text.slice(from);
  const m = rest.match(/[.!?](?=\s|$)/);
  return m && m.index !== undefined ? from + m.index + 1 : text.length;
}

export interface AmendedSection {
  section: Record<string, unknown>;
  amended: RevisionMark[];
  added: SectionAddition[];
  /** Quotes the model returned that matched nothing, dropped and logged. */
  dropped: string[];
}

/**
 * Apply one amendment reply to one stored section, in code: an amendment is
 * applied by exact quote match after softening, an addition is inserted
 * after the sentence it names, an unmatched quote is dropped and logged and
 * never applied loosely. Claims are re-validated afterwards against the
 * drawn chart; an existing claim whose quote was amended follows the
 * replacement. Pure of the model, so a test can hand it any reply.
 */
export function applyAmendment(
  id: string,
  stored: Record<string, unknown>,
  reply: Amendment,
  chart: NatalChartData,
): AmendedSection {
  const section = JSON.parse(JSON.stringify(stored)) as Record<string, unknown>;
  const amended: RevisionMark[] = [];
  const added: SectionAddition[] = [];
  const dropped: string[] = [];
  const newClaims: Claim[] = [];

  for (const a of reply.amendments.slice(0, 3)) {
    const re = tolerant(a.quote);
    const leaf = leaves(section).find((l) => re.test(l.text));
    if (!leaf) { dropped.push(a.quote); continue; }
    const match = leaf.text.match(re)!;
    const before = match[0];
    setLeaf(section, leaf.path, leaf.text.replace(before, a.replacement));
    amended.push({ before, now: a.replacement, evidence: storeClaims([{ quote: a.replacement, evidence: a.evidence }], chart)[0].evidence });
    newClaims.push({ quote: a.replacement, evidence: a.evidence });
  }

  for (const add of reply.additions.slice(0, 1)) {
    const all = leaves(section);
    if (all.length === 0) { dropped.push(add.after); continue; }
    let target = all[all.length - 1];
    let at = target.text.length;
    if (soften(add.after).toLowerCase() !== "end") {
      const re = tolerant(add.after);
      const leaf = all.find((l) => re.test(l.text));
      if (!leaf) { dropped.push(add.after); continue; }
      const m = leaf.text.match(re)!;
      target = leaf;
      at = sentenceEnd(leaf.text, (m.index ?? 0) + m[0].length - 1);
    }
    const text = add.text.trim();
    setLeaf(section, target.path, `${target.text.slice(0, at).trimEnd()}\n\n${text}${target.text.slice(at) ? `\n\n${target.text.slice(at).trimStart()}` : ""}`);
    added.push({ text, claims: storeClaims(add.claims, chart) });
    newClaims.push(...add.claims);
  }

  if (dropped.length) logger.warn({ section: id, dropped }, "horizon pass: amendment quotes matched nothing and were dropped");

  // Claims are re-validated against the new text and the drawn chart. An
  // existing claim whose sentence was amended now quotes the replacement;
  // one that no longer verifies is dropped rather than kept as a false citation.
  const existing = (section.claims as StoredClaim[] | undefined) ?? [];
  const followed = existing.map((c) => {
    const mark = amended.find((m) => soften(c.quote) === soften(m.before) || soften(m.before).includes(soften(c.quote)));
    return mark ? { quote: mark.now, evidence: c.evidence.map((e) => e.ref) } : { quote: c.quote, evidence: c.evidence.map((e) => e.ref) };
  });
  const candidates: Claim[] = [...followed, ...newClaims];
  const kept = candidates.filter((c) => validateClaims(section, [c], chart).length === 0);
  if (kept.length < candidates.length) {
    logger.warn({ section: id, dropped: candidates.length - kept.length }, "horizon pass: claims that no longer verify were dropped");
  }
  if ("claims" in section) section.claims = storeClaims(kept, chart);

  return { section, amended, added, dropped };
}

export interface AmendResult {
  interpretation: ReportInterpretation;
  counts: Record<string, { amended: number; added: number }>;
  record: HorizonPassRecord["sections"];
  usage: SectionUsage[];
}

/**
 * One schema-enforced amendment call per stored section, applied in code.
 * The section's own text, the full drawn brief and the instruction to return
 * only what the horizon changes; caps of three amendments and one addition;
 * exact quote match or nothing (ADR-35).
 */
export async function amendSections(
  chart: NatalChartData,
  stored: ReportInterpretation,
  brief: ChartBrief,
  options: GenerateOptions = {},
): Promise<AmendResult> {
  if (brief.horizon === "unknown") throw new Error("amendSections needs a brief whose horizon holds");
  const foundationJson = JSON.stringify(stored.foundation, null, 2);
  const ids = SECTION_IDS.filter((id) => id in stored && id !== "houses");
  const specs = ids.map((id) => sectionById(id)!);
  const prompts = await Promise.all(specs.map((spec) => resolveSection(spec.key)));

  const results = await Promise.all(specs.map(async (spec, i) => {
    const id = ids[i];
    const current = stored[id] as unknown as Record<string, unknown>;
    const { claims: _claims, ...text } = current;
    const user = [
      AMENDMENT_INSTRUCTIONS, "",
      `SECTION ${spec.label.toUpperCase()} AS WRITTEN`, JSON.stringify(text, null, 2), "",
      "CHART BRIEF", brief.text, "",
      "FOUNDATION (internal editorial handoff, never quote it)", foundationJson,
    ].join("\n");
    const call = await callSection<Amendment>(spec, modelFor(spec.key), prompts[i].system, user, brief, {
      schema: AmendmentSchema,
      usageKey: `${spec.key}:amend`,
      validate: (out, b) => {
        const problems: string[] = [];
        out.amendments.forEach((a, n) => {
          for (const e of a.evidence) {
            const errs = validateClaims({ text: a.replacement }, [{ quote: a.replacement, evidence: [e] }], b.chart);
            problems.push(...errs.map((x) => `amendment ${n + 1}: ${x}`));
          }
        });
        out.additions.forEach((a, n) => {
          problems.push(...validateClaims({ text: a.text }, a.claims, b.chart).map((x) => `addition ${n + 1}: ${x}`));
        });
        return problems;
      },
    });
    const applied = applyAmendment(id, current, call.data, chart);
    await options.onSection?.({ section: id, patch: { [id]: applied.section } as Partial<ReportInterpretation> });
    return { id, applied, usage: call.usage };
  }));

  const interpretation = { ...stored } as ReportInterpretation;
  const counts: AmendResult["counts"] = {};
  const record: HorizonPassRecord["sections"] = {};
  for (const r of results) {
    (interpretation as unknown as Record<string, unknown>)[r.id] = r.applied.section;
    counts[r.id] = { amended: r.applied.amended.length, added: r.applied.added.length };
    record[r.id] = { amended: r.applied.amended, added: r.applied.added };
  }
  return { interpretation, counts, record, usage: results.map((r) => r.usage) };
}
