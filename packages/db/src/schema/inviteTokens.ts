import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";
import { relationshipsTable } from "./relationships";
import { creditsTable } from "./credits";

export const INVITE_KINDS = ["send", "gift"] as const;
export type InviteKind = (typeof INVITE_KINDS)[number];

export const inviteTokensTable = pgTable(
  "invite_tokens",
  {
    id: text("id").primaryKey(),
    // SHA-256 hash of the secret token. The plaintext token is only ever
    // shown to the inviter (in the share link); we never store it.
    tokenHash: text("token_hash").notNull().unique(),
    email: text("email").notNull(),
    // "send" hands over a finished report; "gift" holds a credit and has no
    // profile of its own (ADR-120, 139).
    kind: text("kind").notNull().default("send"),
    profileId: text("profile_id").references(() => profilesTable.id, { onDelete: "cascade" }),
    relationshipId: text("relationship_id").references(() => relationshipsTable.id, {
      onDelete: "cascade",
    }),
    // The credit a gift holds until claimed or returned (MB-83). No
    // gifted_by_user_id column: a gift grants no reading (ADR-139).
    creditId: text("credit_id").references(() => creditsTable.id, { onDelete: "set null" }),
    recipientName: text("recipient_name"),
    note: text("note"),
    createdByUserId: text("created_by_user_id"),
    createdBySessionId: text("created_by_session_id"),
    expiresAt: timestamp("expires_at").notNull(),
    claimedAt: timestamp("claimed_at"),
    claimedByUserId: text("claimed_by_user_id"),
    remindedAt: timestamp("reminded_at"),
    revokedAt: timestamp("revoked_at"),
    // Whether the invite email was successfully delivered via Resend.
    // null = unknown / pre-migration rows.
    emailDelivered: boolean("email_delivered"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("invite_tokens_token_hash_idx").on(t.tokenHash),
    index("invite_tokens_profile_id_idx").on(t.profileId),
    index("invite_tokens_relationship_id_idx").on(t.relationshipId),
    index("invite_tokens_created_by_user_id_kind_idx").on(t.createdByUserId, t.kind),
  ],
);

export type InviteToken = typeof inviteTokensTable.$inferSelect;
