/**
 * Share my report (ADR-235): a grant lets one reader read its sharer's own
 * Personal report, through access.ts's `shared`, and nothing more. The grant
 * is its own row, so the chart stays its sharer's and nothing is handed over;
 * Stop sharing stamps it revoked, and only its sharer can.
 */
import { randomUUID } from "node:crypto";
import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { db, inviteTokensTable, profileSharesTable, profilesTable, reportsTable, type InviteToken } from "@workspace/db";
import { canReadProfile, isSelfFor, type ProfileHolders, type Viewer } from "./access.js";
import { logger } from "./logger.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
/** A transaction, or the pool for a grant that is the only write. */
type Writer = Pick<Tx, "select" | "insert" | "update">;

const DAY_MS = 24 * 60 * 60 * 1000;
// A share's link lives as a send's does (reading 3). Nothing sweeps old links, so every read applies it.
const LINK_LIFETIME_MS = 7 * DAY_MS;

// A report under a horizon pass keeps its text, so it counts as finished, as it does for a send.
const FINISHED_STATUSES = ["complete", "revising"];

export type ShareRow = {
  /** The grant once its link is claimed, the waiting link before: what Stop sharing takes. */
  id: string;
  profileId: string;
  state: "waiting" | "active";
  /**
   * The address the link went to. Empty for a grant made without one, as Share yours back makes it: the reader's own
   * address on file was never given to its sharer (R-3.6).
   */
  email: string;
  /** Null while the link waits. */
  readerUserId: string | null;
  sentAt: Date;
};

type Chart = ProfileHolders & { isSelf: boolean; claimedAsSelf: boolean };

const chartColumns = {
  id: profilesTable.id,
  userId: profilesTable.userId,
  sessionId: profilesTable.sessionId,
  claimedByUserId: profilesTable.claimedByUserId,
  isSelf: profilesTable.isSelf,
  claimedAsSelf: profilesTable.claimedAsSelf,
};

/** A signed-in account's standing never turns on a session, so none is given. */
function account(userId: string): Viewer {
  return { userId, sessionId: "" };
}

const unrevoked = (profileId: string, readerUserId: string) =>
  and(
    eq(profileSharesTable.profileId, profileId),
    eq(profileSharesTable.readerUserId, readerUserId),
    isNull(profileSharesTable.revokedAt),
  );

/**
 * The account's own chart, the only one it may share (reading 16). One another
 * account claimed is its subject's whatever mark its writer left on it, so only
 * the subject shares it (R-3.6); this says so here as well as in `isSelfFor`,
 * since a grant reads a whole report.
 */
function isOwnChart(userId: string, chart: Chart): boolean {
  if (chart.claimedByUserId && chart.claimedByUserId !== userId) return false;
  return isSelfFor(account(userId), chart);
}

/**
 * A grant reads only while its sharer still holds the chart as their own
 * (R-3.6): once Not me hands it back, they mark another chart as theirs, or
 * its subject claims a chart its writer shared as theirs, it is someone else's
 * chart, whose subject never shared it. A grant to its own sharer reads
 * nothing they could not already.
 */
export function grantStands(
  share: { ownerUserId: string; readerUserId: string | null; revokedAt: Date | null },
  chart: Chart,
): boolean {
  if (share.revokedAt || !share.ownerUserId || share.readerUserId === share.ownerUserId) return false;
  return isOwnChart(share.ownerUserId, chart);
}

/** The charts shared with this reader whose grants still stand; none for a session, which holds no grant. */
export async function sharedProfileIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await db
    .select({
      share: {
        ownerUserId: profileSharesTable.ownerUserId,
        readerUserId: profileSharesTable.readerUserId,
        revokedAt: profileSharesTable.revokedAt,
      },
      chart: chartColumns,
    })
    .from(profileSharesTable)
    .innerJoin(profilesTable, eq(profileSharesTable.profileId, profilesTable.id))
    .where(and(eq(profileSharesTable.readerUserId, userId), isNull(profileSharesTable.revokedAt)));
  return new Set(rows.filter((r) => grantStands(r.share, r.chart)).map((r) => r.chart.id));
}

/** Who shared this chart with the reader, while that grant stands. */
export async function sharerOf(readerUserId: string, profileId: string): Promise<string | null> {
  if (!readerUserId || !profileId) return null;
  const rows = await db
    .select({
      share: {
        ownerUserId: profileSharesTable.ownerUserId,
        readerUserId: profileSharesTable.readerUserId,
        revokedAt: profileSharesTable.revokedAt,
      },
      chart: chartColumns,
    })
    .from(profileSharesTable)
    .innerJoin(profilesTable, eq(profileSharesTable.profileId, profilesTable.id))
    .where(unrevoked(profileId, readerUserId))
    .limit(1);
  const row = rows[0];
  return row && grantStands(row.share, row.chart) ? row.share.ownerUserId : null;
}

async function ownChart(userId: string): Promise<{ chart: Chart & { id: string }; finished: boolean } | null> {
  if (!userId) return null;
  const marked = await db
    .select(chartColumns)
    .from(profilesTable)
    .where(
      or(
        and(eq(profilesTable.userId, userId), eq(profilesTable.isSelf, true)),
        and(eq(profilesTable.claimedByUserId, userId), eq(profilesTable.claimedAsSelf, true)),
      ),
    );
  const own = marked.filter((p) => isOwnChart(userId, p));
  if (own.length !== 1) return null;
  const [finished] = await db
    .select({ id: reportsTable.id })
    .from(reportsTable)
    .where(
      and(
        eq(reportsTable.profileId, own[0].id),
        eq(reportsTable.type, "natal"),
        inArray(reportsTable.status, FINISHED_STATUSES),
      ),
    )
    .limit(1);
  return { chart: own[0], finished: !!finished };
}

/**
 * The account's own chart, the one profile marked as theirs (reading 16), and
 * whether its Personal report is finished. Null when none is marked, or when
 * several are, since which one is theirs is not settled yet (home's `several`).
 * A chart its writer marked and its subject has claimed is never the writer's.
 */
export async function ownChartOf(userId: string): Promise<{ profileId: string; finished: boolean } | null> {
  const own = await ownChart(userId);
  return own ? { profileId: own.chart.id, finished: own.finished } : null;
}

/**
 * Everyone the sharer's own Personal report is shared with, for their quick
 * look's list, oldest first: each waiting link and each grant that stands.
 * A claimed link shows once, as its grant.
 */
export async function sharesOf(ownerUserId: string): Promise<ShareRow[]> {
  if (!ownerUserId) return [];
  const now = new Date();
  const [grants, links] = await Promise.all([
    db
      .select({
        id: profileSharesTable.id,
        ownerUserId: profileSharesTable.ownerUserId,
        readerUserId: profileSharesTable.readerUserId,
        revokedAt: profileSharesTable.revokedAt,
        createdAt: profileSharesTable.createdAt,
        linkEmail: inviteTokensTable.email,
        linkSentAt: inviteTokensTable.createdAt,
        chart: chartColumns,
      })
      .from(profileSharesTable)
      .innerJoin(profilesTable, eq(profileSharesTable.profileId, profilesTable.id))
      .leftJoin(inviteTokensTable, eq(profileSharesTable.inviteId, inviteTokensTable.id))
      .where(and(eq(profileSharesTable.ownerUserId, ownerUserId), isNull(profileSharesTable.revokedAt))),
    db
      .select({
        id: inviteTokensTable.id,
        email: inviteTokensTable.email,
        createdAt: inviteTokensTable.createdAt,
        chart: chartColumns,
      })
      .from(inviteTokensTable)
      .innerJoin(profilesTable, eq(inviteTokensTable.profileId, profilesTable.id))
      .where(
        and(
          eq(inviteTokensTable.kind, "share"),
          eq(inviteTokensTable.createdByUserId, ownerUserId),
          isNull(inviteTokensTable.claimedAt),
          isNull(inviteTokensTable.revokedAt),
          gt(inviteTokensTable.expiresAt, now),
          gt(inviteTokensTable.createdAt, new Date(now.getTime() - LINK_LIFETIME_MS)),
        ),
      ),
  ]);
  const waiting = links
    .filter((l) => grantStands({ ownerUserId, readerUserId: null, revokedAt: null }, l.chart))
    .map((l): ShareRow => ({
      id: l.id, profileId: l.chart.id, state: "waiting", email: l.email, readerUserId: null, sentAt: l.createdAt,
    }));
  const active = grants
    .filter((g) => grantStands(g, g.chart))
    .map((g): ShareRow => ({
      id: g.id,
      profileId: g.chart.id,
      state: "active",
      email: g.linkEmail ?? "",
      readerUserId: g.readerUserId,
      sentAt: g.linkSentAt ?? g.createdAt,
    }));
  return [...waiting, ...active].sort((x, y) => x.sentAt.getTime() - y.sentAt.getTime() || x.id.localeCompare(y.id));
}

/**
 * One active grant per chart and reader: granting it again answers the grant
 * that holds, so a retried claim, or Share yours back after a link that was
 * claimed, never doubles it. A held grant whose sharer has since given the
 * chart up reads nothing, so it gives way to the new one.
 */
export async function grantShare(
  tx: Writer,
  grant: { profileId: string; ownerUserId: string; readerUserId: string; inviteId: string | null },
): Promise<string> {
  const { profileId, ownerUserId, readerUserId, inviteId } = grant;
  if (!profileId || !ownerUserId || !readerUserId || ownerUserId === readerUserId) {
    throw new Error("A share is granted by one account to another");
  }
  const [held] = await tx
    .select({
      id: profileSharesTable.id,
      ownerUserId: profileSharesTable.ownerUserId,
      readerUserId: profileSharesTable.readerUserId,
      revokedAt: profileSharesTable.revokedAt,
      chart: chartColumns,
    })
    .from(profileSharesTable)
    .innerJoin(profilesTable, eq(profileSharesTable.profileId, profilesTable.id))
    .where(unrevoked(profileId, readerUserId))
    .limit(1);
  if (held) {
    if (held.ownerUserId === ownerUserId || grantStands(held, held.chart)) return held.id;
    await tx.update(profileSharesTable).set({ revokedAt: new Date() }).where(eq(profileSharesTable.id, held.id));
  }
  const [made] = await tx
    .insert(profileSharesTable)
    .values({ id: randomUUID(), profileId, ownerUserId, readerUserId, inviteId })
    .onConflictDoNothing()
    .returning({ id: profileSharesTable.id });
  if (made) return made.id;
  // A grant of the same chart to the same reader landed between the read and the insert; it is the one.
  const [raced] = await tx.select({ id: profileSharesTable.id }).from(profileSharesTable).where(unrevoked(profileId, readerUserId)).limit(1);
  if (!raced) throw new Error("A conflicting share grant could not be read back");
  return raced.id;
}

/**
 * Stop sharing (ADR-235), its sharer's alone and at once. A grant ends, and the
 * link that made it is revoked with it, so a claimed link never grants again;
 * a waiting link stops opening. False for anything that is not theirs to stop.
 */
export async function revokeShare(id: string, ownerUserId: string): Promise<boolean> {
  if (!id || !ownerUserId) return false;
  const now = new Date();
  return db.transaction(async (tx) => {
    const [grant] = await tx
      .update(profileSharesTable)
      .set({ revokedAt: now })
      .where(
        and(
          eq(profileSharesTable.id, id),
          eq(profileSharesTable.ownerUserId, ownerUserId),
          isNull(profileSharesTable.revokedAt),
        ),
      )
      .returning({ inviteId: profileSharesTable.inviteId });
    const linkId = grant ? grant.inviteId : id;
    if (!linkId) return !!grant;
    // Expired as well as revoked, as the pair's Stop sharing does, so a reader that checks only the expiry refuses it too.
    const links = await tx
      .update(inviteTokensTable)
      .set({ revokedAt: now, expiresAt: now })
      .where(
        and(
          eq(inviteTokensTable.id, linkId),
          eq(inviteTokensTable.kind, "share"),
          eq(inviteTokensTable.createdByUserId, ownerUserId),
          isNull(inviteTokensTable.revokedAt),
          grant ? undefined : isNull(inviteTokensTable.claimedAt),
        ),
      )
      .returning({ id: inviteTokensTable.id });
    return !!grant || links.length > 0;
  });
}

/**
 * Share yours back (reading 4): offered to the reader of a share that stands
 * while they have a finished Personal report of their own that its sharer
 * cannot already read, whether through a grant or as the chart's writer.
 */
export async function shareBackOffered(readerUserId: string, profileId: string): Promise<boolean> {
  const sharer = await sharerOf(readerUserId, profileId);
  if (!sharer) return false;
  const own = await ownChart(readerUserId);
  if (!own?.finished || canReadProfile(account(sharer), own.chart)) return false;
  return !(await sharedProfileIds(sharer)).has(own.chart.id);
}

/** A grant a gift's claim writes from one of its two answers; `inviteId` is the gift's, so Stop sharing ends it alike. */
export type GiftGrant = { profileId: string; ownerUserId: string; readerUserId: string; inviteId: string };

/**
 * What a gift's claim writes from its two answers (ADR-331, reading 16), read before the claim takes the link so that
 * its own transaction writes them. The giver's Yes is a grant of their own Personal report to the claimer. The
 * claimer's Yes is a grant of theirs to the giver once it is finished: now, when it already is, else kept on the gift
 * (`keepShareBack`) for `grantShareBacks`. Not now writes nothing, a grant to someone who reads the chart already is
 * none, and a gift claimed at its giver's own address has no one to share with.
 */
export async function giftAnswers(
  gift: Pick<InviteToken, "id" | "createdByUserId" | "giverShares">,
  claimerUserId: string,
  shareBack: boolean,
): Promise<{ grants: GiftGrant[]; keepShareBack: boolean }> {
  const giver = gift.createdByUserId;
  if (!giver || !claimerUserId || giver === claimerUserId) return { grants: [], keepShareBack: false };
  const grants: GiftGrant[] = [];
  if (gift.giverShares) {
    const theirs = await ownChart(giver);
    if (theirs && !canReadProfile(account(claimerUserId), theirs.chart)) {
      grants.push({ profileId: theirs.chart.id, ownerUserId: giver, readerUserId: claimerUserId, inviteId: gift.id });
    }
  }
  if (!shareBack) return { grants, keepShareBack: false };
  const own = await ownChart(claimerUserId);
  if (!own?.finished) return { grants, keepShareBack: true };
  if (!canReadProfile(account(giver), own.chart)) {
    grants.push({ profileId: own.chart.id, ownerUserId: claimerUserId, readerUserId: giver, inviteId: gift.id });
  }
  return { grants, keepShareBack: false };
}

/**
 * Whether a gift's claim would grant its giver's own Personal report (reading 16): their Yes, and a chart of their own
 * to grant, so the claim page never says they shared what no claim would grant.
 */
export async function giverSharesOn(gift: Pick<InviteToken, "kind" | "createdByUserId" | "giverShares">): Promise<boolean> {
  if (gift.kind !== "gift" || !gift.giverShares || !gift.createdByUserId) return false;
  return !!(await ownChart(gift.createdByUserId));
}

/** Each kept share back of this account, as a grant of its own Personal report once that is finished. */
async function writeShareBacks(userId: string): Promise<number> {
  const own = await ownChart(userId);
  if (!own?.finished) return 0;
  const kept = await db
    .select({ id: inviteTokensTable.id, giver: inviteTokensTable.createdByUserId })
    .from(inviteTokensTable)
    .where(
      and(
        eq(inviteTokensTable.kind, "gift"),
        eq(inviteTokensTable.claimedByUserId, userId),
        eq(inviteTokensTable.shareBack, true),
      ),
    );
  let granted = 0;
  for (const gift of kept) {
    const wrote = await db.transaction(async (tx) => {
      // Cleared in the grant's own transaction and only while still kept, so of two reports finishing together one
      // writes it, and once written no later report writes it again after a Stop sharing (R-3.6).
      const [taken] = await tx
        .update(inviteTokensTable)
        .set({ shareBack: false })
        .where(and(eq(inviteTokensTable.id, gift.id), eq(inviteTokensTable.shareBack, true)))
        .returning({ id: inviteTokensTable.id });
      const giver = gift.giver;
      if (!taken || !giver || giver === userId || canReadProfile(account(giver), own.chart)) return false;
      await grantShare(tx, { profileId: own.chart.id, ownerUserId: userId, readerUserId: giver, inviteId: gift.id });
      return true;
    });
    if (wrote) granted += 1;
  }
  return granted;
}

/**
 * A claimer's Yes kept at a gift's claim becomes their grant once their own Personal report is finished (reading 16):
 * called as a sent chart becomes its subject's. Never rejects, so the claim that called it stands, and a Yes not
 * written here waits for the next report of theirs to finish.
 */
export async function grantShareBacks(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    return await writeShareBacks(userId);
  } catch (err) {
    logger.warn({ err }, "a kept share back was not granted; the next finished report tries again");
    return 0;
  }
}

/** The same once a Personal report finishes, for whoever holds its chart; never rejects, so the report stays finished. */
export async function grantShareBacksOn(profileId: string): Promise<number> {
  if (!profileId) return 0;
  try {
    const [chart] = await db
      .select({ userId: profilesTable.userId, claimedByUserId: profilesTable.claimedByUserId })
      .from(profilesTable)
      .where(eq(profilesTable.id, profileId))
      .limit(1);
    let granted = 0;
    for (const holder of new Set([chart?.userId, chart?.claimedByUserId])) {
      if (holder) granted += await writeShareBacks(holder);
    }
    return granted;
  } catch (err) {
    logger.warn({ err, profileId }, "a kept share back was not granted; the next finished report tries again");
    return 0;
  }
}
