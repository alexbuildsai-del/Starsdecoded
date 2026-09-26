import { Router, type Request } from "express";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { db, profilesTable, reportsTable, type Profile } from "@workspace/db";
import {
  CreateProfileBody,
  StopSharingProfileParams,
  UpdateProfileBirthTimeBody,
  UpdateProfileBody,
  UpdateProfileParams,
} from "@workspace/api-zod";
import { chartForProfile, resolveOrCreateProfile } from "../lib/profiles.js";
import { hasHorizon, type NatalChartData } from "../lib/chartCalculation.js";
import { runHorizonPass } from "../lib/horizonPass.js";
import {
  accessFor,
  claimerNamesByProfile,
  giverIdOf,
  isSelfFor,
  openInvitesByProfile,
  profileOwnershipFor,
  sendStateFor,
  type SendState,
  type Viewer,
} from "../lib/access.js";
import { firstNameOf } from "../lib/names.js";

const router = Router();

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type NatalReport = { profileId: string; type: string; status: string };
type StoredChart = {
  horizon?: { status?: string };
  planets?: { sun?: { sign?: string }; moon?: { sign?: string } };
  angles?: { ascendant?: { sign?: string } };
};

function viewerOf(req: Request): Viewer {
  return { userId: req.userId, sessionId: req.sessionId };
}

// A session's anonymous drafts join the account when sign-in attaches them
// (auth middleware); until then the account cannot open them, so they are
// not listed as its own.
function ownership(req: Request) {
  return req.userId
    ? or(eq(profilesTable.userId, req.userId), eq(profilesTable.claimedByUserId, req.userId))
    : eq(profilesTable.sessionId, req.sessionId);
}

async function natalReportsOf(profileIds: string[]): Promise<Map<string, NatalReport[]>> {
  const byProfile = new Map<string, NatalReport[]>();
  if (!profileIds.length) return byProfile;
  const rows = await db
    .select({ profileId: reportsTable.profileId, type: reportsTable.type, status: reportsTable.status })
    .from(reportsTable)
    .where(and(inArray(reportsTable.profileId, profileIds), eq(reportsTable.type, "natal")));
  for (const r of rows) byProfile.set(r.profileId, [...(byProfile.get(r.profileId) ?? []), r]);
  return byProfile;
}

// A first name is a courtesy on the card; one that cannot be looked up is left
// out rather than failing the whole list.
async function firstNamesOf(userIds: string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(userIds)];
  const names = await Promise.all(
    unique.map(async (id) => [id, await firstNameOf(id).catch(() => null)] as const),
  );
  return new Map(names);
}

// One finished natal report is enough to offer Send, so a failed retry beside
// it does not take the button away (reading 11).
function sendOf(viewer: Viewer, p: Profile, reports: NatalReport[], openInvite: string | null): SendState | null {
  for (const r of reports) {
    const state = sendStateFor(viewer, p, r, openInvite);
    if (state) return state;
  }
  return null;
}

/**
 * Each profile as its viewer stands to it (ADR-139). The self mark is the
 * viewer's own (reading 16), and on a chart sent to them their This is me is
 * never shown to the one who wrote it. Only the person a chart was sent to
 * learns its giver's name, and a chart sent to someone is never theirs to send on.
 */
async function summarize(viewer: Viewer, rows: Profile[]) {
  const ids = rows.map((p) => p.id);
  const [invites, claimers, natal, givers] = await Promise.all([
    openInvitesByProfile(ids),
    claimerNamesByProfile(rows),
    natalReportsOf(ids),
    firstNamesOf(rows.flatMap((p) => giverIdOf(viewer, p) ?? [])),
  ]);
  return rows.map((p) => {
    const access = accessFor(viewer, p);
    const openInvite = invites.get(p.id) ?? null;
    const own = profileOwnershipFor(viewer, p, openInvite);
    const giverId = giverIdOf(viewer, p);
    const chart = (p.chartData ?? {}) as StoredChart;
    return {
      id: p.id,
      name: p.name,
      birthDate: p.birthDate,
      birthTime: p.birthTime,
      birthPlace: p.birthPlace,
      latitude: p.latitude,
      longitude: p.longitude,
      timezoneOffset: p.timezoneOffset,
      timezone: p.timezone ?? null,
      birthTimeWindowMinutes: p.birthTimeWindowMinutes,
      horizon: chart.horizon?.status ?? null,
      sunSign: chart.planets?.sun?.sign ?? null,
      moonSign: chart.planets?.moon?.sign ?? null,
      risingSign: chart.angles?.ascendant?.sign ?? null,
      createdAt: p.createdAt.toISOString(),
      ownership: own,
      // The claimer's address, for the two people the send joined and no one else.
      claimedByName: access ? (claimers.get(p.id) ?? null) : null,
      // The address a send went to is its recipient's; only the sender sees it, and only while it waits.
      inviteEmail: own === "invited" ? openInvite : null,
      isSelf: isSelfFor(viewer, p),
      claimedAsSelf: access === "claimed" && p.claimedAsSelf,
      giverName: giverId ? (givers.get(giverId) ?? null) : null,
      send: sendOf(viewer, p, natal.get(p.id) ?? [], openInvite),
    };
  });
}

/**
 * One chart is the viewer's own (reading 16): marking one unmarks every other,
 * whether they wrote it or it was sent to them.
 */
async function unmarkOtherSelves(tx: Tx, viewer: Viewer, keepId: string, now: Date): Promise<void> {
  if (!viewer.userId) {
    // A session marks only its unattached drafts, so it unmarks only those, never a row an account holds.
    await tx
      .update(profilesTable)
      .set({ isSelf: false, updatedAt: now })
      .where(and(
        eq(profilesTable.sessionId, viewer.sessionId),
        isNull(profilesTable.userId),
        eq(profilesTable.isSelf, true),
        ne(profilesTable.id, keepId),
      ));
    return;
  }
  await tx
    .update(profilesTable)
    .set({ isSelf: false, updatedAt: now })
    .where(and(eq(profilesTable.userId, viewer.userId), eq(profilesTable.isSelf, true), ne(profilesTable.id, keepId)));
  await tx
    .update(profilesTable)
    .set({ claimedAsSelf: false, updatedAt: now })
    .where(and(
      eq(profilesTable.claimedByUserId, viewer.userId),
      eq(profilesTable.claimedAsSelf, true),
      ne(profilesTable.id, keepId),
    ));
}

// List the viewer's people (profiles).
router.get("/profiles", async (req, res) => {
  try {
    const viewer = viewerOf(req);
    const rows = await db
      .select()
      .from(profilesTable)
      .where(ownership(req))
      .orderBy(profilesTable.createdAt);
    // A session never reads a chart an account has claimed: only the account
    // can show that its subject still shares it (ADR-139).
    res.json(await summarize(viewer, rows.filter((p) => accessFor(viewer, p))));
  } catch (err) {
    req.log.error({ err }, "Failed to list profiles");
    res.status(500).json({ error: "internal_error", message: "Failed to list profiles" });
  }
});

// The writer marks their own chart (isSelf); the person a chart was sent to
// says This is me or Not me (claimedAsSelf, ADR-120, MB-81).
router.patch("/profiles/:id", async (req, res) => {
  const params = UpdateProfileParams.safeParse(req.params);
  const body = UpdateProfileBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({
      error: "validation_error",
      message: body.success ? "Invalid ID" : body.error.message,
    });
  }
  const { id } = params.data;
  const { isSelf, claimedAsSelf } = body.data;
  const viewer = viewerOf(req);

  try {
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(and(eq(profilesTable.id, id), ownership(req)))
      .limit(1);
    const access = profile ? accessFor(viewer, profile) : null;
    if (!profile || !access) {
      return res.status(404).json({ error: "not_found", message: "Profile not found" });
    }
    // A session may mark only its unattached drafts, never a row an account holds.
    const writer = access === "owner" && (!!viewer.userId || !profile.userId);
    if (isSelf !== undefined && !writer) {
      return res.status(403).json({ error: "forbidden", message: "Not the owner of this profile" });
    }
    if (claimedAsSelf !== undefined && access !== "claimed") {
      return res.status(403).json({ error: "forbidden", message: "Not the person this chart was sent to" });
    }

    const marks: Partial<Pick<Profile, "isSelf" | "claimedAsSelf">> = {};
    if (isSelf !== undefined && isSelf !== profile.isSelf) marks.isSelf = isSelf;
    if (claimedAsSelf !== undefined && claimedAsSelf !== profile.claimedAsSelf) marks.claimedAsSelf = claimedAsSelf;
    // Unmarking the others runs even when this mark already stands, so two
    // marks left by an older path settle on the one just confirmed.
    const marking = isSelf === true || claimedAsSelf === true;
    if (marking || Object.keys(marks).length) {
      const now = new Date();
      // The partial unique index on (user_id) WHERE is_self is the last guard;
      // the transaction keeps the unmark and the mark from racing.
      await db.transaction(async (tx) => {
        if (marking) await unmarkOtherSelves(tx, viewer, id, now);
        if (Object.keys(marks).length) {
          await tx.update(profilesTable).set({ ...marks, updatedAt: now }).where(eq(profilesTable.id, id));
        }
      });
    }

    const [summary] = await summarize(viewer, [{ ...profile, ...marks }]);
    return res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Failed to update profile");
    return res.status(500).json({ error: "internal_error", message: "Failed to update profile" });
  }
});

/**
 * The person a chart was sent to ends its giver's reading at once (ADR-139).
 * The row becomes theirs, and it and its natal reports move to a session no
 * browser holds, so neither the giver's account nor a cookie left in their
 * browser reaches them again. The claim stays, so This is me and any pair
 * sent to them hold as they were.
 */
router.post("/profiles/:id/stop-sharing", async (req, res) => {
  const claimer = req.userId;
  if (!claimer) {
    return res.status(401).json({ error: "unauthorized", message: "Sign in to stop sharing" });
  }
  const params = StopSharingProfileParams.safeParse(req.params);
  if (!params.success) {
    return res.status(404).json({ error: "not_found", message: "Profile not found" });
  }
  const { id } = params.data;

  try {
    const session = randomUUID();
    const now = new Date();
    // MB-103 provisional: a pair the giver made from this chart is left as it
    // is; it closes on read (pairReadable) and nothing is deleted.
    const handedOver = await db.transaction(async (tx) => {
      const moved = await tx
        .update(profilesTable)
        // The writer's own-chart mark does not travel with the chart; the subject's is claimed_as_self.
        .set({ userId: claimer, sessionId: session, isSelf: false, updatedAt: now })
        .where(and(eq(profilesTable.id, id), eq(profilesTable.claimedByUserId, claimer)))
        .returning({ id: profilesTable.id });
      if (!moved.length) return false;
      await tx
        .update(reportsTable)
        .set({ sessionId: session, updatedAt: now })
        .where(and(eq(reportsTable.profileId, id), eq(reportsTable.type, "natal")));
      return true;
    });
    // The giver, a stranger and a missing id read alike, so no id is confirmed.
    if (!handedOver) {
      return res.status(404).json({ error: "not_found", message: "Profile not found" });
    }
    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to stop sharing");
    return res.status(500).json({ error: "internal_error", message: "Failed to stop sharing" });
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
    const [summary] = await summarize(viewerOf(req), [profile]);
    return res.status(201).json(summary);
  } catch (err) {
    req.log.error({ err }, "Failed to create profile");
    return res.status(500).json({ error: "internal_error", message: "Failed to create profile" });
  }
});

export default router;
