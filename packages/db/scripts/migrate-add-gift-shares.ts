/**
 * What sharing around a gift and Copy their link keep (ADR-331, 390): invite_tokens.giver_shares, the giver's Yes to
 * "Share your report with {name} too?"; invite_tokens.share_back, the recipient's Yes at the claim, kept until their
 * own Personal report is finished; and invite_tokens.link_hash, the hash of the link Copy their link last gave, with
 * its unique index. Every gift and link from before reads Not now, with no copied link.
 *
 * Runs in step 3 of the bootstrap, after the schema push, which usually adds all of them first. The push asks nothing
 * here although invite_tokens holds rows on every host: each new column has a default, and the index is not a
 * constraint. The push is only the safety net, so this still runs; the names are the schema's own, so neither finds
 * drift after the other. On a database without the table it does nothing.
 *
 * Run with: tsx packages/db/scripts/migrate-add-gift-shares.ts
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
    if (!(await tableExists(client, "invite_tokens"))) {
      console.log("Table invite_tokens does not exist yet — the schema push creates it with these columns.");
    } else {
      // One transaction, so a failure leaves the table as it was and the next start tries again.
      await client.query("BEGIN");
      try {
        await client.query(`ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS giver_shares boolean NOT NULL DEFAULT false`);
        await client.query(`ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS share_back boolean NOT NULL DEFAULT false`);
        await client.query(`ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS link_hash text`);
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS invite_tokens_link_hash_idx ON invite_tokens (link_hash)`);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
      console.log("Columns invite_tokens.giver_shares, share_back and link_hash, and its unique index, present.");
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
