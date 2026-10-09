/**
 * The opening plate, fixed behind the first screen: the Sun and the Moon as
 * renders at their true angles on a thin brass ring, the Ascendant as an open
 * marker because it is a point on the horizon and never a body (ADR-17), the
 * name at the centre of its own sky, and the birth data in the corners.
 *
 * East is on the left, as every chart is drawn. The horizon is the plate's
 * only line, solid and level as the loading story draws it (ADR-395): the plate
 * is framed on the Ascendant's own degree, not on the start of its sign as the
 * wheel is, or the line through the Ascendant and the Descendant leans by that
 * degree. The ring is dimmed behind it so its curve never reads as the horizon.
 * A label sits beside its body with nothing joining them (ADR-27), and a
 * horizon label a body would cover steps down below it (B-62). The Sun's glow
 * is painted on the sky layer rather than inside the SVG, so no bar, edge or
 * chapter can clip it. It fades out over the first 0.6 screens as the reading's
 * sky fades in.
 *
 * A blind chart (ADR-33, ADR-37) has no horizon to draw: no line, no east or
 * west, no rising marker. The plate is framed on 0° Aries, the Moon is the arc
 * it travelled across the band, the Sun sits at its centre-time degree, and the
 * legend's third line asks for the birth time instead of naming a sign.
 *
 * Three tiers (ADR-59): wide keeps the plate with the name at its centre;
 * narrow, up to 900 px, stacks the plate, the legend and the cue; the phone,
 * under 640 px, puts the ring on top at 82vw and the name under it, then the
 * legend, then the cue clear of the corner text (`phoneStack`). On a plate
 * that holds the name, a name wide enough to reach the rising marker would
 * cover it, so it stands just above the line instead, its date just below;
 * where that would cover a body, it takes the ladder's next rung (`placeName`).
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";
import { TriadRow } from "@/components/TriadRow";
import { triadRowsOf, triadText } from "@/lib/triad-row";
import { opposite, pointAt } from "@/components/chart/wheel-geometry";
import {
  MARKER_RADIUS, MARKER_STROKE, PHONE, ascendantValue, heroTheta, layoutHero, moonArc, phoneStack, placeBodies, placeName, writtenOnText,
  type NamePlace, type Rect,
} from "@/components/report/hero-layout";
import { AngleGlyphShape } from "@/components/report/AngleGlyph";
import { timeOfBirthLabel } from "@/lib/birth-time";
import { Mark } from "@/components/Mark";
import { PLANET_LABELS, type ChartData, type Interpretation } from "@/types/chart";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { PERSONAL_REPORT } from "@/lib/product";
import { ReportSky } from "@/components/report/ReportSky";
import type { Ring } from "@/lib/gather";

const SKY = "var(--sky)";
const SKY_DIM = "var(--sky-dim)";
const PAPER = "var(--paper)";
/** How far the plate's diagram moves per px scrolled, in plate units, and the centred name, in px: two depths. */
const DIAGRAM_RATE = 0.12 * 1.6;
const NAME_RATE = 0.05 * 1.6;
const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

/** Four stops, transparent by about 1.6 Sun diameters out. */
const GLOW = "radial-gradient(circle closest-side, rgba(255,196,118,.46) 0%, rgba(236,142,62,.22) 24%,"
  + " rgba(150,82,38,.08) 56%, rgba(6,8,12,0) 100%)";
const GLOW_DIAMETERS = 3.2;

/** The name's own ladder: it is page type, so it never scales with the plate. A phone gets a smaller rung of the same ladder. */
const LADDER = { wide: [64, 48, 40], narrow: [44, 34, 28] } as const;

/** A name's own rung and the rungs below it. */
function rungsFrom(size: number, narrow: boolean): number[] {
  const ladder: readonly number[] = narrow ? LADDER.narrow : LADDER.wide;
  return ladder.slice(Math.max(0, ladder.indexOf(size)));
}

function nameLines(name: string, narrow: boolean): { lines: string[]; size: number } {
  const n = name.trim();
  const [big, mid, small] = narrow ? LADDER.narrow : LADDER.wide;
  if (n.length <= 14) return { lines: [n], size: big };
  if (n.length <= 26) return { lines: [n], size: mid };
  const words = n.split(/\s+/);
  if (words.length < 2) return { lines: [n], size: small };
  // Balanced: the break that leaves the two lines closest in length.
  let best = 1;
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const gap = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (gap < bestGap) { bestGap = gap; best = i; }
  }
  return { lines: [words.slice(0, best).join(" "), words.slice(best).join(" ")], size: small };
}

type Tier = "wide" | "narrow" | "phone";

const PHONE_QUERY = "(max-width: 639px)";
const NARROW_QUERY = "(max-width: 900px)";

function tierNow(): Tier {
  if (typeof window === "undefined") return "wide";
  if (window.matchMedia(PHONE_QUERY).matches) return "phone";
  return window.matchMedia(NARROW_QUERY).matches ? "narrow" : "wide";
}

function useTier(): Tier {
  const [tier, setTier] = useState<Tier>(tierNow);
  useEffect(() => {
    const queries = [window.matchMedia(PHONE_QUERY), window.matchMedia(NARROW_QUERY)];
    const onChange = () => setTier(tierNow());
    onChange();
    for (const mq of queries) mq.addEventListener("change", onChange);
    return () => { for (const mq of queries) mq.removeEventListener("change", onChange); };
  }, []);
  return tier;
}

/** The phone's viewport, re-read on resize so the stack follows an address-bar collapse or a rotation. */
function useViewport(active: boolean): { width: number; height: number } {
  const read = () => ({ width: typeof window === "undefined" ? 390 : window.innerWidth, height: typeof window === "undefined" ? 844 : window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    if (!active) return;
    const onResize = () => setSize(read());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active]);
  return size;
}

function coordinate(value: number, positive: string, negative: string, places: number): string {
  return `${Math.abs(value).toFixed(places)}° ${value >= 0 ? positive : negative}`;
}

function Label({ x, y, anchor, size, fill, children }: {
  x: number; y: number; anchor: "start" | "middle" | "end"; size: number; fill: string; children: string;
}) {
  return (
    <text
      x={x.toFixed(1)} y={y.toFixed(1)} textAnchor={anchor}
      fontFamily="Space Grotesk, monospace" fontSize={size} letterSpacing="2.4" fill={fill}
    >
      {children}
    </text>
  );
}

const ADD_TIME = "add your birth time to see your rising sign and houses";

/** The cue is a button (ADR-50): 44 px hit area, scrolls to chapter 01, fades over the first half screen. */
function ScrollCue({ flow, reduced, cueRef }: { flow?: boolean; reduced: boolean; cueRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={cueRef} className={`rp-cue no-print${flow ? " rp-cue-flow" : ""}`}>
      <button
        type="button"
        onClick={() => document.getElementById("chapter-1")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })}
        aria-label="Scroll to chapter 1"
      >
        Scroll<i aria-hidden />
      </button>
    </div>
  );
}

/** Under the name, in the legend's small grey: it fades with the plate, as the name does. */
function WrittenOn({ text, textRef, style }: { text: string; textRef?: React.Ref<HTMLParagraphElement>; style?: React.CSSProperties }) {
  return <p ref={textRef} className="m-0 font-numeric text-[11px] tracking-[0.04em] text-[rgba(232,235,242,.62)]" style={style}>{text}</p>;
}

function samePlace(a: NamePlace | null, b: NamePlace | null): boolean {
  if (a === null || b === null) return a === b;
  const near = (x: number, y: number) => Math.abs(x - y) < 0.5;
  return a.size === b.size && (a.clearance === null ? b.clearance === null : b.clearance !== null && near(a.clearance, b.clearance))
    && a.obstacles.length === b.obstacles.length
    && a.obstacles.every((r, i) => near(r.x, b.obstacles[i].x) && near(r.y, b.obstacles[i].y) && near(r.w, b.obstacles[i].w) && near(r.h, b.obstacles[i].h));
}

export interface ReportHeroProps {
  name: string;
  birthDate: string;
  birthTime: string;
  /** 0 when the time is exact; the corner reads "approximate" or "not recorded" otherwise. */
  birthTimeWindowMinutes?: number;
  birthPlace: string;
  latitude: number;
  longitude: number;
  chartData: ChartData;
  meta: Interpretation["meta"];
  /** Opens the three-way birth time control; the blind hero's third legend line. */
  onAddBirthTime?: () => void;
  /** When the report was written (its `createdAt`); the hero says so under the plate. */
  writtenOn?: string | null;
  /** The hero's own sky takes the opening accent; once the door is taken the stars gather onto the ring (ADR-59). */
  accent: string;
  gather: boolean;
}

export function ReportHero({
  name, birthDate, birthTime, birthTimeWindowMinutes = 0, birthPlace, latitude, longitude, chartData, meta, onAddBirthTime, writtenOn, accent, gather,
}: ReportHeroProps) {
  const tier = useTier();
  const narrow = tier !== "wide";
  const phone = tier === "phone";
  const viewport = useViewport(phone);
  const reduced = useReducedMotion();
  const skyRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<SVGGElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<SVGImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const writtenRef = useRef<HTMLParagraphElement>(null);
  const [ring, setRing] = useState<Ring | null>(null);
  const [place, setPlace] = useState<NamePlace | null>(null);
  const clearance = phone ? null : place?.clearance ?? null;
  // The name's own offset before the scroll's: a standing name puts its bottom, not its middle, on the line, and
  // scrolls at the plate's rate, so the line and the marker never slide up under it.
  const shift = clearance === null ? "-50%" : `-100% - ${clearance.toFixed(1)}px`;
  const nameRate = clearance === null || !place ? NAME_RATE : DIAGRAM_RATE * place.scale;

  // The ring's place on screen, measured at rest and again on every resize,
  // so the ring of stars follows an address-bar collapse or a rotation.
  useEffect(() => {
    function measure() {
      const el = ringRef.current;
      if (!el) return;
      const b = el.getBoundingClientRect();
      if (b.width < 2) return;
      const next = { cx: b.left + b.width / 2, cy: b.top + b.height / 2, r: b.width / 2 };
      setRing((prev) => (prev && Math.abs(prev.cx - next.cx) < 0.5 && Math.abs(prev.cy - next.cy) < 0.5 && Math.abs(prev.r - next.r) < 0.5 ? prev : next));
    }
    measure();
    const raf = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => { window.cancelAnimationFrame(raf); window.removeEventListener("resize", measure); };
  }, [tier, viewport.width, viewport.height, name]);

  useEffect(() => {
    let frame = 0;
    function place() {
      const top = window.scrollY;
      const q = Math.min(1, top / (Math.max(1, window.innerHeight) * 0.6));
      const gone = q >= 1 ? "hidden" : "";
      if (skyRef.current) {
        skyRef.current.style.opacity = (1 - q).toFixed(3);
        skyRef.current.style.visibility = gone;
        skyRef.current.style.pointerEvents = q > 0.9 ? "none" : "";
      }
      if (hudRef.current) {
        hudRef.current.style.opacity = (0.62 * Math.max(0, 1 - q * 1.8)).toFixed(3);
        hudRef.current.style.visibility = gone;
      }
      if (cueRef.current) cueRef.current.style.opacity = Math.max(0, 1 - q * 2.2).toFixed(3);
      if (!reduced) {
        // The whole diagram is one group so ring, horizon and markers can never
        // drift apart on scroll; only a centred name moves at a different depth,
        // a standing one keeps to its line. On the phone the name sits in the
        // flow under the ring and stays put.
        diagramRef.current?.setAttribute("transform", `translate(0,${(-top * DIAGRAM_RATE).toFixed(1)})`);
        if (nameRef.current && !phone) nameRef.current.style.transform = `translateY(calc(${shift} - ${(top * nameRate).toFixed(1)}px))`;
      }
      // The glow is painted outside the SVG, so it is told where the Sun ended
      // up rather than being drawn with it.
      const sun = sunRef.current;
      const glow = glowRef.current;
      const sky = skyRef.current;
      if (sun && glow && sky) {
        const s = sun.getBoundingClientRect();
        const box = sky.getBoundingClientRect();
        const d = Math.max(s.width, 1) * GLOW_DIAMETERS;
        glow.style.width = `${d.toFixed(1)}px`;
        glow.style.height = `${d.toFixed(1)}px`;
        glow.style.left = `${(s.left - box.left + s.width / 2 - d / 2).toFixed(1)}px`;
        glow.style.top = `${(s.top - box.top + s.height / 2 - d / 2).toFixed(1)}px`;
      }
    }
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        place();
      });
    }
    place();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reduced, tier, name, shift, nameRate]);

  const asc = chartData.angles?.ascendant ?? null;
  const dsc = chartData.angles?.descendant ?? null;
  const blind = asc === null;
  const sun = chartData.planets.sun;
  const moon = chartData.planets.moon;
  const tob = timeOfBirthLabel({ birthTime, birthTimeWindowMinutes });

  // A narrow plate is wider than tall so the ring can fill the width and the
  // horizon labels still have room outside it. The phone's plate is square
  // with the ring at 82% of it, so the ring is 82vw when the svg is 100vw.
  const W = phone ? 560 : narrow ? 780 : 1000;
  const H = phone ? 560 : narrow ? 640 : 660;
  const cx = W / 2;
  const cy = H / 2;
  const R = phone ? Math.round(W * PHONE.ringOfSvg / 2) : narrow ? 236 : 200;
  const horizonReach = phone ? 20 : 58;
  const places = narrow ? 2 : 4;

  // A drawn plate is framed on the Ascendant's own degree, east on the left; a blind one on 0° Aries.
  const frame = asc ? asc.absoluteDegree : 0;
  const angleOf = (degree: number) => heroTheta(degree, frame, "degree");
  const ascTheta = angleOf(frame);
  const ascAt = pointAt(cx, cy, R, ascTheta);
  const east = pointAt(cx, cy, R + horizonReach, ascTheta);
  const west = pointAt(cx, cy, R + horizonReach, angleOf(opposite(frame)));
  const arc = moon?.band ? moonArc(cx, cy, R, frame, moon.band, "degree") : null;

  const { lines: nameRows, size: rungSize } = nameLines(name, narrow);
  const rungs = rungsFrom(rungSize, narrow);
  // On the plate the name may take a rung below its own (`placeName`); the phone's sits under the ring and keeps its own.
  const placed = phone || blind ? null : place;
  const nameSize = placed && rungs.includes(placed.size) ? placed.size : rungSize;
  const standing = placed?.clearance ?? null;
  // The name has already broken to its lines from its length; only the viewport's height can now cost the ring.
  const written = writtenOnText(writtenOn);
  const stack = phone ? phoneStack({ viewportWidth: viewport.width, viewportHeight: viewport.height, nameLines: nameRows.length, nameSize, dated: written !== null }) : null;
  const ascText = ascendantValue(asc);

  // The Sun is placed first, so it takes the room it needs.
  const bodies = [
    sun && { key: "sun", absoluteDegree: sun.absoluteDegree, size: phone ? 100 : narrow ? 108 : 120 },
    moon && { key: "moon", absoluteDegree: moon.absoluteDegree, size: phone ? 60 : narrow ? 64 : 72 },
  ].filter(Boolean) as { key: string; absoluteDegree: number; size: number }[];
  const discs = placeBodies({ cx, cy, ringRadius: R, frameDegree: frame, frameOn: "degree", bodies });
  const discKey = discs.map((d) => `${d.x.toFixed(1)},${d.y.toFixed(1)},${d.size}`).join(" ");

  // Where the name sits and at what size, measured before the first paint and again when its font arrives or the plate
  // resizes. Each size is measured on a hidden copy of the name, so what is drawn never changes what is measured.
  useLayoutEffect(() => {
    if (phone || blind) {
      setPlace(null);
      return undefined;
    }
    function measure() {
      const ringEl = ringRef.current;
      const h1 = h1Ref.current;
      const eyebrow = eyebrowRef.current;
      const block = nameRef.current;
      if (!ringEl || !h1 || !eyebrow || !block) return;
      const ringBox = ringEl.getBoundingClientRect();
      if (ringBox.width < 2) return;
      // A row's own text, since the row is as wide as the plate.
      const textWidth = (el: Element) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getBoundingClientRect().width;
      };
      const drawnAt = (size: number) => {
        const copy = h1.cloneNode(true) as HTMLElement;
        Object.assign(copy.style, { fontSize: `${size}px`, position: "absolute", visibility: "hidden", width: "max-content", left: "0", top: "0" });
        h1.parentElement?.appendChild(copy);
        const box = copy.getBoundingClientRect();
        copy.remove();
        return { size, width: box.width, height: box.height };
      };
      const date = writtenRef.current;
      const next = placeName({
        cx, cy, ringRadius: R, scale: ringBox.width / (2 * R),
        names: rungs.map(drawnAt),
        eyebrow: { width: textWidth(eyebrow), height: eyebrow.getBoundingClientRect().height },
        written: date ? { width: textWidth(date), height: date.getBoundingClientRect().height } : null,
        gap: Number.parseFloat(getComputedStyle(block).rowGap) || 0,
        bodies: discs,
      });
      setPlace((prev) => (samePlace(prev, next) ? prev : next));
    }
    measure();
    const watch = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (watch && h1Ref.current) watch.observe(h1Ref.current);
    if (watch && ringRef.current?.ownerSVGElement) watch.observe(ringRef.current.ownerSVGElement);
    window.addEventListener("resize", measure);
    return () => {
      watch?.disconnect();
      window.removeEventListener("resize", measure);
    };
    // `discs` is read through `discKey`, which changes only when a body moves.
  }, [phone, blind, cx, cy, R, name, written, rungs.join(" "), discKey]);

  // What a label may not cover: the name plate at the centre, and the name's own rows where they sit, which on a short
  // screen run past that plate. In plate units, like everything else here.
  const plate: Rect = { x: cx - Math.min(W * 0.31, 230), y: cy - 66, w: Math.min(W * 0.62, 460), h: 132 };
  const obstacles: Rect[] = phone ? [] : [...(standing !== null ? [] : [plate]), ...(placed?.obstacles ?? [])];
  // The two horizon labels as drawn below, east then west, with room for the widest value, "Sagittarius 29.99° · 1st
  // (self)": 31 characters of IBM Plex Mono at 0.6 em. The narrow tiers write them inward from the line's ends.
  const horizonLabels: Rect[] = blind ? [] : narrow
    ? [
      { x: east.x, y: east.y + (phone ? 12 : 14), w: phone ? 280 : 300, h: phone ? 40 : 46 },
      { x: west.x - (phone ? 160 : 180), y: west.y + (phone ? 12 : 14), w: phone ? 160 : 180, h: phone ? 22 : 26 },
    ]
    : [
      { x: east.x - 210, y: east.y + 10, w: 210, h: 42 },
      { x: west.x, y: west.y + 10, w: 210, h: 42 },
    ];

  const layout = layoutHero({
    cx, cy, ringRadius: R,
    frameDegree: frame,
    frameOn: "degree",
    bodies,
    // The widest value, "29.99° Sagittarius · 7th (partnership)": 38 characters at 11.5 px Plex Mono (6.9 px each), plus air.
    labelWidth: 276,
    labelHeight: 34,
    obstacles,
    horizonLabels,
  });
  const [eastDrop = 0, westDrop = 0] = layout.horizonDrops;

  const dob = new Date(`${birthDate}T00:00:00Z`);
  const dobText = `${dob.getUTCDate()} ${MONTHS[dob.getUTCMonth()]} ${dob.getUTCFullYear()}`;

  const legend = triadRowsOf(chartData, { blind: ADD_TIME });

  function bodyValue(key: string): string {
    const row = legend.find((r) => r.key === key);
    return row ? triadText(row) : "";
  }

  const sectLine = meta.sect && meta.sunAltitude !== undefined
    ? `${meta.sect} chart · sun alt ${meta.sunAltitude.toFixed(1)}°`
    : "rising sign · needs a birth time";

  return (
    <>
      <div ref={skyRef} className={`rp-hsky rp-grain no-print${narrow ? " narrow" : ""}${phone ? " phone" : ""}`}>
        {/* The hero's own starfield and, once opened, the ring of stars, sized to this layer and fading with it. */}
        <ReportSky variant="hero" accent={accent} opening gatherTo={gather ? ring : null} />
        {/* Under the transparent bar, off the plate's edges, fading with the sky. */}
        <div
          ref={glowRef}
          aria-hidden
          className="pointer-events-none absolute"
          style={{ background: GLOW, borderRadius: "50%" }}
        />
        <div className="rp-hplate">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={stack ? { maxHeight: `${stack.svg.toFixed(0)}px`, maxWidth: `${stack.svg.toFixed(0)}px` } : undefined}
          role="img"
          aria-label={blind ? `${name}: Sun and Moon at their true positions; the rising sign needs a birth time` : `${name}: Sun, Moon and Rising at their true positions`}
        >
          <g ref={diagramRef}>
            {/* The ring and its ticks step back behind the horizon, so the ring's curve is never the line that reads. */}
            <circle ref={ringRef} cx={cx} cy={cy} r={R} fill="none" stroke={SKY} strokeOpacity={0.25} />
            {Array.from({ length: 12 }, (_, i) => i * 30).map((d) => {
              const t = angleOf(d);
              const p1 = pointAt(cx, cy, R, t);
              const p2 = pointAt(cx, cy, R - (d % 90 === 0 ? 13 : 7), t);
              return (
                <line
                  key={d} x1={p1.x.toFixed(1)} y1={p1.y.toFixed(1)} x2={p2.x.toFixed(1)} y2={p2.y.toFixed(1)}
                  stroke={SKY} strokeOpacity={d % 90 === 0 ? 0.3 : 0.16}
                />
              );
            })}
            {!blind && (
              // The loading story's horizon (BuildStory, step 4): solid paper, level through the Ascendant and the Descendant.
              <line
                x1={east.x.toFixed(1)} y1={east.y.toFixed(1)} x2={west.x.toFixed(1)} y2={west.y.toFixed(1)}
                stroke={PAPER} strokeOpacity={0.55} strokeWidth={1.5} data-horizon
              />
            )}
            {arc && (
              // The Moon's day: the arc between its longitudes at the band's edges, the render at its centre.
              <path d={arc.d} fill="none" stroke={SKY} strokeOpacity={0.7} strokeWidth={3} strokeLinecap="round" data-moon-arc />
            )}
            {blind ? null : narrow ? (
              <>
                <Label x={east.x} y={east.y + eastDrop + (phone ? 26 : 30)} anchor={east.x < cx ? "start" : "end"} size={phone ? 15 : 18} fill={SKY_DIM}>EAST · RISING</Label>
                {ascText && (
                  <text
                    x={east.x.toFixed(1)} y={(east.y + eastDrop + (phone ? 46 : 54)).toFixed(1)} textAnchor={east.x < cx ? "start" : "end"}
                    fontFamily="IBM Plex Mono, monospace" fontSize={phone ? 15 : 16} fill="rgba(232,235,242,.62)"
                  >
                    {ascText}
                  </text>
                )}
                <Label x={west.x} y={west.y + westDrop + (phone ? 26 : 30)} anchor={west.x < cx ? "start" : "end"} size={phone ? 15 : 18} fill={SKY_DIM}>WEST · SETTING</Label>
              </>
            ) : (
              <>
                <Label x={east.x - 6} y={east.y + eastDrop + 26} anchor="end" size={11} fill={SKY_DIM}>EAST · RISING</Label>
                <text
                  x={(east.x - 6).toFixed(1)} y={(east.y + eastDrop + 44).toFixed(1)} textAnchor="end"
                  fontFamily="IBM Plex Mono, monospace" fontSize={11.5} fill="rgba(232,235,242,.62)"
                >
                  {ascText}
                </text>
                <Label x={west.x + 6} y={west.y + westDrop + 26} anchor="start" size={11} fill={SKY_DIM}>WEST · SETTING</Label>
                <text
                  x={(west.x + 6).toFixed(1)} y={(west.y + westDrop + 44).toFixed(1)} textAnchor="start"
                  fontFamily="IBM Plex Mono, monospace" fontSize={11.5} fill="rgba(232,235,242,.62)"
                >
                  {dsc ? `${dsc.degree.toFixed(2)}° ${dsc.sign}` : ""}
                </text>
              </>
            )}

            {layout.bodies.map((b) => (
              <image
                key={b.key}
                ref={b.key === "sun" ? sunRef : undefined}
                href={b.key === "sun" ? SUN_HERO : PLANET_RENDERS[b.key]}
                x={b.x - b.size / 2} y={b.y - b.size / 2}
                width={b.size} height={b.size}
              />
            ))}

            {!narrow && layout.labels.map((l) => (
              <g key={l.key}>
                <Label x={l.x} y={l.y - 3} anchor={l.anchor} size={9.5} fill={SKY_DIM}>
                  {(PLANET_LABELS[l.key] ?? l.key).toUpperCase()}
                </Label>
                <text
                  x={l.x.toFixed(1)} y={(l.y + 13).toFixed(1)} textAnchor={l.anchor}
                  fontFamily="IBM Plex Mono, monospace" fontSize={11.5} fill="rgba(232,235,242,.62)"
                >
                  {bodyValue(l.key)}
                </text>
              </g>
            ))}

            {!blind && (
              // The R03 marker: ring, centre point, a tick outward along the horizon (ADR-49).
              <AngleGlyphShape x={ascAt.x} y={ascAt.y} r={MARKER_RADIUS} direction={ascTheta} stroke={SKY} fill="#0B0E14" strokeWidth={MARKER_STROKE} />
            )}
            {blind && !narrow && (
              <Label x={cx} y={cy + R + 46} anchor="middle" size={11} fill={SKY_DIM}>{ADD_TIME.toUpperCase()}</Label>
            )}
          </g>
        </svg>
        {blind && !narrow && onAddBirthTime && (
          <button
            type="button"
            onClick={onAddBirthTime}
            className="absolute left-1/2 -translate-x-1/2 rounded-full border border-brass/50 px-4 py-2 font-label text-[11px] uppercase tracking-[0.2em] text-brass hover:bg-brass/10"
            style={{ bottom: "4%" }}
          >
            Add my birth time
          </button>
        )}
        {!phone && (
        <div ref={nameRef} className="rp-hname" style={standing !== null ? { transform: `translateY(calc(${shift}))` } : undefined}>
          <span ref={eyebrowRef} className="k">{PERSONAL_REPORT}</span>
          <div className="relative inline-block justify-self-center">
            {/* A halo fitted to the text box, so the ring reads through around it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: "156%", height: "240%",
                background: "radial-gradient(ellipse closest-side at center, rgba(18,24,38,.94) 0%,"
                  + " rgba(18,24,38,.64) 54%, rgba(18,24,38,0) 100%)",
              }}
            />
            <h1 ref={h1Ref} className="relative" style={{ fontSize: `${nameSize}px` }}>
              {nameRows.map((line, i) => (
                <span key={i} className="block">{line}</span>
              ))}
            </h1>
          </div>
          {written && (
            <WrittenOn
              text={written}
              textRef={writtenRef}
              style={standing !== null ? {
                position: "absolute", left: "50%", top: `calc(100% + ${(2 * standing).toFixed(1)}px)`,
                transform: "translateX(-50%)", whiteSpace: "nowrap",
              } : undefined}
            />
          )}
        </div>
        )}
        </div>

        {/* The phone's name lives under the ring, in the flow, with no halo: the ring is above it, not behind it. */}
        {phone && (
          <div ref={nameRef} className="rp-hname rp-hname-flow">
            <span className="k">{PERSONAL_REPORT}</span>
            <h1 style={{ fontSize: `${nameSize}px` }}>
              {nameRows.map((line, i) => (
                <span key={i} className="block">{line}</span>
              ))}
            </h1>
            {written && <WrittenOn text={written} />}
          </div>
        )}

        {narrow && (
          <TriadRow rows={legend} onAddBirthTime={onAddBirthTime} />
        )}
        {narrow && <ScrollCue flow reduced={reduced} cueRef={cueRef} />}
      </div>

      <div ref={hudRef} className="rp-hud no-print" aria-hidden>
        <div className="fr" />
        <span className="br tl" /><span className="br tr" /><span className="br bl" /><span className="br brr" />
        <span className="tick l" /><span className="tick r" />
        <div className="r">
          <div className="col">
            <span className="live"><i />DOB · {dobText}</span>
            <span className="d">TOB · {tob}</span>
          </div>
          <div className="col e">
            <span>Stars Decoded</span>
            <span className="d">{meta.houseSystem} · {meta.zodiac}</span>
          </div>
        </div>
        <div className="r b">
          <div className="col">
            <span>POB · {birthPlace}</span>
            <span className="d">{coordinate(latitude, "N", "S", places)} / {coordinate(longitude, "E", "W", places)}</span>
          </div>
          <div className="col e">
            <span className="d">{sectLine}</span>
          </div>
        </div>
      </div>

      <section className="rp-hero" aria-label="Opening">
        {!narrow && <ScrollCue reduced={reduced} cueRef={cueRef} />}
        <header className="hidden print:block px-8 pt-12">
          <p className="flex items-center gap-2 font-display text-base mb-6">
            <Mark className="h-[18px] w-[18px]" point="currentColor" />
            Stars Decoded
          </p>
          <p className="font-label text-[10px] tracking-[0.28em] uppercase">{PERSONAL_REPORT}</p>
          <h1 className="font-display text-5xl mt-2">{name}</h1>
          <p className="font-numeric text-xs mt-3">
            DOB · {dobText} · TOB · {tob} · POB · {birthPlace}
          </p>
          {written && <p className="font-numeric text-xs mt-1">{written}</p>}
          <p className="font-numeric text-xs mt-1">
            {legend.map((row) => `${row.label} ${row.at === null ? "needs a birth time" : triadText(row)}`).join(" · ")}
          </p>
        </header>
      </section>
    </>
  );
}

export default ReportHero;
