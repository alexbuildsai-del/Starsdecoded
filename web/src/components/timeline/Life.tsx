/**
 * Life (ADR-209; reading 19): the reader's long cycles from birth to 90. It opens on why they matter, four ages most
 * people know with the reader's own dates; then each slow planet's wave with today marked; then a card for every
 * cycle, those under way and ahead first and those behind folded. A tap on an age or a cycle opens its reading. Every
 * date is the API's (`now-ahead.ts`).
 */
import { useEffect, useId, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { getGetTimelineLifeQueryKey, useGetTimelineLife } from "@workspace/api-client-react";
import { StatusDots } from "@/components/StatusDots";
import { CycleRing } from "@/components/timeline/AgeRing";
import { OpenCard } from "@/components/timeline/ContactCard";
import { CycleCard } from "@/components/timeline/CycleCard";
import type { ReadingTarget } from "@/components/timeline/ReadingSheet";
import { Waves } from "@/components/timeline/Waves";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { ringTarget, type CycleView } from "@/lib/life-view";
import { lifeModel, type AgeCard } from "@/lib/now-ahead";

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
      <div className="flex items-center justify-between gap-2.5">
        <span className="font-numeric text-[22px] leading-none text-[#E8EBF2]">{age.label}</span>
        <CycleRing progress={age.progress} target={ringTarget({ id: age.id, age: 0 })} size={56} />
      </div>
      <p className="font-display text-[19px] leading-tight text-[#E8EBF2]">{age.name}</p>
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
        <i aria-hidden className="block h-[7px] w-[7px] rounded-full bg-[#D4B06A]" />
        A return
      </span>
      <span className={item}>
        <i aria-hidden className="block h-[5px] w-[5px] rounded-full bg-[#D4B06A]" />
        Halfway round
      </span>
      <span className={item}>
        <i aria-hidden className="block h-1 w-1 rounded-full bg-[#AEB6C6]" />
        A quarter of the way round
      </span>
      <span className={item}>
        <i aria-hidden className="block h-3 w-5 rounded-[3px] border border-[#242C3B] bg-[rgba(232,235,242,.05)]" />
        Already lived
      </span>
      <span className={item}>
        <i aria-hidden className="block h-3 w-[1.5px] bg-[#5C6BC0]" />
        Today
      </span>
    </p>
  );
}

function CycleList({ cycles, open }: { cycles: readonly CycleView[]; open: (cycle: CycleView) => void }) {
  return (
    <ul role="list" className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
      {cycles.map((cycle) => (
        <li key={cycle.key} className="min-w-0">
          <CycleCard cycle={cycle} onOpen={() => open(cycle)} />
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

export function Life({ zone, today, onOpen, onNoReport, onNoAccess }: LifeProps) {
  const { order } = useEntryFormat();
  const whyId = useId();
  const wavesId = useId();
  const cyclesId = useId();
  const params = zone ? { tz: zone } : undefined;
  const query = useGetTimelineLife(params, { query: { queryKey: getGetTimelineLifeQueryKey(params), staleTime: STALE_MS } });

  const refused = statusOf(query.error);
  useEffect(() => {
    if (refused === 409) onNoReport();
    else if (refused === 403) onNoAccess();
  }, [refused, onNoReport, onNoAccess]);

  const model = useMemo(
    () => (query.data ? lifeModel(query.data, today, zone ?? "UTC", order) : null),
    [query.data, today, zone, order],
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
        <div className="grid max-w-[70ch] gap-1.5">
          <h3 id={wavesId} className={EYEBROW}>
            Your whole life, birth to 90
          </h3>
          <p className="text-[15px] leading-normal text-[#AEB6C6]">{WAVES_TEXT}</p>
        </div>
        <WaveKey />
        <Waves wave={model.waves} today={model.age} />
      </section>

      <section aria-labelledby={cyclesId} className="grid gap-3.5">
        <h3 id={cyclesId} className="font-display text-2xl font-normal leading-tight text-[#E8EBF2]">
          Your cycles
        </h3>
        {model.ahead.length ? (
          <div className="grid gap-2.5">
            <p className={EYEBROW}>Now and coming up</p>
            <CycleList cycles={model.ahead} open={open} />
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
              <CycleList cycles={model.behind} open={open} />
            </div>
          </details>
        ) : null}
      </section>
    </div>
  );
}

export default Life;
