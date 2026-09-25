import { randomUUID } from "node:crypto";
import { eq, count, sql } from "drizzle-orm";
import { db, bundlesTable, creditsTable } from "@workspace/db";
import type { BundleKind } from "@workspace/db";
import { logger } from "./logger.js";

/**
 * One credit is one report, whatever the report (ADR-42): a bundle is a
 * count. The typed columns still exist and are read nowhere; they drop with
 * the payments round (MB-57), which is also when the soft pass below ends.
 */
export const BUNDLE_DEFINITIONS: Record<BundleKind, number> = {
  solo: 1,
  couple: 3,
  family: 5,
};

export async function grantBundle(
  userId: string,
  bundleKind: BundleKind,
): Promise<{ bundleId: string; credits: string[] }> {
  const bundleId = randomUUID();
  await db.insert(bundlesTable).values({
    id: bundleId,
    userId,
    bundleKind,
  });

  const creditRows = Array.from({ length: BUNDLE_DEFINITIONS[bundleKind] }, () => ({
    id: randomUUID(),
    userId,
    bundleId,
    status: "available" as const,
    usedForReportId: null,
  }));

  await db.insert(creditsTable).values(creditRows);

  return { bundleId, credits: creditRows.map((c) => c.id) };
}

export type CreditCounts = { available: number; used: number };

export async function getCredits(userId: string): Promise<CreditCounts> {
  const rows = await db
    .select({ status: creditsTable.status, total: count() })
    .from(creditsTable)
    .where(eq(creditsTable.userId, userId))
    .groupBy(creditsTable.status);

  const result: CreditCounts = { available: 0, used: 0 };
  for (const row of rows) {
    if (row.status === "available") result.available = Number(row.total);
    else if (row.status === "used") result.used = Number(row.total);
  }
  return result;
}

/**
 * Takes the oldest available credit for a report. Atomic via a CTE with
 * FOR UPDATE SKIP LOCKED, so two concurrent requests never claim the same
 * row. Nothing is sold yet, so a user with no credit passes with a warning;
 * the natal and the compatibility report run on the same footing until
 * payments (MB-6).
 */
export async function consumeCredit(userId: string, reportId: string): Promise<boolean> {
  const rows = await db.execute<{ id: string }>(sql`
    WITH cte AS (
      SELECT id
      FROM ${creditsTable}
      WHERE user_id = ${userId}
        AND status = 'available'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE ${creditsTable}
    SET status = 'used', used_for_report_id = ${reportId}
    WHERE id IN (SELECT id FROM cte)
    RETURNING id
  `);

  if (!rows.rows.length) {
    // MB-6 provisional: the soft pass ends the day payments go live.
    logger.warn({ userId, reportId }, "No available credit to consume — soft pass");
    return false;
  }

  return true;
}

/**
 * The credit a failed report used goes back to `available` (ADR-84).
 * Idempotent: a second call finds no used credit for the report and is a
 * no-op, so a retry of the failure path never refunds twice. Flips the
 * soft-pass ledger today; the payments round inherits the path (MB-6).
 */
export async function refundCredit(reportId: string): Promise<boolean> {
  const rows = await db.execute<{ id: string }>(sql`
    UPDATE ${creditsTable}
    SET status = 'available', used_for_report_id = NULL
    WHERE used_for_report_id = ${reportId}
      AND status = 'used'
    RETURNING id
  `);
  if (rows.rows.length) logger.info({ reportId, credits: rows.rows.length }, "credit refunded for a failed report");
  return rows.rows.length > 0;
}
