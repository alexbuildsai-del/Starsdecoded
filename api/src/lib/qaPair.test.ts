/**
 * The QA pair (ADR-314, 315; reading 10) with Clerk stubbed and a model client that fails if called. Every function
 * refuses off staging before it asks Clerk or the database anything. On a scratch Postgres named by WALK_DATABASE_URL:
 * ensure makes the two once, reset puts them back at the walk's start, and a Release's three reports are stored as the
 * seed and placed back after a reset, with no model call. Without one those skip, saying why. Every chart is the
 * engine's, computed from the sample people's fixtures; the report text is stand-in text.
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points nowhere, so a query past a refusal fails loudly.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
// Nothing listens there, so even a call that slipped past the stub below would reach no one.
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";
delete process.env.CLERK_SECRET_KEY;
delete process.env.RAILWAY_ENVIRONMENT_NAME;
process.env.APP_ENV = "staging";

const { openai } = await import("@workspace/integrations-openai-ai-server");
const modelCalls: unknown[] = [];
(openai.chat.completions as unknown as { create: unknown }).create = async (req: unknown) => {
  modelCalls.push(req);
  throw new Error("the QA pair called the model");
};

const Q = await import("./qaPair.js");
const { chartForProfile } = await import("./profiles.js");
const { natalReportAccess } = await import("./access.js");
const { isOutdated } = await import("../routes/reports.js");
const { pool } = await import("@workspace/db");

type QaPair = import("./qaPair.js").QaPair;
type SeedStep = import("./qaPair.js").SeedStep;
type Chart = import("./chartCalculation.js").NatalChartData;

const q = (text: string, params: unknown[] = []) => pool.query(text, params);
const json = (v: unknown) => JSON.parse(JSON.stringify(v));

const PEOPLE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "sample-people");
const sample = (id: string) => JSON.parse(readFileSync(join(PEOPLE, `${id}.json`), "utf8"));
const MIRA_EMAIL = "qa-a+clerk_test@mystarsdecoded.com";
const IDRIS_EMAIL = "qa-b+clerk_test@mystarsdecoded.com";
const STEPS: SeedStep[] = ["own-report", "idris-report", "pair"];
const SEED_KEYS = ["mira.qa-seed", "idris.qa-seed", "mira-idris.qa-seed"];

/** Each run's own accounts, so a second run, or the walk on the same database, finds nothing of the first. */
const run = randomUUID().slice(0, 8);
const BYSTANDER = `user_bystander_${run}`;

const clerkCalls: string[] = [];
const clerkAccounts = new Map<string, string>();
Q.setQaClerk({
  async find(email) {
    clerkCalls.push(`find ${email}`);
    return clerkAccounts.get(email) ?? null;
  },
  async create({ email, firstName, lastName }) {
    clerkCalls.push(`create ${email} ${firstName} ${lastName}`);
    const id = `user_qa_${run}_${clerkAccounts.size + 1}`;
    clerkAccounts.set(email, id);
    return id;
  },
});

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the pair's rows are made, reset and seeded on a scratch Postgres";

before(async () => {
  if (SCRATCH) await q("delete from lab_runs where run_key = any($1)", [SEED_KEYS]);
});

if (SCRATCH) {
  after(async () => {
    const ids = [...clerkAccounts.values(), BYSTANDER];
    await q("delete from invite_tokens where created_by_user_id = any($1) or claimed_by_user_id = any($1)", [ids]);
    await q("delete from profile_shares where owner_user_id = any($1) or reader_user_id = any($1)", [ids]);
    await q("delete from report_workbooks where reader = any($1)", [ids]);
    await q("delete from reports where relationship_id in (select id from relationships where user_id = any($1))", [ids]);
    await q("delete from relationships where user_id = any($1)", [ids]);
    await q("delete from profiles where user_id = any($1)", [ids]);
    for (const table of ["timeline_readings", "ask_messages", "credits", "bundles", "purchases", "subscriptions", "testers"]) {
      await q(`delete from ${table} where user_id = any($1)`, [ids]);
    }
    await q("delete from users where id = any($1)", [ids]);
    await q("delete from lab_runs where run_key = any($1)", [SEED_KEYS]);
    await pool.end();
  });
}

test("every function refuses unless APP_ENV is staging, before it asks Clerk or the database anything", async () => {
  const pair: QaPair = {
    mira: { userId: "user_not_asked_a", email: MIRA_EMAIL, name: "Mira Costa" },
    idris: { userId: "user_not_asked_b", email: IDRIS_EMAIL, name: "Idris Costa" },
  };
  const elsewhere: Array<Record<string, string>> = [
    { APP_ENV: "production" },
    // APP_ENV is read first, so production's own variable wins over the environment's name.
    { APP_ENV: "production", RAILWAY_ENVIRONMENT_NAME: "staging" },
    { APP_ENV: "development" },
  ];
  try {
    for (const env of elsewhere) {
      delete process.env.RAILWAY_ENVIRONMENT_NAME;
      Object.assign(process.env, env);
      await assert.rejects(Q.ensureQaPair(), /staging alone/);
      await assert.rejects(Q.resetQaPair(pair), /staging alone/);
      for (const step of STEPS) await assert.rejects(Q.placeSeed(pair, step), /staging alone/);
      await assert.rejects(Q.storeQaSeed(pair), /staging alone/);
    }
  } finally {
    delete process.env.RAILWAY_ENVIRONMENT_NAME;
    process.env.APP_ENV = "staging";
  }
  assert.deepEqual(clerkCalls, []);
  assert.deepEqual(modelCalls, []);
});

let pair: QaPair;
let ids: string[] = [];
let made: { users: unknown[]; testers: unknown[] };

async function accountRows() {
  return {
    users: (await q("select id, email, stripe_customer_id, created_at, updated_at from users where id = any($1) order by email", [ids])).rows,
    testers: (await q("select user_id, email, qa, added_by, added_at from testers where user_id = any($1) order by email", [ids])).rows,
  };
}

test("ensure makes both through Clerk's createUser with the locked addresses and the sample people's names; a second ensure changes nothing", { skip: NO_DB }, async () => {
  const first = await Q.ensureQaPair();
  assert.deepEqual(clerkCalls.splice(0), [
    `find ${MIRA_EMAIL}`, `create ${MIRA_EMAIL} ${sample("mira").name}`,
    `find ${IDRIS_EMAIL}`, `create ${IDRIS_EMAIL} ${sample("idris").name}`,
  ]);
  pair = { mira: first.mira, idris: first.idris };
  ids = [pair.mira.userId, pair.idris.userId];
  assert.deepEqual(first, {
    mira: { userId: clerkAccounts.get(MIRA_EMAIL), email: MIRA_EMAIL, name: "Mira Costa" },
    idris: { userId: clerkAccounts.get(IDRIS_EMAIL), email: IDRIS_EMAIL, name: "Idris Costa" },
    seeded: false,
  });

  made = await accountRows();
  assert.deepEqual(made.users.map((u: any) => [u.id, u.email, u.stripe_customer_id]), [[ids[0], MIRA_EMAIL, null], [ids[1], IDRIS_EMAIL, null]]);
  assert.deepEqual(made.testers.map((t: any) => [t.user_id, t.email, t.qa, t.added_by]), [[ids[0], MIRA_EMAIL, "mira", "qa-pair"], [ids[1], IDRIS_EMAIL, "idris", "qa-pair"]]);

  const second = await Q.ensureQaPair();
  assert.deepEqual(clerkCalls.splice(0), [`find ${MIRA_EMAIL}`, `find ${IDRIS_EMAIL}`]);
  assert.deepEqual(second, first);
  assert.deepEqual(await accountRows(), made);
  assert.deepEqual(modelCalls, []);
});

function standInNatal(name: string, chart: Chart) {
  // A cost on the text's own meta, as a real write leaves it, which the seed's row must not copy (R13-09).
  return { meta: { reportType: "natal", model: "stand-in", horizon: chart.horizon.status, usage: { costUsd: 0.27 } }, overview: { headline: `Stand-in text for ${name}.` } };
}

/** A Personal report on the account's own chart, as the birth form writes one: the chart from the fixture at run time. */
async function ownReport(userId: string, id: string, place: string) {
  const f = sample(id);
  const chart = chartForProfile({ ...f, birthTimeWindowMinutes: 0 });
  const profileId = randomUUID();
  const reportId = randomUUID();
  const session = randomUUID();
  await q(
    `insert into profiles (id, session_id, user_id, is_self, name, birth_date, birth_time, birth_place, latitude, longitude,
       timezone_offset, timezone, birth_time_window_minutes, chart_data)
     values ($1, $2, $3, true, $4, $5, $6, $7, $8, $9, $10, $11, 0, $12)`,
    [profileId, session, userId, f.name, f.birthDate, f.birthTime, place, f.latitude, f.longitude, chart.timezoneOffset, f.timezone, JSON.stringify(chart)],
  );
  const interpretation = standInNatal(f.name, chart);
  await q("insert into reports (id, profile_id, session_id, type, status, interpretation) values ($1, $2, $3, 'natal', 'complete', $4)", [
    reportId, profileId, session, JSON.stringify(interpretation),
  ]);
  return { profileId, reportId, chart, interpretation };
}

/** Mira's parent and child report with Idris, as POST /compatibility writes it: Mira A and the child, Idris B and the parent. */
async function pairReport(makerId: string, a: { profileId: string; reportId: string }, b: { profileId: string; reportId: string }) {
  const relationshipId = randomUUID();
  const reportId = randomUUID();
  const session = randomUUID();
  await q("insert into relationships (id, session_id, user_id, type) values ($1, $2, $3, 'parent_child')", [relationshipId, session, makerId]);
  await q(
    "insert into relationship_participants (id, relationship_id, profile_id, role, position) values ($1, $2, $3, 'child', '0'), ($4, $2, $5, 'parent', '1')",
    [randomUUID(), relationshipId, a.profileId, randomUUID(), b.profileId],
  );
  const interpretation = {
    meta: { reportType: "compatibility", lens: "parent_child", names: { a: "Mira Costa", b: "Idris Costa" }, model: "stand-in", usage: { costUsd: 0.12 } },
    foundation: { stance: "Stand-in text for the two of them." },
  };
  await q(
    "insert into reports (id, profile_id, session_id, type, relationship_id, status, interpretation, compute_data) values ($1, $2, $3, 'compatibility', $4, 'complete', $5, $6)",
    [reportId, a.profileId, session, relationshipId, JSON.stringify(interpretation), JSON.stringify({ reportAId: a.reportId, reportBId: b.reportId, lens: "parent_child" })],
  );
  return { relationshipId, reportId, interpretation };
}

async function bundle(userId: string, source: string, count: number, purchaseId: string | null = null): Promise<string[]> {
  const id = randomUUID();
  const kind = count === 1 ? "solo" : count === 3 ? "couple" : "family";
  await q("insert into bundles (id, user_id, bundle_kind, is_test, source, purchase_id) values ($1, $2, $3, true, $4, $5)", [id, userId, kind, source, purchaseId]);
  const credits = Array.from({ length: count }, () => randomUUID());
  for (const credit of credits) await q("insert into credits (id, user_id, bundle_id, status, is_test) values ($1, $2, $3, 'available', true)", [credit, userId, id]);
  return credits;
}

async function invite(kind: string, from: string, claimedBy: string, links: { profileId?: string; relationshipId?: string; creditId?: string } = {}) {
  const id = randomUUID();
  await q(
    `insert into invite_tokens (id, token_hash, email, kind, profile_id, relationship_id, credit_id, created_by_user_id, expires_at, claimed_at, claimed_by_user_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now() + interval '30 days', now(), $9)`,
    [id, randomUUID(), IDRIS_EMAIL, kind, links.profileId ?? null, links.relationshipId ?? null, links.creditId ?? null, from, claimedBy],
  );
  return id;
}

/** What a Release's walk leaves in the two accounts, step by step, and what an admin and Timeline could add. */
async function leaveAWalk(): Promise<string[]> {
  const [mira, idris] = ids;
  const customer = { mira: `cus_${run}_mira`, idris: `cus_${run}_idris` };
  await q("update users set stripe_customer_id = $2 where id = $1", [mira, customer.mira]);
  await q("update users set stripe_customer_id = $2 where id = $1", [idris, customer.idris]);
  const purchase = randomUUID();
  await q(
    `insert into purchases (id, user_id, kind, item, cents, full_cents, tick_hash, ticked_at, return_to, status, is_test, granted_at)
     values ($1, $2, 'bundle', 'family', 7200, 7200, 'tick', now(), '/dashboard?open=credits', 'refunded', true, now())`,
    [purchase, mira],
  );
  const bought = await bundle(mira, "purchase", 5, purchase);
  const miraOwn = await ownReport(mira, "mira", "Lisbon");
  await q("update credits set status = 'used', used_for_report_id = $2 where id = $1", [bought[0], miraOwn.reportId]);
  const idrisOwn = await ownReport(idris, "idris", "Cardiff");
  await q("update credits set user_id = $2, status = 'used', used_for_report_id = $3 where id = $1", [bought[1], idris, idrisOwn.reportId]);
  await invite("gift", mira, idris, { creditId: bought[1] });
  const shareInvite = await invite("share", mira, idris, { profileId: miraOwn.profileId });
  await q("insert into profile_shares (id, profile_id, owner_user_id, reader_user_id, invite_id) values ($1, $2, $3, $4, $5), ($6, $7, $4, $3, null)", [
    randomUUID(), miraOwn.profileId, mira, idris, shareInvite, randomUUID(), idrisOwn.profileId,
  ]);
  const pair = await pairReport(mira, miraOwn, idrisOwn);
  await q("update credits set status = 'used', used_for_report_id = $2 where id = $1", [bought[2], pair.reportId]);
  await invite("send", mira, idris, { profileId: idrisOwn.profileId, relationshipId: pair.relationshipId });
  await q(`insert into report_workbooks (report_id, reader, workbook) values ($1, $2, '{"focus:leanInto:0": "2026-10-05"}')`, [miraOwn.reportId, idris]);
  await q("update credits set status = 'refunded' where id = any($1)", [[bought[3], bought[4]]]);
  await q("insert into subscriptions (id, user_id, customer_id, item, status, is_test) values ($1, $2, $3, 'timeline_year', 'active', true)", [`sub_${run}`, mira, customer.mira]);
  await bundle(mira, "plan", 1);
  await bundle(idris, "grant", 3);
  await q("insert into timeline_readings (id, user_id, profile_id, event_key, basis, status) values ($1, $2, $3, 'saturn-asc', 'b', 'ready')", [randomUUID(), mira, miraOwn.profileId]);
  await q(`insert into ask_messages (id, user_id, role, body) values ($1, $2, 'reader', '{"text": "Stand-in question."}')`, [randomUUID(), mira]);
  return [miraOwn.reportId, idrisOwn.reportId, pair.reportId];
}

/** Someone who is not the pair, so a reset is seen to leave them alone. */
async function bystanderRows() {
  return (await q(
    `select (select count(*) from profiles where user_id = $1)::int as profiles,
            (select count(*) from reports r join profiles p on p.id = r.profile_id where p.user_id = $1)::int as reports,
            (select count(*) from credits where user_id = $1)::int as credits,
            (select count(*) from invite_tokens where created_by_user_id = $1)::int as invites`,
    [BYSTANDER],
  )).rows[0];
}

const leftovers = async (reportIds: string[]) => (await q(
  `select (select count(*) from profiles where user_id = any($1))::int as profiles,
          (select count(*) from reports where id = any($2))::int as reports,
          (select count(*) from relationships where user_id = any($1))::int as pairs,
          (select count(*) from invite_tokens where created_by_user_id = any($1) or claimed_by_user_id = any($1))::int as invites,
          (select count(*) from profile_shares where owner_user_id = any($1) or reader_user_id = any($1))::int as shares,
          (select count(*) from report_workbooks where reader = any($1))::int as workbooks,
          (select count(*) from subscriptions where user_id = any($1))::int as plans,
          (select count(*) from timeline_readings where user_id = any($1))::int as readings,
          (select count(*) from ask_messages where user_id = any($1))::int as asks`,
  [ids, reportIds],
)).rows[0];

const ledger = async () => ({
  credits: (await q("select user_id, status, is_test, count(*)::int as n from credits where user_id = any($1) group by 1, 2, 3", [ids])).rows,
  bundles: (await q("select b.user_id, b.source, b.is_test, count(c.id)::int as n from bundles b left join credits c on c.bundle_id = b.id where b.user_id = any($1) group by b.id", [ids])).rows,
});

const TOPPED_UP = (mira: string) => ({
  credits: [{ user_id: mira, status: "available", is_test: true, n: 20 }],
  bundles: [{ user_id: mira, source: "test", is_test: true, n: 20 }],
});

test("reset deletes what a walk left and forgets both Stripe customers; Mira holds 20 test credits and Idris none", { skip: NO_DB }, async () => {
  await q("insert into users (id, email) values ($1, 'bystander@example.com')", [BYSTANDER]);
  const theirs = await ownReport(BYSTANDER, "tomas", "Madrid");
  await bundle(BYSTANDER, "purchase", 3);
  await invite("send", BYSTANDER, BYSTANDER, { profileId: theirs.profileId });
  const bystander = await bystanderRows();

  const reportIds = await leaveAWalk();
  await Q.resetQaPair(pair);

  assert.deepEqual(await leftovers(reportIds), { profiles: 0, reports: 0, pairs: 0, invites: 0, shares: 0, workbooks: 0, plans: 0, readings: 0, asks: 0 });
  assert.deepEqual(await ledger(), TOPPED_UP(ids[0]));
  // A customer can't leave its test clock, so the next walk makes a fresh one on a fresh clock.
  assert.deepEqual((await q("select id, stripe_customer_id from users where id = any($1) order by email", [ids])).rows, [
    { id: ids[0], stripe_customer_id: null },
    { id: ids[1], stripe_customer_id: null },
  ]);
  assert.equal((await q("select count(*)::int as n from purchases where user_id = $1", [ids[0]])).rows[0].n, 1, "a payment's record stays");
  assert.deepEqual((await accountRows()).testers, made.testers);
  assert.deepEqual(await bystanderRows(), bystander);

  // Topped up to 20, never by 20.
  await Q.resetQaPair(pair);
  assert.deepEqual(await ledger(), TOPPED_UP(ids[0]));

  // A reset empties an account, so it takes only the two ensure marked.
  await assert.rejects(Q.resetQaPair({ mira: { ...pair.mira, userId: BYSTANDER }, idris: pair.idris }), /not the QA pair/);
  await assert.rejects(Q.resetQaPair({ mira: pair.idris, idris: pair.mira }), /not the QA pair/);
  assert.deepEqual(await bystanderRows(), bystander);
  assert.deepEqual(modelCalls, []);
});

test("with no seed, each stored step's place answers null and store keeps nothing; nothing is written and the model is never called", { skip: NO_DB }, async () => {
  for (const step of STEPS) assert.equal(await Q.placeSeed(pair, step), null, step);
  assert.equal(await Q.storeQaSeed(pair), 0);
  assert.equal((await q("select count(*)::int as n from profiles where user_id = any($1)", [ids])).rows[0].n, 0);
  assert.equal((await q("select count(*)::int as n from lab_runs where run_key = any($1)", [SEED_KEYS])).rows[0].n, 0);
  assert.equal((await Q.ensureQaPair()).seeded, false);
  clerkCalls.length = 0;
  assert.deepEqual(await ledger(), TOPPED_UP(ids[0]));
  assert.deepEqual(modelCalls, []);
});

test("a Release's three reports become the seed with no cost of their own, and go back in after a reset, the pair over Idris's own chart; the model is never called", { skip: NO_DB }, async () => {
  const [mira, idris] = ids;
  const miraOwn = await ownReport(mira, "mira", "Lisbon");
  const idrisOwn = await ownReport(idris, "idris", "Cardiff");
  const written = await pairReport(mira, miraOwn, idrisOwn);

  assert.equal(await Q.storeQaSeed(pair), 3);
  const seed = async () => (await q(
    "select run_key, fixture, label, source, section, status, subject_name, cost_usd, usage, words, output, chart from lab_runs where run_key = any($1) order by run_key",
    [SEED_KEYS],
  )).rows;
  const kept = await seed();
  assert.deepEqual(kept.map((r) => [r.run_key, r.fixture, r.label, r.source, r.section, r.status, r.subject_name, r.cost_usd, r.usage, r.words]), [
    ["idris.qa-seed", "idris", "qa-seed", "qa", "whole", "done", "Idris Costa", null, null, 0],
    ["mira-idris.qa-seed", "mira-idris", "qa-seed", "qa", "whole", "done", "Mira Costa & Idris Costa", null, null, 0],
    ["mira.qa-seed", "mira", "qa-seed", "qa", "whole", "done", "Mira Costa", null, null, 0],
  ]);
  assert.deepEqual([kept[2].output, kept[2].chart], json([miraOwn.interpretation, miraOwn.chart]));
  assert.deepEqual([kept[0].output, kept[0].chart], json([idrisOwn.interpretation, idrisOwn.chart]));
  assert.deepEqual([kept[1].output, kept[1].chart], [json(written.interpretation), null]);

  // Each Release's reports replace the last ones' rather than adding to them.
  assert.equal(await Q.storeQaSeed(pair), 3);
  assert.equal((await seed()).length, 3);
  assert.equal((await Q.ensureQaPair()).seeded, true);
  clerkCalls.length = 0;

  await Q.resetQaPair(pair);
  assert.equal((await seed()).length, 3, "a reset keeps the seed");
  await assert.rejects(Q.placeSeed(pair, "pair"), /place those first/);

  const miraId = await Q.placeSeed(pair, "own-report");
  assert.ok(miraId);
  const [placed] = (await q("select r.*, p.user_id, p.is_self, p.name, p.birth_date, p.birth_time, p.birth_place, p.latitude, p.longitude, p.timezone, p.birth_time_window_minutes, p.chart_data, p.claimed_by_user_id from reports r join profiles p on p.id = r.profile_id where r.id = $1", [miraId])).rows;
  const f = sample("mira");
  assert.deepEqual(
    [placed.user_id, placed.is_self, placed.name, placed.birth_date, placed.birth_time, placed.birth_place, placed.latitude, placed.longitude, placed.timezone, placed.birth_time_window_minutes],
    [mira, true, "Mira Costa", f.birthDate, f.birthTime, "Lisbon", f.latitude, f.longitude, f.timezone, 0],
  );
  assert.deepEqual([placed.type, placed.status, placed.interpretation, placed.chart_data], ["natal", "complete", ...json([miraOwn.interpretation, miraOwn.chart])]);
  // The app's own rules read the copy as Mira's own, finished and current (reading 9).
  const asRead = { ...placed, profileId: placed.profile_id, sessionId: placed.session_id, computeData: placed.compute_data, horizonPasses: placed.horizon_passes, createdAt: placed.created_at };
  const holders = { userId: placed.user_id, sessionId: placed.session_id, claimedByUserId: placed.claimed_by_user_id };
  assert.equal(natalReportAccess({ userId: mira, sessionId: "any-browser" }, holders, asRead), "owner");
  assert.equal(natalReportAccess({ userId: null, sessionId: "any-browser" }, holders, asRead), null);
  assert.equal(isOutdated(asRead, { birthTime: placed.birth_time, birthTimeWindowMinutes: placed.birth_time_window_minutes, chartData: placed.chart_data }, []), false);
  await assert.rejects(Q.placeSeed(pair, "own-report"), /already in place/);

  const idrisId = await Q.placeSeed(pair, "idris-report");
  assert.ok(idrisId);
  const [idrisPlaced] = (await q("select p.user_id, p.is_self, p.name, p.birth_place, r.interpretation from reports r join profiles p on p.id = r.profile_id where r.id = $1", [idrisId])).rows;
  assert.deepEqual([idrisPlaced.user_id, idrisPlaced.is_self, idrisPlaced.name, idrisPlaced.birth_place, idrisPlaced.interpretation], [idris, true, "Idris Costa", "Cardiff", json(idrisOwn.interpretation)]);

  const pairId = await Q.placeSeed(pair, "pair");
  assert.ok(pairId);
  const [pairPlaced] = (await q("select r.*, rel.user_id as maker, rel.type as lens from reports r join relationships rel on rel.id = r.relationship_id where r.id = $1", [pairId])).rows;
  const miraProfile = (await q("select profile_id from reports where id = $1", [miraId])).rows[0].profile_id;
  const idrisProfile = (await q("select profile_id from reports where id = $1", [idrisId])).rows[0].profile_id;
  assert.deepEqual(
    [pairPlaced.type, pairPlaced.status, pairPlaced.maker, pairPlaced.lens, pairPlaced.profile_id, pairPlaced.compute_data, pairPlaced.interpretation],
    ["compatibility", "complete", mira, "parent_child", miraProfile, { reportAId: miraId, reportBId: idrisId, lens: "parent_child" }, json(written.interpretation)],
  );
  const parts = (await q("select profile_id, role, position from relationship_participants where relationship_id = $1 order by position", [pairPlaced.relationship_id])).rows;
  assert.deepEqual(parts, [{ profile_id: miraProfile, role: "child", position: "0" }, { profile_id: idrisProfile, role: "parent", position: "1" }]);
  await assert.rejects(Q.placeSeed(pair, "pair"), /already holds the pair/);

  // A copy is not a write: the ledger stands as the reset left it.
  assert.deepEqual(await ledger(), TOPPED_UP(mira));
  assert.deepEqual(clerkCalls, []);
  assert.deepEqual(modelCalls, []);
});
