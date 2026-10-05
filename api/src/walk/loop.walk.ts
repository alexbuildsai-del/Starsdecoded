// R10-22: the walk. Every access and ledger rule this round shipped, proved
// end to end on a scratch Postgres, with no Clerk and no network — mail goes
// to a local stub, and every report here is a stored row, never generated,
// since nothing in this file may call OpenAI (dashboard-sky acceptance 11;
// credit-loop acceptance 2, 4; review-01-10 acceptance 4, 11; ADR-138, 139,
// 174, 182; MB-84, 103, 110). R13-08 adds the limits, the spend breaker and
// the origin guard (security acceptance 2, 6, 7; ADR-197, 199). R13-F2 adds
// that no email link or image follows a host the request names, and that the
// legacy pair routes are gone (MB-58). R14-10 adds that a birth-time change
// holds a write per report it passes, and that a browser's session loses a
// report to its subject's claim when it regenerates or pairs (MB-159, 166).
// R15-28 has Not me on a sent report hand it back (ADR-236), reads each
// reader's ticks from their own workbook (ADR-239), and has a birth-time
// change pass the newest of seven reports alone (MB-170); sharing.walk.ts
// walks the rest of sharing.
// R17-23: credits are hard (ADR-275), so every write here that spends one is
// given one first, and the free test checkout is gone (ADR-276).
//
// `pnpm --filter @workspace/api-server run walk` runs this, then
// sharing.walk.ts, against `WALK_DATABASE_URL`; without it, it skips. Run
// twice on the same database: the first statement truncates every table it
// touches, so a prior run leaves nothing behind for the next one to trip over.

if (!process.env.WALK_DATABASE_URL) {
  console.log("walk: skipped (no WALK_DATABASE_URL)");
  process.exit(0);
}
process.env.DATABASE_URL = process.env.WALK_DATABASE_URL;
process.env.OPENAI_API_KEY ??= "sk-dummy-walk-never-sent";
// A first name or an address with nothing behind it here is asked of Clerk (names.ts, invites.ts); without a key, Clerk
// refuses before it sends anything, whatever key the shell holds.
delete process.env.CLERK_SECRET_KEY;

import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import express, { type NextFunction, type Request, type Response } from "express";

type Viewer = { user: string | null; session: string };
type Mail = { to: string; subject: string; text: string; html: string };

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "charts");
const fixture = (name: string) => JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8"));

// A stand-in for Resend: every claim link in this walk comes from a captured
// email, never from a real send, so the walk needs no network at all.
const mails: Mail[] = [];
let failMail = false;
const mailStub = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (failMail) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ name: "application_error", message: "stub failure", statusCode: 500 }));
      return;
    }
    const m = JSON.parse(body);
    mails.push({ to: Array.isArray(m.to) ? m.to[0] : m.to, subject: m.subject, text: m.text, html: m.html ?? "" });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ id: `stub-${mails.length}` }));
  });
});
await new Promise<void>((resolve) => mailStub.listen(0, "127.0.0.1", () => resolve()));
process.env.RESEND_API_KEY = "re_stub_walk";
process.env.RESEND_BASE_URL = `http://127.0.0.1:${(mailStub.address() as AddressInfo).port}`;

// A birth-time change starts a real horizon pass on the newest complete
// report. The model client is pointed here whatever key the shell holds: a
// stand-in that answers the pass's calls with canned text by the schema each
// one names, as horizonPass.test.ts's fake does, so the pass finishes as it
// would on staging, and refuses every other call, so nothing leaves the machine.
// The pass checks the rising's evidence against the new chart, so the step
// that changes the time names its Ascendant here first.
let passRising = "";
const PASS_LINE = "You are read as steady before you have said a word.";
function passReply(schema: string): unknown {
  if (schema.endsWith("_amend")) return { amendments: [], additions: [] };
  if (schema === "natal_houses") {
    return {
      houses: Array.from({ length: 12 }, (_, i) => ({
        house: i + 1,
        reading: "You set the tone before you speak. Behaviour check: notice who follows your pace this week.",
      })),
    };
  }
  if (schema === "natal_triad_rising" && passRising) {
    const evidence = [{ kind: "angle", angle: "ascendant", sign: passRising }];
    return {
      rising: { label: `${passRising[0].toUpperCase()}${passRising.slice(1)} rising`, text: PASS_LINE },
      claims: [PASS_LINE, "read as steady before", "before you have said a word"].map((quote) => ({ quote, evidence })),
    };
  }
  return null;
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
  req.on("end", () => {
    const reply = passReply(schemaOf(body));
    if (reply === null) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: "the walk calls no model", type: "invalid_request_error" } }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      id: "chatcmpl-walk",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "walk-stand-in",
      choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(reply), refusal: null }, finish_reason: "stop" }],
      usage: { prompt_tokens: 1000, completion_tokens: 200, total_tokens: 1200 },
    }));
  });
});
await new Promise<void>((resolve) => modelStub.listen(0, "127.0.0.1", () => resolve()));
process.env.OPENAI_BASE_URL = `http://127.0.0.1:${(modelStub.address() as AddressInfo).port}/v1`;

// Deferred past the env writes above: @workspace/db throws at import unless
// DATABASE_URL is already set, the mailer only reaches the stub once
// RESEND_API_KEY and RESEND_BASE_URL are, and the model client reads its
// base URL when it is made.
const { pool } = await import("@workspace/db");
const { chartForProfile } = await import("../lib/profiles.js");
const { PROMPT_VERSION } = await import("../lib/aiInterpretation.js");
const { PAIR_PROMPT_VERSION } = await import("../prompts/pair/index.js");
const { grantBundle, getCredits } = await import("../lib/credits.js");
const { logger } = await import("../lib/logger.js");
const { LIMIT_LINES, LIMITS } = await import("../lib/limits.js");
const { apiHeaders, originGuard, webOrigins } = await import("../middlewares/origin.js");
const { default: router } = await import("../routes/index.js");
const { GetHomeResponse } = await import("@workspace/api-zod");

const q = (sql: string, params: unknown[] = []) => pool.query(sql, params);

// app.ts's order, with a stub where the cookie and Clerk middleware stand: it
// sets userId and sessionId from headers, the shape every route expects. The
// router is the one app.ts mounts, so each limit stands where it does there.
// The guard takes the default origins, so a shell's NODE_ENV=development,
// which lets every Origin through, cannot pass the foreign write below.
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

// Any response in the walk that let another origin read it; the last step expects none.
const corsAllowed: string[] = [];

async function call(who: Viewer, method: string, path: string, body?: unknown, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { "x-session": who.session, "content-type": "application/json", ...extra };
  if (who.user) headers["x-user"] = who.user;
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.headers.has("access-control-allow-origin")) corsAllowed.push(`${method} ${path}`);
  const text = await res.text();
  // A route that no longer exists answers Express's own HTML 404, which has no JSON to parse.
  const json = res.headers.get("content-type")?.includes("application/json");
  return { status: res.status, headers: res.headers, body: text && json ? JSON.parse(text) : text || null };
}
async function until(done: () => boolean, ms = 3000) {
  const end = Date.now() + ms;
  while (!done() && Date.now() < end) await new Promise((resolve) => setTimeout(resolve, 25));
}
async function listReports(who: Viewer) {
  const r = await call(who, "GET", "/reports");
  assert.equal(r.status, 200);
  return new Map<string, any>(r.body.map((x: any) => [x.id, x]));
}
async function listGifts(who: Viewer) {
  const r = await call(who, "GET", "/gifts");
  assert.equal(r.status, 200);
  return r.body as any[];
}
async function readHome(who: Viewer) {
  const r = await call(who, "GET", "/home");
  assert.equal(r.status, 200);
  return GetHomeResponse.parse(r.body);
}
async function listProfiles(who: Viewer) {
  const r = await call(who, "GET", "/profiles");
  assert.equal(r.status, 200);
  return (r.body as any[]).map((p) => p.id as string);
}
const day = (d: number) => `2026-10-0${d}T09:00:00.000Z`;

// Stored text for the home's lines, pair block, story and practice; words only,
// no placement, since every placement the walk shows comes from a computed chart.
const NATAL_TEXT = {
  superpowers: {
    superpower: { title: "Steady hands", text: "You stay calm when a plan falls apart. People notice it before you do.", actions: [] },
    growingEdge: { title: "Asking first", text: "You grow when you ask before you fix. It feels slower, and it is not.", actions: [] },
  },
  focus: {
    practice: {
      intro: "Growth lives in small asks.",
      bullets: [
        { point: "Ask one person this week what they need before you offer help.", why: "you learn what help lands" },
        { point: "Write down one decision you made too fast, and what you would ask next time.", why: "you slow the reflex" },
        { point: "Say no once this week without a reason attached.", why: "your yes means more" },
      ],
    },
  },
};
const PAIR_TEXT = {
  meta: { promptVersion: PAIR_PROMPT_VERSION },
  twoCharts: {
    headline: "You both decide late and then all at once.",
    strong: ["You finish what the other starts.", "You keep a promise once it is made.", "Neither of you leaves a room angry."],
    work: ["Your two speeds train patience on both sides.", "Money talk trains you to say the number first.", "A plan made twice trains you to say it once."],
    paradox: "The calm that holds you is the calm that hides the plan.",
    strengths: ["Marie finishes what Audrey starts.", "Audrey says it out loud first.", "Neither leaves a room angry."],
    claims: [],
  },
  partners02: {
    nextTime: {
      items: [
        { for: "A", action: "Say the plan out loud on Thursday, before the weekend fills.", why: "trains saying it once" },
        { for: "B", action: "Ask for the quiet hour before you need it.", why: "trains asking early" },
        { for: "both", action: "Pick one evening a week with no plans at all.", why: "trains resting together" },
      ],
    },
  },
};
// As much of a written report as a horizon pass reads: the method it keeps, the foundation it hands the model, and the
// triad it adds the rising to.
const PASSABLE_TEXT = {
  meta: { promptVersion: PROMPT_VERSION, horizon: "known" },
  foundation: { chartThesis: "Steady first, quick second.", dominantPattern: "A plan held quietly.", centralTension: "Calm against speed." },
  triad: {
    sun: { label: "Sun", text: "You take the long view before you take a step." },
    moon: { label: "Moon", text: "You settle once the room is quiet." },
    claims: [],
  },
};
const tokenOf = (m: Mail) => decodeURIComponent(/claim\?token=([^\s"&]+)/.exec(m.text)![1]);
const row = async (id: string) => (await q("select * from invite_tokens where id = $1", [id])).rows[0];
// Ticks and pins are each reader's own row (ADR-239); reports.workbook is no longer written (MB-195).
const workbookOf = async (who: Viewer, reportId: string) =>
  ((await q("select workbook from report_workbooks where report_id = $1 and reader = $2", [reportId, who.user ?? `session:${who.session}`]))
    .rows[0]?.workbook ?? {}) as Record<string, string>;
const creditRow = async (id: string) => (await q("select status, user_id from credits where id = $1", [id])).rows[0];

async function person(id: string, name: string, fx: string, owner: Viewer, isSelf = false) {
  const f = fixture(fx);
  const chart = chartForProfile({ ...f, birthTimeWindowMinutes: f.birthTimeWindowMinutes ?? 0 });
  await q(
    `insert into profiles (id, session_id, user_id, is_self, name, birth_date, birth_time, birth_place, latitude, longitude, timezone_offset, timezone, birth_time_window_minutes, chart_data)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [id, owner.session, owner.user, isSelf, name, f.birthDate, f.birthTime, "fixture", f.latitude, f.longitude, chart.timezoneOffset, f.timezone ?? null, f.birthTimeWindowMinutes ?? 0, JSON.stringify(chart)],
  );
  return chart;
}
async function natal(id: string, profileId: string, session: string, status = "complete") {
  await q(
    "insert into reports (id, profile_id, session_id, type, status, interpretation) values ($1,$2,$3,'natal',$4,'{}')",
    [id, profileId, session, status],
  );
}
// A pair inserted as a stored row, both sides `owner`: the maker's own read,
// which is all steps 1-8 below need (a claimer's grant is set at its own
// send, never at setup).
async function pair(relId: string, reportId: string, owner: Viewer, lens: string, a: { profileId: string; reportId: string }, b: { profileId: string; reportId: string }) {
  await q("insert into relationships (id, session_id, user_id, type) values ($1,$2,$3,$4)", [relId, owner.session, owner.user, lens]);
  await q(
    `insert into relationship_participants (id, relationship_id, profile_id, role, access_role, position) values
     ($1,$2,$3,'primary','owner','0'), ($4,$2,$5,'secondary','owner','1')`,
    [`${relId}-a`, relId, a.profileId, `${relId}-b`, b.profileId],
  );
  await q(
    "insert into reports (id, profile_id, session_id, type, relationship_id, status, interpretation, compute_data) values ($1,$2,$3,'compatibility',$4,'complete',$5,$6)",
    [reportId, a.profileId, owner.session, relId, JSON.stringify({ meta: { promptVersion: PAIR_PROMPT_VERSION } }), JSON.stringify({ reportAId: a.reportId, reportBId: b.reportId, lens })],
  );
}

type StepResult = { label: string; ok: boolean; error?: string };
const results: StepResult[] = [];
async function step(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ label, ok: true });
  } catch (err) {
    results.push({ label, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}

const GIVER = { user: "user_giver", session: "s-giver" };
const SUBJECT = { user: "user_subject", session: "s-subject" };
const STRANGER = { user: "user_stranger", session: "s-stranger" };
const CHECKOUT_USER = { user: "user_checkout", session: "s-checkout" };
const GIFT_GIVER = { user: "user_gift_giver", session: "s-gift-giver" };
const GIFT_RECIPIENT = { user: "user_gift_recipient", session: "s-gift-recipient" };
const ANON = { user: null, session: "s-anon" };
const LIMITED = { user: "user_limited", session: "s-limited" };
const BREAKER = { user: "user_breaker", session: "s-breaker" };
const WRITER = { user: "user_writer", session: "s-writer" };
// The writer's browser after signing out: the cookie that wrote the report, no account.
const WRITER_SIGNED_OUT = { user: null, session: WRITER.session };
const CLAIMER = { user: "user_claimer", session: "s-claimer" };
const HORIZON = { user: "user_horizon", session: "s-horizon" };
const WALK_ADMIN = { id: "user_walk_admin", email: "walk-admin@example.com" };
const FOREIGN_PAGE = "https://evil.example";
const OUR_PAGE = "https://starsdecoded-staging.vercel.app";

// The API answers on its own host too, where a caller can name any host; every link and image in an email starts at
// the configured web app all the same, so each call that sends one names a foreign host.
process.env.PUBLIC_APP_URL = OUR_PAGE;
const FORGED_HOST = { "x-forwarded-host": "evil.example", "x-forwarded-proto": "http" };
function onOurWeb(m: Mail) {
  const urls = [...`${m.html}\n${m.text}`.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((u) => u[0]);
  assert.ok(urls.length > 0, m.subject);
  for (const url of urls) assert.ok(url.startsWith(`${OUR_PAGE}/`), `${m.subject}: ${url}`);
  assert.doesNotMatch(`${m.html}\n${m.text}`, /evil\.example/, m.subject);
}

let setupError: unknown = null;
try {
  // Idempotent: running this walk twice on the same database starts here
  // both times, so nothing from the first run can trip up the second.
  await q(
    "truncate table users, profiles, reports, relationships, relationship_participants, invite_tokens, bundles, credits, report_revisions, spend_ledger, profile_shares, report_workbooks, generation_failures cascade",
  );

  for (const [id, email] of [
    [GIVER.user, "giver@example.com"],
    [SUBJECT.user, "subject@example.com"],
    [STRANGER.user, "stranger@example.com"],
    [CHECKOUT_USER.user, "checkout@example.com"],
    [GIFT_GIVER.user, "gift-giver@example.com"],
    [GIFT_RECIPIENT.user, "gift-recipient@example.com"],
    [LIMITED.user, "limited@example.com"],
    [BREAKER.user, "breaker@example.com"],
    [WRITER.user, "writer@example.com"],
    [CLAIMER.user, "claimer@example.com"],
    [HORIZON.user, "horizon@example.com"],
    [WALK_ADMIN.id, WALK_ADMIN.email],
  ]) {
    await q("insert into users (id, email) values ($1, $2)", [id, email]);
  }

  const marie = await person("PM", "Marie Curie", "marie-curie", GIVER, true);
  const audrey = await person("PA", "Audrey Hepburn", "audrey-hepburn", GIVER);
  await person("PO", "Oprah Winfrey", "oprah-winfrey", GIVER);
  await natal("RM", "PM", GIVER.session);
  await natal("RA", "PA", GIVER.session);
  await natal("RO", "PO", GIVER.session);
  await pair("REL", "RP", GIVER, "partners", { profileId: "PM", reportId: "RM" }, { profileId: "PA", reportId: "RA" });
  // Today's one priced call on the ledger, there before any step can read the day's spend, which the breaker then holds for a minute.
  await person("PBK", "Athena Mapelli Mozzi", "athena", BREAKER, true);
  await q(
    "insert into reports (id, profile_id, session_id, type, status, interpretation) values ('RBK', 'PBK', $1, 'natal', 'complete', $2)",
    [BREAKER.session, JSON.stringify({ meta: { usage: { costUsd: 0.02 } } })],
  );
  await q("insert into spend_ledger (day, kind, cost_usd, calls) values ((now() at time zone 'utc')::date, 'natal', 0.02, 1)");

  await step("reports: the writer lists everything, a stranger 404s everywhere, Send waits out a revision", async () => {
    const g = await listReports(GIVER);
    assert.deepEqual([...g.keys()].sort(), ["RA", "RM", "RO", "RP"]);
    assert.equal(g.get("RM").access, "owner");
    assert.equal(g.get("RM").send, null);
    assert.deepEqual(g.get("RA").send, { state: "can_send", profileId: "PA", relationshipId: null, firstName: "Audrey" });
    assert.deepEqual(g.get("RP").send, { state: "can_send", profileId: "PA", relationshipId: "REL", firstName: "Audrey" });
    assert.equal(g.get("RP").stoppedBy, null);
    assert.equal(g.get("RP").sharedBy, null);
    assert.equal(g.get("RP").participants[1].sunSign, audrey.planets.sun.sign);
    assert.equal(g.get("RP").participants[0].sunSign, marie.planets.sun.sign);
    assert.equal((await listReports(SUBJECT)).size, 0);

    for (const [m, p] of [["GET", "/reports/RA"], ["GET", "/reports/RA/status"], ["DELETE", "/reports/RA"], ["GET", "/reports/RP"], ["DELETE", "/reports/RP"]] as const) {
      assert.equal((await call(STRANGER, m, p)).status, 404, `${m} ${p}`);
    }
    assert.equal((await call(STRANGER, "PATCH", "/reports/RA/workbook", { "career.actions.0": "2026-09-26" })).status, 404);

    await q("update reports set status='revising' where id='RO'");
    assert.equal((await listReports(GIVER)).get("RO").send, null);
    await q("update reports set status='complete' where id='RO'");
  });

  await step("home: the writer's circle is what GET /reports lists, with each chart's triad, the pair block, the story and the Closing's offer (ADR-174, ADR-182)", async () => {
    await q("update reports set interpretation = $1 where id = 'RM'", [JSON.stringify(NATAL_TEXT)]);
    await q("update reports set interpretation = $1 where id = 'RP'", [JSON.stringify(PAIR_TEXT)]);
    const h = await readHome(GIVER);
    assert.equal(h.several, false);
    assert.deepEqual([h.you?.profileId, h.you?.reportId, h.you?.access, h.you?.isSelf], ["PM", "RM", "owner", true]);
    assert.deepEqual(h.you?.triad?.sun, { sign: marie.planets.sun.sign, degree: marie.planets.sun.degree, house: marie.planets.sun.house });
    assert.deepEqual(h.you?.triad?.rising, { sign: marie.angles!.ascendant.sign, degree: marie.angles!.ascendant.degree, house: null });
    assert.deepEqual(h.you?.lines, {
      superpower: "Steady hands. You stay calm when a plan falls apart.",
      growingEdge: "Asking first. You grow when you ask before you fix.",
    });
    assert.deepEqual(h.people.map((p) => [p.profileId, p.reportId, p.access, p.isSelf, p.lines]), [
      ["PA", "RA", "owner", false, null], ["PO", "RO", "owner", false, null],
    ]);
    assert.equal(h.people[0].triad?.moon.sign, audrey.planets.moon.sign);

    const listed = [...(await listReports(GIVER)).values()];
    const natalListed = new Set(listed.filter((r) => r.kind === "natal").map((r) => r.profileId));
    assert.deepEqual(new Set([h.you!.profileId, ...h.people.map((p) => p.profileId)]), natalListed);
    assert.deepEqual(new Set(h.pairs.map((p) => p.reportId)), new Set(listed.filter((r) => r.kind === "compatibility").map((r) => r.id)));

    assert.deepEqual(h.pairs.find((p) => p.reportId === "RP"), {
      reportId: "RP", lens: "partners", label: null,
      a: { profileId: "PM", name: "Marie Curie" }, b: { profileId: "PA", name: "Audrey Hepburn" },
      status: "complete", stoppedBy: null,
      strong: PAIR_TEXT.twoCharts.strong, challenge: PAIR_TEXT.twoCharts.work[0],
      story: { headline: PAIR_TEXT.twoCharts.headline, strengths: PAIR_TEXT.twoCharts.strengths },
    });
    const first = NATAL_TEXT.focus.practice.bullets[0];
    assert.deepEqual(h.practising, [{
      reportId: "RM", kind: "natal", key: "focus.practice.bullets.0", action: first.point, why: first.why, pinned: false, ticked: false,
    }]);

    const empty = { you: null, several: false, people: [], pairs: [], practising: [] };
    assert.deepEqual(await readHome(STRANGER), empty);
    assert.deepEqual(await readHome(ANON), empty);
    assert.deepEqual(await readHome(SUBJECT), empty);
  });

  await step("pins: a pair's Next time tick saves, a pin round-trips through GET /home, a fourth answers pin_limit even in a race (ADR-174, MB-110)", async () => {
    const items = PAIR_TEXT.partners02.nextTime.items;
    const patchRP = (body: Record<string, string | null>) => call(GIVER, "PATCH", "/reports/RP/workbook", body);
    const storedRP = () => workbookOf(GIVER, "RP");
    const pinKeys = (workbook: Record<string, string>) => Object.keys(workbook).filter((k) => k.startsWith("pin."));

    assert.equal((await patchRP({ "partners02.nextTime.items.0": day(1) })).status, 200);
    const ticks = await Promise.all([patchRP({ "partners02.nextTime.items.1": day(1) }), patchRP({ "partners02.nextTime.items.2": day(1) })]);
    assert.deepEqual(ticks.map((t) => t.status), [200, 200]);
    assert.deepEqual(Object.keys(await storedRP()).sort(), ["partners02.nextTime.items.0", "partners02.nextTime.items.1", "partners02.nextTime.items.2"]);

    const pinned = await patchRP({ "pin.partners02.nextTime.items.0": day(1) });
    assert.equal(pinned.status, 200);
    assert.equal(pinned.body["pin.partners02.nextTime.items.0"], day(1));
    let h = await readHome(GIVER);
    assert.deepEqual(h.practising.map((p) => [p.reportId, p.key, p.pinned, p.ticked]), [
      ["RP", "partners02.nextTime.items.0", true, true], ["RM", "focus.practice.bullets.0", false, false],
    ]);
    assert.deepEqual([h.practising[0].action, h.practising[0].why], [`Marie: ${items[0].action}`, items[0].why]);

    assert.equal((await call(GIVER, "PATCH", "/reports/RM/workbook", { "pin.focus.practice.bullets.2": day(2) })).status, 200);
    assert.equal((await patchRP({ "pin.partners02.nextTime.items.1": day(3) })).status, 200);
    const raced = await Promise.all([patchRP({ "pin.partners03.nextTime.items.0": day(4) }), patchRP({ "pin.partners03.nextTime.items.1": day(4) })]);
    assert.deepEqual(raced.map((r) => r.status).sort(), [200, 400]);
    assert.equal(raced.find((r) => r.status === 400)?.body.error, "pin_limit");
    assert.equal(pinKeys(await storedRP()).length, 3);

    const fourth = await patchRP({ "pin.partners02.nextTime.items.2": day(4), "partners03.nextTime.items.0": day(4) });
    assert.equal(fourth.status, 400);
    assert.equal(fourth.body.error, "pin_limit");
    assert.equal((await storedRP())["partners03.nextTime.items.0"], undefined);

    const won = pinKeys(await storedRP()).find((k) => k.startsWith("pin.partners03."))!;
    assert.equal((await patchRP({ [won]: null, "pin.partners02.nextTime.items.2": day(5) })).status, 200);
    for (const bad of ["pin.pin.partners02.nextTime.items.0", "pin.partners02"]) {
      assert.equal((await patchRP({ [bad]: day(5) })).status, 400, bad);
    }
    assert.equal((await call(STRANGER, "PATCH", "/reports/RP/workbook", { "pin.partners02.nextTime.items.0": day(5) })).status, 404);

    h = await readHome(GIVER);
    assert.deepEqual(h.practising.map((p) => [p.reportId, p.key, p.pinned, p.ticked]), [
      ["RP", "partners02.nextTime.items.0", true, true], ["RM", "focus.practice.bullets.2", true, false],
      ["RP", "partners02.nextTime.items.1", true, true], ["RP", "partners02.nextTime.items.2", true, true],
    ]);
    assert.deepEqual(h.practising.slice(2).map((p) => p.action), [`Audrey: ${items[1].action}`, `Both: ${items[2].action}`]);
    assert.deepEqual((await q("select workbook from reports where id = 'RP'")).rows[0].workbook, {});
  });

  await step("R12-13: nothing writes a scene on tap, so the live pair's own reader gets a 404 where its summary answers 200 (ADR-176)", async () => {
    assert.equal((await call(GIVER, "GET", "/compatibility/RP/summary")).status, 200);
    assert.equal((await call(GIVER, "POST", "/compatibility/RP/scenes", { chapter: "partners02", index: 0 })).status, 404);
  });

  await step("send a natal report, its email and copy link on our web app whatever host the request names; the claimer reads, lists and works it, and their ticks are theirs alone (MB-84, ADR-239)", async () => {
    const sent = await call(GIVER, "POST", "/invites", { profileId: "PA", email: "subject@example.com" }, FORGED_HOST);
    assert.equal(sent.status, 201);
    assert.ok(sent.body.claimUrl.startsWith(`${OUR_PAGE}/claim?token=`), sent.body.claimUrl);
    onOurWeb(mails.at(-1)!);
    const token = tokenOf(mails.at(-1)!);
    assert.equal((await listReports(GIVER)).get("RA").send.state, "sent");

    const claim = await call(SUBJECT, "POST", `/invites/${encodeURIComponent(token)}/claim`);
    assert.equal(claim.status, 200);
    assert.equal(claim.body.kind, "send");
    assert.equal(claim.body.askSelf, false);
    assert.equal(claim.body.profileId, "PA");

    const s = await listReports(SUBJECT);
    assert.deepEqual([...s.keys()], ["RA"]);
    assert.equal(s.get("RA").access, "claimed");
    assert.equal(s.get("RA").sharedBy, "Marie");
    assert.equal(s.get("RA").send, null);

    const got = await call(SUBJECT, "GET", "/reports/RA");
    assert.equal(got.status, 200);
    assert.equal(got.body.giverName, "Marie");
    assert.equal((await call(SUBJECT, "GET", "/reports/RA/status")).status, 200);
    assert.equal((await call(SUBJECT, "PATCH", "/reports/RA/workbook", { "career.actions.0": "2026-09-26" })).status, 200);
    assert.equal((await call(SUBJECT, "GET", "/reports/RM")).status, 404);
    assert.equal((await call(SUBJECT, "GET", "/reports/RP")).status, 404);

    const g = await listReports(GIVER);
    assert.equal(g.get("RA").send.state, "joined");
    assert.equal(g.get("RP").send.state, "can_grant");
    const asGiver = await call(GIVER, "GET", "/reports/RA");
    assert.equal(asGiver.body.access, "owner");
    assert.equal(asGiver.body.send.state, "joined");
    assert.equal(asGiver.body.giverName, null);
    assert.deepEqual(asGiver.body.workbook, {});
    assert.deepEqual((await call(SUBJECT, "GET", "/reports/RA")).body.workbook, { "career.actions.0": "2026-09-26" });
  });

  await step("home: a claimed report marked as theirs sits at its subject's centre, and its giver still seats them (ADR-182)", async () => {
    const s = await readHome(SUBJECT);
    assert.deepEqual([s.you?.profileId, s.you?.reportId, s.you?.access, s.you?.isSelf], ["PA", "RA", "claimed", true]);
    assert.deepEqual(s.you?.triad?.sun, { sign: audrey.planets.sun.sign, degree: audrey.planets.sun.degree, house: audrey.planets.sun.house });
    assert.deepEqual([s.people, s.pairs, s.practising], [[], [], []]);
    const g = await readHome(GIVER);
    assert.deepEqual(g.people.find((p) => p.profileId === "PA")?.access, "owner");
  });

  await step("a pair to a joined person is granted at once, its email on our web app whatever host the request names, and stops at once when its sender stops sharing", async () => {
    // PA is already claimed by SUBJECT, so this second pair's Send grants
    // it at once rather than minting an invite (reading 11, MB-82).
    await pair("REL2", "RP2", GIVER, "people", { profileId: "PM", reportId: "RM" }, { profileId: "PA", reportId: "RA" });
    const mailsBefore = mails.length;
    const sent = await call(GIVER, "POST", "/compatibility/RP2/send", {}, FORGED_HOST);
    assert.equal(sent.status, 201);
    assert.deepEqual(sent.body, { state: "granted", invite: null });
    assert.deepEqual(mails.slice(mailsBefore).map((m) => m.to), ["subject@example.com"]);
    onOurWeb(mails.at(-1)!);
    assert.ok(mails.at(-1)!.text.includes(`${OUR_PAGE}/compatibility/RP2`));

    const summary = await call(SUBJECT, "GET", "/compatibility/RP2/summary");
    assert.equal(summary.status, 200);
    assert.equal(summary.body.participants.length, 2);

    assert.equal((await call(GIVER, "POST", "/compatibility/RP2/stop-sharing")).status, 204);
    assert.equal((await call(SUBJECT, "GET", "/compatibility/RP2/summary")).status, 404);
    assert.ok(!(await listReports(SUBJECT)).has("RP2"));
  });

  await step("Not me on a sent report hands it back: the claim ends, the pair grant it brought goes back, and the giver's row reads Handed back (ADR-236, reading 6)", async () => {
    // A pair grant riding on the claim, for the hand-back to take back with it.
    const granted = await call(GIVER, "POST", "/compatibility/RP/send", {});
    assert.deepEqual([granted.status, granted.body], [201, { state: "granted", invite: null }]);
    assert.equal((await call(SUBJECT, "GET", "/compatibility/RP/summary")).status, 200);

    const back = await call(SUBJECT, "POST", "/profiles/PA/hand-back");
    assert.deepEqual([back.status, back.body], [200, { profileId: "PA" }]);
    assert.equal((await call(SUBJECT, "POST", "/profiles/PA/hand-back")).status, 404);
    for (const p of ["/reports/RA", "/compatibility/RP/summary"]) assert.equal((await call(SUBJECT, "GET", p)).status, 404, p);
    assert.equal((await listReports(SUBJECT)).size, 0);
    assert.deepEqual(await listProfiles(SUBJECT), []);
    assert.deepEqual((await q("select access_role from relationship_participants where profile_id = 'PA'")).rows.map((r) => r.access_role), ["owner", "owner"]);

    const g = await listReports(GIVER);
    assert.deepEqual(g.get("RA").send, { state: "handed_back", profileId: "PA", relationshipId: null, firstName: "Audrey" });
    assert.equal(g.get("RP").send.state, "can_send");
    const pa = (await call(GIVER, "GET", "/profiles")).body.find((p: { id: string }) => p.id === "PA");
    assert.deepEqual([pa.ownership, pa.claimedByName, pa.send.state], ["owner", null, "handed_back"]);
  });

  await step("home: after Hand it back the subject's circle is empty and the giver's seats the chart again; Send again is a new send, claimed as the subject's own (reading 6, ADR-236)", async () => {
    assert.deepEqual(await readHome(SUBJECT), { you: null, several: false, people: [], pairs: [], practising: [] });
    assert.equal((await readHome(GIVER)).people.find((p) => p.profileId === "PA")?.access, "owner");

    const again = await call(GIVER, "POST", "/invites", { profileId: "PA", email: "subject@example.com" });
    assert.equal(again.status, 201);
    assert.equal((await listReports(GIVER)).get("RA").send.state, "sent");
    const claim = await call(SUBJECT, "POST", `/invites/${encodeURIComponent(tokenOf(mails.at(-1)!))}/claim`);
    assert.deepEqual([claim.status, claim.body.kind, claim.body.askSelf], [200, "send", false]);
    assert.equal((await listReports(GIVER)).get("RA").send.state, "joined");
    const s = await readHome(SUBJECT);
    assert.deepEqual([s.you?.profileId, s.you?.access, s.you?.isSelf], ["PA", "claimed", true]);
  });

  await step("Stop sharing a claimed chart ends the giver's reading at once", async () => {
    assert.equal((await call(SUBJECT, "POST", "/profiles/PA/stop-sharing")).status, 204);
    assert.equal((await call(GIVER, "GET", "/reports/RA")).status, 404);
    assert.ok(!(await listReports(GIVER)).has("RA"));
    const mine = await call(SUBJECT, "GET", "/reports/RA");
    assert.equal(mine.status, 200);
    assert.equal(mine.body.giverName, null);
  });

  await step("the maker's pair closes when the other stops sharing their natal report (ADR-139)", async () => {
    const g = await listReports(GIVER);
    assert.equal(g.get("RP").stoppedBy, "Audrey");
    assert.equal(g.get("RP").send, null);
    assert.equal((await call(GIVER, "GET", "/reports/RP")).status, 404);
    assert.equal((await call(GIVER, "GET", "/reports/RP/status")).status, 404);
  });

  await step("home: after Stop sharing the giver's GET /home, /profiles and /reports drop them, and the pair with them closes (ADR-182, MB-103)", async () => {
    const g = await readHome(GIVER);
    assert.equal(g.you?.profileId, "PM");
    assert.deepEqual(g.people.map((p) => p.profileId), ["PO"]);
    for (const id of ["RP", "RP2"]) {
      const closed = g.pairs.find((p) => p.reportId === id);
      assert.deepEqual([closed?.stoppedBy, closed?.strong, closed?.challenge, closed?.story], ["Audrey", [], null, null], id);
    }
    assert.deepEqual(g.practising.map((p) => [p.reportId, p.key]), [["RM", "focus.practice.bullets.2"]]);
    assert.ok(!(await listProfiles(GIVER)).includes("PA"));
    assert.ok(!(await listReports(GIVER)).has("RA"));
    assert.equal((await call(GIVER, "PATCH", "/reports/RP/workbook", { "pin.partners02.nextTime.items.2": day(5) })).status, 404);

    const s = await readHome(SUBJECT);
    assert.deepEqual([s.you?.profileId, s.you?.access], ["PA", "claimed"]);
    assert.deepEqual([s.people, s.pairs], [[], []]);
  });

  await step("R10-23, R12-13: the closed pair 404s on compatibility summary, the scene route that stood beside it is gone, and the legacy pair routes answer 410 (MB-58)", async () => {
    assert.equal((await call(GIVER, "GET", "/compatibility/RP/summary")).status, 404);
    assert.equal((await call(GIVER, "POST", "/compatibility/RP/scenes", { chapter: "partners02", index: 0 })).status, 404);
    for (const [m, p] of [["GET", "/relationships"], ["GET", "/relationships/REL"], ["GET", "/synastry/RP"], ["GET", "/synastry/RP/status"], ["POST", "/synastry"]] as const) {
      const gone = await call(GIVER, m, p, m === "POST" ? { profileAId: "PM", profileBId: "PA" } : undefined);
      assert.deepEqual([gone.status, gone.body], [410, { error: "gone" }], `${m} ${p}`);
    }
  });

  await step("Delete by the claimer", async () => {
    assert.equal((await call(SUBJECT, "DELETE", "/reports/RA")).status, 204);
    assert.equal((await q("select 1 from reports where id='RA'")).rowCount, 0);
  });

  await step("MB-166: a browser signed out after writing a report can neither regenerate it nor pair it once its subject's account has claimed it; the writer's account still regenerates and the claimer still picks it (ADR-139)", async () => {
    await person("PW", "Charles Windsor", "charles", WRITER);
    await person("PW2", "William Windsor", "william", WRITER);
    await person("PC", "George Windsor", "george", CLAIMER, true);
    // Still being written, so whatever access lets through stops at the report's status and nothing spends.
    await natal("RW", "PW", WRITER.session, "pending");
    await natal("RW2", "PW2", WRITER.session);
    await natal("RC", "PC", CLAIMER.session);
    const regenerate = (who: Viewer) => call(who, "POST", "/reports/RW/regenerate");
    const pairOf = async (who: Viewer, a: string, b: string) => {
      const r = await call(who, "POST", "/compatibility", { reportAId: a, reportBId: b, lens: "people" });
      return r.status === 400 ? `400 ${r.body.error}` : String(r.status);
    };

    assert.equal((await regenerate(WRITER_SIGNED_OUT)).status, 409, "unclaimed, the session that wrote it still may");
    // A signed-out browser has no credit to take, so a pair answers it 402 before it reads either report (ADR-275).
    assert.equal(await pairOf(WRITER_SIGNED_OUT, "RW", "RW2"), "402");

    // Where a claim leaves the row: the subject's account on it, the writer's account and session untouched.
    await q("update profiles set claimed_by_user_id = $1 where id = 'PW'", [CLAIMER.user]);
    assert.equal((await regenerate(WRITER_SIGNED_OUT)).status, 404);
    assert.equal(await pairOf(WRITER_SIGNED_OUT, "RW", "RW2"), "402");
    assert.equal(await pairOf(WRITER_SIGNED_OUT, "RW2", "RW"), "402");
    assert.equal((await regenerate(WRITER)).status, 409, "the writer's account is still its owner");
    assert.equal((await regenerate(CLAIMER)).status, 404, "the claimer reads it but does not rewrite it");
    await grantBundle(CLAIMER.user, "solo", { test: true });
    assert.equal(await pairOf(CLAIMER, "RC", "RW"), "400 not_ready", "any reader picks it");
    assert.equal((await getCredits(CLAIMER.user)).available, 1, "a pair refused before it is written takes no credit");
  });

  let giftPlain = "";
  let giftWithCredit = "";
  let giftWithCreditCreditId = "";
  let giftSecondToken = "";

  await step("gifts: signed out reads nothing, and sending one needs sign-in", async () => {
    assert.deepEqual((await call(ANON, "GET", "/gifts")).body, []);
    assert.equal((await call(ANON, "POST", "/gifts", { recipientName: "Pierre", email: "pierre@example.com" })).status, 401);
  });

  await step("gifts: validation on the name, the email and the 280-character note", async () => {
    for (const bad of [
      { recipientName: "   ", email: "pierre@example.com" },
      { recipientName: " Pierre ", email: "pierre@example.com" },
      { recipientName: "Pierre", email: "nope" },
      { recipientName: "Pierre", email: "pierre@example.com", note: "x".repeat(281) },
    ]) {
      const r = await call(GIFT_GIVER, "POST", "/gifts", bad);
      assert.equal(r.status, 400);
      assert.match(r.body.message, /280/);
    }
  });

  await step("gifts: with no credit a gift answers 402 no_credit, writes nothing and sends no email (ADR-275)", async () => {
    const mailsBefore = mails.length;
    const refused = await call(GIFT_GIVER, "POST", "/gifts", { recipientName: "Pierre", email: "pierre@example.com" });
    assert.equal(refused.status, 402);
    assert.deepEqual(refused.body, { error: "no_credit", message: "You need a credit to give a report." });
    assert.equal(mails.length, mailsBefore);
    assert.equal((await listGifts(GIFT_GIVER)).length, 0);
    assert.equal((await q("select 1 from invite_tokens where kind = 'gift'")).rowCount, 0);
  });

  await step("gifts: a gift holds a credit, its email and copy link on our web app whatever host the request names", async () => {
    await grantBundle(GIFT_GIVER.user, "couple", { test: true });
    const g1 = await call(GIFT_GIVER, "POST", "/gifts", { recipientName: "Pierre", email: "Pierre@Example.com", note: "  For your birthday  " }, FORGED_HOST);
    assert.equal(g1.status, 201);
    assert.ok(g1.body.claimUrl.startsWith(`${OUR_PAGE}/claim?token=`), g1.body.claimUrl);
    onOurWeb(mails.at(-1)!);
    assert.equal(g1.body.state, "waiting");
    assert.equal(g1.body.creditHeld, true);
    assert.equal(g1.body.recipientName, "Pierre");
    assert.equal(g1.body.email, "pierre@example.com");
    assert.equal(g1.body.note, "For your birthday");
    assert.equal(new Date(g1.body.returnsAt).getTime() - new Date(g1.body.sentAt).getTime(), 30 * 86400000);
    assert.equal(g1.body.remindedAt, null);
    giftPlain = g1.body.id;

    const r1 = await row(giftPlain);
    assert.equal(r1.kind, "gift");
    assert.equal(r1.profile_id, null);
    assert.equal((await creditRow(r1.credit_id)).status, "held");
    assert.equal(r1.email_delivered, true);
    assert.equal(mails.at(-1)!.to, "pierre@example.com");
  });

  await step("gifts: a second credit is held and the balance reflects both", async () => {
    const g2 = await call(GIFT_GIVER, "POST", "/gifts", { recipientName: "Beatrice", email: "gift-beatrice@example.com" });
    assert.equal(g2.status, 201);
    assert.equal(g2.body.creditHeld, true);
    assert.equal(g2.body.note, null);
    giftWithCredit = g2.body.id;
    giftWithCreditCreditId = (await row(giftWithCredit)).credit_id;

    assert.equal((await creditRow(giftWithCreditCreditId)).status, "held");
    const credits = await getCredits(GIFT_GIVER.user);
    assert.deepEqual([credits.available, credits.held], [1, 2]);
  });

  await step("gifts: the list is newest first and only the giver's", async () => {
    const list = await listGifts(GIFT_GIVER);
    assert.deepEqual(list.map((g) => g.id), [giftWithCredit, giftPlain]);
    assert.deepEqual(list.map((g) => g.creditHeld), [true, true]);
    assert.deepEqual(await listGifts(GIFT_RECIPIENT), []);
  });

  await step("gifts: remind and take back are the giver's alone", async () => {
    for (const who of [GIFT_RECIPIENT, ANON]) {
      assert.equal((await call(who, "POST", `/gifts/${giftWithCredit}/remind`)).status, 404);
      assert.equal((await call(who, "DELETE", `/gifts/${giftWithCredit}`)).status, 404);
    }
    assert.equal((await call(GIFT_GIVER, "POST", "/gifts/nope/remind")).status, 404);
  });

  await step("gifts: a reminder rotates the link, on our web app whatever host the request names, kills the old one, and is capped at one a day", async () => {
    const firstToken = tokenOf(mails.at(-1)!);
    assert.equal((await call(ANON, "GET", `/invites/${encodeURIComponent(firstToken)}`)).status, 200);

    const rem = await call(GIFT_GIVER, "POST", `/gifts/${giftWithCredit}/remind`, undefined, FORGED_HOST);
    assert.equal(rem.status, 204);
    const reminderMail = mails.at(-1)!;
    assert.match(reminderMail.subject, /still waiting/);
    onOurWeb(reminderMail);
    giftSecondToken = tokenOf(reminderMail);
    assert.notEqual(giftSecondToken, firstToken);
    assert.equal((await call(ANON, "GET", `/invites/${encodeURIComponent(firstToken)}`)).status, 404);
    const preview = await call(ANON, "GET", `/invites/${encodeURIComponent(giftSecondToken)}`);
    assert.equal(preview.status, 200);
    assert.equal(preview.body.kind, "gift");

    assert.equal((await call(GIFT_GIVER, "POST", `/gifts/${giftWithCredit}/remind`)).status, 429);
  });

  await step("gifts: a reminder whose email fails leaves the old link standing", async () => {
    const before = await row(giftPlain);
    failMail = true;
    const failed = await call(GIFT_GIVER, "POST", `/gifts/${giftPlain}/remind`);
    failMail = false;
    assert.equal(failed.status, 502);
    const after = await row(giftPlain);
    assert.equal(after.token_hash, before.token_hash);
    assert.equal(after.reminded_at, null);

    const [x, y] = await Promise.all([
      call(GIFT_GIVER, "POST", `/gifts/${giftPlain}/remind`),
      call(GIFT_GIVER, "POST", `/gifts/${giftPlain}/remind`),
    ]);
    assert.deepEqual([x.status, y.status].sort(), [204, 429]);
  });

  await step("gifts: take it back returns the credit", async () => {
    assert.equal((await call(GIFT_GIVER, "DELETE", `/gifts/${giftWithCredit}`)).status, 204);
    assert.equal((await creditRow(giftWithCreditCreditId)).status, "available");
    const listed = (await listGifts(GIFT_GIVER)).find((g) => g.id === giftWithCredit);
    assert.equal(listed.state, "returned");
    assert.equal(listed.creditHeld, false);
    assert.equal((await call(GIFT_GIVER, "DELETE", `/gifts/${giftWithCredit}`)).status, 204);
    assert.equal((await call(GIFT_GIVER, "POST", `/gifts/${giftWithCredit}/remind`)).status, 404);
    assert.equal((await call(ANON, "GET", `/invites/${encodeURIComponent(giftSecondToken)}`)).status, 404);
    const credits = await getCredits(GIFT_GIVER.user);
    assert.deepEqual([credits.available, credits.held], [2, 1]);
  });

  await step("gifts: claimed moves the credit to the recipient, the giver sees only claimed", async () => {
    // The claim below signs in as GIFT_RECIPIENT, so the gift must be
    // addressed to that account's own email (invites.ts checks the two match).
    const g3 = await call(GIFT_GIVER, "POST", "/gifts", { recipientName: "Bea", email: "gift-recipient@example.com", note: "<b>hi</b>" });
    assert.equal(g3.body.creditHeld, true);
    const giftClaimed = g3.body.id;
    const creditId = (await row(giftClaimed)).credit_id;

    const token = tokenOf(mails.at(-1)!);
    const claim = await call(GIFT_RECIPIENT, "POST", `/invites/${encodeURIComponent(token)}/claim`);
    assert.equal(claim.status, 200);
    assert.equal(claim.body.kind, "gift");
    assert.equal(claim.body.redirectTo, "/dashboard");
    assert.deepEqual(await creditRow(creditId), { status: "available", user_id: GIFT_RECIPIENT.user });

    const seen = (await listGifts(GIFT_GIVER)).find((g) => g.id === giftClaimed);
    assert.equal(seen.state, "claimed");
    assert.equal(seen.creditHeld, false);

    // The credit is the recipient's now: what they do with it never rewrites the giver's line (ADR-139).
    await q("update credits set status = 'used' where id = $1", [creditId]);
    assert.deepEqual((await listGifts(GIFT_GIVER)).find((g) => g.id === giftClaimed), seen);
    assert.equal((await call(GIFT_GIVER, "DELETE", `/gifts/${giftClaimed}`)).status, 409);
    assert.equal((await call(GIFT_GIVER, "POST", `/gifts/${giftClaimed}/remind`)).status, 404);

    const recipientCredits = await getCredits(GIFT_RECIPIENT.user);
    assert.deepEqual([recipientCredits.available, recipientCredits.used], [0, 1]);
  });

  await step("gifts: what the recipient writes never reaches the giver", async () => {
    await person("PGR", "Beatrice Gift Recipient", "beatrice", GIFT_RECIPIENT, true);
    await natal("RGR", "PGR", GIFT_RECIPIENT.session);
    assert.ok(!(await listReports(GIFT_GIVER)).has("RGR"));
    assert.equal((await call(GIFT_GIVER, "GET", "/reports/RGR")).status, 404);
    assert.equal((await call(GIFT_GIVER, "DELETE", "/reports/RGR")).status, 404);
    assert.equal((await listReports(GIFT_RECIPIENT)).get("RGR").access, "owner");
  });

  await step("gifts: expiry on read returns the credit", async () => {
    const g4 = await call(GIFT_GIVER, "POST", "/gifts", { recipientName: "Ada", email: "gift-ada@example.com" });
    const giftExpiring = g4.body.id;
    const creditId = (await row(giftExpiring)).credit_id;
    await q("update invite_tokens set expires_at = now() - interval '1 minute' where id = $1", [giftExpiring]);

    const expired = (await listGifts(GIFT_GIVER)).find((g) => g.id === giftExpiring);
    assert.equal(expired.state, "returned");
    assert.equal(expired.creditHeld, false);
    assert.equal((await creditRow(creditId)).status, "available");
    assert.equal((await call(GIFT_GIVER, "POST", `/gifts/${giftExpiring}/remind`)).status, 404);
    assert.equal((await call(GIFT_GIVER, "DELETE", `/gifts/${giftExpiring}`)).status, 204);
  });

  await step("gifts: a failed send still stands, and its reminder can succeed at once", async () => {
    failMail = true;
    const g5 = await call(GIFT_GIVER, "POST", "/gifts", { recipientName: "Noor", email: "gift-noor@example.com" });
    failMail = false;
    assert.equal(g5.status, 201);
    assert.equal(g5.body.state, "waiting");
    const giftFailedSend = g5.body.id;
    assert.equal((await row(giftFailedSend)).email_delivered, false);
    assert.equal((await call(GIFT_GIVER, "POST", `/gifts/${giftFailedSend}/remind`)).status, 204);
    assert.equal((await row(giftFailedSend)).email_delivered, true);
  });

  await step("gifts: no timer or countdown field anywhere", async () => {
    const all = JSON.stringify(await listGifts(GIFT_GIVER));
    assert.doesNotMatch(all, /days?Left|remaining|countdown|timer|secondsLeft/i);
  });

  await step("checkout/test: the free test checkout is gone, so it answers 404 signed out, signed in and as production, and grants nothing (ADR-276)", async () => {
    const before = process.env.APP_ENV;
    try {
      for (const env of [undefined, "production"]) {
        if (env === undefined) delete process.env.APP_ENV;
        else process.env.APP_ENV = env;
        for (const who of [ANON, CHECKOUT_USER]) {
          const gone = await call(who, "POST", "/checkout/test", { count: 3 });
          assert.equal(gone.status, 404, `${who.user ?? "signed out"} on ${env ?? "staging"}`);
        }
      }
    } finally {
      if (before === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = before;
    }

    assert.equal((await q("select 1 from bundles where user_id = $1", [CHECKOUT_USER.user])).rowCount, 0);
    assert.equal((await q("select 1 from credits where user_id = $1", [CHECKOUT_USER.user])).rowCount, 0);
    assert.deepEqual((await call(CHECKOUT_USER, "GET", "/credits")).body, { available: 0, used: 0, held: 0, lastBundle: null });
    assert.deepEqual((await call(CHECKOUT_USER, "GET", "/credits/history")).body, []);
    assert.deepEqual((await call(ANON, "GET", "/credits")).body, { available: 0, used: 0, held: 0, lastBundle: null });
    assert.deepEqual((await call(ANON, "GET", "/credits/history")).body, []);
  });

  await step("limits: the 11th send in an hour answers 429 with Retry-After and its line, and holds nothing (ADR-199)", async () => {
    // The checkout's own count is proved where Stripe is stood in for; a gift is the send this walk can make with no Stripe.
    await grantBundle(LIMITED.user, "family", { test: true });
    await grantBundle(LIMITED.user, "family", { test: true });
    await grantBundle(LIMITED.user, "solo", { test: true });
    const names = ["Ana", "Bo", "Cy", "Di", "Ed", "Flo", "Gus", "Hal", "Ivy", "Jo", "Kai"];
    for (let i = 0; i < LIMITS.send.limit; i++) {
      assert.equal((await call(LIMITED, "POST", "/gifts", { recipientName: names[i], email: `limited-${i + 1}@example.com` })).status, 201, `send ${i + 1}`);
    }
    const eleventh = await call(LIMITED, "POST", "/gifts", { recipientName: names[10], email: "limited-11@example.com" });
    assert.equal(eleventh.status, 429);
    const wait = Number(eleventh.headers.get("retry-after"));
    assert.ok(Number.isInteger(wait) && wait > 0 && wait <= 3600, `Retry-After: ${wait}`);
    assert.deepEqual(eleventh.body, { error: "rate_limited", message: LIMIT_LINES.send, retryAfterSeconds: wait });
    const credits = await getCredits(LIMITED.user);
    assert.deepEqual([credits.available, credits.held], [1, LIMITS.send.limit]);
  });

  await step("MB-170: a birth-time change over seven complete reports passes the newest alone on one write and leaves the six older outdated, stamped or not, so the refusal naming 6 reports no longer fires; once the hour's writes are spent, a change hears 429 before any pass and saves no time (ADR-199)", async () => {
    const f = fixture("charlotte");
    await person("PH", f.name, "charlotte", HORIZON, true);
    const ids = ["RH1", "RH2", "RH3", "RH4", "RH5", "RH6", "RH7"];
    for (const [i, id] of ids.entries()) {
      // The first three predate R15-20's stamp of the time a report was written for, so theirs is read from the passes.
      const stamp = i < 3 ? null : { writtenFor: { birthTime: f.birthTime, birthTimeWindowMinutes: 0, passes: 0 } };
      await q(
        `insert into reports (id, profile_id, session_id, type, status, interpretation, compute_data, created_at)
         values ($1, 'PH', $2, 'natal', 'complete', $3, $4, now() - make_interval(mins => $5))`,
        [id, HORIZON.session, JSON.stringify(PASSABLE_TEXT), stamp && JSON.stringify(stamp), ids.length - i],
      );
    }
    const change = (birthTime: string) => call(HORIZON, "PATCH", "/profiles/PH/birth-time", { birthTime, birthTimeWindowMinutes: 0 });
    const revisions = async () =>
      (await q("select count(*)::int as n from report_revisions v join reports r on r.id = v.report_id where r.profile_id = 'PH'")).rows[0].n as number;
    // A failed pass puts the old time back and leaves nothing outdated, so the step fails on one, with the pass's error.
    const passed = async (passes: number) => {
      const end = Date.now() + 10_000;
      for (;;) {
        const r = (await q("select status, horizon_passes, error_message from reports where id = 'RH7'")).rows[0];
        if (r.error_message) throw new Error(`the pass on RH7 failed: ${r.error_message}`);
        if (r.status === "complete" && r.horizon_passes === passes) return;
        if (Date.now() > end) throw new Error(`pass ${passes} on RH7 did not finish`);
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    };
    const passOn = async (birthTime: string, passes: number) => {
      passRising = chartForProfile({ ...f, birthTime, birthTimeWindowMinutes: 0 }).angles!.ascendant.sign.toLowerCase();
      const r = await change(birthTime);
      assert.equal(r.status, 202, `${birthTime}: ${JSON.stringify(r.body)}`);
      assert.deepEqual(r.body.reportIds, ["RH7"], birthTime);
      await passed(passes);
    };
    const outdated = () => Promise.all(ids.map(async (id) => (await call(HORIZON, "GET", `/reports/${id}`)).body.outdated));
    const refusedBeforeAnyPass = async (birthTime: string) => {
      const before = await revisions();
      const r = await change(birthTime);
      assert.equal(r.status, 429, birthTime);
      const wait = Number(r.headers.get("retry-after"));
      assert.ok(Number.isInteger(wait) && wait > 0 && wait <= 3600, `Retry-After: ${wait}`);
      assert.deepEqual(r.body, { error: "rate_limited", message: LIMIT_LINES.write, retryAfterSeconds: wait });
      assert.notEqual((await q("select birth_time from profiles where id = 'PH'")).rows[0].birth_time, birthTime, "no time saved");
      assert.equal(await revisions(), before, "no pass started");
    };

    // Seven reports outnumber the hour's writes, so a write held for each, the rule before MB-170, would have been refused.
    assert.ok(ids.length > LIMITS.write.limit, "seven reports no longer outnumber the hour's writes");
    const times = Array.from({ length: LIMITS.write.limit + 1 }, (_, i) => `${String(6 + i).padStart(2, "0")}:30`);
    await passOn(times[0], 1);
    assert.deepEqual(await outdated(), [true, true, true, true, true, true, false]);
    const newest = (await call(HORIZON, "GET", "/reports/RH7")).body;
    assert.deepEqual([newest.status, newest.horizonPasses, newest.revisions.map((v: { reason: string }) => v.reason)], ["complete", 1, ["birth_time_added"]]);
    const oldest = (await call(HORIZON, "GET", "/reports/RH1/status")).body;
    assert.deepEqual([oldest.outdated, oldest.canRegenerate], [true, true]);
    assert.deepEqual((await call(HORIZON, "GET", "/reports/RH1")).body.interpretation, PASSABLE_TEXT);

    // One write a change: the rest of the hour's writes each pass the newest again, and the next change is refused.
    for (let n = 2; n <= LIMITS.write.limit; n++) await passOn(times[n - 1], n);
    await refusedBeforeAnyPass(times[LIMITS.write.limit]);
    assert.deepEqual(await outdated(), [true, true, true, true, true, true, false]);
  });

  await step("the breaker: past DAILY_SPEND_CAP_USD, POST /reports answers 503 paused before its route, and the admin hears once (ADR-199)", async () => {
    const before = { mails: mails.length, cap: process.env.DAILY_SPEND_CAP_USD, admin: process.env.ADMIN_USER_ID };
    process.env.DAILY_SPEND_CAP_USD = "0.01";
    process.env.ADMIN_USER_ID = WALK_ADMIN.id;
    try {
      // A body the route itself would refuse, so a gate that failed to pause could start no generation: nothing here calls OpenAI.
      for (const attempt of [1, 2]) {
        const paused = await call(BREAKER, "POST", "/reports", {});
        assert.equal(paused.status, 503, `attempt ${attempt}`);
        assert.deepEqual([paused.body.error, paused.body.reason, typeof paused.body.message], ["paused", "paused", "string"]);
      }
      await until(() => mails.length > before.mails);
      // Long enough for a second email, were the once-a-day rule to fail.
      await new Promise((resolve) => setTimeout(resolve, 300));
    } finally {
      for (const [name, value] of [["DAILY_SPEND_CAP_USD", before.cap], ["ADMIN_USER_ID", before.admin]] as const) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
    assert.deepEqual(mails.slice(before.mails).map((m) => m.to), [WALK_ADMIN.email]);
    assert.doesNotMatch(mails.at(-1)!.text, /Athena|breaker@example\.com/);
    assert.equal((await q("select count(*)::int as n from reports where session_id = $1", [BREAKER.session])).rows[0].n, 1);
  });

  await step("no CORS: a foreign page's write answers 403 and changes nothing, ours goes through, and no response in the walk let another origin read it (ADR-197)", async () => {
    const giftsBefore = (await listGifts(GIFT_GIVER)).length;
    const mailsBefore = mails.length;
    const forged = await call(GIFT_GIVER, "POST", "/gifts", { recipientName: "Eve", email: "eve@example.com" }, { origin: FOREIGN_PAGE });
    assert.equal(forged.status, 403);
    assert.equal(forged.body.error, "forbidden_origin");
    assert.equal((await listGifts(GIFT_GIVER)).length, giftsBefore);
    assert.equal(mails.length, mailsBefore);

    const tick = { "career.actions.0": day(6) };
    const stored = () => workbookOf(GIVER, "RM");
    assert.equal((await call(GIVER, "PATCH", "/reports/RM/workbook", tick, { origin: FOREIGN_PAGE })).status, 403);
    assert.equal((await stored())["career.actions.0"], undefined);
    assert.equal((await call(GIVER, "PATCH", "/reports/RM/workbook", tick, { origin: OUR_PAGE })).status, 200);
    assert.equal((await stored())["career.actions.0"], day(6));

    assert.equal((await call(GIVER, "GET", "/reports", undefined, { origin: FOREIGN_PAGE })).status, 200);
    assert.deepEqual(corsAllowed, []);
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
  console.error("walk: could not finish setup —", setupError);
  process.exit(1);
}

for (const r of results) console.log(r.ok ? `ok  ${r.label}` : `FAIL ${r.label}: ${r.error}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} rules passed; ${mails.length} stub emails sent.`);
process.exit(failed ? 1 : 0);
