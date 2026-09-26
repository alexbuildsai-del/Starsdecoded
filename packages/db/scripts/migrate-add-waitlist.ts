/**
 * The pre-launch waitlist (ADR-141): waitlist_signups, one row per address,
 * unique on the lowercased email.
 *
 * Run with: tsx packages/db/scripts/migrate-add-waitlist.ts
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
    if (await tableExists(client, "waitlist_signups")) {
      console.log("Table waitlist_signups already exists — skipping.");
    } else {
      await client.query(`
        CREATE TABLE waitlist_signups (
          id           text PRIMARY KEY,
          email        text NOT NULL,
          consent      text NOT NULL,
          source       text,
          utm_source   text,
          utm_medium   text,
          utm_campaign text,
          created_at   timestamp NOT NULL DEFAULT now()
        );
      `);
      console.log("Created table waitlist_signups.");
    }
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_email_idx ON waitlist_signups(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS waitlist_signups_created_at_idx ON waitlist_signups(created_at)`);
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
