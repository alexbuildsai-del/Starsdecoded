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
import { StatusDots } from "@/components/StatusDots";
import { ContactCard } from "@/components/timeline/ContactCard";
import { Dial } from "@/components/timeline/Dial";
import { MixBar } from "@/components/timeline/MixBar";
import { RetrogradeLine } from "@/components/timeline/RetrogradeLine";
import type { ReadingTarget } from "@/components/timeline/ReadingSheet";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { DIAL_ORDER, anyRetrograde, framesFor, type DialFrame } from "@/lib/dial";
import {
  BLIND_FIX, BLIND_LINE, QUIET_DAY, RANGES, comingUpTitle, contactOf, nothingNext, nowDay, nowModel, rangeAhead, rangeSpan,
  type EventCard, type NowDay,
} from "@/lib/now-ahead";
import { TONE_WORDS, mixOf, toneClass } from "@/lib/timeline-view";
import { cn } from "@/lib/utils";

const EYEBROW = "font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[0.18em] text-[#9FA8DA]";
const QUIET = "text-[13.5px] leading-normal text-[#AEB6C6]";
const TRY = "inline-flex min-h-10 items-center rounded-[10px] border border-[#242C3B] bg-[#171D29] px-4 font-label text-sm font-medium text-[#E8EBF2] transition-colors hover:border-[#5C6BC0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
// The sky on a chart moves slowly and the six-month read queues readings (ADR-210), so a tab coming back soon does not ask again.
const STALE_MS = 5 * 60_000;

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

/** Week · Month · 6 months, a switch of pressed buttons as Your week has it. */
function RangeSwitch({ range, onChange }: { range: TimelineRange; onChange: (range: TimelineRange) => void }) {
  return (
    <div role="group" aria-label="How far ahead" className="inline-flex gap-1 rounded-xl border border-[#242C3B] bg-[#06080C] p-1">
      {RANGES.map(({ id, label }) => {
        const on = id === range;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(id)}
            className={cn(
              "min-h-9 rounded-[9px] px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB8F0]",
              on ? "bg-[#171D29] text-[#E8EBF2] shadow-[inset_0_0_0_1px_#242C3B]" : "text-[#AEB6C6] hover:text-[#E8EBF2]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** The dial's marks in words; every swatch is drawn the way the dial draws it. */
function DialKey({ range }: { range: TimelineRange }) {
  const item = "inline-flex items-center gap-1.5";
  return (
    <p className="flex flex-wrap justify-center gap-x-3.5 gap-y-1.5 text-xs text-[#AEB6C6]">
      {(["easy", "mixed", "intense"] as const).map((tone) => (
        <span key={tone} className={cn(item, toneClass(tone))}>
          <i aria-hidden className="block h-3 w-3 rounded-full bg-[var(--sd-tone)]" />
          {TONE_WORDS[tone]}
        </span>
      ))}
      <span className={item}>
        <i aria-hidden className="block h-3 w-3 rounded-full border-[1.5px] border-dashed border-[#9FA8DA]" />
        Retrograde
      </span>
      <span className={item}>
        <i aria-hidden className="block h-[5px] w-[18px] rounded-full bg-[#AEB6C6] opacity-40" />
        Its path {rangeAhead(range)}
      </span>
      <span className={item}>
        <i aria-hidden className="block h-0.5 w-[18px] bg-[#D4B06A]" />
        Touching your chart
      </span>
    </p>
  );
}

/** An eclipse far from every natal point comes with no tone, so its card is the contact card without a tone word. */
function PlainCard({ card }: { card: EventCard }) {
  return (
    <article className="relative grid min-w-0 gap-[3px] rounded-xl border border-l-[3px] border-[#242C3B] bg-[#11161F] px-3 py-[11px]">
      <p className="text-xs text-[#AEB6C6]">{card.lasts}</p>
      <p className="font-display text-lg leading-[1.25] text-[#E8EBF2]">{card.headline}</p>
      {card.line ? <p className="text-sm leading-normal text-[#E8EBF2]">{card.line}</p> : null}
      <p className="pt-0.5 font-numeric text-[11px] leading-normal text-[#7E889A]">{card.facts}</p>
    </article>
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
              <span key={tone} className={cn("inline-flex items-center gap-1.5 text-[13px] text-[#AEB6C6]", toneClass(tone))}>
                <i className="block h-2 w-2 rounded-full bg-[var(--sd-tone)]" />
                {TONE_WORDS[tone]}
                <b className="font-numeric font-medium text-[#E8EBF2]">{count}</b>
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
              <button
                type="button"
                onClick={() => onDay(next.index)}
                className="grid w-full grid-cols-[minmax(84px,auto)_minmax(0,1fr)] items-baseline gap-x-3 border-t border-[#1A202C] py-2.5 text-left text-sm text-[#E8EBF2] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#AEB8F0]"
              >
                <span className="font-numeric text-xs text-[#AEB6C6]">
                  <span className="sr-only">Move the dial to </span>
                  {next.when}
                </span>
                <span className="min-w-0">
                  {next.headline} <span className="text-[12.5px] text-[#7E889A]">{next.change}</span>
                </span>
              </button>
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
          <button type="button" onClick={() => void query.refetch()} className={TRY}>
            Try again
          </button>
        </div>
      );
    }
    return (
      <div className="grid min-h-[320px] place-items-center font-label text-sm text-[#AEB6C6]">
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
          <span className="font-label text-xs text-[#AEB6C6]">
            <StatusDots label="Loading" />
          </span>
        ) : null}
      </div>

      {now.blind ? (
        <div className="grid max-w-[62ch] gap-1 rounded-xl border border-[#242C3B] bg-[#11161F] px-4 py-3 text-[13.5px] leading-normal">
          <p className="text-[#E8EBF2]">{BLIND_LINE}</p>
          <p className="text-[#AEB6C6]">
            {BLIND_FIX}
            {reportId ? (
              <>
                {" "}
                <Link
                  href={`/report/${encodeURIComponent(reportId)}`}
                  className="rounded text-[#9FA8DA] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Open your report
                </Link>
              </>
            ) : null}
          </p>
        </div>
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
                <button
                  type="button"
                  onClick={() => setDay(0)}
                  className="inline-flex min-h-11 items-center rounded-[10px] px-2 font-label text-sm text-[#9FA8DA] hover:text-[#E8EBF2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB8F0]"
                >
                  Back to today
                </button>
              )}
              <span className="ml-auto font-numeric text-xs text-[#7E889A]">{rangeSpan(now, order)}</span>
            </Dial>
          </div>
          <DialKey range={now.range} />
          {anyRetrograde(frames) ? <RetrogradeLine /> : null}
        </div>

        <div className="grid content-start gap-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-display text-[26px] font-normal leading-tight text-[#E8EBF2]">{shown.title}</h3>
            {shown.today ? <span className="font-label text-[10.5px] uppercase tracking-[0.14em] text-[#9FA8DA]">Today</span> : null}
          </div>
          <DayMix day={shown} />
          {shown.cards.length ? (
            <ul role="list" className="m-0 grid list-none gap-2.5 p-0">
              {shown.cards.map((card) => {
                const contact = contactOf(card);
                const open = card.reads ? () => onOpen({ key: card.key, headline: card.headline, status: card.reading }) : undefined;
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
