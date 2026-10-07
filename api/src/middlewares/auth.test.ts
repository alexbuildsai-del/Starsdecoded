/**
 * The sign-in claim (reading 3, Review 05/10 §1) and the auth middleware's lines. A signed-out request passes through
 * with no database. On a scratch Postgres named by WALK_DATABASE_URL: a sign-in moves the session's own charts and the
 * pairs made from them to the account, and nothing another account or session holds; a pair made while the session
 * read as signed out is claimed at its next signed-in request; the line for an address Clerk couldn't give names no
 * account. Without one those skip, saying why. Clerk is a stand-in that nothing reaches: no secret key is set, so a
 * lookup fails before it leaves the process. Charts are the fixtures' birth data alone, with no chart stored.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import express, { type RequestHandler } from "express";
import pinoHttp from "pino-http";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points at a closed port, so a read there fails at once.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL = "silent";
delete process.env.CLERK_SECRET_KEY;

const { authMiddleware } = await import("./auth.js");
const { createLogger, httpSerializers } = await import("../lib/logger.js");
const { pool } = await import("@workspace/db");

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the claim moves rows on a scratch Postgres";

const q = (text: string, params: unknown[] = []) => pool.query(text, params);

const PEOPLE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "sample-people");
const sample = (id: string) => JSON.parse(readFileSync(join(PEOPLE, `${id}.json`), "utf8"));
// Each fixture's note names its city.
const PLACES: Record<string, string> = { mira: "Lisbon", idris: "Cardiff", tomas: "Madrid", noor: "Amsterdam", june: "London" };

/** Each run's own accounts and sessions, so a second run, or the walk on the same database, finds nothing of the first. */
const run = randomUUID().slice(0, 8);
const ACCOUNT = `user_claim_${run}`;
const OTHER = `user_other_${run}`;
const FIRST_SIGHT = `user_first_${run}`;
const LATER = `user_later_${run}`;
const ACCOUNTS = [ACCOUNT, OTHER, FIRST_SIGHT, LATER];

if (SCRATCH) {
  after(async () => {
    await q("delete from relationships where session_id like $1", [`%_${run}`]);
    await q("delete from profiles where session_id like $1", [`%_${run}`]);
    await q("delete from users where id = any($1)", [ACCOUNTS]);
    await pool.end();
  });
}

// What Clerk's middleware leaves on a request, which getAuth checks for by this mark: the account a header names, or none.
const CLERK_AUTH = Symbol.for("@clerk/express.auth");
const clerkStandIn: RequestHandler = (req, _res, next) => {
  const userId = req.header("x-user") ?? null;
  const auth = () => ({ tokenType: "session_token", userId, sessionId: userId ? `sess_${run}` : null });
  (req as unknown as { auth: unknown }).auth = Object.assign(auth, { [CLERK_AUTH]: true });
  next();
};

const sessionStandIn: RequestHandler = (req, _res, next) => {
  req.sessionId = req.header("x-session") ?? "";
  next();
};

async function serve() {
  const lines: string[] = [];
  const app = express();
  app.use(pinoHttp({ logger: createLogger({ LOG_LEVEL: "info" }, { write: (s: string) => void lines.push(s) }), serializers: httpSerializers }));
  app.use(sessionStandIn);
  app.use(clerkStandIn);
  app.use(authMiddleware);
  app.get("/api/whoami", (req, res) => void res.json({ userId: req.userId }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const ask = async (session: string, user?: string) => {
    const headers: Record<string, string> = { "x-session": session };
    if (user) headers["x-user"] = user;
    const res = await fetch(`${base}/api/whoami`, { headers });
    return ((await res.json()) as { userId: string | null }).userId;
  };
  const logged = (msg: string) => lines.map((line) => JSON.parse(line) as Record<string, unknown>).filter((line) => line.msg === msg);
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { ask, lines, logged, close };
}

/** A chart as the birth form stores one before sign-in: the fixture's birth data, held by the session, or by an account. */
async function chart(session: string, person: string, userId: string | null = null): Promise<string> {
  const f = sample(person);
  const id = randomUUID();
  await q(
    `insert into profiles (id, session_id, user_id, name, birth_date, birth_time, birth_place, latitude, longitude, timezone_offset,
       timezone, birth_time_window_minutes)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [id, session, userId, f.name, f.birthDate, f.birthTime, PLACES[person], f.latitude, f.longitude, f.timezoneOffset, f.timezone, f.birthTimeWindowMinutes ?? 0],
  );
  return id;
}

/** A pair as POST /compatibility makes one: the relationship and its two charts. */
async function pair(session: string, a: string, b: string, userId: string | null = null): Promise<string> {
  const id = randomUUID();
  await q("insert into relationships (id, session_id, user_id, type) values ($1, $2, $3, 'parent_child')", [id, session, userId]);
  await q(
    "insert into relationship_participants (id, relationship_id, profile_id, role, position) values ($1, $2, $3, 'child', '0'), ($4, $2, $5, 'parent', '1')",
    [randomUUID(), id, a, randomUUID(), b],
  );
  return id;
}

async function holderOf(table: "profiles" | "relationships", id: string): Promise<string | null> {
  const { rows } = await q(`select user_id from ${table} where id = $1`, [id]);
  return rows[0].user_id as string | null;
}

test("a signed-out request passes through as the browser's session, with nothing claimed and nothing failed", async (t) => {
  const { ask, logged, close } = await serve();
  t.after(close);
  assert.equal(await ask(`s-out_${run}`), null);
  assert.deepEqual(logged("auth middleware failed"), []);
});

test("a sign-in claims the session's own charts and the pair made from them, and nothing another account or session holds", { skip: NO_DB }, async (t) => {
  const { ask, logged, lines, close } = await serve();
  t.after(close);
  const session = `s-claim_${run}`;
  const mira = await chart(session, "mira");
  const idris = await chart(session, "idris");
  const made = await pair(session, mira, idris);
  // Rows an account already holds stay its own, even when this browser made them.
  const othersChart = await chart(session, "tomas", OTHER);
  const othersPair = await pair(session, othersChart, mira, OTHER);
  // Another browser's are not this session's to hand over.
  const elsewhere = `s-elsewhere_${run}`;
  const strangerA = await chart(elsewhere, "noor");
  const strangerB = await chart(elsewhere, "june");
  const strangersPair = await pair(elsewhere, strangerA, strangerB);

  assert.equal(await ask(session, ACCOUNT), ACCOUNT);

  assert.equal(await holderOf("profiles", mira), ACCOUNT);
  assert.equal(await holderOf("profiles", idris), ACCOUNT);
  assert.equal(await holderOf("relationships", made), ACCOUNT, "the pair stays with the account");
  assert.equal(await holderOf("profiles", othersChart), OTHER);
  assert.equal(await holderOf("relationships", othersPair), OTHER);
  assert.equal(await holderOf("profiles", strangerA), null);
  assert.equal(await holderOf("profiles", strangerB), null);
  assert.equal(await holderOf("relationships", strangersPair), null);

  const claimed = logged("sign-in claimed the session's charts and pairs");
  assert.equal(claimed.length, 1);
  assert.equal(claimed[0].profiles, 2);
  assert.equal(claimed[0].relationships, 1);
  assert.ok(!lines.join("").includes(ACCOUNT), "no line names the account");
});

test("a pair made while the session read as signed out is claimed at its next signed-in request", { skip: NO_DB }, async (t) => {
  const { ask, close } = await serve();
  t.after(close);
  const session = `s-later_${run}`;
  assert.equal(await ask(session, LATER), LATER);
  // A signed-out answer, after a sign-out or on an expired session cookie: what the session makes now is its own.
  assert.equal(await ask(session), null);
  const mira = await chart(session, "mira");
  const idris = await chart(session, "idris");
  const made = await pair(session, mira, idris);

  assert.equal(await ask(session, LATER), LATER);
  assert.equal(await holderOf("profiles", mira), LATER);
  assert.equal(await holderOf("relationships", made), LATER);
});

test("the line for an address Clerk couldn't give names no account", { skip: NO_DB }, async (t) => {
  const { ask, logged, lines, close } = await serve();
  t.after(close);
  assert.equal(await ask(`s-first_${run}`, FIRST_SIGHT), FIRST_SIGHT);

  const warned = logged("Failed to fetch Clerk user email");
  assert.equal(warned.length, 1);
  assert.ok(!("userId" in warned[0]), "the line carries no account field, redacted or not");
  assert.ok(!lines.join("").includes(FIRST_SIGHT), "no line names the account");
  const { rows } = await q("select email from users where id = $1", [FIRST_SIGHT]);
  assert.deepEqual(rows, [{ email: null }], "the account's row is made without an address");
});
