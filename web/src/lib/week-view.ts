/**
 * Your week on the dashboard (ADR-211, 262; readings 4, 18, 26), pure so a node test pins every line it prints. The
 * week GET /home sends a subscriber is read the way Now and ahead reads a one-week range, so what's on the reader today
 * is the card Timeline's own page shows for today. Its days are the reader's, in the zone the dashboard sent as `tz`,
 * and every date and degree is one the API sent (acceptance 1).
 */
import type { TimelineNow, TimelineRange, Week } from "@workspace/api-client-react";
import type { DateOrder } from "@/lib/date-entry";
import type { DialAngles, DialPoint } from "@/lib/dial";
import { contactOf, nowDay, nowModel, rangeSpan } from "@/lib/now-ahead";
import { nearDate, weekdayOf, type ContactView, type DayView } from "@/lib/timeline-view";

/** The week as Now and ahead's one-week range from today; nothing after the week is sent, so nothing comes next. */
export function weekAsNow(week: Week, zone: string): TimelineNow {
  const from = week.days[0]?.date ?? "";
  return {
    range: "week",
    from,
    to: week.days[week.days.length - 1]?.date ?? from,
    zone,
    blind: week.angles === null,
    natal: week.natal,
    angles: week.angles,
    days: week.days,
    events: week.on,
    next: [],
  };
}

export interface WeekModel {
  /** "5 Oct to 11 Oct", the week's first and last day. */
  span: string;
  /** The engine's sentence for the week; none when the API sends none. */
  headline: string | null;
  days: DayView[];
  /** The strongest of what touches the chart today, as Now and ahead's card prints it; none on a quiet day. */
  onYou: ContactView | null;
  /** How many more things touch the chart today. */
  more: number;
}

/**
 * An eclipse far from every natal point comes with no tone: it touches nothing on the chart, so it is never what's on
 * the reader, and the day cells draw no dot for it either.
 */
export function weekModel(week: Week, zone: string, order: DateOrder): WeekModel {
  const now = weekAsNow(week, zone);
  const today = nowDay(nowModel(now), 0, order).cards.filter((card) => card.tone !== null);
  return {
    span: rangeSpan(now, order),
    headline: week.headline,
    days: week.days.map((day) => ({ date: day.date, tones: [...day.tones] })),
    onYou: today[0] ? contactOf(today[0]) : null,
    more: Math.max(0, today.length - 1),
  };
}

export function moreLine(more: number): string | null {
  if (more <= 0) return null;
  return more === 1 ? "1 more thing touches your chart today." : `${more} more things touch your chart today.`;
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

/** The week comes with GET /home. */
export function weekSource(week: Week): DialSource {
  return sourceOf(week.natal, week.angles, week.days[0]?.date ?? "", week.days.length);
}

/** A month or six months come from GET /timeline/now, the read Timeline's own page shares. */
export function nowSource(now: TimelineNow): DialSource {
  return sourceOf(now.natal, now.angles, now.from, now.days.length);
}

export const TODAY = "Today";

/** The day the dial shows: "Today", else "Sat 10 Oct" in the reader's order, its year only where it could be misread. */
export function dialWhen(date: string, today: string, order: DateOrder): string {
  return date === today ? TODAY : `${weekdayOf(date)} ${nearDate(date, today, order)}`;
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
