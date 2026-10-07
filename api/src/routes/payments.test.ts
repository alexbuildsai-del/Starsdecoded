/**
 * /checkout's routes (R17-10) through an in-process app: each refusal with its status and line, the contract's shapes,
 * a purchase only its buyer reads, and the Portal. Stripe and the rows are stand-ins handed to the router, so nothing
 * here reaches a network or a database; lib/purchases.test.ts reads the session as Stripe receives it.
 */
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import Stripe from "stripe";
import type { Logger } from "pino";
import {
  CreateCheckoutResponse,
  GetCheckoutOptionsResponse,
  GetCheckoutResponse,
  OpenBillingPortalResponse,
} from "@workspace/api-zod";
import { BUNDLES, PLANS, itemById } from "@workspace/commerce";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL = "silent";
const R = await import("./payments.js");
const { NO_PERSONAL_REPORT } = await import("./timeline.js");
const { VALIDATION_LINE } = await import("../lib/validation.js");
type CheckoutDeps = import("../lib/purchases.js").CheckoutDeps;
type InsertPurchaseRow = import("@workspace/db").InsertPurchaseRow;
type PurchaseRow = import("@workspace/db").PurchaseRow;

const WEB = "https://starsdecoded-staging.vercel.app";
const NOW = new Date("2026-10-05T10:00:00Z");

interface World {
  purchases: InsertPurchaseRow[];
  customers: Map<string, string>;
  sessions: Stripe.Checkout.SessionCreateParams[];
  portals: Stripe.BillingPortal.SessionCreateParams[];
  logs: Array<{ level: string; fields: unknown; message: string }>;
}

/** The three Stripe calls the routes make, answered in memory; `fail` throws as a Stripe outage would. */
function fakeStripe(world: World, fail: Error | null): Stripe {
  let count = 0;
  const failing = async () => {
    if (fail) throw fail;
  };
  return {
    customers: {
      create: async () => (await failing(), { id: `cus_fake${++count}` }),
    },
    checkout: {
      sessions: {
        create: async (params: Stripe.Checkout.SessionCreateParams) => {
          await failing();
          world.sessions.push(params);
          const price = params.line_items?.[0]?.price ?? "";
          const id = `cs_test_fake${++count}`;
          return { id, client_secret: `${id}_secret`, amount_total: Number(price.split("_")[1]), livemode: false, payment_intent: null };
        },
      },
    },
    billingPortal: {
      sessions: {
        create: async (params: Stripe.BillingPortal.SessionCreateParams) => {
          await failing();
          world.portals.push(params);
          return { url: "https://billing.stripe.com/p/session/test_fake" };
        },
      },
    },
  } as unknown as Stripe;
}

function depsFor(world: World, over: Partial<CheckoutDeps> & { fail?: Error } = {}): Partial<CheckoutDeps> {
  const { fail = null, ...rest } = over;
  return {
    env: {
      APP_ENV: "staging",
      STRIPE_SECRET_KEY: "rk_test_fake",
      STRIPE_PUBLISHABLE_KEY: "pk_test_fake",
      STRIPE_WEBHOOK_SECRET: "whsec_fake",
      PUBLIC_APP_URL: WEB,
    },
    client: fakeStripe(world, fail),
    now: () => NOW,
    ready: () => ({ ok: true, reason: null }),
    priceFor: async (item) => ({ cents: itemById(item).cents, campaign: null }),
    // The fake session charges what its Price's id names, as the sync's Prices carry the catalogue's amounts.
    priceIdFor: async (key) => {
      const item = [...BUNDLES, ...PLANS].find((candidate) => candidate.lookupKey === key);
      return item ? `price_${item.cents}` : null;
    },
    couponIdFor: async () => "sd_coupon",
    portalConfigurationId: async () => "bpc_fake",
    hasPersonalReport: async () => true,
    hasLiveSubscription: async () => false,
    account: async (userId) => ({ email: null, customerId: world.customers.get(userId) ?? null }),
    clerkEmail: async () => null,
    keepCustomer: async (userId, _email, customerId) => {
      if (!world.customers.has(userId)) world.customers.set(userId, customerId);
      return world.customers.get(userId) ?? customerId;
    },
    savePurchase: async (row) => {
      world.purchases.push(row);
    },
    purchase: async (userId, id) => {
      const row = world.purchases.find((candidate) => candidate.id === id && candidate.userId === userId);
      return row ? ({ ...row, createdAt: NOW, updatedAt: NOW } as PurchaseRow) : null;
    },
    webBase: WEB,
    ...rest,
  };
}

type Answer = { status: number; body: Record<string, unknown> };

async function serve(t: TestContext, over: Partial<CheckoutDeps> & { fail?: Error } = {}) {
  const world: World = { purchases: [], customers: new Map(), sessions: [], portals: [], logs: [] };
  const log = (level: string) => (fields: unknown, message: string) => void world.logs.push({ level, fields, message });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = req.header("x-user") || null;
    req.sessionId = `s-${req.header("x-user") ?? "visitor"}`;
    req.log = { warn: log("warn"), error: log("error"), info: log("info") } as unknown as Logger;
    next();
  });
  app.use("/api", R.paymentsRouter(depsFor(world, over)));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const call = async (method: string, path: string, user: string | null, body?: unknown): Promise<Answer> => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (user) headers["x-user"] = user;
    const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  };
  return { world, call };
}

const BUY = { item: "couple", ticked: true, returnTo: "/dashboard?open=credits" };

test("POST /checkout: signed out, a body off the contract, no tick, a return off the list, each with its status and line", async (t) => {
  const { world, call } = await serve(t);
  assert.deepEqual(await call("POST", "/checkout", null, BUY), {
    status: 401,
    body: { error: "sign_in_required", message: R.BUY_SIGN_IN_LINE },
  });
  for (const body of [{}, { ...BUY, item: "trio" }, { ...BUY, ticked: "yes" }, { item: "solo", ticked: true }]) {
    const answer = await call("POST", "/checkout", "user_mira", body);
    assert.equal(answer.status, 400, JSON.stringify(body));
    assert.deepEqual([answer.body.error, answer.body.message], ["validation_error", VALIDATION_LINE]);
  }
  assert.deepEqual(await call("POST", "/checkout", "user_mira", { ...BUY, ticked: false }), {
    status: 400,
    body: { error: "tick_required", message: R.TICK_REQUIRED_LINE },
  });
  assert.deepEqual(await call("POST", "/checkout", "user_mira", { ...BUY, returnTo: "https://evil.example/chart" }), {
    status: 400,
    body: { error: "bad_return", message: R.BAD_RETURN_LINE },
  });
  assert.deepEqual(world.sessions, []);
  assert.deepEqual(world.purchases, []);
});

test("POST /checkout for a plan: Timeline's own lines without a finished Personal report and beside a live plan", async (t) => {
  const plan = { item: "timeline_year", ticked: true, returnTo: "/dashboard/account" };
  const noReport = await serve(t, { hasPersonalReport: async () => false });
  assert.deepEqual(await noReport.call("POST", "/checkout", "user_mira", plan), { status: 409, body: { ...NO_PERSONAL_REPORT } });
  const subscribed = await serve(t, { hasLiveSubscription: async () => true });
  assert.deepEqual(await subscribed.call("POST", "/checkout", "user_mira", plan), {
    status: 409,
    body: { error: "already_subscribed", message: R.ALREADY_SUBSCRIBED_LINE },
  });
  assert.deepEqual((await subscribed.call("POST", "/checkout", "user_mira", BUY)).status, 201, "a bundle beside a plan is fine");
});

test("POST /checkout: 503 while checkout isn't ready, the reason in the log and never in the answer", async (t) => {
  const { world, call } = await serve(t, { ready: () => ({ ok: false, reason: "the start's Stripe sync has not finished" }) });
  assert.deepEqual(await call("POST", "/checkout", "user_mira", BUY), {
    status: 503,
    body: { error: "checkout_unavailable", message: R.CHECKOUT_UNAVAILABLE_LINE },
  });
  assert.deepEqual(world.logs, [
    { level: "warn", fields: { reason: "the start's Stripe sync has not finished" }, message: "checkout is not available" },
  ]);
});

test("POST /checkout: 201 with the purchase, the client secret and the server's amount, as the contract has them", async (t) => {
  const { world, call } = await serve(t);
  const answer = await call("POST", "/checkout", "user_mira", { ...BUY, item: "family" });
  assert.equal(answer.status, 201);
  const started = CreateCheckoutResponse.parse(answer.body);
  assert.deepEqual(Object.keys(answer.body).sort(), ["amountCents", "clientSecret", "purchaseId"]);
  assert.equal(started.amountCents, itemById("family").cents);
  assert.equal(world.purchases[0]?.id, started.purchaseId);
  assert.equal(world.sessions[0]?.ui_mode, "elements");
});

test("POST /checkout: a Stripe failure answers 500 with a line to try again, and the log keeps its kind and code, never its message", async (t) => {
  const outage = new Stripe.errors.StripeInvalidRequestError({
    type: "invalid_request_error",
    code: "email_invalid",
    param: "email",
    message: "Invalid email address: mira@example.com",
    statusCode: 400,
    requestId: "req_fake",
  });
  const { world, call } = await serve(t, { fail: outage });
  const answer = await call("POST", "/checkout", "user_mira", BUY);
  assert.deepEqual(answer, {
    status: 500,
    body: { error: "internal_error", message: "We couldn't start checkout. Try again in a minute." },
  });
  assert.deepEqual(world.logs, [
    {
      level: "error",
      fields: {
        err: { type: "StripeInvalidRequestError", code: "email_invalid", param: "email", statusCode: 400, requestId: "req_fake" },
      },
      message: "checkout could not start",
    },
  ]);
  assert.doesNotMatch(JSON.stringify(world.logs), /mira@/);
  assert.deepEqual(world.purchases, []);
});

test("GET /checkout/options answers anyone with the contract's shape, and passes a link's slug on", async (t) => {
  const slugs: Array<string | null> = [];
  const { call } = await serve(t, {
    priceFor: async (item, _at, slug) => (slugs.push(slug), { cents: itemById(item).cents, campaign: null }),
  });
  const answer = await call("GET", "/checkout/options", null);
  assert.equal(answer.status, 200);
  const options = GetCheckoutOptionsResponse.parse(answer.body);
  assert.deepEqual(options.items.map((item) => item.id), ["solo", "couple", "family", "timeline_month", "timeline_year"]);
  assert.equal(options.publishableKey, "pk_test_fake");
  assert.equal(options.ready, true);
  assert.equal((await call("GET", "/checkout/options?c=waitlist", "user_mira")).status, 200);
  assert.equal((await call("GET", "/checkout/options?c=", null)).status, 200);
  assert.deepEqual(slugs, [...Array(5).fill(null), ...Array(5).fill("waitlist"), ...Array(5).fill(null)]);
});

test("GET /checkout/{purchaseId}: its buyer reads where it stands; a stranger and a signed-out reader hear 404 and learn nothing", async (t) => {
  const { call } = await serve(t);
  const started = await call("POST", "/checkout", "user_mira", BUY);
  const id = String(started.body.purchaseId);
  const own = await call("GET", `/checkout/${id}`, "user_mira");
  assert.equal(own.status, 200);
  assert.deepEqual(GetCheckoutResponse.parse(own.body), {
    status: "open",
    item: "couple",
    returnTo: "/dashboard?open=credits",
    credits: 3,
  });
  const missing = { status: 404, body: { error: "not_found", message: R.PURCHASE_NOT_FOUND_LINE } };
  assert.deepEqual(await call("GET", `/checkout/${id}`, "user_idris"), missing);
  assert.deepEqual(await call("GET", `/checkout/${id}`, null), missing);
  assert.deepEqual(await call("GET", "/checkout/no-such-purchase", "user_mira"), missing);
});

test("POST /billing/portal: signed out, a body off the contract, a return off the list, no Customer, no settings, then the Portal's address", async (t) => {
  const { world, call } = await serve(t);
  const account = { returnTo: "/dashboard/account" };
  assert.deepEqual(await call("POST", "/billing/portal", null, account), {
    status: 401,
    body: { error: "sign_in_required", message: R.PORTAL_SIGN_IN_LINE },
  });
  assert.equal((await call("POST", "/billing/portal", "user_mira", {})).status, 400);
  assert.deepEqual(await call("POST", "/billing/portal", "user_mira", { returnTo: "//evil.example" }), {
    status: 400,
    body: { error: "bad_return", message: R.BAD_RETURN_LINE },
  });
  assert.deepEqual(await call("POST", "/billing/portal", "user_mira", account), {
    status: 409,
    body: { error: "no_customer", message: R.NO_CUSTOMER_LINE },
  });
  world.customers.set("user_mira", "cus_mira");
  const opened = await call("POST", "/billing/portal", "user_mira", account);
  assert.equal(opened.status, 200);
  assert.deepEqual(OpenBillingPortalResponse.parse(opened.body), { url: "https://billing.stripe.com/p/session/test_fake" });
  assert.deepEqual(world.portals, [{ customer: "cus_mira", configuration: "bpc_fake", return_url: `${WEB}/dashboard/account` }]);

  const unset = await serve(t, { portalConfigurationId: async () => null });
  unset.world.customers.set("user_mira", "cus_mira");
  assert.deepEqual(await unset.call("POST", "/billing/portal", "user_mira", account), {
    status: 503,
    body: { error: "checkout_unavailable", message: R.PORTAL_UNAVAILABLE_LINE },
  });
});

test("each line a reader may see: everyday words, one or two short sentences, none borrowed from another refusal", () => {
  const lines = [
    R.BUY_SIGN_IN_LINE,
    R.PORTAL_SIGN_IN_LINE,
    R.TICK_REQUIRED_LINE,
    R.BAD_RETURN_LINE,
    R.ALREADY_SUBSCRIBED_LINE,
    R.CHECKOUT_UNAVAILABLE_LINE,
    R.PORTAL_UNAVAILABLE_LINE,
    R.NO_CUSTOMER_LINE,
    R.PURCHASE_NOT_FOUND_LINE,
  ];
  assert.equal(new Set(lines).size, lines.length);
  for (const line of lines) {
    assert.doesNotMatch(line, /[—;!]/, line);
    const sentences = line.split(/(?<=\.) /);
    assert.ok(sentences.length <= 2 && sentences.every((s) => s.split(" ").length <= 14 && s.endsWith(".")), line);
  }
  assert.match(R.ALREADY_SUBSCRIBED_LINE, /\bTimeline\b/, "a plan's refusal speaks of Timeline (R16-29)");
  assert.doesNotMatch(R.ALREADY_SUBSCRIBED_LINE, /credit/);
});
