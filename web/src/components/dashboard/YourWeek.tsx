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
import { Eyebrow } from "@/ds/atoms/Eyebrow";
import { StatusDots } from "@/ds/atoms/StatusDots";
import { TextButton } from "@/ds/atoms/TextButton";
import { Card } from "@/ds/molecules/Card";
import { SegmentedControl } from "@/ds/molecules/SegmentedControl";
import { Dial } from "@/components/timeline/Dial";
import { RetrogradeLine } from "@/components/timeline/RetrogradeLine";
import { WeekBars } from "@/components/timeline/WeekBars";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { DIAL_ORDER, anyRetrograde, framesFor, type DialFrame } from "@/lib/dial";
import { RANGES } from "@/lib/now-ahead";
import { dayIn } from "@/lib/timeline-view";
import { dialWhen, loadLine, nowSource, weekSource, weekSpan } from "@/lib/week-view";

// The sky on a chart moves slowly, as Timeline's own page reads it.
const STALE_MS = 5 * 60_000;

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
        <h2 id={id} className="m-0">
          <Eyebrow className="text-brass">Your week</Eyebrow>
        </h2>
        <p className="min-w-0 text-right text-caption text-paper-dim">{span} · Timeline</p>
      </div>
      <Card variant="glass" as="div" className="gap-5 md:grid md:grid-cols-[300px_minmax(0,1fr)] md:items-start">
        <div className="grid min-w-0 content-start gap-3 md:col-start-2 md:row-start-1">
          <WeekBars week={week} zone={zone} />
          <Link
            href="/dashboard/timeline"
            className="justify-self-start rounded-inner text-button-compact text-indigo-lt transition-colors duration-fast hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
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
              <SegmentedControl<TimelineRange> aria-label="How far ahead" options={RANGES} value={range} onChange={setRange} />
            </Dial>
          </div>
          {anyRetrograde(frames) ? <RetrogradeLine className="w-full max-w-[300px]" /> : null}
          <p className="flex min-h-[22px] w-full max-w-[300px] flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-mono text-data tabular-nums text-paper-dim">{dialWhen(frames[day]?.date ?? shown.from, shown.from, order)}</span>
            {day > 0 ? (
              <TextButton onClick={backToToday} className="text-caption">
                Back to today
              </TextButton>
            ) : null}
            {loading ? (
              <span className="font-label text-caption text-paper-dim">
                <StatusDots label="Loading" />
              </span>
            ) : null}
          </p>
          {failed ? (
            <div className="grid w-full max-w-[300px] justify-items-start gap-1">
              <p className="text-small text-paper-dim">{loadLine(range)}</p>
              <TextButton onClick={() => void nowQ.refetch()} className="-ml-1 text-caption">
                Try again
              </TextButton>
            </div>
          ) : null}
        </div>
      </Card>
    </section>
  );
}

export default YourWeek;
