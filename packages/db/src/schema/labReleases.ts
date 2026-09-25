import { pgTable, text, timestamp, jsonb, index, boolean } from "drizzle-orm/pg-core";

/**
 * One row per release started from the admin Release view (ADR-86): the
 * heads it compared, whether the brain moved, each step's state and the QA
 * verdict. The row is the state, so a restart mid-release resumes or stops
 * from what it holds rather than from memory.
 */
export const labReleasesTable = pgTable(
  "lab_releases",
  {
    id: text("id").primaryKey(),
    sha: text("sha").notNull(),
    productionSha: text("production_sha"),
    brainChanged: boolean("brain_changed").notNull().default(false),
    pairChanged: boolean("pair_changed").notNull().default(false),
    status: text("status").notNull().default("running"),
    steps: jsonb("steps").notNull().default([]),
    qa: jsonb("qa"),
    error: text("error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("lab_releases_created_at_idx").on(t.createdAt)],
);

export type LabRelease = typeof labReleasesTable.$inferSelect;
export type InsertLabRelease = typeof labReleasesTable.$inferInsert;
export type LabReleaseStatus = "running" | "stopped" | "passed" | "failed" | "forwarded";
