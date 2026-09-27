/**
 * Level 0 of the lab (ADR-76, ADR-86): every prompt rendered exactly as the
 * engine would send it, tokens counted, the strict schema checked, and no
 * model call. Shared by the Lab page's Dry button and the script's
 * `--dry`, so the panel and a session in this sandbox render the same thing.
 */
import { encode } from "gpt-tokenizer";
import { previewSectionPrompt } from "./aiInterpretation.js";
import { previewPairSectionPrompt } from "./pairInterpretation.js";
import type { NatalChartData } from "./chartCalculation.js";
import type { PairInput } from "./pairBrief.js";
import type { TokenShape } from "./labRules.js";
import { ALL_SECTIONS } from "../prompts/index.js";
import { PAIR_FOUNDATION, pairSpecsFor } from "../prompts/pair/index.js";

export interface DryRow {
  fixture: string;
  section: string;
  inputTokens: number;
  baselineInputTokens: number | null;
  schemaOk: boolean;
  error?: string;
}

/** A strict schema is one every object of which closes itself and requires every property. */
export function strictOk(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") return true;
  const s = schema as { type?: string; properties?: Record<string, unknown>; required?: string[]; additionalProperties?: boolean; items?: unknown; anyOf?: unknown[] };
  if (s.type === "object" || s.properties) {
    if (s.additionalProperties !== false) return false;
    const keys = Object.keys(s.properties ?? {});
    if (!keys.every((k) => (s.required ?? []).includes(k))) return false;
    if (!Object.values(s.properties ?? {}).every(strictOk)) return false;
  }
  if (s.items && !strictOk(s.items)) return false;
  if (s.anyOf && !s.anyOf.every(strictOk)) return false;
  return true;
}

export interface DryBase {
  fixture: string;
  chart: NatalChartData;
  subjectName: string;
  foundation: unknown;
  shapes: Record<string, TokenShape>;
}

const tokens = (prompt: { system: string; user: string }): number => encode(prompt.system).length + encode(prompt.user).length;

/** Every natal section's prompt for one base: the foundation alone, the sections against the stored foundation. */
export async function dryNatal(base: DryBase): Promise<DryRow[]> {
  const foundationJson = JSON.stringify(base.foundation, null, 2);
  const out: DryRow[] = [];
  for (const spec of ALL_SECTIONS) {
    const section = spec.key.replace(/^natal:/, "");
    const shape = base.shapes[section];
    const baselineInputTokens = shape ? shape.inputTokens + shape.cachedInputTokens : null;
    try {
      const prompt = await previewSectionPrompt(spec.key, base.chart, base.subjectName, section === "foundation" ? undefined : foundationJson);
      out.push({ fixture: base.fixture, section, inputTokens: tokens(prompt), baselineInputTokens, schemaOk: strictOk(prompt.schema) });
    } catch (err) {
      // A run stored before the horizon status (pre-R05) cannot render; it is named, not hidden (MB-73).
      out.push({ fixture: base.fixture, section, inputTokens: 0, baselineInputTokens, schemaOk: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return out;
}

/** Every pair section's prompt for one pair under its lens, the foundation first and no allocation yet: zero usage. */
export async function dryPair(fixture: string, input: PairInput): Promise<DryRow[]> {
  const out: DryRow[] = [];
  for (const spec of [PAIR_FOUNDATION, ...pairSpecsFor(input.lens)]) {
    const section = spec.key.replace(/^pair:/, "");
    try {
      const prompt = await previewPairSectionPrompt(spec.key, input);
      out.push({ fixture, section, inputTokens: tokens(prompt), baselineInputTokens: null, schemaOk: strictOk(prompt.schema) });
    } catch (err) {
      out.push({ fixture, section, inputTokens: 0, baselineInputTokens: null, schemaOk: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return out;
}

/** The pair brief as rendered for one section: what acceptance 2 reads for the age and the now-and-later rule. */
export async function dryPairPrompt(input: PairInput, sectionKey: string): Promise<{ system: string; user: string }> {
  const prompt = await previewPairSectionPrompt(sectionKey, input);
  return { system: prompt.system, user: prompt.user };
}
