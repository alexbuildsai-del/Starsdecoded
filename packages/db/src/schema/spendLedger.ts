import { pgTable, text, date, integer, doublePrecision, timestamp, primaryKey } from "drizzle-orm/pg-core";

/**
 * What the model cost today, as the daily spend breaker reads it (ADR-199):
 * one row per UTC day and kind of visitor generation, which every model call
 * made for a visitor adds its cost to as its reply returns, so failed and
 * retried attempts and each regenerate count, which the cost stored on a
 * report never showed. Lab, release, session and QA calls are never written
 * (ADR-77). Only figures are kept, no report, person or visitor (R-3.5), so a
 * year is some fourteen hundred rows.
 *
 * The key is named as Postgres names a table's own, so the schema push and
 * migrate-add-spend-ledger.ts describe one table and the push finds no drift.
 */
export const spendLedgerTable = pgTable(
  "spend_ledger",
  {
    day: date("day", { mode: "string" }).notNull(),
    kind: text("kind").notNull(),
    costUsd: doublePrecision("cost_usd").notNull(),
    calls: integer("calls").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ name: "spend_ledger_pkey", columns: [t.day, t.kind] })],
);

export type SpendLedgerRow = typeof spendLedgerTable.$inferSelect;
export type InsertSpendLedgerRow = typeof spendLedgerTable.$inferInsert;
/**
 * What a visitor's call was for: a natal report or its regenerate, a pair, a horizon pass, the legacy pair report,
 * a Timeline reading or an Ask message (ADR-210, 213). The column is plain text, so a new kind needs no DDL.
 */
export const SPEND_KINDS = ["natal", "pair", "horizon", "synastry", "timeline", "ask"] as const;
export type SpendKind = (typeof SPEND_KINDS)[number];
