/**
 * Copy prompt_templates from the staging database into this one.
 *
 * Production runs it as the last bootstrap step so a release carries exactly
 * the prompts that were reviewed on staging. PROMPT_SOURCE_DATABASE_URL is set
 * only on the production Railway environment; everywhere else this is a no-op.
 *
 * Run with: tsx packages/db/scripts/sync-prompt-overrides.ts
 *
 * Idempotent.
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { planPromptSync, type PromptSyncRow } from "../src/promptSync.js";

const { Pool } = pg;

const source = process.env.PROMPT_SOURCE_DATABASE_URL;
const target = process.env.DATABASE_URL;

function sameDatabase(a: string, b: string): boolean {
  if (a === b) return true;
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.host === ub.host && ua.pathname === ub.pathname;
  } catch {
    return false;
  }
}

// Supabase terminates TLS with a certificate node-postgres will not verify;
// both databases live there, so both pools get the same treatment.
function makePool(connectionString: string) {
  return new Pool({
    connectionString,
    ...(process.env.DATABASE_SSL === "require" ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

interface DbRow {
  prompt_key: string;
  category: string;
  subcategory: string;
  system_prompt: string | null;
  user_prompt: string | null;
  updated_at: Date;
}

function toSyncRow(r: DbRow): PromptSyncRow {
  return {
    promptKey: r.prompt_key,
    category: r.category,
    subcategory: r.subcategory,
    systemPrompt: r.system_prompt,
    userPrompt: r.user_prompt,
    updatedAt: r.updated_at,
  };
}

const SELECT = `SELECT prompt_key, category, subcategory, system_prompt, user_prompt, updated_at FROM prompt_templates`;

async function main() {
  if (!source) {
    console.log("sync-prompt-overrides: PROMPT_SOURCE_DATABASE_URL is not set — skipping.");
    return;
  }
  if (!target) throw new Error("DATABASE_URL must be set");
  if (sameDatabase(source, target)) {
    throw new Error("PROMPT_SOURCE_DATABASE_URL points at this database; refusing to sync a database onto itself.");
  }

  const sourcePool = makePool(source);
  const targetPool = makePool(target);

  try {
    const sourceRows = (await sourcePool.query<DbRow>(SELECT)).rows.map(toSyncRow);
    // An empty source means staging was never bootstrapped or the URL is
    // wrong. Either way, wiping production's prompts is not the answer.
    if (sourceRows.length === 0) {
      throw new Error("Source prompt_templates is empty; refusing to delete every prompt on the target.");
    }

    const client = await targetPool.connect();
    try {
      await client.query("BEGIN");
      const targetRows = (await client.query<DbRow>(SELECT)).rows.map(toSyncRow);
      const plan = planPromptSync(sourceRows, targetRows);

      for (const row of plan.upserts) {
        await client.query(
          `INSERT INTO prompt_templates (id, category, subcategory, prompt_key, system_prompt, user_prompt, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (prompt_key) DO UPDATE SET
             category = EXCLUDED.category,
             subcategory = EXCLUDED.subcategory,
             system_prompt = EXCLUDED.system_prompt,
             user_prompt = EXCLUDED.user_prompt,
             updated_at = EXCLUDED.updated_at`,
          [randomUUID(), row.category, row.subcategory, row.promptKey, row.systemPrompt, row.userPrompt, row.updatedAt],
        );
      }
      if (plan.deletes.length > 0) {
        await client.query(`DELETE FROM prompt_templates WHERE prompt_key = ANY($1::text[])`, [plan.deletes]);
      }
      await client.query("COMMIT");

      console.log(
        `sync-prompt-overrides: ${plan.upserts.length} upserted, ${plan.deletes.length} deleted, ${plan.unchanged} unchanged (source ${sourceRows.length} rows).`,
      );
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await Promise.all([sourcePool.end(), targetPool.end()]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
