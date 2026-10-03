import { Router, type Request } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import {
  db,
  inviteTokensTable,
  profileSharesTable,
  profilesTable,
  relationshipParticipantsTable,
  reportsTable,
  type Profile,
} from "@workspace/db";
import {
  CreateProfileBody,
  HandBackProfileParams,
  StopSharingProfileParams,
  UpdateProfileBirthTimeBody,
  UpdateProfileBody,
  UpdateProfileParams,
} from "@workspace/api-zod";
import { chartForProfile, resolveOrCreateProfile } from "../lib/profiles.js";
import { hasHorizon, type HorizonStatus, type NatalChartData } from "../lib/chartCalculation.js";
import { runHorizonPass } from "../lib/horizonPass.js";
import { holdWrites } from "../lib/limits.js";
import {
  accessFor,
  claimerNamesByProfile,
  giverIdOf,
  handedBackByProfile,
  isSelfFor,
  openInvitesByProfile,
  profileOwnershipFor,
  sendStateFor,
  type ProfileHolders,
  type SendState,
  type Viewer,
} from "../lib/access.js";
import { firstNameOf, firstWord } from "../lib/names.js";
import { validationFailure } from "../lib/validation.js";

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
function sendOf(
  viewer: Viewer,
  p: Profile,
  reports: NatalReport[],
  openInvite: string | null,
  handedBackAt: Date | null,
): SendState | null {
  for (const r of reports) {
    const state = sendStateFor(viewer, p, r, openInvite, handedBackAt);
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
  const [invites, claimers, natal, givers, handedBack] = await Promise.all([
    openInvitesByProfile(ids),
    claimerNamesByProfile(rows),
    natalReportsOf(ids),
    firstNamesOf(rows.flatMap((p) => giverIdOf(viewer, p) ?? [])),
    handedBackByProfile(ids),
  ]);
  return rows.map((p) => {
    const access = accessFor(viewer, p);
    const joined = access === "owner" || access === "claimed";
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
      // The claimer's address, for the two people the send joined and no one else, never a reader through a grant.
      claimedByName: joined ? (claimers.get(p.id) ?? null) : null,
      // The address a send went to is its recipient's; only the sender sees it, and only while it waits.
      inviteEmail: own === "invited" ? openInvite : null,
      isSelf: isSelfFor(viewer, p),
      claimedAsSelf: access === "claimed" && p.claimedAsSelf,
      giverName: giverId ? (givers.get(giverId) ?? null) : null,
      send: sendOf(viewer, p, natal.get(p.id) ?? [], openInvite, handedBack.get(p.id) ?? null),
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
    return res.status(400).json(
      body.success ? { error: "validation_error", message: "Invalid ID" } : validationFailure(body.error),
    );
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
    // A grant only lets its reader read; the marks are the writer's and the claimer's (ADR-235).
    if (!profile || !access || access === "shared") {
      return res.status(404).json({ error: "not_found", message: "Profile not found" });
    }
    // A session may mark only its unattached drafts, never a row an account holds.
    const writer = access === "owner" && (!!viewer.userId || !profile.userId);
    if (isSelf !== undefined && !writer) {
      return res.status(403).json({ error: "forbidden", message: "Not the owner of this profile" });
    }
    // A chart its subject claimed is theirs: the writer's mark would make it the writer's own to share (R-3.6).
    // Taking a mark off stays theirs, so one left from before the claim can still be cleared.
    if (isSelf === true && profile.claimedByUserId) {
      return res.status(403).json({
        error: "forbidden",
        message: `${firstWord(profile.name)} already has this report, so you can't mark it as yours.`,
      });
    }
    if (claimedAsSelf !== undefined && access !== "claimed") {
      return res.status(403).json({ error: "forbidden", message: "Not the person this chart was shared with" });
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
    // A pair the giver made from this chart is left as it is; it closes on
    // read (pairReadable) and nothing is deleted (MB-103, ADR-236).
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

export type HandBack = "hand_back" | "not_claimed" | "not_found";

/**
 * Who may hand a chart back (ADR-236): the person it was sent to, who claimed
 * it. The writer of a chart no one has claimed hears there is nothing to hand
 * back; its giver, a reader through a grant, a stranger and a missing id read
 * alike, so no id is confirmed.
 */
export function handBackOf(viewer: Viewer, profile: ProfileHolders | null): HandBack {
  const access = profile ? accessFor(viewer, profile) : null;
  if (access === "claimed") return "hand_back";
  return access === "owner" && !profile?.claimedByUserId ? "not_claimed" : "not_found";
}

/** Whoever sent the claimer this chart, from the send they claimed, the latest if there were more. */
async function senderOf(tx: Tx, profileId: string, claimer: string): Promise<string | null> {
  const [send] = await tx
    .select({ createdByUserId: inviteTokensTable.createdByUserId })
    .from(inviteTokensTable)
    .where(and(
      eq(inviteTokensTable.profileId, profileId),
      eq(inviteTokensTable.kind, "send"),
      eq(inviteTokensTable.claimedByUserId, claimer),
    ))
    .orderBy(desc(inviteTokensTable.createdAt))
    .limit(1);
  return send?.createdByUserId ?? null;
}

/**
 * Not me's Hand it back (ADR-236, amending ADR-139's Not me), in one
 * transaction: the claim ends, the chart is its writer's alone again, and
 * their row reads Handed back with Send again (reading 6). After a hand-over
 * (the claimer's Stop sharing, or the giver's Remove) it goes back to whoever
 * sent it, since a chart that is not theirs is not theirs to keep (R-3.6).
 */
router.post("/profiles/:id/hand-back", async (req, res) => {
  const claimer = req.userId;
  const params = HandBackProfileParams.safeParse(req.params);
  // A visitor never holds a claim, so they read as anyone else does.
  if (!claimer || !params.success) {
    return res.status(404).json({ error: "not_found", message: "Profile not found" });
  }
  const { id } = params.data;
  const viewer = viewerOf(req);

  try {
    const now = new Date();
    const outcome = await db.transaction(async (tx): Promise<HandBack> => {
      const [held] = await tx
        .select({ userId: profilesTable.userId, sessionId: profilesTable.sessionId, claimedByUserId: profilesTable.claimedByUserId })
        .from(profilesTable)
        .where(eq(profilesTable.id, id))
        .for("update");
      const verdict = handBackOf(viewer, held ?? null);
      if (verdict !== "hand_back") return verdict;
      // A hand-over made the row the claimer's, so its writer is then whoever sent them the send they claimed.
      const writer = held.userId !== claimer ? held.userId : await senderOf(tx, id, claimer);
      if (!writer) return "not_found";

      await tx
        .update(profilesTable)
        .set({
          claimedByUserId: null,
          claimedAsSelf: false,
          // A holder's own-chart mark was never the writer's, and the writer may have a chart of their own marked.
          ...(writer !== held.userId ? { userId: writer, isSelf: false } : {}),
          updatedAt: now,
        })
        .where(eq(profilesTable.id, id));
      if (writer !== held.userId) {
        // A report the holder wrote since sits in their browser's session, which an ended claim would let read it again;
        // it joins the rest where the hand-over put them, a session no browser holds.
        await tx
          .update(reportsTable)
          .set({ sessionId: held.sessionId, updatedAt: now })
          .where(and(eq(reportsTable.profileId, id), eq(reportsTable.type, "natal"), ne(reportsTable.sessionId, held.sessionId)));
      }
      // A pair grant the claim brought goes back with the chart, so whoever claims its next send starts with none.
      await tx
        .update(relationshipParticipantsTable)
        .set({ accessRole: "owner" })
        .where(and(eq(relationshipParticipantsTable.profileId, id), eq(relationshipParticipantsTable.accessRole, "participant")));
      await tx
        .update(inviteTokensTable)
        .set({ handedBackAt: now })
        .where(and(
          eq(inviteTokensTable.profileId, id),
          eq(inviteTokensTable.kind, "send"),
          eq(inviteTokensTable.claimedByUserId, claimer),
          isNull(inviteTokensTable.handedBackAt),
        ));
      // Sharing it was the claimer's word as its subject, which Not me takes back, so their grants and waiting links end now.
      await tx
        .update(profileSharesTable)
        .set({ revokedAt: now })
        .where(and(
          eq(profileSharesTable.profileId, id),
          eq(profileSharesTable.ownerUserId, claimer),
          isNull(profileSharesTable.revokedAt),
        ));
      await tx
        .update(inviteTokensTable)
        .set({ revokedAt: now, expiresAt: now })
        .where(and(
          eq(inviteTokensTable.profileId, id),
          eq(inviteTokensTable.kind, "share"),
          eq(inviteTokensTable.createdByUserId, claimer),
          isNull(inviteTokensTable.claimedAt),
          isNull(inviteTokensTable.revokedAt),
        ));
      return verdict;
    });

    if (outcome === "not_claimed") {
      return res.status(409).json({ error: "not_claimed", message: "You had this report written, so there's no one to hand it back to." });
    }
    if (outcome === "not_found") {
      return res.status(404).json({ error: "not_found", message: "Profile not found" });
    }
    return res.json({ profileId: id });
  } catch (err) {
    req.log.error({ err }, "Failed to hand back");
    return res.status(500).json({ error: "internal_error", message: "Failed to hand back" });
  }
});

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const WINDOWS = new Set([0, 60, 180, 720]);

type PassCandidate = { status: string; interpretation: unknown; createdAt: Date };

/**
 * The one report a birth-time change passes (MB-170): the newest complete
 * natal report, when the new chart can say more about it, because its text
 * was written under another horizon or the time itself changed. The older
 * complete ones are left as written, to read as outdated and offer
 * Regenerate, so a profile with many reports still takes one pass and one
 * write. Of two made in the same millisecond the first is kept, so a query
 * ordered to the microsecond settles which is newer.
 */
export function reportToPass<R extends PassCandidate>(
  reports: readonly R[],
  horizon: HorizonStatus,
  unchanged: boolean,
): R | null {
  let newest: R | null = null;
  for (const r of reports) {
    if (r.status !== "complete" || !r.interpretation) continue;
    if (!newest || r.createdAt > newest.createdAt) newest = r;
  }
  if (!newest) return null;
  const written = (newest.interpretation as { meta?: { horizon?: string } }).meta?.horizon;
  return written !== horizon || !unchanged ? newest : null;
}

/**
 * PATCH /profiles/:id/birth-time — add or correct the birth time and run
 * the horizon pass on the newest complete natal report of the profile
 * (ADR-35, MB-170). The owner, or the person who claimed the profile as
 * their own, may do this; anyone else sees 404. Dedupe keys on time and
 * window together, so the same answer twice is a no-op unless the newest
 * report is still blind.
 */
router.patch("/profiles/:id/birth-time", async (req, res) => {
  const { id } = req.params;
  const body = UpdateProfileBirthTimeBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json(validationFailure(body.error));
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
      .where(and(eq(reportsTable.profileId, profile.id), eq(reportsTable.type, "natal")))
      .orderBy(desc(reportsTable.createdAt), desc(reportsTable.id));
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

    const unchanged = profile.birthTime === birthTime && profile.birthTimeWindowMinutes === birthTimeWindowMinutes;
    const pass = hasHorizon(chart) ? reportToPass(reports, chart.horizon.status, unchanged) : null;
    // MB-159 provisional: one write for the pass, held before the time is saved. A change refused here saves nothing, so
    // the newest report never contradicts its chart; the older ones are outdated by design and offer Regenerate (MB-170).
    if (!(await holdWrites(req, res, pass ? 1 : 0))) return;

    await db.update(profilesTable)
      .set({ birthTime, birthTimeWindowMinutes, chartData: chart as unknown as object, updatedAt: new Date() })
      .where(eq(profilesTable.id, profile.id));

    if (pass) {
      runHorizonPass({
        reportId: pass.id,
        profileId: profile.id,
        name: profile.name,
        previous: { birthTime: profile.birthTime, birthTimeWindowMinutes: profile.birthTimeWindowMinutes, chart: previousChart },
        chart,
      }).catch((err) => req.log.error({ err, reportId: pass.id }, "horizon pass crashed"));
    }

    return res.status(202).json({ profileId: profile.id, horizon: chart.horizon.status, reportIds: pass ? [pass.id] : [] });
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
    return res.status(400).json(validationFailure(parsed.error));
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
