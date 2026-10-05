// The buyer walk (ADR-273): the Owner's critical flow with two accounts, end to end on a scratch Postgres. Ana buys
// test credits, writes her Personal report and gifts one to her mother Rosa; Rosa claims it and writes hers; the two
// share their reports both ways, and Ana writes a parent and child report for them. Timeline stays the admin's until
// billing (MB-197).
// No Clerk, no network, no OpenAI. A header stands where the sign-in is, mail goes to a local stub, and the model client
// is pointed at a local stand-in that answers each call with canned text that passes the checks, so both Personal
// reports and the pair go through the real routes and are written as they are on staging. The charts are computed from
// two committed fixtures, the lab's grown parent and child pair (William's and Charles's published births), under the
// names Ana and Rosa.
//
// `pnpm --filter @workspace/api-server exec tsx src/walk/buyer.walk.ts` runs it against `WALK_DATABASE_URL`; without
// it, it skips. CI runs it after the unit tests. Its first statement truncates every table it touches, so a second run
// starts where the first did. Each step stands on the ones before it, so the first that fails stops the walk.

if (!process.env.WALK_DATABASE_URL) {
  console.log("buyer walk: skipped (no WALK_DATABASE_URL)");
  process.exit(0);
}
process.env.DATABASE_URL = process.env.WALK_DATABASE_URL;
process.env.OPENAI_API_KEY ||= "sk-dummy-walk-never-sent";
// A first name or an address with nothing behind it here is asked of Clerk (names.ts, invites.ts); without a key, Clerk
// refuses before it sends anything, whatever key the shell holds.
delete process.env.CLERK_SECRET_KEY;
// Timeline is the admin's alone until billing (MB-197), and neither buyer may be the admin, whoever the shell names.
delete process.env.ADMIN_USER_ID;
// Staging, where the Owner walks this flow: production refuses the test checkout (ADR-138).
process.env.APP_ENV = "staging";
// The breaker at its default, far above the cents the stand-in's usage is priced at, whatever cap the shell sets.
delete process.env.DAILY_SPEND_CAP_USD;
// Only errors reach the log, so what the walk prints is its steps.
process.env.LOG_LEVEL ??= "error";

import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import express, { type NextFunction, type Request, type Response } from "express";

type Viewer = { user: string | null; session: string };
type Mail = { to: string; subject: string; text: string; html: string };
type Chart = import("../lib/chartCalculation.js").NatalChartData;
type ReportInterpretation = import("../lib/aiInterpretation.js").ReportInterpretation;
type Fixture = { birthDate: string; birthTime: string; latitude: number; longitude: number; timezoneOffset: number; timezone?: string };

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "charts");
const fixture = (name: string): Fixture => JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8"));

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
  req.on("end", () => {
    const schema = schemaOf(body);
    modelCalls.push(schema);
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

// Every link in an email starts at the configured web app.
const OUR_PAGE = "https://starsdecoded-staging.vercel.app";
process.env.PUBLIC_APP_URL = OUR_PAGE;

// Deferred past the env writes above: @workspace/db throws at import unless DATABASE_URL is set, and the mailer, the
// logger and the model client read theirs when they are made.
const { pool } = await import("@workspace/db");
const zod = await import("@workspace/api-zod");
const { chartForProfile } = await import("../lib/profiles.js");
const { PROMPT_VERSION } = await import("../lib/aiInterpretation.js");
const { PAIR_PROMPT_VERSION } = await import("../prompts/pair/index.js");
const { buildPairBrief } = await import("../lib/pairBrief.js");
const { NO_TIMELINE_LINE } = await import("../lib/timelineAccess.js");
const { logger } = await import("../lib/logger.js");
const { apiHeaders, originGuard, webOrigins } = await import("../middlewares/origin.js");
const { default: router } = await import("../routes/index.js");
// The canned text is the unit tests' own, which they keep passing the checks as the prompts change. Loading
// testModel.ts also keeps the checks' log in memory, so the walk writes no generation_failures row.
const { cannedNatalReplies } = await import("../lib/testModel.js");
const { pairReplies } = await import("../lib/testPair.js");

const q = (sql: string, params: unknown[] = []) => pool.query(sql, params);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// app.ts's order, with a stub where the cookie and Clerk middleware stand, as loop.walk.ts mounts it.
const app = express();
app.use(apiHeaders());
app.use(originGuard(webOrigins({})));
app.use(express.json({ limit: "32kb" }));
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = req.header("x-session") || "s-none";
  req.log = logger;
  next();
});
app.use("/api", router);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.on("listening", () => resolve()));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

async function call(who: Viewer, method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { "x-session": who.session, "content-type": "application/json" };
  if (who.user) headers["x-user"] = who.user;
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  const json = res.headers.get("content-type")?.includes("application/json");
  return { status: res.status, body: text && json ? JSON.parse(text) : text || null };
}

const EMPTY_HOME = { you: null, several: false, people: [], pairs: [], practising: [] };
const NO_CREDITS = { available: 0, used: 0, held: 0 };
const tokenOf = (m: Mail) => decodeURIComponent(/claim\?token=([^\s"&]+)/.exec(m.text)![1]);
const claimPath = (token: string) => `/invites/${encodeURIComponent(token)}/claim`;
const previewPath = (token: string) => `/invites/${encodeURIComponent(token)}`;
const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
const creditRow = async (id: string) =>
  (await q("select status, user_id, used_for_report_id from credits where id = $1", [id])).rows[0];

// A pair's aspect card stores `of: "none"`, as the pair's link schema asks of the model, where the contract's PairLink
// lists only A and B; with that one field set aside, every report read here is held to the contract.
// MB-224 provisional
function asContracted<T>(body: T): T {
  const copy = structuredClone(body) as { interpretation?: { links?: { links?: Array<{ of?: string }> } } | null };
  for (const card of copy.interpretation?.links?.links ?? []) if (card.of === "none") delete card.of;
  return copy as T;
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
  zod.GetReportResponse.parse(asContracted(r.body));
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

/** Polls until `done` holds, so a step can wait on work a route finishes after it answers. */
async function until<T>(what: string, read: () => Promise<T>, done: (value: T) => boolean, ms = 5000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const value = await read();
    if (done(value)) return value;
    if (Date.now() > end) throw new Error(`${what}: still ${JSON.stringify(value)} after ${ms} ms`);
    await sleep(25);
  }
}

/** A report is written after POST answers, so the step waits on its status as the page does. */
async function written(who: Viewer, reportId: string): Promise<void> {
  const end = Date.now() + 30_000;
  for (;;) {
    const r = await call(who, "GET", `/reports/${reportId}/status`);
    assert.equal(r.status, 200, `the status of ${reportId}: ${r.status} ${JSON.stringify(r.body)}`);
    if (r.body.status === "complete") {
      zod.GetReportStatusResponse.parse(asContracted(r.body));
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

/** What the birth form posts for the reader's own chart (BirthFormPage). */
function ownBirth(name: string, f: Fixture) {
  return {
    name,
    birthDate: f.birthDate,
    birthTime: f.birthTime,
    birthTimeWindowMinutes: 0,
    birthPlace: "London",
    latitude: f.latitude,
    longitude: f.longitude,
    timezoneOffset: f.timezoneOffset,
    timezone: f.timezone,
    isForSelf: true,
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

let stepNo = 0;
let failedAt = 0;
async function step(label: string, fn: () => Promise<void>): Promise<void> {
  stepNo++;
  if (failedAt) {
    console.log(`-- ${stepNo} ${label} (not run)`);
    return;
  }
  try {
    await fn();
    console.log(`ok ${stepNo} ${label}`);
  } catch (err) {
    failedAt = stepNo;
    console.log(`FAIL ${stepNo} ${label}${lineOf(err)}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// One browser each, so a reader's session is the same before and after she signs in.
const ANA_SIGNED_OUT: Viewer = { user: null, session: "s-ana" };
const ANA: Viewer = { user: "user_ana", session: ANA_SIGNED_OUT.session };
const ROSA_SIGNED_OUT: Viewer = { user: null, session: "s-rosa" };
const ROSA: Viewer = { user: "user_rosa", session: ROSA_SIGNED_OUT.session };
const ANA_EMAIL = "ana@example.com";
const ROSA_EMAIL = "rosa@example.com";
const GIFT_NOTE = "Happy birthday, Mum.";
const ANA_BIRTH = fixture("william");
const ROSA_BIRTH = fixture("charles");
const anaChart = chartForProfile({ ...ANA_BIRTH, birthTimeWindowMinutes: 0 });
const rosaChart = chartForProfile({ ...ROSA_BIRTH, birthTimeWindowMinutes: 0 });

const started = Date.now();
let setupError: unknown = null;
try {
  await q(
    "truncate table users, profiles, reports, relationships, relationship_participants, invite_tokens, bundles, credits, report_revisions, spend_ledger, profile_shares, report_workbooks, generation_failures, timeline_readings, ask_messages cascade",
  );

  let anaProfileId = "";
  let anaReportId = "";
  let rosaProfileId = "";
  let rosaReportId = "";
  let giftId = "";
  let giftCreditId = "";
  let giftToken = "";
  let pairId = "";

  await step("Ana arrives signed out, then signs in to an empty account", async () => {
    assert.deepEqual(await readHome(ANA_SIGNED_OUT), EMPTY_HOME);
    assert.deepEqual(await credits(ANA_SIGNED_OUT), NO_CREDITS);
    const buy = await call(ANA_SIGNED_OUT, "POST", "/checkout/test", { count: 3 });
    assert.deepEqual([buy.status, buy.body.error], [401, "unauthorized"]);
    assert.equal((await call(ANA_SIGNED_OUT, "GET", "/timeline/access")).status, 401);
    // The sky screen keeps her birth data in the browser until she signs in, and the birth form needs an account
    // (ADR-140), so a signed-out visit leaves nothing in the API for her account to claim.
    const kept = await q("select (select count(*) from profiles where session_id = $1) + (select count(*) from reports where session_id = $1) as n", [ANA.session]);
    assert.equal(Number(kept.rows[0].n), 0);

    await signIn(ANA, ANA_EMAIL);
    assert.deepEqual(await readHome(ANA), EMPTY_HOME);
    assert.deepEqual(await credits(ANA), NO_CREDITS);
    assert.deepEqual((await call(ANA, "GET", "/profiles")).body, []);
    assert.equal((await listReports(ANA)).size, 0);
  });

  await step("Ana buys 3 test credits and her balance shows them", async () => {
    const bought = await call(ANA, "POST", "/checkout/test", { count: 3 });
    assert.equal(bought.status, 201, JSON.stringify(bought.body));
    const balance = zod.TestCheckoutResponse.parse(bought.body);
    assert.deepEqual([balance.available, balance.used, balance.held, balance.lastBundle?.count], [3, 0, 0, 3]);
    assert.deepEqual(await credits(ANA), { available: 3, used: 0, held: 0 });
    const rows = (await q("select count(*)::int as n, count(*) filter (where is_test)::int as test from credits where user_id = $1", [ANA.user])).rows[0];
    assert.deepEqual(rows, { n: 3, test: 3 });
    assert.deepEqual(await history(ANA), [["bought", 3, "3 test credits"]]);
  });

  await step("Ana writes her Personal report and reads it; one credit is spent", async () => {
    replies = natalTextFor(anaChart);
    const made = await call(ANA, "POST", "/reports", ownBirth("Ana", ANA_BIRTH));
    assert.equal(made.status, 201, JSON.stringify(made.body));
    zod.CreateReportResponse.parse(made.body);
    const sun = anaChart.planets.sun;
    assert.deepEqual([made.body.status, made.body.sunSign, made.body.risingSign], ["interpreting", sun.sign, anaChart.angles!.ascendant.sign]);
    anaReportId = made.body.id;
    await written(ANA, anaReportId);

    const read = await readReport(ANA, anaReportId);
    assert.deepEqual([read.access, read.type, read.status, read.send, read.giverName], ["owner", "natal", "complete", null, null]);
    anaProfileId = read.profileId;
    assert.deepEqual([read.chartData.planets.sun.sign, read.chartData.planets.sun.degree], [sun.sign, sun.degree]);
    assert.deepEqual([read.interpretation.meta.promptVersion, read.interpretation.meta.horizon], [PROMPT_VERSION, "known"]);
    // The evidence under a claim is drawn from the chart in code, never from the model's words.
    assert.equal(read.interpretation.triad.claims[0].evidence[0].label, `Sun ${sun.degree.toFixed(1)}° ${sun.sign}, ${ordinal(sun.house!)} house`);
    assert.deepEqual(unanswered, []);

    const home = await readHome(ANA);
    assert.deepEqual([home.you?.profileId, home.you?.reportId, home.you?.access, home.you?.isSelf], [anaProfileId, anaReportId, "owner", true]);
    assert.deepEqual(home.you?.triad?.sun, { sign: sun.sign, degree: sun.degree, house: sun.house });

    // MB-49 provisional: the soft pass spends the credit after POST answers and refuses no one, so the step waits for
    // the ledger and reads what it wrote; nothing here proves a report needs a credit.
    assert.deepEqual(await until("Ana's credit is spent", () => credits(ANA), (c) => c.used === 1), { available: 2, used: 1, held: 0 });
    assert.deepEqual((await q("select used_for_report_id from credits where user_id = $1 and status = 'used'", [ANA.user])).rows, [{ used_for_report_id: anaReportId }]);
    assert.deepEqual(await history(ANA), [["spent", 1, "Ana"], ["bought", 3, "3 test credits"]]);
  });

  await step("Ana gifts a report to her mother Rosa; the email goes out and one credit is held", async () => {
    const sent = await call(ANA, "POST", "/gifts", { recipientName: "Rosa", email: ROSA_EMAIL, note: GIFT_NOTE });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    zod.CreateGiftResponse.parse(sent.body);
    assert.deepEqual([sent.body.state, sent.body.creditHeld, sent.body.emailDelivered], ["waiting", true, true]);
    giftId = sent.body.id;

    const mail = mails.at(-1)!;
    assert.deepEqual([mails.length, mail.to, mail.subject], [1, ROSA_EMAIL, "Ana gave you a Personal report"]);
    assert.ok(mail.text.includes(GIFT_NOTE), `the gift email lacks the note: ${mail.text}`);
    onOurWeb(mail);
    giftToken = tokenOf(mail);
    assert.equal(sent.body.claimUrl, `${OUR_PAGE}/claim?token=${encodeURIComponent(giftToken)}`);

    giftCreditId = (await q("select credit_id from invite_tokens where id = $1", [giftId])).rows[0].credit_id;
    assert.deepEqual(await creditRow(giftCreditId), { status: "held", user_id: ANA.user, used_for_report_id: null });
    assert.deepEqual(await credits(ANA), { available: 1, used: 1, held: 1 });
    assert.deepEqual(await gifts(ANA), [[giftId, "Rosa", ROSA_EMAIL, "waiting", true]]);
  });

  await step("Rosa signs up and claims the gift from her email; the credit moves to her", async () => {
    const preview = await call(ROSA_SIGNED_OUT, "GET", previewPath(giftToken));
    assert.equal(preview.status, 200, JSON.stringify(preview.body));
    zod.GetInviteResponse.parse(preview.body);
    assert.deepEqual(
      [preview.body.kind, preview.body.inviterName, preview.body.recipientName, preview.body.note, preview.body.alreadyClaimed],
      ["gift", "Ana", "Rosa", GIFT_NOTE, false],
    );
    assert.equal((await call(ROSA_SIGNED_OUT, "POST", claimPath(giftToken))).status, 401);

    await signIn(ROSA, ROSA_EMAIL);
    const claim = await call(ROSA, "POST", claimPath(giftToken));
    assert.equal(claim.status, 200, JSON.stringify(claim.body));
    zod.ClaimInviteResponse.parse(claim.body);
    assert.deepEqual([claim.body.kind, claim.body.redirectTo], ["gift", "/dashboard"]);

    assert.deepEqual(await creditRow(giftCreditId), { status: "available", user_id: ROSA.user, used_for_report_id: null });
    assert.deepEqual(await credits(ROSA), { available: 1, used: 0, held: 0 });
    assert.deepEqual(await history(ROSA), [["gift", 1, "A gift from Ana"]]);
    assert.deepEqual(await credits(ANA), { available: 1, used: 1, held: 0 });
    assert.deepEqual(await gifts(ANA), [[giftId, "Rosa", ROSA_EMAIL, "claimed", false]]);
    assert.deepEqual(await history(ANA), [["spent", 1, "Gift to Rosa"], ["spent", 1, "Ana"], ["bought", 3, "3 test credits"]]);
  });

  await step("Rosa writes her Personal report with the gifted credit", async () => {
    replies = natalTextFor(rosaChart);
    const made = await call(ROSA, "POST", "/reports", ownBirth("Rosa", ROSA_BIRTH));
    assert.equal(made.status, 201, JSON.stringify(made.body));
    zod.CreateReportResponse.parse(made.body);
    rosaReportId = made.body.id;
    await written(ROSA, rosaReportId);

    const read = await readReport(ROSA, rosaReportId);
    const sun = rosaChart.planets.sun;
    assert.deepEqual([read.access, read.status, read.chartData.planets.sun.sign, read.chartData.planets.sun.degree], ["owner", "complete", sun.sign, sun.degree]);
    rosaProfileId = read.profileId;
    assert.deepEqual(unanswered, []);
    assert.deepEqual((await readHome(ROSA)).you?.reportId, rosaReportId);

    // MB-49 provisional: as for Ana's, the soft pass's record of the spend.
    assert.deepEqual(await until("Rosa's gifted credit is spent", () => credits(ROSA), (c) => c.used === 1), { available: 0, used: 1, held: 0 });
    assert.deepEqual(await creditRow(giftCreditId), { status: "used", user_id: ROSA.user, used_for_report_id: rosaReportId });
    assert.deepEqual(await history(ROSA), [["spent", 1, "Rosa"], ["gift", 1, "A gift from Ana"]]);
  });

  await step("Ana shares her report with Rosa, and Rosa reads it from the email's link", async () => {
    assert.equal((await call(ROSA, "GET", `/reports/${anaReportId}`)).status, 404);
    const shared = await call(ANA, "POST", "/shares", { email: ROSA_EMAIL });
    assert.equal(shared.status, 201, JSON.stringify(shared.body));
    zod.ShareMyReportResponse.parse(shared.body);
    assert.deepEqual([shared.body.email, shared.body.emailDelivered], [ROSA_EMAIL, true]);
    const mail = mails.at(-1)!;
    assert.deepEqual([mails.length, mail.to, mail.subject], [2, ROSA_EMAIL, "Ana shared their Personal report with you"]);
    onOurWeb(mail);
    const token = tokenOf(mail);

    const preview = await call(ROSA, "GET", previewPath(token));
    assert.deepEqual([preview.status, preview.body.kind, preview.body.inviterName], [200, "share", "Ana"]);
    const claim = await call(ROSA, "POST", claimPath(token));
    assert.equal(claim.status, 200, JSON.stringify(claim.body));
    zod.ClaimInviteResponse.parse(claim.body);
    assert.deepEqual(claim.body, {
      profileId: anaProfileId, relationshipId: null, relationshipReportId: null, redirectTo: "/dashboard", kind: "share", askSelf: false, shareBack: true,
    });

    const read = await readReport(ROSA, anaReportId);
    assert.deepEqual([read.access, read.giverName, read.canRegenerate, read.send], ["shared", "Ana", false, null]);
    assert.deepEqual(read.interpretation, (await readReport(ANA, anaReportId)).interpretation, "the text Rosa reads is not the text Ana reads");
    const home = await readHome(ROSA);
    assert.deepEqual(home.people.map((p) => [p.profileId, p.reportId, p.access, p.shareBack]), [[anaProfileId, anaReportId, "shared", true]]);
    assert.deepEqual((await shares(ANA)).map((s) => s.slice(1)), [[ROSA_EMAIL, "Rosa", "active"]]);
  });

  await step("Rosa shares hers back, and Ana reads it", async () => {
    assert.equal((await call(ANA, "GET", `/reports/${rosaReportId}`)).status, 404);
    const back = await call(ROSA, "POST", "/shares/back", { profileId: anaProfileId });
    assert.equal(back.status, 201, JSON.stringify(back.body));
    zod.ShareBackResponse.parse(back.body);
    assert.deepEqual([back.body.email, back.body.readerName, back.body.state], ["", "Ana", "active"]);
    assert.equal(mails.length, 2);

    const read = await readReport(ANA, rosaReportId);
    assert.deepEqual([read.access, read.giverName, read.canRegenerate], ["shared", "Rosa", false]);
    assert.deepEqual((await readHome(ANA)).people.map((p) => [p.profileId, p.reportId, p.access, p.shareBack]), [[rosaProfileId, rosaReportId, "shared", false]]);
    assert.deepEqual((await readHome(ROSA)).people.map((p) => [p.profileId, p.shareBack]), [[anaProfileId, false]]);
  });

  await step("Ana writes a parent and child report for the two of them, and it completes", async () => {
    const lens = "parent_child" as const;
    const [a, b] = await Promise.all([stored(anaReportId), stored(rosaReportId)]);
    // The canned pair speaks of Marie and Oprah; here it speaks of these two.
    const canned = JSON.stringify(pairReplies(buildPairBrief({ lens, parent: "B", a, b })));
    replies = JSON.parse(canned.replaceAll("Marie", "Ana").replaceAll("Oprah", "Rosa"));
    const made = await call(ANA, "POST", "/compatibility", { reportAId: anaReportId, reportBId: rosaReportId, lens, parent: "B" });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    zod.CreateCompatibilityReportResponse.parse(made.body);
    pairId = made.body.id;
    await written(ANA, pairId);

    const read = await readReport(ANA, pairId);
    assert.deepEqual([read.access, read.type, read.lens, read.status], ["owner", "compatibility", lens, "complete"]);
    assert.deepEqual(
      read.participants.map((p: any) => [p.name, p.role, p.reportId, p.isSelf]),
      [["Ana", "child", anaReportId, true], ["Rosa", "parent", rosaReportId, false]],
    );
    const meta = read.interpretation.meta;
    assert.deepEqual([meta.promptVersion, meta.lens, meta.band, meta.names, meta.blind], [PAIR_PROMPT_VERSION, lens, "grown", { a: "Ana", b: "Rosa" }, false]);
    assert.deepEqual(unanswered, []);
    const pair = (await readHome(ANA)).pairs.find((p) => p.reportId === pairId);
    assert.deepEqual([pair?.lens, pair?.status, pair?.stoppedBy, pair?.a.name, pair?.b.name], [lens, "complete", null, "Ana", "Rosa"]);

    // MB-49 provisional: one credit is one report, the pair too (ADR-42), recorded by the soft pass.
    assert.deepEqual(await until("Ana's last credit is spent", () => credits(ANA), (c) => c.used === 2), { available: 0, used: 2, held: 0 });
    assert.deepEqual((await history(ANA))[0], ["spent", 1, "Ana & Rosa"]);
  });

  // MB-223 provisional: the Owner's flow sends the pair to Rosa here, and she claims it and reads it. Today a pair made on a chart only
  // shared with its maker offers no Send, since a send would claim the sharer's chart from her (ADR-235, which the
  // sharing walk proves), so this step proves the refusal. It becomes the send and the claim once that rule changes.
  await step("Ana tries to send the pair to Rosa: refused today, since Rosa's chart is only shared with Ana (ADR-235)", async () => {
    assert.equal((await listReports(ANA)).get(pairId).send, null);
    const sent = await call(ANA, "POST", `/compatibility/${pairId}/send`, { email: ROSA_EMAIL });
    assert.deepEqual([sent.status, sent.body.error], [403, "forbidden"], JSON.stringify(sent.body));
    assert.equal(mails.length, 2);
    assert.equal((await call(ROSA, "GET", `/reports/${pairId}`)).status, 404);
    assert.equal((await call(ROSA, "GET", `/compatibility/${pairId}/summary`)).status, 404);
    assert.ok(!(await listReports(ROSA)).has(pairId));
    assert.deepEqual((await readHome(ROSA)).pairs, []);
  });

  // MB-197 provisional: replace with the subscription step when billing exists.
  await step("Timeline stays closed to both: no access, and the teaser on their home", async () => {
    for (const [who, name] of [[ANA, "Ana"], [ROSA, "Rosa"]] as const) {
      const access = await call(who, "GET", "/timeline/access");
      assert.equal(access.status, 200, `${name}: ${JSON.stringify(access.body)}`);
      zod.GetTimelineAccessResponse.parse(access.body);
      assert.deepEqual(access.body, { access: false, source: null, hasPersonalReport: true, ask: null }, `${name}: ${JSON.stringify(access.body)}`);
      const now = await call(who, "GET", "/timeline/now?range=week");
      assert.deepEqual([now.status, now.body.error, now.body.message], [403, "no_timeline", NO_TIMELINE_LINE], `${name}: ${now.status} ${JSON.stringify(now.body)}`);
      const home = await readHome(who);
      assert.equal(home.week, undefined, `${name}'s home shows Your week`);
      assert.ok((home.teaser?.cycles.length ?? 0) > 0, `${name}'s home has no teaser: ${JSON.stringify(home.teaser ?? null)}`);
    }
  });
} catch (err) {
  setupError = err;
} finally {
  server.close();
  mailStub.close();
  modelStub.close();
  await pool.end();
}

if (setupError) {
  console.error("buyer walk: could not finish setup —", setupError);
  process.exit(1);
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
const passed = failedAt ? failedAt - 1 : stepNo;
console.log(`\nbuyer walk: ${passed}/${stepNo} steps passed in ${seconds} s; ${mails.length} stub emails, ${modelCalls.length} stand-in model calls.`);
process.exit(failedAt ? 1 : 0);
