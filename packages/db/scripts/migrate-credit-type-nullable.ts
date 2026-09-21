/**
 * One credit is one report (ADR-42): credits.credit_type is read nowhere from
 * R05 on. It becomes nullable with a default so new rows need not name a
 * kind; nothing is dropped and no row is touched. The column and the typed
 * bundles go with the payments round (MB-57).
 *
 * Run with: tsx packages/db/scripts/migrate-credit-type-nullable.ts
 *
 * Idempotent.
 */
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

async function columnExists(client: pg.PoolClient, table: string, column: string): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
    [table, column],
  );
  return (res.rowCount ?? 0) > 0;
}

async function tableExists(client: pg.PoolClient, table: string): Promise<boolean> {
  const res = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name=$1`, [table]);
  return (res.rowCount ?? 0) > 0;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    if (!(await tableExists(client, "credits")) || !(await columnExists(client, "credits", "credit_type"))) {
      console.log("credits.credit_type does not exist yet — drizzle push creates it nullable.");
      return;
    }
    await client.query(`ALTER TABLE credits ALTER COLUMN credit_type DROP NOT NULL`);
    await client.query(`ALTER TABLE credits ALTER COLUMN credit_type SET DEFAULT 'natal'`);
    console.log("credits.credit_type is nullable with default 'natal'. Migration complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
