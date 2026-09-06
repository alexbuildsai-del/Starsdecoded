import { Router } from "express";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, or, isNull, asc } from "drizzle-orm";
import {
  db,
  profilesTable,
  reportsTable,
  relationshipsTable,
  relationshipParticipantsTable,
} from "@workspace/db";
import { consumeCredit } from "../lib/credits.js";
import {
  viewerRelationshipIds,
  ownsRelationship,
  openInvitesByProfile,
  claimerNamesByProfile,
  profileOwnershipFor,
  viewerHasGrantOnRelationship,
  tokenGrantsRelationshipRead,
} from "../lib/access.js";
import {
  CreateSynastryReportBody,
  CreateRelationshipBody,
  GetReportParams,
} from "@workspace/api-zod";
import {
  generateSynastryInterpretation,
  type SynastryReportData,
} from "../lib/synastryInterpretation.js";
import type { NatalChartData } from "../lib/chartCalculation.js";
import { calculateNatalChart } from "../lib/chartCalculation.js";

const router = Router();

const RELATIONSHIP_TYPES = ["romantic", "parent_child", "sibling", "custom"] as const;
type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];
function normalizeType(t: unknown): RelationshipType {
  return RELATIONSHIP_TYPES.includes(t as RelationshipType) ? (t as RelationshipType) : "custom";
}

type ProfileRow = typeof profilesTable.$inferSelect;
function signsOf(p: ProfileRow): { sun: string | null; moon: string | null; rising: string | null } {
  const c = (p.chartData as NatalChartData | null) ?? null;
  return {
    sun: c?.planets?.sun?.sign ?? null,
    moon: c?.planets?.moon?.sign ?? null,
    rising: c?.angles?.ascendant?.sign ?? null,
  };
}

function viewerProfileFilter(req: { userId: string | null; sessionId: string }) {
  return req.userId
    ? or(
        eq(profilesTable.userId, req.userId),
        and(eq(profilesTable.sessionId, req.sessionId), isNull(profilesTable.userId)),
      )
    : eq(profilesTable.sessionId, req.sessionId);
}

async function ensureChart(
  profile: typeof profilesTable.$inferSelect,
): Promise<NatalChartData> {
  if (profile.chartData) return profile.chartData as NatalChartData;
  const chart = calculateNatalChart(
    profile.birthDate,
    profile.birthTime,
    profile.latitude,
    profile.longitude,
    profile.timezoneOffset,
  );
  await db
    .update(profilesTable)
    .set({ chartData: chart as unknown as object, updatedAt: new Date() })
    .where(eq(profilesTable.id, profile.id));
  return chart;
}

// List the viewer's relationships, joined with participant profiles.
// Includes both relationships the viewer owns AND those where the viewer
// is a participant (claimed one of the participant profiles).
router.get("/relationships", async (req, res) => {
  try {
    const viewer = { userId: req.userId, sessionId: req.sessionId };
    const { owned, participant } = await viewerRelationshipIds(viewer);
    const visibleIds = Array.from(new Set([...owned, ...participant]));

    if (visibleIds.length === 0) {
      return res.json([]);
    }

    const rels = await db
      .select()
      .from(relationshipsTable)
      .where(inArray(relationshipsTable.id, visibleIds))
      .orderBy(asc(relationshipsTable.createdAt));

    const ids = rels.map((r) => r.id);
    const parts = await db
      .select({
        rp: relationshipParticipantsTable,
        profile: profilesTable,
      })
      .from(relationshipParticipantsTable)
      .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
      .where(inArray(relationshipParticipantsTable.relationshipId, ids));

    // Latest synastry report per relationship.
    const repRows = await db
      .select({
        id: reportsTable.id,
        relationshipId: reportsTable.relationshipId,
        status: reportsTable.status,
        createdAt: reportsTable.createdAt,
      })
      .from(reportsTable)
      .where(
        and(
          eq(reportsTable.type, "synastry"),
          inArray(reportsTable.relationshipId, ids),
        ),
      )
      .orderBy(asc(reportsTable.createdAt));

    const latestReportByRel = new Map<string, { id: string; status: string }>();
    for (const r of repRows) {
      if (!r.relationshipId) continue;
      latestReportByRel.set(r.relationshipId, { id: r.id, status: r.status });
    }

    const out = rels.map((r) => {
      const ps = parts
        .filter((p) => p.rp.relationshipId === r.id)
        .sort((a, b) => a.rp.position.localeCompare(b.rp.position))
        .map((p) => ({
          id: p.profile.id,
          name: p.profile.name,
          role: p.rp.role,
          ...(({ sun, moon, rising }) => ({
            sunSign: sun,
            moonSign: moon,
            risingSign: rising,
          }))(signsOf(p.profile)),
        }));
      const latest = latestReportByRel.get(r.id);
      return {
        id: r.id,
        type: r.type,
        label: r.label,
        participants: ps,
        latestReportId: latest?.id ?? null,
        latestReportStatus: latest?.status ?? null,
        createdAt: r.createdAt.toISOString(),
        ownership: owned.has(r.id) ? "owner" : "participant",
      };
    });
    return res.json(out);
  } catch (err) {
    req.log.error({ err }, "Failed to list relationships");
    return res.status(500).json({ error: "internal_error", message: "Failed to list relationships" });
  }
});

// Create a new relationship row (no report) between two viewer-owned profiles.
// Idempotent on the (sorted) participant pair: re-posting the same pair
// returns the existing relationship rather than creating a duplicate.
router.post("/relationships", async (req, res) => {
  const parsed = CreateRelationshipBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: parsed.error.message });
  }
  const { profileAId, profileBId, type, label } = parsed.data;
  if (profileAId === profileBId) {
    return res.status(400).json({ error: "validation_error", message: "Participants must differ" });
  }
  try {
    const profiles = await db
      .select()
      .from(profilesTable)
      .where(and(inArray(profilesTable.id, [profileAId, profileBId]), viewerProfileFilter(req)));
    if (profiles.length !== 2) {
      return res.status(404).json({ error: "not_found", message: "Both profiles must belong to you" });
    }
    const existing = await findRelationshipForPair(req, profileAId, profileBId);
    if (existing) {
      return res.status(200).json({ id: existing, created: false });
    }
    const relationshipId = randomUUID();
    await db.insert(relationshipsTable).values({
      id: relationshipId,
      sessionId: req.sessionId,
      userId: req.userId ?? null,
      type: normalizeType(type),
      label: label ?? null,
    });
    await db.insert(relationshipParticipantsTable).values([
      { id: randomUUID(), relationshipId, profileId: profileAId, role: "primary", position: "0" },
      { id: randomUUID(), relationshipId, profileId: profileBId, role: "secondary", position: "1" },
    ]);
    return res.status(201).json({ id: relationshipId, created: true });
  } catch (err) {
    req.log.error({ err }, "Failed to create relationship");
    return res.status(500).json({ error: "internal_error", message: "Failed to create relationship" });
  }
});

// Get one relationship (with participants) by id.
router.get("/relationships/:id", async (req, res) => {
  const parsed = GetReportParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: "Invalid id" });
  }
  try {
    const relRows = await db
      .select()
      .from(relationshipsTable)
      .where(eq(relationshipsTable.id, parsed.data.id))
      .limit(1);
    if (!relRows.length) {
      return res.status(404).json({ error: "not_found", message: "Relationship not found" });
    }
    const rel = relRows[0];
    const viewer = { userId: req.userId, sessionId: req.sessionId };
    const isOwner = ownsRelationship(viewer, rel);
    const parts = await db
      .select({ rp: relationshipParticipantsTable, profile: profilesTable })
      .from(relationshipParticipantsTable)
      .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
      .where(eq(relationshipParticipantsTable.relationshipId, rel.id))
      .orderBy(asc(relationshipParticipantsTable.position));
    const isParticipant = !isOwner
      && (await viewerHasGrantOnRelationship(viewer, rel.id));
    const tokenViewer = !isOwner && !isParticipant
      && (await tokenGrantsRelationshipRead(req.query.token as string | undefined, rel.id));
    if (!isOwner && !isParticipant && !tokenViewer) {
      return res.status(404).json({ error: "not_found", message: "Relationship not found" });
    }
    const latest = await db
      .select({ id: reportsTable.id, status: reportsTable.status })
      .from(reportsTable)
      .where(and(eq(reportsTable.type, "synastry"), eq(reportsTable.relationshipId, rel.id)))
      .orderBy(asc(reportsTable.createdAt));
    const last = latest.at(-1);
    return res.json({
      id: rel.id,
      type: rel.type,
      label: rel.label,
      participants: parts.map((p) => ({
        id: p.profile.id,
        name: p.profile.name,
        role: p.rp.role,
        ...(({ sun, moon, rising }) => ({ sunSign: sun, moonSign: moon, risingSign: rising }))(
          signsOf(p.profile),
        ),
        selfProfile: !!viewer.userId && p.profile.claimedByUserId === viewer.userId,
      })),
      latestReportId: last?.id ?? null,
      latestReportStatus: last?.status ?? null,
      createdAt: rel.createdAt.toISOString(),
      ownership: isOwner ? "owner" : (isParticipant ? "participant" : "viewer"),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get relationship");
    return res.status(500).json({ error: "internal_error", message: "Failed to get relationship" });
  }
});

// Helper: find an existing viewer-owned relationship for the given participant pair.
async function findRelationshipForPair(
  req: { userId: string | null; sessionId: string },
  profileAId: string,
  profileBId: string,
): Promise<string | null> {
  const sorted = [profileAId, profileBId].sort();
  const ownerWhere = req.userId
    ? eq(relationshipsTable.userId, req.userId)
    : eq(relationshipsTable.sessionId, req.sessionId);
  const candidates = await db.select().from(relationshipsTable).where(ownerWhere);
  if (!candidates.length) return null;
  const partsForOwner = await db
    .select()
    .from(relationshipParticipantsTable)
    .where(inArray(relationshipParticipantsTable.relationshipId, candidates.map((r) => r.id)));
  const byRel = new Map<string, string[]>();
  for (const p of partsForOwner) {
    const arr = byRel.get(p.relationshipId) ?? [];
    arr.push(p.profileId);
    byRel.set(p.relationshipId, arr);
  }
  for (const [rId, pIds] of byRel) {
    const ex = [...pIds].sort();
    if (ex.length === 2 && ex[0] === sorted[0] && ex[1] === sorted[1]) return rId;
  }
  return null;
}

// Shared async generator: computes both natal charts, runs the
// synastry interpretation, and persists the result on the given report
// row. Errors are caught and recorded as `failed` on the report so the
// caller can fire-and-forget without an unhandled rejection.
function kickoffSynastryGeneration(
  reportId: string,
  profileA: ProfileRow,
  profileB: ProfileRow,
  log?: { error: (...args: unknown[]) => void },
  relationshipType?: string,
): void {
  void (async () => {
    try {
      const [chartA, chartB] = await Promise.all([
        ensureChart(profileA),
        ensureChart(profileB),
      ]);
      const result: SynastryReportData = await generateSynastryInterpretation(
        chartA,
        chartB,
        profileA.name,
        profileB.name,
        relationshipType,
      );
      await db
        .update(reportsTable)
        .set({
          interpretation: result.interpretation as unknown as object,
          computeData: result.compute as unknown as object,
          status: "complete",
          updatedAt: new Date(),
        })
        .where(eq(reportsTable.id, reportId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await db
        .update(reportsTable)
        .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
        .where(eq(reportsTable.id, reportId));
      log?.error({ err, reportId }, "Synastry generation failed");
    }
  })();
}

/**
 * Find the latest synastry report for a relationship, or create one and
 * kick off async generation if none exists. Used by the invite-claim
 * flow so a freshly-claimed relationship has a report to land on even
 * when the owner never triggered POST /synastry beforehand.
 *
 * The find-or-create runs inside a transaction that takes a row-level
 * lock on the relationship (`SELECT ... FOR UPDATE`), so concurrent
 * claims on the same relationship serialize and return the same report
 * id instead of inserting duplicates.
 *
 * Returns the existing-or-new report id, or `null` if the relationship
 * is missing or has fewer than two participants.
 */
export async function ensureSynastryReportForRelationship(
  relationshipId: string,
): Promise<string | null> {
  let kickoff: { reportId: string; profileA: ProfileRow; profileB: ProfileRow; relType: string } | null = null;

  const reportId = await db.transaction(async (tx) => {
    // Lock the relationship row so two concurrent claims for the same
    // relationship serialize through the find-or-create.
    const [rel] = await tx
      .select()
      .from(relationshipsTable)
      .where(eq(relationshipsTable.id, relationshipId))
      .for("update")
      .limit(1);
    if (!rel) return null;

    // Re-check for an existing report under the lock — if one was
    // inserted between the caller's earlier read and this transaction,
    // reuse it instead of creating a duplicate.
    const existing = await tx
      .select({ id: reportsTable.id, createdAt: reportsTable.createdAt })
      .from(reportsTable)
      .where(
        and(
          eq(reportsTable.relationshipId, relationshipId),
          eq(reportsTable.type, "synastry"),
        ),
      )
      .orderBy(asc(reportsTable.createdAt));
    if (existing.length > 0) return existing.at(-1)!.id;

    const parts = await tx
      .select({ rp: relationshipParticipantsTable, profile: profilesTable })
      .from(relationshipParticipantsTable)
      .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
      .where(eq(relationshipParticipantsTable.relationshipId, relationshipId))
      .orderBy(asc(relationshipParticipantsTable.position));
    if (parts.length < 2) return null;
    const profileA = parts[0].profile;
    const profileB = parts[1].profile;

    const newReportId = randomUUID();
    await tx.insert(reportsTable).values({
      id: newReportId,
      profileId: profileA.id,
      sessionId: rel.sessionId,
      type: "synastry",
      relationshipId,
      status: "interpreting",
    });
    // Defer the fire-and-forget kickoff until after the transaction
    // commits — otherwise the async worker may try to read the report
    // row before it's visible outside the transaction.
    kickoff = { reportId: newReportId, profileA, profileB, relType: rel.type ?? "romantic" };
    return newReportId;
  });

  if (kickoff) {
    const k = kickoff as { reportId: string; profileA: ProfileRow; profileB: ProfileRow; relType: string };
    kickoffSynastryGeneration(k.reportId, k.profileA, k.profileB, undefined, k.relType);
  }
  return reportId;
}

// Create a new synastry report between two profiles. Owns both ends:
// 1. validate the viewer owns both profiles,
// 2. resolve-or-create the relationship row,
// 3. create the report and kick off async generation.
router.post("/synastry", async (req, res) => {
  const parsed = CreateSynastryReportBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: parsed.error.message });
  }
  const { profileAId, profileBId, relationshipType, label } = parsed.data;
  if (profileAId === profileBId) {
    return res.status(400).json({ error: "validation_error", message: "Cannot run synastry against the same profile" });
  }

  try {
    const profiles = await db
      .select()
      .from(profilesTable)
      .where(
        and(
          inArray(profilesTable.id, [profileAId, profileBId]),
          viewerProfileFilter(req),
        ),
      );
    if (profiles.length !== 2) {
      return res.status(404).json({ error: "not_found", message: "Both profiles must exist and belong to you" });
    }
    const profileA = profiles.find((p) => p.id === profileAId)!;
    const profileB = profiles.find((p) => p.id === profileBId)!;

    // Find or create the relationship row keyed by the (sorted) participant pair.
    let relationshipId = await findRelationshipForPair(req, profileAId, profileBId);
    let effectiveType: RelationshipType;

    if (!relationshipId) {
      // New relationship — use the requested type, defaulting to "romantic".
      effectiveType = relationshipType ? normalizeType(relationshipType) : "romantic";
      relationshipId = randomUUID();
      await db.insert(relationshipsTable).values({
        id: relationshipId,
        sessionId: req.sessionId,
        userId: req.userId ?? null,
        type: effectiveType,
        label: label ?? null,
      });
      await db.insert(relationshipParticipantsTable).values([
        {
          id: randomUUID(),
          relationshipId,
          profileId: profileAId,
          role: "primary",
          position: "0",
        },
        {
          id: randomUUID(),
          relationshipId,
          profileId: profileBId,
          role: "secondary",
          position: "1",
        },
      ]);
    } else {
      // Existing relationship — read its stored type.
      const [existingRel] = await db
        .select({ type: relationshipsTable.type })
        .from(relationshipsTable)
        .where(eq(relationshipsTable.id, relationshipId))
        .limit(1);
      const storedType = normalizeType(existingRel?.type ?? "romantic");
      if (relationshipType !== undefined && normalizeType(relationshipType) !== storedType) {
        // Caller explicitly changed the type — update the relationship row so
        // the report page always reflects the type used for this generation.
        effectiveType = normalizeType(relationshipType);
        await db
          .update(relationshipsTable)
          .set({ type: effectiveType, updatedAt: new Date() })
          .where(eq(relationshipsTable.id, relationshipId));
      } else {
        // No type override — keep the stored type so generation matches the
        // relationship's established context.
        effectiveType = storedType;
      }
    }

    const reportId = randomUUID();
    await db.insert(reportsTable).values({
      id: reportId,
      profileId: profileAId,
      sessionId: req.sessionId,
      type: "synastry",
      relationshipId,
      status: "interpreting",
    });

    kickoffSynastryGeneration(reportId, profileA, profileB, req.log, effectiveType);

    // Soft-consume the appropriate credit type for signed-in users.
    if (req.userId) {
      const creditType = effectiveType === "parent_child" ? "parent_child" : "couple";
      consumeCredit(req.userId, creditType, reportId).catch((err) => {
        req.log.error({ err, reportId }, "Failed to consume synastry credit");
      });
    }

    return res.status(201).json({
      id: reportId,
      relationshipId,
      status: "interpreting",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create synastry report");
    return res.status(500).json({ error: "internal_error", message: "Failed to create synastry report" });
  }
});

// Get a synastry report by id. Joins both participant profiles for display.
router.get("/synastry/:id", async (req, res) => {
  const parsed = GetReportParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: "Invalid id" });
  }

  try {
    const rows = await db
      .select()
      .from(reportsTable)
      .where(
        and(eq(reportsTable.id, parsed.data.id), eq(reportsTable.type, "synastry")),
      )
      .limit(1);
    if (!rows.length) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const r = rows[0];

    if (!r.relationshipId) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }

    // Ownership check: viewer must own the relationship.
    const relRows = await db
      .select()
      .from(relationshipsTable)
      .where(eq(relationshipsTable.id, r.relationshipId))
      .limit(1);
    if (!relRows.length) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const rel = relRows[0];
    const viewer = { userId: req.userId, sessionId: req.sessionId };
    const isOwner = ownsRelationship(viewer, rel);

    const parts = await db
      .select({ rp: relationshipParticipantsTable, profile: profilesTable })
      .from(relationshipParticipantsTable)
      .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
      .where(eq(relationshipParticipantsTable.relationshipId, rel.id))
      .orderBy(asc(relationshipParticipantsTable.position));

    const isParticipant = !isOwner
      && (await viewerHasGrantOnRelationship(viewer, rel.id));
    const tokenViewer = !isOwner && !isParticipant
      && (await tokenGrantsRelationshipRead(req.query.token as string | undefined, rel.id));
    if (!isOwner && !isParticipant && !tokenViewer) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }

    const profileRows = parts.map((p) => p.profile);
    const invites = await openInvitesByProfile(profileRows.map((p) => p.id));
    const claimers = await claimerNamesByProfile(profileRows);

    return res.json({
      id: r.id,
      relationshipId: rel.id,
      type: rel.type,
      label: rel.label,
      status: r.status,
      participants: parts.map((p) => ({
        id: p.profile.id,
        name: p.profile.name,
        role: p.rp.role,
        birthDate: p.profile.birthDate,
        birthPlace: p.profile.birthPlace,
        ...(({ sun, moon, rising }) => ({
          sunSign: sun,
          moonSign: moon,
          risingSign: rising,
        }))(signsOf(p.profile)),
        ownership: profileOwnershipFor(viewer, p.profile, invites.get(p.profile.id) ?? null),
        claimedByName: claimers.get(p.profile.id) ?? null,
        // inviteEmail is recipient PII; only the owner of the
        // relationship may see it. Participants and token-viewers
        // get null even if an invite is outstanding.
        inviteEmail: isOwner ? (invites.get(p.profile.id) ?? null) : null,
        selfProfile: !!viewer.userId && p.profile.claimedByUserId === viewer.userId,
      })),
      compute: r.computeData ?? null,
      interpretation: r.interpretation ?? null,
      errorMessage: r.errorMessage ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      ownership: isOwner ? "owner" : (isParticipant ? "participant" : "viewer"),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get synastry report");
    return res.status(500).json({ error: "internal_error", message: "Failed to get synastry report" });
  }
});

// Status poll for the synastry generation.
router.get("/synastry/:id/status", async (req, res) => {
  const parsed = GetReportParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", message: "Invalid id" });
  }
  try {
    const rows = await db
      .select()
      .from(reportsTable)
      .where(and(eq(reportsTable.id, parsed.data.id), eq(reportsTable.type, "synastry")))
      .limit(1);
    if (!rows.length) {
      return res.status(404).json({ error: "not_found", message: "Report not found" });
    }
    const r = rows[0];
    if (!r.relationshipId) return res.status(404).json({ error: "not_found", message: "Report not found" });
    const relRows = await db
      .select()
      .from(relationshipsTable)
      .where(eq(relationshipsTable.id, r.relationshipId))
      .limit(1);
    if (!relRows.length) return res.status(404).json({ error: "not_found", message: "Report not found" });
    const rel = relRows[0];
    const viewer = { userId: req.userId, sessionId: req.sessionId };
    const canRead = ownsRelationship(viewer, rel)
      || (await viewerHasGrantOnRelationship(viewer, rel.id))
      || (await tokenGrantsRelationshipRead(req.query.token as string | undefined, rel.id));
    if (!canRead) return res.status(404).json({ error: "not_found", message: "Report not found" });

    const statusToProgress: Record<string, number> = {
      pending: 5,
      computing: 30,
      interpreting: 65,
      complete: 100,
      failed: 0,
    };
    return res.json({
      id: r.id,
      status: r.status,
      progress: statusToProgress[r.status] ?? 0,
      errorMessage: r.errorMessage ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get synastry status");
    return res.status(500).json({ error: "internal_error", message: "Failed to get synastry status" });
  }
});

export default router;
