/**
 * One-time migration: add `users` table for Clerk-backed accounts.
 *
 * Run with: tsx lib/db/scripts/migrate-add-users.ts
 *
 * Idempotent: safe to run multiple times.
 */
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

async function tableExists(client: pg.PoolClient, table: string): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name=$1`,
    [table],
  );
  return res.rowCount! > 0;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (!(await tableExists(client, "users"))) {
      console.log("Creating users table...");
      await client.query(`
        CREATE TABLE users (
          id         text PRIMARY KEY,
          email      text,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        );
      `);
    } else {
      console.log("users table already exists, skipping create");
    }

    await client.query("COMMIT");
    console.log("Migration complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
