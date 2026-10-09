/**
 * The QA pair (ADR-314, 315; reading 10) with Clerk stubbed and a model client that fails if called. Every function
 * refuses off staging before it asks Clerk or the database anything. On the stubbed Clerk alone: a start bans both
 * unless a walk here holds them and never throws; a walk's hold lifts both bans before it makes a sign-in token and
 * bans both again at its close; a stop bans what a walk holds and opens nothing after. On a scratch Postgres named by
 * WALK_DATABASE_URL: ensure makes the two once, reset puts them back at the walk's start, Timeline's setup and queued
 * jobs included, and the reports a Release's walk wrote are stored as the seed, and no other, and placed back after a
 * reset, with no model call. Without one those skip, saying why. Every chart is the engine's, computed from the sample
 * people's fixtures; the report text is stand-in text.
 */
import { after, before, mock, test } from "node:test";
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
const { logger } = await import("./logger.js");
const { chartForProfile } = await import("./profiles.js");
const { natalReportAccess } = await import("./access.js");
const { isOutdated } = await import("../routes/reports.js");
const { pool } = await import("@workspace/db");
const { activeSubscription, applySubscriptionEvent } = await import("./subscriptions.js");

type QaPair = import("./qaPair.js").QaPair;
type QaClerk = import("./qaPair.js").QaClerk;
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
/** The key of every Timeline job this file queues, so its clean-up finds them after their profiles are gone. */
const JOB_KEY = `qa-pair-test-${run}`;

/** Clerk as the pair meets it, keeping each account's ban and refusing a call for an account when told to. */
function stubClerk(accounts: Map<string, string>) {
  const calls: string[] = [];
  const banned = new Set<string>();
  const refuse: { find?: boolean; ban?: string; unban?: string } = {};
  let tokens = 0;
  const clerk: QaClerk = {
    async find(email) {
      calls.push(`find ${email}`);
      if (refuse.find) throw new Error("Clerk answered 503");
      return accounts.get(email) ?? null;
    },
    async create({ email, firstName, lastName }) {
      calls.push(`create ${email} ${firstName} ${lastName}`);
      const id = `user_qa_${run}_${accounts.size + 1}`;
      accounts.set(email, id);
      // As liveClerk makes it.
      banned.add(id);
      return id;
    },
    async ban(userId) {
      calls.push(`ban ${userId}`);
      if (refuse.ban === userId) throw new Error("Clerk answered 503");
      banned.add(userId);
    },
    async unban(userId) {
      calls.push(`unban ${userId}`);
      if (refuse.unban === userId) throw new Error("Clerk answered 503");
      banned.delete(userId);
    },
    async signInToken(userId, seconds) {
      calls.push(`token ${userId} ${seconds}`);
      // Whether Clerk would sign a banned account in by token is unknown (Round start 3(c)), so the stub never does.
      if (banned.has(userId)) throw new Error("a sign-in token for a banned account");
      tokens += 1;
      return `ticket-${userId}-${tokens}`;
    },
  };
  return { calls, banned, refuse, clerk };
}

const clerkAccounts = new Map<string, string>();
const stub = stubClerk(clerkAccounts);
const clerkCalls = stub.calls;
Q.setQaClerk(stub.clerk);

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the pair's rows are made, reset and seeded on a scratch Postgres";

before(async () => {
  if (SCRATCH) await q("delete from lab_runs where run_key = any($1)", [SEED_KEYS]);
});

if (SCRATCH) {
  after(async () => {
    const ids = [...clerkAccounts.values(), BYSTANDER];
    await q("delete from jobs where payload->>'key' = $2 or payload->>'userId' = any($1)", [ids, JOB_KEY]);
    await q("delete from invite_tokens where created_by_user_id = any($1) or claimed_by_user_id = any($1)", [ids]);
    await q("delete from profile_shares where owner_user_id = any($1) or reader_user_id = any($1)", [ids]);
    await q("delete from report_workbooks where reader = any($1)", [ids]);
    await q("delete from reports where relationship_id in (select id from relationships where user_id = any($1))", [ids]);
    await q("delete from relationships where user_id = any($1)", [ids]);
    await q("delete from profiles where user_id = any($1)", [ids]);
    for (const table of ["timeline_readings", "timeline_setups", "ask_messages", "credits", "bundles", "purchases", "subscriptions", "testers"]) {
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
      await assert.rejects(Q.openQaPair(pair), /staging alone/);
      for (const step of STEPS) await assert.rejects(Q.placeSeed(pair, step), /staging alone/);
      await assert.rejects(Q.storeQaSeed(pair), /staging alone/);
      // Where the pair doesn't exist, a start asks nothing at all.
      await Q.banQaPairUnlessWalking();
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

/**
 * Timeline's setup and its jobs still queued, as only a check that failed upstream would leave them for the pair, due a
 * day from now so no other file's drain takes them meanwhile. Answers the jobs' ids.
 */
async function timelineWork(userId: string, reportId: string, profileId: string): Promise<string[]> {
  await q("insert into timeline_setups (user_id, report_id, from_day, to_day, state) values ($1, $2, current_date, current_date + 181, 'writing')", [userId, reportId]);
  const jobs: Array<[string, Record<string, string>]> = [
    ["timeline.reading", { profileId, key: JOB_KEY }],
    ["timeline.refresh", { profileId, key: JOB_KEY }],
    ["timeline.ahead", { userId }],
  ];
  const ids: string[] = [];
  for (const [kind, payload] of jobs) {
    const id = randomUUID();
    await q("insert into jobs (id, kind, payload, status, run_at) values ($1, $2, $3, 'queued', now() + interval '1 day')", [id, kind, JSON.stringify(payload)]);
    ids.push(id);
  }
  return ids;
}

/** What a Release's walk leaves in the two accounts, step by step, and what an admin and Timeline could add. */
async function leaveAWalk(): Promise<{ reportIds: string[]; jobIds: string[] }> {
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
  // Granted within the day, so a reset that took the plan's row would leave this purchase reading as a plan still kept.
  await q(
    `insert into purchases (id, user_id, kind, item, cents, full_cents, stripe_session_id, stripe_subscription, tick_hash, ticked_at, return_to, status, is_test, granted_at)
     values ($1, $2, 'plan', 'timeline_year', 6999, 6999, $3, $4, 'tick', now(), '/dashboard/account', 'granted', true, now())`,
    [randomUUID(), mira, `cs_test_${run}_plan`, `sub_${run}`],
  );
  await bundle(mira, "plan", 1);
  await bundle(idris, "grant", 3);
  await q("insert into timeline_readings (id, user_id, profile_id, event_key, basis, status) values ($1, $2, $3, 'saturn-asc', 'b', 'ready')", [randomUUID(), mira, miraOwn.profileId]);
  await q(`insert into ask_messages (id, user_id, role, body) values ($1, $2, 'reader', '{"text": "Stand-in question."}')`, [randomUUID(), mira]);
  const jobIds = [...(await timelineWork(mira, miraOwn.reportId, miraOwn.profileId)), ...(await timelineWork(idris, idrisOwn.reportId, idrisOwn.profileId))];
  return { reportIds: [miraOwn.reportId, idrisOwn.reportId, pair.reportId], jobIds };
}

/** Someone who is not the pair, so a reset is seen to leave them alone. */
async function bystanderRows() {
  return (await q(
    `select (select count(*) from profiles where user_id = $1)::int as profiles,
            (select count(*) from reports r join profiles p on p.id = r.profile_id where p.user_id = $1)::int as reports,
            (select count(*) from credits where user_id = $1)::int as credits,
            (select count(*) from invite_tokens where created_by_user_id = $1)::int as invites,
            (select count(*) from timeline_setups where user_id = $1)::int as setups,
            (select count(*) from jobs where status = 'queued'
               and (payload->>'userId' = $1 or payload->>'profileId' in (select id from profiles where user_id = $1)))::int as jobs`,
    [BYSTANDER],
  )).rows[0];
}

const leftovers = async ({ reportIds, jobIds }: { reportIds: string[]; jobIds: string[] }) => (await q(
  `select (select count(*) from profiles where user_id = any($1))::int as profiles,
          (select count(*) from reports where id = any($2))::int as reports,
          (select count(*) from relationships where user_id = any($1))::int as pairs,
          (select count(*) from invite_tokens where created_by_user_id = any($1) or claimed_by_user_id = any($1))::int as invites,
          (select count(*) from profile_shares where owner_user_id = any($1) or reader_user_id = any($1))::int as shares,
          (select count(*) from report_workbooks where reader = any($1))::int as workbooks,
          (select count(*) from subscriptions where user_id = any($1))::int as plans,
          (select count(*) from timeline_readings where user_id = any($1))::int as readings,
          (select count(*) from timeline_setups where user_id = any($1))::int as setups,
          (select count(*) from jobs where id = any($3))::int as jobs,
          (select count(*) from ask_messages where user_id = any($1))::int as asks`,
  [ids, reportIds, jobIds],
)).rows[0];

const ledger = async () => ({
  credits: (await q("select user_id, status, is_test, count(*)::int as n from credits where user_id = any($1) group by 1, 2, 3", [ids])).rows,
  bundles: (await q("select b.user_id, b.source, b.is_test, count(c.id)::int as n from bundles b left join credits c on c.bundle_id = b.id where b.user_id = any($1) group by b.id", [ids])).rows,
});

const TOPPED_UP = (mira: string) => ({
  credits: [{ user_id: mira, status: "available", is_test: true, n: 20 }],
  bundles: [{ user_id: mira, source: "test", is_test: true, n: 20 }],
});

test("reset deletes what a walk left, Timeline's setup and queued jobs included, ends its plan and forgets both Stripe customers; Mira holds 20 test credits and Idris none, and the next walk's plan is kept", { skip: NO_DB }, async () => {
  await q("insert into users (id, email) values ($1, 'bystander@example.com')", [BYSTANDER]);
  const theirs = await ownReport(BYSTANDER, "tomas", "Madrid");
  await bundle(BYSTANDER, "purchase", 3);
  await invite("send", BYSTANDER, BYSTANDER, { profileId: theirs.profileId });
  await timelineWork(BYSTANDER, theirs.reportId, theirs.profileId);
  const bystander = await bystanderRows();
  assert.deepEqual([bystander.setups, bystander.jobs], [1, 3]);

  const left = await leaveAWalk();
  const warned = mock.method(logger, "warn", () => undefined);
  try {
    await Q.resetQaPair(pair);
    // A line of counts alone: no account's id or address.
    const said = warned.mock.calls.map((call) => call.arguments as unknown[]);
    assert.deepEqual(said, [[{ setups: 2, jobs: 6 }, "QA pair: the reset took Timeline's setup or queued jobs"]]);
  } finally {
    warned.mock.restore();
  }

  assert.deepEqual(await leftovers(left), { profiles: 0, reports: 0, pairs: 0, invites: 0, shares: 0, workbooks: 0, plans: 1, readings: 0, setups: 0, jobs: 0, asks: 0 });
  // The plan's row stays beside its purchase, ended, and the read every plan check uses finds no plan for either.
  assert.deepEqual(
    (await q("select id, status, cancel_at_period_end, current_period_end <= now() as ended from subscriptions where user_id = any($1)", [ids])).rows,
    [{ id: `sub_${run}`, status: "canceled", cancel_at_period_end: true, ended: true }],
  );
  assert.deepEqual([await activeSubscription(ids[0]), await activeSubscription(ids[1])], [null, null], "no live plan after a reset");
  assert.deepEqual(await ledger(), TOPPED_UP(ids[0]));
  // A customer can't leave its test clock, so the next walk makes a fresh one on a fresh clock.
  assert.deepEqual((await q("select id, stripe_customer_id from users where id = any($1) order by email", [ids])).rows, [
    { id: ids[0], stripe_customer_id: null },
    { id: ids[1], stripe_customer_id: null },
  ]);
  assert.equal((await q("select count(*)::int as n from purchases where user_id = $1", [ids[0]])).rows[0].n, 2, "every payment's record stays");
  assert.deepEqual((await accountRows()).testers, made.testers);
  assert.deepEqual(await bystanderRows(), bystander);

  // The next walk's plan, on a fresh customer, within the day: its first payment keeps it. Judged a second plan, it would
  // throw here, since there is no Stripe to cancel it with.
  const next = randomUUID();
  await q("update users set stripe_customer_id = $2 where id = $1", [ids[0], `cus_${run}_next`]);
  await q(
    `insert into purchases (id, user_id, kind, item, cents, full_cents, stripe_session_id, tick_hash, ticked_at, return_to, status, is_test)
     values ($1, $2, 'plan', 'timeline_year', 6999, 6999, $3, 'tick', now(), '/dashboard/account', 'open', true)`,
    [next, ids[0], `cs_test_${run}_next`],
  );
  const firstPayment = {
    id: `evt_${run}_next`,
    object: "event",
    type: "invoice.paid",
    livemode: false,
    data: {
      object: {
        id: `in_${run}_next`,
        object: "invoice",
        customer: `cus_${run}_next`,
        customer_email: null,
        billing_reason: "subscription_create",
        amount_paid: 6999,
        livemode: false,
        lines: { object: "list", data: [] },
        parent: { subscription_details: { subscription: `sub_${run}_next`, metadata: { purchase_id: next } } },
      },
    },
  } as unknown as Parameters<typeof applySubscriptionEvent>[0];
  assert.equal(await applySubscriptionEvent(firstPayment, { client: null, sendReceipt: async () => true, setUp: async () => {} }), "processed");
  assert.equal((await q("select status from purchases where id = $1", [next])).rows[0].status, "granted", "kept, not a second plan");

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

test("a Release's three reports become the seed with no cost of their own, and go back in after a reset, each copy taking its write's credit, the pair over Idris's own chart; the model is never called", { skip: NO_DB }, async () => {
  const [mira, idris] = ids;
  const miraOwn = await ownReport(mira, "mira", "Lisbon");
  const idrisOwn = await ownReport(idris, "idris", "Cardiff");
  const written = await pairReport(mira, miraOwn, idrisOwn);
  // As a Release's walk leaves them: its hold kept the report each stored step's own write answered.
  const walked = async () => {
    const hold = await Q.openQaPair(pair);
    hold.wrote("own-report", miraOwn.reportId);
    hold.wrote("idris-report", idrisOwn.reportId);
    hold.wrote("pair", written.reportId);
    await hold.close();
  };

  await walked();
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
  await walked();
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

  // Each copy takes the credit its write would; Idris has none until the walk's gift reaches him.
  await assert.rejects(Q.placeSeed(pair, "idris-report"), /no credit was left/);
  const [giftCredit] = await bundle(idris, "test", 1);
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

  // A copy takes the credit its write would, and nothing more: Mira's own and the pair's, Idris's gift.
  const taken = (await q("select user_id, used_for_report_id from credits where status = 'used' and user_id = any($1)", [ids])).rows;
  assert.deepEqual(
    taken.map((row) => [row.user_id, row.used_for_report_id]).sort(),
    [[mira, miraId], [mira, pairId], [idris, idrisId]].sort(),
  );
  assert.equal((await q("select used_for_report_id from credits where id = $1", [giftCredit])).rows[0].used_for_report_id, idrisId);
  assert.equal((await q("select count(*)::int as n from credits where user_id = $1 and status = 'available'", [mira])).rows[0].n, 18);
  assert.deepEqual(clerkCalls, []);
  assert.deepEqual(modelCalls, []);
});

test("the seed keeps only the reports the newest walk's own steps wrote: one no step returned is never stored, and a walk's reports are taken once", { skip: NO_DB }, async () => {
  const [mira, idris] = ids;
  await Q.resetQaPair(pair);
  // A row's id shows whether a store replaced it or left it.
  const seed = async () => (await q("select id, run_key, output from lab_runs where run_key = any($1) and section = 'whole' order by run_key", [SEED_KEYS])).rows;
  const before = await seed();
  assert.equal(before.length, 3);

  const miraOwn = await ownReport(mira, "mira", "Lisbon");
  const idrisOwn = await ownReport(idris, "idris", "Cardiff");
  const pairOwn = await pairReport(mira, miraOwn, idrisOwn);
  // Newer and finished, on the same charts, but no step's write answered either.
  const notTheWalks = { meta: { reportType: "natal", model: "stand-in" }, overview: { headline: "Text no step of the walk wrote." } };
  const newerNatal = randomUUID();
  await q("insert into reports (id, profile_id, session_id, type, status, interpretation) values ($1, $2, $3, 'natal', 'complete', $4)", [
    newerNatal, miraOwn.profileId, randomUUID(), JSON.stringify(notTheWalks),
  ]);
  const newerPair = await pairReport(mira, miraOwn, idrisOwn);
  await q("update reports set interpretation = $2 where id = $1", [newerPair.reportId, JSON.stringify({ ...newerPair.interpretation, foundation: { stance: "Text no step of the walk wrote." } })]);

  // A walk that wrote nothing keeps nothing, and the last seed's rows stay as they were.
  await (await Q.openQaPair(pair)).close();
  assert.equal(await Q.storeQaSeed(pair), 0);
  assert.deepEqual(await seed(), before);

  const hold = await Q.openQaPair(pair);
  hold.wrote("own-report", miraOwn.reportId);
  hold.wrote("idris-report", idrisOwn.reportId);
  hold.wrote("pair", pairOwn.reportId);
  await hold.close();
  assert.equal(await Q.storeQaSeed(pair), 3);
  const kept = await seed();
  assert.deepEqual(kept.map((r) => r.output), json([idrisOwn.interpretation, pairOwn.interpretation, miraOwn.interpretation]));
  assert.ok(kept.every((row, i) => row.id !== before[i].id), "all three stored anew");
  assert.doesNotMatch(JSON.stringify(kept), /no step of the walk wrote/);

  // Taken once: with no walk since, nothing more is kept.
  assert.equal(await Q.storeQaSeed(pair), 0);
  assert.deepEqual(await seed(), kept);

  // An id that isn't that account's own report keeps nothing for its step, nor for the pair that goes over it.
  const crossed = await Q.openQaPair(pair);
  crossed.wrote("own-report", idrisOwn.reportId);
  crossed.wrote("idris-report", idrisOwn.reportId);
  crossed.wrote("pair", newerPair.reportId);
  await crossed.close();
  assert.equal(await Q.storeQaSeed(pair), 1);
  const after = await seed();
  assert.deepEqual(after.map((row) => [row.run_key, row.output]), kept.map((row) => [row.run_key, row.output]));
  assert.deepEqual(after.filter((row, i) => row.id !== kept[i].id).map((row) => row.run_key), ["idris.qa-seed"]);

  // A store refused by its check still takes the walk's ids, so the next store keeps none of them.
  const refused = await Q.openQaPair(pair);
  refused.wrote("own-report", miraOwn.reportId);
  await refused.close();
  await assert.rejects(Q.storeQaSeed({ mira: pair.idris, idris: pair.mira }), /not the QA pair/);
  assert.equal(await Q.storeQaSeed(pair), 0);
  assert.deepEqual(await seed(), after);
  clerkCalls.length = 0;
  assert.deepEqual(modelCalls, []);
});

/** The pair as ensureQaPair would answer it for these accounts. */
const pairOf = (accounts: Map<string, string>): QaPair => ({
  mira: { userId: accounts.get(MIRA_EMAIL) ?? "", email: MIRA_EMAIL, name: "Mira Costa" },
  idris: { userId: accounts.get(IDRIS_EMAIL) ?? "", email: IDRIS_EMAIL, name: "Idris Costa" },
});

test("a start bans both accounts unless a walk here holds them, skips an address Clerk holds no account for, and never throws", async () => {
  const accounts = new Map([[MIRA_EMAIL, "user_start_mira"], [IDRIS_EMAIL, "user_start_idris"]]);
  const clerk = stubClerk(accounts);
  const restore = Q.setQaClerk(clerk.clerk);
  const both = ["user_start_idris", "user_start_mira"];
  const finds = [`find ${MIRA_EMAIL}`, `find ${IDRIS_EMAIL}`];
  try {
    await Q.banQaPairUnlessWalking();
    assert.deepEqual(clerk.calls.splice(0), [...finds, "ban user_start_mira", "ban user_start_idris"]);
    assert.deepEqual([...clerk.banned].sort(), both);

    // While a walk here holds them a start bans neither, and the walk's own close does.
    const hold = await Q.openQaPair(pairOf(accounts));
    clerk.calls.length = 0;
    await Q.banQaPairUnlessWalking();
    assert.deepEqual(clerk.calls.splice(0), []);
    assert.equal(clerk.banned.size, 0);
    await hold.close();
    assert.deepEqual([...clerk.banned].sort(), both);

    clerk.banned.clear();
    clerk.calls.length = 0;
    accounts.delete(IDRIS_EMAIL);
    await Q.banQaPairUnlessWalking();
    assert.deepEqual(clerk.calls.splice(0), [...finds, "ban user_start_mira"]);
    accounts.delete(MIRA_EMAIL);
    await Q.banQaPairUnlessWalking();
    assert.deepEqual(clerk.calls.splice(0), finds);

    // Clerk down, then refusing one: each start still resolves, and the other account is banned.
    accounts.set(MIRA_EMAIL, "user_start_mira").set(IDRIS_EMAIL, "user_start_idris");
    clerk.banned.clear();
    clerk.refuse.find = true;
    await Q.banQaPairUnlessWalking();
    assert.equal(clerk.banned.size, 0);
    clerk.refuse.find = false;
    clerk.refuse.ban = "user_start_mira";
    await Q.banQaPairUnlessWalking();
    assert.deepEqual([...clerk.banned], ["user_start_idris"]);
  } finally {
    restore();
  }
  assert.deepEqual(modelCalls, []);
});

test("a walk's hold lifts both bans before it makes a sign-in token, makes one only while it holds them, and bans both again as it closes", async () => {
  const accounts = new Map([[MIRA_EMAIL, "user_hold_mira"], [IDRIS_EMAIL, "user_hold_idris"]]);
  const clerk = stubClerk(accounts);
  const both = ["user_hold_idris", "user_hold_mira"];
  for (const id of both) clerk.banned.add(id);
  const restore = Q.setQaClerk(clerk.clerk);
  const held = pairOf(accounts);
  const finds = [`find ${MIRA_EMAIL}`, `find ${IDRIS_EMAIL}`];
  try {
    const hold = await Q.openQaPair(held);
    assert.deepEqual(clerk.calls.splice(0), [...finds, "unban user_hold_mira", "unban user_hold_idris"]);
    assert.equal(await hold.ticket("idris"), "ticket-user_hold_idris-1");
    // A short life: the token is made as the reader signs in and used at once.
    assert.deepEqual(clerk.calls.splice(0), ["token user_hold_idris 120"]);
    await hold.close();
    assert.deepEqual(clerk.calls.splice(0), ["ban user_hold_mira", "ban user_hold_idris"]);
    assert.deepEqual([...clerk.banned].sort(), both);
    await hold.close();
    await assert.rejects(hold.ticket("mira"), /let the pair go/);
    assert.deepEqual(clerk.calls.splice(0), [], "a second close bans nothing more, and a closed hold makes no token");

    // Two walks here at once, as when one outlives its limit: each close bans both, never leaving them open for the
    // other, while a start bans nothing until neither holds them.
    const first = await Q.openQaPair(held);
    const second = await Q.openQaPair(held);
    await first.close();
    assert.deepEqual([...clerk.banned].sort(), both);
    clerk.calls.length = 0;
    await Q.banQaPairUnlessWalking();
    assert.deepEqual(clerk.calls.splice(0), []);
    await second.close();
    assert.deepEqual(clerk.calls.splice(0), ["ban user_hold_mira", "ban user_hold_idris"]);
    await Q.banQaPairUnlessWalking();
    assert.deepEqual(clerk.calls.splice(0), [...finds, "ban user_hold_mira", "ban user_hold_idris"]);

    // An open that fails part way bans both again before the walk hears why.
    clerk.refuse.unban = "user_hold_idris";
    await assert.rejects(Q.openQaPair(held), /Clerk failed 1 of 2 calls: Clerk answered 503/);
    assert.deepEqual(clerk.calls.splice(0), [...finds, "unban user_hold_mira", "unban user_hold_idris", "ban user_hold_mira", "ban user_hold_idris"]);
    assert.deepEqual([...clerk.banned].sort(), both);
    clerk.refuse.unban = undefined;

    // A ban Clerk refuses as the walk closes still leaves the other banned, and the close says so.
    const third = await Q.openQaPair(held);
    clerk.refuse.ban = "user_hold_mira";
    await assert.rejects(third.close(), /Clerk failed 1 of 2 calls/);
    assert.deepEqual([...clerk.banned], ["user_hold_idris"]);
    clerk.refuse.ban = undefined;

    // Accounts that don't hold the locked addresses are never opened, whoever built the pair.
    clerk.calls.length = 0;
    await assert.rejects(Q.openQaPair({ mira: { ...held.mira, userId: "user_someone_else" }, idris: held.idris }), /not the QA pair/);
    await assert.rejects(Q.openQaPair({ mira: held.idris, idris: held.mira }), /not the QA pair/);
    assert.deepEqual(clerk.calls, [...finds, ...finds]);
  } finally {
    restore();
  }
  assert.deepEqual(modelCalls, []);
});

// Last in this file: a stop is for good, so no test after it could open the pair.
test("a stop bans what the walks here hold, a close under way included and an open still lifting the bans only once its unbans land, waits for Clerk no longer than its limit with a line of counts alone, and opens nothing after", { timeout: 10_000 }, async () => {
  const accounts = new Map([[MIRA_EMAIL, "user_stop_mira"], [IDRIS_EMAIL, "user_stop_idris"]]);
  const clerk = stubClerk(accounts);
  const both = ["user_stop_idris", "user_stop_mira"];
  const held = pairOf(accounts);
  const gate = () => {
    let open!: () => void;
    const shut = new Promise<void>((resolve) => {
      open = resolve;
    });
    return { shut, open };
  };
  const [unbans, bans] = [gate(), gate()];
  const restore = Q.setQaClerk(clerk.clerk);
  const warned = mock.method(logger, "warn", () => undefined);
  try {
    assert.equal(Q.qaPairStopping(), false);
    const walking = await Q.openQaPair(held);
    const ending = await Q.openQaPair(held);
    // From here Clerk answers late: a third walk's open has sent its unbans, and the second walk's close its bans.
    Q.setQaClerk({
      ...clerk.clerk,
      async unban(userId) {
        await unbans.shut;
        return clerk.clerk.unban(userId);
      },
      async ban(userId) {
        await bans.shut;
        return clerk.clerk.ban(userId);
      },
    });
    const opening = Q.openQaPair(held);
    await new Promise((resolve) => setImmediate(resolve));
    const ended = ending.close();
    clerk.calls.length = 0;

    // The stop waits on the close under way and bans the first walk's hold, but can't wait for the third open's unbans,
    // so its limit ends it.
    const stop = Q.banQaPairAtStop(50);
    bans.open();
    await stop;
    await ended;
    assert.equal(Q.qaPairStopping(), true);
    assert.deepEqual(clerk.calls.splice(0), ["ban user_stop_mira", "ban user_stop_idris", "ban user_stop_mira", "ban user_stop_idris"]);
    const said = warned.mock.calls.map((call) => call.arguments as unknown[]);
    assert.deepEqual(said, [[{ walks: 3, failed: 0, unsettled: 1 }, "QA pair: not banned at the stop"]]);
    await assert.rejects(walking.ticket("mira"), /let the pair go/);
    await walking.close();
    assert.deepEqual(clerk.calls.splice(0), [], "the walk's own end, after the stop, bans nothing more");
    await assert.rejects(Q.openQaPair(held), /API is stopping/);
    assert.deepEqual(clerk.calls.splice(0), [], "a walk that comes after the stop asks Clerk nothing");

    // Once the third open's unbans land, it is banned again, after them, and its walk hears why.
    unbans.open();
    await assert.rejects(opening, /API is stopping/);
    assert.deepEqual(clerk.calls.splice(0), ["unban user_stop_mira", "unban user_stop_idris", "ban user_stop_mira", "ban user_stop_idris"]);
    assert.deepEqual([...clerk.banned].sort(), both);
  } finally {
    warned.mock.restore();
    restore();
  }
  assert.deepEqual(modelCalls, []);
});
