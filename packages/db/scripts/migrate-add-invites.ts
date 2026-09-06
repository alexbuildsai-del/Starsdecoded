/**
 * One-time migration: add the `invite_tokens` table and the `access_role`
 * column on `relationship_participants` for the synastry invite/claim flow.
 *
 * Run with: tsx lib/db/scripts/migrate-add-invites.ts
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

    if (!(await columnExists(client, "relationship_participants", "access_role"))) {
      console.log("Adding relationship_participants.access_role...");
      await client.query(
        `ALTER TABLE relationship_participants ADD COLUMN access_role text NOT NULL DEFAULT 'owner'`,
      );
    }

    if (!(await tableExists(client, "invite_tokens"))) {
      console.log("Creating invite_tokens table...");
      await client.query(`
        CREATE TABLE invite_tokens (
          id                     text PRIMARY KEY,
          token_hash             text NOT NULL UNIQUE,
          email                  text NOT NULL,
          profile_id             text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          relationship_id        text REFERENCES relationships(id) ON DELETE CASCADE,
          created_by_user_id     text,
          created_by_session_id  text,
          expires_at             timestamp NOT NULL,
          claimed_at             timestamp,
          claimed_by_user_id     text,
          created_at             timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX invite_tokens_token_hash_idx ON invite_tokens(token_hash);
        CREATE INDEX invite_tokens_profile_id_idx ON invite_tokens(profile_id);
        CREATE INDEX invite_tokens_relationship_id_idx ON invite_tokens(relationship_id);
      `);
    } else if (await columnExists(client, "invite_tokens", "token")) {
      // Pre-hash schema: rename column. Existing rows are dropped because the
      // plaintext-stored values are no longer usable as hashes.
      console.log("Migrating invite_tokens.token -> token_hash...");
      await client.query(`TRUNCATE TABLE invite_tokens`);
      await client.query(`ALTER TABLE invite_tokens RENAME COLUMN token TO token_hash`);
      await client.query(`DROP INDEX IF EXISTS invite_tokens_token_idx`);
      await client.query(
        `CREATE INDEX IF NOT EXISTS invite_tokens_token_hash_idx ON invite_tokens(token_hash)`,
      );
    }

    await client.query("COMMIT");
    console.log("Migration complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
