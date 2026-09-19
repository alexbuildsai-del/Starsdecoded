import { Router } from "express";
import { and, eq, or, isNull, ne } from "drizzle-orm";
import { db, profilesTable, reportsTable } from "@workspace/db";
import { CreateProfileBody, UpdateProfileBirthTimeBody } from "@workspace/api-zod";
import { chartForProfile, resolveOrCreateProfile } from "../lib/profiles.js";
import { hasHorizon, type NatalChartData } from "../lib/chartCalculation.js";
import { runHorizonPass } from "../lib/horizonPass.js";
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
        timezone: p.timezone ?? null,
        birthTimeWindowMinutes: p.birthTimeWindowMinutes,
        horizon: (p.chartData as any)?.horizon?.status ?? null,
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
      timezone: updated.timezone ?? null,
      birthTimeWindowMinutes: updated.birthTimeWindowMinutes,
      horizon: (updated.chartData as any)?.horizon?.status ?? null,
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

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const WINDOWS = new Set([0, 60, 180, 720]);

/**
 * PATCH /profiles/:id/birth-time — add or correct the birth time and run
 * the horizon pass on every complete natal report of the profile (ADR-35).
 * The owner, or the person who claimed the profile as their own, may do
 * this; anyone else sees 404. Dedupe keys on time and window together, so
 * the same answer twice is a no-op unless a report is still blind.
 */
router.patch("/profiles/:id/birth-time", async (req, res) => {
  const { id } = req.params;
  const body = UpdateProfileBirthTimeBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "validation_error", message: body.error.message });
  }
  const { birthTime, birthTimeWindowMinutes } = body.data;
  if (!TIME.test(birthTime)) {
    return res.status(400).json({ error: "validation_error", message: "birthTime must be HH:MM" });
  }
  if (!WINDOWS.has(birthTimeWindowMinutes)) {
    return res.status(400).json({ error: "validation_error", message: "birthTimeWindowMinutes must be 0, 60, 180 or 720" });
  }

  try {
    const rows = await db.select().from(profilesTable).where(eq(profilesTable.id, id)).limit(1);
    const profile = rows[0];
    const mayUpdate = profile && (req.userId
      ? profile.userId === req.userId || profile.claimedByUserId === req.userId
      : profile.sessionId === req.sessionId && !profile.userId);
    if (!mayUpdate) {
      return res.status(404).json({ error: "not_found", message: "Profile not found" });
    }

    const reports = await db.select().from(reportsTable)
      .where(and(eq(reportsTable.profileId, profile.id), eq(reportsTable.type, "natal")));
    if (reports.some((r) => r.status === "revising")) {
      return res.status(409).json({ error: "in_progress", message: "A horizon pass is already running on this report" });
    }
    if (reports.some((r) => !["complete", "failed"].includes(r.status))) {
      return res.status(409).json({ error: "in_progress", message: "The report is still being written" });
    }

    const previousChart = (profile.chartData as NatalChartData | null) ?? null;
    const chart = chartForProfile({ ...profile, birthTime, birthTimeWindowMinutes });
    const previouslyDrawn = previousChart ? hasHorizon(previousChart) : false;
    if (!hasHorizon(chart) && previouslyDrawn) {
      return res.status(400).json({ error: "validation_error", message: "A birth time already recorded cannot be widened past the horizon" });
    }

    await db.update(profilesTable)
      .set({ birthTime, birthTimeWindowMinutes, chartData: chart as unknown as object, updatedAt: new Date() })
      .where(eq(profilesTable.id, profile.id));

    // Only a report the new chart can say more about is passed: a complete
    // one whose text was written under a different horizon than the chart now holds.
    const unchanged = profile.birthTime === birthTime && profile.birthTimeWindowMinutes === birthTimeWindowMinutes;
    const toPass = hasHorizon(chart)
      ? reports.filter((r) => r.status === "complete" && r.interpretation
        && ((r.interpretation as { meta?: { horizon?: string } }).meta?.horizon !== chart.horizon.status || !unchanged))
      : [];
    for (const r of toPass) {
      runHorizonPass({
        reportId: r.id,
        profileId: profile.id,
        name: profile.name,
        previous: { birthTime: profile.birthTime, birthTimeWindowMinutes: profile.birthTimeWindowMinutes, chart: previousChart },
        chart,
      }).catch((err) => req.log.error({ err, reportId: r.id }, "horizon pass crashed"));
    }

    return res.status(202).json({ profileId: profile.id, horizon: chart.horizon.status, reportIds: toPass.map((r) => r.id) });
  } catch (err) {
    req.log.error({ err }, "Failed to update the birth time");
    return res.status(500).json({ error: "internal_error", message: "Failed to update the birth time" });
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
      timezone: profile.timezone ?? null,
      birthTimeWindowMinutes: profile.birthTimeWindowMinutes,
      horizon: (profile.chartData as any)?.horizon?.status ?? null,
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
