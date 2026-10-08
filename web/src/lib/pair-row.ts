/**
 * The dashboard's People and Compatibility rows, pure: which state a pair's
 * row reads as, what a person's row offers, the link Change address moves,
 * and the words both print, Stop sharing's and Not me's handback among them.
 * The rows draw from `GET /home` and act through their own routes (reading
 * 4); nothing here fetches or guesses.
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

export type PairChipState = "only-you" | "can-read" | "waiting" | "shared-by";

/** The one chip a Compatibility row wears, said from `HomePair.share` alone (ADR-337, 341). */
export function pairChipText(share: { state: PairChipState; name: string }): string {
  const name = share.name.trim() ? first(share.name) : "";
  if (!name) return "Only you can read it";
  if (share.state === "can-read") return `${name} can read it`;
  if (share.state === "waiting") return `Waiting for ${name}`;
  if (share.state === "shared-by") return `Shared by ${name}`;
  return "Only you can read it";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "Report from 12 Sep 2026", read in the reader's own zone; null when the report carries no usable date (review-05-10 §7). */
export function reportFromText(createdAt: string | null | undefined): string | null {
  const when = createdAt ? new Date(createdAt) : null;
  if (!when || Number.isNaN(when.getTime())) return null;
  return `Report from ${when.getDate()} ${MONTHS[when.getMonth()]} ${when.getFullYear()}`;
}

export const makePairText = (name: string): string => `Make You & ${first(name)} · 1 credit`;
export const openReportText = (name: string): string => `Open ${first(name)}'s report`;

/** What the quick look's footer says about the reader's own report and this person (sharing-and-circle §5). */
export function readsYoursLine(name: string, state: "can-read" | "invited" | "no"): string {
  const who = first(name);
  if (state === "can-read") return `${who} can read your report`;
  if (state === "invited") return `Waiting for ${who} to open your report`;
  return `${who} can't read your report`;
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

export type ShareState = "can_send" | "can_grant" | "sent" | "joined" | "handed_back";

export interface PersonRowInput {
  /** The reader's own chart from their side (ADR-120). */
  isSelf: boolean;
  /** Owner: the reader wrote it; claimed: it was sent to them (ADR-139); shared: its subject shares it with them (ADR-235). */
  access: "owner" | "claimed" | "shared";
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
  /** GET /home's: the writer, or the holder after a hand-over, may run it again; never a shared reader (reading 10). */
  canRegenerate?: boolean;
  /** The chart's person, whom Stop sharing names when the chart isn't the reader's own (ADR-238). */
  name?: string;
}

/** "Offer" is Share with {name}, and Send again once a send came back (`handedBack`); never anything on a shared reader's row. */
export type PersonShare = { kind: "offer" | "waiting" | "joined"; name: string };

export interface PersonRowView {
  /** Nothing offers to read a report before it is finished (ADR-131). */
  opens: boolean;
  /** A report under way is a status with dots (ADR-130). */
  busy: "Writing" | "Revising" | null;
  /** Try again on a report that failed, only where the reader may run it again (MB-137, reading 10). */
  retry: boolean;
  /** "This is me ✓". */
  self: boolean;
  /** "This is me", the mark itself. */
  mark: boolean;
  share: PersonShare | null;
  /** Its claimer handed the send back with Not me: "Handed back", and the offer reads Send again (ADR-236). */
  handedBack: boolean;
  /** A send still waiting on its claim can go to a corrected address (ADR-237). */
  changeAddress: boolean;
  addBirthTime: boolean;
  /** Behind "⋯", with Delete report. */
  notMe: boolean;
  /** Not me on a report sent to the reader hands it back to its writer; on the writer's own chart it unmarks (ADR-236). */
  handBack: boolean;
  stopWith: string | null;
  /** Stop sharing names the chart's person, by first name, when it isn't the reader's own (ADR-238). */
  stopSubject: string | null;
  /** Delete report, or the writer's Remove; a report read through a share is its sharer's to delete (ADR-235). */
  deletes: boolean;
  /** The writer's Delete hands a report its subject claimed back to them (ADR-139). */
  handsOver: boolean;
}

export function personRowView(input: PersonRowInput): PersonRowView {
  const claimed = input.access === "claimed";
  const shared = input.access === "shared";
  // Whoever reads a shared report cannot send it on; only its sharer can (ADR-235).
  const send = shared ? null : input.send ?? null;
  let share: PersonShare | null = null;
  if (send?.firstName) {
    const kind = send.state === "sent" ? "waiting" : send.state === "joined" ? "joined" : "offer";
    share = { kind, name: send.firstName };
  }
  const subject = claimed && !input.isSelf && input.name ? first(input.name) : null;
  return {
    opens: finished(input.status),
    busy: WRITING.has(input.status) ? "Writing" : input.status === "revising" ? "Revising" : null,
    retry: input.status === "failed" && input.canRegenerate === true,
    self: input.isSelf,
    // The writer marks their own chart while none is marked; the person a chart was sent to says This is me or Not me
    // (ADR-120). A shared report is its sharer's own chart, never the reader's.
    mark: !shared && !input.isSelf && (claimed || (input.unmarked && (input.ownership ?? "owner") === "owner")),
    share,
    handedBack: share?.kind === "offer" && send?.state === "handed_back",
    changeAddress: share?.kind === "waiting",
    addBirthTime: !shared && input.horizon === "unknown" && input.status === "complete",
    // A report sent to the reader answers Not me whether or not it is marked as theirs, since it may be someone else's (ADR-236).
    notMe: claimed || (!shared && input.isSelf),
    handBack: claimed,
    // Only the person a report was sent to learns who sent it, and only while the sender can still read it.
    stopWith: claimed ? (input.giver ?? null) : null,
    stopSubject: subject,
    deletes: !shared,
    handsOver: !claimed && input.ownership === "claimed",
  };
}

/** A share sent and not yet claimed; "share" replaced "send" for giving a report (ADR-181). */
export const sharedWaiting = (name: string): string => `Shared · waiting for ${name}`;

/** A send its claimer handed back with Not me, and the new send that answers it (ADR-236). */
export const HANDED_BACK = "Handed back";
export const SEND_AGAIN = "Send again";

type ListedInvite = { id: string; email: string; relationshipId?: string | null; claimedAt?: string | null };

/**
 * The link Change address moves (ADR-237): the newest one still waiting for
 * this person (`relationshipId` null) or for this pair. GET /invites lists a
 * profile's links oldest first, a person's and its pairs' together.
 */
export function waitingInvite<T extends ListedInvite>(invites: readonly T[] | undefined, relationshipId: string | null): T | null {
  if (!Array.isArray(invites)) return null;
  return invites.filter((i) => !i.claimedAt && (i.relationshipId ?? null) === relationshipId).at(-1) ?? null;
}

/** With whoever loses it on the reader's own chart; by the chart's person when it isn't theirs (ADR-238). */
export const stopSharingTitle = (name: string, subject?: string | null): string =>
  subject ? `Stop sharing ${subject}'s ${PERSONAL_REPORT}?` : `Stop sharing with ${name}?`;

/**
 * What Stop sharing does to the person who sent the reader a Personal report,
 * said before it is done since it cannot be taken back: in the locked spec's
 * words on the reader's own chart (review-01-10, scope 3), and in the approved
 * artifact's, naming its person, on a chart that isn't theirs (ADR-238).
 */
export function stopSharingLines(giver: string, subject?: string | null): string[] {
  if (subject) return [`${giver} can no longer read it.`, `${subject}'s birth details leave ${giver}'s account.`, "Pairs made from it close."];
  return [
    `${giver} can no longer read your ${PERSONAL_REPORT}.`,
    `You leave ${giver}'s circle. Your birth date and your Sun, Moon and Rising go from ${giver}'s dashboard.`,
    // MB-103 provisional: a pair closes for the person who made it once either report it came from is no longer shared.
    `${COMPATIBILITY_REPORT}s ${giver} made with you close for ${giver} too. Nothing is deleted.`,
    "Your report stays yours. You can't undo this.",
  ];
}

/**
 * A reader ending a share of their own Personal report (ADR-235, reading 5):
 * a claimed share ends as a giver's does, from the sharer's side; a link still
 * waiting (`waitingAt`, the address it went to) only stops working. Either can
 * be shared again, so neither says it can't be undone.
 */
export function stopShareLines(reader: string, waitingAt: string | null): string[] {
  if (waitingAt) return [`The link we emailed to ${waitingAt} stops working.`, "You can share it again later."];
  return [
    `${reader} can no longer read your ${PERSONAL_REPORT}.`,
    `You leave ${reader}'s circle. Your birth date and your Sun, Moon and Rising go from ${reader}'s dashboard.`,
    `${COMPATIBILITY_REPORT}s ${reader} made with you close for ${reader} too. Nothing is deleted.`,
    "You can share it again later.",
  ];
}

/** Not me on a report sent to the reader (ADR-236): Hand it back and Cancel only, in the approved artifact's words. */
export const HAND_BACK_TITLE = "This report isn't about you?";

export function handBackLine(giver: string): string {
  if (!giver) return "We'll hand it back to whoever sent it and it leaves your account. They can send it to the right person.";
  return `We'll hand it back to ${giver} and it leaves your account. ${giver} can send it to the right person.`;
}

/** A pair's sender ends the other person's reading; the report stays theirs, so it can be shared again (MB-103 provisional). */
export const stopPairLine = (name: string): string => `${name} can no longer read this ${COMPATIBILITY_REPORT}.`;
