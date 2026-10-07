/**
 * Stripe's events turned into the ledger (R-6.2, ADR-275). The webhook alone grants: each event once, each purchase
 * once and only with its tick, and a refund or a dispute takes back what its purchase left unused (reading 3).
 * Timeline's subscription and invoice events go to subscriptions.ts, which mirrors them. A line logged here names the
 * event by its type and id and nothing else (reading 13): a payload carries the buyer's email and name.
 */
import { and, count, eq, sql } from "drizzle-orm";
import type { Logger } from "pino";
import type Stripe from "stripe";
import {
  BUNDLE_KINDS,
  db,
  bundlesTable,
  campaignsTable,
  creditsTable,
  purchasesTable,
  stripeEventsTable,
  usersTable,
  type BundleKind,
  type PurchaseRow,
  type PurchaseStatus,
} from "@workspace/db";
import { grantBundle, takeBack } from "./credits.js";
import { logger } from "./logger.js";
import { sendReceiptEmail, type SendReceiptEmailOptions } from "./mailer.js";
import { applySubscriptionEvent } from "./subscriptions.js";
import { publicWebBase } from "./waitlist.js";

export type EventOutcome = "processed" | "duplicate" | "ignored";

export interface FulfilmentDeps {
  log: Pick<Logger, "info" | "warn" | "error">;
  sendReceipt: (opts: SendReceiptEmailOptions) => Promise<boolean>;
  applySubscriptionEvent: (event: Stripe.Event) => Promise<unknown>;
}

const LIVE: FulfilmentDeps = { log: logger, sendReceipt: sendReceiptEmail, applySubscriptionEvent };

const SUBSCRIPTION_EVENT = /^(?:customer\.subscription|invoice)\./;

// The tick's words as checkout keeps them, a sha256 hex digest (purchases.ts). The words themselves are not compared:
// they may change between a checkout and its payment, and a buyer who ticked the box then still gets what they paid for.
const TICK_HASH = /^[0-9a-f]{64}$/;

/** History, in the credits sheet. The link is on the web's configured origin, never on the host a request named. */
export function historyUrl(env: NodeJS.ProcessEnv = process.env): string {
  return `${publicWebBase(env)}/dashboard?open=credits`;
}

/**
 * One Stripe event, once (ADR-275): its row is made the first time its id arrives, and an event an earlier delivery
 * finished answers "duplicate". One that failed part way runs again when Stripe sends it again; each step below is
 * safe to repeat, so a second run grants and takes back nothing the first already did.
 */
export async function handleStripeEvent(event: Stripe.Event, over: Partial<FulfilmentDeps> = {}): Promise<EventOutcome> {
  const deps: FulfilmentDeps = { ...LIVE, ...over };
  await db
    .insert(stripeEventsTable)
    .values({ id: event.id, type: event.type, livemode: event.livemode })
    .onConflictDoNothing({ target: stripeEventsTable.id });
  const [seen] = await db
    .select({ processedAt: stripeEventsTable.processedAt })
    .from(stripeEventsTable)
    .where(eq(stripeEventsTable.id, event.id));
  if (seen?.processedAt) return "duplicate";

  const outcome = await apply(event, deps);
  await db.update(stripeEventsTable).set({ processedAt: new Date() }).where(eq(stripeEventsTable.id, event.id));
  return outcome;
}

async function apply(event: Stripe.Event, deps: FulfilmentDeps): Promise<"processed" | "ignored"> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return sessionPaid(event, event.data.object, deps);
    case "checkout.session.async_payment_failed":
      return sessionEnded(event.data.object, "failed");
    case "checkout.session.expired":
      return sessionEnded(event.data.object, "expired");
    case "charge.refunded":
      return chargeRefunded(event, event.data.object, deps);
    case "charge.dispute.created":
      return chargeDisputed(event, event.data.object, deps);
    default:
      if (!SUBSCRIPTION_EVENT.test(event.type)) return "ignored";
      return (await deps.applySubscriptionEvent(event)) === "ignored" ? "ignored" : "processed";
  }
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function isBundleKind(item: string): item is BundleKind {
  return (BUNDLE_KINDS as readonly string[]).includes(item);
}

/** The purchase carries the tick its buyer ticked (ADR-274): its words' digest and the moment, both set at checkout. */
export function carriesTick(purchase: Pick<PurchaseRow, "tickHash" | "tickedAt">): boolean {
  return TICK_HASH.test(purchase.tickHash) && purchase.tickedAt instanceof Date && !Number.isNaN(purchase.tickedAt.getTime());
}

type BundlePurchase = PurchaseRow & { item: BundleKind };

type Grant =
  | { kind: "granted"; purchase: BundlePurchase; email: string | null }
  | { kind: "settled" }
  | { kind: "not_ours" | "no_tick" | "no_account" };

// Each says why a payment Stripe took added nothing, for the admin to make right from the event in Stripe.
const NOT_GRANTED: Record<Exclude<Grant["kind"], "granted" | "settled">, string> = {
  not_ours: "a paid checkout matches no bundle purchase, so nothing was granted",
  no_tick: "a paid checkout's purchase carries no tick, so nothing was granted",
  no_account: "a paid checkout's account is gone, so nothing was granted",
};

/**
 * A bundle's payment went through: its credits, once per Checkout Session (R-6.2). The purchase row is locked first,
 * so completed and async_payment_succeeded racing each other grant once, and only an open purchase grants: one a
 * refund or a dispute reached first stays as it is. A bank debit completes unpaid and grants on async_payment_succeeded.
 * A plan's session grants nothing here: its invoice does (subscriptions.ts).
 */
async function sessionPaid(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  deps: FulfilmentDeps,
): Promise<"processed" | "ignored"> {
  if (session.payment_status === "unpaid" || session.mode !== "payment") return "ignored";
  const now = new Date();
  const grant = await db.transaction(async (tx): Promise<Grant> => {
    const [purchase] = await tx
      .select()
      .from(purchasesTable)
      .where(eq(purchasesTable.stripeSessionId, session.id))
      .for("update");
    if (!purchase || purchase.kind !== "bundle" || !isBundleKind(purchase.item)) return { kind: "not_ours" };
    if (purchase.status !== "open") return { kind: "settled" };
    if (!carriesTick(purchase)) return { kind: "no_tick" };
    const [buyer] = await tx
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, purchase.userId));
    if (!buyer) return { kind: "no_account" };

    await grantBundle(
      purchase.userId,
      purchase.item,
      { source: "purchase", purchaseId: purchase.id, test: purchase.isTest || !session.livemode },
      tx,
    );
    await tx
      .update(purchasesTable)
      .set({
        status: "granted",
        grantedAt: now,
        stripePaymentIntent: idOf(session.payment_intent) ?? purchase.stripePaymentIntent,
        updatedAt: now,
      })
      .where(eq(purchasesTable.id, purchase.id));
    return { kind: "granted", purchase: { ...purchase, item: purchase.item }, email: buyer.email };
  });

  if (grant.kind === "settled") return "processed";
  if (grant.kind !== "granted") {
    deps.log.error({ event: event.id, type: event.type }, NOT_GRANTED[grant.kind]);
    return "ignored";
  }
  await sendReceipt(event, grant.purchase, grant.email ?? session.customer_details?.email ?? null, session, deps);
  return "processed";
}

async function campaignName(campaignId: string | null): Promise<string | null> {
  if (!campaignId) return null;
  const [row] = await db.select({ name: campaignsTable.name }).from(campaignsTable).where(eq(campaignsTable.id, campaignId));
  return row?.name ?? null;
}

/**
 * Our receipt beside Stripe's (Art. 8(7), ADR-143): sent once, by the event that granted, and its outcome kept on the
 * purchase. A receipt that fails costs the buyer nothing they paid for, so it never fails the event.
 */
async function sendReceipt(
  event: Stripe.Event,
  purchase: BundlePurchase,
  to: string | null,
  session: Stripe.Checkout.Session,
  deps: FulfilmentDeps,
): Promise<void> {
  let delivered = false;
  if (to) {
    const offer = await campaignName(purchase.campaignId).catch(() => null);
    delivered = await deps
      .sendReceipt({
        to,
        item: purchase.item,
        cents: session.amount_total ?? purchase.cents,
        campaignName: offer,
        historyUrl: historyUrl(),
      })
      .catch(() => false);
  }
  await db.update(purchasesTable).set({ receiptDelivered: delivered, updatedAt: new Date() }).where(eq(purchasesTable.id, purchase.id));
  if (!delivered) deps.log.warn({ event: event.id, type: event.type }, "the receipt for a granted purchase was not delivered");
}

/** A session that will never be paid: an expired one, or a bank debit that failed. Only an open purchase moves. */
async function sessionEnded(session: Stripe.Checkout.Session, status: "expired" | "failed"): Promise<"processed" | "ignored"> {
  const moved = await db
    .update(purchasesTable)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(purchasesTable.stripeSessionId, session.id), eq(purchasesTable.status, "open")))
    .returning({ id: purchasesTable.id });
  return moved.length > 0 ? "processed" : "ignored";
}

/**
 * Reading 3 from the charge's own totals: a full refund takes every unused credit, a partial one at most
 * round(credits × refunded ÷ paid). The charge counts every refund so far, so a replay or a later refund takes only
 * what the total still owes.
 */
async function chargeRefunded(event: Stripe.Event, charge: Stripe.Charge, deps: FulfilmentDeps): Promise<"processed" | "ignored"> {
  const full = charge.refunded || charge.amount_refunded >= charge.amount || charge.amount <= 0;
  const owed = (credits: number) => (full ? credits : Math.round((credits * charge.amount_refunded) / charge.amount));
  return takeBackFor(event, idOf(charge.payment_intent), owed, full ? "refunded" : null, deps);
}

/** A dispute takes back every unused credit at once, whatever it ends as (reading 3). */
async function chargeDisputed(event: Stripe.Event, dispute: Stripe.Dispute, deps: FulfilmentDeps): Promise<"processed" | "ignored"> {
  const charge = typeof dispute.charge === "string" ? null : dispute.charge;
  const paymentIntent = idOf(dispute.payment_intent) ?? idOf(charge?.payment_intent);
  return takeBackFor(event, paymentIntent, (credits) => credits, "disputed", deps);
}

/**
 * Takes back what a refund or a dispute owes from each purchase its payment made, under the purchase's lock, so two
 * events on one payment never count the same credits twice. `refunded_at` keeps the first refund or dispute; a
 * partial refund leaves the purchase granted, and one that reached a purchase before its grant keeps it from granting.
 */
async function takeBackFor(
  event: Stripe.Event,
  paymentIntent: string | null,
  owed: (credits: number) => number,
  status: Extract<PurchaseStatus, "refunded" | "disputed"> | null,
  deps: FulfilmentDeps,
): Promise<"processed" | "ignored"> {
  const purchases = paymentIntent
    ? await db.select({ id: purchasesTable.id }).from(purchasesTable).where(eq(purchasesTable.stripePaymentIntent, paymentIntent))
    : [];
  if (purchases.length === 0) {
    deps.log.warn({ event: event.id, type: event.type }, "a refund or a dispute matches no purchase");
    return "ignored";
  }
  for (const { id } of purchases) {
    await db.transaction(async (tx) => {
      const [purchase] = await tx
        .select({ refundedAt: purchasesTable.refundedAt })
        .from(purchasesTable)
        .where(eq(purchasesTable.id, id))
        .for("update");
      if (!purchase) return;
      const [bundle] = await tx
        .select({
          id: bundlesTable.id,
          credits: count(creditsTable.id),
          taken: sql<number>`count(*) filter (where ${creditsTable.status} = 'refunded')`.mapWith(Number),
        })
        .from(bundlesTable)
        .innerJoin(creditsTable, eq(creditsTable.bundleId, bundlesTable.id))
        .where(eq(bundlesTable.purchaseId, id))
        .groupBy(bundlesTable.id);
      if (bundle) {
        const due = Math.min(bundle.credits, owed(bundle.credits)) - bundle.taken;
        if (due > 0) await takeBack(bundle.id, due, tx);
      }
      const now = new Date();
      await tx
        .update(purchasesTable)
        .set({ ...(status ? { status } : {}), refundedAt: purchase.refundedAt ?? now, updatedAt: now })
        .where(eq(purchasesTable.id, id));
    });
  }
  return "processed";
}
