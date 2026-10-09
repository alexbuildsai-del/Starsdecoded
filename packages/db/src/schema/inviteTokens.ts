import { pgTable, text, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";
import { relationshipsTable } from "./relationships";
import { creditsTable } from "./credits";

export const INVITE_KINDS = ["send", "gift", "share"] as const;
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
    // profile of its own (ADR-120, 139); "share" lets its claimer read the
    // sender's own Personal report through a grant, handing nothing over
    // (ADR-235). Plain text, so a new kind needs no DDL.
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
    // Stamped when the person a send reached hands the report back with Not me
    // (ADR-236), so the writer's row can read Handed back and offer Send again.
    handedBackAt: timestamp("handed_back_at"),
    // Whether the invite email was successfully delivered via Resend.
    // null = unknown / pre-migration rows.
    emailDelivered: boolean("email_delivered"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    // A gift's two answers (ADR-331, reading 16). The giver's Yes to "Share your report with {name} too?" grants their
    // own Personal report to whoever claims the gift, at the claim, and stays as their answer. The recipient's Yes at
    // the claim waits here until their own Personal report is finished, then becomes their grant and is cleared, so it
    // grants once and a later report never undoes their Stop sharing. Not now, and every gift from before, is false.
    giverShares: boolean("giver_shares").notNull().default(false),
    shareBack: boolean("share_back").notNull().default(false),
    // Copy their link on a waiting send or share (ADR-390): only a hash is kept, so each copy is a new link and takes
    // the place of the one copied before; the link in their email, token_hash, keeps working. Cancel invite ends both.
    linkHash: text("link_hash"),
  },
  (t) => [
    index("invite_tokens_token_hash_idx").on(t.tokenHash),
    index("invite_tokens_profile_id_idx").on(t.profileId),
    index("invite_tokens_relationship_id_idx").on(t.relationshipId),
    index("invite_tokens_created_by_user_id_kind_idx").on(t.createdByUserId, t.kind),
    // A unique index, never the column's `.unique()`: the push stops to ask before it puts a unique constraint on a
    // table that holds rows, and a deploy has no one to answer.
    uniqueIndex("invite_tokens_link_hash_idx").on(t.linkHash),
  ],
);

export type InviteToken = typeof inviteTokensTable.$inferSelect;
