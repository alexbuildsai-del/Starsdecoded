// Backfill is_self on the profiles table.
//
// The `is_self` column was added in the dashboard three-zone redesign (Task #81).
// New profiles get the column set at creation time (via the isForSelf flag in
// POST /api/reports). This script handles existing rows that predate the column.
//
// Backfill rule (conservative / unambiguous-only):
//   For each distinct userId, if that user owns EXACTLY ONE profile, mark it
//   isSelf=true. If they own multiple profiles the ownership is ambiguous, so
//   we leave all rows as false — Zone 1 will show the "Generate My Chart" CTA
//   which is the correct fallback per the product requirement.
//
// The script is idempotent: rows already marked isSelf=true are not touched.
//
// Usage:
//   pnpm --filter @workspace/scripts run backfill:is-self
//
// Run this once after deploying the Task #81 schema migration.

import { pool } from "@workspace/db";

async function backfill() {
  console.log("Backfilling profiles.is_self …");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Find all userId values that appear on exactly one profile (unambiguous).
    const { rows: unambiguousUsers } = await client.query<{ user_id: string }>(`
      SELECT user_id
      FROM profiles
      WHERE user_id IS NOT NULL
        AND is_self = false
      GROUP BY user_id
      HAVING count(*) = 1
    `);

    if (unambiguousUsers.length === 0) {
      console.log("No unambiguous single-profile users found. Nothing to update.");
      await client.query("COMMIT");
      return;
    }

    console.log(`Found ${unambiguousUsers.length} unambiguous user(s). Updating…`);

    const userIds = unambiguousUsers.map((r) => r.user_id);

    const { rowCount } = await client.query(
      `UPDATE profiles
       SET is_self = true, updated_at = NOW()
       WHERE user_id = ANY($1::text[])
         AND is_self = false`,
      [userIds],
    );

    await client.query("COMMIT");
    console.log(`Done. Updated ${rowCount ?? 0} profile(s).`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
