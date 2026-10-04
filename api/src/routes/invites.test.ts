/**
 * A claim racing Change address (ADR-237), through the real router and drizzle with the pool answered from memory, as
 * profiles.test.ts runs its routes. The claim reads its link by the old token and checks the old address; Change
 * address then gives the row a new link and address before the claim takes it, so the old address must take nothing.
 */
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL = "silent";
// A first name with nothing behind it here is asked of Clerk, and a claim sends no mail; neither may leave the machine.
delete process.env.CLERK_SECRET_KEY;
delete process.env.RESEND_API_KEY;
const { pool } = await import("@workspace/db");
const { logger } = await import("../lib/logger.js");
const { mintInviteToken } = await import("../lib/inviteToken.js");
const { default: invitesRouter } = await import("./invites.js");

type Row = Record<string, unknown>;
type Statement = { text: string; params: unknown[] };

const CLAIMER = { user: "user_william", session: "s-william" };
const OLD_ADDRESS = "wiliam@example.com";
const NEW_ADDRESS = "william@example.com";

/** The columns a statement reads back, in order: its select list, else its returning list. */
function columnsOf(text: string): string[] {
  const list = text.startsWith("select ") ? text.slice(7, text.indexOf(" from ")) : text.slice(text.indexOf(" returning ") + 11);
  return list.split(", ").map((c) => c.slice(c.lastIndexOf(".") + 1).replaceAll('"', ""));
}

/** Every statement the route sends is kept, in a transaction or not, and `answer` gives the rows of those that read. */
function fakePool(t: TestContext, answer: (s: Statement) => Row[] | undefined): Statement[] {
  const sent: Statement[] = [];
  const query = async (config: string | { text: string; rowMode?: string }, params: unknown[] = []) => {
    const text = typeof config === "string" ? config : config.text;
    sent.push({ text, params });
    const rows = answer({ text, params }) ?? [];
    const arrays = typeof config !== "string" && config.rowMode === "array";
    return { rows: arrays ? rows.map((r) => columnsOf(text).map((c) => r[c] ?? null)) : rows, rowCount: rows.length };
  };
  t.mock.method(pool, "query", query);
  t.mock.method(pool, "connect", async () => ({ query, release: () => {} }));
  return sent;
}

/** A statement with its parameters written in, so a test reads what Postgres would run. */
function bound({ text, params }: Statement): string {
  return text.replace(/\$(\d+)/g, (_, n: string) => {
    const v = params[Number(n) - 1];
    if (v === null || v === undefined) return "null";
    return typeof v === "string" ? `'${v}'` : String(v);
  });
}

/**
 * Whether the claim's update takes the link as the row now stands, as Postgres would evaluate its where: the guards
 * it names on the link and its address must match the row, and the row must still be waiting.
 */
function takes(s: Statement, row: Row): boolean {
  const text = bound(s);
  const hash = /"invite_tokens"\."token_hash" = '([^']*)'/.exec(text)?.[1];
  const email = /"invite_tokens"\."email" = '([^']*)'/.exec(text)?.[1];
  return (hash === undefined || hash === row.token_hash) && (email === undefined || email === row.email)
    && !row.claimed_at && !row.revoked_at;
}

/**
 * A waiting link and the database around it. The claim's first read finds it by its old token; Change address lands
 * the moment that read returns, giving the row a new link and address, as a change committed between the two would.
 */
function raceDb(t: TestContext, kind: "send" | "gift") {
  const old = mintInviteToken();
  const now = Date.now();
  const row: Row = {
    id: "inv-1", token_hash: old.tokenHash, email: OLD_ADDRESS, kind, profile_id: kind === "send" ? "P1" : null,
    relationship_id: null, credit_id: kind === "gift" ? "credit-1" : null, recipient_name: null, note: null,
    created_by_user_id: "user_giver", created_by_session_id: "s-giver", expires_at: new Date(now + 6 * 86_400_000),
    claimed_at: null, claimed_by_user_id: null, reminded_at: null, revoked_at: null, handed_back_at: null,
    email_delivered: true, created_at: new Date(now - 86_400_000),
  };
  const sent = fakePool(t, (s) => {
    const { text, params } = s;
    if (text.startsWith("select ") && text.includes(' from "invite_tokens" where "invite_tokens"."token_hash" = $1')) {
      if (params[0] !== row.token_hash) return [];
      const read = { ...row };
      Object.assign(row, { token_hash: mintInviteToken().tokenHash, email: NEW_ADDRESS, created_at: new Date() });
      return [read];
    }
    if (text.startsWith("select ") && text.includes(' from "invite_tokens" where "invite_tokens"."id" = $1')) {
      return params[0] === row.id ? [row] : [];
    }
    // The claimer signed in with the address the link first went to.
    if (text.startsWith('select "email" from "users"')) return [{ email: OLD_ADDRESS }];
    if (text.startsWith('update "invite_tokens" set "claimed_at" = $1')) {
      if (!takes(s, row)) return [];
      Object.assign(row, { claimed_at: new Date(), claimed_by_user_id: params[1] });
      return [{ id: row.id }];
    }
    if (text.startsWith('update "profiles" set "claimed_by_user_id" = $1')) return [{ id: "P1" }];
    return undefined;
  });
  return { token: old.token, oldHash: old.tokenHash, row, sent };
}

async function serve(t: TestContext) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = CLAIMER.user;
    req.sessionId = CLAIMER.session;
    req.log = logger;
    next();
  });
  app.use(invitesRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return async (token: string) => {
    const res = await fetch(`${base}/invites/${encodeURIComponent(token)}/claim`, { method: "POST" });
    return { status: res.status, body: (await res.json()) as unknown };
  };
}

const takeOf = (sent: Statement[]) => sent.find((s) => s.text.startsWith('update "invite_tokens" set "claimed_at" = $1'));

test("Change address landing between a send's read and its claim: the old address takes nothing, and the claim answers as a revoked link (ADR-237)", async (t) => {
  const { token, oldHash, row, sent } = raceDb(t, "send");
  const claim = await serve(t);
  const r = await claim(token);
  assert.equal(r.status, 404, JSON.stringify(r.body));
  assert.deepEqual(r.body, { error: "not_found", message: "Invite not found" });
  assert.deepEqual([row.claimed_at, row.email], [null, NEW_ADDRESS], "the send waits for its new address");
  // The claim is taken only as the link it read, and once that misses, the chart's claim goes with it.
  assert.match(bound(takeOf(sent)!), new RegExp(`"invite_tokens"\\."token_hash" = '${oldHash}' and "invite_tokens"\\."email" = '${OLD_ADDRESS}'`));
  assert.ok(sent.some((s) => s.text === "rollback"), "the chart's claim is rolled back");
  assert.ok(!sent.some((s) => s.text === "commit"));
});

test("Change address landing between a gift's read and its claim: the old address takes neither the gift nor its credit (ADR-237)", async (t) => {
  const { token, oldHash, row, sent } = raceDb(t, "gift");
  const claim = await serve(t);
  const r = await claim(token);
  assert.equal(r.status, 404, JSON.stringify(r.body));
  assert.deepEqual(r.body, { error: "not_found", message: "Invite not found" });
  assert.deepEqual([row.claimed_at, row.email], [null, NEW_ADDRESS], "the gift waits for its new address");
  assert.match(bound(takeOf(sent)!), new RegExp(`"invite_tokens"\\."token_hash" = '${oldHash}' and "invite_tokens"\\."email" = '${OLD_ADDRESS}'`));
  assert.ok(!sent.some((s) => /update "credits"/i.test(s.text)), "the held credit stays held");
});

test("a claim that loses only to another claim of the same link keeps its answer: 409 already_claimed", async (t) => {
  const old = mintInviteToken();
  const row: Row = {
    id: "inv-2", token_hash: old.tokenHash, email: OLD_ADDRESS, kind: "gift", profile_id: null, relationship_id: null,
    credit_id: "credit-2", recipient_name: null, note: null, created_by_user_id: "user_giver", created_by_session_id: "s-giver",
    expires_at: new Date(Date.now() + 86_400_000), claimed_at: null, claimed_by_user_id: null, reminded_at: null,
    revoked_at: null, handed_back_at: null, email_delivered: true, created_at: new Date(Date.now() - 3_600_000),
  };
  fakePool(t, ({ text, params }) => {
    if (text.startsWith("select ") && text.includes(' from "invite_tokens" where "invite_tokens"."token_hash" = $1')) {
      if (params[0] !== row.token_hash) return [];
      const read = { ...row };
      // The same link is claimed in another tab the moment this claim has read it.
      Object.assign(row, { claimed_at: new Date(), claimed_by_user_id: "user_other_tab" });
      return [read];
    }
    if (text.startsWith("select ") && text.includes(' from "invite_tokens" where "invite_tokens"."id" = $1')) return [row];
    if (text.startsWith('select "email" from "users"')) return [{ email: OLD_ADDRESS }];
    return undefined;
  });
  const claim = await serve(t);
  const r = await claim(old.token);
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.deepEqual(r.body, { error: "already_claimed", message: "Invite already claimed" });
});
