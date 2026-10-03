import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull, ne, or } from "drizzle-orm";
import {
  db,
  inviteTokensTable,
  profilesTable,
  relationshipParticipantsTable,
  relationshipsTable,
  reportsTable,
  usersTable,
  type InviteToken,
  type Profile,
  type RelationshipParticipant,
} from "@workspace/db";
import {
  ChangeInviteAddressBody,
  ChangeInviteAddressParams,
  CreateInviteBody,
  SendCompatibilityBody,
  SendCompatibilityParams,
  StopSharingCompatibilityParams,
} from "@workspace/api-zod";
import { mintInviteToken, verifyInviteToken } from "../lib/inviteToken.js";
import {
  isSelfFor,
  openInvitesByRelationship,
  ownsProfile,
  ownsRelationship,
  pairSendStateFor,
  viewerHasGrantOnRelationship,
  type Viewer,
} from "../lib/access.js";
import { firstNameOf, firstWord } from "../lib/names.js";
import { sendPairEmail, sendReportEmail } from "../lib/mailer.js";
import { moveHeldCredit } from "../lib/credits.js";
import { grantShare, grantStands, shareBackOffered, sharerOf } from "../lib/shares.js";
import { validationFailure } from "../lib/validation.js";
import { publicWebBase } from "../lib/waitlist.js";

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
// Reading 8: a send's link lives 7 days and a gift's 30 (ADR-123); a share's lives as a
// send's does (ADR-235). Nothing sweeps old links, so every read applies the lifetime itself.
const LIFETIME_MS = { send: 7 * DAY_MS, gift: 30 * DAY_MS } as const;

// A report under a horizon pass keeps its text, so it can be sent as a complete one can,
// the same line `sendStateFor` draws.
const FINISHED_STATUSES = ["complete", "revising"];

class Refusal extends Error {
  constructor(
    public readonly status: 404 | 409,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "Refusal";
  }
}

type PairSide = { rp: RelationshipParticipant; profile: Profile };

/** A claim's miss is read where the claim ran: on the pool, or on its own transaction's connection. */
type Reader = Pick<Parameters<Parameters<typeof db.transaction>[0]>[0], "select">;

type SendInvite = {
  id: string;
  token: string;
  email: string;
  profileId: string;
  relationshipId: string | null;
  expiresAt: string;
  claimUrl: string;
};

function viewerOf(req: Request): Viewer {
  return { userId: req.userId, sessionId: req.sessionId };
}

/** The stored date, capped at the kind's lifetime from the day the link went out, so no row outlives reading 8. */
function expiryOf(inv: Pick<InviteToken, "kind" | "createdAt" | "expiresAt">): Date {
  const lifetime = inv.kind === "gift" ? LIFETIME_MS.gift : LIFETIME_MS.send;
  return new Date(Math.min(inv.expiresAt.getTime(), inv.createdAt.getTime() + lifetime));
}

function claimUrlFor(token: string): string {
  return `${publicWebBase()}/claim?token=${encodeURIComponent(token)}`;
}

async function inviteByToken(raw: string): Promise<InviteToken | null> {
  const tokenHash = verifyInviteToken(raw);
  if (!tokenHash) return null;
  const [inv] = await db
    .select()
    .from(inviteTokensTable)
    .where(eq(inviteTokensTable.tokenHash, tokenHash))
    .limit(1);
  return inv ?? null;
}

/** The local copy first, then Clerk, for a user the local table has not caught yet. */
export async function emailOfUser(req: Request, userId: string): Promise<string | null> {
  const [u] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (u?.email) return u.email;
  try {
    const { clerkClient } = await import("@clerk/express");
    const cu = await clerkClient.users.getUser(userId);
    return cu.primaryEmailAddress?.emailAddress ?? cu.emailAddresses[0]?.emailAddress ?? null;
  } catch (err) {
    req.log.warn({ err }, "Could not resolve a user's email");
    return null;
  }
}

/** A name is a nicety on an email or the claim page; a failed lookup leaves it out rather than failing the send. */
export async function giverFirstName(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  return firstNameOf(userId).catch(() => null);
}

export async function finishedNatalId(profileId: string): Promise<string | null> {
  const [r] = await db
    .select({ id: reportsTable.id })
    .from(reportsTable)
    .where(
      and(
        eq(reportsTable.profileId, profileId),
        eq(reportsTable.type, "natal"),
        inArray(reportsTable.status, FINISHED_STATUSES),
      ),
    )
    .orderBy(desc(reportsTable.createdAt))
    .limit(1);
  return r?.id ?? null;
}

async function latestPairReportId(relationshipId: string): Promise<string | null> {
  const [r] = await db
    .select({ id: reportsTable.id })
    .from(reportsTable)
    .where(and(eq(reportsTable.relationshipId, relationshipId), eq(reportsTable.type, "compatibility")))
    .orderBy(desc(reportsTable.createdAt))
    .limit(1);
  return r?.id ?? null;
}

/** Only a maker who is exactly one of the pair's two can send it (ADR-133). */
function splitPair(maker: Viewer, sides: PairSide[]): { self: PairSide; other: PairSide } | null {
  if (sides.length !== 2) return null;
  const [a, b] = sides;
  const aIsSelf = isSelfFor(maker, a.profile);
  if (aIsSelf === isSelfFor(maker, b.profile)) return null;
  return aIsSelf ? { self: a, other: b } : { self: b, other: a };
}

async function pairSides(relationshipId: string): Promise<PairSide[]> {
  return db
    .select({ rp: relationshipParticipantsTable, profile: profilesTable })
    .from(relationshipParticipantsTable)
    .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
    .where(eq(relationshipParticipantsTable.relationshipId, relationshipId))
    .orderBy(asc(relationshipParticipantsTable.position));
}

async function loadPair(reportId: string) {
  const [report] = await db
    .select()
    .from(reportsTable)
    .where(and(eq(reportsTable.id, reportId), eq(reportsTable.type, "compatibility")))
    .limit(1);
  if (!report?.relationshipId) return null;
  const [relationship] = await db
    .select()
    .from(relationshipsTable)
    .where(eq(relationshipsTable.id, report.relationshipId))
    .limit(1);
  return relationship ? { report, relationship } : null;
}

/**
 * Checked again at the claim because links minted under the old rules attached any pair
 * holding the profile; such a link now hands over the chart alone (ADR-139).
 */
async function makerSendsPairTo(relationshipId: string, profileId: string): Promise<boolean> {
  const [rel] = await db
    .select()
    .from(relationshipsTable)
    .where(eq(relationshipsTable.id, relationshipId))
    .limit(1);
  if (!rel) return false;
  const split = splitPair({ userId: rel.userId, sessionId: rel.sessionId }, await pairSides(rel.id));
  return split?.other.profile.id === profileId;
}

/** A send hands its chart over at the claim and a share grants a reading of the sharer's own; both go by email and claim. */
export async function createInvite(
  req: Request,
  kind: "send" | "share",
  target: { email: string; profileId: string; relationshipId: string | null },
): Promise<SendInvite> {
  const { token, tokenHash } = mintInviteToken();
  const id = randomUUID();
  const email = target.email.trim().toLowerCase();
  const expiresAt = new Date(Date.now() + LIFETIME_MS.send);
  await db.insert(inviteTokensTable).values({
    id,
    tokenHash,
    email,
    kind,
    profileId: target.profileId,
    relationshipId: target.relationshipId,
    createdByUserId: req.userId ?? null,
    createdBySessionId: req.sessionId,
    expiresAt,
    emailDelivered: null,
  });
  return {
    id,
    token,
    email,
    profileId: target.profileId,
    relationshipId: target.relationshipId,
    expiresAt: expiresAt.toISOString(),
    claimUrl: claimUrlFor(token),
  };
}

/**
 * A giver keeps reading what they shared only through their account, and a session loses
 * a report once its subject claims it, so sharing needs an account (ADR-139, as `sendStateFor`
 * reads it).
 */
function signInToSend(res: Response) {
  return res.status(401).json({ error: "unauthorized", message: "Sign in to share a report." });
}

export async function recordDelivery(req: Request, inviteId: string, delivered: boolean): Promise<void> {
  await db
    .update(inviteTokensTable)
    .set({ emailDelivered: delivered })
    .where(eq(inviteTokensTable.id, inviteId));
  // The sender still has the copy link. The link stays out of the log, where a
  // token would outlive the email it was meant for.
  if (!delivered) req.log.warn({ inviteId }, "[invite-email] not delivered; the sender has the copy link");
}

// GET /invites?profileId=... — list active (unclaimed, unexpired) invites for a profile.
router.get("/invites", async (req, res) => {
  const profileId = req.query.profileId as string | undefined;
  if (!profileId) {
    return res.status(400).json({ error: "validation_error", message: "profileId query param is required" });
  }
  try {
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, profileId))
      .limit(1);
    if (!profile) {
      return res.status(404).json({ error: "not_found", message: "Profile not found" });
    }
    if (!ownsProfile(viewerOf(req), profile)) {
      return res.status(403).json({ error: "forbidden", message: "You do not own this profile" });
    }

    const rows = await db
      .select({
        id: inviteTokensTable.id,
        email: inviteTokensTable.email,
        profileId: inviteTokensTable.profileId,
        relationshipId: inviteTokensTable.relationshipId,
        sentAt: inviteTokensTable.createdAt,
        expiresAt: inviteTokensTable.expiresAt,
        emailDelivered: inviteTokensTable.emailDelivered,
        claimedAt: inviteTokensTable.claimedAt,
      })
      .from(inviteTokensTable)
      .where(
        and(
          eq(inviteTokensTable.profileId, profileId),
          // A share of the viewer's own report is listed by GET /shares with its Stop sharing; read
          // here, it would show on the row as a send waiting to hand the chart over.
          eq(inviteTokensTable.kind, "send"),
          isNull(inviteTokensTable.claimedAt),
          isNull(inviteTokensTable.revokedAt),
          gt(inviteTokensTable.expiresAt, new Date()),
        ),
      )
      .orderBy(inviteTokensTable.createdAt);

    return res.json(
      rows.map((r) => ({
        id: r.id,
        email: r.email,
        profileId,
        relationshipId: r.relationshipId ?? null,
        sentAt: r.sentAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
        emailDelivered: r.emailDelivered ?? null,
        claimedAt: r.claimedAt ? r.claimedAt.toISOString() : null,
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list invites");
    return res.status(500).json({ error: "internal_error", message: "Failed to list invites" });
  }
});

// POST /invites — Share with {name}: a finished Personal report goes to the person it is about (ADR-120, 181).
router.post("/invites", async (req, res) => {
  const parsed = CreateInviteBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(validationFailure(parsed.error));
  }
  const { profileId, relationshipId, email } = parsed.data;
  if (!req.userId) return signInToSend(res);
  // A pair reaches its other person only through its own Send, never on the back of a
  // natal one (ADR-139).
  if (relationshipId) {
    return res.status(400).json({
      error: "validation_error",
      message: "Share a Compatibility report from the report itself.",
    });
  }

  try {
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, profileId))
      .limit(1);
    if (!profile) {
      return res.status(404).json({ error: "not_found", message: "Profile not found" });
    }
    if (!ownsProfile(viewerOf(req), profile)) {
      return res.status(403).json({ error: "forbidden", message: "You do not own this profile" });
    }
    // The writer's mark counts only on a chart no one has claimed (`isSelfFor`); a claimed one hears so below.
    if (profile.isSelf && !profile.claimedByUserId) {
      return res.status(409).json({
        error: "own_chart",
        message: "This report is about you. You can share a report with the person it's about.",
      });
    }
    if (profile.claimedByUserId) {
      return res.status(409).json({
        error: "already_claimed",
        message: `${firstWord(profile.name)} already has this report.`,
      });
    }
    if (!(await finishedNatalId(profile.id))) {
      return res.status(409).json({
        error: "not_ready",
        message: "The report is still being written. Share it once it's ready.",
      });
    }

    const invite = await createInvite(req, "send", { email, profileId: profile.id, relationshipId: null });
    // A failed email still answers 201: the sender gets the copy link instead.
    const emailDelivered = await sendReportEmail({
      to: invite.email,
      giverFirstName: await giverFirstName(req.userId),
      personFirstName: firstWord(profile.name),
      claimUrl: invite.claimUrl,
    });
    await recordDelivery(req, invite.id, emailDelivered);
    return res.status(201).json({ ...invite, emailDelivered });
  } catch (err) {
    req.log.error({ err }, "Failed to create invite");
    return res.status(500).json({ error: "internal_error", message: "Failed to create invite" });
  }
});

// POST /compatibility/:id/send — Share with {B}; someone already joined reads it at once (MB-82).
// MB-103 provisional: a pair reaches the other of its two only when its maker, one of the
// two, sends it, and the send is the maker's consent to their own chart reaching that
// person (ADR-133, ADR-139).
router.post("/compatibility/:id/send", async (req, res) => {
  const params = SendCompatibilityParams.safeParse(req.params);
  if (!params.success) {
    return res.status(404).json({ error: "not_found", message: "Report not found" });
  }
  const body = SendCompatibilityBody.safeParse(req.body ?? {});
  if (!body.success) {
    return res.status(400).json({ error: "validation_error", message: "Check the email address and try again." });
  }
  if (!req.userId) return signInToSend(res);
  const viewer = viewerOf(req);

  try {
    const pair = await loadPair(params.data.id);
    if (!pair) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    if (!ownsRelationship(viewer, pair.relationship)) {
      // Someone it was sent to knows it exists, but it goes on only from its maker.
      if (await viewerHasGrantOnRelationship(viewer, pair.relationship.id)) {
        return res.status(403).json({
          error: "forbidden",
          message: "Only the person who had this report written can share it.",
        });
      }
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }

    const relationshipId = pair.relationship.id;
    const split = splitPair(viewer, await pairSides(relationshipId));
    // The same state the report list shows, so the route refuses exactly what the page does not offer.
    const send = split
      ? pairSendStateFor(
        viewer,
        split.self.profile.id,
        {
          profileId: split.other.profile.id,
          name: split.other.profile.name,
          claimedByUserId: split.other.profile.claimedByUserId,
          accessRole: split.other.rp.accessRole,
          relationshipId,
          // A chart shared with the maker is already its sharer's own, so no send may claim it from them (ADR-235).
          userId: split.other.profile.userId,
        },
        (await openInvitesByRelationship([relationshipId])).get(relationshipId) ?? null,
      )
      : null;
    if (!split || !send) {
      return res.status(403).json({
        error: "forbidden",
        message: "You can share a Compatibility report only when you're one of the two.",
      });
    }
    if (!FINISHED_STATUSES.includes(pair.report.status)) {
      return res.status(400).json({
        error: "not_ready",
        message: "The report is still being written. Share it once it's ready.",
      });
    }

    if (send.state === "joined") {
      return res.status(201).json({ state: "granted", invite: null });
    }
    const { self, other } = split;
    // The email is headed "{A} & {B}" like the report. The sender is one of the two, so
    // their own side of the pair names them when their account has no first name.
    const giver = (await giverFirstName(viewer.userId)) ?? firstWord(self.profile.name);
    const otherFirstName = firstWord(other.profile.name);
    const joinedUserId = other.profile.claimedByUserId;

    if (send.state === "can_grant" && joinedUserId) {
      await db
        .update(relationshipParticipantsTable)
        .set({ accessRole: "participant" })
        .where(eq(relationshipParticipantsTable.id, other.rp.id));
      const to = await emailOfUser(req, joinedUserId);
      const delivered = to
        ? await sendPairEmail({
          to,
          giverFirstName: giver,
          otherFirstName,
          url: `${publicWebBase()}/compatibility/${pair.report.id}`,
          granted: true,
        })
        : false;
      if (!delivered) req.log.warn({ reportId: pair.report.id }, "[pair-email] notice not delivered; access is granted");
      return res.status(201).json({ state: "granted", invite: null });
    }

    if (!body.data.email) {
      return res.status(400).json({
        error: "validation_error",
        message: `Add ${send.firstName}'s email to share it.`,
      });
    }
    const invite = await createInvite(req, "send", {
      email: body.data.email,
      profileId: other.profile.id,
      relationshipId,
    });
    const emailDelivered = await sendPairEmail({
      to: invite.email,
      giverFirstName: giver,
      otherFirstName,
      url: invite.claimUrl,
      granted: false,
    });
    await recordDelivery(req, invite.id, emailDelivered);
    return res.status(201).json({ state: "invited", invite: { ...invite, emailDelivered } });
  } catch (err) {
    req.log.error({ err }, "Failed to send compatibility report");
    return res.status(500).json({ error: "internal_error", message: "Failed to share the report" });
  }
});

// POST /compatibility/:id/stop-sharing — the sender's Stop sharing.
// MB-103 provisional: it ends the other's reading at once and deletes nothing (ADR-139).
router.post("/compatibility/:id/stop-sharing", async (req, res) => {
  const params = StopSharingCompatibilityParams.safeParse(req.params);
  if (!params.success) {
    return res.status(404).json({ error: "not_found", message: "Report not found" });
  }
  try {
    const pair = await loadPair(params.data.id);
    // Only a pair's maker ever sends it, so only its maker can stop; to anyone else it
    // does not exist.
    if (!pair || !ownsRelationship(viewerOf(req), pair.relationship)) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(relationshipParticipantsTable)
        .set({ accessRole: "owner" })
        .where(
          and(
            eq(relationshipParticipantsTable.relationshipId, pair.relationship.id),
            eq(relationshipParticipantsTable.accessRole, "participant"),
          ),
        );
      // Expired as well as revoked: the older token readers check only the expiry, and
      // a link still waiting must stop working now too.
      await tx
        .update(inviteTokensTable)
        .set({ revokedAt: now, expiresAt: now })
        .where(
          and(
            eq(inviteTokensTable.relationshipId, pair.relationship.id),
            isNull(inviteTokensTable.claimedAt),
            isNull(inviteTokensTable.revokedAt),
          ),
        );
    });
    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to stop sharing compatibility report");
    return res.status(500).json({ error: "internal_error", message: "Failed to stop sharing" });
  }
});

/**
 * A share's link opens only while what it offers still stands, read as its grant is read:
 * waiting, while the chart is still its sharer's own; claimed, while the grant reads. Once the
 * sharer stops sharing, or the chart is no longer theirs, it answers as a revoked link does
 * (ADR-235, reading 5; R-3.6).
 */
async function openShare(inv: InviteToken): Promise<Profile | null> {
  if (!inv.profileId || !inv.createdByUserId) return null;
  const [chart] = await db.select().from(profilesTable).where(eq(profilesTable.id, inv.profileId)).limit(1);
  if (!chart) return null;
  const stands = inv.claimedAt
    ? !!inv.claimedByUserId && (await sharerOf(inv.claimedByUserId, chart.id)) === inv.createdByUserId
    : grantStands({ ownerUserId: inv.createdByUserId, readerUserId: null, revokedAt: null }, chart);
  return stands ? chart : null;
}

/**
 * The page is public, so the sharer is named by the first name alone, never by the full name
 * their chart carries, and nothing of a pair or a gift rides along (ADR-135, ADR-235).
 */
async function sharePreview(token: string, inv: InviteToken, chart: Profile, expiresAt: Date) {
  const firstName = (await giverFirstName(inv.createdByUserId)) ?? (firstWord(chart.name) || null);
  return {
    token,
    email: inv.email,
    inviterName: firstName,
    profileName: firstName,
    relationshipId: null,
    relationshipReportId: null,
    expiresAt: expiresAt.toISOString(),
    alreadyClaimed: !!inv.claimedAt,
    kind: "share" as const,
    recipientName: null,
    note: null,
  };
}

// GET /invites/:token — public preview used by the claim landing page.
router.get("/invites/:token", async (req, res) => {
  try {
    const inv = await inviteByToken(req.params.token);
    if (!inv || inv.revokedAt) {
      return res.status(404).json({ error: "not_found", message: "Invite not found" });
    }
    const expiresAt = expiryOf(inv);
    if (expiresAt.getTime() < Date.now()) {
      return res.status(404).json({ error: "expired", message: "This invite has expired" });
    }
    if (inv.kind === "share") {
      const chart = await openShare(inv);
      if (!chart) return res.status(404).json({ error: "not_found", message: "Invite not found" });
      return res.json(await sharePreview(req.params.token, inv, chart, expiresAt));
    }

    const gift = inv.kind === "gift";
    const [profile] = !gift && inv.profileId
      ? await db
        .select({ name: profilesTable.name })
        .from(profilesTable)
        .where(eq(profilesTable.id, inv.profileId))
        .limit(1)
      : [];
    const pairId = gift ? null : inv.relationshipId;

    return res.json({
      token: req.params.token,
      email: inv.email,
      // The page is public: the giver is named by first name, never by address (ADR-135, MB-85).
      inviterName: await giverFirstName(inv.createdByUserId),
      profileName: profile?.name ?? null,
      relationshipId: pairId,
      relationshipReportId: pairId ? await latestPairReportId(pairId) : null,
      expiresAt: expiresAt.toISOString(),
      alreadyClaimed: !!inv.claimedAt,
      kind: gift ? "gift" : "send",
      recipientName: gift ? inv.recipientName : null,
      note: gift ? inv.note : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load invite");
    return res.status(500).json({ error: "internal_error", message: "Failed to load invite" });
  }
});

/**
 * A claim takes only the link it read and whose address it checked, never the row as it stands by then: Change
 * address gives the row a new link and address, and a gift's reminder a new link, between the two (ADR-237).
 */
function asRead(inv: InviteToken) {
  return [eq(inviteTokensTable.tokenHash, inv.tokenHash), eq(inviteTokensTable.email, inv.email)];
}

/**
 * Why a claim found no link to take. Taken since by a racing claim of the same link, it keeps its 409; changed,
 * stopped or run out since, the link it read no longer opens, so it answers as a revoked link does.
 */
async function missedClaim(reader: Reader, inv: InviteToken): Promise<Refusal> {
  const [row] = await reader
    .select({
      tokenHash: inviteTokensTable.tokenHash,
      email: inviteTokensTable.email,
      claimedAt: inviteTokensTable.claimedAt,
      revokedAt: inviteTokensTable.revokedAt,
    })
    .from(inviteTokensTable)
    .where(eq(inviteTokensTable.id, inv.id))
    .limit(1);
  const takenAsRead = !!row?.claimedAt && !row.revokedAt && row.tokenHash === inv.tokenHash && row.email === inv.email;
  return takenAsRead
    ? new Refusal(409, "already_claimed", "Invite already claimed")
    : new Refusal(404, "not_found", "Invite not found");
}

/**
 * A gift is a credit, not a report: its claim moves the held credit into the
 * claimer's balance and links no one to anyone (ADR-139).
 */
async function claimGift(inv: InviteToken, userId: string) {
  if (!inv.claimedAt) {
    const now = new Date();
    const consumed = await db
      .update(inviteTokensTable)
      .set({ claimedAt: now, claimedByUserId: userId })
      .where(
        and(
          eq(inviteTokensTable.id, inv.id),
          ...asRead(inv),
          isNull(inviteTokensTable.claimedAt),
          isNull(inviteTokensTable.revokedAt),
          gt(inviteTokensTable.expiresAt, now),
        ),
      )
      .returning({ id: inviteTokensTable.id });
    if (!consumed.length) throw await missedClaim(db, inv);
  }
  // Idempotent, so the claimer's retry finishes a move that failed after the token was taken.
  await moveHeldCredit(inv.id, userId);
  return {
    profileId: null,
    relationshipId: null,
    relationshipReportId: null,
    redirectTo: "/dashboard",
    kind: "gift" as const,
    askSelf: false,
  };
}

/** A claim lands on the pair it granted, else the subject's report; it never writes one (ADR-45, MB-58). */
async function sendClaimBody(profileId: string, pairId: string | null, askSelf: boolean) {
  const relationshipReportId = pairId ? await latestPairReportId(pairId) : null;
  const ownReportId = await finishedNatalId(profileId);
  const redirectTo = relationshipReportId
    ? `/compatibility/${relationshipReportId}`
    : ownReportId ? `/report/${ownReportId}` : "/dashboard";
  return { profileId, relationshipId: pairId, relationshipReportId, redirectTo, kind: "send" as const, askSelf };
}

/**
 * A sent report becomes its subject's: theirs at once, or "Is this you?" first when
 * they already have a chart of their own (ADR-120, MB-81).
 */
async function claimSend(req: Request, inv: InviteToken, userId: string) {
  const profileId = inv.profileId;
  if (!profileId) throw new Refusal(404, "not_found", "Invite not found");

  if (inv.claimedAt) {
    // Their earlier claim already answered "Is this you?", and the pair's sender may have stopped sharing since.
    const pairId = inv.relationshipId && (await viewerHasGrantOnRelationship(viewerOf(req), inv.relationshipId))
      ? inv.relationshipId
      : null;
    return sendClaimBody(profileId, pairId, false);
  }

  // MB-103 provisional: the claim grants the pair only as its maker, one of the two, sent it.
  const pairId = inv.relationshipId && (await makerSendsPairTo(inv.relationshipId, profileId))
    ? inv.relationshipId
    : null;
  const now = new Date();
  let askSelf = false;
  // One transaction, each step conditional on the row still being free, so two
  // racing claims have one deterministic loser and a half-claim never lands.
  await db.transaction(async (tx) => {
    const fresh = await tx
      .update(profilesTable)
      .set({ claimedByUserId: userId, updatedAt: now })
      .where(and(eq(profilesTable.id, profileId), isNull(profilesTable.claimedByUserId)))
      .returning({ id: profilesTable.id });
    if (fresh.length) {
      // Their own chart as `isSelfFor` reads it: a mark they left on a chart someone else claimed is not one.
      const [ownChart] = await tx
        .select({ id: profilesTable.id })
        .from(profilesTable)
        .where(
          and(
            ne(profilesTable.id, profileId),
            or(
              and(eq(profilesTable.userId, userId), eq(profilesTable.isSelf, true), isNull(profilesTable.claimedByUserId)),
              and(eq(profilesTable.claimedByUserId, userId), eq(profilesTable.claimedAsSelf, true)),
            ),
          ),
        )
        .limit(1);
      askSelf = !!ownChart;
      if (!askSelf) {
        await tx
          .update(profilesTable)
          .set({ claimedAsSelf: true, updatedAt: now })
          .where(eq(profilesTable.id, profileId));
      }
    } else {
      const [alreadyTheirs] = await tx
        .select({ id: profilesTable.id })
        .from(profilesTable)
        .where(and(eq(profilesTable.id, profileId), eq(profilesTable.claimedByUserId, userId)))
        .limit(1);
      if (!alreadyTheirs) throw new Refusal(409, "already_claimed", "Profile already claimed by someone else");
    }

    if (pairId) {
      await tx
        .update(relationshipParticipantsTable)
        .set({ accessRole: "participant" })
        .where(
          and(
            eq(relationshipParticipantsTable.relationshipId, pairId),
            eq(relationshipParticipantsTable.profileId, profileId),
          ),
        );
    }

    const consumed = await tx
      .update(inviteTokensTable)
      .set({ claimedAt: now, claimedByUserId: userId })
      .where(
        and(
          eq(inviteTokensTable.id, inv.id),
          ...asRead(inv),
          isNull(inviteTokensTable.claimedAt),
          isNull(inviteTokensTable.revokedAt),
        ),
      )
      .returning({ id: inviteTokensTable.id });
    if (!consumed.length) throw await missedClaim(tx, inv);
  });

  return sendClaimBody(profileId, pairId, askSelf);
}

/** A share lands on the dashboard, the sharer now in the reader's circle, with Share yours back when it is offered. */
function shareClaimBody(profileId: string, shareBack: boolean) {
  return {
    profileId,
    relationshipId: null,
    relationshipReportId: null,
    redirectTo: "/dashboard",
    kind: "share" as const,
    askSelf: false,
    shareBack,
  };
}

/**
 * A share's claim writes a grant to read the sharer's own Personal report and hands nothing
 * over: the profile stays the sharer's, so their Stop sharing ends the reading at once (ADR-235,
 * reading 3).
 */
async function claimShare(inv: InviteToken, userId: string) {
  const sharerId = inv.createdByUserId;
  if (sharerId === userId) throw new Refusal(409, "own_chart", "This is your own Personal report.");
  const chart = await openShare(inv);
  if (!chart || !sharerId) throw new Refusal(404, "not_found", "Invite not found");
  const profileId = chart.id;
  // A repeat claim by its reader writes nothing more; `openShare` has just read that its grant stands.
  if (inv.claimedAt) return shareClaimBody(profileId, await shareBackOffered(userId, profileId));

  const now = new Date();
  // The link is taken and the grant written together, so a link is never spent without the reading it promised.
  await db.transaction(async (tx) => {
    const consumed = await tx
      .update(inviteTokensTable)
      .set({ claimedAt: now, claimedByUserId: userId })
      .where(
        and(
          eq(inviteTokensTable.id, inv.id),
          isNull(inviteTokensTable.claimedAt),
          isNull(inviteTokensTable.revokedAt),
          gt(inviteTokensTable.expiresAt, now),
        ),
      )
      .returning({ id: inviteTokensTable.id });
    if (!consumed.length) throw new Refusal(409, "already_claimed", "Invite already claimed");
    await grantShare(tx, { profileId, ownerUserId: sharerId, readerUserId: userId, inviteId: inv.id });
  });
  return shareClaimBody(profileId, await shareBackOffered(userId, profileId));
}

// POST /invites/:token/claim — Clerk-authenticated claim, of a send, a share or a gift.
router.post("/invites/:token/claim", async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "unauthorized", message: "Sign in to claim this invite" });
  }
  try {
    const inv = await inviteByToken(req.params.token);
    if (!inv || inv.revokedAt) {
      return res.status(404).json({ error: "not_found", message: "Invite not found" });
    }
    if (expiryOf(inv).getTime() < Date.now()) {
      return res.status(404).json({ error: "expired", message: "This invite has expired" });
    }

    // The link alone never claims, for a send and a gift alike: the signed-in address
    // must be the one it was sent to.
    const viewerEmail = await emailOfUser(req, userId);
    if (!viewerEmail || viewerEmail.trim().toLowerCase() !== inv.email.trim().toLowerCase()) {
      return res.status(403).json({
        error: "wrong_recipient",
        message: "This invite was sent to a different email address",
      });
    }
    if (inv.claimedAt && inv.claimedByUserId !== userId) {
      return res.status(409).json({ error: "already_claimed", message: "Invite already claimed" });
    }

    if (inv.kind === "gift") return res.json(await claimGift(inv, userId));
    if (inv.kind === "share") return res.json(await claimShare(inv, userId));
    return res.json(await claimSend(req, inv, userId));
  } catch (err) {
    if (err instanceof Refusal) {
      return res.status(err.status).json({ error: err.code, message: err.message });
    }
    req.log.error({ err }, "Failed to claim invite");
    return res.status(500).json({ error: "internal_error", message: "Failed to claim invite" });
  }
});

export const CHANGE_ADDRESS_LINES = {
  invalid: "Check the email address and try again.",
  sameAddress: "That's the address the link already went to. Add the new one.",
  notFound: "We couldn't find that link.",
  claimed: "This report was already claimed, so its address can't change.",
  expired: "This link has expired. Share the report again for a new one.",
  raced: "The address just changed. Check it before you change it again.",
  failed: "We couldn't change the address. Try again in a few minutes.",
} as const;

/** Why a send's address can no longer change: its link was claimed, or it stopped working (ADR-237, reading 7). */
export function sendChangeRefusal(
  inv: Pick<InviteToken, "kind" | "claimedAt" | "revokedAt" | "createdAt" | "expiresAt">,
  now: Date,
): string | null {
  if (inv.claimedAt) return CHANGE_ADDRESS_LINES.claimed;
  if (inv.revokedAt || expiryOf(inv).getTime() <= now.getTime()) return CHANGE_ADDRESS_LINES.expired;
  return null;
}

/** Only its sender can change a send's address; to anyone else, signed out included, it does not exist. */
async function ownSend(userId: string, id: string): Promise<InviteToken | null> {
  const [row] = await db
    .select()
    .from(inviteTokensTable)
    .where(
      and(
        eq(inviteTokensTable.id, id),
        eq(inviteTokensTable.kind, "send"),
        eq(inviteTokensTable.createdByUserId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** The email the send first carried, now to its new address: the person at it never saw the first one. */
async function resendEmail(req: Request, inv: InviteToken, to: string, claimUrl: string): Promise<boolean> {
  const [profile] = inv.profileId
    ? await db
      .select({ name: profilesTable.name })
      .from(profilesTable)
      .where(eq(profilesTable.id, inv.profileId))
      .limit(1)
    : [];
  const personFirstName = firstWord(profile?.name ?? "");
  const giver = await giverFirstName(req.userId);
  if (!inv.relationshipId) {
    return sendReportEmail({ to, giverFirstName: giver, personFirstName, claimUrl });
  }
  const split = splitPair(viewerOf(req), await pairSides(inv.relationshipId));
  return sendPairEmail({
    to,
    giverFirstName: giver ?? (split ? firstWord(split.self.profile.name) : null),
    otherFirstName: personFirstName || null,
    url: claimUrl,
    granted: false,
  });
}

// POST /invites/:id/change-address — Change address on a waiting send (ADR-237, MB-109).
router.post("/invites/:id/change-address", async (req, res) => {
  const userId = req.userId;
  const params = ChangeInviteAddressParams.safeParse(req.params);
  if (!userId || !params.success) {
    return res.status(404).json({ error: "not_found", message: CHANGE_ADDRESS_LINES.notFound });
  }
  const body = ChangeInviteAddressBody.safeParse(req.body ?? {});
  if (!body.success) {
    return res.status(400).json({ error: "validation_error", message: CHANGE_ADDRESS_LINES.invalid });
  }

  try {
    const inv = await ownSend(userId, params.data.id);
    if (!inv?.profileId) return res.status(404).json({ error: "not_found", message: CHANGE_ADDRESS_LINES.notFound });
    const profileId = inv.profileId;
    const now = new Date();
    const refusal = sendChangeRefusal(inv, now);
    if (refusal) return res.status(409).json({ error: "not_waiting", message: refusal });
    const email = body.data.email.trim().toLowerCase();
    if (email === inv.email.trim().toLowerCase()) {
      return res.status(400).json({ error: "validation_error", message: CHANGE_ADDRESS_LINES.sameAddress });
    }

    // Only a token's hash is stored, so the swap is the revocation: from this statement on the
    // old link finds no invite and answers as a revoked one does, and the link the new address
    // gets lives the full week its email promises. It is guarded on the old hash, so a claim or
    // a second change racing this one leaves one winner.
    const { token, tokenHash } = mintInviteToken();
    const expiresAt = new Date(now.getTime() + LIFETIME_MS.send);
    const [changed] = await db
      .update(inviteTokensTable)
      .set({ tokenHash, email, createdAt: now, expiresAt, emailDelivered: null })
      .where(
        and(
          eq(inviteTokensTable.id, inv.id),
          eq(inviteTokensTable.tokenHash, inv.tokenHash),
          isNull(inviteTokensTable.claimedAt),
          isNull(inviteTokensTable.revokedAt),
          gt(inviteTokensTable.expiresAt, now),
        ),
      )
      .returning();
    if (!changed) {
      const after = await ownSend(userId, inv.id);
      if (!after) return res.status(404).json({ error: "not_found", message: CHANGE_ADDRESS_LINES.notFound });
      return res.status(409).json({
        error: "not_waiting",
        message: sendChangeRefusal(after, new Date()) ?? CHANGE_ADDRESS_LINES.raced,
      });
    }

    const claimUrl = claimUrlFor(token);
    // A failed email still answers 200, as a first send does: the sender has the copy link, and
    // the old address keeps nothing it could open.
    const emailDelivered = await resendEmail(req, changed, email, claimUrl);
    await recordDelivery(req, changed.id, emailDelivered);
    return res.json({
      id: changed.id,
      token,
      email,
      profileId,
      relationshipId: changed.relationshipId ?? null,
      expiresAt: expiresAt.toISOString(),
      claimUrl,
      emailDelivered,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to change an invite's address");
    return res.status(500).json({ error: "internal_error", message: CHANGE_ADDRESS_LINES.failed });
  }
});

export default router;
