/**
 * What sharing, the handback and per-reader workbooks need (ADR-235, 236,
 * 239): profile_shares, a reader's grant to read someone's own Personal
 * report; report_workbooks, each reader's own ticks and pins; and
 * invite_tokens.handed_back_at. A share invite is invite_tokens.kind 'share',
 * plain text, so it needs no DDL.
 *
 * The schema push runs before this script and usually makes all three first,
 * so the DDL is the schema's own, every name included, and the backfill runs
 * whichever made report_workbooks. It copies each report's non-empty
 * reports.workbook to the report's holder: a natal report's profile user_id,
 * a pair's relationship user_id, else `session:` and the report's session.
 * A report that already has a reader's row is skipped, so a later run never
 * hands one reader's old ticks to whoever holds the report by then.
 *
 * Run with: tsx packages/db/scripts/migrate-add-shares-and-workbooks.ts
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

async function columnExists(client: pg.PoolClient, table: string, column: string): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
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
    if (await tableExists(client, "invite_tokens")) {
      await client.query(`ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS handed_back_at timestamp`);
      console.log("Column invite_tokens.handed_back_at present.");
    } else {
      console.log("Table invite_tokens does not exist yet — the schema push creates it with handed_back_at.");
    }

    if ((await tableExists(client, "profiles")) && (await tableExists(client, "invite_tokens"))) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS profile_shares (
          id             text PRIMARY KEY NOT NULL,
          profile_id     text NOT NULL,
          owner_user_id  text NOT NULL,
          reader_user_id text NOT NULL,
          invite_id      text,
          created_at     timestamp NOT NULL DEFAULT now(),
          revoked_at     timestamp,
          CONSTRAINT profile_shares_profile_id_profiles_id_fk
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
          CONSTRAINT profile_shares_invite_id_invite_tokens_id_fk
            FOREIGN KEY (invite_id) REFERENCES invite_tokens(id) ON DELETE SET NULL
        );
      `);
      await client.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS profile_shares_profile_id_reader_user_id_idx ON profile_shares (profile_id, reader_user_id) WHERE revoked_at IS NULL`,
      );
      await client.query(`CREATE INDEX IF NOT EXISTS profile_shares_reader_user_id_idx ON profile_shares (reader_user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS profile_shares_owner_user_id_idx ON profile_shares (owner_user_id)`);
      console.log("Table profile_shares and its indexes present.");
    } else {
      console.log("Tables profiles and invite_tokens do not both exist yet — the schema push creates profile_shares with them.");
    }

    if (!(await tableExists(client, "reports"))) {
      console.log("Table reports does not exist yet — the schema push creates report_workbooks with it.");
    } else {
      await client.query(`
        CREATE TABLE IF NOT EXISTS report_workbooks (
          report_id  text NOT NULL,
          reader     text NOT NULL,
          workbook   jsonb NOT NULL DEFAULT '{}'::jsonb,
          updated_at timestamp NOT NULL DEFAULT now(),
          CONSTRAINT report_workbooks_pkey PRIMARY KEY (report_id, reader),
          CONSTRAINT report_workbooks_report_id_reports_id_fk
            FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
        );
      `);
      console.log("Table report_workbooks present.");

      // Once reports.workbook is dropped (MB-195) there is nothing left to copy.
      const source =
        (await columnExists(client, "reports", "workbook")) &&
        (await tableExists(client, "profiles")) &&
        (await tableExists(client, "relationships"));
      if (!source) {
        console.log("No reports.workbook to copy from — backfill skipped.");
      } else {
        const copied = await client.query(`
          INSERT INTO report_workbooks (report_id, reader, workbook)
          SELECT r.id,
                 COALESCE(CASE WHEN r.type = 'natal' THEN p.user_id ELSE rel.user_id END, 'session:' || r.session_id),
                 r.workbook
          FROM reports r
          LEFT JOIN profiles p ON p.id = r.profile_id
          LEFT JOIN relationships rel ON rel.id = r.relationship_id
          WHERE jsonb_typeof(r.workbook) = 'object'
            AND r.workbook <> '{}'::jsonb
            AND NOT EXISTS (SELECT 1 FROM report_workbooks w WHERE w.report_id = r.id)
          ON CONFLICT DO NOTHING
        `);
        console.log(`Copied ${copied.rowCount ?? 0} report workbook(s) to their holders.`);
      }
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
