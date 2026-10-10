/**
 * The reference check (review-01-10 scope 7, ADR-180), the same figure on home and /method: a line from the sample's
 * report and its evidence, drawn as a report draws them, with the report's own evidence card. On view it plays once,
 * the way a reader meets a claim: the line is underlined, its number lights, the card rises and its rows arrive. The
 * HTML holds it whole and at rest, which is how reduced motion keeps it.
 */
import { useLayoutEffect, useRef } from "react";
import { EvidenceCard } from "@/ds/organisms/ClaimPopover";
import { homeClaims } from "@/site/data/claims";
import { EASE_CSS } from "@/site/lib/sky";
import { Button } from "@/ds/atoms/Button";
import { tokens } from "@workspace/design";

const STILL = "(prefers-reduced-motion: reduce)";

// The approved artifact's timings in ms from the start; the rows keep their spacing however many a claim has.
const DRAW_AT = 120;
const DRAW_MS = 800;
const LIGHT_AT = 900;
const LIGHT_MS = 300;
const CARD_AT = 1150;
const ROWS_AT = 1550;
const ROW_GAP = 400;
const ARRIVE_MS = 450;
const FOOT_MS = 400;
const HOLD_MS = 1850;
const SETTLE_MS = 800;

// Brighter than the report's resting mark while it is drawn, so the eye follows it; it settles to the mark itself.
const INK = `color-mix(in srgb, ${tokens.color.indigo} 70%, transparent)`;
// The number as `.rp-cite.open` lights it when a reader opens a card.
const LIT = { backgroundColor: tokens.color.indigo, color: tokens.color["on-indigo"] };
// A border cannot be drawn from left to right, so the line is a gradient in currentColor on the border's own row of
// pixels, with the border hidden; when the play ends the border takes over unseen.
const LINE: Keyframe = {
  backgroundImage: "linear-gradient(currentColor, currentColor)",
  backgroundRepeat: "no-repeat",
  backgroundOrigin: "border-box",
  backgroundPosition: "0 100%",
  borderBottomColor: "transparent",
};

// The artifact started once 60% of the figure was in sight; one taller than the screen starts once it fills 60% of it.
const SEEN = 0.6;
const THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20);
const onView = (e: IntersectionObserverEntry) =>
  e.isIntersecting &&
  (e.intersectionRatio >= SEEN || e.intersectionRect.height >= SEEN * (e.rootBounds?.height ?? window.innerHeight));

function sequence(mark: HTMLElement, chip: HTMLElement, card: HTMLElement): Animation[] {
  const rows = [...card.querySelectorAll<HTMLElement>(".ev")];
  const foot = card.querySelector<HTMLElement>(".foot");
  const footAt = ROWS_AT + rows.length * ROW_GAP;
  const settleAt = footAt + HOLD_MS;
  // Read at rest, so the figure ends on the stylesheet's own colours.
  const line = getComputedStyle(mark).borderBottomColor;
  const { backgroundColor, color } = getComputedStyle(chip);
  const unlit = { backgroundColor, color };
  const drawFor = settleAt + SETTLE_MS - DRAW_AT;
  const lightFor = settleAt + LIGHT_MS - LIGHT_AT;
  const arrive = (from: string): Keyframe[] => [{ opacity: 0, transform: from }, { opacity: 1, transform: "none" }];
  const timing = (delay: number, duration = ARRIVE_MS): KeyframeAnimationOptions => ({ delay, duration, easing: EASE_CSS, fill: "backwards" });

  return [
    mark.animate(
      [
        { ...LINE, backgroundSize: "0% 1px", color: INK, easing: EASE_CSS },
        { ...LINE, backgroundSize: "100% 1px", color: INK, offset: DRAW_MS / drawFor },
        { ...LINE, backgroundSize: "100% 1px", color: INK, offset: (settleAt - DRAW_AT) / drawFor, easing: EASE_CSS },
        { ...LINE, backgroundSize: "100% 1px", color: line },
      ],
      { delay: DRAW_AT, duration: drawFor, fill: "backwards" },
    ),
    chip.animate(
      [
        { ...unlit, easing: EASE_CSS },
        { ...LIT, offset: LIGHT_MS / lightFor },
        { ...LIT, offset: (settleAt - LIGHT_AT) / lightFor, easing: EASE_CSS },
        unlit,
      ],
      { delay: LIGHT_AT, duration: lightFor, fill: "backwards" },
    ),
    card.animate(arrive("translateY(8px)"), timing(CARD_AT)),
    ...rows.map((row, i) => row.animate(arrive("translateX(-6px)"), timing(ROWS_AT + i * ROW_GAP))),
    ...(foot ? [foot.animate([{ opacity: 0 }, { opacity: 1 }], timing(footAt, FOOT_MS))] : []),
  ];
}

export function ReferenceCheck() {
  // Home and /method check the same line, so the two pages show one proof.
  const { claim } = homeClaims()[0];
  const figure = useRef<HTMLElement>(null);
  const mark = useRef<HTMLElement>(null);
  const chip = useRef<HTMLSpanElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const running = useRef<Animation[]>([]);
  const begun = useRef(false);

  const rest = () => {
    for (const a of running.current) a.cancel();
    running.current = [];
  };

  const play = (held = false) => {
    rest();
    if (!mark.current || !chip.current || !card.current) return;
    running.current = sequence(mark.current, chip.current, card.current);
    if (held) for (const a of running.current) a.pause();
  };

  // A layout effect, so on home, where the section renders after hydration, the figure is held before it is painted.
  useLayoutEffect(() => {
    const el = figure.current;
    if (!el || typeof el.animate !== "function" || !("IntersectionObserver" in window)) return;
    const still = window.matchMedia(STILL);
    if (still.matches) return;
    const box = el.getBoundingClientRect();
    // Held at its first frame only while it is off screen, so nothing the reader is looking at goes missing.
    if (box.top >= window.innerHeight || box.bottom <= 0) play(true);
    const watch = new IntersectionObserver(
      (entries) => {
        if (!entries.some(onView)) return;
        watch.disconnect();
        if (begun.current) return;
        begun.current = true;
        if (still.matches) rest();
        else play();
      },
      { threshold: THRESHOLDS },
    );
    watch.observe(el);
    // Reduced motion turned on part way, or a print, gets the figure whole rather than a frame of the play.
    const whole = () => {
      begun.current = true;
      watch.disconnect();
      rest();
    };
    const onStill = () => {
      if (still.matches) whole();
    };
    still.addEventListener("change", onStill);
    window.addEventListener("beforeprint", whole);
    return () => {
      watch.disconnect();
      still.removeEventListener("change", onStill);
      window.removeEventListener("beforeprint", whole);
      rest();
    };
  }, []);

  const replay = () => {
    if (typeof figure.current?.animate !== "function" || window.matchMedia(STILL).matches) return;
    begun.current = true;
    play();
  };

  return (
    <figure ref={figure} className="grid min-w-0 content-start gap-3.5">
      <figcaption className="sd-tag">One line from her report</figcaption>
      <p className="font-display text-card-title leading-[1.5] text-paper">
        {/* The mark's own colour is the drawn line's while it plays, so the words keep theirs on a span of their own. */}
        <mark ref={mark} className="rp-claimed">
          <span className="text-paper">{claim.quote}</span>
        </mark>
        <span ref={chip} aria-hidden="true" className="rp-cite pointer-events-none font-label">
          1
        </span>
      </p>
      {/* The report's own card class for its look. In a report it floats above the page, or rises as a sheet on a phone,
          so the overrides set it in the page, at the line height it inherits there. */}
      <div
        ref={card}
        className="rp-card static z-auto w-full max-w-[344px] max-h-none overflow-visible rounded-card pb-[15px] leading-normal"
      >
        <EvidenceCard claim={claim} />
      </div>
      <Button variant="secondary" size="compact" onClick={replay} className="justify-self-start motion-reduce:hidden">
        Play it again
      </Button>
    </figure>
  );
}
