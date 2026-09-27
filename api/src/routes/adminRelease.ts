/**
 * The Release view's routes (ADR-86), under /api/admin/release behind the
 * Clerk admin gate and the read-only guard, plus one public route: the
 * verdict, a sha and a status and nothing else, which the Promote fallback
 * reads (MB-79). Staging only: production refuses to start a release.
 */
import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { labGuard, labReadOnlyGuard } from "../lib/labGuard.js";
import { ReleaseRefused, dbReleaseRecordStore, liveDeps, preflight, settleInterrupted, startRelease } from "../lib/release.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();
router.use("/admin/release", labGuard, labReadOnlyGuard);

void settleInterrupted().catch((err) => logger.warn({ err }, "could not settle an interrupted release"));

const deps = liveDeps();

router.get("/admin/release/preflight", async (req, res) => {
  try {
    return res.json(await preflight(deps));
  } catch (err) {
    req.log.error({ err }, "release preflight failed");
    return res.status(500).json({ error: "internal_error", message: err instanceof Error ? err.message : "preflight failed" });
  }
});

const StartSchema = z.object({ seedFault: z.boolean().default(false) });

router.post("/admin/release", async (req, res) => {
  const parsed = StartSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "validation_error", message: "seedFault must be a boolean" });
  try {
    const row = await startRelease(deps, parsed.data);
    return res.status(202).json({ id: row.id, sha: row.sha, status: row.status });
  } catch (err) {
    if (err instanceof ReleaseRefused) return res.status(err.status).json({ error: "release_refused", message: err.message });
    req.log.error({ err }, "release start failed");
    return res.status(500).json({ error: "internal_error", message: err instanceof Error ? err.message : "release failed to start" });
  }
});

router.get("/admin/release", async (req, res) => {
  try {
    const rows = await dbReleaseRecordStore.list();
    return res.json({ releases: rows.map((r) => ({ id: r.id, sha: r.sha, productionSha: r.productionSha, brainChanged: r.brainChanged, pairChanged: r.pairChanged, status: r.status, error: r.error, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })) });
  } catch (err) {
    req.log.error({ err }, "release list failed");
    return res.status(500).json({ error: "internal_error", message: "Failed to list releases" });
  }
});

router.get("/admin/release/:id", async (req, res) => {
  try {
    const r = await dbReleaseRecordStore.get(req.params.id);
    if (!r) return res.status(404).json({ error: "not_found", message: "no such release" });
    return res.json({ id: r.id, sha: r.sha, productionSha: r.productionSha, brainChanged: r.brainChanged, pairChanged: r.pairChanged, status: r.status, steps: r.steps, qa: r.qa, error: r.error, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "release read failed");
    return res.status(500).json({ error: "internal_error", message: "Failed to read the release" });
  }
});

/** Public: the sha and the status, nothing else (MB-79). The Promote workflow reads it with no token. */
router.get("/release/:id/verdict", async (req, res) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(404).json({ error: "not_found" });
    const r = await dbReleaseRecordStore.get(req.params.id);
    if (!r) return res.status(404).json({ error: "not_found" });
    return res.json({ sha: r.sha, status: r.status });
  } catch (err) {
    req.log.error({ err }, "release verdict failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
