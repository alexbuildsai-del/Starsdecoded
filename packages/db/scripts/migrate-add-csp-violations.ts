/**
 * The CSP's counts (ADR-198): csp_violations, one row per UTC day, directive
 * and blocked host or keyword, added to by POST /api/csp-report and read by the
 * admin's Failures tab.
 *
 * Run with: tsx packages/db/scripts/migrate-add-csp-violations.ts
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
    if (await tableExists(client, "csp_violations")) {
      console.log("Table csp_violations already exists — skipping.");
    } else {
      await client.query(`
        CREATE TABLE IF NOT EXISTS csp_violations (
          day       date NOT NULL,
          directive text NOT NULL,
          blocked   text NOT NULL,
          count     integer NOT NULL,
          last_seen timestamp NOT NULL DEFAULT now(),
          CONSTRAINT csp_violations_pkey PRIMARY KEY (day, directive, blocked)
        );
      `);
      console.log("Created table csp_violations.");
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
