import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "wouter";
import type { SkyBody } from "@workspace/engine";
import { LAUNCHED } from "@workspace/launch";
import { SIGN_ORDER, norm360 } from "@/components/chart/wheel-geometry";
import { Dial } from "@/components/timeline/Dial";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import type { DateOrder } from "@/lib/date-entry";
import { dayWords, framesFor, type DialFrame, type DialNatal } from "@/lib/dial";
import { PLANET_LABELS } from "@/types/chart";

/** The hero's planets, Mars to Pluto (reading 18), so the home line and the page it leads to are one drawing. */
const BODIES: readonly SkyBody[] = ["mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

/** No chart inside: the line is about Timeline as a whole, so its dial is the sky alone, 0° Aries on the left. */
const NO_CHART: DialNatal = { points: [], angles: null };

/** Beside two lines of text, and under the dial's detail size, so it draws the planets as dots with no words or renders. */
const SIZE = 60;
/** Sized whether it holds the kept drawing or the new one, so the redraw moves nothing on the page. */
const BOX = { className: "shrink-0", style: { width: SIZE, height: SIZE } } as const;

/** Idle or not, the browser redraws the sky this long after hydrating at the latest. */
const REDRAW_WITHIN_MS = 2000;
/** Where the browser has no idle callback (Safari), the redraw waits this long, so the hero's first sky goes first. */
const NO_IDLE_GAP_MS = 200;

/** The same object on every render, so React never rewrites the prerendered dial while it is kept. */
const KEEP = { __html: "" };
const nothingToWatch = () => () => {};
const stay = () => undefined;

/** The reader's own calendar day, which `framesFor` draws at its noon, so "today" is theirs. */
function localDay(at: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`;
}

/** The drawing's facts in words, since the dial's own label would call a day with no chart in it quiet. */
function skyWords(frame: DialFrame, order: DateOrder): string {
  const places = frame.bodies.map((b) => `${PLANET_LABELS[b.body] ?? b.body} in ${SIGN_ORDER[Math.floor(norm360(b.lon) / 30)]}`);
  const listed = places.length > 1 ? `${places.slice(0, -1).join(", ")} and ${places[places.length - 1]}` : places.join("");
  return `The sky on ${dayWords(frame.date, order)}: ${listed}.`;
}

/**
 * Today's sky. The prerender draws the day it was built; while the page hydrates the browser keeps that drawing, then
 * redraws it to the reader's today in its first idle moment, so working out the planets never delays the hero's first
 * light. Arriving from another page there is nothing to keep, so it draws today at once.
 */
function SkyToday() {
  const hydrating = useSyncExternalStore(nothingToWatch, () => false, () => true);
  const [kept, setKept] = useState(hydrating);
  const [today] = useState(() => localDay(new Date()));
  const { order } = useEntryFormat();
  const live = typeof window === "undefined" || !kept;
  const frames = useMemo(() => (live ? framesFor(NO_CHART, today, 1, BODIES) : []), [live, today]);

  useEffect(() => {
    if (!kept) return undefined;
    const redraw = () => setKept(false);
    if (typeof window.requestIdleCallback === "function") {
      const idle = window.requestIdleCallback(redraw, { timeout: REDRAW_WITHIN_MS });
      return () => window.cancelIdleCallback(idle);
    }
    const timer = window.setTimeout(redraw, NO_IDLE_GAP_MS);
    return () => window.clearTimeout(timer);
  }, [kept]);

  if (!live) return <div {...BOX} dangerouslySetInnerHTML={KEEP} suppressHydrationWarning />;
  const frame = frames[0];
  return (
    <div {...BOX}>
      <div role="img" aria-label={frame ? skyWords(frame, order) : "The sky today"}>
        {/* A flex box, so the dial sits on no line of text and adds no space under itself. */}
        <div aria-hidden="true" className="flex">
          <Dial
            points={NO_CHART.points} angles={NO_CHART.angles} frames={frames} day={0} onDay={stay} playable={false} size={SIZE}
            label="The sky"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * The way in (timeline-page, ADR-252; reading 23): one line between Prices and the questions, so a reader on home finds
 * Timeline. A link and no form; it shows no price until launch (ADR-343), and on launch day its eyebrow drops "Coming soon" (ADR-355).
 */
export default function TimelineLine() {
  return (
    <section className="sd-line" aria-labelledby="timeline-line-h">
      <div className="sd-wrap">
        <div className="flex items-center gap-4 py-8 min-[760px]:gap-5 min-[760px]:py-10">
          <SkyToday />
          <div className="grid min-w-0 gap-1.5">
            <h2 className="sd-eyebrow" id="timeline-line-h">
              {LAUNCHED ? "Timeline" : "Coming soon · Timeline"}
            </h2>
            <p className="font-display text-card-title leading-[1.4] text-pretty text-paper min-[760px]:text-sheet-title">
              See when the planets reach your chart, from your Saturn return to this week.{" "}
              <Link href="/timeline" className="ml-1 whitespace-nowrap font-sans text-ui">
                What's in it <span aria-hidden="true">›</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
