import { Router } from "express";
import { randomUUID } from "crypto";
import { and, eq, ne, inArray, isNull, asc, count, or, sql } from "drizzle-orm";
import {
  db,
  inviteTokensTable,
  profileSharesTable,
  profilesTable,
  reportsTable,
  reportRevisionsTable,
  reportWorkbooksTable,
  relationshipsTable,
  relationshipParticipantsTable,
} from "@workspace/db";
import {
  CreateReportBody, DeleteReportParams, GetReportParams, GetReportStatusParams,
  UpdateReportWorkbookBody, UpdateReportWorkbookParams,
} from "@workspace/api-zod";
import { calculateNatalChart, type NatalChartData } from "../lib/chartCalculation.js";
import { PROMPT_VERSION, SectionError, generateInterpretation, type SectionFrame } from "../lib/aiInterpretation.js";
import { SECTION_IDS } from "../prompts/index.js";
import { pairSectionIds } from "../prompts/pair/index.js";
import type { Lens } from "../lib/pairBrief.js";
import { chartForProfile, resolveOrCreateProfile } from "../lib/profiles.js";
import {
  canReadProfile,
  giverIdOf,
  handedBackByProfile,
  isSelfFor,
  mayRegenerate,
  natalReportAccess,
  openInvitesByProfile,
  openInvitesByRelationship,
  ownsRelationship,
  pairReadable,
  pairSendStateFor,
  readerKey,
  sendStateFor,
  viewerRelationshipIds,
  type Access,
  type PairPerson,
  type ProfileHolders,
  type SendState,
  type Viewer,
} from "../lib/access.js";
import { grantShareBacksOn, sharedProfileIds } from "../lib/shares.js";
import { firstNameOf } from "../lib/names.js";
import { PIN_LIMIT, isWorkbookKey, pairListed, patchWorkbook, workbookOf, type Workbook, type WorkbookPatch } from "../lib/home.js";
import { hasCredit, noCredit, refundCredit, returnExpiredHolds, writeWithCredit } from "../lib/credits.js";
import { FINAL_LINE, failureCodeOf, failureReasonOf, isFinal } from "../lib/failureReasons.js";
import { shouldDeleteProfile } from "../lib/deletion.js";
import { logger } from "../lib/logger.js";
import { forgetTimeline } from "../lib/timelineReadings.js";
import { setupAfterReport } from "../lib/timelineSetup.js";
import { validationFailure } from "../lib/validation.js";

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

const NO_GRANTS: ReadonlySet<string> = new Set();

/** The charts shared with a signed-in viewer whose grants stand (ADR-235); a session holds none, so it asks nothing. */
function grantsOf(viewer: Viewer): Promise<ReadonlySet<string>> {
  return viewer.userId ? sharedProfileIds(viewer.userId) : Promise.resolve(NO_GRANTS);
}

/**
 * Who shared this chart with the viewer: whichever of its holders keeps it as
 * their own, which is the only chart a grant reads (ADR-235).
 */
export function sharerIdOf(profile: ProfileHolders & { isSelf: boolean; claimedAsSelf: boolean }): string | null {
  for (const id of [profile.claimedByUserId, profile.userId]) {
    if (id && isSelfFor({ userId: id, sessionId: "" }, profile)) return id;
  }
  return null;
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
 * profile (MB-84) or a grant of it (ADR-235), a pair through the pair reading.
 * The routes answer every refusal with 404, so no id is ever confirmed.
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
    const { readable } = pairReadable(viewer, relationship, parts.map(pairPerson), maker ? await grantsOf(viewer) : NO_GRANTS);
    return { report, profile, relationship, parts, maker, access: readable ? (maker ? "owner" : "participant") : null };
  }
  if (report.type !== "natal") return null;
  // A grant never outranks writing or holding the chart, so it is looked up only for a viewer who reads it no other way.
  const access = natalReportAccess(viewer, profile, report)
    ?? ((await grantsOf(viewer)).has(profile.id) ? natalReportAccess(viewer, profile, report, true) : null);
  return { report, profile, relationship: null, parts: [], maker: false, access };
}

type Rights = { send: boolean; delete: boolean; regenerate: boolean };

/**
 * What a reader may do with a report beyond reading it. A grant reads and
 * nothing more (ADR-235). Send is a natal report's writer's, or a pair's
 * maker's while it reads; Delete is whoever holds a natal report or made a
 * pair, closed or not; a rewrite is `mayRegenerate`'s (reading 10), and a
 * final report has none, its credit already back (ADR-313).
 */
export function rightsOf(
  viewer: Viewer,
  found: {
    report: { type: string; status: string; sessionId: string; failedTries?: number };
    profile: ProfileHolders;
    access: Access | null;
    maker: boolean;
  },
): Rights {
  const send = !!viewer.userId && found.access === "owner";
  if (found.report.type !== "natal") return { send, delete: found.maker, regenerate: false };
  return {
    send,
    delete: found.access === "owner" || found.access === "claimed",
    regenerate: mayRegenerate(viewer, found.profile, found.report) && !isFinal(found.report),
  };
}

/** What a natal report's text was written for, stamped whenever this file writes it (reading 9). */
type WrittenFor = { birthTime: string; birthTimeWindowMinutes: number; passes: number };

/**
 * The stamp lives in compute_data, which a natal report has no other use for.
 * It keeps the horizon passes the report had when written, since a pass
 * (horizonPass.ts) rewrites it for a new time without stamping it.
 */
export function writtenForStamp(profile: { birthTime: string; birthTimeWindowMinutes: number }, passes: number): { writtenFor: WrittenFor } {
  return { writtenFor: { birthTime: profile.birthTime, birthTimeWindowMinutes: profile.birthTimeWindowMinutes, passes } };
}

function writtenForOf(computeData: unknown): WrittenFor | null {
  const w = (computeData as { writtenFor?: Partial<WrittenFor> } | null)?.writtenFor;
  if (!w || typeof w.birthTime !== "string" || typeof w.birthTimeWindowMinutes !== "number" || typeof w.passes !== "number") return null;
  return { birthTime: w.birthTime, birthTimeWindowMinutes: w.birthTimeWindowMinutes, passes: w.passes };
}

function basisKey(moment: unknown, band: unknown): string | null {
  return typeof moment === "string" && moment ? `${moment}|${Number(band ?? 0)}` : null;
}

/** A chart's moment and band, which every birth-time change moves. */
export function chartKeyOf(chart: unknown): string | null {
  const c = chart as { datetimeUtc?: unknown; windowMinutes?: unknown } | null;
  return basisKey(c?.datetimeUtc, c?.windowMinutes);
}

/** One horizon pass as report_revisions keeps it: the report it amended, when it began, the chart it replaced (ADR-35). */
export type PassRecord = { reportId: string; at: Date; replaced: string | null };

/**
 * Reading 9: a complete natal report whose written horizon or birth time is
 * not its profile's now. The stamp answers on its own; a report a pass has
 * amended since its stamp, or one written before stamps, is read from
 * `passes`, every pass on the profile's natal reports, oldest first.
 */
export function isOutdated(
  report: { id: string; type: string; status: string; interpretation: unknown; computeData: unknown; horizonPasses: number; createdAt: Date },
  profile: { birthTime: string; birthTimeWindowMinutes: number; chartData: unknown },
  passes: readonly PassRecord[],
): boolean {
  if (report.type !== "natal" || report.status !== "complete") return false;
  const written = (report.interpretation as { meta?: { horizon?: unknown } } | null)?.meta?.horizon;
  const now = (profile.chartData as { horizon?: { status?: unknown } } | null)?.horizon?.status;
  if (typeof written === "string" && typeof now === "string" && written !== now) return true;
  const stamp = writtenForOf(report.computeData);
  if (stamp && stamp.passes === report.horizonPasses) {
    return stamp.birthTime !== profile.birthTime || stamp.birthTimeWindowMinutes !== profile.birthTimeWindowMinutes;
  }
  return changedSince(report, chartKeyOf(profile.chartData), passes);
}

/**
 * Whether a birth-time change came after the report last took one. A change
 * leaves one run of passes that replaced the same chart: every complete
 * report at once before MB-170, the newest alone since. A run that replaced
 * the chart the profile holds now changed nothing, because a failed pass puts
 * the profile back as it found it.
 */
function changedSince(report: { id: string; createdAt: Date }, chartNow: string | null, passes: readonly PassRecord[]): boolean {
  const runs: PassRecord[][] = [];
  for (const pass of passes) {
    const run = runs[runs.length - 1];
    if (run && run[0].replaced === pass.replaced) run.push(pass);
    else runs.push([pass]);
  }
  let own = -1;
  runs.forEach((run, i) => {
    if (run.some((p) => p.reportId === report.id)) own = i;
  });
  // A report no pass has reached was written when it was made, so only a change that began later passed it by.
  const later = own >= 0 ? runs.slice(own + 1) : runs.filter((run) => run[0].at > report.createdAt);
  return later.some((run) => run[0].replaced !== chartNow);
}

async function passesOn(profileId: string): Promise<PassRecord[]> {
  const rows = await db
    .select({
      reportId: reportRevisionsTable.reportId,
      at: reportRevisionsTable.createdAt,
      moment: sql<string | null>`${reportRevisionsTable.chartData} ->> 'datetimeUtc'`,
      band: sql<string | null>`${reportRevisionsTable.chartData} ->> 'windowMinutes'`,
    })
    .from(reportRevisionsTable)
    .innerJoin(reportsTable, eq(reportRevisionsTable.reportId, reportsTable.id))
    .where(and(
      eq(reportsTable.profileId, profileId),
      eq(reportsTable.type, "natal"),
      eq(reportRevisionsTable.reason, "birth_time_added"),
    ))
    .orderBy(asc(reportRevisionsTable.createdAt), asc(reportRevisionsTable.id));
  return rows.map((r) => ({ reportId: r.reportId, at: r.at, replaced: basisKey(r.moment, r.band) }));
}

async function outdatedOf(report: ReportRow, profile: ProfileRow): Promise<boolean> {
  if (report.type !== "natal" || report.status !== "complete") return false;
  const stamp = writtenForOf(report.computeData);
  const passes = stamp && stamp.passes === report.horizonPasses ? [] : await passesOn(profile.id);
  return isOutdated(report, profile, passes);
}

/** The reader's own ticks and pins, never another reader's (ADR-239). */
async function workbookFor(viewer: Viewer, reportId: string): Promise<Workbook> {
  const [row] = await db
    .select({ workbook: reportWorkbooksTable.workbook })
    .from(reportWorkbooksTable)
    .where(and(eq(reportWorkbooksTable.reportId, reportId), eq(reportWorkbooksTable.reader, readerKey(viewer))))
    .limit(1);
  return workbookOf(row?.workbook);
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
    userId: other.profile.userId,
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

/** Whoever sent the viewer this report: a natal report's giver or sharer, a pair's sender (ADR-139, ADR-235). */
function senderIdOf(viewer: Viewer, found: Pick<Loaded, "profile" | "relationship" | "access">): string | null {
  if (found.access === "participant") return found.relationship?.userId ?? null;
  if (found.relationship) return null;
  return found.access === "shared" ? sharerIdOf(found.profile) : giverIdOf(viewer, found.profile);
}

/** Send on one report, with the lookups it needs; only its writer or a pair's maker sends. */
async function sendOn(viewer: Viewer, found: Loaded): Promise<SendState | null> {
  if (!rightsOf(viewer, found).send) return null;
  if (found.relationship) {
    const invites = await openInvitesByRelationship([found.relationship.id]);
    return pairSend(viewer, found.report, found.parts, invites.get(found.relationship.id));
  }
  const [invites, handedBack] = await Promise.all([openInvitesByProfile([found.profile.id]), handedBackByProfile([found.profile.id])]);
  return sendStateFor(viewer, found.profile, found.report, invites.get(found.profile.id), handedBack.get(found.profile.id) ?? null);
}

function pairName(participants: Array<{ name: string }>): string {
  return participants.length === 2 ? `${participants[0].name} & ${participants[1].name}` : "Compatibility";
}

// List the viewer's reports: natal and compatibility, never the retired
// synastry rows (MB-58). Natal: signed in, the reports they wrote, the ones
// sent to them (MB-84) and the ones shared with them (ADR-235); a session, the
// reports it asked for. Compatibility: the pairs they made and the ones sent
// to them, by the pair reading.
router.get("/reports", async (req, res) => {
  try {
    const viewer: Viewer = { userId: req.userId, sessionId: req.sessionId };
    const shared = await grantsOf(viewer);
    const natalOwnerWhere = viewer.userId
      ? or(
        eq(profilesTable.userId, viewer.userId),
        eq(profilesTable.claimedByUserId, viewer.userId),
        shared.size ? inArray(profilesTable.id, [...shared]) : undefined,
      )
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
        failedTries: reportsTable.failedTries,
        createdAt: reportsTable.createdAt,
        profile: profilesTable,
      })
      .from(reportsTable)
      .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
      .where(natalWhere);

    const nameOf = nameCache();
    const natal = natalRows.flatMap((r) => {
      const access = natalReportAccess(viewer, r.profile, r, shared.has(r.profile.id));
      return access ? [{ ...r, access }] : [];
    });
    const sendable = viewer.userId ? natal.filter((r) => r.access === "owner").map((r) => r.profile.id) : [];
    const [natalInvites, handedBack] = await Promise.all([openInvitesByProfile(sendable), handedBackByProfile(sendable)]);

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
      failureReason: failureReasonOf(r.failureCode, isFinal(r)),
      access: r.access,
      send: sendStateFor(viewer, r.profile, r, natalInvites.get(r.profile.id), handedBack.get(r.profile.id) ?? null),
      sharedBy: await nameOf(r.access === "shared" ? sharerIdOf(r.profile) : giverIdOf(viewer, r.profile)),
      stoppedBy: null,
    })));

    const { owned, participant } = await viewerRelationshipIds(viewer);
    const visibleRelIds = Array.from(new Set([...owned, ...participant]));

    let pairSummaries: ReportSummaryOut[] = [];
    if (visibleRelIds.length > 0) {
      const synRows = await db
        .select({
          id: reportsTable.id,
          type: reportsTable.type,
          status: reportsTable.status,
          interpretation: reportsTable.interpretation,
          failureCode: reportsTable.failureCode,
          failedTries: reportsTable.failedTries,
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

      // MB-65 provisional: GET /home lists pairs by the same rule, so the two lists never disagree.
      const current = synRows.filter(pairListed);
      // MB-103 provisional: a pair the viewer made stays listed once closed, naming who stopped sharing; one sent to them goes when its sender stops.
      const pairs = current.flatMap((r) => {
        const rel = { userId: r.relUserId, sessionId: r.relSessionId };
        const parts = (r.relationshipId && partsByRel.get(r.relationshipId)) || [];
        const reading = pairReadable(viewer, rel, parts.map(pairPerson), shared);
        if (!reading.readable && !reading.stoppedBy) return [];
        return [{ r, rel, parts, reading, maker: ownsRelationship(viewer, rel) }];
      });
      const pairInvites = await openInvitesByRelationship(
        pairs.filter((p) => p.maker && p.reading.readable && p.r.relationshipId).map((p) => p.r.relationshipId as string),
      );

      pairSummaries = await Promise.all(pairs.map(async ({ r, rel, parts, reading, maker }): Promise<ReportSummaryOut> => {
        const participants = parts.map((p) => {
          // A closed pair keeps the names its maker typed but no longer shows the chart of whoever stopped sharing (ADR-139).
          const chart = reading.readable || canReadProfile(viewer, p.profile, shared.has(p.profile.id)) ? (p.profile.chartData as any) : null;
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
          failureReason: failureReasonOf(r.failureCode, isFinal(r)),
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
// profile (which caches its chart), then create the report referencing it,
// with the credit it takes in the same transaction (ADR-275).
router.post("/reports", async (req, res) => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(validationFailure(parsed.error));
  }
  const userId = req.userId;
  // Credits are an account's, so a session never has one to take.
  if (!userId) return res.status(402).json(noCredit("report"));

  const { name, birthDate, birthTime, birthPlace, latitude, longitude, timezoneOffset, timezone, birthTimeWindowMinutes, isForSelf } = parsed.data;
  const id = randomUUID();

  try {
    // A hold that lapsed is back in the balance before a credit is taken from it (reading 8); one the sweep missed waits
    // for the next read, and the write goes on with what is there.
    await returnExpiredHolds().catch((err: unknown) => req.log.warn({ err }, "gift holds were not settled"));
    // Resolving the profile can write, and it runs outside the report's transaction, so an empty balance is refused
    // before it, with nothing stored.
    if (!(await hasCredit(userId))) return res.status(402).json(noCredit("report"));

    const profile = await resolveOrCreateProfile(
      req.sessionId,
      userId,
      { name, birthDate, birthTime, birthPlace, latitude, longitude, timezoneOffset, timezone, birthTimeWindowMinutes },
      isForSelf ?? false,
    );

    const made = await writeWithCredit(userId, id, async (tx) => {
      await tx.insert(reportsTable).values({
        id,
        profileId: profile.id,
        sessionId: req.sessionId,
        type: "natal",
        // Chart is already cached on the profile, so we can skip "computing"
        // and go straight to interpreting.
        status: profile.chartData ? "interpreting" : "pending",
        computeData: writtenForStamp(profile, 0),
      });
    });
    // Another write took the last credit after the check above.
    if (!made) return res.status(402).json(noCredit("report"));

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
    const [revisions, send, giverName, workbook, outdated] = await Promise.all([
      db
        .select({ id: reportRevisionsTable.id, reason: reportRevisionsTable.reason, createdAt: reportRevisionsTable.createdAt })
        .from(reportRevisionsTable)
        .where(eq(reportRevisionsTable.reportId, r.id))
        .orderBy(asc(reportRevisionsTable.createdAt)),
      sendOn(req, found),
      nameCache()(senderIdOf(req, found)),
      workbookFor(req, r.id),
      outdatedOf(r, p),
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
      // The birth time pass is addressed here, and a reader through a grant changes nothing of the sharer's (ADR-235).
      profileId: r.type === "natal" && access !== "shared" ? p.id : null,
      type: r.type,
      lens: relationship?.type ?? null,
      participants,
      horizonPasses: r.horizonPasses,
      revisions: revisions.map((v) => ({ id: v.id, reason: v.reason, createdAt: v.createdAt.toISOString() })),
      status: r.status,
      chartData: p.chartData ?? null,
      interpretation: r.interpretation ?? null,
      workbook,
      // The internal message stays in the database; the customer reads the coded line (ADR-84).
      errorMessage: null,
      failureReason: failureReasonOf(r.failureCode, isFinal(r)),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      access,
      send,
      giverName,
      canRegenerate: rightsOf(req, found).regenerate,
      outdated,
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
      // The page offers a rewrite from whichever of the two reads it fetched last, so both answer alike.
      canRegenerate: rightsOf(req, found).regenerate,
      outdated: await outdatedOf(r, p),
      errorMessage: null,
      failureReason: failureReasonOf(r.failureCode, isFinal(r)),
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


/** What a patch gets wrong on its own, answered before any report is read. */
export function workbookPatchFault(patch: WorkbookPatch): string | null {
  const keys = Object.keys(patch);
  if (keys.length === 0 || keys.length > 200) return "A workbook patch carries 1 to 200 items";
  const badKey = keys.find((k) => !isWorkbookKey(k));
  return badKey ? `Not a workbook item key: ${badKey}` : null;
}

/**
 * The reader's own workbook, a row of report_workbooks under `readerKey`:
 * whoever else reads the report, its writer, the person it was sent to or a
 * reader through a grant, keeps theirs apart, pins included (ADR-239). A tick
 * is one shallow merge, so a slow connection cannot lose the rest of the
 * page's ticks by overwriting them. reports.workbook is no longer written
 * (MB-195).
 */
router.patch("/reports/:id/workbook", async (req, res) => {
  const params = UpdateReportWorkbookParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: "validation_error", message: "Invalid ID" });
  }
  const body = UpdateReportWorkbookBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json(validationFailure(body.error));
  }
  const patch = body.data as WorkbookPatch;
  const fault = workbookPatchFault(patch);
  if (fault) {
    return res.status(400).json({ error: "validation_error", message: fault });
  }

  try {
    const found = await loadReport(req, params.data.id);
    if (!found?.access) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const reader = readerKey(req);
    const own = and(eq(reportWorkbooksTable.reportId, found.report.id), eq(reportWorkbooksTable.reader, reader));

    // The reader's row is made first and locked for the merge, so two patches
    // at once, even a reader's first two, can neither drop each other's ticks
    // nor pass the pin limit together.
    const outcome = await db.transaction(async (tx) => {
      await tx.insert(reportWorkbooksTable).values({ reportId: found.report.id, reader }).onConflictDoNothing();
      const [row] = await tx.select({ workbook: reportWorkbooksTable.workbook }).from(reportWorkbooksTable).where(own).for("update");
      if (!row) return null;
      const next = patchWorkbook(workbookOf(row.workbook), patch);
      if ("error" in next) return next;
      await tx.update(reportWorkbooksTable).set({ workbook: next.workbook, updatedAt: new Date() }).where(own);
      return next;
    });
    if (!outcome) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    if ("error" in outcome) {
      return res.status(400).json({ error: "pin_limit", message: `A report holds at most ${PIN_LIMIT} pins` });
    }
    return res.json(outcome.workbook);
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

/**
 * Deleting your Personal report ends your sharing of that chart at once, its
 * grants and their links as Stop sharing ends them (R-3.6): a pair a reader
 * made on it can keep the chart alive, with no quick look left to stop
 * sharing from (ADR-235). Built, not run, so the caller runs it in its own
 * transaction.
 */
export function shareEndings(tx: Pick<Tx, "update">, profileId: string, ownerUserId: string, at: Date) {
  return [
    tx.update(profileSharesTable).set({ revokedAt: at }).where(and(
      eq(profileSharesTable.profileId, profileId),
      eq(profileSharesTable.ownerUserId, ownerUserId),
      isNull(profileSharesTable.revokedAt),
    )),
    tx.update(inviteTokensTable).set({ revokedAt: at, expiresAt: at }).where(and(
      eq(inviteTokensTable.profileId, profileId),
      eq(inviteTokensTable.kind, "share"),
      eq(inviteTokensTable.createdByUserId, ownerUserId),
      isNull(inviteTokensTable.revokedAt),
    )),
  ] as const;
}

// Regenerate an existing report's interpretation in place. Reuses cached
// chartData from the profile when available; falls back to a full recompute.
//
// Abuse guard: per-report cooldown to prevent tight-loop LLM spam.
const REGENERATE_COOLDOWN_MS = 60_000;

/** The refusal pinned for every 429 (reading: Refusals); null once the cooldown has passed. */
export function regenerateCooldown(elapsedMs: number): { retryAfterSeconds: number; body: { error: "rate_limited"; message: string; retryAfterSeconds: number } } | null {
  if (elapsedMs >= REGENERATE_COOLDOWN_MS) return null;
  const retryAfterSeconds = Math.max(1, Math.ceil((REGENERATE_COOLDOWN_MS - elapsedMs) / 1000));
  return { retryAfterSeconds, body: { error: "rate_limited", message: `Please wait ${retryAfterSeconds}s before regenerating again`, retryAfterSeconds } };
}
const lastRegenerateAt = new Map<string, number>();

const BEING_WRITTEN = new Set(["pending", "computing", "interpreting", "revising"]);

type Refusal = { status: 404 | 409; body: { error: string; message: string; status?: string } };

/**
 * Why POST /reports/:id/regenerate refuses, or null when it runs, free: a
 * rewrite never takes a credit. Only whoever may rewrite the report (reading
 * 10), and only where a rewrite is wanted: a report that failed (Try again,
 * which keeps the credit the report took, ADR-313), one written for another
 * birth time (reading 9, MB-170), or one written on an earlier prompt version
 * than the server writes now, which the page's earlier-version screen asks to
 * regenerate (MB-45). A final report has its credit back, so it has no Try
 * again; one more would be a report nobody paid for. No other user
 * regeneration exists (R-6.1).
 */
export function regenerateRefusal(
  viewer: Viewer,
  report: { type: string; status: string; sessionId: string; interpretation: unknown; failedTries?: number },
  profile: ProfileHolders,
  outdated: boolean,
): Refusal | null {
  if (report.type !== "natal" || !mayRegenerate(viewer, profile, report)) {
    return { status: 404, body: { error: "not_found", message: "Report not found" } };
  }
  if (BEING_WRITTEN.has(report.status)) {
    return { status: 409, body: { error: "in_progress", message: "Report is already being generated", status: report.status } };
  }
  if (isFinal(report)) return { status: 409, body: { error: "final", message: FINAL_LINE } };
  if (report.status === "failed" || outdated || writtenEarlier(report.interpretation)) return null;
  return { status: 409, body: { error: "up_to_date", message: "This report is already up to date" } };
}

/** Every version the page cannot render is earlier than the one written now, so the server needs no list of the page's. */
function writtenEarlier(interpretation: unknown): boolean {
  return (interpretation as { meta?: { promptVersion?: unknown } } | null)?.meta?.promptVersion !== PROMPT_VERSION;
}

/**
 * Deletes a report's row, first giving back the credit of one that has failed
 * since it last took a credit or finished (ADR-313): a failed report, or one a
 * free Try again is rewriting, so no one pays for a report we did not write.
 * The row is locked first, so a failure landing at the same moment is either
 * counted here or finds the row gone. A finished report's credit stays spent,
 * and a final one's is back already.
 */
async function deleteReportRow(tx: Tx, reportId: string): Promise<void> {
  const [row] = await tx
    .select({ failedTries: reportsTable.failedTries })
    .from(reportsTable)
    .where(eq(reportsTable.id, reportId))
    .for("update");
  if (row && row.failedTries > 0) await refundCredit(reportId, tx);
  await tx.delete(reportsTable).where(eq(reportsTable.id, reportId));
}

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
    // MB-103 provisional: a closed pair is still its maker's to delete; the other of its two only reads it, as a reader through a grant does.
    if (!found || !rightsOf(req, found).delete) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const { report: r, profile: p } = found;
    if (r.type === "compatibility") {
      await db.transaction((tx) => deleteReportRow(tx, r.id));
      return res.status(204).end();
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

      await deleteReportRow(tx, r.id);
      if (req.userId) {
        for (const ending of shareEndings(tx, p.id, req.userId, new Date())) await ending;
      }
      if (shouldDeleteProfile({ otherReportCount, relationshipParticipantCount })) {
        await tx.delete(profilesTable).where(eq(profilesTable.id, p.id));
      } else if (found.access === "claimed" && req.userId && p.userId !== req.userId) {
        // Deleting what was sent to you withdraws what is left of it from its
        // giver too, so no pair made from it stays open to them (MB-103 provisional).
        await handOver(tx, p.id, req.userId);
      }
    });
    // MB-191 provisional: the reader's Timeline readings and Ask thread are kept with their own Personal report, so they go
    // once it has. The hand-over above returns before this: its giver deletes nothing of their own, and its subject keeps theirs.
    if (req.userId && isSelfFor(req, p)) await forgetTimeline(req.userId, p.id);
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
    // MB-166 provisional: a session that wrote a report stops rewriting it at its subject's claim, as its reads do (ADR-139).
    // Who may is settled before the passes are read, so a refused viewer costs nothing more than the row.
    const asked = r.type === "natal" && r.status === "complete" && mayRegenerate(req, p, r) && !writtenEarlier(r.interpretation);
    const refusal = regenerateRefusal(req, r, p, asked && (await outdatedOf(r, p)));
    if (refusal) {
      return res.status(refusal.status).json(refusal.body);
    }
    const last = lastRegenerateAt.get(r.id) ?? 0;
    const elapsed = Date.now() - last;
    const cooldown = regenerateCooldown(elapsed);
    if (cooldown) {
      res.setHeader("Retry-After", String(cooldown.retryAfterSeconds));
      return res.status(429).json(cooldown.body);
    }
    lastRegenerateAt.set(r.id, Date.now());
    // A birth-time change is refused while this writes, so the profile's time now is the one the new text is for.
    await db
      .update(reportsTable)
      .set({
        status: "interpreting",
        errorMessage: null,
        failureCode: null,
        computeData: { ...((r.computeData as Record<string, unknown> | null) ?? {}), ...writtenForStamp(p, r.horizonPasses) },
        updatedAt: new Date(),
      })
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
        // Finished, so its count starts again: the credit it took has bought what it was taken for (reading 16).
        await db
          .update(reportsTable)
          .set({ interpretation, status: "complete", failedTries: 0, updatedAt: new Date() })
          .where(eq(reportsTable.id, r.id));
        // A subscriber who paid before their own report came starts Timeline's setup now (ADR-362); it never rejects.
        await setupAfterReport(r.id);
        // A Yes kept at a gift's claim waits for this report, Try again's included (reading 16); it never rejects.
        await grantShareBacksOn(p.id);
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
    // A subscriber who paid before their own report came starts Timeline's setup now (ADR-362); it never rejects.
    await setupAfterReport(id);
    // A Yes kept at a gift's claim becomes a grant once its claimer's own report is finished (reading 16); never rejects.
    await grantShareBacksOn(profileId);
  } catch (err) {
    await failReport(id, err);
  }
}

/**
 * A failed report stores its code beside the internal message (ADR-84) and
 * counts the failure (reading 16). A Personal report keeps the credit it took,
 * so Try again is free; the failure that makes it final gives the credit back,
 * once, and a pair, which has no Try again, gives it back at its first
 * (ADR-313). The count and the credit move in one transaction, so a report is
 * never final with its credit still spent. Shared by the natal and the pair
 * path.
 */
export async function failReport(id: string, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : "Unknown error";
  const code = failureCodeOf(err);
  const now = new Date();
  const outcome = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(reportsTable)
      .set({
        status: "failed",
        errorMessage: message,
        failureCode: code,
        failedTries: sql`${reportsTable.failedTries} + 1`,
        failedAt: now,
        updatedAt: now,
      })
      .where(eq(reportsTable.id, id))
      .returning({ type: reportsTable.type, status: reportsTable.status, failedTries: reportsTable.failedTries });
    // Deleted while it was being written, and a Delete settles its own credit.
    if (!row) return null;
    const final = isFinal(row);
    const refunded = final ? await refundCredit(id, tx) : false;
    return { tries: row.failedTries, final, refunded };
  });
  // The message stays in the row: a refusal's is the model's own words, which can repeat the brief (ADR-201).
  logger.warn({ id, code, section: failedSection(err), ...outcome }, "report failed");
}

/** A generator wraps the section's error in a ReportFailure, so the section is on the error or one cause down. */
function failedSection(err: unknown): string | null {
  for (let at = err, depth = 0; at && depth < 3; at = (at as { cause?: unknown }).cause, depth++) {
    if (at instanceof SectionError) return at.key;
  }
  return null;
}

export default router;
