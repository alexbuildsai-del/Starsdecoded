import { and, eq, gt, isNull, inArray, desc } from "drizzle-orm";
import type { z } from "zod";
import {
  db,
  profilesTable,
  relationshipsTable,
  relationshipParticipantsTable,
  inviteTokensTable,
  usersTable,
  type Relationship,
} from "@workspace/db";
import type { GetReportResponse } from "@workspace/api-zod";
import { firstWord } from "./names.js";

export type Viewer = { userId: string | null; sessionId: string };

export type ProfileOwnership = "owner" | "claimed" | "invited" | "unclaimed";
export type ViewerRelationshipRole = "owner" | "participant";

type ReportContract = z.infer<typeof GetReportResponse>;
/** The viewer's standing on a report, as the contract spells it (ADR-139). */
export type Access = NonNullable<ReportContract["access"]>;
export type SendState = NonNullable<ReportContract["send"]>;

/** The columns that decide who reads a person's chart and reports. */
export type ProfileHolders = { userId: string | null; sessionId: string; claimedByUserId: string | null };

/** One of a pair's two people: their profile's holders and their participant row's grant. */
export type PairPerson = ProfileHolders & { profileId: string; name: string; accessRole: string };

export type PairReading = { readable: boolean; stoppedBy: string | null };

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
 * claimer (the user who accepted an invite for this profile), or `shared`:
 * the caller found a standing grant of it to the viewer (`sharedProfileIds`,
 * ADR-235). Writes (regenerate, delete, invite) remain owner-only and use a
 * stricter check elsewhere. Token-only viewer grants are scoped to
 * relationship / synastry-report reads (see `tokenGrantsRelationshipRead`)
 * and do not apply at the profile level.
 */
export function canReadProfile(
  viewer: Viewer,
  profile: { userId: string | null; sessionId: string; claimedByUserId: string | null },
  shared = false,
): boolean {
  if (viewer.userId && profile.userId === viewer.userId) return true;
  if (viewer.userId && profile.claimedByUserId === viewer.userId) return true;
  if (!viewer.userId && profile.sessionId === viewer.sessionId) return true;
  // A grant joins two accounts, so a session never reads through one.
  return shared && !!viewer.userId;
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
 * How the viewer reaches a person's chart. `claimed` whenever it was sent to
 * them and they claimed it, whoever holds the row since, so a report handed
 * over by Stop sharing still reads as sent to them rather than as one they
 * wrote. A session reads nothing an account has claimed: only the account can
 * show the subject still shares it (ADR-139). `shared` only when the grant is
 * all that reads it, so a grant never hides that the viewer wrote or holds
 * the chart (ADR-235).
 */
export function accessFor(viewer: Viewer, profile: ProfileHolders, shared = false): Access | null {
  if (canReadProfile(viewer, profile)) {
    if (!viewer.userId) return profile.claimedByUserId ? null : "owner";
    return profile.claimedByUserId === viewer.userId ? "claimed" : "owner";
  }
  return canReadProfile(viewer, profile, shared) ? "shared" : null;
}

/**
 * A natal report's reader. Signed in, through its profile (MB-84: the person
 * it was sent to reads it too), or through a grant of it (ADR-235). A session
 * keeps reading the reports it asked for, as it always has, until an account
 * claims one (ADR-139), and is never `shared`.
 */
export function natalReportAccess(
  viewer: Viewer,
  profile: ProfileHolders,
  report: { sessionId: string },
  shared = false,
): Access | null {
  if (viewer.userId) return accessFor(viewer, profile, shared);
  return report.sessionId === viewer.sessionId && !profile.claimedByUserId ? "owner" : null;
}

/**
 * Try again and Regenerate on a natal report (reading 10): its writer, and
 * its holder once a hand-over made the row theirs (MB-169). Never a reader
 * through a grant, nor the person it was sent to while its writer still holds
 * it, since a rewrite replaces the text everyone reading it sees.
 */
export function mayRegenerate(viewer: Viewer, profile: ProfileHolders, report: { sessionId: string }): boolean {
  const access = natalReportAccess(viewer, profile, report);
  if (access === "owner") return true;
  return access === "claimed" && profile.userId === viewer.userId;
}

/**
 * Whose workbook a reader's ticks and pins fill (reading 8, ADR-239): their
 * account, else their session, spelled as the backfill in
 * migrate-add-shares-and-workbooks.ts spells it.
 */
export function readerKey(viewer: Viewer): string {
  return viewer.userId ? viewer.userId : `session:${viewer.sessionId}`;
}

/**
 * Reading 16: the viewer's own chart from their side, the claimer's This is me or the writer's own mark. A chart
 * another account claimed is its subject's, so a mark its writer left on it never makes it theirs to share or
 * pair-send (R-3.6).
 */
export function isSelfFor(
  viewer: Viewer,
  profile: ProfileHolders & { isSelf: boolean; claimedAsSelf: boolean },
): boolean {
  const access = accessFor(viewer, profile);
  if (access === "claimed") return profile.claimedAsSelf;
  if (access === "owner") return profile.isSelf && !profile.claimedByUserId;
  return false;
}

/**
 * Whoever sent the viewer this chart and still reads it: its writer, until
 * the viewer's Stop sharing hands it over (ADR-139). Null on the viewer's own.
 */
export function giverIdOf(viewer: Viewer, profile: ProfileHolders): string | null {
  if (accessFor(viewer, profile) !== "claimed") return null;
  return profile.userId && profile.userId !== viewer.userId ? profile.userId : null;
}

/**
 * Send to {name} on a natal report (reading 11): only a complete report the
 * viewer wrote about someone else, since the send routes refuse any other
 * and a control must never offer what fails. Signed in only, since the giver
 * keeps reading a claimed report through their account alone (ADR-139). Only
 * the presence of `openInvite` counts: an unclaimed, unexpired send to them.
 * `handedBackAt` is the stamp on their latest send (`handedBackByProfile`):
 * Not me gave it back (ADR-236), so the row reads Handed back, and its Send
 * again is a new send, which then reads sent like any other.
 */
export function sendStateFor(
  viewer: Viewer,
  profile: ProfileHolders & { id: string; name: string; isSelf: boolean },
  report: { type: string; status: string },
  openInvite: unknown,
  handedBackAt?: Date | null,
): SendState | null {
  if (!viewer.userId || accessFor(viewer, profile) !== "owner") return null;
  // The writer's own chart goes to no one; a mark left on one its subject claimed counts for nothing, as in `isSelfFor`.
  const own = profile.isSelf && !profile.claimedByUserId;
  if (own || report.type !== "natal" || report.status !== "complete") return null;
  const state = profile.claimedByUserId ? "joined" : openInvite ? "sent" : handedBackAt ? "handed_back" : "can_send";
  return { state, profileId: profile.id, relationshipId: null, firstName: firstWord(profile.name) };
}

/**
 * Send to {B} on a pair (reading 11, ADR-133): from one of its two people to
 * the other. Someone who already holds their own profile is granted it at once
 * (MB-82); `joined` once their grant stands. The caller passes only a pair the
 * viewer made and can read; `other.relationshipId` fills the state's own, and
 * `pair`, when given, holds it back until the pair is complete, as for a natal
 * report. `other.userId`, when given, is the other profile's holder: one held
 * by another account and claimed by no one is a chart shared with the viewer,
 * already its sharer's own, which a send would claim from them (ADR-235).
 */
// MB-103 provisional
export function pairSendStateFor(
  viewer: Viewer,
  selfProfileId: string | null,
  other: {
    profileId: string;
    name: string;
    claimedByUserId: string | null;
    accessRole: string;
    relationshipId?: string | null;
    userId?: string | null;
  },
  openInvite: unknown,
  pair?: { status: string },
): SendState | null {
  if (!viewer.userId || !selfProfileId || other.profileId === selfProfileId) return null;
  if (pair && pair.status !== "complete") return null;
  if (other.claimedByUserId === viewer.userId) return null;
  if (other.userId && other.userId !== viewer.userId && !other.claimedByUserId) return null;
  const state = other.claimedByUserId
    ? other.accessRole === "participant" ? "joined" : "can_grant"
    : openInvite ? "sent" : "can_send";
  return { state, profileId: other.profileId, relationshipId: other.relationshipId ?? null, firstName: firstWord(other.name) };
}

/**
 * The pair reading. Its maker reads it only while they can still read both
 * people it was made from: when one of them stops sharing, it closes at once,
 * naming them, and nothing is deleted. The other of its two reads it while
 * its sender's grant stands. A pair neither readable nor closed with a name is
 * not the viewer's to list; a session's pair turns so once a person in it is
 * claimed, as its natal reports do. `shared` holds the profile ids granted to
 * the viewer (`sharedProfileIds`): a pair made from a chart shared with them
 * reads while that grant stands and closes, naming its sharer, once it goes
 * (ADR-235). A grant never opens a pair its sharer made.
 */
// MB-103 provisional
export function pairReadable(
  viewer: Viewer,
  relationship: { userId: string | null; sessionId: string },
  participants: readonly PairPerson[],
  shared: ReadonlySet<string> = new Set(),
): PairReading {
  if (ownsRelationship(viewer, relationship)) {
    if (!viewer.userId && participants.some((p) => p.claimedByUserId)) return { readable: false, stoppedBy: null };
    const withdrawn = participants.find((p) => !canReadProfile(viewer, p, shared.has(p.profileId)));
    if (!withdrawn) return { readable: true, stoppedBy: null };
    return { readable: false, stoppedBy: firstWord(withdrawn.name) || null };
  }
  const granted = !!viewer.userId
    && participants.some((p) => p.claimedByUserId === viewer.userId && p.accessRole === "participant");
  return { readable: granted, stoppedBy: null };
}

/**
 * Looks up open (unexpired, unclaimed) send invite emails for the given set
 * of profile ids. Returns a Map<profileId, email>. A waiting share link stays
 * out: it hands nothing over, so it must neither mark the sharer's own chart
 * invited nor read as sent; `sharesOf` lists it (ADR-235).
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
        eq(inviteTokensTable.kind, "send"),
        isNull(inviteTokensTable.claimedAt),
        isNull(inviteTokensTable.revokedAt),
        gt(inviteTokensTable.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(inviteTokensTable.createdAt));
  const m = new Map<string, string>();
  for (const r of rows) {
    if (r.profileId && !m.has(r.profileId)) m.set(r.profileId, r.email);
  }
  return m;
}

/**
 * The stamp Not me left on each profile's latest send (ADR-236), for
 * `sendStateFor`; a profile whose latest send was not handed back is absent,
 * so a send made after a hand-back reads as itself, never as Handed back.
 */
export async function handedBackByProfile(profileIds: string[]): Promise<Map<string, Date>> {
  if (!profileIds.length) return new Map();
  const rows = await db
    .select({ profileId: inviteTokensTable.profileId, handedBackAt: inviteTokensTable.handedBackAt })
    .from(inviteTokensTable)
    .where(and(inArray(inviteTokensTable.profileId, profileIds), eq(inviteTokensTable.kind, "send")))
    .orderBy(desc(inviteTokensTable.createdAt), desc(inviteTokensTable.id));
  const latest = new Map<string, Date | null>();
  for (const r of rows) {
    if (r.profileId && !latest.has(r.profileId)) latest.set(r.profileId, r.handedBackAt);
  }
  return new Map([...latest].filter((entry): entry is [string, Date] => entry[1] !== null));
}

/** The same for pairs: open send invites keyed by relationship. */
export async function openInvitesByRelationship(
  relationshipIds: string[],
): Promise<Map<string, string>> {
  if (!relationshipIds.length) return new Map();
  const rows = await db
    .select({ relationshipId: inviteTokensTable.relationshipId, email: inviteTokensTable.email })
    .from(inviteTokensTable)
    .where(
      and(
        inArray(inviteTokensTable.relationshipId, relationshipIds),
        eq(inviteTokensTable.kind, "send"),
        isNull(inviteTokensTable.claimedAt),
        isNull(inviteTokensTable.revokedAt),
        gt(inviteTokensTable.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(inviteTokensTable.createdAt));
  const m = new Map<string, string>();
  for (const r of rows) {
    if (r.relationshipId && !m.has(r.relationshipId)) m.set(r.relationshipId, r.email);
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
      revokedAt: inviteTokensTable.revokedAt,
    })
    .from(inviteTokensTable)
    .where(eq(inviteTokensTable.tokenHash, tokenHash))
    .limit(1);
  const row = rows[0];
  if (!row) return false;
  if (row.relationshipId !== relationshipId) return false;
  // Stop sharing revokes a waiting link, and a revoked link grants nothing
  // whatever its expiry (ADR-139).
  if (row.revokedAt) return false;
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

