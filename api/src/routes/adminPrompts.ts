import { Router, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, promptTemplatesTable } from "@workspace/db";
import { PROMPT_DEFAULTS, PROMPT_DEFAULTS_BY_KEY } from "../lib/promptDefaults.js";
import { invalidatePromptCache } from "../lib/promptLoader.js";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  PROMPT_VERSION,
  getActiveVersion,
  getStaleCount,
  markStale,
  bumpVersion,
} from "@workspace/meaning-library";
import type { MeaningKind } from "@workspace/db";
import { grantBundle, BUNDLE_DEFINITIONS } from "../lib/credits.js";
import type { BundleKind } from "@workspace/db";

const router = Router();

function adminGuard(req: Request, res: Response, next: NextFunction) {
  const adminUserId = process.env.ADMIN_USER_ID;
  if (!adminUserId) {
    return res.status(503).json({
      error: "admin_disabled",
      message: "ADMIN_USER_ID env var is not set — admin endpoints are disabled.",
    });
  }
  if (!req.userId || req.userId !== adminUserId) {
    return res.status(403).json({ error: "forbidden", message: "Admin access required." });
  }
  return next();
}

/** POST /api/admin/credits/grant — manually grant a bundle of credits to a user (admin only). */
router.post("/admin/credits/grant", adminGuard, async (req, res) => {
  const { userId, bundleKind } = req.body as { userId?: string; bundleKind?: string };

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "validation_error", message: "userId is required" });
  }
  if (!bundleKind || !["solo", "couple", "family"].includes(bundleKind)) {
    return res.status(400).json({
      error: "validation_error",
      message: "bundleKind must be one of: solo, couple, family",
    });
  }

  try {
    const result = await grantBundle(userId, bundleKind as BundleKind);
    const creditTypes = BUNDLE_DEFINITIONS[bundleKind as BundleKind];
    req.log.info({ userId, bundleKind, bundleId: result.bundleId }, "Credits granted via admin");
    return res.status(201).json({
      bundleId: result.bundleId,
      userId,
      bundleKind,
      creditsGranted: creditTypes,
      creditIds: result.credits,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to grant credits");
    return res.status(500).json({ error: "internal_error", message: "Failed to grant credits" });
  }
});

/** GET /api/admin/me — accessible to any signed-in user; returns admin status. */
router.get("/admin/me", (req, res) => {
  const adminUserId = process.env.ADMIN_USER_ID;
  return res.json({
    isAdmin: !!(adminUserId && req.userId && req.userId === adminUserId),
    userId: req.userId ?? null,
  });
});

// Guard only the prompt/meaning-library admin endpoints, not /admin/me above.
router.use("/admin/prompts", adminGuard);
router.use("/admin/meaning-library", adminGuard);

/** POST /api/admin/prompts/preview — call the AI with supplied prompts and return the raw response. */
router.post("/admin/prompts/preview", async (req, res) => {
  const { systemPrompt, userPrompt } = req.body as {
    systemPrompt?: string | null;
    userPrompt?: string | null;
  };

  if (!userPrompt && !systemPrompt) {
    return res.status(400).json({ error: "bad_request", message: "At least one of systemPrompt or userPrompt must be provided." });
  }

  const messages: { role: "system" | "user"; content: string }[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  if (userPrompt) messages.push({ role: "user", content: userPrompt });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1200,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    return res.json({ text });
  } catch (err) {
    req.log.error({ err }, "Prompt preview AI call failed");
    const message = err instanceof Error ? err.message : "AI call failed";
    return res.status(502).json({ error: "ai_error", message });
  }
});

/** GET /api/admin/prompts — list all prompt templates (DB overrides merged with defaults). */
router.get("/admin/prompts", async (req, res) => {
  try {
    const dbRows = await db.select().from(promptTemplatesTable);
    const dbByKey = new Map(dbRows.map((r) => [r.promptKey, r]));

    const result = PROMPT_DEFAULTS.map((def) => {
      const override = dbByKey.get(def.key);
      return {
        key: def.key,
        category: def.category,
        subcategory: def.subcategory,
        label: def.label,
        systemPrompt: override?.systemPrompt ?? def.systemPrompt,
        userPrompt: override?.userPrompt ?? def.userPrompt,
        defaultSystemPrompt: def.systemPrompt,
        defaultUserPrompt: def.userPrompt,
        isOverridden: !!override,
        updatedAt: override?.updatedAt?.toISOString() ?? null,
      };
    });

    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list prompt templates");
    return res.status(500).json({ error: "internal_error", message: "Failed to list prompts" });
  }
});

/** GET /api/admin/prompts/:key — get a single prompt template. */
router.get("/admin/prompts/:key", async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const def = PROMPT_DEFAULTS_BY_KEY.get(key);
  if (!def) {
    return res.status(404).json({ error: "not_found", message: "Unknown prompt key" });
  }

  try {
    const rows = await db
      .select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.promptKey, key))
      .limit(1);
    const override = rows[0] ?? null;

    return res.json({
      key: def.key,
      category: def.category,
      subcategory: def.subcategory,
      label: def.label,
      systemPrompt: override?.systemPrompt ?? def.systemPrompt,
      userPrompt: override?.userPrompt ?? def.userPrompt,
      defaultSystemPrompt: def.systemPrompt,
      defaultUserPrompt: def.userPrompt,
      isOverridden: !!override,
      updatedAt: override?.updatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get prompt template");
    return res.status(500).json({ error: "internal_error", message: "Failed to get prompt" });
  }
});

// ---------------------------------------------------------------------------
// Helpers for auto-invalidation when a meaning-library prompt is edited.
// ---------------------------------------------------------------------------

/**
 * Maps a meaning-library prompt key to the affected MeaningKind(s).
 * Returns "all" for the shared system prompt, a specific kind for per-kind
 * user prompts, or null for non-meaning-library prompt keys.
 */
function mlKindFromPromptKey(key: string): MeaningKind | "all" | null {
  if (!key.startsWith("meaning_library:")) return null;
  if (key === "meaning_library:system") return "all";
  const kindMap: Record<string, MeaningKind> = {
    "meaning_library:planet_sign:user": "planet_sign",
    "meaning_library:planet_house:user": "planet_house",
    "meaning_library:aspect:user": "aspect",
    "meaning_library:ascendant_sign:user": "ascendant_sign",
    "meaning_library:midheaven_sign:user": "midheaven_sign",
    "meaning_library:synastry_aspect:user": "synastry_aspect",
  };
  return kindMap[key] ?? null;
}

/** PUT /api/admin/prompts/:key — upsert a prompt override. */
router.put("/admin/prompts/:key", async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const def = PROMPT_DEFAULTS_BY_KEY.get(key);
  if (!def) {
    return res.status(404).json({ error: "not_found", message: "Unknown prompt key" });
  }

  const { systemPrompt, userPrompt } = req.body as {
    systemPrompt?: string | null;
    userPrompt?: string | null;
  };

  try {
    const now = new Date();
    await db
      .insert(promptTemplatesTable)
      .values({
        id: randomUUID(),
        category: def.category,
        subcategory: def.subcategory,
        promptKey: key,
        systemPrompt: systemPrompt ?? null,
        userPrompt: userPrompt ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: promptTemplatesTable.promptKey,
        set: {
          systemPrompt: systemPrompt ?? null,
          userPrompt: userPrompt ?? null,
          updatedAt: now,
        },
      });

    invalidatePromptCache(key);

    // Auto-invalidate the affected meaning-library kind so cached entries
    // generated with the old prompt are regenerated on next request.
    const mlTarget = mlKindFromPromptKey(key);
    if (mlTarget) {
      const invalidated = await markStale(mlTarget === "all" ? undefined : mlTarget);
      req.log.info({ key, mlTarget, invalidated }, "Auto-invalidated meaning library entries after prompt save");
    }

    return res.json({ key, saved: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save prompt template");
    return res.status(500).json({ error: "internal_error", message: "Failed to save prompt" });
  }
});

/** DELETE /api/admin/prompts/:key — reset to default by removing the DB override. */
router.delete("/admin/prompts/:key", async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const def = PROMPT_DEFAULTS_BY_KEY.get(key);
  if (!def) {
    return res.status(404).json({ error: "not_found", message: "Unknown prompt key" });
  }

  try {
    await db
      .delete(promptTemplatesTable)
      .where(eq(promptTemplatesTable.promptKey, key));

    invalidatePromptCache(key);

    // Auto-invalidate the affected meaning-library kind on reset too.
    const mlTarget = mlKindFromPromptKey(key);
    if (mlTarget) {
      const invalidated = await markStale(mlTarget === "all" ? undefined : mlTarget);
      req.log.info({ key, mlTarget, invalidated }, "Auto-invalidated meaning library entries after prompt reset");
    }

    return res.json({ key, reset: true });
  } catch (err) {
    req.log.error({ err }, "Failed to reset prompt template");
    return res.status(500).json({ error: "internal_error", message: "Failed to reset prompt" });
  }
});

// ---------------------------------------------------------------------------
// Meaning library version endpoints.
// ---------------------------------------------------------------------------

const VALID_ML_KINDS = new Set<MeaningKind>([
  "planet_sign",
  "planet_house",
  "aspect",
  "ascendant_sign",
  "midheaven_sign",
  "synastry_aspect",
]);

/**
 * GET /api/admin/meaning-library/version
 * Returns the active prompt version (DB-backed) and how many cached entries
 * are stale (i.e. have a different promptVersion than the active one).
 */
router.get("/admin/meaning-library/version", async (req, res) => {
  try {
    const [version, staleCount] = await Promise.all([getActiveVersion(), getStaleCount()]);
    return res.json({ version, codeVersion: PROMPT_VERSION, staleCount });
  } catch (err) {
    req.log.error({ err }, "Failed to get meaning library version info");
    return res.status(500).json({ error: "internal_error", message: "Failed to get version info" });
  }
});

/**
 * POST /api/admin/meaning-library/bump-version
 * Increments the active prompt version in the DB (e.g. "v2" → "v3").
 * All existing cache rows now have a lower version and will be treated as
 * stale by lookupOrFill — they regenerate lazily with the current prompts.
 * Returns { version: string }
 */
router.post("/admin/meaning-library/bump-version", async (req, res) => {
  try {
    const version = await bumpVersion();
    req.log.info({ version }, "Meaning library prompt version bumped");
    return res.json({ version });
  } catch (err) {
    req.log.error({ err }, "Failed to bump meaning library version");
    return res.status(500).json({ error: "internal_error", message: "Failed to bump version" });
  }
});

/**
 * POST /api/admin/meaning-library/invalidate
 * Marks all (or kind-specific) cache entries as stale so they regenerate
 * lazily on next request with the current prompt text.
 * Optional body: { kind: MeaningKind } to limit to one kind.
 * Returns { invalidated: number }
 */
router.post("/admin/meaning-library/invalidate", async (req, res) => {
  const { kind } = req.body as { kind?: string };

  if (kind !== undefined && !VALID_ML_KINDS.has(kind as MeaningKind)) {
    return res.status(400).json({ error: "validation_error", message: "Invalid kind" });
  }

  try {
    const invalidated = await markStale(kind as MeaningKind | undefined);
    req.log.info({ invalidated, kind: kind ?? "all" }, "Meaning library entries marked stale");
    return res.json({ invalidated });
  } catch (err) {
    req.log.error({ err }, "Failed to invalidate meaning library entries");
    return res.status(500).json({ error: "internal_error", message: "Failed to invalidate entries" });
  }
});

export default router;
