/**
 * Birth time as a window (ADR-33) and the zone the offset derives from (MB-48):
 * profiles.timezone and profiles.birth_time_window_minutes, default 0 so every
 * existing row reads as an exact time.
 *
 * Run with: tsx packages/db/scripts/migrate-add-birth-time-window.ts
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
    if (!(await tableExists(client, "profiles"))) {
      console.log("profiles does not exist yet — drizzle push creates it with these columns.");
      return;
    }
    if (await columnExists(client, "profiles", "timezone")) {
      console.log("Column profiles.timezone already exists — skipping.");
    } else {
      await client.query(`ALTER TABLE profiles ADD COLUMN timezone text`);
      console.log("Added column profiles.timezone.");
    }
    if (await columnExists(client, "profiles", "birth_time_window_minutes")) {
      console.log("Column profiles.birth_time_window_minutes already exists — skipping.");
    } else {
      await client.query(`ALTER TABLE profiles ADD COLUMN birth_time_window_minutes integer NOT NULL DEFAULT 0`);
      console.log("Added column profiles.birth_time_window_minutes (default 0).");
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
