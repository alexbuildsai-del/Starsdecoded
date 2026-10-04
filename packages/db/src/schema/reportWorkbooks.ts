import { pgTable, text, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { reportsTable } from "./reports";

/**
 * Each reader's own ticks and pins on a report (ADR-239), keyed by item and
 * valued by the ISO date of the tick, as reports.workbook held them. A report
 * is read by its writer, by the person it was sent to and by anyone it is
 * shared with, and one reader's ticks must never show in another's workbook.
 * The reader is a Clerk user id, or `session:<session id>` for a reader who
 * is not signed in.
 *
 * The key is named as Postgres names a table's own, so the schema push and
 * migrate-add-shares-and-workbooks.ts describe one table and the push finds no drift.
 */
export const reportWorkbooksTable = pgTable(
  "report_workbooks",
  {
    reportId: text("report_id")
      .notNull()
      .references(() => reportsTable.id, { onDelete: "cascade" }),
    reader: text("reader").notNull(),
    workbook: jsonb("workbook").notNull().default({}),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ name: "report_workbooks_pkey", columns: [t.reportId, t.reader] })],
);

export type ReportWorkbook = typeof reportWorkbooksTable.$inferSelect;
export type InsertReportWorkbook = typeof reportWorkbooksTable.$inferInsert;
