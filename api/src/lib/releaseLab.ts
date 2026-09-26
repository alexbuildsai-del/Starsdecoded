/**
 * The release lab on the server (ADR-76, ADR-86): the five matrix charts
 * through the customer's own generator, and one pair when the pair brain
 * changed, every section stored as a `release` row in `lab_runs` with its
 * numbers, so the gate and the QA agent read what the customer would get.
 * Nothing here touches `reports` or a credit. The generator and the store
 * are injected so a rehearsal proves the flow with no spend.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, ne } from "drizzle-orm";
import { db, labRunsTable, type InsertLabRun } from "@workspace/db";
import { calculateNatalChart, type NatalChartData } from "./chartCalculation.js";
import { generateInterpretation, type ReportInterpretation } from "./aiInterpretation.js";
import { generatePairInterpretation } from "./pairInterpretation.js";
import { MATRIX_CHARTS, faultsOf, measureSection, type RunNumbers } from "./labRules.js";
import { MODELS } from "./models.js";
import { costUsd, type ReportUsage } from "./usage.js";
import { SECTION_IDS } from "../prompts/index.js";
import { pairSectionIds } from "../prompts/pair/index.js";

/** A natal report costs about 30 cents and a pair about 40 (ADR-77); the release lab is priced before it runs. */
export const NATAL_ESTIMATE_USD = 0.3;
export const PAIR_ESTIMATE_USD = 0.4;
/** The pair the release lab writes: two matrix charts under the partners lens, so no extra natal report is spent. */
export const RELEASE_PAIR = { name: "curie-hepburn", a: "marie-curie", b: "audrey-hepburn" } as const;

export interface ChartFixture { name: string; birthDate: string; birthTime: string; latitude: number; longitude: number; timezoneOffset: number; timezone?: string; birthTimeWindowMinutes?: number }

export function fixturesDir(): string | null {
  for (const dir of [process.cwd(), join(process.cwd(), ".."), join(process.cwd(), "..", "..")]) {
    if (existsSync(join(dir, "fixtures", "charts"))) return join(dir, "fixtures");
  }
  return null;
}

export function loadChartFixture(name: string): ChartFixture {
  const dir = fixturesDir();
  if (!dir) throw new Error("no fixtures directory beside the process");
  const path = join(dir, "charts", `${name}.json`);
  if (!existsSync(path)) throw new Error(`no chart fixture ${name}`);
  return JSON.parse(readFileSync(path, "utf8")) as ChartFixture;
}

export function chartOf(f: ChartFixture): NatalChartData {
  return calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset, f.birthTimeWindowMinutes ?? 0);
}

export interface ReleaseLabEngine {
  natal: (chart: NatalChartData, name: string) => Promise<ReportInterpretation>;
  pair: (input: Parameters<typeof generatePairInterpretation>[0]) => Promise<Record<string, unknown>>;
}

export const liveReleaseEngine: ReleaseLabEngine = {
  natal: (chart, name) => generateInterpretation(chart, name),
  pair: (input) => generatePairInterpretation(input) as Promise<Record<string, unknown>>,
};

export interface ReleaseLabStore {
  insert(rows: InsertLabRun[]): Promise<void>;
  numbers(label: string): Promise<RunNumbers[]>;
  lastReleaseLabel(before: string): Promise<string | null>;
}

export const dbReleaseStore: ReleaseLabStore = {
  async insert(rows) { if (rows.length) await db.insert(labRunsTable).values(rows); },
  async numbers(label) {
    const rows = await db.select().from(labRunsTable).where(eq(labRunsTable.label, label));
    return rows.map((r) => ({ fixture: r.fixture, label: r.label, section: r.section, words: r.words, costUsd: r.costUsd, faults: (r.faults as string[]) ?? [], status: r.status }));
  },
  async lastReleaseLabel(before) {
    const rows = await db.select({ label: labRunsTable.label }).from(labRunsTable)
      .where(and(eq(labRunsTable.source, "release"), ne(labRunsTable.label, before)));
    const labels = [...new Set(rows.map((r) => r.label))].sort();
    return labels.at(-1) ?? null;
  },
};

/** The rows one natal interpretation becomes under a release label; the foundation row carries the chart and the name. */
export function natalRows(fixture: string, label: string, chart: NatalChartData, name: string, interpretation: ReportInterpretation): InsertLabRun[] {
  const runKey = `${fixture}.${label}`;
  const usage: ReportUsage | undefined = interpretation.meta?.usage;
  const usageOf = (key: string) => usage?.sections.find((u) => u.section === key) ?? null;
  const blind = interpretation.meta?.horizon === "unknown";
  const row = (section: string, output: unknown, extra: Partial<InsertLabRun> = {}): InsertLabRun => {
    const u = usageOf(`natal:${section}`);
    const model = u?.model ?? usage?.model ?? MODELS.sections;
    const measure = section === "foundation" ? null : measureSection(section, output, chart, blind);
    return {
      id: randomUUID(), runKey, fixture, label, source: "release", section, model, serviceTier: "standard", status: "done",
      output: output as object, usage: u as object | null, faults: measure ? faultsOf(measure) : [], words: measure?.words ?? 0,
      costUsd: u ? costUsd(model, { ...u }) : null, seconds: u ? u.ms / 1000 : null, ...extra,
    };
  };
  const rows = [row("foundation", interpretation.foundation, { chart: chart as unknown as object, subjectName: name })];
  for (const section of SECTION_IDS) {
    const output = (interpretation as unknown as Record<string, unknown>)[section];
    if (output !== undefined) rows.push(row(section, output));
  }
  return rows;
}

/** The rows one pair interpretation becomes: one per section, words counted, no faults measured (the pair matrix is not built). */
export function pairRows(fixture: string, label: string, interpretation: Record<string, unknown>): InsertLabRun[] {
  const runKey = `${fixture}.${label}`;
  const meta = interpretation.meta as { usage?: ReportUsage; lens?: string } | undefined;
  const usage = meta?.usage;
  const usageOf = (key: string) => usage?.sections.find((u) => u.section === key) ?? null;
  const words = (v: unknown): number => (typeof v === "string" ? v.split(/\s+/).filter(Boolean).length : Array.isArray(v) ? v.reduce((n: number, x) => n + words(x), 0) : v && typeof v === "object" ? Object.entries(v).filter(([k]) => k !== "claims").reduce((n, [, x]) => n + words(x), 0) : 0);
  const sections = ["foundation", ...pairSectionIds((meta?.lens ?? "partners") as never)];
  return sections.filter((s) => interpretation[s] !== undefined).map((section) => {
    const u = usageOf(`pair:${section}`);
    const model = u?.model ?? usage?.model ?? MODELS.sections;
    return {
      id: randomUUID(), runKey, fixture, label, source: "release", section, model, serviceTier: "standard", status: "done",
      output: interpretation[section] as object, usage: u as object | null, faults: [], words: words(interpretation[section]),
      costUsd: u ? costUsd(model, { ...u }) : null, seconds: u ? u.ms / 1000 : null,
    } satisfies InsertLabRun;
  });
}

export interface ReleaseLabOutcome {
  label: string;
  natalRunKeys: string[];
  pairRunKey: string | null;
  costUsd: number;
  failed: Array<{ fixture: string; error: string }>;
}

/**
 * The five charts one after another, then the pair when asked, each stored
 * as it lands. A chart that fails is named and the lab goes on; the gate
 * reads the failure as a missing candidate run.
 */
export async function runReleaseLab(input: { label: string; withPair: boolean; engine?: ReleaseLabEngine; store?: ReleaseLabStore; charts?: readonly string[]; signal?: AbortSignal }): Promise<ReleaseLabOutcome> {
  const engine = input.engine ?? liveReleaseEngine;
  const store = input.store ?? dbReleaseStore;
  const charts = input.charts ?? MATRIX_CHARTS;
  const out: ReleaseLabOutcome = { label: input.label, natalRunKeys: [], pairRunKey: null, costUsd: 0, failed: [] };
  const written: Record<string, { chart: NatalChartData; fixture: ChartFixture; interpretation: ReportInterpretation }> = {};
  for (const name of charts) {
    if (input.signal?.aborted) break;
    try {
      const fixture = loadChartFixture(name);
      const chart = chartOf(fixture);
      const interpretation = await engine.natal(chart, fixture.name);
      const rows = natalRows(name, input.label, chart, fixture.name, interpretation);
      await store.insert(rows);
      out.natalRunKeys.push(`${name}.${input.label}`);
      out.costUsd += interpretation.meta?.usage?.costUsd ?? 0;
      written[name] = { chart, fixture, interpretation };
    } catch (err) {
      out.failed.push({ fixture: name, error: err instanceof Error ? err.message : String(err) });
      // A key with no credits fails every chart the same way; one named failure says more than five (ADR-77).
      if (/out of credit/i.test(String((err as Error)?.message))) break;
    }
  }
  if (input.withPair && written[RELEASE_PAIR.a] && written[RELEASE_PAIR.b] && !input.signal?.aborted) {
    try {
      const a = written[RELEASE_PAIR.a], b = written[RELEASE_PAIR.b];
      const interpretation = await engine.pair({
        lens: "partners", parent: null, label: null,
        a: { name: a.fixture.name, birthDate: a.fixture.birthDate, chart: a.chart, interpretation: a.interpretation },
        b: { name: b.fixture.name, birthDate: b.fixture.birthDate, chart: b.chart, interpretation: b.interpretation },
      });
      await store.insert(pairRows(RELEASE_PAIR.name, input.label, interpretation));
      out.pairRunKey = `${RELEASE_PAIR.name}.${input.label}`;
      out.costUsd += (interpretation.meta as { usage?: ReportUsage } | undefined)?.usage?.costUsd ?? 0;
    } catch (err) {
      out.failed.push({ fixture: RELEASE_PAIR.name, error: err instanceof Error ? err.message : String(err) });
    }
  } else if (input.withPair) {
    out.failed.push({ fixture: RELEASE_PAIR.name, error: "the pair needs both of its charts' natal runs" });
  }
  return out;
}
