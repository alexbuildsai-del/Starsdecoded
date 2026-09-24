/**
 * Server-side replay (ADR-52): a stored run's chart and foundation held
 * fixed, one section rewritten on a chosen model at a chosen tier through
 * the customer's `writeSection`, one `lab_runs` row per section. Runs as a
 * job the page polls. No `reports` row, no credit, no customer path touched.
 *
 * Storage sits behind `ReplayStore` so the budget refusal and the stop at
 * the first out-of-credit failure can be proven against memory (MB-49);
 * `dbStore` is the one the routes use. A replay on an admin's report reads
 * the report's chart and foundation at run time and never copies them into
 * `lab_runs` (R-3.5).
 */
import { randomUUID } from "node:crypto";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, labRunsTable, profilesTable, reportsTable, type InsertLabRun, type LabRun } from "@workspace/db";
import { OutOfCreditError, writeSection, type SectionResult } from "./aiInterpretation.js";
import type { NatalChartData } from "./chartCalculation.js";
import { FALLBACK_SHAPE, faultsOf, measureSection, priceSection, type TokenShape } from "./labRules.js";
import { CATALOGUE, MODELS, effortFor, priceOf, tierFor, type ModelId, type ServiceTier } from "./models.js";
export { FALLBACK_SHAPE, priceSection, type TokenShape };
import { costUsd, type SectionUsage } from "./usage.js";
import { ALL_SECTIONS } from "../prompts/index.js";

/** Default lab budget a month (ADR-77). */
export const DEFAULT_BUDGET_USD = 15;

export function budgetUsd(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.LAB_BUDGET_USD;
  if (raw === undefined || raw.trim() === "") return DEFAULT_BUDGET_USD;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_BUDGET_USD;
}

export function monthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function monthKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export class BudgetError extends Error {
  constructor(public readonly spentUsd: number, public readonly budgetUsd: number, public readonly estimateUsd: number) {
    super(`lab budget: $${spentUsd.toFixed(4)} spent this month plus about $${estimateUsd.toFixed(4)} would pass $${budgetUsd.toFixed(2)} (LAB_BUDGET_USD)`);
    this.name = "BudgetError";
  }
}

/** Refuses when the month's spend plus what this would cost passes the budget. */
export function checkBudget(spentUsd: number, estimateUsd: number, budget: number): void {
  if (spentUsd + estimateUsd > budget) throw new BudgetError(spentUsd, budget, estimateUsd);
}

export interface ReplayBase {
  fixture: string;
  label: string;
  baseRunKey: string | null;
  baseReportId: string | null;
  chart: NatalChartData;
  subjectName: string;
  foundation: unknown;
  /** Per section token shape of the base run, for the estimate. */
  shapes: Record<string, TokenShape>;
  /** The base's `lab_runs` ids by section, the stored variants of a session; empty for a report base. */
  rowIds: Record<string, string>;
}

export interface ReplayRequest {
  baseRunKey?: string;
  baseReportId?: string;
  model: ModelId;
  sections: string[];
  serviceTier?: ServiceTier;
  sessionId?: string;
  label?: string;
  /** A failed section is tried once more before its row fails (sessions). */
  retryOnce?: boolean;
}

export interface ReplayStore {
  loadBase(req: Pick<ReplayRequest, "baseRunKey" | "baseReportId">, actorUserId: string | null): Promise<ReplayBase>;
  spentUsd(since: Date): Promise<number>;
  insert(rows: InsertLabRun[]): Promise<void>;
  update(id: string, patch: Partial<InsertLabRun>): Promise<void>;
}

export interface ReplayEngine {
  write: (sectionKey: string, chart: NatalChartData, name: string, foundationJson: string | undefined, options: { model: ModelId; serviceTier?: ServiceTier }) => Promise<SectionResult<unknown>>;
}

export const liveEngine: ReplayEngine = { write: writeSection };

/** The section ids a replay accepts: `foundation` and every reader-facing section. */
export const REPLAY_SECTIONS: readonly string[] = ALL_SECTIONS.map((s) => s.key.replace(/^natal:/, ""));

/** What a replay would cost, on the base's shapes. */
export function estimateReplayUsd(base: ReplayBase, model: string, sections: string[], tier: ServiceTier = "standard"): number {
  return sections.reduce((n, s) => n + (priceSection(model, base.shapes[s] ?? FALLBACK_SHAPE, tier) ?? 0), 0);
}

export interface StartedReplay {
  runKey: string;
  rows: InsertLabRun[];
  base: ReplayBase;
}

/**
 * Refuses past the budget, then queues one row per section and returns the
 * run key; `runReplayJob` does the writing. Split so a session can queue
 * every replay first (the shuffled order needs the ids) and write after.
 */
export async function startReplay(req: ReplayRequest, store: ReplayStore, actorUserId: string | null, env: NodeJS.ProcessEnv = process.env): Promise<StartedReplay> {
  if (!(req.model in CATALOGUE)) throw new Error(`${req.model} is not in the model catalogue`);
  const unknown = req.sections.filter((s) => !REPLAY_SECTIONS.includes(s));
  if (unknown.length) throw new Error(`unknown section(s): ${unknown.join(", ")}`);
  if (!req.sections.length) throw new Error("a replay needs at least one section");
  const base = await store.loadBase(req, actorUserId);
  const tier = tierFor(req.model, req.serviceTier ?? "flex");
  const spent = await store.spentUsd(monthStart());
  checkBudget(spent, estimateReplayUsd(base, req.model, req.sections, tier), budgetUsd(env));
  const runKey = `replay:${randomUUID()}`;
  const ordered = ["foundation", ...req.sections.filter((s) => s !== "foundation")].filter((s) => req.sections.includes(s));
  const rows: InsertLabRun[] = ordered.map((section) => ({
    id: randomUUID(),
    runKey,
    fixture: base.fixture,
    label: req.label ?? `replay-${new Date().toISOString().slice(0, 10)}`,
    source: "replay",
    baseRunKey: base.baseRunKey,
    baseReportId: base.baseReportId,
    section,
    model: req.model,
    reasoningEffort: effortFor(req.model),
    serviceTier: tier,
    status: "queued",
    faults: [],
    words: 0,
    sessionId: req.sessionId ?? null,
  }));
  await store.insert(rows);
  return { runKey, rows, base };
}

/**
 * Writes the queued rows in order, the foundation first so the sections
 * that follow write against the new one. Out of credit stops the job and
 * fails every row still queued with the reason (ADR-77); any other failure
 * fails its own row, after one more try when asked, and the job goes on.
 */
export async function runReplayJob(started: StartedReplay, req: ReplayRequest, store: ReplayStore, engine: ReplayEngine = liveEngine): Promise<void> {
  try {
    await writeRows(started, req, store, engine);
  } catch (err) {
    // A job that dies outside a section (a store failure, a bad base) must not leave rows queued for ever.
    const message = err instanceof Error ? err.message : String(err);
    for (const row of started.rows) await store.update(row.id, { status: "failed", error: `job failed: ${message}` }).catch(() => undefined);
    throw err;
  }
}

async function writeRows(started: StartedReplay, req: ReplayRequest, store: ReplayStore, engine: ReplayEngine): Promise<void> {
  const { base, rows } = started;
  const blind = base.chart.horizon?.status === "unknown";
  let foundationJson = base.foundation ? JSON.stringify(base.foundation, null, 2) : undefined;
  let stopped: string | null = null;
  for (const row of rows) {
    if (stopped) { await store.update(row.id, { status: "failed", error: `stopped: ${stopped}` }); continue; }
    await store.update(row.id, { status: "running" });
    const attempt = async () => engine.write(`natal:${row.section}`, base.chart, base.subjectName, row.section === "foundation" ? undefined : foundationJson, { model: req.model, serviceTier: row.serviceTier as ServiceTier });
    let result: SectionResult<unknown> | null = null;
    let error: string | null = null;
    for (let tries = 0; tries < (req.retryOnce ? 2 : 1) && !result; tries++) {
      try {
        result = await attempt();
      } catch (err) {
        if (err instanceof OutOfCreditError) { stopped = err.message; error = err.message; break; }
        error = err instanceof Error ? err.message : String(err);
      }
    }
    if (!result) { await store.update(row.id, { status: "failed", error }); continue; }
    if (row.section === "foundation") foundationJson = JSON.stringify(result.data, null, 2);
    const measure = row.section === "foundation" ? null : measureSection(row.section, result.data, base.chart, blind);
    await store.update(row.id, {
      status: "done",
      output: result.data as object,
      usage: result.usage as unknown as object,
      faults: measure ? faultsOf(measure) : [],
      words: measure?.words ?? 0,
      costUsd: costUsd(req.model, { ...result.usage }, row.serviceTier as ServiceTier),
      seconds: result.usage.ms / 1000,
      error: null,
    });
  }
}

// ---------------------------------------------------------------------------
// The database store.
// ---------------------------------------------------------------------------

function shapesOf(rows: Array<{ section: string; usage: unknown }>): Record<string, TokenShape> {
  const out: Record<string, TokenShape> = {};
  for (const r of rows) {
    const u = r.usage as SectionUsage | null;
    if (!u) continue;
    const attempts = Math.max(1, u.attempts || 1);
    out[r.section] = { inputTokens: Math.round(u.inputTokens / attempts), cachedInputTokens: Math.round(u.cachedInputTokens / attempts), outputTokens: Math.round(u.outputTokens / attempts) };
  }
  return out;
}

/** A base from its lab_runs rows: the foundation row carries the chart and the name. */
export function baseFromRows(runKey: string, rows: LabRun[]): ReplayBase {
  const foundation = rows.find((r) => r.section === "foundation");
  if (!foundation || !foundation.chart) throw new Error(`${runKey} has no foundation row with a chart; publish the run first`);
  // The engine reads the horizon as a status (R-4.6); a run stored before R05 has none and cannot be replayed.
  if (!(foundation.chart as { horizon?: { status?: string } }).horizon?.status) throw new Error(`${runKey} predates the horizon status (pre-R05) and cannot be replayed; publish an r05 or later run`);
  return {
    fixture: foundation.fixture,
    label: foundation.label,
    baseRunKey: runKey,
    baseReportId: null,
    chart: foundation.chart as NatalChartData,
    subjectName: foundation.subjectName ?? foundation.fixture,
    foundation: foundation.output,
    shapes: shapesOf(rows),
    rowIds: Object.fromEntries(rows.map((r) => [r.section, r.id])),
  };
}

export const dbStore: ReplayStore = {
  async loadBase(req, actorUserId) {
    if (req.baseRunKey) {
      const rows = await db.select().from(labRunsTable).where(eq(labRunsTable.runKey, req.baseRunKey));
      if (!rows.length) throw new Error(`no run ${req.baseRunKey}`);
      return baseFromRows(req.baseRunKey, rows);
    }
    if (!req.baseReportId) throw new Error("a replay needs baseRunKey or baseReportId");
    // The admin's own report, read in place: the token path has no user, so it cannot name one (R-3.5).
    if (!actorUserId) throw new Error("a report base needs the signed-in admin");
    const found = await db.select({ report: reportsTable, profile: profilesTable })
      .from(reportsTable).innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
      .where(and(eq(reportsTable.id, req.baseReportId), eq(profilesTable.userId, actorUserId))).limit(1);
    const row = found[0];
    if (!row) throw new Error(`no report ${req.baseReportId} of yours`);
    const interpretation = row.report.interpretation as { foundation?: unknown; meta?: { usage?: { sections: SectionUsage[] } } } | null;
    if (!row.profile.chartData || !interpretation?.foundation) throw new Error(`report ${req.baseReportId} is not complete`);
    const usage = interpretation.meta?.usage?.sections ?? [];
    return {
      fixture: `report:${row.report.id.slice(0, 8)}`,
      label: row.report.id,
      baseRunKey: null,
      baseReportId: row.report.id,
      chart: row.profile.chartData as NatalChartData,
      subjectName: row.profile.name,
      foundation: interpretation.foundation,
      shapes: shapesOf(usage.map((u) => ({ section: u.section.replace(/^natal:/, ""), usage: u }))),
      rowIds: {},
    };
  },
  async spentUsd(since) {
    const [row] = await db.select({ total: sql<number>`coalesce(sum(${labRunsTable.costUsd}), 0)` })
      .from(labRunsTable).where(and(gte(labRunsTable.createdAt, since), eq(labRunsTable.status, "done")));
    return Number(row?.total ?? 0);
  },
  async insert(rows) {
    if (rows.length) await db.insert(labRunsTable).values(rows);
  },
  async update(id, patch) {
    await db.update(labRunsTable).set(patch).where(eq(labRunsTable.id, id));
  },
};

/** The rows of one run key, foundation first then report order. */
export async function rowsOfRun(runKey: string): Promise<LabRun[]> {
  const rows = await db.select().from(labRunsTable).where(eq(labRunsTable.runKey, runKey));
  const order = (s: string) => (s === "foundation" ? -1 : REPLAY_SECTIONS.indexOf(s));
  return rows.sort((a, b) => order(a.section) - order(b.section));
}

export async function rowsById(ids: string[]): Promise<LabRun[]> {
  return ids.length ? db.select().from(labRunsTable).where(inArray(labRunsTable.id, ids)) : [];
}

/** The catalogue as the panel lists it, with the baseline every writer is judged against. */
export function catalogueForPanel() {
  return {
    baseline: MODELS.sections,
    models: (Object.keys(CATALOGUE) as ModelId[]).map((id) => {
      const p = priceOf(id)!;
      return { id, input: p.input, cachedInput: p.cachedInput, output: p.output, reasoningEffort: p.reasoningEffort, flex: p.flex, checked: p.checked ?? "" };
    }),
  };
}
