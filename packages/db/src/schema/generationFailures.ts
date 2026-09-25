import { pgTable, text, timestamp, index, integer, boolean } from "drizzle-orm/pg-core";

/**
 * One row per check outcome on a section write (ADR-85): every BLOCK, FIX,
 * WARN, BUFFER and REPAIR, and one `pass` row for a clean write, so "a
 * section's last 20 writes" is the last 20 distinct write ids. The message
 * is redacted before it lands: never report text (R-3.5).
 */
export const generationFailuresTable = pgTable(
  "generation_failures",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    section: text("section").notNull(),
    ruleId: text("rule_id").notNull(),
    class: text("class").notNull(),
    message: text("message").notNull().default(""),
    model: text("model").notNull(),
    attempt: integer("attempt").notNull().default(1),
    final: boolean("final").notNull().default(false),
    writeId: text("write_id").notNull(),
    reportId: text("report_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("generation_failures_section_created_at_idx").on(t.section, t.createdAt),
    index("generation_failures_rule_id_idx").on(t.ruleId),
  ],
);

export type GenerationFailure = typeof generationFailuresTable.$inferSelect;
export type InsertGenerationFailure = typeof generationFailuresTable.$inferInsert;
export type GenerationFailureKind = "natal" | "pair" | "lab";
export type GenerationFailureClass = "block" | "fix" | "warn" | "buffer" | "repair" | "pass";
