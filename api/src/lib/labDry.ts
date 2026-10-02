/**
 * Level 0 of the lab (ADR-76, ADR-86): every prompt rendered exactly as the
 * engine would send it, tokens counted, the strict schema checked, and no
 * model call. Shared by the Lab page's Dry button and the script's
 * `--dry`, so the panel and a session in this sandbox render the same thing.
 * The injection pass proves a hostile name stays inside its data block in
 * every prompt (ADR-202, security scope 8, acceptance 10).
 */
import { encode } from "gpt-tokenizer";
import { previewSectionPrompt } from "./aiInterpretation.js";
import { previewPairSectionPrompt } from "./pairInterpretation.js";
import { calculateNatalChart, type NatalChartData } from "./chartCalculation.js";
import type { PairInput } from "./pairBrief.js";
import type { TokenShape } from "./labRules.js";
import { ALL_SECTIONS } from "../prompts/index.js";
import { PAIR_FOUNDATION, pairSpecsFor } from "../prompts/pair/index.js";
import { DATA_CLOSE, DATA_OPEN, dataBlock, outsideDataBlocks } from "../prompts/data.js";

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

/** A fixture whose name is built to escape its data block: birth data and that name, nothing else (R-3.1). */
export interface InjectionFixture {
  fixture: string;
  name: string;
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  timezone?: string;
  birthTimeWindowMinutes?: number;
}

/** What the hostile names are rendered over, since no report was ever written for an injection chart. */
export interface InjectionBase {
  /** A matrix chart's stored run: its foundation stands in, and its name is the plain one every natal prompt is set against. */
  natal: { subjectName: string; foundation: unknown };
  /** curie-winfrey's runs, one input per lens, with their own names; each lens takes a different two hostile names as A and B. */
  pairs: PairInput[];
}

export interface InjectionRow {
  /** The hostile name's fixture, or a pair's two as A and B. */
  fixture: string;
  /** "natal", or the pair's lens. */
  set: string;
  section: string;
  /** Data blocks in the prompt that carry a hostile name. */
  blocks: number;
  /** Where the hostile name changed the text outside its blocks, or null. */
  leak: string | null;
  error?: string;
}

type Prompt = { system: string; user: string };

/** The two renders the injection pass reads; the test wraps one to plant a raw name. */
export interface InjectionRenderers {
  natal: (sectionKey: string, chart: NatalChartData, name: string, foundationJson?: string) => Promise<Prompt>;
  pair: (sectionKey: string, input: PairInput) => Promise<Prompt>;
}

const LIVE: InjectionRenderers = { natal: previewSectionPrompt, pair: (key, input) => previewPairSectionPrompt(key, input) };

const MARKER_LINES: ReadonlySet<string> = new Set([DATA_OPEN("name"), DATA_OPEN("label"), DATA_CLOSE]);

/** The first line outside the blocks where the two renders part, from a little before it, so a leak reads in context. */
function firstDifference(out: string, kept: string): string {
  const a = out.split("\n");
  const b = kept.split("\n");
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (i === a.length) return "a line the plain name keeps is gone";
  // A block the check could not take out shows its open marker first; the value under it says more.
  const line = MARKER_LINES.has(a[i]) && i + 1 < a.length ? a[i + 1] : a[i];
  const other = b[i] ?? "";
  let p = 0;
  while (p < line.length && line[p] === other[p]) p++;
  return line.slice(Math.max(0, p - 24), p + 76);
}

/**
 * What a hostile render holds outside its blocks that the same prompt with a
 * plain name does not. Two renders are compared rather than the name searched
 * for, so a part of it that was cut, split or reworded is still caught, and a
 * phrase the prompt itself uses is never taken for one.
 */
function leakOf(hostile: Prompt, plain: Prompt): string | null {
  for (const key of ["system", "user"] as const) {
    const out = outsideDataBlocks(hostile[key]);
    const kept = outsideDataBlocks(plain[key]);
    if (out !== kept) return `${key}: ${firstDifference(out, kept)}`;
  }
  return null;
}

async function probe(where: Omit<InjectionRow, "blocks" | "leak">, names: string[], hostile: () => Promise<Prompt>, plain: () => Promise<Prompt>): Promise<InjectionRow> {
  try {
    const h = await hostile();
    const text = `${h.system}\n${h.user}`;
    const blocks = [...new Set(names)].reduce((n, name) => n + text.split(dataBlock("name", name)).length - 1, 0);
    return { ...where, blocks, leak: leakOf(h, await plain()) };
  } catch (err) {
    return { ...where, blocks: 0, leak: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Every natal section's prompt for each hostile name on its own chart,
 * computed now, and every pair prompt with two of them as A and B over
 * curie-winfrey's runs, a different two under each lens so each name is
 * both A and B somewhere. Each prompt is set against the same prompt with a
 * plain name, and a row is flagged when anything outside the blocks differs.
 */
export async function dryInjection(fixtures: InjectionFixture[], base: InjectionBase, render: InjectionRenderers = LIVE): Promise<InjectionRow[]> {
  const rows: InjectionRow[] = [];
  const foundationJson = JSON.stringify(base.natal.foundation, null, 2);
  for (const f of fixtures) {
    let chart: NatalChartData;
    try {
      chart = calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset, f.birthTimeWindowMinutes ?? 0);
    } catch (err) {
      rows.push({ fixture: f.fixture, set: "natal", section: "*", blocks: 0, leak: null, error: err instanceof Error ? err.message : String(err) });
      continue;
    }
    for (const spec of ALL_SECTIONS) {
      const section = spec.key.replace(/^natal:/, "");
      const foundation = section === "foundation" ? undefined : foundationJson;
      rows.push(await probe({ fixture: f.fixture, set: "natal", section }, [f.name],
        () => render.natal(spec.key, chart, f.name, foundation),
        () => render.natal(spec.key, chart, base.natal.subjectName, foundation)));
    }
  }
  if (!fixtures.length) return rows;
  // One moment for both renders, so a child's age can never differ between them across midnight.
  const at = new Date();
  for (const [i, given] of base.pairs.entries()) {
    const [fa, fb] = [fixtures[i % fixtures.length], fixtures[(i + 1) % fixtures.length]];
    const plain: PairInput = { ...given, at: given.at ?? at };
    const hostile: PairInput = { ...plain, a: { ...plain.a, name: fa.name }, b: { ...plain.b, name: fb.name } };
    for (const spec of [PAIR_FOUNDATION, ...pairSpecsFor(plain.lens)]) {
      rows.push(await probe({ fixture: `A ${fa.fixture}, B ${fb.fixture}`, set: plain.lens, section: spec.key.replace(/^pair:/, "") }, [fa.name, fb.name],
        () => render.pair(spec.key, hostile),
        () => render.pair(spec.key, plain)));
    }
  }
  return rows;
}
