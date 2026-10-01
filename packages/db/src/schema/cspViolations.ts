import { pgTable, text, date, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

/**
 * What the Content-Security-Policy would block on our pages (ADR-198), counted
 * per UTC day, directive and blocked host or keyword (`inline`, `eval`, `data`,
 * `blob`, `extension`). No URL path or query and nothing about the visitor is
 * kept (R-3.5). Rows rather than memory, because staging redeploys at every
 * merge and enforcing the policy waits for seven clean days (MB-147).
 *
 * The key is named as Postgres names a table's own, so the schema push and
 * migrate-add-csp-violations.ts describe one table and the push finds no drift.
 */
export const cspViolationsTable = pgTable(
  "csp_violations",
  {
    day: date("day", { mode: "string" }).notNull(),
    directive: text("directive").notNull(),
    blocked: text("blocked").notNull(),
    count: integer("count").notNull(),
    lastSeen: timestamp("last_seen").notNull().defaultNow(),
  },
  (t) => [primaryKey({ name: "csp_violations_pkey", columns: [t.day, t.directive, t.blocked] })],
);

export type CspViolation = typeof cspViolationsTable.$inferSelect;
export type InsertCspViolation = typeof cspViolationsTable.$inferInsert;
