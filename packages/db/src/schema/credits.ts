import { pgTable, text, timestamp, index, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { reportsTable } from "./reports";

export const BUNDLE_KINDS = ["solo", "couple", "family"] as const;
export type BundleKind = (typeof BUNDLE_KINDS)[number];

// "held" is a gift's credit between Gift and its claim (ADR-123, 139); it is
// app-level only, so no DDL enforces the set.
export const CREDIT_STATUSES = ["available", "used", "held"] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export const bundlesTable = pgTable(
  "bundles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bundleKind: text("bundle_kind").notNull(),
    // A free bundle from the test checkout (ADR-138), never sold.
    isTest: boolean("is_test").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("bundles_user_id_idx").on(t.userId),
  ],
);

export const creditsTable = pgTable(
  "credits",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bundleId: text("bundle_id")
      .notNull()
      .references(() => bundlesTable.id, { onDelete: "cascade" }),
    // One credit is one report, whatever the report (ADR-42). Read nowhere;
    // the column and the typed bundles drop with the payments round (MB-57).
    creditType: text("credit_type").default("natal"),
    status: text("status").notNull().default("available"),
    usedForReportId: text("used_for_report_id").references(() => reportsTable.id, {
      onDelete: "set null",
    }),
    // From a test-checkout bundle (ADR-138); marks its History line as free.
    isTest: boolean("is_test").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("credits_user_id_idx").on(t.userId),
    index("credits_bundle_id_idx").on(t.bundleId),
    index("credits_status_idx").on(t.status),
  ],
);

export type Bundle = typeof bundlesTable.$inferSelect;
export type Credit = typeof creditsTable.$inferSelect;
