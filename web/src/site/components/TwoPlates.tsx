/**
 * Two people's charts on one horizon (ADR-113, landing scope 8): two triad
 * plates, each framed on its own Ascendant, so both horizons fall on one
 * dotted line, with the Sun and the Moon at their true degrees. Each chart
 * stands alone: nothing joins a body of one to the other (ADR-97), and
 * nothing scores the two.
 *
 * The plates are drawn here from the triad plate's parts (the brass ring, the
 * renders, the angle marker, the Moon's band as an arc) rather than as two
 * `TriadPlate`s, which frame the whole-sign 1st house at east: that tilts each
 * horizon by its Ascendant's degree in its sign, so two could never share one
 * line. Names and readouts are text under the drawing, so they stay legible
 * on a phone and a crawler reads the placements.
 */
import { useId, useLayoutEffect, useRef } from "react";
import { animate } from "framer-motion";
import { AngleGlyphShape } from "@/components/report/AngleGlyph";
import { separation } from "@/components/report/hero-layout";
import { NOT_DRAWN } from "@/components/report/pair-hero-layout";
import { TriadRow } from "@/components/TriadRow";
import { norm360 } from "@/components/chart/wheel-geometry";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";
import { first } from "@/lib/share-card";
import { triadRowsOf } from "@/lib/triad-row";
import type { ChartData } from "@/types/chart";

export interface PlatePerson {
  name: string;
  chart: ChartData;
}

export interface TwoPlatesProps {
  /** On the left; under parent and child, the parent. */
  a: PlatePerson;
  b: PlatePerson;
  /** Said under the two readouts, where a page labels its people as samples. */
  caption?: string;
}

export const PLATE = {
  width: 640,
  height: 240,
  cy: 120,
  radius: 96,
  centres: [160, 480],
} as const;

type BodyKey = "sun" | "moon";

const BODY_SIZE: Record<BodyKey, number> = { sun: 34, moon: 24 };

/** Outermost first; each step clears a Sun above a Moon, so a body moved inward never lands on the other. */
export const LANES = [PLATE.radius, PLATE.radius - 30, PLATE.radius - 60] as const;

/** Within this many degrees a body would sit on the Ascendant's marker, so it takes an inner lane (ADR-17). */
export const NEAR_ASCENDANT = 14;

const DISC_GAP = 3;
const GLIDE_S = 0.9;
const EASE = [0.16, 1, 0.3, 1] as const;

const BRASS = "#D4B06A";
const PAPER = "#E8EBF2";
const GROUND = "#0D1117";
const VOID = "#06080C";
const VIOLET = "#9575CD";

const round2 = (n: number) => Math.round(n * 100) / 100;
const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * SVG degrees, clockwise from +x: the frame's degree at east on the left, the
 * zodiac running anticlockwise from it, as every chart is drawn. The frame is
 * the Ascendant, or 0° Aries on a chart without one.
 */
export function plateAngle(longitude: number, frame: number): number {
  return 180 - norm360(longitude - frame);
}

export interface PlateBody {
  key: BodyKey;
  /** The body's true angle; a lane never changes it. */
  angle: number;
  radius: number;
  size: number;
}

function at(cx: number, angle: number, radius: number): { x: number; y: number } {
  return { x: cx + radius * Math.cos(rad(angle)), y: PLATE.cy + radius * Math.sin(rad(angle)) };
}

function clear(a: PlateBody, b: PlateBody): boolean {
  const p = at(0, a.angle, a.radius);
  const q = at(0, b.angle, b.radius);
  return Math.hypot(p.x - q.x, p.y - q.y) >= (a.size + b.size) / 2 + DISC_GAP;
}

/**
 * Where the Sun and the Moon sit on one plate. Crowding moves a body inward,
 * never around (ADR-17): near the Ascendant it skips the ring, and a body that
 * would cover one already placed takes the next lane in.
 */
export function plateBodies(chart: ChartData): PlateBody[] {
  const asc = chart.angles?.ascendant.absoluteDegree ?? null;
  const frame = asc ?? 0;
  const placed: PlateBody[] = [];
  for (const key of ["sun", "moon"] as const) {
    const planet = chart.planets[key];
    if (!planet) continue;
    const angle = plateAngle(planet.absoluteDegree, frame);
    const size = BODY_SIZE[key];
    const lanes = asc !== null && separation(planet.absoluteDegree, asc) < NEAR_ASCENDANT ? LANES.slice(1) : [...LANES];
    const radius = lanes.find((r) => placed.every((b) => clear(b, { key, angle, radius: r, size }))) ?? lanes[lanes.length - 1];
    placed.push({ key, angle, radius, size });
  }
  return placed;
}

/** The arc the Moon covered across a birth-time band, forward along the zodiac, sampled so no sweep flag can be wrong. */
function bandPath(cx: number, frame: number, band: { fromDegree: number; toDegree: number }): string {
  const span = norm360(band.toDegree - band.fromDegree);
  const steps = Math.max(1, Math.ceil(span));
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = at(cx, plateAngle(band.fromDegree + (span * i) / steps, frame), PLATE.radius);
    points.push(`${i === 0 ? "M" : "L"}${round2(p.x)} ${round2(p.y)}`);
  }
  return points.join(" ");
}

function PlateBase({ chart, cx }: { chart: ChartData; cx: number }) {
  const asc = chart.angles?.ascendant.absoluteDegree ?? null;
  const frame = asc ?? 0;
  const r = PLATE.radius;
  const cy = PLATE.cy;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={GROUND} fillOpacity={asc === null ? 1 : 0.6} stroke={BRASS} strokeOpacity={0.45} />
      {asc !== null && <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 0 ${cx + r} ${cy} Z`} fill={VOID} fillOpacity={0.55} />}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = plateAngle(i * 30, frame);
        const inner = at(cx, angle, r - 5);
        const outer = at(cx, angle, r + 5);
        return <line key={i} x1={round2(inner.x)} y1={round2(inner.y)} x2={round2(outer.x)} y2={round2(outer.y)} stroke={BRASS} strokeOpacity={0.35} />;
      })}
    </g>
  );
}

function bodyBox(cx: number, b: Pick<PlateBody, "angle" | "radius" | "size">): { x: number; y: number } {
  const p = at(cx, b.angle, b.radius);
  return { x: round2(p.x - b.size / 2), y: round2(p.y - b.size / 2) };
}

function PlateTop({ chart, cx, bodies, refs }: {
  chart: ChartData;
  cx: number;
  bodies: readonly PlateBody[];
  refs?: Map<BodyKey, SVGImageElement>;
}) {
  const asc = chart.angles?.ascendant.absoluteDegree ?? null;
  const band = chart.planets.moon?.band;
  return (
    <g>
      {band && <path d={bandPath(cx, asc ?? 0, band)} fill="none" stroke={PAPER} strokeOpacity={0.6} strokeWidth={3} strokeLinecap="round" />}
      {asc !== null && <AngleGlyphShape x={cx - PLATE.radius} y={PLATE.cy} r={6.5} direction={180} stroke={BRASS} fill={GROUND} strokeWidth={1.5} />}
      {bodies.map((b) => {
        const box = bodyBox(cx, b);
        return (
          <image
            key={b.key}
            ref={refs ? (el) => { if (el) refs.set(b.key, el); else refs.delete(b.key); } : undefined}
            href={b.key === "sun" ? SUN_HERO : PLANET_RENDERS.moon}
            x={box.x}
            y={box.y}
            width={b.size}
            height={b.size}
          />
        );
      })}
    </g>
  );
}

function Readout({ person }: { person: PlatePerson }) {
  return (
    <div className="grid min-w-0 content-start justify-items-center gap-1.5 px-1 text-center">
      <p className="font-display text-[20px] leading-tight text-[var(--paper-hi)] sm:text-[24px]">{first(person.name)}</p>
      {/* Two readouts share a phone's width, so a value that does not fit beside its label drops under it whole. */}
      <TriadRow rows={triadRowsOf(person.chart, { blind: NOT_DRAWN })} compact className="w-auto! max-[460px]:[&_.lr]:flex-wrap max-[460px]:[&_.lr]:gap-y-0.5" />
    </div>
  );
}

/** Narrower than the gap between the plates (a fifth of the width), so on a phone a label wraps rather than touch a ring. */
const CENTRE_LABEL =
  "absolute left-1/2 w-[18%] -translate-x-1/2 text-center font-label text-[8.5px] font-medium uppercase leading-[1.3] tracking-[.14em] sm:text-[9.5px] sm:tracking-[.22em]";

const fromTop = (y: number) => `${round2((y / PLATE.height) * 100)}%`;

export function TwoPlates({ a, b, caption }: TwoPlatesProps) {
  const { width: W, height: H, cy } = PLATE;
  const [cxA, cxB] = PLATE.centres;
  const aBodies = plateBodies(a.chart);
  const bBodies = plateBodies(b.chart);
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const bEls = useRef(new Map<BodyKey, SVGImageElement>());
  const shown = useRef<Map<BodyKey, { angle: number; radius: number }> | null>(null);

  // When the second person changes, their Sun and Moon glide from where the last person's stood, so the change reads as one.
  useLayoutEffect(() => {
    const target = new Map(bBodies.map((body) => [body.key, { angle: body.angle, radius: body.radius }]));
    const from = shown.current;
    shown.current = target;
    if (!from || reduced) return;
    const moves = bBodies.flatMap((body) => {
      const start = from.get(body.key);
      const el = bEls.current.get(body.key);
      if (!start || !el || (start.angle === body.angle && start.radius === body.radius)) return [];
      const turn = norm360(body.angle - start.angle + 180) - 180;
      return [{ body, el, start, turn }];
    });
    if (moves.length === 0) return;
    const draw = (u: number) => {
      for (const { body, el, start, turn } of moves) {
        const now = { angle: start.angle + turn * u, radius: start.radius + (body.radius - start.radius) * u };
        const box = bodyBox(cxB, { ...now, size: body.size });
        el.setAttribute("x", String(box.x));
        el.setAttribute("y", String(box.y));
        target.set(body.key, now);
      }
    };
    draw(0);
    const glide = animate(0, 1, { duration: GLIDE_S, ease: EASE, onUpdate: draw });
    return () => glide.stop();
  }, [b.chart]);

  return (
    <figure className="m-0 mx-auto w-full max-w-[720px]" aria-label={`${first(a.name)} and ${first(b.name)}, two charts on one horizon`}>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="block h-auto w-full overflow-visible">
          <defs>
            <linearGradient id={`${uid}-horizon`} gradientUnits="userSpaceOnUse" x1={0} y1={cy} x2={W} y2={cy}>
              <stop offset="0" stopColor={BRASS} stopOpacity={0} />
              <stop offset=".12" stopColor={BRASS} stopOpacity={0.7} />
              <stop offset=".88" stopColor={BRASS} stopOpacity={0.7} />
              <stop offset="1" stopColor={BRASS} stopOpacity={0} />
            </linearGradient>
            <radialGradient id={`${uid}-glow`}>
              <stop offset="0" stopColor={VIOLET} stopOpacity={0.35} />
              <stop offset="1" stopColor={VIOLET} stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle cx={W / 2} cy={cy} r={120} fill={`url(#${uid}-glow)`} />
          {/* A chart without a birth time has no horizon: its plate is drawn opaque over the line, so the line never seems to cross it. */}
          {a.chart.angles && <PlateBase chart={a.chart} cx={cxA} />}
          {b.chart.angles && <PlateBase chart={b.chart} cx={cxB} />}
          <line x1={0} y1={cy} x2={W} y2={cy} stroke={`url(#${uid}-horizon)`} strokeWidth={1.2} strokeDasharray="2 5" />
          {!a.chart.angles && <PlateBase chart={a.chart} cx={cxA} />}
          {!b.chart.angles && <PlateBase chart={b.chart} cx={cxB} />}
          <PlateTop chart={a.chart} cx={cxA} bodies={aBodies} />
          <PlateTop chart={b.chart} cx={cxB} bodies={bBodies} refs={bEls.current} />
          <circle cx={W / 2} cy={cy} r={13} fill={GROUND} stroke={VIOLET} strokeWidth={1.8} />
          <circle cx={W / 2} cy={cy} r={4} fill={VIOLET} />
        </svg>
        <span className={`${CENTRE_LABEL} -translate-y-full text-[var(--violet)]`} style={{ top: fromTop(cy - 20) }}>
          One horizon
        </span>
        <span className={`${CENTRE_LABEL} text-[var(--sd-muted)]`} style={{ top: fromTop(cy + 20) }}>
          No score
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Readout person={a} />
        <Readout person={b} />
      </div>
      {caption && (
        <figcaption className="mt-5 text-center font-numeric text-[10.5px] uppercase leading-[1.5] tracking-[.14em] text-[var(--sd-muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export default TwoPlates;
