/**
 * The share grant's edges that need no database (R15-18, ADR-235): what each read answers for no account at all, and
 * how `grantShare` keeps one active grant per chart and reader, run over a stand-in for the transaction that answers
 * each query as the table would. The grant's writes on Postgres itself are shares.test.ts's, on a scratch database.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL ??= "silent";

const { grantShare, grantStands, ownChartOf, revokeShare, shareBackOffered, sharedProfileIds, sharerOf, sharesOf } =
  await import("./shares.js");

const SHARER = "user_audrey";
const READER = "user_william";
const dialect = new PgDialect();

/** Sam's chart's holders, as `chartColumns` reads them: no placement, only who holds it. */
const chart = (over: Record<string, unknown> = {}) => ({
  id: "p-audrey", userId: SHARER as string | null, sessionId: "s-audrey", claimedByUserId: null as string | null,
  isSelf: true, claimedAsSelf: false, ...over,
});

type Held = { id: string; ownerUserId: string; readerUserId: string; revokedAt: Date | null; chart: ReturnType<typeof chart> };

/**
 * The transaction as grantShare uses it, answering each select from `selects` in turn and each insert from `inserts`,
 * and keeping every write it was asked for.
 */
function fakeTx(selects: unknown[][], inserts: unknown[][]) {
  const calls = { selects: 0, updates: [] as Array<{ set: Record<string, unknown>; where: string; params: unknown[] }>, inserts: [] as unknown[] };
  const tx = {
    select: () => {
      const rows = selects[calls.selects++] ?? [];
      const chain = {
        from: () => chain,
        innerJoin: () => chain,
        where: () => chain,
        limit: async () => rows,
      };
      return chain;
    },
    update: () => ({
      set: (set: Record<string, unknown>) => ({
        where: async (where: SQL) => {
          const { sql, params } = dialect.sqlToQuery(where);
          calls.updates.push({ set, where: sql, params });
        },
      }),
    }),
    insert: () => ({
      values: (values: unknown) => {
        calls.inserts.push(values);
        return { onConflictDoNothing: () => ({ returning: async () => inserts.shift() ?? [] }) };
      },
    }),
  };
  return { tx: tx as unknown as Parameters<typeof grantShare>[0], calls };
}

const GRANT = { profileId: "p-audrey", ownerUserId: SHARER, readerUserId: READER, inviteId: "inv-1" };

test("no account, no grant: every read answers nothing for an empty id, and none touches the database", async () => {
  assert.deepEqual([...(await sharedProfileIds(null))], []);
  assert.deepEqual([...(await sharedProfileIds(""))], []);
  assert.equal(await sharerOf("", "p-audrey"), null);
  assert.equal(await sharerOf(READER, ""), null);
  assert.equal(await ownChartOf(""), null);
  assert.deepEqual(await sharesOf(""), []);
  assert.equal(await revokeShare("", SHARER), false);
  assert.equal(await revokeShare("share-1", ""), false);
  assert.equal(await shareBackOffered("", "p-audrey"), false);
  assert.equal(await shareBackOffered(READER, ""), false);
});

test("grant: refused before any query unless one account grants one chart to another (ADR-235)", async () => {
  for (const [why, over] of [
    ["to its own sharer", { readerUserId: SHARER }],
    ["with no chart", { profileId: "" }],
    ["with no sharer", { ownerUserId: "" }],
    ["with no reader", { readerUserId: "" }],
  ] as const) {
    const { tx, calls } = fakeTx([], []);
    await assert.rejects(grantShare(tx, { ...GRANT, ...over }), /one account to another/, why);
    assert.deepEqual([calls.selects, calls.updates.length, calls.inserts.length], [0, 0, 0], why);
  }
});

test("grant: with none held, one row is written for the chart, its sharer, its reader and the link that made it", async () => {
  const { tx, calls } = fakeTx([[]], [[{ id: "share-new" }]]);
  assert.equal(await grantShare(tx, GRANT), "share-new");
  assert.equal(calls.inserts.length, 1);
  const written = calls.inserts[0] as Record<string, unknown>;
  assert.deepEqual({ ...written, id: undefined }, { ...GRANT, id: undefined });
  assert.match(String(written.id), /^[0-9a-f-]{36}$/);
  assert.equal(calls.updates.length, 0);

  const { tx: back } = fakeTx([[]], [[{ id: "share-back" }]]);
  assert.equal(await grantShare(back, { ...GRANT, inviteId: null }), "share-back", "Share yours back has no link");
});

test("grant: granted again by the same sharer, the grant that holds answers and nothing is written", async () => {
  const held: Held = { id: "share-held", ownerUserId: SHARER, readerUserId: READER, revokedAt: null, chart: chart() };
  const { tx, calls } = fakeTx([[held]], []);
  assert.equal(await grantShare(tx, GRANT), "share-held");
  assert.deepEqual([calls.updates.length, calls.inserts.length], [0, 0]);

  // Even when the chart has since stopped being theirs, the sharer's own row is the one: a second would break the index.
  const gone: Held = { ...held, chart: chart({ isSelf: false }) };
  const again = fakeTx([[gone]], []);
  assert.equal(await grantShare(again.tx, GRANT), "share-held");
  assert.deepEqual([again.calls.updates.length, again.calls.inserts.length], [0, 0]);
});

test("grant: another sharer's grant that still stands answers, so a chart is never granted twice to one reader", async () => {
  // Charles's own chart, sent to him by Audrey: Charles shared it with William, and now Audrey grants it too.
  const charles = chart({ id: "p-charles", userId: SHARER, claimedByUserId: "user_charles", isSelf: false, claimedAsSelf: true });
  const held: Held = { id: "share-charles", ownerUserId: "user_charles", readerUserId: READER, revokedAt: null, chart: charles };
  const { tx, calls } = fakeTx([[held]], []);
  assert.equal(await grantShare(tx, { ...GRANT, profileId: "p-charles" }), "share-charles");
  assert.deepEqual([calls.updates.length, calls.inserts.length], [0, 0]);
});

test("grant: another sharer's grant that no longer stands gives way, revoked first, then the new one written", async () => {
  // Handed back with Not me: the chart is Audrey's again and no longer Charles's own, so his grant reads nothing.
  const handedBack = chart({ id: "p-charles", userId: SHARER, claimedByUserId: null, isSelf: false, claimedAsSelf: false });
  const held: Held = { id: "share-stale", ownerUserId: "user_charles", readerUserId: READER, revokedAt: null, chart: handedBack };
  const { tx, calls } = fakeTx([[held]], [[{ id: "share-fresh" }]]);
  assert.equal(await grantShare(tx, { ...GRANT, profileId: "p-charles" }), "share-fresh");
  assert.equal(calls.updates.length, 1);
  assert.ok(calls.updates[0].set.revokedAt instanceof Date);
  assert.deepEqual(calls.updates[0].params, ["share-stale"], "only the stale grant is revoked");
  assert.equal(calls.inserts.length, 1);
});

test("grant: a grant landing between the read and the write is the one answered; none to read back is an error", async () => {
  const { tx, calls } = fakeTx([[], [{ id: "share-raced" }]], [[]]);
  assert.equal(await grantShare(tx, GRANT), "share-raced");
  assert.deepEqual([calls.selects, calls.inserts.length], [2, 1]);

  const lost = fakeTx([[], []], [[]]);
  await assert.rejects(grantShare(lost.tx, GRANT), /could not be read back/);
});

test("stands: an account's standing never turns on a session, and a revoke at any time ends it", () => {
  assert.equal(grantStands({ ownerUserId: SHARER, readerUserId: READER, revokedAt: null }, chart({ sessionId: "" })), true);
  assert.equal(grantStands({ ownerUserId: SHARER, readerUserId: READER, revokedAt: null }, chart({ sessionId: "s-someone-else" })), true);
  assert.equal(grantStands({ ownerUserId: SHARER, readerUserId: READER, revokedAt: new Date(0) }, chart()), false);
  // A chart its sharer wrote with no account, before signing in, is no account's own until claimed.
  assert.equal(grantStands({ ownerUserId: SHARER, readerUserId: READER, revokedAt: null }, chart({ userId: null })), false);
});
