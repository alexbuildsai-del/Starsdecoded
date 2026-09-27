/**
 * The failure log and the release record (ADR-84 to 86): generation_failures,
 * one row per check outcome on a section write; lab_releases, one row per
 * release started from the admin panel; and reports.failure_code, the reason
 * a failed report shows its customer.
 *
 * Run with: tsx packages/db/scripts/migrate-add-failures-and-releases.ts
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
    if (await tableExists(client, "generation_failures")) {
      console.log("Table generation_failures already exists — skipping.");
    } else {
      await client.query(`
        CREATE TABLE generation_failures (
          id         text PRIMARY KEY,
          kind       text NOT NULL,
          section    text NOT NULL,
          rule_id    text NOT NULL,
          class      text NOT NULL,
          message    text NOT NULL DEFAULT '',
          model      text NOT NULL,
          attempt    integer NOT NULL DEFAULT 1,
          final      boolean NOT NULL DEFAULT false,
          write_id   text NOT NULL,
          report_id  text,
          created_at timestamp NOT NULL DEFAULT now()
        );
      `);
      console.log("Created table generation_failures.");
    }
    await client.query(`CREATE INDEX IF NOT EXISTS generation_failures_section_created_at_idx ON generation_failures(section, created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS generation_failures_rule_id_idx ON generation_failures(rule_id)`);

    if (await tableExists(client, "lab_releases")) {
      console.log("Table lab_releases already exists — skipping.");
    } else {
      await client.query(`
        CREATE TABLE lab_releases (
          id             text PRIMARY KEY,
          sha            text NOT NULL,
          production_sha text,
          brain_changed  boolean NOT NULL DEFAULT false,
          pair_changed   boolean NOT NULL DEFAULT false,
          status         text NOT NULL DEFAULT 'running',
          steps          jsonb NOT NULL DEFAULT '[]'::jsonb,
          qa             jsonb,
          error          text,
          created_at     timestamp NOT NULL DEFAULT now(),
          updated_at     timestamp NOT NULL DEFAULT now()
        );
      `);
      console.log("Created table lab_releases.");
    }
    await client.query(`CREATE INDEX IF NOT EXISTS lab_releases_created_at_idx ON lab_releases(created_at)`);

    if (await tableExists(client, "reports")) {
      await client.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS failure_code text`);
      console.log("Column reports.failure_code present.");
    } else {
      console.log("Table reports does not exist yet — the schema push creates it with failure_code.");
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
