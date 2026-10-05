/**
 * A stand-in for Stripe, for the buyer walk (ADR-273): a local server that answers the calls the real client makes
 * through STRIPE_API_BASE (the product sync, the Customer, the Checkout Session, the Portal and an invoice's payments),
 * and the objects Stripe's events carry once a payment, a refund, a renewal or a cancel happens, delivered to the
 * webhook signed as Stripe signs them. It keeps everything in memory and listens on 127.0.0.1 alone, so nothing leaves
 * the machine and no real key is needed.
 */
import http, { type IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import Stripe from "stripe";
import { STRIPE_API_VERSION } from "../lib/stripe.js";

export type Json = Record<string, unknown>;
type Answer = [status: number, body: unknown];

/** A request as Stripe would read it: its form body or query decoded back into objects. */
export interface StripeCall {
  method: string;
  path: string;
  params: Json;
  idempotencyKey: string | undefined;
}

export interface StripeEvent {
  id: string;
  object: "event";
  api_version: string;
  created: number;
  data: { object: Json };
  livemode: false;
  pending_webhooks: number;
  request: { id: null; idempotency_key: null };
  type: string;
}

/** What Stripe's events carry once a session is paid: a plan's session also makes its subscription and first invoice. */
export interface PaidSession {
  session: Json;
  subscription: Json | null;
  invoice: Json | null;
}

export interface TestStripe {
  /** STRIPE_API_BASE for the client. */
  base: string;
  calls: StripeCall[];
  /** The Prices the sync made, by id; a session keeps the one its line names as `line_price`. */
  prices: Map<string, Json>;
  sessions: Map<string, Json>;
  customers: Map<string, Json>;
  /** The buyer pays a session: as Stripe has it after, with a plan's subscription and paid first invoice. */
  pay(sessionId: string): PaidSession;
  /** The charge of a payment, refunded in full, as `charge.refunded` carries it. */
  refund(paymentIntent: string): Json;
  /** A plan's next period, paid: the subscription moved on and the cycle's paid invoice. */
  renew(subscriptionId: string): { subscription: Json; invoice: Json };
  /** Cancel in the Portal: the plan stays until its period ends. */
  cancelAtPeriodEnd(subscriptionId: string): Json;
  /** The period a cancel was set for has ended. */
  end(subscriptionId: string): Json;
  /** A new event with an id of its own, as Stripe makes one per thing that happens. */
  event(type: string, object: Json): StripeEvent;
  /** Stripe sends an event to the webhook, signed with `secret`. */
  deliver(url: string, event: StripeEvent, secret: string): Promise<{ status: number; body: unknown }>;
  close(): Promise<void>;
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
const first = (value: unknown): Json => (isJson(value) && isJson(value["0"]) ? value["0"] : {});
const failure = (status: number, code: string | undefined, message: string): Answer => [
  status,
  { error: { type: "invalid_request_error", code, message } },
];

function body(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Stripe's periods run by the calendar, in UTC: the same day a month or a year on, or that month's last day. */
function periodAfter(start: number, interval: string): number {
  const at = new Date(start * 1000);
  const day = at.getUTCDate();
  const months = at.getUTCMonth() + (interval === "year" ? 12 : 1);
  const lastDay = new Date(Date.UTC(at.getUTCFullYear(), months + 1, 0)).getUTCDate();
  at.setUTCDate(1);
  at.setUTCMonth(months);
  at.setUTCDate(Math.min(day, lastDay));
  return Math.floor(at.getTime() / 1000);
}

export async function startTestStripe(): Promise<TestStripe> {
  const calls: StripeCall[] = [];
  const products = new Map<string, Json>();
  const prices = new Map<string, Json>();
  const portals = new Map<string, Json>();
  const customers = new Map<string, Json>();
  const customerByKey = new Map<string, Json>();
  const sessions = new Map<string, Json>();
  const subscriptions = new Map<string, Json>();
  const invoicePayments = new Map<string, Json[]>();
  const charges = new Map<string, Json>();
  // A run's ids are its own, so nothing a test or an earlier run left in the same database answers to them.
  const run = randomUUID().slice(0, 8);
  let count = 0;
  const nextId = (prefix: string) => `${prefix}_${run}${String(++count).padStart(4, "0")}`;
  const now = () => Math.floor(Date.now() / 1000);

  const list = (rows: Json[], params: Json, url: string): Answer => {
    const from = params.starting_after ? rows.findIndex((row) => row.id === params.starting_after) + 1 : 0;
    const limit = Number(params.limit ?? 10);
    return [200, { object: "list", data: rows.slice(from, from + limit), has_more: from + limit < rows.length, url }];
  };

  const portalOf = (id: string, params: Json, was?: Json): Json => {
    const features = isJson(params.features) ? params.features : {};
    const feature = (name: string): Json => (isJson(features[name]) ? (features[name] as Json) : {});
    const profile = isJson(params.business_profile) ? params.business_profile : {};
    const cancel = feature("subscription_cancel");
    return {
      id,
      object: "billing_portal.configuration",
      active: flag(params.active, was ? was.active === true : true),
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
        payment_method_update: { enabled: flag(feature("payment_method_update").enabled, false) },
        subscription_cancel: { enabled: flag(cancel.enabled, false), mode: cancel.mode ?? "at_period_end" },
        subscription_update: { enabled: flag(feature("subscription_update").enabled, false) },
      },
      is_default: false,
      livemode: false,
      metadata: isJson(params.metadata) ? params.metadata : (was?.metadata ?? {}),
    };
  };

  const routes: Array<[string, RegExp, (params: Json, id: string, call: StripeCall) => Answer]> = [
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
        const product: Json = { id, object: "product", active: flag(params.active, true), livemode: false, name: String(params.name) };
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
        const product = String(params.product);
        if (!products.has(product)) return failure(400, "resource_missing", `No such product: '${product}'`);
        const key = typeof params.lookup_key === "string" ? params.lookup_key : null;
        const holder = key ? [...prices.values()].find((price) => price.lookup_key === key) : undefined;
        if (holder) {
          if (params.transfer_lookup_key !== "true") {
            return failure(400, undefined, `A price (${String(holder.id)}) already uses that lookup key.`);
          }
          holder.lookup_key = null;
        }
        const recurring = isJson(params.recurring)
          ? { interval: String(params.recurring.interval), interval_count: Number(params.recurring.interval_count ?? 1), usage_type: "licensed" }
          : null;
        const price: Json = {
          id: nextId("price"),
          object: "price",
          active: true,
          currency: String(params.currency),
          livemode: false,
          lookup_key: key,
          product,
          recurring,
          tax_behavior: typeof params.tax_behavior === "string" ? params.tax_behavior : "unspecified",
          type: recurring ? "recurring" : "one_time",
          unit_amount: Number(params.unit_amount),
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
    [
      "POST",
      /^\/v1\/billing_portal\/sessions$/,
      (params) => {
        if (!customers.has(String(params.customer))) return failure(400, "resource_missing", "No such customer");
        if (!portals.has(String(params.configuration))) return failure(400, "resource_missing", "No such configuration");
        const id = nextId("bps");
        return [
          200,
          {
            id,
            object: "billing_portal.session",
            configuration: params.configuration,
            customer: params.customer,
            livemode: false,
            return_url: params.return_url ?? null,
            url: `https://billing.stripe.com/p/session/test_${id}`,
          },
        ];
      },
    ],
    [
      "POST",
      /^\/v1\/customers$/,
      (params, _, call) => {
        // Stripe answers a create it has seen under the same key with the first one's object.
        const kept = call.idempotencyKey ? customerByKey.get(call.idempotencyKey) : undefined;
        if (kept) return [200, kept];
        const customer: Json = { id: nextId("cus"), object: "customer", email: params.email ?? null, livemode: false };
        customers.set(String(customer.id), customer);
        if (call.idempotencyKey) customerByKey.set(call.idempotencyKey, customer);
        return [200, customer];
      },
    ],
    [
      "POST",
      /^\/v1\/checkout\/sessions$/,
      (params) => {
        const line = first(params.line_items);
        const price = prices.get(String(line.price));
        if (!price || price.active !== true) return failure(400, "resource_missing", `No such price: '${String(line.price)}'`);
        if (!customers.has(String(params.customer))) return failure(400, "resource_missing", "No such customer");
        const mode = String(params.mode);
        if ((mode === "subscription") !== (price.type === "recurring")) {
          return failure(400, undefined, `A ${String(price.type)} price can't be bought in ${mode} mode.`);
        }
        // The walk runs no campaign, so no coupon takes anything off.
        if (first(params.discounts).coupon !== undefined) return failure(400, "resource_missing", "No such coupon");
        const id = nextId("cs_test");
        const session: Json = {
          id,
          object: "checkout.session",
          amount_subtotal: price.unit_amount,
          amount_total: price.unit_amount,
          client_reference_id: params.client_reference_id ?? null,
          client_secret: `${id}_secret_standin`,
          currency: "eur",
          customer: params.customer,
          customer_details: null,
          livemode: false,
          metadata: isJson(params.metadata) ? params.metadata : {},
          mode,
          payment_intent: null,
          payment_status: "unpaid",
          return_url: params.return_url ?? null,
          status: "open",
          subscription: null,
          ui_mode: params.ui_mode ?? null,
          // Kept for the payment that follows: Stripe copies these onto the subscription it makes.
          line_price: price.id,
          subscription_metadata: isJson(params.subscription_data) && isJson(params.subscription_data.metadata) ? params.subscription_data.metadata : {},
        };
        sessions.set(id, session);
        return [200, publicSession(session)];
      },
    ],
    [
      "GET",
      /^\/v1\/invoice_payments$/,
      (params) => {
        const rows = invoicePayments.get(String(params.invoice)) ?? [];
        return list(rows, params, "/v1/invoice_payments");
      },
    ],
  ];

  /** The session without what the stand-in keeps for itself. */
  function publicSession(session: Json): Json {
    const { line_price: _price, subscription_metadata: _metadata, ...shown } = session;
    return { ...shown };
  }

  const server = http.createServer((req, res) => {
    void body(req).then((text) => {
      const url = new URL(req.url ?? "/", "http://stand-in");
      const method = req.method ?? "GET";
      const key = req.headers["idempotency-key"];
      const call: StripeCall = {
        method,
        path: url.pathname,
        params: decodeForm(method === "GET" ? url.search.slice(1) : text),
        idempotencyKey: Array.isArray(key) ? key[0] : key,
      };
      calls.push(call);
      const route = routes.find(([verb, pattern]) => verb === method && pattern.test(url.pathname));
      const [status, payload] = route
        ? route[2](call.params, decodeURIComponent(route[1].exec(url.pathname)?.[1] ?? ""), call)
        : failure(404, undefined, `Unrecognized request URL (${method}: ${url.pathname})`);
      res.writeHead(status, { "content-type": "application/json", "request-id": `req_${run}${calls.length}` });
      res.end(JSON.stringify(payload));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));

  function must<T>(map: Map<string, T>, id: string, what: string): T {
    const found = map.get(id);
    if (!found) throw new Error(`the Stripe stand-in has no ${what} ${id}`);
    return found;
  }

  /** A plan's one item, which carries its Price and, since the basil API, its period. */
  function itemOf(subscription: Json): Json {
    const [item] = (subscription.items as { data: Json[] }).data;
    if (!item) throw new Error(`the subscription ${String(subscription.id)} has no item`);
    return item;
  }

  function paidInvoice(subscription: Json, reason: "subscription_create" | "subscription_cycle"): Json {
    const item = itemOf(subscription);
    const price = item.price as Json;
    const id = nextId("in");
    const intent = nextId("pi");
    const customer = must(customers, String(subscription.customer), "customer");
    const invoice: Json = {
      id,
      object: "invoice",
      amount_due: price.unit_amount,
      amount_paid: price.unit_amount,
      billing_reason: reason,
      currency: "eur",
      customer: subscription.customer,
      customer_email: customer.email ?? null,
      livemode: false,
      status: "paid",
      // Since the basil API an invoice names its subscription, and the tags it had, under its parent.
      parent: {
        type: "subscription_details",
        quote_details: null,
        subscription_details: { subscription: subscription.id, metadata: subscription.metadata },
      },
      lines: {
        object: "list",
        has_more: false,
        url: `/v1/invoices/${id}/lines`,
        data: [
          {
            id: nextId("il"),
            object: "line_item",
            amount: price.unit_amount,
            currency: "eur",
            period: { start: item.current_period_start, end: item.current_period_end },
            parent: {
              type: "subscription_item_details",
              invoice_item_details: null,
              subscription_item_details: { subscription: subscription.id, subscription_item: item.id, proration: false },
            },
            pricing: { type: "price_details", price_details: { price: price.id, product: price.product } },
          },
        ],
      },
    };
    // The event leaves the invoice's payments out, as Stripe does unless asked; the webhook reads them here.
    invoicePayments.set(id, [
      {
        id: nextId("inpay"),
        object: "invoice_payment",
        amount_paid: price.unit_amount,
        amount_requested: price.unit_amount,
        currency: "eur",
        invoice: id,
        is_default: true,
        livemode: false,
        payment: { type: "payment_intent", payment_intent: intent },
        status: "paid",
      },
    ]);
    return invoice;
  }

  function startSubscription(session: Json): { subscription: Json; invoice: Json } {
    const price = must(prices, String(session.line_price), "price");
    const recurring = price.recurring as Json;
    const start = now();
    const end = periodAfter(start, String(recurring.interval));
    const id = nextId("sub");
    const subscription: Json = {
      id,
      object: "subscription",
      cancel_at: null,
      cancel_at_period_end: false,
      canceled_at: null,
      created: start,
      customer: session.customer,
      ended_at: null,
      livemode: false,
      metadata: session.subscription_metadata,
      start_date: start,
      status: "active",
      // Since the basil API a period's end is on the subscription's item.
      items: {
        object: "list",
        has_more: false,
        url: `/v1/subscription_items?subscription=${id}`,
        data: [
          {
            id: nextId("si"),
            object: "subscription_item",
            current_period_start: start,
            current_period_end: end,
            price,
            quantity: 1,
            subscription: id,
          },
        ],
      },
    };
    subscriptions.set(id, subscription);
    return { subscription, invoice: paidInvoice(subscription, "subscription_create") };
  }

  const copy = (value: Json): Json => JSON.parse(JSON.stringify(value));

  return {
    base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    calls,
    prices,
    sessions,
    customers,
    pay(sessionId) {
      const session = must(sessions, sessionId, "session");
      if (session.status !== "open") throw new Error(`the session ${sessionId} is ${String(session.status)}, not open`);
      const customer = must(customers, String(session.customer), "customer");
      session.status = "complete";
      session.payment_status = "paid";
      session.customer_details = { email: customer.email ?? null, name: null };
      if (session.mode === "subscription") {
        const { subscription, invoice } = startSubscription(session);
        session.subscription = subscription.id;
        return { session: publicSession(copy(session)), subscription: copy(subscription), invoice: copy(invoice) };
      }
      const intent = nextId("pi");
      session.payment_intent = intent;
      charges.set(intent, {
        id: nextId("ch"),
        object: "charge",
        amount: session.amount_total,
        amount_captured: session.amount_total,
        amount_refunded: 0,
        captured: true,
        currency: "eur",
        customer: session.customer,
        livemode: false,
        paid: true,
        payment_intent: intent,
        refunded: false,
        status: "succeeded",
      });
      return { session: publicSession(copy(session)), subscription: null, invoice: null };
    },
    refund(paymentIntent) {
      const charge = must(charges, paymentIntent, "charge for the payment");
      charge.amount_refunded = charge.amount;
      charge.refunded = true;
      return copy(charge);
    },
    renew(subscriptionId) {
      const subscription = must(subscriptions, subscriptionId, "subscription");
      if (subscription.status !== "active" || subscription.cancel_at_period_end === true) {
        throw new Error(`the subscription ${subscriptionId} does not renew`);
      }
      const item = itemOf(subscription);
      const recurring = (item.price as Json).recurring as Json;
      item.current_period_start = item.current_period_end;
      item.current_period_end = periodAfter(Number(item.current_period_end), String(recurring.interval));
      return { subscription: copy(subscription), invoice: copy(paidInvoice(subscription, "subscription_cycle")) };
    },
    cancelAtPeriodEnd(subscriptionId) {
      const subscription = must(subscriptions, subscriptionId, "subscription");
      const item = itemOf(subscription);
      subscription.cancel_at_period_end = true;
      subscription.cancel_at = item.current_period_end;
      subscription.canceled_at = now();
      return copy(subscription);
    },
    end(subscriptionId) {
      const subscription = must(subscriptions, subscriptionId, "subscription");
      if (subscription.cancel_at_period_end !== true) throw new Error(`the subscription ${subscriptionId} was never set to end`);
      subscription.status = "canceled";
      subscription.ended_at = subscription.cancel_at;
      return copy(subscription);
    },
    event(type, object) {
      return {
        id: nextId("evt"),
        object: "event",
        api_version: STRIPE_API_VERSION,
        created: now(),
        data: { object: copy(object) },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type,
      };
    },
    async deliver(url, event, secret) {
      const payload = JSON.stringify(event);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": Stripe.webhooks.generateTestHeaderString({ payload, secret }),
        },
        body: payload,
      });
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        // A body that isn't JSON is returned as its text, for the step to show.
      }
      return { status: res.status, body: parsed };
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
