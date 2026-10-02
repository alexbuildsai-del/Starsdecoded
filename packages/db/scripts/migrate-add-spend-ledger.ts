/**
 * The spend ledger (ADR-199): spend_ledger, one row per UTC day and kind of
 * visitor generation, added to at every model call made for a visitor and
 * summed by the daily spend breaker.
 *
 * Run with: tsx packages/db/scripts/migrate-add-spend-ledger.ts
 *
 * Idempotent: Railway runs the bootstrap on every start (R-7.3). The DDL is the
 * schema's own, key name included, so whichever of this script and the schema
 * push creates the table, the other finds nothing to change.
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
    if (await tableExists(client, "spend_ledger")) {
      console.log("Table spend_ledger already exists — skipping.");
    } else {
      await client.query(`
        CREATE TABLE IF NOT EXISTS spend_ledger (
          day        date NOT NULL,
          kind       text NOT NULL,
          cost_usd   double precision NOT NULL,
          calls      integer NOT NULL,
          updated_at timestamp NOT NULL DEFAULT now(),
          CONSTRAINT spend_ledger_pkey PRIMARY KEY (day, kind)
        );
      `);
      console.log("Created table spend_ledger.");
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
