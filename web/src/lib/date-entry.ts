/**
 * Birth dates and times typed straight through on the number pad (ADR-222):
 * one text field each, laid out in the order and clock of the browser's
 * language, and handed on as "YYYY-MM-DD" and "HH:MM" whatever the reader saw.
 * Every rule the two fields follow is a pure function here, so the fields only
 * render them and the rules are tested without a browser.
 */
import { formatUpdated } from "@/site/site";

export type DateOrder = "dmy" | "mdy" | "ymd";
export type Clock = 12 | 24;
export type Half = "am" | "pm";

export interface EntryFormat {
  order: DateOrder;
  clock: Clock;
}

/** The prerender's and the hydrating render's, so the server's markup and the first render match (reading 5). */
export const DEFAULT_ENTRY: EntryFormat = Object.freeze({ order: "dmy", clock: 24 });

// Any day shows the order; in this one the day, month and year cannot be taken for each other.
const ANY_DAY = new Date(Date.UTC(2001, 10, 22, 12));

/**
 * The order and clock a language writes, from Intl alone and never the
 * visitor's location: day first for en-GB, fr, de and sk, month first for
 * en-US, year first for ja, zh, ko and en-CA, and the 12-hour clock where the
 * language's hour cycle is h11 or h12.
 */
export function entryFormat(lang: string): EntryFormat {
  try {
    // Intl answers a language it does not know with the runtime's own, which on a server is nobody's.
    if (Intl.DateTimeFormat.supportedLocalesOf([lang]).length === 0) return DEFAULT_ENTRY;
    const first = new Intl.DateTimeFormat(lang, { year: "numeric", month: "2-digit", day: "2-digit", calendar: "gregory" })
      .formatToParts(ANY_DAY)
      .find((part) => part.type === "year" || part.type === "month" || part.type === "day")?.type;
    const { hourCycle, hour12 } = new Intl.DateTimeFormat(lang, { hour: "numeric" }).resolvedOptions();
    // A browser from before hourCycle still answers hour12.
    const twelve = hourCycle ? hourCycle === "h11" || hourCycle === "h12" : hour12 === true;
    return { order: first === "year" ? "ymd" : first === "month" ? "mdy" : "dmy", clock: twelve ? 12 : 24 };
  } catch {
    return DEFAULT_ENTRY;
  }
}

const two = (n: number) => String(n).padStart(2, "0");

/**
 * A time as the reader's clock says it (reading 7): "3 am" and "3:30 pm" with a
 * no-break space, so the hour and its half of the day never split across two
 * lines, or "03:00".
 */
export function clockWords(hhmm: string, clock: Clock): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return hhmm;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (clock === 24) return `${two(h)}:${two(m)}`;
  return `${h % 12 || 12}${m ? `:${two(m)}` : ""}\u00a0${h < 12 ? "am" : "pm"}`;
}

/** The reader's own date, "YYYY-MM-DD", on their device's clock: what "today" means in a range. */
export function localDay(now: Date): string {
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

const PATTERNS: Record<DateOrder, string> = { dmy: "DD / MM / YYYY", mdy: "MM / DD / YYYY", ymd: "YYYY / MM / DD" };

/** The date field's placeholder, which shows the order the digits go in. */
export function datePattern(order: DateOrder): string {
  return PATTERNS[order];
}

export const TIME_PATTERN = "HH : MM";

// A pattern inside a sentence keeps to one line, as "3 am" does, so "DD / MM /" never ends a line without its "YYYY".
const unbroken = (pattern: string) => pattern.replace(/ /g, "\u00a0");

interface Mask {
  sizes: readonly number[];
  sep: string;
  /** The parts a separator typed after their first digit fills out with a 0: the day, the month and the hour. */
  pads: readonly boolean[];
}

const DATE_MASKS: Record<DateOrder, Mask> = {
  dmy: { sizes: [2, 2, 4], sep: " / ", pads: [true, true, false] },
  mdy: { sizes: [2, 2, 4], sep: " / ", pads: [true, true, false] },
  ymd: { sizes: [4, 2, 2], sep: " / ", pads: [false, true, true] },
};
const TIME_MASK: Mask = { sizes: [2, 2], sep: " : ", pads: [true, false] };
const DATE_DIGITS = 8;
const TIME_DIGITS = 4;

const isDigit = (ch: string) => ch >= "0" && ch <= "9";
const digitsOf = (text: string) => text.replace(/\D/g, "");
const DECIMAL = /\p{Nd}/u;

/**
 * Any script's digits as ASCII, so a full-width or Arabic-Indic keypad types
 * the same date. Only characters of one code unit, so every position holds.
 */
function ascii(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ch.length > 1 || isDigit(ch) || !DECIMAL.test(ch)) {
      out += ch;
      continue;
    }
    // Unicode keeps each script's ten digits in a run from its zero.
    let zero = ch.charCodeAt(0);
    while (DECIMAL.test(String.fromCharCode(zero - 1))) zero--;
    out += String((ch.charCodeAt(0) - zero) % 10);
  }
  return out;
}

/** The digits with their separators, one following each whole part so the next digit lands in the next part. */
function laidOut(digits: string, mask: Mask): string {
  let text = "";
  let at = 0;
  for (let i = 0; i < mask.sizes.length; i++) {
    const part = digits.slice(at, at + mask.sizes[i]);
    text += part;
    at += mask.sizes[i];
    if (part.length < mask.sizes[i] || i === mask.sizes.length - 1) break;
    text += mask.sep;
  }
  return text;
}

/** Where the caret stands after the n-th digit: past a separator that follows, so the next digit goes where it shows. */
function caretAfter(text: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (!isDigit(text[i])) continue;
    seen++;
    if (seen < n) continue;
    let end = i + 1;
    while (end < text.length && !isDigit(text[end])) end++;
    return end;
  }
  return text.length;
}

/** "4" then "/" reads as "04": the last part, when it holds one digit and is a day, month or hour, gains its 0. */
function padLast(digits: string, mask: Mask): string {
  let start = 0;
  for (let i = 0; i < mask.sizes.length; i++) {
    const end = start + mask.sizes[i];
    if (digits.length < end) {
      return digits.length - start === 1 && mask.pads[i] ? `${digits.slice(0, start)}0${digits.slice(start)}` : digits;
    }
    start = end;
  }
  return digits;
}

/** One change to a field, as the browser made it. */
export interface FieldEdit {
  /** The text the field showed before the change. */
  shown: string;
  /** The text once the browser applied it, and where its caret landed. */
  text: string;
  caret: number;
  /** InputEvent.inputType, which tells Backspace from Delete. */
  inputType?: string;
}

interface Cut {
  /** How many digits stand before the change. */
  index: number;
  removed: string;
  inserted: string;
}

/** What the change replaced. The text after the caret is what it left alone, so a repeated digit is placed right. */
function cutOf({ shown, text, caret }: FieldEdit): Cut {
  const after = ascii(text);
  const end = Math.min(Math.max(caret, 0), after.length);
  let tail = 0;
  while (
    tail < shown.length &&
    tail < after.length - end &&
    shown[shown.length - 1 - tail] === after[after.length - 1 - tail]
  ) tail++;
  let head = 0;
  while (head < shown.length - tail && head < after.length - tail && shown[head] === after[head]) head++;
  return {
    index: digitsOf(shown.slice(0, head)).length,
    removed: shown.slice(head, shown.length - tail),
    inserted: after.slice(head, after.length - tail),
  };
}

const SEPARATOR = /^[^\p{L}\p{N}]+$/u;

/** The digits a change leaves, and how many of them stand before the caret. */
function applyCut(digits: string, cut: Cut, inputType: string | undefined, mask: Mask): { digits: string; at: number } {
  const max = mask.sizes.reduce((sum, size) => sum + size, 0);
  const gone = digitsOf(cut.removed).length;
  const typed = digitsOf(cut.inserted);
  // Only a separator went, which the layout would put straight back: Backspace takes the digit before it, Delete the one after.
  if (cut.inserted === "" && cut.removed !== "" && gone === 0) {
    if (inputType?.endsWith("Forward")) return { digits: digits.slice(0, cut.index) + digits.slice(cut.index + 1), at: cut.index };
    const back = Math.max(cut.index - 1, 0);
    return { digits: digits.slice(0, back) + digits.slice(cut.index), at: back };
  }
  // A whole field types over, so a wrong digit is put right by typing the right one where it stands.
  if (gone === 0 && typed !== "" && digits.length >= max) {
    if (cut.index >= max) return { digits, at: max };
    const over = digits.slice(0, cut.index) + typed + digits.slice(cut.index + typed.length);
    return { digits: over.slice(0, max), at: Math.min(cut.index + typed.length, max) };
  }
  let next = digits.slice(0, cut.index) + typed + digits.slice(cut.index + gone);
  let at = cut.index + typed.length;
  if (typed === "" && gone === 0 && SEPARATOR.test(cut.inserted) && at === next.length) {
    const padded = padLast(next, mask);
    at += padded.length - next.length;
    next = padded;
  }
  return { digits: next.slice(0, max), at: Math.min(at, max) };
}

const finished = (value: string, before: string, next: { digits: string; at: number }) =>
  value !== "" && next.digits !== before && next.at === next.digits.length;

export interface DateRange {
  /** The first and last dates the form takes, "YYYY-MM-DD". */
  min?: string;
  max?: string;
}

interface DateParts {
  d: string;
  m: string;
  y: string;
}

function partsOf(digits: string, order: DateOrder): DateParts {
  if (order === "ymd") return { y: digits.slice(0, 4), m: digits.slice(4, 6), d: digits.slice(6, 8) };
  const first = digits.slice(0, 2);
  const second = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  return order === "dmy" ? { d: first, m: second, y } : { d: second, m: first, y };
}

function inOrder({ d, m, y }: DateParts, order: DateOrder): string {
  if (order === "ymd") return y + m + d;
  return order === "dmy" ? d + m + y : m + d + y;
}

function daysIn(month: number, year: number): number {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function realDate({ d, m, y }: DateParts): boolean {
  const day = Number(d);
  const month = Number(m);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysIn(month, Number(y));
}

const outside = (ymd: string, { min, max }: DateRange) => (!!min && ymd < min) || (!!max && ymd > max);

/** The field's text for its digits: "04 / 05 / 1929". */
export function dateText(digits: string, order: DateOrder): string {
  return laidOut(digits, DATE_MASKS[order]);
}

/** The digits a stored "YYYY-MM-DD" types as in the reader's order; none for anything else. */
export function dateDigits(value: string, order: DateOrder): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? inOrder({ y: match[1], m: match[2], d: match[3] }, order) : "";
}

/** "YYYY-MM-DD" once the digits make a whole, real date inside the range; "" until then, so an impossible date never leaves the field. */
export function dateValue(digits: string, order: DateOrder, range: DateRange = {}): string {
  if (digits.length !== DATE_DIGITS) return "";
  const parts = partsOf(digits, order);
  if (!realDate(parts)) return "";
  const ymd = `${parts.y}-${parts.m}-${parts.d}`;
  return outside(ymd, range) ? "" : ymd;
}

const pad2 = (part: string) => part.padStart(2, "0");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
const MONTH_KEYS = MONTHS.map((name) => name.toLowerCase());

/** The month a word names, 0 to 11, or -1: its English name or the first three letters or more, in any case (reading 6). */
function monthOf(word: string): number {
  const key = word.toLowerCase();
  return key.length < 3 ? -1 : MONTH_KEYS.findIndex((name) => name.startsWith(key));
}

const isDay = (part: string) => part.length === 1 || part.length === 2;

/**
 * A date in words: one month named, the day beside it and a four-digit year, as
 * "4 May 1929", "May 4, 1929" or "1929 May 4". Any other word, a weekday or the
 * "th" of "4th", is passed over, and so is a time after the date. The year is
 * never short here, since a century would have to be guessed.
 */
function inWords(text: string): DateParts | null {
  const tokens = text.match(/\d+|\p{L}+/gu) ?? [];
  const months = tokens.flatMap((token, i) => (monthOf(token) < 0 ? [] : [i]));
  if (months.length !== 1) return null;
  const at = months[0];
  const m = two(monthOf(tokens[at]) + 1);
  const numbersBefore = tokens.slice(0, at).filter((token) => isDigit(token[0]));
  const before = numbersBefore[numbersBefore.length - 1] ?? "";
  const [first = "", second = ""] = tokens.slice(at + 1).filter((token) => isDigit(token[0]));
  if (isDay(first) && second.length === 4) return { d: pad2(first), m, y: second };
  if (isDay(before) && first.length === 4) return { d: pad2(before), m, y: first };
  if (before.length === 4 && isDay(first)) return { d: pad2(first), m, y: before };
  return null;
}

/**
 * A pasted date read whole: "1929-05-04" in any field, since four digits first
 * can only be a year; "4 May 1929" or "May 4, 1929" in any field, since the
 * month's name says which part it is (MB-185); or "4/5/1929" in the field's own
 * order. Null when the text is none of these.
 */
export function readDate(text: string, order: DateOrder): string | null {
  const plain = ascii(text);
  // A month's name goes first, so "1929 May 4 03:00" is never read as 3 April by its numbers.
  const named = inWords(plain);
  if (named) return inOrder(named, order);
  const groups = plain.split(/\D+/).filter(Boolean);
  if (groups.length === 1) return groups[0].length === DATE_DIGITS ? groups[0] : null;
  if (groups.length < 3) return null;
  const [a, b, c] = groups;
  if (a.length === 4 && b.length <= 2 && c.length <= 2) return inOrder({ y: a, m: pad2(b), d: pad2(c) }, order);
  if (order === "ymd" || a.length > 2 || b.length > 2 || c.length > 4) return null;
  // A year short of four digits stays short: the century is never guessed.
  return order === "dmy" ? inOrder({ d: pad2(a), m: pad2(b), y: c }, order) : inOrder({ d: pad2(b), m: pad2(a), y: c }, order);
}

export interface DateStep {
  digits: string;
  text: string;
  /** Where the caret goes in the new text. */
  caret: number;
  /** "YYYY-MM-DD", or "" while the field holds no whole, real date in range. */
  value: string;
  /** The change finished a valid date at the end of the field, so the form moves on to the time. */
  done: boolean;
  /** A paste with words in it that is no date the field can read: the field keeps what it had, and the line under it says so. */
  refused: boolean;
}

// No key types a letter into the field, so a clip with one in it is a date in words or no date at all.
const WORD = /\p{L}/u;

/** One change to the date field: the browser's edit read back into digits, laid out again in the reader's order. */
export function stepDate(digits: string, edit: FieldEdit, order: DateOrder, range: DateRange = {}): DateStep {
  const mask = DATE_MASKS[order];
  const cut = cutOf(edit);
  const pasted = cut.inserted.length > 1;
  const whole = pasted ? readDate(cut.inserted, order) : null;
  // Its digits alone would land in the wrong parts, "4 Mai 1929" as "41 / 92 / 9" (QA-02 #12).
  if (pasted && whole === null && WORD.test(cut.inserted)) {
    const text = laidOut(digits, mask);
    return { digits, text, caret: caretAfter(text, cut.index), value: dateValue(digits, order, range), done: false, refused: true };
  }
  const next = whole === null ? applyCut(digits, cut, edit.inputType, mask) : { digits: whole, at: whole.length };
  const text = laidOut(next.digits, mask);
  const value = dateValue(next.digits, order, range);
  return { digits: next.digits, text, caret: caretAfter(text, next.at), value, done: finished(value, digits, next), refused: false };
}

/** The line under the date field: the readout, a problem, or the order while the digits are going in. */
export type DateNote =
  | { kind: "readout"; text: string }
  | { kind: "problem"; text: string }
  | { kind: "order"; text: string };

function rangeLine({ min, max }: DateRange, today: string): string {
  const from = min ? (min.endsWith("-01-01") ? min.slice(0, 4) : formatUpdated(min)) : null;
  const to = max ? (max === today ? "today" : formatUpdated(max)) : null;
  if (from && to) return `Enter a birth date from ${from} to ${to}.`;
  return from ? `Enter a birth date from ${from} on.` : `Enter a birth date up to ${to ?? "today"}.`;
}

/**
 * What the line under the date says. The readout keeps the site's one style,
 * "4 May 1929", in every language (reading 6). An unfinished date is only a
 * problem once the reader has left the field, so nobody is told off mid-date.
 * A paste the field refused says so until the next change, whatever it held.
 */
export function dateNote(
  digits: string,
  order: DateOrder,
  { range = {}, today, left, refused = false }: { range?: DateRange; today: string; left: boolean; refused?: boolean },
): DateNote | null {
  const pattern = datePattern(order);
  if (refused) return { kind: "problem", text: `We couldn't read that as a date. Type it as ${unbroken(pattern)}.` };
  if (digits === "") return null;
  if (digits.length < DATE_DIGITS) {
    return left ? { kind: "problem", text: `Type the full date as ${unbroken(pattern)}.` } : { kind: "order", text: pattern };
  }
  const parts = partsOf(digits, order);
  const day = Number(parts.d);
  const month = Number(parts.m);
  if (month < 1 || month > 12) return { kind: "problem", text: `There's no month ${parts.m}. Type the date as ${unbroken(pattern)}.` };
  if (day < 1 || day > 31) return { kind: "problem", text: `There's no day ${parts.d}. Check the day.` };
  if (day > daysIn(month, Number(parts.y))) {
    const text = month === 2 && day === 29
      ? `There's no 29 February in ${parts.y}. Check the day.`
      : `There's no ${day} ${MONTHS[month - 1]}. Check the day.`;
    return { kind: "problem", text };
  }
  const ymd = `${parts.y}-${parts.m}-${parts.d}`;
  if (outside(ymd, range)) return { kind: "problem", text: rangeLine(range, today) };
  return { kind: "readout", text: formatUpdated(ymd) };
}

/** The time field's digits as typed and, on a 12-hour clock, the half of the day the switch shows. */
export interface TimeState {
  digits: string;
  half: Half;
  /**
   * The reader has set the half: typed an A or P, tapped the switch, pasted an
   * am or pm, or typed an hour only one half has. A whole 12-hour time keeps
   * focus until then (MB-173).
   */
  halfSet?: boolean;
}

/** The field's text for its digits: "03 : 00". */
export function timeText(digits: string): string {
  return laidOut(digits, TIME_MASK);
}

/** A stored "HH:MM" as the reader's clock shows it; an empty field, its switch on AM, for anything else (reading 9). */
export function timeState(value: string, clock: Clock): TimeState {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return { digits: "", half: "am" };
  const h = Number(match[1]);
  const half: Half = h >= 12 ? "pm" : "am";
  return { digits: (clock === 24 ? match[1] : two(h % 12 || 12)) + match[2], half };
}

/** "HH:MM" on the 24-hour clock whatever the reader's, once the digits make a real time; "" until then. */
export function timeValue({ digits, half }: TimeState, clock: Clock): string {
  if (digits.length !== TIME_DIGITS) return "";
  const h = Number(digits.slice(0, 2));
  const m = Number(digits.slice(2));
  if (m > 59) return "";
  if (clock === 24) return h <= 23 ? `${two(h)}:${two(m)}` : "";
  if (h < 1 || h > 12) return "";
  return `${two((h % 12) + (half === "pm" ? 12 : 0))}:${two(m)}`;
}

/** On a 12-hour clock an hour typed from 13 to 23 is that 24-hour time, and 00 is 12 am (reading 9). */
function onTwelve(state: TimeState): TimeState {
  if (state.digits.length < 2) return state;
  const h = Number(state.digits.slice(0, 2));
  if (h >= 13 && h <= 23) return { digits: two(h - 12) + state.digits.slice(2), half: "pm" };
  if (h === 0) return { digits: `12${state.digits.slice(2)}`, half: "am" };
  return state;
}

// "pm", "p.m.", "PM" or a lone "p", never the p inside a word. No lookbehind, which older Safari cannot parse.
const HALF_MARK = /(?:^|[^a-z])([ap])\.?\s?m?\.?(?![a-z])/i;

function halfIn(text: string): Half | null {
  const match = HALF_MARK.exec(text);
  if (!match) return null;
  return match[1].toLowerCase() === "p" ? "pm" : "am";
}

/** A pasted time, and whether it named its own half: an am or pm in it, or an hour only one half has. */
function pastedTime(text: string, clock: Clock, half: Half): { state: TimeState; named: boolean } | null {
  const plain = ascii(text);
  const groups = plain.split(/\D+/).filter(Boolean);
  let hh: string;
  let mm: string;
  if (groups.length === 1) {
    const [run] = groups;
    if (run.length > 4) return null;
    hh = run.length <= 2 ? run : run.slice(0, -2);
    mm = run.length <= 2 ? "" : run.slice(-2);
  } else if (groups.length >= 2 && groups[0].length <= 2 && groups[1].length <= 2) {
    [hh, mm] = groups;
  } else {
    return null;
  }
  const marker = halfIn(plain);
  let h = Number(hh);
  if (marker && h >= 1 && h <= 12) h = (h % 12) + (marker === "pm" ? 12 : 0);
  // With no am or pm in it, a 12-hour time keeps the switch where the reader left it.
  const settled = marker !== null || clock === 24;
  const state: TimeState = { digits: two(h) + mm, half: settled ? (h >= 12 ? "pm" : "am") : half };
  const shown = clock === 12 ? onTwelve(state) : state;
  return { state: shown, named: marker !== null || shown !== state };
}

/**
 * A pasted time read whole: "15:30", "3:30 pm", "0330" or "15h30". An am or pm
 * in it decides the half of the day on either clock. Null when the text is not
 * a time, and the field takes its digits as typed.
 */
export function readTime(text: string, clock: Clock, half: Half = "am"): TimeState | null {
  return pastedTime(text, clock, half)?.state ?? null;
}

export interface TimeStep extends TimeState {
  halfSet: boolean;
  text: string;
  caret: number;
  /** "HH:MM" on the 24-hour clock, or "" while the field holds no real time. */
  value: string;
  /**
   * The change finished a valid time at the end of the field, its half set on a
   * 12-hour clock, so the form moves on to the next step.
   */
  done: boolean;
}

/**
 * One change to the time field. On a 12-hour clock an A or P typed anywhere in
 * it sets the switch; on a 24-hour clock a letter is ignored, so a stray key
 * never moves the time by twelve hours.
 */
export function stepTime(state: TimeState, edit: FieldEdit, clock: Clock): TimeStep {
  // "15h30" is how French writes a time, so an h typed after the hour ends it as a colon would.
  const cut = cutOf({ ...edit, text: edit.text.replace(/h/gi, ":") });
  const whole = cut.inserted.length > 1 ? pastedTime(cut.inserted, clock, state.half) : null;
  let next: TimeState;
  let at: number;
  // The edit itself said the half: an A or P typed, or a paste that named one.
  let named: boolean;
  let byHour = false;
  if (whole) {
    ({ state: next, named } = whole);
    at = next.digits.length;
  } else {
    const moved = applyCut(state.digits, cut, edit.inputType, TIME_MASK);
    const typed = clock === 12 ? halfIn(cut.inserted) : null;
    next = { digits: moved.digits, half: typed ?? state.half };
    named = typed !== null;
    at = moved.at;
    // No hour starts with 3 to 9, so that first digit is the whole hour.
    if (next.digits.length === 1 && digitsOf(cut.inserted) !== "" && Number(next.digits) >= 3) {
      next = { ...next, digits: `0${next.digits}` };
      at = 2;
    }
    if (clock === 12) {
      const twelve = onTwelve(next);
      byHour = twelve !== next;
      next = twelve;
    }
  }
  const halfSet = !!state.halfSet || named || byHour;
  const text = timeText(next.digits);
  const value = timeValue(next, clock);
  const atEnd = finished(value, state.digits, { digits: next.digits, at });
  // A 12-hour time is not whole until its half is set: then it moves on from its last digit, or from the A or P that
  // set it, so the P of "0300p" never lands in the place (MB-173). An hour typed over in the middle never moves it on.
  const done = clock === 24 ? atEnd : value !== "" && halfSet && (atEnd || (named && !state.halfSet));
  return { digits: next.digits, half: next.half, halfSet, text, caret: caretAfter(text, at), value, done };
}

/**
 * A half chosen on the AM/PM switch: it is set, and a whole time that was
 * waiting for it is done the first time, which the field acts on for a tap and
 * not for the arrow keys (MB-173). A half changed after that is a correction,
 * and focus stays.
 */
export function pickHalf(state: TimeState, half: Half, clock: Clock): Omit<TimeStep, "text" | "caret"> {
  const next = { digits: state.digits, half, halfSet: true };
  const value = timeValue(next, clock);
  return { ...next, value, done: value !== "" && !state.halfSet };
}

/** What the line under the time says: a problem, or nothing. */
export function timeNote(digits: string, clock: Clock, left: boolean): string | null {
  if (digits === "") return null;
  if (digits.length < TIME_DIGITS) return left ? `Type the full time as ${unbroken(TIME_PATTERN)}.` : null;
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2);
  const h = Number(hh);
  if (clock === 24 ? h > 23 : h < 1 || h > 12) return `There's no ${hh}:${mm}. Check the hour.`;
  if (Number(mm) > 59) return `There's no ${hh}:${mm}. Check the minutes.`;
  return null;
}
