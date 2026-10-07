/**
 * Checkout on the server (R17-10) on a stand-in Stripe: a local HTTP server answers the Customer, Checkout Session and
 * Portal calls the real client makes through STRIPE_API_BASE, so each request is read as Stripe would receive it and
 * nothing leaves the machine. The rows live in memory here; the last test runs the live queries on a scratch Postgres
 * when WALK_DATABASE_URL names a bootstrapped one, and skips, saying why, without it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { BUNDLES, CHECKOUT_TICK, LEGAL_IDENTITY, PLANS, PLAN_TICK, bundleById, itemById } from "@workspace/commerce";

const SCRATCH = process.env.WALK_DATABASE_URL;
// The pool connects lazily; without a scratch database nothing here queries it.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.LOG_LEVEL = "silent";
// An account without an address is asked of Clerk, which must not be reached from here.
delete process.env.CLERK_SECRET_KEY;
const { stripe, STRIPE_API_VERSION } = await import("./stripe.js");
const P = await import("./purchases.js");
type CheckoutDeps = import("./purchases.js").CheckoutDeps;
type CheckoutBody = import("./purchases.js").CheckoutBody;
type InsertPurchaseRow = import("@workspace/db").InsertPurchaseRow;
type PurchaseRow = import("@workspace/db").PurchaseRow;
type PurchaseStatus = import("@workspace/db").PurchaseStatus;
type CatalogueItemId = import("@workspace/commerce").CatalogueItemId;

type Json = Record<string, unknown>;

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

function body(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

interface Call {
  method: string;
  path: string;
  params: Json;
  version: string | undefined;
  idempotencyKey: string | undefined;
}

interface StandIn {
  base: string;
  calls: Call[];
  customers: Map<string, Json>;
  /** Every Checkout Session made or seeded, by id; `refuse` answers its expire with that status instead. */
  sessions: Map<string, Json>;
  /** What each Price and coupon charges, as the sync would have left them. */
  amounts: Map<string, number>;
  off: Map<string, number>;
  /** Added to every session's total, to stand for a Price that drifted from the catalogue. */
  drift: number;
  close(): Promise<void>;
}

const one = (value: unknown, at = "0"): Json => (isJson(value) && isJson(value[at]) ? value[at] : {});

async function standIn(): Promise<StandIn> {
  const calls: Call[] = [];
  const customers = new Map<string, Json>();
  const sessions = new Map<string, Json>();
  const byKey = new Map<string, Json>();
  const amounts = new Map<string, number>();
  const off = new Map<string, number>();
  let count = 0;
  const nextId = (prefix: string) => `${prefix}_standin${String(++count).padStart(4, "0")}`;
  const world: StandIn = {
    base: "",
    calls,
    customers,
    sessions,
    amounts,
    off,
    drift: 0,
    close: async () => {},
  };

  const answer = (call: Call): [number, unknown] => {
    const expiring = /^\/v1\/checkout\/sessions\/([^/]+)\/expire$/.exec(call.path);
    if (call.method === "POST" && expiring) {
      const session = sessions.get(decodeURIComponent(expiring[1]));
      if (!session) return [404, { error: { type: "invalid_request_error", code: "resource_missing", message: "No such checkout.session" } }];
      if (typeof session.refuse === "number") {
        return [session.refuse, { error: { type: "invalid_request_error", message: "The key may not expire sessions" } }];
      }
      if (session.status !== "open") {
        return [400, { error: { type: "invalid_request_error", message: 'Only Checkout Sessions with a status in ["open"] can be expired.' } }];
      }
      session.status = "expired";
      return [200, session];
    }
    if (call.method === "POST" && call.path === "/v1/customers") {
      const kept = call.idempotencyKey ? byKey.get(call.idempotencyKey) : undefined;
      if (kept) return [200, kept];
      const customer: Json = { id: nextId("cus"), object: "customer", email: call.params.email ?? null, livemode: false };
      customers.set(String(customer.id), customer);
      if (call.idempotencyKey) byKey.set(call.idempotencyKey, customer);
      return [200, customer];
    }
    if (call.method === "POST" && call.path === "/v1/checkout/sessions") {
      const line = one(call.params.line_items);
      const unit = amounts.get(String(line.price));
      if (unit === undefined) return [400, { error: { type: "invalid_request_error", message: "No such price" } }];
      const coupon = one(call.params.discounts).coupon;
      const total = unit - (coupon === undefined ? 0 : (off.get(String(coupon)) ?? 0)) + world.drift;
      const id = nextId("cs_test");
      const session: Json = {
        id,
        object: "checkout.session",
        amount_subtotal: unit,
        amount_total: total,
        client_reference_id: call.params.client_reference_id ?? null,
        client_secret: `${id}_secret_standin`,
        currency: "eur",
        customer: call.params.customer ?? null,
        livemode: false,
        metadata: call.params.metadata ?? {},
        mode: call.params.mode,
        payment_intent: null,
        payment_status: "unpaid",
        status: "open",
        ui_mode: call.params.ui_mode,
      };
      sessions.set(id, session);
      return [200, session];
    }
    if (call.method === "POST" && call.path === "/v1/billing_portal/sessions") {
      const id = nextId("bps");
      return [
        200,
        {
          id,
          object: "billing_portal.session",
          configuration: call.params.configuration,
          customer: call.params.customer,
          livemode: false,
          return_url: call.params.return_url,
          url: `https://billing.stripe.com/p/session/test_${id}`,
        },
      ];
    }
    return [404, { error: { type: "invalid_request_error", message: `Unrecognized request URL (${call.method}: ${call.path})` } }];
  };

  const server = createServer((req, res) => {
    void body(req).then((text) => {
      const url = new URL(req.url ?? "/", "http://stand-in");
      const method = req.method ?? "GET";
      const header = (name: string) => {
        const value = req.headers[name];
        return Array.isArray(value) ? value[0] : value;
      };
      const call: Call = {
        method,
        path: url.pathname,
        params: decodeForm(method === "GET" ? url.search.slice(1) : text),
        version: header("stripe-version"),
        idempotencyKey: header("idempotency-key"),
      };
      calls.push(call);
      const [status, payload] = answer(call);
      res.writeHead(status, { "content-type": "application/json", "request-id": `req_standin${calls.length}` });
      res.end(JSON.stringify(payload));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  world.base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  world.close = () =>
    new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
  return world;
}

const STAGING_WEB = "https://starsdecoded-staging.vercel.app";
const NOW = new Date("2026-10-05T10:00:00Z");
const MIRA = { userId: "user_mira", sessionId: "s-mira" };
const IDRIS = { userId: "user_idris", sessionId: "s-idris" };
const REPORT_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

/** A staging-like host whose Stripe is the stand-in. */
function envFor(world: StandIn, over: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    APP_ENV: "staging",
    STRIPE_SECRET_KEY: "rk_test_standin",
    STRIPE_PUBLISHABLE_KEY: "pk_test_standin",
    STRIPE_WEBHOOK_SECRET: "whsec_standin",
    STRIPE_API_BASE: world.base,
    PUBLIC_APP_URL: STAGING_WEB,
    ...over,
  };
}

const PRICE_ID: Record<string, string> = {
  single: "price_single",
  couple: "price_couple",
  family: "price_family",
  timeline_month: "price_month",
  timeline_year: "price_year",
};

/** The rows checkout reads and writes, in memory, with the account's Customer kept as the live query keeps it. */
interface Ledger {
  accounts: Map<string, { email: string | null; customerId: string | null }>;
  purchases: InsertPurchaseRow[];
}

function ledger(): Ledger {
  return {
    accounts: new Map([
      [MIRA.userId, { email: "qa-a+clerk_test@mystarsdecoded.com", customerId: null }],
      [IDRIS.userId, { email: null, customerId: null }],
    ]),
    purchases: [],
  };
}

function asRow(row: InsertPurchaseRow): PurchaseRow {
  return {
    stripeSessionId: null,
    stripePaymentIntent: null,
    stripeInvoice: null,
    stripeSubscription: null,
    campaignId: null,
    receiptDelivered: null,
    grantedAt: null,
    refundedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...row,
  } as PurchaseRow;
}

function depsFor(world: StandIn, rows: Ledger, over: Partial<CheckoutDeps> = {}): Partial<CheckoutDeps> {
  for (const bundle of BUNDLES) world.amounts.set(PRICE_ID[bundle.lookupKey], bundle.cents);
  for (const plan of PLANS) world.amounts.set(PRICE_ID[plan.lookupKey], plan.cents);
  const env = over.env ?? envFor(world);
  return {
    env,
    client: stripe(env),
    now: () => NOW,
    ready: () => ({ ok: true, reason: null }),
    priceFor: async (item) => ({ cents: itemById(item).cents, campaign: null }),
    priceIdFor: async (key) => PRICE_ID[key] ?? null,
    couponIdFor: async () => {
      throw new Error("no campaign runs here");
    },
    portalConfigurationId: async () => "bpc_standin",
    hasPersonalReport: async () => true,
    hasLiveSubscription: async () => false,
    account: async (userId) => rows.accounts.get(userId) ?? { email: null, customerId: null },
    clerkEmail: async () => null,
    keepCustomer: async (userId, email, customerId) => {
      const was = rows.accounts.get(userId) ?? { email, customerId: null };
      const kept = { ...was, customerId: was.customerId ?? customerId };
      rows.accounts.set(userId, kept);
      return kept.customerId;
    },
    savePurchase: async (row) => {
      rows.purchases.push(row);
    },
    purchase: async (userId, id) => {
      const row = rows.purchases.find((candidate) => candidate.id === id && candidate.userId === userId);
      return row ? asRow(row) : null;
    },
    openPlanCheckouts: async (userId) =>
      rows.purchases.flatMap((row) =>
        row.userId === userId && row.kind === "plan" && row.status === "open" && row.stripeSessionId
          ? [{ purchaseId: row.id, sessionId: row.stripeSessionId }]
          : [],
      ),
    expirePurchase: async (purchaseId) => {
      rows.purchases = rows.purchases.map((row) =>
        row.id === purchaseId && row.status === "open" ? { ...row, status: "expired" as const } : row,
      );
    },
    webBase: STAGING_WEB,
    ...over,
  };
}

const sessionsOf = (world: StandIn) => world.calls.filter((call) => call.path === "/v1/checkout/sessions");
const customersOf = (world: StandIn) => world.calls.filter((call) => call.path === "/v1/customers");

test("RETURN_TO: each step that asks, as reading 2 lists them, and nothing that could send a reader elsewhere", () => {
  for (const ok of [
    "/chart",
    "/dashboard",
    "/dashboard/account",
    "/dashboard?open=credits",
    "/dashboard?open=gift",
    "/dashboard?open=add",
    "/dashboard?open=pair",
    "/dashboard/account?open=credits",
    `/report/${REPORT_ID}`,
  ]) {
    assert.ok(P.RETURN_TO.test(ok), ok);
  }
  for (const off of [
    "",
    "/",
    "//evil.example",
    "https://evil.example/chart",
    "/chart/",
    "/chart?next=//evil.example",
    "/dashboard?open=credits&next=//evil.example",
    "/dashboard?open=timeline",
    "/dashboard#open=credits",
    "/report/../admin",
    `/report/${REPORT_ID.toUpperCase()}`,
    `/report/${REPORT_ID}/x`,
    " /chart",
    "/chart\n",
    "/timeline",
    "/checkout",
    "/admin/sales",
  ]) {
    assert.equal(P.RETURN_TO.test(off), false, JSON.stringify(off));
  }
});

test("the tick: its words hashed with sha256 as hex, each box its own, and a plan's box is Timeline's", () => {
  assert.equal(P.tickHashOf(CHECKOUT_TICK), createHash("sha256").update(CHECKOUT_TICK).digest("hex"));
  assert.match(P.tickHashOf(PLAN_TICK), /^[0-9a-f]{64}$/);
  assert.notEqual(P.tickHashOf(CHECKOUT_TICK), P.tickHashOf(PLAN_TICK));
  for (const bundle of BUNDLES) assert.equal(P.tickFor(bundle), CHECKOUT_TICK, bundle.id);
  for (const plan of PLANS) assert.equal(P.tickFor(plan), PLAN_TICK, plan.id);
});

test("the session's body: Stripe's fields on our page, the Price by its key, a campaign's one coupon, no promotion codes, no payment method list, Link off, no tax, the done page", () => {
  const purchaseId = randomUUID();
  const couple = P.sessionParams({
    item: bundleById("couple"),
    priceId: "price_couple",
    couponId: "sd_coupon",
    customerId: "cus_mira",
    purchaseId,
    webBase: STAGING_WEB,
  });
  assert.deepEqual(couple, {
    ui_mode: "elements",
    mode: "payment",
    customer: "cus_mira",
    line_items: [{ price: "price_couple", quantity: 1 }],
    discounts: [{ coupon: "sd_coupon" }],
    automatic_tax: { enabled: false },
    adaptive_pricing: { enabled: false },
    wallet_options: { link: { display: "never" } },
    return_url: `${STAGING_WEB}/checkout/done?purchase=${purchaseId}`,
    client_reference_id: purchaseId,
    metadata: { purchase_id: purchaseId },
    payment_intent_data: { metadata: { purchase_id: purchaseId } },
  });
  const year = P.sessionParams({
    item: PLANS[1],
    priceId: "price_year",
    couponId: null,
    customerId: "cus_mira",
    purchaseId,
    webBase: STAGING_WEB,
  });
  assert.equal(year.mode, "subscription");
  assert.deepEqual(year.subscription_data, { metadata: { purchase_id: purchaseId } });
  for (const params of [couple, year]) {
    assert.equal("allow_promotion_codes" in params, false, "Stripe refuses a discount beside it, and the price is ours");
    assert.equal("payment_method_types" in params, false, "the Dashboard turns the methods on");
    assert.equal("excluded_payment_method_types" in params, false, "its list has no Link, and every other method stays the Dashboard's");
    assert.deepEqual(params.wallet_options, { link: { display: "never" } }, "Link's box goes (ADR-346)");
    assert.equal("success_url" in params || "cancel_url" in params, false, "elements mode takes neither");
  }
  assert.equal("discounts" in year, false);
  assert.equal("payment_intent_data" in year, false);
});

test("refusals come in the order a reader can act on them, and none reaches Stripe or writes a row", async () => {
  const world = await standIn();
  const rows = ledger();
  try {
    const ask = (body: Partial<CheckoutBody>, over: Partial<CheckoutDeps> = {}) =>
      P.startCheckout(
        MIRA,
        { item: "couple", ticked: true, returnTo: "/dashboard?open=credits", ...body },
        depsFor(world, rows, over),
      );
    assert.deepEqual(await ask({ ticked: false, returnTo: "//evil.example" }), { kind: "tick_required" });
    assert.deepEqual(await ask({ returnTo: "https://evil.example" }), { kind: "bad_return" });
    const plan: Partial<CheckoutBody> = { item: "timeline_month", returnTo: "/dashboard/account" };
    assert.deepEqual(
      await ask(plan, { hasPersonalReport: async () => false, hasLiveSubscription: async () => true }),
      { kind: "already_subscribed" },
      "a subscriber has nothing to buy, report or not",
    );
    assert.deepEqual(await ask(plan, { hasPersonalReport: async () => false }), { kind: "no_personal_report" });
    let asked = 0;
    const counted = { hasPersonalReport: async () => (asked++, true), hasLiveSubscription: async () => (asked++, false) };
    assert.deepEqual(
      await ask({}, { ...counted, ready: () => ({ ok: false, reason: "the start's Stripe sync has not finished" }) }),
      { kind: "unavailable", reason: "the start's Stripe sync has not finished" },
    );
    assert.equal(asked, 0, "a bundle needs no Personal report and no plan check");
    assert.deepEqual(await ask({}, { priceIdFor: async () => null }), {
      kind: "unavailable",
      reason: "no Price on sale answers couple",
    });
    assert.deepEqual(world.calls, [], "no refusal calls Stripe");
    assert.deepEqual(rows.purchases, [], "no refusal writes a purchase");
  } finally {
    await world.close();
  }
});

test("a bundle at its full price: the session as Stripe received it, and the row with the tick's hash and time and the step that asked", async () => {
  const world = await standIn();
  const rows = ledger();
  try {
    const outcome = await P.startCheckout(
      MIRA,
      { item: "family", ticked: true, returnTo: "/dashboard?open=credits" },
      depsFor(world, rows),
    );
    assert.equal(outcome.kind, "started");
    if (outcome.kind !== "started") return;
    const family = bundleById("family");
    const [session] = sessionsOf(world);
    const { purchaseId } = outcome.started;
    assert.deepEqual(outcome.started, {
      purchaseId,
      clientSecret: "cs_test_standin0002_secret_standin",
      amountCents: family.cents,
    });
    assert.equal(session.version, STRIPE_API_VERSION);
    assert.deepEqual(session.params, {
      ui_mode: "elements",
      mode: "payment",
      customer: "cus_standin0001",
      line_items: { "0": { price: "price_family", quantity: "1" } },
      automatic_tax: { enabled: "false" },
      adaptive_pricing: { enabled: "false" },
      wallet_options: { link: { display: "never" } },
      return_url: `${STAGING_WEB}/checkout/done?purchase=${purchaseId}`,
      client_reference_id: purchaseId,
      metadata: { purchase_id: purchaseId },
      payment_intent_data: { metadata: { purchase_id: purchaseId } },
    });
    assert.deepEqual(rows.purchases, [
      {
        id: purchaseId,
        userId: MIRA.userId,
        kind: "bundle",
        item: "family",
        cents: family.cents,
        fullCents: family.cents,
        campaignId: null,
        stripeSessionId: "cs_test_standin0002",
        stripePaymentIntent: null,
        tickHash: P.tickHashOf(CHECKOUT_TICK),
        tickedAt: NOW,
        returnTo: "/dashboard?open=credits",
        status: "open",
        isTest: true,
      },
    ]);
  } finally {
    await world.close();
  }
});

test("a campaign's price: its coupon is the one discount, Pay's amount is the campaign's, the row names it; a coupon that can't be made starts nothing", async () => {
  const world = await standIn();
  const rows = ledger();
  try {
    const couple = bundleById("couple");
    const campaign = { id: "camp_autumn", name: "Autumn", endsOn: "2026-10-31" };
    world.off.set("sd_autumn_couple", couple.cents - 4500);
    const priced = { priceFor: async () => ({ cents: 4500, campaign }) };
    const asked: string[] = [];
    const outcome = await P.startCheckout(
      MIRA,
      { item: "couple", ticked: true, returnTo: "/chart", campaign: " autumn " },
      depsFor(world, rows, {
        priceFor: async (item, at, slug) => (asked.push(`${item} ${at.toISOString()} ${slug}`), priced.priceFor()),
        couponIdFor: async (campaignId, item) => `sd_${campaignId.slice(5)}_${item}`,
      }),
    );
    assert.deepEqual(asked, [`couple ${NOW.toISOString()} autumn`], "one price for the item on this request");
    assert.equal(outcome.kind, "started");
    if (outcome.kind !== "started") return;
    assert.equal(outcome.started.amountCents, 4500);
    const [session] = sessionsOf(world);
    assert.deepEqual(session.params.discounts, { "0": { coupon: "sd_autumn_couple" } });
    assert.equal(session.params.allow_promotion_codes, undefined);
    assert.deepEqual(
      [rows.purchases[0].cents, rows.purchases[0].fullCents, rows.purchases[0].campaignId],
      [4500, couple.cents, "camp_autumn"],
    );

    const calls = world.calls.length;
    const refused = await P.startCheckout(
      MIRA,
      { item: "couple", ticked: true, returnTo: "/chart" },
      depsFor(world, rows, { ...priced }),
    );
    assert.equal(refused.kind, "unavailable", "never the full price to a buyer shown the campaign's");
    assert.equal(world.calls.length, calls);
    assert.equal(rows.purchases.length, 1);
  } finally {
    await world.close();
  }
});

test("a plan: a subscription under Timeline's own tick, the line by the plan's key, the step that asked kept", async () => {
  const world = await standIn();
  const rows = ledger();
  try {
    const year = PLANS.find((plan) => plan.id === "timeline_year");
    assert.ok(year);
    const outcome = await P.startCheckout(
      MIRA,
      { item: "timeline_year", ticked: true, returnTo: "/dashboard/account" },
      depsFor(world, rows),
    );
    assert.equal(outcome.kind, "started");
    if (outcome.kind !== "started") return;
    assert.equal(outcome.started.amountCents, year.cents);
    const [session] = sessionsOf(world);
    assert.equal(session.params.mode, "subscription");
    assert.deepEqual(session.params.line_items, { "0": { price: "price_year", quantity: "1" } });
    assert.deepEqual(session.params.subscription_data, { metadata: { purchase_id: outcome.started.purchaseId } });
    const [row] = rows.purchases;
    assert.deepEqual([row.kind, row.item, row.tickHash, row.returnTo], [
      "plan",
      "timeline_year",
      P.tickHashOf(PLAN_TICK),
      "/dashboard/account",
    ]);
  } finally {
    await world.close();
  }
});

/** A purchase an earlier checkout left, with its session as Stripe holds it. */
function seed(world: StandIn, rows: Ledger, id: string, userId: string, item: CatalogueItemId, session: { id: string; status: string; refuse?: number } | null, status: PurchaseStatus = "open") {
  if (session) world.sessions.set(session.id, { object: "checkout.session", ...session });
  rows.purchases.push({
    id,
    userId,
    kind: item.startsWith("timeline") ? "plan" : "bundle",
    item,
    cents: itemById(item).cents,
    fullCents: itemById(item).cents,
    stripeSessionId: session?.id ?? null,
    tickHash: P.tickHashOf(item.startsWith("timeline") ? PLAN_TICK : CHECKOUT_TICK),
    tickedAt: NOW,
    returnTo: "/dashboard/account",
    status,
    isTest: true,
  });
}

const PLAN_BODY: CheckoutBody = { item: "timeline_month", ticked: true, returnTo: "/dashboard/account" };
const checkoutCalls = (world: StandIn, from = 0) =>
  world.calls.slice(from).filter((call) => call.path.startsWith("/v1/checkout/sessions")).map((call) => call.path);
const statusOf = (rows: Ledger, id: string) => rows.purchases.find((row) => row.id === id)?.status;

test("B-34: a plan checkout first expires the account's other plan checkouts still open; one paid since, a bundle's and another account's stay", async () => {
  const world = await standIn();
  const rows = ledger();
  try {
    seed(world, rows, "p-older-tab", MIRA.userId, "timeline_month", { id: "cs_older_tab", status: "open" });
    seed(world, rows, "p-paid-tab", MIRA.userId, "timeline_year", { id: "cs_paid_tab", status: "complete" });
    seed(world, rows, "p-bundle-tab", MIRA.userId, "couple", { id: "cs_bundle_tab", status: "open" });
    seed(world, rows, "p-closed", MIRA.userId, "timeline_month", { id: "cs_closed", status: "expired" }, "expired");
    seed(world, rows, "p-idris-tab", IDRIS.userId, "timeline_month", { id: "cs_idris_tab", status: "open" });

    const outcome = await P.startCheckout(MIRA, PLAN_BODY, depsFor(world, rows));
    assert.equal(outcome.kind, "started");
    if (outcome.kind !== "started") return;
    assert.deepEqual(
      checkoutCalls(world),
      ["/v1/checkout/sessions/cs_older_tab/expire", "/v1/checkout/sessions/cs_paid_tab/expire", "/v1/checkout/sessions"],
      "every open plan session is asked to expire before the new one is made",
    );
    assert.deepEqual(
      ["p-older-tab", "p-paid-tab", "p-bundle-tab", "p-closed", "p-idris-tab", outcome.started.purchaseId].map((id) => statusOf(rows, id)),
      ["expired", "open", "open", "expired", "open", "open"],
      "Stripe refused the paid one, which its own events settle",
    );
    assert.deepEqual(
      ["cs_older_tab", "cs_paid_tab", "cs_bundle_tab", "cs_idris_tab"].map((id) => world.sessions.get(id)?.status),
      ["expired", "complete", "open", "open"],
    );

    const calls = world.calls.length;
    const bundle = await P.startCheckout(MIRA, { item: "couple", ticked: true, returnTo: "/dashboard?open=credits" }, depsFor(world, rows));
    assert.equal(bundle.kind, "started");
    assert.deepEqual(checkoutCalls(world, calls), ["/v1/checkout/sessions"], "a bundle closes nothing");

    const again = await P.startCheckout(MIRA, { ...PLAN_BODY, item: "timeline_year" }, depsFor(world, rows));
    assert.equal(again.kind, "started");
    if (again.kind !== "started") return;
    assert.equal(statusOf(rows, outcome.started.purchaseId), "expired", "the newest plan checkout replaces the one before it");
    assert.equal(statusOf(rows, again.started.purchaseId), "open");
  } finally {
    await world.close();
  }
});

test("B-34: an expire Stripe refuses for any other reason stops the plan checkout before its session or its row", async () => {
  const world = await standIn();
  const rows = ledger();
  try {
    seed(world, rows, "p-locked", MIRA.userId, "timeline_year", { id: "cs_locked", status: "open", refuse: 403 });
    await assert.rejects(P.startCheckout(MIRA, PLAN_BODY, depsFor(world, rows)), { type: "StripePermissionError" });
    assert.deepEqual(checkoutCalls(world), ["/v1/checkout/sessions/cs_locked/expire"], "no session is made");
    assert.deepEqual(rows.purchases.map((row) => [row.id, row.status]), [["p-locked", "open"]]);
  } finally {
    await world.close();
  }
});

test("one Customer per account: made at the first checkout with the account's email, kept, and two first checkouts at once end on one", async () => {
  const world = await standIn();
  const rows = ledger();
  try {
    const deps = depsFor(world, rows);
    const first = await P.customerFor(MIRA.userId, deps);
    assert.equal(await P.customerFor(MIRA.userId, deps), first);
    assert.equal(customersOf(world).length, 1, "the second found the stored one");
    assert.equal(customersOf(world)[0].params.email, "qa-a+clerk_test@mystarsdecoded.com");

    const [one, two] = await Promise.all([P.customerFor(IDRIS.userId, deps), P.customerFor(IDRIS.userId, deps)]);
    assert.equal(one, two);
    assert.notEqual(one, first);
    assert.equal(world.customers.size, 2, "Stripe made one Customer for the two at once");
    const keys = customersOf(world).map((call) => call.idempotencyKey);
    assert.equal(keys[1], keys[2], "both asked under the account's key");
    assert.notEqual(keys[0], keys[1]);
    assert.ok(keys.every((key) => key && !key.includes("user_")), "the key keeps the Clerk id out of Stripe");
    assert.equal(customersOf(world)[1].params.email, undefined, "an account with no address sends none");
  } finally {
    await world.close();
  }
});

test("a session whose total isn't the price shown is never handed to the browser, and no row is written", async () => {
  const world = await standIn();
  const rows = ledger();
  try {
    world.drift = 100;
    const outcome = await P.startCheckout(
      MIRA,
      { item: "solo", ticked: true, returnTo: "/chart" },
      depsFor(world, rows),
    );
    assert.deepEqual(outcome, {
      kind: "unavailable",
      reason: `Stripe's total ${bundleById("solo").cents + 100} is not the ${bundleById("solo").cents} cents shown`,
    });
    assert.deepEqual(rows.purchases, []);
  } finally {
    await world.close();
  }
});

test("where a purchase stands: its buyer reads it, anyone else and a signed-out reader read nothing, a dispute reads refunded", async () => {
  const world = await standIn();
  const rows = ledger();
  try {
    const deps = depsFor(world, rows);
    const outcome = await P.startCheckout(MIRA, { item: "couple", ticked: true, returnTo: "/dashboard?open=gift" }, deps);
    assert.equal(outcome.kind, "started");
    if (outcome.kind !== "started") return;
    const { purchaseId } = outcome.started;
    assert.deepEqual(await P.checkoutState(MIRA, purchaseId, deps), {
      status: "open",
      item: "couple",
      returnTo: "/dashboard?open=gift",
      credits: 3,
    });
    assert.equal(await P.checkoutState(IDRIS, purchaseId, deps), null);
    assert.equal(await P.checkoutState({ userId: null, sessionId: MIRA.sessionId }, purchaseId, deps), null);
    assert.equal(await P.checkoutState(MIRA, randomUUID(), deps), null);

    const seen: Record<string, string> = {};
    for (const status of ["granted", "failed", "expired", "refunded", "disputed"] as const) {
      rows.purchases[0] = { ...rows.purchases[0], status };
      seen[status] = (await P.checkoutState(MIRA, purchaseId, deps))?.status ?? "none";
    }
    assert.deepEqual(seen, { granted: "granted", failed: "failed", expired: "expired", refunded: "refunded", disputed: "refunded" });

    rows.purchases.push({ ...rows.purchases[0], id: "p-month", kind: "plan", item: "timeline_month" });
    assert.equal((await P.checkoutState(MIRA, "p-month", deps))?.credits, null, "a plan adds no credits of its own");
  } finally {
    await world.close();
  }
});

test("the Portal: the account's own Customer, on the sync's settings, back to a step on the list; refused without a Customer, a key or the settings", async () => {
  const world = await standIn();
  const rows = ledger();
  try {
    rows.accounts.set(MIRA.userId, { email: "qa-a+clerk_test@mystarsdecoded.com", customerId: "cus_mira" });
    const deps = depsFor(world, rows);
    assert.deepEqual(await P.openPortal(MIRA, { returnTo: "/dashboard/account" }, deps), {
      kind: "opened",
      url: "https://billing.stripe.com/p/session/test_bps_standin0001",
    });
    const [call] = world.calls;
    assert.deepEqual(call.params, {
      customer: "cus_mira",
      configuration: "bpc_standin",
      return_url: `${STAGING_WEB}/dashboard/account`,
    });
    assert.deepEqual(await P.openPortal(MIRA, { returnTo: "https://evil.example" }, deps), { kind: "bad_return" });
    assert.deepEqual(await P.openPortal(IDRIS, { returnTo: "/dashboard/account" }, deps), { kind: "no_customer" });
    assert.deepEqual(
      await P.openPortal(MIRA, { returnTo: "/dashboard/account" }, { ...deps, portalConfigurationId: async () => null }),
      { kind: "unavailable", reason: "the Customer Portal's settings are not in place" },
    );
    const keyless = await P.openPortal(
      MIRA,
      { returnTo: "/dashboard/account" },
      { ...deps, env: envFor(world, { STRIPE_SECRET_KEY: "" }) },
    );
    assert.equal(keyless.kind, "unavailable");
    assert.equal(world.calls.length, 1, "no refusal reached Stripe");
  } finally {
    await world.close();
  }
});

test("the options: every item in the catalogue's order at this request's price, the browser's key, and whether Pay can work", async () => {
  const world = await standIn();
  const rows = ledger();
  try {
    const campaign = { id: "camp_link", name: "Waitlist", endsOn: "2026-10-12" };
    const slugs: Array<string | null> = [];
    const options = await P.checkoutOptions(
      "waitlist",
      depsFor(world, rows, {
        priceFor: async (item, _at, slug) => {
          slugs.push(slug);
          return item === "family" ? { cents: 6000, campaign } : { cents: itemById(item).cents, campaign: null };
        },
      }),
    );
    assert.deepEqual(slugs, ["waitlist", "waitlist", "waitlist", "waitlist", "waitlist"]);
    assert.equal(options.publishableKey, "pk_test_standin");
    assert.equal(options.ready, true);
    assert.deepEqual(
      options.items.map((item) => [item.id, item.kind, item.cents, item.fullCents, item.campaign?.endsOn ?? null]),
      [
        ["solo", "bundle", 2400, 2400, null],
        ["couple", "bundle", 5400, 5400, null],
        ["family", "bundle", 6000, 7200, "2026-10-12"],
        ["timeline_month", "plan", 999, 999, null],
        ["timeline_year", "plan", 6999, 6999, null],
      ],
    );
    const [solo, , family, month] = options.items;
    assert.deepEqual(solo, {
      id: "solo",
      kind: "bundle",
      name: "Single",
      line: bundleById("solo").line,
      credits: 1,
      interval: null,
      cents: 2400,
      fullCents: 2400,
      campaign: null,
    });
    assert.deepEqual(family.campaign, { name: "Waitlist", endsOn: "2026-10-12" }, "the id stays on the server");
    assert.deepEqual([month.name, month.line, month.credits, month.interval], ["Timeline", null, null, "month"]);

    const closed = await P.checkoutOptions(null, depsFor(world, rows, { ready: () => ({ ok: false, reason: "no key" }) }));
    assert.equal(closed.ready, false);
    assert.deepEqual(world.calls, [], "the options never call Stripe");
  } finally {
    await world.close();
  }
});

test("checkout is ready with Stripe's three keys and a clean start's sync, and on production only once the seller's details are complete (MB-115)", async () => {
  const world = await standIn();
  try {
    const clean = { at: NOW, problem: null };
    assert.deepEqual(P.checkoutReady(envFor(world), clean), { ok: true, reason: null });
    assert.deepEqual(P.checkoutReady(envFor(world), null), { ok: false, reason: "the start's Stripe sync has not finished" });
    assert.deepEqual(P.checkoutReady(envFor(world), { at: NOW, problem: "no Price on sale answers couple" }), {
      ok: false,
      reason: "the start's Stripe sync: no Price on sale answers couple",
    });
    assert.equal(P.checkoutReady(envFor(world, { STRIPE_WEBHOOK_SECRET: "" }), clean).ok, false, "no grant without the webhook");
    const production = {
      APP_ENV: "production",
      STRIPE_SECRET_KEY: "rk_live_standin",
      STRIPE_PUBLISHABLE_KEY: "pk_live_standin",
      STRIPE_WEBHOOK_SECRET: "whsec_standin",
    };
    assert.equal(LEGAL_IDENTITY.postalAddress, null);
    assert.deepEqual(P.checkoutReady(production, clean), { ok: false, reason: "the seller's details are not complete" });
    assert.deepEqual(P.checkoutReady(production, clean, { ...LEGAL_IDENTITY, postalAddress: "Rue de la Loi 1, Brussels" }), {
      ok: true,
      reason: null,
    });
    assert.equal(P.checkoutReady({ ...production, STRIPE_SECRET_KEY: "rk_test_standin" }, clean).ok, false);
  } finally {
    await world.close();
  }
});

test("on a scratch Postgres: one Customer stored per account, the purchase row as written, read back by its buyer alone", { skip: SCRATCH ? false : "WALK_DATABASE_URL names no bootstrapped scratch Postgres" }, async (t) => {
  const { db, purchasesTable, usersTable } = await import("@workspace/db");
  const { inArray } = await import("drizzle-orm");
  const world = await standIn();
  const buyer = { userId: `user_r17_10_${randomUUID()}`, sessionId: `s-${randomUUID()}` };
  const other = { userId: `user_r17_10_${randomUUID()}`, sessionId: `s-${randomUUID()}` };
  t.after(async () => {
    await db.delete(purchasesTable).where(inArray(purchasesTable.userId, [buyer.userId, other.userId]));
    await db.delete(usersTable).where(inArray(usersTable.id, [buyer.userId, other.userId]));
    await world.close();
  });
  await db.insert(usersTable).values({ id: buyer.userId, email: "mira@example.com" });
  const env = envFor(world);
  for (const bundle of BUNDLES) world.amounts.set(PRICE_ID[bundle.lookupKey], bundle.cents);
  const live: Partial<CheckoutDeps> = {
    env,
    client: stripe(env),
    ready: () => ({ ok: true, reason: null }),
    priceIdFor: async (key) => PRICE_ID[key] ?? null,
    clerkEmail: async () => null,
  };

  const outcome = await P.startCheckout(buyer, { item: "couple", ticked: true, returnTo: "/dashboard?open=pair" }, live);
  assert.equal(outcome.kind, "started");
  if (outcome.kind !== "started") return;
  const [stored] = await db.select().from(usersTable).where(inArray(usersTable.id, [buyer.userId]));
  assert.equal(stored.stripeCustomerId, "cus_standin0001");
  assert.equal(customersOf(world)[0].params.email, "mira@example.com");
  await P.startCheckout(buyer, { item: "solo", ticked: true, returnTo: "/chart" }, live);
  assert.equal(customersOf(world).length, 1, "the stored Customer is used again");
  assert.equal(await P.customerFor(other.userId, live), "cus_standin0004", "an account with no row gets one");
  assert.equal(await P.customerFor(other.userId, live), "cus_standin0004");

  const [row] = await db.select().from(purchasesTable).where(inArray(purchasesTable.id, [outcome.started.purchaseId]));
  assert.deepEqual(
    {
      userId: row.userId,
      kind: row.kind,
      item: row.item,
      cents: row.cents,
      fullCents: row.fullCents,
      campaignId: row.campaignId,
      stripeSessionId: row.stripeSessionId,
      tickHash: row.tickHash,
      returnTo: row.returnTo,
      status: row.status,
      isTest: row.isTest,
      receiptDelivered: row.receiptDelivered,
      grantedAt: row.grantedAt,
    },
    {
      userId: buyer.userId,
      kind: "bundle",
      item: "couple",
      cents: 5400,
      fullCents: 5400,
      campaignId: null,
      stripeSessionId: "cs_test_standin0002",
      tickHash: P.tickHashOf(CHECKOUT_TICK),
      returnTo: "/dashboard?open=pair",
      status: "open",
      isTest: true,
      receiptDelivered: null,
      grantedAt: null,
    },
  );
  assert.ok(row.tickedAt instanceof Date);
  assert.deepEqual(await P.checkoutState(buyer, outcome.started.purchaseId, live), {
    status: "open",
    item: "couple",
    returnTo: "/dashboard?open=pair",
    credits: 3,
  });
  assert.equal(await P.checkoutState(other, outcome.started.purchaseId, live), null);
  const plan = await P.startCheckout(buyer, { item: "timeline_month", ticked: true, returnTo: "/dashboard" }, live);
  assert.deepEqual(plan, { kind: "no_personal_report" }, "Timeline's own rule: no finished Personal report of their own");
});

test("on a scratch Postgres: a second plan checkout expires the first's session and its row; the page reads it expired, and a bundle's stays open", { skip: SCRATCH ? false : "WALK_DATABASE_URL names no bootstrapped scratch Postgres" }, async (t) => {
  const { db, purchasesTable, usersTable } = await import("@workspace/db");
  const { eq, inArray } = await import("drizzle-orm");
  const world = await standIn();
  const buyer = { userId: `user_r18_01_${randomUUID()}`, sessionId: `s-${randomUUID()}` };
  t.after(async () => {
    await db.delete(purchasesTable).where(eq(purchasesTable.userId, buyer.userId));
    await db.delete(usersTable).where(eq(usersTable.id, buyer.userId));
    await world.close();
  });
  const env = envFor(world);
  for (const item of [...BUNDLES, ...PLANS]) world.amounts.set(PRICE_ID[item.lookupKey], item.cents);
  const live: Partial<CheckoutDeps> = {
    env,
    client: stripe(env),
    ready: () => ({ ok: true, reason: null }),
    priceIdFor: async (key) => PRICE_ID[key] ?? null,
    clerkEmail: async () => null,
    hasPersonalReport: async () => true,
  };

  const bundle = await P.startCheckout(buyer, { item: "couple", ticked: true, returnTo: "/chart" }, live);
  const older = await P.startCheckout(buyer, PLAN_BODY, live);
  const newer = await P.startCheckout(buyer, { ...PLAN_BODY, item: "timeline_year" }, live);
  assert.ok(bundle.kind === "started" && older.kind === "started" && newer.kind === "started");
  const ids = [bundle.started.purchaseId, older.started.purchaseId, newer.started.purchaseId];
  const rows = await db.select().from(purchasesTable).where(inArray(purchasesTable.id, ids));
  assert.deepEqual(
    ids.map((id) => rows.find((row) => row.id === id)?.status),
    ["open", "expired", "open"],
  );
  const olderSession = rows.find((row) => row.id === older.started.purchaseId)?.stripeSessionId ?? "";
  assert.equal(world.sessions.get(olderSession)?.status, "expired");
  assert.deepEqual(
    checkoutCalls(world).filter((path) => path.endsWith("/expire")),
    [`/v1/checkout/sessions/${olderSession}/expire`],
    "only the plan's older session",
  );
  assert.equal((await P.checkoutState(buyer, older.started.purchaseId, live))?.status, "expired", "what the older tab reads");
});
