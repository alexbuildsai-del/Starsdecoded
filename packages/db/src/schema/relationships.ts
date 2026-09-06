import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";

export const relationshipsTable = pgTable(
  "relationships",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    userId: text("user_id"),
    type: text("type").notNull().default("custom"),
    label: text("label"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("relationships_session_id_idx").on(t.sessionId),
    index("relationships_user_id_idx").on(t.userId),
  ],
);

export const relationshipParticipantsTable = pgTable(
  "relationship_participants",
  {
    id: text("id").primaryKey(),
    relationshipId: text("relationship_id")
      .notNull()
      .references(() => relationshipsTable.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("primary"),
    // NOTE on naming: the existing `role` column above is *positional*
    // — primary/secondary identifies which slot of the synastry pair
    // the profile occupies. We intentionally added a separate
    // `access_role` column rather than overloading `role`, because
    // permissions and slot identity are orthogonal: an "owner" can be
    // either primary or secondary, and a "participant" (the claimer)
    // also keeps their original positional role after claim. The PRD
    // calls this single field `relationship_participants.role`; in
    // this schema it is split into two columns to keep the contracts
    // independent and migrations additive.
    //
    // access_role values:
    //   - 'owner'        — the inviter / original creator side
    //   - 'participant'  — the invited side after they claim
    // Token-only 'viewer' access (granted by possession of a valid
    // invite link) is enforced at the request layer via
    // `tokenGrantsRelationshipRead` and does not produce a row here.
    accessRole: text("access_role").notNull().default("owner"),
    position: text("position").notNull().default("0"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("rp_relationship_id_idx").on(t.relationshipId),
    index("rp_profile_id_idx").on(t.profileId),
  ],
);

export type Relationship = typeof relationshipsTable.$inferSelect;
export type RelationshipParticipant = typeof relationshipParticipantsTable.$inferSelect;
export type RelationshipType =
  | "romantic"
  | "parent_child"
  | "sibling"
  | "custom";

export type RelationshipRole = "primary" | "secondary";
export type RelationshipAccessRole = "owner" | "participant" | "viewer";
