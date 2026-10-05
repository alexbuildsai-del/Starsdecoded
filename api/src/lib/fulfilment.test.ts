/**
 * The ledger from Stripe's events (ADR-275, R-6.2, reading 3). Which purchase carries its tick and where the receipt's
 * History link points run here with no database. The events themselves run on a scratch Postgres when
 * WALK_DATABASE_URL names a bootstrapped one, and skip, saying why, without it: each event once, each purchase once,
 * a refund or a dispute taking back only what is unused, and no payload, email or name in any line logged.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type Stripe from "stripe";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points nowhere and nothing queries it.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
process.env.LOG_LEVEL ??= "silent";
process.env.APP_ENV = "staging";
delete process.env.PUBLIC_APP_URL;

const { carriesTick, handleStripeEvent, historyUrl } = await import("./fulfilment.js");
const { creditHistory, getCredits, holdCredit, moveHeldCredit } = await import("./credits.js");
const { CHECKOUT_TICK } = await import("@workspace/commerce");
type FulfilmentDeps = import("./fulfilment.js").FulfilmentDeps;
type ReceiptOptions = import("./mailer.js").SendReceiptEmailOptions;

const TICK = createHash("sha256").update(CHECKOUT_TICK, "utf8").digest("hex");

test("a purchase carries its tick only with the words' sha256 digest and the moment it was ticked", () => {
  const at = new Date("2026-10-05T09:00:00Z");
  assert.equal(carriesTick({ tickHash: TICK, tickedAt: at }), true);
  assert.equal(carriesTick({ tickHash: "", tickedAt: at }), false);
  assert.equal(carriesTick({ tickHash: CHECKOUT_TICK, tickedAt: at }), false, "the words themselves are not a digest");
  assert.equal(carriesTick({ tickHash: TICK.toUpperCase(), tickedAt: at }), false);
  assert.equal(carriesTick({ tickHash: TICK, tickedAt: new Date(Number.NaN) }), false);
});

test("the receipt's History link is on the web's configured origin, whatever host the event came through", () => {
  assert.equal(historyUrl({ APP_ENV: "staging" }), "https://starsdecoded-staging.vercel.app/dashboard?open=credits");
  assert.equal(historyUrl({ APP_ENV: "production" }), "https://mystarsdecoded.com/dashboard?open=credits");
  assert.equal(historyUrl({ APP_ENV: "production", PUBLIC_APP_URL: "https://mystarsdecoded.com/" }), "https://mystarsdecoded.com/dashboard?open=credits");
  assert.equal(historyUrl(), "https://starsdecoded-staging.vercel.app/dashboard?open=credits");
});

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the ledger's events run on a scratch Postgres";

/** Each run's own rows, so a second run, or the walk on the same database, finds nothing of the first. */
const run = randomUUID().slice(0, 8);
const id = (name: string) => `r1711-${run}-${name}`;
let n = 0;
const next = (prefix: string) => `${prefix}_${run}_${++n}`;

async function pg() {
  return import("@workspace/db");
}

async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const { pool } = await pg();
  return (await pool.query(text, params)).rows as T[];
}

// The run's rows go with it: an account takes its bundles and credits along, and nothing else refers to the rest.
after(async () => {
  if (!SCRATCH) return;
  const mine = `r1711-${run}-%`;
  await q("delete from invite_tokens where id like $1", [mine]);
  await q("delete from purchases where id like $1", [mine]);
  await q("delete from campaigns where id like $1", [mine]);
  await q("delete from stripe_events where id like $1", [`evt_${run}_%`]);
  await q("delete from users where id like $1", [mine]);
  await (await pg()).pool.end();
});

/** Every argument the ledger hands its logger, before any redaction could hide a slip. */
function recorder() {
  const calls: unknown[][] = [];
  const at = (level: string) => (...args: unknown[]) => void calls.push([level, ...args]);
  const log = { info: at("info"), warn: at("warn"), error: at("error") } as unknown as FulfilmentDeps["log"];
  return { calls, log, text: () => JSON.stringify(calls) };
}

function harness() {
  const receipts: ReceiptOptions[] = [];
  const subscriptionEvents: string[] = [];
  const logs = recorder();
  const deps: Partial<FulfilmentDeps> = {
    log: logs.log,
    sendReceipt: async (opts) => {
      receipts.push(opts);
      return true;
    },
    applySubscriptionEvent: async (event) => void subscriptionEvents.push(event.id),
  };
  return { receipts, subscriptionEvents, logs, deps, handle: (event: Stripe.Event) => handleStripeEvent(event, deps) };
}

async function buyer(name: string, email: string | null = `${name}-${run}@example.com`): Promise<string> {
  const userId = id(`u-${name}`);
  await q("insert into users (id, email) values ($1, $2)", [userId, email]);
  return userId;
}

interface Bought {
  purchaseId: string;
  sessionId: string;
  paymentIntent: string;
}

async function purchase(
  userId: string,
  over: { item?: string; cents?: number; tickHash?: string; campaignId?: string | null; paymentIntent?: string | null } = {},
): Promise<Bought> {
  const purchaseId = id(next("p"));
  const sessionId = next("cs_test");
  const paymentIntent = next("pi");
  await q(
    `insert into purchases (id, user_id, kind, item, cents, full_cents, campaign_id, stripe_session_id, stripe_payment_intent,
       tick_hash, ticked_at, return_to, status, is_test)
     values ($1, $2, 'bundle', $3, $4, $4, $5, $6, $7, $8, now(), '/dashboard?open=credits', 'open', true)`,
    [purchaseId, userId, over.item ?? "family", over.cents ?? 7200, over.campaignId ?? null, sessionId, over.paymentIntent ?? null, over.tickHash ?? TICK],
  );
  return { purchaseId, sessionId, paymentIntent };
}

function event(type: string, object: Record<string, unknown>, eventId = next("evt")): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    api_version: "2026-08-26.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
    data: { object },
  } as unknown as Stripe.Event;
}

function session(bought: Bought, over: Record<string, unknown> = {}) {
  return {
    id: bought.sessionId,
    object: "checkout.session",
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    payment_intent: bought.paymentIntent,
    amount_total: 7200,
    currency: "eur",
    livemode: false,
    client_reference_id: bought.purchaseId,
    metadata: { purchase_id: bought.purchaseId },
    customer_details: { email: `mira-${run}@example.com`, name: "Mira Costa" },
    ...over,
  };
}

const paid = (bought: Bought, over: Record<string, unknown> = {}, eventId?: string) =>
  event("checkout.session.completed", session(bought, over), eventId);

function refund(bought: Bought, refunded: number, amount = 7200) {
  return event("charge.refunded", {
    id: next("ch"),
    object: "charge",
    amount,
    amount_captured: amount,
    amount_refunded: refunded,
    refunded: refunded >= amount,
    payment_intent: bought.paymentIntent,
    billing_details: { email: `mira-${run}@example.com`, name: "Mira Costa" },
    livemode: false,
  });
}

async function purchaseRow(purchaseId: string) {
  const [row] = await q<{
    status: string;
    granted_at: Date | null;
    refunded_at: Date | null;
    stripe_payment_intent: string | null;
    receipt_delivered: boolean | null;
  }>("select status, granted_at, refunded_at, stripe_payment_intent, receipt_delivered from purchases where id = $1", [purchaseId]);
  return row;
}

async function bundleOf(purchaseId: string) {
  return q<{ id: string; source: string; is_test: boolean; user_id: string }>(
    "select id, source, is_test, user_id from bundles where purchase_id = $1",
    [purchaseId],
  );
}

async function creditsOf(bundleId: string) {
  return q<{ id: string; status: string; user_id: string }>(
    "select id, status, user_id from credits where bundle_id = $1 order by created_at, id",
    [bundleId],
  );
}

async function gift(giverId: string, recipientName: string): Promise<string> {
  const inviteId = id(next("gift"));
  await q(
    `insert into invite_tokens (id, token_hash, email, kind, created_by_user_id, recipient_name, expires_at)
     values ($1, $2, $3, 'gift', $4, $5, now() + interval '30 days')`,
    [inviteId, createHash("sha256").update(inviteId).digest("hex"), `${recipientName.toLowerCase()}-${run}@example.com`, giverId, recipientName],
  );
  return inviteId;
}

test("a paid checkout grants its bundle once, stamps the grant and the payment, and sends one receipt", { skip: NO_DB }, async () => {
  const h = harness();
  const mira = await buyer("mira-grant");
  const bought = await purchase(mira);
  const completed = paid(bought);

  assert.equal(await h.handle(completed), "processed");
  const [bundle] = await bundleOf(bought.purchaseId);
  assert.ok(bundle, "the purchase has its bundle");
  assert.deepEqual([bundle.source, bundle.is_test, bundle.user_id], ["purchase", true, mira]);
  assert.equal((await creditsOf(bundle.id)).length, 5);
  assert.equal((await getCredits(mira)).available, 5);
  const row = await purchaseRow(bought.purchaseId);
  assert.equal(row.status, "granted");
  assert.ok(row.granted_at instanceof Date);
  assert.equal(row.stripe_payment_intent, bought.paymentIntent);
  assert.equal(row.receipt_delivered, true);
  assert.deepEqual(h.receipts, [
    {
      to: `mira-grant-${run}@example.com`,
      item: "family",
      cents: 7200,
      campaignName: null,
      historyUrl: "https://starsdecoded-staging.vercel.app/dashboard?open=credits",
    },
  ]);

  assert.equal(await h.handle(completed), "duplicate", "Stripe's replay of the same event");
  assert.equal(await h.handle(event("checkout.session.async_payment_succeeded", session(bought))), "processed");
  assert.equal((await getCredits(mira)).available, 5, "a replay and a second event for the session add nothing");
  assert.equal((await bundleOf(bought.purchaseId)).length, 1);
  assert.equal(h.receipts.length, 1, "one receipt");
  assert.deepEqual((await purchaseRow(bought.purchaseId)).granted_at, row.granted_at);
  const [seen] = await q<{ type: string; livemode: boolean; processed_at: Date | null }>(
    "select type, livemode, processed_at from stripe_events where id = $1",
    [completed.id],
  );
  assert.deepEqual([seen.type, seen.livemode, seen.processed_at instanceof Date], ["checkout.session.completed", false, true]);
});

test("a bank debit completes unpaid and grants on async_payment_succeeded, once", { skip: NO_DB }, async () => {
  const h = harness();
  const mira = await buyer("mira-debit");
  const bought = await purchase(mira, { item: "couple", cents: 5400 });

  assert.equal(await h.handle(paid(bought, { payment_status: "unpaid", amount_total: 5400 })), "ignored");
  assert.equal((await getCredits(mira)).available, 0);
  assert.equal((await purchaseRow(bought.purchaseId)).status, "open");

  const succeeded = event("checkout.session.async_payment_succeeded", session(bought, { amount_total: 5400 }));
  assert.equal(await h.handle(succeeded), "processed");
  assert.equal(await h.handle(succeeded), "duplicate");
  assert.equal((await getCredits(mira)).available, 3);
  assert.equal(h.receipts.length, 1);
  assert.equal(h.receipts[0].cents, 5400);
});

test("completed and async_payment_succeeded arriving together grant once", { skip: NO_DB }, async () => {
  const h = harness();
  const mira = await buyer("mira-race");
  const bought = await purchase(mira);
  const outcomes = await Promise.all([
    h.handle(paid(bought)),
    h.handle(event("checkout.session.async_payment_succeeded", session(bought))),
  ]);
  assert.deepEqual(outcomes, ["processed", "processed"]);
  assert.equal((await getCredits(mira)).available, 5);
  assert.equal(h.receipts.length, 1);
});

test("a purchase without its tick grants nothing, and the line names only the event", { skip: NO_DB }, async () => {
  const h = harness();
  const mira = await buyer("mira-untick");
  const bought = await purchase(mira, { tickHash: "" });
  const completed = paid(bought);
  assert.equal(await h.handle(completed), "ignored");
  assert.equal((await getCredits(mira)).available, 0);
  assert.equal((await purchaseRow(bought.purchaseId)).status, "open");
  assert.equal(h.receipts.length, 0);
  const [line] = h.logs.calls;
  assert.deepEqual(line, ["error", { event: completed.id, type: "checkout.session.completed" }, "a paid checkout's purchase carries no tick, so nothing was granted"]);
});

test("a session that matches no bundle purchase grants nothing: another's session, or a plan's", { skip: NO_DB }, async () => {
  const h = harness();
  const stranger = paid({ purchaseId: "none", sessionId: next("cs_test"), paymentIntent: next("pi") });
  assert.equal(await h.handle(stranger), "ignored");
  assert.match(h.logs.text(), /matches no bundle purchase/);
  const plan = paid({ purchaseId: "none", sessionId: next("cs_test"), paymentIntent: next("pi") }, { mode: "subscription" });
  assert.equal(await h.handle(plan), "ignored");
  assert.equal(h.receipts.length, 0);
});

test("the receipt names the campaign, and goes to the session's address when the account has none", { skip: NO_DB }, async () => {
  const h = harness();
  const campaignId = id(next("camp"));
  await q(
    `insert into campaigns (id, name, audience, starts_on, ends_on, prices, created_by)
     values ($1, 'Autumn', 'everyone', '2026-10-01', '2026-10-31', '{"family": 6000}', 'user_admin')`,
    [campaignId],
  );
  const mira = await buyer("mira-offer", null);
  const bought = await purchase(mira, { cents: 6000, campaignId });
  assert.equal(await h.handle(paid(bought, { amount_total: 6000 })), "processed");
  assert.deepEqual(
    h.receipts.map((r) => [r.to, r.cents, r.campaignName]),
    [[`mira-${run}@example.com`, 6000, "Autumn"]],
  );
});

test("a full refund takes the unused credits, available then held, and never a used or a given one", { skip: NO_DB }, async () => {
  const h = harness();
  const mira = await buyer("mira-refund");
  const idris = await buyer("idris-refund");
  const bought = await purchase(mira);
  await h.handle(paid(bought));
  const [bundle] = await bundleOf(bought.purchaseId);
  const [first] = await creditsOf(bundle.id);
  await q("update credits set status = 'used' where id = $1", [first.id]);

  const given = await gift(mira, "Idris Costa");
  const givenCredit = await holdCredit(mira, given);
  await q("update invite_tokens set claimed_at = now(), claimed_by_user_id = $2 where id = $1", [given, idris]);
  assert.equal(await moveHeldCredit(given, idris), true);
  const waiting = await gift(mira, "Tomás Reyes");
  const heldCredit = await holdCredit(mira, waiting);
  const before = await getCredits(mira);
  assert.deepEqual([before.available, before.used, before.held], [2, 1, 1], "two available, one used, one held, one given");

  const refunded = refund(bought, 7200);
  assert.equal(await h.handle(refunded), "processed");
  const after = await getCredits(mira);
  assert.deepEqual([after.available, after.used, after.held], [0, 1, 0]);
  assert.equal((await getCredits(idris)).available, 1, "the given credit stays its recipient's");
  const statuses = new Map((await creditsOf(bundle.id)).map((c) => [c.id, c.status]));
  assert.equal(statuses.get(first.id), "used");
  assert.equal(statuses.get(givenCredit!), "available");
  assert.equal(statuses.get(heldCredit!), "refunded");
  assert.equal([...statuses.values()].filter((s) => s === "refunded").length, 3);
  const [stopped] = await q<{ revoked_at: Date | null; credit_id: string | null }>(
    "select revoked_at, credit_id from invite_tokens where id = $1",
    [waiting],
  );
  assert.ok(stopped.revoked_at instanceof Date, "the waiting gift is taken back, so its link stops");
  assert.equal(stopped.credit_id, null);

  const row = await purchaseRow(bought.purchaseId);
  assert.equal(row.status, "refunded");
  assert.ok(row.refunded_at instanceof Date);
  assert.equal(await h.handle(refund(bought, 7200)), "processed", "a second refund event for the same charge");
  assert.equal([...(await creditsOf(bundle.id))].filter((c) => c.status === "refunded").length, 3);
  assert.deepEqual((await purchaseRow(bought.purchaseId)).refunded_at, row.refunded_at, "refunded_at keeps the first");

  const history = await creditHistory(mira);
  assert.deepEqual(
    history.filter((l) => l.kind === "refunded" || l.kind === "bought").map((l) => [l.kind, l.count, l.label]),
    [
      ["refunded", 3, "Refunded"],
      ["bought", 5, "5 test credits"],
    ],
  );
  assert.equal(history.find((l) => l.kind === "refunded")?.date, row.refunded_at!.toISOString(), "dated the first refund");
  assert.ok(history.some((l) => l.kind === "spent" && l.label === "Gift to Idris"));
  // No chart of her own here, so the line has no name to give.
  assert.deepEqual((await creditHistory(idris)).map((l) => [l.kind, l.count, l.label]), [["gift", 1, "A gift"]]);
});

test("a partial refund takes at most round(credits × refunded ÷ paid), and a later one what the total still owes", { skip: NO_DB }, async () => {
  const h = harness();
  const mira = await buyer("mira-partial");
  const bought = await purchase(mira);
  await h.handle(paid(bought));

  assert.equal(await h.handle(refund(bought, 2880)), "processed");
  assert.equal((await getCredits(mira)).available, 3, "40% of 5 credits is 2");
  const first = await purchaseRow(bought.purchaseId);
  assert.equal(first.status, "granted", "a partial refund leaves the purchase granted");
  assert.ok(first.refunded_at instanceof Date);

  assert.equal(await h.handle(refund(bought, 4320)), "processed");
  assert.equal((await getCredits(mira)).available, 2, "60% in all is 3, so one more");
  assert.deepEqual((await purchaseRow(bought.purchaseId)).refunded_at, first.refunded_at);

  assert.equal(await h.handle(refund(bought, 7200)), "processed");
  assert.equal((await getCredits(mira)).available, 0);
  assert.equal((await purchaseRow(bought.purchaseId)).status, "refunded");
  assert.deepEqual(
    (await creditHistory(mira)).filter((l) => l.kind === "refunded").map((l) => [l.count, l.label]),
    [[5, "Refunded"]],
  );
});

test("a dispute takes every unused credit at once and marks the purchase disputed", { skip: NO_DB }, async () => {
  const h = harness();
  const mira = await buyer("mira-dispute");
  const bought = await purchase(mira);
  await h.handle(paid(bought));
  const [bundle] = await bundleOf(bought.purchaseId);
  const [first] = await creditsOf(bundle.id);
  await q("update credits set status = 'used' where id = $1", [first.id]);

  const disputed = event("charge.dispute.created", {
    id: next("dp"),
    object: "dispute",
    amount: 7200,
    charge: next("ch"),
    payment_intent: bought.paymentIntent,
    reason: "fraudulent",
    status: "needs_response",
    livemode: false,
  });
  assert.equal(await h.handle(disputed), "processed");
  const after = await getCredits(mira);
  assert.deepEqual([after.available, after.used], [0, 1]);
  const row = await purchaseRow(bought.purchaseId);
  assert.equal(row.status, "disputed");
  assert.ok(row.refunded_at instanceof Date);
});

test("a refund that reaches a purchase before its grant keeps it from granting", { skip: NO_DB }, async () => {
  const h = harness();
  const mira = await buyer("mira-early");
  const pi = next("pi");
  const bought = { ...(await purchase(mira, { paymentIntent: pi })), paymentIntent: pi };
  assert.equal(await h.handle(refund(bought, 7200)), "processed");
  assert.equal((await purchaseRow(bought.purchaseId)).status, "refunded");
  assert.equal(await h.handle(paid(bought)), "processed");
  assert.equal((await getCredits(mira)).available, 0);
  assert.equal(h.receipts.length, 0);
  const stray = refund({ purchaseId: "none", sessionId: "none", paymentIntent: next("pi") }, 7200);
  assert.equal(await h.handle(stray), "ignored", "a refund of a payment we never sold");
});

test("an expired session or a failed bank debit closes its open purchase, and only an open one", { skip: NO_DB }, async () => {
  const h = harness();
  const mira = await buyer("mira-expired");
  const left = await purchase(mira);
  assert.equal(await h.handle(event("checkout.session.expired", session(left, { status: "expired", payment_status: "unpaid" }))), "processed");
  assert.equal((await purchaseRow(left.purchaseId)).status, "expired");
  const failed = await purchase(mira);
  assert.equal(await h.handle(event("checkout.session.async_payment_failed", session(failed, { payment_status: "unpaid" }))), "processed");
  assert.equal((await purchaseRow(failed.purchaseId)).status, "failed");
  const granted = await purchase(mira);
  await h.handle(paid(granted));
  assert.equal(await h.handle(event("checkout.session.expired", session(granted))), "ignored");
  assert.equal((await purchaseRow(granted.purchaseId)).status, "granted");
});

test("subscription and invoice events go to subscriptions.ts, each once; any other type is kept and left", { skip: NO_DB }, async () => {
  const h = harness();
  const created = event("customer.subscription.created", { id: next("sub"), object: "subscription" });
  const invoice = event("invoice.paid", { id: next("in"), object: "invoice" });
  assert.equal(await h.handle(created), "processed");
  assert.equal(await h.handle(invoice), "processed");
  assert.equal(await h.handle(invoice), "duplicate");
  assert.deepEqual(h.subscriptionEvents, [created.id, invoice.id]);

  const other = event("payment_intent.created", { id: next("pi"), object: "payment_intent" });
  assert.equal(await h.handle(other), "ignored");
  assert.equal(await h.handle(other), "duplicate");
  const [kept] = await q<{ processed_at: Date | null }>("select processed_at from stripe_events where id = $1", [other.id]);
  assert.ok(kept.processed_at instanceof Date);
});

test("an event that fails part way runs again when Stripe sends it again", { skip: NO_DB }, async () => {
  let tries = 0;
  const deps: Partial<FulfilmentDeps> = {
    log: recorder().log,
    applySubscriptionEvent: async () => {
      tries += 1;
      if (tries === 1) throw new Error("the database went away");
    },
  };
  const updated = event("customer.subscription.updated", { id: next("sub"), object: "subscription" });
  await assert.rejects(handleStripeEvent(updated, deps), /went away/);
  const [unfinished] = await q<{ processed_at: Date | null }>("select processed_at from stripe_events where id = $1", [updated.id]);
  assert.equal(unfinished.processed_at, null);
  assert.equal(await handleStripeEvent(updated, deps), "processed");
  assert.equal(await handleStripeEvent(updated, deps), "duplicate");
  assert.equal(tries, 2);
});

test("no payload, email or name in any line the ledger logs", { skip: NO_DB }, async () => {
  const h = harness();
  const mira = await buyer("mira-logs");
  const bought = await purchase(mira, { tickHash: "" });
  await h.handle(paid(bought));
  const granted = await purchase(mira);
  await h.handle(paid(granted));
  await h.handle(refund({ purchaseId: "none", sessionId: "none", paymentIntent: next("pi") }, 7200));
  await handleStripeEvent(paid(await purchase(mira)), { ...h.deps, sendReceipt: async () => false });

  const text = h.logs.text();
  assert.ok(h.logs.calls.length >= 3, "the lines this test means to read were logged");
  for (const leak of ["example.com", "Mira", "Costa", bought.sessionId, bought.paymentIntent, granted.sessionId, "customer_details", "data"]) {
    assert.equal(text.includes(leak), false, leak);
  }
  for (const [, fields] of h.logs.calls) assert.deepEqual(Object.keys(fields as object).sort(), ["event", "type"]);
});
