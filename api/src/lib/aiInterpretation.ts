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
import { randomUUID } from "node:crypto";
import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod/v4";
import type { GenerationFailureKind } from "@workspace/db";
import { resolveSection } from "./promptLoader.js";
import { ASPECT_ORBS, EPHEMERIS, hasHorizon, type HorizonStatus, type NatalChartData } from "./chartCalculation.js";
import { sectOf } from "./traditional.js";
import { logger } from "./logger.js";
import { addAttempt, buildReportUsage, emptySection, type ReportUsage, type SectionUsage } from "./usage.js";
import { MODELS, effortFor, flexOffered, isModelId, modelFor, type ModelId, type ServiceTier } from "./models.js";
import {
  ALL_SECTIONS, CLAIMS_CONTRACT, ClaimSchema, EvidenceRefSchema, FOUNDATION, REPORT_SECTIONS, SECTION_IDS,
  buildBrief, hasClaims, instructionsFor, reconcileClaims, schemaFor, sectionById, sectionsFor, storeClaims, toStrictJsonSchema, validateClaims,
  type ChartBrief, type Claim, type EvidenceRef, type ReportSectionId, type SectionSpec, type StoredClaim,
} from "../prompts/index.js";
import { block, blocking, clean, fixed, needsRepair, repair, warned, type Check, type Validated } from "../prompts/checks.js";
import { recordChecks } from "./failureLog.js";
import { ReportFailure, failureCodeOf } from "./failureReasons.js";
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
/** One blind try, then two informed by every rejection so far. A section that loses all three gets one round alone (ADR-84). */
export const ATTEMPTS = 3;

/** The claims field of a section schema, when it has one: the shape a claims-only repair returns. */
function claimsShapeOf(schema: z.ZodType): z.ZodType | null {
  const shape = (schema as unknown as { shape?: Record<string, z.ZodType> }).shape;
  return shape?.claims ?? null;
}

const CLAIMS_ONLY = `CLAIMS ONLY. The prose below has already been written and accepted; do not rewrite it and do not return it. Return only the claims: each quote is copied character for character from the PROSE AS WRITTEN, with 1 to 3 evidence references from the brief exactly as before. A quote that is not in the prose word for word is rejected.`;
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
  /** Every blocking message across every attempt, numbered as the retry saw them. */
  public readonly errors: string[];
  /** The last reply's JSON, so a round alone can start from what was nearly right. */
  public readonly lastReply?: string;
  constructor(public readonly key: string, message: string, detail: { errors?: string[]; lastReply?: string } = {}) {
    super(`${key}: ${message}`);
    this.name = "SectionError";
    this.errors = detail.errors ?? [];
    this.lastReply = detail.lastReply;
  }
}

/**
 * The key has no credits (ADR-77). Thrown instead of a retry: a second call
 * cannot succeed, and a campaign that meets this stops at the first one.
 * The SDK's own six retries on a 429 still run first; they cost time, never
 * money.
 */
export class OutOfCreditError extends Error {
  constructor(public readonly key: string, message: string) {
    super(`${key}: out of credit: ${message}`);
    this.name = "OutOfCreditError";
  }
}

function isOutOfCredit(err: unknown): boolean {
  const e = err as { status?: number; code?: string | null; message?: string } | null;
  if (!e || e.status !== 429) return false;
  return e.code === "insufficient_quota" || /insufficient_quota|no credits/i.test(e.message ?? "");
}

/** Wraps every model call, so an out-of-credit 429 is named once. */
async function guarded<T>(key: string, call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (err) {
    if (isOutOfCredit(err)) throw new OutOfCreditError(key, (err as Error).message);
    throw err;
  }
}

export interface SectionResult<T> {
  data: T;
  usage: SectionUsage;
  /** Every check the accepted attempt fired: what was fixed, buffered or logged on the way to storage. */
  checks: Check[];
}

/** What the engine tells the log after every attempt. */
export interface ChecksEvent {
  attempt: number;
  /** True on the attempt that was accepted or that ended the call. */
  final: boolean;
}

/** What a failed call hands the round alone (ADR-84): every error so far and the reply they were found in. */
export interface Carry {
  errors: string[];
  lastReply: string;
}

export interface StructuredCall<T> {
  /** Named in the usage row and in the JSON schema registration. */
  usageKey: string;
  model: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
  /** Runs on the raw reply before the parse: cuts, drops, spellings; never a model call. */
  normalise?: (raw: unknown) => { raw: unknown; checks: Check[] };
  /** Chart-grounded checks; a `block` rejects the reply, a `repair` calls the claims-only repair, the rest are logged. */
  validate?: (output: T) => Validated<T>;
  /** Flex only when asked and the catalogue offers it; the customer path never asks (ADR-77). */
  serviceTier?: ServiceTier;
  /** Aborts the model call: a report that has already failed stops paying for its other sections. */
  signal?: AbortSignal;
  onChecks?: (checks: Check[], event: ChecksEvent) => void | Promise<void>;
  /** The round alone: the first attempt already knows every earlier error and the reply they came from. */
  carry?: Carry;
}

/** The rule a count problem at this path belongs to, so the log names the annex row. */
function countRule(path: PropertyKey[]): string {
  const last = String(path[path.length - 1] ?? "");
  if (last === "claims") return "chk-02";
  if (last === "evidence") return "chk-01";
  if (last === "supportingEvidence") return "chk-13";
  if (last === "links") return "chk-31";
  return "chk-16";
}

function getAt(root: unknown, path: PropertyKey[]): unknown {
  let node: unknown = root;
  for (const key of path) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<PropertyKey, unknown>)[key];
  }
  return node;
}

function setAt(root: unknown, path: PropertyKey[], value: unknown): void {
  const parent = getAt(root, path.slice(0, -1));
  if (parent && typeof parent === "object") (parent as Record<PropertyKey, unknown>)[path[path.length - 1]] = value;
}

interface CountIssue { code: string; origin?: string; path: PropertyKey[]; maximum?: number; minimum?: number }

/**
 * Counts are cut in code before the parse (annex rows 1, 2, 13, 16, 31):
 * an array over its maximum loses its tail, and an array under its minimum
 * parses anyway and is logged, since the count is the only thing wrong with
 * it. A claim with no reference is dropped. Anything else fails the parse.
 */
function parseLenient<T>(schema: z.ZodType<T>, raw: unknown): { data: T; checks: Check[] } | { issues: string } {
  const checks: Check[] = [];
  let value = raw;
  for (let round = 0; round < 4; round++) {
    const parsed = schema.safeParse(value);
    if (parsed.success) return { data: parsed.data, checks };
    const issues = parsed.error.issues as unknown as CountIssue[];
    const counts = issues.filter((i) => (i.code === "too_big" || i.code === "too_small") && i.origin === "array" && Array.isArray(getAt(value, i.path)));
    if (counts.length !== issues.length) {
      return { issues: issues.map((i) => `${i.path.join(".")}: ${(i as unknown as { message: string }).message}`).join("; ") };
    }
    value = JSON.parse(JSON.stringify(value));
    let cut = false;
    const under: CountIssue[] = [];
    for (const i of counts) {
      const list = getAt(value, i.path) as unknown[];
      const where = i.path.join(".") || "root";
      if (i.code === "too_big" && typeof i.maximum === "number") {
        checks.push(fixed(countRule(i.path), `${where}: ${list.length} items; cut to ${i.maximum}`));
        setAt(value, i.path, list.slice(0, i.maximum));
        cut = true;
      } else if (i.code === "too_small" && String(i.path[i.path.length - 1]) === "evidence" && list.length === 0) {
        const claims = getAt(value, i.path.slice(0, -2)) as unknown[];
        const index = Number(i.path[i.path.length - 2]);
        checks.push(fixed("chk-01", `${where}: no reference; claim dropped`));
        setAt(value, i.path.slice(0, -2), claims.filter((_, n) => n !== index));
        cut = true;
      } else {
        under.push(i);
      }
    }
    if (cut) continue;
    // Only under-minimum arrays remain: the shape is otherwise the schema's, so the value is taken as parsed and the count is logged.
    for (const i of under) {
      const where = i.path.join(".") || "root";
      const last = String(i.path[i.path.length - 1]);
      const list = getAt(value, i.path) as unknown[];
      if (last === "claims") checks.push(repair("chk-09", `${where}: ${list.length} claims; ${i.minimum} needed`));
      else checks.push(warned(countRule(i.path), `${where}: ${list.length} items; ${i.minimum} wanted`));
    }
    return { data: value as T, checks };
  }
  return { issues: "count problems did not settle" };
}

/** The retry's tail: every error so far and the reply they were found in, then the one instruction (ADR-84). */
export function retryTail(errors: string[], lastReply: string): string {
  return [
    "EVERY ERROR SO FAR:",
    ...errors.map((e, i) => `${i + 1}. ${e}`),
    "",
    "YOUR LAST REPLY:",
    lastReply,
    "",
    "Fix these and keep the rest. Every claim quote must be copied exactly from the prose in this reply.",
  ].join("\n");
}

/**
 * One schema-enforced call with the retry policy every report shares: a
 * blind try, then two informed by every rejection so far and the last
 * reply, then a loud failure carrying both (ADR-84). A `block` rejects; a
 * `repair` buys one claims-only call; everything else is logged and the
 * reply stands (ADR-81, ADR-82). The natal sections, the amendment pass
 * and the pair sections all go through here, so a cap or a refusal is
 * handled once.
 */
export async function callStructured<T>(call: StructuredCall<T>): Promise<SectionResult<T>> {
  const jsonSchema = toStrictJsonSchema(call.schema);
  const name = call.usageKey.replace(/[^a-zA-Z0-9_]/g, "_");
  if (!isModelId(call.model)) throw new SectionError(call.usageKey, `${call.model} is not in the model catalogue`);
  if (call.serviceTier === "flex" && !flexOffered(call.model)) {
    throw new SectionError(call.usageKey, `${call.model} does not offer the Flex tier (MB-70)`);
  }
  // The effort rides on every call (ADR-74); the tier only on a lab replay.
  const tier = call.serviceTier === "flex" ? { service_tier: "flex" as const } : {};
  const pinned = { reasoning_effort: effortFor(call.model), ...tier };
  const requestOptions = call.signal ? { signal: call.signal } : {};
  const errors: string[] = [...(call.carry?.errors ?? [])];
  let lastReply = call.carry?.lastReply ?? "";
  // Accumulates across attempts: a section that retried twice cost three calls,
  // and hiding that would understate exactly what we are here to measure.
  let usage: SectionUsage = { ...emptySection(call.usageKey, call.model), ...(call.serviceTier === "flex" ? { serviceTier: "flex" as const } : {}) };
  let repaired = false;

  const record = async (checks: Check[], attempt: number, final: boolean) => { await call.onChecks?.(checks, { attempt, final }); };
  const reject = async (checks: Check[], attempt: number) => {
    errors.push(...checks.filter((c) => c.cls === "block").map((c) => c.message));
    await record(checks, attempt, attempt === ATTEMPTS);
  };

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    // A retry that repeats the identical request mostly repeats the mistake.
    // The problems go at the end of the user turn, so the cached system
    // prefix is untouched and the model knows exactly what to fix.
    const content = errors.length === 0 ? call.user : `${call.user}\n\n${retryTail(errors, lastReply)}`;
    const startedAt = Date.now();
    const response = await guarded(call.usageKey, openai.chat.completions.create({
      model: call.model,
      max_completion_tokens: call.maxTokens,
      ...pinned,
      messages: [
        { role: "system", content: call.system },
        { role: "user", content },
      ],
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema: jsonSchema } },
    }, requestOptions));
    usage = addAttempt(usage, response.usage, Date.now() - startedAt);

    const choice = response.choices[0];
    const message = choice?.message;
    if (message?.refusal) {
      const refused = block("chk-00-refused", `model refused: ${message.refusal}`);
      await reject([refused], attempt);
      throw new SectionError(call.usageKey, refused.message, { errors, lastReply });
    }
    // A reply cut at the cap is invalid JSON by construction; name the cause
    // instead of the parse error so the cap, not the model, gets fixed.
    if (choice?.finish_reason === "length") {
      const used = response.usage?.completion_tokens;
      const reasoning = response.usage?.completion_tokens_details?.reasoning_tokens;
      await reject([block("chk-00-truncated", `output truncated at max_completion_tokens ${call.maxTokens}`
        + (used !== undefined ? ` (${used} completion tokens` + (reasoning ? `, ${reasoning} reasoning` : "") + ")" : ""))], attempt);
      continue;
    }
    const reply = message?.content ?? "";
    lastReply = reply;

    let raw: unknown;
    try {
      raw = JSON.parse(reply);
    } catch (err) {
      await reject([block("chk-00-json", `invalid JSON (${(err as Error).message})`)], attempt);
      continue;
    }
    const checks: Check[] = [];
    if (call.normalise) {
      const normalised = call.normalise(raw);
      raw = normalised.raw;
      checks.push(...normalised.checks);
    }
    const parsed = parseLenient(call.schema, raw);
    if ("issues" in parsed) {
      await reject([...checks, block("chk-00-schema", parsed.issues)], attempt);
      continue;
    }
    checks.push(...parsed.checks);
    // Chart-grounded checks: claims must cite real placements, foundation
    // must echo the computed sect. A false fact is fixed or dropped in code;
    // what cannot be fixed is a block, and it never reaches storage.
    const validated = call.validate ? call.validate(parsed.data) : clean(parsed.data);
    let data = validated.output;
    checks.push(...validated.checks);
    const repairWanted = needsRepair(checks) && !checks.some((c) => c.rule === "chk-09" && c.cls === "block");

    // Fewer than three valid claims after reconciliation is the one problem
    // that buys a model call without a prose rewrite (ADR-82): one cheap
    // claims-only call against the prose already written; a second failure
    // is a block and the prose retry runs.
    if (blocking(checks).length === 0 && repairWanted) {
      const claimsShape = claimsShapeOf(call.schema);
      if (claimsShape && !repaired) {
        repaired = true;
        const { claims: _rejected, ...prose } = data as Record<string, unknown>;
        const repairSchema = z.object({ claims: claimsShape });
        const why = checks.filter((c) => c.cls === "repair" || c.cls === "fix").map((c) => c.message).join("; ");
        const repairStartedAt = Date.now();
        const repairResponse = await guarded(call.usageKey, openai.chat.completions.create({
          model: call.model,
          max_completion_tokens: call.maxTokens,
          ...pinned,
          messages: [
            { role: "system", content: call.system },
            { role: "user", content: `${call.user}\n\n${CLAIMS_ONLY}\n\nPROSE AS WRITTEN\n${JSON.stringify(prose, null, 2)}\n\nPREVIOUS CLAIMS REJECTED: ${why}` },
          ],
          response_format: { type: "json_schema", json_schema: { name: `${name}_claims`, strict: true, schema: toStrictJsonSchema(repairSchema) } },
        }, requestOptions));
        usage = addAttempt(usage, repairResponse.usage, Date.now() - repairStartedAt);
        const repairedRaw = (() => { try { return JSON.parse(repairResponse.choices[0]?.message?.content ?? ""); } catch { return null; } })();
        const parsedRepair = parseLenient(repairSchema, repairedRaw);
        if (!("issues" in parsedRepair)) {
          const merged = { ...prose, claims: parsedRepair.data.claims } as T;
          const again = call.validate ? call.validate(merged) : clean(merged);
          const stillBlocked = blocking(again.checks).length > 0 || needsRepair(again.checks);
          if (!stillBlocked) {
            const all = [...checks, ...parsedRepair.checks, ...again.checks];
            await record(all, attempt, true);
            return { data: again.output, usage, checks: all };
          }
          checks.push(block("chk-09", `claims-only repair rejected too: ${[...blocking(again.checks), ...again.checks.filter((c) => c.cls === "repair")].map((c) => c.message).join("; ")}`));
        } else {
          checks.push(block("chk-09", `claims-only repair did not parse: ${parsedRepair.issues}`));
        }
      } else {
        checks.push(block("chk-09", checks.filter((c) => c.cls === "repair").map((c) => c.message).join("; ")));
      }
    }

    const blocks = blocking(checks);
    if (blocks.length === 0) {
      await record(checks, attempt, true);
      return { data, usage, checks };
    }
    data = undefined as unknown as T;
    await reject(checks, attempt);
  }

  throw new SectionError(call.usageKey, `failed validation after ${ATTEMPTS} attempts: ${errors[errors.length - 1] ?? "no reply"}`, { errors, lastReply });
}

interface CallOptions<T> {
  /** The schema in force for this call. Defaults to the spec's; a blind or partial call narrows it. */
  schema?: z.ZodType<T>;
  validate?: (output: T, brief: ChartBrief) => Validated<T>;
  /** Named in the usage row when the call is not the spec's whole section. */
  usageKey?: string;
  serviceTier?: ServiceTier;
  signal?: AbortSignal;
  carry?: Carry;
  /** Where the checks are logged: the customer's report or the lab (ADR-85). */
  log?: { kind: GenerationFailureKind; reportId?: string | null };
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
  const validate = options.validate ?? (spec.validate as ((o: T, b: ChartBrief) => Validated<T>) | undefined);
  const usageKey = options.usageKey ?? spec.key;
  const writeId = randomUUID();
  const log = options.log ?? { kind: "natal" as const };
  return callStructured<T>({
    usageKey,
    model, system, user, schema,
    maxTokens: spec.maxTokens,
    normalise: spec.normalise ? (raw) => spec.normalise!(raw, brief) : undefined,
    validate: validate ? (out) => validate(out, brief) : undefined,
    serviceTier: options.serviceTier,
    signal: options.signal,
    carry: options.carry,
    onChecks: (checks, event) => recordChecks({ kind: log.kind, section: usageKey, model, writeId, reportId: log.reportId, attempt: event.attempt, final: event.final, checks }),
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
  /** The report the checks are logged against (ADR-85). */
  reportId?: string | null;
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
    { schema: schemaFor(FOUNDATION, blind) as z.ZodType<FoundationData>, log: { kind: "natal", reportId: options.reportId } },
  ).catch((err) => { throw new ReportFailure(failureCodeOf(err), err instanceof Error ? err.message : String(err), err); });
  const foundation = foundationCall.data;
  const foundationJson = JSON.stringify(foundation, null, 2);

  // Stage 2: the sections depend only on the foundation, so they run in
  // parallel. Prompts resolve in parallel too, honouring DB overrides. A
  // blind report skips the sections that are nothing but the horizon. A
  // section that loses its three attempts gets one round alone while the
  // others are kept; a second loss aborts the rest and fails the report
  // with its code (ADR-84).
  const specs = sectionsFor(brief.horizon);
  const prompts = await Promise.all(specs.map((spec) => resolveSection(spec.key)));
  const controller = new AbortController();
  const log = { kind: "natal" as const, reportId: options.reportId };
  const settled = await Promise.allSettled(
    specs.map(async (spec, i) => {
      const user = assembleUser(prompts[i].user, brief, spec, foundationJson);
      const run = (carry?: Carry) => callSection<unknown>(
        spec, modelFor(spec.key), prompts[i].system, user, brief,
        { schema: schemaFor(spec, blind), signal: controller.signal, carry, log },
      );
      let call: SectionResult<unknown>;
      try {
        call = await run();
      } catch (err) {
        if (!(err instanceof SectionError) || controller.signal.aborted) { controller.abort(); throw err; }
        logger.warn({ section: spec.key, errors: err.errors.length }, "section lost its attempts; one round alone");
        try {
          call = await run({ errors: err.errors, lastReply: err.lastReply ?? "" });
        } catch (again) {
          controller.abort();
          throw again;
        }
      }
      const id = spec.key.split(":")[1] as ReportSectionId;
      const stored = withStoredClaims(call.data, chart);
      await options.onSection?.({ section: id, patch: { [id]: stored } as Partial<ReportInterpretation> });
      return { id, usage: call.usage, stored };
    }),
  );
  const failed = settled.find((r): r is PromiseRejectedResult => r.status === "rejected" && failureCodeOf(r.reason) !== "provider_unreachable")
    ?? settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed) {
    const err = failed.reason;
    throw new ReportFailure(failureCodeOf(err), err instanceof Error ? err.message : String(err), err);
  }
  const calls = settled.map((r) => (r as PromiseFulfilledResult<{ id: ReportSectionId; usage: SectionUsage; stored: unknown }>).value);

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

/**
 * The lab's hook (ADR-52): one section on any catalogued model at a chosen
 * tier, through the customer's `callSection`, so the prompt, schema,
 * validator, claims-only retry and caps are exactly the customer's.
 * `natal:foundation` with no foundation writes a foundation; every other
 * section needs one. The claims come back in their stored, labelled form.
 */
export async function writeSection(
  sectionKey: string,
  chart: NatalChartData,
  name: string,
  foundationJson: string | undefined,
  options: { model: ModelId; serviceTier?: ServiceTier; signal?: AbortSignal },
): Promise<SectionResult<unknown>> {
  const spec = ALL_SECTIONS.find((s) => s.key === sectionKey);
  if (!spec) throw new Error(`Unknown section ${sectionKey}`);
  const isFoundation = spec.key === FOUNDATION.key;
  if (!isFoundation && !foundationJson) throw new Error(`${sectionKey} needs a foundation to write against`);
  const prompt = await resolveSection(spec.key);
  const brief = buildBrief(chart, name);
  const blind = brief.horizon === "unknown";
  const user = assembleUser(prompt.user, brief, spec, isFoundation ? undefined : foundationJson);
  const call = await callSection<unknown>(spec, options.model, prompt.system, user, brief, {
    schema: schemaFor(spec, blind),
    serviceTier: options.serviceTier,
    signal: options.signal,
    log: { kind: "lab" },
  });
  return { data: isFoundation ? call.data : withStoredClaims(call.data, chart), usage: call.usage, checks: call.checks };
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
      // The rising part's claims append to the triad's, so one is enough (annex row 10).
      validate: (out, b) => {
        const { claims, checks } = reconcileClaims(out, out.claims, b.chart, 1);
        return { output: { ...out, claims }, checks };
      },
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
  /** Every sentence the pass changed or wrote: the amendments' sentences plus the additions'. The ledger's count. */
  sentencesChanged: number;
  /** Claims that no longer verified against the drawn chart, dropped and logged with the quote each took with it. */
  droppedClaims: string[];
}

/** The sentences of a passage, so a replacement of two sentences counts as two and each carries a claim. */
export function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?])\s+(?=[A-Z"“'‘])/).map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * A blind claim cites a placement with no house; against the drawn chart the
 * same placement now has one, so the claim is completed rather than dropped
 * (MB-61: R05 lost every blind placement claim this way).
 */
function drawnRef(ref: EvidenceRef, chart: NatalChartData): EvidenceRef {
  if (ref.kind === "placement" && ref.house === null && hasHorizon(chart)) {
    const house = chart.planets[ref.body]?.house;
    if (house !== undefined) return { ...ref, house };
  }
  // The Moon's orb was read across the band; at the hour it is exact, so the reference takes the drawn orb.
  if (ref.kind === "aspect") {
    const hit = chart.aspects.find((a) => a.type === ref.type
      && ((a.planet1 === ref.body1 && a.planet2 === ref.body2) || (a.planet1 === ref.body2 && a.planet2 === ref.body1)));
    if (hit && Math.abs(hit.orb - ref.orb) > 0.2) return { ...ref, orb: hit.orb };
  }
  return ref;
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
  let sentencesChanged = 0;

  for (const a of reply.amendments.slice(0, 3)) {
    const re = tolerant(a.quote);
    const leaf = leaves(section).find((l) => re.test(l.text));
    if (!leaf) { dropped.push(a.quote); continue; }
    const match = leaf.text.match(re)!;
    const before = match[0];
    setLeaf(section, leaf.path, leaf.text.replace(before, a.replacement));
    amended.push({ before, now: a.replacement, evidence: storeClaims([{ quote: a.replacement, evidence: a.evidence }], chart)[0].evidence });
    // Every sentence the amendment wrote carries the claim that changed it.
    const sentences = sentencesOf(a.replacement);
    sentencesChanged += sentences.length;
    for (const sentence of sentences) newClaims.push({ quote: sentence, evidence: a.evidence });
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
    sentencesChanged += sentencesOf(text).length;
    newClaims.push(...add.claims);
  }

  if (dropped.length) logger.warn({ section: id, dropped }, "horizon pass: amendment quotes matched nothing and were dropped");

  // Claims are re-validated against the new text and the drawn chart. An
  // existing claim whose sentence was amended now quotes the replacement; a
  // blind placement claim gains its house; one that still does not verify is
  // dropped rather than kept as a false citation, and logged with its quote.
  const existing = (section.claims as StoredClaim[] | undefined) ?? [];
  const followed: Claim[] = existing.map((c) => {
    const mark = amended.find((m) => soften(c.quote) === soften(m.before) || soften(m.before).includes(soften(c.quote)));
    const evidence = c.evidence.map((e) => drawnRef(e.ref, chart));
    return mark ? { quote: mark.now, evidence } : { quote: c.quote, evidence };
  });
  // One claim per quote: a followed claim and an amendment on the same sentence
  // merge their evidence, the horizon fact that changed the sentence first.
  const merged = new Map<string, Claim>();
  for (const c of [...newClaims, ...followed]) {
    const key = soften(c.quote);
    const prior = merged.get(key);
    if (!prior) { merged.set(key, { quote: c.quote, evidence: [...c.evidence] }); continue; }
    for (const e of c.evidence) if (!prior.evidence.some((x) => JSON.stringify(x) === JSON.stringify(e)) && prior.evidence.length < 3) prior.evidence.push(e);
  }
  const kept: Claim[] = [];
  const droppedClaims: string[] = [];
  for (const c of merged.values()) {
    // A reference the drawn chart no longer holds, such as a Moon aspect that
    // held only across part of the band, leaves the claim; the claim stays
    // if any of its references still verifies.
    const evidence = c.evidence.filter((e) => validateClaims(section, [{ quote: c.quote, evidence: [e] }], chart).length === 0);
    if (!evidence.length) { droppedClaims.push(`"${c.quote.slice(0, 60)}": ${validateClaims(section, [c], chart).join("; ")}`); continue; }
    kept.push({ quote: c.quote, evidence });
  }
  if (droppedClaims.length) logger.warn({ section: id, droppedClaims }, "horizon pass: claims that no longer verify were dropped, each with the quote it took with it");
  if ("claims" in section) section.claims = storeClaims(kept, chart);

  return { section, amended, added, dropped, sentencesChanged, droppedClaims };
}

export interface AmendResult {
  interpretation: ReportInterpretation;
  /** Per section: the sentences the pass changed or wrote, and the paragraphs it added. */
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
      // An amendment whose evidence does not verify is dropped, never retried (annex row 17).
      validate: (out, b) => {
        const checks: Check[] = [];
        const amendments = out.amendments.filter((a, n) => {
          const evidence = a.evidence.filter((e) => validateClaims({ text: a.replacement }, [{ quote: a.replacement, evidence: [e] }], b.chart).length === 0);
          if (evidence.length === a.evidence.length) return true;
          if (!evidence.length) { checks.push(fixed("chk-17", `amendment ${n + 1}: no reference verified; dropped`)); return false; }
          checks.push(fixed("chk-17", `amendment ${n + 1}: ${a.evidence.length - evidence.length} reference(s) dropped`));
          a.evidence = evidence;
          return true;
        });
        const additions = out.additions.filter((a, n) => {
          const { claims, checks: more } = reconcileClaims({ text: a.text }, a.claims, b.chart, 1);
          checks.push(...more.filter((c) => c.cls !== "repair").map((c) => ({ ...c, rule: "chk-17", message: `addition ${n + 1}: ${c.message}` })));
          if (!claims.length) { checks.push(fixed("chk-17", `addition ${n + 1}: no claim verified; dropped`)); return false; }
          a.claims = claims;
          return true;
        });
        return { output: { amendments, additions }, checks };
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
    counts[r.id] = { amended: r.applied.sentencesChanged, added: r.applied.added.length };
    record[r.id] = { amended: r.applied.amended, added: r.applied.added };
  }
  return { interpretation, counts, record, usage: results.map((r) => r.usage) };
}
