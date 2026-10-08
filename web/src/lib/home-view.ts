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
 * Your first steps and the picker's `?pair=` are read here too. Every word
 * they print is here or, for Sun, Moon and Rising, in `triad-row.ts`, which
 * every page shares, so node tests pin the copy.
 */
import type { FirstSteps, Home, HomePair, HomePerson, ReportSummary } from "@workspace/api-client-react";
import { MEET_TAGS } from "@/lib/charts-meet";
import { lensInfo, pairTitle } from "@/lib/lenses";
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

/** Your first steps' fixed words, the artifact's card (sharing-and-circle §2, ADR-330). */
export const FIRST_STEPS = {
  title: "Your first steps",
  hide: "Hide",
  start: "Start",
  add: "Add someone",
  share: "Share",
  either: "Then, either",
  more: "Add someone else",
  moreLine: "Back to step 2",
  pairLine: `${COMPATIBILITY_REPORT} · 1 credit`,
} as const;

/**
 * Make a report, where Your first steps stood once they are done or hidden (ADR-334): the reader's own Personal report
 * until they have one, then one for someone, and Compatibility once `canPair` holds (ADR-332). The tab's button and
 * the picker's title share its name.
 */
export const MAKE_REPORT = {
  label: "Make a report",
  yours: { title: `Your ${PERSONAL_REPORT}`, line: "Start with you" },
  someone: { title: PERSONAL_REPORT, line: "For someone" },
  pair: { title: "Compatibility", line: "Pick two people" },
  newPair: `New ${COMPATIBILITY_REPORT}`,
} as const;

/** What stands at a step's right: its one button, the status of a report still being written (ADR-130), or what it waits for. */
export type FirstStepAction =
  | { kind: "start" | "add" | "share"; label: string }
  | { kind: "writing"; label: string }
  | { kind: "after"; label: string };

export interface FirstStepRow {
  step: 1 | 2 | 3 | 4;
  done: boolean;
  /** The step the reader is on, whose mark is lit. */
  current: boolean;
  title: string;
  /** Null where the card prints no line: step 4 once it is open, and a report still being written. */
  line: string | null;
  action: FirstStepAction | null;
}

export interface FirstStepsView {
  /** "1 of 4": steps 1 to 3, since the card goes once the pair is made. */
  count: string;
  /** Steps done, 0 to 3, for the bar. */
  done: number;
  rows: FirstStepRow[];
  /** Step 4's two buttons, once step 3 is done: You & {name}, or Add someone else, back to step 2. */
  either: {
    pair: { label: string; line: string; ready: boolean; profileId: string };
    more: { label: string; line: string };
  } | null;
}

/** What the card reads of `GET /home` beside `firstSteps`, so each step says what is true now. */
export interface FirstStepsReports {
  /** The reader's own Personal report's status, or null with none yet. */
  own: string | null;
  /** The named person's seat on the circle; null where there is none, as on a gift not yet shared back. */
  person: Pick<HomePerson, "status" | "readers"> | null;
  /** `canPair(home)`, which gates You & {name} beside the server's `pairReady` (ADR-332). */
  pairable: boolean;
}

/**
 * The card's four steps from the step the server says the reader is on
 * (reading 18), one button at a time. A report still being written shows its
 * status where its button will be, since nothing is shared or paired before it
 * is finished (ADR-130, 131). On the gift road steps 2 and 3 are done at once,
 * and the card can't know whether the giver shared their own report too, so
 * step 3 says what holds either way: the recipient is asked to share back
 * (ADR-331).
 */
export function firstStepsView(steps: FirstSteps, reports: FirstStepsReports): FirstStepsView {
  const at = steps.step;
  const name = steps.person?.name.trim() || null;
  const them = name ?? "them";
  const they = name ?? "They";
  const person = reports.person;
  const personWriting = !!person && isWriting(person.status);
  const personFinished = !!person && isFinished(person.status);
  const after = (step: number): FirstStepAction => ({ kind: "after", label: `After step ${step}` });

  const rows: FirstStepRow[] = [
    {
      step: 1,
      done: at > 1,
      current: at === 1,
      title: `Your ${PERSONAL_REPORT}`,
      line: at > 1 ? "Written." : reports.own !== null && isFailed(reports.own) ? NOT_WRITTEN : "Your circle starts with you.",
      action:
        at > 1 ? null
        : reports.own === null ? { kind: "start", label: FIRST_STEPS.start }
        : isWriting(reports.own) ? { kind: "writing", label: writingText("", true) }
        : null,
    },
    {
      step: 2,
      done: at > 2,
      current: at === 2,
      title: at <= 2 ? "Add someone close to you" : steps.gift ? `A gift for ${them}` : name ? `${name}'s report` : "Their report",
      line:
        at <= 2 ? "Make their report, or gift them one."
        : steps.gift ? "Sent with your note."
        : personFinished ? "Written with their birth details."
        : null,
      action: at < 2 ? after(1) : at === 2 ? { kind: "add", label: FIRST_STEPS.add } : null,
    },
    {
      step: 3,
      done: at > 3,
      current: at === 3,
      title: steps.gift ? `Gift sent to ${them}` : `Share it with ${them}`,
      line:
        steps.gift ? "They write their own report and are asked to share it back."
        : at < 4 ? "So they can read it too."
        : person?.readers.some((reader) => reader.state === "can-read") ? `${they} can read it.`
        : `Waiting for ${them} to open it.`,
      action:
        at < 3 ? after(2)
        : at > 3 ? null
        : personWriting ? { kind: "writing", label: writingText(them, false) }
        : personFinished ? { kind: "share", label: FIRST_STEPS.share }
        : null,
    },
    { step: 4, done: false, current: at === 4, title: FIRST_STEPS.either, line: at < 4 ? "After step 3" : null, action: null },
  ];

  let either: FirstStepsView["either"] = null;
  if (at === 4 && steps.person) {
    const ready = steps.pairReady && reports.pairable && !!steps.person.profileId;
    const waits =
      steps.gift && !steps.pairReady ? `Once ${they} shares back`
      : personWriting ? writingText(them, false)
      : reports.own !== null && isWriting(reports.own) ? writingText("", true)
      : FIRST_STEPS.pairLine;
    either = {
      pair: { label: pairTitle("You", them), line: ready ? FIRST_STEPS.pairLine : waits, ready, profileId: steps.person.profileId },
      more: { label: FIRST_STEPS.more, line: FIRST_STEPS.moreLine },
    };
  }

  return { count: `${at - 1} of 4`, done: at - 1, rows, either };
}

// MB-43 provisional: a functional key with no consent gate, holding one mark and nothing about the reader; the privacy
// page names it (reading 18: Hide is kept in the browser, as the path sheet's mark was).
export const STEPS_HIDDEN_KEY = "sd.steps.hidden";

/** The part of Storage Hide touches, so a test can hand in its own. */
export type StepsStore = Pick<Storage, "getItem" | "setItem">;

/** Null where the browser refuses storage, which some private modes do on first touch. */
function localStore(): StepsStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function stepsHidden(store: StepsStore | null = localStore()): boolean {
  try {
    return store?.getItem(STEPS_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function hideSteps(store: StepsStore | null = localStore()): void {
  try {
    store?.setItem(STEPS_HIDDEN_KEY, "1");
  } catch {
    // The worst case is the card showing again on the next visit.
  }
}

/** The person `/dashboard?pair=<profileId>` names, whom the picker pairs with the reader (ADR-336; Ask's Write it). */
export function pairFrom(search: string): string | null {
  return new URLSearchParams(search).get("pair")?.trim() || null;
}

/** The dashboard's address once `?pair=` has opened the picker, so a reload or Back never opens it again. */
export function withoutPair(search: string): string {
  const rest = new URLSearchParams(search);
  rest.delete("pair");
  const query = rest.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}
