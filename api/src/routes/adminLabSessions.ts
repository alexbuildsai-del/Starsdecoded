/**
 * Sessions (ADR-54, ADR-55, ADR-57, ADR-75): estimate, spawn, the cards,
 * the picks and the reveal, under /api/admin/lab/sessions. A session is
 * exactly the ticked cards, generated on spawn through labReplay, judged
 * blind: a card returns text without model, cost or fault, and the reveal
 * answers 409 until the last card is judged. There is no session table: a
 * session is the judgement rows sharing a `session_id`, and its replays
 * are the `lab_runs` rows carrying it.
 */
import { Router, type IRouter } from "express";
import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, labJudgementsTable, labRunsTable, profilesTable, reportsTable, type LabJudgement, type LabRun } from "@workspace/db";
import { labGuard, labReadOnlyGuard } from "../lib/labGuard.js";
import { BudgetError, REPLAY_SECTIONS, budgetUsd, checkBudget, dbStore, monthStart, rowsById, runReplayJob, startReplay, type ReplayBase } from "../lib/labReplay.js";
import {
  BASELINE, CONTROL, STORED, isStored, controlAgreement, estimateSession, mulberry32, replayWriters, shuffle, tallyMixes, tallyWriters,
  type Picks, type RevealCard, type RevealVariant,
} from "../lib/labSession.js";
import { CATALOGUE, type ModelId, type ServiceTier } from "../lib/models.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();
router.use("/admin/lab/sessions", labGuard, labReadOnlyGuard);

const ROOM_ORDER = ["career", "overview", "superpowers", "discoveries", "mind", "money", "relationships", "family", "triad", "focus", "houses", "foundation"];
const rank = (s: string) => { const i = ROOM_ORDER.indexOf(s); return i === -1 ? ROOM_ORDER.length : i; };

const RequestSchema = z.object({
  bases: z.array(z.string().min(1)).min(1).max(20),
  sections: z.array(z.string().min(1)).min(1),
  writers: z.array(z.string().min(1)).min(1),
  control: z.boolean().default(true),
});
const SpawnSchema = RequestSchema.extend({
  label: z.string().min(1).max(80),
  serviceTier: z.enum(["flex", "standard"]).default("flex"),
});

function validate(body: z.infer<typeof RequestSchema>): string | null {
  const badSection = body.sections.filter((s) => !REPLAY_SECTIONS.includes(s));
  if (badSection.length) return `unknown section(s): ${badSection.join(", ")}`;
  const badWriter = body.writers.filter((w) => !isStored(w) && !(w in CATALOGUE));
  if (badWriter.length) return `unknown writer(s): ${badWriter.join(", ")}`;
  if (!replayWriters(body).length && !body.writers.some(isStored)) return "tick at least one writer";
  return null;
}

/** A base is a run key or `report:<id>`; the admin's own report is read in place (R-3.5). */
async function loadBases(keys: string[], actorUserId: string | null): Promise<ReplayBase[]> {
  return Promise.all(keys.map((k) => (k.startsWith("report:") ? dbStore.loadBase({ baseReportId: k.slice("report:".length) }, actorUserId) : dbStore.loadBase({ baseRunKey: k }, actorUserId))));
}

/** POST /sessions/estimate : each card priced on the base shapes at each writer's price, standard and Flex. */
router.post("/admin/lab/sessions/estimate", async (req, res) => {
  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation_error", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  const problem = validate(parsed.data);
  if (problem) return res.status(400).json({ error: "validation_error", message: problem });
  try {
    const actorUserId = req.labActor?.kind === "admin" ? req.labActor.userId : null;
    const bases = await loadBases(parsed.data.bases, actorUserId);
    const est = estimateSession({ ...parsed.data, bases: bases.map((b) => ({ key: b.baseRunKey ?? `report:${b.baseReportId}`, shapes: b.shapes })) });
    const spentUsd = await dbStore.spentUsd(monthStart());
    const budget = budgetUsd();
    return res.json({ ...est, spentUsd, budgetUsd: budget, overBudget: spentUsd + Math.min(est.standardUsd, est.flexUsd) > budget });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to estimate";
    return res.status(/^no (run|report)|not complete|needs the signed-in admin/.test(message) ? 404 : 500).json({ error: "estimate_failed", message });
  }
});

/**
 * POST /sessions : one card per base and section, the order shuffled once
 * and stored, replays started only for the missing writers (the stored text
 * is the base's own row). A failed replay retries once; its column drops at
 * the card and is named at the reveal.
 */
router.post("/admin/lab/sessions", async (req, res) => {
  const parsed = SpawnSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation_error", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  const body = parsed.data;
  const problem = validate(body);
  if (problem) return res.status(400).json({ error: "validation_error", message: problem });
  try {
    const actorUserId = req.labActor?.kind === "admin" ? req.labActor.userId : null;
    const bases = await loadBases(body.bases, actorUserId);
    const est = estimateSession({ ...body, bases: bases.map((b) => ({ key: b.baseRunKey ?? `report:${b.baseReportId}`, shapes: b.shapes })) });
    checkBudget(await dbStore.spentUsd(monthStart()), body.serviceTier === "flex" ? est.flexUsd : est.standardUsd, budgetUsd());

    const sessionId = randomUUID();
    const writers = replayWriters(body);
    const sections = [...body.sections].sort((a, b) => rank(a) - rank(b));
    // Every replay is queued before any card exists, because a card stores its variants as row ids.
    const jobs: Array<{ base: ReplayBase; writer: string; started: Awaited<ReturnType<typeof startReplay>>; req: Parameters<typeof runReplayJob>[1] }> = [];
    for (const base of bases) {
      for (const { writer, model } of writers) {
        const replayReq = {
          ...(base.baseRunKey ? { baseRunKey: base.baseRunKey } : { baseReportId: base.baseReportId! }),
          model: model as ModelId, sections, serviceTier: body.serviceTier as ServiceTier, sessionId, label: body.label, retryOnce: true,
        };
        const started = await startReplay(replayReq, dbStore, actorUserId);
        jobs.push({ base, writer, started, req: replayReq });
      }
    }
    // The stored text of the same chart under another label: a second column at no cost (MB-72).
    const otherLabels = body.writers.filter((w) => w.startsWith("stored:")).map((w) => w.slice("stored:".length));
    const others = new Map<string, ReplayBase>();
    for (const base of bases) for (const label of otherLabels) {
      const key = `${base.fixture}.${label}`;
      if (base.baseRunKey === key) continue;
      others.set(key, await dbStore.loadBase({ baseRunKey: key }, actorUserId));
    }
    // Deterministic per card from random bytes: the seed is not stored, the order is.
    const cards: Array<typeof labJudgementsTable.$inferInsert> = [];
    let index = 0;
    for (const section of sections) {
      for (const base of bases) {
        const variants: string[] = [];
        if (body.writers.includes(STORED)) variants.push(base.rowIds[section] ?? (base.baseReportId ? `report:${base.baseReportId}:${section}` : ""));
        for (const label of otherLabels) {
          const other = others.get(`${base.fixture}.${label}`);
          if (other?.rowIds[section]) variants.push(other.rowIds[section]);
        }
        for (const job of jobs.filter((j) => j.base === base)) {
          const row = job.started.rows.find((r) => r.section === section);
          if (row) variants.push(row.id);
        }
        const order = shuffle(variants.filter(Boolean), mulberry32(randomBytes(4).readUInt32LE(0)));
        cards.push({
          id: randomUUID(), sessionId, sessionLabel: body.label, fixture: base.fixture, section, cardIndex: index++, variants: order,
        });
      }
    }
    await db.insert(labJudgementsTable).values(cards);
    // The replays run one after another in the background: a key with no credits stops at the first (ADR-77).
    void (async () => {
      for (const job of jobs) await runReplayJob(job.started, job.req, dbStore);
    })().catch((err) => logger.error({ err, sessionId }, "session replays failed"));
    return res.status(202).json({ sessionId, cards: cards.length, replays: jobs.reduce((n, j) => n + j.started.rows.length, 0) });
  } catch (err) {
    if (err instanceof BudgetError) return res.status(409).json({ error: "lab_budget", message: err.message, spentUsd: err.spentUsd, budgetUsd: err.budgetUsd });
    const message = err instanceof Error ? err.message : "Failed to spawn";
    req.log.warn({ err }, "spawn refused");
    return res.status(/^no (run|report)|not complete|needs the signed-in admin/.test(message) ? 404 : 400).json({ error: "spawn_refused", message });
  }
});

function summarise(rows: LabJudgement[], runs: LabRun[]) {
  const byId = new Map<string, { id: string; label: string; createdAt: string; cards: number; judged: number; ready: boolean; revealedAt: string | null }>();
  for (const r of rows) {
    const s = byId.get(r.sessionId) ?? { id: r.sessionId, label: r.sessionLabel, createdAt: r.createdAt.toISOString(), cards: 0, judged: 0, ready: true, revealedAt: null };
    s.cards++;
    if (r.judgedAt) s.judged++;
    if (r.revealedAt) s.revealedAt = r.revealedAt.toISOString();
    byId.set(r.sessionId, s);
  }
  for (const run of runs) {
    const s = run.sessionId ? byId.get(run.sessionId) : undefined;
    if (s && (run.status === "queued" || run.status === "running")) s.ready = false;
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** GET /sessions : every session, newest first, numbers only. */
router.get("/admin/lab/sessions", async (req, res) => {
  try {
    const [rows, runs] = await Promise.all([
      db.select().from(labJudgementsTable).orderBy(desc(labJudgementsTable.createdAt)),
      db.select().from(labRunsTable).where(eq(labRunsTable.source, "replay")),
    ]);
    return res.json({ sessions: summarise(rows, runs) });
  } catch (err) {
    req.log.error({ err }, "lab sessions failed");
    return res.status(500).json({ error: "internal_error", message: "Failed to list sessions" });
  }
});

/** GET /sessions/:id : the cards in room order with whether each is judged, and the replays still writing. */
router.get("/admin/lab/sessions/:id", async (req, res) => {
  try {
    const rows = await db.select().from(labJudgementsTable).where(eq(labJudgementsTable.sessionId, req.params.id));
    if (!rows.length) return res.status(404).json({ error: "not_found", message: "no such session" });
    const runs = await db.select().from(labRunsTable).where(eq(labRunsTable.sessionId, req.params.id));
    const [summary] = summarise(rows, runs);
    const list = rows.map((r) => ({ id: r.id, index: r.cardIndex, fixture: r.fixture, section: r.section, judged: !!r.judgedAt }))
      .sort((a, b) => rank(a.section) - rank(b.section) || a.index - b.index);
    const pending = runs.filter((r) => r.status !== "done").map((r) => ({ runKey: r.runKey, section: r.section, status: r.status, error: r.error }));
    return res.json({ ...summary, list, pending });
  } catch (err) {
    req.log.error({ err }, "lab session failed");
    return res.status(500).json({ error: "internal_error", message: "Failed to read the session" });
  }
});

/** A variant id is a lab_runs row, or `report:<id>:<section>` for the stored text of a report base, read in place. */
async function resolveVariants(ids: string[], actorUserId: string | null): Promise<Array<{ id: string; run: LabRun | null; text: unknown; ok: boolean }>> {
  const runs = await rowsById(ids.filter((id) => !id.startsWith("report:")));
  const out: Array<{ id: string; run: LabRun | null; text: unknown; ok: boolean }> = [];
  for (const id of ids) {
    if (id.startsWith("report:")) {
      const [, reportId, section] = id.split(":");
      let text: unknown = null;
      if (actorUserId) {
        const found = await db.select({ interpretation: reportsTable.interpretation })
          .from(reportsTable).innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
          .where(and(eq(reportsTable.id, reportId), eq(profilesTable.userId, actorUserId))).limit(1);
        text = (found[0]?.interpretation as Record<string, unknown> | null)?.[section] ?? null;
      }
      out.push({ id, run: null, text, ok: text !== null });
      continue;
    }
    const run = runs.find((r) => r.id === id) ?? null;
    out.push({ id, run, text: run?.output ?? null, ok: run?.status === "done" && run.output !== null });
  }
  return out;
}

const LETTERS = "ABCDEFGHIJ";

/** GET /sessions/:id/cards/:cardId : the variants as A, B, C in the stored order, text only; a failed column is dropped. */
router.get("/admin/lab/sessions/:id/cards/:cardId", async (req, res) => {
  try {
    const [card] = await db.select().from(labJudgementsTable).where(and(eq(labJudgementsTable.id, req.params.cardId), eq(labJudgementsTable.sessionId, req.params.id))).limit(1);
    if (!card) return res.status(404).json({ error: "not_found", message: "no such card" });
    const actorUserId = req.labActor?.kind === "admin" ? req.labActor.userId : null;
    const resolved = await resolveVariants(card.variants as string[], actorUserId);
    // Letters follow the stored order over the columns that landed, so a dropped column never shifts a judged letter: the index is the stored position.
    const variants = resolved.map((v, i) => ({ index: i, letter: LETTERS[i] ?? String(i), text: v.text, ok: v.ok })).filter((v) => v.ok).map(({ index, letter, text }) => ({ index, letter, text }));
    return res.json({ id: card.id, sessionId: card.sessionId, index: card.cardIndex, fixture: card.fixture, section: card.section, variants, picks: card.picks as Picks | null, note: card.note, judgedAt: card.judgedAt?.toISOString() ?? null });
  } catch (err) {
    req.log.error({ err }, "lab card failed");
    return res.status(500).json({ error: "internal_error", message: "Failed to read the card" });
  }
});

const PicksSchema = z.object({
  picks: z.object({ best: z.array(z.number().int().min(0)), notShip: z.array(z.number().int().min(0)), same: z.array(z.array(z.number().int().min(0)).min(2)) }),
  note: z.string().max(4000).default(""),
});

/** PUT /sessions/:id/cards/:cardId : saves the picks and the note at once. */
router.put("/admin/lab/sessions/:id/cards/:cardId", async (req, res) => {
  const parsed = PicksSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "validation_error", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  try {
    const [card] = await db.select().from(labJudgementsTable).where(and(eq(labJudgementsTable.id, req.params.cardId), eq(labJudgementsTable.sessionId, req.params.id))).limit(1);
    if (!card) return res.status(404).json({ error: "not_found", message: "no such card" });
    const n = (card.variants as string[]).length;
    const { picks, note } = parsed.data;
    const all = [...picks.best, ...picks.notShip, ...picks.same.flat()];
    if (all.some((i) => i >= n)) return res.status(400).json({ error: "validation_error", message: `a pick names a variant the card does not have (${n} variants)` });
    const judged = picks.best.length > 0 || picks.notShip.length > 0 || picks.same.length > 0;
    await db.update(labJudgementsTable).set({ picks, note, judgedAt: judged ? new Date() : null }).where(eq(labJudgementsTable.id, card.id));
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "lab pick failed");
    return res.status(500).json({ error: "internal_error", message: "Failed to save the pick" });
  }
});

/** The writer a run row stands for at the reveal: the base's stored text, the hidden control, or the model. */
function writerOf(run: LabRun | null, id: string, sessionId: string): string {
  if (!run) return `${STORED}:report`;
  if (run.sessionId !== sessionId) return `${STORED}:${run.label}`;
  if (run.model === BASELINE) return CONTROL;
  return run.model;
}

/** GET /sessions/:id/reveal : 409 until the last card is judged, then the tables (ADR-57). */
router.get("/admin/lab/sessions/:id/reveal", async (req, res) => {
  try {
    const rows = await db.select().from(labJudgementsTable).where(eq(labJudgementsTable.sessionId, req.params.id));
    if (!rows.length) return res.status(404).json({ error: "not_found", message: "no such session" });
    const unjudged = rows.filter((r) => !r.judgedAt).length;
    if (unjudged) return res.status(409).json({ error: "session_open", message: `${unjudged} of ${rows.length} cards still unjudged`, unjudged, cards: rows.length });
    const actorUserId = req.labActor?.kind === "admin" ? req.labActor.userId : null;
    const cards: RevealCard[] = [];
    const named: Array<{ id: string; fixture: string; section: string; letters: Record<string, string>; picks: Picks | null; note: string | null }> = [];
    const dropped: Array<{ fixture: string; section: string; writer: string; error: string | null }> = [];
    for (const card of rows.sort((a, b) => rank(a.section) - rank(b.section) || a.cardIndex - b.cardIndex)) {
      const resolved = await resolveVariants(card.variants as string[], actorUserId);
      const variants: RevealVariant[] = [];
      const letters: Record<string, string> = {};
      resolved.forEach((v, i) => {
        const writer = writerOf(v.run, v.id, card.sessionId);
        if (!v.ok) { dropped.push({ fixture: card.fixture, section: card.section, writer, error: v.run?.error ?? "no text" }); return; }
        letters[LETTERS[i] ?? String(i)] = writer;
        variants.push({
          index: i, writer, model: v.run?.model ?? BASELINE, serviceTier: ((v.run?.serviceTier as ServiceTier | undefined) ?? "standard"),
          words: v.run?.words ?? 0, costUsd: v.run && v.run.sessionId === card.sessionId ? v.run.costUsd : 0, faults: ((v.run?.faults as string[] | undefined) ?? []).length,
        });
      });
      cards.push({ fixture: card.fixture, section: card.section, variants, picks: card.picks as Picks | null });
      named.push({ id: card.id, fixture: card.fixture, section: card.section, letters, picks: card.picks as Picks | null, note: card.note });
    }
    // The mixes are priced on the first base's shapes; every base shares the R05 shape within noise.
    const firstRun = rows[0] && (rows[0].variants as string[]).find((id) => !id.startsWith("report:"));
    const baseRun = firstRun ? (await rowsById([firstRun]))[0] : null;
    const shapes = baseRun?.baseRunKey ? (await dbStore.loadBase({ baseRunKey: baseRun.baseRunKey }, actorUserId)).shapes : {};
    await db.update(labJudgementsTable).set({ revealedAt: new Date() }).where(and(eq(labJudgementsTable.sessionId, req.params.id)));
    return res.json({
      sessionId: req.params.id, label: rows[0].sessionLabel,
      writers: tallyWriters(cards), mixes: tallyMixes(cards, shapes, REPLAY_SECTIONS), control: controlAgreement(cards), dropped, cards: named,
    });
  } catch (err) {
    req.log.error({ err }, "lab reveal failed");
    return res.status(500).json({ error: "internal_error", message: "Failed to reveal" });
  }
});

export default router;
