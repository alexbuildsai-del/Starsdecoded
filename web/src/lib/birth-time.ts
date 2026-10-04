/**
 * Birth time is a window (ADR-33): exact, a part of the day, or unknown are
 * one representation, a centre and a half-width in minutes. Every mapping
 * and every readout string lives here as a pure function; the control and
 * the form only render them.
 */
import { clockWords, type Clock } from "@/lib/date-entry";
import type { Horizon, HorizonFact, HorizonStatus } from "@/types/chart";

export type BirthTimeMode = "known" | "roughly" | "unknown";
export type PartOfDay = "morning" | "afternoon" | "evening" | "night";
export type RoughKind = "part" | "about";

export interface BirthTimeAnswer {
  mode: BirthTimeMode;
  /** HH:MM, for known and for "about". */
  time: string;
  part: PartOfDay;
  kind: RoughKind;
}

export interface BirthTimeValue {
  birthTime: string;
  birthTimeWindowMinutes: number;
}

/** The centre of each part of the day. Every one is 180 minutes wide each way. */
export const PART_CENTRES: Record<PartOfDay, string> = {
  morning: "09:00",
  afternoon: "15:00",
  evening: "21:00",
  night: "03:00",
};

/** On the 24-hour clock, which the prerender and the first render use (reading 5). 24:00 ends a day where 00:00 starts one. */
export const PART_LABELS: Record<PartOfDay, string> = {
  morning: "Morning, 06:00 to 12:00",
  afternoon: "Afternoon, 12:00 to 18:00",
  evening: "Evening, 18:00 to 24:00",
  night: "Night, 00:00 to 06:00",
};

const PART_LABELS_12: Record<PartOfDay, string> = {
  morning: `Morning, ${clockWords("06:00", 12)} to noon`,
  afternoon: `Afternoon, noon to ${clockWords("18:00", 12)}`,
  evening: `Evening, ${clockWords("18:00", 12)} to midnight`,
  night: `Night, midnight to ${clockWords("06:00", 12)}`,
};

/** The parts of the day in the reader's clock (reading 7): "Morning, 6 am to noon" or "Morning, 06:00 to 12:00". */
export function partLabels(clock: Clock): Record<PartOfDay, string> {
  return clock === 12 ? PART_LABELS_12 : PART_LABELS;
}

export const MODE_LABELS: Record<BirthTimeMode, { title: string; hint: string }> = {
  known: { title: "I know it", hint: "As written on the record." },
  roughly: { title: "Roughly", hint: "A part of the day, or a time give or take an hour." },
  unknown: { title: "I don't know", hint: "We write the report from your birth date. You can add the time later for free. We'll show you what changed." },
};

export const WINDOW_EXACT = 0;
export const WINDOW_ABOUT = 60;
export const WINDOW_PART = 180;
export const WINDOW_UNKNOWN = 720;

export const DEFAULT_ANSWER: BirthTimeAnswer = { mode: "known", time: "", part: "afternoon", kind: "part" };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isTime(s: string): boolean {
  return TIME.test(s);
}

/** The centre and the window an answer maps to, or null while it is not answerable. */
export function toValue(a: BirthTimeAnswer): BirthTimeValue | null {
  switch (a.mode) {
    case "known":
      return isTime(a.time) ? { birthTime: a.time, birthTimeWindowMinutes: WINDOW_EXACT } : null;
    case "roughly":
      if (a.kind === "part") return { birthTime: PART_CENTRES[a.part], birthTimeWindowMinutes: WINDOW_PART };
      return isTime(a.time) ? { birthTime: a.time, birthTimeWindowMinutes: WINDOW_ABOUT } : null;
    case "unknown":
      return { birthTime: "12:00", birthTimeWindowMinutes: WINDOW_UNKNOWN };
  }
}

/** The answer a stored value reads back as, for the claim page and a correction. */
export function fromValue(v: BirthTimeValue): BirthTimeAnswer {
  if (v.birthTimeWindowMinutes === WINDOW_UNKNOWN) return { ...DEFAULT_ANSWER, mode: "unknown" };
  if (v.birthTimeWindowMinutes === WINDOW_PART) {
    const part = (Object.keys(PART_CENTRES) as PartOfDay[]).find((p) => PART_CENTRES[p] === v.birthTime) ?? "afternoon";
    return { mode: "roughly", time: "", part, kind: "part" };
  }
  if (v.birthTimeWindowMinutes === WINDOW_ABOUT) return { mode: "roughly", time: v.birthTime, part: "afternoon", kind: "about" };
  return { mode: "known", time: v.birthTime, part: "afternoon", kind: "part" };
}

/**
 * A sweep's time on the reader's clock. A run that reaches the day's end stops
 * at "24:00", which the 12-hour clock has no form for, so both of the day's
 * edges read "midnight", as the parts of the day say it.
 */
function sweepTime(hhmm: string, clock: Clock): string {
  return clock === 12 && (hhmm === "00:00" || hhmm === "24:00") ? "midnight" : clockWords(hhmm, clock);
}

/**
 * "Capricorn · holds from 11:12 to 12:58", or the many-sign form with its
 * flips, on the reader's clock (MB-178); 24-hour unless told, as the prerender
 * draws it (reading 5).
 */
export function risingReadout(fact: HorizonFact, clock: Clock = 24): string {
  const at = (hhmm: string) => sweepTime(hhmm, clock);
  if (fact.holds) return `${fact.value} · holds from ${at(fact.holdsFrom)} to ${at(fact.holdsTo)}`;
  return `${fact.values.length} possible: ${fact.values.join(", ")} · flips at ${fact.flipsAt.map(at).join(", ")}`;
}

/** The one line under the control: what the answer settles. */
export function readout(h: Horizon, clock: Clock = 24): { status: HorizonStatus; rising: string; line: string } {
  const rising = risingReadout(h.ascendant, clock);
  const line = h.status === "known"
    ? `Rising sign ${rising}. The horizon is drawn.`
    : h.status === "approximate"
      ? `Rising sign ${rising}. It holds across your window, so the horizon is drawn.`
      : `Rising sign ${rising}. We can't tell your rising sign without a time. The report uses your birth date.`;
  return { status: h.status, rising, line };
}

/** What the corner of the plate says about the time (ADR-37). */
export function timeOfBirthLabel(v: BirthTimeValue): string {
  if (v.birthTimeWindowMinutes === WINDOW_UNKNOWN) return "not recorded";
  if (v.birthTimeWindowMinutes > 0) return "approximate";
  return v.birthTime;
}
