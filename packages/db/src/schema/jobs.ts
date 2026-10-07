import { sql } from "drizzle-orm";
import { pgTable, uuid, text, jsonb, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";

// Plain text, as every status and kind in this schema is, so a new one needs no DDL.
export const JOB_STATUSES = ["queued", "running", "done", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * The API's job queue (ADR-357): one Postgres table worked inside the API, no
 * queue service. A worker takes a due row with FOR UPDATE SKIP LOCKED and holds
 * it by locked_until, so a row whose lease ran out is taken again rather than
 * kept running for good. The payload holds ids only, never what they name.
 * last_error is a code, never a message, since a message can carry what a row
 * holds.
 *
 * A dedupe key is unique only while its job is queued or running, so a key
 * that finished can be queued again. No reference to any other table: what a
 * job names can be deleted while it waits, and its handler finds that out.
 *
 * Every name is the one migrate-add-jobs.ts uses, so whichever of that script
 * and the schema push makes the table, the other finds no drift.
 */
export const jobsTable = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, string | number>>().notNull(),
    dedupeKey: text("dedupe_key"),
    status: text("status", { enum: JOB_STATUSES }).notNull(),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("jobs_dedupe_key_idx").on(t.dedupeKey).where(sql`${t.status} IN ('queued', 'running')`),
    index("jobs_status_run_at_idx").on(t.status, t.runAt),
  ],
);

export type JobRow = typeof jobsTable.$inferSelect;
export type InsertJobRow = typeof jobsTable.$inferInsert;
