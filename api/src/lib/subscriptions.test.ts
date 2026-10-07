/**
 * Timeline's subscription (ADR-262, 264, 277; readings 7, 12). What a subscription's payload says in the row's terms,
 * a plan's days and the events the mirror ignores run with no database. On a scratch Postgres named by
 * WALK_DATABASE_URL: each event moves the row and the access answer with it, a late event moves neither back, a plan's
 * first paid invoice grants its checkout's purchase once with one receipt, each paid year of the yearly plan is a
 * purchase and one credit to give, and an invoice's payment is read from a stand-in Stripe when the payload leaves it
 * out. Without one those skip, saying why. Nothing here reaches Stripe, Resend or a model.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import express, { type RequestHandler } from "express";
import type Stripe from "stripe";
import { PLAN_TICK } from "@workspace/commerce";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points at a closed port, so a read there fails at once.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";
// No test account is the admin, so every answer below is the subscription's.
delete process.env.ADMIN_USER_ID;
// Receipts go to the stub below; a send that slipped past it would stop before Resend for want of a key.
delete process.env.RESEND_API_KEY;

const S = await import("./subscriptions.js");
const { timelineAccess } = await import("./timelineAccess.js");
const { stripe } = await import("./stripe.js");
const { logger } = await import("./logger.js");
const Z = await import("@workspace/api-zod");
type SendReceiptEmailOptions = import("./mailer.js").SendReceiptEmailOptions;

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the plan's rows are mirrored and granted on a scratch Postgres";

type PlanId = "timeline_month" | "timeline_year";
const DAY = 86_400;
const NOW = Math.floor(Date.now() / 1000);
const INTERVAL = { timeline_month: "month", timeline_year: "year" } as const;
const CENTS = { timeline_month: 999, timeline_year: 6999 } as const;
const TICK_HASH = createHash("sha256").update(PLAN_TICK, "utf8").digest("hex");

interface SubShape {
  status?: string;
  item?: PlanId;
  lookupKey?: string | null;
  product?: string;
  recurring?: { interval: string; interval_count: number } | null;
  periodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  purchaseId?: string | null;
}

/** A subscription as a dahlia-era webhook carries it: its period's end on its item, its Price whole. */
function subscription(id: string, customer: string, shape: SubShape = {}): Stripe.Subscription {
  const item = shape.item ?? "timeline_month";
  const periodEnd = shape.periodEnd ?? NOW + 30 * DAY;
  return {
    id,
    object: "subscription",
    customer,
    status: shape.status ?? "active",
    livemode: false,
    cancel_at_period_end: shape.cancelAtPeriodEnd ?? false,
    cancel_at: shape.cancelAt ?? null,
    metadata: shape.purchaseId ? { purchase_id: shape.purchaseId } : {},
    items: {
      object: "list",
      has_more: false,
      url: `/v1/subscription_items?subscription=${id}`,
      data: [
        {
          id: `si_${id}`,
          object: "subscription_item",
          subscription: id,
          current_period_start: periodEnd - 30 * DAY,
          current_period_end: periodEnd,
          price: {
            id: `price_${item}`,
            object: "price",
            product: shape.product ?? "timeline",
            lookup_key: shape.lookupKey === undefined ? item : shape.lookupKey,
            recurring: shape.recurring === undefined ? { interval: INTERVAL[item], interval_count: 1 } : shape.recurring,
            type: "recurring",
            unit_amount: CENTS[item],
          },
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

interface InvoiceShape {
  reason?: string;
  amountPaid?: number;
  periodEnd?: number;
  purchaseId?: string | null;
  /** The payment as an expanded payload carries it; null leaves `payments` out, as a webhook's does. */
  intent?: string | null;
  email?: string | null;
}

/** An invoice as the basil API shapes it: its subscription under its parent, its line's price under pricing. */
function invoice(id: string, sub: string, customer: string, shape: InvoiceShape = {}): Stripe.Invoice {
  const periodEnd = shape.periodEnd ?? NOW + 30 * DAY;
  return {
    id,
    object: "invoice",
    customer,
    customer_email: shape.email ?? null,
    billing_reason: shape.reason ?? "subscription_create",
    amount_paid: shape.amountPaid ?? CENTS.timeline_month,
    livemode: false,
    status: "paid",
    parent: {
      type: "subscription_details",
      quote_details: null,
      subscription_details: { subscription: sub, metadata: shape.purchaseId ? { purchase_id: shape.purchaseId } : {} },
    },
    lines: {
      object: "list",
      has_more: false,
      url: `/v1/invoices/${id}/lines`,
      data: [
        {
          id: `il_${id}`,
          object: "line_item",
          period: { start: periodEnd - 30 * DAY, end: periodEnd },
          parent: {
            type: "subscription_item_details",
            invoice_item_details: null,
            subscription_item_details: {
              subscription: sub,
              subscription_item: `si_${sub}`,
              invoice_item: null,
              proration: false,
              proration_details: null,
            },
          },
          pricing: { type: "price_details", unit_amount_decimal: null, price_details: { price: "price_x", product: "timeline" } },
        },
      ],
    },
    ...(shape.intent === null
      ? {}
      : {
          payments: {
            object: "list",
            has_more: false,
            url: "/v1/invoice_payments",
            data: [
              {
                id: `inpay_${id}`,
                object: "invoice_payment",
                status: "paid",
                payment: { type: "payment_intent", payment_intent: shape.intent ?? `pi_${id}` },
              },
            ],
          },
        }),
  } as unknown as Stripe.Invoice;
}

function event(type: string, object: unknown): Stripe.Event {
  return {
    id: `evt_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
    object: "event",
    type,
    livemode: false,
    created: NOW,
    api_version: "2026-08-26.dahlia",
    pending_webhooks: 1,
    request: null,
    data: { object },
  } as unknown as Stripe.Event;
}

const receipts: SendReceiptEmailOptions[] = [];
const DEPS = {
  client: null,
  sendReceipt: async (opts: SendReceiptEmailOptions) => {
    receipts.push(opts);
    return true;
  },
};
const apply = (e: Stripe.Event, over: Partial<import("./subscriptions.js").SubscriptionDeps> = {}) =>
  S.applySubscriptionEvent(e, { ...DEPS, ...over });

test("a subscription's payload in the row's terms: the period's end from its item, the plan by its Price", () => {
  const end = NOW + 30 * DAY;
  assert.deepEqual(S.subscriptionState(subscription("sub_a", "cus_a", { periodEnd: end })), {
    id: "sub_a",
    customerId: "cus_a",
    item: "timeline_month",
    status: "active",
    currentPeriodEnd: new Date(end * 1000),
    cancelAtPeriodEnd: false,
    isTest: true,
  });
  assert.equal(S.subscriptionState(subscription("sub_y", "cus_a", { item: "timeline_year" })).item, "timeline_year");
  const moved = subscription("sub_m", "cus_a", { item: "timeline_year", lookupKey: null });
  assert.equal(S.subscriptionState(moved).item, "timeline_year", "a Price whose key moved on still names its plan");
  const single = subscription("sub_s", "cus_a", { lookupKey: "single", product: "single", recurring: null });
  assert.equal(S.subscriptionState(single).item, null, "a Price that isn't Timeline's names no plan");
  const quarterly = subscription("sub_q", "cus_a", { lookupKey: null, recurring: { interval: "month", interval_count: 3 } });
  assert.equal(S.subscriptionState(quarterly).item, null, "a Price billed in no plan's rhythm names none");
});

test("a cancel at the period's end reads the same as the flag or as cancel_at on that end", () => {
  const end = NOW + 30 * DAY;
  const state = (shape: SubShape) => S.subscriptionState(subscription("sub_c", "cus_c", { periodEnd: end, ...shape }));
  assert.equal(state({ cancelAtPeriodEnd: true }).cancelAtPeriodEnd, true);
  assert.equal(state({ cancelAt: end }).cancelAtPeriodEnd, true);
  assert.equal(state({ cancelAt: end - DAY }).cancelAtPeriodEnd, true, "set to end before its period does");
  assert.equal(state({ cancelAt: end + 20 * DAY }).cancelAtPeriodEnd, false, "it renews once more before it ends");
  assert.equal(state({}).cancelAtPeriodEnd, false);
});

test("a plan's days are Brussels days: the day it renews, or the day it ends once set to end", () => {
  assert.equal(S.brusselsDay(new Date("2027-10-05T21:59:59Z")), "2027-10-05", "summer time, UTC+2");
  assert.equal(S.brusselsDay(new Date("2027-10-05T22:00:00Z")), "2027-10-06");
  assert.equal(S.brusselsDay(new Date("2027-01-10T22:59:59Z")), "2027-01-10", "winter time, UTC+1");
  assert.equal(S.brusselsDay(new Date("2027-01-10T23:00:00Z")), "2027-01-11");

  const end = new Date("2027-10-05T22:30:00Z");
  const row = { item: "timeline_year", status: "active", currentPeriodEnd: end, cancelAtPeriodEnd: false };
  assert.deepEqual(S.livePlanOf(row), { item: "timeline_year", status: "active", renewsOn: "2027-10-06", endsOn: null });
  assert.deepEqual(S.livePlanOf({ ...row, status: "past_due", cancelAtPeriodEnd: true }), {
    item: "timeline_year",
    status: "past_due",
    renewsOn: null,
    endsOn: "2027-10-06",
  });
  assert.equal(S.livePlanOf({ ...row, status: "canceled" }), null);
  assert.equal(S.livePlanOf({ ...row, item: "family" }), null);
});

test("any other event is ignored without a read", async () => {
  for (const type of ["checkout.session.completed", "charge.refunded", "customer.created", "invoice.created"]) {
    assert.equal(await apply(event(type, { id: "obj_1", object: "unknown" })), "ignored", type);
  }
});

/** Each run's own rows, so a second run, or the walk on the same database, finds nothing of the first. */
const run = randomUUID().slice(0, 8);
const users: string[] = [];

async function pg() {
  return import("@workspace/db");
}

/** An account with its one Stripe Customer, as checkout leaves it (reading 1). */
async function buyer(name: string) {
  const { db, usersTable } = await pg();
  const userId = `user_r1712_${run}_${name}`;
  const customer = `cus_r1712_${run}_${name}`;
  const email = `r1712-${run}-${name}@example.com`;
  await db.insert(usersTable).values({ id: userId, email, stripeCustomerId: customer });
  users.push(userId);
  return { userId, customer, email, sub: `sub_r1712_${run}_${name}`, viewer: { userId, sessionId: `s-${userId}` } };
}

/** The purchase POST /checkout makes for a plan before the browser pays (purchases.ts). */
async function checkout(userId: string, item: PlanId): Promise<string> {
  const { db, purchasesTable } = await pg();
  const id = randomUUID();
  await db.insert(purchasesTable).values({
    id,
    userId,
    kind: "plan",
    item,
    cents: CENTS[item],
    fullCents: CENTS[item],
    stripeSessionId: `cs_test_r1712_${id}`,
    tickHash: TICK_HASH,
    tickedAt: new Date(),
    returnTo: "/dashboard/account",
    status: "open",
    isTest: true,
  });
  return id;
}

async function rowOf(subId: string) {
  const { db, subscriptionsTable } = await pg();
  const { eq } = await import("drizzle-orm");
  const [row] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, subId));
  return row ?? null;
}

async function purchasesOf(userId: string) {
  const { db, purchasesTable } = await pg();
  const { asc, eq } = await import("drizzle-orm");
  return db.select().from(purchasesTable).where(eq(purchasesTable.userId, userId)).orderBy(asc(purchasesTable.createdAt));
}

async function ledgerOf(userId: string) {
  const { db, bundlesTable, creditsTable } = await pg();
  const { eq } = await import("drizzle-orm");
  const bundles = await db.select().from(bundlesTable).where(eq(bundlesTable.userId, userId));
  const credits = await db.select().from(creditsTable).where(eq(creditsTable.userId, userId));
  return { bundles, credits };
}

const SUBSCRIBED = { access: true, source: "subscription" };
const NONE = { access: false, source: null };
const receiptsTo = (email: string) => receipts.filter((r) => r.to === email);

after(async () => {
  if (!SCRATCH) return;
  const { db, pool, purchasesTable, subscriptionsTable, usersTable } = await pg();
  const { inArray } = await import("drizzle-orm");
  if (users.length > 0) {
    await db.delete(subscriptionsTable).where(inArray(subscriptionsTable.userId, users));
    await db.delete(purchasesTable).where(inArray(purchasesTable.userId, users));
    // Bundles and credits go with their account.
    await db.delete(usersTable).where(inArray(usersTable.id, users));
  }
  await pool.end();
});

test("created, updated and deleted move the row and the access answer with it", { skip: NO_DB }, async () => {
  const b = await buyer("lifecycle");
  const purchaseId = await checkout(b.userId, "timeline_month");
  const end = NOW + 30 * DAY;
  const shape = { periodEnd: end, purchaseId };

  assert.equal(await apply(event("customer.subscription.created", subscription(b.sub, b.customer, { ...shape, status: "incomplete" }))), "processed");
  const created = await rowOf(b.sub);
  assert.deepEqual(
    created && [created.userId, created.customerId, created.item, created.status, created.currentPeriodEnd?.getTime(), created.cancelAtPeriodEnd, created.isTest],
    [b.userId, b.customer, "timeline_month", "incomplete", end * 1000, false, true],
  );
  assert.deepEqual(await timelineAccess(b.viewer, {}), NONE, "a plan whose first payment hasn't gone through opens nothing");
  assert.equal(await S.livePlan(b.userId), null);

  await apply(event("customer.subscription.updated", subscription(b.sub, b.customer, shape)));
  assert.equal((await rowOf(b.sub))?.status, "active");
  assert.deepEqual(await timelineAccess(b.viewer, {}), SUBSCRIBED);
  const day = S.brusselsDay(new Date(end * 1000));
  assert.deepEqual(await S.livePlan(b.userId), { item: "timeline_month", status: "active", renewsOn: day, endsOn: null });

  await apply(event("customer.subscription.updated", subscription(b.sub, b.customer, { ...shape, cancelAtPeriodEnd: true })));
  assert.equal((await rowOf(b.sub))?.cancelAtPeriodEnd, true);
  assert.deepEqual(await timelineAccess(b.viewer, {}), SUBSCRIBED, "Cancel Timeline keeps it to the period's end");
  assert.deepEqual(await S.livePlan(b.userId), { item: "timeline_month", status: "active", renewsOn: null, endsOn: day });

  await apply(event("customer.subscription.updated", subscription(b.sub, b.customer, shape)));
  assert.deepEqual(await S.livePlan(b.userId), { item: "timeline_month", status: "active", renewsOn: day, endsOn: null }, "kept after all");

  await apply(event("customer.subscription.deleted", subscription(b.sub, b.customer, { ...shape, status: "canceled" })));
  assert.equal((await rowOf(b.sub))?.status, "canceled");
  assert.deepEqual(await timelineAccess(b.viewer, {}), NONE);
  assert.equal(await S.livePlan(b.userId), null);
  assert.equal(await S.activeSubscription(b.userId), null);
});

test("an event that lands late never moves the row back", { skip: NO_DB }, async () => {
  const b = await buyer("late");
  const later = NOW + 60 * DAY;
  await apply(event("customer.subscription.updated", subscription(b.sub, b.customer, { periodEnd: later })));
  await apply(event("customer.subscription.created", subscription(b.sub, b.customer, { status: "incomplete", periodEnd: NOW + 30 * DAY })));
  const row = await rowOf(b.sub);
  assert.deepEqual([row?.status, row?.currentPeriodEnd?.getTime()], ["active", later * 1000], "a created that lands after its update");
  assert.deepEqual(await timelineAccess(b.viewer, {}), SUBSCRIBED);

  await apply(event("customer.subscription.updated", subscription(b.sub, b.customer, { periodEnd: NOW + 30 * DAY })));
  assert.equal((await rowOf(b.sub))?.currentPeriodEnd?.getTime(), later * 1000, "a renewal is never taken back");

  await apply(event("customer.subscription.deleted", subscription(b.sub, b.customer, { status: "canceled", periodEnd: later })));
  await apply(event("customer.subscription.updated", subscription(b.sub, b.customer, { periodEnd: later, cancelAtPeriodEnd: true })));
  assert.equal((await rowOf(b.sub))?.status, "canceled", "an update that lands after the end opens nothing again");
  assert.deepEqual(await timelineAccess(b.viewer, {}), NONE);
});

test("a renewal Stripe couldn't take is past due and keeps Timeline; paying it makes the plan active again", { skip: NO_DB }, async () => {
  const b = await buyer("past-due");
  await checkout(b.userId, "timeline_month");
  const end = NOW + 30 * DAY;
  await apply(event("customer.subscription.updated", subscription(b.sub, b.customer, { periodEnd: end })));

  const renewal = invoice(`in_r1712_${run}_due`, b.sub, b.customer, { reason: "subscription_cycle", periodEnd: end + 30 * DAY });
  assert.equal(await apply(event("invoice.payment_failed", renewal)), "processed");
  assert.equal((await rowOf(b.sub))?.status, "past_due");
  assert.deepEqual(await timelineAccess(b.viewer, {}), SUBSCRIBED, "past due keeps Timeline while Stripe retries");
  assert.equal((await S.livePlan(b.userId))?.status, "past_due");

  await apply(event("invoice.paid", renewal));
  const row = await rowOf(b.sub);
  assert.deepEqual([row?.status, row?.currentPeriodEnd?.getTime()], ["active", (end + 30 * DAY) * 1000]);
  assert.equal((await S.livePlan(b.userId))?.status, "active");
  assert.equal((await purchasesOf(b.userId)).length, 1, "a month that renews is Stripe's receipt alone, no purchase of ours");
  assert.equal((await ledgerOf(b.userId)).bundles.length, 0, "the monthly plan gives no credit");

  const first = await buyer("first-fails");
  await apply(event("customer.subscription.created", subscription(first.sub, first.customer, { status: "incomplete" })));
  await apply(event("invoice.payment_failed", invoice(`in_r1712_${run}_ff`, first.sub, first.customer)));
  assert.equal((await rowOf(first.sub))?.status, "incomplete", "a first payment that fails never made the plan live");
  assert.deepEqual(await timelineAccess(first.viewer, {}), NONE);
});

test("the monthly plan's first paid invoice grants its purchase once and sends one receipt", { skip: NO_DB }, async () => {
  const b = await buyer("monthly");
  const purchaseId = await checkout(b.userId, "timeline_month");
  const invoiceId = `in_r1712_${run}_m1`;
  await apply(event("customer.subscription.created", subscription(b.sub, b.customer, { status: "incomplete", purchaseId })));
  const paid = event("invoice.paid", invoice(invoiceId, b.sub, b.customer, { purchaseId, intent: `pi_r1712_${run}_m1` }));

  assert.equal(await apply(paid), "processed");
  const [purchase] = await purchasesOf(b.userId);
  assert.deepEqual(
    [purchase.id, purchase.status, purchase.stripeInvoice, purchase.stripeSubscription, purchase.stripePaymentIntent, purchase.receiptDelivered],
    [purchaseId, "granted", invoiceId, b.sub, `pi_r1712_${run}_m1`, true],
  );
  assert.ok(purchase.grantedAt instanceof Date);
  assert.equal((await rowOf(b.sub))?.status, "active", "the paid first invoice makes the plan live before its update lands");
  assert.deepEqual(await timelineAccess(b.viewer, {}), SUBSCRIBED);
  assert.equal((await ledgerOf(b.userId)).bundles.length, 0, "the monthly plan comes with no credit");
  assert.deepEqual(receiptsTo(b.email), [
    { to: b.email, item: "timeline_month", cents: 999, campaignName: null, historyUrl: receiptsTo(b.email)[0]?.historyUrl },
  ]);
  assert.match(receiptsTo(b.email)[0].historyUrl, /\/dashboard\?open=credits$/);

  assert.equal(await apply(paid), "processed");
  const [again] = await purchasesOf(b.userId);
  assert.equal(again.grantedAt?.getTime(), purchase.grantedAt?.getTime(), "a replay leaves the grant as it was");
  assert.equal(receiptsTo(b.email).length, 1, "a replay sends no second receipt");

  await apply(event("invoice.payment_failed", invoice(invoiceId, b.sub, b.customer, { purchaseId })));
  assert.equal((await rowOf(b.sub))?.status, "active", "a declined first card that lands after the one that worked changes nothing");
});

test("the yearly plan gives one credit for each year paid, once each, and our receipt only for the first", { skip: NO_DB }, async () => {
  const b = await buyer("yearly");
  const purchaseId = await checkout(b.userId, "timeline_year");
  const yearEnd = NOW + 365 * DAY;
  const shape = { item: "timeline_year" as const, purchaseId, periodEnd: yearEnd };
  await apply(event("customer.subscription.created", subscription(b.sub, b.customer, { ...shape, status: "incomplete" })));
  const first = event(
    "invoice.paid",
    invoice(`in_r1712_${run}_y1`, b.sub, b.customer, { purchaseId, amountPaid: 6999, periodEnd: yearEnd, intent: `pi_r1712_${run}_y1` }),
  );

  await apply(first);
  await apply(first);
  let ledger = await ledgerOf(b.userId);
  assert.deepEqual(
    ledger.bundles.map((bundle) => [bundle.source, bundle.purchaseId, bundle.isTest]),
    [["plan", purchaseId, true]],
    "one credit to give with the first year, however often its invoice comes",
  );
  assert.deepEqual(ledger.credits.map((credit) => credit.status), ["available"]);
  assert.equal(receiptsTo(b.email).length, 1);
  assert.equal(receiptsTo(b.email)[0].item, "timeline_year");

  const renewalId = `in_r1712_${run}_y2`;
  const nextYear = yearEnd + 365 * DAY;
  const renewal = event(
    "invoice.paid",
    invoice(renewalId, b.sub, b.customer, { reason: "subscription_cycle", purchaseId, amountPaid: 6999, periodEnd: nextYear, intent: `pi_r1712_${run}_y2` }),
  );
  await apply(renewal);
  await apply(renewal);

  const purchases = await purchasesOf(b.userId);
  assert.equal(purchases.length, 2, "the year that renews is a purchase of its own, once");
  const renewed = purchases.find((p) => p.id !== purchaseId);
  assert.deepEqual(
    renewed && [renewed.kind, renewed.item, renewed.cents, renewed.fullCents, renewed.stripeInvoice, renewed.stripePaymentIntent],
    ["plan", "timeline_year", 6999, 6999, renewalId, `pi_r1712_${run}_y2`],
  );
  assert.deepEqual(
    renewed && [renewed.stripeSubscription, renewed.stripeSessionId, renewed.tickHash, renewed.status, renewed.isTest],
    [b.sub, null, TICK_HASH, "granted", true],
    "it stands on the tick its checkout took",
  );
  ledger = await ledgerOf(b.userId);
  assert.deepEqual(ledger.bundles.map((bundle) => bundle.purchaseId).sort(), [purchaseId, renewed?.id].sort());
  assert.deepEqual(ledger.credits.map((credit) => credit.status), ["available", "available"]);
  assert.equal(receiptsTo(b.email).length, 1, "a renewal is Stripe's receipt alone");
  assert.equal((await rowOf(b.sub))?.currentPeriodEnd?.getTime(), nextYear * 1000);

  const { creditHistory } = await import("./credits.js");
  const lines = (await creditHistory(b.userId)).map((line) => [line.kind, line.count, line.label]);
  assert.equal(lines.length, 2);
  assert.ok(lines.every(([, count, label]) => count === 1 && label === "With Timeline"), JSON.stringify(lines));
});

test("a refund of a year's payment takes that year's credit back while it is unspent, and never a used one (ADR-277)", { skip: NO_DB }, async () => {
  const { handleStripeEvent } = await import("./fulfilment.js");
  const seen: string[] = [];
  const refundOf = (intent: string, refunded = 6999) => {
    const made = event("charge.refunded", {
      id: `ch_${randomUUID()}`,
      object: "charge",
      amount: 6999,
      amount_captured: 6999,
      amount_refunded: refunded,
      refunded: refunded >= 6999,
      payment_intent: intent,
      livemode: false,
    });
    seen.push(made.id);
    return made;
  };
  const year = async (b: Awaited<ReturnType<typeof buyer>>, tag: string, purchaseId: string, reason: string, periodEnd: number) => {
    const intent = `pi_r1712_${run}_${tag}`;
    await apply(event("invoice.paid", invoice(`in_r1712_${run}_${tag}`, b.sub, b.customer, { reason, purchaseId, amountPaid: 6999, periodEnd, intent })));
    return intent;
  };
  const creditOf = async (userId: string, purchaseId: string) =>
    (await ledgerOf(userId)).bundles.filter((bundle) => bundle.purchaseId === purchaseId);
  const statuses = async (userId: string) => (await ledgerOf(userId)).credits.map((c) => c.status);

  // Unspent: the first year's refund takes its credit and the second year's stays; the second's refund then takes its own.
  const b = await buyer("year-refund");
  const purchaseId = await checkout(b.userId, "timeline_year");
  const end = NOW + 365 * DAY;
  await apply(event("customer.subscription.created", subscription(b.sub, b.customer, { item: "timeline_year", purchaseId, status: "incomplete", periodEnd: end })));
  const first = await year(b, "yr1", purchaseId, "subscription_create", end);
  const second = await year(b, "yr2", purchaseId, "subscription_cycle", end + 365 * DAY);
  assert.deepEqual(await statuses(b.userId), ["available", "available"]);

  const refund = refundOf(first);
  assert.equal(await handleStripeEvent(refund), "processed");
  assert.deepEqual((await statuses(b.userId)).sort(), ["available", "refunded"], "only the refunded year's credit goes");
  assert.equal(await handleStripeEvent(refund), "duplicate");
  assert.equal(await handleStripeEvent(refundOf(first)), "processed", "a second refund event for the same payment");
  assert.deepEqual((await statuses(b.userId)).sort(), ["available", "refunded"], "and it goes once");
  assert.equal(await handleStripeEvent(refundOf(second)), "processed");
  assert.deepEqual(await statuses(b.userId), ["refunded", "refunded"]);
  const { creditHistory } = await import("./credits.js");
  assert.equal((await creditHistory(b.userId)).filter((line) => line.kind === "refunded").reduce((sum, line) => sum + line.count, 0), 2);

  // Spent: a credit already used for a report, or given and claimed, stays with its holder.
  const kept = await buyer("year-spent");
  const keptPurchase = await checkout(kept.userId, "timeline_year");
  await apply(event("customer.subscription.created", subscription(kept.sub, kept.customer, { item: "timeline_year", purchaseId: keptPurchase, status: "incomplete", periodEnd: end })));
  const intent = await year(kept, "spent", keptPurchase, "subscription_create", end);
  const { db, pool, creditsTable } = await pg();
  const { eq } = await import("drizzle-orm");
  await db.update(creditsTable).set({ status: "used" }).where(eq(creditsTable.userId, kept.userId));
  assert.equal(await handleStripeEvent(refundOf(intent)), "processed");
  assert.deepEqual(await statuses(kept.userId), ["used"], "a used credit stays used");
  assert.equal((await creditOf(kept.userId, keptPurchase)).length, 1);
  await pool.query("delete from stripe_events where id = any($1)", [seen]);
});

/** Stripe's invoice payments, from a local server the real client is pointed at; nothing leaves the machine. */
async function invoicePayments(answer: (url: string) => [number, unknown]) {
  const asked: string[] = [];
  const server = createServer((req, res) => {
    asked.push(`${req.method} ${req.url}`);
    const [status, body] = answer(req.url ?? "");
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  });
  server.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  const client = stripe({ APP_ENV: "staging", STRIPE_SECRET_KEY: `sk_test_r1712${run}`, STRIPE_API_BASE: `http://127.0.0.1:${port}` });
  assert.ok(client, "the stand-in client is made");
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { client, asked, close };
}

test("an invoice's payment is read from Stripe when the payload leaves it out, before anything is written", { skip: NO_DB }, async (t) => {
  const b = await buyer("asked");
  const purchaseId = await checkout(b.userId, "timeline_year");
  await apply(event("customer.subscription.created", subscription(b.sub, b.customer, { item: "timeline_year", purchaseId })));
  const invoiceId = `in_r1712_${run}_asked`;
  const paid = event("invoice.paid", invoice(invoiceId, b.sub, b.customer, { purchaseId, amountPaid: 6999, intent: null }));

  const refusing = await invoicePayments(() => [400, { error: { type: "invalid_request_error", message: "refused here" } }]);
  t.after(refusing.close);
  await assert.rejects(apply(paid, { client: refusing.client }));
  const [untouched] = await purchasesOf(b.userId);
  assert.deepEqual([untouched.status, untouched.grantedAt, untouched.stripeInvoice], ["open", null, null]);
  assert.equal((await ledgerOf(b.userId)).bundles.length, 0, "a Stripe that can't answer leaves the event whole for its retry");
  assert.equal(receiptsTo(b.email).length, 0);

  const answering = await invoicePayments((url) =>
    url.startsWith("/v1/invoice_payments")
      ? [200, {
          object: "list",
          has_more: false,
          url: "/v1/invoice_payments",
          data: [
            { id: "inpay_open", object: "invoice_payment", status: "open", payment: { type: "payment_intent", payment_intent: "pi_not_this" } },
            { id: "inpay_paid", object: "invoice_payment", status: "paid", payment: { type: "payment_intent", payment_intent: `pi_r1712_${run}_asked` } },
          ],
        }]
      : [404, { error: { type: "invalid_request_error", message: "no such route" } }],
  );
  t.after(answering.close);
  assert.equal(await apply(paid, { client: answering.client }), "processed");
  assert.deepEqual(answering.asked, [`GET /v1/invoice_payments?invoice=${invoiceId}`]);
  const [granted] = await purchasesOf(b.userId);
  assert.deepEqual([granted.status, granted.stripePaymentIntent], ["granted", `pi_r1712_${run}_asked`], "the paid one, the one a refund names");
  assert.equal((await ledgerOf(b.userId)).bundles.length, 1);
});

/**
 * Stripe's cancel and refund for B-34, from a local server the real client is pointed at. A refund under a key it has
 * seen answers that refund again, as Stripe does for a day; `forget()` drops the keys, as a day later, so a payment
 * refunded already answers `charge_already_refunded`.
 */
async function secondPlanStripe(subs: Map<string, { customer: string; item: PlanId; purchaseId: string }>) {
  const cancels: string[] = [];
  const refunds: Array<{ intent: string; amount: string | undefined; key: string | undefined }> = [];
  const byKey = new Map<string, unknown>();
  const refunded = new Set<string>();
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      const cancelling = /^\/v1\/subscriptions\/([^/?]+)$/.exec(req.url ?? "");
      if (req.method === "DELETE" && cancelling) {
        const id = decodeURIComponent(cancelling[1]);
        const sub = subs.get(id);
        if (!sub) return send(404, { error: { type: "invalid_request_error", code: "resource_missing", message: "No such subscription" } });
        cancels.push(id);
        return send(200, subscription(id, sub.customer, { item: sub.item, purchaseId: sub.purchaseId, status: "canceled" }));
      }
      if (req.method === "POST" && req.url === "/v1/refunds") {
        const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
        const intent = form.get("payment_intent") ?? "";
        const header = req.headers["idempotency-key"];
        const key = Array.isArray(header) ? header[0] : header;
        if (key && byKey.has(key)) return send(200, byKey.get(key));
        if (refunded.has(intent)) {
          return send(400, { error: { type: "invalid_request_error", code: "charge_already_refunded", message: "Charge has already been refunded." } });
        }
        const refund = { id: `re_${refunds.length + 1}`, object: "refund", payment_intent: intent, status: "succeeded" };
        refunds.push({ intent, amount: form.get("amount") ?? undefined, key });
        refunded.add(intent);
        if (key) byKey.set(key, refund);
        return send(200, refund);
      }
      send(404, { error: { type: "invalid_request_error", message: `no route for ${req.method} ${req.url}` } });
    });
  });
  server.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  const client = stripe({ APP_ENV: "staging", STRIPE_SECRET_KEY: `sk_test_r1801${run}`, STRIPE_API_BASE: `http://127.0.0.1:${port}` });
  assert.ok(client, "the stand-in client is made");
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { client, cancels, refunds, forget: () => byKey.clear(), close };
}

test("B-34: a second plan's first payment cancels it at once and refunds it in full; the first stays, access unchanged, and a replay repeats nothing", { skip: NO_DB }, async (t) => {
  const { handleStripeEvent } = await import("./fulfilment.js");
  const { checkoutState } = await import("./purchases.js");
  const b = await buyer("second-plan");
  const firstSub = b.sub;
  const secondSub = `${b.sub}_2`;
  const firstPurchase = await checkout(b.userId, "timeline_month");
  const secondPurchase = await checkout(b.userId, "timeline_year");
  const stand = await secondPlanStripe(new Map([[secondSub, { customer: b.customer, item: "timeline_year", purchaseId: secondPurchase }]]));
  t.after(stand.close);
  const end = NOW + 30 * DAY;

  await apply(event("customer.subscription.created", subscription(firstSub, b.customer, { status: "incomplete", purchaseId: firstPurchase, periodEnd: end })));
  await apply(event("customer.subscription.created", subscription(secondSub, b.customer, { item: "timeline_year", status: "incomplete", purchaseId: secondPurchase })));
  await apply(event("invoice.paid", invoice(`in_r1801_${run}_1`, firstSub, b.customer, { purchaseId: firstPurchase, intent: `pi_r1801_${run}_1`, periodEnd: end })), { client: stand.client });
  const second = event(
    "invoice.paid",
    invoice(`in_r1801_${run}_2`, secondSub, b.customer, { purchaseId: secondPurchase, amountPaid: 6999, intent: `pi_r1801_${run}_2` }),
  );
  assert.equal(await apply(second, { client: stand.client }), "processed");

  assert.deepEqual(stand.cancels, [secondSub], "the second, at once");
  assert.deepEqual(stand.refunds, [{ intent: `pi_r1801_${run}_2`, amount: undefined, key: `sd-second-plan-pi_r1801_${run}_2` }], "its payment, in full");
  assert.deepEqual([(await rowOf(firstSub))?.status, (await rowOf(secondSub))?.status], ["active", "canceled"]);
  const kept = await purchasesOf(b.userId);
  const [first, next] = [firstPurchase, secondPurchase].map((id) => kept.find((p) => p.id === id));
  assert.equal(first?.status, "granted");
  assert.deepEqual(
    next && [next.status, next.grantedAt, next.stripeSubscription, next.stripeInvoice, next.stripePaymentIntent],
    ["open", null, secondSub, `in_r1801_${run}_2`, `pi_r1801_${run}_2`],
    "nothing of the second is granted, and its refund will find it by its payment",
  );
  assert.equal((await ledgerOf(b.userId)).bundles.length, 0, "no yearly credit came with the second");
  assert.equal(receiptsTo(b.email).length, 1, "our receipt went with the first alone");
  assert.deepEqual(await timelineAccess(b.viewer, {}), SUBSCRIBED);
  assert.deepEqual(await S.livePlan(b.userId), { item: "timeline_month", status: "active", renewsOn: S.brusselsDay(new Date(end * 1000)), endsOn: null });

  // The same event again within the day, then a day later when Stripe has forgotten the key.
  assert.equal(await apply(second, { client: stand.client }), "processed");
  stand.forget();
  assert.equal(await apply(second, { client: stand.client }), "processed");
  assert.equal(stand.cancels.length, 1, "a replay finds the second ended and cancels nothing");
  assert.equal(stand.refunds.length, 1, "nor refunds it twice");
  // Stripe's own events for the second land after: they never make it live again.
  await apply(event("customer.subscription.updated", subscription(secondSub, b.customer, { item: "timeline_year", purchaseId: secondPurchase })));
  assert.equal((await rowOf(secondSub))?.status, "canceled");
  assert.deepEqual(await S.livePlan(b.userId), { item: "timeline_month", status: "active", renewsOn: S.brusselsDay(new Date(end * 1000)), endsOn: null });

  // The refund's own event: the page that waited on the second reads it refunded.
  const refundEvent = event("charge.refunded", {
    id: `ch_r1801_${run}_2`,
    object: "charge",
    amount: 6999,
    amount_captured: 6999,
    amount_refunded: 6999,
    refunded: true,
    payment_intent: `pi_r1801_${run}_2`,
    livemode: false,
  });
  t.after(async () => {
    const { pool } = await pg();
    await pool.query("delete from stripe_events where id = $1", [refundEvent.id]);
  });
  assert.equal(await handleStripeEvent(refundEvent), "processed");
  assert.equal((await checkoutState(b.viewer, secondPurchase))?.status, "refunded");
  assert.equal((await checkoutState(b.viewer, firstPurchase))?.status, "granted");
});

test("B-34: two first payments that land at once, before Stripe's subscription events, keep exactly one plan", { skip: NO_DB }, async (t) => {
  const b = await buyer("two-at-once");
  const subs = [b.sub, `${b.sub}_2`];
  const purchases = [await checkout(b.userId, "timeline_month"), await checkout(b.userId, "timeline_month")];
  const stand = await secondPlanStripe(
    new Map(subs.map((id, at) => [id, { customer: b.customer, item: "timeline_month" as const, purchaseId: purchases[at] }])),
  );
  t.after(stand.close);
  const paid = subs.map((id, at) =>
    event("invoice.paid", invoice(`in_r1801_${run}_once${at}`, id, b.customer, { purchaseId: purchases[at], intent: `pi_r1801_${run}_once${at}` })),
  );

  // Enough idle connections for both, so neither waits on a new one and the two run side by side.
  const { pool } = await pg();
  await Promise.all([0, 1, 2, 3].map(() => pool.query("select pg_sleep(0.02)")));
  await Promise.all(paid.map((one) => apply(one, { client: stand.client })));
  const rows = await purchasesOf(b.userId);
  const granted = rows.filter((p) => p.status === "granted");
  assert.equal(granted.length, 1, "one plan is kept");
  const keptAt = purchases.indexOf(granted[0].id);
  const goneAt = 1 - keptAt;
  assert.deepEqual(stand.cancels, [subs[goneAt]]);
  assert.deepEqual(stand.refunds.map((r) => r.intent), [`pi_r1801_${run}_once${goneAt}`]);
  assert.equal(receiptsTo(b.email).length, 1);
  assert.equal(await rowOf(subs[keptAt]), null, "the kept plan's row waits for Stripe's own event");
  assert.equal((await rowOf(subs[goneAt]))?.status, "canceled", "the second's is written from the cancel");

  // Stripe's own events land late: the kept plan's row comes with them, and the second stays cancelled.
  for (const id of subs) await apply(event("customer.subscription.created", subscription(id, b.customer, { status: "incomplete" })));
  await apply(event("customer.subscription.updated", subscription(subs[goneAt], b.customer, {})));
  await apply(event("customer.subscription.updated", subscription(subs[keptAt], b.customer, {})));
  assert.deepEqual([(await rowOf(subs[keptAt]))?.status, (await rowOf(subs[goneAt]))?.status], ["active", "canceled"]);
  assert.deepEqual(await timelineAccess(b.viewer, {}), SUBSCRIBED);
});

test("an event for an account, a plan or a subscription that isn't ours writes nothing", { skip: NO_DB }, async () => {
  const stranger = `sub_r1712_${run}_stranger`;
  assert.equal(await apply(event("customer.subscription.created", subscription(stranger, `cus_r1712_${run}_nobody`))), "ignored");
  assert.equal(await rowOf(stranger), null);

  const b = await buyer("not-timeline");
  const single = subscription(b.sub, b.customer, { lookupKey: "single", product: "single", recurring: null });
  assert.equal(await apply(event("customer.subscription.created", single)), "ignored");
  assert.equal(await rowOf(b.sub), null);
  assert.deepEqual(await timelineAccess(b.viewer, {}), NONE);

  const loose = { ...invoice(`in_r1712_${run}_loose`, b.sub, b.customer), parent: null };
  assert.equal(await apply(event("invoice.paid", loose)), "ignored");
  assert.equal(await apply(event("invoice.payment_failed", loose)), "ignored");
  assert.equal(await apply(event("invoice.paid", invoice(`in_r1712_${run}_nobody`, stranger, `cus_r1712_${run}_nobody`))), "ignored");
});

/** Where the session and sign-in middleware stand in app.ts. */
const viewer: RequestHandler = (req, _res, next) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = `s-${req.userId ?? "anon"}`;
  req.log = logger;
  next();
};

test("GET /timeline/access answers a subscriber's plan, and leaves plan out for a reader with none", { skip: NO_DB }, async (t) => {
  const { default: timelineRouter } = await import("../routes/timeline.js");
  const app = express();
  app.use(viewer);
  app.use("/api", timelineRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const access = async (userId: string) => {
    const res = await fetch(`${base}/api/timeline/access`, { headers: { "x-user": userId } });
    assert.equal(res.status, 200);
    return Z.GetTimelineAccessResponse.parse(await res.json());
  };

  const b = await buyer("route");
  const end = NOW + 365 * DAY;
  await apply(event("customer.subscription.updated", subscription(b.sub, b.customer, { item: "timeline_year", periodEnd: end, cancelAtPeriodEnd: true })));
  const answer = await access(b.userId);
  assert.deepEqual([answer.access, answer.source, answer.hasPersonalReport], [true, "subscription", false]);
  assert.deepEqual(answer.plan, { item: "timeline_year", status: "active", renewsOn: null, endsOn: S.brusselsDay(new Date(end * 1000)) });

  const none = await buyer("route-none");
  const body = await access(none.userId);
  assert.deepEqual(body, { access: false, source: null, hasPersonalReport: false, ask: null });
  assert.equal("plan" in body, false);
});
