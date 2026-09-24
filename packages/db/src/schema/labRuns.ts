import { pgTable, text, timestamp, jsonb, index, uniqueIndex, integer, doublePrecision } from "drizzle-orm/pg-core";

/**
 * One row per lab run and section: a published fixture run, a server replay
 * or an admin's own report read in place (ADR-52, ADR-53). Numbers live in
 * their own columns so the panel's Runs view never has to load `output`.
 * The chart and the subject's name sit only on the `foundation` row of a
 * `lab` run; a replay on an admin report reads them at run time (R-3.5).
 */
export const labRunsTable = pgTable(
  "lab_runs",
  {
    id: text("id").primaryKey(),
    /** `<fixture>.<label>` for a stored run, `replay:<uuid>` for a replay. */
    runKey: text("run_key").notNull(),
    fixture: text("fixture").notNull(),
    label: text("label").notNull(),
    source: text("source").notNull().default("lab"),
    baseRunKey: text("base_run_key"),
    baseReportId: text("base_report_id"),
    section: text("section").notNull(),
    model: text("model").notNull(),
    reasoningEffort: text("reasoning_effort"),
    serviceTier: text("service_tier").notNull().default("standard"),
    status: text("status").notNull().default("done"),
    error: text("error"),
    output: jsonb("output"),
    chart: jsonb("chart"),
    subjectName: text("subject_name"),
    usage: jsonb("usage"),
    faults: jsonb("faults").notNull().default([]),
    words: integer("words").notNull().default(0),
    costUsd: doublePrecision("cost_usd"),
    seconds: doublePrecision("seconds"),
    sessionId: text("session_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("lab_runs_run_key_section_idx").on(t.runKey, t.section),
    index("lab_runs_run_key_idx").on(t.runKey),
    index("lab_runs_session_id_idx").on(t.sessionId),
    index("lab_runs_created_at_idx").on(t.createdAt),
  ],
);

export type LabRun = typeof labRunsTable.$inferSelect;
export type InsertLabRun = typeof labRunsTable.$inferInsert;
export type LabRunSource = "lab" | "replay" | "report";
export type LabRunStatus = "queued" | "running" | "done" | "failed";
export type LabServiceTier = "flex" | "standard";
