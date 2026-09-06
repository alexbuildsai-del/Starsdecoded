import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const reportsTable = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    type: text("type").notNull().default("natal"),
    relationshipId: text("relationship_id"),
    status: text("status").notNull().default("pending"),
    interpretation: jsonb("interpretation"),
    computeData: jsonb("compute_data"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("reports_profile_id_idx").on(t.profileId),
    index("reports_session_id_idx").on(t.sessionId),
    index("reports_relationship_id_idx").on(t.relationshipId),
  ],
);

export const insertReportSchema = createInsertSchema(reportsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
