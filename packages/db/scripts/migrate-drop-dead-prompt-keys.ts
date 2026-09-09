/**
 * One-time migration: remove `prompt_templates` overrides for the V1 natal
 * prompt keys deleted from promptDefaults.ts.
 *
 * These 14 keys had no runtime caller — `generateInterpretation` derives the
 * legacy output fields from the V2 sections instead — but stored overrides kept
 * them editable in /admin/prompts, implying a report section that no longer
 * exists.
 *
 * Run with: tsx packages/db/scripts/migrate-drop-dead-prompt-keys.ts
 *
 * Idempotent.
 */
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const DEAD_SECTIONS = [
  "archetype",
  "core_triad",
  "strengths",
  "final_summary",
  "aspects_dynamic",
  "nodes",
  "elements_modalities",
] as const;

const DEAD_KEYS = DEAD_SECTIONS.flatMap((s) => [`natal:${s}:system`, `natal:${s}:user`]);

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const exists = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name='prompt_templates'`,
    );
    if (exists.rowCount === 0) {
      console.log("prompt_templates does not exist — nothing to do.");
      return;
    }

    const res = await client.query(
      `DELETE FROM prompt_templates WHERE prompt_key = ANY($1::text[]) RETURNING prompt_key`,
      [DEAD_KEYS],
    );

    if (res.rowCount === 0) {
      console.log(`No dead prompt overrides found (checked ${DEAD_KEYS.length} keys).`);
    } else {
      console.log(`Removed ${res.rowCount} dead prompt override(s):`);
      for (const row of res.rows) console.log(`  - ${row.prompt_key}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
