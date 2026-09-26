import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * The pre-launch waitlist (ADR-141): one row per address, kept to tell that
 * person Stars Decoded is open. Nothing else about them is stored: no IP, no
 * session, no name (R-3.5). `consent` names the wording they agreed to, so the
 * list can show what each address signed up for.
 */
export const waitlistSignupsTable = pgTable(
  "waitlist_signups",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    consent: text("consent").notNull(),
    source: text("source"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("waitlist_signups_email_idx").on(t.email),
    index("waitlist_signups_created_at_idx").on(t.createdAt),
  ],
);

export type WaitlistSignup = typeof waitlistSignupsTable.$inferSelect;
export type InsertWaitlistSignup = typeof waitlistSignupsTable.$inferInsert;
