/**
 * One-time migration: split monolithic `reports` table into `profiles` + `reports`.
 *
 * Run with: tsx lib/db/scripts/migrate-profile-split.ts
 *
 * Idempotent: safe to run multiple times; uses information_schema to skip
 * already-applied steps. Each existing report row becomes a profile + a
 * natal report referencing that profile, with no data loss. Legacy rows
 * are tagged with session_id = "legacy".
 */
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const LEGACY_SESSION_ID = "legacy";

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

    // 1. Create profiles table
    if (!(await tableExists(client, "profiles"))) {
      console.log("Creating profiles table...");
      await client.query(`
        CREATE TABLE profiles (
          id              text PRIMARY KEY,
          session_id      text NOT NULL,
          user_id         text,
          claimed_by_user_id text,
          name            text NOT NULL,
          birth_date      text NOT NULL,
          birth_time      text NOT NULL,
          birth_place     text NOT NULL,
          latitude        double precision NOT NULL,
          longitude       double precision NOT NULL,
          timezone_offset double precision NOT NULL,
          chart_data      jsonb,
          created_at      timestamp NOT NULL DEFAULT now(),
          updated_at      timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX profiles_session_id_idx ON profiles(session_id);
        CREATE INDEX profiles_user_id_idx ON profiles(user_id);
      `);
    } else {
      console.log("profiles table already exists, skipping create");
    }

    // On a truly empty DB, the `reports` table does not exist yet — drizzle
    // push will create it later from the current schema. Skip every
    // reports-touching step in that case.
    const reportsExists = await tableExists(client, "reports");

    // 2. Add new columns to reports (nullable initially for backfill)
    if (reportsExists && !(await columnExists(client, "reports", "profile_id"))) {
      console.log("Adding reports.profile_id, type, session_id...");
      await client.query(`
        ALTER TABLE reports ADD COLUMN profile_id text;
        ALTER TABLE reports ADD COLUMN type text NOT NULL DEFAULT 'natal';
        ALTER TABLE reports ADD COLUMN session_id text;
      `);
    }

    // 3. Backfill: for each legacy report still missing profile_id, create a profile.
    //    Preserve created_at on profile so it matches the original report timestamp.
    if (reportsExists && (await columnExists(client, "reports", "birth_date"))) {
      const { rows: legacy } = await client.query(`
        SELECT id, name, birth_date, birth_time, birth_place,
               latitude, longitude, timezone_offset,
               chart_data, created_at, updated_at
          FROM reports
         WHERE profile_id IS NULL
      `);
      console.log(`Backfilling ${legacy.length} legacy reports...`);
      for (const r of legacy) {
        const profileId = randomUUID();
        await client.query(
          `INSERT INTO profiles
             (id, session_id, name, birth_date, birth_time, birth_place,
              latitude, longitude, timezone_offset, chart_data,
              created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            profileId,
            LEGACY_SESSION_ID,
            r.name,
            r.birth_date,
            r.birth_time,
            r.birth_place,
            r.latitude,
            r.longitude,
            r.timezone_offset,
            r.chart_data,
            r.created_at,
            r.updated_at,
          ],
        );
        await client.query(
          `UPDATE reports SET profile_id=$1, session_id=$2 WHERE id=$3`,
          [profileId, LEGACY_SESSION_ID, r.id],
        );
      }
    }

    if (reportsExists) {
      // 4. Enforce NOT NULL + FK on the new columns now that they're populated.
      console.log("Enforcing NOT NULL constraints + FK...");
      await client.query(`ALTER TABLE reports ALTER COLUMN profile_id SET NOT NULL`);
      await client.query(`ALTER TABLE reports ALTER COLUMN session_id SET NOT NULL`);

      // Check by constrained columns rather than constraint name — drizzle
      // push may have created the same FK under a different generated name.
      const { rowCount: hasFk } = await client.query(`
        SELECT 1
          FROM information_schema.referential_constraints rc
          JOIN information_schema.key_column_usage kcu
            ON kcu.constraint_name = rc.constraint_name
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = rc.constraint_name
         WHERE kcu.table_name = 'reports'
           AND kcu.column_name = 'profile_id'
           AND ccu.table_name = 'profiles'
           AND ccu.column_name = 'id'
      `);
      if (!hasFk) {
        await client.query(`
          ALTER TABLE reports
            ADD CONSTRAINT reports_profile_id_fkey
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        `);
      }

      // 5. Drop the now-duplicated columns from reports.
      const droppable = [
        "name",
        "birth_date",
        "birth_time",
        "birth_place",
        "latitude",
        "longitude",
        "timezone_offset",
        "chart_data",
      ];
      for (const col of droppable) {
        if (await columnExists(client, "reports", col)) {
          console.log(`Dropping reports.${col}...`);
          await client.query(`ALTER TABLE reports DROP COLUMN ${col}`);
        }
      }

      // 6. Indexes on reports
      await client.query(
        `CREATE INDEX IF NOT EXISTS reports_profile_id_idx ON reports(profile_id)`,
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS reports_session_id_idx ON reports(session_id)`,
      );
    } else {
      console.log("reports table does not exist yet — skipping reports alter/backfill (drizzle push will create it).");
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
