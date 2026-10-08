/**
 * What Read more says about a contact's passes (Review 08/10 note 1; ADR-392, 404; reading 27): the two short blocks in
 * fixed words filled from the event, the facts under them, and the strip's geometry. Pure, so a node check can read
 * every line and every position. Every date is the reader's, in their zone and their language's order, with its year;
 * nothing here guesses a date the API did not send.
 */
import type { TimelineEvent } from "@workspace/api-client-react";
import type { DateOrder } from "@/lib/date-entry";
import { housesText } from "@/lib/now-ahead";
import { dayIn, dayMonth, fullDate, listOf, monthYear } from "@/lib/timeline-view";

type Pass = TimelineEvent["passes"][number];
type Span = TimelineEvent["backwards"][number];

const DAY_MS = 86_400_000;
const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);
const at = (iso: string) => Date.parse(iso);

export interface PassOptions {
  /** The reader's date order; day first when none is given. */
  order?: DateOrder;
  /** Where "was" turns into "is"; the clock when none is given. */
  now?: Date;
}

/** "Pluto", the moving body as the engine names it. */
export function planetOf(event: Pick<TimelineEvent, "body">): string {
  return capital(event.body);
}

/** "the point opposite your Moon", or "your Moon" for a conjunction, where the planet stands on it. */
export function pointOf(event: Pick<TimelineEvent, "aspect" | "target">): string {
  const target = event.target ? `your ${capital(event.target)}` : "your chart";
  switch (event.aspect) {
    case "opposition":
      return `the point opposite ${target}`;
    case "square":
      return `the point square to ${target}`;
    case "trine":
      return `the point trine to ${target}`;
    default:
      return target;
  }
}

/** "Why three dates": the heading follows the number of passes the event has. */
export function whyHeading(passes: number): string {
  return `Why ${numberWord(passes)} dates`;
}

export const CHANGES_HEADING = "What the backwards pass changes";

/**
 * The backwards stretches that hold a backwards pass. A long contact meets several of a planet's stretches (Pluto at one
 * degree meets three years running), and the one that matters is the one the pass falls in.
 */
export function stretchesShown(event: Pick<TimelineEvent, "passes" | "backwards">): Span[] {
  const back = event.passes.filter((pass) => pass.direction === "backwards").map((pass) => at(pass.at));
  return event.backwards.filter((span) => back.some((time) => time >= at(span.start) && time <= at(span.end)));
}

const dayText = (iso: string, zone: string, order: DateOrder) => fullDate(dayIn(iso, zone), order);

function tenses(options: PassOptions) {
  const now = (options.now ?? new Date()).getTime();
  return (iso: string, past: string, present: string) => (at(iso) < now ? past : present);
}

/**
 * The two blocks under the strip, null for a contact with fewer than two passes or none going backwards. Their words are
 * fixed and only the planet, the point and the dates change. "**" marks what the sheet prints in bold.
 */
export function passBlocks(event: TimelineEvent, zone: string, options: PassOptions = {}): { why: string; changes: string } | null {
  const { passes } = event;
  if (passes.length < 2 || !passes.some((pass) => pass.direction === "backwards")) return null;
  const order = options.order ?? "dmy";
  const when = tenses(options);
  const planet = planetOf(event);
  const point = pointOf(event);
  const date = (pass: Pass) => dayText(pass.at, zone, order);

  const why = passes
    .map((pass, i) => {
      const crosses = when(pass.at, "crossed", "crosses");
      const prev = passes[i - 1];
      const last = i === passes.length - 1;
      if (i === 0) {
        const way = pass.direction === "forward" ? "forward" : "**backwards**";
        return `${planet} ${crosses} ${point} on ${date(pass)}, moving ${way}.`;
      }
      if (pass.direction === "backwards") {
        if (prev.direction === "forward") return `Then it ${when(pass.at, "turned and went", "turns and goes")} **backwards** over the same point on ${date(pass)}.`;
        return `On ${date(pass)} it ${crosses} it ${last ? "a last time" : "again"}, still moving **backwards**.`;
      }
      const again = prev.direction === "backwards" ? "forward again" : "forward";
      return `On ${date(pass)} it ${crosses} it ${last ? "a last time" : "again"}, moving ${again}.`;
    })
    .join(" ");

  const back = passes.filter((pass) => pass.direction === "backwards");
  const first = passes[0];
  const lastPass = passes[passes.length - 1];
  const parts: string[] = [];
  if (first.direction === "forward") parts.push(`The first pass, on ${date(first)}, is when this starts to show.`);
  parts.push(
    `On ${listOf(back.map(date))}, ${planet} ${when(back[0].at, "went", "goes")} back over it, ` +
      "often more quietly and more inward: **you may go over it again alone** instead of in the moment.",
  );
  if (lastPass.direction === "forward") parts.push(`The last pass, on ${date(lastPass)}, is when it may settle.`);
  return { why, changes: parts.join(" ") };
}

/** A block's words split at its bold marks, the odd parts the bold ones. */
export function boldParts(text: string): { text: string; bold: boolean }[] {
  return text
    .split("**")
    .map((part, i) => ({ text: part, bold: i % 2 === 1 }))
    .filter((part) => part.text !== "");
}

/**
 * The facts under the reading, one line each: the planet, aspect and house; each close stretch, the first "Close from"
 * and a later one "Back from"; the stretches going backwards; the exact dates. Every date carries its year.
 */
export function sheetFacts(event: TimelineEvent, zone: string, order: DateOrder = "dmy"): string[] {
  const day = (iso: string) => dayText(iso, zone, order);
  const head = [event.facts.sky, housesText(event.houses)].filter(Boolean).join(" · ");
  const lines = [head];
  if (event.kind === "contact") {
    const spans = event.spans.length > 0 ? event.spans : [{ start: event.start, end: event.end }];
    spans.forEach((span, i) => lines.push(`${i === 0 ? "Close" : "Back"} from ${day(span.start)} to ${day(span.end)}`));
    for (const span of stretchesShown(event)) lines.push(`Going backwards from ${day(span.start)} to ${day(span.end)}`);
    lines.push(event.exact.length > 0 ? `Exact on ${listOf(event.exact.map(day))}` : "Never exact");
  } else if (event.kind === "retrograde") {
    lines.push(`Going backwards from ${day(event.start)} to ${day(event.end)}`);
  } else {
    lines.push(`On ${day(event.start)}`);
  }
  return lines;
}

export interface StripDot {
  x: number;
  /** "14 Aug", in the reader's order, and the year under it. */
  day: string;
  year: string;
  direction: Pass["direction"];
  /** 0 on the first line of labels; a label too near the one before it drops to the next. */
  row: number;
}

export interface StripStretch {
  x1: number;
  x2: number;
  label: string;
  /** Where the label is centred, kept inside the strip. */
  labelX: number;
  row: number;
}

export interface Strip {
  width: number;
  height: number;
  axisY: number;
  /** Where the axis runs. */
  from: number;
  to: number;
  /** The stretches within orb, drawn brighter. */
  lit: { x1: number; x2: number }[];
  stretches: StripStretch[];
  dots: StripDot[];
  today: { x: number; label: string; y: number } | null;
  years: { left: string; right: string | null; y: number };
  /** The dot rows and the stretch label rows, which set where the lines fall. */
  rows: number;
  labelRows: number;
  /** The words a screen reader gets for the whole strip. */
  summary: string;
}

// One mono character at the strip's 11 px, which the labels' widths are counted in.
export const CHAR = 6.6;
const EDGE = 34;
const LABEL_GAP = 66;
const ROW_HEIGHT = 42;

/** The stretch that holds a pass, as the label over its box reads. */
function stretchLabel(span: Span, zone: string, order: DateOrder): string {
  const a = dayIn(span.start, zone);
  const b = dayIn(span.end, zone);
  const range = a.slice(0, 4) === b.slice(0, 4) ? `${dayMonth(a, order)} – ${fullDate(b, order)}` : `${fullDate(a, order)} – ${fullDate(b, order)}`;
  return `going backwards · ${range}`;
}

/**
 * The pass strip at a width in pixels: linear in days, from a little before the first thing it draws to a little after the
 * last. Today is marked when it falls in or just beside that. Null under two passes.
 */
export function stripLayout(event: TimelineEvent, now: Date, zone: string, order: DateOrder, width: number): Strip | null {
  const { passes } = event;
  if (passes.length < 2) return null;
  const shown = stretchesShown(event);
  const times = [...passes.map((pass) => at(pass.at)), ...shown.flatMap((span) => [at(span.start), at(span.end)])];
  const low = Math.min(...times);
  const high = Math.max(...times);
  const range = Math.max(high - low, DAY_MS);
  const pad = Math.max(range * 0.1, 10 * DAY_MS);
  let lo = low - pad;
  let hi = high + pad;
  const today = now.getTime();
  const near = range * 0.5;
  const marked = today >= low - near && today <= high + near;
  if (marked) {
    lo = Math.min(lo, today - pad / 2);
    hi = Math.max(hi, today + pad / 2);
  }

  const from = EDGE;
  const to = Math.max(width - EDGE, from + 1);
  const x = (time: number) => from + ((time - lo) / (hi - lo)) * (to - from);

  const stretches: StripStretch[] = [];
  let labelRows = 1;
  const rowEnds: number[] = [];
  for (const span of shown) {
    const label = stretchLabel(span, zone, order);
    const half = (label.length * CHAR) / 2;
    const x1 = x(at(span.start));
    const x2 = x(at(span.end));
    const labelX = Math.min(Math.max((x1 + x2) / 2, 4 + half), Math.max(width - 4 - half, 4 + half));
    let row = rowEnds.findIndex((end) => labelX - half > end + 8);
    if (row < 0) row = rowEnds.length;
    rowEnds[row] = labelX + half;
    labelRows = Math.max(labelRows, row + 1);
    stretches.push({ x1, x2, label, labelX, row });
  }

  const axisY = 59 + 14 * (labelRows - 1);
  const dotEnds: number[] = [];
  const dots: StripDot[] = passes.map((pass) => {
    const px = x(at(pass.at));
    let row = dotEnds.findIndex((end) => px - end >= LABEL_GAP);
    if (row < 0) row = dotEnds.length;
    dotEnds[row] = px;
    const d = dayIn(pass.at, zone);
    return { x: px, day: dayMonth(d, order), year: d.slice(0, 4), direction: pass.direction, row };
  });
  const rows = dotEnds.length;
  const lowest = axisY + 59 + ROW_HEIGHT * (rows - 1);

  const lit = event.spans
    .map((span) => ({ x1: x(Math.max(at(span.start), lo)), x2: x(Math.min(at(span.end), hi)) }))
    .filter((span) => span.x2 > span.x1);

  const todayMark = marked
    ? { x: x(today), label: `today, ${fullDate(dayIn(now, zone), order)}`, y: lowest + 24 }
    : null;
  const yearsY = (todayMark ? todayMark.y : lowest) + 22;
  const leftYear = dayIn(new Date(lo), zone).slice(0, 4);
  const rightYear = dayIn(new Date(hi), zone).slice(0, 4);

  const firstDay = dayIn(new Date(low), zone);
  const lastDay = dayIn(new Date(high), zone);
  const summary = `${planetOf(event)}'s ${numberWord(passes.length)} passes over ${pointOf(event)}, ${monthYear(firstDay, order)} to ${monthYear(lastDay, order)}`;

  return {
    width,
    height: yearsY + 10,
    axisY,
    from,
    to,
    lit,
    stretches,
    dots,
    today: todayMark,
    years: { left: leftYear, right: rightYear === leftYear ? null : rightYear, y: yearsY },
    rows,
    labelRows,
    summary,
  };
}
