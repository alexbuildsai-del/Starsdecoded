import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";
import { relationshipsTable } from "./relationships";

export const inviteTokensTable = pgTable(
  "invite_tokens",
  {
    id: text("id").primaryKey(),
    // SHA-256 hash of the secret token. The plaintext token is only ever
    // shown to the inviter (in the share link); we never store it.
    tokenHash: text("token_hash").notNull().unique(),
    email: text("email").notNull(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    relationshipId: text("relationship_id").references(() => relationshipsTable.id, {
      onDelete: "cascade",
    }),
    createdByUserId: text("created_by_user_id"),
    createdBySessionId: text("created_by_session_id"),
    expiresAt: timestamp("expires_at").notNull(),
    claimedAt: timestamp("claimed_at"),
    claimedByUserId: text("claimed_by_user_id"),
    // Whether the invite email was successfully delivered via Resend.
    // null = unknown / pre-migration rows.
    emailDelivered: boolean("email_delivered"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("invite_tokens_token_hash_idx").on(t.tokenHash),
    index("invite_tokens_profile_id_idx").on(t.profileId),
    index("invite_tokens_relationship_id_idx").on(t.relationshipId),
  ],
);

export type InviteToken = typeof inviteTokensTable.$inferSelect;
