/**
 * Now and ahead (ADR-207; readings 4, 17, 18): the reader's chart on the dial with the sky moving on it, over a week, a
 * month or six months from today; beside it the day the dial shows, its mix of tones, a card for everything touching
 * the chart that day, and what starts, peaks or eases next. The dial is the day's one control: Play steps it, the
 * arrow keys walk it, a tap on what comes next moves it. Every date and degree is the API's (`now-ahead.ts`).
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { keepPreviousData } from "@tanstack/react-query";
import { getGetTimelineNowQueryKey, useGetTimelineNow, type TimelineRange } from "@workspace/api-client-react";
import { ContactCard } from "@/components/timeline/ContactCard";
import { Dial } from "@/components/timeline/Dial";
import { MixBar } from "@/components/timeline/MixBar";
import { RetrogradeLine } from "@/components/timeline/RetrogradeLine";
import { ToneLegend } from "@/components/timeline/ToneLegend";
import { Button } from "@/ds/atoms/Button";
import { Chip } from "@/ds/atoms/Chip";
import { StatusDots } from "@/ds/atoms/StatusDots";
import { TextButton } from "@/ds/atoms/TextButton";
import { ToneDot } from "@/ds/atoms/ToneDot";
import { Card } from "@/ds/molecules/Card";
import { SegmentedControl } from "@/ds/molecules/SegmentedControl";
import type { ReadingTarget } from "@/components/timeline/ReadingSheet";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { DIAL_ORDER, anyRetrograde, framesFor, type DialFrame } from "@/lib/dial";
import {
  BLIND_FIX, BLIND_LINE, QUIET_DAY, RANGES, comingUpTitle, contactOf, nothingNext, nowDay, nowModel, rangeAhead, rangeSpan,
  type EventCard, type NowDay,
} from "@/lib/now-ahead";
import { DOT_TONE, TONE_WORDS, mixOf } from "@/lib/timeline-view";

const EYEBROW = "font-label text-label uppercase text-indigo-lt";
const QUIET = "text-small text-paper-dim";
// The sky on a chart moves slowly, so a tab coming back soon does not ask again.
const STALE_MS = 5 * 60_000;

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

/** Week · Month · 6 months, a switch of pressed buttons as Your week has it. */
function RangeSwitch({ range, onChange }: { range: TimelineRange; onChange: (range: TimelineRange) => void }) {
  return <SegmentedControl aria-label="How far ahead" options={RANGES} value={range} onChange={onChange} />;
}

/** The dial's marks in words; every swatch is drawn the way the dial draws it. */
function DialKey({ range }: { range: TimelineRange }) {
  const item = "inline-flex items-center gap-1.5";
  return (
    <p className="flex flex-wrap justify-center gap-x-3.5 gap-y-1.5 text-xs text-paper-dim">
      {(["easy", "mixed", "intense"] as const).map((tone) => (
        <span key={tone} className={item}>
          <ToneDot tone={DOT_TONE[tone]} className="size-3" />
          {TONE_WORDS[tone]}
        </span>
      ))}
      <span className={item}>
        <i aria-hidden className="block size-3 rounded-full border-[1.5px] border-dashed border-indigo-lt" />
        Retrograde
      </span>
      <span className={item}>
        <i aria-hidden className="block h-[5px] w-[18px] rounded-pill bg-paper-dim opacity-40" />
        Its path {rangeAhead(range)}
      </span>
      <span className={item}>
        <i aria-hidden className="block h-0.5 w-[18px] bg-brass" />
        Touching your chart
      </span>
    </p>
  );
}

/** An eclipse far from every natal point comes with no tone, so its card is the contact card without a tone word. */
function PlainCard({ card }: { card: EventCard }) {
  return (
    <Card as="article" variant="tone" className="relative grid gap-[3px] border-l-muted p-3 sm:p-3">
      <p className="text-xs text-paper-dim">{card.lasts}</p>
      <p className="font-display text-card-title-sm text-paper">{card.headline}</p>
      {card.line ? <p className="text-ui text-paper">{card.line}</p> : null}
      <p className="pt-0.5 font-mono text-data-sm normal-case tabular-nums tracking-normal text-muted">{card.facts}</p>
    </Card>
  );
}

function DayMix({ day }: { day: NowDay }) {
  const mix = mixOf(day.tones);
  return (
    <div className="grid gap-2">
      <p className={EYEBROW}>What's going on for you</p>
      {mix.length ? (
        <>
          <MixBar tones={day.tones} />
          <p aria-hidden className="flex flex-wrap gap-x-4 gap-y-1">
            {mix.map(({ tone, count }) => (
              <span key={tone} className="inline-flex items-center gap-1.5 text-small text-paper-dim">
                <ToneDot tone={DOT_TONE[tone]} className="size-2" />
                {TONE_WORDS[tone]}
                <b className="font-mono font-medium tabular-nums text-paper">{count}</b>
              </span>
            ))}
          </p>
        </>
      ) : null}
      {day.cards.length === 0 ? <p className={QUIET}>{QUIET_DAY}</p> : null}
    </div>
  );
}

function ComingUp({ day, range, onDay }: { day: NowDay; range: TimelineRange; onDay: (index: number) => void }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="grid gap-1">
      <h3 id={id} className={EYEBROW}>
        {comingUpTitle(range)}
      </h3>
      {day.next.length ? (
        <ol role="list" className="m-0 grid list-none p-0">
          {day.next.map((next) => (
            <li key={next.id}>
              <TextButton
                onClick={() => onDay(next.index)}
                className="grid min-h-0 w-full grid-cols-[minmax(84px,auto)_minmax(0,1fr)] items-baseline gap-x-3 rounded-none border-t border-line-soft px-0 py-2.5 text-left font-normal text-paper hover:text-paper"
              >
                <span className="font-mono text-data tabular-nums text-paper-dim">
                  <span className="sr-only">Move the dial to </span>
                  {next.when}
                </span>
                <span className="min-w-0">
                  <span className="text-ui">{next.headline}</span> <span className="text-data text-muted">{next.change}</span>
                </span>
              </TextButton>
            </li>
          ))}
        </ol>
      ) : (
        <p className={QUIET}>{nothingNext(range)}</p>
      )}
    </section>
  );
}

export interface NowAheadProps {
  /** The browser's zone, sent so the days are the reader's own (reading 4). */
  zone: string | undefined;
  onOpen: (target: ReadingTarget) => void;
  /** The reader has no finished Personal report to read (409). */
  onNoReport: () => void;
  /** Access went while the page was open (403). */
  onNoAccess: () => void;
  /** The reader's own Personal report, where a birth time is added; no link without it. */
  reportId?: string | null;
}

export function NowAhead({ zone, onOpen, onNoReport, onNoAccess, reportId }: NowAheadProps) {
  const { order } = useEntryFormat();
  const [range, setRange] = useState<TimelineRange>("week");
  // The day is held with the range it was picked in, so a new range opens on today without a frame on the old day.
  const [pick, setPick] = useState({ in: "", day: 0 });
  const frameCache = useRef(new Map<string, DialFrame[]>());
  const params = zone ? { range, tz: zone } : { range };
  const query = useGetTimelineNow(params, {
    query: { queryKey: getGetTimelineNowQueryKey(params), placeholderData: keepPreviousData, staleTime: STALE_MS },
  });
  const now = query.data;

  const refused = statusOf(query.error);
  useEffect(() => {
    if (refused === 409) onNoReport();
    else if (refused === 403) onNoAccess();
  }, [refused, onNoReport, onNoAccess]);

  const opened = now ? `${now.range}:${now.from}` : "";
  const day = pick.in === opened ? pick.day : 0;
  const setDay = (next: number) => setPick({ in: opened, day: next });

  const model = useMemo(() => (now ? nowModel(now) : null), [now]);
  // Six months of frames take a moment on a phone, so going back to a range the reader has seen reuses its frames.
  const frames = useMemo(() => {
    if (!now) return [];
    // The chart is in the key too: a birth time added meanwhile moves the angles and brings the Moon back.
    const chart = [now.angles?.ascendant ?? "-", ...now.natal.map((p) => `${p.body}${p.lon}`)].join(",");
    const key = `${now.from}:${now.days.length}:${chart}`;
    const held = frameCache.current.get(key);
    if (held) return held;
    const made = framesFor({ points: now.natal, angles: now.angles }, now.from, now.days.length, DIAL_ORDER);
    frameCache.current.set(key, made);
    return made;
  }, [now]);

  if (!now || !model) {
    if (query.isError) {
      if (refused === 409 || refused === 403) return null;
      return (
        <div className="grid justify-items-start gap-3 py-6">
          <p className={QUIET}>We couldn't load what's happening on your chart. Check your connection and try again.</p>
          <Button variant="secondary" size="compact" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      );
    }
    return (
      <div className="grid min-h-[320px] place-items-center font-label text-ui text-paper-dim">
        <StatusDots label="Loading" />
      </div>
    );
  }

  const shown = nowDay(model, day, order);
  const changing = query.isPlaceholderData && query.isFetching;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <RangeSwitch range={range} onChange={setRange} />
        {changing ? (
          <span className="font-label text-xs text-paper-dim">
            <StatusDots label="Loading" />
          </span>
        ) : null}
      </div>

      {now.blind ? (
        <Card as="div" className="max-w-[62ch] gap-1 px-4 py-3 sm:px-4 sm:py-3">
          <p className="text-small text-paper">{BLIND_LINE}</p>
          <p className="text-small text-paper-dim">
            {BLIND_FIX}
            {reportId ? (
              <>
                {" "}
                <Link
                  href={`/report/${encodeURIComponent(reportId)}`}
                  className="rounded-inner text-indigo-lt underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  Open your report
                </Link>
              </>
            ) : null}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)] md:gap-8">
        <div className="grid content-start gap-3.5 md:sticky md:top-20">
          <div className="mx-auto w-full max-w-[520px]">
            <Dial
              points={now.natal}
              angles={now.angles}
              frames={frames}
              day={shown.index}
              onDay={setDay}
              playable
              trail="range"
              label="Your chart"
            >
              {shown.today ? null : (
                <TextButton onClick={() => setDay(0)} className="min-h-11 px-2 font-label">
                  Back to today
                </TextButton>
              )}
              <span className="ml-auto font-mono text-data tabular-nums text-muted">{rangeSpan(now, order)}</span>
            </Dial>
          </div>
          <DialKey range={now.range} />
          {anyRetrograde(frames) ? <RetrogradeLine /> : null}
        </div>

        <div className="grid content-start gap-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-display text-sheet-title font-normal text-paper">{shown.title}</h3>
            {shown.today ? <Chip tone="now">Today</Chip> : null}
          </div>
          <DayMix day={shown} />
          {shown.cards.some((card) => card.tone !== null) ? <ToneLegend /> : null}
          {shown.cards.length ? (
            <ul role="list" className="m-0 grid list-none gap-2.5 p-0">
              {shown.cards.map((card) => {
                const contact = contactOf(card);
                const open = card.reads ? () => onOpen({ key: card.key, headline: card.headline, status: card.reading, event: card.event }) : undefined;
                return <li key={card.key}>{contact ? <ContactCard contact={contact} onOpen={open} /> : <PlainCard card={card} />}</li>;
              })}
            </ul>
          ) : null}
          <ComingUp day={shown} range={now.range} onDay={setDay} />
        </div>
      </div>
    </div>
  );
}

export default NowAhead;
