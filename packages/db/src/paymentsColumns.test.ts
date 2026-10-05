/**
 * Bootstrap step 1's payments columns (migrate-payments-columns.ts) on a database shaped as before this round: its
 * bundles and failed reports are marked once, in the transaction that adds their column, and a second run marks
 * nothing. Each case makes its own database on the scratch Postgres WALK_DATABASE_URL names, since a bootstrapped
 * one already has the columns, and drops it after; the cases skip, saying why, without one.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";

const SCRATCH = process.env.WALK_DATABASE_URL;
const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the backfill runs on a scratch Postgres";
const SCRIPT = fileURLToPath(new URL("../scripts/migrate-payments-columns.ts", import.meta.url));
const run = randomUUID().slice(0, 8);
const made: string[] = [];

function urlOf(database: string | null): string {
  const url = new URL(SCRATCH!);
  if (database) url.pathname = `/${database}`;
  return url.toString();
}

async function withDb<T>(database: string | null, work: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: urlOf(database) });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

// The four tables as they stood before this round, cut to the columns the script reads or changes. A database the
// test checkout never reached has no bundles.is_test.
async function oldDatabase(withIsTest: boolean): Promise<string> {
  const name = `r1702_${run}_${made.length}`;
  await withDb(null, (c) => c.query(`CREATE DATABASE ${name}`));
  made.push(name);
  // The script's session runs in Brussels, so the failure's time cannot lean on the server's zone.
  await withDb(null, (c) => c.query(`ALTER DATABASE ${name} SET timezone TO 'Europe/Brussels'`));
  await withDb(name, (c) =>
    c.query(`
      CREATE TABLE users (id text PRIMARY KEY, email text, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now());
      CREATE TABLE bundles (id text PRIMARY KEY, user_id text NOT NULL, bundle_kind text NOT NULL,${withIsTest ? " is_test boolean NOT NULL DEFAULT false," : ""} created_at timestamp NOT NULL DEFAULT now());
      CREATE TABLE credits (id text PRIMARY KEY, user_id text NOT NULL, bundle_id text NOT NULL, credit_type text DEFAULT 'natal', status text NOT NULL DEFAULT 'available');
      CREATE TABLE reports (id text PRIMARY KEY, session_id text NOT NULL, status text NOT NULL DEFAULT 'pending', updated_at timestamp NOT NULL DEFAULT now());
    `),
  );
  return name;
}

function migrate(database: string): void {
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: urlOf(database) };
  delete env.DATABASE_SSL;
  const out = spawnSync(process.execPath, ["--import", "tsx", SCRIPT], { encoding: "utf8", env });
  assert.equal(out.status, 0, out.stderr);
}

after(async () => {
  for (const name of made) await withDb(null, (c) => c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`));
});

test("before this round: the test checkout's bundles read test, every other bundle grant, and a failed report is final at its failure's time", { skip: NO_DB }, async () => {
  const name = await oldDatabase(true);
  await withDb(name, async (c) => {
    await c.query(`INSERT INTO bundles (id, user_id, bundle_kind, is_test) VALUES ('test-checkout', 'u', 'solo', true), ('admin', 'u', 'couple', false)`);
    await c.query(`INSERT INTO credits (id, user_id, bundle_id) VALUES ('credit', 'u', 'admin')`);
    // As the API writes it: UTC, in a column without a zone.
    await c.query(`INSERT INTO reports (id, session_id, status, updated_at) VALUES ('failed', 's', 'failed', '2026-10-01 10:00:00'), ('complete', 's', 'complete', '2026-10-02 10:00:00')`);
  });

  migrate(name);

  await withDb(name, async (c) => {
    const bundles = await c.query(`SELECT id, source, purchase_id FROM bundles ORDER BY id`);
    assert.deepEqual(bundles.rows, [
      { id: "admin", source: "grant", purchase_id: null },
      { id: "test-checkout", source: "test", purchase_id: null },
    ]);
    const reports = await c.query(`SELECT id, failed_tries, failed_at FROM reports ORDER BY id`);
    assert.deepEqual(
      reports.rows.map((r) => [r.id, r.failed_tries, r.failed_at ? (r.failed_at as Date).toISOString() : null]),
      [
        ["complete", 0, null],
        ["failed", 3, "2026-10-01T10:00:00.000Z"],
      ],
    );
    const columns = await c.query(
      `SELECT table_name, column_name FROM information_schema.columns WHERE (table_name, column_name) IN (('credits', 'credit_type'), ('users', 'stripe_customer_id'))`,
    );
    assert.deepEqual(columns.rows, [{ table_name: "users", column_name: "stripe_customer_id" }]);
  });
});

test("a second run marks nothing: an old bundle, a sandbox purchase and a first failure keep what they read", { skip: NO_DB }, async () => {
  const name = await oldDatabase(true);
  await withDb(name, (c) => c.query(`INSERT INTO bundles (id, user_id, bundle_kind, is_test) VALUES ('admin', 'u', 'solo', false)`));
  migrate(name);
  await withDb(name, async (c) => {
    await c.query(`INSERT INTO bundles (id, user_id, bundle_kind, is_test, source, purchase_id) VALUES ('sandbox', 'u', 'family', true, 'purchase', 'purchase-1')`);
    await c.query(`INSERT INTO reports (id, session_id, status, failed_tries, failed_at) VALUES ('first-failure', 's', 'failed', 1, now())`);
  });

  migrate(name);

  await withDb(name, async (c) => {
    assert.deepEqual((await c.query(`SELECT id, source FROM bundles ORDER BY id`)).rows, [
      { id: "admin", source: "grant" },
      { id: "sandbox", source: "purchase" },
    ]);
    assert.deepEqual((await c.query(`SELECT id, failed_tries FROM reports`)).rows, [{ id: "first-failure", failed_tries: 1 }]);
  });
});

test("a database the test checkout never reached has no is_test: every old bundle reads grant", { skip: NO_DB }, async () => {
  const name = await oldDatabase(false);
  await withDb(name, (c) => c.query(`INSERT INTO bundles (id, user_id, bundle_kind) VALUES ('admin', 'u', 'couple')`));

  migrate(name);

  await withDb(name, async (c) => {
    assert.deepEqual((await c.query(`SELECT id, source FROM bundles`)).rows, [{ id: "admin", source: "grant" }]);
  });
});
