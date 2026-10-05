/**
 * POST /api/stripe/webhook (ADR-275, reading 13), with events signed by the SDK's own generateTestHeaderString. The
 * route alone, behind the request logger app.ts uses: a refused signature is a bare 400 that reaches no handler and
 * logs nothing of the payload; a signed event is handled and logged by its type and id only. Through app.ts on
 * production before launch, from a foreign page's Origin with no cookie, the route answers ahead of every guard; with
 * WALK_DATABASE_URL naming a bootstrapped Postgres, a signed checkout grants there once and a refused one writes nothing.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import Stripe from "stripe";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points nowhere and nothing queries it.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL = "silent";
process.env.NODE_ENV = "test";
// Clerk's middleware throws without a key pair. These name no instance, and a request with no token is never verified.
process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from("clerk.example.com$").toString("base64")}`;
process.env.CLERK_SECRET_KEY = "test-secret-never-sent";
process.env.CLERK_TELEMETRY_DISABLED = "1";
delete process.env.WEB_ORIGINS;
delete process.env.ADMIN_USER_ID;
// No receipt leaves a test: without a key the mailer gives up before it reaches Resend.
delete process.env.RESEND_API_KEY;

const { default: express } = await import("express");
const { default: pinoHttp } = await import("pino-http");
const { createLogger, httpSerializers } = await import("../lib/logger.js");
const { default: app, requestErrorHandler } = await import("../app.js");
const { stripeWebhookRouter } = await import("./stripeWebhook.js");
type WebhookDeps = import("./stripeWebhook.js").WebhookDeps;

const SECRET = "whsec_standin";
const run = randomUUID().slice(0, 8);
const EMAIL = `mira-${run}@example.com`;
const NAME = "Mira Costa";

function sign(payload: string, opts: { secret?: string; timestamp?: number } = {}): string {
  return Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: opts.secret ?? SECRET,
    ...(opts.timestamp === undefined ? {} : { timestamp: opts.timestamp }),
  });
}

let n = 0;
function completed(sessionId = `cs_test_${run}_${++n}`, eventId = `evt_${run}_${++n}`): string {
  return JSON.stringify({
    id: eventId,
    object: "event",
    api_version: "2026-08-26.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        mode: "payment",
        status: "complete",
        payment_status: "paid",
        payment_intent: `pi_${run}_${n}`,
        amount_total: 7200,
        currency: "eur",
        livemode: false,
        customer_details: { email: EMAIL, name: NAME },
      },
    },
  });
}

function post(base: string, body: string, headers: Record<string, string> = {}) {
  return fetch(`${base}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
    body,
  });
}

async function listen(server: ReturnType<typeof app.listen>) {
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { base, close };
}

/** The route alone, behind the request logger app.ts uses, with every line it writes kept as production writes it. */
async function route(over: Partial<WebhookDeps>) {
  const lines: string[] = [];
  const log = createLogger({ NODE_ENV: "production", LOG_LEVEL: "info" }, { write: (line: string) => void lines.push(line) });
  const mini = express();
  mini.use(pinoHttp({ logger: log, serializers: httpSerializers }));
  mini.use("/api", stripeWebhookRouter(over));
  mini.use(requestErrorHandler);
  return { ...(await listen(mini.listen(0, "127.0.0.1"))), log: () => lines.join("") };
}

function recording() {
  const events: Stripe.Event[] = [];
  const handle: WebhookDeps["handle"] = async (event) => {
    events.push(event);
    return "processed";
  };
  return { events, handle };
}

const PAYLOAD_WORDS = [EMAIL, "example.com", NAME, "Mira", "customer_details", "cs_test_", "pi_"];

test("a signed event reaches the handler, parsed, and its line names only its type and id", async (t) => {
  const seen = recording();
  const api = await route({ secret: () => SECRET, handle: seen.handle });
  t.after(api.close);

  const body = completed();
  const res = await post(api.base, body, { "stripe-signature": sign(body) });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { received: true });
  assert.equal(seen.events.length, 1);
  const sent = JSON.parse(body) as { id: string };
  assert.deepEqual([seen.events[0].id, seen.events[0].type], [sent.id, "checkout.session.completed"]);

  const log = api.log();
  assert.match(log, new RegExp(`"event":"${sent.id}","type":"checkout.session.completed","outcome":"processed"`));
  for (const word of PAYLOAD_WORDS) assert.equal(log.includes(word), false, word);
});

test("a refused signature is a bare 400 that reaches no handler and logs nothing of the payload", async (t) => {
  const seen = recording();
  const api = await route({ secret: () => SECRET, handle: seen.handle });
  t.after(api.close);

  const body = completed();
  const refusals: Array<[string, Record<string, string>]> = [
    ["no signature", {}],
    ["another destination's secret", { "stripe-signature": sign(body, { secret: "whsec_someone_else" }) }],
    ["a signature for other bytes", { "stripe-signature": sign(completed()) }],
    ["a signature past Stripe's five minutes", { "stripe-signature": sign(body, { timestamp: Math.floor(Date.now() / 1000) - 600 }) }],
    ["a header that is no signature", { "stripe-signature": "t=1,v1=nothing" }],
  ];
  for (const [why, headers] of refusals) {
    const res = await post(api.base, body, headers);
    assert.equal(res.status, 400, why);
    assert.deepEqual(await res.json(), { error: "bad_signature" }, why);
  }
  assert.equal(seen.events.length, 0);
  const log = api.log();
  assert.match(log, /signature refused/);
  for (const word of PAYLOAD_WORDS) assert.equal(log.includes(word), false, word);
});

test("with no signing secret on the host the route answers 503 and reads no event", async (t) => {
  const seen = recording();
  const api = await route({ secret: () => null, handle: seen.handle });
  t.after(api.close);
  const body = completed();
  const res = await post(api.base, body, { "stripe-signature": sign(body) });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: "webhook_unavailable" });
  assert.equal(seen.events.length, 0);
});

test("a body over 1 MB is refused before its signature is read", async (t) => {
  const seen = recording();
  const api = await route({ secret: () => SECRET, handle: seen.handle });
  t.after(api.close);
  const body = JSON.stringify({ pad: "x".repeat(1024 * 1024) });
  const res = await post(api.base, body, { "stripe-signature": sign(body) });
  assert.equal(res.status, 413);
  assert.deepEqual(await res.json(), { error: "too_large" });
  assert.equal(seen.events.length, 0);
});

test("an event that fails is a 500 for Stripe to send again, logged by the failure's class and never its words", async (t) => {
  const api = await route({
    secret: () => SECRET,
    handle: async () => {
      throw Object.assign(new Error(`failed for ${EMAIL}, ${NAME}`), { code: "23505" });
    },
  });
  t.after(api.close);
  const body = completed();
  const res = await post(api.base, body, { "stripe-signature": sign(body) });
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: "internal_error" });
  const log = api.log();
  assert.match(log, /"failure":"Error","code":"23505"/);
  for (const word of PAYLOAD_WORDS) assert.equal(log.includes(word), false, word);
});

async function served() {
  return listen(app.listen(0, "127.0.0.1"));
}

function withEnv(t: { after: (fn: () => void) => void }, values: Record<string, string | undefined>) {
  const before = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test("on production before launch, from a foreign page with no cookie, the webhook answers ahead of every guard", async (t) => {
  withEnv(t, { APP_ENV: "production", STRIPE_WEBHOOK_SECRET: SECRET });
  const { base, close } = await served();
  t.after(close);

  const body = completed();
  const refused = await post(base, body, { origin: "https://evil.example", "stripe-signature": sign(body, { secret: "whsec_someone_else" }) });
  assert.equal(refused.status, 400, "the signature answers, not the origin guard or the prelaunch gate");
  assert.deepEqual(await refused.json(), { error: "bad_signature" });
  assert.equal(refused.headers.get("set-cookie"), null, "no session for Stripe");
  assert.equal(refused.headers.get("x-content-type-options"), "nosniff");

  const elsewhere = await fetch(`${base}/api/reports`, { method: "POST", headers: { origin: "https://evil.example" }, body: "{}" });
  assert.equal(elsewhere.status, 403, "any other write from that Origin is still refused");

  delete process.env.STRIPE_WEBHOOK_SECRET;
  const unset = await post(base, body, { "stripe-signature": sign(body) });
  assert.equal(unset.status, 503);
});

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the grant through app.ts runs on a scratch Postgres";

after(async () => {
  if (!SCRATCH) return;
  const { pool } = await import("@workspace/db");
  await pool.query("delete from purchases where id like $1", [`r1711w-${run}-%`]);
  await pool.query("delete from stripe_events where id like $1", [`evt_${run}_%`]);
  await pool.query("delete from users where id like $1", [`r1711w-${run}-%`]);
  await pool.end();
});

test("a signed checkout grants through app.ts once, and a refused one writes nothing", { skip: NO_DB }, async (t) => {
  withEnv(t, { APP_ENV: "production", STRIPE_WEBHOOK_SECRET: SECRET });
  const { pool } = await import("@workspace/db");
  const { getCredits } = await import("../lib/credits.js");
  const { CHECKOUT_TICK } = await import("@workspace/commerce");
  const userId = `r1711w-${run}-u-mira`;
  const purchaseId = `r1711w-${run}-p-family`;
  const sessionId = `cs_test_${run}_app`;
  await pool.query("insert into users (id, email) values ($1, $2)", [userId, EMAIL]);
  await pool.query(
    `insert into purchases (id, user_id, kind, item, cents, full_cents, stripe_session_id, tick_hash, ticked_at, return_to,
       status, is_test)
     values ($1, $2, 'bundle', 'family', 7200, 7200, $3, $4, now(), '/dashboard?open=credits', 'open', true)`,
    [purchaseId, userId, sessionId, createHash("sha256").update(CHECKOUT_TICK, "utf8").digest("hex")],
  );
  const { base, close } = await served();
  t.after(close);

  const refusedId = `evt_${run}_refused`;
  const forged = completed(sessionId, refusedId);
  assert.equal((await post(base, forged, { "stripe-signature": sign(forged, { secret: "whsec_someone_else" }) })).status, 400);
  assert.equal((await pool.query("select 1 from stripe_events where id = $1", [refusedId])).rowCount, 0, "no row before the signature passes");
  assert.equal((await getCredits(userId)).available, 0);

  const body = completed(sessionId);
  for (const delivery of ["first", "replay"]) {
    const res = await post(base, body, { "stripe-signature": sign(body) });
    assert.equal(res.status, 200, delivery);
  }
  assert.equal((await getCredits(userId)).available, 5);
  const [row] = (await pool.query("select status, receipt_delivered from purchases where id = $1", [purchaseId])).rows;
  assert.deepEqual(row, { status: "granted", receipt_delivered: false }, "granted, and its receipt tried with no mail key here");
  assert.equal((await pool.query("select 1 from stripe_events where id = $1", [(JSON.parse(body) as { id: string }).id])).rowCount, 1);
});
