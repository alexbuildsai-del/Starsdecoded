// The buyer walk (ADR-273): the Owner's critical flow, the shared step list (steps.ts) in its order, end to end on a
// scratch Postgres with four accounts. Mira pays for Family & friends at checkout, writes her Personal report and
// gifts one to her parent Idris, who has no credit to write with until he claims it; both say Not now to the gift's
// share questions, so the two then share their reports both ways by hand. She gifts one to her friend Hanna too, and
// both say Yes, so each reads the other's once Hanna's is written (ADR-331, 342). Either way Your first steps then
// offers You & them. Mira picks herself and Idris in the picker, which opens the parent and child report on its
// loading screen, and shares it with Idris, who claims it from its link (ADR-285, 336).
// Stripe refunds the Family & friends purchase, so Mira, out of credits, buys a Couple from the birth form, writes her
// partner Tomás's Personal report and a partners report, and sends Tomás both. Last, she starts Timeline yearly: it
// opens and renews a year on; its first payment sets it up, so each reading the engine lists for her chart is written
// once and opening one then writes nothing (ADR-302, 362); and it closes at the end of the period she cancels.
// No Clerk, no network, no OpenAI and no Stripe. A header stands where the sign-in is, mail goes to a local stub, the
// model client is pointed at a local stand-in that answers each call with canned text that passes the checks, and
// Stripe is a local stand-in (testStripe.ts) whose events reach the real webhook signed as Stripe signs them. The job
// queue the API's worker runs in the background runs here in-process (drainJobs). So every payment, grant, report and
// reading goes through the real routes and is written as it is on staging. The people are the site's
// sample people (fixtures/sample-people/, web/src/site/data/people.ts), so the walk and the site share them; their
// charts are computed from those birth data at run time.
//
// `pnpm --filter @workspace/api-server exec tsx src/walk/buyer.walk.ts` runs it against `WALK_DATABASE_URL`; without
// it, it skips. CI runs it after the unit tests. It refuses to start when its steps and the list differ. Its first
// statement truncates every table it touches, so a second run starts where the first did. Each step stands on the
// ones before it, so the first that fails stops the walk.

if (!process.env.WALK_DATABASE_URL) {
  console.log("buyer walk: skipped (no WALK_DATABASE_URL)");
  process.exit(0);
}
process.env.DATABASE_URL = process.env.WALK_DATABASE_URL;
process.env.OPENAI_API_KEY ||= "sk-dummy-walk-never-sent";
// A first name or an address with nothing behind it here is asked of Clerk (names.ts, invites.ts); without a key, Clerk
// refuses before it sends anything, whatever key the shell holds.
delete process.env.CLERK_SECRET_KEY;
// No one in the walk may be the admin, whoever the shell names: Timeline opens for Mira through her plan alone.
delete process.env.ADMIN_USER_ID;
// Staging, where the Owner walks this flow: production never talks to a stand-in for Stripe (stripe.ts).
process.env.APP_ENV = "staging";
// The breaker at its default, far above the cents the stand-in's usage is priced at, whatever cap the shell sets.
delete process.env.DAILY_SPEND_CAP_USD;
// Only errors reach the log, so what the walk prints is its steps.
process.env.LOG_LEVEL ??= "error";

import assert from "node:assert/strict";
import http from "node:http";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import express, { type NextFunction, type Request, type Response } from "express";
import { BUNDLES, CHECKOUT_TICK, PLAN_TICK, PLANS, bundleById, formatEuro, renewalLine, type CatalogueItemId } from "@workspace/commerce";
import { lifeCycles, natalLongitudes, readsAs, skyEvents } from "@workspace/engine";
import { STEPS, STEP_IDS, mapProblem, type ListedStep, type StepId } from "./steps.js";
import { startTestStripe, type Json, type StripeEvent } from "./testStripe.js";

type Viewer = { user: string | null; session: string };
type Mail = { to: string; subject: string; text: string; html: string };
type Chart = import("../lib/chartCalculation.js").NatalChartData;
type ReportInterpretation = import("../lib/aiInterpretation.js").ReportInterpretation;
type SamplePerson = {
  name: string; birthDate: string; birthTime: string; latitude: number; longitude: number; timezoneOffset: number; timezone: string;
};

const PEOPLE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "sample-people");
const samplePerson = (id: string): SamplePerson => JSON.parse(readFileSync(join(PEOPLE, `${id}.json`), "utf8"));

async function listening(server: http.Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  return (server.address() as AddressInfo).port;
}

// A stand-in for Resend: every link in this walk comes from a captured email.
const mails: Mail[] = [];
const mailStub = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const m = JSON.parse(body);
    mails.push({ to: Array.isArray(m.to) ? m.to[0] : m.to, subject: m.subject, text: m.text, html: m.html ?? "" });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ id: `stub-${mails.length}` }));
  });
});
process.env.RESEND_API_KEY = "re_stub_walk";
process.env.RESEND_BASE_URL = `http://127.0.0.1:${await listening(mailStub)}`;

// The model client is pointed here whatever key the shell holds. Each call names its schema, and the stand-in answers
// with the canned text the step set for it, so a report is written as on staging. A call it has no text for is refused
// and kept, so nothing leaves the machine and the step that waits on the report names the call.
let replies: Record<string, unknown> = {};
const modelCalls: string[] = [];
const unanswered: string[] = [];
// A step can hold the stand-in's answers to read a report while it is still being written, as its loading screen does.
// The hold lets go by itself after a while, so a call made before the step's own answer can only fail the step, never
// stall the walk.
let held: Promise<void> | null = null;
function holdModel(): () => void {
  let release!: () => void;
  const hold = new Promise<void>((resolve) => (release = resolve));
  held = hold;
  const letGo = () => {
    clearTimeout(timer);
    if (held === hold) held = null;
    release();
  };
  const timer = setTimeout(letGo, 15_000);
  timer.unref();
  return letGo;
}
function schemaOf(body: string): string {
  try {
    return String(JSON.parse(body)?.response_format?.json_schema?.name ?? "");
  } catch {
    return "";
  }
}
const modelStub = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", async () => {
    const schema = schemaOf(body);
    modelCalls.push(schema);
    if (held) await held;
    const reply = replies[schema];
    if (reply === undefined) {
      unanswered.push(schema || "a call with no schema");
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: `the walk has no text for ${schema || "this call"}`, type: "invalid_request_error" } }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      id: "chatcmpl-walk",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "walk-stand-in",
      choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(reply), refusal: null }, finish_reason: "stop" }],
      usage: { prompt_tokens: 1000, completion_tokens: 300, total_tokens: 1300 },
    }));
  });
});
process.env.OPENAI_BASE_URL = `http://127.0.0.1:${await listening(modelStub)}/v1`;

// Stripe's three keys as Railway holds them, in test mode, whatever the shell holds: the client and the webhook read
// them and every call goes to the stand-in. None opens anything, and the stand-in signs every event it sends with this
// secret, as a webhook destination signs with its own.
const SIGNING_SECRET = "whsec_standin";
process.env.STRIPE_SECRET_KEY = "rk_test_standin";
process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_standin";
process.env.STRIPE_WEBHOOK_SECRET = SIGNING_SECRET;
const testStripe = await startTestStripe();
process.env.STRIPE_API_BASE = testStripe.base;

// Every link in an email starts at the configured web app, and so do the pages Stripe sends a reader back to.
const OUR_PAGE = "https://starsdecoded-staging.vercel.app";
process.env.PUBLIC_APP_URL = OUR_PAGE;

// Deferred past the env writes above: @workspace/db throws at import unless DATABASE_URL is set, and the mailer, the
// logger and the model client read theirs when they are made.
const { pool } = await import("@workspace/db");
const zod = await import("@workspace/api-zod");
const { chartForProfile } = await import("../lib/profiles.js");
const { PROMPT_VERSION } = await import("../lib/aiInterpretation.js");
const { PAIR_PROMPT_VERSION, pairChapterId } = await import("../prompts/pair/index.js");
const { buildPairBrief } = await import("../lib/pairBrief.js");
const { NO_TIMELINE_LINE } = await import("../lib/timelineAccess.js");
const { dayIn, dayStart } = await import("../lib/timeline.js");
const { drainJobs } = await import("../lib/jobs.js");
const { syncProductsOnStart } = await import("../lib/stripeSync.js");
const { logger } = await import("../lib/logger.js");
const { apiHeaders, originGuard, webOrigins } = await import("../middlewares/origin.js");
const { default: stripeWebhookRouter } = await import("../routes/stripeWebhook.js");
const { default: router } = await import("../routes/index.js");
// The canned text is the unit tests' own, which they keep passing the checks as the prompts change. Loading
// testModel.ts also keeps the checks' log in memory, so the walk writes no generation_failures row.
const { cannedNatalReplies } = await import("../lib/testModel.js");
const { pairReplies } = await import("../lib/testPair.js");

const q = (sql: string, params: unknown[] = []) => pool.query(sql, params);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// app.ts's order, with a stub where the cookie and Clerk middleware stand, as loop.walk.ts mounts it. The webhook is
// mounted ahead of the origin guard and the parsers, as there (reading 13): Stripe signs the bytes it sends.
const app = express();
app.use(apiHeaders());
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.log = logger;
  next();
});
app.use("/api", stripeWebhookRouter);
app.use(originGuard(webOrigins({})));
app.use(express.json({ limit: "32kb" }));
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = req.header("x-session") || "s-none";
  next();
});
app.use("/api", router);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.on("listening", () => resolve()));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
const WEBHOOK = `${base}/stripe/webhook`;

async function call(who: Viewer, method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { "x-session": who.session, "content-type": "application/json" };
  if (who.user) headers["x-user"] = who.user;
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  const json = res.headers.get("content-type")?.includes("application/json");
  return { status: res.status, body: text && json ? JSON.parse(text) : text || null };
}

const EMPTY_HOME = { you: null, several: false, people: [], pairs: [], practising: [], firstSteps: { step: 1, person: null, gift: false, pairReady: false } };
const NO_CREDITS = { available: 0, used: 0, held: 0 };
// No plan, and a finished Personal report of one's own (reading 1): Mira before Timeline and after it, Idris always.
const TIMELINE_CLOSED = { access: false, source: null, hasPersonalReport: true, ask: null };
// What a reading says: no date, degree, life event or order, so it fits each event the setup writes.
const READING = {
  line: "You think harder about what you take on and why.",
  body: "Astrology reads this stretch as a time when the sky presses on a part of your chart you already know well. Your report describes how you work through things in depth before you commit. This time meets that habit. You may find that old plans feel heavier to carry. You may also find that the plans you still believe in feel clearer. Some days the pressure feels like a weight. Other days it feels like a firm hand on your back. People around you may see you as more serious than usual. You may feel the gap between how calm you look and how you feel inside.",
};
// A reading written again after a new prompt version: another line that fits each event.
const REWRITE = { line: "You take stock of what you carry and keep what still fits.", body: READING.body };
// The setup before it starts: six steps, none done, no count.
const STEPS_NOT_STARTED = ["chart", "planets", "week", "month", "months", "cycles"].map((id) => [id, false, null]);
// ADR-275: with no credit, Write is refused before anything is written, with a line of its own.
const NO_CREDIT_TO_WRITE = { error: "no_credit", message: "You need a credit to write this report." };
const RECEIPT_SUBJECT = "Your receipt from Stars Decoded";
const tokenOf = (m: Mail) => decodeURIComponent(/claim\?token=([^\s"&]+)/.exec(m.text)![1]);
const claimPath = (token: string) => `/invites/${encodeURIComponent(token)}/claim`;
const previewPath = (token: string) => `/invites/${encodeURIComponent(token)}`;
const claimUrlOf = (token: string) => `${OUR_PAGE}/claim?token=${encodeURIComponent(token)}`;
const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const creditRow = async (id: string) =>
  (await q("select status, user_id, used_for_report_id from credits where id = $1", [id])).rows[0];
const creditFor = async (reportId: string) =>
  (await q("select status, user_id from credits where used_for_report_id = $1", [reportId])).rows;
const receipts = () => mails.filter((m) => m.subject === RECEIPT_SUBJECT);
const sessionsMade = () => testStripe.calls.filter((c) => c.method === "POST" && c.path === "/v1/checkout/sessions").length;

const BRUSSELS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit" });
/** A plan's day as the contract gives it: the Unix time Stripe sends, read in Brussels (reading 7). */
function brusselsDay(unix: number): string {
  const parts = Object.fromEntries(BRUSSELS.formatToParts(new Date(unix * 1000)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function onOurWeb(m: Mail) {
  const urls = [...`${m.html}\n${m.text}`.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((u) => u[0]);
  assert.ok(urls.length > 0, m.subject);
  for (const url of urls) assert.ok(url.startsWith(`${OUR_PAGE}/`), `${m.subject}: ${url}`);
}

async function readHome(who: Viewer) {
  const r = await call(who, "GET", "/home");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return zod.GetHomeResponse.parse(r.body);
}
async function credits(who: Viewer) {
  const r = await call(who, "GET", "/credits");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const c = zod.GetCreditsResponse.parse(r.body);
  return { available: c.available, used: c.used, held: c.held ?? 0 };
}
async function history(who: Viewer) {
  const r = await call(who, "GET", "/credits/history");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return zod.GetCreditHistoryResponse.parse(r.body).map((h) => [h.kind, h.count, h.label]);
}
async function listReports(who: Viewer) {
  const r = await call(who, "GET", "/reports");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  zod.ListReportsResponse.parse(r.body);
  return new Map<string, any>(r.body.map((x: any) => [x.id, x]));
}
async function readReport(who: Viewer, id: string) {
  const r = await call(who, "GET", `/reports/${id}`);
  assert.equal(r.status, 200, `${who.user} reading ${id}: ${r.status} ${JSON.stringify(r.body)}`);
  zod.GetReportResponse.parse(r.body);
  return r.body;
}
async function gifts(who: Viewer) {
  const r = await call(who, "GET", "/gifts");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return zod.ListGiftsResponse.parse(r.body).map((g) => [g.id, g.recipientName, g.email, g.state, g.creditHeld]);
}
async function shares(who: Viewer) {
  const r = await call(who, "GET", "/shares");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return zod.ListSharesResponse.parse(r.body).map((s) => [s.id, s.email, s.readerName, s.state]);
}
async function preview(who: Viewer, token: string) {
  const r = await call(who, "GET", previewPath(token));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  zod.GetInviteResponse.parse(r.body);
  return r.body;
}
/** A send or a share claims with no answer; a gift with its claimer's answer, Not now a stated false (ClaimPage). */
async function claim(who: Viewer, token: string, answer?: { shareBack: boolean }) {
  const r = await call(who, "POST", claimPath(token), answer);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  zod.ClaimInviteResponse.parse(r.body);
  return r.body;
}
/** What a gift keeps of its two share answers: the giver's Yes, and the claimer's while it waits for their report. */
const answersOf = async (giftId: string) =>
  (await q("select giver_shares, share_back from invite_tokens where id = $1", [giftId])).rows[0];
/** The grants a gift's answers wrote, each the row a Share writes (reading 16). */
const grantsOf = async (giftId: string) =>
  (await q(
    "select id, profile_id, owner_user_id, reader_user_id from profile_shares where invite_id = $1 and revoked_at is null order by created_at",
    [giftId],
  )).rows;

/** Reads until `done` holds, for what the API writes just after it answers. */
async function until<T>(what: string, read: () => Promise<T>, done: (value: T) => boolean): Promise<T> {
  const end = Date.now() + 10_000;
  for (;;) {
    const value = await read();
    if (done(value)) return value;
    if (Date.now() > end) throw new Error(`${what} after 10 s: ${JSON.stringify(value)}`);
    await sleep(50);
  }
}
async function checkoutOptions(who: Viewer) {
  const r = await call(who, "GET", "/checkout/options");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return zod.GetCheckoutOptionsResponse.parse(r.body);
}
async function checkoutState(who: Viewer, purchaseId: string) {
  const r = await call(who, "GET", `/checkout/${purchaseId}`);
  assert.equal(r.status, 200, `${who.user} reading the purchase ${purchaseId}: ${r.status} ${JSON.stringify(r.body)}`);
  zod.GetCheckoutResponse.parse(r.body);
  return r.body;
}
async function timelineAccess(who: Viewer) {
  const r = await call(who, "GET", "/timeline/access");
  assert.equal(r.status, 200, `${who.user}: ${r.status} ${JSON.stringify(r.body)}`);
  zod.GetTimelineAccessResponse.parse(r.body);
  return r.body;
}
async function customerOf(who: Viewer): Promise<string | null> {
  return (await q("select stripe_customer_id from users where id = $1", [who.user])).rows[0]?.stripe_customer_id ?? null;
}
async function timelineSetup(who: Viewer, zone: string) {
  const r = await call(who, "GET", `/timeline/setup?tz=${encodeURIComponent(zone)}`);
  assert.equal(r.status, 200, `${who.user}: ${r.status} ${JSON.stringify(r.body)}`);
  return zod.GetTimelineSetupResponse.parse(r.body);
}

/** A plan's period end, which since the basil API sits on its one item. */
const periodEnd = (sub: Json) => Number(((sub.items as { data: Json[] }).data[0]).current_period_end);

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** The Monday on or before a day: a reader's week runs Monday to Sunday. */
function mondayOf(day: string): string {
  return addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));
}

/**
 * What the engine lists for a chart from a Monday in the reader's days (reading 8), worked out here rather than by the
 * setup: the sky events that get a reading over this week's 7 days, the month's 30 and the six months to `to`, which is
 * today plus 182 days, as the setup's own stretch ends, and every life cycle to 90.
 */
function engineReadings(chart: Chart, zone: string, from: string, to: string) {
  const months = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
  const start = dayStart(from, zone);
  const readingsOver = (days: number) => {
    const end = new Date(dayStart(addDays(from, days), zone).getTime() - 1);
    return new Set(skyEvents(chart, start, end).filter(readsAs).map((event) => event.key));
  };
  const cycles = lifeCycles(natalLongitudes(chart), new Date(chart.datetimeUtc)).map((cycle) => cycle.key);
  return { week: readingsOver(7), month: readingsOver(30), months: readingsOver(months), cycles };
}

/** Jobs still to write a reading: any kind but the next six months', which waits for its week. */
async function readingJobsLeft(): Promise<number> {
  return Number((await q("select count(*) as n from jobs where kind <> 'timeline.ahead' and status in ('queued', 'running')")).rows[0].n);
}

/**
 * The API's worker writes a setup's readings in the background; here the queue runs in-process until none is left to
 * write. Setup queues them a millisecond apart, so a run that begins before the last is due runs again.
 */
async function drained(): Promise<number> {
  const end = Date.now() + 30_000;
  let ran = 0;
  for (;;) {
    ran += await drainJobs();
    const left = await readingJobsLeft();
    if (left === 0) return ran;
    if (Date.now() > end) throw new Error(`${left} readings were still waiting after 30 s; calls with no text: ${unanswered.join(", ") || "none"}`);
    await sleep(50);
  }
}

/** Pay pressed with the box ticked: the purchase checkout made, and the session Stripe holds for it. */
async function checkout(who: Viewer, item: CatalogueItemId, returnTo: string) {
  const r = await call(who, "POST", "/checkout", { item, ticked: true, returnTo });
  assert.equal(r.status, 201, `${item}: ${r.status} ${JSON.stringify(r.body)}`);
  const started = zod.CreateCheckoutResponse.parse(r.body);
  const row = (await q("select stripe_session_id, tick_hash, cents, status, is_test from purchases where id = $1", [started.purchaseId])).rows[0];
  const session = testStripe.sessions.get(row?.stripe_session_id);
  assert.ok(row && session, `the purchase ${started.purchaseId} names no session Stripe made`);
  assert.deepEqual([session.client_secret, session.amount_total, row.cents, row.status, row.is_test], [started.clientSecret, started.amountCents, started.amountCents, "open", true]);
  // Stripe sends the reader back to the page that waits for the credit, which reads the purchase it names (reading 2).
  assert.equal(session.return_url, `${OUR_PAGE}/checkout/done?purchase=${encodeURIComponent(started.purchaseId)}`);
  return { ...started, row, session };
}

/** Pay with the box left unticked: refused before Stripe hears of it, and no purchase is kept. */
async function unticked(who: Viewer, item: CatalogueItemId, returnTo: string) {
  const sessionsBefore = sessionsMade();
  const purchasesBefore = Number((await q("select count(*) as n from purchases where user_id = $1", [who.user])).rows[0].n);
  const r = await call(who, "POST", "/checkout", { item, ticked: false, returnTo });
  assert.deepEqual([r.status, r.body.error], [400, "tick_required"], JSON.stringify(r.body));
  assert.equal(sessionsMade(), sessionsBefore, `an unticked ${item} reached Stripe`);
  assert.equal(Number((await q("select count(*) as n from purchases where user_id = $1", [who.user])).rows[0].n), purchasesBefore);
}

/** Stripe sends an event to the webhook, signed with the destination's secret; the route takes it. */
async function delivered(event: StripeEvent): Promise<void> {
  const r = await testStripe.deliver(WEBHOOK, event, SIGNING_SECRET);
  assert.deepEqual([r.status, r.body], [200, { received: true }], `${event.type}: ${r.status} ${JSON.stringify(r.body)}`);
}

/** A report is written after POST answers, so the step waits on its status as the page does. */
async function written(who: Viewer, reportId: string): Promise<void> {
  const end = Date.now() + 30_000;
  for (;;) {
    const r = await call(who, "GET", `/reports/${reportId}/status`);
    assert.equal(r.status, 200, `the status of ${reportId}: ${r.status} ${JSON.stringify(r.body)}`);
    if (r.body.status === "complete") {
      zod.GetReportStatusResponse.parse(r.body);
      const sections = Object.entries(r.body.sections as Record<string, string>);
      assert.ok(sections.length > 0 && sections.every(([, s]) => s === "done"), `sections: ${JSON.stringify(r.body.sections)}`);
      return;
    }
    if (r.body.status === "failed") {
      // The page shows only the coded line; the row keeps why, for the walk to say.
      const row = (await q("select failure_code, error_message from reports where id = $1", [reportId])).rows[0];
      throw new Error(`the report failed (${row?.failure_code}): ${row?.error_message}; calls with no text: ${unanswered.join(", ") || "none"}`);
    }
    if (Date.now() > end) throw new Error(`the report was still ${r.body.status} after 30 s`);
    await sleep(50);
  }
}

/** Canned text whose claims cite the Sun where the engine put it, with the chart's own sect, so the checks pass it. */
function natalTextFor(chart: Chart): Record<string, unknown> {
  const sun = chart.planets.sun;
  const sect = (chart.sunAltitude ?? 0) > 0 ? "day" : "night";
  return cannedNatalReplies({ drawn: true, sunSign: sun.sign.toLowerCase(), sunHouse: sun.house, sect });
}

/** What the birth form posts (BirthFormPage): the reader's own chart, or someone she adds. */
function birthForm(p: SamplePerson, birthPlace: string, isForSelf: boolean) {
  return {
    name: p.name,
    birthDate: p.birthDate,
    birthTime: p.birthTime,
    birthTimeWindowMinutes: 0,
    birthPlace,
    latitude: p.latitude,
    longitude: p.longitude,
    timezoneOffset: p.timezoneOffset,
    timezone: p.timezone,
    isForSelf,
  };
}

/** The chart and the text a stored natal report holds, as POST /compatibility reads them. */
async function stored(reportId: string) {
  const row = (await q(
    "select p.name, p.birth_date, p.chart_data, r.interpretation from reports r join profiles p on p.id = r.profile_id where r.id = $1",
    [reportId],
  )).rows[0];
  return { name: row.name as string, birthDate: row.birth_date as string, chart: row.chart_data as Chart, interpretation: row.interpretation as ReportInterpretation };
}

/** The canned pair speaks of Marie and Oprah; here it speaks of the two it is written for, from their stored reports. */
async function pairTextFor(lens: "parent_child" | "partners", parent: "A" | "B" | undefined, aReportId: string, bReportId: string) {
  const [a, b] = await Promise.all([stored(aReportId), stored(bReportId)]);
  const canned = JSON.stringify(pairReplies(buildPairBrief({ lens, parent, a, b })));
  return JSON.parse(canned.replaceAll("Marie", a.name.split(" ")[0]).replaceAll("Oprah", b.name.split(" ")[0]));
}

/** What a viewer has written or holds under their account or browser: nothing, after a write that was refused. */
async function keptFor(who: Viewer): Promise<number> {
  const kept = await q(
    "select (select count(*) from profiles where user_id = $1 or session_id = $2) + (select count(*) from reports where session_id = $2) as n",
    [who.user, who.session],
  );
  return Number(kept.rows[0].n);
}

// Clerk's first sight of an account adds its row with the address Clerk holds (middlewares/auth.ts), so the walk adds it
// at the sign-in.
const signIn = (who: Viewer, email: string) => q("insert into users (id, email) values ($1, $2)", [who.user, email]);

/** The line of this file a failed check stands on, so the one FAIL line is enough to find it. */
const THIS_FILE = basename(fileURLToPath(import.meta.url));
function lineOf(err: unknown): string {
  const stack = err instanceof Error ? (err.stack ?? "") : "";
  const at = stack.split("\n").find((frame) => frame.includes(`${THIS_FILE}:`))?.match(/:(\d+):\d+\)?$/);
  return at ? ` (${THIS_FILE}:${at[1]})` : "";
}

type Step = () => Promise<void>;

let stepNo = 0;
let failedAt = 0;
async function step(listed: ListedStep, fn: Step): Promise<void> {
  stepNo++;
  const name = `${listed.id}: ${listed.label}`;
  if (failedAt) {
    console.log(`-- ${stepNo} ${name} (not run)`);
    return;
  }
  try {
    await fn();
    console.log(`ok ${stepNo} ${name}`);
  } catch (err) {
    failedAt = stepNo;
    console.log(`FAIL ${stepNo} ${name}${lineOf(err)}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// One browser each, so a reader's session is the same before and after signing in.
const MIRA_SIGNED_OUT: Viewer = { user: null, session: "s-mira" };
const MIRA: Viewer = { user: "user_mira", session: MIRA_SIGNED_OUT.session };
const IDRIS_SIGNED_OUT: Viewer = { user: null, session: "s-idris" };
const IDRIS: Viewer = { user: "user_idris", session: IDRIS_SIGNED_OUT.session };
const TOMAS_SIGNED_OUT: Viewer = { user: null, session: "s-tomas" };
const TOMAS: Viewer = { user: "user_tomas", session: TOMAS_SIGNED_OUT.session };
const HANNA_SIGNED_OUT: Viewer = { user: null, session: "s-hanna" };
const HANNA: Viewer = { user: "user_hanna", session: HANNA_SIGNED_OUT.session };
const MIRA_EMAIL = "mira@example.com";
const IDRIS_EMAIL = "idris@example.com";
const TOMAS_EMAIL = "tomas@example.com";
const HANNA_EMAIL = "hanna@example.com";
const GIFT_NOTE = "Happy birthday. Love, Mira.";
// Who each is to Mira on the site: herself, her parent, her friend and her partner.
const MIRA_BIRTH = samplePerson("mira");
const IDRIS_BIRTH = samplePerson("idris");
const HANNA_BIRTH = samplePerson("hanna");
const TOMAS_BIRTH = samplePerson("tomas");
const miraChart = chartForProfile({ ...MIRA_BIRTH, birthTimeWindowMinutes: 0 });
const idrisChart = chartForProfile({ ...IDRIS_BIRTH, birthTimeWindowMinutes: 0 });
const hannaChart = chartForProfile({ ...HANNA_BIRTH, birthTimeWindowMinutes: 0 });
const tomasChart = chartForProfile({ ...TOMAS_BIRTH, birthTimeWindowMinutes: 0 });
// Family & friends pays for Mira's report, the gifts Idris and Hanna write with and her pair with Idris; the refund
// takes the one left. The Couple pays for Tomás's report and her pair with Tomás, and keeps one.
const FAMILY = bundleById("family");
const COUPLE = bundleById("couple");
const YEARLY = PLANS.find((plan) => plan.id === "timeline_year");
if (!YEARLY) throw new Error("the catalogue has no yearly plan");
// Where each Get credits and Start Timeline sends a reader back to (reading 2).
const CREDITS_SHEET = "/dashboard?open=credits";
const BIRTH_FORM = "/chart";
const TEASER = "/dashboard";
const ACCOUNT_PAGE = "/dashboard/account";

let miraProfileId = "";
let miraReportId = "";
let idrisProfileId = "";
let idrisReportId = "";
let giftId = "";
let giftCreditId = "";
let giftToken = "";
let hannaGiftId = "";
let hannaCreditId = "";
let hannaToken = "";
let hannaProfileId = "";
let hannaReportId = "";
let idrisPairId = "";
let idrisPairRelationshipId = "";
let tomasProfileId = "";
let tomasReportId = "";
let tomasPairId = "";
let tomasPairRelationshipId = "";
let reportToken = "";
let pairToken = "";
let familyPurchaseId = "";
let timelinePlan = "";

const WALK: Record<StepId, Step> = {
  "sign-in": async () => {
    assert.deepEqual(await readHome(MIRA_SIGNED_OUT), EMPTY_HOME);
    assert.deepEqual(await credits(MIRA_SIGNED_OUT), NO_CREDITS);
    // The prices are open to anyone, and Pay works once the start's sync is done (reading 14).
    const options = await checkoutOptions(MIRA_SIGNED_OUT);
    assert.deepEqual([options.ready, options.publishableKey], [true, process.env.STRIPE_PUBLISHABLE_KEY]);
    assert.deepEqual(
      options.items.map((i) => [i.id, i.cents, i.campaign]),
      [...BUNDLES, ...PLANS].map((item) => [item.id, item.cents, null]),
    );
    // Buying belongs to an account on every host (reading 1), so a signed-out Pay never reaches Stripe.
    const buy = await call(MIRA_SIGNED_OUT, "POST", "/checkout", { item: "family", ticked: true, returnTo: CREDITS_SHEET });
    assert.deepEqual([buy.status, buy.body.error], [401, "sign_in_required"]);
    assert.equal(sessionsMade(), 0);
    assert.equal((await call(MIRA_SIGNED_OUT, "GET", "/timeline/access")).status, 401);
    // The sky screen keeps her birth data in the browser until she signs in, and the birth form needs an account
    // (ADR-140), so a signed-out visit leaves nothing in the API for her account to claim.
    assert.equal(await keptFor(MIRA_SIGNED_OUT), 0);

    await signIn(MIRA, MIRA_EMAIL);
    assert.deepEqual(await readHome(MIRA), EMPTY_HOME);
    assert.deepEqual(await credits(MIRA), NO_CREDITS);
    assert.deepEqual((await call(MIRA, "GET", "/profiles")).body, []);
    assert.equal((await listReports(MIRA)).size, 0);
  },

  buy: async () => {
    await unticked(MIRA, "family", CREDITS_SHEET);
    const started = await checkout(MIRA, "family", CREDITS_SHEET);
    familyPurchaseId = started.purchaseId;
    assert.equal(started.amountCents, FAMILY.cents);
    // The tick the page showed is the one the purchase keeps, so the webhook grants only what she agreed to (ADR-274).
    assert.equal(started.row.tick_hash, sha256(CHECKOUT_TICK));
    // Her own Customer, made with her account's address at her first checkout (reading 1), and the Price Stripe finds by
    // the catalogue's lookup key.
    const customer = await customerOf(MIRA);
    assert.deepEqual([started.session.mode, started.session.customer, testStripe.customers.get(customer ?? "")?.email], ["payment", customer, MIRA_EMAIL]);
    assert.equal(testStripe.prices.get(String(started.session.line_price))?.lookup_key, FAMILY.lookupKey);
    assert.deepEqual(await checkoutState(MIRA, familyPurchaseId), { status: "open", item: "family", returnTo: CREDITS_SHEET, credits: 5 });
    assert.equal((await call(MIRA_SIGNED_OUT, "GET", `/checkout/${familyPurchaseId}`)).status, 404);
    // Nothing is in her balance until Stripe says the payment went through: only the webhook grants (ADR-275).
    assert.deepEqual(await credits(MIRA), NO_CREDITS);

    const paid = testStripe.pay(String(started.session.id));
    const completed = testStripe.event("checkout.session.completed", paid.session);
    // An event signed with any other secret is refused before anything is written, a row for it included (R13-10).
    const forged = await testStripe.deliver(WEBHOOK, completed, "whsec_forged");
    assert.deepEqual([forged.status, forged.body], [400, { error: "bad_signature" }]);
    assert.equal((await q("select 1 from stripe_events where id = $1", [completed.id])).rowCount, 0);
    assert.deepEqual(await credits(MIRA), NO_CREDITS);

    // Stripe sends an event again until it hears back, and a paid session again as its async twin: one grant.
    await delivered(completed);
    await delivered(completed);
    await delivered(testStripe.event("checkout.session.async_payment_succeeded", paid.session));
    assert.deepEqual(await credits(MIRA), { available: 5, used: 0, held: 0 });
    const rows = (await q("select count(*)::int as n, count(*) filter (where is_test)::int as test from credits where user_id = $1", [MIRA.user])).rows[0];
    assert.deepEqual(rows, { n: 5, test: 5 });
    const bundle = (await q("select bundle_kind, source, is_test from bundles where purchase_id = $1", [familyPurchaseId])).rows;
    assert.deepEqual(bundle, [{ bundle_kind: "family", source: "purchase", is_test: true }]);
    // A sandbox purchase says so in History (reading 4).
    assert.deepEqual(await history(MIRA), [["bought", 5, "5 test credits"]]);
    // The done page reads the grant and sends her back to the sheet she asked from.
    assert.deepEqual(await checkoutState(MIRA, familyPurchaseId), { status: "granted", item: "family", returnTo: CREDITS_SHEET, credits: 5 });

    // Our receipt beside Stripe's, once, repeating what she bought and what she agreed to (ADR-143, 274).
    assert.equal(receipts().length, 1);
    const receipt = receipts()[0];
    assert.equal(receipt.to, MIRA_EMAIL);
    for (const line of [`You bought: ${FAMILY.name}`, "Credits: 5 credits", `You paid: ${formatEuro(FAMILY.cents)}`, CHECKOUT_TICK]) {
      assert.ok(receipt.text.includes(line), `the receipt lacks "${line}": ${receipt.text}`);
    }
    onOurWeb(receipt);
  },

  "own-report": async () => {
    replies = natalTextFor(miraChart);
    const made = await call(MIRA, "POST", "/reports", birthForm(MIRA_BIRTH, "Lisbon", true));
    assert.equal(made.status, 201, JSON.stringify(made.body));
    zod.CreateReportResponse.parse(made.body);
    const sun = miraChart.planets.sun;
    assert.deepEqual([made.body.status, made.body.sunSign, made.body.risingSign], ["interpreting", sun.sign, miraChart.angles!.ascendant.sign]);
    miraReportId = made.body.id;
    // The credit was taken with the report's row, before a word of it is written (ADR-275).
    assert.deepEqual(await creditFor(miraReportId), [{ status: "used", user_id: MIRA.user }]);
    assert.deepEqual(await credits(MIRA), { available: 4, used: 1, held: 0 });
    await written(MIRA, miraReportId);

    const read = await readReport(MIRA, miraReportId);
    assert.deepEqual([read.access, read.type, read.status, read.send, read.giverName], ["owner", "natal", "complete", null, null]);
    miraProfileId = read.profileId;
    assert.deepEqual([read.chartData.planets.sun.sign, read.chartData.planets.sun.degree], [sun.sign, sun.degree]);
    assert.deepEqual([read.interpretation.meta.promptVersion, read.interpretation.meta.horizon], [PROMPT_VERSION, "known"]);
    // One chapter's card is stored and read back whole and the other six carry none (R19-20): the pipeline keeps a Did
    // you know card beside the prose and sets nothing where the writer gave null.
    const cards = Object.fromEntries(
      ["overview", "mind", "career", "family", "superpowers", "discoveries", "focus"].map((id) => [id, (read.interpretation as unknown as Record<string, { didYouKnow?: { title: string; body: string } | null }>)[id].didYouKnow ?? null]),
    );
    assert.deepEqual(Object.keys(cards).filter((id) => cards[id] !== null), ["family"]);
    assert.ok(cards.family!.title.endsWith("?") && cards.family!.body.length > 0, JSON.stringify(cards.family));
    // The evidence under a claim is drawn from the chart in code, never from the model's words.
    assert.equal(read.interpretation.triad.claims[0].evidence[0].label, `Sun ${sun.degree.toFixed(1)}° ${sun.sign}, ${ordinal(sun.house!)} house`);
    assert.deepEqual(unanswered, []);

    const home = await readHome(MIRA);
    assert.deepEqual([home.you?.profileId, home.you?.reportId, home.you?.access, home.you?.isSelf], [miraProfileId, miraReportId, "owner", true]);
    assert.deepEqual(home.you?.triad?.sun, { sign: sun.sign, degree: sun.degree, house: sun.house });
    // Your first steps ticks her own report and moves on to adding someone (ADR-330).
    assert.deepEqual(home.firstSteps, { step: 2, person: null, gift: false, pairReady: false });
    assert.deepEqual(await credits(MIRA), { available: 4, used: 1, held: 0 });
    assert.deepEqual(await history(MIRA), [["spent", 1, "Mira Costa"], ["bought", 5, "5 test credits"]]);
  },

  gift: async () => {
    const mailsBefore = mails.length;
    // "Share your report with Idris too?" Not now, sent as a stated false as GiftFlow sends it: nothing is kept for his
    // claim to grant (ADR-331).
    const sent = await call(MIRA, "POST", "/gifts", { recipientName: "Idris", email: IDRIS_EMAIL, note: GIFT_NOTE, shareOwn: false });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    zod.CreateGiftResponse.parse(sent.body);
    assert.deepEqual([sent.body.state, sent.body.creditHeld, sent.body.emailDelivered], ["waiting", true, true]);
    giftId = sent.body.id;

    const mail = mails.at(-1)!;
    assert.deepEqual([mails.length - mailsBefore, mail.to, mail.subject], [1, IDRIS_EMAIL, "Mira gave you a Personal report"]);
    assert.ok(mail.text.includes(GIFT_NOTE), `the gift email lacks the note: ${mail.text}`);
    onOurWeb(mail);
    giftToken = tokenOf(mail);
    assert.equal(sent.body.claimUrl, claimUrlOf(giftToken));

    giftCreditId = (await q("select credit_id from invite_tokens where id = $1", [giftId])).rows[0].credit_id;
    assert.deepEqual(await creditRow(giftCreditId), { status: "held", user_id: MIRA.user, used_for_report_id: null });
    assert.deepEqual(await answersOf(giftId), { giver_shares: false, share_back: false });
    assert.deepEqual(await credits(MIRA), { available: 3, used: 1, held: 1 });
    assert.deepEqual(await gifts(MIRA), [[giftId, "Idris", IDRIS_EMAIL, "waiting", true]]);
    // A gift is done once it's sent, so Your first steps is on step 4, naming Idris as she typed him: nothing of his
    // reaches her before he shares it, so there is no report to pair yet (ADR-330, 331).
    assert.deepEqual((await readHome(MIRA)).firstSteps, { step: 4, person: { profileId: "", name: "Idris" }, gift: true, pairReady: false });
  },

  "gift-claimed": async () => {
    const opened = await preview(IDRIS_SIGNED_OUT, giftToken);
    // Mira said Not now, so the cover asks "Share your report with Mira when it's ready?", not "Share yours back when
    // it's ready?".
    assert.deepEqual(
      [opened.kind, opened.inviterName, opened.recipientName, opened.note, opened.alreadyClaimed, opened.giverShares],
      ["gift", "Mira", "Idris", GIFT_NOTE, false, false],
    );
    assert.equal((await call(IDRIS_SIGNED_OUT, "POST", claimPath(giftToken))).status, 401);

    // He signs in from the email's link, and his balance holds nothing until the claim.
    await signIn(IDRIS, IDRIS_EMAIL);
    assert.deepEqual(await credits(IDRIS), NO_CREDITS);
    const claimed = await claim(IDRIS, giftToken, { shareBack: false });
    assert.deepEqual([claimed.kind, claimed.redirectTo], ["gift", "/dashboard"]);
    // Not now on both sides writes nothing and keeps nothing for his report (reading 16).
    assert.deepEqual(await grantsOf(giftId), []);
    assert.deepEqual(await answersOf(giftId), { giver_shares: false, share_back: false });

    assert.deepEqual(await creditRow(giftCreditId), { status: "available", user_id: IDRIS.user, used_for_report_id: null });
    assert.deepEqual(await credits(IDRIS), { available: 1, used: 0, held: 0 });
    assert.deepEqual(await history(IDRIS), [["gift", 1, "A gift from Mira"]]);
    assert.deepEqual(await credits(MIRA), { available: 3, used: 1, held: 0 });
    assert.deepEqual(await gifts(MIRA), [[giftId, "Idris", IDRIS_EMAIL, "claimed", false]]);
    assert.deepEqual(await history(MIRA), [["spent", 1, "Gift to Idris"], ["spent", 1, "Mira Costa"], ["bought", 5, "5 test credits"]]);
  },

  "idris-report": async () => {
    replies = natalTextFor(idrisChart);
    const made = await call(IDRIS, "POST", "/reports", birthForm(IDRIS_BIRTH, "Cardiff", true));
    assert.equal(made.status, 201, JSON.stringify(made.body));
    zod.CreateReportResponse.parse(made.body);
    idrisReportId = made.body.id;
    assert.deepEqual(await creditRow(giftCreditId), { status: "used", user_id: IDRIS.user, used_for_report_id: idrisReportId });
    assert.deepEqual(await credits(IDRIS), { available: 0, used: 1, held: 0 });
    await written(IDRIS, idrisReportId);

    const read = await readReport(IDRIS, idrisReportId);
    const sun = idrisChart.planets.sun;
    assert.deepEqual([read.access, read.status, read.chartData.planets.sun.sign, read.chartData.planets.sun.degree], ["owner", "complete", sun.sign, sun.degree]);
    idrisProfileId = read.profileId;
    assert.deepEqual(unanswered, []);
    assert.deepEqual((await readHome(IDRIS)).you?.reportId, idrisReportId);
    assert.deepEqual(await history(IDRIS), [["spent", 1, "Idris Costa"], ["gift", 1, "A gift from Mira"]]);
  },

  "no-credit": async () => {
    assert.deepEqual(await credits(IDRIS), { available: 0, used: 1, held: 0 });
    // His gifted credit wrote his report, so asking for another is refused before a word is asked of the model or a row
    // is made (reading 17).
    replies = {};
    const callsBefore = modelCalls.length;
    const [keptBefore, profilesBefore] = [await keptFor(IDRIS), (await call(IDRIS, "GET", "/profiles")).body];
    const asked = await call(IDRIS, "POST", "/reports", birthForm(MIRA_BIRTH, "Lisbon", false));
    assert.deepEqual([asked.status, asked.body], [402, NO_CREDIT_TO_WRITE]);
    assert.equal(modelCalls.length, callsBefore);
    assert.equal(await keptFor(IDRIS), keptBefore);
    assert.deepEqual(await credits(IDRIS), { available: 0, used: 1, held: 0 });
    assert.deepEqual((await call(IDRIS, "GET", "/profiles")).body, profilesBefore);
    // Get credits opens /checkout, whose bundles and Pay are there for him.
    const options = await checkoutOptions(IDRIS);
    assert.equal(options.ready, true);
    assert.deepEqual(options.items.filter((i) => i.kind === "bundle").map((i) => i.id), ["solo", "couple", "family"]);
  },

  share: async () => {
    assert.equal((await call(IDRIS, "GET", `/reports/${miraReportId}`)).status, 404);
    const mailsBefore = mails.length;
    const shared = await call(MIRA, "POST", "/shares", { email: IDRIS_EMAIL });
    assert.equal(shared.status, 201, JSON.stringify(shared.body));
    zod.ShareMyReportResponse.parse(shared.body);
    assert.deepEqual([shared.body.email, shared.body.emailDelivered], [IDRIS_EMAIL, true]);
    const mail = mails.at(-1)!;
    assert.deepEqual([mails.length - mailsBefore, mail.to, mail.subject], [1, IDRIS_EMAIL, "Mira shared their Personal report with you"]);
    onOurWeb(mail);
    const token = tokenOf(mail);

    const opened = await preview(IDRIS, token);
    assert.deepEqual([opened.kind, opened.inviterName], ["share", "Mira"]);
    assert.deepEqual(await claim(IDRIS, token), {
      profileId: miraProfileId, relationshipId: null, relationshipReportId: null, redirectTo: "/dashboard", kind: "share", askSelf: false, shareBack: true,
    });

    const read = await readReport(IDRIS, miraReportId);
    assert.deepEqual([read.access, read.giverName, read.canRegenerate, read.send], ["shared", "Mira", false, null]);
    assert.deepEqual(read.interpretation, (await readReport(MIRA, miraReportId)).interpretation, "the text Idris reads is not the text Mira reads");
    const home = await readHome(IDRIS);
    assert.deepEqual(home.people.map((p) => [p.profileId, p.reportId, p.access, p.shareBack]), [[miraProfileId, miraReportId, "shared", true]]);
    assert.deepEqual((await shares(MIRA)).map((s) => s.slice(1)), [[IDRIS_EMAIL, "Idris", "active"]]);
  },

  "share-back": async () => {
    assert.equal((await call(MIRA, "GET", `/reports/${idrisReportId}`)).status, 404);
    const mailsBefore = mails.length;
    const back = await call(IDRIS, "POST", "/shares/back", { profileId: miraProfileId });
    assert.equal(back.status, 201, JSON.stringify(back.body));
    zod.ShareBackResponse.parse(back.body);
    assert.deepEqual([back.body.email, back.body.readerName, back.body.state], ["", "Mira", "active"]);
    assert.equal(mails.length, mailsBefore);

    const read = await readReport(MIRA, idrisReportId);
    assert.deepEqual([read.access, read.giverName, read.canRegenerate], ["shared", "Idris", false]);
    const home = await readHome(MIRA);
    assert.deepEqual(home.people.map((p) => [p.profileId, p.reportId, p.access, p.shareBack]), [[idrisProfileId, idrisReportId, "shared", false]]);
    // Her gift's step 4 now names his own seat, and both reports are finished, so You & Idris is ready (ADR-331, 332).
    assert.deepEqual(home.firstSteps, { step: 4, person: { profileId: idrisProfileId, name: "Idris" }, gift: true, pairReady: true });
    assert.deepEqual((await readHome(IDRIS)).people.map((p) => [p.profileId, p.shareBack]), [[miraProfileId, false]]);
  },

  "hanna-gift": async () => {
    const mailsBefore = mails.length;
    // "Share your report with Hanna too?" Yes: kept on the gift, it becomes a grant when she claims it (reading 16).
    const sent = await call(MIRA, "POST", "/gifts", { recipientName: "Hanna", email: HANNA_EMAIL, shareOwn: true });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    zod.CreateGiftResponse.parse(sent.body);
    assert.deepEqual([sent.body.state, sent.body.creditHeld, sent.body.emailDelivered, sent.body.note], ["waiting", true, true, null]);
    hannaGiftId = sent.body.id;

    const mail = mails.at(-1)!;
    assert.deepEqual([mails.length - mailsBefore, mail.to, mail.subject], [1, HANNA_EMAIL, "Mira gave you a Personal report"]);
    onOurWeb(mail);
    hannaToken = tokenOf(mail);
    assert.equal(sent.body.claimUrl, claimUrlOf(hannaToken));

    hannaCreditId = (await q("select credit_id from invite_tokens where id = $1", [hannaGiftId])).rows[0].credit_id;
    assert.deepEqual(await creditRow(hannaCreditId), { status: "held", user_id: MIRA.user, used_for_report_id: null });
    assert.deepEqual(await answersOf(hannaGiftId), { giver_shares: true, share_back: false });
    // Nothing is granted before the claim: until then no one holds the link's account.
    assert.deepEqual(await grantsOf(hannaGiftId), []);
    assert.deepEqual(await credits(MIRA), { available: 2, used: 1, held: 1 });
    assert.deepEqual(await gifts(MIRA), [
      [hannaGiftId, "Hanna", HANNA_EMAIL, "waiting", true], [giftId, "Idris", IDRIS_EMAIL, "claimed", false],
    ]);
    // The newest person she added is the one step 4 names.
    assert.deepEqual((await readHome(MIRA)).firstSteps, { step: 4, person: { profileId: "", name: "Hanna" }, gift: true, pairReady: false });
  },

  "hanna-claims": async () => {
    const opened = await preview(HANNA_SIGNED_OUT, hannaToken);
    // Mira said Yes, so the cover asks "Share yours back when it's ready?" (ADR-331).
    assert.deepEqual(
      [opened.kind, opened.inviterName, opened.recipientName, opened.note, opened.alreadyClaimed, opened.giverShares],
      ["gift", "Mira", "Hanna", null, false, true],
    );
    await signIn(HANNA, HANNA_EMAIL);
    assert.deepEqual(await credits(HANNA), NO_CREDITS);
    const claimed = await claim(HANNA, hannaToken, { shareBack: true });
    assert.deepEqual([claimed.kind, claimed.redirectTo], ["gift", "/dashboard"]);

    // Mira's Yes is a grant of her own report to Hanna, written with the claim; Hanna's waits on the gift for her
    // report.
    const given = await grantsOf(hannaGiftId);
    assert.deepEqual(given.map((g) => [g.profile_id, g.owner_user_id, g.reader_user_id]), [[miraProfileId, MIRA.user, HANNA.user]]);
    const grantId = given[0].id;
    assert.deepEqual(await answersOf(hannaGiftId), { giver_shares: true, share_back: true });
    const read = await readReport(HANNA, miraReportId);
    assert.deepEqual([read.access, read.giverName, read.canRegenerate, read.send], ["shared", "Mira", false, null]);
    assert.deepEqual(read.interpretation, (await readReport(MIRA, miraReportId)).interpretation, "the text Hanna reads is not the text Mira reads");

    // The giver's Yes read back through GET /home on both sides: Mira's seat on Hanna's circle, with no Share yours
    // back to offer before Hanna has a report, and Hanna among those who read Mira's, by the grant.
    const hers = await readHome(HANNA);
    assert.deepEqual([hers.you, hers.people.map((p) => [p.profileId, p.reportId, p.access, p.shareBack])], [null, [[miraProfileId, miraReportId, "shared", false]]]);
    assert.deepEqual(hers.firstSteps, { step: 1, person: null, gift: false, pairReady: false });
    const mira = await readHome(MIRA);
    assert.deepEqual(mira.you?.readers.filter((r) => r.shareId === grantId).map((r) => [r.state, r.email, r.inviteId]), [["can-read", null, null]]);
    // Nothing of Hanna's reaches Mira before her report is finished, so step 4 still names her as Mira typed her.
    assert.deepEqual(mira.firstSteps, { step: 4, person: { profileId: "", name: "Hanna" }, gift: true, pairReady: false });

    assert.deepEqual(await creditRow(hannaCreditId), { status: "available", user_id: HANNA.user, used_for_report_id: null });
    assert.deepEqual(await credits(HANNA), { available: 1, used: 0, held: 0 });
    assert.deepEqual(await history(HANNA), [["gift", 1, "A gift from Mira"]]);
    assert.deepEqual(await credits(MIRA), { available: 2, used: 1, held: 0 });
    assert.deepEqual((await history(MIRA))[0], ["spent", 1, "Gift to Hanna"]);
  },

  "hanna-report": async () => {
    replies = natalTextFor(hannaChart);
    // The stand-in holds its answers, so the step reads what Mira can while Hanna's report is still being written.
    const release = holdModel();
    try {
      const made = await call(HANNA, "POST", "/reports", birthForm(HANNA_BIRTH, "Berlin", true));
      assert.equal(made.status, 201, JSON.stringify(made.body));
      zod.CreateReportResponse.parse(made.body);
      hannaReportId = made.body.id;
      assert.deepEqual(await creditRow(hannaCreditId), { status: "used", user_id: HANNA.user, used_for_report_id: hannaReportId });
      // Her Yes waits for a finished report: while hers is written, Mira reads nothing of it (R-3.6).
      assert.equal((await call(MIRA, "GET", `/reports/${hannaReportId}`)).status, 404);
      assert.deepEqual(await answersOf(hannaGiftId), { giver_shares: true, share_back: true });
    } finally {
      release();
    }
    await written(HANNA, hannaReportId);
    const read = await readReport(HANNA, hannaReportId);
    const sun = hannaChart.planets.sun;
    assert.deepEqual([read.access, read.status, read.chartData.planets.sun.sign, read.chartData.planets.sun.degree], ["owner", "complete", sun.sign, sun.degree]);
    hannaProfileId = read.profileId;
    assert.deepEqual(unanswered, []);

    // Once it's finished her kept Yes is a grant of her report to Mira, the row a Share writes, and the gift keeps it
    // no more (reading 16). It lands just after the report reads complete, so the step waits for it.
    const grants = await until("Hanna's Yes to become a grant", () => grantsOf(hannaGiftId), (rows) => rows.length === 2);
    const back = grants.find((g) => g.owner_user_id === HANNA.user);
    assert.deepEqual([back?.profile_id, back?.reader_user_id], [hannaProfileId, MIRA.user]);
    assert.deepEqual(await answersOf(hannaGiftId), { giver_shares: true, share_back: false });
    const hersForMira = await readReport(MIRA, hannaReportId);
    assert.deepEqual([hersForMira.access, hersForMira.giverName, hersForMira.canRegenerate], ["shared", "Hanna", false]);
    assert.deepEqual(hersForMira.interpretation, read.interpretation, "the text Mira reads is not the text Hanna reads");

    // Both Yes grants read back through GET /home: each sits on the other's circle, each reads the other's, and Mira's
    // step 4 names Hanna's own seat with both reports finished, so You & Hanna is ready (ADR-330, 331, 332).
    const mira = await readHome(MIRA);
    const seat = mira.people.find((p) => p.profileId === hannaProfileId);
    assert.deepEqual([seat?.reportId, seat?.access, seat?.isSelf, seat?.shareBack, seat?.readsYours], [hannaReportId, "shared", false, false, "can-read"]);
    assert.deepEqual(mira.firstSteps, { step: 4, person: { profileId: hannaProfileId, name: "Hanna" }, gift: true, pairReady: true });
    const hanna = await readHome(HANNA);
    assert.deepEqual([hanna.you?.reportId, hanna.you?.access, hanna.you?.isSelf], [hannaReportId, "owner", true]);
    assert.deepEqual(hanna.you?.readers, [{ name: "Mira", email: null, state: "can-read", shareId: back?.id, inviteId: null }]);
    assert.deepEqual(hanna.people.map((p) => [p.profileId, p.access, p.shareBack, p.readsYours]), [[miraProfileId, "shared", false, "can-read"]]);
    assert.deepEqual(await history(HANNA), [["spent", 1, "Hanna Berg"], ["gift", 1, "A gift from Mira"]]);
  },

  pair: async () => {
    // The picker offers each finished Personal report she can read: her own, and Idris's and Hanna's through their
    // shares (ADR-332).
    const listed = [...(await listReports(MIRA)).values()];
    const pickable = listed.filter((r) => r.kind === "natal" && r.status === "complete").map((r) => r.id);
    assert.deepEqual(pickable.sort(), [miraReportId, idrisReportId, hannaReportId].sort());
    const lens = "parent_child" as const;
    replies = await pairTextFor(lens, "B", miraReportId, idrisReportId);
    // The stand-in holds its answers, so the step reads the loading screen's calls while the pair is still written.
    const release = holdModel();
    try {
      // What Make it posts: the two she picked, the lens, and the parent that lens asks for (CompatibilityPicker).
      const made = await call(MIRA, "POST", "/compatibility", { reportAId: miraReportId, reportBId: idrisReportId, lens, parent: "B" });
      assert.equal(made.status, 201, JSON.stringify(made.body));
      zod.CreateCompatibilityReportResponse.parse(made.body);
      idrisPairId = made.body.id;
      idrisPairRelationshipId = made.body.relationshipId;
      // One credit is one report, the pair too (ADR-42), taken with its row.
      assert.deepEqual(await creditFor(idrisPairId), [{ status: "used", user_id: MIRA.user }]);
      assert.deepEqual(await credits(MIRA), { available: 1, used: 2, held: 0 });
      // Make it opens /compatibility/<id> on its loading screen (ADR-336), which reads the pair and its status as it's
      // written: both people and their charts at once, for the story, and no chapter yet. Until a chapter lands the
      // row's interpretation is its meta alone, which the contract's whole-or-null doesn't describe, so each parse
      // leaves that one field out.
      const opened = await call(MIRA, "GET", `/reports/${idrisPairId}`);
      assert.equal(opened.status, 200, JSON.stringify(opened.body));
      const loading = zod.GetReportResponse.omit({ interpretation: true }).parse(opened.body);
      assert.deepEqual([loading.type, loading.lens, loading.status], ["compatibility", lens, "interpreting"]);
      assert.deepEqual(
        (loading.participants ?? []).map((p: any) => [p.name, p.chartData?.planets?.sun?.sign]),
        [["Mira Costa", miraChart.planets.sun.sign], ["Idris Costa", idrisChart.planets.sun.sign]],
      );
      const polled = await call(MIRA, "GET", `/reports/${idrisPairId}/status`);
      assert.equal(polled.status, 200, JSON.stringify(polled.body));
      const status = zod.GetReportStatusResponse.omit({ interpretation: true }).parse(polled.body);
      assert.deepEqual([status.status, status.chartReady], ["interpreting", true]);
      assert.ok(Object.keys(status.sections).length > 0 && !Object.values(status.sections).includes("done"), JSON.stringify(status.sections));
    } finally {
      release();
    }
    await written(MIRA, idrisPairId);

    const read = await readReport(MIRA, idrisPairId);
    assert.deepEqual([read.access, read.type, read.lens, read.status], ["owner", "compatibility", lens, "complete"]);
    assert.deepEqual(
      read.participants.map((p: any) => [p.name, p.role, p.reportId, p.isSelf]),
      [["Mira Costa", "child", miraReportId, true], ["Idris Costa", "parent", idrisReportId, false]],
    );
    const meta = read.interpretation.meta;
    assert.deepEqual(
      [meta.promptVersion, meta.lens, meta.band, meta.names, meta.blind],
      [PAIR_PROMPT_VERSION, lens, "grown", { a: "Mira Costa", b: "Idris Costa" }, false],
    );
    assert.deepEqual(unanswered, []);
    const home = await readHome(MIRA);
    const pair = home.pairs.find((p) => p.reportId === idrisPairId);
    assert.deepEqual([pair?.lens, pair?.status, pair?.stoppedBy, pair?.a.name, pair?.b.name], [lens, "complete", null, "Mira Costa", "Idris Costa"]);
    // Your first steps goes once her first pair is on her list (ADR-330).
    assert.equal(home.firstSteps, null);
    assert.deepEqual((await history(MIRA))[0], ["spent", 1, "Mira Costa & Idris Costa"]);
  },

  // Idris's chart is his own, which Mira reads through his share, so the pair goes to him as any send does and its claim
  // hands nothing over (ADR-285).
  "pair-shared": async () => {
    const offered = { state: "can_send", profileId: idrisProfileId, relationshipId: idrisPairRelationshipId, firstName: "Idris" };
    assert.deepEqual((await listReports(MIRA)).get(idrisPairId).send, offered);
    assert.deepEqual((await readReport(MIRA, idrisPairId)).send, offered);
    assert.equal((await call(IDRIS, "GET", `/reports/${idrisPairId}`)).status, 404);
    assert.equal((await call(IDRIS, "GET", `/compatibility/${idrisPairId}/summary`)).status, 404);
    assert.ok(!(await listReports(IDRIS)).has(idrisPairId));
    assert.deepEqual((await readHome(IDRIS)).pairs, []);

    // The link goes only to the address Mira types, never one read off Idris's account (R15-18's lesson).
    const mailsBefore = mails.length;
    const unaddressed = await call(MIRA, "POST", `/compatibility/${idrisPairId}/send`, {});
    assert.deepEqual([unaddressed.status, unaddressed.body.error, unaddressed.body.message], [400, "validation_error", "Add Idris's email to share it."]);
    assert.equal(mails.length, mailsBefore);
    const sent = await call(MIRA, "POST", `/compatibility/${idrisPairId}/send`, { email: IDRIS_EMAIL });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    zod.SendCompatibilityResponse.parse(sent.body);
    const invite = sent.body.invite;
    assert.deepEqual(
      [sent.body.state, invite?.email, invite?.profileId, invite?.relationshipId, invite?.emailDelivered],
      ["invited", IDRIS_EMAIL, idrisProfileId, idrisPairRelationshipId, true],
    );
    const mail = mails.at(-1)!;
    assert.deepEqual([mails.length - mailsBefore, mail.to, mail.subject], [1, IDRIS_EMAIL, "Mira shared a Compatibility report with you"]);
    assert.ok(mail.text.includes("Mira & Idris"), `the pair email does not name the two: ${mail.text}`);
    onOurWeb(mail);
    const token = tokenOf(mail);
    assert.equal(invite?.claimUrl, claimUrlOf(token));
    assert.equal((await listReports(MIRA)).get(idrisPairId).send.state, "sent");

    const opened = await preview(IDRIS, token);
    assert.deepEqual([opened.kind, opened.inviterName, opened.relationshipId, opened.relationshipReportId], ["send", "Mira", idrisPairRelationshipId, idrisPairId]);
    // Nothing changes hands, so no chart rides on the answer and the claim lands on the pair.
    const landed = {
      profileId: null, relationshipId: idrisPairRelationshipId, relationshipReportId: idrisPairId, redirectTo: `/compatibility/${idrisPairId}`, kind: "send", askSelf: false,
    };
    assert.deepEqual(await claim(IDRIS, token), landed);
    assert.deepEqual(
      (await q("select user_id, claimed_by_user_id, is_self, claimed_as_self from profiles where id = $1", [idrisProfileId])).rows,
      [{ user_id: IDRIS.user, claimed_by_user_id: null, is_self: true, claimed_as_self: false }],
    );
    assert.equal((await readReport(IDRIS, idrisReportId)).access, "owner");
    const hisForMira = await readReport(MIRA, idrisReportId);
    assert.deepEqual([hisForMira.access, hisForMira.giverName], ["shared", "Idris"]);

    const pair = await readReport(IDRIS, idrisPairId);
    assert.deepEqual([pair.access, pair.giverName, pair.status, pair.send, pair.canRegenerate], ["participant", "Mira", "complete", null, false]);
    assert.deepEqual(pair.participants.map((p: any) => [p.name, p.isSelf]), [["Mira Costa", false], ["Idris Costa", true]]);
    assert.deepEqual(pair.interpretation, (await readReport(MIRA, idrisPairId)).interpretation, "the pair Idris reads is not the pair Mira wrote");
    assert.equal((await call(IDRIS, "GET", `/compatibility/${idrisPairId}/summary`)).status, 200);
    const listed = (await listReports(IDRIS)).get(idrisPairId);
    assert.deepEqual([listed?.access, listed?.sharedBy, listed?.send], ["participant", "Mira", null]);
    const his = await readHome(IDRIS);
    assert.deepEqual(his.pairs.map((p) => [p.reportId, p.stoppedBy]), [[idrisPairId, null]]);
    assert.equal(his.firstSteps, null, "Your first steps stays once a pair is on his list");
    assert.equal((await listReports(MIRA)).get(idrisPairId).send.state, "joined");
    // He reads it as any reader it was sent to does: only Mira, who made it, can share it on.
    const onward = await call(IDRIS, "POST", `/compatibility/${idrisPairId}/send`, { email: MIRA_EMAIL });
    assert.deepEqual([onward.status, onward.body.message], [403, "Only the person who had this report written can share it."]);

    // His ticks and pins are his own (ADR-239): his home lists what he pinned, and Mira's report shows none of it.
    const exercise = `${pairChapterId("parent_child", 2)}.nextTime.items.0`;
    const at = "2026-10-05T09:00:00.000Z";
    const ticked = await call(IDRIS, "PATCH", `/reports/${idrisPairId}/workbook`, { [exercise]: at, [`pin.${exercise}`]: at });
    assert.equal(ticked.status, 200, JSON.stringify(ticked.body));
    assert.deepEqual((await readReport(IDRIS, idrisPairId)).workbook, { [exercise]: at, [`pin.${exercise}`]: at });
    assert.deepEqual((await readReport(MIRA, idrisPairId)).workbook, {});
    const practice = (await readHome(IDRIS)).practising.find((p) => p.reportId === idrisPairId);
    assert.deepEqual([practice?.key, practice?.kind, practice?.pinned, practice?.ticked], [exercise, "compatibility", true, true]);
    assert.ok(!(await readHome(MIRA)).practising.some((p) => p.reportId === idrisPairId), "Idris's pin shows on Mira's home");

    assert.deepEqual(await claim(IDRIS, token), landed, "a second claim of the link lands elsewhere");
  },

  refund: async () => {
    const intent = (await q("select stripe_payment_intent from purchases where id = $1", [familyPurchaseId])).rows[0]?.stripe_payment_intent;
    assert.match(String(intent), /^pi_/, "the granted purchase keeps no payment for a refund to name");
    const refunded = testStripe.event("charge.refunded", testStripe.refund(intent));
    await delivered(refunded);
    await delivered(refunded);

    // Reading 3: the one credit she hadn't used goes; the two she wrote with, and the two Idris and Hanna claimed and
    // wrote with, stay.
    assert.deepEqual(await credits(MIRA), { available: 0, used: 2, held: 0 });
    assert.deepEqual(await credits(IDRIS), { available: 0, used: 1, held: 0 });
    assert.deepEqual(await credits(HANNA), { available: 0, used: 1, held: 0 });
    const family = (await q(
      "select c.status, c.user_id, count(*)::int as n from credits c join bundles b on b.id = c.bundle_id where b.purchase_id = $1 group by 1, 2 order by 1, 2",
      [familyPurchaseId],
    )).rows;
    assert.deepEqual(family, [
      { status: "refunded", user_id: MIRA.user, n: 1 },
      { status: "used", user_id: HANNA.user, n: 1 },
      { status: "used", user_id: IDRIS.user, n: 1 },
      { status: "used", user_id: MIRA.user, n: 2 },
    ]);
    assert.deepEqual(await history(MIRA), [
      ["refunded", 1, "Refunded"], ["spent", 1, "Mira Costa & Idris Costa"], ["spent", 1, "Gift to Hanna"], ["spent", 1, "Gift to Idris"],
      ["spent", 1, "Mira Costa"], ["bought", 5, "5 test credits"],
    ]);
    assert.deepEqual(await checkoutState(MIRA, familyPurchaseId), { status: "refunded", item: "family", returnTo: CREDITS_SHEET, credits: 5 });
    // What the used credits wrote stays with the people who read it.
    assert.equal((await readReport(MIRA, miraReportId)).status, "complete");
    assert.equal((await readReport(MIRA, idrisPairId)).status, "complete");
    assert.equal((await readReport(IDRIS, idrisReportId)).status, "complete");
    assert.equal((await readReport(MIRA, hannaReportId)).status, "complete");
  },

  "tomas-report": async () => {
    // Out of credits, Write on the birth form is refused before anything is written, and offers Get credits.
    replies = {};
    const callsBefore = modelCalls.length;
    const refused = await call(MIRA, "POST", "/reports", birthForm(TOMAS_BIRTH, "Madrid", false));
    assert.deepEqual([refused.status, refused.body], [402, NO_CREDIT_TO_WRITE]);
    assert.equal(modelCalls.length, callsBefore);
    assert.equal((await q("select count(*)::int as n from profiles where name = $1", [TOMAS_BIRTH.name])).rows[0].n, 0);

    const started = await checkout(MIRA, "couple", BIRTH_FORM);
    assert.equal(started.amountCents, COUPLE.cents);
    // One Customer for every purchase of hers.
    assert.deepEqual([started.session.customer, testStripe.customers.size], [await customerOf(MIRA), 1]);
    const paid = testStripe.pay(String(started.session.id));
    await delivered(testStripe.event("checkout.session.completed", paid.session));
    assert.deepEqual(await credits(MIRA), { available: 3, used: 2, held: 0 });
    assert.deepEqual(await checkoutState(MIRA, started.purchaseId), { status: "granted", item: "couple", returnTo: BIRTH_FORM, credits: 3 });
    assert.deepEqual((await history(MIRA))[0], ["bought", 3, "3 test credits"]);
    assert.equal(receipts().length, 2);
    assert.ok(receipts()[1].text.includes(`You paid: ${formatEuro(COUPLE.cents)}`), receipts()[1].text);

    // Back on the form as she filled it in, she presses Write again.
    replies = natalTextFor(tomasChart);
    const made = await call(MIRA, "POST", "/reports", birthForm(TOMAS_BIRTH, "Madrid", false));
    assert.equal(made.status, 201, JSON.stringify(made.body));
    zod.CreateReportResponse.parse(made.body);
    const sun = tomasChart.planets.sun;
    assert.deepEqual([made.body.status, made.body.sunSign, made.body.risingSign], ["interpreting", sun.sign, tomasChart.angles!.ascendant.sign]);
    tomasReportId = made.body.id;
    assert.deepEqual(await creditFor(tomasReportId), [{ status: "used", user_id: MIRA.user }]);
    assert.deepEqual(await credits(MIRA), { available: 2, used: 3, held: 0 });
    await written(MIRA, tomasReportId);

    const read = await readReport(MIRA, tomasReportId);
    tomasProfileId = read.profileId;
    assert.deepEqual([read.access, read.status, read.chartData.planets.sun.sign, read.chartData.planets.sun.degree], ["owner", "complete", sun.sign, sun.degree]);
    assert.deepEqual(read.send, { state: "can_send", profileId: tomasProfileId, relationshipId: null, firstName: "Tomás" });
    assert.deepEqual(unanswered, []);
    const profiles = zod.ListProfilesResponse.parse((await call(MIRA, "GET", "/profiles")).body);
    const tomas = profiles.find((p) => p.id === tomasProfileId);
    assert.deepEqual([tomas?.name, tomas?.ownership, tomas?.isSelf], ["Tomás Reyes", "owner", false]);
    const home = await readHome(MIRA);
    const seat = home.people.find((p) => p.profileId === tomasProfileId);
    assert.deepEqual([seat?.reportId, seat?.access, seat?.isSelf], [tomasReportId, "owner", false]);
    // Your first steps stays gone after her first pair, though she adds someone (ADR-330).
    assert.equal(home.firstSteps, null);
    assert.deepEqual((await history(MIRA))[0], ["spent", 1, "Tomás Reyes"]);
  },

  "tomas-pair": async () => {
    const lens = "partners" as const;
    replies = await pairTextFor(lens, undefined, miraReportId, tomasReportId);
    const made = await call(MIRA, "POST", "/compatibility", { reportAId: miraReportId, reportBId: tomasReportId, lens });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    zod.CreateCompatibilityReportResponse.parse(made.body);
    tomasPairId = made.body.id;
    tomasPairRelationshipId = made.body.relationshipId;
    assert.deepEqual(await creditFor(tomasPairId), [{ status: "used", user_id: MIRA.user }]);
    assert.deepEqual(await credits(MIRA), { available: 1, used: 4, held: 0 });
    await written(MIRA, tomasPairId);

    const read = await readReport(MIRA, tomasPairId);
    assert.deepEqual([read.access, read.type, read.lens, read.status], ["owner", "compatibility", lens, "complete"]);
    assert.deepEqual(
      read.participants.map((p: any) => [p.name, p.role, p.reportId, p.isSelf]),
      [["Mira Costa", "primary", miraReportId, true], ["Tomás Reyes", "secondary", tomasReportId, false]],
    );
    const meta = read.interpretation.meta;
    assert.deepEqual(
      [meta.promptVersion, meta.lens, meta.band, meta.names, meta.blind],
      [PAIR_PROMPT_VERSION, lens, null, { a: "Mira Costa", b: "Tomás Reyes" }, false],
    );
    assert.deepEqual(read.send, { state: "can_send", profileId: tomasProfileId, relationshipId: tomasPairRelationshipId, firstName: "Tomás" });
    assert.deepEqual(unanswered, []);
    assert.deepEqual(await history(MIRA), [
      ["spent", 1, "Mira Costa & Tomás Reyes"], ["spent", 1, "Tomás Reyes"], ["bought", 3, "3 test credits"], ["refunded", 1, "Refunded"],
      ["spent", 1, "Mira Costa & Idris Costa"], ["spent", 1, "Gift to Hanna"], ["spent", 1, "Gift to Idris"], ["spent", 1, "Mira Costa"],
      ["bought", 5, "5 test credits"],
    ]);
  },

  "tomas-sends": async () => {
    const mailsBefore = mails.length;
    const sentReport = await call(MIRA, "POST", "/invites", { profileId: tomasProfileId, email: TOMAS_EMAIL });
    assert.equal(sentReport.status, 201, JSON.stringify(sentReport.body));
    zod.CreateInviteResponse.parse(sentReport.body);
    assert.deepEqual([sentReport.body.profileId, sentReport.body.relationshipId, sentReport.body.emailDelivered], [tomasProfileId, null, true]);
    const reportMail = mails.at(-1)!;
    assert.deepEqual([reportMail.to, reportMail.subject], [TOMAS_EMAIL, "Mira shared your report with you"]);
    onOurWeb(reportMail);
    reportToken = tokenOf(reportMail);
    assert.equal(sentReport.body.claimUrl, claimUrlOf(reportToken));

    const sentPair = await call(MIRA, "POST", `/compatibility/${tomasPairId}/send`, { email: TOMAS_EMAIL });
    assert.equal(sentPair.status, 201, JSON.stringify(sentPair.body));
    zod.SendCompatibilityResponse.parse(sentPair.body);
    const invite = sentPair.body.invite;
    assert.deepEqual([sentPair.body.state, invite?.profileId, invite?.relationshipId, invite?.emailDelivered], ["invited", tomasProfileId, tomasPairRelationshipId, true]);
    const pairMail = mails.at(-1)!;
    assert.deepEqual([pairMail.to, pairMail.subject], [TOMAS_EMAIL, "Mira shared a Compatibility report with you"]);
    assert.ok(pairMail.text.includes("Mira & Tomás"), `the pair email does not name the two: ${pairMail.text}`);
    onOurWeb(pairMail);
    pairToken = tokenOf(pairMail);
    assert.equal(invite?.claimUrl, claimUrlOf(pairToken));
    assert.equal(mails.length - mailsBefore, 2);

    const listed = await listReports(MIRA);
    assert.deepEqual([listed.get(tomasReportId).send.state, listed.get(tomasPairId).send.state], ["sent", "sent"]);
  },

  "tomas-claims": async () => {
    const reportLink = await preview(TOMAS_SIGNED_OUT, reportToken);
    assert.deepEqual([reportLink.kind, reportLink.inviterName, reportLink.profileName, reportLink.relationshipId], ["send", "Mira", "Tomás Reyes", null]);
    const pairLink = await preview(TOMAS_SIGNED_OUT, pairToken);
    assert.deepEqual([pairLink.kind, pairLink.inviterName, pairLink.relationshipId, pairLink.relationshipReportId], ["send", "Mira", tomasPairRelationshipId, tomasPairId]);
    assert.equal((await call(TOMAS_SIGNED_OUT, "POST", claimPath(reportToken))).status, 401);

    await signIn(TOMAS, TOMAS_EMAIL);
    assert.deepEqual(await claim(TOMAS, reportToken), {
      profileId: tomasProfileId, relationshipId: null, relationshipReportId: null, redirectTo: `/report/${tomasReportId}`, kind: "send", askSelf: false,
    });
    const report = await readReport(TOMAS, tomasReportId);
    assert.deepEqual([report.access, report.giverName, report.send, report.chartData.planets.sun.sign], ["claimed", "Mira", null, tomasChart.planets.sun.sign]);
    assert.deepEqual(report.interpretation, (await readReport(MIRA, tomasReportId)).interpretation, "the text Tomás reads is not the text Mira wrote");

    assert.deepEqual(await claim(TOMAS, pairToken), {
      profileId: tomasProfileId, relationshipId: tomasPairRelationshipId, relationshipReportId: tomasPairId, redirectTo: `/compatibility/${tomasPairId}`, kind: "send", askSelf: false,
    });
    const pair = await readReport(TOMAS, tomasPairId);
    assert.deepEqual([pair.access, pair.giverName, pair.status], ["participant", "Mira", "complete"]);
    assert.deepEqual(pair.participants.map((p: any) => [p.name, p.isSelf]), [["Mira Costa", false], ["Tomás Reyes", true]]);
    assert.deepEqual(pair.interpretation, (await readReport(MIRA, tomasPairId)).interpretation, "the pair Tomás reads is not the pair Mira wrote");
    assert.equal((await call(TOMAS, "GET", `/compatibility/${tomasPairId}/summary`)).status, 200);

    const home = await readHome(TOMAS);
    assert.deepEqual([home.you?.profileId, home.you?.reportId, home.you?.access, home.you?.isSelf], [tomasProfileId, tomasReportId, "claimed", true]);
    assert.deepEqual(home.pairs.map((p) => p.reportId), [tomasPairId]);
    const listed = await listReports(MIRA);
    assert.deepEqual([listed.get(tomasReportId).send.state, listed.get(tomasPairId).send.state], ["joined", "joined"]);
  },

  timeline: async () => {
    assert.deepEqual(await timelineAccess(MIRA), TIMELINE_CLOSED);
    assert.ok(((await readHome(MIRA)).teaser?.cycles.length ?? 0) > 0, "Mira's home has no teaser to start Timeline from");
    // Without the plan the setup is shut as the views are: signed out 401, no plan 403, and nothing queued by asking.
    for (const [method, path] of [["GET", "/timeline/setup"], ["POST", "/timeline/setup"]] as const) {
      assert.equal((await call(MIRA_SIGNED_OUT, method, path)).status, 401, `${method} ${path} signed out`);
      const shut = await call(MIRA, method, path);
      assert.deepEqual([shut.status, shut.body.error, shut.body.message], [403, "no_timeline", NO_TIMELINE_LINE], `${method} ${path}`);
    }
    assert.equal((await q("select count(*)::int as n from jobs where kind like 'timeline.%'")).rows[0].n, 0);

    // Start Timeline on the teaser: the plan's own box, and the yearly price.
    await unticked(MIRA, "timeline_year", TEASER);
    const started = await checkout(MIRA, "timeline_year", TEASER);
    assert.equal(started.amountCents, YEARLY.cents);
    assert.equal(started.row.tick_hash, sha256(PLAN_TICK));
    assert.deepEqual([started.session.mode, started.session.customer], ["subscription", await customerOf(MIRA)]);
    assert.equal(testStripe.prices.get(String(started.session.line_price))?.lookup_key, YEARLY.lookupKey);

    // Stripe makes the subscription and pays its first invoice, whose payment the webhook reads from Stripe.
    const paid = testStripe.pay(String(started.session.id));
    const subscription = paid.subscription as Json;
    timelinePlan = String(subscription.id);
    await delivered(testStripe.event("customer.subscription.created", subscription));
    await delivered(testStripe.event("invoice.paid", paid.invoice as Json));
    await delivered(testStripe.event("checkout.session.completed", paid.session));
    assert.ok(testStripe.calls.some((c) => c.method === "GET" && c.path === "/v1/invoice_payments"), "the first invoice's payment was never read");

    const opened = await timelineAccess(MIRA);
    assert.deepEqual(
      [opened.access, opened.source, opened.hasPersonalReport, opened.plan],
      [true, "subscription", true, { item: "timeline_year", status: "active", renewsOn: brusselsDay(periodEnd(subscription)), endsOn: null }],
    );
    assert.ok(opened.ask, "Ask's count is missing with access");
    const week = await call(MIRA, "GET", "/timeline/now?range=week");
    assert.equal(week.status, 200, JSON.stringify(week.body));
    zod.GetTimelineNowResponse.parse(week.body);
    const home = await readHome(MIRA);
    assert.ok(home.week && home.teaser === undefined, "Mira's home still shows the teaser with Timeline");
    // The yearly plan comes with a credit to give (ADR-277).
    assert.deepEqual(await credits(MIRA), { available: 2, used: 4, held: 0 });
    assert.deepEqual((await history(MIRA))[0], ["granted", 1, "With Timeline"]);
    assert.deepEqual(await checkoutState(MIRA, started.purchaseId), { status: "granted", item: "timeline_year", returnTo: TEASER, credits: null });
    // Our receipt on the first payment (reading 7).
    assert.equal(receipts().length, 3);
    const receipt = receipts()[2];
    for (const line of ["You bought: Timeline, paid each year", "It comes with 1 credit.", renewalLine(YEARLY), `You paid: ${formatEuro(YEARLY.cents)}`, PLAN_TICK]) {
      assert.ok(receipt.text.includes(line), `the plan's receipt lacks "${line}": ${receipt.text}`);
    }
    onOurWeb(receipt);
    // A subscriber has nothing more to buy, and the Account page's buttons open Stripe's Portal on her own Customer.
    const again = await call(MIRA, "POST", "/checkout", { item: "timeline_month", ticked: true, returnTo: ACCOUNT_PAGE });
    assert.deepEqual([again.status, again.body.error], [409, "already_subscribed"]);
    const portal = await call(MIRA, "POST", "/billing/portal", { returnTo: ACCOUNT_PAGE });
    assert.equal(portal.status, 200, JSON.stringify(portal.body));
    assert.match(zod.OpenBillingPortalResponse.parse(portal.body).url, /^https:\/\/billing\.stripe\.com\//);
    const portalCall = testStripe.calls.filter((c) => c.path === "/v1/billing_portal/sessions").at(-1);
    assert.deepEqual([portalCall?.params.customer, portalCall?.params.return_url], [await customerOf(MIRA), `${OUR_PAGE}${ACCOUNT_PAGE}`]);

    // A year on, Stripe renews it: the year is paid, and with it another credit to give; our receipt was the first one's.
    const renewed = testStripe.renew(timelinePlan);
    await delivered(testStripe.event("invoice.paid", renewed.invoice));
    await delivered(testStripe.event("customer.subscription.updated", renewed.subscription));
    assert.ok(periodEnd(renewed.subscription) > periodEnd(subscription));
    assert.deepEqual((await timelineAccess(MIRA)).plan, { item: "timeline_year", status: "active", renewsOn: brusselsDay(periodEnd(renewed.subscription)), endsOn: null });
    assert.deepEqual(await credits(MIRA), { available: 3, used: 4, held: 0 });
    assert.deepEqual((await history(MIRA)).slice(0, 2), [["granted", 1, "With Timeline"], ["granted", 1, "With Timeline"]]);
    assert.equal(receipts().length, 3);
  },

  // The webhook started the setup as it kept the first payment (ADR-362). The screen she lands on reads it, the queue
  // writes it, and every list is held against the engine's own for her chart, worked out here (reading 8).
  "timeline-setup": async () => {
    const zone = MIRA_BIRTH.timezone;
    const today = dayIn(new Date(), zone);
    const from = mondayOf(today);
    const to = addDays(today, 182);
    const engine = engineReadings(miraChart, zone, from, to);
    const all = new Set([...engine.week, ...engine.month, ...engine.months, ...engine.cycles]);
    const counts = [
      ["chart", null], ["planets", null], ["week", engine.week.size], ["month", engine.month.size], ["months", engine.months.size],
      ["cycles", engine.cycles.length],
    ];

    // Writing: the chart and the planets tick at once, and each step counts what the engine lists for its days.
    const writing = await timelineSetup(MIRA, zone);
    assert.deepEqual([writing.state, writing.from, writing.to, writing.replay], ["writing", from, to, null]);
    assert.deepEqual(writing.steps.map((step) => [step.id, step.count]), counts);
    assert.deepEqual(writing.steps.slice(0, 2).map((step) => step.done), [true, true]);
    // One job a reading, nothing written yet, and the next six months' job a week before these end (reading 9).
    const queued = (await q(
      "select payload->>'key' as key from jobs where kind = 'timeline.reading' and status = 'queued' and payload->>'profileId' = $1",
      [miraProfileId],
    )).rows.map((row) => String(row.key));
    assert.deepEqual(queued.sort(), [...all].sort());
    assert.equal((await q("select count(*)::int as n from timeline_readings where profile_id = $1", [miraProfileId])).rows[0].n, 0);
    const ahead = (await q("select run_at from jobs where kind = 'timeline.ahead' and payload->>'userId' = $1", [MIRA.user])).rows;
    assert.deepEqual(ahead.map((row) => (row.run_at as Date).getTime()), [dayStart(addDays(to, -7), zone).getTime()]);
    // A payment whose webhook missed leaves no setup: the screen reads none, and its catch-up starts it, once (ADR-362).
    await q("delete from timeline_setups where user_id = $1", [MIRA.user]);
    const missed = await timelineSetup(MIRA, zone);
    assert.deepEqual([missed.state, missed.from, missed.to, missed.replay], ["none", null, null, null]);
    assert.deepEqual(missed.steps.map((step) => [step.id, step.done, step.count]), STEPS_NOT_STARTED);
    const started = await call(MIRA, "POST", `/timeline/setup?tz=${encodeURIComponent(zone)}`);
    assert.equal(started.status, 202, JSON.stringify(started.body));
    assert.deepEqual(zod.StartTimelineSetupResponse.parse(started.body), writing);
    assert.equal(await readingJobsLeft(), all.size, "the catch-up queued no reading twice");
    // The screen's catch-up finds it started and queues nothing twice.
    const caughtUp = await call(MIRA, "POST", `/timeline/setup?tz=${encodeURIComponent(zone)}`);
    assert.equal(caughtUp.status, 202, JSON.stringify(caughtUp.body));
    assert.deepEqual(zod.StartTimelineSetupResponse.parse(caughtUp.body), writing);
    assert.equal(await readingJobsLeft(), all.size);

    replies = { timeline_reading: READING };
    const callsBefore = modelCalls.length;
    assert.equal(await drained(), all.size, "one job ran for each reading");
    assert.equal(modelCalls.length - callsBefore, all.size, "each reading was written once");
    assert.deepEqual(unanswered, []);
    const kept = (await q("select event_key, status from timeline_readings where profile_id = $1", [miraProfileId])).rows;
    assert.deepEqual(kept.map((row) => String(row.event_key)).sort(), [...all].sort());
    assert.deepEqual(kept.filter((row) => row.status !== "ready").map((row) => row.event_key), []);
    const ready = await timelineSetup(MIRA, zone);
    assert.deepEqual([ready.state, ready.from, ready.to, ready.replay], ["ready", from, to, null]);
    assert.deepEqual(ready.steps.map((step) => [step.id, step.count]), counts);
    assert.deepEqual(ready.steps.filter((step) => !step.done).map((step) => step.id), []);

    // Once it is set up, an open writes nothing and waits for nothing (reading 11): her week's cards and Life's carry
    // their kept lines, and each card opens on its kept reading without a call to the model.
    replies = {};
    const callsAfter = modelCalls.length;
    const week = await call(MIRA, "GET", `/timeline/now?range=week&tz=${encodeURIComponent(zone)}`);
    assert.equal(week.status, 200, JSON.stringify(week.body));
    const events = zod.GetTimelineNowResponse.parse(week.body).events;
    for (const event of events) {
      assert.deepEqual([event.reading, event.line], all.has(event.key) ? ["ready", READING.line] : ["none", null], event.key);
    }
    const life = await call(MIRA, "GET", `/timeline/life?tz=${encodeURIComponent(zone)}`);
    assert.equal(life.status, 200, JSON.stringify(life.body));
    const cycles = zod.GetTimelineLifeResponse.parse(life.body).cycles;
    assert.deepEqual(cycles.map((cycle) => cycle.key).sort(), [...engine.cycles].sort());
    assert.deepEqual(cycles.filter((cycle) => cycle.reading !== "ready").map((cycle) => cycle.key), []);
    const cards = [...events.filter((event) => event.reading === "ready").map((event) => event.key), cycles[0].key];
    for (const key of cards) {
      const opened = await call(MIRA, "POST", `/timeline/readings/${encodeURIComponent(key)}`, {});
      assert.equal(opened.status, 200, `${key}: ${JSON.stringify(opened.body)}`);
      const card = zod.OpenTimelineReadingResponse.parse(opened.body);
      assert.deepEqual([card.status, card.reading?.key, card.reading?.line], ["ready", key, READING.line], key);
    }
    assert.equal(modelCalls.length, callsAfter, `opening ${cards.length} cards called the model`);
    assert.equal(await readingJobsLeft(), 0, "an open queued a reading");

    // A new prompt version leaves every kept reading stale (reading 10): a card opened meanwhile answers its kept text and
    // writes nothing, her open of Timeline queues one refresh each, once, and the queue writes each again once.
    await q(
      "update timeline_readings set basis = 'before|' || basis, reading = jsonb_set(reading, '{of}', '\"before\"') where profile_id = $1",
      [miraProfileId],
    );
    const stale = await call(MIRA, "POST", `/timeline/readings/${encodeURIComponent(cards[0])}`, {});
    assert.equal(stale.status, 200, JSON.stringify(stale.body));
    assert.deepEqual([stale.body.status, stale.body.reading?.line], ["ready", READING.line], "the kept text answers meanwhile");
    assert.equal(modelCalls.length, callsAfter, "a stale card's open called the model");
    assert.equal(await readingJobsLeft(), 0, "a card's open queued a refresh");
    const refreshJobs = async () => Number((await q("select count(*) as n from jobs where kind = 'timeline.refresh' and status = 'queued'")).rows[0].n);
    assert.equal((await timelineSetup(MIRA, zone)).state, "ready", "stale readings leave a setup ready");
    assert.equal(await refreshJobs(), all.size, "her open queued one refresh for each kept reading");
    await timelineSetup(MIRA, zone);
    assert.equal(await refreshJobs(), all.size, "a second open queued none more");
    replies = { timeline_reading: REWRITE };
    assert.equal(await drained(), all.size, "one refresh ran for each reading");
    assert.equal(modelCalls.length - callsAfter, all.size, "each reading was written again once");
    const rewritten = (await q("select basis, reading->>'line' as line from timeline_readings where profile_id = $1", [miraProfileId])).rows;
    assert.deepEqual([rewritten.length, rewritten.filter((row) => row.line !== REWRITE.line || String(row.basis).startsWith("before|"))], [all.size, []]);
    await timelineSetup(MIRA, zone);
    assert.equal(await refreshJobs(), 0, "nothing stale is left to queue");
    replies = {};
  },

  "timeline-ends": async () => {
    const renewing = (await timelineAccess(MIRA)).plan;
    // She cancels in the Portal: Timeline stays to the end of the year she paid for, then closes.
    const cancelled = testStripe.cancelAtPeriodEnd(timelinePlan);
    await delivered(testStripe.event("customer.subscription.updated", cancelled));
    const ending = await timelineAccess(MIRA);
    assert.deepEqual(
      [ending.access, ending.plan],
      [true, { item: "timeline_year", status: "active", renewsOn: null, endsOn: brusselsDay(periodEnd(cancelled)) }],
    );
    assert.equal(ending.plan?.endsOn, renewing?.renewsOn, "it ends on the day it would have renewed");
    await delivered(testStripe.event("customer.subscription.deleted", testStripe.end(timelinePlan)));
    assert.deepEqual(await timelineAccess(MIRA), TIMELINE_CLOSED);
    const shut = await call(MIRA, "GET", "/timeline/now?range=week");
    assert.deepEqual([shut.status, shut.body.error, shut.body.message], [403, "no_timeline", NO_TIMELINE_LINE]);
    const after = await readHome(MIRA);
    assert.ok(after.week === undefined && (after.teaser?.cycles.length ?? 0) > 0, "Mira's home lost the teaser after Timeline closed");
    assert.deepEqual(await credits(MIRA), { available: 3, used: 4, held: 0 });

    // Idris never started it: his home keeps the teaser, and he has nothing at Stripe to manage.
    assert.deepEqual(await timelineAccess(IDRIS), TIMELINE_CLOSED);
    const his = await call(IDRIS, "GET", "/timeline/now?range=week");
    assert.deepEqual([his.status, his.body.error, his.body.message], [403, "no_timeline", NO_TIMELINE_LINE]);
    const idrisHome = await readHome(IDRIS);
    assert.ok(idrisHome.week === undefined && (idrisHome.teaser?.cycles.length ?? 0) > 0, `Idris's home has no teaser: ${JSON.stringify(idrisHome.teaser ?? null)}`);
    const nothing = await call(IDRIS, "POST", "/billing/portal", { returnTo: ACCOUNT_PAGE });
    assert.deepEqual([nothing.status, nothing.body.error], [409, "no_customer"]);
    assert.equal(testStripe.customers.size, 1);
  },
};

const unlisted = mapProblem(WALK, STEP_IDS);
if (unlisted) {
  console.error(`buyer walk: ${unlisted}`);
  process.exit(1);
}

const walkStarted = Date.now();
let setupError: unknown = null;
try {
  await q(
    "truncate table users, profiles, reports, relationships, relationship_participants, invite_tokens, bundles, credits, report_revisions, spend_ledger, profile_shares, report_workbooks, generation_failures, timeline_readings, timeline_setups, jobs, ask_messages, purchases, stripe_events, subscriptions, campaigns, testers, qa_walks cascade",
  );
  // As each start does, after its listen (reading 14): checkout says it isn't ready until the sync has found the catalogue.
  const synced = await syncProductsOnStart();
  if (synced.problem !== null) throw new Error(`the Stripe sync: ${synced.problem}`);

  for (const listed of STEPS) await step(listed, WALK[listed.id]);
} catch (err) {
  setupError = err;
} finally {
  server.close();
  mailStub.close();
  modelStub.close();
  await testStripe.close();
  await pool.end();
}

if (setupError) {
  console.error("buyer walk: could not finish setup —", setupError);
  process.exit(1);
}

const seconds = ((Date.now() - walkStarted) / 1000).toFixed(1);
const passed = failedAt ? failedAt - 1 : stepNo;
console.log(
  `\nbuyer walk: ${passed}/${STEPS.length} steps passed in ${seconds} s; ${mails.length} stub emails, ${modelCalls.length} stand-in model calls, ${testStripe.calls.length} stand-in Stripe calls.`,
);
process.exit(failedAt ? 1 : 0);
