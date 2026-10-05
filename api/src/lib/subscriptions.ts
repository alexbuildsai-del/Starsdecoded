/**
 * Timeline's plan as Stripe tells it (ADR-277): the webhook hands each subscription and invoice event here, and the
 * `subscriptions` row it mirrors is the second source of Timeline access, after the admin (ADR-262, 264). Nothing here
 * sets a plan's state first: the row is only ever what Stripe last said (R-6.2). A plan's first paid invoice grants the
 * purchase its checkout made and sends our receipt; each paid year of the yearly plan is a purchase and one credit to
 * give (ADR-277), which a refund of that payment takes back while it is unspent (fulfilment.ts finds it by its payment).
 */
import { randomUUID } from "node:crypto";
import { and, eq, gt, inArray, isNotNull, isNull, notInArray, or, sql, type SQL } from "drizzle-orm";
import type Stripe from "stripe";
import {
  db,
  purchasesTable,
  subscriptionsTable,
  usersTable,
  type PurchaseRow,
  type SubscriptionRow,
} from "@workspace/db";
import { PLANS, type PlanId } from "@workspace/commerce";
import { grantBundle } from "./credits.js";
import { logger } from "./logger.js";
import { sendReceiptEmail, type SendReceiptEmailOptions } from "./mailer.js";
import { stripe } from "./stripe.js";
import { catalogueProducts } from "./stripeSync.js";
import { publicWebBase } from "./waitlist.js";

/** The statuses that keep Timeline open (reading 7): past due while Stripe retries a payment that failed. */
export const LIVE_STATUSES = ["active", "trialing", "past_due"] as const;
export type LiveStatus = (typeof LIVE_STATUSES)[number];

// Stripe never moves a subscription out of these, so an event that lands after one is older than the row.
const ENDED = ["canceled", "incomplete_expired"];

// The checkout tags the subscription with the purchase it made (purchases.ts), and every invoice carries the tag.
const PURCHASE_TAG = "purchase_id";

// A Price that has lost its key is still told by its Product, which the sync names from the catalogue.
const TIMELINE_PRODUCT = catalogueProducts().find((product) =>
  product.prices.every((price) => price.interval !== null),
)?.id;

export type SubscriptionOutcome = "processed" | "ignored";

export interface SubscriptionDeps {
  /** Asked only for what a payload leaves out: an invoice's payments, which Stripe sends only when asked for them. */
  client: Stripe | null;
  sendReceipt: (opts: SendReceiptEmailOptions) => Promise<boolean>;
  now: () => Date;
}

function depsWith(over: Partial<SubscriptionDeps>): SubscriptionDeps {
  return {
    client: over.client === undefined ? stripe() : over.client,
    sendReceipt: over.sendReceipt ?? sendReceiptEmail,
    now: over.now ?? (() => new Date()),
  };
}

function idOf(ref: string | { id: string }): string {
  return typeof ref === "string" ? ref : ref.id;
}

function planIdOf(value: string | null | undefined): PlanId | null {
  return PLANS.find((plan) => plan.id === value)?.id ?? null;
}

function planOfPrice(price: Stripe.Price): PlanId | null {
  const keyed = PLANS.find((plan) => plan.lookupKey === price.lookup_key);
  if (keyed) return keyed.id;
  // A new amount moves the key to a new Price, and every plan already sold stays on the Price it was sold on.
  if (idOf(price.product) !== TIMELINE_PRODUCT || price.recurring?.interval_count !== 1) return null;
  return PLANS.find((plan) => plan.interval === price.recurring?.interval)?.id ?? null;
}

export interface SubscriptionState {
  id: string;
  customerId: string;
  /** Null when no Price on it is one of Timeline's. */
  item: PlanId | null;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  isTest: boolean;
}

/** A subscription's payload in the row's terms; since the basil API its period's end is on its item, not on it. */
export function subscriptionState(sub: Stripe.Subscription): SubscriptionState {
  const items = sub.items.data;
  const line = items.find((item) => planOfPrice(item.price) !== null) ?? items[0] ?? null;
  const periodEnd = line ? new Date(line.current_period_end * 1000) : null;
  // A cancel set for the period's end comes as the flag or as `cancel_at` on that end; either way it renews no more.
  const cancelAt = sub.cancel_at === null ? null : sub.cancel_at * 1000;
  const ending = sub.cancel_at_period_end || (cancelAt !== null && periodEnd !== null && cancelAt <= periodEnd.getTime());
  return {
    id: sub.id,
    customerId: idOf(sub.customer),
    item: line ? planOfPrice(line.price) : null,
    status: sub.status,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: ending,
    isTest: !sub.livemode,
  };
}

async function subscriptionRow(id: string): Promise<SubscriptionRow | null> {
  const [row] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, id)).limit(1);
  return row ?? null;
}

/** One Customer per account (reading 1), so the Customer names the account. */
async function accountOfCustomer(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const [row] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.stripeCustomerId, customerId))
    .limit(1);
  return row?.id ?? null;
}

// Events can land out of order, so a period's end only ever moves on: a late event never takes a renewal back.
function laterEnd(at: Date): SQL {
  return sql`greatest(${subscriptionsTable.currentPeriodEnd}, ${at.toISOString()}::timestamptz)`;
}

function mayMoveTo(status: string): SQL {
  const notEnded = notInArray(subscriptionsTable.status, ENDED);
  // Stripe never sends a subscription back to incomplete, so an incomplete that lands after the row moved on is older.
  return status === "incomplete" ? sql`${notEnded} and ${eq(subscriptionsTable.status, "incomplete")}` : notEnded;
}

type SubscriptionEvent = Extract<
  Stripe.Event,
  { type: "customer.subscription.created" | "customer.subscription.updated" | "customer.subscription.deleted" }
>;

type InvoiceEvent = Extract<Stripe.Event, { type: "invoice.paid" | "invoice.payment_failed" }>;

async function mirrorSubscription(event: SubscriptionEvent, deps: SubscriptionDeps): Promise<SubscriptionOutcome> {
  const state = subscriptionState(event.data.object);
  const row = await subscriptionRow(state.id);
  const userId = row?.userId ?? (await accountOfCustomer(state.customerId));
  // A Price we can no longer name keeps the plan the row was first mirrored with.
  const item = state.item ?? planIdOf(row?.item);
  if (!userId || !item) {
    logger.warn({ event: event.id, type: event.type }, "a subscription event names no account or plan of ours");
    return "ignored";
  }
  const now = deps.now();
  await db
    .insert(subscriptionsTable)
    .values({
      id: state.id,
      userId,
      customerId: state.customerId,
      item,
      status: state.status,
      currentPeriodEnd: state.currentPeriodEnd,
      cancelAtPeriodEnd: state.cancelAtPeriodEnd,
      isTest: state.isTest,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: subscriptionsTable.id,
      set: {
        item,
        status: state.status,
        ...(state.currentPeriodEnd ? { currentPeriodEnd: laterEnd(state.currentPeriodEnd) } : {}),
        cancelAtPeriodEnd: state.cancelAtPeriodEnd,
        updatedAt: now,
      },
      setWhere: mayMoveTo(state.status),
    });
  return "processed";
}

/** Since the basil API an invoice names its subscription under its parent, with the subscription's tags as they were. */
function subscriptionOf(invoice: Stripe.Invoice): { id: string; purchaseId: string | null } | null {
  const details = invoice.parent?.subscription_details;
  if (!details?.subscription) return null;
  return { id: idOf(details.subscription), purchaseId: details.metadata?.[PURCHASE_TAG] ?? null };
}

/** The end of the period an invoice pays for, from its subscription lines. */
function paidThrough(invoice: Stripe.Invoice): Date | null {
  const ends = invoice.lines.data.filter((line) => line.parent?.subscription_item_details).map((line) => line.period.end);
  return ends.length > 0 ? new Date(Math.max(...ends) * 1000) : null;
}

/** The payment a refund names (fulfilment.ts), read from Stripe when the payload leaves the invoice's payments out. */
async function paymentIntentOf(invoice: Stripe.Invoice, client: Stripe | null): Promise<string | null> {
  const asked = !invoice.payments && client ? await client.invoicePayments.list({ invoice: invoice.id }) : null;
  const payments = invoice.payments?.data ?? asked?.data ?? [];
  for (const payment of payments) {
    const intent = payment.payment.payment_intent;
    if (payment.status === "paid" && intent) return idOf(intent);
  }
  return null;
}

/**
 * The purchase the plan's checkout made, found by the tag it put on the subscription, else, once a Dashboard edit has
 * cleared the tag, by the first invoice that linked it; only ever the account's own plan purchase.
 */
async function checkoutPurchase(
  userId: string,
  sub: { id: string; purchaseId: string | null },
): Promise<PurchaseRow | null> {
  const mine = and(eq(purchasesTable.userId, userId), eq(purchasesTable.kind, "plan"));
  const found = sub.purchaseId
    ? await db.select().from(purchasesTable).where(and(mine, eq(purchasesTable.id, sub.purchaseId))).limit(1)
    : await db
        .select()
        .from(purchasesTable)
        // A renewal's purchase has no session: only the checkout's does.
        .where(and(mine, eq(purchasesTable.stripeSubscription, sub.id), isNotNull(purchasesTable.stripeSessionId)))
        .limit(1);
  return found[0] ?? null;
}

/** A paid year after the first: its own purchase, once per invoice, under the tick its checkout took. */
async function renewalPurchase(
  checkout: PurchaseRow,
  item: PlanId,
  invoice: Stripe.Invoice,
  subscriptionId: string,
  intent: string | null,
  now: Date,
): Promise<PurchaseRow | null> {
  const plan = PLANS.find((row) => row.id === item);
  if (!plan) return null;
  await db
    .insert(purchasesTable)
    .values({
      id: randomUUID(),
      userId: checkout.userId,
      kind: "plan",
      item,
      cents: invoice.amount_paid,
      fullCents: plan.cents,
      campaignId: null,
      stripeSessionId: null,
      stripePaymentIntent: intent,
      stripeInvoice: invoice.id,
      stripeSubscription: subscriptionId,
      // A plan that renews asks for no new tick: the buyer agreed once, at the checkout that started it.
      tickHash: checkout.tickHash,
      tickedAt: checkout.tickedAt,
      returnTo: checkout.returnTo,
      status: "open",
      isTest: !invoice.livemode,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: purchasesTable.stripeInvoice });
  const [row] = await db.select().from(purchasesTable).where(eq(purchasesTable.stripeInvoice, invoice.id)).limit(1);
  return row ?? null;
}

interface PaidBy {
  subscriptionId: string;
  invoiceId: string;
  intent: string | null;
  test: boolean;
}

/**
 * A plan's purchase granted once (R-6.2), as fulfilment grants a bundle's: under the purchase's lock and only while it
 * is open, so a replay finds it granted and a refund or a dispute that reached it first keeps it as it is.
 * The yearly plan's credit lands with the stamp or not at all. Only the delivery that grants gets the row back.
 */
async function grantPlanPurchase(purchaseId: string, item: PlanId, paid: PaidBy, now: Date): Promise<PurchaseRow | null> {
  return db.transaction(async (tx) => {
    const [purchase] = await tx.select().from(purchasesTable).where(eq(purchasesTable.id, purchaseId)).for("update");
    if (!purchase || purchase.status !== "open") return null;
    // The yearly plan's credit to give, read in History as "With Timeline".
    if (item === "timeline_year") {
      await grantBundle(
        purchase.userId,
        "solo",
        { source: "plan", purchaseId: purchase.id, test: purchase.isTest || paid.test },
        tx,
      );
    }
    const [granted] = await tx
      .update(purchasesTable)
      .set({
        status: "granted",
        grantedAt: now,
        // The ids a refund finds the payment by; a renewal's purchase was made with them.
        stripeSubscription: purchase.stripeSubscription ?? paid.subscriptionId,
        stripeInvoice: purchase.stripeInvoice ?? paid.invoiceId,
        stripePaymentIntent: purchase.stripePaymentIntent ?? paid.intent,
        updatedAt: now,
      })
      .where(eq(purchasesTable.id, purchase.id))
      .returning();
    return granted ?? null;
  });
}

async function accountEmail(userId: string): Promise<string | null> {
  const [row] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return row?.email ?? null;
}

/**
 * Ours on the first payment only, Stripe's on every one (reading 7). A receipt that fails costs the buyer nothing they
 * paid for, so it never fails the event; its outcome is kept on the purchase.
 */
async function sendPlanReceipt(
  event: InvoiceEvent,
  purchase: PurchaseRow,
  item: PlanId,
  deps: SubscriptionDeps,
): Promise<void> {
  const to = (await accountEmail(purchase.userId).catch(() => null)) ?? event.data.object.customer_email;
  const delivered = to
    ? await deps
        .sendReceipt({
          to,
          item,
          cents: purchase.cents,
          campaignName: null,
          // History, in the credits sheet, as fulfilment links it.
          historyUrl: `${publicWebBase()}/dashboard?open=credits`,
        })
        .catch(() => false)
    : false;
  await db
    .update(purchasesTable)
    .set({ receiptDelivered: delivered, updatedAt: deps.now() })
    .where(eq(purchasesTable.id, purchase.id));
  if (!delivered) {
    logger.warn({ event: event.id, type: event.type }, "the receipt for a plan's first payment was not delivered");
  }
}

async function invoicePaid(event: InvoiceEvent, deps: SubscriptionDeps): Promise<SubscriptionOutcome> {
  const invoice = event.data.object;
  const sub = subscriptionOf(invoice);
  if (!sub) return "ignored";
  const row = await subscriptionRow(sub.id);
  const userId = row?.userId ?? (await accountOfCustomer(invoice.customer ? idOf(invoice.customer) : null));
  if (!userId) {
    logger.warn({ event: event.id, type: event.type }, "a plan's invoice names no account of ours");
    return "ignored";
  }
  const checkout = await checkoutPurchase(userId, sub);
  const item = planIdOf(row?.item) ?? planIdOf(checkout?.item);
  const first = invoice.billing_reason === "subscription_create";
  // One credit a year: a renewal grants on the yearly plan alone, and only for a year that renews, not a change.
  const due = first || (invoice.billing_reason === "subscription_cycle" && item === "timeline_year");
  const grantable = due && checkout !== null && item !== null ? { checkout, item } : null;
  // Read before anything is written, so a Stripe that can't answer leaves the event whole for its retry.
  const intent = grantable ? await paymentIntentOf(invoice, deps.client) : null;
  const now = deps.now();

  if (row) {
    const through = paidThrough(invoice);
    await db
      .update(subscriptionsTable)
      .set({
        // A paid invoice settles the payment Stripe was waiting on, so a plan held for it is live again.
        status: sql`case when ${subscriptionsTable.status} in ('incomplete', 'past_due', 'unpaid') then 'active'
          else ${subscriptionsTable.status} end`,
        ...(through ? { currentPeriodEnd: laterEnd(through) } : {}),
        updatedAt: now,
      })
      .where(and(eq(subscriptionsTable.id, sub.id), notInArray(subscriptionsTable.status, ENDED)));
  }
  if (!grantable) {
    if (due) logger.warn({ event: event.id, type: event.type }, "a plan's paid invoice has no checkout of ours to grant");
    return "processed";
  }

  const purchase = first
    ? grantable.checkout
    : await renewalPurchase(grantable.checkout, grantable.item, invoice, sub.id, intent, now);
  if (!purchase) return "processed";
  const paid = { subscriptionId: sub.id, invoiceId: invoice.id, intent, test: !invoice.livemode };
  const granted = await grantPlanPurchase(purchase.id, grantable.item, paid, now);
  if (granted && first) await sendPlanReceipt(event, granted, grantable.item, deps);
  return "processed";
}

async function paymentFailed(event: InvoiceEvent, deps: SubscriptionDeps): Promise<SubscriptionOutcome> {
  const invoice = event.data.object;
  const sub = subscriptionOf(invoice);
  if (!sub) return "ignored";
  const row = await subscriptionRow(sub.id);
  if (!row) return "ignored";
  // A renewal Stripe could not take leaves the plan past due while it retries. A first payment that fails never made
  // it live, and one that lands after the card that worked must not mark a live plan past due.
  if (invoice.billing_reason === "subscription_create") return "processed";
  await db
    .update(subscriptionsTable)
    .set({ status: "past_due", updatedAt: deps.now() })
    .where(and(eq(subscriptionsTable.id, sub.id), inArray(subscriptionsTable.status, ["active", "trialing"])));
  return "processed";
}

/**
 * The webhook's one door for a plan (fulfilment.ts): `customer.subscription.created|updated|deleted`, `invoice.paid` and
 * `invoice.payment_failed`; any other event is ignored. Each is safe to apply twice, and a Stripe read it needs fails
 * before anything is written, so a failed delivery can always be retried.
 */
export async function applySubscriptionEvent(
  event: Stripe.Event,
  over: Partial<SubscriptionDeps> = {},
): Promise<SubscriptionOutcome> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return mirrorSubscription(event, depsWith(over));
    case "invoice.paid":
      return invoicePaid(event, depsWith(over));
    case "invoice.payment_failed":
      return paymentFailed(event, depsWith(over));
    default:
      return "ignored";
  }
}

/**
 * The account's live plan, or null: active, trialing or past due, and a cancel at the period's end keeps it to that end
 * and no further, whenever Stripe's last event lands (reading 7). Two checkouts at once can make two; the one that runs
 * longest answers.
 */
export async function activeSubscription(userId: string, now: Date = new Date()): Promise<SubscriptionRow | null> {
  const [row] = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.userId, userId),
        inArray(subscriptionsTable.status, [...LIVE_STATUSES]),
        or(
          eq(subscriptionsTable.cancelAtPeriodEnd, false),
          isNull(subscriptionsTable.currentPeriodEnd),
          gt(subscriptionsTable.currentPeriodEnd, now),
        ),
      ),
    )
    .orderBy(sql`${subscriptionsTable.currentPeriodEnd} desc nulls last`, sql`${subscriptionsTable.createdAt} desc`)
    .limit(1);
  return row ?? null;
}

const BRUSSELS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Brussels",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The day an instant falls on in Brussels, YYYY-MM-DD: the contract reads a plan's dates there. */
export function brusselsDay(at: Date): string {
  const parts = Object.fromEntries(BRUSSELS.formatToParts(at).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** `TimelineAccess.plan`: the day it renews while it does, or the day it ends once it is set to end. */
export interface LivePlan {
  item: PlanId;
  status: LiveStatus;
  renewsOn: string | null;
  endsOn: string | null;
}

export function livePlanOf(
  row: Pick<SubscriptionRow, "item" | "status" | "currentPeriodEnd" | "cancelAtPeriodEnd">,
): LivePlan | null {
  const item = planIdOf(row.item);
  const status = LIVE_STATUSES.find((live) => live === row.status);
  if (!item || !status) return null;
  const day = row.currentPeriodEnd ? brusselsDay(row.currentPeriodEnd) : null;
  return { item, status, renewsOn: row.cancelAtPeriodEnd ? null : day, endsOn: row.cancelAtPeriodEnd ? day : null };
}

export async function livePlan(userId: string, now: Date = new Date()): Promise<LivePlan | null> {
  const row = await activeSubscription(userId, now);
  return row ? livePlanOf(row) : null;
}
