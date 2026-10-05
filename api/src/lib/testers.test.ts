/**
 * Testers (ADR-276, 314; reading 4): an existing account added by email, 1, 3 or 5 credits granted as a grant bundle
 * with no purchase behind it, the mark removed and the credits kept, and the QA pair never added, granted or removed
 * from these routes. The counts and the grant's body run anywhere; the rest runs on a scratch Postgres named by
 * WALK_DATABASE_URL, and skips without one, saying why. Every account here is this run's own.
 */
import { after, test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import express from "express";
import pinoHttp from "pino-http";
import type { Logger } from "pino";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points nowhere, so a query past a refusal fails loudly.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
process.env.LOG_LEVEL ??= "silent";

const T = await import("./testers.js");
const { creditHistory, getCredits } = await import("./credits.js");
const { QA_PAIR } = await import("./qaPair.js");
const { default: adminPaymentsRouter } = await import("../routes/adminPayments.js");
const { createLogger, httpSerializers, logger } = await import("./logger.js");
const { pool } = await import("@workspace/db");
const { BUNDLES } = await import("@workspace/commerce");

const L = T.TESTER_LINES;
const run = randomUUID().slice(0, 8);
const ADMIN = `user_admin_${run}`;
const id = (name: string) => `user_${name}_${run}`;
const q = (text: string, params: unknown[] = []) => pool.query(text, params);

test("a grant is a bundle's size, read from the catalogue, and nothing else is a grant", () => {
  assert.deepEqual([...T.GRANT_COUNTS], [1, 3, 5]);
  for (const count of T.GRANT_COUNTS) {
    const bundle = BUNDLES.find((row) => row.id === T.grantKind(count));
    assert.equal(bundle?.credits, count);
  }
  assert.deepEqual(T.GRANT_COUNTS.map(T.grantKind), ["solo", "couple", "family"]);
  for (const value of [0, 2, 4, 6, 100, -3, 3.5, "3", null, undefined]) assert.equal(T.isGrantCount(value), false, String(value));
  assert.equal(L.badCount, "Grant 1, 3 or 5 credits.");
});

/**
 * The Sales page's routes behind a stand-in for the session and sign-in, as app.ts stands them. Given a logger, the
 * request logger app.ts mounts writes to it, so a test can read each request's own lines.
 */
async function serve(t: TestContext, adminUserId: string | undefined, log?: Logger) {
  const before = process.env.ADMIN_USER_ID;
  if (adminUserId) process.env.ADMIN_USER_ID = adminUserId;
  else delete process.env.ADMIN_USER_ID;
  const app = express();
  if (log) app.use(pinoHttp({ logger: log, serializers: httpSerializers }));
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = req.header("x-user") || null;
    if (!log) req.log = logger;
    next();
  });
  app.use(adminPaymentsRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    if (before === undefined) delete process.env.ADMIN_USER_ID;
    else process.env.ADMIN_USER_ID = before;
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  // Null is signed out; left out, the call is the admin's.
  return async (method: string, path: string, body?: unknown, user: string | null = ADMIN) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (user) headers["x-user"] = user;
    const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
}

test("the tester routes sit behind the admin gate", async (t) => {
  const closed = await serve(t, undefined);
  assert.equal((await closed("GET", "/admin/testers")).status, 503);
  const call = await serve(t, ADMIN);
  for (const who of [null, "user_someone_else"]) {
    assert.equal((await call("GET", "/admin/testers", undefined, who)).status, 403);
    assert.equal((await call("POST", "/admin/testers", { email: "a@b.co" }, who)).status, 403);
    assert.equal((await call("POST", "/admin/testers/user_x/grant", { count: 3 }, who)).status, 403);
    assert.equal((await call("DELETE", "/admin/testers/user_x", undefined, who)).status, 403);
  }
});

test("a grant takes a count of 1, 3 or 5 and no amount, refused before any query", async (t) => {
  const call = await serve(t, ADMIN);
  for (const count of [0, 2, 4, 50, -1, 3.5]) {
    assert.deepEqual(await call("POST", "/admin/testers/user_x/grant", { count }), { status: 400, body: { error: "bad_count", message: L.badCount } }, String(count));
  }
  for (const body of [{ count: "3" }, {}, { credits: 3 }, { cents: 5400 }]) {
    const answer = await call("POST", "/admin/testers/user_x/grant", body);
    assert.equal(answer.status, 400, JSON.stringify(body));
    assert.equal(answer.body.error, "validation_error");
  }
  assert.deepEqual(await call("POST", "/admin/testers", { email: "not an email" }), { status: 400, body: { error: "bad_email", message: L.badEmail } });
  assert.deepEqual(await call("POST", "/admin/testers", { email: QA_PAIR.mira.email.toUpperCase() }), { status: 409, body: { error: "qa_pair", message: L.qaAdd } });
  assert.equal((await call("POST", "/admin/testers", { address: "a@b.co" })).status, 400);
});

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: testers are added, granted and removed on a scratch Postgres";
const accounts: string[] = [];

if (SCRATCH) {
  after(async () => {
    await q("delete from testers where user_id = any($1) or added_by = $2", [accounts, ADMIN]);
    // Bundles and credits go with their account.
    await q("delete from users where id = any($1)", [accounts]);
    await pool.end();
  });
}

async function account(name: string, email: string, createdAt?: Date): Promise<string> {
  const userId = id(name);
  accounts.push(userId);
  await q("insert into users (id, email, created_at) values ($1, $2, coalesce($3, now()))", [userId, email, createdAt ?? null]);
  return userId;
}

const bundlesOf = async (userId: string) =>
  (await q("select bundle_kind, source, is_test, purchase_id from bundles where user_id = $1 order by created_at, bundle_kind", [userId])).rows;

test("an existing account is added by its email, in any case, and only once", { skip: NO_DB }, async (t) => {
  const call = await serve(t, ADMIN);
  const email = `Tess.${run}@Example.com`;
  const tess = await account("tess", email);
  const added = await call("POST", "/admin/testers", { email: `  tess.${run}@example.COM ` });
  assert.equal(added.status, 201);
  const { addedAt, ...tester } = added.body.tester;
  assert.match(addedAt, /^\d{4}-\d\d-\d\dT/);
  assert.deepEqual(tester, { userId: tess, email, qa: null, granted: 0, used: 0 });
  assert.deepEqual((await q("select email, qa, added_by from testers where user_id = $1", [tess])).rows, [{ email, qa: null, added_by: ADMIN }]);
  assert.equal(await T.isTester(tess), true);

  assert.deepEqual(await call("POST", "/admin/testers", { email }), { status: 409, body: { error: "already_tester", message: L.already } });
  assert.deepEqual(await call("POST", "/admin/testers", { email: `nobody.${run}@example.com` }), {
    status: 404, body: { error: "no_account", message: L.noAccount },
  });
  assert.equal(await T.isTester(id("nobody")), false);

  // An address made again in Clerk is a second account; the newer one is the one in use.
  const shared = `twice.${run}@example.com`;
  await account("twice_old", shared, new Date("2026-01-01T00:00:00Z"));
  const newer = await account("twice_new", shared.toUpperCase(), new Date("2026-06-01T00:00:00Z"));
  assert.equal((await call("POST", "/admin/testers", { email: shared })).body.tester.userId, newer);
});

test("a grant is a test bundle from Stars Decoded with no purchase, in History as \"From Stars Decoded\"", { skip: NO_DB }, async (t) => {
  const call = await serve(t, ADMIN);
  const gil = await account("gil", `gil.${run}@example.com`);
  await call("POST", "/admin/testers", { email: `gil.${run}@example.com` });

  const granted = await call("POST", `/admin/testers/${gil}/grant`, { count: 3 });
  assert.equal(granted.status, 200);
  assert.equal(granted.body.tester.granted, 3);
  assert.equal(granted.body.tester.used, 0);
  assert.deepEqual(await bundlesOf(gil), [{ bundle_kind: "couple", source: "grant", is_test: true, purchase_id: null }]);
  const credits = await q("select status, is_test from credits where user_id = $1", [gil]);
  assert.deepEqual(credits.rows, Array.from({ length: 3 }, () => ({ status: "available", is_test: true })));
  assert.equal((await q("select count(*)::int as n from purchases where user_id = $1", [gil])).rows[0].n, 0, "no purchase row");
  assert.equal((await getCredits(gil)).available, 3);
  const history = await creditHistory(gil);
  assert.deepEqual(
    history.map(({ kind, count, label, test: isTest }) => ({ kind, count, label, test: isTest })),
    [{ kind: "granted", count: 3, label: "From Stars Decoded", test: true }],
  );

  // Whatever else the body says, a grant is its count.
  const more = await call("POST", `/admin/testers/${gil}/grant`, { count: 1, credits: 50, cents: 100000, amount: 99 });
  assert.equal(more.body.tester.granted, 4);
  assert.equal((await call("POST", `/admin/testers/${gil}/grant`, { count: 5 })).body.tester.granted, 9);
  assert.deepEqual((await bundlesOf(gil)).map((b) => b.bundle_kind).sort(), ["couple", "family", "solo"]);
  assert.equal((await getCredits(gil)).available, 9);

  await q("update credits set status = 'used' where id = (select id from credits where user_id = $1 limit 1)", [gil]);
  const listed = await call("GET", "/admin/testers");
  assert.equal(listed.status, 200);
  const row = listed.body.testers.find((r: { userId: string }) => r.userId === gil);
  assert.deepEqual({ granted: row.granted, used: row.used, qa: row.qa }, { granted: 9, used: 1, qa: null });

  const stranger = await account("stranger", `stranger.${run}@example.com`);
  assert.deepEqual(await call("POST", `/admin/testers/${stranger}/grant`, { count: 3 }), {
    status: 404, body: { error: "not_tester", message: L.grantNotTester },
  });
  assert.deepEqual(await bundlesOf(stranger), [], "an account that isn't a tester gets nothing");
});

/**
 * What the shared logger writes while `t` runs, as production writes it: this file's logger is silent, so each call,
 * at any level, is written again through one with production's censoring, which `serve` hands the request logger too.
 */
function loggedLines(t: TestContext): { lines: string[]; log: Logger } {
  const lines: string[] = [];
  const log = createLogger({ NODE_ENV: "production", LOG_LEVEL: "trace" }, { write: (line: string) => void lines.push(line) });
  for (const level of ["trace", "debug", "info", "warn", "error", "fatal"] as const) {
    t.mock.method(logger, level, log[level].bind(log));
  }
  return { lines, log };
}

test("a tester's add, grant and removal log no Clerk id or email, their request lines included, and the grant's line leads to its bundle (security scope 6)", { skip: NO_DB }, async (t) => {
  const email = `Lou.${run}@Example.com`;
  const lou = await account("lou", email);
  const { lines, log } = loggedLines(t);
  const call = await serve(t, ADMIN, log);
  assert.equal((await call("POST", "/admin/testers", { email })).status, 201);
  assert.equal((await call("POST", `/admin/testers/${lou}/grant`, { count: 3 })).status, 200);
  assert.equal((await call("DELETE", `/admin/testers/${lou}`)).status, 204);
  // pino-http writes a request's line as its response finishes, which can land after the body has arrived.
  const written = () => lines.map((line) => JSON.parse(line));
  const requests = () => written().filter((line) => line.msg === "request completed");
  for (let i = 0; i < 100 && requests().length < 3; i++) await new Promise((resolve) => setTimeout(resolve, 10));

  assert.deepEqual(
    requests().map((line) => `${line.req.method} ${line.req.url}`).sort(),
    ["DELETE /admin/testers/:userId", "POST /admin/testers", "POST /admin/testers/:userId/grant"],
  );
  const [bundle] = (await q("select id from bundles where user_id = $1", [lou])).rows;
  const grant = written().find((line) => line.msg === "tester granted credits");
  assert.deepEqual({ count: grant?.count, bundleId: grant?.bundleId }, { count: 3, bundleId: bundle?.id });
  const text = lines.join("").toLowerCase();
  for (const value of [ADMIN, lou, email]) assert.equal(text.includes(value.toLowerCase()), false, `${value} is in a log line`);
});

test("removing a tester takes the mark away and leaves the credits they were given", { skip: NO_DB }, async (t) => {
  const call = await serve(t, ADMIN);
  const rae = await account("rae", `rae.${run}@example.com`);
  await call("POST", "/admin/testers", { email: `rae.${run}@example.com` });
  await call("POST", `/admin/testers/${rae}/grant`, { count: 5 });

  assert.deepEqual(await call("DELETE", `/admin/testers/${rae}`), { status: 204, body: null });
  assert.equal(await T.isTester(rae), false);
  assert.equal((await getCredits(rae)).available, 5);
  assert.equal((await creditHistory(rae))[0]?.label, "From Stars Decoded");
  assert.deepEqual(await call("DELETE", `/admin/testers/${rae}`), { status: 404, body: { error: "not_tester", message: L.notTester } });
  assert.equal((await call("POST", `/admin/testers/${rae}/grant`, { count: 1 })).status, 404);

  const back = await call("POST", "/admin/testers", { email: `rae.${run}@example.com` });
  assert.equal(back.body.tester.granted, 5, "added again, the grants they kept still count");
});

test("the QA pair is listed with its mark and never granted to or removed from here", { skip: NO_DB }, async (t) => {
  const call = await serve(t, ADMIN);
  // Marked as staging marks it, and one with Idris's address but no mark yet, as before staging's first start.
  const mira = id("qa_mira");
  const idris = id("qa_idris");
  accounts.push(mira, idris);
  await q("insert into users (id, email) values ($1, $2), ($3, $4)", [mira, QA_PAIR.mira.email, idris, QA_PAIR.idris.email.toUpperCase()]);
  await q("insert into testers (user_id, email, qa, added_by) values ($1, $2, 'mira', 'qa-pair'), ($3, $4, null, 'qa-pair')", [
    mira, QA_PAIR.mira.email, idris, QA_PAIR.idris.email.toUpperCase(),
  ]);

  const listed = await call("GET", "/admin/testers");
  assert.equal(listed.body.testers.find((r: { userId: string }) => r.userId === mira)?.qa, "mira");

  for (const userId of [mira, idris]) {
    for (const count of T.GRANT_COUNTS) {
      assert.deepEqual(await call("POST", `/admin/testers/${userId}/grant`, { count }), { status: 409, body: { error: "qa_pair", message: L.qaChange } });
    }
    assert.deepEqual(await call("DELETE", `/admin/testers/${userId}`), { status: 409, body: { error: "qa_pair", message: L.qaChange } });
    assert.equal(await T.isTester(userId), true);
    assert.deepEqual(await bundlesOf(userId), []);
  }
  await assert.rejects(T.grantTester(mira, 3, ADMIN), (err: unknown) => err instanceof T.TesterRefused && err.status === 409);
  await assert.rejects(T.removeTester(idris), (err: unknown) => err instanceof T.TesterRefused && err.status === 409);
  for (const role of ["mira", "idris"] as const) {
    assert.deepEqual(await call("POST", "/admin/testers", { email: QA_PAIR[role].email }), { status: 409, body: { error: "qa_pair", message: L.qaAdd } });
  }
  assert.deepEqual((await q("select qa, added_by from testers where user_id = $1", [mira])).rows, [{ qa: "mira", added_by: "qa-pair" }]);
});
