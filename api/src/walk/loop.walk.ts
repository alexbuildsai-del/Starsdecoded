// R10-22: the walk. Every access and ledger rule this round shipped, proved
// end to end on a scratch Postgres, with no Clerk and no network — mail goes
// to a local stub, and every report here is a stored row, never generated,
// since nothing in this file may call OpenAI (dashboard-sky acceptance 11;
// credit-loop acceptance 2, 4; ADR-138, 139; MB-84, 103).
// MB-49 provisional: the ledger this proves is the soft-pass one `consumeCredit`
// still runs, so this file's checks retire with that pass, not before it.
//
// `pnpm --filter @workspace/api-server run walk` runs this against
// `WALK_DATABASE_URL`; without it, it skips. Run twice on the same database:
// the first statement truncates every table it touches, so a prior run
// leaves nothing behind for the next one to trip over.

if (!process.env.WALK_DATABASE_URL) {
  console.log("walk: skipped (no WALK_DATABASE_URL)");
  process.exit(0);
}
process.env.DATABASE_URL = process.env.WALK_DATABASE_URL;
process.env.OPENAI_API_KEY ??= "sk-dummy-walk-never-sent";

import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import express, { type NextFunction, type Request, type Response } from "express";

type Viewer = { user: string | null; session: string };
type Mail = { to: string; subject: string; text: string };

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
    mails.push({ to: Array.isArray(m.to) ? m.to[0] : m.to, subject: m.subject, text: m.text });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ id: `stub-${mails.length}` }));
  });
});
await new Promise<void>((resolve) => mailStub.listen(0, "127.0.0.1", () => resolve()));
process.env.RESEND_API_KEY = "re_stub_walk";
process.env.RESEND_BASE_URL = `http://127.0.0.1:${(mailStub.address() as AddressInfo).port}`;

// Deferred past the env writes above: @workspace/db throws at import unless
// DATABASE_URL is already set, and the mailer only reaches the stub once
// RESEND_API_KEY and RESEND_BASE_URL are.
const { pool } = await import("@workspace/db");
const { chartForProfile } = await import("../lib/profiles.js");
const { PAIR_PROMPT_VERSION } = await import("../prompts/pair/index.js");
const { grantBundle, getCredits } = await import("../lib/credits.js");
const { logger } = await import("../lib/logger.js");
const { default: reportsRouter } = await import("../routes/reports.js");
const { default: invitesRouter } = await import("../routes/invites.js");
const { default: profilesRouter } = await import("../routes/profiles.js");
const { default: giftsRouter } = await import("../routes/gifts.js");
const { default: creditsRouter } = await import("../routes/credits.js");
const { default: checkoutRouter } = await import("../routes/checkout.js");
const { default: compatibilityRouter } = await import("../routes/compatibility.js");

const q = (sql: string, params: unknown[] = []) => pool.query(sql, params);

// A bare Express app whose stub sets userId and sessionId from headers, the
// same shape every route already expects from the real cookie/Clerk middleware.
const app = express();
app.use(express.json());
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.userId = req.header("x-user") || null;
  req.sessionId = req.header("x-session") || "s-none";
  req.log = logger;
  next();
});
app.use("/api", reportsRouter);
app.use("/api", invitesRouter);
app.use("/api", profilesRouter);
app.use("/api", giftsRouter);
app.use("/api", creditsRouter);
app.use("/api", checkoutRouter);
app.use("/api", compatibilityRouter);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.on("listening", () => resolve()));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

async function call(who: Viewer, method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = {
    "x-session": who.session,
    "content-type": "application/json",
    // Send/gift links resolve a public origin from this; harmless elsewhere.
    "x-forwarded-host": "starsdecoded-staging.vercel.app",
  };
  if (who.user) headers["x-user"] = who.user;
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
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
const tokenOf = (m: Mail) => decodeURIComponent(/claim\?token=([^\s"&]+)/.exec(m.text)![1]);
const row = async (id: string) => (await q("select * from invite_tokens where id = $1", [id])).rows[0];
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

let setupError: unknown = null;
try {
  // Idempotent: running this walk twice on the same database starts here
  // both times, so nothing from the first run can trip up the second.
  await q(
    "truncate table users, profiles, reports, relationships, relationship_participants, invite_tokens, bundles, credits, report_revisions cascade",
  );

  for (const [id, email] of [
    [GIVER.user, "giver@example.com"],
    [SUBJECT.user, "subject@example.com"],
    [STRANGER.user, "stranger@example.com"],
    [CHECKOUT_USER.user, "checkout@example.com"],
    [GIFT_GIVER.user, "gift-giver@example.com"],
    [GIFT_RECIPIENT.user, "gift-recipient@example.com"],
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

  await step("send a natal report; the claimer reads, lists and works it (MB-84)", async () => {
    const sent = await call(GIVER, "POST", "/invites", { profileId: "PA", email: "subject@example.com" });
    assert.equal(sent.status, 201);
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
  });

  await step("a pair to a joined person is granted at once, and stops at once when its sender stops sharing", async () => {
    // PA is already claimed by SUBJECT, so this second pair's Send grants
    // it at once rather than minting an invite (reading 11, MB-82).
    await pair("REL2", "RP2", GIVER, "people", { profileId: "PM", reportId: "RM" }, { profileId: "PA", reportId: "RA" });
    const sent = await call(GIVER, "POST", "/compatibility/RP2/send", {});
    assert.equal(sent.status, 201);
    assert.deepEqual(sent.body, { state: "granted", invite: null });

    const summary = await call(SUBJECT, "GET", "/compatibility/RP2/summary");
    assert.equal(summary.status, 200);
    assert.equal(summary.body.participants.length, 2);

    assert.equal((await call(GIVER, "POST", "/compatibility/RP2/stop-sharing")).status, 204);
    assert.equal((await call(SUBJECT, "GET", "/compatibility/RP2/summary")).status, 404);
    assert.ok(!(await listReports(SUBJECT)).has("RP2"));
  });

  await step("Not me unmarks a chart claimed to someone", async () => {
    const patched = await call(SUBJECT, "PATCH", "/profiles/PA", { claimedAsSelf: false });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.claimedAsSelf, false);
    assert.equal(patched.body.isSelf, false);
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

  await step("R10-23: the closed pair also 404s on compatibility summary and scenes", async () => {
    assert.equal((await call(GIVER, "GET", "/compatibility/RP/summary")).status, 404);
    assert.equal((await call(GIVER, "POST", "/compatibility/RP/scenes", { chapter: "partners02", index: 0 })).status, 404);
  });

  await step("Delete by the claimer", async () => {
    assert.equal((await call(SUBJECT, "DELETE", "/reports/RA")).status, 204);
    assert.equal((await q("select 1 from reports where id='RA'")).rowCount, 0);
  });

  let giftNoCredit = "";
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
      { recipientName: "Pierre", email: "nope" },
      { recipientName: "Pierre", email: "pierre@example.com", note: "x".repeat(281) },
    ]) {
      const r = await call(GIFT_GIVER, "POST", "/gifts", bad);
      assert.equal(r.status, 400);
      assert.match(r.body.message, /280/);
    }
  });

  await step("gifts: the soft pass sends a gift with no credit to hold", async () => {
    const g1 = await call(GIFT_GIVER, "POST", "/gifts", { recipientName: "  Pierre ", email: "Pierre@Example.com", note: "  For your birthday  " });
    assert.equal(g1.status, 201);
    assert.equal(g1.body.state, "waiting");
    assert.equal(g1.body.creditHeld, false);
    assert.equal(g1.body.recipientName, "Pierre");
    assert.equal(g1.body.email, "pierre@example.com");
    assert.equal(g1.body.note, "For your birthday");
    assert.equal(new Date(g1.body.returnsAt).getTime() - new Date(g1.body.sentAt).getTime(), 30 * 86400000);
    assert.equal(g1.body.remindedAt, null);
    giftNoCredit = g1.body.id;

    const r1 = await row(giftNoCredit);
    assert.equal(r1.kind, "gift");
    assert.equal(r1.profile_id, null);
    assert.equal(r1.credit_id, null);
    assert.equal(r1.email_delivered, true);
    assert.equal(mails.at(-1)!.to, "pierre@example.com");
  });

  await step("gifts: a credit is held and the balance reflects it", async () => {
    await grantBundle(GIFT_GIVER.user, "couple");
    const g2 = await call(GIFT_GIVER, "POST", "/gifts", { recipientName: "Beatrice", email: "gift-beatrice@example.com" });
    assert.equal(g2.status, 201);
    assert.equal(g2.body.creditHeld, true);
    assert.equal(g2.body.note, null);
    giftWithCredit = g2.body.id;
    giftWithCreditCreditId = (await row(giftWithCredit)).credit_id;

    assert.equal((await creditRow(giftWithCreditCreditId)).status, "held");
    const credits = await getCredits(GIFT_GIVER.user);
    assert.deepEqual([credits.available, credits.held], [2, 1]);
  });

  await step("gifts: the list is newest first and only the giver's", async () => {
    const list = await listGifts(GIFT_GIVER);
    assert.deepEqual(list.map((g) => g.id), [giftWithCredit, giftNoCredit]);
    assert.deepEqual(list.map((g) => g.creditHeld), [true, false]);
    assert.deepEqual(await listGifts(GIFT_RECIPIENT), []);
  });

  await step("gifts: remind and take back are the giver's alone", async () => {
    for (const who of [GIFT_RECIPIENT, ANON]) {
      assert.equal((await call(who, "POST", `/gifts/${giftWithCredit}/remind`)).status, 404);
      assert.equal((await call(who, "DELETE", `/gifts/${giftWithCredit}`)).status, 404);
    }
    assert.equal((await call(GIFT_GIVER, "POST", "/gifts/nope/remind")).status, 404);
  });

  await step("gifts: a reminder rotates the link, kills the old one, and is capped at one a day", async () => {
    const firstToken = tokenOf(mails.at(-1)!);
    assert.equal((await call(ANON, "GET", `/invites/${encodeURIComponent(firstToken)}`)).status, 200);

    const rem = await call(GIFT_GIVER, "POST", `/gifts/${giftWithCredit}/remind`);
    assert.equal(rem.status, 204);
    const reminderMail = mails.at(-1)!;
    assert.match(reminderMail.subject, /still waiting/);
    giftSecondToken = tokenOf(reminderMail);
    assert.notEqual(giftSecondToken, firstToken);
    assert.equal((await call(ANON, "GET", `/invites/${encodeURIComponent(firstToken)}`)).status, 404);
    const preview = await call(ANON, "GET", `/invites/${encodeURIComponent(giftSecondToken)}`);
    assert.equal(preview.status, 200);
    assert.equal(preview.body.kind, "gift");

    assert.equal((await call(GIFT_GIVER, "POST", `/gifts/${giftWithCredit}/remind`)).status, 429);
  });

  await step("gifts: a reminder whose email fails leaves the old link standing", async () => {
    const before = await row(giftNoCredit);
    failMail = true;
    const failed = await call(GIFT_GIVER, "POST", `/gifts/${giftNoCredit}/remind`);
    failMail = false;
    assert.equal(failed.status, 502);
    const after = await row(giftNoCredit);
    assert.equal(after.token_hash, before.token_hash);
    assert.equal(after.reminded_at, null);

    const [x, y] = await Promise.all([
      call(GIFT_GIVER, "POST", `/gifts/${giftNoCredit}/remind`),
      call(GIFT_GIVER, "POST", `/gifts/${giftNoCredit}/remind`),
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
    assert.deepEqual([credits.available, credits.held], [3, 0]);
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

  await step("checkout/test: 401 signed out, 403 on production, is_test rows and credits", async () => {
    assert.equal((await call(ANON, "POST", "/checkout/test", { count: 3 })).status, 401);

    const before = process.env.APP_ENV;
    process.env.APP_ENV = "production";
    assert.equal((await call(CHECKOUT_USER, "POST", "/checkout/test", { count: 3 })).status, 403);
    if (before === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = before;

    const ok = await call(CHECKOUT_USER, "POST", "/checkout/test", { count: 3 });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.available, 3);

    const bundleTest = await q("select is_test from bundles where user_id = $1", [CHECKOUT_USER.user]);
    assert.ok(bundleTest.rows.length > 0 && bundleTest.rows.every((r: { is_test: boolean }) => r.is_test === true));
    const creditsTest = await q("select is_test from credits where user_id = $1", [CHECKOUT_USER.user]);
    assert.equal(creditsTest.rows.length, 3);
    assert.ok(creditsTest.rows.every((r: { is_test: boolean }) => r.is_test === true));

    const c = await call(CHECKOUT_USER, "GET", "/credits");
    assert.equal(c.body.available, 3);
    assert.equal(c.body.held, 0);
    assert.equal(c.body.lastBundle.count, 3);

    const h = await call(CHECKOUT_USER, "GET", "/credits/history");
    assert.equal(h.body[0].kind, "bought");
    assert.match(h.body[0].label, /test credit/);

    assert.deepEqual((await call(ANON, "GET", "/credits")).body, { available: 0, used: 0, held: 0, lastBundle: null });
    assert.deepEqual((await call(ANON, "GET", "/credits/history")).body, []);
  });
} catch (err) {
  setupError = err;
} finally {
  server.close();
  mailStub.close();
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
