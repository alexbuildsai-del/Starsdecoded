/**
 * Chapter 02, House by House (ADR-179): one component for the report and for
 * /sample, so it knows nothing of either page beyond its props. On a phone a
 * bar pins over a deck of house cards, one card per swipe: the wheel at 92 px
 * with the house being read lit, the chapter's counter and title, that house's
 * line and twelve ticks. On a desktop the full wheel holds still on the left and
 * one whole card steps on the right, by Previous and Next, the arrow keys or a
 * click on a wedge. Both layouts are in the HTML and CSS shows one, so a
 * prerendered page hydrates as it was served; paper gets the wheel and every
 * house in full. A blind chart has no houses to step through: it keeps the
 * wheel and the blind card. NatalWheel is drawn exactly as everywhere else.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { NatalWheel } from "@/components/chart/NatalWheel";
import { houseSign } from "@/components/chart/wheel-geometry";
import { AddBirthTimeCard, HouseCard } from "@/components/report/HouseCard";
import { CHAPTERS } from "@/lib/chapters";
import { houseOccupants } from "@/lib/house-occupants";
import { HOUSE_NUMBERS, houseLine, houseName, keyStep, nearestCard, stepHouse, tickState } from "@/lib/house-deck";
import type { ChartData, HouseReading } from "@/types/chart";

const CHAPTER = CHAPTERS[1];

// The bar and the wheel pin under the page's own fixed chrome: a page with more than a nav up there sets --deck-top,
// and the site's nav sets --nav.
const BAR_TOP = "var(--deck-top, calc(var(--nav, 3.5rem) + 0.5rem))";
const WHEEL_TOP = `calc(${BAR_TOP} + 1rem)`;

// MB-43 provisional: the first localStorage key in the web app. One key, no consent gate, named on the privacy page.
const HINT_KEY = "sd.explorer.hint";

function hintSeen(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true;
  }
}

function rememberHint() {
  try {
    window.localStorage.setItem(HINT_KEY, "1");
  } catch {
    // A browser that refuses storage nudges again on the next visit, and nothing else reads the key.
  }
}

const NUDGE: Keyframe[] = [
  { transform: "translateX(6px)", opacity: 0.3 },
  { transform: "translateX(-6px)", opacity: 1, offset: 0.6 },
  { transform: "translateX(-6px)", opacity: 0.6 },
];

/** Three nudges the first time the hint is well in view, then still for good; none at all with reduced motion. */
function useNudge(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const arrow = ref.current;
    if (!arrow || typeof arrow.animate !== "function" || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || hintSeen()) return;
    const view = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      view.disconnect();
      arrow.animate(NUDGE, { duration: 1600, iterations: 3, easing: "cubic-bezier(.16,1,.3,1)" });
      rememberHint();
    }, { rootMargin: "0px 0px -25% 0px" });
    view.observe(arrow);
    return () => view.disconnect();
  }, [ref]);
}

/** The house follows whichever card the deck settles on. */
function useSwipe(ref: RefObject<HTMLDivElement | null>, onHouse: (house: number) => void) {
  useEffect(() => {
    const deck = ref.current;
    if (!deck) return;
    let frame = 0;
    const settle = () => {
      frame = 0;
      // A deck CSS has hidden measures as nothing, and must not pull a desktop's house back to the 1st.
      if (!deck.clientWidth) return;
      const cards = Array.from(deck.children, (c) => ({ left: (c as HTMLElement).offsetLeft, width: (c as HTMLElement).offsetWidth }));
      const i = nearestCard(deck.scrollLeft, deck.clientWidth, cards);
      if (i >= 0) onHouse(i + 1);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(settle);
    };
    deck.addEventListener("scroll", schedule, { passive: true });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resize?.observe(deck);
    return () => {
      deck.removeEventListener("scroll", schedule);
      resize?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ref, onHouse]);
}

function Ticks({ house, className = "" }: { house: number; className?: string }) {
  return (
    <div aria-hidden className={`grid grid-cols-12 gap-[3px] ${className}`}>
      {HOUSE_NUMBERS.map((t) => {
        const state = tickState(t, house);
        const fill = state === "on" ? "bg-brass" : state === "seen" ? "bg-brass/45" : "bg-[color:var(--line)]";
        return <i key={t} className={`block h-[3px] rounded-sm transition-colors duration-300 motion-reduce:transition-none ${fill}`} />;
      })}
    </div>
  );
}

function StepButton({ to, back = false, onStep }: { to: number; back?: boolean; onStep: (house: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onStep(to)}
      className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[color:var(--line)] px-3 font-label text-[13px] font-medium text-[color:var(--paper)] transition-colors hover:border-[color:var(--indigo)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--indigo-lt)] motion-reduce:transition-none pointer-coarse:min-h-11"
    >
      {back && <span aria-hidden>←</span>}
      <span className="sr-only">{back ? "Previous: " : "Next: "}</span>
      {houseName(to)}
      {!back && <span aria-hidden>→</span>}
    </button>
  );
}

interface DeckProps {
  chart: ChartData;
  ascendant: number;
  readings?: HouseReading[];
  counter: string;
  orbs?: Record<string, number>;
}

function Deck({ chart, ascendant, readings, counter, orbs }: DeckProps) {
  const [house, setHouse] = useState(1);
  const deckRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  useSwipe(deckRef, setHouse);
  useNudge(arrowRef);

  const houses = useMemo(() => HOUSE_NUMBERS.map((h) => ({
    house: h,
    sign: houseSign(h, ascendant),
    occupants: houseOccupants(chart, h),
    reading: readings?.find((r) => r.house === h)?.reading,
  })), [chart, ascendant, readings]);
  const current = houses[house - 1];

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    // Alt with an arrow is the browser's back and forward.
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const by = keyStep(e.key);
    if (!by) return;
    e.preventDefault();
    setHouse((h) => stepHouse(h, by));
  }

  return (
    <div>
      {/* First in the HTML, so paper prints the wheel above the houses. tabIndex -1 lets a click anywhere in it hand
          the arrow keys to the deck. */}
      <div
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="hidden outline-none md:grid md:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] md:items-start md:gap-7 print:block!"
      >
        <div className="min-w-0 md:sticky print:static print:mx-auto print:mb-6 print:max-w-[360px]" style={{ top: WHEEL_TOP }}>
          <NatalWheel chartData={chart} orbs={orbs} selectedHouse={house} onSelectHouse={setHouse} />
        </div>
        <div className="grid min-w-0 max-w-[62ch] content-start gap-3 print:hidden">
          <p className="font-mono text-[10.5px] uppercase tracking-[.12em] text-[color:var(--accent)]">
            {counter} · {CHAPTER.eyebrow} · {CHAPTER.title}
          </p>
          <Ticks house={house} />
          <HouseCard {...current} whole />
          <p className="sr-only" aria-live="polite">{houseLine(house, current.sign)}</p>
          {/* The hint goes under the two buttons: with a house's word on each, they leave it no room between them. */}
          <div className="flex items-center justify-between gap-3">
            <StepButton to={stepHouse(house, -1)} back onStep={setHouse} />
            <StepButton to={stepHouse(house, 1)} onStep={setHouse} />
          </div>
          <p className="-mt-1 text-center font-mono text-[11px] text-[color:var(--paper-dim)]">← → keys work too</p>
        </div>
      </div>

      <div
        className="sticky z-10 grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-[color:var(--line)] bg-background/94 px-3.5 py-3 backdrop-blur-[8px] md:hidden print:hidden"
        style={{ top: BAR_TOP }}
      >
        {/* The deck is the control here; the wheel only follows it. */}
        <div inert aria-hidden className="w-[92px]">
          <NatalWheel chartData={chart} orbs={orbs} selectedHouse={house} stops={false} />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[.12em] text-[color:var(--accent)]">
            {counter} · {CHAPTER.eyebrow}
          </p>
          <p className="mt-1 font-display text-[22px] leading-[1.1] text-[color:var(--paper)]">{CHAPTER.title}</p>
          <p className="mt-1 text-balance font-mono text-xs text-brass">{houseLine(house, current.sign)}</p>
          <Ticks house={house} className="mt-2" />
        </div>
      </div>
      <p className="mt-3 flex items-center gap-2 font-label text-xs font-medium text-[color:var(--paper-dim)] md:hidden print:hidden">
        <span ref={arrowRef} aria-hidden className="inline-block h-0.5 w-[22px] shrink-0 rounded-sm bg-brass" />
        Swipe through the houses
      </p>
      <div
        ref={deckRef}
        role="region"
        aria-label="House cards"
        tabIndex={0}
        className="relative grid snap-x snap-mandatory grid-flow-col gap-2.5 overflow-x-auto overscroll-x-contain rounded-2xl pt-4 pb-[18px] [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--indigo-lt)] md:hidden print:block! print:overflow-visible print:pt-0 [&::-webkit-scrollbar]:hidden"
        style={{ gridAutoColumns: "calc(100% - 44px)" }}
      >
        {houses.map((h) => (
          <HouseCard key={h.house} {...h} lit={h.house === house} className="snap-center snap-always print:mb-3" />
        ))}
      </div>
    </div>
  );
}

export interface HouseDeckProps {
  chart: ChartData;
  readings?: HouseReading[];
  /** "02 / 10": the page counts its own chapters. */
  counter: string;
  /** For the blind card's country hint. */
  birthPlace?: string;
  /** Opens the birth time control; the blind card's one call to action. */
  onAddBirthTime?: () => void;
  /** interpretation.meta.orbs, so the wheel weighs each aspect against the budget the report used. */
  orbs?: Record<string, number>;
}

export function HouseDeck({ chart, readings, counter, birthPlace, onAddBirthTime, orbs }: HouseDeckProps) {
  if (!chart.angles) {
    return (
      <div className="grid gap-[18px] md:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] md:items-start md:gap-7">
        <div className="mx-auto w-full min-w-0 max-w-[420px] md:max-w-none">
          <NatalWheel chartData={chart} orbs={orbs} />
        </div>
        <AddBirthTimeCard birthPlace={birthPlace} onAddBirthTime={onAddBirthTime} />
      </div>
    );
  }
  return <Deck chart={chart} ascendant={chart.angles.ascendant.absoluteDegree} readings={readings} counter={counter} orbs={orbs} />;
}

export default HouseDeck;
