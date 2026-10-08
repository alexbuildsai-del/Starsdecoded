// R15-28: the sharing walk. Lane 3 of the mailbox sweep end to end on a
// scratch Postgres, beside loop.walk.ts: a share's claim lets its reader read
// and seats its sharer, Share yours back, Stop sharing ending the reading, the
// seat and a pair built on it at once, each reader's own ticks, Change address
// on a send and a gift, Not me after a hand-over, and the holder's rewrite
// (sweep acceptance 3 to 5; ADR-235 to 239; readings 3 to 10; MB-169).
// R15-D1 adds that a chart its subject claimed is never its writer's own to
// mark, share or pair-send (R-3.6).
// Every report's text is a stored row. A route that starts writing one meets
// a local model stand-in that refuses, mail goes to a local stub and Clerk is
// never asked, so nothing leaves the machine.
//
// `pnpm --filter @workspace/api-server run walk` runs it after loop.walk.ts
// against `WALK_DATABASE_URL`; without it, it skips. Its first statement
// truncates every table it touches, so a second run on the same database
// starts where the first did.

if (!process.env.WALK_DATABASE_URL) {
  console.log("sharing walk: skipped (no WALK_DATABASE_URL)");
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

// A pair the recipient builds and the holder's rewrite each start a model call. The client is pointed here whatever key
// the shell holds, a stand-in that refuses at once, so the report fails as a refused call fails it.
const modelStub = http.createServer((_req, res) => {
  res.writeHead(400, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: { message: "the walk calls no model", type: "invalid_request_error" } }));
});
process.env.OPENAI_BASE_URL = `http://127.0.0.1:${await listening(modelStub)}/v1`;

// Every link in an email starts at the configured web app, so each call that sends one names a foreign host.
const OUR_PAGE = "https://starsdecoded-staging.vercel.app";
process.env.PUBLIC_APP_URL = OUR_PAGE;
const FORGED_HOST = { "x-forwarded-host": "evil.example", "x-forwarded-proto": "http" };

// Deferred past the env writes above: @workspace/db throws at import unless DATABASE_URL is set, and the mailer and the
// model client read theirs when they are made.
const { pool } = await import("@workspace/db");
const zod = await import("@workspace/api-zod");
const { chartForProfile } = await import("../lib/profiles.js");
const { PROMPT_VERSION } = await import("../lib/aiInterpretation.js");
const { PAIR_PROMPT_VERSION } = await import("../prompts/pair/index.js");
const { grantBundle, getCredits } = await import("../lib/credits.js");
const { logger } = await import("../lib/logger.js");
const { apiHeaders, originGuard, webOrigins } = await import("../middlewares/origin.js");
const { default: router } = await import("../routes/index.js");

const q = (sql: string, params: unknown[] = []) => pool.query(sql, params);

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

async function call(who: Viewer, method: string, path: string, body?: unknown, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { "x-session": who.session, "content-type": "application/json", ...extra };
  if (who.user) headers["x-user"] = who.user;
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  const json = res.headers.get("content-type")?.includes("application/json");
  return { status: res.status, body: text && json ? JSON.parse(text) : text || null };
}
async function listReports(who: Viewer) {
  const r = await call(who, "GET", "/reports");
  assert.equal(r.status, 200);
  return new Map<string, any>(r.body.map((x: any) => [x.id, x]));
}
async function readHome(who: Viewer) {
  const r = await call(who, "GET", "/home");
  assert.equal(r.status, 200);
  return zod.GetHomeResponse.parse(r.body);
}
async function shares(who: Viewer) {
  const r = await call(who, "GET", "/shares");
  assert.equal(r.status, 200);
  return zod.ListSharesResponse.parse(r.body).map((s) => [s.id, s.email, s.readerName, s.state]);
}
const EMPTY_HOME = { you: null, several: false, people: [], pairs: [], practising: [], firstSteps: { step: 1, person: null, gift: false, pairReady: false } };
const day = (d: number) => `2026-10-0${d}T09:00:00.000Z`;
const emailOf = (who: Viewer) => `${who.user!.replace(/^user_/, "")}@example.com`;
const tokenOf = (m: Mail) => decodeURIComponent(/claim\?token=([^\s"&]+)/.exec(m.text)![1]);
const claimPath = (token: string) => `/invites/${encodeURIComponent(token)}/claim`;
const previewPath = (token: string) => `/invites/${encodeURIComponent(token)}`;
const row = async (id: string) => (await q("select * from invite_tokens where id = $1", [id])).rows[0];
const creditRow = async (id: string) => (await q("select status, user_id from credits where id = $1", [id])).rows[0];
function onOurWeb(m: Mail) {
  const urls = [...`${m.html}\n${m.text}`.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((u) => u[0]);
  assert.ok(urls.length > 0, m.subject);
  for (const url of urls) assert.ok(url.startsWith(`${OUR_PAGE}/`), `${m.subject}: ${url}`);
  assert.doesNotMatch(`${m.html}\n${m.text}`, /evil\.example/, m.subject);
}
// A report a route set writing fails at the stand-in; the step waits for that, so no write is left running.
async function settled(reportId: string) {
  const end = Date.now() + 10_000;
  for (;;) {
    const r = (await q("select status from reports where id = $1", [reportId])).rows[0];
    if (r && !["pending", "computing", "interpreting"].includes(r.status)) return r.status as string;
    if (Date.now() > end) throw new Error(`${reportId} is still being written`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

// Words only, no placement: every placement the walk shows comes from a computed chart.
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
    work: ["Your two speeds train patience on both sides.", "Money talk trains you to say the number first."],
    paradox: "The calm that holds you is the calm that hides the plan.",
    strengths: ["Marie finishes what Audrey starts.", "Audrey says it out loud first."],
    claims: [],
  },
};

async function person(id: string, fx: string, owner: Viewer, isSelf = false) {
  const f = fixture(fx);
  const chart = chartForProfile({ ...f, birthTimeWindowMinutes: f.birthTimeWindowMinutes ?? 0 });
  await q(
    `insert into profiles (id, session_id, user_id, is_self, name, birth_date, birth_time, birth_place, latitude, longitude, timezone_offset, timezone, birth_time_window_minutes, chart_data)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [id, owner.session, owner.user, isSelf, f.name, f.birthDate, f.birthTime, "fixture", f.latitude, f.longitude, chart.timezoneOffset, f.timezone ?? null, f.birthTimeWindowMinutes ?? 0, JSON.stringify(chart)],
  );
  return chart;
}
async function natal(id: string, profileId: string, session: string, status = "complete", interpretation: unknown = NATAL_TEXT) {
  await q(
    "insert into reports (id, profile_id, session_id, type, status, interpretation) values ($1,$2,$3,'natal',$4,$5)",
    [id, profileId, session, status, JSON.stringify(interpretation)],
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

// The assertions name people by the charts these accounts hold as their own: the sharer's is Marie Curie's, the
// recipient's Audrey Hepburn's, the giver's Oprah Winfrey's.
const SHARER = { user: "user_sharer", session: "s-sharer" };
const RECIPIENT = { user: "user_recipient", session: "s-recipient" };
const STRANGER = { user: "user_stranger", session: "s-stranger" };
const WRITING = { user: "user_writing", session: "s-writing" };
const KIM = { user: "user_kim", session: "s-kim" };
const ANON = { user: null, session: "s-anon" };
const GIVER = { user: "user_giver", session: "s-giver" };
const WILLIAM = { user: "user_william", session: "s-william" };
const BEATRICE = { user: "user_beatrice", session: "s-beatrice" };
// Claims a chart sent to them, shares it on as their own, keeps it, then finds it is not them.
const KEEPER = { user: "user_keeper", session: "s-keeper" };
const FRIEND = { user: "user_friend", session: "s-friend" };
// Claims a chart sent to them and keeps it, so it is theirs to rewrite.
const HOLDER = { user: "user_holder", session: "s-holder" };
// Writes Charlotte's chart, sends it to her and marks it as their own before she claims it; Noor reads what is shared.
const MARKER = { user: "user_marker", session: "s-marker" };
const CHARLOTTE = { user: "user_charlotte", session: "s-charlotte" };
const NOOR = { user: "user_noor", session: "s-noor" };

let setupError: unknown = null;
try {
  await q(
    "truncate table users, profiles, reports, relationships, relationship_participants, invite_tokens, bundles, credits, report_revisions, spend_ledger, profile_shares, report_workbooks, generation_failures cascade",
  );
  for (const who of [SHARER, RECIPIENT, STRANGER, WRITING, KIM, GIVER, WILLIAM, BEATRICE, KEEPER, FRIEND, HOLDER, MARKER, CHARLOTTE, NOOR]) {
    await q("insert into users (id, email) values ($1, $2)", [who.user, emailOf(who)]);
  }

  const marie = await person("PS", "marie-curie", SHARER, true);
  await natal("RS", "PS", SHARER.session);
  await person("PR", "audrey-hepburn", RECIPIENT, true);
  await natal("RR", "PR", RECIPIENT.session);
  await person("PWR", "athena", WRITING, true);
  await natal("RWR", "PWR", WRITING.session, "interpreting");
  await person("PG", "oprah-winfrey", GIVER, true);
  await natal("RG", "PG", GIVER.session, "complete", { ...NATAL_TEXT, meta: { promptVersion: PROMPT_VERSION } });
  await person("PW", "william", GIVER);
  await natal("RW", "PW", GIVER.session);
  await person("PC", "charles", GIVER);
  await natal("RC", "PC", GIVER.session);
  await person("PK", "george", GIVER);
  // Written on an earlier prompt version, which the page asks to rewrite (MB-45).
  await natal("RK", "PK", GIVER.session, "complete", { ...NATAL_TEXT, meta: { promptVersion: "v9" } });

  let shareId = "";
  let shareToken = "";
  let grantId = "";
  let backId = "";
  let pairId = "";

  await step("Share my report: a visitor, a reader with no report of their own, one still being written and their own address are refused; the link goes out on our web app whatever host the request names (ADR-235, reading 3)", async () => {
    assert.equal((await call(ANON, "POST", "/shares", { email: emailOf(RECIPIENT) })).status, 401);
    const none = await call(STRANGER, "POST", "/shares", { email: emailOf(RECIPIENT) });
    assert.deepEqual([none.status, none.body.error], [409, "no_own_report"]);
    const writing = await call(WRITING, "POST", "/shares", { email: emailOf(RECIPIENT) });
    assert.deepEqual([writing.status, writing.body.error], [409, "not_ready"]);
    const own = await call(SHARER, "POST", "/shares", { email: "Sharer@Example.com" });
    assert.deepEqual([own.status, own.body.error], [400, "validation_error"]);
    assert.equal(mails.length, 0);

    const shared = await call(SHARER, "POST", "/shares", { email: "Recipient@Example.com" }, FORGED_HOST);
    assert.equal(shared.status, 201, JSON.stringify(shared.body));
    zod.ShareMyReportResponse.parse(shared.body);
    assert.deepEqual([shared.body.email, shared.body.emailDelivered], [emailOf(RECIPIENT), true]);
    assert.ok(shared.body.claimUrl.startsWith(`${OUR_PAGE}/claim?token=`), shared.body.claimUrl);
    const days = (Date.parse(shared.body.expiresAt) - Date.now()) / 86_400_000;
    assert.ok(days > 6.99 && days <= 7, `${days} days`);
    const mail = mails.at(-1)!;
    assert.equal(mail.to, emailOf(RECIPIENT));
    onOurWeb(mail);
    shareId = shared.body.id;
    shareToken = tokenOf(mail);

    const again = await call(SHARER, "POST", "/shares", { email: emailOf(RECIPIENT) });
    assert.deepEqual([again.status, again.body.error], [409, "already_shared"]);
    assert.deepEqual(await shares(SHARER), [[shareId, emailOf(RECIPIENT), null, "waiting"]]);
    // A share hands nothing over, so it is never listed as a send waiting on the chart.
    assert.deepEqual((await call(SHARER, "GET", "/invites?profileId=PS")).body, []);
    const preview = await call(ANON, "GET", previewPath(shareToken));
    assert.equal(preview.status, 200);
    zod.GetInviteResponse.parse(preview.body);
    assert.deepEqual(
      [preview.body.kind, preview.body.inviterName, preview.body.profileName, preview.body.alreadyClaimed, preview.body.relationshipId],
      ["share", "Marie", "Marie", false, null],
    );
    assert.doesNotMatch(JSON.stringify(preview.body), /Curie/);
  });

  await step("the claim writes a grant and hands nothing over: the recipient reads the whole Personal report as shared, and can neither send, delete, rewrite, re-mark nor re-time it (ADR-235, reading 3)", async () => {
    assert.equal((await call(STRANGER, "POST", claimPath(shareToken))).status, 403);
    const claim = await call(RECIPIENT, "POST", claimPath(shareToken));
    assert.equal(claim.status, 200, JSON.stringify(claim.body));
    zod.ClaimInviteResponse.parse(claim.body);
    assert.deepEqual(claim.body, {
      profileId: "PS", relationshipId: null, relationshipReportId: null, redirectTo: "/dashboard", kind: "share", askSelf: false, shareBack: true,
    });
    assert.deepEqual(
      (await q("select user_id, claimed_by_user_id, is_self from profiles where id = 'PS'")).rows[0],
      { user_id: SHARER.user, claimed_by_user_id: null, is_self: true },
    );
    const grants = (await q("select id, owner_user_id, reader_user_id, invite_id from profile_shares where profile_id = 'PS' and revoked_at is null")).rows;
    assert.deepEqual(grants.map((g) => [g.owner_user_id, g.reader_user_id, g.invite_id]), [[SHARER.user, RECIPIENT.user, shareId]]);
    grantId = grants[0].id;

    const read = await call(RECIPIENT, "GET", "/reports/RS");
    assert.equal(read.status, 200);
    assert.deepEqual(
      [read.body.access, read.body.send, read.body.canRegenerate, read.body.profileId, read.body.giverName, read.body.workbook],
      ["shared", null, false, null, "Marie", {}],
    );
    assert.deepEqual(read.body.interpretation, NATAL_TEXT);
    assert.equal((await call(RECIPIENT, "GET", "/reports/RS/status")).status, 200);
    const listed = (await listReports(RECIPIENT)).get("RS");
    assert.deepEqual([listed.access, listed.sharedBy, listed.send], ["shared", "Marie", null]);

    const mailsBefore = mails.length;
    for (const [m, p, body] of [
      ["DELETE", "/reports/RS", undefined],
      ["POST", "/reports/RS/regenerate", undefined],
      ["PATCH", "/profiles/PS", { isSelf: true }],
      ["PATCH", "/profiles/PS/birth-time", { birthTime: "06:00", birthTimeWindowMinutes: 0 }],
      ["POST", "/profiles/PS/hand-back", undefined],
      ["POST", "/profiles/PS/stop-sharing", undefined],
    ] as const) {
      assert.equal((await call(RECIPIENT, m, p, body)).status, 404, `${m} ${p}`);
    }
    assert.equal((await call(RECIPIENT, "POST", "/invites", { profileId: "PS", email: "someone@example.com" })).status, 404);
    assert.equal(mails.length, mailsBefore);
    assert.deepEqual(
      (await q("select r.status, p.birth_time, p.user_id from reports r join profiles p on p.id = r.profile_id where r.id = 'RS'")).rows[0],
      { status: "complete", birth_time: fixture("marie-curie").birthTime, user_id: SHARER.user },
    );

    const repeat = await call(RECIPIENT, "POST", claimPath(shareToken));
    assert.deepEqual([repeat.status, repeat.body.kind], [200, "share"]);
    assert.equal((await q("select count(*)::int as n from profile_shares where profile_id = 'PS'")).rows[0].n, 1);
  });

  await step("home: the recipient's circle seats the sharer, marked shared and offering Share yours back, and the sharer's list names who reads theirs (ADR-235, reading 4)", async () => {
    const r = await readHome(RECIPIENT);
    assert.deepEqual([r.you?.profileId, r.you?.access, r.you?.isSelf], ["PR", "owner", true]);
    assert.deepEqual(
      r.people.map((p) => [p.profileId, p.reportId, p.access, p.isSelf, p.shareBack, p.canRegenerate, p.lines]),
      [["PS", "RS", "shared", false, true, false, null]],
    );
    assert.deepEqual(r.people[0].triad?.sun, { sign: marie.planets.sun.sign, degree: marie.planets.sun.degree, house: marie.planets.sun.house });
    const s = await readHome(SHARER);
    assert.deepEqual([s.you?.profileId, s.people], ["PS", []]);
    assert.deepEqual(await shares(SHARER), [[grantId, emailOf(RECIPIENT), "Audrey", "active"]]);
  });

  await step("ticks per reader: the recipient's ticks and pins never show in the sharer's workbook or practice, the sharer's never in theirs, and each holds three pins of their own (ADR-239, sweep acceptance 5)", async () => {
    const tick = (who: Viewer, body: Record<string, string | null>) => call(who, "PATCH", "/reports/RS/workbook", body);
    assert.equal((await tick(RECIPIENT, { "career.actions.0": day(1), "pin.focus.practice.bullets.0": day(1) })).status, 200);
    assert.equal((await tick(SHARER, { "career.actions.1": day(2) })).status, 200);
    assert.deepEqual((await call(RECIPIENT, "GET", "/reports/RS")).body.workbook, { "career.actions.0": day(1), "pin.focus.practice.bullets.0": day(1) });
    assert.deepEqual((await call(SHARER, "GET", "/reports/RS")).body.workbook, { "career.actions.1": day(2) });
    const readers = (await q("select reader from report_workbooks where report_id = 'RS' order by reader")).rows.map((r) => r.reader);
    assert.deepEqual(readers, [RECIPIENT.user, SHARER.user]);
    assert.deepEqual((await q("select workbook from reports where id = 'RS'")).rows[0].workbook, {});

    // The sharer's own report offers its first practice unpinned, though the recipient pinned it on their copy.
    const first = NATAL_TEXT.focus.practice.bullets[0];
    assert.deepEqual((await readHome(SHARER)).practising, [
      { reportId: "RS", kind: "natal", key: "focus.practice.bullets.0", action: first.point, why: first.why, pinned: false, ticked: false },
    ]);
    // A reader practises their own report, never one shared with them (reading 5).
    assert.deepEqual((await readHome(RECIPIENT)).practising.map((p) => [p.reportId, p.key, p.pinned]), [["RR", "focus.practice.bullets.0", false]]);

    for (const n of [1, 2]) assert.equal((await tick(RECIPIENT, { [`pin.focus.practice.bullets.${n}`]: day(3) })).status, 200);
    const fourth = await tick(RECIPIENT, { "pin.superpowers.superpower.actions.0": day(4) });
    assert.deepEqual([fourth.status, fourth.body.error], [400, "pin_limit"]);
    for (const n of [0, 1, 2]) assert.equal((await tick(SHARER, { [`pin.focus.practice.bullets.${n}`]: day(4) })).status, 200);
    assert.deepEqual((await readHome(SHARER)).practising.map((p) => [p.key, p.pinned]), [
      ["focus.practice.bullets.0", true], ["focus.practice.bullets.1", true], ["focus.practice.bullets.2", true],
    ]);
    assert.deepEqual(Object.keys((await call(RECIPIENT, "GET", "/reports/RS")).body.workbook).sort(), [
      "career.actions.0", "pin.focus.practice.bullets.0", "pin.focus.practice.bullets.1", "pin.focus.practice.bullets.2",
    ]);
  });

  await step("Share yours back: one tap and no email, with no address shown; the sharer reads the recipient's report and seats them, and it is offered no more (ADR-235, reading 4)", async () => {
    const mailsBefore = mails.length;
    assert.equal((await call(STRANGER, "POST", "/shares/back", { profileId: "PS" })).status, 404);
    const back = await call(RECIPIENT, "POST", "/shares/back", { profileId: "PS" });
    assert.equal(back.status, 201, JSON.stringify(back.body));
    zod.ShareBackResponse.parse(back.body);
    assert.deepEqual([back.body.email, back.body.readerName, back.body.state], ["", "Marie", "active"]);
    backId = back.body.id;
    assert.equal(mails.length, mailsBefore);

    const read = await call(SHARER, "GET", "/reports/RR");
    assert.deepEqual([read.status, read.body.access, read.body.giverName, read.body.canRegenerate, read.body.workbook], [200, "shared", "Audrey", false, {}]);
    assert.deepEqual((await readHome(SHARER)).people.map((p) => [p.profileId, p.access, p.shareBack]), [["PR", "shared", false]]);
    assert.deepEqual((await readHome(RECIPIENT)).people.map((p) => [p.profileId, p.access, p.shareBack]), [["PS", "shared", false]]);
    const again = await call(RECIPIENT, "POST", "/shares/back", { profileId: "PS" });
    assert.deepEqual([again.status, again.body.error], [409, "already_shared"]);
    assert.equal((await call(RECIPIENT, "POST", claimPath(shareToken))).body.shareBack, false);
    assert.deepEqual(await shares(RECIPIENT), [[backId, "", "Marie", "active"]]);
  });

  await step("a pair the recipient builds on the shared chart reads while the grant stands and offers Send to its other person, the sharer, whose chart stays theirs (ADR-235, 285)", async () => {
    assert.equal((await call(STRANGER, "POST", "/compatibility", { reportAId: "RS", reportBId: "RR", lens: "people" })).status, 404);
    await grantBundle(RECIPIENT.user, "solo", { test: true });
    const made = await call(RECIPIENT, "POST", "/compatibility", { reportAId: "RR", reportBId: "RS", lens: "people" });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    pairId = made.body.id;
    // The stand-in refuses the write, so once it has failed the walk stores the pair's text, as it stores every report's.
    assert.equal(await settled(pairId), "failed");
    await q("update reports set status = 'complete', interpretation = $1, error_message = null, failure_code = null where id = $2", [JSON.stringify(PAIR_TEXT), pairId]);

    const listed = (await listReports(RECIPIENT)).get(pairId);
    assert.deepEqual(
      [listed.access, listed.send, listed.stoppedBy, listed.participants[1].sunSign],
      ["owner", { state: "can_send", firstName: "Marie", profileId: "PS", relationshipId: listed.send.relationshipId }, null, marie.planets.sun.sign],
    );
    assert.equal((await call(RECIPIENT, "GET", `/reports/${pairId}`)).status, 200);
    assert.equal((await call(RECIPIENT, "GET", `/compatibility/${pairId}/summary`)).status, 200);
    const pair = (await readHome(RECIPIENT)).pairs.find((p) => p.reportId === pairId);
    assert.deepEqual([pair?.stoppedBy, pair?.strong, pair?.story?.headline], [null, PAIR_TEXT.twoCharts.strong, PAIR_TEXT.twoCharts.headline]);

    const mailsBefore = mails.length;
    const sent = await call(RECIPIENT, "POST", `/compatibility/${pairId}/send`, { email: emailOf(SHARER) });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    assert.equal(sent.body.state, "invited");
    assert.equal(mails.length, mailsBefore + 1);
    assert.equal(mails.at(-1)!.to, emailOf(SHARER));
    assert.equal((await q("select claimed_by_user_id from profiles where id = 'PS'")).rows[0].claimed_by_user_id, null);
  });

  await step("Stop sharing ends the recipient's reading and the sharer's seat at once, closes the pair built on it naming the sharer, and kills the link; the recipient's own share stands until they stop it (ADR-235, reading 5)", async () => {
    assert.equal((await call(RECIPIENT, "DELETE", `/shares/${grantId}`)).status, 404, "the reader cannot stop the sharer's share");
    assert.equal((await call(STRANGER, "DELETE", `/shares/${grantId}`)).status, 404);
    assert.equal((await call(SHARER, "DELETE", `/shares/${grantId}`)).status, 204);

    for (const p of ["/reports/RS", "/reports/RS/status", `/reports/${pairId}`, `/compatibility/${pairId}/summary`]) {
      assert.equal((await call(RECIPIENT, "GET", p)).status, 404, p);
    }
    assert.equal((await call(RECIPIENT, "PATCH", "/reports/RS/workbook", { "career.actions.2": day(5) })).status, 404);
    const listed = await listReports(RECIPIENT);
    assert.ok(!listed.has("RS"));
    assert.deepEqual([listed.get(pairId).stoppedBy, listed.get(pairId).participants[1].sunSign], ["Marie", null]);
    const r = await readHome(RECIPIENT);
    assert.deepEqual(r.people, []);
    const closed = r.pairs.find((p) => p.reportId === pairId);
    assert.deepEqual([closed?.stoppedBy, closed?.strong, closed?.challenge, closed?.story], ["Marie", [], null, null]);
    assert.equal((await call(ANON, "GET", previewPath(shareToken))).status, 404);
    assert.equal((await call(RECIPIENT, "POST", claimPath(shareToken))).status, 404);
    assert.deepEqual(await shares(SHARER), []);
    assert.equal((await call(SHARER, "DELETE", `/shares/${grantId}`)).status, 404);

    // Each share is its own grant: the recipient's to the sharer still reads, and is theirs alone to stop.
    assert.equal((await call(SHARER, "GET", "/reports/RR")).status, 200);
    assert.deepEqual((await readHome(SHARER)).people.map((p) => [p.profileId, p.access, p.shareBack]), [["PR", "shared", true]]);
    assert.equal((await call(SHARER, "DELETE", `/shares/${backId}`)).status, 404);
    assert.equal((await call(RECIPIENT, "DELETE", `/shares/${backId}`)).status, 204);
    assert.equal((await call(SHARER, "GET", "/reports/RR")).status, 404);
    assert.deepEqual((await readHome(SHARER)).people, []);
  });

  await step("a waiting share stops at once: its link no longer opens or claims (reading 5)", async () => {
    const shared = await call(SHARER, "POST", "/shares", { email: emailOf(KIM) });
    assert.equal(shared.status, 201);
    const token = tokenOf(mails.at(-1)!);
    assert.equal((await call(ANON, "GET", previewPath(token))).status, 200);
    assert.deepEqual(await shares(SHARER), [[shared.body.id, emailOf(KIM), null, "waiting"]]);
    assert.equal((await call(SHARER, "DELETE", `/shares/${shared.body.id}`)).status, 204);
    assert.equal((await call(ANON, "GET", previewPath(token))).status, 404);
    assert.equal((await call(KIM, "POST", claimPath(token))).status, 404);
    assert.deepEqual(await shares(SHARER), []);
    assert.equal((await q("select count(*)::int as n from profile_shares where reader_user_id = $1", [KIM.user])).rows[0].n, 0);
  });

  await step("Change address on a waiting send: the same send under a new link to the new address, on our web app whatever host the request names; the old link is dead, and once claimed it answers 409 not_waiting (ADR-237, reading 7)", async () => {
    const sent = await call(GIVER, "POST", "/invites", { profileId: "PW", email: "wiliam@example.com" });
    assert.equal(sent.status, 201);
    const oldToken = tokenOf(mails.at(-1)!);
    assert.equal((await call(STRANGER, "POST", `/invites/${sent.body.id}/change-address`, { email: emailOf(WILLIAM) })).status, 404);
    const changed = await call(GIVER, "POST", `/invites/${sent.body.id}/change-address`, { email: emailOf(WILLIAM) }, FORGED_HOST);
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    zod.ChangeInviteAddressResponse.parse(changed.body);
    assert.deepEqual([changed.body.id, changed.body.email, changed.body.profileId, changed.body.emailDelivered], [sent.body.id, emailOf(WILLIAM), "PW", true]);
    const mail = mails.at(-1)!;
    assert.equal(mail.to, emailOf(WILLIAM));
    onOurWeb(mail);
    const newToken = tokenOf(mail);
    assert.equal(changed.body.token, newToken);
    assert.notEqual(newToken, oldToken);

    assert.equal((await call(ANON, "GET", previewPath(oldToken))).status, 404);
    assert.equal((await call(WILLIAM, "POST", claimPath(oldToken))).status, 404);
    const preview = await call(ANON, "GET", previewPath(newToken));
    assert.deepEqual([preview.status, preview.body.kind, preview.body.email], [200, "send", emailOf(WILLIAM)]);
    assert.deepEqual((await call(GIVER, "GET", "/invites?profileId=PW")).body.map((i: { id: string; email: string }) => [i.id, i.email]), [[sent.body.id, emailOf(WILLIAM)]]);
    const claimed = await call(WILLIAM, "POST", claimPath(newToken));
    assert.deepEqual([claimed.status, claimed.body.kind, claimed.body.profileId], [200, "send", "PW"]);
    const late = await call(GIVER, "POST", `/invites/${sent.body.id}/change-address`, { email: "will@example.com" });
    assert.deepEqual([late.status, late.body.error], [409, "not_waiting"]);
  });

  await step("Change address on a waiting gift: the old link is dead, and the gift keeps its id, its held credit, its note and its return date; once claimed it answers 409 not_waiting (ADR-237, reading 7)", async () => {
    await grantBundle(GIVER.user, "couple");
    const gift = await call(GIVER, "POST", "/gifts", { recipientName: "Beatrice", email: "beatrise@example.com", note: "For your birthday" });
    assert.equal(gift.status, 201, JSON.stringify(gift.body));
    assert.equal(gift.body.creditHeld, true);
    const oldToken = tokenOf(mails.at(-1)!);
    const creditId = (await row(gift.body.id)).credit_id;
    assert.equal((await call(STRANGER, "POST", `/gifts/${gift.body.id}/change-address`, { email: emailOf(BEATRICE) })).status, 404);

    const changed = await call(GIVER, "POST", `/gifts/${gift.body.id}/change-address`, { email: emailOf(BEATRICE) }, FORGED_HOST);
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    zod.ChangeGiftAddressResponse.parse(changed.body);
    assert.deepEqual(
      [changed.body.id, changed.body.email, changed.body.state, changed.body.creditHeld, changed.body.note, changed.body.sentAt, changed.body.returnsAt],
      [gift.body.id, emailOf(BEATRICE), "waiting", true, "For your birthday", gift.body.sentAt, gift.body.returnsAt],
    );
    const mail = mails.at(-1)!;
    assert.equal(mail.to, emailOf(BEATRICE));
    onOurWeb(mail);
    const newToken = tokenOf(mail);
    assert.equal((await call(ANON, "GET", previewPath(oldToken))).status, 404);
    assert.equal((await call(BEATRICE, "POST", claimPath(oldToken))).status, 404);
    assert.equal((await row(gift.body.id)).credit_id, creditId);
    assert.deepEqual(await creditRow(creditId), { status: "held", user_id: GIVER.user });
    const listed = (await call(GIVER, "GET", "/gifts")).body.find((g: { id: string }) => g.id === gift.body.id);
    assert.deepEqual([listed.email, listed.creditHeld, listed.returnsAt], [emailOf(BEATRICE), true, gift.body.returnsAt]);

    const claimed = await call(BEATRICE, "POST", claimPath(newToken));
    assert.deepEqual([claimed.status, claimed.body.kind], [200, "gift"]);
    assert.deepEqual(await creditRow(creditId), { status: "available", user_id: BEATRICE.user });
    const late = await call(GIVER, "POST", `/gifts/${gift.body.id}/change-address`, { email: "bea@example.com" });
    assert.deepEqual([late.status, late.body.error], [409, "not_waiting"]);
  });

  let keeperSendId = "";
  let keeperShareToken = "";

  await step("a chart claimed as the claimer's own can be shared on, and their Stop sharing hands it over: its giver reads it no more and the share stands (ADR-139, ADR-235)", async () => {
    const sent = await call(GIVER, "POST", "/invites", { profileId: "PC", email: emailOf(KEEPER) });
    assert.equal(sent.status, 201);
    keeperSendId = sent.body.id;
    const claim = await call(KEEPER, "POST", claimPath(tokenOf(mails.at(-1)!)));
    assert.deepEqual([claim.status, claim.body.kind, claim.body.askSelf], [200, "send", false]);
    const shared = await call(KEEPER, "POST", "/shares", { email: emailOf(FRIEND) });
    assert.equal(shared.status, 201, JSON.stringify(shared.body));
    keeperShareToken = tokenOf(mails.at(-1)!);
    const friendClaim = await call(FRIEND, "POST", claimPath(keeperShareToken));
    assert.deepEqual([friendClaim.status, friendClaim.body.kind, friendClaim.body.profileId], [200, "share", "PC"]);
    assert.equal((await call(FRIEND, "GET", "/reports/RC")).body.access, "shared");

    assert.equal((await call(KEEPER, "POST", "/profiles/PC/stop-sharing")).status, 204);
    assert.equal((await call(GIVER, "GET", "/reports/RC")).status, 404);
    assert.equal((await call(FRIEND, "GET", "/reports/RC")).status, 200);
    assert.deepEqual((await readHome(FRIEND)).people.map((p) => [p.profileId, p.access]), [["PC", "shared"]]);
  });

  await step("Not me after a hand-over hands the chart back to its writer: the claim ends, the claimer's shares of it end, and the giver reads Handed back with Send again, a new send; the writer hears there is no one to hand it back to (ADR-236, reading 6)", async () => {
    const back = await call(KEEPER, "POST", "/profiles/PC/hand-back");
    assert.equal(back.status, 200, JSON.stringify(back.body));
    zod.HandBackProfileResponse.parse(back.body);
    assert.deepEqual(back.body, { profileId: "PC" });
    assert.deepEqual(
      (await q("select user_id, claimed_by_user_id, claimed_as_self, is_self from profiles where id = 'PC'")).rows[0],
      { user_id: GIVER.user, claimed_by_user_id: null, claimed_as_self: false, is_self: false },
    );
    assert.ok((await row(keeperSendId)).handed_back_at, "the send is stamped handed back");

    assert.equal((await call(KEEPER, "GET", "/reports/RC")).status, 404);
    assert.deepEqual(await readHome(KEEPER), EMPTY_HOME);
    assert.deepEqual((await call(KEEPER, "GET", "/profiles")).body, []);
    assert.equal((await call(KEEPER, "POST", "/profiles/PC/hand-back")).status, 404);

    assert.equal((await call(FRIEND, "GET", "/reports/RC")).status, 404);
    assert.deepEqual(await readHome(FRIEND), EMPTY_HOME);
    assert.equal((await call(ANON, "GET", previewPath(keeperShareToken))).status, 404);
    assert.equal((await q("select count(*)::int as n from profile_shares where profile_id = 'PC' and revoked_at is null")).rows[0].n, 0);

    const listed = (await listReports(GIVER)).get("RC");
    assert.deepEqual([listed.access, listed.send], ["owner", { state: "handed_back", profileId: "PC", relationshipId: null, firstName: "Charles" }]);
    assert.equal((await call(GIVER, "GET", "/reports/RC")).body.send.state, "handed_back");
    const pc = (await call(GIVER, "GET", "/profiles")).body.find((p: { id: string }) => p.id === "PC");
    assert.deepEqual([pc.ownership, pc.claimedByName, pc.send.state], ["owner", null, "handed_back"]);
    const writer = await call(GIVER, "POST", "/profiles/PC/hand-back");
    assert.deepEqual([writer.status, writer.body.error], [409, "not_claimed"]);

    const again = await call(GIVER, "POST", "/invites", { profileId: "PC", email: "charles@example.com" });
    assert.equal(again.status, 201);
    assert.equal((await listReports(GIVER)).get("RC").send.state, "sent");
  });

  await step("MB-169: the holder rewrites a report after a hand-over, free, where its writer no longer can; before it, the claimer who did not hold it could not (reading 10)", async () => {
    const sent = await call(GIVER, "POST", "/invites", { profileId: "PK", email: emailOf(HOLDER) });
    assert.equal(sent.status, 201);
    assert.equal((await call(HOLDER, "POST", claimPath(tokenOf(mails.at(-1)!)))).status, 200);
    assert.equal((await call(HOLDER, "GET", "/reports/RK")).body.canRegenerate, false);
    assert.deepEqual([(await readHome(HOLDER)).you?.profileId, (await readHome(HOLDER)).you?.canRegenerate], ["PK", false]);
    assert.equal((await call(HOLDER, "POST", "/reports/RK/regenerate")).status, 404);
    assert.equal((await call(GIVER, "GET", "/reports/RK")).body.canRegenerate, true);

    assert.equal((await call(HOLDER, "POST", "/profiles/PK/stop-sharing")).status, 204);
    assert.equal((await call(HOLDER, "GET", "/reports/RK")).body.canRegenerate, true);
    assert.equal((await readHome(HOLDER)).you?.canRegenerate, true);
    assert.equal((await call(GIVER, "POST", "/reports/RK/regenerate")).status, 404);

    await grantBundle(HOLDER.user, "solo");
    const before = await getCredits(HOLDER.user);
    const rewrite = await call(HOLDER, "POST", "/reports/RK/regenerate");
    assert.deepEqual([rewrite.status, rewrite.body], [202, { id: "RK", status: "interpreting" }]);
    assert.equal(await settled("RK"), "failed");
    const after = await getCredits(HOLDER.user);
    assert.deepEqual([after.available, after.used], [before.available, before.used]);

    const current = await call(GIVER, "POST", "/reports/RG/regenerate");
    assert.deepEqual([current.status, current.body.error], [409, "up_to_date"]);
  });

  await step("a chart its subject claimed is never its writer's own: marking it is refused, and a mark left from before her claim shares, re-sends and pair-sends nothing, ends the share it made and is no chart of theirs when one is sent to them, while her own share stands (R-3.6)", async () => {
    await person("PX", "charlotte", MARKER);
    await natal("RX", "PX", MARKER.session);
    await person("PY", "beatrice", MARKER);
    await natal("RY", "PY", MARKER.session);
    // The marker's pair of the two, stored finished as the walk stores every report.
    await q("insert into relationships (id, session_id, user_id, type) values ('LXY', $1, $2, 'people')", [MARKER.session, MARKER.user]);
    await q("insert into relationship_participants (id, relationship_id, profile_id, role, position) values ('LXY-a', 'LXY', 'PX', 'primary', '0'), ('LXY-b', 'LXY', 'PY', 'secondary', '1')");
    await q(
      "insert into reports (id, profile_id, session_id, type, status, relationship_id, interpretation, compute_data) values ('RXY', 'PX', $1, 'compatibility', 'complete', 'LXY', $2, $3)",
      [MARKER.session, JSON.stringify(PAIR_TEXT), JSON.stringify({ reportAId: "RX", reportBId: "RY", lens: "people" })],
    );

    // While the send waits, nothing refuses its writer marking the chart as theirs and sharing it.
    assert.equal((await call(MARKER, "POST", "/invites", { profileId: "PX", email: emailOf(CHARLOTTE) })).status, 201);
    const sendToken = tokenOf(mails.at(-1)!);
    assert.equal((await call(MARKER, "PATCH", "/profiles/PX", { isSelf: true })).status, 200);
    const shared = await call(MARKER, "POST", "/shares", { email: emailOf(NOOR) });
    assert.equal(shared.status, 201, JSON.stringify(shared.body));
    assert.equal((await call(NOOR, "POST", claimPath(tokenOf(mails.at(-1)!)))).status, 200);
    assert.equal((await call(NOOR, "GET", "/reports/RX")).body.access, "shared");

    const claim = await call(CHARLOTTE, "POST", claimPath(sendToken));
    assert.deepEqual([claim.status, claim.body.kind, claim.body.askSelf], [200, "send", false]);
    assert.deepEqual(
      (await q("select is_self, claimed_by_user_id, claimed_as_self from profiles where id = 'PX'")).rows[0],
      { is_self: true, claimed_by_user_id: CHARLOTTE.user, claimed_as_self: true },
    );

    const remark = await call(MARKER, "PATCH", "/profiles/PX", { isSelf: true });
    assert.deepEqual([remark.status, remark.body.error], [403, "forbidden"]);
    assert.equal((await call(NOOR, "GET", "/reports/RX")).status, 404, "the share made before her claim reads no more");
    assert.deepEqual(await shares(MARKER), []);
    const mailsBefore = mails.length;
    const again = await call(MARKER, "POST", "/shares", { email: "yusuf@example.com" });
    assert.deepEqual([again.status, again.body.error], [409, "no_own_report"]);
    const resend = await call(MARKER, "POST", "/invites", { profileId: "PX", email: "charlotte.w@example.com" });
    assert.deepEqual([resend.status, resend.body.error], [409, "already_claimed"]);
    assert.deepEqual((await listReports(MARKER)).get("RX").send, { state: "joined", profileId: "PX", relationshipId: null, firstName: "Charlotte" });
    assert.equal((await listReports(MARKER)).get("RXY").send, null);
    assert.equal((await call(MARKER, "POST", "/compatibility/RXY/send", { email: "beatrice.york@example.com" })).status, 403);
    assert.equal(mails.length, mailsBefore);
    assert.equal((await readHome(MARKER)).you, null);
    assert.equal((await call(MARKER, "GET", "/profiles")).body.find((p: { id: string }) => p.id === "PX").isSelf, false);

    const hers = await call(CHARLOTTE, "POST", "/shares", { email: emailOf(NOOR) });
    assert.equal(hers.status, 201, JSON.stringify(hers.body));
    assert.equal((await call(NOOR, "POST", claimPath(tokenOf(mails.at(-1)!)))).status, 200);
    assert.deepEqual(
      (await q("select owner_user_id from profile_shares where profile_id = 'PX' and reader_user_id = $1 and revoked_at is null", [NOOR.user])).rows,
      [{ owner_user_id: CHARLOTTE.user }],
    );
    assert.equal((await call(NOOR, "GET", "/reports/RX")).body.access, "shared");

    // A chart sent to the marker is theirs at once: the mark left on Charlotte's is no chart of theirs to ask about.
    await person("PM", "george", CHARLOTTE);
    await natal("RM", "PM", CHARLOTTE.session);
    assert.equal((await call(CHARLOTTE, "POST", "/invites", { profileId: "PM", email: emailOf(MARKER) })).status, 201);
    const sentToMarker = await call(MARKER, "POST", claimPath(tokenOf(mails.at(-1)!)));
    assert.deepEqual([sentToMarker.status, sentToMarker.body.askSelf], [200, false]);
    assert.equal((await readHome(MARKER)).you?.profileId, "PM");

    // Taking the mark off is still the writer's.
    assert.equal((await call(MARKER, "PATCH", "/profiles/PX", { isSelf: false })).status, 200);
    assert.equal((await q("select is_self from profiles where id = 'PX'")).rows[0].is_self, false);
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
  console.error("sharing walk: could not finish setup —", setupError);
  process.exit(1);
}

for (const r of results) console.log(r.ok ? `ok  ${r.label}` : `FAIL ${r.label}: ${r.error}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\nsharing walk: ${results.length - failed}/${results.length} rules passed; ${mails.length} stub emails sent.`);
process.exit(failed ? 1 : 0);
