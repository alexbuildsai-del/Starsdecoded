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
import { encode } from "gpt-tokenizer";
import { db, labRunsTable, type InsertLabRun, type LabRun } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { labGuard, labReadOnlyGuard } from "../lib/labGuard.js";
import { previewSectionPrompt } from "../lib/aiInterpretation.js";
import {
  BudgetError, REPLAY_SECTIONS, baseFromRows, budgetUsd, catalogueForPanel, dbStore, monthKey, monthStart, rowsOfRun, runReplayJob, startReplay,
} from "../lib/labReplay.js";
import { CATALOGUE, type ModelId } from "../lib/models.js";
import { logger } from "../lib/logger.js";
import { WORD_TARGETS, type ReportSectionId } from "../prompts/index.js";

const router: IRouter = Router();
router.use("/admin/lab", labGuard, labReadOnlyGuard);

/** A run row as the panel lists it: never `output`, never `chart`. */
export function numbersOf(r: LabRun) {
  return {
    id: r.id, runKey: r.runKey, fixture: r.fixture, label: r.label, source: r.source, section: r.section, model: r.model,
    reasoningEffort: r.reasoningEffort, serviceTier: r.serviceTier, status: r.status, error: r.error, words: r.words,
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

/** A strict schema is one every object of which closes itself and requires every property. */
function strictOk(schema: unknown): boolean {
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

/**
 * GET /dry?base=<label> : level 0. Every section's prompt rendered through
 * previewSectionPrompt for the base's charts, input tokens against the
 * baseline's, a strict-schema check, and whether each catalogue id is
 * served (`models.list`, no tokens). Zero usage is recorded (ADR-76).
 */
router.get("/admin/lab/dry", async (req, res) => {
  const base = String(req.query.base ?? "r06");
  try {
    const rows = await db.select().from(labRunsTable).where(eq(labRunsTable.label, base));
    const runKeys = [...new Set(rows.filter((r) => r.source === "lab").map((r) => r.runKey))];
    if (!runKeys.length) return res.status(404).json({ error: "not_found", message: `no lab run under ${base}; publish one first` });
    const out: Array<{ fixture: string; section: string; inputTokens: number; baselineInputTokens: number | null; schemaOk: boolean; error?: string }> = [];
    for (const runKey of runKeys) {
      let b: ReturnType<typeof baseFromRows>;
      try {
        b = baseFromRows(runKey, rows.filter((r) => r.runKey === runKey));
      } catch (err) {
        out.push({ fixture: runKey.split(".")[0], section: "*", inputTokens: 0, baselineInputTokens: null, schemaOk: false, error: err instanceof Error ? err.message : String(err) });
        continue;
      }
      const foundationJson = JSON.stringify(b.foundation, null, 2);
      for (const section of REPLAY_SECTIONS) {
        const shape = b.shapes[section];
        const baselineInputTokens = shape ? shape.inputTokens + shape.cachedInputTokens : null;
        try {
          const prompt = await previewSectionPrompt(`natal:${section}`, b.chart, b.subjectName, section === "foundation" ? undefined : foundationJson);
          out.push({ fixture: b.fixture, section, inputTokens: encode(prompt.system).length + encode(prompt.user).length, baselineInputTokens, schemaOk: strictOk(prompt.schema) });
        } catch (err) {
          // A run stored before the horizon status (pre-R05) cannot render; it is named, not hidden.
          out.push({ fixture: b.fixture, section, inputTokens: 0, baselineInputTokens, schemaOk: false, error: err instanceof Error ? err.message : String(err) });
        }
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
    return res.json({ base, rows: out, served, servedError, usageRecorded: 0 });
  } catch (err) {
    req.log.error({ err }, "lab dry failed");
    return res.status(500).json({ error: "internal_error", message: err instanceof Error ? err.message : "Failed to render" });
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
