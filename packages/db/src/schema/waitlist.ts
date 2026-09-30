import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * The pre-launch waitlist (ADR-141): one row per address, kept to tell that
 * person Stars Decoded is open. Nothing else about them is stored: no IP, no
 * session, no name (R-3.5). `consent` names the wording they agreed to, so the
 * list can show what each address signed up for; `utm_content` names the post
 * that brought them (ADR-147).
 *
 * Double opt-in (ADR-145): a row counts once its owner follows the emailed
 * link, so nobody can put someone else's address on the list. Only the link
 * token's SHA-256 is kept, so a leaked table confirms nobody. `confirm_sent_at`
 * dates the current link, which lives seven days, and holds back another for
 * ten minutes. Rows joined under `launch-email-v1` predate the link and read
 * confirmed at their `created_at`.
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
    utmContent: text("utm_content"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at"),
    confirmTokenHash: text("confirm_token_hash"),
    confirmSentAt: timestamp("confirm_sent_at"),
  },
  (t) => [
    uniqueIndex("waitlist_signups_email_idx").on(t.email),
    index("waitlist_signups_created_at_idx").on(t.createdAt),
    uniqueIndex("waitlist_signups_confirm_token_hash_idx").on(t.confirmTokenHash),
  ],
);

export type WaitlistSignup = typeof waitlistSignupsTable.$inferSelect;
export type InsertWaitlistSignup = typeof waitlistSignupsTable.$inferInsert;
