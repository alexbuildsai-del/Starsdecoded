import { Router } from "express";
import { randomUUID } from "crypto";
import { and, eq, ne, inArray, asc, count, or } from "drizzle-orm";
import {
  db,
  profilesTable,
  reportsTable,
  reportRevisionsTable,
  relationshipsTable,
  relationshipParticipantsTable,
} from "@workspace/db";
import {
  CreateReportBody, DeleteReportParams, GetReportParams, GetReportStatusParams,
  UpdateReportWorkbookBody, UpdateReportWorkbookParams,
} from "@workspace/api-zod";
import { calculateNatalChart, type NatalChartData } from "../lib/chartCalculation.js";
import { generateInterpretation, type SectionFrame } from "../lib/aiInterpretation.js";
import { SECTION_IDS } from "../prompts/index.js";
import { PAIR_PROMPT_VERSION, pairSectionIds } from "../prompts/pair/index.js";
import type { Lens } from "../lib/pairBrief.js";
import { chartForProfile, resolveOrCreateProfile } from "../lib/profiles.js";
import {
  canReadProfile,
  giverIdOf,
  isSelfFor,
  natalReportAccess,
  openInvitesByProfile,
  openInvitesByRelationship,
  ownsRelationship,
  pairReadable,
  pairSendStateFor,
  sendStateFor,
  viewerRelationshipIds,
  type Access,
  type PairPerson,
  type SendState,
  type Viewer,
} from "../lib/access.js";
import { firstNameOf } from "../lib/names.js";
import { consumeCredit, refundCredit } from "../lib/credits.js";
import { failureCodeOf, failureReasonOf } from "../lib/failureReasons.js";
import { shouldDeleteProfile } from "../lib/deletion.js";
import { logger } from "../lib/logger.js";

const router = Router();

type ReportRow = typeof reportsTable.$inferSelect;
type ProfileRow = typeof profilesTable.$inferSelect;
type RelationshipRow = typeof relationshipsTable.$inferSelect;
type PartRow = { rp: typeof relationshipParticipantsTable.$inferSelect; profile: ProfileRow };

/**
 * The section keys a report of this type writes, so the status can say which
 * have landed. A blind natal report never writes the house readings (ADR-34),
 * so its status does not wait for them; a compatibility report writes the
 * eight sections of its lens (ADR-63).
 */
export function sectionIdsFor(type: string, horizon?: string, lens?: string): readonly string[] {
  if (type === "compatibility") return pairSectionIds((lens ?? "partners") as Lens);
  return horizon === "unknown" ? SECTION_IDS.filter((id) => id !== "houses") : SECTION_IDS;
}

/**
 * Every body's position on the entered date and time at offset zero, from
 * one local call and nothing stored, so the orrery can run from the birth
 * day before the chart exists (ADR-47). Null rather than a failed poll.
 */
export function provisionalFor(p: Pick<ProfileRow, "birthDate" | "birthTime" | "latitude" | "longitude">): { bodies: Record<string, { absoluteDegree: number; retrograde: boolean }> } | null {
  try {
    const chart = calculateNatalChart(p.birthDate, p.birthTime, p.latitude, p.longitude, 0, 0);
    const bodies: Record<string, { absoluteDegree: number; retrograde: boolean }> = {};
    for (const [name, body] of Object.entries(chart.planets)) {
      if (!Number.isFinite(body.absoluteDegree)) return null;
      bodies[name] = { absoluteDegree: body.absoluteDegree, retrograde: body.retrograde };
    }
    return { bodies };
  } catch {
    return null;
  }
}

/** Each pair's two people in position order, with their profiles and their grants. */
async function partsOf(relationshipIds: string[]): Promise<Map<string, PartRow[]>> {
  const byRel = new Map<string, PartRow[]>();
  if (!relationshipIds.length) return byRel;
  const rows = await db
    .select({ rp: relationshipParticipantsTable, profile: profilesTable })
    .from(relationshipParticipantsTable)
    .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
    .where(inArray(relationshipParticipantsTable.relationshipId, relationshipIds))
    .orderBy(asc(relationshipParticipantsTable.position));
  for (const row of rows) byRel.set(row.rp.relationshipId, [...(byRel.get(row.rp.relationshipId) ?? []), row]);
  return byRel;
}

function pairPerson({ rp, profile }: PartRow): PairPerson {
  return { ...profile, profileId: profile.id, accessRole: rp.accessRole };
}

type Loaded = {
  report: ReportRow;
  profile: ProfileRow;
  relationship: RelationshipRow | null;
  parts: PartRow[];
  /** Null when the viewer may not open it. */
  access: Access | null;
  /** A pair's maker, who keeps it whether it reads or has closed. */
  maker: boolean;
};

/**
 * A report with the viewer's standing on it: a natal report through its
 * profile (MB-84), a pair through the pair reading. The routes answer every
 * refusal with 404, so no id is ever confirmed.
 */
async function loadReport(viewer: Viewer, id: string): Promise<Loaded | null> {
  const rows = await db
    .select({ report: reportsTable, profile: profilesTable })
    .from(reportsTable)
    .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
    .where(eq(reportsTable.id, id))
    .limit(1);
  if (!rows.length) return null;
  const { report, profile } = rows[0];
  if (report.type === "compatibility" && report.relationshipId) {
    const [relationship] = await db.select().from(relationshipsTable).where(eq(relationshipsTable.id, report.relationshipId)).limit(1);
    if (!relationship) return null;
    const parts = (await partsOf([relationship.id])).get(relationship.id) ?? [];
    const maker = ownsRelationship(viewer, relationship);
    // MB-103 provisional
    const { readable } = pairReadable(viewer, relationship, parts.map(pairPerson));
    return { report, profile, relationship, parts, maker, access: readable ? (maker ? "owner" : "participant") : null };
  }
  if (report.type !== "natal") return null;
  return { report, profile, relationship: null, parts: [], maker: false, access: natalReportAccess(viewer, profile, report) };
}

/** The two people of a pair, each with the natal report it was written from, marked from the viewer's side (reading 16). */
function participantsOut(viewer: Viewer, report: ReportRow, parts: PartRow[]) {
  const compute = (report.computeData ?? {}) as { reportAId?: string; reportBId?: string };
  return parts.map((p, i) => ({
    id: p.profile.id,
    reportId: (i === 0 ? compute.reportAId : compute.reportBId) ?? "",
    name: p.profile.name,
    role: p.rp.role,
    birthDate: p.profile.birthDate,
    birthTime: p.profile.birthTime,
    birthTimeWindowMinutes: p.profile.birthTimeWindowMinutes ?? 0,
    birthPlace: p.profile.birthPlace,
    latitude: p.profile.latitude,
    longitude: p.profile.longitude,
    isSelf: isSelfFor(viewer, p.profile),
    chartData: (p.profile.chartData as NatalChartData | null) ?? null,
  }));
}

/** Send to {B} on a pair its maker can read, from their own side of it to the other. */
// MB-103 provisional
function pairSend(viewer: Viewer, report: { status: string; relationshipId: string | null }, parts: PartRow[], openInvite: unknown): SendState | null {
  const own = parts.filter((p) => isSelfFor(viewer, p.profile));
  const other = parts.find((p) => !own.includes(p));
  if (own.length !== 1 || !other || !report.relationshipId) return null;
  return pairSendStateFor(viewer, own[0].profile.id, {
    profileId: other.profile.id,
    name: other.profile.name,
    claimedByUserId: other.profile.claimedByUserId,
    accessRole: other.rp.accessRole,
    relationshipId: report.relationshipId,
  }, openInvite, report);
}

/** One lookup per person per request, however many of their reports a list holds. */
function nameCache(): (userId: string | null) => Promise<string | null> {
  const seen = new Map<string, Promise<string | null>>();
  return (userId) => {
    if (!userId) return Promise.resolve(null);
    let name = seen.get(userId);
    if (!name) {
      name = firstNameOf(userId);
      seen.set(userId, name);
    }
    return name;
  };
}

/** Whoever sent the viewer this report and still reads it: a natal report's giver, a pair's sender (ADR-139). */
function senderIdOf(viewer: Viewer, found: Pick<Loaded, "profile" | "relationship" | "access">): string | null {
  if (found.access === "participant") return found.relationship?.userId ?? null;
  return found.relationship ? null : giverIdOf(viewer, found.profile);
}

/** Send on one report, with the one invite lookup it needs; only its writer or a pair's maker sends. */
async function sendOn(viewer: Viewer, found: Loaded): Promise<SendState | null> {
  if (!viewer.userId || found.access !== "owner") return null;
  if (found.relationship) {
    const invites = await openInvitesByRelationship([found.relationship.id]);
    return pairSend(viewer, found.report, found.parts, invites.get(found.relationship.id));
  }
  const invites = await openInvitesByProfile([found.profile.id]);
  return sendStateFor(viewer, found.profile, found.report, invites.get(found.profile.id));
}

function pairName(participants: Array<{ name: string }>): string {
  return participants.length === 2 ? `${participants[0].name} & ${participants[1].name}` : "Compatibility";
}

// List the viewer's reports: natal and compatibility, never the retired
// synastry rows (MB-58). Natal: signed in, the reports they wrote and the ones
// sent to them (MB-84); a session, the reports it asked for. Compatibility:
// the pairs they made and the ones sent to them, by the pair reading.
router.get("/reports", async (req, res) => {
  try {
    const viewer: Viewer = { userId: req.userId, sessionId: req.sessionId };
    const natalOwnerWhere = viewer.userId
      ? or(eq(profilesTable.userId, viewer.userId), eq(profilesTable.claimedByUserId, viewer.userId))
      : eq(reportsTable.sessionId, viewer.sessionId);

    const natalWhere = and(eq(reportsTable.type, "natal"), natalOwnerWhere);

    const natalRows = await db
      .select({
        id: reportsTable.id,
        status: reportsTable.status,
        type: reportsTable.type,
        sessionId: reportsTable.sessionId,
        interpretation: reportsTable.interpretation,
        failureCode: reportsTable.failureCode,
        createdAt: reportsTable.createdAt,
        profile: profilesTable,
      })
      .from(reportsTable)
      .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
      .where(natalWhere);

    const nameOf = nameCache();
    const natal = natalRows.flatMap((r) => {
      const access = natalReportAccess(viewer, r.profile, r);
      return access ? [{ ...r, access }] : [];
    });
    const natalInvites = viewer.userId
      ? await openInvitesByProfile(natal.filter((r) => r.access === "owner").map((r) => r.profile.id))
      : new Map<string, string>();

    type ReportSummaryOut = {
      id: string;
      kind: "natal" | "compatibility";
      name: string;
      birthDate?: string;
      birthTime?: string;
      birthPlace?: string;
      status: string;
      horizon: string | null;
      lens: string | null;
      archetypeName: string | null;
      sunSign: string | null;
      moonSign: string | null;
      risingSign: string | null;
      profileId: string | null;
      relationshipId: string | null;
      relationshipType: string | null;
      participants: Array<{
        id: string;
        name: string;
        sunSign: string | null;
        moonSign: string | null;
        risingSign: string | null;
      }>;
      createdAt: string;
      failureReason: { code: string; line: string } | null;
      access: Access;
      send: SendState | null;
      sharedBy: string | null;
      stoppedBy: string | null;
    };

    const natalSummaries: ReportSummaryOut[] = await Promise.all(natal.map(async (r) => ({
      id: r.id,
      kind: "natal" as const,
      name: r.profile.name,
      birthDate: r.profile.birthDate,
      birthTime: r.profile.birthTime,
      birthPlace: r.profile.birthPlace,
      status: r.status,
      horizon: (r.profile.chartData as any)?.horizon?.status ?? null,
      lens: null,
      archetypeName: (r.interpretation as any)?.overview?.headline ?? null,
      sunSign: (r.profile.chartData as any)?.planets?.sun?.sign ?? null,
      moonSign: (r.profile.chartData as any)?.planets?.moon?.sign ?? null,
      risingSign: (r.profile.chartData as any)?.angles?.ascendant?.sign ?? null,
      profileId: r.profile.id,
      relationshipId: null,
      relationshipType: null,
      participants: [] as Array<{
        id: string;
        name: string;
        sunSign: string | null;
        moonSign: string | null;
        risingSign: string | null;
      }>,
      createdAt: r.createdAt.toISOString(),
      failureReason: failureReasonOf(r.failureCode),
      access: r.access,
      send: sendStateFor(viewer, r.profile, r, natalInvites.get(r.profile.id)),
      sharedBy: await nameOf(giverIdOf(viewer, r.profile)),
      stoppedBy: null,
    })));

    const { owned, participant } = await viewerRelationshipIds(viewer);
    const visibleRelIds = Array.from(new Set([...owned, ...participant]));

    let pairSummaries: ReportSummaryOut[] = [];
    if (visibleRelIds.length > 0) {
      const synRows = await db
        .select({
          id: reportsTable.id,
          status: reportsTable.status,
          interpretation: reportsTable.interpretation,
          failureCode: reportsTable.failureCode,
          createdAt: reportsTable.createdAt,
          relationshipId: reportsTable.relationshipId,
          relType: relationshipsTable.type,
          relUserId: relationshipsTable.userId,
          relSessionId: relationshipsTable.sessionId,
        })
        .from(reportsTable)
        .innerJoin(relationshipsTable, eq(reportsTable.relationshipId, relationshipsTable.id))
        .where(
          and(
            eq(reportsTable.type, "compatibility"),
            inArray(reportsTable.relationshipId, visibleRelIds),
          ),
        );

      const partsByRel = await partsOf(Array.from(new Set(synRows.map((r) => r.relationshipId).filter((id): id is string => !!id))));

      // MB-65 provisional: a report written before p2 cannot render on the seven-chapter page, so it is listed nowhere.
      const current = synRows.filter((r) => r.status !== "complete" || (r.interpretation as { meta?: { promptVersion?: string } } | null)?.meta?.promptVersion === PAIR_PROMPT_VERSION);
      // MB-103 provisional: a pair the viewer made stays listed once closed, naming who stopped sharing; one sent to them goes when its sender stops.
      const pairs = current.flatMap((r) => {
        const rel = { userId: r.relUserId, sessionId: r.relSessionId };
        const parts = (r.relationshipId && partsByRel.get(r.relationshipId)) || [];
        const reading = pairReadable(viewer, rel, parts.map(pairPerson));
        if (!reading.readable && !reading.stoppedBy) return [];
        return [{ r, rel, parts, reading, maker: ownsRelationship(viewer, rel) }];
      });
      const pairInvites = await openInvitesByRelationship(
        pairs.filter((p) => p.maker && p.reading.readable && p.r.relationshipId).map((p) => p.r.relationshipId as string),
      );

      pairSummaries = await Promise.all(pairs.map(async ({ r, rel, parts, reading, maker }): Promise<ReportSummaryOut> => {
        const participants = parts.map((p) => {
          // A closed pair keeps the names its maker typed but no longer shows the chart of whoever stopped sharing (ADR-139).
          const chart = reading.readable || canReadProfile(viewer, p.profile) ? (p.profile.chartData as any) : null;
          return {
            id: p.profile.id,
            name: p.profile.name,
            sunSign: chart?.planets?.sun?.sign ?? null,
            moonSign: chart?.planets?.moon?.sign ?? null,
            risingSign: chart?.angles?.ascendant?.sign ?? null,
          };
        });
        return {
          id: r.id,
          kind: "compatibility",
          name: pairName(participants),
          status: r.status,
          horizon: null,
          lens: r.relType ?? null,
          archetypeName: null,
          sunSign: null,
          moonSign: null,
          risingSign: null,
          profileId: null,
          relationshipId: r.relationshipId,
          relationshipType: r.relType ?? null,
          participants,
          createdAt: r.createdAt.toISOString(),
          failureReason: failureReasonOf(r.failureCode),
          access: maker ? "owner" : "participant",
          send: maker && reading.readable ? pairSend(viewer, r, parts, r.relationshipId ? pairInvites.get(r.relationshipId) : undefined) : null,
          sharedBy: maker ? null : await nameOf(rel.userId),
          stoppedBy: reading.stoppedBy,
        };
      }));
    }

    const summaries = [...natalSummaries, ...pairSummaries].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );

    // Strip undefined birth fields so the JSON response omits them for compatibility rows.
    const out = summaries.map((s) => {
      const obj: Record<string, unknown> = { ...s };
      if (obj.birthDate === undefined) delete obj.birthDate;
      if (obj.birthTime === undefined) delete obj.birthTime;
      if (obj.birthPlace === undefined) delete obj.birthPlace;
      return obj;
    });

    res.json(out);
  } catch (err) {
    req.log.error({ err }, "Failed to list reports");
    res.status(500).json({ error: "internal_error", message: "Failed to list reports" });
  }
});

// Create a new natal report. Two-step pipeline: resolve-or-create the
// profile (which caches its chart), then create the report referencing it.
router.post("/reports", async (req, res) => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: parsed.error.message });
  }

  const { name, birthDate, birthTime, birthPlace, latitude, longitude, timezoneOffset, timezone, birthTimeWindowMinutes, isForSelf } = parsed.data;
  const id = randomUUID();

  try {
    const profile = await resolveOrCreateProfile(
      req.sessionId,
      req.userId ?? null,
      { name, birthDate, birthTime, birthPlace, latitude, longitude, timezoneOffset, timezone, birthTimeWindowMinutes },
      isForSelf ?? false,
    );

    await db.insert(reportsTable).values({
      id,
      profileId: profile.id,
      sessionId: req.sessionId,
      type: "natal",
      // Chart is already cached on the profile, so we can skip "computing"
      // and go straight to interpreting.
      status: profile.chartData ? "interpreting" : "pending",
    });

    // Soft-consume one credit for signed-in users. Non-blocking — missing credits are just logged.
    if (req.userId) {
      consumeCredit(req.userId, id).catch((err) => {
        req.log.error({ err, id }, "Failed to consume credit");
      });
    }

    // Fire-and-forget interpretation
    generateReport(id, profile.id, name, profile.chartData as NatalChartData | null).catch((err) => {
      req.log.error({ err, id }, "Report generation failed");
    });

    return res.status(201).json({
      id,
      kind: "natal",
      name: profile.name,
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      birthPlace: profile.birthPlace,
      status: profile.chartData ? "interpreting" : "pending",
      horizon: (profile.chartData as any)?.horizon?.status ?? null,
      lens: null,
      archetypeName: null,
      sunSign: (profile.chartData as any)?.planets?.sun?.sign ?? null,
      moonSign: (profile.chartData as any)?.planets?.moon?.sign ?? null,
      risingSign: (profile.chartData as any)?.angles?.ascendant?.sign ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create report");
    return res.status(500).json({ error: "internal_error", message: "Failed to create report" });
  }
});

// Returns true if the current viewer owns the given report+profile pair.
// Signed-in: they own profiles where profile.userId === their userId.
// Anonymous: they own reports tied to their session cookie.
function viewerOwns(req: { userId: string | null; sessionId: string }, report: { sessionId: string }, profile: { userId: string | null }): boolean {
  if (req.userId) return profile.userId === req.userId;
  return report.sessionId === req.sessionId;
}

// Get a report by ID (joined with its profile for birth data + chart)
router.get("/reports/:id", async (req, res) => {
  const parsed = GetReportParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: "Invalid ID" });
  }

  try {
    // 404 rather than 403 in every refused case, so no id is ever confirmed.
    const found = await loadReport(req, parsed.data.id);
    if (!found?.access) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const { report: r, profile: p, relationship, access } = found;
    const participants = r.type === "compatibility" ? participantsOut(req, r, found.parts) : null;
    const [revisions, send, giverName] = await Promise.all([
      db
        .select({ id: reportRevisionsTable.id, reason: reportRevisionsTable.reason, createdAt: reportRevisionsTable.createdAt })
        .from(reportRevisionsTable)
        .where(eq(reportRevisionsTable.reportId, r.id))
        .orderBy(asc(reportRevisionsTable.createdAt)),
      sendOn(req, found),
      nameCache()(senderIdOf(req, found)),
    ]);
    return res.json({
      id: r.id,
      name: participants ? pairName(participants) : p.name,
      birthDate: p.birthDate,
      birthTime: p.birthTime,
      birthPlace: p.birthPlace,
      latitude: p.latitude,
      longitude: p.longitude,
      timezoneOffset: p.timezoneOffset,
      timezone: p.timezone ?? null,
      birthTimeWindowMinutes: p.birthTimeWindowMinutes,
      profileId: r.type === "natal" ? p.id : null,
      type: r.type,
      lens: relationship?.type ?? null,
      participants,
      horizonPasses: r.horizonPasses,
      revisions: revisions.map((v) => ({ id: v.id, reason: v.reason, createdAt: v.createdAt.toISOString() })),
      status: r.status,
      chartData: p.chartData ?? null,
      interpretation: r.interpretation ?? null,
      workbook: (r.workbook ?? {}) as Record<string, string>,
      // The internal message stays in the database; the customer reads the coded line (ADR-84).
      errorMessage: null,
      failureReason: failureReasonOf(r.failureCode),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      access,
      send,
      giverName,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get report");
    return res.status(500).json({ error: "internal_error", message: "Failed to get report" });
  }
});

// Get report generation status — also ownership-checked so the polling
// endpoint can't be used as an existence oracle for arbitrary IDs.
router.get("/reports/:id/status", async (req, res) => {
  const parsed = GetReportStatusParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: "Invalid ID" });
  }

  try {
    const found = await loadReport(req, parsed.data.id);
    if (!found?.access) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const { report: r, profile: p } = found;

    const written = (r.interpretation ?? {}) as Record<string, unknown>;
    return res.json({
      id: r.id,
      status: r.status,
      errorMessage: null,
      failureReason: failureReasonOf(r.failureCode),
      // The chart is what the page opens on, so the client stops waiting the
      // moment it exists rather than when the last section lands (ADR-25).
      chartReady: p.chartData != null,
      // Real progress is the client's to count from `sections` (ADR-47); the
      // orrery runs from these until the chart is stored.
      provisional: p.chartData == null && r.type === "natal" ? provisionalFor(p) : null,
      sections: Object.fromEntries(sectionIdsFor(r.type, (written.meta as { horizon?: string } | undefined)?.horizon, (written.meta as { lens?: string } | undefined)?.lens ?? (r.computeData as { lens?: string } | null)?.lens).map((id) => [id, id in written ? "done" : "pending"])),
      interpretation: r.interpretation ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get report status");
    return res.status(500).json({ error: "internal_error", message: "Failed to get report status" });
  }
});


/**
 * The reader's workbook. A tick is one shallow merge, so a slow connection
 * cannot lose the rest of the page's ticks by overwriting them.
 */
const WORKBOOK_KEY = /^[a-z][a-zA-Z]*(\.[a-zA-Z]+)+\.\d+$/;

router.patch("/reports/:id/workbook", async (req, res) => {
  const params = UpdateReportWorkbookParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: "validation_error", message: "Invalid ID" });
  }
  const body = UpdateReportWorkbookBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "validation_error", message: body.error.message });
  }
  const patch = body.data as Record<string, string | null>;
  const keys = Object.keys(patch);
  if (keys.length === 0 || keys.length > 200) {
    return res.status(400).json({ error: "validation_error", message: "A workbook patch carries 1 to 200 items" });
  }
  const badKey = keys.find((k) => !WORKBOOK_KEY.test(k));
  if (badKey) {
    return res.status(400).json({ error: "validation_error", message: `Not a workbook item key: ${badKey}` });
  }

  try {
    const found = await loadReport(req, params.data.id);
    if (!found?.access) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const { report: r } = found;

    const merged = { ...((r.workbook ?? {}) as Record<string, string>) };
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete merged[key];
      else merged[key] = value;
    }
    await db
      .update(reportsTable)
      .set({ workbook: merged, updatedAt: new Date() })
      .where(eq(reportsTable.id, r.id));
    return res.json(merged);
  } catch (err) {
    req.log.error({ err }, "Failed to update report workbook");
    return res.status(500).json({ error: "internal_error", message: "Failed to update report workbook" });
  }
});

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Hands a person's chart to the one it was sent to, as Stop sharing does in
 * profiles.ts: the row and its natal reports move to their account and to a
 * session no browser holds, so neither the giver's account nor a cookie left
 * in their browser reaches it again (ADR-139). The writer's own-chart mark
 * stays behind; the subject's is claimed_as_self.
 */
async function handOver(tx: Tx, profileId: string, toUserId: string): Promise<void> {
  const sessionId = randomUUID();
  const now = new Date();
  await tx.update(profilesTable).set({ userId: toUserId, sessionId, isSelf: false, updatedAt: now }).where(eq(profilesTable.id, profileId));
  await tx.update(reportsTable).set({ sessionId, updatedAt: now })
    .where(and(eq(reportsTable.profileId, profileId), eq(reportsTable.type, "natal")));
}

// Regenerate an existing report's interpretation in place. Reuses cached
// chartData from the profile when available; falls back to a full recompute.
//
// Abuse guard: per-report cooldown to prevent tight-loop LLM spam.
const REGENERATE_COOLDOWN_MS = 60_000;
const lastRegenerateAt = new Map<string, number>();

// Delete a report its holder deletes: a natal report by whoever wrote it or
// the person it was sent to, a pair by its maker. A report mid-generation is
// deleted too; generateReport tolerates its row vanishing. A compatibility
// report goes on its own (MB-9, MB-32's 409 gone). The orphaned profile goes
// with a natal report (MB-32 provisional), which cascades invite_tokens;
// credits.used_for_report_id nulls out so the payment record survives.
router.delete("/reports/:id", async (req, res) => {
  const parsed = DeleteReportParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: "Invalid ID" });
  }
  try {
    const found = await loadReport(req, parsed.data.id);
    if (!found) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const { report: r, profile: p } = found;
    if (r.type === "compatibility") {
      // MB-103 provisional: a closed pair is still its maker's to delete; the other of its two only reads it.
      if (!found.maker) {
        return res.status(404).json({ error: "not_found", message: "Report not found" });
      }
      await db.delete(reportsTable).where(eq(reportsTable.id, r.id));
      return res.status(204).end();
    }
    if (!found.access) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }

    // A claimed report is its subject's (ADR-139), so its giver's Delete lets
    // go of it rather than taking it from them.
    const claimer = p.claimedByUserId;
    if (found.access === "owner" && claimer) {
      await db.transaction((tx) => handOver(tx, p.id, claimer));
      return res.status(204).end();
    }

    await db.transaction(async (tx) => {
      const [{ value: otherReportCount }] = await tx
        .select({ value: count() })
        .from(reportsTable)
        .where(and(eq(reportsTable.profileId, p.id), ne(reportsTable.id, r.id)));
      const [{ value: relationshipParticipantCount }] = await tx
        .select({ value: count() })
        .from(relationshipParticipantsTable)
        .where(eq(relationshipParticipantsTable.profileId, p.id));

      await tx.delete(reportsTable).where(eq(reportsTable.id, r.id));
      if (shouldDeleteProfile({ otherReportCount, relationshipParticipantCount })) {
        await tx.delete(profilesTable).where(eq(profilesTable.id, p.id));
      } else if (found.access === "claimed" && req.userId && p.userId !== req.userId) {
        // Deleting what was sent to you withdraws what is left of it from its
        // giver too, so no pair made from it stays open to them (MB-103 provisional).
        await handOver(tx, p.id, req.userId);
      }
    });
    lastRegenerateAt.delete(r.id);
    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete report");
    return res.status(500).json({ error: "internal_error", message: "Failed to delete report" });
  }
});

router.post("/reports/:id/regenerate", async (req, res) => {
  const parsed = GetReportParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: "Invalid ID" });
  }
  try {
    const rows = await db
      .select({ report: reportsTable, profile: profilesTable })
      .from(reportsTable)
      .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
      .where(eq(reportsTable.id, parsed.data.id))
      .limit(1);
    if (!rows.length) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const { report: r, profile: p } = rows[0];
    if (!viewerOwns(req, r, p) || r.type !== "natal") {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    if (r.status === "interpreting" || r.status === "computing" || r.status === "pending" || r.status === "revising") {
      return res
        .status(409)
        .json({ error: "in_progress", message: "Report is already being generated", status: r.status });
    }
    const last = lastRegenerateAt.get(r.id) ?? 0;
    const elapsed = Date.now() - last;
    if (elapsed < REGENERATE_COOLDOWN_MS) {
      const retryAfter = Math.ceil((REGENERATE_COOLDOWN_MS - elapsed) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res
        .status(429)
        .json({ error: "rate_limited", message: `Please wait ${retryAfter}s before regenerating again` });
    }
    lastRegenerateAt.set(r.id, Date.now());
    await db
      .update(reportsTable)
      .set({ status: "interpreting", errorMessage: null, failureCode: null, updatedAt: new Date() })
      .where(eq(reportsTable.id, r.id));
    (async () => {
      try {
        let chartData: NatalChartData;
        if (p.chartData) {
          chartData = p.chartData as NatalChartData;
        } else {
          chartData = chartForProfile(p);
          await db
            .update(profilesTable)
            .set({ chartData: chartData as unknown as object, updatedAt: new Date() })
            .where(eq(profilesTable.id, p.id));
        }
        const interpretation = await generateInterpretation(chartData, p.name, {
          onSection: streamInto(r.id),
          reportId: r.id,
        });
        await db
          .update(reportsTable)
          .set({ interpretation, status: "complete", updatedAt: new Date() })
          .where(eq(reportsTable.id, r.id));
      } catch (err) {
        await failReport(r.id, err);
      }
    })().catch((err) => req.log.error({ err, id: r.id }, "Regenerate failed"));
    return res.status(202).json({ id: r.id, status: "interpreting" });
  } catch (err) {
    req.log.error({ err }, "Failed to regenerate report");
    return res.status(500).json({ error: "internal_error", message: "Failed to regenerate report" });
  }
});

/**
 * Writes each frame to `interpretation` as it lands, so the page can render a
 * chapter the moment its call finishes. Writes are chained rather than fired in
 * parallel, because each one rewrites the whole jsonb and two at once would
 * lose a section. The status stays "interpreting" until the last frame lands.
 */
export function streamInto(id: string): (frame: SectionFrame) => Promise<void> {
  let partial: Record<string, unknown> = {};
  let chain: Promise<void> = Promise.resolve();
  return (frame) => {
    partial = { ...partial, ...frame.patch };
    const snapshot = partial;
    chain = chain.then(async () => {
      await db
        .update(reportsTable)
        .set({ interpretation: snapshot, updatedAt: new Date() })
        .where(eq(reportsTable.id, id));
    });
    return chain;
  };
}

// Async report generation. Skips chart computation when a cached chartData
// is available from the profile.
async function generateReport(
  id: string,
  profileId: string,
  name: string,
  cachedChart: NatalChartData | null,
) {
  try {
    let chartData: NatalChartData;
    if (cachedChart) {
      chartData = cachedChart;
    } else {
      await db
        .update(reportsTable)
        .set({ status: "computing", updatedAt: new Date() })
        .where(eq(reportsTable.id, id));

      const profile = await db.select().from(profilesTable).where(eq(profilesTable.id, profileId)).limit(1);
      const p = profile[0];
      // The report (and its profile) may have been deleted while pending.
      if (!p) return;
      chartData = chartForProfile(p);

      await db
        .update(profilesTable)
        .set({ chartData: chartData as unknown as object, updatedAt: new Date() })
        .where(eq(profilesTable.id, profileId));

      await db
        .update(reportsTable)
        .set({ status: "interpreting", updatedAt: new Date() })
        .where(eq(reportsTable.id, id));
    }

    const interpretation = await generateInterpretation(chartData, name, {
      onSection: streamInto(id),
      reportId: id,
    });

    await db
      .update(reportsTable)
      .set({
        interpretation,
        status: "complete",
        updatedAt: new Date(),
      })
      .where(eq(reportsTable.id, id));
  } catch (err) {
    await failReport(id, err);
  }
}

/**
 * A failed report stores its code beside the internal message, and the
 * credit it used goes back (ADR-84). Shared by the natal and the pair path.
 */
export async function failReport(id: string, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : "Unknown error";
  const code = failureCodeOf(err);
  await db
    .update(reportsTable)
    .set({ status: "failed", errorMessage: message, failureCode: code, updatedAt: new Date() })
    .where(eq(reportsTable.id, id));
  await refundCredit(id).catch((refundErr) => logger.error({ err: refundErr, id }, "refund after a failed report did not land"));
  logger.warn({ id, code, message }, "report failed");
}

export default router;
