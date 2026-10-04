/**
 * The words and dates on Timeline's shared pieces (ADR-172: one look per kind
 * of thing), pure so a node test pins them: the contact card's lines, the
 * day's mix and the week's cells. Every fact comes from what the engine or the
 * API computed; nothing here makes a date up. Days are the reader's own,
 * "YYYY-MM-DD" (reading 4), printed in their language's order with the site's
 * English month names and never a clock time.
 */
import type { Tone } from "@workspace/engine";
import type { DateOrder } from "@/lib/date-entry";

/** One contact as its card shows it, the strings built by `contactView` for one reader's day and date order. */
export interface ContactView {
  key: string;
  tone: Tone;
  /** The plain headline, the engine's `headlineOf`. */
  headline: string;
  /** The everyday line: a reading's own once one is written, none before (reading 9). */
  line: string | null;
  /** How long it lasts: "Until 19 Oct, back in February". */
  lasts: string;
  /** The astronomy, small and grey under the words: "Saturn on your Ascendant · 1st house · exact 23 Sep". */
  facts: string;
}

/** A day with the tone of each thing touching the chart on it; a day with none is quiet. */
export interface DayView {
  /** "YYYY-MM-DD", the reader's day. */
  date: string;
  tones: Tone[];
}

/** Intense first, the order every Timeline surface lists tones in. */
export const TONE_ORDER: readonly Tone[] = ["intense", "mixed", "easy"];

export const TONE_WORDS: Readonly<Record<Tone, string>> = { intense: "Intense", mixed: "Mixed", easy: "Easy" };

/** index.css's class, which sets only `--sd-tone`, so the dot, bar or edge that reads it takes the colour and the words don't. */
export function toneClass(tone: Tone): string {
  return `sd-tone-${tone}`;
}

/** What a tap on a contact or a cycle opens: its reading. The letter's link says the same (Timeline's weekly letter). */
export const READ_LINE = "Read what this means for you";

/** The open button's name, which starts with its card's headline, so a list of them can be told apart. */
export function readLabel(headline: string): string {
  return `${headline}: ${READ_LINE.charAt(0).toLowerCase()}${READ_LINE.slice(1)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

// A date never breaks across two lines, so "19 Oct" stays whole at the end of a narrow card's line.
const NB = "\u00a0";

interface Parts {
  y: number;
  m: number;
  d: number;
}

function partsOf(day: string): Parts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const m = Number(match[2]);
  const d = Number(match[3]);
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? { y: Number(match[1]), m, d } : null;
}

const monthsFrom = (from: Parts, to: Parts) => (to.y - from.y) * 12 + (to.m - from.m);

/** "a", "a and b", "a, b and c". */
export function listOf(items: readonly string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "19 Oct", or "Oct 19" where the month comes first. Anything but a "YYYY-MM-DD" day is handed back as it came. */
export function dayMonth(day: string, order: DateOrder): string {
  const p = partsOf(day);
  if (!p) return day;
  return order === "dmy" ? `${p.d}${NB}${MONTHS[p.m - 1]}` : `${MONTHS[p.m - 1]}${NB}${p.d}`;
}

/** "19 Oct 2026", "Oct 19, 2026" or "2026 Oct 19", as the reader's language orders a date. */
export function fullDate(day: string, order: DateOrder): string {
  const p = partsOf(day);
  if (!p) return day;
  const month = MONTHS[p.m - 1];
  if (order === "dmy") return `${p.d}${NB}${month}${NB}${p.y}`;
  return order === "mdy" ? `${month}${NB}${p.d},${NB}${p.y}` : `${p.y}${NB}${month}${NB}${p.d}`;
}

/** "January 2021", or "2021 January" where the year comes first: a month a reader can look back to (reading 19). */
export function monthYear(day: string, order: DateOrder): string {
  const p = partsOf(day);
  if (!p) return day;
  return order === "ymd" ? `${p.y}${NB}${MONTH_NAMES[p.m - 1]}` : `${MONTH_NAMES[p.m - 1]}${NB}${p.y}`;
}

/**
 * A date without its year when the reader can't mistake it: in this calendar
 * year, or less than six months ahead. Further off, or last year, it keeps it.
 */
export function nearDate(day: string, today: string, order: DateOrder): string {
  const p = partsOf(day);
  const t = partsOf(today);
  if (!p || !t) return day;
  const near = p.y === t.y || (day > today && monthsFrom(t, p) < 6);
  return near ? dayMonth(day, order) : fullDate(day, order);
}

/** Several days, each as `nearDate` prints it: "30 May, 23 Sep and 20 Feb". */
export function dateList(days: readonly string[], today: string, order: DateOrder): string {
  return listOf(days.map((day) => nearDate(day, today, order)));
}

/** "Monday 5 October", or "Monday, October 5" where the month comes first: a screen reader's day. */
export function longDay(day: string, order: DateOrder): string {
  const p = partsOf(day);
  if (!p) return day;
  const weekday = WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
  return order === "dmy" ? `${weekday} ${p.d} ${MONTH_NAMES[p.m - 1]}` : `${weekday}, ${MONTH_NAMES[p.m - 1]} ${p.d}`;
}

/** "Mon", the day cell's head. */
export function weekdayOf(day: string): string {
  const p = partsOf(day);
  return p ? WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()].slice(0, 3) : "";
}

/** "5", the day cell's number. */
export function dayNumber(day: string): string {
  const p = partsOf(day);
  return p ? String(p.d) : day;
}

/**
 * The reader's day of an instant in their zone, "YYYY-MM-DD" (reading 4): how
 * an API date-time becomes a day this file can print. A zone Intl doesn't know
 * reads as UTC, the day the engine keys events by (reading 5).
 */
export function dayIn(at: Date | string, zone: string): string {
  const when = typeof at === "string" ? new Date(at) : at;
  const read = (timeZone: string) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(when);
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  };
  try {
    return read(zone);
  } catch {
    return read("UTC");
  }
}

/** When a contact leaves its orb next, and when it comes back into it after that, if it does. */
export interface ContactSpan {
  end: string;
  back?: string | null;
}

// A month alone says when it's back only while it can't be read as this month or a year on.
function backMonth(back: string, today: string, order: DateOrder): string {
  const p = partsOf(back);
  const t = partsOf(today);
  if (!p || !t) return back;
  const ahead = monthsFrom(t, p);
  return ahead > 0 && ahead < 11 ? MONTH_NAMES[p.m - 1] : monthYear(back, order);
}

/** How long it lasts: "Until 19 Oct", "Until 19 Oct, back in February", or "Eases today" on its last day. */
export function lastsLine(span: ContactSpan, today: string, order: DateOrder): string {
  const until = span.end <= today ? "Eases today" : `Until ${nearDate(span.end, today, order)}`;
  return span.back ? `${until}, back in ${backMonth(span.back, today, order)}` : until;
}

/** The engine's `factsOf`: "Saturn on your Ascendant" and "1st house", the house null without a birth time. */
export interface ContactFacts {
  sky: string;
  house: string | null;
}

/**
 * The facts line, astronomy last and small (timeline-page §2): the contact,
 * its house, the orb when the API sends today's, and the exact passes, or
 * that it never quite gets there.
 */
export function factsLine(
  facts: ContactFacts,
  exact: readonly string[],
  today: string,
  order: DateOrder,
  orb?: number | null,
): string {
  const parts = [facts.sky];
  if (facts.house) parts.push(facts.house);
  if (orb != null && Number.isFinite(orb)) parts.push(`orb ${Math.abs(orb).toFixed(2)}°`);
  parts.push(exact.length ? `exact ${dateList(exact, today, order)}` : "never exact");
  return parts.join(" · ");
}

/** What a contact card is built from, whether the engine computed it at build or the API sent it. */
export interface ContactInput extends ContactSpan {
  key: string;
  tone: Tone;
  headline: string;
  line?: string | null;
  /** Its exact passes, the reader's days. */
  exact: readonly string[];
  facts: ContactFacts;
  orb?: number | null;
}

export function contactView(input: ContactInput, today: string, order: DateOrder): ContactView {
  return {
    key: input.key,
    tone: input.tone,
    headline: input.headline,
    line: input.line ?? null,
    lasts: lastsLine({ end: input.end, back: input.back ?? null }, today, order),
    facts: factsLine(input.facts, input.exact, today, order, input.orb),
  };
}

/** How many of each tone, intense first, the tones that are absent left out. */
export function mixOf(tones: readonly Tone[]): { tone: Tone; count: number }[] {
  return TONE_ORDER.map((tone) => ({ tone, count: tones.filter((t) => t === tone).length })).filter((m) => m.count > 0);
}

/** The mix bar's words for a screen reader: "2 intense and 1 easy". */
export function mixLabel(tones: readonly Tone[]): string {
  const mix = mixOf(tones);
  if (mix.length === 0) return "A quiet day";
  return listOf(mix.map(({ tone, count }) => `${count} ${TONE_WORDS[tone].toLowerCase()}`));
}

/** One dot for each tone a day holds, intense first. */
export function dayTones(tones: readonly Tone[]): Tone[] {
  return TONE_ORDER.filter((tone) => tones.includes(tone));
}

/** A day cell's words for a screen reader: "Monday 5 October: intense and easy", or "…: quiet". */
export function dayLabel(day: DayView, order: DateOrder): string {
  const tones = dayTones(day.tones).map((tone) => TONE_WORDS[tone].toLowerCase());
  return `${longDay(day.date, order)}: ${tones.length ? listOf(tones) : "quiet"}`;
}
