import { and, eq, gt, isNull, inArray, desc } from "drizzle-orm";
import {
  db,
  profilesTable,
  relationshipsTable,
  relationshipParticipantsTable,
  inviteTokensTable,
  usersTable,
  type Relationship,
} from "@workspace/db";

export type Viewer = { userId: string | null; sessionId: string };

export type ProfileOwnership = "owner" | "claimed" | "invited" | "unclaimed";
export type ViewerRelationshipRole = "owner" | "participant";

/**
 * Returns the viewer's ownership status for a profile from the viewer's
 * perspective. "owner" means the viewer created (or is the active owner of)
 * the profile; "claimed" means it has been claimed by some user (the
 * inviter sees this); "invited" means an open invite exists; "unclaimed"
 * means the slot is still up for grabs.
 */
export function profileOwnershipFor(
  viewer: Viewer,
  profile: { userId: string | null; sessionId: string; claimedByUserId: string | null },
  openInviteEmail: string | null,
): ProfileOwnership {
  const viewerOwns = viewer.userId
    ? profile.userId === viewer.userId
    : profile.sessionId === viewer.sessionId;
  if (viewerOwns) {
    if (profile.claimedByUserId) return "claimed";
    if (openInviteEmail) return "invited";
    return "owner";
  }
  // Viewer is the claimer.
  if (viewer.userId && profile.claimedByUserId === viewer.userId) return "claimed";
  return "unclaimed";
}

/**
 * Can the viewer READ this profile? Owner (creator session/user) OR
 * claimer (the user who accepted an invite for this profile). Writes
 * (regenerate, delete, invite) remain owner-only and use a stricter
 * check elsewhere. Token-only viewer grants are scoped to relationship
 * / synastry-report reads (see `tokenGrantsRelationshipRead`) and do
 * not apply at the profile level.
 */
export function canReadProfile(
  viewer: Viewer,
  profile: { userId: string | null; sessionId: string; claimedByUserId: string | null },
): boolean {
  if (viewer.userId && profile.userId === viewer.userId) return true;
  if (viewer.userId && profile.claimedByUserId === viewer.userId) return true;
  if (!viewer.userId && profile.sessionId === viewer.sessionId) return true;
  return false;
}

export function ownsProfile(
  viewer: Viewer,
  profile: { userId: string | null; sessionId: string },
): boolean {
  if (viewer.userId) return profile.userId === viewer.userId;
  return profile.sessionId === viewer.sessionId;
}

export function ownsRelationship(
  viewer: Viewer,
  relationship: { userId: string | null; sessionId: string },
): boolean {
  if (viewer.userId) return relationship.userId === viewer.userId;
  return relationship.sessionId === viewer.sessionId;
}

/**
 * Looks up open (unexpired, unclaimed) invite emails for the given set of
 * profile ids. Returns a Map<profileId, email>.
 */
export async function openInvitesByProfile(
  profileIds: string[],
): Promise<Map<string, string>> {
  if (!profileIds.length) return new Map();
  const rows = await db
    .select({
      profileId: inviteTokensTable.profileId,
      email: inviteTokensTable.email,
      createdAt: inviteTokensTable.createdAt,
    })
    .from(inviteTokensTable)
    .where(
      and(
        inArray(inviteTokensTable.profileId, profileIds),
        isNull(inviteTokensTable.claimedAt),
        gt(inviteTokensTable.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(inviteTokensTable.createdAt));
  const m = new Map<string, string>();
  for (const r of rows) {
    if (!m.has(r.profileId)) m.set(r.profileId, r.email);
  }
  return m;
}

/**
 * Looks up the display name (email) of the user who claimed each profile,
 * keyed by profileId. Profiles without a claimer are simply omitted.
 */
export async function claimerNamesByProfile(
  profiles: { id: string; claimedByUserId: string | null }[],
): Promise<Map<string, string | null>> {
  const userIds = Array.from(
    new Set(profiles.map((p) => p.claimedByUserId).filter((u): u is string => !!u)),
  );
  if (!userIds.length) return new Map();
  const rows = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(inArray(usersTable.id, userIds));
  const byUser = new Map(rows.map((r) => [r.id, r.email] as const));
  const out = new Map<string, string | null>();
  for (const p of profiles) {
    if (p.claimedByUserId) out.set(p.id, byUser.get(p.claimedByUserId) ?? null);
  }
  return out;
}

/**
 * Resolves the set of relationship ids the viewer can read either as owner
 * or as a participant (their userId claimed at least one participant
 * profile). Empty array if viewer is anonymous.
 */
export async function viewerRelationshipIds(viewer: Viewer): Promise<{
  owned: Set<string>;
  participant: Set<string>;
}> {
  const ownedRows = await db
    .select({ id: relationshipsTable.id })
    .from(relationshipsTable)
    .where(
      viewer.userId
        ? eq(relationshipsTable.userId, viewer.userId)
        : eq(relationshipsTable.sessionId, viewer.sessionId),
    );
  const owned = new Set(ownedRows.map((r) => r.id));

  const participant = new Set<string>();
  if (viewer.userId) {
    // A viewer participates in a relationship when there's a participant
    // row whose linked profile they have claimed AND that row's access_role
    // has been promoted to 'participant' via invite/claim (rather than the
    // default 'owner' on the inviter's own row).
    const partRows = await db
      .select({ relationshipId: relationshipParticipantsTable.relationshipId })
      .from(relationshipParticipantsTable)
      .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
      .where(
        and(
          eq(profilesTable.claimedByUserId, viewer.userId),
          eq(relationshipParticipantsTable.accessRole, "participant"),
        ),
      );
    for (const p of partRows) participant.add(p.relationshipId);
  }
  return { owned, participant };
}

/**
 * Returns true iff the viewer has been granted read access to the given
 * relationship via an accepted invite (their userId claimed a participant
 * profile whose access_role was promoted to 'participant').
 */
export async function viewerHasGrantOnRelationship(
  viewer: Viewer,
  relationshipId: string,
): Promise<boolean> {
  if (!viewer.userId) return false;
  const rows = await db
    .select({ id: relationshipParticipantsTable.id })
    .from(relationshipParticipantsTable)
    .innerJoin(profilesTable, eq(relationshipParticipantsTable.profileId, profilesTable.id))
    .where(
      and(
        eq(relationshipParticipantsTable.relationshipId, relationshipId),
        eq(profilesTable.claimedByUserId, viewer.userId),
        eq(relationshipParticipantsTable.accessRole, "participant"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Token-only viewer grant: returns true iff `tokenRaw` resolves to an
 * unexpired invite token whose relationship_id matches `relationshipId`.
 * This grants read access to that single resource without requiring the
 * recipient to sign in or claim the invite — a "preview" view granted
 * by possession of the link itself.
 */
export async function tokenGrantsRelationshipRead(
  tokenRaw: string | undefined | null,
  relationshipId: string,
): Promise<boolean> {
  const { verifyInviteToken } = await import("./inviteToken.js");
  const tokenHash = verifyInviteToken(tokenRaw);
  if (!tokenHash) return false;
  const rows = await db
    .select({
      relationshipId: inviteTokensTable.relationshipId,
      expiresAt: inviteTokensTable.expiresAt,
      claimedAt: inviteTokensTable.claimedAt,
    })
    .from(inviteTokensTable)
    .where(eq(inviteTokensTable.tokenHash, tokenHash))
    .limit(1);
  const row = rows[0];
  if (!row) return false;
  if (row.relationshipId !== relationshipId) return false;
  if (row.expiresAt.getTime() < Date.now()) return false;
  // Once the invite has been accepted, the link is no longer a viewer
  // grant: the recipient now reads via their authenticated participant
  // grant. This keeps the link from being reusable post-claim.
  if (row.claimedAt) return false;
  return true;
}

export function relationshipRoleFor(
  viewer: Viewer,
  rel: Relationship,
  participant: boolean,
): ViewerRelationshipRole | null {
  if (ownsRelationship(viewer, rel)) return "owner";
  if (participant) return "participant";
  return null;
}

