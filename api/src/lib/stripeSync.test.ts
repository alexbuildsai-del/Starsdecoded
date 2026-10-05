/**
 * The Stripe seam and the product sync on a stand-in Stripe (R17-04): a local HTTP server that answers the calls the
 * SDK makes for Products, Prices, coupons and the portal's settings, so the real client runs through STRIPE_API_BASE
 * on the pinned API version and nothing leaves the machine. Pinned: four Products and five Prices found by key, a
 * second run that changes nothing, a new Couple amount that moves `couple`, the campaigns' coupons, a start that never
 * rejects, and the keys each host refuses. The campaigns' queries run on a scratch Postgres when WALK_DATABASE_URL
 * names a bootstrapped one, and skip, saying why, without it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { inArray } from "drizzle-orm";
import Stripe from "stripe";
import { BUNDLES, PLANS, bundleById } from "@workspace/commerce";
import {
  AUTOMATIC_TAX,
  STRIPE_API_VERSION,
  TAX_BEHAVIOR,
  publishableKey,
  stripe,
  stripeReady,
  stripeSettings,
  webhookSecret,
} from "./stripe.js";

const SCRATCH = process.env.WALK_DATABASE_URL;
// The pool connects lazily; without a scratch database nothing here queries it.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
const {
  catalogueProducts,
  couponIdFor,
  couponIdOf,
  lastSync,
  portalConfigurationId,
  priceIdFor,
  syncProducts,
  syncProductsOnStart,
} = await import("./stripeSync.js");
type SyncDeps = import("./stripeSync.js").SyncDeps;
type CouponCampaign = import("./stripeSync.js").CouponCampaign;

type Json = Record<string, unknown>;
type Answer = [status: number, body: unknown];

interface Call {
  method: string;
  path: string;
  params: Json;
  version: string | undefined;
  idempotencyKey: string | undefined;
}

function isJson(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Stripe's form encoding (`a[b][0]=c`) read back into objects; a list comes back keyed "0", "1" and on. */
function decodeForm(text: string): Json {
  const out: Json = {};
  for (const [key, value] of new URLSearchParams(text)) {
    const path = key.replace(/\]/g, "").split("[");
    let node = out;
    for (const part of path.slice(0, -1)) {
      const next = node[part];
      if (isJson(next)) {
        node = next;
      } else {
        const made: Json = {};
        node[part] = made;
        node = made;
      }
    }
    node[path[path.length - 1]] = value;
  }
  return out;
}

const listOf = (value: unknown): string[] =>
  isJson(value) ? Object.values(value).map(String) : value === undefined ? [] : [String(value)];
const flag = (value: unknown, fallback: boolean): boolean => (value === undefined ? fallback : value === "true");
const failure = (status: number, code: string | undefined, message: string): Answer => [
  status,
  { error: { type: "invalid_request_error", code, message } },
];

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function body(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

interface StandIn {
  base: string;
  products: Map<string, Json>;
  prices: Map<string, Json>;
  coupons: Map<string, Json>;
  portals: Map<string, Json>;
  calls: Call[];
  posts(): Call[];
  close(): Promise<void>;
}

/** Stripe's API for the four kinds of object the sync keeps, held in memory; `refuse` answers every call with a 401. */
async function standIn(opts: { refuse?: string } = {}): Promise<StandIn> {
  const products = new Map<string, Json>();
  const prices = new Map<string, Json>();
  const coupons = new Map<string, Json>();
  const portals = new Map<string, Json>();
  const calls: Call[] = [];
  let count = 0;
  const nextId = (prefix: string) => `${prefix}_standin${String(++count).padStart(4, "0")}`;
  const now = () => Math.floor(Date.now() / 1000);

  const list = (rows: Json[], params: Json, url: string): Answer => {
    const from = params.starting_after ? rows.findIndex((row) => row.id === params.starting_after) + 1 : 0;
    const limit = Number(params.limit ?? 10);
    return [200, { object: "list", data: rows.slice(from, from + limit), has_more: from + limit < rows.length, url }];
  };

  const portalOf = (id: string, params: Json, was?: Json): Json => {
    const features = isJson(params.features) ? params.features : {};
    const feature = (name: string): Json => {
      const given = features[name];
      return isJson(given) ? given : {};
    };
    const profile = isJson(params.business_profile) ? params.business_profile : {};
    const cancel = feature("subscription_cancel");
    return {
      id,
      object: "billing_portal.configuration",
      active: flag(params.active, was ? was.active === true : true),
      application: null,
      business_profile: {
        headline: null,
        privacy_policy_url: profile.privacy_policy_url ?? null,
        terms_of_service_url: profile.terms_of_service_url ?? null,
      },
      created: was?.created ?? now(),
      default_return_url: params.default_return_url ?? null,
      features: {
        customer_update: { enabled: flag(feature("customer_update").enabled, false), allowed_updates: [] },
        invoice_history: { enabled: flag(feature("invoice_history").enabled, false) },
        payment_method_update: {
          enabled: flag(feature("payment_method_update").enabled, false),
          payment_method_configuration: null,
        },
        subscription_cancel: {
          enabled: flag(cancel.enabled, false),
          mode: cancel.mode ?? "at_period_end",
          proration_behavior: "none",
          cancellation_reason: { enabled: false, options: [] },
        },
        subscription_update: {
          enabled: flag(feature("subscription_update").enabled, false),
          billing_cycle_anchor: null,
          default_allowed_updates: [],
          products: [],
          proration_behavior: "none",
          schedule_at_period_end: { conditions: [] },
          trial_update_behavior: "end_trial",
        },
      },
      is_default: false,
      livemode: false,
      login_page: { enabled: false, url: null },
      metadata: isJson(params.metadata) ? params.metadata : (was?.metadata ?? {}),
      name: null,
      updated: now(),
    };
  };

  const routes: Array<[string, RegExp, (params: Json, id: string) => Answer]> = [
    [
      "GET",
      /^\/v1\/products\/([^/]+)$/,
      (_, id) => {
        const product = products.get(id);
        return product ? [200, product] : failure(404, "resource_missing", `No such product: '${id}'`);
      },
    ],
    [
      "POST",
      /^\/v1\/products$/,
      (params) => {
        const id = typeof params.id === "string" ? params.id : nextId("prod");
        if (products.has(id)) return failure(400, "resource_already_exists", "Product already exists.");
        const product: Json = {
          id,
          object: "product",
          active: flag(params.active, true),
          created: now(),
          default_price: null,
          description: null,
          images: [],
          livemode: false,
          marketing_features: [],
          metadata: {},
          name: String(params.name),
          package_dimensions: null,
          shippable: null,
          statement_descriptor: null,
          tax_code: null,
          type: "service",
          unit_label: null,
          updated: now(),
          url: null,
        };
        products.set(id, product);
        return [200, product];
      },
    ],
    [
      "POST",
      /^\/v1\/products\/([^/]+)$/,
      (params, id) => {
        const product = products.get(id);
        if (!product) return failure(404, "resource_missing", `No such product: '${id}'`);
        if (typeof params.name === "string") product.name = params.name;
        product.active = flag(params.active, product.active === true);
        return [200, product];
      },
    ],
    [
      "GET",
      /^\/v1\/prices$/,
      (params) => {
        const keys = listOf(params.lookup_keys);
        const rows = [...prices.values()].filter(
          (price) =>
            (params.active === undefined || price.active === flag(params.active, true)) &&
            (keys.length === 0 || keys.includes(String(price.lookup_key))) &&
            (params.product === undefined || price.product === params.product),
        );
        const shown = listOf(params.expand).includes("data.product")
          ? rows.map((price) => ({ ...price, product: products.get(String(price.product)) ?? price.product }))
          : rows;
        return list(shown, params, "/v1/prices");
      },
    ],
    [
      "POST",
      /^\/v1\/prices$/,
      (params) => {
        const productId = String(params.product);
        if (!products.has(productId)) return failure(400, "resource_missing", `No such product: '${productId}'`);
        const key = typeof params.lookup_key === "string" ? params.lookup_key : null;
        const holder = key ? [...prices.values()].find((price) => price.lookup_key === key) : undefined;
        if (holder) {
          if (params.transfer_lookup_key !== "true") {
            return failure(400, undefined, `A price (${String(holder.id)}) already uses that lookup key.`);
          }
          holder.lookup_key = null;
        }
        const recurringParams = params.recurring;
        const recurring = isJson(recurringParams)
          ? {
              interval: String(recurringParams.interval),
              interval_count: Number(recurringParams.interval_count ?? 1),
              meter: null,
              trial_period_days: null,
              usage_type: "licensed",
            }
          : null;
        const price: Json = {
          id: nextId("price"),
          object: "price",
          active: true,
          billing_scheme: "per_unit",
          created: now(),
          currency: String(params.currency),
          custom_unit_amount: null,
          livemode: false,
          lookup_key: key,
          metadata: {},
          nickname: null,
          product: productId,
          recurring,
          tax_behavior: typeof params.tax_behavior === "string" ? params.tax_behavior : "unspecified",
          tiers_mode: null,
          transform_quantity: null,
          type: recurring ? "recurring" : "one_time",
          unit_amount: Number(params.unit_amount),
          unit_amount_decimal: String(params.unit_amount),
        };
        prices.set(String(price.id), price);
        return [200, price];
      },
    ],
    [
      "POST",
      /^\/v1\/prices\/([^/]+)$/,
      (params, id) => {
        const price = prices.get(id);
        if (!price) return failure(404, "resource_missing", `No such price: '${id}'`);
        price.active = flag(params.active, price.active === true);
        return [200, price];
      },
    ],
    [
      "GET",
      /^\/v1\/coupons\/([^/]+)$/,
      (_, id) => {
        const coupon = coupons.get(id);
        return coupon ? [200, coupon] : failure(404, "resource_missing", `No such coupon: '${id}'`);
      },
    ],
    [
      "POST",
      /^\/v1\/coupons$/,
      (params) => {
        const id = typeof params.id === "string" ? params.id : nextId("coupon");
        if (coupons.has(id)) return failure(400, "resource_already_exists", "Coupon already exists.");
        const appliesTo = params.applies_to;
        const coupon: Json = {
          id,
          object: "coupon",
          amount_off: Number(params.amount_off),
          applies_to: { products: isJson(appliesTo) ? listOf(appliesTo.products) : [] },
          created: now(),
          currency: String(params.currency),
          duration: String(params.duration ?? "once"),
          duration_in_months: null,
          livemode: false,
          max_redemptions: null,
          metadata: isJson(params.metadata) ? params.metadata : {},
          name: typeof params.name === "string" ? params.name : null,
          percent_off: null,
          redeem_by: null,
          times_redeemed: 0,
          valid: true,
        };
        coupons.set(id, coupon);
        return [200, coupon];
      },
    ],
    [
      "GET",
      /^\/v1\/billing_portal\/configurations$/,
      (params) => list([...portals.values()], params, "/v1/billing_portal/configurations"),
    ],
    [
      "POST",
      /^\/v1\/billing_portal\/configurations$/,
      (params) => {
        const config = portalOf(nextId("bpc"), params);
        portals.set(String(config.id), config);
        return [200, config];
      },
    ],
    [
      "POST",
      /^\/v1\/billing_portal\/configurations\/([^/]+)$/,
      (params, id) => {
        const was = portals.get(id);
        if (!was) return failure(404, "resource_missing", `No such configuration: '${id}'`);
        const config = portalOf(id, params, was);
        portals.set(id, config);
        return [200, config];
      },
    ],
  ];

  const server = createServer((req, res) => {
    void body(req).then((text) => {
      const url = new URL(req.url ?? "/", "http://stand-in");
      const method = req.method ?? "GET";
      const params = decodeForm(method === "GET" ? url.search.slice(1) : text);
      calls.push({
        method,
        path: url.pathname,
        params,
        version: header(req, "stripe-version"),
        idempotencyKey: header(req, "idempotency-key"),
      });
      const route = routes.find(([verb, pattern]) => verb === method && pattern.test(url.pathname));
      const [status, payload] = opts.refuse
        ? failure(401, undefined, opts.refuse)
        : route
          ? route[2](params, decodeURIComponent(route[1].exec(url.pathname)?.[1] ?? ""))
          : failure(404, undefined, `Unrecognized request URL (${method}: ${url.pathname})`);
      res.writeHead(status, { "content-type": "application/json", "request-id": `req_standin${calls.length}` });
      res.end(JSON.stringify(payload));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    products,
    prices,
    coupons,
    portals,
    calls,
    posts: () => calls.filter((call) => call.method === "POST"),
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

const STAGING_WEB = "https://starsdecoded-staging.vercel.app";

/** A host off production whose Stripe is the stand-in. */
function envFor(world: StandIn, over: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    APP_ENV: "development",
    STRIPE_SECRET_KEY: "rk_test_standin",
    STRIPE_API_BASE: world.base,
    PUBLIC_APP_URL: STAGING_WEB,
    ...over,
  };
}

/** The sync on the stand-in with no campaigns, so nothing reads a database. */
function depsFor(world: StandIn, over: Partial<SyncDeps> = {}): Partial<SyncDeps> {
  return {
    env: envFor(world),
    campaigns: async () => [],
    campaign: async () => null,
    saveCoupon: async () => {},
    ...over,
  };
}

function onSale(world: StandIn): Record<string, Json> {
  return Object.fromEntries(
    [...world.prices.values()]
      .filter((price) => price.active === true)
      .map((price) => [String(price.lookup_key), price]),
  );
}

const ALL_FOUND = { products: 4, prices: 5, moved: [], coupons: 0, portal: true, missing: [] };

test("the first run makes four Products and five Prices, each found by its key, on the pinned version", async () => {
  const world = await standIn();
  try {
    assert.deepEqual(await syncProducts(depsFor(world)), ALL_FOUND);
    assert.deepEqual(
      Object.fromEntries([...world.products.values()].map((product) => [product.id, [product.name, product.active]])),
      {
        single: ["Single", true],
        couple: ["Couple", true],
        family: ["Family & friends", true],
        timeline: ["Timeline", true],
      },
    );
    const keyed = onSale(world);
    assert.deepEqual(Object.keys(keyed).sort(), ["couple", "family", "single", "timeline_month", "timeline_year"]);
    assert.equal(world.prices.size, 5, "no Price beyond the five");
    for (const bundle of BUNDLES) {
      const price = keyed[bundle.lookupKey];
      assert.deepEqual([price.product, price.unit_amount, price.type], [bundle.lookupKey, bundle.cents, "one_time"]);
    }
    for (const plan of PLANS) {
      const price = keyed[plan.lookupKey];
      const recurring = price.recurring;
      assert.deepEqual([price.product, price.unit_amount, price.type], ["timeline", plan.cents, "recurring"]);
      assert.ok(isJson(recurring));
      assert.deepEqual([recurring.interval, recurring.interval_count], [plan.interval, 1]);
    }
    for (const price of Object.values(keyed)) {
      assert.deepEqual([price.currency, price.tax_behavior], ["eur", "inclusive"], "MB-114: VAT included");
    }
    assert.deepEqual([TAX_BEHAVIOR, AUTOMATIC_TAX], ["inclusive", false]);
    assert.ok(world.calls.length > 0);
    assert.ok(world.calls.every((call) => call.version === STRIPE_API_VERSION), "every call names the pinned version");
    assert.ok(world.posts().every((call) => call.idempotencyKey), "every write carries an idempotency key (R-6.2)");
    const keyedWrites = world.posts().filter((call) => call.params.lookup_key !== undefined);
    assert.equal(keyedWrites.length, 5);
    assert.ok(keyedWrites.every((call) => call.params.transfer_lookup_key === "true"));
  } finally {
    await world.close();
  }
});

test("the portal: cancel at the period's end, the card, the invoices, our links, found by its metadata", async () => {
  const world = await standIn();
  try {
    await syncProducts(depsFor(world));
    assert.equal(world.portals.size, 1);
    const [config] = world.portals.values();
    const features = config.features as Record<string, Json>;
    assert.deepEqual(Object.fromEntries(Object.entries(features).map(([name, feature]) => [name, feature.enabled])), {
      customer_update: false,
      invoice_history: true,
      payment_method_update: true,
      subscription_cancel: true,
      subscription_update: false,
    });
    assert.equal(features.subscription_cancel.mode, "at_period_end");
    assert.deepEqual(config.business_profile, {
      headline: null,
      privacy_policy_url: `${STAGING_WEB}/privacy`,
      terms_of_service_url: `${STAGING_WEB}/terms`,
    });
    assert.equal(config.default_return_url, `${STAGING_WEB}/dashboard/account`);
    assert.equal(await portalConfigurationId(stripe(envFor(world))), config.id);

    // Changed by hand in the Dashboard: the next start puts it back, on the same configuration.
    world.portals.set(String(config.id), { ...config, features: { ...features, invoice_history: { enabled: false } } });
    const writes = world.posts().length;
    await syncProducts(depsFor(world));
    assert.equal(world.posts().length, writes + 1);
    assert.equal(world.portals.size, 1);
    const putBack = world.portals.get(String(config.id))?.features as Record<string, Json>;
    assert.equal(putBack.invoice_history.enabled, true);
  } finally {
    await world.close();
  }
});

test("a second run changes nothing", async () => {
  const world = await standIn();
  try {
    await syncProducts(depsFor(world));
    const writes = world.posts().length;
    const prices = JSON.stringify([...world.prices.values()]);
    assert.deepEqual(await syncProducts(depsFor(world)), ALL_FOUND);
    assert.equal(world.posts().length, writes, "no write on the second run");
    assert.equal(JSON.stringify([...world.prices.values()]), prices);
  } finally {
    await world.close();
  }
});

test("Couple at a new amount is a new Price that takes `couple`, and the old one leaves sale", async () => {
  const world = await standIn();
  try {
    await syncProducts(depsFor(world));
    const before = onSale(world);
    const couple = bundleById("couple");
    const dearer = catalogueProducts(
      BUNDLES.map((bundle) => (bundle.id === "couple" ? { ...bundle, cents: couple.cents + 500 } : bundle)),
    );
    assert.deepEqual(await syncProducts(depsFor(world, { products: dearer })), { ...ALL_FOUND, moved: ["couple"] });
    const after = onSale(world);
    const old = world.prices.get(String(before.couple.id));
    assert.deepEqual([old?.active, old?.lookup_key, old?.unit_amount], [false, null, couple.cents], "kept, off sale");
    assert.notEqual(after.couple.id, before.couple.id);
    assert.deepEqual([after.couple.product, after.couple.unit_amount], ["couple", couple.cents + 500]);
    for (const key of ["single", "family", "timeline_month", "timeline_year"]) {
      assert.equal(after[key].id, before[key].id, `${key} keeps its Price`);
    }
    assert.equal(Object.keys(after).length, 5);
    assert.equal(await priceIdFor("couple", stripe(envFor(world))), after.couple.id);

    const writes = world.posts().length;
    assert.deepEqual(await syncProducts(depsFor(world, { products: dearer })), ALL_FOUND, "once moved, it stays");
    assert.equal(world.posts().length, writes);
  } finally {
    await world.close();
  }
});

test("a Price elsewhere holding our key gives it to ours, and an unnamed one on our Product leaves sale", async () => {
  const world = await standIn();
  try {
    const client = stripe(envFor(world));
    assert.ok(client);
    world.products.set("by-hand", { id: "by-hand", object: "product", active: true, name: "By hand", metadata: {} });
    const byHand = { product: "by-hand", currency: "eur", unit_amount: 100 };
    const stray = await client.prices.create({ ...byHand, lookup_key: "family" });
    assert.deepEqual(await syncProducts(depsFor(world)), { ...ALL_FOUND, moved: ["family"] });
    assert.deepEqual([world.prices.get(stray.id)?.lookup_key, world.prices.get(stray.id)?.active], [null, false]);
    assert.equal(onSale(world).family.product, "family");

    const extra = await client.prices.create({ product: "single", currency: "eur", unit_amount: 100 });
    assert.deepEqual(await syncProducts(depsFor(world)), ALL_FOUND);
    assert.equal(world.prices.get(extra.id)?.active, false);
    assert.equal(onSale(world).single.product, "single");
  } finally {
    await world.close();
  }
});

test("the campaigns' coupons: one per item, the full price less the campaign's, on its Product, made once", async () => {
  const world = await standIn();
  try {
    const couple = bundleById("couple");
    const family = bundleById("family");
    const spring = { couple: couple.cents - 900, family: family.cents - 1200 };
    const rows = new Map<string, CouponCampaign>([
      ["c-spring", { id: "c-spring", name: "Spring", prices: spring, coupons: {} }],
      ["c-single", { id: "c-single", name: "Not Single", prices: { solo: 1000 }, coupons: {} }],
    ]);
    const saves: string[] = [];
    const campaignDeps: Partial<SyncDeps> = {
      campaigns: async () => [...rows.values()],
      campaign: async (id) => rows.get(id) ?? null,
      saveCoupon: async (campaignId, item, couponId) => {
        const row = rows.get(campaignId);
        assert.ok(row);
        row.coupons = { ...(row.coupons as Json), [item]: couponId };
        saves.push(`${campaignId}:${item}`);
      },
    };
    assert.deepEqual(await syncProducts(depsFor(world, campaignDeps)), { ...ALL_FOUND, coupons: 2 });
    assert.deepEqual(saves.sort(), ["c-spring:couple", "c-spring:family"]);
    const coupleCoupon = world.coupons.get(couponIdOf("c-spring", "couple", 900));
    assert.deepEqual(
      [coupleCoupon?.amount_off, coupleCoupon?.currency, coupleCoupon?.duration, coupleCoupon?.name],
      [900, "eur", "once", "Spring"],
    );
    assert.deepEqual(coupleCoupon?.applies_to, { products: ["couple"] });
    assert.deepEqual(coupleCoupon?.metadata, { campaign_id: "c-spring", item: "couple" });
    assert.equal(world.coupons.get(couponIdOf("c-spring", "family", 1200))?.amount_off, 1200);
    assert.equal(world.coupons.size, 2, "Single never takes a campaign price");

    const writes = world.posts().length;
    assert.equal((await syncProducts(depsFor(world, campaignDeps))).coupons, 2);
    assert.equal(world.posts().length, writes, "the second run makes no coupon");
    assert.equal(saves.length, 2, "and stores nothing it stored before");

    // Saved after the start's run: checkout finds or makes its coupon on the spot, and a second ask calls nothing.
    const longName = "A campaign whose name runs well past forty characters";
    rows.set("c-later", { id: "c-later", name: longName, prices: { family: family.cents - 700 }, coupons: {} });
    const id = await couponIdFor("c-later", "family", depsFor(world, campaignDeps));
    assert.equal(id, couponIdOf("c-later", "family", 700));
    assert.equal(world.coupons.get(id)?.name, longName.slice(0, 40));
    assert.deepEqual(rows.get("c-later")?.coupons, { family: id });
    const calls = world.calls.length;
    assert.equal(await couponIdFor("c-later", "family", depsFor(world, campaignDeps)), id);
    assert.equal(world.calls.length, calls, "a coupon this process has seen needs no call");

    await assert.rejects(couponIdFor("c-later", "solo", depsFor(world, campaignDeps)), /never takes a campaign price/);
    await assert.rejects(couponIdFor("c-later", "timeline_year", depsFor(world, campaignDeps)), /never takes/);
    await assert.rejects(couponIdFor("c-later", "couple", depsFor(world, campaignDeps)), /no couple price/);
    await assert.rejects(couponIdFor("c-gone", "couple", depsFor(world, campaignDeps)), /no campaign has the id/);
    await assert.rejects(couponIdFor("c-later", "family", { ...campaignDeps, env: {} }), /Stripe is not set up/);
  } finally {
    await world.close();
  }
});

test("a campaign no longer under the full price is a problem, and the rest of the run still happens", async () => {
  const world = await standIn();
  try {
    const couple = bundleById("couple");
    const high: CouponCampaign[] = [{ id: "c-high", name: "High", prices: { couple: couple.cents }, coupons: {} }];
    await assert.rejects(
      syncProducts(depsFor(world, { campaigns: async () => high })),
      /^Error: the couple coupon of campaign c-high: the campaign's couple price is not under the full price$/,
    );
    assert.equal(Object.keys(onSale(world)).length, 5);
    assert.equal(world.portals.size, 1);
    assert.equal(world.coupons.size, 0);
  } finally {
    await world.close();
  }
});

test("the start's run never rejects: no usable key skips it, a refused call is one line without the key", async () => {
  const skipped = await syncProductsOnStart({ env: { APP_ENV: "staging" } });
  assert.equal(skipped.problem, "skipped, STRIPE_SECRET_KEY is not set");
  assert.equal(lastSync(), skipped);

  const live = await syncProductsOnStart({ env: { APP_ENV: "staging", STRIPE_SECRET_KEY: "rk_live_notours" } });
  assert.equal(live.problem, "skipped, STRIPE_SECRET_KEY is a live key, and only production takes one");

  const refusing = await standIn({ refuse: "Invalid API Key provided: rk_test_*******ndin" });
  try {
    const failed = await syncProductsOnStart(depsFor(refusing));
    assert.equal(failed.problem, "Invalid API Key provided: [key]");
    assert.equal(lastSync(), failed);
  } finally {
    await refusing.close();
  }

  const world = await standIn();
  try {
    const done = await syncProductsOnStart(depsFor(world));
    assert.equal(done.problem, null);
    assert.ok(done.at instanceof Date);
    assert.equal(lastSync(), done);
  } finally {
    await world.close();
  }
});

test("keys: production takes live keys only, other hosts test keys only, and the stand-in only off production", () => {
  assert.equal(STRIPE_API_VERSION, Stripe.API_VERSION, "the SDK is built on the version we pin");
  const signing = { STRIPE_WEBHOOK_SECRET: "whsec_abc" };
  const staging = {
    ...signing,
    APP_ENV: "staging",
    STRIPE_SECRET_KEY: "rk_test_abc",
    STRIPE_PUBLISHABLE_KEY: "pk_test_abc",
  };
  const production = {
    ...signing,
    APP_ENV: "production",
    STRIPE_SECRET_KEY: "rk_live_abc",
    STRIPE_PUBLISHABLE_KEY: "pk_live_abc",
  };
  assert.deepEqual(stripeReady(staging), { ok: true, reason: null });
  assert.deepEqual(stripeReady(production), { ok: true, reason: null });
  assert.ok(stripe(staging) instanceof Stripe);
  assert.ok(stripe(production) instanceof Stripe);
  assert.deepEqual([publishableKey(staging), publishableKey(production)], ["pk_test_abc", "pk_live_abc"]);
  assert.equal(webhookSecret(production), "whsec_abc");

  const live = "STRIPE_SECRET_KEY is a live key, and only production takes one";
  const test = "STRIPE_SECRET_KEY is a test key, and production takes only live keys";
  const refused: Array<[NodeJS.ProcessEnv, string]> = [
    [{ ...staging, STRIPE_SECRET_KEY: "rk_live_abc" }, live],
    [{ ...staging, APP_ENV: "development", STRIPE_SECRET_KEY: "sk_live_abc" }, live],
    [{ ...production, STRIPE_SECRET_KEY: "rk_test_abc" }, test],
    [{ ...staging, STRIPE_SECRET_KEY: "  " }, "STRIPE_SECRET_KEY is not set"],
    [{ ...staging, STRIPE_SECRET_KEY: "pk_test_abc" }, "STRIPE_SECRET_KEY is not a Stripe secret key"],
    [{ ...staging, STRIPE_PUBLISHABLE_KEY: "pk_live_abc" }, live.replace("SECRET", "PUBLISHABLE")],
    [{ ...production, STRIPE_PUBLISHABLE_KEY: "pk_test_abc" }, test.replace("SECRET", "PUBLISHABLE")],
    [{ ...staging, STRIPE_PUBLISHABLE_KEY: undefined }, "STRIPE_PUBLISHABLE_KEY is not set"],
    [{ ...production, STRIPE_WEBHOOK_SECRET: undefined }, "STRIPE_WEBHOOK_SECRET is not set"],
    [{ ...staging, STRIPE_WEBHOOK_SECRET: "rk_test_abc" }, "STRIPE_WEBHOOK_SECRET is not a webhook signing secret"],
    [{ ...staging, STRIPE_API_BASE: "not an address" }, "STRIPE_API_BASE is not an address"],
    [{ ...staging, STRIPE_API_BASE: "http://127.0.0.1:12111/v1" }, "STRIPE_API_BASE is not an http or https origin"],
  ];
  for (const [env, reason] of refused) assert.deepEqual(stripeReady(env), { ok: false, reason }, reason);
  // Railway's environment name counts as APP_ENV does, so a missing variable can't make production take a test key.
  assert.equal(stripe({ RAILWAY_ENVIRONMENT_NAME: "production", STRIPE_SECRET_KEY: "rk_test_abc" }), null);
  assert.equal(stripe({ ...staging, STRIPE_SECRET_KEY: "rk_live_abc" }), null);
  assert.equal(publishableKey({ ...staging, STRIPE_PUBLISHABLE_KEY: "pk_live_abc" }), null);
  assert.equal(webhookSecret({ ...staging, STRIPE_WEBHOOK_SECRET: "nope" }), null);

  const standInBase = { STRIPE_API_BASE: "http://127.0.0.1:12111" };
  const offProduction = stripeSettings({ ...staging, ...standInBase });
  assert.ok("config" in offProduction);
  const { apiVersion, protocol, host, port } = offProduction.config;
  assert.deepEqual([apiVersion, protocol, host, port], [STRIPE_API_VERSION, "http", "127.0.0.1", "12111"]);
  const onProduction = stripeSettings({ ...production, ...standInBase });
  assert.ok("config" in onProduction);
  assert.deepEqual(
    [onProduction.config.apiVersion, onProduction.config.protocol, onProduction.config.host, onProduction.config.port],
    [STRIPE_API_VERSION, undefined, undefined, undefined],
    "production talks to Stripe whatever STRIPE_API_BASE says",
  );
});

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the campaigns' queries run on a scratch Postgres";

/** The Brussels day `days` from today, as a campaign's dates are kept (reading 5). */
function brusselsDay(days: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());
  const day = new Date(`${today}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

test("on Postgres: a running or coming campaign gets coupons, an ended or past one none", { skip: NO_DB }, async () => {
  const { db, campaignsTable } = await import("@workspace/db");
  const world = await standIn();
  const tag = randomUUID().slice(0, 8);
  const couple = bundleById("couple");
  const family = bundleById("family");
  const campaign = (name: string, startsIn: number, endsIn: number, prices: Json, endedAt: Date | null = null) => ({
    id: `${name}-${tag}`,
    name,
    audience: "everyone" as const,
    slug: null,
    startsOn: brusselsDay(startsIn),
    endsOn: brusselsDay(endsIn),
    prices,
    createdBy: "stripeSync.test",
    endedAt,
  });
  const rows = [
    // Its last day is today, which it runs to the end of.
    campaign("running", -2, 0, { couple: couple.cents - 900, family: family.cents - 1200 }),
    campaign("coming", 40, 45, { family: family.cents - 1000 }),
    campaign("ended", -2, 3, { couple: couple.cents - 800 }, new Date()),
    campaign("past", -10, -1, { family: family.cents - 600 }),
  ];
  const ids = rows.map((row) => row.id);
  try {
    await db.insert(campaignsTable).values(rows);
    const env = envFor(world);
    // Any other campaign this database holds counts too, so only these rows' coupons are pinned.
    assert.ok((await syncProducts({ env })).coupons >= 3);
    const read = await db.select().from(campaignsTable).where(inArray(campaignsTable.id, ids));
    const stored = Object.fromEntries(read.map((row) => [row.name, row.coupons]));
    assert.deepEqual(stored, {
      running: {
        couple: couponIdOf(`running-${tag}`, "couple", 900),
        family: couponIdOf(`running-${tag}`, "family", 1200),
      },
      coming: { family: couponIdOf(`coming-${tag}`, "family", 1000) },
      ended: {},
      past: {},
    });
    for (const coupons of Object.values(stored)) {
      for (const id of Object.values(coupons as Json)) assert.ok(world.coupons.has(String(id)));
    }

    const later = campaign("later", 50, 55, { couple: couple.cents - 500 });
    await db.insert(campaignsTable).values(later);
    ids.push(later.id);
    const id = await couponIdFor(later.id, "couple", { env });
    assert.equal(id, couponIdOf(later.id, "couple", 500));
    const [row] = await db.select().from(campaignsTable).where(inArray(campaignsTable.id, [later.id]));
    assert.deepEqual(row.coupons, { couple: id });
  } finally {
    await db.delete(campaignsTable).where(inArray(campaignsTable.id, ids));
    await world.close();
  }
});
