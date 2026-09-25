/**
 * Stored runs into the panel without a token (MB-72, ADR-86): the
 * report-lab/<label> branches are public, so the server reads their run
 * files over plain HTTPS and lands them in `lab_runs` exactly as the script
 * used to publish them. The chart and the subject's name sit only on the
 * foundation row; a run keeps the day it was generated so last month's runs
 * never count against this month's budget (ADR-77).
 */
import { randomUUID } from "node:crypto";
import { db, labRunsTable, type InsertLabRun } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { NatalChartData } from "./chartCalculation.js";
import { faultsOf, measureSection, MATRIX_CHARTS } from "./labRules.js";
import { CATALOGUE } from "./models.js";
import { costUsd, type ReportUsage } from "./usage.js";
import { SECTION_IDS } from "../prompts/index.js";

export const RUN_BRANCH_RAW = "https://raw.githubusercontent.com/alexbuildsai-del/Starsdecoded";

/** The charts an import looks for under a label: the matrix five plus the blind one. */
export const IMPORT_CHARTS: readonly string[] = [...MATRIX_CHARTS, "marie-curie-unknown"];

export interface RunFile {
  fixture: { name: string };
  chart: NatalChartData;
  interpretation: Record<string, unknown>;
}

export function runUrl(label: string, fixture: string): string {
  return `${RUN_BRANCH_RAW}/report-lab/${encodeURIComponent(label)}/fixtures/reports/${encodeURIComponent(fixture)}.${encodeURIComponent(label)}.json`;
}

/** The rows a run file becomes: the foundation with the chart, then every section with its numbers. Pure. */
export function rowsOfFile(fixture: string, label: string, file: RunFile): InsertLabRun[] {
  const meta = file.interpretation.meta as { usage?: ReportUsage; generatedAt?: string; horizon?: string } | undefined;
  const usage = meta?.usage;
  const usageOf = (key: string) => usage?.sections.find((u) => u.section === key) ?? null;
  const createdAt = meta?.generatedAt ? new Date(meta.generatedAt) : new Date();
  const runKey = `${fixture}.${label}`;
  const blind = meta?.horizon === "unknown";
  const foundationUsage = usageOf("natal:foundation");
  const model = (u: { model?: string } | null) => u?.model ?? usage?.model ?? "-";
  const rows: InsertLabRun[] = [{
    id: randomUUID(), runKey, fixture, label, source: "lab", section: "foundation", model: model(foundationUsage),
    reasoningEffort: (CATALOGUE as Record<string, { reasoningEffort: string }>)[model(foundationUsage)]?.reasoningEffort ?? null,
    serviceTier: "standard", status: "done", output: file.interpretation.foundation as object, usage: foundationUsage as object | null,
    faults: [], words: 0, costUsd: foundationUsage ? costUsd(model(foundationUsage), { ...foundationUsage }) : null, seconds: foundationUsage ? foundationUsage.ms / 1000 : null,
    chart: file.chart as unknown as object, subjectName: file.fixture.name, createdAt,
  }];
  for (const section of SECTION_IDS) {
    const output = file.interpretation[section];
    if (output === undefined) continue;
    const u = usageOf(`natal:${section}`);
    const measure = measureSection(section, output, file.chart, blind);
    rows.push({
      id: randomUUID(), runKey, fixture, label, source: "lab", section, model: model(u),
      reasoningEffort: (CATALOGUE as Record<string, { reasoningEffort: string }>)[model(u)]?.reasoningEffort ?? null,
      serviceTier: "standard", status: "done", output: output as object, usage: u as object | null,
      faults: faultsOf(measure), words: measure.words, costUsd: u ? costUsd(model(u), { ...u }) : null, seconds: u ? u.ms / 1000 : null, createdAt,
    });
  }
  return rows;
}

export interface ImportStore {
  replace(runKey: string, rows: InsertLabRun[]): Promise<void>;
}

export const dbImportStore: ImportStore = {
  async replace(runKey, rows) {
    await db.transaction(async (tx) => {
      await tx.delete(labRunsTable).where(eq(labRunsTable.runKey, runKey));
      await tx.insert(labRunsTable).values(rows);
    });
  },
};

export type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface ImportResult {
  label: string;
  imported: string[];
  missing: string[];
  failed: Array<{ fixture: string; error: string }>;
}

/** Every chart's run file under a label, from the public branch; a chart the branch lacks is named, not an error. */
export async function importLabel(label: string, store: ImportStore = dbImportStore, fetcher: Fetcher = (u) => fetch(u), charts: readonly string[] = IMPORT_CHARTS): Promise<ImportResult> {
  const result: ImportResult = { label, imported: [], missing: [], failed: [] };
  for (const fixture of charts) {
    try {
      const res = await fetcher(runUrl(label, fixture));
      if (res.status === 404) { result.missing.push(fixture); continue; }
      if (!res.ok) { result.failed.push({ fixture, error: `HTTP ${res.status}` }); continue; }
      const file = (await res.json()) as RunFile;
      if (!file?.chart || !file?.interpretation?.foundation) { result.failed.push({ fixture, error: "not a run file" }); continue; }
      const rows = rowsOfFile(fixture, label, file);
      await store.replace(`${fixture}.${label}`, rows);
      result.imported.push(fixture);
    } catch (err) {
      result.failed.push({ fixture, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return result;
}
