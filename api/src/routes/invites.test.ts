/**
 * A claim racing Change address (ADR-237), through the real router and drizzle with the pool answered from memory, as
 * profiles.test.ts runs its routes. The claim reads its link by the old token and checks the old address; Change
 * address then gives the row a new link and address before the claim takes it, so the old address must take nothing.
 * Then a pair sent to the other of its two on the chart they keep (ADR-285): its Send, its refusals and its claim.
 */
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL = "silent";
// A first name with nothing behind it here is asked of Clerk, and a send's email has no key to go out with; neither may
// leave the machine.
delete process.env.CLERK_SECRET_KEY;
delete process.env.RESEND_API_KEY;
const { pool } = await import("@workspace/db");
const { logger } = await import("../lib/logger.js");
const { mintInviteToken } = await import("../lib/inviteToken.js");
const { default: invitesRouter, PAIR_SEND_LINES, SOMEONE_ELSES_PAIR } = await import("./invites.js");

type Row = Record<string, unknown>;
type Statement = { text: string; params: unknown[] };

const CLAIMER = { user: "user_william", session: "s-william" };
const OLD_ADDRESS = "wiliam@example.com";
const NEW_ADDRESS = "william@example.com";

/** The columns a statement reads back, in order, as written: its select list, else its returning list. */
function columnsOf(text: string): string[] {
  const list = text.startsWith("select ") ? text.slice(7, text.indexOf(" from ")) : text.slice(text.indexOf(" returning ") + 11);
  return list.split(", ").map((c) => c.replaceAll('"', ""));
}

/** A join reads two tables' alike-named columns, so a row may key one by its table ("profiles.id"); else by its name. */
function valueOf(row: Row, column: string): unknown {
  const name = column.slice(column.lastIndexOf(".") + 1);
  return (column in row ? row[column] : row[name]) ?? null;
}

/** Every statement the route sends is kept, in a transaction or not, and `answer` gives the rows of those that read. */
function fakePool(t: TestContext, answer: (s: Statement) => Row[] | undefined): Statement[] {
  const sent: Statement[] = [];
  const query = async (config: string | { text: string; rowMode?: string }, params: unknown[] = []) => {
    const text = typeof config === "string" ? config : config.text;
    sent.push({ text, params });
    const rows = answer({ text, params }) ?? [];
    const arrays = typeof config !== "string" && config.rowMode === "array";
    return { rows: arrays ? rows.map((r) => columnsOf(text).map((c) => valueOf(r, c))) : rows, rowCount: rows.length };
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

/** The router as one signed-in account reaches it, posting to any of its routes. */
async function serveAs(t: TestContext, who: { user: string; session: string }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = who.user;
    req.sessionId = who.session;
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
  return async (path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  };
}

const claimPath = (token: string) => `/invites/${encodeURIComponent(token)}/claim`;

async function serve(t: TestContext) {
  const post = await serveAs(t, CLAIMER);
  return (token: string) => post(claimPath(token));
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

// ADR-285: Mira made a parent and child report of herself and Idris from Idris's own chart, which he shared with her.
const MIRA = { user: "user_mira", session: "s-mira" };
const IDRIS = { user: "user_idris", session: "s-idris" };
const INES = { user: "user_ines", session: "s-ines" };
// The address Mira types and the one Idris's account holds differ, so a send that read his account would show it.
const TYPED = "idris.home@example.com";
const ON_HIS_ACCOUNT = "idris@example.com";

type Chart = {
  id: string; name: string; user_id: string | null; session_id: string; claimed_by_user_id: string | null;
  is_self: boolean; claimed_as_self: boolean;
};
const MIRAS_OWN: Chart = {
  id: "p-mira", name: "Mira Costa", user_id: MIRA.user, session_id: MIRA.session, claimed_by_user_id: null, is_self: true, claimed_as_self: false,
};
const IDRIS_KEEPS: Chart = {
  id: "p-idris", name: "Idris Costa", user_id: IDRIS.user, session_id: IDRIS.session, claimed_by_user_id: null, is_self: true, claimed_as_self: false,
};

const keyed = (table: string, row: Row): Row => Object.fromEntries(Object.entries(row).map(([k, v]) => [`${table}.${k}`, v]));
/** Each write a route sent, by its verb and table. */
const writes = (sent: Statement[]) =>
  sent.flatMap((s) => /^(insert into|update|delete from) "[a-z_]+"/.exec(s.text)?.[0] ?? []);

/**
 * The pair as the routes read it: its report, Mira's relationship, its two sides in order, Idris's grant to Mira, and
 * a waiting link of it to the address she typed. `charts` replaces its two sides; `grant: false` is Idris's share gone.
 */
function pairDb(t: TestContext, over: { charts?: [Chart, Chart]; grant?: boolean; signedInWith?: string } = {}) {
  const [a, b] = over.charts ?? [MIRAS_OWN, IDRIS_KEEPS];
  const link = mintInviteToken();
  const invite: Row = {
    id: "inv-pair", token_hash: link.tokenHash, email: TYPED, kind: "send", profile_id: b.id, relationship_id: "rel-1", credit_id: null,
    recipient_name: null, note: null, created_by_user_id: MIRA.user, created_by_session_id: MIRA.session,
    expires_at: new Date(Date.now() + 6 * 86_400_000), claimed_at: null, claimed_by_user_id: null, reminded_at: null,
    revoked_at: null, handed_back_at: null, email_delivered: true, created_at: new Date(Date.now() - 3_600_000),
  };
  const side = (chart: Chart, n: number): Row => ({
    ...keyed("relationship_participants", {
      id: `rp-${n}`, relationship_id: "rel-1", profile_id: chart.id, role: n ? "parent" : "child", access_role: "owner", position: String(n),
    }),
    ...keyed("profiles", chart),
  });
  const sent = fakePool(t, (s) => {
    const { text, params } = s;
    if (text.startsWith("select ") && text.includes(' from "reports" where ("reports"."id" = $1')) {
      return [{ id: "rep-pair", type: "compatibility", relationship_id: "rel-1", status: "complete", session_id: MIRA.session }];
    }
    if (text.startsWith("select ") && text.includes(' from "relationships" where "relationships"."id" = $1')) {
      return [{ id: "rel-1", user_id: MIRA.user, session_id: MIRA.session, type: "parent_child" }];
    }
    if (text.includes(' where "relationship_participants"."relationship_id" = $1 order by ')) return [side(a, 0), side(b, 1)];
    if (text.includes(' from "profile_shares" inner join "profiles" ')) {
      if (over.grant === false) return [];
      const grant = keyed("profile_shares", { owner_user_id: IDRIS.user, reader_user_id: MIRA.user, revoked_at: null });
      return [{ ...grant, ...keyed("profiles", IDRIS_KEEPS) }];
    }
    if (text.startsWith('select "name" from "profiles"')) return params[0] === MIRA.user ? [{ name: MIRAS_OWN.name }] : [];
    if (text.includes(' from "invite_tokens" where "invite_tokens"."token_hash" = $1')) {
      return params[0] === invite.token_hash ? [invite] : [];
    }
    if (text.startsWith('select "email" from "users"')) return [{ email: over.signedInWith ?? TYPED }];
    if (text.startsWith('select "user_id", "claimed_by_user_id" from "profiles"')) {
      return [a, b].filter((c) => c.id === params[0]).map((c) => ({ user_id: c.user_id, claimed_by_user_id: c.claimed_by_user_id }));
    }
    if (text.startsWith('select "id" from "profiles"') && text.endsWith(" for update")) {
      return [a, b].filter((c) => c.id === params[0] && c.user_id === params[1] && !c.claimed_by_user_id).map((c) => ({ id: c.id }));
    }
    if (text.startsWith('update "invite_tokens" set "claimed_at" = $1')) {
      if (!takes(s, invite)) return [];
      Object.assign(invite, { claimed_at: new Date(), claimed_by_user_id: params[1] });
      return [{ id: invite.id }];
    }
    if (text.startsWith('select "id" from "reports"')) return [{ id: "rep-pair" }];
    return undefined;
  });
  return { token: link.token, invite, sent };
}

test("a pair sent to the other of its two on the chart they keep goes by a link to the address its maker types, never one off their account (ADR-285, R15-18)", async (t) => {
  const { sent } = pairDb(t, { signedInWith: ON_HIS_ACCOUNT });
  const post = await serveAs(t, MIRA);
  const unaddressed = await post("/compatibility/rep-pair/send", {});
  assert.deepEqual([unaddressed.status, unaddressed.body.message], [400, "Add Idris's email to share it."]);
  assert.deepEqual(writes(sent), [], "no address, nothing written");

  const r = await post("/compatibility/rep-pair/send", { email: "Idris.Home@example.com" });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const invite = r.body.invite as Record<string, unknown>;
  assert.deepEqual([r.body.state, invite.email, invite.profileId, invite.relationshipId], ["invited", TYPED, "p-idris", "rel-1"]);
  const insert = sent.find((s) => s.text.startsWith('insert into "invite_tokens"'));
  assert.ok(insert?.params.includes(TYPED) && !insert.params.includes(ON_HIS_ACCOUNT), JSON.stringify(insert?.params));
  assert.ok(!sent.some((s) => s.text.startsWith('select "email" from "users"')), "an address was read off an account");
  assert.deepEqual(writes(sent), ['insert into "invite_tokens"', 'update "invite_tokens"'], "the link and its delivery only, no grant yet");
});

test("each 403 on a pair's Send names its real reason: only a maker who is not one of the two hears so (ADR-285)", async (t) => {
  // Mira's chart as her mother wrote and sent it, claimed without This is me.
  const sentToMira: Chart = { ...MIRAS_OWN, id: "p-sent", user_id: "user_mum", session_id: "s-mum", claimed_by_user_id: MIRA.user, is_self: false };
  const junesWritten: Chart = { ...MIRAS_OWN, id: "p-june", name: "June Park", is_self: false };
  const stopped = "Idris stopped sharing their Personal report with you, so you can't share this Compatibility report.";
  const cases: Array<[string, Parameters<typeof pairDb>[1], string]> = [
    ["not one of the two", { charts: [junesWritten, IDRIS_KEEPS] }, PAIR_SEND_LINES.notOneOfTwo],
    ["one of the two, after Idris stopped sharing with her", { grant: false }, stopped],
    ["one of the two, the other chart one she claimed herself", { charts: [MIRAS_OWN, sentToMira] }, PAIR_SEND_LINES.bothYours],
  ];
  for (const [maker, world, line] of cases) {
    await t.test(maker, async (st) => {
      const { sent } = pairDb(st, world);
      const r = await (await serveAs(st, MIRA))("/compatibility/rep-pair/send", { email: TYPED });
      assert.deepEqual([r.status, r.body], [403, { error: "forbidden", message: line }]);
      assert.deepEqual(writes(sent), []);
    });
  }
  assert.equal(PAIR_SEND_LINES.stopped("Idris"), stopped);
  assert.equal(PAIR_SEND_LINES.stopped(null), stopped.replace("Idris", "The other person"), "a side with no name");
});

test("its claim by the person who keeps the chart makes their side participant and hands nothing over, so no chart rides on the answer (ADR-285)", async (t) => {
  const { token, invite, sent } = pairDb(t, { signedInWith: TYPED });
  const r = await (await serveAs(t, IDRIS))(claimPath(token));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, {
    profileId: null, relationshipId: "rel-1", relationshipReportId: "rep-pair", redirectTo: "/compatibility/rep-pair", kind: "send", askSelf: false,
  });
  const granted = sent.find((s) => s.text.startsWith('update "relationship_participants"'));
  assert.deepEqual(granted?.params, ["participant", "rel-1", "p-idris"]);
  assert.deepEqual(writes(sent), ['update "relationship_participants"', 'update "invite_tokens"'], "only the grant and the link; no chart");
  assert.equal(invite.claimed_by_user_id, IDRIS.user);
  assert.ok(sent.some((s) => s.text === "commit") && !sent.some((s) => s.text === "rollback"));
});

test("anyone else at the address its maker typed takes nothing: 403, no write, and the link still waits (ADR-285, R-3.6)", async (t) => {
  const { token, invite, sent } = pairDb(t, { signedInWith: TYPED });
  const r = await (await serveAs(t, INES))(claimPath(token));
  assert.deepEqual([r.status, r.body], [403, { error: "wrong_person", message: SOMEONE_ELSES_PAIR }]);
  assert.deepEqual(writes(sent), []);
  assert.ok(!sent.some((s) => s.text === "begin"));
  assert.equal(invite.claimed_at, null);
});
