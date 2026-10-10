/**
 * Try it free: the Saturn-return finder (timeline-page §3, acceptance 2 and 4; ADR-251; reading 21), the page's
 * section `#finder`, which the hero and Life's card link to. One typed birth date (R14's field) redraws the finder
 * alone the moment it is whole, so Show my dates only answers a reader who looks for a button: the big ring for the
 * reader's Saturn return, its first two dates, and four compact cycle cards with the why lines locked with the page.
 * It opens on Mira's birth date, marked as an example, with her answer computed at build, so the prerender is whole and
 * nothing is worked out here until a full date is typed; only then is the engine's module for it fetched
 * (`site/lib/finder.ts`). Nothing typed is sent anywhere.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { CycleId } from "@workspace/engine";
import { BirthDateField } from "@/ds/molecules/BirthFields";
import { AgeRing } from "@/components/timeline/AgeRing";
import { CycleCard } from "@/components/timeline/CycleCard";
import { Label } from "@/components/ui/label";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { localDay } from "@/lib/date-entry";
import { cycleDates, cycleWhen, type CycleView } from "@/lib/life-view";
import { MIRA } from "@/site/data/timeline/mira";
import { Button } from "@/ds/atoms/Button";

/** The four cards in the page's order, each with the why line locked with it (timeline-page §3). */
export const FINDER_CARDS: readonly { id: CycleId; why: string }[] = [
  { id: "saturn-return", why: "The late-twenties reset. Astrology's checkpoint for growing up." },
  { id: "jupiter-return", why: "A fresh start. Astrology reads each return as a year to begin something." },
  { id: "node-return", why: "A change of direction. Astrology ties it to where your life is heading." },
  { id: "uranus-opposition", why: "The midlife shake-up. Astrology's take on the midlife crisis." },
];

/** What the big ring says: the reader's age at the Saturn return under way or next, else at the last one. */
export interface SaturnRing {
  age: number;
  /** Saturn's way round since birth, today. */
  progress: number;
  label: string;
}

const saturnReturns = (cycles: readonly CycleView[]) => cycles.filter((cycle) => cycle.id === "saturn-return");
const behind = (cycle: CycleView) => cycleWhen(cycle, cycle.today) === "past";

export function saturnRing(cycles: readonly CycleView[]): SaturnRing | null {
  const returns = saturnReturns(cycles);
  const focus = returns.find((cycle) => !behind(cycle)) ?? returns[returns.length - 1];
  if (!focus) return null;
  const when = cycleWhen(focus, focus.today);
  const label =
    when === "now" ? "your Saturn return is now"
    : when === "past" ? "at your last Saturn return"
    : focus === returns[0] ? "at your Saturn return"
    : "at your next Saturn return";
  return { age: focus.age, progress: focus.progress ?? 0, label };
}

/** The dates under the ring: the first two Saturn returns, at about 29 and 58, as the lede says. */
export function saturnLines(cycles: readonly CycleView[]): CycleView[] {
  return saturnReturns(cycles).slice(0, 2);
}

/**
 * One compact card per kind: Saturn's first return, and the Uranus opposition, which comes once; for Jupiter and the
 * nodes, the return under way or next, else the last. Each card heads with every age its kind comes at.
 */
export function finderCards(cycles: readonly CycleView[]): CycleView[] {
  return FINDER_CARDS.flatMap(({ id, why }) => {
    const of = cycles.filter((cycle) => cycle.id === id);
    const pick = id === "saturn-return" || id === "uranus-opposition"
      ? of[0]
      : (of.find((cycle) => !behind(cycle)) ?? of[of.length - 1]);
    return pick ? [{ ...pick, why, ages: of.map((cycle) => cycle.age) }] : [];
  });
}

interface Shown {
  birthDate: string;
  cycles: readonly CycleView[];
  /** Mira's date, which the finder opens on, so the field's label says whose it is. */
  example: boolean;
}

const OPENING: Shown = { birthDate: MIRA.finder.birthDate, cycles: MIRA.finder.cycles, example: true };

// The free chart's bounds and its words for an empty field, which the date field's own line gives for a date outside them.
const EARLIEST = "1900-01-01";
const EMPTY = "Enter a birth date from 1900 to today.";
const NOT_LOADED = "Your dates didn't load. Reload the page and try again.";

// The artifact's sample tag, dashed so it reads as a note on the field rather than a control.
const TAG =
  "inline-block whitespace-nowrap rounded-md border border-dashed border-line px-1.5 py-px font-label text-caption leading-snug tracking-[.14em] text-muted";

export function CycleFinder() {
  const uid = useId();
  const fieldId = `${uid}date`;
  const hintId = `${uid}hint`;
  const headingId = `${uid}h`;
  const { order } = useEntryFormat();
  const [value, setValue] = useState(OPENING.birthDate);
  const [shown, setShown] = useState<Shown>(OPENING);
  // The reader's own day bounds the field, so it is read after hydration; the prerender's would be the build's.
  const [today, setToday] = useState<string | undefined>(undefined);
  const [problem, setProblem] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const [busy, setBusy] = useState(false);
  // Each date typed takes a ticket, so an answer that lands after a later date was typed is dropped.
  const latest = useRef(0);

  useEffect(() => {
    setToday(localDay(new Date()));
  }, []);

  async function show(birthDate: string) {
    const ticket = ++latest.current;
    setBusy(true);
    try {
      const { findCycles } = await import("@/site/lib/finder");
      if (ticket !== latest.current) return;
      const now = new Date();
      const cycles = findCycles(birthDate, localDay(now), now);
      const ring = saturnRing(cycles);
      setShown({ birthDate, cycles, example: birthDate === OPENING.birthDate });
      setSaid(ring ? `Age ${ring.age}, ${ring.label}.` : "");
    } catch {
      if (ticket === latest.current) setProblem(NOT_LOADED);
    } finally {
      if (ticket === latest.current) setBusy(false);
    }
  }

  const change = (next: string) => {
    setValue(next);
    setProblem(null);
    if (next) void show(next);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value) {
      if (value !== shown.birthDate) void show(value);
      return;
    }
    const field = document.getElementById(fieldId);
    if (!(field instanceof HTMLInputElement) || field.value === "") setProblem(EMPTY);
    // A part-typed date is worded by the field itself once the reader has left it, so Enter leaves it and comes back.
    else field.blur();
    field?.focus();
  };

  const ring = saturnRing(shown.cycles);
  const lines = saturnLines(shown.cycles);
  const cards = finderCards(shown.cycles);

  return (
    <section id="finder" className="sd-pg-sec sd-sec-b sd-line" aria-labelledby={headingId}>
      <div className="sd-wrap">
        <div className="grid gap-[18px] rounded-sheet border border-line bg-surface p-[18px] min-[880px]:p-7">
          <div className="grid gap-[18px] min-[880px]:grid-cols-[minmax(0,1fr)_240px] min-[880px]:items-center min-[880px]:gap-9">
            <div className="grid min-w-0 gap-3">
              <p className="sd-eyebrow">Try it free</p>
              <h2 className="sd-h2" id={headingId}>
                When is your Saturn return?
              </h2>
              <p className="sd-sub max-w-[58ch]">
                Saturn comes back to where it was when you were born at about 29, and again at 58. Put in your birth date
                to see your dates.
              </p>
              <form className="mt-1 grid min-w-0 gap-2" onSubmit={submit} noValidate>
                <Label
                  htmlFor={fieldId}
                  className="flex flex-wrap items-center gap-2 font-label text-xs uppercase tracking-wide text-muted"
                >
                  Birth date
                  {shown.example ? <span className={TAG}>Mira's, as an example</span> : null}
                </Label>
                <div className="flex flex-wrap items-start gap-2.5">
                  {/* Room for "14 / 03 / 1991" whole; a phone puts the button under the field rather than cut the date. */}
                  <div className="min-w-0 flex-[1_1_200px]">
                    <BirthDateField id={fieldId} value={value} min={EARLIEST} max={today} onChange={change} describedBy={hintId} />
                  </div>
                  <Button type="submit" className="h-12">
                    Show my dates
                  </Button>
                </div>
                {problem ? (
                  <p id={hintId} role="alert" className="text-small leading-snug text-error">
                    {problem}
                  </p>
                ) : (
                  <p id={hintId} className="text-small leading-snug text-muted">
                    No birth time or place needed.
                  </p>
                )}
              </form>
            </div>

            <div className="grid min-w-0 justify-items-center gap-2" aria-busy={busy || undefined}>
              {ring ? <AgeRing age={ring.age} progress={ring.progress} label={ring.label} /> : null}
              <p className="grid gap-[3px] text-center text-small leading-normal text-paper-dim">
                {lines.map((cycle) => (
                  <span key={cycle.key}>
                    At {cycle.age}: <span className="font-numeric text-indigo-lt">{cycleDates(cycle, order)}</span>
                    {behind(cycle) ? " · behind you" : null}
                  </span>
                ))}
              </p>
              <p className="flex flex-wrap justify-center gap-x-3.5 gap-y-1 text-caption leading-normal text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-2 rounded-full bg-brass" />
                  Saturn when you were born
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-2 rounded-full bg-indigo-lt" />
                  Saturn today
                </span>
              </p>
              <p className="sr-only" aria-live="polite">
                {said}
              </p>
            </div>
          </div>

          {/* Four across, each card's ring goes over its words, as the page's artifact draws them: beside them, a quarter
              of the row leaves the words too narrow to read. */}
          <div
            className="grid grid-cols-1 gap-2.5 min-[880px]:grid-cols-4 min-[880px]:gap-4 min-[880px]:[&>article]:grid-cols-1 min-[880px]:[&>article]:content-start min-[880px]:[&>article]:gap-y-2.5 min-[880px]:[&>article>svg]:row-start-1"
            aria-busy={busy || undefined}
          >
            {cards.map((cycle) => (
              <CycleCard key={cycle.id} cycle={cycle} compact />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CycleFinder;
