/**
 * The spend ledger the daily breaker sums (ADR-199). Every model call made for
 * a visitor adds its cost to today's (UTC) row for its kind as its reply
 * returns, so the breaker sees what the cost stored on a report never showed:
 * the legacy pair report, a failed or retried attempt, a report that failed,
 * and each regenerate on top of the text it replaced. A call made for the lab,
 * the release lab, a session or the QA agent carries no kind and is never
 * written (reading 7); LAB_BUDGET_USD bounds those (ADR-77). A request that
 * failed returned no usage and was not billed, so it adds nothing.
 */
import { eq, sql } from "drizzle-orm";
import { db, spendLedgerTable, type SpendKind } from "@workspace/db";
import { logger } from "./logger.js";
import type { ModelId, ServiceTier } from "./models.js";
import { addAttempt, costUsd, emptySection, type RawUsage } from "./usage.js";

export type { SpendKind };

/** YYYY-MM-DD in UTC: the ledger's row, the day the breaker sums and resets on, and the day its email names. */
export function utcDay(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}

export interface SpendEntry {
  day: string;
  kind: SpendKind;
  costUsd: number;
}

/**
 * One reply, priced by usage.ts as a report's own usage is, so the ledger and
 * meta.usage agree on what a call cost. Null when the reply reported no tokens.
 */
export function entryFor(kind: SpendKind, model: ModelId, raw: RawUsage | undefined, serviceTier: ServiceTier = "standard", at: Date = new Date()): SpendEntry | null {
  // A ModelId always has a price, so the fallback only satisfies the type.
  const usd = costUsd(model, addAttempt(emptySection(kind, model), raw, 0), serviceTier) ?? 0;
  return Number.isFinite(usd) && usd > 0 ? { day: utcDay(at), kind, costUsd: usd } : null;
}

export type SpendSink = (entry: SpendEntry) => Promise<void>;

// One statement, so calls landing together add up in Postgres rather than overwrite each other.
const dbSink: SpendSink = async (entry) => {
  await db
    .insert(spendLedgerTable)
    .values({ day: entry.day, kind: entry.kind, costUsd: entry.costUsd, calls: 1 })
    .onConflictDoUpdate({
      target: [spendLedgerTable.day, spendLedgerTable.kind],
      set: {
        costUsd: sql`${spendLedgerTable.costUsd} + excluded.cost_usd`,
        calls: sql`${spendLedgerTable.calls} + excluded.calls`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
};

let sink: SpendSink = dbSink;

/** Tests swap the store; returns the restore function. */
export function setSpendSink(next: SpendSink | null): () => void {
  const previous = sink;
  sink = next ?? dbSink;
  return () => { sink = previous; };
}

/**
 * Adds one reply's cost to today's row, awaited where the reply lands so the
 * call is on the ledger before its section moves on. With no kind the call is
 * not a visitor's and nothing is written. Never throws: a database that is
 * down loses the entry and says so, never the report.
 */
export async function recordSpend(kind: SpendKind | undefined, model: ModelId, raw: RawUsage | undefined, serviceTier?: ServiceTier): Promise<void> {
  if (!kind) return;
  const entry = entryFor(kind, model, raw, serviceTier);
  if (!entry) return;
  try {
    await sink(entry);
  } catch (err) {
    logger.error({ err, kind, costUsd: entry.costUsd }, "spend ledger: a call's cost was not written, so the breaker does not see it");
  }
}

/**
 * The day's spend from its rows. A figure that is not a finite amount of zero
 * or more adds nothing: a NaN sum would read as past any cap and pause every
 * writing route for the rest of the day.
 */
export function spentFrom(rows: ReadonlyArray<{ costUsd: number | null }>): number {
  let total = 0;
  for (const r of rows) {
    if (typeof r.costUsd === "number" && Number.isFinite(r.costUsd) && r.costUsd >= 0) total += r.costUsd;
  }
  return total;
}

/** A day's rows, at most one per kind, summed here rather than in SQL so that one odd row cannot poison the sum. */
export async function readSpentUsd(day: string): Promise<number> {
  const rows = await db.select({ costUsd: spendLedgerTable.costUsd }).from(spendLedgerTable).where(eq(spendLedgerTable.day, day));
  return spentFrom(rows);
}
