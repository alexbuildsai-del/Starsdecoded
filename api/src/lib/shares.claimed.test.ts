/**
 * A chart its subject claimed is theirs to share, never its writer's (R-3.6), whatever mark its writer left on it:
 * the sentinel's finding on R15. Whether a grant stands is pure and runs here with no database; the share routes and
 * the grant's reads run on a scratch Postgres when WALK_DATABASE_URL names a bootstrapped one, as shares.test.ts's do,
 * and skip, saying why, without it.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

const SCRATCH = process.env.WALK_DATABASE_URL;
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";
// A share's email and a first name are asked of Resend and Clerk; with no key, each refuses before it sends anything.
delete process.env.RESEND_API_KEY;
delete process.env.CLERK_SECRET_KEY;

const { grantShare, grantStands, ownChartOf, sharedProfileIds, sharerOf, sharesOf } = await import("./shares.js");

const WRITER = "user_writer";
const SUBJECT = "user_charlotte";
const READER = "user_noor";
/** Charlotte's chart as its writer wrote it and marked it as theirs; the tests move it through her claim. */
const chart = (over = {}) => ({
  userId: WRITER as string | null, sessionId: "s-writer", claimedByUserId: null as string | null,
  isSelf: true, claimedAsSelf: false, ...over,
});
const claimed = chart({ claimedByUserId: SUBJECT, claimedAsSelf: true });
const grant = (ownerUserId: string) => ({ ownerUserId, readerUserId: READER as string | null, revokedAt: null as Date | null });

test("stands: the writer's grant reads nothing once the chart's subject claims it, though the mark is still on it", () => {
  assert.equal(grantStands(grant(WRITER), chart()), true, "before the claim, their own chart");
  assert.equal(grantStands(grant(WRITER), claimed), false);
  assert.equal(grantStands({ ...grant(WRITER), readerUserId: null }, claimed), false, "nor a link of theirs still waiting");
  // After the subject's Stop sharing the row is hers, so the writer neither holds nor claimed it.
  assert.equal(grantStands(grant(WRITER), { ...claimed, userId: SUBJECT, isSelf: false }), false);
});

test("stands: the subject's own grant reads, before and after the hand-over, while she says it is her", () => {
  assert.equal(grantStands(grant(SUBJECT), claimed), true);
  assert.equal(grantStands(grant(SUBJECT), { ...claimed, userId: SUBJECT, isSelf: false }), true);
  assert.equal(grantStands(grant(SUBJECT), { ...claimed, claimedAsSelf: false }), false);
});

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the share routes run on a scratch Postgres";

type Viewer = { userId: string; sessionId: string };

/** Each run's own rows, so a second run, or the walk on the same database, finds nothing of the first. */
const run = randomUUID().slice(0, 8);
const id = (name: string) => `r15d1-${run}-${name}`;
const W: Viewer = { userId: id("u-writer"), sessionId: id("s-writer") };
const S: Viewer = { userId: id("u-charlotte"), sessionId: id("s-charlotte") };
const R: Viewer = { userId: id("u-noor"), sessionId: id("s-noor") };
const P = { charlotte: id("p-charlotte"), noor: id("p-noor") };

async function db() {
  return import("@workspace/db");
}

let seeded: Promise<void> | null = null;

/** Charlotte's chart, written by its writer, and Noor's own, each with a finished Personal report, from the fixtures' birth data. */
function seed(): Promise<void> {
  seeded ??= (async () => {
    const { db: pg, usersTable, profilesTable, reportsTable } = await db();
    const { readFileSync } = await import("node:fs");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const { chartFromFixture } = await import("./testFixtures.js");
    const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "charts");
    const row = (profileId: string, fx: string, holder: Viewer) => {
      const f = JSON.parse(readFileSync(join(fixtures, `${fx}.json`), "utf8"));
      return {
        id: profileId, sessionId: holder.sessionId, userId: holder.userId, name: f.name, birthDate: f.birthDate,
        birthTime: f.birthTime, birthPlace: "fixture", latitude: f.latitude, longitude: f.longitude,
        timezoneOffset: f.timezoneOffset, timezone: f.timezone ?? null, chartData: chartFromFixture(fx) as unknown as object,
      };
    };
    await pg.insert(usersTable).values([W, S, R].map((v) => ({ id: v.userId, email: `${v.userId}@example.com` })));
    await pg.insert(profilesTable).values([row(P.charlotte, "charlotte", W), { ...row(P.noor, "beatrice", R), isSelf: true }]);
    await pg.insert(reportsTable).values([
      { id: id("r-charlotte"), profileId: P.charlotte, sessionId: W.sessionId, type: "natal", status: "complete", interpretation: {} },
      { id: id("r-noor"), profileId: P.noor, sessionId: R.sessionId, type: "natal", status: "complete", interpretation: {} },
    ]);
  })();
  return seeded;
}

/** No grant and no link; Charlotte's chart unclaimed, or claimed by her, with the writer's mark on it either way. */
async function fresh(claim: boolean): Promise<void> {
  await seed();
  const { db: pg, profileSharesTable, inviteTokensTable, profilesTable } = await db();
  const { eq, inArray } = await import("drizzle-orm");
  const charts = Object.values(P);
  await pg.delete(profileSharesTable).where(inArray(profileSharesTable.profileId, charts));
  await pg.delete(inviteTokensTable).where(inArray(inviteTokensTable.profileId, charts));
  await pg.update(profilesTable)
    .set({ isSelf: true, claimedByUserId: claim ? S.userId : null, claimedAsSelf: claim })
    .where(eq(profilesTable.id, P.charlotte));
}

async function claimCharlotte(): Promise<void> {
  const { db: pg, profilesTable } = await db();
  const { eq } = await import("drizzle-orm");
  await pg.update(profilesTable).set({ claimedByUserId: S.userId, claimedAsSelf: true }).where(eq(profilesTable.id, P.charlotte));
}

after(async () => {
  if (!SCRATCH || !seeded) return;
  const { db: pg, pool, usersTable, profilesTable } = await db();
  const { inArray } = await import("drizzle-orm");
  await fresh(false);
  await pg.delete(profilesTable).where(inArray(profilesTable.id, Object.values(P)));
  await pg.delete(usersTable).where(inArray(usersTable.id, [W, S, R].map((v) => v.userId)));
  await pool.end();
});

/** The share routes as app.ts mounts them, the session and Clerk middleware stood in by the viewer. */
async function asViewer(viewer: Viewer, path: string, body: unknown) {
  const { default: express } = await import("express");
  const { default: shares } = await import("../routes/shares.js");
  const { logger } = await import("./logger.js");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = viewer.userId;
    req.sessionId = viewer.sessionId;
    req.log = logger;
    next();
  });
  app.use(shares);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  try {
    const res = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as { error?: string; id?: string } };
  } finally {
    server.close();
  }
}

async function liveGrants() {
  const { db: pg, profileSharesTable } = await db();
  const { and, eq, isNull } = await import("drizzle-orm");
  return pg.select({ id: profileSharesTable.id, ownerUserId: profileSharesTable.ownerUserId }).from(profileSharesTable)
    .where(and(eq(profileSharesTable.profileId, P.charlotte), eq(profileSharesTable.readerUserId, R.userId), isNull(profileSharesTable.revokedAt)));
}

test("a grant its writer made before the subject's claim reads no more once she claims it, and the mark left on it makes the chart theirs for nothing", { skip: NO_DB }, async () => {
  await fresh(false);
  const { db: pg } = await db();
  await grantShare(pg, { profileId: P.charlotte, ownerUserId: W.userId, readerUserId: R.userId, inviteId: null });
  assert.equal((await sharedProfileIds(R.userId)).has(P.charlotte), true, "their own chart, before the claim");
  assert.deepEqual(await ownChartOf(W.userId), { profileId: P.charlotte, finished: true });

  await claimCharlotte();
  assert.equal((await sharedProfileIds(R.userId)).has(P.charlotte), false);
  assert.equal(await sharerOf(R.userId, P.charlotte), null);
  assert.deepEqual(await sharesOf(W.userId), []);
  assert.equal(await ownChartOf(W.userId), null);
  assert.deepEqual(await ownChartOf(S.userId), { profileId: P.charlotte, finished: true });
});

test("the writer's share of a chart its subject claimed is refused, Share yours back too, even with is_self set: 409 no_own_report", { skip: NO_DB }, async () => {
  await fresh(true);
  const shared = await asViewer(W, "/shares", { email: "yusuf@example.com" });
  assert.deepEqual([shared.status, shared.body.error], [409, "no_own_report"]);

  // Noor shares her own report with the writer, who would answer with Charlotte's as theirs.
  const { db: pg } = await db();
  await grantShare(pg, { profileId: P.noor, ownerUserId: R.userId, readerUserId: W.userId, inviteId: null });
  const back = await asViewer(W, "/shares/back", { profileId: P.noor });
  assert.deepEqual([back.status, back.body.error], [409, "no_own_report"]);
  assert.deepEqual(await liveGrants(), []);
});

test("the subject's own share stands, and a grant its writer made before her claim gives way to hers", { skip: NO_DB }, async () => {
  await fresh(false);
  const { db: pg } = await db();
  const writers = await grantShare(pg, { profileId: P.charlotte, ownerUserId: W.userId, readerUserId: R.userId, inviteId: null });
  await claimCharlotte();

  const hers = await grantShare(pg, { profileId: P.charlotte, ownerUserId: S.userId, readerUserId: R.userId, inviteId: null });
  assert.notEqual(hers, writers);
  assert.deepEqual(await liveGrants(), [{ id: hers, ownerUserId: S.userId }]);
  assert.equal(await sharerOf(R.userId, P.charlotte), S.userId);
  assert.equal((await sharedProfileIds(R.userId)).has(P.charlotte), true);

  const shared = await asViewer(S, "/shares", { email: "yusuf@example.com" });
  assert.equal(shared.status, 201, JSON.stringify(shared.body));
});
