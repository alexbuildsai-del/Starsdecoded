import { Router } from "express";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, asc } from "drizzle-orm";
import {
  db,
  profilesTable,
  reportsTable,
  relationshipsTable,
  relationshipParticipantsTable,
  RELATIONSHIP_TYPES,
} from "@workspace/db";
import { CreateCompatibilityReportBody, GetCompatibilitySummaryParams, WriteSceneBody, WriteSceneParams } from "@workspace/api-zod";
import type { NatalChartData } from "../lib/chartCalculation.js";
import type { ReportInterpretation } from "../lib/aiInterpretation.js";
import { generatePairInterpretation } from "../lib/pairInterpretation.js";
import { SceneRequestError, writeScene } from "../lib/pairScene.js";
import { consumeCredit } from "../lib/credits.js";
import { canReadProfile, ownsRelationship, viewerHasGrantOnRelationship } from "../lib/access.js";
import { failReport, streamInto } from "./reports.js";

const router = Router();

type ReportRow = typeof reportsTable.$inferSelect;
type ProfileRow = typeof profilesTable.$inferSelect;

/** A complete natal report the viewer can see: their own, their session's, or one they claimed as theirs. */
async function readableNatal(viewer: { userId: string | null; sessionId: string }, id: string): Promise<{ report: ReportRow; profile: ProfileRow } | null> {
  const rows = await db
    .select({ report: reportsTable, profile: profilesTable })
    .from(reportsTable)
    .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
    .where(and(eq(reportsTable.id, id), eq(reportsTable.type, "natal")))
    .limit(1);
  if (!rows.length) return null;
  const { report, profile } = rows[0];
  const readable = viewer.userId ? canReadProfile(viewer, profile) : report.sessionId === viewer.sessionId;
  return readable ? { report, profile } : null;
}

/** The viewer's relationship for this ordered pair of profiles, or a new one under the lens. */
async function relationshipFor(
  viewer: { userId: string | null; sessionId: string },
  profileAId: string,
  profileBId: string,
  lens: string,
  label: string | null,
  parent: "A" | "B" | null,
): Promise<string> {
  const ownerWhere = viewer.userId ? eq(relationshipsTable.userId, viewer.userId) : eq(relationshipsTable.sessionId, viewer.sessionId);
  const candidates = await db.select().from(relationshipsTable).where(ownerWhere);
  if (candidates.length) {
    const parts = await db.select().from(relationshipParticipantsTable)
      .where(inArray(relationshipParticipantsTable.relationshipId, candidates.map((r) => r.id)));
    const byRel = new Map<string, string[]>();
    for (const p of parts) byRel.set(p.relationshipId, [...(byRel.get(p.relationshipId) ?? []), p.profileId]);
    const wanted = [profileAId, profileBId].sort().join("|");
    for (const [id, ids] of byRel) {
      if (ids.length === 2 && [...ids].sort().join("|") === wanted) {
        // The lens and the roles are the report's; a re-run under another lens updates them.
        await db.update(relationshipsTable).set({ type: lens, label: label ?? undefined, updatedAt: new Date() }).where(eq(relationshipsTable.id, id));
        await db.update(relationshipParticipantsTable).set({ role: roleFor("A", lens, parent), position: "0" })
          .where(and(eq(relationshipParticipantsTable.relationshipId, id), eq(relationshipParticipantsTable.profileId, profileAId)));
        await db.update(relationshipParticipantsTable).set({ role: roleFor("B", lens, parent), position: "1" })
          .where(and(eq(relationshipParticipantsTable.relationshipId, id), eq(relationshipParticipantsTable.profileId, profileBId)));
        return id;
      }
    }
  }
  const id = randomUUID();
  await db.insert(relationshipsTable).values({ id, sessionId: viewer.sessionId, userId: viewer.userId ?? null, type: lens, label });
  await db.insert(relationshipParticipantsTable).values([
    { id: randomUUID(), relationshipId: id, profileId: profileAId, role: roleFor("A", lens, parent), position: "0" },
    { id: randomUUID(), relationshipId: id, profileId: profileBId, role: roleFor("B", lens, parent), position: "1" },
  ]);
  return id;
}

/** Positional role: parent and child under that lens, primary and secondary otherwise (ADR-40). */
function roleFor(side: "A" | "B", lens: string, parent: "A" | "B" | null): string {
  if (lens === "parent_child") return (parent ?? "A") === side ? "parent" : "child";
  return side === "A" ? "primary" : "secondary";
}

// Write a compatibility report from two finished natal reports (ADR-39). No
// birth data is read: both charts come from the profiles' caches and both
// interpretations from the reports. Streams through the report routes.
router.post("/compatibility", async (req, res) => {
  const parsed = CreateCompatibilityReportBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: parsed.error.message });
  }
  const { reportAId, reportBId, lens, label, parent } = parsed.data;
  if (reportAId === reportBId) {
    return res.status(400).json({ error: "validation_error", message: "Pick two different reports" });
  }
  if (!(RELATIONSHIP_TYPES as readonly string[]).includes(lens)) {
    return res.status(400).json({ error: "validation_error", message: "lens must be partners, parent_child or people" });
  }
  const viewer = { userId: req.userId, sessionId: req.sessionId };

  try {
    const [a, b] = await Promise.all([readableNatal(viewer, reportAId), readableNatal(viewer, reportBId)]);
    if (!a || !b) {
      return res.status(404).json({ error: "not_found", message: "Both reports must exist and be visible to you" });
    }
    for (const side of [a, b]) {
      if (side.report.status !== "complete" || !side.report.interpretation || !side.profile.chartData) {
        return res.status(400).json({ error: "not_ready", message: `${side.profile.name}'s report is still being written` });
      }
    }
    if (a.profile.id === b.profile.id) {
      return res.status(400).json({ error: "validation_error", message: "Pick two different people" });
    }

    const relationshipId = await relationshipFor(viewer, a.profile.id, b.profile.id, lens, label ?? null, parent ?? null);
    const reportId = randomUUID();
    await db.insert(reportsTable).values({
      id: reportId,
      profileId: a.profile.id,
      sessionId: req.sessionId,
      type: "compatibility",
      relationshipId,
      status: "interpreting",
      computeData: { reportAId, reportBId, lens },
    });

    // One credit is one report, whatever the report (ADR-42); soft until payments.
    if (req.userId) {
      consumeCredit(req.userId, reportId).catch((err) => req.log.error({ err, reportId }, "Failed to consume credit"));
    }

    const input = {
      lens,
      parent: parent ?? null,
      label: label ?? null,
      a: { name: a.profile.name, birthDate: a.profile.birthDate, chart: a.profile.chartData as NatalChartData, interpretation: a.report.interpretation as ReportInterpretation },
      b: { name: b.profile.name, birthDate: b.profile.birthDate, chart: b.profile.chartData as NatalChartData, interpretation: b.report.interpretation as ReportInterpretation },
    };
    (async () => {
      try {
        const interpretation = await generatePairInterpretation(input, { onSection: streamInto(reportId) as never, reportId });
        await db.update(reportsTable)
          .set({ interpretation: interpretation as unknown as object, status: "complete", updatedAt: new Date() })
          .where(eq(reportsTable.id, reportId));
      } catch (err) {
        await failReport(reportId, err);
        req.log.error({ err, reportId }, "Compatibility generation failed");
      }
    })().catch((err) => req.log.error({ err, reportId }, "Compatibility generation crashed"));

    return res.status(201).json({ id: reportId, relationshipId, status: "interpreting" });
  } catch (err) {
    req.log.error({ err }, "Failed to create compatibility report");
    return res.status(500).json({ error: "internal_error", message: "Failed to create compatibility report" });
  }
});

// The two names, the lens and the status: what a tile or a picker needs.
router.get("/compatibility/:id/summary", async (req, res) => {
  const parsed = GetCompatibilitySummaryParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: "Invalid ID" });
  }
  try {
    const [r] = await db.select().from(reportsTable)
      .where(and(eq(reportsTable.id, parsed.data.id), eq(reportsTable.type, "compatibility"))).limit(1);
    if (!r || !r.relationshipId) return res.status(404).json({ error: "not_found", message: "Report not found" });
    const [rel] = await db.select().from(relationshipsTable).where(eq(relationshipsTable.id, r.relationshipId)).limit(1);
    const viewer = { userId: req.userId, sessionId: req.sessionId };
    if (!rel || (!ownsRelationship(viewer, rel) && !(await viewerHasGrantOnRelationship(viewer, rel.id)))) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const parts = await db
      .select({ rp: relationshipParticipantsTable, profile: profilesTable })
      .from(relationshipParticipantsTable)
      .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
      .where(eq(relationshipParticipantsTable.relationshipId, rel.id))
      .orderBy(asc(relationshipParticipantsTable.position));
    const compute = (r.computeData ?? {}) as { reportAId?: string; reportBId?: string };
    return res.json({
      id: r.id,
      relationshipId: rel.id,
      lens: rel.type,
      label: rel.label,
      status: r.status,
      participants: parts.map((p, i) => ({ id: p.profile.id, reportId: (i === 0 ? compute.reportAId : compute.reportBId) ?? "", name: p.profile.name, role: p.rp.role })),
      createdAt: r.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get compatibility summary");
    return res.status(500).json({ error: "internal_error", message: "Failed to get compatibility summary" });
  }
});

// One of a chapter's two unread scenes, written on tap and served from storage after (ADR-72). Access is the report's.
router.post("/compatibility/:id/scenes", async (req, res) => {
  const params = WriteSceneParams.safeParse(req.params);
  const body = WriteSceneBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({ error: "validation_error", message: "chapter and index are required" });
  }
  try {
    const [r] = await db.select().from(reportsTable)
      .where(and(eq(reportsTable.id, params.data.id), eq(reportsTable.type, "compatibility"))).limit(1);
    if (!r || !r.relationshipId) return res.status(404).json({ error: "not_found", message: "Report not found" });
    const [rel] = await db.select().from(relationshipsTable).where(eq(relationshipsTable.id, r.relationshipId)).limit(1);
    const viewer = { userId: req.userId, sessionId: req.sessionId };
    if (!rel || (!ownsRelationship(viewer, rel) && !(await viewerHasGrantOnRelationship(viewer, rel.id)))) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    if (r.status !== "complete") return res.status(400).json({ error: "not_ready", message: "The report is still being written" });
    const scene = await writeScene(params.data.id, body.data.chapter, body.data.index);
    return res.json(scene);
  } catch (err) {
    if (err instanceof SceneRequestError) return res.status(err.status).json({ error: err.status === 404 ? "not_found" : "validation_error", message: err.message });
    req.log.error({ err }, "Failed to write scene");
    return res.status(500).json({ error: "internal_error", message: "Failed to write the scene" });
  }
});

export default router;
