import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { reportsTable } from "./reports";

/**
 * What a report said before a pass changed it: the previous interpretation
 * and the previous chart, kept so the reader can compare any time (ADR-35).
 */
export const reportRevisionsTable = pgTable(
  "report_revisions",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => reportsTable.id, { onDelete: "cascade" }),
    interpretation: jsonb("interpretation").notNull(),
    chartData: jsonb("chart_data"),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("report_revisions_report_id_idx").on(t.reportId)],
);

export type ReportRevision = typeof reportRevisionsTable.$inferSelect;
export type RevisionReason = "birth_time_added";
