/**
 * Checkout on the server (ADR-274): what each item costs on one request, a Checkout Session in Stripe's `elements` mode
 * for the account's own Customer, the purchase row that keeps the tick and the price the buyer agreed to, where a
 * purchase stands for the page that waits on it, and the Customer Portal. Nothing here adds a credit: only the webhook
 * grants, once Stripe says the payment went through (ADR-275, R-6.2).
 */
import { createHash, randomUUID } from "node:crypto";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import Stripe from "stripe";
import type { z } from "zod";
import type {
  CreateCheckoutBody,
  CreateCheckoutResponse,
  GetCheckoutOptionsResponse,
  GetCheckoutResponse,
  OpenBillingPortalBody,
} from "@workspace/api-zod";
import {
  db,
  purchasesTable,
  usersTable,
  type InsertPurchaseRow,
  type PurchaseRow,
  type PurchaseStatus,
} from "@workspace/db";
import {
  BUNDLES,
  CHECKOUT_TICK,
  LEGAL_IDENTITY,
  PLANS,
  PLAN_TICK,
  saleReady,
  type Bundle,
  type CatalogueItemId,
  type Plan,
  type SellerIdentity,
} from "@workspace/commerce";
import type { Viewer } from "./access.js";
import { readAppEnv } from "./appEnv.js";
import { priceFor } from "./campaigns.js";
import { AUTOMATIC_TAX, publishableKey, stripe, stripeReady } from "./stripe.js";
import {
  couponIdFor,
  lastSync,
  portalConfigurationId,
  priceIdFor,
  type LookupKey,
  type SyncStatus,
} from "./stripeSync.js";
import { activeSubscription } from "./subscriptions.js";
import { readerChart } from "./timeline.js";
import { publicWebBase } from "./waitlist.js";

export type CheckoutOptions = z.infer<typeof GetCheckoutOptionsResponse>;
export type PriceItem = CheckoutOptions["items"][number];
export type CheckoutBody = z.infer<typeof CreateCheckoutBody>;
export type CheckoutStarted = z.infer<typeof CreateCheckoutResponse>;
export type CheckoutState = z.infer<typeof GetCheckoutResponse>;
export type PortalBody = z.infer<typeof OpenBillingPortalBody>;

/** A signed-in reader: buying and the Portal belong to an account on every host (reading 1). */
export type Buyer = Viewer & { userId: string };

/**
 * The steps checkout may send a reader back to (reading 2). The done page opens it as given, so a path off this list
 * would turn our own page into a way to send someone anywhere.
 */
export const RETURN_TO = /^\/(chart|dashboard(\/account)?(\?open=(credits|gift|add|pair))?|report\/[0-9a-f-]{36})$/;

/** The tick's words as a sha256 hex digest, kept on the purchase so the webhook grants only what was agreed to (ADR-274). */
export function tickHashOf(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** In the catalogue's order: the three bundles, then Timeline's two plans (ADR-277). */
const CATALOGUE: readonly (Bundle | Plan)[] = [...BUNDLES, ...PLANS];

function isPlan(item: Bundle | Plan): item is Plan {
  return "interval" in item;
}

function catalogueItem(id: string): Bundle | Plan | null {
  return CATALOGUE.find((item) => item.id === id) ?? null;
}

/** The box the page shows for an item: a plan starts at once, so it carries Timeline's own words (R-6.6, ADR-361). */
export function tickFor(item: Bundle | Plan): string {
  return isPlan(item) ? PLAN_TICK : CHECKOUT_TICK;
}

/** What one request pays for an item: the catalogue's price, or a live campaign's while one runs (R-7.1, ADR-278). */
export interface RequestPrice {
  cents: number;
  campaign: { id: string; name: string; endsOn: string } | null;
}

export type Readiness = { ok: true; reason: null } | { ok: false; reason: string };

/** A plan checkout of the account that Stripe may still take a payment on. */
export interface OpenCheckout {
  purchaseId: string;
  sessionId: string;
}

/**
 * Whether POST /checkout may start a session on this host: Stripe's three keys, the start's sync done without a
 * problem, so the Price a session names carries the catalogue's amount (reading 14), and on production the seller's
 * details the law puts on a sale (reading 8).
 */
export function checkoutReady(
  env: NodeJS.ProcessEnv = process.env,
  sync: SyncStatus | null = lastSync(),
  seller: Readonly<SellerIdentity> = LEGAL_IDENTITY,
): Readiness {
  const keys = stripeReady(env);
  if (!keys.ok) return keys;
  if (!sync) return { ok: false, reason: "the start's Stripe sync has not finished" };
  if (sync.problem !== null) return { ok: false, reason: `the start's Stripe sync: ${sync.problem}` };
  // MB-115 provisional: production sells nothing until LEGAL_IDENTITY carries the postal address a sale needs.
  if (readAppEnv(env) === "production" && !saleReady(seller)) {
    return { ok: false, reason: "the seller's details are not complete" };
  }
  return { ok: true, reason: null };
}

export interface CheckoutDeps {
  env: NodeJS.ProcessEnv;
  client: Stripe | null;
  now: () => Date;
  ready: () => Readiness;
  priceFor: (item: CatalogueItemId, at: Date, slug: string | null) => Promise<RequestPrice>;
  priceIdFor: (lookupKey: LookupKey) => Promise<string | null>;
  couponIdFor: (campaignId: string, item: CatalogueItemId) => Promise<string>;
  portalConfigurationId: () => Promise<string | null>;
  /** Timeline's rule (reading 1): the reader's own chart with a finished Personal report they can read. */
  hasPersonalReport: (buyer: Buyer) => Promise<boolean>;
  hasLiveSubscription: (userId: string) => Promise<boolean>;
  account: (userId: string) => Promise<{ email: string | null; customerId: string | null }>;
  /** The account's address at Clerk, for an account whose local row has none. */
  clerkEmail: (userId: string) => Promise<string | null>;
  /** Stores the account's Customer unless one is stored already, and answers the one stored. */
  keepCustomer: (userId: string, email: string | null, customerId: string) => Promise<string>;
  savePurchase: (row: InsertPurchaseRow) => Promise<void>;
  purchase: (userId: string, purchaseId: string) => Promise<PurchaseRow | null>;
  /** The account's plan purchases still open with a session, the ones a newer plan checkout closes (ADR-359). */
  openPlanCheckouts: (userId: string) => Promise<OpenCheckout[]>;
  /** An open purchase whose session Stripe has just expired, moved as `checkout.session.expired` would move it. */
  expirePurchase: (purchaseId: string) => Promise<void>;
  /** The web's origin, for where Stripe sends a reader back. */
  webBase: string;
}

async function accountOf(userId: string): Promise<{ email: string | null; customerId: string | null }> {
  const [row] = await db
    .select({ email: usersTable.email, customerId: usersTable.stripeCustomerId })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return { email: row?.email ?? null, customerId: row?.customerId ?? null };
}

async function clerkEmailOf(userId: string): Promise<string | null> {
  try {
    const { clerkClient } = await import("@clerk/express");
    const user = await clerkClient.users.getUser(userId);
    return user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    // Without an address Stripe's fields ask for one, and Checkout keeps the one typed on the Customer.
    return null;
  }
}

// The first id stored stays, so two first checkouts at once end on the same Customer, the one the webhook maps back.
async function keepCustomerId(userId: string, email: string | null, customerId: string): Promise<string> {
  const [row] = await db
    .insert(usersTable)
    .values({ id: userId, email, stripeCustomerId: customerId })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        stripeCustomerId: sql`coalesce(${usersTable.stripeCustomerId}, excluded.stripe_customer_id)`,
        updatedAt: new Date(),
      },
    })
    .returning({ customerId: usersTable.stripeCustomerId });
  return row?.customerId ?? customerId;
}

async function savePurchaseRow(row: InsertPurchaseRow): Promise<void> {
  await db.insert(purchasesTable).values(row);
}

async function purchaseOf(userId: string, purchaseId: string): Promise<PurchaseRow | null> {
  const [row] = await db
    .select()
    .from(purchasesTable)
    .where(and(eq(purchasesTable.id, purchaseId), eq(purchasesTable.userId, userId)))
    .limit(1);
  return row ?? null;
}

async function openPlanCheckoutsOf(userId: string): Promise<OpenCheckout[]> {
  const rows = await db
    .select({ purchaseId: purchasesTable.id, sessionId: purchasesTable.stripeSessionId })
    .from(purchasesTable)
    .where(
      and(
        eq(purchasesTable.userId, userId),
        eq(purchasesTable.kind, "plan"),
        eq(purchasesTable.status, "open"),
        isNotNull(purchasesTable.stripeSessionId),
      ),
    );
  return rows.flatMap(({ purchaseId, sessionId }) => (sessionId ? [{ purchaseId, sessionId }] : []));
}

// Only an open purchase moves, so one a payment reached first stays as it is.
async function expirePurchaseRow(purchaseId: string): Promise<void> {
  await db
    .update(purchasesTable)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(purchasesTable.id, purchaseId), eq(purchasesTable.status, "open")));
}

function liveDeps(env: NodeJS.ProcessEnv): CheckoutDeps {
  const client = stripe(env);
  return {
    env,
    client,
    now: () => new Date(),
    ready: () => checkoutReady(env),
    priceFor,
    priceIdFor: (lookupKey) => priceIdFor(lookupKey, client),
    couponIdFor: (campaignId, item) => couponIdFor(campaignId, item, { env, client }),
    portalConfigurationId: () => portalConfigurationId(client),
    hasPersonalReport: async (buyer) => (await readerChart(buyer)) !== null,
    hasLiveSubscription: async (userId) => (await activeSubscription(userId)) !== null,
    account: accountOf,
    clerkEmail: clerkEmailOf,
    keepCustomer: keepCustomerId,
    savePurchase: savePurchaseRow,
    purchase: purchaseOf,
    openPlanCheckouts: openPlanCheckoutsOf,
    expirePurchase: expirePurchaseRow,
    webBase: publicWebBase(env),
  };
}

function depsWith(over: Partial<CheckoutDeps>): CheckoutDeps {
  return { ...liveDeps(over.env ?? process.env), ...over };
}

function priceItemOf(item: Bundle | Plan, price: RequestPrice): PriceItem {
  const plan = isPlan(item);
  return {
    id: item.id,
    kind: plan ? "plan" : "bundle",
    name: item.name,
    line: plan ? null : item.line,
    credits: plan ? null : item.credits,
    interval: plan ? item.interval : null,
    cents: price.cents,
    // The item's own price, struck through beside a campaign's: never the Singles total a bundle also keeps.
    fullCents: item.cents,
    campaign: price.campaign ? { name: price.campaign.name, endsOn: price.campaign.endsOn } : null,
  };
}

/** GET /checkout/options: every item at this request's price, the browser's key, and whether Pay can work (ADR-277, 280). */
export async function checkoutOptions(slug: string | null, over: Partial<CheckoutDeps> = {}): Promise<CheckoutOptions> {
  const deps = depsWith(over);
  const at = deps.now();
  const items = await Promise.all(CATALOGUE.map(async (item) => priceItemOf(item, await deps.priceFor(item.id, at, slug))));
  return { publishableKey: publishableKey(deps.env), ready: deps.ready().ok, items };
}

/** Stripe's account-wide key for the one create that may race: a hash, so the Clerk id stays with us. */
function customerKey(userId: string): string {
  return `sd-customer-${createHash("sha256").update(userId, "utf8").digest("hex").slice(0, 32)}`;
}

function clientOf(deps: CheckoutDeps): Stripe {
  if (!deps.client) throw new Error("Stripe has no client on this host");
  return deps.client;
}

/**
 * The account's one Stripe Customer, made at its first checkout with the account's email (reading 1), so the Portal
 * opens only the buyer's own and every webhook maps back to one account. Two first checkouts at once make one: Stripe
 * answers a second create under the same key with the first one's Customer.
 */
export async function customerFor(userId: string, over: Partial<CheckoutDeps> = {}): Promise<string> {
  const deps = depsWith(over);
  const account = await deps.account(userId);
  if (account.customerId) return account.customerId;
  const client = clientOf(deps);
  const email = account.email ?? (await deps.clerkEmail(userId));
  const customer = await client.customers.create(email ? { email } : {}, { idempotencyKey: customerKey(userId) });
  return deps.keepCustomer(userId, email, customer.id);
}

export interface SessionInput {
  item: Bundle | Plan;
  priceId: string;
  couponId: string | null;
  customerId: string;
  purchaseId: string;
  webBase: string;
}

/** Where a payment method that leaves for its bank's page brings the reader back: the page that waits for the credit. */
export function doneUrl(webBase: string, purchaseId: string): string {
  return `${webBase}/checkout/done?purchase=${encodeURIComponent(purchaseId)}`;
}

/**
 * The Checkout Session behind Pay (ADR-274): Stripe's fields on our page, the line found by its lookup key, a campaign's
 * coupon as the one discount, and the payment methods the Dashboard turns on, Link aside, so no `payment_method_types`.
 */
export function sessionParams(input: SessionInput): Stripe.Checkout.SessionCreateParams {
  const plan = isPlan(input.item);
  const tagged = { purchase_id: input.purchaseId };
  return {
    ui_mode: "elements",
    mode: plan ? "subscription" : "payment",
    customer: input.customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    // Stripe takes one discount and refuses it beside allow_promotion_codes, which is never set: the price is the
    // server's alone (ADR-278).
    ...(input.couponId ? { discounts: [{ coupon: input.couponId }] } : {}),
    // MB-114 provisional: no VAT registration yet, so the Prices include VAT and Stripe Tax stays off.
    automatic_tax: { enabled: AUTOMATIC_TAX },
    // The charge is in the euros the page and the receipt show; a second currency is out of the spec's scope.
    adaptive_pricing: { enabled: false },
    // ADR-346: Link's box came ticked and wanted a phone number before Pay. The methods list can't name Link, so it
    // goes here and the Dashboard keeps choosing every other method.
    wallet_options: { link: { display: "never" } },
    return_url: doneUrl(input.webBase, input.purchaseId),
    client_reference_id: input.purchaseId,
    metadata: tagged,
    ...(plan ? { subscription_data: { metadata: tagged } } : { payment_intent_data: { metadata: tagged } }),
  };
}

export type CheckoutOutcome =
  | { kind: "started"; started: CheckoutStarted }
  | { kind: "tick_required" }
  | { kind: "bad_return" }
  | { kind: "no_personal_report" }
  | { kind: "already_subscribed" }
  | { kind: "unavailable"; reason: string };

/**
 * One Timeline plan per account (ADR-359): a plan checkout first expires the account's other plan checkouts still open,
 * so an older tab can no longer pay for a second plan. Stripe expires only an open session and refuses any other, so a
 * session paid or closed since is left to its own events.
 */
async function closeOpenPlanCheckouts(userId: string, client: Stripe, deps: CheckoutDeps): Promise<void> {
  for (const open of await deps.openPlanCheckouts(userId)) {
    try {
      await client.checkout.sessions.expire(open.sessionId);
    } catch (err) {
      if (err instanceof Stripe.errors.StripeInvalidRequestError) continue;
      throw err;
    }
    await deps.expirePurchase(open.purchaseId);
  }
}

/** One line for the log: a lookup of our own Price or coupon sends Stripe nothing of the buyer's, so its words can go. */
function describe(err: unknown): string {
  const type = err && typeof err === "object" && "type" in err && typeof err.type === "string" ? err.type : null;
  const text = err instanceof Error ? err.message.split("\n")[0].slice(0, 200) : String(err);
  return type ? `${type}: ${text}` : text;
}

/**
 * POST /checkout: the refusals in the order a reader can act on them, then the price for this request, its Price and
 * any coupon, the account's Customer, the session, and the purchase row with the tick's hash and time. The row is
 * written before the client secret leaves, so no one can pay a session the webhook would find no row for.
 */
export async function startCheckout(
  buyer: Buyer,
  body: CheckoutBody,
  over: Partial<CheckoutDeps> = {},
): Promise<CheckoutOutcome> {
  if (body.ticked !== true) return { kind: "tick_required" };
  if (!RETURN_TO.test(body.returnTo)) return { kind: "bad_return" };
  const item = catalogueItem(body.item);
  if (!item) return { kind: "unavailable", reason: `the catalogue has no ${body.item}` };
  const deps = depsWith(over);
  if (isPlan(item)) {
    // A subscriber has nothing to buy, whatever their report: that answer comes first.
    if (await deps.hasLiveSubscription(buyer.userId)) return { kind: "already_subscribed" };
    if (!(await deps.hasPersonalReport(buyer))) return { kind: "no_personal_report" };
  }
  const ready = deps.ready();
  if (!ready.ok) return { kind: "unavailable", reason: ready.reason };
  const client = deps.client;
  if (!client) return { kind: "unavailable", reason: "Stripe has no client on this host" };

  const tickedAt = deps.now();
  const price = await deps.priceFor(item.id, tickedAt, body.campaign?.trim() || null);
  let priceId: string | null;
  let couponId: string | null = null;
  try {
    priceId = await deps.priceIdFor(item.lookupKey);
    // Without its coupon the session would charge the full price to a buyer shown the campaign's, so none starts.
    if (price.campaign) couponId = await deps.couponIdFor(price.campaign.id, item.id);
  } catch (err) {
    return { kind: "unavailable", reason: `the ${item.lookupKey} Price or its coupon: ${describe(err)}` };
  }
  if (!priceId) return { kind: "unavailable", reason: `no Price on sale answers ${item.lookupKey}` };

  const customerId = await customerFor(buyer.userId, deps);
  if (isPlan(item)) await closeOpenPlanCheckouts(buyer.userId, client, deps);
  const purchaseId = randomUUID();
  const session = await client.checkout.sessions.create(
    sessionParams({ item, priceId, couponId, customerId, purchaseId, webBase: deps.webBase }),
  );
  // Pay shows the server's amount: a session that would charge anything else is never handed to the browser.
  if (session.amount_total !== price.cents) {
    return { kind: "unavailable", reason: `Stripe's total ${session.amount_total} is not the ${price.cents} cents shown` };
  }
  if (!session.client_secret) return { kind: "unavailable", reason: "the session came back without a client secret" };

  await deps.savePurchase({
    id: purchaseId,
    userId: buyer.userId,
    kind: isPlan(item) ? "plan" : "bundle",
    item: item.id,
    cents: price.cents,
    fullCents: item.cents,
    campaignId: price.campaign?.id ?? null,
    stripeSessionId: session.id,
    stripePaymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : null,
    tickHash: tickHashOf(tickFor(item)),
    tickedAt,
    returnTo: body.returnTo,
    status: "open",
    isTest: !session.livemode,
  });
  return { kind: "started", started: { purchaseId, clientSecret: session.client_secret, amountCents: price.cents } };
}

const STATE_OF: Record<PurchaseStatus, CheckoutState["status"]> = {
  open: "open",
  granted: "granted",
  failed: "failed",
  expired: "expired",
  // The contract has one word for credits taken back, whether by a refund or a dispute (ADR-275).
  refunded: "refunded",
  disputed: "refunded",
};

/** GET /checkout/{purchaseId}: where the purchase stands, for its buyer alone; null for anyone else (ADR-274). */
export async function checkoutState(
  viewer: Viewer,
  purchaseId: string,
  over: Partial<CheckoutDeps> = {},
): Promise<CheckoutState | null> {
  if (!viewer.userId) return null;
  const deps = depsWith(over);
  const row = await deps.purchase(viewer.userId, purchaseId);
  const item = row ? catalogueItem(row.item) : null;
  if (!row || !item) return null;
  return {
    status: STATE_OF[row.status],
    item: item.id,
    returnTo: row.returnTo,
    credits: isPlan(item) ? null : item.credits,
  };
}

export type PortalOutcome =
  | { kind: "opened"; url: string }
  | { kind: "bad_return" }
  | { kind: "no_customer" }
  | { kind: "unavailable"; reason: string };

/**
 * POST /billing/portal: Stripe's Customer Portal for the account's own Customer, on the settings the sync keeps, so the
 * Dashboard's default settings never decide what a subscriber may change (reading 7).
 */
export async function openPortal(buyer: Buyer, body: PortalBody, over: Partial<CheckoutDeps> = {}): Promise<PortalOutcome> {
  if (!RETURN_TO.test(body.returnTo)) return { kind: "bad_return" };
  const deps = depsWith(over);
  const { customerId } = await deps.account(buyer.userId);
  if (!customerId) return { kind: "no_customer" };
  const keys = stripeReady(deps.env);
  if (!keys.ok) return { kind: "unavailable", reason: keys.reason };
  const client = clientOf(deps);
  const configuration = await deps.portalConfigurationId();
  if (!configuration) return { kind: "unavailable", reason: "the Customer Portal's settings are not in place" };
  const session = await client.billingPortal.sessions.create({
    customer: customerId,
    configuration,
    return_url: `${deps.webBase}${body.returnTo}`,
  });
  return { kind: "opened", url: session.url };
}
