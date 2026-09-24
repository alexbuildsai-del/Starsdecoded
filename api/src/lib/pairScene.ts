/**
 * The two scenes a reader has not read yet, one tap away (ADR-65, ADR-72).
 * A lens chapter carries three curated scenes and the report wrote one; the
 * other two are written here on the same chapter brief, by MODELS.scenes,
 * once per report, chapter and index, stored on the interpretation and
 * served from storage on every later tap. Usage lands on meta.usage.
 *
 * Storage sits behind `SceneStore` so the refusals and the once-only write
 * can be proven against memory; `dbStore` is the one the route uses.
 */
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, profilesTable, relationshipsTable, reportsTable } from "@workspace/db";
import type { NatalChartData } from "./chartCalculation.js";
import type { ReportInterpretation } from "./aiInterpretation.js";
import { callStructured } from "./aiInterpretation.js";
import { MODELS } from "./models.js";
import { buildPairBrief, type Lens, type PairInput } from "./pairBrief.js";
import { pairSectionCall, type PairInterpretation } from "./pairInterpretation.js";
import { buildReportUsage } from "./usage.js";
import { allocationOf, evidenceProblems, pairChapterId, pairChapterIds, pairSectionById, ratingProblems, sceneProblems, bandProblems, scenesOf } from "../prompts/pair/index.js";
import { BAND_DOCTRINE } from "../prompts/pair/sections/parent-child/doctrine.js";
import { logger } from "./logger.js";

export class SceneRequestError extends Error {
  constructor(public readonly status: 400 | 404, message: string) {
    super(message);
    this.name = "SceneRequestError";
  }
}

export interface SceneSide { name: string; birthDate: string; chart: NatalChartData; interpretation: ReportInterpretation }

export interface StoredPair {
  interpretation: PairInterpretation;
  lens: Lens;
  label: string | null;
  parent: "A" | "B" | null;
  a: SceneSide;
  b: SceneSide;
}

export interface SceneStore {
  load(reportId: string): Promise<StoredPair | null>;
  save(reportId: string, interpretation: PairInterpretation): Promise<void>;
}

const SceneSchema = z.object({ scene: z.string().describe("four to six present-tense sentences with both names; may hold a short quoted exchange; no fact outside the brief") });

/** The chapter and index a tap may ask for: a lens chapter of this report, and one of its two unread scenes. */
export function checkSceneRequest(interpretation: PairInterpretation, chapter: string, index: number): { titles: string[]; written: number; stored: string | null } {
  const lens = interpretation.meta?.lens;
  const scenes = interpretation.scenes?.[chapter];
  if (!lens || !scenes || !pairChapterIds(lens).includes(chapter) || chapter === "twoCharts" || chapter === "whatToPractise") {
    throw new SceneRequestError(400, `${chapter} is not a lens chapter of this report`);
  }
  if (!Number.isInteger(index) || index < 0 || index > 2 || index === scenes.written) {
    throw new SceneRequestError(400, `scene ${index} is not one of this chapter's two unread scenes`);
  }
  return { titles: scenes.titles, written: scenes.written, stored: scenes.texts[String(index)] ?? null };
}

/**
 * The scene, written now or served from storage. MB-64 provisional: written
 * once per report, chapter and index, so a reader who taps back finds the
 * same scene and a report costs at most ten extra calls.
 */
export async function writeScene(reportId: string, chapter: string, index: number, store: SceneStore = dbStore): Promise<{ chapter: string; index: number; text: string }> {
  const pair = await store.load(reportId);
  if (!pair) throw new SceneRequestError(404, "Report not found");
  const { interpretation } = pair;
  const request = checkSceneRequest(interpretation, chapter, index);
  if (request.stored) return { chapter, index, text: request.stored };

  const input: PairInput = {
    lens: pair.lens,
    parent: pair.parent,
    label: pair.label,
    // The band is the one the report was written under.
    at: new Date(interpretation.meta.generatedAt),
    a: pair.a,
    b: pair.b,
  };
  const brief = buildPairBrief(input);
  brief.allocation = allocationOf(interpretation.foundation, brief, (n) => pairChapterId(brief.lens, n));
  const spec = pairSectionById(chapter)!;
  const titles = scenesOf(spec, brief.band) ?? request.titles;
  const title = titles[index];
  const tail = [
    `SCENE ONLY. The chapter above has already been written; do not return it. Write scene ${index + 1} of this chapter, "${title}", for these two people: four to six present-tense sentences with both names, in the lens register, a short quoted exchange allowed, no fact outside the brief, no body, sign, aspect or orb, no number. Return only the scene.`,
  ].join("\n");
  const prompt = await pairSectionCall(spec, brief, interpretation.foundation, tail);
  const startedAt = Date.now();
  const call = await callStructured<z.infer<typeof SceneSchema>>({
    usageKey: `${spec.key}:scene${index}`,
    model: MODELS.scenes,
    system: prompt.system,
    user: prompt.user,
    schema: SceneSchema,
    maxTokens: 1_500,
    validate: (out) => [
      ...sceneProblems(out.scene, { a: brief.a.name, b: brief.b.name }),
      ...evidenceProblems(out.scene),
      ...ratingProblems(out.scene),
      ...(brief.lens === "parent_child" ? bandProblems(out.scene, brief.band, BAND_DOCTRINE) : []),
    ],
  });

  const scenes = { ...interpretation.scenes, [chapter]: { ...interpretation.scenes[chapter], texts: { ...interpretation.scenes[chapter].texts, [String(index)]: call.data.scene } } };
  const previous = interpretation.meta.usage;
  const usage = buildReportUsage([...(previous?.sections ?? []), call.usage], (previous?.wallClockMs ?? 0) + (Date.now() - startedAt));
  const next: PairInterpretation = { ...interpretation, scenes, meta: { ...interpretation.meta, usage } };
  await store.save(reportId, next);
  logger.info({ reportId, chapter, index, costUsd: usage.costUsd }, "scene written on tap");
  return { chapter, index, text: call.data.scene };
}

export const dbStore: SceneStore = {
  async load(reportId) {
    const [r] = await db.select().from(reportsTable).where(and(eq(reportsTable.id, reportId), eq(reportsTable.type, "compatibility"))).limit(1);
    if (!r || !r.interpretation || !r.relationshipId) return null;
    const [rel] = await db.select().from(relationshipsTable).where(eq(relationshipsTable.id, r.relationshipId)).limit(1);
    const compute = (r.computeData ?? {}) as { reportAId?: string; reportBId?: string; lens?: string };
    const side = async (id: string | undefined): Promise<SceneSide | null> => {
      if (!id) return null;
      const rows = await db.select({ report: reportsTable, profile: profilesTable }).from(reportsTable)
        .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id)).where(eq(reportsTable.id, id)).limit(1);
      const row = rows[0];
      if (!row || !row.report.interpretation || !row.profile.chartData) return null;
      return { name: row.profile.name, birthDate: row.profile.birthDate, chart: row.profile.chartData as NatalChartData, interpretation: row.report.interpretation as ReportInterpretation };
    };
    const [a, b] = await Promise.all([side(compute.reportAId), side(compute.reportBId)]);
    if (!a || !b) return null;
    const interpretation = r.interpretation as PairInterpretation;
    // Under the parent lens the parent is whichever side's positional role says so; the meta's names tell which side is A.
    const parent = interpretation.meta.lens === "parent_child" ? await parentSide(r.relationshipId, a.name) : null;
    return { interpretation, lens: (rel?.type ?? interpretation.meta.lens) as Lens, label: rel?.label ?? interpretation.meta.label ?? null, parent, a, b };
  },
  async save(reportId, interpretation) {
    await db.update(reportsTable).set({ interpretation: interpretation as unknown as object, updatedAt: new Date() }).where(eq(reportsTable.id, reportId));
  },
};

async function parentSide(relationshipId: string, nameA: string): Promise<"A" | "B"> {
  const { relationshipParticipantsTable } = await import("@workspace/db");
  const parts = await db.select({ role: relationshipParticipantsTable.role, name: profilesTable.name })
    .from(relationshipParticipantsTable)
    .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
    .where(eq(relationshipParticipantsTable.relationshipId, relationshipId));
  const parent = parts.find((p) => p.role === "parent");
  return parent && parent.name !== nameA ? "B" : "A";
}
