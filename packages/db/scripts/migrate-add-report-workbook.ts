/**
 * Add `workbook` to `reports`: the reader's ticked actions, saved on the report
 * so the same owner sees them in any browser (ADR-24).
 *
 * Run with: tsx packages/db/scripts/migrate-add-report-workbook.ts
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
    const existing = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='workbook'`,
    );
    if ((existing.rowCount ?? 0) > 0) {
      console.log("Column reports.workbook already exists — skipping.");
    } else {
      await client.query(`ALTER TABLE reports ADD COLUMN workbook jsonb NOT NULL DEFAULT '{}'::jsonb`);
      console.log("Added column reports.workbook (default {}).");
    }
    console.log("Migration complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
