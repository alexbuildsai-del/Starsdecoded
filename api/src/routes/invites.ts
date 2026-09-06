import { Router } from "express";
import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { mintInviteToken, verifyInviteToken } from "../lib/inviteToken.js";
import {
  db,
  profilesTable,
  relationshipsTable,
  relationshipParticipantsTable,
  inviteTokensTable,
  reportsTable,
  usersTable,
} from "@workspace/db";
import { CreateInviteBody } from "@workspace/api-zod";
import { ensureSynastryReportForRelationship } from "./synastry.js";
import { logger } from "../lib/logger.js";
import { sendInviteEmail } from "../lib/mailer.js";

const router = Router();

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
    const ownsProfile = req.userId
      ? profile.userId === req.userId
      : profile.sessionId === req.sessionId;
    if (!ownsProfile) {
      return res.status(403).json({ error: "forbidden", message: "You do not own this profile" });
    }

    const now = new Date();
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
          isNull(inviteTokensTable.claimedAt),
          gt(inviteTokensTable.expiresAt, now),
        ),
      )
      .orderBy(inviteTokensTable.createdAt);

    return res.json(
      rows.map((r) => ({
        id: r.id,
        email: r.email,
        profileId: r.profileId,
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

function publicBaseUrl(req: { headers: Record<string, unknown> }): string {
  const fwdHost = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim();
  const host = fwdHost ?? (req.headers["host"] as string | undefined);
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

// POST /invites — owner sends an invite for a profile (and optionally relationship).
router.post("/invites", async (req, res) => {
  const parsed = CreateInviteBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: parsed.error.message });
  }
  const { profileId, relationshipId, email } = parsed.data;

  try {
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, profileId))
      .limit(1);
    if (!profile) {
      return res.status(404).json({ error: "not_found", message: "Profile not found" });
    }
    const ownsProfile = req.userId
      ? profile.userId === req.userId
      : profile.sessionId === req.sessionId;
    if (!ownsProfile) {
      return res.status(403).json({ error: "forbidden", message: "You do not own this profile" });
    }
    if (profile.claimedByUserId) {
      return res.status(409).json({ error: "already_claimed", message: "Profile has already been claimed" });
    }

    let relationship: typeof relationshipsTable.$inferSelect | null = null;
    // If the inviter didn't pass an explicit relationshipId (e.g. invite
    // launched from the My People profile card), auto-resolve to the
    // most recent relationship they own that contains this profile so
    // claim still grants synastry-report access.
    let resolvedRelationshipId = relationshipId;
    if (!resolvedRelationshipId) {
      const ownerCond = req.userId
        ? eq(relationshipsTable.userId, req.userId)
        : eq(relationshipsTable.sessionId, req.sessionId);
      const candidates = await db
        .select({
          id: relationshipsTable.id,
          createdAt: relationshipsTable.createdAt,
        })
        .from(relationshipParticipantsTable)
        .innerJoin(
          relationshipsTable,
          eq(relationshipParticipantsTable.relationshipId, relationshipsTable.id),
        )
        .where(
          and(
            eq(relationshipParticipantsTable.profileId, profileId),
            ownerCond,
          ),
        );
      if (candidates.length) {
        candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        resolvedRelationshipId = candidates[0].id;
      }
    }
    if (resolvedRelationshipId) {
      const [r] = await db
        .select()
        .from(relationshipsTable)
        .where(eq(relationshipsTable.id, resolvedRelationshipId))
        .limit(1);
      if (!r) {
        return res.status(404).json({ error: "not_found", message: "Relationship not found" });
      }
      const ownsRel = req.userId ? r.userId === req.userId : r.sessionId === req.sessionId;
      if (!ownsRel) {
        return res.status(403).json({ error: "forbidden", message: "You do not own this relationship" });
      }
      relationship = r;

      // The invited profile must actually be a participant of this
      // relationship; otherwise the claim would assign the profile to the
      // recipient but never grant access to the report.
      const [member] = await db
        .select({ id: relationshipParticipantsTable.id })
        .from(relationshipParticipantsTable)
        .where(
          and(
            eq(relationshipParticipantsTable.relationshipId, r.id),
            eq(relationshipParticipantsTable.profileId, profileId),
          ),
        )
        .limit(1);
      if (!member) {
        return res.status(400).json({
          error: "profile_not_in_relationship",
          message: "Profile is not a participant in the given relationship",
        });
      }
    }

    // Inviter display name (best-effort; email-only if not available).
    let inviterName: string | null = null;
    if (req.userId) {
      const [u] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, req.userId))
        .limit(1);
      inviterName = u?.email ?? null;
    }

    const { token, tokenHash } = mintInviteToken();
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    await db.insert(inviteTokensTable).values({
      id,
      tokenHash,
      email: email.toLowerCase(),
      profileId,
      relationshipId: relationship?.id ?? null,
      createdByUserId: req.userId ?? null,
      createdBySessionId: req.sessionId,
      expiresAt,
      emailDelivered: null, // updated below after send attempt
    });

    const baseUrl = publicBaseUrl(req as unknown as { headers: Record<string, unknown> });
    const claimUrl = `${baseUrl}/claim?token=${encodeURIComponent(token)}`;

    // Send the invite email via Resend. This is fire-and-forget: if sending
    // fails we still return 201 and show the copy-link UI as a fallback so
    // the owner can share the link manually. We deliberately do NOT log the
    // raw claim URL in production to avoid token leakage through log
    // aggregators.
    const emailDelivered = await sendInviteEmail({
      to: email.toLowerCase(),
      inviterName,
      profileName: profile.name,
      relationshipName: relationship?.label ?? null,
      claimUrl,
    });

    // Persist delivery status so the invite history panel can show it.
    await db
      .update(inviteTokensTable)
      .set({ emailDelivered })
      .where(eq(inviteTokensTable.id, id));

    if (!emailDelivered) {
      req.log.warn(
        { invite: { id, email: email.toLowerCase(), profileId, relationshipId: relationship?.id ?? null } },
        "[invite-email] send failed — invite created but recipient must use copy-link",
      );
    }

    return res.status(201).json({
      id,
      token,
      email: email.toLowerCase(),
      profileId,
      relationshipId: relationship?.id ?? null,
      expiresAt: expiresAt.toISOString(),
      claimUrl,
      emailDelivered,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create invite");
    return res.status(500).json({ error: "internal_error", message: "Failed to create invite" });
  }
});

// GET /invites/:token — public preview used by the claim landing page.
router.get("/invites/:token", async (req, res) => {
  const tokenRaw = req.params.token;
  const tokenHash = verifyInviteToken(tokenRaw);
  if (!tokenHash) {
    return res.status(404).json({ error: "not_found", message: "Invite not found" });
  }
  try {
    const [inv] = await db
      .select()
      .from(inviteTokensTable)
      .where(eq(inviteTokensTable.tokenHash, tokenHash))
      .limit(1);
    if (!inv) {
      return res.status(404).json({ error: "not_found", message: "Invite not found" });
    }
    if (inv.expiresAt.getTime() < Date.now()) {
      return res.status(404).json({ error: "expired", message: "This invite has expired" });
    }

    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, inv.profileId))
      .limit(1);

    let inviterName: string | null = null;
    if (inv.createdByUserId) {
      const [u] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, inv.createdByUserId))
        .limit(1);
      inviterName = u?.email ?? null;
    }

    let relationshipReportId: string | null = null;
    if (inv.relationshipId) {
      const reps = await db
        .select({ id: reportsTable.id, createdAt: reportsTable.createdAt })
        .from(reportsTable)
        .where(
          and(
            eq(reportsTable.relationshipId, inv.relationshipId),
            eq(reportsTable.type, "synastry"),
          ),
        );
      reps.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      relationshipReportId = reps.at(-1)?.id ?? null;
    }

    return res.json({
      token: tokenRaw,
      email: inv.email,
      inviterName,
      profileName: profile?.name ?? "this person",
      relationshipId: inv.relationshipId,
      relationshipReportId,
      expiresAt: inv.expiresAt.toISOString(),
      alreadyClaimed: !!inv.claimedAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load invite");
    return res.status(500).json({ error: "internal_error", message: "Failed to load invite" });
  }
});

// POST /invites/:token/claim — Clerk-authenticated claim.
router.post("/invites/:token/claim", async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ error: "unauthorized", message: "Sign in to claim this invite" });
  }
  const tokenRaw = req.params.token;
  const tokenHash = verifyInviteToken(tokenRaw);
  if (!tokenHash) {
    return res.status(404).json({ error: "not_found", message: "Invite not found" });
  }
  try {
    const [inv] = await db
      .select()
      .from(inviteTokensTable)
      .where(eq(inviteTokensTable.tokenHash, tokenHash))
      .limit(1);
    if (!inv) {
      return res.status(404).json({ error: "not_found", message: "Invite not found" });
    }
    if (inv.expiresAt.getTime() < Date.now()) {
      return res.status(404).json({ error: "expired", message: "This invite has expired" });
    }

    // Identity binding: the authenticated user must be the invitee. We verify
    // against Clerk via the locally cached email (populated by authMiddleware
    // on first sight) and fall back to a fresh Clerk lookup as a safety net
    // in case the cache is missing the row.
    let viewerEmail: string | null = null;
    const [u] = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);
    viewerEmail = u?.email ?? null;
    if (!viewerEmail) {
      try {
        const { clerkClient } = await import("@clerk/express");
        const cu = await clerkClient.users.getUser(req.userId!);
        viewerEmail = cu.primaryEmailAddress?.emailAddress
          ?? cu.emailAddresses[0]?.emailAddress
          ?? null;
      } catch (err) {
        req.log.warn({ err }, "Could not resolve viewer email for claim");
      }
    }
    if (
      !viewerEmail
      || viewerEmail.trim().toLowerCase() !== inv.email.trim().toLowerCase()
    ) {
      return res.status(403).json({
        error: "wrong_recipient",
        message: "This invite was sent to a different email address",
      });
    }

    if (inv.claimedAt) {
      // If the same user re-clicks, treat as success and redirect them in.
      if (inv.claimedByUserId === req.userId) {
        return res.json(await buildClaimResponse(inv.profileId, inv.relationshipId));
      }
      return res.status(409).json({ error: "already_claimed", message: "Invite already claimed" });
    }

    // Verify the profile exists; the actual single-claim guarantee is
    // enforced atomically by the conditional update below (so two
    // racing claims for the same profile cannot both win).
    const [profile] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.id, inv.profileId))
      .limit(1);
    if (!profile) {
      return res.status(404).json({ error: "not_found", message: "Profile not found" });
    }

    // Apply claim in a single transaction so the profile claim,
    // participant role flip, and token consumption either all land or
    // all roll back together. The profile update is conditional on
    // claimed_by_user_id being NULL (or already equal to this user, to
    // make retries idempotent), and we abort the transaction if no row
    // was affected — guaranteeing a deterministic loser when two
    // claims race for the same profile.
    const now = new Date();
    try {
      await db.transaction(async (tx) => {
        const claimed = await tx
          .update(profilesTable)
          .set({ claimedByUserId: req.userId, updatedAt: now })
          .where(
            and(
              eq(profilesTable.id, profile.id),
              or(
                isNull(profilesTable.claimedByUserId),
                eq(profilesTable.claimedByUserId, req.userId!),
              ),
            ),
          )
          .returning({ id: profilesTable.id });
        if (claimed.length === 0) {
          throw new Error("CLAIM_RACE_LOST");
        }

        // The claimed profile is already a participant on the
        // relationship — we don't add an extra row. We do flip the
        // existing participant row's access_role from 'owner' (the
        // default) to 'participant' so the role column reflects the
        // post-claim reality.
        if (inv.relationshipId) {
          await tx
            .update(relationshipParticipantsTable)
            .set({ accessRole: "participant" })
            .where(
              and(
                eq(relationshipParticipantsTable.relationshipId, inv.relationshipId),
                eq(relationshipParticipantsTable.profileId, profile.id),
              ),
            );
        }

        // Single-use enforcement on the invite token: only consume if
        // it's still unclaimed.
        const consumed = await tx
          .update(inviteTokensTable)
          .set({ claimedAt: now, claimedByUserId: req.userId })
          .where(
            and(
              eq(inviteTokensTable.id, inv.id),
              isNull(inviteTokensTable.claimedAt),
            ),
          )
          .returning({ id: inviteTokensTable.id });
        if (consumed.length === 0) {
          throw new Error("CLAIM_RACE_LOST");
        }
      });
    } catch (err) {
      if ((err as Error).message === "CLAIM_RACE_LOST") {
        return res.status(409).json({
          error: "already_claimed",
          message: "Profile already claimed by someone else",
        });
      }
      throw err;
    }

    return res.json(await buildClaimResponse(inv.profileId, inv.relationshipId));
  } catch (err) {
    req.log.error({ err }, "Failed to claim invite");
    return res.status(500).json({ error: "internal_error", message: "Failed to claim invite" });
  }
});

async function buildClaimResponse(profileId: string, relationshipId: string | null) {
  let relationshipReportId: string | null = null;
  if (relationshipId) {
    const reps = await db
      .select({ id: reportsTable.id, createdAt: reportsTable.createdAt })
      .from(reportsTable)
      .where(
        and(
          eq(reportsTable.relationshipId, relationshipId),
          eq(reportsTable.type, "synastry"),
        ),
      );
    reps.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    relationshipReportId = reps.at(-1)?.id ?? null;

    // No report yet for this relationship — kick one off so the
    // claimer lands on a generating-state synastry page instead of
    // being silently bounced to /people. If kickoff fails for any
    // reason we keep the previous /people fallback so the claim
    // itself never regresses.
    if (!relationshipReportId) {
      try {
        relationshipReportId = await ensureSynastryReportForRelationship(relationshipId);
      } catch (err) {
        // We deliberately swallow this so the claim itself never
        // regresses — the user still ends up signed-in and bound to
        // the profile, just routed to /people instead of a synastry
        // page. Log loudly so the failure is observable in production.
        logger.warn(
          { err, relationshipId, profileId },
          "Failed to auto-generate synastry report on claim; falling back to /people redirect",
        );
        relationshipReportId = null;
      }
    }
  }
  const redirectTo = relationshipReportId ? `/synastry/${relationshipReportId}` : `/people`;
  return {
    profileId,
    relationshipId,
    relationshipReportId,
    redirectTo,
  };
}

export default router;
