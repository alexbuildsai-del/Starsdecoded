/**
 * The report lab's tables (ADR-52, ADR-53): lab_runs, one row per run and
 * section, and lab_judgements, one row per reading-room card.
 *
 * Run with: tsx packages/db/scripts/migrate-add-lab-tables.ts
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
    if (await tableExists(client, "lab_runs")) {
      console.log("Table lab_runs already exists — skipping.");
    } else {
      await client.query(`
        CREATE TABLE lab_runs (
          id               text PRIMARY KEY,
          run_key          text NOT NULL,
          fixture          text NOT NULL,
          label            text NOT NULL,
          source           text NOT NULL DEFAULT 'lab',
          base_run_key     text,
          base_report_id   text,
          section          text NOT NULL,
          model            text NOT NULL,
          reasoning_effort text,
          service_tier     text NOT NULL DEFAULT 'standard',
          status           text NOT NULL DEFAULT 'done',
          error            text,
          output           jsonb,
          chart            jsonb,
          subject_name     text,
          usage            jsonb,
          faults           jsonb NOT NULL DEFAULT '[]'::jsonb,
          words            integer NOT NULL DEFAULT 0,
          cost_usd         double precision,
          seconds          double precision,
          session_id       text,
          created_at       timestamp NOT NULL DEFAULT now()
        );
      `);
      console.log("Created table lab_runs.");
    }
    // Indexes are created on their own so a table created by drizzle push
    // before this script ran still gets them.
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS lab_runs_run_key_section_idx ON lab_runs(run_key, section)`);
    await client.query(`CREATE INDEX IF NOT EXISTS lab_runs_run_key_idx ON lab_runs(run_key)`);
    await client.query(`CREATE INDEX IF NOT EXISTS lab_runs_session_id_idx ON lab_runs(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS lab_runs_created_at_idx ON lab_runs(created_at)`);

    if (await tableExists(client, "lab_judgements")) {
      console.log("Table lab_judgements already exists — skipping.");
    } else {
      await client.query(`
        CREATE TABLE lab_judgements (
          id            text PRIMARY KEY,
          session_id    text NOT NULL,
          session_label text NOT NULL,
          fixture       text NOT NULL,
          section       text NOT NULL,
          card_index    integer NOT NULL,
          variants      jsonb NOT NULL DEFAULT '[]'::jsonb,
          picks         jsonb,
          note          text,
          judged_at     timestamp,
          revealed_at   timestamp,
          created_at    timestamp NOT NULL DEFAULT now()
        );
      `);
      console.log("Created table lab_judgements.");
    }
    await client.query(`CREATE INDEX IF NOT EXISTS lab_judgements_session_id_idx ON lab_judgements(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS lab_judgements_created_at_idx ON lab_judgements(created_at)`);
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
