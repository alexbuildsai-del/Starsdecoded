/**
 * The horizon pass (ADR-35): reports.horizon_passes counts the passes run on a
 * report, and report_revisions keeps what the report said before each one.
 *
 * Run with: tsx packages/db/scripts/migrate-add-report-revisions.ts
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
    if (!(await tableExists(client, "reports"))) {
      console.log("reports does not exist yet — drizzle push creates it and report_revisions.");
      return;
    }
    if (await columnExists(client, "reports", "horizon_passes")) {
      console.log("Column reports.horizon_passes already exists — skipping.");
    } else {
      await client.query(`ALTER TABLE reports ADD COLUMN horizon_passes integer NOT NULL DEFAULT 0`);
      console.log("Added column reports.horizon_passes (default 0).");
    }
    if (await tableExists(client, "report_revisions")) {
      console.log("Table report_revisions already exists — skipping.");
    } else {
      await client.query(`
        CREATE TABLE report_revisions (
          id             text PRIMARY KEY,
          report_id      text NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
          interpretation jsonb NOT NULL,
          chart_data     jsonb,
          reason         text NOT NULL,
          created_at     timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX report_revisions_report_id_idx ON report_revisions(report_id);
      `);
      console.log("Created table report_revisions.");
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
