/**
 * The dashboard's quick look, pure (ADR-182, review-01-10 scope 3): what a tap
 * on the circle opens, read from `GET /home` alone, so nothing loads on open
 * (reading 4). The quick look holds what scope 3 lists and no more (reading 2):
 * name, birth date, Sun, Moon and Rising with degrees, then the pair block for
 * a pair with the reader or chapter 08's two lines for the reader, then the
 * buttons. A report that could not be written opens nothing, so the line that
 * says why stands where all of that would be, with Try again where the reader
 * may rewrite it. A sharer's quick look offers Share yours back (ADR-235); who
 * can read a report is the Share window's (ADR-329). Whether a Compatibility
 * report may be offered at all is `canPair`'s, for every screen (ADR-332).
 * Every word it prints is here or, for Sun, Moon and Rising, in
 * `triad-row.ts`, which every page shares, so node tests pin the copy.
 */
import type { Home, HomePair, HomePerson, ReportSummary } from "@workspace/api-client-react";
import { MEET_TAGS } from "@/lib/charts-meet";
import { lensInfo } from "@/lib/lenses";
import { CENTRE_ID } from "@/lib/orbit";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";

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
 * Compatibility and Two people together show only once the reader can read two
 * finished Personal reports, their own and one more, made or shared (ADR-332,
 * reading 19), so no screen offers a pair the reader can't make yet.
 */
export function canPair(home: Pick<Home, "you" | "people">): boolean {
  const own = ownIds(home);
  const readable = [...(home.you ? [home.you] : []), ...home.people].filter((person) => isFinished(person.status));
  return readable.some((person) => own.has(person.profileId)) && readable.some((person) => !own.has(person.profileId));
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

/** Share yours back on a sharer's quick look, and the status that stands in its place while it goes (ADR-130, ADR-235). */
export const SHARE_MINE = {
  sending: "Sharing",
  back: "Share yours back",
} as const;

/**
 * What goes, named before it goes (ADR-139), in the locked spec's line: by
 * name where the reader knows who gets it, as on Share yours back, and as
 * "they" where only an address is known.
 */
export function shareLine(name?: string | null): string {
  const who = name?.trim() ? `${name.trim()} reads your report and sees you in their circle.` : "They read your report and see you in their circle.";
  return `${who} Your birth date, time and place go with it. You can stop sharing any time.`;
}

/**
 * A refused share in plain words, for Share yours back; a limit or a pause has
 * its own line (`refusalLine`). "Already shared" is the state Share yours back
 * asks for, so its caller treats that refusal as done and never prints it.
 */
export function shareErrorLine(code: unknown): string {
  if (code === "already_shared") return "Your report is already shared with that address.";
  if (code === "not_ready") return "You can share it once it is finished.";
  if (code === "validation_error") return "That email address did not work. Check it and try again.";
  return "We couldn't share it. Try again in a minute.";
}

/** The toast that confirms Share yours back, since its one tap leaves nothing else on screen to say it happened. */
export const sharedBackText = (name: string): string => `${firstName(name)} can read your ${PERSONAL_REPORT} now`;

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
