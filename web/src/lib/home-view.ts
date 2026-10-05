/**
 * The dashboard's quick look, pure (ADR-182, review-01-10 scope 3): what a tap
 * on the circle opens, read from `GET /home` alone, so nothing loads on open
 * (reading 4). The quick look holds what scope 3 lists and no more (reading 2):
 * name, birth date, Sun, Moon and Rising with degrees, then the pair block for
 * a pair with the reader or chapter 08's two lines for the reader, then the
 * buttons. A report that could not be written opens nothing, so the line that
 * says why stands where all of that would be, with Try again where the reader
 * may rewrite it. The reader's own quick look shares their report and lists
 * who has it; a sharer's offers Share yours back (ADR-235). Every word it
 * prints is here or, for Sun, Moon and Rising, in `triad-row.ts`, which every
 * page shares, so node tests pin the copy.
 */
import type { Home, HomePair, HomePerson, ReportSummary, SendState, Share } from "@workspace/api-client-react";
import { MEET_TAGS } from "@/lib/charts-meet";
import { lensInfo } from "@/lib/lenses";
import { CENTRE_ID } from "@/lib/orbit";
import { HANDED_BACK, SEND_AGAIN } from "@/lib/pair-row";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";
import { shareWith } from "@/lib/share-card";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Read from the stored string rather than a Date, so no time zone can move a birthday by a day. */
export function birthDateText(birthDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  const month = m ? MONTHS[Number(m[2]) - 1] : undefined;
  return m && month ? `${Number(m[3])} ${month} ${m[1]}` : birthDate;
}

export function doorText(name: string, self: boolean): string {
  return self ? "Open your report" : `Open ${firstName(name)}'s report`;
}

/** The status that stands where the door will be; nothing offers to read a report before it is finished (ADR-131). */
export function writingText(name: string, self: boolean): string {
  return self ? "Writing your report" : `Writing ${firstName(name)}'s report`;
}

export function blindRisingText(name: string, self: boolean): string {
  return `Add ${self ? "your" : `${firstName(name)}'s`} birth time to see ${self ? "your" : "their"} rising sign and houses`;
}

/** Chapter 08's two lines on the reader's own quick look, under the kickers the report prints over them. */
export const OWN_LINES = { superpower: "Your superpower", growingEdge: "Where you can grow" } as const;

/** A pair block's two headings: the tag the report's cards use for what comes easily, then the one challenge. */
export const PAIR_BLOCK = { comes: MEET_TAGS.comes, challenge: "Challenge to work on" } as const;

/** A report under a revision pass keeps its text and is read as it stands (progress.ts). */
export function isFinished(status: string): boolean {
  return status === "complete" || status === "revising";
}

export function isWriting(status: string): boolean {
  return status === "pending" || status === "computing" || status === "interpreting";
}

/** Nothing offers to open a failed report, which holds only what was written before it stopped; its row and quick look say why instead (ADR-84). */
export function isFailed(status: string): boolean {
  return status === "failed";
}

/** What a list said before R12 for a failed report it holds no coded line for. */
export const NOT_WRITTEN = "Could not be written.";

/** Why a report failed, in the coded line the copy of `GET /reports` the page holds gives it (ADR-84). */
export function failureLine(summary: Pick<ReportSummary, "failureReason"> | null | undefined): string {
  return summary?.failureReason?.line ?? NOT_WRITTEN;
}

/** The reader's own charts: their report at the centre, and every one marked as theirs while there are several. */
export function ownIds(home: Pick<Home, "you" | "people">): Set<string> {
  const own = new Set<string>();
  if (home.you) own.add(home.you.profileId);
  for (const person of home.people) if (person.isSelf) own.add(person.profileId);
  return own;
}

/**
 * The reader's pair with this person, for the quick look's block: the newest
 * one that reads, else the newest still being written. A failed pair or one
 * closed by a stop has nothing to show.
 */
export function pairWithYou(home: Pick<Home, "you" | "people" | "pairs">, profileId: string): HomePair | undefined {
  const own = ownIds(home);
  if (own.has(profileId)) return undefined;
  const theirs = home.pairs.filter((pair) =>
    // MB-103 provisional: a pair closes for both once a report it came from stops being shared.
    !pair.stoppedBy
    && ((own.has(pair.a.profileId) && pair.b.profileId === profileId) || (own.has(pair.b.profileId) && pair.a.profileId === profileId)),
  );
  return theirs.find((pair) => isFinished(pair.status)) ?? theirs.find((pair) => isWriting(pair.status));
}

/**
 * Who the two are, in the approved mock's words: a lens's title, or its door
 * where the title alone would not say it ("Two people" reads as anyone).
 */
export function lensWords(pair: Pick<HomePair, "lens">): string {
  return pair.lens === "partners" ? lensInfo(pair.lens).title : lensInfo(pair.lens).door;
}

export function withYouText(pair: Pick<HomePair, "lens">): string {
  return `With you · ${lensWords(pair)}`;
}

export interface QuickLookTarget {
  person: HomePerson;
  pair?: HomePair;
  self: boolean;
}

/** What a tap on the circle opens: the reader's own quick look from the centre, a person's from their seat, nothing from a gift, the add point or a ghost seat. */
export function quickLookFor(home: Pick<Home, "you" | "people" | "pairs"> | null | undefined, id: string | null): QuickLookTarget | null {
  if (!home || id === null) return null;
  if (id === CENTRE_ID) return home.you ? { person: home.you, self: true } : null;
  const person = home.people.find((p) => p.profileId === id);
  if (!person) return null;
  const pair = pairWithYou(home, person.profileId);
  return pair ? { person, pair, self: false } : { person, self: false };
}

export type Door =
  | { kind: "open"; label: string; href: string }
  | { kind: "writing"; label: string };

export interface QuickLookDoors {
  /** The full-width button: the pair's report when there is one, else the person's own. */
  primary: Door;
  /** "{name}'s report" beside the pair's door; null when the person's report is the primary. */
  report: Door | null;
}

/** A report still being written shows its status where its door will be, never its idle verb (ADR-130, ADR-131). */
export function quickLookDoors({ person, pair, self }: QuickLookTarget): QuickLookDoors {
  const own: Door = isWriting(person.status)
    ? { kind: "writing", label: writingText(person.name, self) }
    : { kind: "open", label: doorText(person.name, self), href: `/report/${person.reportId}` };
  if (self || !pair) return { primary: own, report: null };
  const primary: Door = isWriting(pair.status)
    ? { kind: "writing", label: `Writing your ${COMPATIBILITY_REPORT}` }
    : { kind: "open", label: `Open ${COMPATIBILITY_REPORT}`, href: `/compatibility/${pair.reportId}` };
  const report: Door = own.kind === "writing" ? own : { ...own, label: `${firstName(person.name)}'s report` };
  return { primary, report };
}

/** What "Share with {name}" gives: `SendDialog`'s target, structurally, so this module stays free of components. */
export type ShareTarget =
  | { kind: "person"; send: SendState; reportId: string }
  | { kind: "pair"; send: SendState; reportId: string };

// A report handed back with Not me goes out again as a new send, as its row's Send again does (ADR-236); only a
// person's report is ever handed back.
const PERSON_SENDS: ReadonlySet<string> = new Set(["can_send", "can_grant", "handed_back"]);
const PAIR_SENDS: ReadonlySet<string> = new Set(["can_send", "can_grant"]);

function sendable(send: SendState | null | undefined, states: ReadonlySet<string>): send is SendState {
  return !!send && states.has(send.state);
}

/**
 * "Share with {name}" gives the person their own Personal report first, as
 * their row does, and once they have it, the reader's pair with them. The
 * server decides where a send is offered (`ReportSummary.send`); the reader's
 * own quick look shares nothing here, and whoever reads a report shared with
 * them cannot send it on (ADR-235).
 */
export function shareTargetFor(look: QuickLookTarget, sends: { person?: SendState | null; pair?: SendState | null }): ShareTarget | null {
  if (look.self) return null;
  const person = look.person.access === "shared" ? null : sends.person;
  if (sendable(person, PERSON_SENDS)) return { kind: "person", send: person, reportId: look.person.reportId };
  if (look.pair && isFinished(look.pair.status) && sendable(sends.pair, PAIR_SENDS)) return { kind: "pair", send: sends.pair, reportId: look.pair.reportId };
  return null;
}

/**
 * The share control as the person's row says it, so the two never disagree: a
 * send its claimer handed back with Not me reads "Handed back" beside Send
 * again, which opens the same dialog for a new send (ADR-236).
 */
export function shareControl(target: ShareTarget, name: string): { status: string | null; label: string } {
  if (target.kind === "person" && target.send.state === "handed_back") return { status: HANDED_BACK, label: SEND_AGAIN };
  return { status: null, label: shareWith(firstName(name)) };
}

/** Share my report: the reader's own quick look, once that report is finished (ADR-235, MB-104). */
export function offersShareMine(look: QuickLookTarget): boolean {
  return look.self && isFinished(look.person.status);
}

/** Share yours back: a sharer's seat, while the reader has a finished Personal report of their own not yet shared with them (reading 4). */
export function offersShareBack(look: QuickLookTarget): boolean {
  return !look.self && look.person.access === "shared" && look.person.shareBack === true;
}

/**
 * Try again: a failed report the reader may rewrite, as its writer or its holder after a hand-over, never a shared reader (reading 10).
 * A report we finally could not write is final and comes with `canRegenerate` false, so it offers none (ADR-313).
 */
export function offersTryAgain(person: Pick<HomePerson, "status" | "canRegenerate">): boolean {
  return isFailed(person.status) && person.canRegenerate === true;
}

/** The words of sharing the reader's own report, on their quick look, its sheet and a sharer's quick look (ADR-235). */
export const SHARE_MINE = {
  open: "Share my report",
  title: `Share your ${PERSONAL_REPORT}`,
  email: "Their email",
  send: "Send link",
  sending: "Sharing",
  notNow: "Not now",
  done: "Done",
  copy: "Copy link",
  copied: "Copied",
  sharedWith: "Shared with",
  stop: "Stop sharing",
  back: "Share yours back",
} as const;

/**
 * What goes, named before it goes (ADR-139), in the locked spec's line: by
 * name where the reader knows who gets it, as on Share yours back, and as
 * "they" where the sheet has only an address.
 */
export function shareLine(name?: string | null): string {
  const who = name?.trim() ? `${name.trim()} reads your report and sees you in their circle.` : "They read your report and see you in their circle.";
  return `${who} Your birth date, time and place go with it. You can stop sharing any time.`;
}

/** The sheet's answer once the link is out: emailed, or to pass on by hand when the email did not go, as Share with's dialog says it. */
export function shareSentLine(email: string, delivered: boolean): string {
  return delivered
    ? `We emailed a link to ${email}. They sign in with that address to open it.`
    : `The email didn't go through. Copy this link and send it yourself. They sign in with ${email} to open it.`;
}

/** The sheet's own check before anything is sent, in the gift flow's words for the same field. */
export const SHARE_EMAIL_MISSING = "Enter their email, like name@example.com.";

/**
 * A refused share in plain words, for the sheet and for Share yours back; a
 * limit or a pause has its own line (`refusalLine`). Only the sheet ever says
 * "already shared", since to Share yours back it is the state that was asked for.
 */
export function shareErrorLine(code: unknown): string {
  if (code === "already_shared") return "Your report is already shared with that address.";
  if (code === "not_ready") return "You can share it once it is finished.";
  if (code === "validation_error") return "That email address did not work. Check it and try again.";
  return "We couldn't share it. Try again in a minute.";
}

/** The toast that confirms Share yours back, since its one tap leaves nothing else on screen to say it happened. */
export const sharedBackText = (name: string): string => `${firstName(name)} can read your ${PERSONAL_REPORT} now`;

/** Said for a reader with no first name on a grant that carries no address either, as the gift's unnamed giver is. */
export const UNNAMED_READER = "Someone";

/**
 * Whom a share names, on the list and in Stop sharing: a waiting one the
 * address the link went to, a claimed one its reader's first name. A grant
 * made by Share yours back carries no address, since the sharer never gave
 * one (R-3.6), so an address stands in only where there is one.
 */
export function shareName(share: Pick<Share, "readerName" | "email" | "state">): string {
  const name = share.readerName?.trim();
  const email = share.email.trim();
  return (share.state === "waiting" ? email || name : name || email) || UNNAMED_READER;
}

/** Where a share stands, under its name on the list. */
export function shareStateText(share: Pick<Share, "state">): string {
  return share.state === "active" ? "Can read it" : "Waiting for them to sign in";
}

/**
 * Try again's verb, the status that stands in its place while the rewrite starts
 * (ADR-130), and the line under it that says it costs nothing: a failed report
 * keeps the credit it took until its third failure (ADR-313).
 */
export const TRY_AGAIN = { label: "Try again", starting: "Starting", free: "It's free." } as const;

/** A refusal the API gives no line of its own, said by whose report it is. */
export function tryAgainErrorLine(name: string, self: boolean): string {
  return `We couldn't start ${self ? "your" : `${firstName(name)}'s`} report again. Try again in a minute.`;
}
