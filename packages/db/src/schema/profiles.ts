import { pgTable, text, timestamp, jsonb, doublePrecision, index, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    userId: text("user_id"),
    claimedByUserId: text("claimed_by_user_id"),
    isSelf: boolean("is_self").notNull().default(false),
    name: text("name").notNull(),
    birthDate: text("birth_date").notNull(),
    birthTime: text("birth_time").notNull(),
    birthPlace: text("birth_place").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    timezoneOffset: doublePrecision("timezone_offset").notNull(),
    chartData: jsonb("chart_data"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("profiles_session_id_idx").on(t.sessionId),
    index("profiles_user_id_idx").on(t.userId),
    // Enforce at most one self-profile per authenticated user.
    // The partial condition means the unique constraint only fires when
    // is_self=true and user_id is not null — false rows are unconstrained.
    uniqueIndex("profiles_user_id_is_self_idx")
      .on(t.userId)
      .where(sql`${t.isSelf} = true AND ${t.userId} IS NOT NULL`),
  ],
);

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
