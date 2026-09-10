import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { readAppEnv, readCommitSha } from "../lib/appEnv.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const commit = readCommitSha();
  const data = HealthCheckResponse.parse({
    status: "ok",
    env: readAppEnv(),
    ...(commit ? { commit } : {}),
  });
  res.json(data);
});

// Separate from the liveness probe on purpose: this one does touch the
// database, so a failure here means "the API is up but its database is not",
// which the plain /healthz deliberately cannot say. The driver's error text
// is returned outside production so a broken staging database can be
// diagnosed without dashboard access. The error code (a SQLSTATE such as
// 42P01 for a missing table, or a socket errno) names the failure class
// without carrying hosts or credentials, so production returns it too.
router.get("/healthz/db", async (_req, res) => {
  const started = Date.now();
  try {
    const { pool } = await import("@workspace/db");
    const result = await pool.query<{ profiles: number }>("select count(*)::int as profiles from profiles");
    res.json({ ok: true, profiles: result.rows[0]?.profiles ?? 0, ms: Date.now() - started });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : undefined;
    const code = readErrorCode(err) ?? readErrorCode(err instanceof Error ? err.cause : undefined);
    res.status(503).json({
      ok: false,
      ms: Date.now() - started,
      ...(code ? { code } : {}),
      ...(readAppEnv() === "production" ? {} : { error: message, ...(cause ? { cause } : {}) }),
    });
  }
});

function readErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const { code } = err as { code?: unknown };
  return typeof code === "string" && code.length > 0 ? code : undefined;
}

export default router;
