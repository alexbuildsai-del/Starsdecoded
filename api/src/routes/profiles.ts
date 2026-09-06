import { Router } from "express";
import { and, eq, or, isNull, ne } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import { CreateProfileBody } from "@workspace/api-zod";
import { resolveOrCreateProfile } from "../lib/profiles.js";
import {
  openInvitesByProfile,
  claimerNamesByProfile,
  profileOwnershipFor,
} from "../lib/access.js";

const router = Router();

function ownership(req: { userId: string | null; sessionId: string }) {
  return req.userId
    ? or(
        eq(profilesTable.userId, req.userId),
        eq(profilesTable.claimedByUserId, req.userId),
        and(eq(profilesTable.sessionId, req.sessionId), isNull(profilesTable.userId)),
      )
    : eq(profilesTable.sessionId, req.sessionId);
}

// List the viewer's people (profiles).
router.get("/profiles", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(profilesTable)
      .where(ownership(req))
      .orderBy(profilesTable.createdAt);

    const invites = await openInvitesByProfile(rows.map((r) => r.id));
    const claimers = await claimerNamesByProfile(rows);
    const viewer = { userId: req.userId, sessionId: req.sessionId };

    // isSelf is stored directly on the profile row — it is set at creation
    // time when the user explicitly uses the "Generate My Chart" flow
    // (isForSelf=true in POST /reports). No heuristic is used here.

    const summaries = rows.map((p) => {
      const own = profileOwnershipFor(viewer, p, invites.get(p.id) ?? null);
      // inviteEmail is recipient PII; only the inviter (the profile
      // owner who is also still the inviter side) may see it. For any
      // other relation — including a claimer reading their own
      // claimed profile — we strip it.
      const isOwnerView = own === "owner" || own === "invited" || own === "unclaimed";
      return {
        id: p.id,
        name: p.name,
        birthDate: p.birthDate,
        birthTime: p.birthTime,
        birthPlace: p.birthPlace,
        sunSign: (p.chartData as any)?.planets?.sun?.sign ?? null,
        moonSign: (p.chartData as any)?.planets?.moon?.sign ?? null,
        risingSign: (p.chartData as any)?.angles?.ascendant?.sign ?? null,
        createdAt: p.createdAt.toISOString(),
        ownership: own,
        claimedByName: claimers.get(p.id) ?? null,
        inviteEmail: isOwnerView ? (invites.get(p.id) ?? null) : null,
        isSelf: p.isSelf,
      };
    });

    res.json(summaries);
  } catch (err) {
    req.log.error({ err }, "Failed to list profiles");
    res.status(500).json({ error: "internal_error", message: "Failed to list profiles" });
  }
});

// PATCH /profiles/:id — update mutable fields (currently isSelf only).
// Only the direct owner of the profile may do this.
router.patch("/profiles/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;
  if (typeof body !== "object" || body === null) {
    return res.status(400).json({ error: "validation_error", message: "Request body must be an object" });
  }
  if ("isSelf" in body && typeof body.isSelf !== "boolean") {
    return res.status(400).json({ error: "validation_error", message: "isSelf must be a boolean" });
  }
  const isSelf: boolean | undefined = "isSelf" in body ? (body.isSelf as boolean) : undefined;

  try {
    // Load the profile — must exist and be owned by the viewer.
    const rows = await db
      .select()
      .from(profilesTable)
      .where(and(eq(profilesTable.id, id), ownership(req)))
      .limit(1);

    if (!rows.length) {
      return res.status(404).json({ error: "not_found", message: "Profile not found" });
    }

    const profile = rows[0];

    // Only the original owner (userId match, not just a claimer) may toggle isSelf.
    // For signed-in users: must be the direct userId owner.
    // For anonymous: must own by sessionId.
    const isDirectOwner = req.userId
      ? profile.userId === req.userId
      : profile.sessionId === req.sessionId && !profile.userId;

    if (!isDirectOwner) {
      return res.status(403).json({ error: "forbidden", message: "Not the owner of this profile" });
    }

    const updates: Partial<typeof profilesTable.$inferInsert> & { updatedAt?: Date } = {};

    if (typeof isSelf === "boolean") {
      if (isSelf && !profile.isSelf) {
        // Atomically clear any existing self-profile then set this one.
        // The DB partial unique index is the final safety net;
        // the transaction prevents TOCTOU races.
        await db.transaction(async (tx) => {
          if (req.userId) {
            await tx
              .update(profilesTable)
              .set({ isSelf: false, updatedAt: new Date() })
              .where(and(eq(profilesTable.userId, req.userId), ne(profilesTable.id, id)));
          } else {
            await tx
              .update(profilesTable)
              .set({ isSelf: false, updatedAt: new Date() })
              .where(and(eq(profilesTable.sessionId, req.sessionId), ne(profilesTable.id, id)));
          }
          await tx
            .update(profilesTable)
            .set({ isSelf: true, updatedAt: new Date() })
            .where(eq(profilesTable.id, id));
        });
        updates.isSelf = true;
        updates.updatedAt = new Date();
      } else if (!isSelf && profile.isSelf) {
        updates.isSelf = false;
        updates.updatedAt = new Date();
        await db.update(profilesTable).set(updates).where(eq(profilesTable.id, id));
      }
    }

    const updated = { ...profile, ...updates };

    // Fetch invite info for the response summary
    const invites = await openInvitesByProfile([id]);
    const claimers = await claimerNamesByProfile([updated]);
    const viewer = { userId: req.userId, sessionId: req.sessionId };
    const own = profileOwnershipFor(viewer, updated, invites.get(id) ?? null);
    const isOwnerView = own === "owner" || own === "invited" || own === "unclaimed";

    return res.json({
      id: updated.id,
      name: updated.name,
      birthDate: updated.birthDate,
      birthTime: updated.birthTime,
      birthPlace: updated.birthPlace,
      sunSign: (updated.chartData as any)?.planets?.sun?.sign ?? null,
      moonSign: (updated.chartData as any)?.planets?.moon?.sign ?? null,
      risingSign: (updated.chartData as any)?.angles?.ascendant?.sign ?? null,
      createdAt: updated.createdAt.toISOString(),
      ownership: own,
      claimedByName: claimers.get(id) ?? null,
      inviteEmail: isOwnerView ? (invites.get(id) ?? null) : null,
      isSelf: updated.isSelf,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update profile");
    return res.status(500).json({ error: "internal_error", message: "Failed to update profile" });
  }
});

// Create (or de-dupe-resolve) a person/profile. Reuses the same
// resolveOrCreateProfile helper that the natal-report flow uses, so the
// same person is never duplicated across the two entry points.
router.post("/profiles", async (req, res) => {
  const parsed = CreateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: parsed.error.message });
  }
  try {
    const profile = await resolveOrCreateProfile(req.sessionId, req.userId ?? null, parsed.data);
    return res.status(201).json({
      id: profile.id,
      name: profile.name,
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      birthPlace: profile.birthPlace,
      sunSign: (profile.chartData as any)?.planets?.sun?.sign ?? null,
      moonSign: (profile.chartData as any)?.planets?.moon?.sign ?? null,
      risingSign: (profile.chartData as any)?.angles?.ascendant?.sign ?? null,
      createdAt: profile.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create profile");
    return res.status(500).json({ error: "internal_error", message: "Failed to create profile" });
  }
});

export default router;
