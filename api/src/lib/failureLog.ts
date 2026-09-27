/**
 * The failure log (ADR-85): every BLOCK, FIX, WARN, BUFFER and REPAIR a
 * section write met, and one `pass` row for a clean write, so the Failures
 * tab can say how often each rule fires per section. Messages are redacted
 * before they land: a quoted span is report text and never stored (R-3.5).
 * Recording never throws; a database that is down loses a row, not a report.
 */
import { randomUUID } from "node:crypto";
import { db, generationFailuresTable, type GenerationFailureClass, type GenerationFailureKind, type InsertGenerationFailure } from "@workspace/db";
import type { Check } from "../prompts/checks.js";
import { logger } from "./logger.js";

export interface RecordChecksInput {
  kind: GenerationFailureKind;
  section: string;
  model: string;
  writeId: string;
  reportId?: string | null;
  attempt: number;
  final: boolean;
  checks: Check[];
}

export type FailureSink = (rows: InsertGenerationFailure[]) => Promise<void>;

const dbSink: FailureSink = async (rows) => {
  if (rows.length) await db.insert(generationFailuresTable).values(rows);
};

let sink: FailureSink = dbSink;

/** Tests and the lab swap the store; returns the restore function. */
export function setFailureSink(next: FailureSink | null): () => void {
  const previous = sink;
  sink = next ?? dbSink;
  return () => { sink = previous; };
}

const MAX_MESSAGE = 160;

/** Quoted spans out, then a hard cap: a message names the rule and the place, never the words. */
export function redact(message: string): string {
  const stripped = message
    .replace(/"[^"]*"/g, '"…"')
    .replace(/“[^”]*”/g, "“…”")
    .replace(/'[^']{8,}'/g, "'…'")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > MAX_MESSAGE ? `${stripped.slice(0, MAX_MESSAGE - 1)}…` : stripped;
}

export function rowsFor(input: RecordChecksInput): InsertGenerationFailure[] {
  const base = { kind: input.kind, section: input.section, model: input.model, writeId: input.writeId, reportId: input.reportId ?? null, attempt: input.attempt, final: input.final };
  const rows: InsertGenerationFailure[] = input.checks.map((c) => ({ id: randomUUID(), ...base, ruleId: c.rule, class: c.cls, message: redact(c.message) }));
  if (input.final && !input.checks.some((c) => c.cls === "block")) {
    rows.push({ id: randomUUID(), ...base, ruleId: "pass", class: "pass" satisfies GenerationFailureClass, message: "" });
  }
  return rows;
}

const MUTE_MS = 60_000;
let mutedUntil = 0;

export async function recordChecks(input: RecordChecksInput): Promise<void> {
  const rows = rowsFor(input);
  if (!rows.length || Date.now() < mutedUntil) return;
  try {
    await sink(rows);
  } catch (err) {
    // A database that is down loses rows for a minute, not a report and not the log's own noise.
    mutedUntil = Date.now() + MUTE_MS;
    logger.warn({ err: (err as Error).message, section: input.section, rows: rows.length }, "failure log: rows not written; muted for a minute");
  }
}

export interface FailureRow {
  section: string;
  ruleId: string;
  class: string;
  writeId: string;
  createdAt: Date | string;
}

export interface FailureCount {
  rule: string;
  section: string;
  cls: string;
  count: number;
  lastAt: string;
  /** Writes among the section's last 20 on which the rule fired, over 20 (or fewer, when the section has fewer writes). */
  rate: number;
  /** More than 1 in 10 of the section's last 20 writes: a prompt fix for the next round (ADR-85). */
  flagged: boolean;
}

const WINDOW = 20;

/** Pure: counts per rule and section over the rows given, flagging a rule that fired in more than 2 of the section's last 20 writes. */
export function failureCounts(rows: FailureRow[]): FailureCount[] {
  const bySection = new Map<string, FailureRow[]>();
  for (const r of rows) (bySection.get(r.section) ?? bySection.set(r.section, []).get(r.section)!).push(r);
  const out: FailureCount[] = [];
  for (const [section, list] of bySection) {
    const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const recentWrites: string[] = [];
    for (const r of sorted) {
      if (!recentWrites.includes(r.writeId)) recentWrites.push(r.writeId);
      if (recentWrites.length === WINDOW) break;
    }
    const window = new Set(recentWrites);
    const perRule = new Map<string, { cls: string; count: number; lastAt: string; writes: Set<string> }>();
    for (const r of sorted) {
      if (r.ruleId === "pass") continue;
      const at = new Date(r.createdAt).toISOString();
      const entry = perRule.get(r.ruleId) ?? { cls: r.class, count: 0, lastAt: at, writes: new Set<string>() };
      entry.count += 1;
      if (at > entry.lastAt) entry.lastAt = at;
      if (window.has(r.writeId)) entry.writes.add(r.writeId);
      perRule.set(r.ruleId, entry);
    }
    for (const [rule, e] of perRule) {
      const denominator = Math.max(1, window.size);
      out.push({ rule, section, cls: e.cls, count: e.count, lastAt: e.lastAt, rate: e.writes.size / denominator, flagged: e.writes.size > 2 });
    }
  }
  return out.sort((a, b) => Number(b.flagged) - Number(a.flagged) || b.count - a.count || a.section.localeCompare(b.section));
}
