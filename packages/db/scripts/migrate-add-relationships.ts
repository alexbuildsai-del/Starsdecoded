/**
 * One-time migration: add `relationships` + `relationship_participants` tables
 * and `relationship_id` + `compute_data` columns on `reports`.
 *
 * Run with: tsx lib/db/scripts/migrate-add-relationships.ts
 *
 * Idempotent.
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

async function columnExists(
  client: pg.PoolClient,
  table: string,
  column: string,
): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
    [table, column],
  );
  return res.rowCount! > 0;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (!(await tableExists(client, "relationships"))) {
      console.log("Creating relationships table...");
      await client.query(`
        CREATE TABLE relationships (
          id          text PRIMARY KEY,
          session_id  text NOT NULL,
          user_id     text,
          type        text NOT NULL DEFAULT 'custom',
          label       text,
          created_at  timestamp NOT NULL DEFAULT now(),
          updated_at  timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX relationships_session_id_idx ON relationships(session_id);
        CREATE INDEX relationships_user_id_idx ON relationships(user_id);
      `);
    }

    if (!(await tableExists(client, "relationship_participants"))) {
      console.log("Creating relationship_participants table...");
      await client.query(`
        CREATE TABLE relationship_participants (
          id              text PRIMARY KEY,
          relationship_id text NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
          profile_id      text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          role            text NOT NULL DEFAULT 'primary',
          position        text NOT NULL DEFAULT '0',
          created_at      timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX rp_relationship_id_idx ON relationship_participants(relationship_id);
        CREATE INDEX rp_profile_id_idx ON relationship_participants(profile_id);
      `);
    }

    // On a truly empty DB, `reports` does not exist yet — drizzle push will
    // create it with the columns already in the schema. Skip the alters.
    const reportsExists = await tableExists(client, "reports");

    if (reportsExists && !(await columnExists(client, "reports", "relationship_id"))) {
      console.log("Adding reports.relationship_id...");
      await client.query(
        `ALTER TABLE reports ADD COLUMN relationship_id text;
         CREATE INDEX reports_relationship_id_idx ON reports(relationship_id);`,
      );
    }

    if (reportsExists && !(await columnExists(client, "reports", "compute_data"))) {
      console.log("Adding reports.compute_data...");
      await client.query(`ALTER TABLE reports ADD COLUMN compute_data jsonb`);
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
