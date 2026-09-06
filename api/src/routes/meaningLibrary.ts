import { Router, type Request, type Response, type NextFunction } from "express";
import { and, eq, sql, asc, like } from "drizzle-orm";
import { db, meaningLibraryTable } from "@workspace/db";
import { getStats } from "@workspace/meaning-library";

const router = Router();

const VALID_KINDS = new Set(["planet_sign", "planet_house", "aspect"]);

// Per-kind payload shape validation. The admin UI also validates client-side,
// but we never trust the client — direct API callers must satisfy this too.
function validatePayloadShape(kind: string, payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "payload must be a JSON object";
  }
  const obj = payload as Record<string, unknown>;
  function isNonEmptyString(v: unknown): v is string {
    return typeof v === "string" && v.trim() !== "";
  }
  if (kind === "planet_sign" || kind === "planet_house") {
    if (!isNonEmptyString(obj.summary)) {
      return "payload must have a non-empty `summary` string";
    }
    return null;
  }
  if (kind === "aspect") {
    for (const field of ["dynamic", "tension", "behavior", "growth"] as const) {
      if (!isNonEmptyString(obj[field])) {
        return `payload must have a non-empty \`${field}\` string`;
      }
    }
    return null;
  }
  return "Unknown kind";
}

function adminAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.MEANING_LIBRARY_ADMIN_KEY;
  if (!expected) {
    return res.status(503).json({
      error: "admin_disabled",
      message:
        "Admin endpoints are disabled. Set MEANING_LIBRARY_ADMIN_KEY to enable them.",
    });
  }
  const provided =
    (req.header("x-admin-key") ?? "").trim() ||
    (typeof req.query.key === "string" ? req.query.key.trim() : "");
  if (provided !== expected) {
    return res.status(401).json({ error: "unauthorized", message: "Invalid admin key" });
  }
  return next();
}

router.use("/meaning-library", adminAuth);

// GET /api/meaning-library/stats — counts per kind plus total.
router.get("/meaning-library/stats", async (req, res) => {
  try {
    const stats = await getStats();
    return res.json(stats);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch meaning library stats");
    return res.status(500).json({ error: "internal_error", message: "Failed to fetch stats" });
  }
});

// GET /api/meaning-library — list entries with filters.
router.get("/meaning-library", async (req, res) => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "50"), 10) || 50, 1), 500);
  const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);

  if (kind && !VALID_KINDS.has(kind)) {
    return res.status(400).json({ error: "validation_error", message: "Invalid kind" });
  }

  try {
    const filters = [];
    if (kind) filters.push(eq(meaningLibraryTable.kind, kind));
    if (search) filters.push(like(meaningLibraryTable.key, `%${search.toLowerCase()}%`));

    const where = filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : and(...filters);

    const rows = await db
      .select()
      .from(meaningLibraryTable)
      .where(where)
      .orderBy(asc(meaningLibraryTable.kind), asc(meaningLibraryTable.key))
      .limit(limit)
      .offset(offset);

    const totalRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(meaningLibraryTable)
      .where(where);
    const total = Number(totalRows[0]?.count ?? 0);

    return res.json({
      entries: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        key: r.key,
        payload: r.payload,
        promptVersion: r.promptVersion,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list meaning library entries");
    return res.status(500).json({ error: "internal_error", message: "Failed to list entries" });
  }
});

// PUT /api/meaning-library/:kind/:key — replace payload, bump updatedAt.
router.put("/meaning-library/:kind/:key", async (req, res) => {
  const { kind, key } = req.params;
  if (!VALID_KINDS.has(kind)) {
    return res.status(400).json({ error: "validation_error", message: "Invalid kind" });
  }
  const payload = req.body?.payload;
  const shapeError = validatePayloadShape(kind, payload);
  if (shapeError) {
    return res.status(400).json({ error: "validation_error", message: shapeError });
  }

  try {
    const result = await db
      .update(meaningLibraryTable)
      .set({ payload, updatedAt: new Date() })
      .where(and(eq(meaningLibraryTable.kind, kind), eq(meaningLibraryTable.key, key)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "not_found", message: "Entry not found" });
    }

    const r = result[0];
    return res.json({
      id: r.id,
      kind: r.kind,
      key: r.key,
      payload: r.payload,
      promptVersion: r.promptVersion,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update meaning library entry");
    return res.status(500).json({ error: "internal_error", message: "Failed to update entry" });
  }
});

// DELETE /api/meaning-library/:kind/:key — remove an entry so the next lookup lazy-fills.
router.delete("/meaning-library/:kind/:key", async (req, res) => {
  const { kind, key } = req.params;
  if (!VALID_KINDS.has(kind)) {
    return res.status(400).json({ error: "validation_error", message: "Invalid kind" });
  }

  try {
    const result = await db
      .delete(meaningLibraryTable)
      .where(and(eq(meaningLibraryTable.kind, kind), eq(meaningLibraryTable.key, key)))
      .returning();
    if (result.length === 0) {
      return res.status(404).json({ error: "not_found", message: "Entry not found" });
    }
    return res.json({ deleted: true, id: result[0].id });
  } catch (err) {
    req.log.error({ err }, "Failed to delete meaning library entry");
    return res.status(500).json({ error: "internal_error", message: "Failed to delete entry" });
  }
});

export default router;
