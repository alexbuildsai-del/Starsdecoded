import { Router } from "express";
import { randomUUID } from "crypto";
import { and, eq, inArray, asc } from "drizzle-orm";
import {
  db,
  profilesTable,
  reportsTable,
  relationshipsTable,
  relationshipParticipantsTable,
} from "@workspace/db";
import { CreateReportBody, GetReportParams, GetReportStatusParams } from "@workspace/api-zod";
import { calculateNatalChart, type NatalChartData } from "../lib/chartCalculation.js";
import { generateInterpretation, type ReportInterpretation } from "../lib/aiInterpretation.js";
import { resolveOrCreateProfile } from "../lib/profiles.js";
import { viewerRelationshipIds } from "../lib/access.js";
import { consumeCredit } from "../lib/credits.js";

const router = Router();

// List the current viewer's reports — both natal and synastry.
//   Natal ownership:
//     - Signed in: reports whose profile is owned by the user.
//     - Anonymous: reports tied to the current session cookie.
//   Synastry ownership:
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
      kind: "natal" | "synastry";
      name: string;
      birthDate?: string;
      birthTime?: string;
      birthPlace?: string;
      status: string;
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
      archetypeName: (r.interpretation as any)?.archetypeName ?? null,
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

    // Synastry: include any reports tied to a relationship the viewer can see.
    const viewer = { userId: req.userId, sessionId: req.sessionId };
    const { owned, participant } = await viewerRelationshipIds(viewer);
    const visibleRelIds = Array.from(new Set([...owned, ...participant]));

    let synastrySummaries: ReportSummaryOut[] = [];
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
            eq(reportsTable.type, "synastry"),
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

      synastrySummaries = synRows.map((r): ReportSummaryOut => {
        const ps = (r.relationshipId && partsByRel.get(r.relationshipId)) || [];
        const participants = ps.map((p) => ({
          id: p.profile.id,
          name: p.profile.name,
          sunSign: (p.profile.chartData as any)?.planets?.sun?.sign ?? null,
          moonSign: (p.profile.chartData as any)?.planets?.moon?.sign ?? null,
          risingSign: (p.profile.chartData as any)?.angles?.ascendant?.sign ?? null,
        }));
        const name =
          r.relLabel
          || (participants.length
            ? participants.map((p) => p.name).join(" · ")
            : "Compatibility");
        return {
          id: r.id,
          kind: "synastry",
          name,
          status: r.status,
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

    const summaries = [...natalSummaries, ...synastrySummaries].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );

    // Strip undefined birth fields so the JSON response omits them for synastry rows.
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

  const { name, birthDate, birthTime, birthPlace, latitude, longitude, timezoneOffset, isForSelf } = parsed.data;
  const id = randomUUID();

  try {
    const profile = await resolveOrCreateProfile(
      req.sessionId,
      req.userId ?? null,
      { name, birthDate, birthTime, birthPlace, latitude, longitude, timezoneOffset },
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

    // Soft-consume a natal credit for signed-in users. Non-blocking — missing credits are just logged.
    if (req.userId) {
      consumeCredit(req.userId, "natal", id).catch((err) => {
        req.log.error({ err, id }, "Failed to consume natal credit");
      });
    }

    // Fire-and-forget interpretation
    generateReport(id, profile.id, name, profile.chartData as NatalChartData | null).catch((err) => {
      req.log.error({ err, id }, "Report generation failed");
    });

    return res.status(201).json({
      id,
      name: profile.name,
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      birthPlace: profile.birthPlace,
      status: profile.chartData ? "interpreting" : "pending",
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
    if (!viewerOwns(req, r, p)) {
      // 404 (not 403) so we don't leak which IDs exist.
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    return res.json({
      id: r.id,
      name: p.name,
      birthDate: p.birthDate,
      birthTime: p.birthTime,
      birthPlace: p.birthPlace,
      latitude: p.latitude,
      longitude: p.longitude,
      timezoneOffset: p.timezoneOffset,
      status: r.status,
      chartData: p.chartData ?? null,
      interpretation: r.interpretation ?? null,
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
    if (!viewerOwns(req, r, p)) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }

    const statusToProgress: Record<string, number> = {
      pending: 5,
      computing: 30,
      interpreting: 65,
      complete: 100,
      failed: 0,
    };

    const statusToStep: Record<string, string> = {
      pending: "Initializing chart calculation...",
      computing: "Computing planetary positions with Swiss Ephemeris...",
      interpreting: "Generating psychological interpretation...",
      complete: "Report complete",
      failed: "Generation failed",
    };

    return res.json({
      id: r.id,
      status: r.status,
      progress: statusToProgress[r.status] ?? 0,
      currentStep: statusToStep[r.status] ?? null,
      errorMessage: r.errorMessage ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get report status");
    return res.status(500).json({ error: "internal_error", message: "Failed to get report status" });
  }
});

// Regenerate an existing report's interpretation in place. Reuses cached
// chartData from the profile when available; falls back to a full recompute.
//
// Abuse guard: per-report cooldown to prevent tight-loop LLM spam.
const REGENERATE_COOLDOWN_MS = 60_000;
const lastRegenerateAt = new Map<string, number>();

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
    if (!viewerOwns(req, r, p)) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    if (r.status === "interpreting" || r.status === "computing" || r.status === "pending") {
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
          chartData = calculateNatalChart(p.birthDate, p.birthTime, p.latitude, p.longitude, p.timezoneOffset);
          await db
            .update(profilesTable)
            .set({ chartData: chartData as unknown as object, updatedAt: new Date() })
            .where(eq(profilesTable.id, p.id));
        }
        const interpretation: ReportInterpretation = await generateInterpretation(
          chartData,
          p.name,
        );
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
      chartData = calculateNatalChart(p.birthDate, p.birthTime, p.latitude, p.longitude, p.timezoneOffset);

      await db
        .update(profilesTable)
        .set({ chartData: chartData as unknown as object, updatedAt: new Date() })
        .where(eq(profilesTable.id, profileId));

      await db
        .update(reportsTable)
        .set({ status: "interpreting", updatedAt: new Date() })
        .where(eq(reportsTable.id, id));
    }

    const interpretation = await generateInterpretation(chartData, name);

    await db
      .update(reportsTable)
      .set({
        interpretation: interpretation as any,
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
