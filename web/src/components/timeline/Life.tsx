/**
 * Life (ADR-209; reading 19; Review 05/10 §4): the reader's long cycles from birth to 90. It opens on why they matter,
 * four ages most people know with the reader's own dates; then each slow planet's wave, with a line the reader drags
 * through time (by pointer, by the slider under the graph or by keyboard) and the Your cycles card for the cycle it
 * stops at; then a card for every cycle, those under way and ahead first and those behind folded. A tap on an age or a
 * listed cycle opens its reading. Every date is the API's (`now-ahead.ts`); the science is the engine's.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronRight } from "lucide-react";
import {
  getGetTimelineLifeQueryKey,
  getGetTimelineNowQueryKey,
  useGetTimelineLife,
  useGetTimelineNow,
  useOpenTimelineReading,
} from "@workspace/api-client-react";
import { StatusDots } from "@/components/StatusDots";
import { CycleRing } from "@/components/timeline/AgeRing";
import { OpenCard } from "@/components/timeline/ContactCard";
import { CycleCard } from "@/components/timeline/CycleCard";
import type { ReadingTarget } from "@/components/timeline/ReadingSheet";
import { Waves } from "@/components/timeline/Waves";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import type { DateOrder } from "@/lib/date-entry";
import { WAVE_UNTIL, cycleScience, lineStamp, nearestStop, ringTarget, type CycleView } from "@/lib/life-view";
import { lifeModel, paragraphs, type AgeCard, type LifeModel } from "@/lib/now-ahead";
import { SERVED_WEEK, sentZone } from "@/lib/reader-zone";

const EYEBROW = "font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[0.18em] text-[#9FA8DA]";
const QUIET = "text-[13.5px] leading-normal text-[#AEB6C6]";
const WHY_TITLE = "Some planets come back only a few times in a life";
const WHY_TEXT =
  "When one comes back to where it was the day you were born, astrology reads it as a checkpoint. Four of them come at ages most people already know.";
const RING_KEY =
  "Each ring is the planet's trip round the sky. The gold dot is where it was when you were born. The blue line shows how far it has come since. An open circle marks where the cycle happens.";
const WAVES_TEXT =
  "Each line is a planet moving away from where it was when you were born, then coming back. At the bottom of a wave it's back where it started: a return. At the top it's as far away as it gets.";
// The day's sky does not move a life's cycles, and the ring's progress moves by a hair a day.
const STALE_MS = 30 * 60_000;
const TRY = "inline-flex min-h-10 items-center rounded-[10px] border border-[#242C3B] bg-[#171D29] px-4 font-label text-sm font-medium text-[#E8EBF2] transition-colors hover:border-[#5C6BC0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

function Age({ age, onOpen }: { age: AgeCard; onOpen: (target: ReadingTarget) => void }) {
  const opens = age.opens;
  return (
    <article className="relative grid h-full min-w-0 content-start gap-2 rounded-2xl border border-[#242C3B] bg-[#11161F] p-4 transition-colors duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-[#171D29]">
      <div className="flex items-start justify-between gap-2.5">
        <p className="font-display text-[19px] leading-tight text-[#E8EBF2]">{age.name}</p>
        <CycleRing progress={age.progress} target={ringTarget({ id: age.id, age: 0 })} size={56} />
      </div>
      <span className="justify-self-start rounded-full border border-[#242C3B] px-2.5 py-[3px] font-label text-[10.5px] uppercase leading-snug tracking-[.14em] text-[#AEB6C6]">
        {age.word}
      </span>
      <p className="text-[13.5px] leading-[1.55] text-[#AEB6C6]">{age.about}</p>
      <p className="font-numeric text-[12.5px] leading-normal text-[#9FA8DA]">{age.yours}</p>
      {opens ? (
        <OpenCard
          headline={age.name}
          onOpen={() => onOpen({ key: opens.key, headline: opens.name, status: opens.reading })}
          rounded="after:rounded-2xl"
        />
      ) : null}
    </article>
  );
}

function WaveKey() {
  const item = "inline-flex items-center gap-1.5";
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#AEB6C6]">
      <span className={item}>
        <i aria-hidden className="block h-2.5 w-2.5 rounded-full bg-[#D4B06A]" />
        A return
      </span>
      <span className={item}>
        <i aria-hidden className="block h-2 w-2 rounded-full bg-[#D4B06A]" />
        Halfway round
      </span>
      <span className={item}>
        <i aria-hidden className="block h-1.5 w-1.5 rounded-full bg-[#D4B06A]" />
        A quarter of the way round
      </span>
      <span className={item}>
        <i aria-hidden className="block h-2.5 w-2.5 rounded-full bg-[#8A7343]" />
        Already happened
      </span>
      <span className={item}>
        <i aria-hidden className="block h-3 w-5 rounded-[3px] border border-[#242C3B] bg-[#171D29]" />
        Already lived
      </span>
    </p>
  );
}

type ScienceOf = (cycle: CycleView) => () => readonly string[];

function CycleList({
  cycles,
  open,
  scienceOf,
}: {
  cycles: readonly CycleView[];
  open: (cycle: CycleView) => void;
  scienceOf: ScienceOf;
}) {
  return (
    <ul role="list" className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
      {cycles.map((cycle) => (
        <li key={cycle.key} className="min-w-0">
          <CycleCard cycle={cycle} science={scienceOf(cycle)} onOpen={() => open(cycle)} />
        </li>
      ))}
    </ul>
  );
}

export interface LifeProps {
  /** The browser's zone, the days every date is printed in (reading 4). */
  zone: string | undefined;
  /** The reader's today, "YYYY-MM-DD", which says what is behind them and what is ahead. */
  today: string;
  onOpen: (target: ReadingTarget) => void;
  onNoReport: () => void;
  onNoAccess: () => void;
}

const MEANING_LATER = "Your reading of this one isn't ready yet.";
const MEANING_FAILED = "We couldn't open your reading just now.";
// A reading is asked for once the line has rested on its cycle, since each ask counts against the reading limit.
const MEANING_WAIT_MS = 300;

interface Line {
  age: number;
  /** The cycle the card shows; null only for a reader whose graph has no cycle ahead or behind. */
  key: string | null;
}

/** The slider's keys: the arrows hop from mark to mark, Home and End go to the ends, the rest is the browser's. */
function hop(key: string): -1 | 1 | null {
  if (key === "ArrowRight" || key === "ArrowUp") return 1;
  return key === "ArrowLeft" || key === "ArrowDown" ? -1 : null;
}

/**
 * The graph, its slider and the card the line stops on. The line follows a press exactly while it is held and settles on
 * the nearest mark, or on today, when it lets go; near today the card is the next cycle still to come, since the nearest
 * one may be behind.
 */
function LifeGraph({
  model,
  zone,
  today,
  order,
  ascendant,
  onOpen,
  scienceOf,
}: {
  model: LifeModel;
  zone: string;
  today: string;
  order: DateOrder;
  ascendant: number | null;
  onOpen: (cycle: CycleView) => void;
  scienceOf: ScienceOf;
}) {
  const sliderId = useId();
  const { mutateAsync } = useOpenTimelineReading();
  const cards = useMemo(() => new Map([...model.ahead, ...model.behind].map((cycle) => [cycle.key, cycle])), [model]);
  const upNext = useMemo(() => model.ahead.find((cycle) => model.stops.some((stop) => stop.key === cycle.key))?.key ?? null, [model]);
  const home = useMemo<Line>(() => ({ age: model.age, key: upNext }), [model.age, upNext]);
  const [line, setLine] = useState<Line>(home);
  const held = useRef(false);

  const stamp = lineStamp(line.age, model.birth, zone, today, order);
  const cycle = line.key ? (cards.get(line.key) ?? null) : null;

  const keyAt = useCallback(
    (age: number): string | null => (lineStamp(age, model.birth, zone, today, order).atToday ? upNext : (nearestStop(model.stops, age)?.key ?? upNext)),
    [model, zone, today, order, upNext],
  );
  // Today is a place to stop too, so the line can come back to it.
  const rests = useMemo(() => [...model.stops.map((s) => ({ age: s.age, key: s.key })), home].sort((a, b) => a.age - b.age), [model, home]);

  const seek = useCallback(
    (age: number, settle: boolean) => {
      const to = Math.min(Math.max(age, 0), WAVE_UNTIL);
      setLine(settle ? (nearestStop(rests, to) ?? { age: to, key: keyAt(to) }) : { age: to, key: keyAt(to) });
    },
    [rests, keyAt],
  );
  const pick = useCallback(
    (key: string) => {
      const stop = model.stops.find((s) => s.key === key);
      if (stop) setLine({ age: stop.age, key });
    },
    [model.stops],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const way = hop(e.key);
    if (way !== null) {
      e.preventDefault();
      const next = way > 0 ? rests.find((r) => r.age > line.age + 0.005) : [...rests].reverse().find((r) => r.age < line.age - 0.005);
      if (next) setLine({ age: next.age, key: next.key });
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      seek(e.key === "Home" ? 0 : WAVE_UNTIL, false);
    }
  };
  const release = (e: PointerEvent<HTMLInputElement>) => {
    if (!held.current) return;
    held.current = false;
    seek(Number(e.currentTarget.value), true);
  };

  // What the card says it means: asked for when the line has rested on a cycle whose reading is written, then kept.
  const status = cycle ? (model.readings.get(cycle.key) ?? "none") : "none";
  const kept = useRef(new Map<string, string[]>());
  const [failed, setFailed] = useState<string | null>(null);
  const [, bump] = useState(0);
  const cycleKey = cycle?.key ?? null;
  useEffect(() => {
    if (cycleKey === null || status !== "ready" || kept.current.has(cycleKey)) return undefined;
    let live = true;
    const timer = window.setTimeout(() => {
      mutateAsync({ key: cycleKey }).then(
        (answer) => {
          if (!live) return;
          if (answer.status === "ready" && answer.reading) {
            kept.current.set(cycleKey, paragraphs(answer.reading.body));
            setFailed(null);
            bump((n) => n + 1);
          } else setFailed(cycleKey);
        },
        () => {
          if (live) setFailed(cycleKey);
        },
      );
    }, MEANING_WAIT_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [cycleKey, status, mutateAsync]);

  const text = cycleKey ? kept.current.get(cycleKey) : undefined;
  const meaning = text ?? (status !== "ready" ? MEANING_LATER : failed === cycleKey ? MEANING_FAILED : null);

  return (
    <div className="grid gap-3">
      <Waves
        wave={model.waves}
        today={model.age}
        control={{ age: line.age, label: stamp.text, stops: model.stops, selected: line.key, onSeek: seek, onPick: pick }}
      />
      <div className="grid gap-1">
        <label htmlFor={sliderId} className="text-[12.5px] text-[#AEB6C6]">
          Age on the line
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={WAVE_UNTIL}
          step={0.01}
          value={line.age}
          aria-valuetext={cycle ? `${stamp.text}, ${cycle.name}` : stamp.text}
          onChange={(e) => seek(Number(e.target.value), !held.current)}
          onKeyDown={onKeyDown}
          onPointerDown={() => {
            held.current = true;
          }}
          onPointerUp={release}
          onPointerCancel={release}
          className="m-0 h-11 w-full cursor-pointer accent-[#D4B06A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {cycle ? (
        <CycleCard
          cycle={cycle}
          science={scienceOf(cycle)}
          meaning={meaning}
          onOpen={() => onOpen(cycle)}
        />
      ) : null}
    </div>
  );
}

export function Life({ zone, today, onOpen, onNoReport, onNoAccess }: LifeProps) {
  const { order } = useEntryFormat();
  const whyId = useId();
  const wavesId = useId();
  const cyclesId = useId();
  const params = zone ? { tz: zone } : undefined;
  const query = useGetTimelineLife(params, { query: { queryKey: getGetTimelineLifeQueryKey(params), staleTime: STALE_MS } });
  // The week is Now and ahead's own read, under its own key, so the Ascendant that sorts a planet into a house costs no
  // second request; without it (no birth time, or not yet here) the science leaves its houses out.
  const sent = sentZone();
  const week = sent ? { range: SERVED_WEEK.range, tz: sent } : SERVED_WEEK;
  const sky = useGetTimelineNow(week, { query: { queryKey: getGetTimelineNowQueryKey(week), staleTime: STALE_MS } });
  const ascendant = sky.data?.angles?.ascendant ?? null;

  const refused = statusOf(query.error);
  useEffect(() => {
    if (refused === 409) onNoReport();
    else if (refused === 403) onNoAccess();
  }, [refused, onNoReport, onNoAccess]);

  const model = useMemo(
    () => (query.data ? lifeModel(query.data, today, zone ?? "UTC", order) : null),
    [query.data, today, zone, order],
  );
  const scienceOf = useCallback<ScienceOf>(
    (cycle) => () => (model ? cycleScience(cycle, model.birth, ascendant, order) : []),
    [model, ascendant, order],
  );

  if (!model) {
    if (query.isError) {
      if (refused === 409 || refused === 403) return null;
      return (
        <div className="grid justify-items-start gap-3 py-6">
          <p className={QUIET}>We couldn't load your life's cycles. Check your connection and try again.</p>
          <button type="button" onClick={() => void query.refetch()} className={TRY}>
            Try again
          </button>
        </div>
      );
    }
    return (
      <div className="grid min-h-[240px] place-items-center font-label text-sm text-[#AEB6C6]">
        <StatusDots label="Loading" />
      </div>
    );
  }

  const open = (cycle: CycleView) =>
    onOpen({ key: cycle.key, headline: cycle.name, status: model.readings.get(cycle.key) ?? "none" });

  return (
    <div className="grid gap-10">
      <section aria-labelledby={whyId} className="grid gap-3.5">
        <div className="grid max-w-[62ch] gap-1.5">
          <p className={EYEBROW}>Why it matters</p>
          <h3 id={whyId} className="font-display text-2xl font-normal leading-tight text-[#E8EBF2]">
            {WHY_TITLE}
          </h3>
          <p className="text-[15px] leading-normal text-[#AEB6C6]">{WHY_TEXT}</p>
        </div>
        <ul role="list" className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-4">
          {model.ages.map((age) => (
            <li key={age.id} className="min-w-0">
              <Age age={age} onOpen={onOpen} />
            </li>
          ))}
        </ul>
        <p className="max-w-[70ch] text-[12.5px] leading-normal text-[#AEB6C6]">{RING_KEY}</p>
      </section>

      <section aria-labelledby={wavesId} className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id={wavesId} className={EYEBROW}>
            Your whole life, birth to 90
          </h3>
          <p className="text-[12.5px] text-[#7E889A]">Drag the line or the slider</p>
        </div>
        <p className="max-w-[70ch] text-[15px] leading-normal text-[#AEB6C6]">{WAVES_TEXT}</p>
        <WaveKey />
        <LifeGraph
          model={model}
          zone={zone ?? "UTC"}
          today={today}
          order={order}
          ascendant={ascendant}
          onOpen={open}
          scienceOf={scienceOf}
        />
      </section>

      <section aria-labelledby={cyclesId} className="grid gap-3.5">
        <h3 id={cyclesId} className="font-display text-2xl font-normal leading-tight text-[#E8EBF2]">
          Your cycles
        </h3>
        {model.ahead.length ? (
          <div className="grid gap-2.5">
            <p className={EYEBROW}>Now and coming up</p>
            <CycleList cycles={model.ahead} open={open} scienceOf={scienceOf} />
          </div>
        ) : null}
        {model.behind.length ? (
          <details className="group">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded font-label text-[11px] font-medium uppercase tracking-[0.18em] text-[#9FA8DA] hover:text-[#E8EBF2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <ChevronRight
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
              />
              Behind you <span className="font-numeric">{model.behind.length}</span>
            </summary>
            <div className="pt-2.5">
              <CycleList cycles={model.behind} open={open} scienceOf={scienceOf} />
            </div>
          </details>
        ) : null}
      </section>
    </div>
  );
}

export default Life;
