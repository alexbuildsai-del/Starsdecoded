/**
 * The horizon pass (ADR-35, ADR-36): a birth time was added or corrected on a
 * profile, so every complete natal report of that profile is amended, never
 * regenerated. The previous text and chart go to report_revisions first; the
 * report reads throughout as `revising`; the horizon blocks are generated and
 * stored section by section so the page can follow; the rest is amended by
 * quote match; a failure restores the previous text and the previous profile
 * and records the error, so the chart never contradicts the text. The first
 * pass is free and no credit is consumed this round (MB-52).
 *
 * Storage is behind `PassStore` so the ordering and the failure path can be
 * proven against memory; `dbStore` is the one the route uses.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, profilesTable, reportRevisionsTable, reportsTable } from "@workspace/db";
import { hasHorizon, type NatalChartData } from "./chartCalculation.js";
import {
  amendSections, generateHorizonBlocks, countWords,
  type HorizonPassRecord, type ReportInterpretation, type SectionFrame,
} from "./aiInterpretation.js";
import { buildBrief } from "../prompts/index.js";
import { sectOf } from "./traditional.js";
import { buildReportUsage, type SectionUsage } from "./usage.js";
import { logger } from "./logger.js";

export interface PassInput {
  reportId: string;
  profileId: string;
  name: string;
  /** What the profile said before, restored whole if the pass fails so the chart never contradicts the text. */
  previous: { birthTime: string; birthTimeWindowMinutes: number; chart: NatalChartData | null };
  chart: NatalChartData;
}

export interface PassStore {
  load(reportId: string): Promise<{ interpretation: ReportInterpretation | null; horizonPasses: number } | null>;
  saveRevision(reportId: string, interpretation: ReportInterpretation, chart: NatalChartData | null): Promise<void>;
  setRevising(reportId: string): Promise<void>;
  writeFrame(reportId: string, interpretation: ReportInterpretation): Promise<void>;
  finish(reportId: string, interpretation: ReportInterpretation, passes: number): Promise<void>;
  fail(reportId: string, previous: ReportInterpretation, message: string, input: PassInput): Promise<void>;
}

export const dbStore: PassStore = {
  async load(reportId) {
    const [row] = await db.select().from(reportsTable).where(eq(reportsTable.id, reportId)).limit(1);
    return row ? { interpretation: (row.interpretation as ReportInterpretation | null) ?? null, horizonPasses: row.horizonPasses ?? 0 } : null;
  },
  async saveRevision(reportId, interpretation, chart) {
    await db.insert(reportRevisionsTable).values({
      id: randomUUID(),
      reportId,
      interpretation: interpretation as unknown as object,
      chartData: (chart ?? null) as unknown as object | null,
      reason: "birth_time_added",
    });
  },
  async setRevising(reportId) {
    await db.update(reportsTable).set({ status: "revising", errorMessage: null, updatedAt: new Date() }).where(eq(reportsTable.id, reportId));
  },
  async writeFrame(reportId, interpretation) {
    await db.update(reportsTable).set({ interpretation: interpretation as unknown as object, updatedAt: new Date() }).where(eq(reportsTable.id, reportId));
  },
  async finish(reportId, interpretation, passes) {
    await db.update(reportsTable)
      .set({ interpretation: interpretation as unknown as object, status: "complete", horizonPasses: passes, errorMessage: null, updatedAt: new Date() })
      .where(eq(reportsTable.id, reportId));
  },
  async fail(reportId, previous, message, input) {
    await db.update(reportsTable)
      .set({ interpretation: previous as unknown as object, status: "complete", errorMessage: `horizon pass failed: ${message}`, updatedAt: new Date() })
      .where(eq(reportsTable.id, reportId));
    await db.update(profilesTable).set({
      birthTime: input.previous.birthTime,
      birthTimeWindowMinutes: input.previous.birthTimeWindowMinutes,
      chartData: (input.previous.chart ?? null) as unknown as object | null,
      updatedAt: new Date(),
    }).where(eq(profilesTable.id, input.profileId));
  },
};

/**
 * Chained writes, so two frames can never race and lose a section. Closed
 * before the final write, so a call still in flight after a failure cannot
 * land its frame on top of the restored text.
 */
function writer(store: PassStore, reportId: string, base: ReportInterpretation) {
  let partial: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) };
  let chain: Promise<void> = Promise.resolve();
  let closed = false;
  return {
    push: (frame: SectionFrame): Promise<void> => {
      if (closed) return Promise.resolve();
      partial = { ...partial, ...frame.patch };
      const snapshot = partial as unknown as ReportInterpretation;
      chain = chain.then(() => (closed ? undefined : store.writeFrame(reportId, snapshot)));
      return chain;
    },
    current: () => partial as unknown as ReportInterpretation,
    close: async () => { closed = true; await chain.catch(() => undefined); },
  };
}

export async function runHorizonPass(input: PassInput, store: PassStore = dbStore): Promise<void> {
  const { reportId, chart } = input;
  if (!hasHorizon(chart)) throw new Error("runHorizonPass needs a chart whose horizon holds");

  const row = await store.load(reportId);
  if (!row || !row.interpretation) return;
  const previous = row.interpretation;
  const startedAt = Date.now();

  // The previous text and chart are kept before anything changes (ADR-35).
  await store.saveRevision(reportId, previous, input.previous.chart);
  await store.setRevising(reportId);

  const w = writer(store, reportId, previous);
  try {
    const brief = buildBrief(chart, input.name);
    // The horizon blocks land first, then every stored section is amended.
    const blocks = await generateHorizonBlocks(chart, input.name, previous, { onSection: w.push });
    await w.push({ section: "meta", patch: { angleMeanings: blocks.angleMeanings, personalPlanets: brief.personalPlanets, aspectMeanings: brief.aspectMeanings } });
    const withBlocks = w.current();
    const amended = await amendSections(chart, withBlocks, brief, { onSection: w.push });

    const passUsage: SectionUsage[] = [...blocks.usage, ...amended.usage];
    const sentencesRevised = Object.values(amended.counts).reduce((n, c) => n + c.amended, 0);
    const paragraphsAdded = Object.values(amended.counts).reduce((n, c) => n + c.added, 0);
    const passes = row.horizonPasses + 1;
    const record: HorizonPassRecord = {
      at: new Date().toISOString(), passes, sentencesRevised, paragraphsAdded, sections: amended.record,
    };
    const s = sectOf(chart);
    const sectionsOnly = Object.fromEntries(Object.entries(amended.interpretation).filter(([k]) => !["meta", "foundation", "personalPlanets", "aspectMeanings", "angleMeanings"].includes(k)));
    const usage = buildReportUsage([...(previous.meta.usage?.sections ?? []), ...passUsage], (previous.meta.usage?.wallClockMs ?? 0) + (Date.now() - startedAt));
    const final: ReportInterpretation = {
      ...amended.interpretation,
      meta: {
        ...previous.meta,
        horizon: chart.horizon.status,
        horizonPass: record,
        ...(s ? { sect: s.sect, sectLight: s.light, sunAltitude: s.sunAltitude, sectMarginal: s.marginal } : {}),
        wordCount: countWords(sectionsOnly),
        usage,
      },
    };
    await w.close();
    await store.finish(reportId, final, passes);
    logger.info({ reportId, sentencesRevised, paragraphsAdded, costUsd: usage.costUsd }, "horizon pass complete");
  } catch (err) {
    // A failed pass keeps the previous text and says so (R-3.3).
    const message = err instanceof Error ? err.message : "Unknown error";
    await w.close();
    await store.fail(reportId, previous, message, input);
    logger.error({ err, reportId }, "horizon pass failed; previous text and profile restored");
  }
}
