/**
 * One-time migration: add `is_self` boolean column to the `profiles` table.
 *
 * Added in the Task #81 dashboard three-zone redesign. The column lets users
 * explicitly designate which profile is their own chart (set at report-creation
 * time via `isForSelf=true`). Defaults to false for all existing rows.
 *
 * After running this migration, run the backfill script to seed `is_self=true`
 * for existing unambiguous single-profile users:
 *   pnpm --filter @workspace/scripts run backfill:is-self
 *
 * Run with: tsx lib/db/scripts/migrate-add-profile-is-self.ts
 *
 * Idempotent.
 */
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

async function columnExists(
  client: pg.PoolClient,
  table: string,
  column: string,
): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
    [table, column],
  );
  return (res.rowCount ?? 0) > 0;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (await columnExists(client, "profiles", "is_self")) {
      console.log("Column profiles.is_self already exists — skipping.");
    } else {
      await client.query(`
        ALTER TABLE profiles
        ADD COLUMN is_self boolean NOT NULL DEFAULT false
      `);
      console.log("Added column profiles.is_self (default false).");
    }

    await client.query("COMMIT");
    console.log("Migration complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
