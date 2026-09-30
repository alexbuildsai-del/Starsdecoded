/**
 * Double opt-in for the waitlist (ADR-145): waitlist_signups gains
 * utm_content (ADR-147), confirmed_at, confirm_token_hash (unique) and
 * confirm_sent_at. Rows joined under launch-email-v1 came before the
 * confirmation link, so they read confirmed at their created_at, in the same
 * transaction that adds confirmed_at: the API deletes an address left
 * unconfirmed for seven days, and must never see those rows unconfirmed.
 *
 * Run with: tsx packages/db/scripts/migrate-waitlist-confirmation.ts
 *
 * Runs in step 1 of the bootstrap, before the schema push, which then finds
 * nothing to add. A database without the table is skipped: the push creates
 * it with these columns and has no rows to mark.
 *
 * Idempotent: Railway runs the bootstrap on every start (R-7.3).
 */
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

async function tableExists(client: pg.PoolClient, table: string): Promise<boolean> {
  const res = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name=$1`, [table]);
  return (res.rowCount ?? 0) > 0;
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ...(process.env.DATABASE_SSL === "require" ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  const client = await pool.connect();
  try {
    if (!(await tableExists(client, "waitlist_signups"))) {
      console.log("Table waitlist_signups does not exist yet — the schema push creates it with the confirmation columns.");
      return;
    }
    await client.query("BEGIN");
    try {
      await client.query(`ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS utm_content text`);
      await client.query(`ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS confirmed_at timestamp`);
      await client.query(`ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS confirm_token_hash text`);
      await client.query(`ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS confirm_sent_at timestamp`);
      await client.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_confirm_token_hash_idx ON waitlist_signups(confirm_token_hash)`,
      );
      const marked = await client.query(
        `UPDATE waitlist_signups SET confirmed_at = created_at WHERE consent = 'launch-email-v1' AND confirmed_at IS NULL`,
      );
      await client.query("COMMIT");
      console.log("Columns waitlist_signups.utm_content, confirmed_at, confirm_token_hash, confirm_sent_at present.");
      console.log(`Marked ${marked.rowCount ?? 0} launch-email-v1 rows confirmed at their created_at.`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
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
