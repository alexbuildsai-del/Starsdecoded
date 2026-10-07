/**
 * Timeline written at setup (ADR-302, 362; readings 8, 9, 11) with the model stubbed. A setup's plan from the engine's
 * own lists runs with no database. On a scratch Postgres named by WALK_DATABASE_URL: a test webhook turning access on
 * queues the setup once and a replay or the QA pair's queues nothing, a payment before the report starts it when the
 * report finishes, the three routes as the contract pins them, a paused day's writes wait for the next, a card opened
 * once setup is ready writes nothing, one setup per account, the next six months' job, and forgetting. Without one
 * those skip, saying why.
 *
 * The queue is one table every test file on the database shares, and a drain takes any due job of its kinds, so this
 * file keeps its jobs, and its testers, whose QA marks other files read, in a schema of its own, dropped after.
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express, { type RequestHandler } from "express";
import type Stripe from "stripe";

const SCRATCH = process.env.WALK_DATABASE_URL;
const SCHEMA = `setup_test_${randomUUID().slice(0, 8)}`;

function inSchema(url: string): string {
  const at = new URL(url);
  at.searchParams.set("options", `-c search_path=${SCHEMA},public`);
  return at.toString();
}

// Only a database handed over for this: without one the pool points at a closed port, so a read there fails at once.
process.env.DATABASE_URL = SCRATCH ? inSchema(SCRATCH) : "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";
process.env.DAILY_SPEND_CAP_USD = "1000";
// Access is the subscription's here, and a paused day's notice stops before Clerk or Resend for want of a key.
delete process.env.ADMIN_USER_ID;
delete process.env.CLERK_SECRET_KEY;
delete process.env.RESEND_API_KEY;

const D = await import("@workspace/db");
const { and, asc, eq } = await import("drizzle-orm");
const { PLAN_TICK } = await import("@workspace/commerce");
const { installFakeModel } = await import("./testModel.js");
const { setSpendSink } = await import("./spendLedger.js");
const { logger } = await import("./logger.js");
const { chartForProfile } = await import("./profiles.js");
const { TIMELINE_PAUSED_LINE } = await import("./spendCap.js");
const { QA_PAIR } = await import("./qaPair.js");
const J = await import("./jobs.js");
const T = await import("./timeline.js");
const R = await import("./timelineReadings.js");
const S = await import("./timelineSetup.js");
const SUB = await import("./subscriptions.js");
const E = await import("@workspace/engine");
const Z = await import("@workspace/api-zod");
const { default: router } = await import("../routes/index.js");

type ReaderChart = import("./timeline.js").ReaderChart;

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: setup queues its readings on a scratch Postgres";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MIRA_BIRTH = JSON.parse(readFileSync(join(ROOT, "fixtures", "sample-people", "mira.json"), "utf8"));
const BIRTH = {
  birthDate: MIRA_BIRTH.birthDate as string,
  birthTime: MIRA_BIRTH.birthTime as string,
  birthTimeWindowMinutes: 0,
  latitude: MIRA_BIRTH.latitude as number,
  longitude: MIRA_BIRTH.longitude as number,
  timezoneOffset: MIRA_BIRTH.timezoneOffset as number,
  timezone: MIRA_BIRTH.timezone as string,
};
const ZONE = BIRTH.timezone;

/** Mira's own chart as Timeline reads it, computed here from her committed fixture (reading 2). */
function fixtureReader(): ReaderChart {
  const profile = { id: "PMIRA", userId: "user_mira", sessionId: "s-mira", claimedByUserId: null, isSelf: true, claimedAsSelf: false, ...BIRTH, chartData: null };
  const report = { id: "RMIRA", status: "complete", sessionId: "s-mira", createdAt: new Date("2026-09-01T09:00:00Z") };
  return T.readerOf("user_mira", { report, profile }, chartForProfile(profile));
}

/** Fits any event: no date, degree, life event or order, so a write lands at its first try. */
const CLEAN = {
  line: "You think harder about what you take on and why.",
  body: "Astrology reads this stretch as a time when the sky presses on a part of your chart you already know well. Your report describes how you work through things in depth before you commit. This time meets that habit. You may find that old plans feel heavier to carry. You may also find that the plans you still believe in feel clearer. Some days the pressure feels like a weight. Other days it feels like a firm hand on your back. People around you may see you as more serious than usual. You may feel the gap between how calm you look and how you feel inside.",
};
const fake = installFakeModel({ timeline_reading: CLEAN });
setSpendSink(async () => {});
const readingCalls = () => fake.calls.filter((name) => name === "timeline_reading").length;

/** A Personal report's text as a reading reads it: a card for each house. */
const REPORT_TEXT = {
  houses: {
    houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, reading: `Card ${i + 1}. You set the tone in this part of your life before you speak.` })),
  },
};

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const byDay = (a: string, b: string) => a.slice(-8).localeCompare(b.slice(-8)) || a.localeCompare(b);
const today = () => T.dayIn(new Date(), ZONE);

test("a setup's plan: this week from its Monday, the month's 30 days and the six months' 182, each the events of its days that read, soonest first, then every life cycle to 90", () => {
  assert.deepEqual(["2026-10-05", "2026-10-07", "2026-10-11", "2027-01-01"].map(S.mondayOf), ["2026-10-05", "2026-10-05", "2026-10-05", "2026-12-28"]);
  const mira = fixtureReader();
  const from = S.mondayOf(today());
  const plan = S.planOf(mira, ZONE, from);
  assert.deepEqual([plan.from, plan.to], [from, addDays(from, 181)], "six months, the view's own 182 days");
  for (const [step, days] of [["week", 7], ["month", 30], ["months", 182]] as const) {
    const start = T.dayStart(from, ZONE);
    const end = new Date(T.dayStart(addDays(from, days), ZONE).getTime() - 1);
    const reads = E.skyEvents(mira.chart, start, end).filter(E.readsAs).map((event) => event.key);
    assert.deepEqual([...plan[step]].sort(), [...new Set(reads)].sort(), `${step}: the events of its days that read`);
    assert.deepEqual(plan[step], [...plan[step]].sort(byDay), `${step}: soonest first`);
  }
  const cycles = E.lifeCycles(E.natalLongitudes(mira.chart), mira.birth);
  assert.deepEqual(plan.cycles, cycles.map((cycle) => cycle.key));
  assert.ok(cycles.length > 0 && cycles.every((cycle) => cycle.age <= 90), "birth to 90");

  const order = S.writeOrder(plan);
  const monthNew = plan.month.filter((key) => !plan.week.includes(key));
  const monthsNew = plan.months.filter((key) => !plan.month.includes(key) && !plan.week.includes(key));
  assert.deepEqual(order, [...plan.week, ...monthNew, ...monthsNew, ...plan.cycles], "this week's first, then the month's, the rest, then the cycles");
  assert.equal(new Set(order).size, order.length, "each reading once");
  assert.deepEqual(S.SETUP_STEPS, ["chart", "planets", "week", "month", "months", "cycles"]);
});

const run = randomUUID().slice(0, 8);
const seeded = { users: [] as string[], profiles: [] as string[] };
const TICK_HASH = createHash("sha256").update(PLAN_TICK, "utf8").digest("hex");

before(async () => {
  if (!SCRATCH) return;
  await D.pool.query(`CREATE SCHEMA ${SCHEMA}`);
  await D.pool.query(`CREATE TABLE ${SCHEMA}.jobs (LIKE public.jobs INCLUDING ALL)`);
  await D.pool.query(`CREATE TABLE ${SCHEMA}.testers (LIKE public.testers INCLUDING ALL)`);
});

interface Seeded {
  tag: string;
  userId: string;
  profileId: string;
  reportId: string;
  customer: string;
}

/** An account with its Stripe Customer and its own chart, and, unless told otherwise, its finished Personal report. */
async function seedAccount(tag: string, options: { report?: boolean; subscribed?: boolean } = {}): Promise<Seeded> {
  const ids: Seeded = {
    tag,
    userId: `user_r1818_${run}_${tag}`,
    profileId: `r1818-${run}-${tag}-p`,
    reportId: `r1818-${run}-${tag}-r`,
    customer: `cus_r1818_${run}_${tag}`,
  };
  await D.db.insert(D.usersTable).values({ id: ids.userId, email: `r1818-${run}-${tag}@example.com`, stripeCustomerId: ids.customer });
  seeded.users.push(ids.userId);
  await seedChart(ids);
  if (options.report !== false) await finishReport(ids);
  if (options.subscribed) await subscribe(ids, "active");
  return ids;
}

async function seedChart(ids: Seeded): Promise<void> {
  const chartData = chartForProfile(BIRTH) as unknown as object;
  await D.db.insert(D.profilesTable).values({
    id: ids.profileId, userId: ids.userId, sessionId: `s-r1818-${run}-${ids.tag}`, name: "Mira Costa", birthPlace: "Lisbon, Portugal", ...BIRTH, chartData, isSelf: true,
  });
  seeded.profiles.push(ids.profileId);
}

async function finishReport(ids: Seeded): Promise<void> {
  await D.db.insert(D.reportsTable).values({
    id: ids.reportId, profileId: ids.profileId, sessionId: `s-r1818-${run}-${ids.tag}`, type: "natal", status: "complete", interpretation: REPORT_TEXT,
  });
}

async function subscribe(ids: Seeded, status: string): Promise<void> {
  const id = `sub_r1818_${run}_${ids.tag}`;
  const row = { userId: ids.userId, customerId: ids.customer, item: "timeline_month", status, currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000), isTest: true };
  await D.db.insert(D.subscriptionsTable).values({ id, ...row }).onConflictDoUpdate({ target: D.subscriptionsTable.id, set: { status } });
}

async function readerOf(ids: Seeded): Promise<ReaderChart> {
  const reader = await T.readerChart({ userId: ids.userId, sessionId: "" });
  assert.ok(reader, `${ids.tag} reads their own chart`);
  return reader;
}

async function jobsOf(ids: Seeded) {
  const rows = await D.db.select().from(D.jobsTable).orderBy(asc(D.jobsTable.runAt), asc(D.jobsTable.createdAt));
  return {
    reading: rows.filter((job) => job.kind === "timeline.reading" && job.payload.profileId === ids.profileId),
    ahead: rows.filter((job) => job.kind === "timeline.ahead" && job.payload.userId === ids.userId),
  };
}

/** Every job a test before left here, so a drain runs only the jobs of the test that drains. */
async function clearJobs(): Promise<void> {
  await D.db.delete(D.jobsTable);
}

async function setupOf(ids: Seeded) {
  const [row] = await D.db.select().from(D.timelineSetupsTable).where(eq(D.timelineSetupsTable.userId, ids.userId));
  return row ?? null;
}

async function rowsOf(ids: Seeded) {
  return D.db.select().from(D.timelineReadingsTable).where(eq(D.timelineReadingsTable.profileId, ids.profileId));
}

/** The purchase POST /checkout makes for the monthly plan before the browser pays (purchases.ts). */
async function checkout(ids: Seeded): Promise<string> {
  const id = randomUUID();
  await D.db.insert(D.purchasesTable).values({
    id, userId: ids.userId, kind: "plan", item: "timeline_month", cents: 999, fullCents: 999, stripeSessionId: `cs_test_r1818_${id}`,
    tickHash: TICK_HASH, tickedAt: new Date(), returnTo: "/timeline", status: "open", isTest: true,
  });
  return id;
}

/** The first paid invoice of the plan the checkout made, as the basil API shapes it: the payment that turns access on. */
function firstPayment(ids: Seeded, purchaseId: string): Stripe.Event {
  const sub = `sub_r1818_${run}_${ids.tag}`;
  const end = Math.floor(Date.now() / 1000) + 30 * 86_400;
  const invoice = {
    id: `in_r1818_${run}_${ids.tag}`, object: "invoice", customer: ids.customer, customer_email: null, billing_reason: "subscription_create",
    amount_paid: 999, livemode: false, status: "paid",
    parent: { type: "subscription_details", quote_details: null, subscription_details: { subscription: sub, metadata: { purchase_id: purchaseId } } },
    lines: {
      object: "list", has_more: false, url: "/v1/invoices/lines",
      data: [{
        id: `il_${sub}`, object: "line_item", period: { start: end - 30 * 86_400, end },
        parent: { type: "subscription_item_details", invoice_item_details: null, subscription_item_details: { subscription: sub, subscription_item: `si_${sub}`, invoice_item: null, proration: false, proration_details: null } },
        pricing: { type: "price_details", unit_amount_decimal: null, price_details: { price: "price_x", product: "timeline" } },
      }],
    },
    payments: {
      object: "list", has_more: false, url: "/v1/invoice_payments",
      data: [{ id: `inpay_${sub}`, object: "invoice_payment", status: "paid", payment: { type: "payment_intent", payment_intent: `pi_r1818_${run}_${ids.tag}` } }],
    },
  };
  return {
    id: `evt_r1818_${run}_${ids.tag}`, object: "event", type: "invoice.paid", livemode: false, created: Math.floor(Date.now() / 1000),
    api_version: "2026-08-26.dahlia", pending_webhooks: 1, request: null, data: { object: invoice },
  } as unknown as Stripe.Event;
}

const WEBHOOK = { client: null, sendReceipt: async () => true };

/** Where the session and sign-in middleware stand in app.ts. */
const viewer: RequestHandler = (req, _res, next) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = req.header("x-session") || `s-r1818-${run}`;
  req.log = logger;
  next();
};

const app = express();
app.use(express.json());
app.use(viewer);
app.use("/api", router);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.on("listening", () => resolve()));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

async function call(method: string, path: string, who: string | null, body?: unknown): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (who) headers["x-user"] = who;
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const open = (who: string, key: string) => call("POST", `/timeline/readings/${encodeURIComponent(key)}`, who, {});

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  fake.restore();
  if (SCRATCH) {
    const { inArray } = await import("drizzle-orm");
    if (seeded.profiles.length) {
      await D.db.delete(D.timelineReadingsTable).where(inArray(D.timelineReadingsTable.profileId, seeded.profiles));
      await D.db.delete(D.reportsTable).where(inArray(D.reportsTable.profileId, seeded.profiles));
      await D.db.delete(D.profilesTable).where(inArray(D.profilesTable.id, seeded.profiles));
    }
    if (seeded.users.length) {
      await D.db.delete(D.timelineSetupsTable).where(inArray(D.timelineSetupsTable.userId, seeded.users));
      await D.db.delete(D.subscriptionsTable).where(inArray(D.subscriptionsTable.userId, seeded.users));
      await D.db.delete(D.purchasesTable).where(inArray(D.purchasesTable.userId, seeded.users));
      await D.db.delete(D.usersTable).where(inArray(D.usersTable.id, seeded.users));
    }
    await D.pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  }
  await D.pool.end();
});

test("db, a test webhook turning access on queues the setup once; a replayed event queues nothing, and neither does the QA pair's", { skip: NO_DB }, async () => {
  const payer = await seedAccount("payer");
  const paid = firstPayment(payer, await checkout(payer));
  assert.equal(await SUB.applySubscriptionEvent(paid, WEBHOOK), "processed");
  const plan = S.planOf(await readerOf(payer), ZONE, S.mondayOf(today()));
  const queued = await jobsOf(payer);
  assert.deepEqual(queued.reading.map((job) => job.payload.key), S.writeOrder(plan), "the engine's list, in its order");
  assert.ok(queued.reading.every((job) => job.dedupeKey === R.readingJobKey(payer.profileId, String(job.payload.key))));
  assert.equal(queued.ahead.length, 1, "one next-six-months job");
  assert.equal(queued.ahead[0].runAt.getTime(), T.dayStart(addDays(plan.to, -S.AHEAD_DAYS), ZONE).getTime(), "a week before the six months end");
  const row = await setupOf(payer);
  assert.deepEqual([row?.state, row?.fromDay, row?.toDay, row?.reportId], ["writing", plan.from, plan.to, payer.reportId]);

  assert.equal(await SUB.applySubscriptionEvent(paid, WEBHOOK), "processed");
  const again = await jobsOf(payer);
  assert.deepEqual([again.reading.length, again.ahead.length], [queued.reading.length, 1], "a replay queues nothing");
  assert.deepEqual((await setupOf(payer))?.startedAt, row?.startedAt);

  const marked = await seedAccount("qa-marked");
  await D.db.insert(D.testersTable).values({ userId: marked.userId, email: `r1818-${run}-qa@example.com`, qa: "mira", addedBy: "test" });
  const named = await seedAccount("qa-named");
  await D.db.insert(D.testersTable).values({ userId: named.userId, email: QA_PAIR.idris.email.toUpperCase(), qa: null, addedBy: "test" });
  for (const qa of [marked, named]) {
    assert.equal(await SUB.applySubscriptionEvent(firstPayment(qa, await checkout(qa)), WEBHOOK), "processed");
    const none = await jobsOf(qa);
    assert.deepEqual([none.reading.length, none.ahead.length, await setupOf(qa)], [0, 0, null], `${qa.tag}: the QA pair's deploy spends nothing`);
  }
});

test("db, a payment before the Personal report queues nothing; setup starts when that report finishes", { skip: NO_DB }, async () => {
  const early = await seedAccount("early", { report: false });
  assert.equal(await SUB.applySubscriptionEvent(firstPayment(early, await checkout(early)), WEBHOOK), "processed");
  assert.deepEqual([(await jobsOf(early)).reading.length, await setupOf(early)], [0, null]);
  await subscribe(early, "active");
  await finishReport(early);
  await S.setupAfterReport(early.reportId);
  const plan = S.planOf(await readerOf(early), ZONE, S.mondayOf(today()));
  assert.deepEqual((await jobsOf(early)).reading.map((job) => job.payload.key), S.writeOrder(plan));
  assert.equal((await setupOf(early))?.state, "writing");
  await S.setupAfterReport(early.reportId);
  assert.equal((await jobsOf(early)).reading.length, S.writeOrder(plan).length, "a second finish queues nothing");

  const unpaid = await seedAccount("unpaid");
  await S.setupAfterReport(unpaid.reportId);
  assert.deepEqual([(await jobsOf(unpaid)).reading.length, await setupOf(unpaid)], [0, null], "no plan, no setup");
  await S.setupAfterReport("no-such-report");
});

test("db, the three routes as pinned: 401, 403 and 409 as Now and ahead refuses; a start queues the engine's list once; GET answers six steps with counts; ready, a card writes nothing", { skip: NO_DB }, async () => {
  await clearJobs();
  const outsider = await seedAccount("outsider");
  const reportless = await seedAccount("reportless", { report: false, subscribed: true });
  const reader = await seedAccount("routes", { subscribed: true });
  const routes = [["GET", "/timeline/setup"], ["POST", "/timeline/setup"], ["POST", "/timeline/setup/replay-seen"]] as const;
  for (const [method, path] of routes) {
    assert.deepEqual(await call(method, path, null), { status: 401, body: { error: "sign_in_required", message: "Sign in to use Timeline." } }, `${method} ${path}`);
    const refused = await call(method, path, outsider.userId);
    assert.deepEqual([refused.status, refused.body.error], [403, "no_timeline"], `${method} ${path}`);
    const noReport = await call(method, path, reportless.userId);
    assert.deepEqual([noReport.status, noReport.body.error], [409, "no_personal_report"], `${method} ${path}`);
  }

  const none = await call("GET", `/timeline/setup?tz=${ZONE}`, reader.userId);
  assert.equal(none.status, 200);
  assert.deepEqual(Z.GetTimelineSetupResponse.parse(none.body), {
    state: "none", from: null, to: null, replay: null, steps: S.SETUP_STEPS.map((id) => ({ id, done: false, count: null })),
  });

  const before = readingCalls();
  const six = await call("GET", `/timeline/now?range=six-months&tz=${ZONE}`, reader.userId);
  assert.equal(six.status, 200);
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.deepEqual([(await jobsOf(reader)).reading.length, (await rowsOf(reader)).length, readingCalls() - before], [0, 0, 0], "GET /timeline/now queues nothing");

  // Keys in the body or the query are no part of the contract: every key queued is the engine's.
  const browserKey = "contact.mars.square.sun.20261024";
  const started = await call("POST", `/timeline/setup?tz=${ZONE}&key=${browserKey}`, reader.userId, { keys: [browserKey] });
  assert.equal(started.status, 202);
  const plan = S.planOf(await readerOf(reader), ZONE, S.mondayOf(today()));
  const counts = { week: plan.week.length, month: plan.month.length, months: plan.months.length, cycles: plan.cycles.length };
  const writing = Z.StartTimelineSetupResponse.parse(started.body);
  assert.deepEqual([writing.state, writing.from, writing.to, writing.replay], ["writing", plan.from, plan.to, null]);
  assert.deepEqual(writing.steps.map((step) => [step.id, step.count]), [["chart", null], ["planets", null], ...Object.entries(counts)]);
  assert.deepEqual(writing.steps.slice(0, 2).map((step) => step.done), [true, true], "the chart and the planets tick at once");
  const queued = await jobsOf(reader);
  assert.deepEqual(queued.reading.map((job) => job.payload.key), S.writeOrder(plan));
  assert.equal(queued.ahead.length, 1);

  const twice = await call("POST", `/timeline/setup?tz=${ZONE}`, reader.userId);
  assert.deepEqual([twice.status, twice.body], [202, started.body], "a start is idempotent");
  assert.equal((await jobsOf(reader)).reading.length, queued.reading.length);

  // A paused day: the open meets Timeline's line, and every job waits for the next UTC day with its attempt kept.
  const first = S.writeOrder(plan)[0];
  process.env.DAILY_SPEND_CAP_USD = "0";
  try {
    assert.deepEqual(await open(reader.userId, first), { status: 503, body: { error: "paused", reason: "paused", message: TIMELINE_PAUSED_LINE } });
    assert.equal(await J.drainJobs(), queued.reading.length);
  } finally {
    process.env.DAILY_SPEND_CAP_USD = "1000";
  }
  const waiting = (await jobsOf(reader)).reading;
  assert.ok(waiting.every((job) => job.status === "queued" && job.attempts === 0 && job.runAt.getTime() >= J.nextUtcMidnight().getTime()));
  assert.deepEqual([(await rowsOf(reader)).length, readingCalls() - before], [0, 0]);

  // The next day: an open of a reading a job still holds answers writing at once and writes nothing (reading 11).
  await D.db.update(D.jobsTable).set({ runAt: new Date() }).where(eq(D.jobsTable.kind, "timeline.reading"));
  const opening = performance.now();
  assert.deepEqual(await open(reader.userId, first), { status: 200, body: { status: "writing", reading: null, line: null } });
  assert.ok(performance.now() - opening < R.OPEN_WAIT_MS / 4, "it waits for nothing");
  assert.equal(readingCalls() - before, 0);

  assert.equal(await J.drainJobs(), queued.reading.length);
  const rows = await rowsOf(reader);
  assert.deepEqual([rows.length, rows.every((row) => row.status === "ready")], [queued.reading.length, true]);
  assert.equal(readingCalls() - before, queued.reading.length, "each reading written once");
  const ready = Z.GetTimelineSetupResponse.parse((await call("GET", `/timeline/setup?tz=${ZONE}`, reader.userId)).body);
  assert.deepEqual([ready.state, ready.steps.every((step) => step.done), ready.replay], ["ready", true, null]);
  assert.deepEqual(ready.steps.slice(2).map((step) => step.count), Object.values(counts));
  assert.equal((await setupOf(reader))?.state, "ready");

  for (const key of [first, plan.cycles[0]]) {
    const card = performance.now();
    const opened = await open(reader.userId, key);
    assert.deepEqual([opened.status, opened.body.status, opened.body.reading?.line], [200, "ready", CLEAN.line], key);
    assert.ok(performance.now() - card < R.OPEN_WAIT_MS / 4);
  }
  assert.equal(readingCalls() - before, queued.reading.length, "a card opened after ready writes nothing");

  assert.equal((await call("POST", "/timeline/setup/replay-seen", reader.userId)).status, 204, "nothing to mark is no refusal");
  assert.equal((await setupOf(reader))?.replaySeenAt, null);
});

test("db, one setup per account: two starts at once queue each reading once and keep one row", { skip: NO_DB }, async () => {
  const both = await seedAccount("both", { subscribed: true });
  const reader = await readerOf(both);
  const [a, b] = await Promise.all([S.startSetup(reader, ZONE), S.startSetup(reader, ZONE)]);
  assert.deepEqual([a.state, b.state], ["writing", "writing"]);
  const plan = S.planOf(reader, ZONE, S.mondayOf(today()));
  const queued = await jobsOf(both);
  assert.deepEqual([queued.reading.length, queued.ahead.length], [S.writeOrder(plan).length, 1]);
  assert.equal(new Set(queued.reading.map((job) => job.dedupeKey)).size, queued.reading.length);
  const rows = await D.db.select().from(D.timelineSetupsTable).where(eq(D.timelineSetupsTable.userId, both.userId));
  assert.equal(rows.length, 1);
});

test("db, a setup made for a chart the reader no longer reads stands for nothing: GET reads none, and a start begins afresh on the chart they read now", { skip: NO_DB }, async () => {
  await clearJobs();
  const moved = await seedAccount("moved", { subscribed: true });
  await S.startSetup(await readerOf(moved), ZONE);
  // Their chart replaced with nothing forgotten, as a reset that keeps the setups leaves it.
  await D.db.delete(D.reportsTable).where(eq(D.reportsTable.id, moved.reportId));
  await D.db.delete(D.profilesTable).where(eq(D.profilesTable.id, moved.profileId));
  const fresh: Seeded = { ...moved, profileId: `${moved.profileId}-2`, reportId: `${moved.reportId}-2` };
  await seedChart(fresh);
  await finishReport(fresh);
  const reader = await readerOf(fresh);
  assert.equal(reader.profileId, fresh.profileId);

  const read = Z.GetTimelineSetupResponse.parse((await call("GET", `/timeline/setup?tz=${ZONE}`, moved.userId)).body);
  assert.equal(read.state, "none", "never ready on readings no job will write");
  const restarted = await call("POST", `/timeline/setup?tz=${ZONE}`, moved.userId);
  assert.deepEqual([restarted.status, restarted.body.state], [202, "writing"]);
  const plan = S.planOf(reader, ZONE, S.mondayOf(today()));
  assert.deepEqual((await jobsOf(fresh)).reading.map((job) => job.payload.key), S.writeOrder(plan));
  assert.equal((await setupOf(moved))?.reportId, fresh.reportId);
});

test("db, the next six months: written a week before the last end, the setup moved on and its drawing set once; without Timeline nothing is written", { skip: NO_DB }, async () => {
  await clearJobs();
  const ahead = await seedAccount("ahead", { subscribed: true });
  const reader = await readerOf(ahead);
  await S.startSetup(reader, ZONE);
  await J.drainJobs();
  assert.equal((await setupOf(ahead))?.state, "writing");
  assert.equal((await S.setupState(reader, ZONE)).state, "ready");

  // Its six months end in three days, so the next six are due.
  const end = addDays(today(), 3);
  await D.db.update(D.timelineSetupsTable).set({ fromDay: addDays(end, -181), toDay: end }).where(eq(D.timelineSetupsTable.userId, ahead.userId));
  await D.db.update(D.jobsTable).set({ runAt: new Date() }).where(eq(D.jobsTable.kind, "timeline.ahead"));
  const before = readingCalls();
  await J.drainJobs();
  const from = addDays(end, 1);
  const next = S.planOf(reader, ZONE, from);
  const moved = await setupOf(ahead);
  assert.deepEqual(
    [moved?.fromDay, moved?.toDay, moved?.replayFrom, moved?.replayTo, moved?.replaySeenAt],
    [from, next.to, from, next.to, null],
  );
  const written = new Map((await rowsOf(ahead)).map((row) => [row.eventKey, row.status]));
  assert.ok(next.months.length > 0 && next.months.every((key) => written.get(key) === "ready"), "the next stretch is written");
  assert.ok(readingCalls() - before <= next.months.length, "only what was not written already");
  const [armed] = (await jobsOf(ahead)).ahead.filter((job) => job.status === "queued");
  assert.equal(armed.runAt.getTime(), T.dayStart(addDays(next.to, -S.AHEAD_DAYS), ZONE).getTime(), "then it waits for the week before those end");

  assert.equal(Z.GetTimelineSetupResponse.parse((await call("GET", `/timeline/setup?tz=${ZONE}`, ahead.userId)).body).replay, null, "not before its first day");
  await D.db.update(D.timelineSetupsTable).set({ replayFrom: today() }).where(eq(D.timelineSetupsTable.userId, ahead.userId));
  const shown = Z.GetTimelineSetupResponse.parse((await call("GET", `/timeline/setup?tz=${ZONE}`, ahead.userId)).body);
  assert.deepEqual(shown.replay, { from: today(), to: next.to });
  assert.equal((await call("POST", "/timeline/setup/replay-seen", ahead.userId)).status, 204);
  assert.equal(Z.GetTimelineSetupResponse.parse((await call("GET", `/timeline/setup?tz=${ZONE}`, ahead.userId)).body).replay, null, "drawn once");

  const ctx = { attempt: 1, signal: new AbortController().signal };
  const rerun = await S.aheadJob({ userId: ahead.userId }, ctx);
  assert.deepEqual(rerun, { retryAt: T.dayStart(addDays(next.to, -S.AHEAD_DAYS), ZONE) }, "run again early, it only waits");
  assert.notEqual((await setupOf(ahead))?.replaySeenAt, null, "and sets nothing to draw again");

  await subscribe(ahead, "canceled");
  await D.db.update(D.timelineSetupsTable).set({ toDay: end }).where(eq(D.timelineSetupsTable.userId, ahead.userId));
  const jobsBefore = (await jobsOf(ahead)).reading.length;
  assert.equal(await S.aheadJob({ userId: ahead.userId }, ctx), undefined);
  assert.deepEqual([(await jobsOf(ahead)).reading.length, (await setupOf(ahead))?.toDay], [jobsBefore, end], "without Timeline it writes nothing");
});

test("db, forgetting the reader's Timeline takes their setup and the jobs still waiting to write for them, and nobody else's", { skip: NO_DB }, async () => {
  const gone = await seedAccount("gone", { subscribed: true });
  const kept = await seedAccount("kept", { subscribed: true });
  for (const ids of [gone, kept]) await S.startSetup(await readerOf(ids), ZONE);
  await R.forgetTimeline(gone.userId, gone.profileId);
  const left = await jobsOf(gone);
  assert.deepEqual([left.reading.length, left.ahead.length, await setupOf(gone)], [0, 0, null]);
  const other = await jobsOf(kept);
  assert.ok(other.reading.length > 0 && other.ahead.length === 1 && (await setupOf(kept)) !== null);
  const stray = await D.db.select().from(D.jobsTable).where(and(eq(D.jobsTable.kind, "timeline.reading"), eq(D.jobsTable.status, "queued")));
  assert.ok(stray.every((job) => job.payload.profileId !== gone.profileId));
});
