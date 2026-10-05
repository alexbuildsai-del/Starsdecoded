/**
 * The payments round's changes to tables that already hold rows (ADR-275 to
 * 277, 313): users.stripe_customer_id, unique; bundles.source and
 * bundles.purchase_id, unique; reports.failed_tries and reports.failed_at;
 * credits.credit_type dropped, read nowhere since ADR-42 (MB-57, closed by
 * ADR-275).
 *
 * Run with: tsx packages/db/scripts/migrate-payments-columns.ts
 *
 * Runs in step 1 of the bootstrap, before the schema push: the push stops to
 * ask before it drops a column that holds rows or puts a unique index over
 * them, and a deploy has no one to answer (MB-123's kind of failure). The
 * push then finds nothing to change on these tables. A database without a
 * table is skipped: the push creates it with these columns and no rows.
 *
 * Each backfill runs in the transaction that adds its column, and only then,
 * so it touches only rows from before this round: an old test-checkout bundle
 * reads source 'test', and a report that failed under the old rule, its credit
 * already back, reads failed_tries 3, which is final (ADR-313). A later run
 * finds the columns and leaves every row as it is, so a sandbox purchase or a
 * report failing for the first time is never marked. One transaction holds
 * every change, so a failure leaves the database as it was.
 *
 * Idempotent: Railway runs the bootstrap on every start (R-7.3).
 */
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// MAX_TRIES in the API's failureReasons.ts; this script cannot import the API.
const FINAL_TRIES = 3;

async function tableExists(client: pg.PoolClient, table: string): Promise<boolean> {
  const res = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name=$1`, [table]);
  return (res.rowCount ?? 0) > 0;
}

async function columnExists(client: pg.PoolClient, table: string, column: string): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
    [table, column],
  );
  return (res.rowCount ?? 0) > 0;
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ...(process.env.DATABASE_SSL === "require" ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    try {
      if (await tableExists(client, "users")) {
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text`);
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_idx ON users (stripe_customer_id)`);
        console.log("Column users.stripe_customer_id and its unique index present.");
      } else {
        console.log("Table users does not exist yet — the schema push creates it with stripe_customer_id.");
      }

      if (await tableExists(client, "bundles")) {
        const hadSource = await columnExists(client, "bundles", "source");
        await client.query(`ALTER TABLE bundles ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'purchase'`);
        // Without is_test no test checkout ever ran here, so every bundle is a purchase.
        if (!hadSource && (await columnExists(client, "bundles", "is_test"))) {
          const marked = await client.query(`UPDATE bundles SET source = 'test' WHERE is_test`);
          console.log(`Marked ${marked.rowCount ?? 0} test-checkout bundles source 'test'.`);
        }
        await client.query(`ALTER TABLE bundles ADD COLUMN IF NOT EXISTS purchase_id text`);
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS bundles_purchase_id_idx ON bundles (purchase_id)`);
        console.log("Columns bundles.source and bundles.purchase_id, and its unique index, present.");
      } else {
        console.log("Table bundles does not exist yet — the schema push creates it with source and purchase_id.");
      }

      if (await tableExists(client, "reports")) {
        const hadTries = await columnExists(client, "reports", "failed_tries");
        await client.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS failed_tries integer NOT NULL DEFAULT 0`);
        await client.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS failed_at timestamp with time zone`);
        if (!hadTries) {
          // updated_at is stamped when a report fails, in UTC as the API writes every timestamp.
          const marked = await client.query(
            `UPDATE reports SET failed_tries = $1, failed_at = updated_at AT TIME ZONE 'UTC' WHERE status = 'failed'`,
            [FINAL_TRIES],
          );
          console.log(`Marked ${marked.rowCount ?? 0} reports that failed before this round final.`);
        }
        console.log("Columns reports.failed_tries and reports.failed_at present.");
      } else {
        console.log("Table reports does not exist yet — the schema push creates it with failed_tries and failed_at.");
      }

      if (await tableExists(client, "credits")) {
        await client.query(`ALTER TABLE credits DROP COLUMN IF EXISTS credit_type`);
        console.log("Column credits.credit_type absent.");
      } else {
        console.log("Table credits does not exist yet — the schema push creates it without credit_type.");
      }

      await client.query("COMMIT");
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
