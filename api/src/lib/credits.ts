import { randomUUID } from "node:crypto";
import { and, eq, count, sql } from "drizzle-orm";
import { db, bundlesTable, creditsTable } from "@workspace/db";
import type { BundleKind, CreditType } from "@workspace/db";
import { logger } from "./logger.js";

export const BUNDLE_DEFINITIONS: Record<BundleKind, CreditType[]> = {
  solo: ["natal"],
  couple: ["natal", "natal", "couple"],
  family: ["natal", "natal", "natal", "natal", "couple", "parent_child", "parent_child"],
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

  const creditTypes = BUNDLE_DEFINITIONS[bundleKind];
  const creditRows = creditTypes.map((creditType) => ({
    id: randomUUID(),
    userId,
    bundleId,
    creditType,
    status: "available" as const,
    usedForReportId: null,
  }));

  await db.insert(creditsTable).values(creditRows);

  return { bundleId, credits: creditRows.map((c) => c.id) };
}

export type CreditCounts = {
  natal: { available: number; used: number };
  couple: { available: number; used: number };
  parent_child: { available: number; used: number };
};

export async function getCredits(userId: string): Promise<CreditCounts> {
  const rows = await db
    .select({
      creditType: creditsTable.creditType,
      status: creditsTable.status,
      total: count(),
    })
    .from(creditsTable)
    .where(eq(creditsTable.userId, userId))
    .groupBy(creditsTable.creditType, creditsTable.status);

  const result: CreditCounts = {
    natal: { available: 0, used: 0 },
    couple: { available: 0, used: 0 },
    parent_child: { available: 0, used: 0 },
  };

  for (const row of rows) {
    const type = row.creditType as CreditType;
    if (type in result) {
      if (row.status === "available") result[type].available = Number(row.total);
      else if (row.status === "used") result[type].used = Number(row.total);
    }
  }

  return result;
}

export async function consumeCredit(
  userId: string,
  creditType: CreditType,
  reportId: string,
): Promise<boolean> {
  // Atomic consume via a CTE with FOR UPDATE SKIP LOCKED.
  // This ensures two concurrent requests never claim the same credit row:
  // the first one to execute the UPDATE wins the lock, the second sees no
  // rows in the CTE (SKIP LOCKED) and returns an empty result.
  const rows = await db.execute<{ id: string }>(sql`
    WITH cte AS (
      SELECT id
      FROM ${creditsTable}
      WHERE user_id = ${userId}
        AND credit_type = ${creditType}
        AND status = 'available'
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE ${creditsTable}
    SET status = 'used', used_for_report_id = ${reportId}
    WHERE id IN (SELECT id FROM cte)
    RETURNING id
  `);

  if (!rows.rows.length) {
    logger.warn({ userId, creditType, reportId }, "No available credit to consume — soft pass");
    return false;
  }

  return true;
}
