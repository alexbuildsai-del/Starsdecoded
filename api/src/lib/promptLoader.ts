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
 * Startup repair: remove prompt_templates rows whose key no longer exists in
 * promptDefaults.ts. Such rows are unreachable (nothing resolves them) and
 * would only mislead the admin page. Safe to run on every boot.
 *
 * The output contract is applied by code from each section's schema, so an
 * override can only change tone and instructions, never the response shape.
 * That is why no shape validation is needed here any more.
 */
export async function repairStalePromptOverrides(): Promise<void> {
  let rows: Array<{ promptKey: string }> = [];
  try {
    rows = await db.select({ promptKey: promptTemplatesTable.promptKey }).from(promptTemplatesTable);
  } catch (err) {
    logger.warn({ err }, "repairStalePromptOverrides: DB read failed, skipping");
    return;
  }

  const orphans = rows
    .map((r) => r.promptKey)
    .filter((key) => !key.startsWith("__") && !PROMPT_DEFAULTS_BY_KEY.has(key));
  if (orphans.length === 0) return;

  try {
    await db.delete(promptTemplatesTable).where(inArray(promptTemplatesTable.promptKey, orphans));
    for (const key of orphans) cache.delete(key);
    logger.info({ orphans }, "repairStalePromptOverrides: removed orphaned prompt overrides");
  } catch (err) {
    logger.warn({ err, orphans }, "repairStalePromptOverrides: failed to remove orphaned rows");
  }
}
