/**
 * The dashboard's People and Compatibility rows, pure: which state a pair's
 * row reads as, what a person's row offers, and the words both print, Stop
 * sharing's among them. The rows draw from `GET /home` and act through their
 * own routes (reading 4); nothing here fetches or guesses.
 */
import { pairTitle } from "@/lib/lenses";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";
import { first } from "@/lib/share-card";

export type PairRowState = "open" | "pair_writing" | "closed";

const WRITING: ReadonlySet<string> = new Set(["pending", "computing", "interpreting"]);

/** A report under a horizon pass keeps its text and reads as it stands (progress.ts), as the circle reads it. */
function finished(status: string): boolean {
  return status === "complete" || status === "revising";
}

/**
 * One state per pair that did not fail; a failed pair keeps its row with its
 * reason instead. `readable` is false once a stop closed it (MB-103
 * provisional), and that is checked first, since a closed pair shows nothing.
 */
export function pairRowState(pair: { status: "pending" | "computing" | "interpreting" | "revising" | "complete"; readable: boolean }): PairRowState {
  if (!pair.readable) return "closed"; // MB-103 provisional
  if (WRITING.has(pair.status)) return "pair_writing";
  return "open";
}

export const PAIR_ROW_COPY: Record<PairRowState, string> = {
  open: "",
  pair_writing: "It opens here when it is finished.",
  closed: "No longer shared",
};

export interface PairSide {
  profileId: string;
  name: string;
}

/**
 * A pair is named by its two people, never by its lens (ADR-93): "You & Mamca"
 * when one of the two is the reader's own chart, else both first names, as
 * when neither is or each is (several marked as theirs).
 */
export function pairRowTitle(a: PairSide, b: PairSide, selfIds: ReadonlySet<string>): { title: string; other: PairSide | null } {
  const aSelf = selfIds.has(a.profileId);
  if (aSelf === selfIds.has(b.profileId)) return { title: pairTitle(first(a.name), first(b.name)), other: null };
  const other = aSelf ? b : a;
  return { title: pairTitle("You", first(other.name)), other };
}

/** Whose story "Share story" shows: the reader's with the other person, or the two by name. */
export function storyTitle(a: PairSide, b: PairSide, other: PairSide | null): string {
  return other ? `Your story with ${first(other.name)}` : `${first(a.name)} and ${first(b.name)}'s story`;
}

/**
 * Whoever shares a pair the reader can open with them: their avatar takes the
 * circle's violet ring. MB-103 provisional: a closed pair lights no one.
 */
export function pairedWithReader(
  pairs: readonly { status: string; stoppedBy: string | null; a: PairSide; b: PairSide }[],
  selfIds: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>();
  for (const pair of pairs) {
    if (!finished(pair.status) || pair.stoppedBy) continue;
    const { other } = pairRowTitle(pair.a, pair.b, selfIds);
    if (other) out.add(other.profileId);
  }
  return out;
}

type SignSpot = { sign: string };
type Triad = { sun: SignSpot; moon: SignSpot; rising: SignSpot | null } | null;

/** Sun, Moon and Rising, in that order and unlabelled, as the circle prints them; no Rising without a birth time. */
export function signsLine(triad: Triad): string | null {
  if (!triad) return null;
  return [triad.sun.sign, triad.moon.sign, ...(triad.rising ? [triad.rising.sign] : [])].join(" · ");
}

/** The same facts said whole, for a screen reader, which cannot know which sign is which by its place. */
export function signsSpoken(triad: Triad): string | null {
  if (!triad) return null;
  const parts = [`Sun in ${triad.sun.sign}`, `Moon in ${triad.moon.sign}`];
  if (triad.rising) parts.push(`${triad.rising.sign} rising`);
  return parts.join(", ");
}

export type ShareState = "can_send" | "can_grant" | "sent" | "joined";

export interface PersonRowInput {
  /** The reader's own chart from their side (ADR-120). */
  isSelf: boolean;
  /** Owner: the reader wrote it; claimed: it was sent to them (ADR-139). */
  access: "owner" | "claimed";
  status: string;
  /** GET /profiles' ownership, "claimed" once the person it was sent to holds it. */
  ownership?: string | null;
  horizon?: string | null;
  /** Share with {name}, as the server offers it (reading 11). */
  send?: { state: ShareState; firstName: string } | null;
  /** Whoever sent it to the reader, by first name, while they still read it. */
  giver?: string | null;
  /** No chart is marked as the reader's yet, so any they wrote may be theirs. */
  unmarked: boolean;
}

export type PersonShare = { kind: "offer" | "waiting" | "joined"; name: string };

export interface PersonRowView {
  /** Nothing offers to read a report before it is finished (ADR-131). */
  opens: boolean;
  /** A report under way is a status with dots (ADR-130). */
  busy: "Writing" | "Revising" | null;
  /** "This is me ✓". */
  self: boolean;
  /** "This is me", the mark itself. */
  mark: boolean;
  share: PersonShare | null;
  addBirthTime: boolean;
  /** Behind "⋯", with Delete report. */
  notMe: boolean;
  stopWith: string | null;
  /** The writer's Delete hands a report its subject claimed back to them (ADR-139). */
  handsOver: boolean;
}

export function personRowView(input: PersonRowInput): PersonRowView {
  const claimed = input.access === "claimed";
  const send = input.send ?? null;
  let share: PersonShare | null = null;
  if (send?.firstName) {
    const kind = send.state === "sent" ? "waiting" : send.state === "joined" ? "joined" : "offer";
    share = { kind, name: send.firstName };
  }
  return {
    opens: finished(input.status),
    busy: WRITING.has(input.status) ? "Writing" : input.status === "revising" ? "Revising" : null,
    self: input.isSelf,
    // The writer marks their own chart while none is marked; the person a chart was sent to says This is me or Not me (ADR-120).
    mark: !input.isSelf && (claimed || (input.unmarked && (input.ownership ?? "owner") === "owner")),
    share,
    addBirthTime: input.horizon === "unknown" && input.status === "complete",
    notMe: input.isSelf,
    // Only the person a report was sent to learns who sent it, and only while the sender can still read it.
    stopWith: claimed ? (input.giver ?? null) : null,
    handsOver: !claimed && input.ownership === "claimed",
  };
}

/** A share sent and not yet claimed; "share" replaced "send" for giving a report (ADR-181). */
export const sharedWaiting = (name: string): string => `Shared · waiting for ${name}`;

export const stopSharingTitle = (name: string): string => `Stop sharing with ${name}?`;

/**
 * What Stop sharing does to the person who sent the reader their Personal
 * report, in the locked spec's words (review-01-10, scope 3), said before it is
 * done since it cannot be taken back.
 */
export function stopSharingLines(giver: string): string[] {
  return [
    `${giver} can no longer read your ${PERSONAL_REPORT}.`,
    `You leave ${giver}'s circle. Your birth date and your Sun, Moon and Rising go from ${giver}'s dashboard.`,
    // MB-103 provisional: a pair closes for the person who made it once either report it came from is no longer shared.
    `${COMPATIBILITY_REPORT}s ${giver} made with you close for ${giver} too. Nothing is deleted.`,
    "Your report stays yours. You can't undo this.",
  ];
}

/** A pair's sender ends the other person's reading; the report stays theirs, so it can be shared again (MB-103 provisional). */
export const stopPairLine = (name: string): string => `${name} can no longer read this ${COMPATIBILITY_REPORT}.`;
