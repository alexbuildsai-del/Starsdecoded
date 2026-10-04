import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profilesTable } from "./profiles";
import { inviteTokensTable } from "./inviteTokens";

/**
 * A reader's grant to read someone's own Personal report (ADR-235). Sharing
 * hands nothing over, so the grant is its own row and the profile stays its
 * owner's. Stop sharing stamps revoked_at instead of deleting, which is why
 * the one-grant-per-reader rule is a unique index over live grants only: a
 * stopped share never blocks sharing again.
 *
 * Every name is the one migrate-add-shares-and-workbooks.ts uses, so whichever
 * of that script and the schema push makes the table, the other finds no drift.
 */
export const profileSharesTable = pgTable(
  "profile_shares",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    ownerUserId: text("owner_user_id").notNull(),
    readerUserId: text("reader_user_id").notNull(),
    // Empty for Share yours back, which grants with no invite since both people
    // are known; a grant outlives the invite row that made it.
    inviteId: text("invite_id").references(() => inviteTokensTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => [
    uniqueIndex("profile_shares_profile_id_reader_user_id_idx")
      .on(t.profileId, t.readerUserId)
      .where(sql`${t.revokedAt} IS NULL`),
    index("profile_shares_reader_user_id_idx").on(t.readerUserId),
    index("profile_shares_owner_user_id_idx").on(t.ownerUserId),
  ],
);

export type ProfileShare = typeof profileSharesTable.$inferSelect;
export type InsertProfileShare = typeof profileSharesTable.$inferInsert;
