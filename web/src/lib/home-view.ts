/**
 * The dashboard's quick look, pure (ADR-182, review-01-10 scope 3): what a tap
 * on the circle opens, read from `GET /home` alone, so nothing loads on open
 * (reading 4). The quick look holds what scope 3 lists and no more (reading 2):
 * name, birth date, Sun, Moon and Rising with degrees, then the pair block for
 * a pair with the reader or chapter 08's two lines for the reader, then the
 * buttons. Every word it prints is here, so a node test pins the copy.
 */
import type { Home, HomePair, HomePerson, SendState, Spot } from "@workspace/api-client-react";
import { MEET_TAGS } from "@/lib/charts-meet";
import { houseWithWord } from "@/lib/evidence-glossary";
import { lensInfo } from "@/lib/lenses";
import { CENTRE_ID } from "@/lib/orbit";
import { COMPATIBILITY_REPORT } from "@/lib/product";

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
  return `Add ${self ? "your" : `${firstName(name)}'s`} birth time to draw the horizon`;
}

/** Chapter 08's two lines on the reader's own quick look, under the kickers the report prints over them. */
export const OWN_LINES = { superpower: "Your superpower", growingEdge: "Your growing edge" } as const;

/** A pair block's two headings: the tag the report's cards use for what comes easily, then the one challenge. */
export const PAIR_BLOCK = { comes: MEET_TAGS.comes, challenge: "Challenge to work on" } as const;

/** A report under a revision pass keeps its text and is read as it stands (progress.ts). */
export function isFinished(status: string): boolean {
  return status === "complete" || status === "revising";
}

export function isWriting(status: string): boolean {
  return status === "pending" || status === "computing" || status === "interpreting";
}

/** "0.29° Virgo · 4th (home)"; with no birth time a body names no house. */
export function spotText(spot: Spot): string {
  const at = `${spot.degree.toFixed(2)}° ${spot.sign}`;
  return spot.house ? `${at} · ${houseWithWord(spot.house)}` : at;
}

export interface TriadLine {
  key: "sun" | "moon" | "rising";
  label: string;
  /** Null for the Rising of a chart without a birth time: there is no horizon to name. */
  text: string | null;
}

/** The three rows, or none while the chart is not stored yet. */
export function triadLines(triad: HomePerson["triad"]): TriadLine[] {
  if (!triad) return [];
  return [
    { key: "sun", label: "Sun", text: spotText(triad.sun) },
    { key: "moon", label: "Moon", text: spotText(triad.moon) },
    // The Rising is where the first house begins, so it never names one.
    { key: "rising", label: "Rising", text: triad.rising ? spotText({ ...triad.rising, house: null }) : null },
  ];
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

function sendable(send: SendState | null | undefined): send is SendState {
  return !!send && (send.state === "can_send" || send.state === "can_grant");
}

/**
 * "Share with {name}" gives the person their own Personal report first, as
 * their row does, and once they have it, the reader's pair with them. The
 * server decides where a send is offered (`ReportSummary.send`); the reader's
 * own quick look shares nothing.
 */
export function shareTargetFor(look: QuickLookTarget, sends: { person?: SendState | null; pair?: SendState | null }): ShareTarget | null {
  if (look.self) return null;
  if (sendable(sends.person)) return { kind: "person", send: sends.person, reportId: look.person.reportId };
  if (look.pair && isFinished(look.pair.status) && sendable(sends.pair)) return { kind: "pair", send: sends.pair, reportId: look.pair.reportId };
  return null;
}
