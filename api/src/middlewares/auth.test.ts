/**
 * The sign-in claim (reading 3, Review 05/10 §1) and the auth middleware's lines. A signed-out request passes through
 * with no database. On a scratch Postgres named by WALK_DATABASE_URL: a sign-in moves the session's own charts and the
 * pairs made from them to the account, and nothing another account or session holds; an account that already has its
 * own chart keeps it as You, the session's own arriving as a person under its own name, and a second sign-in moves
 * nothing (MB-235); a pair made while the session read as signed out is claimed at its next signed-in request; the
 * claim's line carries counts only, and the line for an address Clerk couldn't give names no account. Without one those
 * skip, saying why. Clerk is a stand-in that nothing reaches: no secret key is set, so a lookup fails before it leaves
 * the process. Charts are the fixtures' birth data alone, with no chart stored.
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
const { isSelfFor } = await import("../lib/access.js");
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
const TWO = `user_two_${run}`;
const ME = `user_me_${run}`;
const WRITER = `user_writer_${run}`;
const ACCOUNTS = [ACCOUNT, OTHER, FIRST_SIGHT, LATER, TWO, ME, WRITER];

const CLAIMED = "sign-in claimed the session's charts and pairs";

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

/**
 * A chart as the birth form stores one before sign-in: the fixture's birth data, held by the session, or by an account,
 * marked as its holder's own when `isSelf`.
 */
async function chart(session: string, person: string, userId: string | null = null, isSelf = false): Promise<string> {
  const f = sample(person);
  const id = randomUUID();
  await q(
    `insert into profiles (id, session_id, user_id, is_self, name, birth_date, birth_time, birth_place, latitude, longitude,
       timezone_offset, timezone, birth_time_window_minutes)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [id, session, userId, isSelf, f.name, f.birthDate, f.birthTime, PLACES[person], f.latitude, f.longitude, f.timezoneOffset, f.timezone, f.birthTimeWindowMinutes ?? 0],
  );
  return id;
}

const COLUMNS = `id, user_id as "userId", session_id as "sessionId", claimed_by_user_id as "claimedByUserId", is_self as "isSelf",
  claimed_as_self as "claimedAsSelf", name, updated_at as "updatedAt"`;
type Row = {
  id: string; userId: string | null; sessionId: string; claimedByUserId: string | null; isSelf: boolean; claimedAsSelf: boolean;
  name: string; updatedAt: Date;
};

async function rowOf(id: string): Promise<Row> {
  const { rows } = await q(`select ${COLUMNS} from profiles where id = $1`, [id]);
  return rows[0] as Row;
}

/** Who holds a chart, and whether it carries its holder's mark. */
async function standing(id: string): Promise<[string | null, boolean]> {
  const row = await rowOf(id);
  return [row.userId, row.isSelf];
}

/** The charts an account reads as its own, as its circle seats them (`isSelfFor`). */
async function ownOf(userId: string): Promise<string[]> {
  const { rows } = await q(`select ${COLUMNS} from profiles where user_id = $1 or claimed_by_user_id = $1`, [userId]);
  return (rows as Row[]).filter((row) => isSelfFor({ userId, sessionId: "" }, row)).map((row) => row.id);
}

// pino's and pino-http's own fields; what is left on a claim's line is what the claim put there.
const BASE_FIELDS = new Set(["level", "time", "pid", "hostname", "req", "msg"]);
const fieldsOf = (line: Record<string, unknown>) => Object.fromEntries(Object.entries(line).filter(([key]) => !BASE_FIELDS.has(key)));

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
  // The session's own chart: an account with none of its own takes it as its own.
  const mira = await chart(session, "mira", null, true);
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
  assert.deepEqual(await ownOf(ACCOUNT), [mira], "the session's own arrives as the account's own");
  assert.equal(await holderOf("relationships", made), ACCOUNT, "the pair stays with the account");
  assert.equal(await holderOf("profiles", othersChart), OTHER);
  assert.equal(await holderOf("relationships", othersPair), OTHER);
  assert.equal(await holderOf("profiles", strangerA), null);
  assert.equal(await holderOf("profiles", strangerB), null);
  assert.equal(await holderOf("relationships", strangersPair), null);

  const claimed = logged(CLAIMED);
  assert.equal(claimed.length, 1);
  assert.deepEqual(fieldsOf(claimed[0]), { profiles: 2, relationships: 1, ownAsPerson: 0 }, "the line carries counts only");
  assert.ok(!lines.join("").includes(ACCOUNT), "no line names the account");
});

test("an account that already has its own chart keeps it as You, and the session's own arrives as a person under its own name", { skip: NO_DB }, async (t) => {
  const { ask, logged, lines, close } = await serve();
  t.after(close);
  const session = `s-two_${run}`;
  // The account's own chart, written in another browser.
  const own = await chart(`s-before_${run}`, "noor", TWO, true);
  // What this browser made signed out: its own chart, another person and the pair of them.
  const mine = await chart(session, "mira", null, true);
  const idris = await chart(session, "idris");
  const made = await pair(session, mine, idris);
  // Neither is this session's to move or unmark: a chart an account holds, though this browser made it, and another
  // browser's own chart.
  const othersChart = await chart(session, "tomas", OTHER);
  const elsewhere = await chart(`s-away_${run}`, "june", null, true);

  assert.equal(await ask(session, TWO), TWO);

  assert.deepEqual(await ownOf(TWO), [own], "the account's own chart stays You, and the only one");
  const arrived = await rowOf(mine);
  assert.deepEqual([arrived.userId, arrived.isSelf, arrived.name], [TWO, false, sample("mira").name], "the session's own arrives as a person under its own name");
  assert.deepEqual(await standing(idris), [TWO, false]);
  assert.equal(await holderOf("relationships", made), TWO, "the pair moves with its charts");
  assert.deepEqual(await standing(othersChart), [OTHER, false]);
  assert.deepEqual(await standing(elsewhere), [null, true], "another browser's own chart stays as it was");

  const claimed = logged(CLAIMED);
  assert.equal(claimed.length, 1);
  assert.deepEqual(fieldsOf(claimed[0]), { profiles: 2, relationships: 1, ownAsPerson: 1 }, "the line carries counts only");
  for (const named of [TWO, sample("mira").name, sample("noor").name]) {
    assert.ok(!lines.join("").includes(named), "no line names the account or a person");
  }

  // Signed out and in again: nothing is left to move, so no row is written and no line is logged.
  const before = await Promise.all([own, mine, idris, othersChart, elsewhere].map(rowOf));
  assert.equal(await ask(session), null);
  assert.equal(await ask(session, TWO), TWO);
  assert.deepEqual(await Promise.all([own, mine, idris, othersChart, elsewhere].map(rowOf)), before);
  assert.equal(await holderOf("relationships", made), TWO);
  assert.equal(logged(CLAIMED).length, 1);
});

test("a chart sent to the account that it said This is me to counts as its own at a sign-in", { skip: NO_DB }, async (t) => {
  const { ask, close } = await serve();
  t.after(close);
  const session = `s-me_${run}`;
  // Another account wrote it and sent it here; the account claimed it and said This is me.
  const sent = await chart(`s-writer_${run}`, "noor", WRITER);
  await q("update profiles set claimed_by_user_id = $2, claimed_as_self = true where id = $1", [sent, ME]);
  const mine = await chart(session, "mira", null, true);

  assert.equal(await ask(session, ME), ME);

  assert.deepEqual(await ownOf(ME), [sent], "This is me stays the account's own, and the only one");
  assert.deepEqual(await standing(mine), [ME, false], "the session's own arrives as a person");
  assert.deepEqual(await standing(sent), [WRITER, false], "the chart sent here stays its writer's to hold");
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
