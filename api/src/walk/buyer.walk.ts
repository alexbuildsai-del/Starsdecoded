// The buyer walk (ADR-273): the Owner's critical flow with three accounts, end to end on a scratch Postgres. Mira buys
// test credits, writes her Personal report and gifts one to her parent Idris; Idris claims it and writes one; the two
// share their reports both ways, and Mira writes a parent and child report for them and shares it with Idris, who claims
// it from its link and reads it (ADR-285). Then Mira writes her partner Tomás's Personal report and a partners report,
// sends Tomás both, and Tomás claims and reads them. Timeline stays the admin's until billing (MB-197).
// No Clerk, no network, no OpenAI. A header stands where the sign-in is, mail goes to a local stub, and the model client
// is pointed at a local stand-in that answers each call with canned text that passes the checks, so every report goes
// through the real routes and is written as it is on staging. The people are the site's sample people
// (fixtures/sample-people/, web/src/site/data/people.ts), so the walk and the site share them; their charts are
// computed from those birth data at run time.
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
// Timeline is the admin's alone until billing (MB-197), and no one in the walk may be the admin, whoever the shell names.
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
const { PAIR_PROMPT_VERSION, pairChapterId } = await import("../prompts/pair/index.js");
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
const claimUrlOf = (token: string) => `${OUR_PAGE}/claim?token=${encodeURIComponent(token)}`;
const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
const creditRow = async (id: string) =>
  (await q("select status, user_id, used_for_report_id from credits where id = $1", [id])).rows[0];
const creditFor = async (reportId: string) =>
  (await q("select status, user_id from credits where used_for_report_id = $1", [reportId])).rows;

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
async function claim(who: Viewer, token: string) {
  const r = await call(who, "POST", claimPath(token));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  zod.ClaimInviteResponse.parse(r.body);
  return r.body;
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

// One browser each, so a reader's session is the same before and after signing in.
const MIRA_SIGNED_OUT: Viewer = { user: null, session: "s-mira" };
const MIRA: Viewer = { user: "user_mira", session: MIRA_SIGNED_OUT.session };
const IDRIS_SIGNED_OUT: Viewer = { user: null, session: "s-idris" };
const IDRIS: Viewer = { user: "user_idris", session: IDRIS_SIGNED_OUT.session };
const TOMAS_SIGNED_OUT: Viewer = { user: null, session: "s-tomas" };
const TOMAS: Viewer = { user: "user_tomas", session: TOMAS_SIGNED_OUT.session };
const MIRA_EMAIL = "mira@example.com";
const IDRIS_EMAIL = "idris@example.com";
const TOMAS_EMAIL = "tomas@example.com";
const GIFT_NOTE = "Happy birthday. Love, Mira.";
// Who each is to Mira on the site: herself, her parent and her partner.
const MIRA_BIRTH = samplePerson("mira");
const IDRIS_BIRTH = samplePerson("idris");
const TOMAS_BIRTH = samplePerson("tomas");
const miraChart = chartForProfile({ ...MIRA_BIRTH, birthTimeWindowMinutes: 0 });
const idrisChart = chartForProfile({ ...IDRIS_BIRTH, birthTimeWindowMinutes: 0 });
const tomasChart = chartForProfile({ ...TOMAS_BIRTH, birthTimeWindowMinutes: 0 });
// Every report Mira pays for: her own, the gift Idris writes with, her pair with Idris, Tomás's and her pair with Tomás.
const CREDITS_BOUGHT = 5;

const started = Date.now();
let setupError: unknown = null;
try {
  await q(
    "truncate table users, profiles, reports, relationships, relationship_participants, invite_tokens, bundles, credits, report_revisions, spend_ledger, profile_shares, report_workbooks, generation_failures, timeline_readings, ask_messages cascade",
  );

  let miraProfileId = "";
  let miraReportId = "";
  let idrisProfileId = "";
  let idrisReportId = "";
  let giftId = "";
  let giftCreditId = "";
  let giftToken = "";
  let idrisPairId = "";
  let idrisPairRelationshipId = "";
  let tomasProfileId = "";
  let tomasReportId = "";
  let tomasPairId = "";
  let tomasPairRelationshipId = "";
  let reportToken = "";
  let pairToken = "";

  await step("Mira arrives signed out, then signs in to an empty account", async () => {
    assert.deepEqual(await readHome(MIRA_SIGNED_OUT), EMPTY_HOME);
    assert.deepEqual(await credits(MIRA_SIGNED_OUT), NO_CREDITS);
    const buy = await call(MIRA_SIGNED_OUT, "POST", "/checkout/test", { count: CREDITS_BOUGHT });
    assert.deepEqual([buy.status, buy.body.error], [401, "unauthorized"]);
    assert.equal((await call(MIRA_SIGNED_OUT, "GET", "/timeline/access")).status, 401);
    // The sky screen keeps her birth data in the browser until she signs in, and the birth form needs an account
    // (ADR-140), so a signed-out visit leaves nothing in the API for her account to claim.
    const kept = await q("select (select count(*) from profiles where session_id = $1) + (select count(*) from reports where session_id = $1) as n", [MIRA.session]);
    assert.equal(Number(kept.rows[0].n), 0);

    await signIn(MIRA, MIRA_EMAIL);
    assert.deepEqual(await readHome(MIRA), EMPTY_HOME);
    assert.deepEqual(await credits(MIRA), NO_CREDITS);
    assert.deepEqual((await call(MIRA, "GET", "/profiles")).body, []);
    assert.equal((await listReports(MIRA)).size, 0);
  });

  await step(`Mira buys ${CREDITS_BOUGHT} test credits, one for each report she pays for, and her balance shows them`, async () => {
    const bought = await call(MIRA, "POST", "/checkout/test", { count: CREDITS_BOUGHT });
    assert.equal(bought.status, 201, JSON.stringify(bought.body));
    const balance = zod.TestCheckoutResponse.parse(bought.body);
    assert.deepEqual([balance.available, balance.used, balance.held, balance.lastBundle?.count], [CREDITS_BOUGHT, 0, 0, CREDITS_BOUGHT]);
    assert.deepEqual(await credits(MIRA), { available: CREDITS_BOUGHT, used: 0, held: 0 });
    const rows = (await q("select count(*)::int as n, count(*) filter (where is_test)::int as test from credits where user_id = $1", [MIRA.user])).rows[0];
    assert.deepEqual(rows, { n: CREDITS_BOUGHT, test: CREDITS_BOUGHT });
    assert.deepEqual(await history(MIRA), [["bought", CREDITS_BOUGHT, `${CREDITS_BOUGHT} test credits`]]);
  });

  await step("Mira writes her Personal report and reads it; one credit is spent", async () => {
    replies = natalTextFor(miraChart);
    const made = await call(MIRA, "POST", "/reports", birthForm(MIRA_BIRTH, "Lisbon", true));
    assert.equal(made.status, 201, JSON.stringify(made.body));
    zod.CreateReportResponse.parse(made.body);
    const sun = miraChart.planets.sun;
    assert.deepEqual([made.body.status, made.body.sunSign, made.body.risingSign], ["interpreting", sun.sign, miraChart.angles!.ascendant.sign]);
    miraReportId = made.body.id;
    await written(MIRA, miraReportId);

    const read = await readReport(MIRA, miraReportId);
    assert.deepEqual([read.access, read.type, read.status, read.send, read.giverName], ["owner", "natal", "complete", null, null]);
    miraProfileId = read.profileId;
    assert.deepEqual([read.chartData.planets.sun.sign, read.chartData.planets.sun.degree], [sun.sign, sun.degree]);
    assert.deepEqual([read.interpretation.meta.promptVersion, read.interpretation.meta.horizon], [PROMPT_VERSION, "known"]);
    // The evidence under a claim is drawn from the chart in code, never from the model's words.
    assert.equal(read.interpretation.triad.claims[0].evidence[0].label, `Sun ${sun.degree.toFixed(1)}° ${sun.sign}, ${ordinal(sun.house!)} house`);
    assert.deepEqual(unanswered, []);

    const home = await readHome(MIRA);
    assert.deepEqual([home.you?.profileId, home.you?.reportId, home.you?.access, home.you?.isSelf], [miraProfileId, miraReportId, "owner", true]);
    assert.deepEqual(home.you?.triad?.sun, { sign: sun.sign, degree: sun.degree, house: sun.house });

    // MB-49 provisional: the soft pass spends the credit after POST answers and refuses no one, so the step waits for
    // the ledger and reads what it wrote; nothing here proves a report needs a credit.
    assert.deepEqual(await until("Mira's credit is spent", () => credits(MIRA), (c) => c.used === 1), { available: 4, used: 1, held: 0 });
    assert.deepEqual(await creditFor(miraReportId), [{ status: "used", user_id: MIRA.user }]);
    assert.deepEqual(await history(MIRA), [["spent", 1, "Mira Costa"], ["bought", 5, "5 test credits"]]);
  });

  await step("Mira gifts a report to her parent Idris; the email goes out and one credit is held", async () => {
    const mailsBefore = mails.length;
    const sent = await call(MIRA, "POST", "/gifts", { recipientName: "Idris", email: IDRIS_EMAIL, note: GIFT_NOTE });
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
    assert.deepEqual(await credits(MIRA), { available: 3, used: 1, held: 1 });
    assert.deepEqual(await gifts(MIRA), [[giftId, "Idris", IDRIS_EMAIL, "waiting", true]]);
  });

  await step("Idris signs up and claims the gift from the email; the credit moves to Idris", async () => {
    const opened = await preview(IDRIS_SIGNED_OUT, giftToken);
    assert.deepEqual([opened.kind, opened.inviterName, opened.recipientName, opened.note, opened.alreadyClaimed], ["gift", "Mira", "Idris", GIFT_NOTE, false]);
    assert.equal((await call(IDRIS_SIGNED_OUT, "POST", claimPath(giftToken))).status, 401);

    await signIn(IDRIS, IDRIS_EMAIL);
    const claimed = await claim(IDRIS, giftToken);
    assert.deepEqual([claimed.kind, claimed.redirectTo], ["gift", "/dashboard"]);

    assert.deepEqual(await creditRow(giftCreditId), { status: "available", user_id: IDRIS.user, used_for_report_id: null });
    assert.deepEqual(await credits(IDRIS), { available: 1, used: 0, held: 0 });
    assert.deepEqual(await history(IDRIS), [["gift", 1, "A gift from Mira"]]);
    assert.deepEqual(await credits(MIRA), { available: 3, used: 1, held: 0 });
    assert.deepEqual(await gifts(MIRA), [[giftId, "Idris", IDRIS_EMAIL, "claimed", false]]);
    assert.deepEqual(await history(MIRA), [["spent", 1, "Gift to Idris"], ["spent", 1, "Mira Costa"], ["bought", 5, "5 test credits"]]);
  });

  await step("Idris writes a Personal report with the gifted credit", async () => {
    replies = natalTextFor(idrisChart);
    const made = await call(IDRIS, "POST", "/reports", birthForm(IDRIS_BIRTH, "Cardiff", true));
    assert.equal(made.status, 201, JSON.stringify(made.body));
    zod.CreateReportResponse.parse(made.body);
    idrisReportId = made.body.id;
    await written(IDRIS, idrisReportId);

    const read = await readReport(IDRIS, idrisReportId);
    const sun = idrisChart.planets.sun;
    assert.deepEqual([read.access, read.status, read.chartData.planets.sun.sign, read.chartData.planets.sun.degree], ["owner", "complete", sun.sign, sun.degree]);
    idrisProfileId = read.profileId;
    assert.deepEqual(unanswered, []);
    assert.deepEqual((await readHome(IDRIS)).you?.reportId, idrisReportId);

    // MB-49 provisional: as for Mira's, the soft pass's record of the spend.
    assert.deepEqual(await until("Idris's gifted credit is spent", () => credits(IDRIS), (c) => c.used === 1), { available: 0, used: 1, held: 0 });
    assert.deepEqual(await creditRow(giftCreditId), { status: "used", user_id: IDRIS.user, used_for_report_id: idrisReportId });
    assert.deepEqual(await history(IDRIS), [["spent", 1, "Idris Costa"], ["gift", 1, "A gift from Mira"]]);
  });

  await step("Mira shares her report with Idris, and Idris reads it from the email's link", async () => {
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
  });

  await step("Idris shares back, and Mira reads Idris's report", async () => {
    assert.equal((await call(MIRA, "GET", `/reports/${idrisReportId}`)).status, 404);
    const mailsBefore = mails.length;
    const back = await call(IDRIS, "POST", "/shares/back", { profileId: miraProfileId });
    assert.equal(back.status, 201, JSON.stringify(back.body));
    zod.ShareBackResponse.parse(back.body);
    assert.deepEqual([back.body.email, back.body.readerName, back.body.state], ["", "Mira", "active"]);
    assert.equal(mails.length, mailsBefore);

    const read = await readReport(MIRA, idrisReportId);
    assert.deepEqual([read.access, read.giverName, read.canRegenerate], ["shared", "Idris", false]);
    assert.deepEqual((await readHome(MIRA)).people.map((p) => [p.profileId, p.reportId, p.access, p.shareBack]), [[idrisProfileId, idrisReportId, "shared", false]]);
    assert.deepEqual((await readHome(IDRIS)).people.map((p) => [p.profileId, p.shareBack]), [[miraProfileId, false]]);
  });

  await step("Mira writes a parent and child report for herself and Idris, and it completes", async () => {
    const lens = "parent_child" as const;
    replies = await pairTextFor(lens, "B", miraReportId, idrisReportId);
    const made = await call(MIRA, "POST", "/compatibility", { reportAId: miraReportId, reportBId: idrisReportId, lens, parent: "B" });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    zod.CreateCompatibilityReportResponse.parse(made.body);
    idrisPairId = made.body.id;
    idrisPairRelationshipId = made.body.relationshipId;
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
    const pair = (await readHome(MIRA)).pairs.find((p) => p.reportId === idrisPairId);
    assert.deepEqual([pair?.lens, pair?.status, pair?.stoppedBy, pair?.a.name, pair?.b.name], [lens, "complete", null, "Mira Costa", "Idris Costa"]);

    // MB-49 provisional: one credit is one report, the pair too (ADR-42), recorded by the soft pass.
    assert.deepEqual(await until("Mira's pair credit is spent", () => credits(MIRA), (c) => c.used === 2), { available: 2, used: 2, held: 0 });
    assert.deepEqual(await creditFor(idrisPairId), [{ status: "used", user_id: MIRA.user }]);
    assert.deepEqual((await history(MIRA))[0], ["spent", 1, "Mira Costa & Idris Costa"]);
  });

  // Idris's chart is his own, which Mira reads through his share, so the pair goes to him as any send does and its claim
  // hands nothing over (ADR-285).
  await step("Mira shares the parent and child report with Idris; he claims it from the email's link, reads it and does its exercises", async () => {
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
    assert.deepEqual((await readHome(IDRIS)).pairs.map((p) => [p.reportId, p.stoppedBy]), [[idrisPairId, null]]);
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
  });

  await step("Mira writes her partner Tomás's Personal report on her own credit", async () => {
    replies = natalTextFor(tomasChart);
    const made = await call(MIRA, "POST", "/reports", birthForm(TOMAS_BIRTH, "Madrid", false));
    assert.equal(made.status, 201, JSON.stringify(made.body));
    zod.CreateReportResponse.parse(made.body);
    const sun = tomasChart.planets.sun;
    assert.deepEqual([made.body.status, made.body.sunSign, made.body.risingSign], ["interpreting", sun.sign, tomasChart.angles!.ascendant.sign]);
    tomasReportId = made.body.id;
    await written(MIRA, tomasReportId);

    const read = await readReport(MIRA, tomasReportId);
    tomasProfileId = read.profileId;
    assert.deepEqual([read.access, read.status, read.chartData.planets.sun.sign, read.chartData.planets.sun.degree], ["owner", "complete", sun.sign, sun.degree]);
    assert.deepEqual(read.send, { state: "can_send", profileId: tomasProfileId, relationshipId: null, firstName: "Tomás" });
    assert.deepEqual(unanswered, []);
    const profiles = zod.ListProfilesResponse.parse((await call(MIRA, "GET", "/profiles")).body);
    const tomas = profiles.find((p) => p.id === tomasProfileId);
    assert.deepEqual([tomas?.name, tomas?.ownership, tomas?.isSelf], ["Tomás Reyes", "owner", false]);
    const seat = (await readHome(MIRA)).people.find((p) => p.profileId === tomasProfileId);
    assert.deepEqual([seat?.reportId, seat?.access, seat?.isSelf], [tomasReportId, "owner", false]);

    // MB-49 provisional: Tomás's report is paid from Mira's balance.
    assert.deepEqual(await until("Mira's credit for Tomás is spent", () => credits(MIRA), (c) => c.used === 3), { available: 1, used: 3, held: 0 });
    assert.deepEqual(await creditFor(tomasReportId), [{ status: "used", user_id: MIRA.user }]);
    assert.deepEqual((await history(MIRA))[0], ["spent", 1, "Tomás Reyes"]);
  });

  await step("Mira writes a partners report for herself and Tomás, and it completes", async () => {
    const lens = "partners" as const;
    replies = await pairTextFor(lens, undefined, miraReportId, tomasReportId);
    const made = await call(MIRA, "POST", "/compatibility", { reportAId: miraReportId, reportBId: tomasReportId, lens });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    zod.CreateCompatibilityReportResponse.parse(made.body);
    tomasPairId = made.body.id;
    tomasPairRelationshipId = made.body.relationshipId;
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

    // MB-49 provisional: the last of the credits she bought.
    assert.deepEqual(await until("Mira's last credit is spent", () => credits(MIRA), (c) => c.used === 4), { available: 0, used: 4, held: 0 });
    assert.deepEqual(await creditFor(tomasPairId), [{ status: "used", user_id: MIRA.user }]);
    assert.deepEqual(await history(MIRA), [
      ["spent", 1, "Mira Costa & Tomás Reyes"], ["spent", 1, "Tomás Reyes"], ["spent", 1, "Mira Costa & Idris Costa"],
      ["spent", 1, "Gift to Idris"], ["spent", 1, "Mira Costa"], ["bought", 5, "5 test credits"],
    ]);
  });

  await step("Mira sends both reports to Tomás, the Personal report and the partners report; two emails go out", async () => {
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
  });

  await step("Tomás signs up, claims both reports from the emails, and reads them", async () => {
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
  });

  // MB-197 provisional: replace with the subscription step when billing exists.
  await step("Timeline stays closed to all three: no access, and the teaser on their home", async () => {
    for (const [who, name] of [[MIRA, "Mira"], [IDRIS, "Idris"], [TOMAS, "Tomás"]] as const) {
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
