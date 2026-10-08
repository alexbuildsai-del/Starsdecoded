/**
 * Your week (ADR-211, 262; readings 4, 18, 23, 26): a subscriber's section on the dashboard, after Your circle. The
 * dial plays the planets on the reader's chart over a week, a month or six months, and nothing else moves while it
 * plays: the week's picture stays on Monday to Sunday, first on a phone and beside the dial on a desktop. The week
 * comes with GET /home; a month or six months from GET /timeline/now once picked, in the cache Timeline's own page
 * reads. The dashboard loads this lazily, since the dial brings the sky engine with it.
 */
import { useId, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { keepPreviousData } from "@tanstack/react-query";
import { getGetTimelineNowQueryKey, useGetTimelineNow, type TimelineRange, type Week } from "@workspace/api-client-react";
import { StatusDots } from "@/components/StatusDots";
import { Dial } from "@/components/timeline/Dial";
import { RetrogradeLine } from "@/components/timeline/RetrogradeLine";
import { WeekBars } from "@/components/timeline/WeekBars";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { DIAL_ORDER, anyRetrograde, framesFor, type DialFrame } from "@/lib/dial";
import { RANGES } from "@/lib/now-ahead";
import { dayIn } from "@/lib/timeline-view";
import { cn } from "@/lib/utils";
import { dialWhen, loadLine, nowSource, weekSource, weekSpan } from "@/lib/week-view";

const HEADING = "font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[.18em] text-[#D4B06A]";
const TEXT_BUTTON =
  "inline-flex min-h-8 items-center rounded px-1 text-[12.5px] text-[#9FA8DA] transition-colors hover:text-[#E8EBF2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB8F0]";
// The sky on a chart moves slowly, as Timeline's own page reads it.
const STALE_MS = 5 * 60_000;

/** Week · Month · 6 months, pressed buttons as Now and ahead has them, narrow enough to sit beside Play under a 300 px dial. */
function RangeSwitch({ range, onChange }: { range: TimelineRange; onChange: (range: TimelineRange) => void }) {
  return (
    <div role="group" aria-label="How far ahead" className="inline-flex gap-0.5 rounded-[10px] border border-[#242C3B] bg-[#0B0F15] p-[3px]">
      {RANGES.map(({ id, label }) => {
        const on = id === range;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(id)}
            className={cn(
              "min-h-9 rounded-[7px] px-1.5 font-label text-[12.5px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB8F0]",
              on ? "bg-[#171D29] text-[#E8EBF2]" : "text-[#9AA3B5] hover:text-[#E8EBF2]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export interface YourWeekProps {
  week: Week;
  /** The zone the dashboard sent GET /home, so the days here and the longer ranges are read in the same one. */
  zone: string;
}

export function YourWeek({ week, zone }: YourWeekProps) {
  const id = useId();
  const { order } = useEntryFormat();
  const dialBox = useRef<HTMLDivElement>(null);
  const frameCache = useRef(new Map<string, DialFrame[]>());
  const [range, setRange] = useState<TimelineRange>("week");
  // The day is held with the frames it was picked on, so a new range opens on today.
  const [pick, setPick] = useState({ in: "", day: 0 });

  const longer = range !== "week";
  const params = { range, tz: zone };
  const nowQ = useGetTimelineNow(params, {
    query: { queryKey: getGetTimelineNowQueryKey(params), enabled: longer, placeholderData: keepPreviousData, staleTime: STALE_MS },
  });

  const span = useMemo(() => weekSpan(week, order), [week, order]);
  const weekDial = useMemo(() => weekSource(week, dayIn(new Date(), zone)), [week, zone]);
  const nowDial = useMemo(() => (nowQ.data ? nowSource(nowQ.data) : null), [nowQ.data]);
  // Until a longer range is in, the dial keeps what it has, so it never stands empty.
  const shown = longer && nowDial ? nowDial : weekDial;
  // Six months of frames take a moment on a phone, so a range seen once reuses its frames.
  const frames = useMemo(() => {
    const held = frameCache.current.get(shown.key);
    if (held) return held;
    const made = framesFor(shown, shown.from, shown.days, DIAL_ORDER);
    frameCache.current.set(shown.key, made);
    return made;
  }, [shown]);

  const day = pick.in === shown.key ? pick.day : 0;
  const setDay = (next: number) => setPick({ in: shown.key, day: next });
  const backToToday = () => {
    setDay(0);
    // The button goes once the dial is on today, so focus moves to the dial, which now says today.
    dialBox.current?.querySelector<HTMLElement>('[role="slider"]')?.focus();
  };

  const loading = longer && nowQ.isFetching && (!nowQ.data || nowQ.isPlaceholderData);
  const failed = longer && nowQ.isError && !nowQ.isFetching;

  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-2.5">
      <div className="flex items-baseline justify-between gap-2.5">
        <h2 id={id} className={HEADING}>
          Your week
        </h2>
        <p className="min-w-0 text-right text-xs leading-[1.4] text-[#9AA3B5]">{span} · Timeline</p>
      </div>
      <div className="grid gap-5 rounded-[12px] border border-[#242C3B] bg-[rgba(17,22,31,.55)] p-[18px] md:grid-cols-[300px_minmax(0,1fr)] md:items-start">
        <div className="grid min-w-0 content-start gap-3 md:col-start-2 md:row-start-1">
          <WeekBars week={week} zone={zone} />
          <Link
            href="/dashboard/timeline"
            className="justify-self-start rounded text-[13.5px] text-[#9FA8DA] transition-colors hover:text-[#E8EBF2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB8F0]"
          >
            Open Timeline <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="grid min-w-0 justify-items-center gap-2.5 md:col-start-1 md:row-start-1">
          <div ref={dialBox} className="w-full max-w-[300px]">
            <Dial
              points={shown.points}
              angles={shown.angles}
              frames={frames}
              day={day}
              onDay={setDay}
              playable
              trail="range"
              label="Your chart"
            >
              <RangeSwitch range={range} onChange={setRange} />
            </Dial>
          </div>
          {anyRetrograde(frames) ? <RetrogradeLine className="w-full max-w-[300px]" /> : null}
          <p className="flex min-h-[22px] w-full max-w-[300px] flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-numeric text-[12.5px] text-[#AEB6C6]">{dialWhen(frames[day]?.date ?? shown.from, shown.from, order)}</span>
            {day > 0 ? (
              <button type="button" onClick={backToToday} className={TEXT_BUTTON}>
                Back to today
              </button>
            ) : null}
            {loading ? (
              <span className="font-label text-xs text-[#AEB6C6]">
                <StatusDots label="Loading" />
              </span>
            ) : null}
          </p>
          {failed ? (
            <div className="grid w-full max-w-[300px] justify-items-start gap-1">
              <p className="text-[13px] leading-snug text-[#AEB6C6]">{loadLine(range)}</p>
              <button type="button" onClick={() => void nowQ.refetch()} className={cn(TEXT_BUTTON, "-ml-1")}>
                Try again
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default YourWeek;
