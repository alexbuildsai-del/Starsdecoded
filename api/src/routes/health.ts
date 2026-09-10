import { readFile } from "node:fs/promises";
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { readAppEnv, readCommitSha } from "../lib/appEnv.js";

const router: IRouter = Router();

// Written by scripts/bootstrap-db.sh when it completes. Its absence in a
// running container means the start command never ran the bootstrap.
const BOOTSTRAP_MARKER = "/tmp/bootstrap-db.done";

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
  const bootstrap = await readBootstrapMarker();
  try {
    const { pool } = await import("@workspace/db");
    const result = await pool.query<{ profiles: number }>("select count(*)::int as profiles from profiles");
    res.json({ ok: true, profiles: result.rows[0]?.profiles ?? 0, ms: Date.now() - started, bootstrap });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : undefined;
    const code = readErrorCode(err) ?? readErrorCode(err instanceof Error ? err.cause : undefined);
    res.status(503).json({
      ok: false,
      ms: Date.now() - started,
      bootstrap,
      ...(code ? { code } : {}),
      tables: await listPublicTables(),
      ...(readAppEnv() === "production" ? {} : { error: message, ...(cause ? { cause } : {}) }),
    });
  }
});

async function readBootstrapMarker(): Promise<string | null> {
  try {
    return (await readFile(BOOTSTRAP_MARKER, "utf8")).trim();
  } catch {
    return null;
  }
}

// Table names only, so a failing probe shows whether the database the API
// reached is empty, partially built, or simply not the one that was
// bootstrapped. Null when the connection itself is what failed.
async function listPublicTables(): Promise<string[] | null> {
  try {
    const { pool } = await import("@workspace/db");
    const result = await pool.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    return result.rows.map((row) => row.table_name);
  } catch {
    return null;
  }
}

function readErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const { code } = err as { code?: unknown };
  return typeof code === "string" && code.length > 0 ? code : undefined;
}

export default router;
