import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { reportsTable } from "./reports";

export const BUNDLE_KINDS = ["solo", "couple", "family"] as const;
export type BundleKind = (typeof BUNDLE_KINDS)[number];

export const CREDIT_TYPES = ["natal", "couple", "parent_child"] as const;
export type CreditType = (typeof CREDIT_TYPES)[number];

export const CREDIT_STATUSES = ["available", "used"] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export const bundlesTable = pgTable(
  "bundles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bundleKind: text("bundle_kind").notNull(),
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
    creditType: text("credit_type").notNull(),
    status: text("status").notNull().default("available"),
    usedForReportId: text("used_for_report_id").references(() => reportsTable.id, {
      onDelete: "set null",
    }),
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
