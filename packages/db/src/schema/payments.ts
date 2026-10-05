import { pgTable, text, timestamp, integer, boolean, jsonb, date, index, uniqueIndex } from "drizzle-orm/pg-core";

// Every kind and status below is plain text, so a new one needs no DDL.
export const PURCHASE_KINDS = ["bundle", "plan"] as const;
export type PurchaseKind = (typeof PURCHASE_KINDS)[number];

export const PURCHASE_STATUSES = ["open", "granted", "refunded", "disputed", "expired", "failed"] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

/**
 * One checkout: the price and the tick the buyer saw, kept so they are ours to
 * prove (ADR-274); only the webhook grants it (ADR-275). The session and the
 * invoice are unique, so a replayed event finds the row it granted and never
 * grants twice (R-6.2). No reference to users: the payment record stays when
 * an account goes (R-3.5).
 *
 * Every name is the one migrate-add-payments.ts uses, so whichever of that
 * script and the schema push makes a payment table, the other finds no drift.
 */
export const purchasesTable = pgTable(
  "purchases",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind", { enum: PURCHASE_KINDS }).notNull(),
    item: text("item").notNull(),
    cents: integer("cents").notNull(),
    // The catalogue's price, so a campaign's cut stays readable after it ends.
    fullCents: integer("full_cents").notNull(),
    campaignId: text("campaign_id"),
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntent: text("stripe_payment_intent"),
    stripeInvoice: text("stripe_invoice"),
    stripeSubscription: text("stripe_subscription"),
    tickHash: text("tick_hash").notNull(),
    tickedAt: timestamp("ticked_at", { withTimezone: true }).notNull(),
    returnTo: text("return_to").notNull(),
    status: text("status", { enum: PURCHASE_STATUSES }).notNull(),
    isTest: boolean("is_test").notNull(),
    // Null until our receipt is tried, so a failed send is told from one never tried.
    receiptDelivered: boolean("receipt_delivered"),
    grantedAt: timestamp("granted_at", { withTimezone: true }),
    // The first refund or dispute; a later one leaves it.
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("purchases_stripe_session_id_idx").on(t.stripeSessionId),
    uniqueIndex("purchases_stripe_invoice_idx").on(t.stripeInvoice),
    index("purchases_user_id_idx").on(t.userId),
    // A refund or a dispute names the payment, never the session.
    index("purchases_stripe_payment_intent_idx").on(t.stripePaymentIntent),
  ],
);

export type PurchaseRow = typeof purchasesTable.$inferSelect;
export type InsertPurchaseRow = typeof purchasesTable.$inferInsert;

/**
 * Each Stripe event by Stripe's own id, so a redelivered event is seen and
 * handled once (ADR-275). The webhook writes a row only after the signature
 * passes, so no one else can add rows.
 */
export const stripeEventsTable = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  livemode: boolean("livemode").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export type StripeEventRow = typeof stripeEventsTable.$inferSelect;
export type InsertStripeEventRow = typeof stripeEventsTable.$inferInsert;

/**
 * Timeline's plan as Stripe last told us, mirrored from its webhooks and never
 * set here first (R-6.2): the second source of Timeline access (ADR-277). The
 * id is Stripe's, and so is the status's word, which is why the status stays
 * free text. No reference to users, as with purchases.
 */
export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    customerId: text("customer_id").notNull(),
    item: text("item").notNull(),
    status: text("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    isTest: boolean("is_test").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscriptions_user_id_idx").on(t.userId)],
);

export type SubscriptionRow = typeof subscriptionsTable.$inferSelect;
export type InsertSubscriptionRow = typeof subscriptionsTable.$inferInsert;

export const CAMPAIGN_AUDIENCES = ["everyone", "link"] as const;
export type CampaignAudience = (typeof CAMPAIGN_AUDIENCES)[number];

/**
 * A price campaign saved from the admin, one list per environment, sent to
 * Stripe as coupons (ADR-278). Its days are whole Brussels days, so they are
 * dates, not instants (reading 5). Only a link campaign has a slug, unique so
 * a link finds one campaign. prices holds the campaign's price in cents for
 * each item it covers, { couple?, family? }; coupons the Stripe coupon made
 * for each.
 */
export const campaignsTable = pgTable(
  "campaigns",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    audience: text("audience", { enum: CAMPAIGN_AUDIENCES }).notNull(),
    slug: text("slug"),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    prices: jsonb("prices").notNull(),
    coupons: jsonb("coupons").notNull().default({}),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("campaigns_slug_idx").on(t.slug)],
);

export type CampaignRow = typeof campaignsTable.$inferSelect;
export type InsertCampaignRow = typeof campaignsTable.$inferInsert;

export const QA_ACCOUNTS = ["mira", "idris"] as const;
export type QaAccount = (typeof QA_ACCOUNTS)[number];

/**
 * An account the admin marked a tester: its credits come by grant and never
 * count as revenue (ADR-276). qa marks the staging walk's two accounts (ADR-314).
 */
export const testersTable = pgTable("testers", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  qa: text("qa", { enum: QA_ACCOUNTS }),
  addedBy: text("added_by").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TesterRow = typeof testersTable.$inferSelect;
export type InsertTesterRow = typeof testersTable.$inferInsert;

export const QA_WALK_MODES = ["deploy", "release"] as const;
export type QaWalkMode = (typeof QA_WALK_MODES)[number];

export const QA_WALK_STATUSES = ["running", "pass", "fail", "unseeded", "unconfigured"] as const;
export type QaWalkStatus = (typeof QA_WALK_STATUSES)[number];

/**
 * One staging walk and its verdict for the commit it walked (ADR-279, 315).
 * The row is the verdict, so /api/qa/latest and the Release view read it
 * after a restart, and a walk a restart cut off is found still running.
 */
export const qaWalksTable = pgTable("qa_walks", {
  id: text("id").primaryKey(),
  sha: text("sha").notNull(),
  mode: text("mode", { enum: QA_WALK_MODES }).notNull(),
  status: text("status", { enum: QA_WALK_STATUSES }).notNull(),
  steps: jsonb("steps").notNull(),
  findings: jsonb("findings").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export type QaWalkRow = typeof qaWalksTable.$inferSelect;
export type InsertQaWalkRow = typeof qaWalksTable.$inferInsert;
