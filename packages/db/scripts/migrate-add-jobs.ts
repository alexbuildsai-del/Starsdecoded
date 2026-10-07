/**
 * The round's three tables: jobs, the queue the API works (ADR-357);
 * timeline_setups, each subscriber's Timeline setup and its six months
 * (ADR-302, 362); and qa_shots, one picture per step of the staging walk's
 * newest walk (ADR-360). None references another table, so each is made
 * whatever else exists, and no existing table changes, so step 1 has nothing
 * new.
 *
 * The schema push runs before this script and usually makes all three first,
 * so the DDL is the schema's own, every name included, and whichever makes them
 * the other finds no drift.
 *
 * Run with: tsx packages/db/scripts/migrate-add-jobs.ts
 *
 * Idempotent: Railway runs the bootstrap on every start (R-7.3).
 */
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ...(process.env.DATABASE_SSL === "require" ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id           uuid PRIMARY KEY NOT NULL,
        kind         text NOT NULL,
        payload      jsonb NOT NULL,
        dedupe_key   text,
        status       text NOT NULL,
        run_at       timestamp with time zone NOT NULL DEFAULT now(),
        attempts     integer NOT NULL DEFAULT 0,
        max_attempts integer NOT NULL DEFAULT 5,
        locked_until timestamp with time zone,
        last_error   text,
        created_at   timestamp with time zone NOT NULL DEFAULT now(),
        updated_at   timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    // A key may be queued again once its job is done or failed, so it is unique only while one waits or runs.
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS jobs_dedupe_key_idx ON jobs (dedupe_key) WHERE status IN ('queued', 'running')`,
    );
    await client.query(`CREATE INDEX IF NOT EXISTS jobs_status_run_at_idx ON jobs (status, run_at)`);
    console.log("Table jobs and its indexes present.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS timeline_setups (
        user_id        text PRIMARY KEY NOT NULL,
        report_id      text NOT NULL,
        from_day       date NOT NULL,
        to_day         date NOT NULL,
        state          text NOT NULL,
        started_at     timestamp with time zone NOT NULL DEFAULT now(),
        ready_at       timestamp with time zone,
        replay_from    date,
        replay_to      date,
        replay_seen_at timestamp with time zone,
        updated_at     timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Table timeline_setups present.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS qa_shots (
        step     text PRIMARY KEY NOT NULL,
        walk_id  text NOT NULL,
        jpeg     bytea NOT NULL,
        taken_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Table qa_shots present.");

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
