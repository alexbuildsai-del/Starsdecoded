/**
 * The QA agent on Railway staging (ADR-86; MB-77, MB-78): the five personas
 * walk staging in headless Chromium and the QA model reads one natal and
 * one pair report from the release lab's runs against the style contract.
 * Any sev-1 is `fail`. No browser on the image is `unconfigured`, never a
 * crash. Cost is recorded as one `qa` row in `lab_runs` so it counts in the
 * lab budget (ADR-77). The walk never creates a report.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, labRunsTable, type InsertLabRun } from "@workspace/db";
import { qaAgentModel, type ModelId } from "../models.js";
import { costUsd, type SectionUsage } from "../usage.js";
import { logger } from "../logger.js";
import { chromiumWalker, findChromium, type Walker } from "./browser.js";
import { PERSONAS } from "./personas.js";
import { liveReader, reportText, walkFindings, type Finding, type ReaderEngine } from "./reader.js";

export type { Finding };

export interface QaVerdict {
  status: "pass" | "fail" | "unconfigured";
  findings: Finding[];
  costUsd: number;
  reason?: string;
}

export interface QaStore {
  sections(runKey: string): Promise<Array<{ section: string; output: unknown }>>;
  record(row: InsertLabRun): Promise<void>;
}

export const dbQaStore: QaStore = {
  async sections(runKey) {
    const rows = await db.select({ section: labRunsTable.section, output: labRunsTable.output }).from(labRunsTable).where(eq(labRunsTable.runKey, runKey));
    return rows;
  },
  async record(row) { await db.insert(labRunsTable).values(row); },
};

export interface QaAgentInput {
  webOrigin: string;
  natalRunKey: string | null;
  pairRunKey: string | null;
  signal?: AbortSignal;
  /** Injected by tests and rehearsals; the defaults are the real browser and the real model. */
  walker?: Walker | null;
  reader?: ReaderEngine;
  store?: QaStore;
  model?: ModelId;
  label?: string;
}

export async function runQaAgent(input: QaAgentInput): Promise<QaVerdict> {
  const model = input.model ?? qaAgentModel();
  const store = input.store ?? dbQaStore;
  const reader = input.reader ?? liveReader;
  const walker = input.walker === undefined ? (() => { const exe = findChromium(); return exe ? chromiumWalker(exe) : null; })() : input.walker;
  if (!walker) return { status: "unconfigured", findings: [], costUsd: 0, reason: "no Chromium on this image (MB-77); set QA_BROWSER_PATH or add chromium to nixpacks.toml" };
  const findings: Finding[] = [];
  const usage: SectionUsage[] = [];
  try {
    const visits = await walker.walk(input.webOrigin, PERSONAS, input.signal);
    findings.push(...walkFindings(visits));
    const seen = await reader.see(model, visits, input.signal);
    findings.push(...seen.findings);
    usage.push(seen.usage);
    for (const [label, runKey] of [["natal", input.natalRunKey], ["pair", input.pairRunKey]] as const) {
      if (!runKey) continue;
      const sections = await store.sections(runKey);
      if (!sections.length) { findings.push({ sev: 2, where: `${label} report ${runKey}`, title: "no run to read", detail: "the release lab wrote no rows under this key" }); continue; }
      const read = await reader.read(model, label, reportText(sections), input.signal);
      findings.push(...read.findings.map((f) => ({ ...f, where: f.where || `${label} report` })));
      usage.push(read.usage);
    }
  } catch (err) {
    findings.push({ sev: 1, where: "the QA agent", title: "the agent itself failed", detail: err instanceof Error ? err.message : String(err) });
  }
  const cost = usage.reduce((n, u) => n + (costUsd(u.model ?? model, { ...u }) ?? 0), 0);
  const status: QaVerdict["status"] = findings.some((f) => f.sev === 1) ? "fail" : "pass";
  try {
    await store.record({
      id: randomUUID(), runKey: `qa:${randomUUID()}`, fixture: "staging", label: input.label ?? `qa-${new Date().toISOString().slice(0, 10)}`, source: "qa",
      section: "qa", model, serviceTier: "standard", status: "done", output: { status, findings } as object,
      usage: usage as unknown as object, faults: findings.filter((f) => f.sev === 1).map((f) => `sev1:${f.title}`), words: 0, costUsd: cost, seconds: null,
    });
  } catch (err) {
    logger.warn({ err }, "qa row not recorded");
  }
  return { status, findings, costUsd: cost };
}
