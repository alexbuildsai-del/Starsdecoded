/**
 * The Did you know card (Review 05/10 §9, ADR-317): one fact at a time under a loading screen, each beside a small copy of
 * a drawing the product already makes. A bar a fact fills over about eight seconds, as the home page's claims do, then the
 * card fades to the next; a tap on a bar jumps there and a mouse over the card, or the keyboard inside it, holds it.
 * There is no way to close it: it goes when the screen does. Reduced motion shows one fact still and fills nothing; the
 * bars still jump.
 *
 * The drawings are the reader's own chart where it can be, else Mira's, worked out in the browser (R-3.1).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent } from "react";
import { longitudeAt, speedAt, type SkyBody } from "@workspace/engine";
import { NatalWheel } from "@/components/chart/NatalWheel";
import { TriadPlate } from "@/components/report/TriadPlate";
import { AgeRing } from "@/components/timeline/AgeRing";
import { Dial } from "@/components/timeline/Dial";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DIAL, dialAt, framesFor, trackRadii, type DialFrame, type DialNatal } from "@/lib/dial";
import { FACTS, type Fact } from "@/lib/facts";
import { MIRA } from "@/site/data/timeline/mira";
import { samplePerson } from "@/site/data/people";
import type { ChartData } from "@/types/chart";

const DWELL_MS = 8000;
const FADE_MS = 450;
const VISUAL_PX = 96;

// The card's own tokens, as values: it draws on the report page, Timeline's set-up and the pair's screen, which share no scope.
const TOKENS = { "--sky": "#D4B06A", "--sky-dim": "#8A7343" } as CSSProperties;

const DAY_MS = 86_400_000;
// Jupiter, because the dial leaves a trail for Mars and beyond only, and it is retrograde for about four months every
// year, so a stretch of it is always under way or next.
const LOOP_BODY: SkyBody = "jupiter";
// The dial is drawn this large and shown through the picture's window, centred on the planet, because a loop of a few
// degrees is a speck on a dial that fits the window whole.
const DIAL_PX = 384;
const LOOK_BACK_DAYS = 130;
const LOOK_AHEAD_DAYS = 400;
const PAD_DAYS = 10;
// The planets a house can hold; the nodes and Chiron are points, and "a house with no planets" does not count them.
const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function natalOf(chart: ChartData): DialNatal {
  return {
    points: Object.entries(chart.planets).map(([body, p]) => ({ body, lon: p.absoluteDegree })),
    angles: chart.angles
      ? { ascendant: chart.angles.ascendant.absoluteDegree, midheaven: chart.angles.midheaven.absoluteDegree }
      : null,
  };
}

/**
 * The retrograde stretch under way today, or the next one, as the dial draws it: the engine's days with a few either side,
 * and the day in the middle. The dial's contacts and tones are cleared, since this picture is about the loop alone.
 */
function loopFrames(natal: DialNatal, now: Date): { frames: DialFrame[]; day: number } | null {
  const first = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - LOOK_BACK_DAYS * DAY_MS;
  const today = LOOK_BACK_DAYS;
  let start = -1;
  for (let i = 0; i < LOOK_BACK_DAYS + LOOK_AHEAD_DAYS; i++) {
    const retro = speedAt(LOOP_BODY, new Date(first + i * DAY_MS + DAY_MS / 2)) < 0;
    if (retro && start < 0) start = i;
    if (!retro && start >= 0) {
      if (i - 1 < today) {
        start = -1;
        continue;
      }
      const from = Math.max(0, start - PAD_DAYS);
      const days = i - from + PAD_DAYS;
      const frames = framesFor(natal, dayKey(first + from * DAY_MS), days, [LOOP_BODY]).map((f) => ({
        ...f,
        bodies: f.bodies.map((b) => ({ ...b, tone: null })),
        contacts: [],
        headlines: [],
      }));
      return { frames, day: Math.floor((start + i - 1) / 2) - from };
    }
  }
  return null;
}

function emptiestHouse(chart: ChartData): number {
  const held = new Set(PLANETS.map((key) => chart.planets[key]?.house));
  for (let house = 1; house <= 12; house++) if (!held.has(house)) return house;
  return 1;
}

// A Saturn return is the planet back where it began, so its ring is whole; the age is the engine's, from Mira's finder.
function saturnAge(): number | null {
  return MIRA.finder.cycles.find((c) => c.id === "saturn-return")?.age ?? null;
}

function Drawing({ drawing, chart }: { drawing: Fact["drawing"]; chart: ChartData }) {
  const mira = samplePerson("mira")?.chart;
  // The east and the houses are read off the horizon, so a chart without a birth time borrows Mira's.
  const timed = chart.angles ? chart : (mira ?? chart);
  const natal = useMemo(() => natalOf(chart), [chart]);
  const loop = useMemo(() => (drawing === "dial-retrograde" ? loopFrames(natal, new Date()) : null), [drawing, natal]);

  if (drawing === "dial-retrograde") {
    const body = loop?.frames[loop.day]?.bodies[0];
    if (!loop || !body) return null;
    const spot = dialAt(body.lon, trackRadii([LOOP_BODY])[LOOP_BODY], natal.angles?.ascendant ?? 0);
    const k = DIAL_PX / (DIAL.size + 2 * DIAL.pad);
    return (
      <div className="relative size-24 overflow-hidden rounded-full">
        <div
          className="absolute"
          style={{ left: VISUAL_PX / 2 - (spot.x + DIAL.pad) * k, top: VISUAL_PX / 2 - (spot.y + DIAL.pad) * k }}
        >
          <Dial
            points={natal.points}
            angles={natal.angles}
            frames={loop.frames}
            day={loop.day}
            onDay={() => undefined}
            playable={false}
            trail="range"
            size={DIAL_PX}
            label="A planet's retrograde loop"
          />
        </div>
      </div>
    );
  }
  if (drawing === "hero-east") return <TriadPlate chart={timed} name="Chart" className="block h-24 w-24" />;
  if (drawing === "wheel-house") {
    return <NatalWheel chartData={timed} selectedHouse={emptiestHouse(timed)} stops={false} />;
  }
  const age = saturnAge();
  return age === null ? null : <AgeRing age={age} progress={1} label="return" size={VISUAL_PX} />;
}

export interface DidYouKnowProps {
  facts?: readonly Fact[];
  chart?: ChartData | null;
}

export function DidYouKnow({ facts = FACTS, chart = null }: DidYouKnowProps) {
  const reduced = useReducedMotion();
  const count = facts.length;
  const [at, setAt] = useState(0);
  const [fading, setFading] = useState(false);
  const [held, setHeld] = useState(false);
  const fills = useRef<(HTMLElement | null)[]>([]);
  const elapsed = useRef(0);
  const leaving = useRef(false);
  const swap = useRef<number | undefined>(undefined);

  const shown = facts[Math.min(at, count - 1)];
  const drawn = useMemo(() => chart ?? samplePerson("mira")?.chart ?? null, [chart]);

  const go = useCallback((to: number, now: boolean) => {
    const next = ((to % count) + count) % count;
    window.clearTimeout(swap.current);
    elapsed.current = 0;
    if (now || reduced) {
      leaving.current = false;
      setFading(false);
      setAt(next);
      return;
    }
    leaving.current = true;
    setFading(true);
    swap.current = window.setTimeout(() => {
      leaving.current = false;
      setFading(false);
      setAt(next);
    }, FADE_MS);
  }, [count, reduced]);

  useEffect(() => () => window.clearTimeout(swap.current), []);

  // Every bar is set here, not by its props, so the one the loop is filling is never reset by a render.
  useEffect(() => {
    fills.current.forEach((bar, i) => {
      if (bar) bar.style.transform = i < at || (reduced && i === at) ? "scaleX(1)" : "scaleX(0)";
    });
  }, [at, reduced, count]);

  useEffect(() => {
    if (reduced || count < 2) return undefined;
    let frame = 0;
    let last = performance.now();
    const tick = (time: number) => {
      // A tab that was hidden resumes with one short step, so the bar never jumps.
      const step = Math.min(time - last, 100);
      last = time;
      if (!held && !leaving.current) {
        elapsed.current += step;
        const done = Math.min(1, elapsed.current / DWELL_MS);
        const bar = fills.current[at];
        if (bar) bar.style.transform = `scaleX(${done})`;
        if (done >= 1) go(at + 1, false);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [at, held, reduced, count, go]);

  if (!shown || !drawn) return null;

  const hold = (event: PointerEvent) => {
    if (event.pointerType === "mouse") setHeld(true);
  };
  const letGo = (event: PointerEvent) => {
    if (event.pointerType === "mouse") setHeld(false);
  };
  // Only a keyboard's focus holds the card: a tap focuses a bar too, and must not leave it stopped.
  const focused = (event: FocusEvent) => {
    if ((event.target as HTMLElement).matches(":focus-visible")) setHeld(true);
  };
  const blurred = (event: FocusEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false);
  };

  return (
    <section
      aria-label="Did you know"
      className="flex w-full flex-col gap-2 rounded-xl border border-[#242C3B] bg-[#11161F] px-3.5 pb-1.5 pt-3.5 text-left"
      onPointerEnter={hold}
      onPointerLeave={letGo}
      onFocus={focused}
      onBlur={blurred}
    >
      <span className="font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[.14em] text-[#D4B06A]">Did you know</span>
      <div
        className={`grid min-h-24 grid-cols-[minmax(0,1fr)_96px] items-center gap-3.5 transition-opacity duration-[450ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${fading ? "opacity-0" : "opacity-100"}`}
      >
        {/* Every fact's words sit in one cell, unseen but for the one shown, so the card keeps the height of the longest. */}
        <div className="grid min-w-0">
          {facts.map((fact) => (
            <div key={fact.id} aria-hidden="true" className="invisible col-start-1 row-start-1 flex min-w-0 flex-col gap-1.5">
              <p className="font-display text-[19px] font-normal leading-tight">{fact.title}</p>
              <p className="text-[14.5px] leading-relaxed">{fact.sentences.join(" ")}</p>
            </div>
          ))}
          <div className="col-start-1 row-start-1 flex min-w-0 flex-col gap-1.5" aria-live="polite">
            <p className="font-display text-[19px] font-normal leading-tight text-[#E8EBF2]">{shown.title}</p>
            <p className="text-[14.5px] leading-relaxed text-[#AEB6C6]">{shown.sentences.join(" ")}</p>
          </div>
        </div>
        {/* A picture of the idea, not a control: inert keeps the dial's slider out of the tab order. */}
        <div aria-hidden="true" inert style={{ ...TOKENS, width: VISUAL_PX }} className="grid h-24 place-items-center">
          <Drawing drawing={shown.drawing} chart={drawn} />
        </div>
      </div>
      {count > 1 && (
        <div role="group" aria-label="Facts" className="flex gap-1.5">
          {facts.map((fact, i) => (
            <button
              key={fact.id}
              type="button"
              aria-label={`Fact ${i + 1} of ${count}: ${fact.title}`}
              aria-current={i === at ? "true" : undefined}
              onClick={() => i !== at && go(i, true)}
              className="group flex h-8 flex-1 items-center rounded-sm outline-none"
            >
              <span className="relative block h-[3px] w-full overflow-hidden rounded-sm bg-[#242C3B] group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-[#9FA8DA]">
                <i
                  ref={(el) => {
                    fills.current[i] = el;
                  }}
                  className="absolute inset-0 origin-left bg-[#9FA8DA]"
                  style={{ transform: "scaleX(0)" }}
                />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default DidYouKnow;
