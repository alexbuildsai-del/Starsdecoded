/**
 * One-time migration: retire the meaning library.
 *
 * Drops the `meaning_library` table and removes its rows from
 * `prompt_templates`: the seven `meaning_library:*` prompt overrides and the
 * `__ml_active_version__` config row that lived there. The natal report now
 * composes from api/src/prompts/vocabulary.ts, so nothing reads this table.
 *
 * Run with: tsx packages/db/scripts/migrate-drop-meaning-library.ts
 *
 * Idempotent.
 */
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(`DROP TABLE IF EXISTS meaning_library`);
    console.log("meaning_library table dropped (if it existed).");

    const exists = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name='prompt_templates'`,
    );
    if (exists.rowCount === 0) return;
    const res = await client.query(
      `DELETE FROM prompt_templates
         WHERE prompt_key LIKE 'meaning_library:%' OR prompt_key = '__ml_active_version__'
       RETURNING prompt_key`,
    );
    console.log(`Removed ${res.rowCount} prompt_templates row(s) belonging to the meaning library.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
