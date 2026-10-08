/**
 * Your week on the dashboard and at the top of Timeline (ADR-211, 262; reading 23), pure so a node test pins every line
 * it prints. The week GET /home sends a subscriber runs Monday to Sunday in the reader's zone, and each transit that
 * touches it becomes one row of a picture: the days it is on the reader, whether it carries on past the week, and
 * where it starts or ends. Every date and degree is one the API sent (acceptance 1).
 */
import type { Tone } from "@workspace/engine";
import type { TimelineEvent, TimelineNow, TimelineRange, Week } from "@workspace/api-client-react";
import type { DateOrder } from "@/lib/date-entry";
import type { DialAngles, DialPoint } from "@/lib/dial";
import { housesText, reads } from "@/lib/now-ahead";
import { dayIn, dayMonth, dayNumber, fullDate, monthYear, weekdayOf } from "@/lib/timeline-view";

/** The date once a week is told in the reader's order: "5 to 11 Oct 2026", "Oct 5 to 11, 2026", "28 Sep to 4 Oct 2026". */
export function weekSpan(week: Pick<Week, "days">, order: DateOrder): string {
  const first = week.days[0]?.date ?? "";
  const last = week.days[week.days.length - 1]?.date ?? first;
  if (first.slice(0, 7) === last.slice(0, 7) && order !== "ymd") {
    return order === "dmy" ? `${dayNumber(first)} to ${fullDate(last, order)}` : `${dayMonth(first, order)} to ${dayNumber(last)}, ${last.slice(0, 4)}`;
  }
  return first.slice(0, 4) === last.slice(0, 4) ? `${dayMonth(first, order)} to ${fullDate(last, order)}` : `${fullDate(first, order)} to ${fullDate(last, order)}`;
}

/** One day's head over the picture: "Today" over its number, else the weekday. */
export interface WeekHead {
  date: string;
  label: string;
  number: string;
  today: boolean;
}

/** A stretch of days a transit is on the reader, as columns 0 to 6, and what each end means. */
export interface WeekRun {
  from: number;
  to: number;
  /** It begins inside the week: the left end is round and a tick marks the day. A flat end carries on from before. */
  starts: boolean;
  /** It stops inside the week: the right end is round and a tick marks the day. A flat end carries on past Sunday. */
  ends: boolean;
}

/** One transit in effect this week, one row of the picture. */
export interface WeekRow {
  key: string;
  /** Null only on an eclipse far from every natal point, which gets a plain dot. */
  tone: Tone | null;
  headline: string;
  /** "all week", "starts Thu", "ends Tue" or both; true in `changes` for the last three. */
  label: string;
  changes: boolean;
  runs: WeekRun[];
  /** The reading's own everyday line once one is written; the dashboard looks none up. */
  line: string | null;
  /** "Mars on your Moon · 3rd house (mind) · 3 Oct to 6 Oct 2026". */
  facts: string;
  /** Whether a tap can open its reading, and the event the sheet is handed. */
  reads: boolean;
  event: TimelineEvent;
}

export interface WeekModel {
  span: string;
  /** The engine's sentence for the week; none when the API sends none. */
  headline: string | null;
  heads: WeekHead[];
  /** Today's column, or -1 when today is outside these seven days. */
  todayAt: number;
  /** What changes this week first, then Heavy, Mixed, Light. */
  rows: WeekRow[];
}

export const TODAY = "Today";

const TONE_RANK: Readonly<Record<Tone, number>> = { intense: 0, mixed: 1, easy: 2 };
const toneRank = (tone: Tone | null) => (tone === null ? 3 : TONE_RANK[tone]);

/** A calendar day moved by whole days, read off the date itself so a clock change never moves it. */
function shift(day: string, by: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + by)).toISOString().slice(0, 10);
}

function runsOf(held: readonly boolean[], before: boolean, after: boolean): WeekRun[] {
  const runs: WeekRun[] = [];
  for (let i = 0; i < held.length; i++) {
    if (!held[i] || held[i - 1]) continue;
    let to = i;
    while (held[to + 1]) to++;
    runs.push({ from: i, to, starts: i > 0 || !before, ends: to < held.length - 1 || !after });
  }
  return runs;
}

function labelOf(runs: readonly WeekRun[], dates: readonly string[]): { label: string; changes: boolean } {
  const day = (i: number) => weekdayOf(dates[i]);
  if (runs.length === 1 && runs[0].starts && runs[0].ends && runs[0].from === runs[0].to) return { label: `${day(runs[0].from)} only`, changes: true };
  const parts = runs.flatMap((run) => [run.starts ? `starts ${day(run.from)}` : null, run.ends ? `ends ${day(run.to)}` : null]).filter((part) => part !== null);
  return parts.length ? { label: parts.join(", "), changes: true } : { label: "all week", changes: false };
}

/** The stretch the week meets, "3 Oct to 6 Oct 2026", and when it comes back after a gap in a retrograde's turns. */
function whenText(start: string, end: string, back: string | null, order: DateOrder): string {
  const from = start === end ? "" : start.slice(0, 4) === end.slice(0, 4) ? `${dayMonth(start, order)} to ` : `${fullDate(start, order)} to `;
  return `${from}${fullDate(end, order)}${back ? `, back in ${monthYear(back, order)}` : ""}`;
}

/** The first day of a row where something changes, so the rows that change soonest come first. */
const firstChange = (runs: readonly WeekRun[]) =>
  Math.min(...runs.flatMap((run) => [run.starts ? run.from : 7, run.ends ? run.to : 7]));

/**
 * The picture's rows. A transit is a row when it is in orb on a day of the week, by the reader's days and the stretches
 * the API sent, which is how the week's sentence counts it, so the two agree; a retrograde and an eclipse count too.
 */
export function weekModel(week: Week, zone: string, order: DateOrder, today: string = dayIn(new Date(), zone)): WeekModel {
  const dates = week.days.map((day) => day.date);
  const before = dates.length ? shift(dates[0], -1) : "";
  const after = dates.length ? shift(dates[dates.length - 1], 1) : "";
  const rows: WeekRow[] = [];
  for (const event of week.on) {
    const spans = event.spans.length ? event.spans : [{ start: event.start, end: event.end }];
    const days = spans.map((span) => [dayIn(span.start, zone), dayIn(span.end, zone)] as const);
    const covers = (date: string) => days.some(([from, to]) => from <= date && date <= to);
    const held = dates.map(covers);
    if (!held.includes(true)) continue;
    const runs = runsOf(held, covers(before), covers(after));
    const here = days.findIndex(([from, to]) => from <= dates[held.indexOf(true)] && dates[held.indexOf(true)] <= to);
    const [start, end] = days[here];
    const back = days[here + 1]?.[0] ?? null;
    const house = housesText(event.houses);
    rows.push({
      key: event.key,
      tone: event.tone,
      headline: event.headline,
      ...labelOf(runs, dates),
      runs,
      line: event.line,
      facts: [event.facts.sky, house, whenText(start, end, back, order)].filter(Boolean).join(" · "),
      reads: reads(event),
      event,
    });
  }
  const ordered = rows
    .map((row, at) => ({ row, at }))
    .sort((a, b) =>
      Number(b.row.changes) - Number(a.row.changes)
      || (a.row.changes ? firstChange(a.row.runs) - firstChange(b.row.runs) : 0)
      || toneRank(a.row.tone) - toneRank(b.row.tone)
      || a.at - b.at)
    .map(({ row }) => row);
  return {
    span: weekSpan(week, order),
    headline: week.headline,
    heads: dates.map((date) => ({ date, label: date === today ? TODAY : weekdayOf(date), number: dayNumber(date), today: date === today })),
    todayAt: dates.indexOf(today),
    rows: ordered,
  };
}

/** What the dial draws for a range: the reader's chart and the days from today, with a key for the frames made from it. */
export interface DialSource {
  points: readonly DialPoint[];
  angles: DialAngles | null;
  /** Today, the reader's day, the first frame. */
  from: string;
  days: number;
  /** The range and the chart, so frames made once are reused and a birth time added meanwhile makes new ones. */
  key: string;
}

function sourceOf(points: readonly DialPoint[], angles: DialAngles | null, from: string, days: number): DialSource {
  const chart = [angles?.ascendant ?? "-", ...points.map((p) => `${p.body}${p.lon}`)].join(",");
  return { points, angles, from, days, key: `${from}:${days}:${chart}` };
}

/** The week comes with GET /home. The dial still plays seven days from today, since the picture beside it is the week's. */
export function weekSource(week: Week, today: string): DialSource {
  const from = week.days.some((day) => day.date === today) ? today : (week.days[0]?.date ?? "");
  return sourceOf(week.natal, week.angles, from, week.days.length);
}

/** A month or six months come from GET /timeline/now, the read Timeline's own page shares. */
export function nowSource(now: TimelineNow): DialSource {
  return sourceOf(now.natal, now.angles, now.from, now.days.length);
}

/** The day the dial shows: "Today", else "Sat 10 Oct 2026" in the reader's order. */
export function dialWhen(date: string, today: string, order: DateOrder): string {
  return date === today ? TODAY : `${weekdayOf(date)} ${fullDate(date, order)}`;
}

const AHEAD: Readonly<Record<TimelineRange, string>> = {
  week: "this week",
  month: "the next month",
  "six-months": "the next 6 months",
};

/** A longer range that didn't load; the dial keeps the week meanwhile. */
export function loadLine(range: TimelineRange): string {
  return `We couldn't load ${AHEAD[range]}. Check your connection and try again.`;
}
