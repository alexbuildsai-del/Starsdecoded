/**
 * Timeline's two tables: timeline_readings, each reader's reading of a sky
 * event, written once and kept (ADR-210); and ask_messages, a reader's chat
 * with Ask (ADR-213). Neither references another table, so each is made
 * whatever else exists. No subscriptions table: until billing the admin is
 * Timeline's one source, and billing's tables will mirror Stripe's webhooks
 * (ADR-262, MB-197, R-6.2).
 *
 * The schema push runs before this script and usually makes both first, so
 * the DDL is the schema's own, every name included, and whichever makes them
 * the other finds no drift.
 *
 * Run with: tsx packages/db/scripts/migrate-add-timeline.ts
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
      CREATE TABLE IF NOT EXISTS timeline_readings (
        id         text PRIMARY KEY NOT NULL,
        user_id    text NOT NULL,
        profile_id text NOT NULL,
        event_key  text NOT NULL,
        basis      text NOT NULL,
        status     text NOT NULL,
        reading    jsonb,
        model      text,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS timeline_readings_profile_id_event_key_idx ON timeline_readings (profile_id, event_key)`,
    );
    await client.query(`CREATE INDEX IF NOT EXISTS timeline_readings_user_id_idx ON timeline_readings (user_id)`);
    console.log("Table timeline_readings and its indexes present.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS ask_messages (
        id         text PRIMARY KEY NOT NULL,
        user_id    text NOT NULL,
        role       text NOT NULL,
        body       jsonb NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS ask_messages_user_id_created_at_idx ON ask_messages (user_id, created_at)`);
    console.log("Table ask_messages and its index present.");

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
