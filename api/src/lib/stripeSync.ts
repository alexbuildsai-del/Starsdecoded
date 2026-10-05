/**
 * Stripe's Products, Prices, campaign coupons and Customer Portal settings, made from the catalogue at each start and
 * never by hand or from a button (ADR-277, 315). Each is found by a name typed once: a Product by its catalogue key,
 * which is its id; a Price by its lookup key; a coupon by an id made from its campaign, item and amount; the portal's
 * settings by their metadata. So a second run finds everything in place and changes nothing, and a new amount is a new
 * Price that takes the lookup key over, while every sale already made keeps the Price it was made on.
 */
import { createHash } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db, campaignsTable } from "@workspace/db";
import {
  BUNDLES,
  CAMPAIGN_ITEMS,
  PLANS,
  type Bundle,
  type BundleId,
  type CatalogueItemId,
  type Plan,
} from "@workspace/commerce";
import { logger } from "./logger.js";
import { TAX_BEHAVIOR, stripe, stripeSettings } from "./stripe.js";
import { publicWebBase } from "./waitlist.js";

export type LookupKey = Bundle["lookupKey"] | Plan["lookupKey"];

export interface PriceSpec {
  item: CatalogueItemId;
  lookupKey: LookupKey;
  /** Euro cents, VAT included, as the catalogue types them (R-6.3). */
  cents: number;
  /** A plan's; a bundle is paid once. */
  interval: Plan["interval"] | null;
}

export interface ProductSpec {
  /** The Product's id in Stripe: the catalogue's key, so it is found without storing anything. */
  id: string;
  name: string;
  prices: readonly PriceSpec[];
}

const CURRENCY = "eur";
const TIMELINE: Plan["name"] = "Timeline";

/** Four Products: each bundle with its one Price, and Timeline with its month and its year. */
export function catalogueProducts(bundles: readonly Bundle[] = BUNDLES, plans: readonly Plan[] = PLANS): ProductSpec[] {
  return [
    ...bundles.map((bundle) => ({
      id: bundle.lookupKey,
      name: bundle.name,
      prices: [{ item: bundle.id, lookupKey: bundle.lookupKey, cents: bundle.cents, interval: null }],
    })),
    {
      id: "timeline",
      name: TIMELINE,
      prices: plans.map((plan) => ({
        item: plan.id,
        lookupKey: plan.lookupKey,
        cents: plan.cents,
        interval: plan.interval,
      })),
    },
  ];
}

type Wanted = PriceSpec & { product: string };

function wantedPrices(products: readonly ProductSpec[]): Wanted[] {
  return products.flatMap((product) => product.prices.map((price) => ({ ...price, product: product.id })));
}

export interface SyncResult {
  /** Products in place after the run; four when all is well. */
  products: number;
  /** Prices found by their lookup keys after the run; five when all is well. */
  prices: number;
  /** The lookup keys this run moved to a new Price, because the catalogue's amount changed. */
  moved: string[];
  /** Coupons in place for the campaigns running or still to come. */
  coupons: number;
  /** Whether the Customer Portal has our settings: cancel at the period's end, the card, the invoices. */
  portal: boolean;
  /** Lookup keys no Price on sale answered after the run; any one is a problem. */
  missing: string[];
}

export interface SyncStatus {
  at: Date;
  problem: string | null;
}

/** A campaign as its coupons need it: its price for each item in cents, and the coupon ids already stored. */
export type CouponCampaign = { id: string; name: string; prices: unknown; coupons: unknown };

export interface SyncDeps {
  env: NodeJS.ProcessEnv;
  client: Stripe | null;
  products: readonly ProductSpec[];
  /** The campaigns still running or to come, the ones that need their coupons now. */
  campaigns(): Promise<CouponCampaign[]>;
  campaign(id: string): Promise<CouponCampaign | null>;
  saveCoupon(campaignId: string, item: BundleId, couponId: string): Promise<void>;
  /** The web's origin, for the portal's links back to us. */
  webBase: string;
}

const CAMPAIGN_COLUMNS = {
  id: campaignsTable.id,
  name: campaignsTable.name,
  prices: campaignsTable.prices,
  coupons: campaignsTable.coupons,
};

// A campaign's days are whole days in Brussels (reading 5), so one that ends today runs until midnight there.
async function liveAndComingCampaigns(): Promise<CouponCampaign[]> {
  return db
    .select(CAMPAIGN_COLUMNS)
    .from(campaignsTable)
    .where(
      and(
        isNull(campaignsTable.endedAt),
        sql`${campaignsTable.endsOn} >= (now() AT TIME ZONE 'Europe/Brussels')::date`,
      ),
    );
}

async function campaignById(id: string): Promise<CouponCampaign | null> {
  const [row] = await db.select(CAMPAIGN_COLUMNS).from(campaignsTable).where(eq(campaignsTable.id, id)).limit(1);
  return row ?? null;
}

// Merged into the stored object, so a campaign covering both items keeps the other item's coupon.
async function saveCouponId(campaignId: string, item: BundleId, couponId: string): Promise<void> {
  await db
    .update(campaignsTable)
    .set({
      coupons: sql`coalesce(${campaignsTable.coupons}, '{}'::jsonb)
        || jsonb_build_object(${item}::text, ${couponId}::text)`,
    })
    .where(eq(campaignsTable.id, campaignId));
}

function liveDeps(env: NodeJS.ProcessEnv): SyncDeps {
  return {
    env,
    client: stripe(env),
    products: catalogueProducts(),
    campaigns: liveAndComingCampaigns,
    campaign: campaignById,
    saveCoupon: saveCouponId,
    webBase: publicWebBase(env),
  };
}

function depsWith(over: Partial<SyncDeps>): SyncDeps {
  return { ...liveDeps(over.env ?? process.env), ...over };
}

function notSetUp(env: NodeJS.ProcessEnv): string {
  const settings = stripeSettings(env);
  return "problem" in settings ? settings.problem : "Stripe has no client here";
}

function clientOf(deps: SyncDeps): Stripe {
  if (!deps.client) throw new Error(`Stripe is not set up: ${notSetUp(deps.env)}`);
  return deps.client;
}

function stripeCode(err: unknown): string | undefined {
  return err && typeof err === "object" && "code" in err && typeof err.code === "string" ? err.code : undefined;
}

/** The object, or null when Stripe has none by that id. */
async function orNull<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (err) {
    if (stripeCode(err) === "resource_missing") return null;
    throw err;
  }
}

/** The Prices on sale that answer these lookup keys, each with its Product. */
async function onSaleByKey(client: Stripe, keys: readonly string[]): Promise<Map<string, Stripe.Price>> {
  const found = new Map<string, Stripe.Price>();
  // Stripe answers at most ten lookup keys a call, and a key names one Price at most.
  for (let at = 0; at < keys.length; at += 10) {
    const chunk = keys.slice(at, at + 10);
    const page = await client.prices.list({ lookup_keys: chunk, active: true, expand: ["data.product"], limit: 10 });
    for (const price of page.data) if (price.lookup_key) found.set(price.lookup_key, price);
  }
  return found;
}

function productIdOf(price: Stripe.Price): string {
  return typeof price.product === "string" ? price.product : price.product.id;
}

function sameAs(price: Stripe.Price, wanted: Wanted): boolean {
  const billing = wanted.interval
    ? price.type === "recurring" &&
      price.recurring?.interval === wanted.interval &&
      price.recurring.interval_count === 1
    : price.type === "one_time";
  return (
    productIdOf(price) === wanted.product &&
    price.currency === CURRENCY &&
    price.unit_amount === wanted.cents &&
    price.tax_behavior === TAX_BEHAVIOR &&
    billing
  );
}

function onLiveProduct(price: Stripe.Price): boolean {
  const product = price.product;
  return typeof product !== "string" && !product.deleted && product.active;
}

async function ensureProduct(client: Stripe, product: ProductSpec): Promise<void> {
  const now = await orNull(() => client.products.retrieve(product.id));
  if (!now) {
    await client.products.create({ id: product.id, name: product.name });
    return;
  }
  if (now.name !== product.name || !now.active) {
    await client.products.update(product.id, { name: product.name, active: true });
  }
}

function priceParams(price: Wanted): Stripe.PriceCreateParams {
  return {
    product: price.product,
    currency: CURRENCY,
    unit_amount: price.cents,
    tax_behavior: TAX_BEHAVIOR,
    lookup_key: price.lookupKey,
    // The key leaves the Price that held it in the same call, so no moment passes with no Price answering it.
    transfer_lookup_key: true,
    ...(price.interval ? { recurring: { interval: price.interval } } : {}),
  };
}

/**
 * A Price on one of our Products that no lookup key names can no longer be bought through us, so it leaves sale: what
 * a run cut off between moving a key and retiring the old Price leaves behind, or a Price someone added by hand.
 */
async function retireUnnamed(client: Stripe, product: ProductSpec): Promise<void> {
  const keys = new Set<string>(product.prices.map((price) => price.lookupKey));
  const unnamed: string[] = [];
  for await (const price of client.prices.list({ product: product.id, active: true, limit: 100 })) {
    if (!price.lookup_key || !keys.has(price.lookup_key)) unnamed.push(price.id);
  }
  for (const id of unnamed) await client.prices.update(id, { active: false });
}

/** Products and Prices as the catalogue has them; answers the lookup keys it moved. */
async function syncCatalogue(client: Stripe, products: readonly ProductSpec[]): Promise<string[]> {
  const wanted = wantedPrices(products);
  const onSale = await onSaleByKey(client, wanted.map((price) => price.lookupKey));
  for (const product of products) await ensureProduct(client, product);
  const moved: string[] = [];
  for (const price of wanted) {
    const now = onSale.get(price.lookupKey);
    if (now && sameAs(now, price)) continue;
    await client.prices.create(priceParams(price));
    if (now) {
      await client.prices.update(now.id, { active: false });
      moved.push(price.lookupKey);
    }
  }
  for (const product of products) await retireUnnamed(client, product);
  return moved;
}

const priceIds = new WeakMap<Stripe, Map<string, string>>();

/** What a buyer sees after the run, read back by key: the proof that the four and the five are there. */
async function inPlace(client: Stripe, products: readonly ProductSpec[]) {
  const wanted = wantedPrices(products);
  const onSale = await onSaleByKey(client, wanted.map((price) => price.lookupKey));
  const ids = new Map<string, string>();
  for (const price of wanted) {
    const now = onSale.get(price.lookupKey);
    if (now && sameAs(now, price) && onLiveProduct(now)) ids.set(price.lookupKey, now.id);
  }
  priceIds.set(client, ids);
  return {
    products: new Set(wanted.filter((price) => ids.has(price.lookupKey)).map((price) => price.product)).size,
    prices: ids.size,
    missing: wanted.filter((price) => !ids.has(price.lookupKey)).map((price) => price.lookupKey),
  };
}

/**
 * The Price a lookup key answers, for a Checkout Session's line item; null when none does. Checkout asks only once the
 * start's run has succeeded (reading 14), so the Price it gets carries the catalogue's amount.
 */
export async function priceIdFor(lookupKey: LookupKey, client: Stripe | null = stripe()): Promise<string | null> {
  if (!client) return null;
  const known = priceIds.get(client)?.get(lookupKey);
  if (known) return known;
  const id = (await onSaleByKey(client, [lookupKey])).get(lookupKey)?.id ?? null;
  if (id) priceIds.set(client, new Map(priceIds.get(client)).set(lookupKey, id));
  return id;
}

const PORTAL_MARK = "starsdecoded";

/**
 * Cancel at the period's end, change the card, read the invoices: the plan's whole page at Stripe (reading 7). The
 * links go to our Terms and Privacy pages and back to the Account page.
 */
function portalSettings(webBase: string) {
  return {
    business_profile: { privacy_policy_url: `${webBase}/privacy`, terms_of_service_url: `${webBase}/terms` },
    default_return_url: `${webBase}/dashboard/account`,
    features: {
      customer_update: { enabled: false },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      subscription_update: { enabled: false },
    },
    metadata: { synced_by: PORTAL_MARK },
  } satisfies Stripe.BillingPortal.ConfigurationCreateParams;
}

function samePortal(now: Stripe.BillingPortal.Configuration, wanted: ReturnType<typeof portalSettings>): boolean {
  const { features } = now;
  return (
    now.active &&
    now.default_return_url === wanted.default_return_url &&
    now.business_profile.privacy_policy_url === wanted.business_profile.privacy_policy_url &&
    now.business_profile.terms_of_service_url === wanted.business_profile.terms_of_service_url &&
    features.customer_update.enabled === wanted.features.customer_update.enabled &&
    features.invoice_history.enabled === wanted.features.invoice_history.enabled &&
    features.payment_method_update.enabled === wanted.features.payment_method_update.enabled &&
    features.subscription_cancel.enabled === wanted.features.subscription_cancel.enabled &&
    features.subscription_cancel.mode === wanted.features.subscription_cancel.mode &&
    features.subscription_update.enabled === wanted.features.subscription_update.enabled
  );
}

async function findPortal(client: Stripe): Promise<Stripe.BillingPortal.Configuration | null> {
  for await (const config of client.billingPortal.configurations.list({ limit: 100 })) {
    if (config.metadata?.synced_by === PORTAL_MARK) return config;
  }
  return null;
}

const portalIds = new WeakMap<Stripe, string>();

async function syncPortal(client: Stripe, webBase: string): Promise<void> {
  const wanted = portalSettings(webBase);
  const now = await findPortal(client);
  if (!now) {
    portalIds.set(client, (await client.billingPortal.configurations.create(wanted)).id);
    return;
  }
  if (!samePortal(now, wanted)) await client.billingPortal.configurations.update(now.id, { ...wanted, active: true });
  portalIds.set(client, now.id);
}

/**
 * The portal settings the sync keeps, for POST /billing/portal to name: a session that names none gets the account's
 * default settings, which belong to the Dashboard and not to this code.
 */
export async function portalConfigurationId(client: Stripe | null = stripe()): Promise<string | null> {
  if (!client) return null;
  const known = portalIds.get(client);
  if (known) return known;
  const found = await findPortal(client);
  if (found) portalIds.set(client, found.id);
  return found?.id ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The campaign's price for the item in cents, or null when it covers no such item. */
function campaignCents(campaign: CouponCampaign, item: BundleId): number | null {
  const cents = isRecord(campaign.prices) ? campaign.prices[item] : undefined;
  return typeof cents === "number" && Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function storedCoupon(campaign: CouponCampaign, item: BundleId): string | null {
  const id = isRecord(campaign.coupons) ? campaign.coupons[item] : undefined;
  return typeof id === "string" ? id : null;
}

/**
 * One coupon per campaign, item and amount off, so two checkouts making it at once make one: the second create finds
 * the first one's. A catalogue price that changes under a campaign changes the amount off, and so the coupon.
 */
export function couponIdOf(campaignId: string, item: BundleId, amountOff: number): string {
  const digest = createHash("sha256").update(`${campaignId}\n${item}\n${amountOff}`).digest("hex");
  return `sd_${digest.slice(0, 24)}`;
}

const knownCoupons = new WeakMap<Stripe, Set<string>>();

// The receipt names the campaign by its coupon's name (ADR-278). Stripe caps that name at 40 characters, and a longer
// one would refuse the coupon and, with it, every checkout of the campaign.
const COUPON_NAME_MAX = 40;

async function ensureCoupon(
  client: Stripe,
  products: readonly ProductSpec[],
  campaign: CouponCampaign,
  item: BundleId,
): Promise<string> {
  const full = wantedPrices(products).find((price) => price.item === item);
  const cents = campaignCents(campaign, item);
  if (!full || cents === null) throw new Error(`the campaign has no ${item} price`);
  const amountOff = full.cents - cents;
  if (amountOff <= 0) throw new Error(`the campaign's ${item} price is not under the full price`);
  const id = couponIdOf(campaign.id, item, amountOff);
  const known = knownCoupons.get(client) ?? new Set<string>();
  knownCoupons.set(client, known);
  if (known.has(id)) return id;
  if (!(await orNull(() => client.coupons.retrieve(id)))) {
    const name = campaign.name.trim().slice(0, COUPON_NAME_MAX);
    try {
      await client.coupons.create({
        id,
        amount_off: amountOff,
        currency: CURRENCY,
        duration: "once",
        applies_to: { products: [full.product] },
        metadata: { campaign_id: campaign.id, item },
        ...(name ? { name } : {}),
      });
    } catch (err) {
      if (stripeCode(err) !== "resource_already_exists") throw err;
    }
  }
  known.add(id);
  return id;
}

async function keepCoupon(deps: SyncDeps, client: Stripe, campaign: CouponCampaign, item: BundleId): Promise<string> {
  const id = await ensureCoupon(client, deps.products, campaign, item);
  if (storedCoupon(campaign, item) !== id) await deps.saveCoupon(campaign.id, item, id);
  return id;
}

/**
 * The coupon that gives a campaign's price for an item, found or made on the spot, so a campaign saved after the
 * start's run needs no sync. It throws rather than answer without one: checkout then refuses, and never charges the
 * full price to a buyer who was shown the campaign's.
 */
export async function couponIdFor(
  campaignId: string,
  item: CatalogueItemId,
  over: Partial<SyncDeps> = {},
): Promise<string> {
  const campaignItem = CAMPAIGN_ITEMS.find((candidate) => candidate === item);
  if (!campaignItem) throw new Error(`${item} never takes a campaign price`);
  const deps = depsWith(over);
  const client = clientOf(deps);
  const campaign = await deps.campaign(campaignId);
  if (!campaign) throw new Error(`no campaign has the id ${campaignId}`);
  return keepCoupon(deps, client, campaign, campaignItem);
}

async function syncCoupons(deps: SyncDeps, client: Stripe, problems: string[]): Promise<number> {
  let campaigns: CouponCampaign[];
  try {
    campaigns = await deps.campaigns();
  } catch (err) {
    problems.push(`the campaigns could not be read: ${describe(err)}`);
    return 0;
  }
  let inPlaceCount = 0;
  for (const campaign of campaigns) {
    for (const item of CAMPAIGN_ITEMS) {
      if (campaignCents(campaign, item) === null) continue;
      try {
        await keepCoupon(deps, client, campaign, item);
        inPlaceCount += 1;
      } catch (err) {
        problems.push(`the ${item} coupon of campaign ${campaign.id}: ${describe(err)}`);
      }
    }
  }
  return inPlaceCount;
}

/**
 * Brings Stripe in line with the catalogue, the campaigns and the portal's settings. It throws with every problem it
 * met in one line, after doing all it could; a Stripe it can't reach or a key it may not use stops it at the start.
 */
export async function syncProducts(over: Partial<SyncDeps> = {}): Promise<SyncResult> {
  const deps = depsWith(over);
  const client = clientOf(deps);
  const moved = await syncCatalogue(client, deps.products);
  const problems: string[] = [];
  let portal = false;
  try {
    await syncPortal(client, deps.webBase);
    portal = true;
  } catch (err) {
    problems.push(`the portal: ${describe(err)}`);
  }
  const coupons = await syncCoupons(deps, client, problems);
  const found = await inPlace(client, deps.products);
  if (found.missing.length > 0) problems.push(`no Price on sale answers ${found.missing.join(", ")}`);
  if (problems.length > 0) throw new Error(problems.join("; "));
  return { ...found, moved, coupons, portal };
}

const KEY_TEXT = /\b(?:[srp]k_(?:test|live)_|whsec_)[\w*]+/g;

/** One line for the log and the Release view: a failed query's own cause, and never a key. */
function describe(err: unknown): string {
  const inner = err instanceof Error && err.cause instanceof Error ? err.cause : err;
  const text = inner instanceof Error ? inner.message : String(inner);
  return text.split("\n")[0].replace(KEY_TEXT, "[key]").trim().slice(0, 500);
}

function summary(result: SyncResult): string {
  const moved = result.moved.length > 0 ? `${result.moved.join(", ")} moved to a new Price` : "no Price moved";
  const coupons = `${result.coupons} campaign coupons`;
  return `${result.products} Products and ${result.prices} Prices in place, ${moved}, ${coupons}, the portal set`;
}

let last: SyncStatus | null = null;

/** The start's run once it has finished: null before then, and a problem line when it failed or skipped. */
export function lastSync(): SyncStatus | null {
  return last;
}

/**
 * The start's run, after the listen and unawaited (reading 14): a Stripe that is slow or down leaves checkout not
 * ready until the next start and never holds the API back. Nothing in it rejects.
 */
export async function syncProductsOnStart(over: Partial<SyncDeps> = {}): Promise<SyncStatus> {
  try {
    const deps = depsWith(over);
    if (!deps.client) {
      last = { at: new Date(), problem: `skipped, ${notSetUp(deps.env)}` };
      logger.info(`Stripe sync: ${last.problem}`);
      return last;
    }
    const result = await syncProducts(deps);
    last = { at: new Date(), problem: null };
    logger.info(`Stripe sync: ${summary(result)}`);
  } catch (err) {
    last = { at: new Date(), problem: describe(err) };
    logger.warn(`Stripe sync: ${last.problem}`);
  }
  return last;
}
