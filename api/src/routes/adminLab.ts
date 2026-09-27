/**
 * The lab routes (annex scope 3 and 4, ADR-76, ADR-77), under
 * /api/admin/lab and outside openapi.yaml like /admin/prompts. Runs and
 * compare answer with numbers only; text leaves the database only through
 * a session card (adminLabSessions.ts). Mutations refuse under
 * PROMPTS_READ_ONLY, so production never replays.
 */
import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { db, generationFailuresTable, labRunsTable, type InsertLabRun, type LabRun } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { labGuard, labReadOnlyGuard } from "../lib/labGuard.js";
import {
  BudgetError, REPLAY_SECTIONS, baseFromRows, budgetUsd, catalogueForPanel, dbStore, estimateReplayUsd, monthKey, monthStart, rowsOfRun, runReplayJob, startReplay,
} from "../lib/labReplay.js";
import { dryNatal, dryPair } from "../lib/labDry.js";
import { importLabel } from "../lib/labImport.js";
import { failureCounts } from "../lib/failureLog.js";
import type { FailureCode } from "../lib/failureReasons.js";
import { CATALOGUE, MODELS, tierFor, type ModelId } from "../lib/models.js";
import { logger } from "../lib/logger.js";
import { WORD_TARGETS, type ReportSectionId } from "../prompts/index.js";
import type { PairInput } from "../lib/pairBrief.js";

const router: IRouter = Router();
router.use("/admin/lab", labGuard, labReadOnlyGuard);

/** The reason code a failed row's error reads as, so Runs shows the same four codes a customer's report does (ADR-84). */
export function failureCodeOfMessage(error: string | null): FailureCode | null {
  if (!error) return null;
  if (/out of credit|insufficient_quota/i.test(error)) return "provider_out_of_credit";
  if (/failed validation|model refused|not in the model catalogue/i.test(error)) return "quality";
  if (/connection|fetch failed|timed? ?out|socket hang up|ECONNRESET|ECONNREFUSED|\b5\d\d\b|aborted/i.test(error)) return "provider_unreachable";
  return "internal";
}

/** A run row as the panel lists it: never `output`, never `chart`. */
export function numbersOf(r: LabRun) {
  return {
    id: r.id, runKey: r.runKey, fixture: r.fixture, label: r.label, source: r.source, section: r.section, model: r.model,
    reasoningEffort: r.reasoningEffort, serviceTier: r.serviceTier, status: r.status, error: r.error, failureCode: failureCodeOfMessage(r.error), words: r.words,
    costUsd: r.costUsd, seconds: r.seconds, faults: (r.faults as string[]) ?? [], sessionId: r.sessionId,
    createdAt: r.createdAt.toISOString(), subjectName: r.subjectName,
  };
}

/** GET /runs?label= : every run, numbers only, newest first. */
router.get("/admin/lab/runs", async (req, res) => {
  try {
    const label = typeof req.query.label === "string" ? req.query.label : null;
    const rows = await db.select().from(labRunsTable)
      .where(label ? eq(labRunsTable.label, label) : undefined)
      .orderBy(desc(labRunsTable.createdAt));
    const labels = [...new Set(rows.filter((r) => r.source === "lab").map((r) => r.label))];
    return res.json({ runs: rows.map(numbersOf), labels });
  } catch (err) {
    req.log.error({ err }, "lab runs failed");
    return res.status(500).json({ error: "internal_error", message: "Failed to list runs" });
  }
});

const SectionRowSchema = z.object({
  section: z.string().min(1),
  model: z.string().min(1),
  serviceTier: z.enum(["flex", "standard"]).default("standard"),
  output: z.unknown(),
  usage: z.unknown().nullable().default(null),
  faults: z.array(z.string()).default([]),
  words: z.number().int().min(0).default(0),
  costUsd: z.number().nullable().default(null),
  seconds: z.number().nullable().default(null),
});
const RunPayloadSchema = z.object({
  runKey: z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+$/i, "a run key is <fixture>.<label>"),
  fixture: z.string().min(1),
  label: z.string().min(1),
  source: z.literal("lab").default("lab"),
  subjectName: z.string().min(1),
  chart: z.record(z.string(), z.unknown()),
  generatedAt: z.string().datetime().optional(),
  sections: z.array(SectionRowSchema).min(1),
});

/** POST /runs : a stored run file lands in the panel; the run key is replaced whole. */
router.post("/admin/lab/runs", async (req, res) => {
  const parsed = RunPayloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation_error", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  const p = parsed.data;
  if (!p.sections.some((s) => s.section === "foundation")) return res.status(400).json({ error: "validation_error", message: "a run needs its foundation row" });
  try {
    // A published run keeps the day it was generated, so a run from last
    // month does not count against this month's budget (ADR-77).
    const createdAt = p.generatedAt ? new Date(p.generatedAt) : new Date();
    const rows: InsertLabRun[] = p.sections.map((s) => ({
      id: randomUUID(), runKey: p.runKey, fixture: p.fixture, label: p.label, source: "lab", section: s.section, model: s.model,
      reasoningEffort: (CATALOGUE as Record<string, { reasoningEffort: string }>)[s.model]?.reasoningEffort ?? null,
      serviceTier: s.serviceTier, status: "done", output: s.output as object, usage: s.usage as object | null,
      faults: s.faults, words: s.words, costUsd: s.costUsd, seconds: s.seconds,
      ...(s.section === "foundation" ? { chart: p.chart as object, subjectName: p.subjectName } : {}),
      createdAt,
    }));
    await db.transaction(async (tx) => {
      await tx.delete(labRunsTable).where(eq(labRunsTable.runKey, p.runKey));
      await tx.insert(labRunsTable).values(rows);
    });
    return res.status(201).json({ runKey: p.runKey, rows: rows.length });
  } catch (err) {
    req.log.error({ err }, "lab publish failed");
    return res.status(500).json({ error: "internal_error", message: "Failed to store the run" });
  }
});

/** The verdict the script's --compare prints, on stored numbers. */
export function compareRows(a: LabRun[], b: LabRun[]) {
  const sections = [...new Set([...a, ...b].map((r) => r.section))].filter((s) => s !== "foundation");
  const order = (s: string) => REPLAY_SECTIONS.indexOf(s);
  sections.sort((x, y) => order(x) - order(y));
  const rows = sections.map((section) => {
    const ra = a.find((r) => r.section === section), rb = b.find((r) => r.section === section);
    const fa = (ra?.faults as string[] | undefined) ?? [], fb = (rb?.faults as string[] | undefined) ?? (rb ? [] : ["not written"]);
    const target = WORD_TARGETS[section as ReportSectionId];
    const inRange = (r: LabRun | undefined) => (r && target ? r.words >= target[0] && r.words <= target[1] : null);
    const newFaults = fb.filter((f) => !fa.includes(f)), goneFaults = fa.filter((f) => !fb.includes(f));
    const fellOut = inRange(ra) === true && inRange(rb) === false, cameIn = inRange(ra) === false && inRange(rb) === true;
    const verdict = newFaults.length ? `WORSE ${newFaults.slice(0, 2).join(" ")}` : fellOut ? "WORSE out of word band" : goneFaults.length || cameIn ? "better" : "same";
    return {
      section, model: [ra?.model ?? "-", rb?.model ?? "-"] as [string, string], words: [ra?.words ?? 0, rb?.words ?? 0] as [number, number],
      costUsd: [ra?.costUsd ?? null, rb?.costUsd ?? null] as [number | null, number | null], seconds: [ra?.seconds ?? 0, rb?.seconds ?? 0] as [number, number],
      faults: [fa, fb] as [string[], string[]], verdict,
    };
  });
  const sum = (rs: LabRun[]) => (rs.some((r) => r.costUsd === null) ? null : rs.reduce((n, r) => n + (r.costUsd ?? 0), 0));
  return { rows, costUsd: [sum(a), sum(b)] as [number | null, number | null], worse: rows.filter((r) => /^WORSE/.test(r.verdict)).map((r) => r.section), better: rows.filter((r) => r.verdict === "better").map((r) => r.section) };
}

/** GET /compare?a=&b= : two run keys, per section, numbers only. */
router.get("/admin/lab/compare", async (req, res) => {
  const a = String(req.query.a ?? ""), b = String(req.query.b ?? "");
  if (!a || !b) return res.status(400).json({ error: "validation_error", message: "a and b are run keys" });
  try {
    const [ra, rb] = await Promise.all([rowsOfRun(a), rowsOfRun(b)]);
    if (!ra.length || !rb.length) return res.status(404).json({ error: "not_found", message: `no run ${!ra.length ? a : b}` });
    return res.json({ a, b, ...compareRows(ra, rb) });
  } catch (err) {
    req.log.error({ err }, "lab compare failed");
    return res.status(500).json({ error: "internal_error", message: "Failed to compare" });
  }
});

/** GET /spend : the month to date against LAB_BUDGET_USD (ADR-77). */
router.get("/admin/lab/spend", async (req, res) => {
  try {
    const since = monthStart();
    const spentUsd = await dbStore.spentUsd(since);
    const runs = await db.select({ runKey: labRunsTable.runKey }).from(labRunsTable);
    return res.json({ month: monthKey(), spentUsd, budgetUsd: budgetUsd(), runs: new Set(runs.map((r) => r.runKey)).size });
  } catch (err) {
    req.log.error({ err }, "lab spend failed");
    return res.status(500).json({ error: "internal_error", message: "Failed to sum the spend" });
  }
});

/** GET /catalogue : the writers a session may tick, with the baseline. */
router.get("/admin/lab/catalogue", (_req, res) => res.json(catalogueForPanel()));

/** The repository's fixtures, wherever the process was started from: the pair files name charts and hold no birth data of their own (R-3.1). */
function fixturesDir(): string | null {
  for (const dir of [process.cwd(), join(process.cwd(), ".."), join(process.cwd(), "..", "..")]) {
    if (existsSync(join(dir, "fixtures", "pairs"))) return join(dir, "fixtures");
  }
  return null;
}

/** A natal interpretation rebuilt from a run's rows: the foundation and every stored section, enough for the pair brief. */
function interpretationOfRows(rows: LabRun[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const r of rows) if (r.status === "done" && r.output !== null) out[r.section] = r.output;
  const chart = rows.find((r) => r.section === "foundation")?.chart as { horizon?: { status?: string } } | undefined;
  out.meta = { horizon: chart?.horizon?.status ?? "known" };
  return out;
}

/** A pair fixture's two sides from the base's stored runs, birth dates from the chart fixtures on disk. */
async function pairInputOf(pairName: string, base: string, lens: string | undefined): Promise<PairInput> {
  const dir = fixturesDir();
  if (!dir) throw new Error("no fixtures directory beside the process");
  const pairPath = join(dir, "pairs", `${pairName}.json`);
  if (!/^[a-z0-9-]+$/.test(pairName) || !existsSync(pairPath)) throw new Error(`no pair fixture ${pairName}`);
  const pair = JSON.parse(readFileSync(pairPath, "utf8")) as { a: string; b: string; lens?: string; parent?: "A" | "B"; label?: string };
  const side = async (name: string) => {
    const rows = await rowsOfRun(`${name}.${base}`);
    if (!rows.length) throw new Error(`no run ${name}.${base}; import the label first`);
    const b = baseFromRows(`${name}.${base}`, rows);
    const fixture = JSON.parse(readFileSync(join(dir, "charts", `${name}.json`), "utf8")) as { name: string; birthDate: string };
    return { name: b.subjectName, birthDate: fixture.birthDate, chart: b.chart, interpretation: interpretationOfRows(rows) as never };
  };
  const picked = (lens ?? pair.lens ?? "partners") as PairInput["lens"];
  return {
    lens: picked,
    parent: picked === "parent_child" ? (pair.parent ?? "A") : null,
    label: picked === "people" ? (pair.label ?? "friends") : null,
    a: await side(pair.a),
    b: await side(pair.b),
  };
}

/**
 * GET /dry?base=<label>[&pair=<fixture>[&lens=]] : level 0. Every natal
 * section's prompt rendered for the base's charts and, with a pair named,
 * every pair prompt for that pair, tokens against the baseline, a
 * strict-schema check, and whether each catalogue id is served
 * (`models.list`, no tokens). Zero usage is recorded (ADR-76, ADR-86).
 */
router.get("/admin/lab/dry", async (req, res) => {
  const base = String(req.query.base ?? "r06");
  const pairName = typeof req.query.pair === "string" && req.query.pair ? req.query.pair : null;
  const lens = typeof req.query.lens === "string" && req.query.lens ? req.query.lens : undefined;
  try {
    const rows = await db.select().from(labRunsTable).where(eq(labRunsTable.label, base));
    const runKeys = [...new Set(rows.filter((r) => r.source === "lab").map((r) => r.runKey))];
    if (!runKeys.length && !pairName) return res.status(404).json({ error: "not_found", message: `no lab run under ${base}; import one first` });
    const out: Array<{ fixture: string; section: string; inputTokens: number; baselineInputTokens: number | null; schemaOk: boolean; error?: string }> = [];
    for (const runKey of runKeys) {
      try {
        const b = baseFromRows(runKey, rows.filter((r) => r.runKey === runKey));
        out.push(...await dryNatal({ fixture: b.fixture, chart: b.chart, subjectName: b.subjectName, foundation: b.foundation, shapes: b.shapes }));
      } catch (err) {
        out.push({ fixture: runKey.split(".")[0], section: "*", inputTokens: 0, baselineInputTokens: null, schemaOk: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
    if (pairName) {
      try {
        out.push(...await dryPair(pairName, await pairInputOf(pairName, base, lens)));
      } catch (err) {
        out.push({ fixture: pairName, section: "*", inputTokens: 0, baselineInputTokens: null, schemaOk: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
    let served: Record<string, boolean> = {};
    let servedError: string | null = null;
    try {
      const ids = new Set<string>();
      for await (const m of openai.models.list()) ids.add(m.id);
      served = Object.fromEntries(Object.keys(CATALOGUE).map((id) => [id, ids.has(id)]));
    } catch (err) {
      servedError = err instanceof Error ? err.message : String(err);
    }
    return res.json({ base, pair: pairName, rows: out, served, servedError, usageRecorded: 0 });
  } catch (err) {
    req.log.error({ err }, "lab dry failed");
    return res.status(500).json({ error: "internal_error", message: err instanceof Error ? err.message : "Failed to render" });
  }
});

const SpotSchema = z.object({
  sections: z.array(z.string().min(1)).min(1),
  charts: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1).max(6),
  base: z.string().min(1).default("r06"),
  model: z.enum(Object.keys(CATALOGUE) as [ModelId, ...ModelId[]]).default(MODELS.sections),
  serviceTier: z.enum(["flex", "standard"]).default("flex"),
});

/** The spot's sections resolved: "pipeline" is the foundation and every section. */
function spotSections(sections: string[]): string[] {
  return sections.includes("pipeline") ? [...REPLAY_SECTIONS] : sections;
}

/** POST /spot/estimate : what the picked sections on the picked charts would cost on the base's shapes, against the budget (ADR-77). */
router.post("/admin/lab/spot/estimate", async (req, res) => {
  const parsed = SpotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation_error", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  const body = parsed.data;
  const sections = spotSections(body.sections);
  const unknown = sections.filter((s) => !REPLAY_SECTIONS.includes(s));
  if (unknown.length) return res.status(400).json({ error: "validation_error", message: `unknown section(s): ${unknown.join(", ")}` });
  try {
    const tier = tierFor(body.model, body.serviceTier);
    const perChart: Array<{ chart: string; runKey: string; estimateUsd: number }> = [];
    for (const chart of body.charts) {
      const runKey = `${chart}.${body.base}`;
      const base = await dbStore.loadBase({ baseRunKey: runKey }, null);
      perChart.push({ chart, runKey, estimateUsd: estimateReplayUsd(base, body.model, sections, tier) });
    }
    const estimateUsd = perChart.reduce((n, c) => n + c.estimateUsd, 0);
    const spentUsd = await dbStore.spentUsd(monthStart());
    const budget = budgetUsd();
    return res.json({ sections, model: body.model, serviceTier: tier, perChart, estimateUsd, spentUsd, budgetUsd: budget, overBudget: spentUsd + estimateUsd > budget });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to estimate";
    return res.status(/^no run/.test(message) ? 404 : 500).json({ error: "estimate_failed", message });
  }
});

/** POST /spot : level 1 from the panel. One replay per chart through startReplay, refused over budget, written in the background. */
router.post("/admin/lab/spot", async (req, res) => {
  const parsed = SpotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation_error", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  const body = parsed.data;
  const sections = spotSections(body.sections);
  try {
    const actorUserId = req.labActor?.kind === "admin" ? req.labActor.userId : null;
    const label = `spot-${new Date().toISOString().slice(0, 10)}`;
    const started = [];
    for (const chart of body.charts) {
      const replayReq = { baseRunKey: `${chart}.${body.base}`, model: body.model, sections, serviceTier: body.serviceTier, label };
      started.push({ replayReq, started: await startReplay(replayReq, dbStore, actorUserId) });
    }
    for (const s of started) void runReplayJob(s.started, s.replayReq, dbStore).catch((err) => logger.error({ err, runKey: s.started.runKey }, "spot job failed"));
    return res.status(202).json({ runKeys: started.map((s) => s.started.runKey), label });
  } catch (err) {
    if (err instanceof BudgetError) return res.status(409).json({ error: "lab_budget", message: err.message, spentUsd: err.spentUsd, budgetUsd: err.budgetUsd });
    const message = err instanceof Error ? err.message : "Failed to start the spot";
    req.log.warn({ err }, "spot refused");
    return res.status(/^no (run|report)|predates/.test(message) ? 404 : 400).json({ error: "spot_refused", message });
  }
});

const ImportSchema = z.object({ labels: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1).max(10) });

/** POST /runs/import : stored runs from the public report-lab/<label> branches into Runs, no token (MB-72). */
router.post("/admin/lab/runs/import", async (req, res) => {
  const parsed = ImportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation_error", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  try {
    const results = [];
    for (const label of parsed.data.labels) results.push(await importLabel(label));
    return res.json({ results });
  } catch (err) {
    req.log.error({ err }, "lab import failed");
    return res.status(500).json({ error: "internal_error", message: err instanceof Error ? err.message : "Failed to import" });
  }
});

/** GET /failures : counts per rule and section from the failure log, the flag at more than 1 in 10 of a section's last 20 writes; no text (ADR-85). */
router.get("/admin/lab/failures", async (req, res) => {
  try {
    const rows = await db.select({
      section: generationFailuresTable.section, ruleId: generationFailuresTable.ruleId, class: generationFailuresTable.class,
      writeId: generationFailuresTable.writeId, createdAt: generationFailuresTable.createdAt, kind: generationFailuresTable.kind,
    }).from(generationFailuresTable).orderBy(desc(generationFailuresTable.createdAt)).limit(20_000);
    const writes = new Set(rows.map((r) => r.writeId)).size;
    return res.json({ counts: failureCounts(rows), writes, rows: rows.length, kinds: [...new Set(rows.map((r) => r.kind))] });
  } catch (err) {
    req.log.error({ err }, "lab failures failed");
    return res.status(500).json({ error: "internal_error", message: "Failed to count the failures" });
  }
});

const ReplaySchema = z.object({
  baseRunKey: z.string().min(1).optional(),
  baseReportId: z.string().min(1).optional(),
  model: z.enum(Object.keys(CATALOGUE) as [ModelId, ...ModelId[]]),
  sections: z.array(z.string()).min(1),
  serviceTier: z.enum(["flex", "standard"]).default("flex"),
  label: z.string().min(1).optional(),
});

/** POST /replay : level 1. Queues the rows, answers 202 with the run key, writes in the background. */
router.post("/admin/lab/replay", async (req, res) => {
  const parsed = ReplaySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation_error", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  const body = parsed.data;
  if (!body.baseRunKey && !body.baseReportId) return res.status(400).json({ error: "validation_error", message: "baseRunKey or baseReportId is required" });
  try {
    const actorUserId = req.labActor?.kind === "admin" ? req.labActor.userId : null;
    const started = await startReplay(body, dbStore, actorUserId);
    void runReplayJob(started, body, dbStore).catch((err) => logger.error({ err, runKey: started.runKey }, "replay job failed"));
    return res.status(202).json({ runKey: started.runKey, sections: started.rows.map((r) => ({ id: r.id, section: r.section, status: r.status })) });
  } catch (err) {
    if (err instanceof BudgetError) return res.status(409).json({ error: "lab_budget", message: err.message, spentUsd: err.spentUsd, budgetUsd: err.budgetUsd });
    const message = err instanceof Error ? err.message : "Failed to start the replay";
    req.log.warn({ err }, "replay refused");
    return res.status(/^no (run|report)|not complete|needs the signed-in admin/.test(message) ? 404 : 400).json({ error: "replay_refused", message });
  }
});

/** GET /replay/:runKey : the job's rows, numbers only. */
router.get("/admin/lab/replay/:runKey", async (req, res) => {
  try {
    const rows = await rowsOfRun(decodeURIComponent(req.params.runKey));
    if (!rows.length) return res.status(404).json({ error: "not_found", message: "no such replay" });
    const status = rows.every((r) => r.status === "done") ? "done" : rows.some((r) => r.status === "running" || r.status === "queued") ? "running" : "failed";
    return res.json({ runKey: rows[0].runKey, status, sections: rows.map(numbersOf) });
  } catch (err) {
    req.log.error({ err }, "lab replay status failed");
    return res.status(500).json({ error: "internal_error", message: "Failed to read the replay" });
  }
});

export default router;
