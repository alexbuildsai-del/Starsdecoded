import { eq, inArray } from "drizzle-orm";
import { db, promptTemplatesTable } from "@workspace/db";
import { PROMPT_DEFAULTS_BY_KEY } from "./promptDefaults.js";
import { logger } from "./logger.js";

interface CacheEntry {
  systemPrompt: string | null;
  userPrompt: string | null;
  expiresAt: number;
}

const TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

export interface PromptRow {
  systemPrompt: string | null;
  userPrompt: string | null;
}

/**
 * When set, DB overrides are ignored and prompts resolve straight from
 * promptDefaults.ts. The report lab uses this to test the prompts a change
 * actually introduces, rather than whatever a maintainer has since typed into
 * /admin/prompts. It does not affect the meaning library.
 */
const defaultsOnly = process.env.PROMPT_DEFAULTS_ONLY === "1";

/**
 * Load a prompt row by key from the DB, falling back to the hardcoded default
 * if no DB override exists. Results are cached in-process for ~30s.
 */
export async function getPrompt(key: string): Promise<PromptRow> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return { systemPrompt: cached.systemPrompt, userPrompt: cached.userPrompt };
  }

  if (defaultsOnly) {
    const def = PROMPT_DEFAULTS_BY_KEY.get(key);
    const result: PromptRow = {
      systemPrompt: def?.systemPrompt ?? null,
      userPrompt: def?.userPrompt ?? null,
    };
    cache.set(key, { ...result, expiresAt: now + TTL_MS });
    return result;
  }

  try {
    const rows = await db
      .select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.promptKey, key))
      .limit(1);

    if (rows.length > 0) {
      const row = rows[0];
      const entry: CacheEntry = {
        systemPrompt: row.systemPrompt,
        userPrompt: row.userPrompt,
        expiresAt: now + TTL_MS,
      };
      cache.set(key, entry);
      return { systemPrompt: entry.systemPrompt, userPrompt: entry.userPrompt };
    }
  } catch {
    // DB miss — fall through to defaults
  }

  const def = PROMPT_DEFAULTS_BY_KEY.get(key);
  const result: PromptRow = {
    systemPrompt: def?.systemPrompt ?? null,
    userPrompt: def?.userPrompt ?? null,
  };

  cache.set(key, { ...result, expiresAt: now + TTL_MS });
  return result;
}

/** Resolve system + user prompts, falling back field-by-field to the hardcoded default. */
export async function resolvePrompt(key: string): Promise<{ system: string; user: string }> {
  const row = await getPrompt(key);
  const def = PROMPT_DEFAULTS_BY_KEY.get(key);
  return {
    system: row.systemPrompt ?? def?.systemPrompt ?? "",
    user: row.userPrompt ?? def?.userPrompt ?? "",
  };
}

/**
 * Resolve both system and user prompts for a section (e.g. "natal:overview"),
 * pulling `${sectionKey}:system` and `${sectionKey}:user` in one parallel batch.
 */
export async function resolveSection(sectionKey: string): Promise<{ system: string; user: string }> {
  const [sysEntry, usrEntry] = await Promise.all([
    getPrompt(`${sectionKey}:system`),
    getPrompt(`${sectionKey}:user`),
  ]);
  const sysDef = PROMPT_DEFAULTS_BY_KEY.get(`${sectionKey}:system`);
  const usrDef = PROMPT_DEFAULTS_BY_KEY.get(`${sectionKey}:user`);
  return {
    system: sysEntry.systemPrompt ?? sysDef?.systemPrompt ?? "",
    user: usrEntry.userPrompt ?? usrDef?.userPrompt ?? "",
  };
}

/** Invalidate a key from the in-process cache (called after admin writes). */
export function invalidatePromptCache(key: string): void {
  cache.delete(key);
}

/**
 * Validators for prompt_templates overrides.
 * Each function receives the stored userPrompt TEMPLATE TEXT and returns true
 * when the override is compatible with the current expected output shape.
 * Return false → the row predates a breaking format change and should be removed.
 *
 * NOTE: userPrompt stores the prompt TEMPLATE (prose + {placeholders}), NOT
 * the AI response. Validators must inspect template text, not parse AI output.
 */
const PROMPT_SHAPE_VALIDATORS: Record<string, (userPrompt: string) => boolean> = {
  "natal:foundation:user": (userPrompt: string): boolean =>
    userPrompt.includes("{foundationContext}")
    && userPrompt.includes('"sectionGuidance"'),
  "natal:overview:user": (userPrompt: string): boolean =>
    userPrompt.includes("{foundation}")
    && userPrompt.includes("{overviewContext}")
    && userPrompt.includes('"dominantThemes"'),
  "natal:triad:user": (userPrompt: string): boolean =>
    userPrompt.includes("{foundation}")
    && userPrompt.includes("{triadContext}")
    && userPrompt.includes('"synthesis"'),
  "natal:career:user": (userPrompt: string): boolean =>
    userPrompt.includes("{foundation}")
    && userPrompt.includes("{careerContext}")
    && userPrompt.includes('"cards"'),
  "natal:relationships:user": (userPrompt: string): boolean =>
    userPrompt.includes("{foundation}")
    && userPrompt.includes("{relationshipsContext}")
    && userPrompt.includes('"cards"'),
  "natal:superpowers:user": (userPrompt: string): boolean =>
    userPrompt.includes("{foundation}")
    && userPrompt.includes("{superpowersContext}")
    && userPrompt.includes('"chronicPatterns"'),
  "natal:discoveries:user": (userPrompt: string): boolean =>
    userPrompt.includes("{foundation}")
    && userPrompt.includes("{discoveriesContext}")
    && userPrompt.includes('"paradoxes"'),
  "natal:focus:user": (userPrompt: string): boolean =>
    userPrompt.includes("{foundation}")
    && userPrompt.includes("{focusContext}")
    && userPrompt.includes('"priorities"'),
};

const PAIRED_SYSTEM_KEYS: Record<string, string> = {
  "natal:foundation:user": "natal:foundation:system",
  "natal:overview:user": "natal:overview:system",
  "natal:triad:user": "natal:triad:system",
  "natal:career:user": "natal:career:system",
  "natal:relationships:user": "natal:relationships:system",
  "natal:superpowers:user": "natal:superpowers:system",
  "natal:discoveries:user": "natal:discoveries:system",
  "natal:focus:user": "natal:focus:system",
};

/**
 * Startup repair: remove prompt_templates overrides that no longer match the
 * expected structured-JSON shape for their key. Safe to run on every boot —
 * it's a no-op when no stale rows exist. Removed rows fall back to the correct
 * hardcoded defaults in promptDefaults.ts.
 */
export async function repairStalePromptOverrides(): Promise<void> {
  const staleKeys: string[] = [];

  for (const [key, isValid] of Object.entries(PROMPT_SHAPE_VALIDATORS)) {
    try {
      const rows = await db
        .select()
        .from(promptTemplatesTable)
        .where(eq(promptTemplatesTable.promptKey, key))
        .limit(1);

      if (rows.length > 0) {
        const userPrompt = rows[0].userPrompt ?? "";
        if (!isValid(userPrompt)) {
          staleKeys.push(key);
          const pairedSystemKey = PAIRED_SYSTEM_KEYS[key];
          if (pairedSystemKey) staleKeys.push(pairedSystemKey);
        }
      }
    } catch (err) {
      logger.warn({ err, key }, "repairStalePromptOverrides: DB read failed, skipping key");
    }
  }

  if (staleKeys.length === 0) return;
  const uniqueStaleKeys = [...new Set(staleKeys)];

  try {
    await db
      .delete(promptTemplatesTable)
      .where(inArray(promptTemplatesTable.promptKey, uniqueStaleKeys));
    for (const key of uniqueStaleKeys) {
      cache.delete(key);
    }
    logger.info(
      { staleKeys: uniqueStaleKeys },
      "repairStalePromptOverrides: removed stale prompt overrides",
    );
  } catch (err) {
    logger.warn(
      { err, staleKeys: uniqueStaleKeys },
      "repairStalePromptOverrides: failed to remove stale rows",
    );
  }
}
