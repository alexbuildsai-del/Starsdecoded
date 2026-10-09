/**
 * The share grant (ADR-235). Whether a grant stands is pure and runs here
 * with no database. Its writes and reads, the pair picker and summary that
 * read through it, Share yours back's route, a gift's two answers (ADR-331)
 * and Cancel invite and Copy their link (ADR-390) run on a scratch Postgres when
 * WALK_DATABASE_URL names a bootstrapped one (the walk's own variable), and
 * skip, saying why, without it.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points nowhere and nothing queries it.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
// Nothing here writes a report; a path that ever asked a model would meet a closed port, never the network.
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";

const {
  grantShare, grantShareBacks, grantShareBacksOn, grantStands, ownChartOf, revokeShare, shareBackOffered, sharedProfileIds,
  sharerOf, sharesOf,
} = await import("./shares.js");

const SHARER = "user_beatrice";
const READER = "user_william";
const chart = (over = {}) => ({
  userId: SHARER as string | null, sessionId: "s-beatrice", claimedByUserId: null as string | null,
  isSelf: true, claimedAsSelf: false, ...over,
});
const grant = (over = {}) => ({ ownerUserId: SHARER, readerUserId: READER as string | null, revokedAt: null as Date | null, ...over });

test("a grant stands on its sharer's own chart, and so does a link still waiting for its reader", () => {
  assert.equal(grantStands(grant(), chart()), true);
  assert.equal(grantStands(grant({ readerUserId: null }), chart()), true);
});

test("a grant stands on a chart sent to its sharer that they said is them, before and after the hand-over", () => {
  const sentToThem = chart({ userId: "user_writer", sessionId: "s-writer", claimedByUserId: SHARER, isSelf: false, claimedAsSelf: true });
  assert.equal(grantStands(grant(), sentToThem), true);
  assert.equal(grantStands(grant(), { ...sentToThem, userId: SHARER, sessionId: "s-nobody" }), true);
});

test("a grant reads nothing once revoked, once the chart is no longer its sharer's own, or granted to its sharer (R-3.6)", () => {
  assert.equal(grantStands(grant({ revokedAt: new Date() }), chart()), false);
  assert.equal(grantStands(grant(), chart({ isSelf: false })), false);
  const handedBack = chart({ userId: "user_writer", sessionId: "s-writer", claimedByUserId: null, isSelf: false, claimedAsSelf: false });
  assert.equal(grantStands(grant(), handedBack), false);
  assert.equal(grantStands(grant(), { ...handedBack, claimedByUserId: SHARER }), false);
  assert.equal(grantStands(grant(), chart({ userId: "user_someone_else" })), false);
  assert.equal(grantStands(grant({ readerUserId: SHARER }), chart()), false);
  assert.equal(grantStands(grant({ ownerUserId: "" }), chart({ userId: "" })), false);
});

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the grant's queries run on a scratch Postgres";

type Viewer = { userId: string | null; sessionId: string };

/** Each run's own rows, so a second run, or the walk on the same database, finds nothing of the first. */
const run = randomUUID().slice(0, 8);
const id = (name: string) => `r1518-${run}-${name}`;
const BEA = { userId: id("u-beatrice"), sessionId: id("s-beatrice") };
const WILL = { userId: id("u-william"), sessionId: id("s-william") };
const CHARLES = { userId: id("u-charles"), sessionId: id("s-charles") };
const GEORGE = { userId: id("u-george"), sessionId: id("s-george") };
const P = { bea: id("p-beatrice"), will: id("p-william"), charles: id("p-charles"), charlotte: id("p-charlotte") };
const R = { bea: id("r-beatrice"), beaWriting: id("r-beatrice-2"), will: id("r-william"), charles: id("r-charles"), pair: id("r-pair") };
const REL = id("rel-william-beatrice");

let seeded: Promise<void> | null = null;

async function db() {
  const mod = await import("@workspace/db");
  return mod;
}

/** Four people from the fixtures' birth data: Beatrice shares her own chart; William and Charles have their own. */
function seed(): Promise<void> {
  seeded ??= (async () => {
    const { db: pg, usersTable, profilesTable, reportsTable, relationshipsTable, relationshipParticipantsTable } = await db();
    const { readFileSync } = await import("node:fs");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const { chartFromFixture } = await import("./testFixtures.js");
    const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "charts");
    const person = (fx: string) => JSON.parse(readFileSync(join(fixtures, `${fx}.json`), "utf8"));
    const row = (profileId: string, fx: string, holder: Viewer, over: Record<string, unknown> = {}) => {
      const f = person(fx);
      return {
        id: profileId, sessionId: holder.sessionId, userId: holder.userId, name: f.name, birthDate: f.birthDate, birthTime: f.birthTime,
        birthPlace: "fixture", latitude: f.latitude, longitude: f.longitude, timezoneOffset: f.timezoneOffset,
        timezone: f.timezone ?? null, chartData: chartFromFixture(fx) as unknown as object, ...over,
      };
    };
    await pg.insert(usersTable).values([BEA, WILL, CHARLES, GEORGE].map((v) => ({ id: v.userId, email: `${v.userId}@example.com` })));
    await pg.insert(profilesTable).values([
      row(P.bea, "beatrice", BEA, { isSelf: true }),
      row(P.will, "william", WILL, { isSelf: true }),
      // Charles's own chart, written by Beatrice and sent to him: she reads it already as its writer.
      row(P.charles, "charles", BEA, { claimedByUserId: CHARLES.userId, claimedAsSelf: true }),
      row(P.charlotte, "charlotte", WILL),
    ]);
    const natal = (reportId: string, profileId: string, holder: Viewer, status = "complete") => ({
      id: reportId, profileId, sessionId: holder.sessionId, type: "natal", status, interpretation: {},
    });
    await pg.insert(reportsTable).values([
      natal(R.bea, P.bea, BEA),
      natal(R.beaWriting, P.bea, BEA, "interpreting"),
      natal(R.will, P.will, WILL),
      natal(R.charles, P.charles, BEA),
    ]);
    // William's pair with Beatrice, made from her shared chart and stored as a finished row.
    await pg.insert(relationshipsTable).values({ id: REL, sessionId: WILL.sessionId, userId: WILL.userId, type: "partners" });
    await pg.insert(relationshipParticipantsTable).values([
      { id: `${REL}-a`, relationshipId: REL, profileId: P.will, role: "primary", position: "0" },
      { id: `${REL}-b`, relationshipId: REL, profileId: P.bea, role: "secondary", position: "1" },
    ]);
    await pg.insert(reportsTable).values({
      id: R.pair, profileId: P.will, sessionId: WILL.sessionId, type: "compatibility", relationshipId: REL, status: "complete",
      interpretation: {}, computeData: { reportAId: R.will, reportBId: R.bea, lens: "partners" },
    });
  })();
  return seeded;
}

/** Every test starts with no grant, no share link and no gift, whatever the one before it left. */
async function fresh(): Promise<void> {
  await seed();
  const { db: pg, profileSharesTable, inviteTokensTable } = await db();
  const { inArray, or } = await import("drizzle-orm");
  const charts = Object.values(P);
  const people = [BEA, WILL, CHARLES, GEORGE].map((v) => v.userId as string);
  await pg.delete(profileSharesTable).where(inArray(profileSharesTable.profileId, charts));
  // A gift has no chart of its own, so it goes by its giver.
  await pg.delete(inviteTokensTable)
    .where(or(inArray(inviteTokensTable.profileId, charts), inArray(inviteTokensTable.createdByUserId, people)));
}

async function shareLink(over: Partial<{ tokenHash: string; email: string; createdAt: Date; expiresAt: Date; claimedAt: Date; claimedByUserId: string; revokedAt: Date; createdByUserId: string }> = {}) {
  const { db: pg, inviteTokensTable } = await db();
  const linkId = randomUUID();
  const now = Date.now();
  await pg.insert(inviteTokensTable).values({
    id: linkId, tokenHash: randomUUID(), email: `${CHARLES.userId}@example.com`, kind: "share", profileId: P.bea,
    createdByUserId: BEA.userId, createdBySessionId: BEA.sessionId, createdAt: new Date(now - 60_000),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000), ...over,
  });
  return linkId;
}

async function linkRow(linkId: string) {
  const { db: pg, inviteTokensTable } = await db();
  const { eq } = await import("drizzle-orm");
  const [row] = await pg.select().from(inviteTokensTable).where(eq(inviteTokensTable.id, linkId));
  return row;
}

async function grantTo(reader: Viewer, over: Partial<{ profileId: string; ownerUserId: string; inviteId: string | null }> = {}) {
  const { db: pg } = await db();
  return grantShare(pg, { profileId: P.bea, ownerUserId: BEA.userId, readerUserId: reader.userId as string, inviteId: null, ...over });
}

after(async () => {
  if (!SCRATCH || !seeded) return;
  const { db: pg, pool, usersTable, profilesTable, relationshipsTable } = await db();
  const { inArray } = await import("drizzle-orm");
  await fresh();
  await pg.delete(relationshipsTable).where(inArray(relationshipsTable.id, [REL]));
  await pg.delete(profilesTable).where(inArray(profilesTable.id, Object.values(P)));
  await pg.delete(usersTable).where(inArray(usersTable.id, [BEA, WILL, CHARLES, GEORGE].map((v) => v.userId as string)));
  await pool.end();
});

test("grant: one active grant per chart and reader, granted again it answers the same row; never to its sharer", { skip: NO_DB }, async () => {
  await fresh();
  const { db: pg, profileSharesTable } = await db();
  const { and, eq, isNull } = await import("drizzle-orm");
  const first = await grantTo(WILL);
  assert.equal(await grantTo(WILL), first);
  assert.equal(await pg.transaction((tx) => grantShare(tx, { profileId: P.bea, ownerUserId: BEA.userId, readerUserId: WILL.userId, inviteId: null })), first);
  const live = await pg.select().from(profileSharesTable)
    .where(and(eq(profileSharesTable.profileId, P.bea), eq(profileSharesTable.readerUserId, WILL.userId), isNull(profileSharesTable.revokedAt)));
  assert.equal(live.length, 1);
  await assert.rejects(grantTo(BEA));
  assert.notEqual(await grantTo(CHARLES), first);
});

test("read: a grant that stands reads; revoked, absent or for another reader, nothing; a session holds none", { skip: NO_DB }, async () => {
  await fresh();
  assert.equal((await sharedProfileIds(WILL.userId)).has(P.bea), false);
  const first = await grantTo(WILL);
  assert.equal((await sharedProfileIds(WILL.userId)).has(P.bea), true);
  assert.equal(await sharerOf(WILL.userId, P.bea), BEA.userId);
  assert.equal((await sharedProfileIds(CHARLES.userId)).has(P.bea), false);
  assert.equal(await sharerOf(CHARLES.userId, P.bea), null);
  assert.equal((await sharedProfileIds(null)).size, 0);

  assert.equal(await revokeShare(first, BEA.userId), true);
  assert.equal((await sharedProfileIds(WILL.userId)).has(P.bea), false);
  assert.equal(await sharerOf(WILL.userId, P.bea), null);

  const again = await grantTo(WILL);
  assert.notEqual(again, first);
  assert.equal((await sharedProfileIds(WILL.userId)).has(P.bea), true);
});

test("stop: a grant is its sharer's alone to revoke, at once; anyone else's stop leaves it standing", { skip: NO_DB }, async () => {
  await fresh();
  const shareId = await grantTo(WILL);
  assert.equal(await revokeShare(shareId, WILL.userId as string), false);
  assert.equal(await revokeShare(shareId, CHARLES.userId as string), false);
  assert.equal((await sharedProfileIds(WILL.userId)).has(P.bea), true);
  assert.equal(await revokeShare(shareId, BEA.userId as string), true);
  assert.equal(await revokeShare(shareId, BEA.userId as string), false);
  assert.equal(await revokeShare(randomUUID(), BEA.userId as string), false);
});

test("stands: a grant reads only while its sharer holds the chart as their own", { skip: NO_DB }, async () => {
  await fresh();
  const { db: pg, profilesTable } = await db();
  const { eq } = await import("drizzle-orm");
  await grantTo(WILL);
  await pg.update(profilesTable).set({ isSelf: false }).where(eq(profilesTable.id, P.bea));
  try {
    assert.equal((await sharedProfileIds(WILL.userId)).has(P.bea), false);
    assert.deepEqual(await sharesOf(BEA.userId as string), []);
    assert.equal(await shareBackOffered(WILL.userId as string, P.bea), false);
  } finally {
    await pg.update(profilesTable).set({ isSelf: true }).where(eq(profilesTable.id, P.bea));
  }
  assert.equal((await sharedProfileIds(WILL.userId)).has(P.bea), true);
});

test("list: each waiting link and each grant that stands, a claimed link once as its grant, oldest first", { skip: NO_DB }, async () => {
  await fresh();
  const now = Date.now();
  const waiting = await shareLink({ createdAt: new Date(now - 120_000) });
  await shareLink({ email: "expired@example.com", createdAt: new Date(now - 8 * 24 * 60 * 60 * 1000) });
  await shareLink({ email: "stale@example.com", expiresAt: new Date(now - 1000) });
  await shareLink({ email: "revoked@example.com", revokedAt: new Date(now - 1000) });
  await shareLink({ email: "theirs@example.com", createdByUserId: GEORGE.userId as string });
  const claimed = await shareLink({ email: "william.windsor@example.com", claimedAt: new Date(now - 30_000), claimedByUserId: WILL.userId as string });
  const fromLink = await grantTo(WILL, { inviteId: claimed });
  const back = await grantTo(GEORGE);

  const rows = await sharesOf(BEA.userId as string);
  // A grant made with no link, as Share yours back makes it, carries no address: its sharer was never given George's (R-3.6).
  assert.deepEqual(rows.map((r) => [r.id, r.state, r.email, r.readerUserId, r.profileId]), [
    [waiting, "waiting", `${CHARLES.userId}@example.com`, null, P.bea],
    [fromLink, "active", "william.windsor@example.com", WILL.userId, P.bea],
    [back, "active", "", GEORGE.userId, P.bea],
  ]);
  assert.equal(rows[1].sentAt.getTime(), (await linkRow(claimed)).createdAt.getTime());
  assert.deepEqual(await sharesOf(WILL.userId as string), []);
});

test("stop: a waiting link stops opening, and a grant's own link is revoked with it so it never grants again", { skip: NO_DB }, async () => {
  await fresh();
  const waiting = await shareLink();
  assert.equal(await revokeShare(waiting, CHARLES.userId as string), false);
  assert.equal(await revokeShare(waiting, BEA.userId as string), true);
  const link = await linkRow(waiting);
  assert.ok(link.revokedAt);
  assert.ok(link.expiresAt.getTime() <= Date.now());
  assert.deepEqual(await sharesOf(BEA.userId as string), []);

  const claimed = await shareLink({ claimedAt: new Date(), claimedByUserId: WILL.userId as string });
  const shareId = await grantTo(WILL, { inviteId: claimed });
  assert.equal(await revokeShare(claimed, BEA.userId as string), false);
  assert.equal((await sharedProfileIds(WILL.userId)).has(P.bea), true);
  assert.equal(await revokeShare(shareId, BEA.userId as string), true);
  assert.ok((await linkRow(claimed)).revokedAt);
  assert.equal((await sharedProfileIds(WILL.userId)).has(P.bea), false);
});

test("share back: offered while the reader's own report is finished and its sharer cannot read it yet (reading 4)", { skip: NO_DB }, async () => {
  await fresh();
  const { db: pg, reportsTable } = await db();
  const { eq } = await import("drizzle-orm");
  assert.equal(await shareBackOffered(WILL.userId as string, P.bea), false);
  const beasShare = await grantTo(WILL);
  assert.deepEqual(await ownChartOf(WILL.userId as string), { profileId: P.will, finished: true });
  assert.equal(await shareBackOffered(WILL.userId as string, P.bea), true);
  assert.equal(await shareBackOffered(CHARLES.userId as string, P.bea), false);

  await pg.update(reportsTable).set({ status: "interpreting" }).where(eq(reportsTable.id, R.will));
  try {
    assert.equal(await shareBackOffered(WILL.userId as string, P.bea), false);
  } finally {
    await pg.update(reportsTable).set({ status: "complete" }).where(eq(reportsTable.id, R.will));
  }

  const back = await grantTo(BEA, { profileId: P.will, ownerUserId: WILL.userId as string });
  assert.equal(await shareBackOffered(WILL.userId as string, P.bea), false);
  assert.equal(await revokeShare(back, WILL.userId as string), true);
  assert.equal(await shareBackOffered(WILL.userId as string, P.bea), true);
  assert.equal(await revokeShare(beasShare, BEA.userId as string), true);
  assert.equal(await shareBackOffered(WILL.userId as string, P.bea), false);
});

test("share back: never to a sharer who wrote the reader's chart and reads it already, nor with no own chart settled", { skip: NO_DB }, async () => {
  await fresh();
  await grantTo(CHARLES);
  assert.deepEqual(await ownChartOf(CHARLES.userId as string), { profileId: P.charles, finished: true });
  assert.equal(await shareBackOffered(CHARLES.userId as string, P.bea), false);
  assert.equal(await ownChartOf(GEORGE.userId as string), null);
  await grantTo(GEORGE);
  assert.equal(await shareBackOffered(GEORGE.userId as string, P.bea), false);
});

type Answered = {
  error?: string;
  participants?: Array<{ name: string }>;
  email?: string;
  readerName?: string | null;
  state?: string;
};

/** The compatibility, share and invite routes as app.ts mounts them, the session and Clerk middleware stood in by the viewer. */
async function asViewer<Body = Answered>(viewer: Viewer, method: "GET" | "POST" | "DELETE", path: string, body?: unknown) {
  const { default: express } = await import("express");
  const { default: compatibility } = await import("../routes/compatibility.js");
  const { default: shares } = await import("../routes/shares.js");
  const { default: invites } = await import("../routes/invites.js");
  const { logger } = await import("./logger.js");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = viewer.userId;
    req.sessionId = viewer.sessionId;
    req.log = logger;
    next();
  });
  app.use(compatibility);
  app.use(shares);
  app.use(invites);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  try {
    const res = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    // A 204 has no body to read.
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : {}) as Body };
  } finally {
    server.close();
  }
}

test("share back through the route: the share it answers, and the sharer's list, name the reader and never their address (R-3.6)", { skip: NO_DB }, async () => {
  await fresh();
  await grantTo(WILL);
  const back = await asViewer(WILL, "POST", "/shares/back", { profileId: P.bea });
  assert.equal(back.status, 201);
  assert.deepEqual([back.body.email, back.body.readerName, back.body.state], ["", "Beatrice", "active"]);
  const listed = await asViewer<Answered[]>(WILL, "GET", "/shares");
  assert.equal(listed.status, 200);
  assert.deepEqual(listed.body.map((s) => [s.email, s.readerName, s.state]), [["", "Beatrice", "active"]]);
});

test("picker: a chart shared with the reader is theirs to pair while the grant stands; revoked or absent, it is not", { skip: NO_DB }, async () => {
  await fresh();
  // Beatrice's second report is still being written, so a pick that reads both stops at not_ready and writes nothing.
  const pick = { reportAId: R.will, reportBId: R.beaWriting, lens: "partners" };
  assert.equal((await asViewer(WILL, "POST", "/compatibility", pick)).status, 404);
  const shareId = await grantTo(WILL);
  const read = await asViewer(WILL, "POST", "/compatibility", pick);
  assert.equal(read.status, 400);
  assert.equal(read.body.error, "not_ready");
  assert.equal((await asViewer(CHARLES, "POST", "/compatibility", { ...pick, reportAId: R.charles })).status, 404);
  assert.equal(await revokeShare(shareId, BEA.userId as string), true);
  assert.equal((await asViewer(WILL, "POST", "/compatibility", pick)).status, 404);
});

test("pair on a shared chart: it reads while the grant stands and closes once it goes; its sharer never reads it", { skip: NO_DB }, async () => {
  await fresh();
  const summary = `/compatibility/${R.pair}/summary`;
  assert.equal((await asViewer(WILL, "GET", summary)).status, 404);
  const shareId = await grantTo(WILL);
  const open = await asViewer(WILL, "GET", summary);
  assert.equal(open.status, 200);
  assert.deepEqual(open.body.participants?.map((p) => p.name), ["William Windsor", "Beatrice York"]);
  assert.equal((await asViewer(BEA, "GET", summary)).status, 404);
  assert.equal(await revokeShare(shareId, BEA.userId as string), true);
  assert.equal((await asViewer(WILL, "GET", summary)).status, 404);
});

/** A gift from Beatrice to William's address, its link as its email carries it; `giverShares` is her answer. */
async function giftTo(giverShares: boolean) {
  const { db: pg, inviteTokensTable } = await db();
  const { mintInviteToken } = await import("./inviteToken.js");
  const { token, tokenHash } = mintInviteToken();
  const giftId = randomUUID();
  await pg.insert(inviteTokensTable).values({
    id: giftId, tokenHash, email: `${WILL.userId}@example.com`, kind: "gift", profileId: null, recipientName: "William",
    createdByUserId: BEA.userId, createdBySessionId: BEA.sessionId, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    giverShares,
  });
  return { giftId, token };
}

const claimOf = (token: string) => `/invites/${encodeURIComponent(token)}/claim`;

/** Who reads whose own Personal report, as [Beatrice reads William's, William reads Beatrice's]. */
async function eachReads(): Promise<[boolean, boolean]> {
  return [(await sharedProfileIds(BEA.userId)).has(P.will), (await sharedProfileIds(WILL.userId)).has(P.bea)];
}

test("gift: the giver's Yes is a grant at the claim; the claimer's waits for their own report and becomes a grant once (reading 16)", { skip: NO_DB }, async () => {
  await fresh();
  const { db: pg, reportsTable, profileSharesTable } = await db();
  const { and, eq } = await import("drizzle-orm");
  const { giftId, token } = await giftTo(true);
  const preview = await asViewer<{ giverShares?: boolean; kind?: string }>(WILL, "GET", `/invites/${encodeURIComponent(token)}`);
  assert.deepEqual([preview.status, preview.body.kind, preview.body.giverShares], [200, "gift", true]);

  await pg.update(reportsTable).set({ status: "interpreting" }).where(eq(reportsTable.id, R.will));
  try {
    const claimed = await asViewer(WILL, "POST", claimOf(token), { shareBack: true });
    assert.equal(claimed.status, 200, JSON.stringify(claimed.body));
    assert.deepEqual(await eachReads(), [false, true], "Beatrice's Yes reads at once; William's report is still being written");
    assert.equal((await linkRow(giftId)).shareBack, true);
    assert.equal(await grantShareBacksOn(P.will), 0);
  } finally {
    await pg.update(reportsTable).set({ status: "complete" }).where(eq(reportsTable.id, R.will));
  }

  assert.equal(await grantShareBacksOn(P.will), 1);
  assert.deepEqual(await eachReads(), [true, true]);
  assert.equal((await linkRow(giftId)).shareBack, false);
  const [back] = await pg.select().from(profileSharesTable)
    .where(and(eq(profileSharesTable.profileId, P.will), eq(profileSharesTable.readerUserId, BEA.userId as string)));
  assert.deepEqual([back.ownerUserId, back.inviteId], [WILL.userId, giftId]);

  // Once written it is a grant like any other: Stop sharing ends it, and no later report writes it again (R-3.6).
  assert.equal(await revokeShare(back.id, WILL.userId as string), true);
  assert.equal(await grantShareBacksOn(P.will), 0);
  assert.equal(await grantShareBacks(WILL.userId as string), 0);
  assert.deepEqual(await eachReads(), [false, true]);
});

test("gift: Not now on both sides writes no grant, at the claim or once a report is finished (ADR-331)", { skip: NO_DB }, async () => {
  await fresh();
  const { giftId, token } = await giftTo(false);
  const preview = await asViewer<{ giverShares?: boolean }>(WILL, "GET", `/invites/${encodeURIComponent(token)}`);
  assert.equal(preview.body.giverShares, false);
  const claimed = await asViewer(WILL, "POST", claimOf(token), { shareBack: false });
  assert.equal(claimed.status, 200, JSON.stringify(claimed.body));
  assert.equal((await linkRow(giftId)).shareBack, false);
  assert.equal(await grantShareBacksOn(P.will), 0);
  assert.deepEqual(await eachReads(), [false, false]);
});

test("cancel and copy: a copied link claims as its email's does, and a cancelled link claims nothing by either (ADR-390)", { skip: NO_DB }, async () => {
  await fresh();
  const { mintInviteToken } = await import("./inviteToken.js");
  const tokenOf = (claimUrl: unknown) => new URL(String(claimUrl)).searchParams.get("token") ?? "";

  const email = mintInviteToken();
  const cancelled = await shareLink({ tokenHash: email.tokenHash });
  const copied = await asViewer<{ claimUrl?: string }>(BEA, "POST", `/invites/${cancelled}/link`);
  assert.equal(copied.status, 200, JSON.stringify(copied.body));
  assert.equal((await asViewer(CHARLES, "POST", `/invites/${cancelled}/link`)).status, 404, "only its sender copies it");
  assert.equal((await asViewer(CHARLES, "DELETE", `/invites/${cancelled}`)).status, 404, "only its sender cancels it");
  assert.equal((await asViewer(BEA, "DELETE", `/invites/${cancelled}`)).status, 204);
  for (const token of [email.token, tokenOf(copied.body.claimUrl)]) {
    assert.equal((await asViewer(CHARLES, "POST", claimOf(token))).status, 404);
  }
  assert.equal((await sharedProfileIds(CHARLES.userId)).has(P.bea), false);
  assert.equal((await asViewer(BEA, "DELETE", `/invites/${cancelled}`)).status, 404);
  assert.deepEqual(await sharesOf(BEA.userId as string), []);

  const kept = mintInviteToken();
  const waiting = await shareLink({ tokenHash: kept.tokenHash });
  const first = tokenOf((await asViewer<{ claimUrl?: string }>(BEA, "POST", `/invites/${waiting}/link`)).body.claimUrl);
  const second = tokenOf((await asViewer<{ claimUrl?: string }>(BEA, "POST", `/invites/${waiting}/link`)).body.claimUrl);
  // Only a hash is kept, so a new copy takes the place of the one before; the email's link keeps working.
  for (const [token, opens] of [[kept.token, 200], [second, 200], [first, 404]] as const) {
    assert.equal((await asViewer(CHARLES, "GET", `/invites/${encodeURIComponent(token)}`)).status, opens);
  }
  assert.equal((await asViewer(CHARLES, "POST", claimOf(first))).status, 404);
  const claimed = await asViewer<{ kind?: string }>(CHARLES, "POST", claimOf(second));
  assert.deepEqual([claimed.status, claimed.body.kind], [200, "share"]);
  assert.equal((await sharedProfileIds(CHARLES.userId)).has(P.bea), true);
  assert.equal((await asViewer(BEA, "DELETE", `/invites/${waiting}`)).status, 404, "a claimed link is no longer waiting");
});
