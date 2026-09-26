/**
 * The columns Send, Gift and the test checkout need (ADR-120, 123, 138, 139;
 * MB-81, 83): profiles.claimed_as_self; invite_tokens gains kind (send |
 * gift), a nullable profile_id (a gift has no profile), credit_id,
 * recipient_name, note, reminded_at, revoked_at and an index on
 * (created_by_user_id, kind); bundles.is_test and credits.is_test. Existing
 * rows read kind='send', claimed_as_self=false, is_test=false. No
 * gifted_by_user_id column: a gift grants no reading (ADR-139).
 *
 * Run with: tsx packages/db/scripts/migrate-add-send-and-gift.ts
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

async function columnIsNotNull(client: pg.PoolClient, table: string, column: string): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2 AND is_nullable='NO'`,
    [table, column],
  );
  return (res.rowCount ?? 0) > 0;
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ...(process.env.DATABASE_SSL === "require" ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  const client = await pool.connect();
  try {
    if (await tableExists(client, "profiles")) {
      await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS claimed_as_self boolean NOT NULL DEFAULT false`);
      console.log("Column profiles.claimed_as_self present.");
    } else {
      console.log("Table profiles does not exist yet — the schema push creates it with claimed_as_self.");
    }

    if (await tableExists(client, "invite_tokens")) {
      await client.query(`ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'send'`);
      await client.query(`ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS recipient_name text`);
      await client.query(`ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS note text`);
      await client.query(`ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS reminded_at timestamp`);
      await client.query(`ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS revoked_at timestamp`);
      console.log("Columns invite_tokens.kind, recipient_name, note, reminded_at, revoked_at present.");

      // credit_id references credits(id), so credits must exist first (it does
      // by this point: both tables are created together, above, in schema order).
      if (await tableExists(client, "credits")) {
        await client.query(
          `ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS credit_id text REFERENCES credits(id) ON DELETE SET NULL`,
        );
        console.log("Column invite_tokens.credit_id present.");
      } else {
        console.log("Table credits does not exist yet — the schema push creates invite_tokens.credit_id with it.");
      }

      // A gift has no profile (ADR-139); only widen the constraint, never narrow it.
      if (await columnIsNotNull(client, "invite_tokens", "profile_id")) {
        await client.query(`ALTER TABLE invite_tokens ALTER COLUMN profile_id DROP NOT NULL`);
        console.log("Dropped NOT NULL on invite_tokens.profile_id.");
      } else {
        console.log("invite_tokens.profile_id already nullable — skipping.");
      }

      await client.query(
        `CREATE INDEX IF NOT EXISTS invite_tokens_created_by_user_id_kind_idx ON invite_tokens(created_by_user_id, kind)`,
      );
    } else {
      console.log("Table invite_tokens does not exist yet — the schema push creates it with these columns.");
    }

    if (await tableExists(client, "bundles")) {
      await client.query(`ALTER TABLE bundles ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false`);
      console.log("Column bundles.is_test present.");
    } else {
      console.log("Table bundles does not exist yet — the schema push creates it with is_test.");
    }

    if (await tableExists(client, "credits")) {
      await client.query(`ALTER TABLE credits ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false`);
      console.log("Column credits.is_test present.");
    } else {
      console.log("Table credits does not exist yet — the schema push creates it with is_test.");
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
