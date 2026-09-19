import { Router } from "express";
import { randomUUID } from "crypto";
import { and, eq, ne, inArray, asc, count } from "drizzle-orm";
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
import { PAIR_SECTION_IDS } from "../prompts/pair/index.js";
import { chartForProfile, resolveOrCreateProfile } from "../lib/profiles.js";
import { ownsRelationship, viewerHasGrantOnRelationship, viewerRelationshipIds } from "../lib/access.js";
import { consumeCredit } from "../lib/credits.js";
import { shouldDeleteProfile } from "../lib/deletion.js";

const router = Router();

type ReportRow = typeof reportsTable.$inferSelect;
type ProfileRow = typeof profilesTable.$inferSelect;
type Viewer = { userId: string | null; sessionId: string };

/**
 * The section keys a report of this type writes, so the status can say which
 * have landed. A blind natal report never writes the house readings (ADR-34),
 * so its status does not wait for them.
 */
export function sectionIdsFor(type: string, horizon?: string): readonly string[] {
  if (type === "compatibility") return PAIR_SECTION_IDS;
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

/**
 * A report with the viewer's right to read it. A natal report is owned
 * through its profile or session; a compatibility report through the
 * relationship's access roles. Null reads as 404, so no id is ever confirmed.
 */
async function loadReadable(viewer: Viewer, id: string): Promise<{ report: ReportRow; profile: ProfileRow; relationship: typeof relationshipsTable.$inferSelect | null; owner: boolean } | null> {
  const rows = await db
    .select({ report: reportsTable, profile: profilesTable })
    .from(reportsTable)
    .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
    .where(eq(reportsTable.id, id))
    .limit(1);
  if (!rows.length) return null;
  const { report, profile } = rows[0];
  if (report.type === "compatibility" && report.relationshipId) {
    const [rel] = await db.select().from(relationshipsTable).where(eq(relationshipsTable.id, report.relationshipId)).limit(1);
    if (!rel) return null;
    const owner = ownsRelationship(viewer, rel);
    if (!owner && !(await viewerHasGrantOnRelationship(viewer, rel.id))) return null;
    return { report, profile, relationship: rel, owner };
  }
  if (report.type !== "natal") return null;
  if (!viewerOwns(viewer, report, profile)) return null;
  return { report, profile, relationship: null, owner: true };
}

/** The two people of a compatibility report, in position order, with their charts and the natal reports it was written from. */
async function participantsOf(report: ReportRow) {
  if (!report.relationshipId) return [];
  const parts = await db
    .select({ rp: relationshipParticipantsTable, profile: profilesTable })
    .from(relationshipParticipantsTable)
    .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
    .where(eq(relationshipParticipantsTable.relationshipId, report.relationshipId))
    .orderBy(asc(relationshipParticipantsTable.position));
  const compute = (report.computeData ?? {}) as { reportAId?: string; reportBId?: string };
  return parts.map((p, i) => ({
    id: p.profile.id,
    reportId: (i === 0 ? compute.reportAId : compute.reportBId) ?? "",
    name: p.profile.name,
    role: p.rp.role,
    chartData: (p.profile.chartData as NatalChartData | null) ?? null,
  }));
}

function pairName(participants: Array<{ name: string }>): string {
  return participants.length === 2 ? `${participants[0].name} & ${participants[1].name}` : "Compatibility";
}

// List the current viewer's reports: natal and compatibility, never the
// retired synastry rows (MB-58).
//   Natal ownership:
//     - Signed in: reports whose profile is owned by the user.
//     - Anonymous: reports tied to the current session cookie.
//   Compatibility ownership:
//     - Any relationship the viewer owns or participates in (via claim).
router.get("/reports", async (req, res) => {
  try {
    const natalOwnerWhere = req.userId
      ? eq(profilesTable.userId, req.userId)
      : eq(reportsTable.sessionId, req.sessionId);

    const natalWhere = and(eq(reportsTable.type, "natal"), natalOwnerWhere);

    const natalRows = await db
      .select({
        id: reportsTable.id,
        status: reportsTable.status,
        type: reportsTable.type,
        interpretation: reportsTable.interpretation,
        createdAt: reportsTable.createdAt,
        profile: profilesTable,
      })
      .from(reportsTable)
      .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
      .where(natalWhere);

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
    };

    const natalSummaries: ReportSummaryOut[] = natalRows.map((r) => ({
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
    }));

    // Compatibility: any report tied to a relationship the viewer can see.
    const viewer = { userId: req.userId, sessionId: req.sessionId };
    const { owned, participant } = await viewerRelationshipIds(viewer);
    const visibleRelIds = Array.from(new Set([...owned, ...participant]));

    let pairSummaries: ReportSummaryOut[] = [];
    if (visibleRelIds.length > 0) {
      const synRows = await db
        .select({
          id: reportsTable.id,
          status: reportsTable.status,
          interpretation: reportsTable.interpretation,
          createdAt: reportsTable.createdAt,
          relationshipId: reportsTable.relationshipId,
          relType: relationshipsTable.type,
          relLabel: relationshipsTable.label,
        })
        .from(reportsTable)
        .innerJoin(relationshipsTable, eq(reportsTable.relationshipId, relationshipsTable.id))
        .where(
          and(
            eq(reportsTable.type, "compatibility"),
            inArray(reportsTable.relationshipId, visibleRelIds),
          ),
        );

      const relIds = synRows
        .map((r) => r.relationshipId)
        .filter((id): id is string => !!id);

      const partRows = relIds.length
        ? await db
            .select({
              relationshipId: relationshipParticipantsTable.relationshipId,
              position: relationshipParticipantsTable.position,
              profile: profilesTable,
            })
            .from(relationshipParticipantsTable)
            .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
            .where(inArray(relationshipParticipantsTable.relationshipId, relIds))
            .orderBy(asc(relationshipParticipantsTable.position))
        : [];

      const partsByRel = new Map<string, typeof partRows>();
      for (const p of partRows) {
        const arr = partsByRel.get(p.relationshipId) ?? [];
        arr.push(p);
        partsByRel.set(p.relationshipId, arr);
      }

      pairSummaries = synRows.map((r): ReportSummaryOut => {
        const ps = (r.relationshipId && partsByRel.get(r.relationshipId)) || [];
        const participants = ps.map((p) => ({
          id: p.profile.id,
          name: p.profile.name,
          sunSign: (p.profile.chartData as any)?.planets?.sun?.sign ?? null,
          moonSign: (p.profile.chartData as any)?.planets?.moon?.sign ?? null,
          risingSign: (p.profile.chartData as any)?.angles?.ascendant?.sign ?? null,
        }));
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
        };
      });
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
    const found = await loadReadable(req, parsed.data.id);
    if (!found) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const { report: r, profile: p, relationship } = found;
    const participants = r.type === "compatibility" ? await participantsOf(r) : null;
    const revisions = await db
      .select({ id: reportRevisionsTable.id, reason: reportRevisionsTable.reason, createdAt: reportRevisionsTable.createdAt })
      .from(reportRevisionsTable)
      .where(eq(reportRevisionsTable.reportId, r.id))
      .orderBy(asc(reportRevisionsTable.createdAt));
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
      type: r.type,
      lens: relationship?.type ?? null,
      participants,
      horizonPasses: r.horizonPasses,
      revisions: revisions.map((v) => ({ id: v.id, reason: v.reason, createdAt: v.createdAt.toISOString() })),
      status: r.status,
      chartData: p.chartData ?? null,
      interpretation: r.interpretation ?? null,
      workbook: (r.workbook ?? {}) as Record<string, string>,
      errorMessage: r.errorMessage ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
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
    const found = await loadReadable(req, parsed.data.id);
    if (!found) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const { report: r, profile: p } = found;

    const written = (r.interpretation ?? {}) as Record<string, unknown>;
    return res.json({
      id: r.id,
      status: r.status,
      errorMessage: r.errorMessage ?? null,
      // The chart is what the page opens on, so the client stops waiting the
      // moment it exists rather than when the last section lands (ADR-25).
      chartReady: p.chartData != null,
      // Real progress is the client's to count from `sections` (ADR-47); the
      // orrery runs from these until the chart is stored.
      provisional: p.chartData == null && r.type === "natal" ? provisionalFor(p) : null,
      sections: Object.fromEntries(sectionIdsFor(r.type, (written.meta as { horizon?: string } | undefined)?.horizon).map((id) => [id, id in written ? "done" : "pending"])),
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
    const found = await loadReadable(req, params.data.id);
    if (!found) {
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

// Regenerate an existing report's interpretation in place. Reuses cached
// chartData from the profile when available; falls back to a full recompute.
//
// Abuse guard: per-report cooldown to prevent tight-loop LLM spam.
const REGENERATE_COOLDOWN_MS = 60_000;
const lastRegenerateAt = new Map<string, number>();

// Delete a report the viewer owns. A report mid-generation is deleted too;
// generateReport tolerates its row vanishing. A compatibility report goes on
// its own, through the relationship's owner (MB-9, MB-32's 409 gone). The
// orphaned profile goes with a natal report (MB-32 provisional), which
// cascades invite_tokens; credits.used_for_report_id nulls out so the payment
// record survives.
router.delete("/reports/:id", async (req, res) => {
  const parsed = DeleteReportParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: "Invalid ID" });
  }
  try {
    const found = await loadReadable(req, parsed.data.id);
    if (!found || !found.owner) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const { report: r, profile: p } = found;
    if (r.type === "compatibility") {
      await db.delete(reportsTable).where(eq(reportsTable.id, r.id));
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
      .set({ status: "interpreting", errorMessage: null, updatedAt: new Date() })
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
        });
        await db
          .update(reportsTable)
          .set({ interpretation, status: "complete", updatedAt: new Date() })
          .where(eq(reportsTable.id, r.id));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await db
          .update(reportsTable)
          .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
          .where(eq(reportsTable.id, r.id));
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
    const message = err instanceof Error ? err.message : "Unknown error";
    await db
      .update(reportsTable)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(reportsTable.id, id));
  }
}

export default router;
