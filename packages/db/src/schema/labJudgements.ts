import { pgTable, text, timestamp, jsonb, index, integer } from "drizzle-orm/pg-core";

/**
 * One row per reading-room card (ADR-54). `variants` is the shuffled order
 * the card was shown in, as `lab_runs` ids, so letter A is index 0 for
 * ever; models and costs stay hidden until `revealed_at`. A session is the
 * set of cards sharing `session_id`; there is no session table.
 */
export const labJudgementsTable = pgTable(
  "lab_judgements",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    sessionLabel: text("session_label").notNull(),
    fixture: text("fixture").notNull(),
    section: text("section").notNull(),
    cardIndex: integer("card_index").notNull(),
    variants: jsonb("variants").notNull().default([]),
    picks: jsonb("picks"),
    note: text("note"),
    judgedAt: timestamp("judged_at"),
    revealedAt: timestamp("revealed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("lab_judgements_session_id_idx").on(t.sessionId),
    index("lab_judgements_created_at_idx").on(t.createdAt),
  ],
);

export type LabJudgement = typeof labJudgementsTable.$inferSelect;
export type InsertLabJudgement = typeof labJudgementsTable.$inferInsert;
/** Letters are indexes into `variants`; `same` holds the tie groups. */
export interface LabPicks {
  best: number[];
  notShip: number[];
  same: number[][];
}
