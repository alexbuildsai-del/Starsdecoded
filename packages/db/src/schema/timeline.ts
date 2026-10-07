import { pgTable, text, timestamp, jsonb, date, index, uniqueIndex } from "drizzle-orm/pg-core";

export const TIMELINE_READING_STATUSES = ["writing", "ready", "failed"] as const;
export type TimelineReadingStatus = (typeof TIMELINE_READING_STATUSES)[number];

/**
 * A reading of one sky event on one reader's chart (ADR-210), written once and
 * kept, so opening it again costs no model call. One row per profile and event
 * key: a second open finds the first one's row, still writing or done. When
 * its basis (reading 8) no longer matches, the row is written again in place.
 *
 * No reference to profiles: deleting a Personal report can leave its profile
 * in place, so a cascade would miss the readings; the API removes them with
 * the report (forgetTimeline), whatever becomes of the profile.
 *
 * Every name is the one migrate-add-timeline.ts uses, so whichever of that
 * script and the schema push makes the table, the other finds no drift.
 */
export const timelineReadingsTable = pgTable(
  "timeline_readings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    profileId: text("profile_id").notNull(),
    eventKey: text("event_key").notNull(),
    basis: text("basis").notNull(),
    // Plain text, as every status and kind in this schema is, so a new one needs no DDL.
    status: text("status", { enum: TIMELINE_READING_STATUSES }).notNull(),
    reading: jsonb("reading"),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("timeline_readings_profile_id_event_key_idx").on(t.profileId, t.eventKey),
    index("timeline_readings_user_id_idx").on(t.userId),
  ],
);

export type TimelineReadingRow = typeof timelineReadingsTable.$inferSelect;
export type InsertTimelineReadingRow = typeof timelineReadingsTable.$inferInsert;

export const ASK_ROLES = ["reader", "ask"] as const;
export type AskRole = (typeof ASK_ROLES)[number];

/**
 * One message in a reader's chat with Ask (ADR-213): what the reader sent, or
 * Ask's reply with its cards and choices. Its own table, not the port's
 * `messages`, which belongs to no user (MB-22). How long a message is kept is
 * Ask's rule (MB-191), not the table's. The one index serves both the thread,
 * read by user and time, and the month's count of the reader's messages
 * against the cap (reading 13).
 *
 * Every name is the one migrate-add-timeline.ts uses, so whichever of that
 * script and the schema push makes the table, the other finds no drift.
 */
export const askMessagesTable = pgTable(
  "ask_messages",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    role: text("role", { enum: ASK_ROLES }).notNull(),
    body: jsonb("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ask_messages_user_id_created_at_idx").on(t.userId, t.createdAt)],
);

export type AskMessageRow = typeof askMessagesTable.$inferSelect;
export type InsertAskMessageRow = typeof askMessagesTable.$inferInsert;

export const TIMELINE_SETUP_STATES = ["writing", "ready"] as const;
export type TimelineSetupState = (typeof TIMELINE_SETUP_STATES)[number];

/**
 * A subscriber's Timeline setup (ADR-302, 362): the six months written ahead,
 * from_day to to_day, from the Personal report it read. One row per account.
 * The days are the reader's own, so they are dates, not instants. replay_from
 * and replay_to are the next six months once written, until the reader has
 * seen them drawn (replay_seen_at).
 *
 * No reference to users or reports, as with timeline_readings: the API removes
 * the row with the reader's Timeline.
 *
 * Every name is the one migrate-add-jobs.ts uses, so whichever of that script
 * and the schema push makes the table, the other finds no drift.
 */
export const timelineSetupsTable = pgTable("timeline_setups", {
  userId: text("user_id").primaryKey(),
  reportId: text("report_id").notNull(),
  fromDay: date("from_day").notNull(),
  toDay: date("to_day").notNull(),
  state: text("state", { enum: TIMELINE_SETUP_STATES }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  readyAt: timestamp("ready_at", { withTimezone: true }),
  replayFrom: date("replay_from"),
  replayTo: date("replay_to"),
  replaySeenAt: timestamp("replay_seen_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TimelineSetupRow = typeof timelineSetupsTable.$inferSelect;
export type InsertTimelineSetupRow = typeof timelineSetupsTable.$inferInsert;
