import { pgTable, text, timestamp, index, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { reportsTable } from "./reports";

export const BUNDLE_KINDS = ["solo", "couple", "family"] as const;
export type BundleKind = (typeof BUNDLE_KINDS)[number];

// "held" is a gift's credit between Gift and its claim (ADR-123, 139);
// "refunded" one a refund or a dispute took back before it was used (ADR-275).
// The set is app-level only, so no DDL enforces it.
export const CREDIT_STATUSES = ["available", "used", "held", "refunded"] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export const BUNDLE_SOURCES = ["purchase", "grant", "test", "plan"] as const;
export type BundleSource = (typeof BUNDLE_SOURCES)[number];

export const bundlesTable = pgTable(
  "bundles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bundleKind: text("bundle_kind").notNull(),
    // Never revenue (ADR-276): Stripe's sandbox, a tester's grant or the old
    // free test checkout. source says which, so a grant is never read as a sale.
    isTest: boolean("is_test").notNull().default(false),
    // "test" is a bundle from the free test checkout before it went (ADR-276);
    // "plan" the yearly plan's credit to give (ADR-277).
    source: text("source", { enum: BUNDLE_SOURCES }).notNull().default("purchase"),
    // Unique, so one purchase grants one bundle however often Stripe sends its event (R-6.2).
    purchaseId: text("purchase_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("bundles_user_id_idx").on(t.userId),
    uniqueIndex("bundles_purchase_id_idx").on(t.purchaseId),
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
    status: text("status").notNull().default("available"),
    usedForReportId: text("used_for_report_id").references(() => reportsTable.id, {
      onDelete: "set null",
    }),
    // Its bundle's is_test, kept on the credit for its History line.
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
