/**
 * The dashboard's teaser (ADR-212, 255, 262; reading 26): a reader without Timeline whose own Personal report is
 * finished sees their life's big cycles last on the dashboard, with no price. Each cycle is one of the four known ages,
 * the one under way or next, dated by the API from the stored birth (acceptance 1). Not now hides it in this browser;
 * it comes back once, when a big cycle that was a year or more away is under a year away, and a second Not now hides
 * it for good. It shows the price from the catalogue and Start Timeline (ADR-264, 277). Pure, so a node test pins both.
 */
import { PLANS, formatEuro } from "@workspace/commerce";
import type { Teaser, TeaserCycle } from "@workspace/api-client-react";
import type { CycleView } from "@/lib/life-view";

export type TeaserStatus = "now" | "ahead" | "past";

/**
 * The API sends one day per cycle, its first exact pass, and lists the cycles still to come or under way first, then
 * those behind the reader, each soonest first (`teaserView`): the first step back in date is where those behind start,
 * and in front of it a day already gone is a cycle still under way. A list that never steps back is all behind the
 * reader once its last day has gone: a cycle under way would have to have started before every one behind it, which
 * the four known ages, years apart, never do.
 */
export function teaserStatuses(cycles: readonly Pick<TeaserCycle, "on">[], today: string): TeaserStatus[] {
  let behind = cycles.findIndex((cycle, i) => i > 0 && cycle.on < cycles[i - 1].on);
  if (behind < 0) behind = cycles.length > 0 && cycles[cycles.length - 1].on < today ? 0 : cycles.length;
  return cycles.map((cycle, i) => (i >= behind ? "past" : cycle.on > today ? "ahead" : "now"));
}

export const START_TIMELINE = "Start Timeline";

/** Both plans' prices on one line, from the catalogue's plans so no price is typed here (R-6.3). */
export function planPriceLine(): string {
  return PLANS.map((plan) => `${formatEuro(plan.cents)} a ${plan.interval}`).join(" or ");
}

export const RING_LABEL = "at your Saturn return";
export const NOW_TITLE = "You're in a big cycle now";
export const PAST_TITLE = "Your big cycles so far";

export function teaserTitle(cycles: readonly Pick<TeaserCycle, "age">[], statuses: readonly TeaserStatus[]): string {
  const next = statuses.findIndex((status) => status !== "past");
  if (next < 0) return PAST_TITLE;
  return statuses[next] === "now" ? NOW_TITLE : `Your next big cycle is at ${cycles[next].age}`;
}

/**
 * One cycle as Life's compact card draws it. The teaser names one age per cycle, so the card heads with that age
 * alone ("At 37"), true of a cycle that comes once as of one that comes again. A cycle still under way ends no earlier
 * than today, so its chip says so; the API sends Saturn's round alone, so only Saturn's ring shows how far it has come.
 */
function cycleOf(cycle: TeaserCycle, status: TeaserStatus, today: string, saturn: number): CycleView {
  return {
    key: cycle.id,
    id: cycle.id,
    name: cycle.name,
    word: cycle.word,
    age: cycle.age,
    exact: [cycle.on],
    start: cycle.on,
    end: status === "now" && cycle.on < today ? today : cycle.on,
    repeats: true,
    today,
    progress: cycle.id === "saturn-return" ? saturn : null,
    last: null,
    ages: [cycle.age],
  };
}

export interface TeaserModel {
  /** The reader's first Saturn return on the big ring, and Saturn's way round since birth today. */
  ring: { age: number; progress: number; label: string };
  /** "Your next big cycle is at 37". */
  title: string;
  /** The four, soonest first, as the API sends them. */
  cycles: CycleView[];
}

export function teaserModel(teaser: Teaser, today: string): TeaserModel {
  const statuses = teaserStatuses(teaser.cycles, today);
  return {
    ring: { age: teaser.saturn.age, progress: teaser.saturn.progress, label: RING_LABEL },
    title: teaserTitle(teaser.cycles, statuses),
    cycles: teaser.cycles.map((cycle, i) => cycleOf(cycle, statuses[i], today, teaser.saturn.progress)),
  };
}

// MB-43 provisional: a functional key with no consent gate, holding the day the reader chose Not now and two flags,
// nothing from their chart; the privacy page names it (reading 26).
export const NOT_NOW_KEY = "sd.timeline.notnow";

/** What Not now keeps. */
export interface NotNow {
  /** The reader's day they chose it. */
  day: string;
  /** It has come back since, so it stays until Not now is chosen again. */
  back: boolean;
  /** Chosen again after it came back, so it never shows again. */
  final: boolean;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A kept value this version can't read shows the teaser, which is all Not now ever holds back. */
export function parseNotNow(raw: string | null): NotNow | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { day, back, final } = value as Record<string, unknown>;
    if (typeof day !== "string" || !DAY.test(day)) return null;
    return { day, back: back === true, final: final === true };
  } catch {
    return null;
  }
}

export function serializeNotNow(notNow: NotNow): string {
  return JSON.stringify({ day: notNow.day, ...(notNow.back ? { back: true } : {}), ...(notNow.final ? { final: true } : {}) });
}

/** The day `years` on from `day`; a 29 February lands on the 28th in a year without one. */
export function yearsOn(day: string, years: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const year = y + years;
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${String(year).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/**
 * Shown until the reader chooses Not now; then hidden until a cycle that was a year or more away on that day is under
 * a year away. The cycles move on as each one passes, so whichever comes next brings it back.
 */
export function teaserShows(teaser: Pick<Teaser, "cycles">, notNow: NotNow | null, today: string): boolean {
  if (!notNow) return true;
  if (notNow.final) return false;
  if (notNow.back) return true;
  const then = yearsOn(notNow.day, 1);
  const within = yearsOn(today, 1);
  return teaser.cycles.some((cycle) => cycle.on >= then && cycle.on < within);
}

/** What to keep once a hidden teaser shows again, so it stays back; null when there is nothing new to keep. */
export function cameBack(notNow: NotNow | null, shows: boolean): NotNow | null {
  if (!notNow || !shows || notNow.back || notNow.final) return null;
  return { ...notNow, back: true };
}

/** The teaser shows only before its first Not now or once it is back, so a Not now that finds one kept is the second. */
export function notNowPressed(before: NotNow | null, today: string): NotNow {
  return { day: today, back: false, final: before !== null };
}

/** The part of Storage Not now touches, so a test can hand in its own. */
export type NotNowStore = Pick<Storage, "getItem" | "setItem">;

/** Null where the browser refuses storage, which some private modes do on first touch. */
function localStore(): NotNowStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readNotNow(store: NotNowStore | null = localStore()): NotNow | null {
  try {
    return parseNotNow(store?.getItem(NOT_NOW_KEY) ?? null);
  } catch {
    return null;
  }
}

export function keepNotNow(notNow: NotNow, store: NotNowStore | null = localStore()): void {
  try {
    store?.setItem(NOT_NOW_KEY, serializeNotNow(notNow));
  } catch {
    // The worst case is the teaser showing again on the next visit.
  }
}
