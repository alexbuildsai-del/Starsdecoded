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

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
// Reading 8: a send's link lives 7 days and a gift's 30 (ADR-123). Nothing sweeps old
// links, so every read applies the lifetime itself.
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

function publicBaseUrl(req: Request): string {
  const fwdHost = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim();
  const host = fwdHost ?? req.headers.host;
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim()
    ?? "https";
  if (host) return `${proto}://${host}`;
  // Invite links must point at the web app (Vercel), which is a different
  // origin from this API (Railway), so the configured public URL wins
  // whenever the request carries no host headers.
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "http://localhost:5173";
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
async function emailOfUser(req: Request, userId: string): Promise<string | null> {
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
async function giverFirstName(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  return firstNameOf(userId).catch(() => null);
}

async function finishedNatalId(profileId: string): Promise<string | null> {
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

async function createSendInvite(
  req: Request,
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
    kind: "send",
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
    claimUrl: `${publicBaseUrl(req)}/claim?token=${encodeURIComponent(token)}`,
  };
}

/**
 * A giver keeps reading what they sent only through their account, and a session loses
 * a report once its subject claims it, so Send needs an account (ADR-139, as `sendStateFor`
 * reads it).
 */
function signInToSend(res: Response) {
  return res.status(401).json({ error: "unauthorized", message: "Sign in to send a report." });
}

async function recordDelivery(req: Request, inviteId: string, delivered: boolean): Promise<void> {
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

// POST /invites — Send to {name}: a finished Personal natal report goes to the person it is about (ADR-120).
router.post("/invites", async (req, res) => {
  const parsed = CreateInviteBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: parsed.error.message });
  }
  const { profileId, relationshipId, email } = parsed.data;
  if (!req.userId) return signInToSend(res);
  // A pair reaches its other person only through its own Send, never on the back of a
  // natal one (ADR-139).
  if (relationshipId) {
    return res.status(400).json({
      error: "validation_error",
      message: "Send a Compatibility report from the report itself.",
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
    if (profile.isSelf) {
      return res.status(409).json({
        error: "own_chart",
        message: "This report is about you. Send goes to the person a report is about.",
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
        message: "The report is still being written. Send it once it's ready.",
      });
    }

    const invite = await createSendInvite(req, { email, profileId: profile.id, relationshipId: null });
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

// POST /compatibility/:id/send — Send to {B}; someone already joined reads it at once (MB-82).
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
          message: "Only the person who had this report written can send it.",
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
        },
        (await openInvitesByRelationship([relationshipId])).get(relationshipId) ?? null,
      )
      : null;
    if (!split || !send) {
      return res.status(403).json({
        error: "forbidden",
        message: "You can send a Compatibility report only when you're one of the two.",
      });
    }
    if (!FINISHED_STATUSES.includes(pair.report.status)) {
      return res.status(400).json({
        error: "not_ready",
        message: "The report is still being written. Send it once it's ready.",
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
          url: `${publicBaseUrl(req)}/compatibility/${pair.report.id}`,
          granted: true,
        })
        : false;
      if (!delivered) req.log.warn({ reportId: pair.report.id }, "[pair-email] notice not delivered; access is granted");
      return res.status(201).json({ state: "granted", invite: null });
    }

    if (!body.data.email) {
      return res.status(400).json({
        error: "validation_error",
        message: `Add ${send.firstName}'s email to send it.`,
      });
    }
    const invite = await createSendInvite(req, {
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
    return res.status(500).json({ error: "internal_error", message: "Failed to send the report" });
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
          isNull(inviteTokensTable.claimedAt),
          isNull(inviteTokensTable.revokedAt),
          gt(inviteTokensTable.expiresAt, now),
        ),
      )
      .returning({ id: inviteTokensTable.id });
    if (!consumed.length) throw new Refusal(409, "already_claimed", "Invite already claimed");
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
      const [ownChart] = await tx
        .select({ id: profilesTable.id })
        .from(profilesTable)
        .where(
          and(
            ne(profilesTable.id, profileId),
            or(
              and(eq(profilesTable.userId, userId), eq(profilesTable.isSelf, true)),
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
          isNull(inviteTokensTable.claimedAt),
          isNull(inviteTokensTable.revokedAt),
        ),
      )
      .returning({ id: inviteTokensTable.id });
    if (!consumed.length) throw new Refusal(409, "already_claimed", "Invite already claimed");
  });

  return sendClaimBody(profileId, pairId, askSelf);
}

// POST /invites/:token/claim — Clerk-authenticated claim, of a send or a gift.
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

    return res.json(inv.kind === "gift" ? await claimGift(inv, userId) : await claimSend(req, inv, userId));
  } catch (err) {
    if (err instanceof Refusal) {
      return res.status(err.status).json({ error: err.code, message: err.message });
    }
    req.log.error({ err }, "Failed to claim invite");
    return res.status(500).json({ error: "internal_error", message: "Failed to claim invite" });
  }
});

export default router;
