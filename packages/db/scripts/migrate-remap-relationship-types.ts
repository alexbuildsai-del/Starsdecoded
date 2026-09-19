/**
 * Three lenses (ADR-40): relationships.type becomes partners, parent_child or
 * family. romantic → partners, sibling and custom → family, the label kept.
 * Participants are untouched.
 *
 * Run with: tsx packages/db/scripts/migrate-remap-relationship-types.ts
 *
 * Idempotent: a remapped row matches nothing on the next run.
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

const REMAP: Array<[string, string]> = [
  ["romantic", "partners"],
  ["sibling", "family"],
  ["custom", "family"],
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    if (!(await tableExists(client, "relationships"))) {
      console.log("relationships does not exist yet — nothing to remap.");
      return;
    }
    await client.query("BEGIN");
    for (const [from, to] of REMAP) {
      const res = await client.query(`UPDATE relationships SET type = $2, updated_at = now() WHERE type = $1`, [from, to]);
      if (res.rowCount) console.log(`Remapped ${res.rowCount} relationship(s) ${from} → ${to}.`);
    }
    await client.query(`ALTER TABLE relationships ALTER COLUMN type SET DEFAULT 'family'`);
    await client.query("COMMIT");
    console.log("Migration complete.");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
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
