import { randomUUID } from "node:crypto";
import { and, count, desc, eq, or, sql } from "drizzle-orm";
import type { z } from "zod";
import {
  db,
  bundlesTable,
  creditsTable,
  inviteTokensTable,
  profilesTable,
  relationshipsTable,
  reportsTable,
} from "@workspace/db";
import type { BundleKind } from "@workspace/db";
import type { GetCreditHistoryResponseItem } from "@workspace/api-zod";
import { logger } from "./logger.js";
import { firstNameOf, firstWord } from "./names.js";

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

/**
 * The bundle and its credits land together or not at all, so History never
 * shows a bundle short of its credits. `test` marks both as the free test
 * checkout's (ADR-138). Every call is a new bundle, as every purchase is; the
 * idempotency key arrives with the provider's event id (R-6.2, MB-6).
 */
export async function grantBundle(
  userId: string,
  bundleKind: BundleKind,
  opts: { test?: boolean } = {},
): Promise<{ bundleId: string; credits: string[] }> {
  const isTest = opts.test === true;
  const bundleId = randomUUID();
  const creditRows = Array.from({ length: BUNDLE_DEFINITIONS[bundleKind] }, () => ({
    id: randomUUID(),
    userId,
    bundleId,
    status: "available" as const,
    usedForReportId: null,
    isTest,
  }));

  await db.transaction(async (tx) => {
    await tx.insert(bundlesTable).values({ id: bundleId, userId, bundleKind, isTest });
    await tx.insert(creditsTable).values(creditRows);
  });

  return { bundleId, credits: creditRows.map((c) => c.id) };
}

export type CreditCounts = {
  available: number;
  used: number;
  held: number;
  lastBundle: { id: string; count: number; createdAt: string } | null;
};

/**
 * One balance, however many bundles filled it (ADR-129). A held credit counts
 * apart from `available` until its gift is claimed or returned (ADR-123). The
 * last bundle's count includes credits since gifted on, since the path after
 * buying plans from what was bought (ADR-125).
 */
export async function getCredits(userId: string): Promise<CreditCounts> {
  const [counts] = await db
    .select({
      available: sql<number>`count(*) filter (where ${creditsTable.status} = 'available')`.mapWith(Number),
      used: sql<number>`count(*) filter (where ${creditsTable.status} = 'used')`.mapWith(Number),
      held: sql<number>`count(*) filter (where ${creditsTable.status} = 'held')`.mapWith(Number),
    })
    .from(creditsTable)
    .where(eq(creditsTable.userId, userId));

  const [last] = await db
    .select({ id: bundlesTable.id, createdAt: bundlesTable.createdAt, count: count(creditsTable.id) })
    .from(bundlesTable)
    .leftJoin(creditsTable, eq(creditsTable.bundleId, bundlesTable.id))
    .where(eq(bundlesTable.userId, userId))
    .groupBy(bundlesTable.id)
    .orderBy(desc(bundlesTable.createdAt), desc(bundlesTable.id))
    .limit(1);

  return {
    available: counts?.available ?? 0,
    used: counts?.used ?? 0,
    held: counts?.held ?? 0,
    lastBundle: last ? { id: last.id, count: last.count, createdAt: last.createdAt.toISOString() } : null,
  };
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

/**
 * Holds the giver's oldest available credit for a waiting gift and links it
 * to the gift in the same statement, so no credit is ever held for nothing
 * (ADR-123). Insert the gift first: its row is locked here, so a repeat or a
 * concurrent call returns the credit already held rather than holding a
 * second.
 */
export async function holdCredit(userId: string, inviteId: string): Promise<string | null> {
  const result = await db.execute<{ held_now: string | null; held_before: string | null; gift_found: boolean }>(sql`
    WITH gift AS (
      SELECT id, credit_id
      FROM ${inviteTokensTable}
      WHERE id = ${inviteId}
        AND kind = 'gift'
        AND created_by_user_id = ${userId}
        AND claimed_at IS NULL
        AND revoked_at IS NULL
      FOR UPDATE
    ),
    pick AS (
      SELECT c.id
      FROM ${creditsTable} c
      WHERE c.user_id = ${userId}
        AND c.status = 'available'
        AND EXISTS (SELECT 1 FROM gift WHERE gift.credit_id IS NULL)
      ORDER BY c.created_at ASC, c.id ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    ),
    held AS (
      UPDATE ${creditsTable}
      SET status = 'held'
      WHERE id IN (SELECT id FROM pick)
      RETURNING id
    ),
    linked AS (
      UPDATE ${inviteTokensTable} i
      SET credit_id = held.id
      FROM held
      WHERE i.id = ${inviteId}
        AND i.credit_id IS NULL
      RETURNING held.id
    )
    SELECT
      (SELECT id FROM linked) AS held_now,
      (SELECT credit_id FROM gift) AS held_before,
      EXISTS (SELECT 1 FROM gift) AS gift_found
  `);

  const row = result.rows[0];
  const creditId = row?.held_now ?? row?.held_before ?? null;
  if (creditId) return creditId;
  if (!row?.gift_found) {
    logger.warn({ userId, inviteId }, "no waiting gift of this giver to hold a credit for");
    return null;
  }
  // MB-6 provisional: with no credit to hold the gift still goes, as a report
  // does under the soft pass, until checkout exists.
  logger.warn({ userId, inviteId }, "no available credit to hold for a gift, soft pass");
  return null;
}

/**
 * A claimed gift's credit leaves its giver's hold for the claimer's balance,
 * to spend on any report (ADR-139). Call it once the claim is recorded; the
 * guards (still held, still the giver's, not taken back, this claimer) make a
 * repeat move nothing, and keep a credit the claimer has since held for a
 * gift of their own where it is.
 */
export async function moveHeldCredit(inviteId: string, toUserId: string): Promise<boolean> {
  const result = await db.execute<{ id: string }>(sql`
    WITH gift AS (
      SELECT credit_id, created_by_user_id
      FROM ${inviteTokensTable}
      WHERE id = ${inviteId}
        AND kind = 'gift'
        AND credit_id IS NOT NULL
        AND revoked_at IS NULL
        AND (claimed_by_user_id IS NULL OR claimed_by_user_id = ${toUserId})
      FOR UPDATE
    )
    UPDATE ${creditsTable} c
    SET user_id = ${toUserId}, status = 'available'
    FROM gift
    WHERE c.id = gift.credit_id
      AND c.status = 'held'
      AND c.user_id = gift.created_by_user_id
    RETURNING c.id
  `);
  return result.rows.length > 0;
}

/**
 * Take it back: an unclaimed gift's credit returns to its giver's balance
 * (ADR-123). The gift lets go of the credit too, so a credit returned and
 * later held for another gift is never released by this one. A repeat, or a
 * gift already claimed, returns nothing.
 */
export async function returnHeldCredit(inviteId: string): Promise<boolean> {
  const result = await db.execute<{ id: string }>(sql`
    WITH gift AS (
      SELECT id, credit_id, created_by_user_id
      FROM ${inviteTokensTable}
      WHERE id = ${inviteId}
        AND kind = 'gift'
        AND claimed_at IS NULL
        AND credit_id IS NOT NULL
      FOR UPDATE
    ),
    released AS (
      UPDATE ${inviteTokensTable} i
      SET credit_id = NULL
      FROM gift
      WHERE i.id = gift.id
      RETURNING i.id
    )
    UPDATE ${creditsTable} c
    SET status = 'available'
    FROM gift
    WHERE c.id = gift.credit_id
      AND c.status = 'held'
      AND c.user_id = gift.created_by_user_id
    RETURNING c.id
  `);
  return result.rows.length > 0;
}

/**
 * Expiry is applied on read (reading 8): before a balance or a gift list is
 * read, every hold that should no longer stand is settled. An unclaimed gift
 * past its 30 days, or taken back, returns its credit to its giver; a claimed
 * gift whose move never landed moves it to its claimer, since the claim
 * already made it theirs (ADR-139). Rows another request has locked are left
 * for the next read.
 */
export async function returnExpiredHolds(now: Date = new Date()): Promise<number> {
  const returned = await db.execute<{ id: string }>(sql`
    WITH due AS (
      SELECT id, credit_id, created_by_user_id
      FROM ${inviteTokensTable}
      WHERE kind = 'gift'
        AND claimed_at IS NULL
        AND credit_id IS NOT NULL
        AND (revoked_at IS NOT NULL OR expires_at <= ${now.toISOString()}::timestamp)
      FOR UPDATE SKIP LOCKED
    ),
    released AS (
      UPDATE ${inviteTokensTable} i
      SET credit_id = NULL
      FROM due
      WHERE i.id = due.id
      RETURNING i.id
    )
    UPDATE ${creditsTable} c
    SET status = 'available'
    FROM due
    WHERE c.id = due.credit_id
      AND c.status = 'held'
      AND c.user_id = due.created_by_user_id
    RETURNING c.id
  `);

  // A claimed gift keeps its credit id for History, so only the ones whose
  // credit is still in their giver's hold are picked, never every claim.
  const moved = await db.execute<{ id: string }>(sql`
    WITH due AS (
      SELECT i.credit_id, i.created_by_user_id, i.claimed_by_user_id
      FROM ${inviteTokensTable} i
      JOIN ${creditsTable} held ON held.id = i.credit_id
      WHERE i.kind = 'gift'
        AND i.claimed_at IS NOT NULL
        AND i.claimed_by_user_id IS NOT NULL
        AND i.revoked_at IS NULL
        AND held.status = 'held'
        AND held.user_id = i.created_by_user_id
      FOR UPDATE OF i SKIP LOCKED
    )
    UPDATE ${creditsTable} c
    SET user_id = due.claimed_by_user_id, status = 'available'
    FROM due
    WHERE c.id = due.credit_id
      AND c.status = 'held'
      AND c.user_id = due.created_by_user_id
    RETURNING c.id
  `);

  const settled = returned.rows.length + moved.rows.length;
  if (moved.rows.length) logger.warn({ credits: moved.rows.length }, "moved the credit of a claimed gift whose move had not landed");
  if (settled) logger.info({ returned: returned.rows.length, moved: moved.rows.length }, "gift holds settled");
  return settled;
}

export type CreditHistoryItem = z.infer<typeof GetCreditHistoryResponseItem>;

/**
 * What History reads, one row per thing the viewer's credits did. A gift row
 * carries only what was fixed at its claim, so nothing its recipient does
 * afterwards can change the giver's line (ADR-139).
 */
export type HistoryRow =
  | { kind: "bundle"; at: Date; count: number; test: boolean }
  | {
      kind: "spent";
      grantedAt: Date;
      test: boolean;
      // Null once the report is gone. `stillYours` is false once it left the
      // viewer, as a sent report does on Stop sharing (ADR-139).
      report: { at: Date; names: string[]; pair: boolean; stillYours: boolean } | null;
    }
  | {
      kind: "gift";
      side: "giver" | "recipient";
      claimedAt: Date | null;
      // The credit that moved at the claim; null while none did: the soft pass
      // held none, or the gift was taken back or expired.
      credit: { test: boolean } | null;
      // The recipient's name as the giver typed it, or the giver's first name.
      name: string | null;
    };

// A report that left the viewer reads the same whether it still exists or
// not, label and date, so nothing its subject does later shows (ADR-139).
const REPORT_NOT_YOURS = "A report you no longer have";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// The name the report list gives it (GET /reports), so History and the list agree.
function reportName(report: { names: string[]; pair: boolean }): string {
  if (!report.pair) return report.names[0] ?? "Personal natal report";
  return report.names.length === 2 ? `${report.names[0]} & ${report.names[1]}` : "Compatibility";
}

// A spend and the purchase it came from can carry the same instant; the spend reads above it.
const RANK: Record<CreditHistoryItem["kind"], number> = { spent: 0, gift: 1, bought: 2 };

/**
 * History's lines, newest first (reading 9): bought (+N; a test bundle says
 * so, ADR-138), a gift received (+1, "A gift from {giver}") and spent (−1, the
 * report's name, or "Gift to {name}" on the giver's side once claimed). A held
 * or returned credit makes no line: it never left the giver.
 */
export function historyLines(rows: HistoryRow[]): CreditHistoryItem[] {
  const lines: Array<{ at: Date; line: CreditHistoryItem }> = [];
  for (const row of rows) {
    if (row.kind === "bundle") {
      const label = row.test ? plural(row.count, "test credit") : `${plural(row.count, "credit")} bought`;
      lines.push({ at: row.at, line: { kind: "bought", count: row.count, date: row.at.toISOString(), label, test: row.test } });
      continue;
    }
    if (row.kind === "spent") {
      const yours = row.report?.stillYours ? row.report : null;
      const spentAt = yours ? yours.at : row.grantedAt;
      const label = yours ? reportName(yours) : REPORT_NOT_YOURS;
      lines.push({ at: spentAt, line: { kind: "spent", count: 1, date: spentAt.toISOString(), label, test: row.test } });
      continue;
    }
    if (!row.claimedAt || !row.credit) continue;
    const name = row.name?.trim() ? row.name.trim() : null;
    const line: CreditHistoryItem =
      row.side === "giver"
        ? { kind: "spent", count: 1, date: row.claimedAt.toISOString(), label: name ? `Gift to ${name}` : "A gift you gave", test: row.credit.test }
        : { kind: "gift", count: 1, date: row.claimedAt.toISOString(), label: name ? `A gift from ${name}` : "A gift", test: row.credit.test };
    lines.push({ at: row.claimedAt, line });
  }
  return lines
    .sort((a, b) => b.at.getTime() - a.at.getTime() || RANK[a.line.kind] - RANK[b.line.kind])
    .map((l) => l.line);
}

/** The viewer's History (ADR-129): their bundles, their spends and the gifts on either side of them. */
export async function creditHistory(userId: string): Promise<CreditHistoryItem[]> {
  const pair = sql<boolean>`${reportsTable.relationshipId} is not null`;
  const [bundles, spent, gifts] = await Promise.all([
    db
      .select({ at: bundlesTable.createdAt, test: bundlesTable.isTest, count: count(creditsTable.id) })
      .from(bundlesTable)
      .leftJoin(creditsTable, eq(creditsTable.bundleId, bundlesTable.id))
      .where(eq(bundlesTable.userId, userId))
      .groupBy(bundlesTable.id),
    db
      .select({
        grantedAt: creditsTable.createdAt,
        test: creditsTable.isTest,
        reportAt: reportsTable.createdAt,
        pair,
        names: sql<Array<string | null> | null>`case when ${pair}
          then (select array_agg(pp.name order by rp.position)
                from relationship_participants rp
                join profiles pp on pp.id = rp.profile_id
                where rp.relationship_id = ${reportsTable.relationshipId})
          else array[${profilesTable.name}] end`,
        stillYours: sql<boolean>`case when ${pair}
          then coalesce(${relationshipsTable.userId} = ${userId}, false)
          else coalesce(${profilesTable.userId} = ${userId} or ${profilesTable.claimedByUserId} = ${userId}, false) end`,
      })
      .from(creditsTable)
      .leftJoin(reportsTable, eq(reportsTable.id, creditsTable.usedForReportId))
      .leftJoin(profilesTable, eq(profilesTable.id, reportsTable.profileId))
      .leftJoin(relationshipsTable, eq(relationshipsTable.id, reportsTable.relationshipId))
      .where(and(eq(creditsTable.userId, userId), eq(creditsTable.status, "used"))),
    db
      .select({
        giverId: inviteTokensTable.createdByUserId,
        claimerId: inviteTokensTable.claimedByUserId,
        recipientName: inviteTokensTable.recipientName,
        claimedAt: inviteTokensTable.claimedAt,
        creditId: inviteTokensTable.creditId,
        creditTest: creditsTable.isTest,
      })
      .from(inviteTokensTable)
      .leftJoin(creditsTable, eq(creditsTable.id, inviteTokensTable.creditId))
      .where(
        and(
          eq(inviteTokensTable.kind, "gift"),
          or(eq(inviteTokensTable.createdByUserId, userId), eq(inviteTokensTable.claimedByUserId, userId)),
        ),
      ),
  ]);

  // A name that cannot be found costs the line its name, never History itself.
  const giverIds = [...new Set(gifts.filter((g) => g.claimerId === userId && g.giverId).map((g) => g.giverId as string))];
  const giverNames = new Map(
    await Promise.all(giverIds.map(async (id) => [id, await firstNameOf(id).catch(() => null)] as const)),
  );

  const rows: HistoryRow[] = [];
  for (const b of bundles) rows.push({ kind: "bundle", at: b.at, count: b.count, test: b.test });
  for (const s of spent) {
    rows.push({
      kind: "spent",
      grantedAt: s.grantedAt,
      test: s.test,
      report: s.reportAt
        ? { at: s.reportAt, names: (s.names ?? []).filter((n): n is string => !!n), pair: s.pair, stillYours: s.stillYours }
        : null,
    });
  }
  for (const g of gifts) {
    const credit = g.creditId ? { test: g.creditTest ?? false } : null;
    if (g.giverId === userId) {
      const name = g.recipientName ? firstWord(g.recipientName) : null;
      rows.push({ kind: "gift", side: "giver", claimedAt: g.claimedAt, credit, name });
    }
    if (g.claimerId === userId) {
      const name = g.giverId ? (giverNames.get(g.giverId) ?? null) : null;
      rows.push({ kind: "gift", side: "recipient", claimedAt: g.claimedAt, credit, name });
    }
  }
  return historyLines(rows);
}
