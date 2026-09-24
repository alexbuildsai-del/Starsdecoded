/**
 * Where the hero's labels go. Pure: degrees and pixels in, positions out, so
 * the one promise the plate makes can be asserted rather than eyeballed.
 *
 * A body never leaves its degree. A label sits beside its body on the side away
 * from the centre and, if it would touch anything, slides vertically outward in
 * fixed steps until it is clear (ADR-27). When the Sun and the Moon are within
 * a disc of each other the Moon holds the ring and the Sun steps outward along
 * its own spoke, so two discs never overlap and neither is moved off its angle.
 */
import { norm360, pointAt, theta, type Point } from "@/components/chart/wheel-geometry";

export const CONJUNCTION_DEGREES = 12;
/** How far outside the ring the Sun steps when the two lights are together. */
export const OUTSIDE_STEP = 118;
export const SLIDE_STEP = 22;
const MAX_SLIDES = 14;
/** Clear space between a body's edge and its label. */
const LABEL_GAP = 16;

export interface Rect { x: number; y: number; w: number; h: number }

export interface HeroBody {
  key: string;
  absoluteDegree: number;
  /** Rendered diameter in plate units. */
  size: number;
}

export interface HeroLayoutInput {
  cx: number;
  cy: number;
  ringRadius: number;
  /** The degree drawn at east: the Ascendant when the horizon is drawn, 0° Aries when it is not. */
  frameDegree: number;
  /** In placement order: the Sun is placed first, so it wins the room it needs. */
  bodies: HeroBody[];
  labelWidth: number;
  labelHeight: number;
  /** The name plate and the two horizon labels, which labels must also avoid. */
  obstacles: Rect[];
}

export interface PlacedBody {
  key: string;
  x: number;
  y: number;
  size: number;
  /** True when the body stepped outside the ring to clear a conjunction. */
  outside: boolean;
}

export interface PlacedLabel {
  key: string;
  x: number;
  y: number;
  anchor: "start" | "end";
  rect: Rect;
}

export interface HeroLayout {
  bodies: PlacedBody[];
  labels: PlacedLabel[];
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** The shorter way round between two ecliptic longitudes. */
export function separation(a: number, b: number): number {
  const d = norm360(a - b);
  return d > 180 ? 360 - d : d;
}

function discRect(b: PlacedBody): Rect {
  return { x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size };
}

function labelRect(x: number, y: number, anchor: "start" | "end", w: number, h: number): Rect {
  return { x: anchor === "start" ? x : x - w, y: y - h * 0.72, w, h };
}

export function layoutHero(input: HeroLayoutInput): HeroLayout {
  const { cx, cy, ringRadius, frameDegree: asc, labelWidth, labelHeight } = input;

  // The Sun is the one body allowed to leave the ring, and only to clear the
  // Moon. Everything else sits on it.
  const moon = input.bodies.find((b) => b.key === "moon");
  const placed: PlacedBody[] = input.bodies.map((b) => {
    const t = theta(b.absoluteDegree, asc);
    const tight = b.key === "sun" && moon !== undefined
      && separation(b.absoluteDegree, moon.absoluteDegree) < CONJUNCTION_DEGREES;
    const radius = tight ? ringRadius + OUTSIDE_STEP : ringRadius;
    const p = pointAt(cx, cy, radius, t);
    return { key: b.key, x: p.x, y: p.y, size: b.size, outside: tight };
  });

  const taken: Rect[] = [...input.obstacles, ...placed.map(discRect)];
  const labels: PlacedLabel[] = [];

  for (const body of placed) {
    const right = body.x >= cx;
    const anchor: "start" | "end" = right ? "start" : "end";
    const x = body.x + (right ? 1 : -1) * (body.size / 2 + LABEL_GAP);
    // Outward is away from the centre, so a label never slides across the plate.
    const direction = body.y <= cy ? -1 : 1;

    let y = body.y;
    let rect = labelRect(x, y, anchor, labelWidth, labelHeight);
    for (let step = 1; step <= MAX_SLIDES && taken.some((t) => overlaps(rect, t)); step++) {
      y = body.y + direction * step * SLIDE_STEP;
      rect = labelRect(x, y, anchor, labelWidth, labelHeight);
    }
    labels.push({ key: body.key, x, y, anchor, rect });
    taken.push(rect);
  }

  return { bodies: placed, labels };
}

export interface MoonArc {
  /** The ring points at the band's two ends, in order of travel. */
  from: Point;
  to: Point;
  /** Degrees the Moon covered, forward along the zodiac. */
  span: number;
  /** An SVG path along the ring from one end to the other, sampled so no sweep flag can be wrong. */
  d: string;
}

/**
 * The arc the Moon travelled across the birth-time band (ADR-37): its ends are
 * its longitudes at the band's edges, on the same ring the bodies sit on. The
 * Moon never runs backwards, so the arc is always the forward way round.
 */
export function moonArc(cx: number, cy: number, ringRadius: number, frameDegree: number, band: { fromDegree: number; toDegree: number }): MoonArc {
  const span = norm360(band.toDegree - band.fromDegree);
  const steps = Math.max(1, Math.ceil(span));
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const deg = i === steps ? band.toDegree : band.fromDegree + (span * i) / steps;
    points.push(pointAt(cx, cy, ringRadius, theta(deg, frameDegree)));
  }
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  return { from: points[0], to: points[points.length - 1], span, d };
}

// ---------------------------------------------------------------------------
// The phone tier (ADR-59, review 20/09 note 1): the ring on top, the name
// under it, the triad legend, then the cue, whose stem ends clear of the
// corner text. Pure, so the stack order and the clearance can be asserted.
// ---------------------------------------------------------------------------

/** The fixed sizes of the phone stack, in CSS pixels; the component draws from the same numbers. */
export const PHONE = {
  /** The transparent top bar. */
  nav: 56,
  padTop: 12,
  gap: 14,
  /** The ring's diameter as a share of the viewport width, when the height allows it. */
  ringShare: 0.82,
  /** The ring's diameter as a share of the plate's square svg. */
  ringOfSvg: 0.82,
  eyebrow: 22,
  nameGap: 8,
  nameLineHeight: 1.08,
  legendRow: 29,
  legendGap: 7,
  legendRows: 3,
  /** Label, gap, a 56 px stem, padding. */
  cue: 92,
  /** The stem ends at the cue's bottom padding. */
  cuePad: 4,
  /** The corner text's two lines and the hud's padding, up from the viewport's bottom. */
  hudBand: 40,
  clearance: 24,
} as const;

export type PhoneStackItem = "ring" | "name" | "legend" | "cue";

export interface PhoneStackInput {
  viewportWidth: number;
  viewportHeight: number;
  nameLines: number;
  nameSize: number;
}

export interface PhoneStack {
  order: PhoneStackItem[];
  /** The plate svg's side, square. */
  svg: number;
  /** The ring's diameter. */
  ring: number;
  name: number;
  legend: number;
  cue: number;
  /** Where the cue's stem ends, from the viewport's top. */
  stemBottom: number;
  /** The corner text's top edge, from the viewport's top. */
  hudTop: number;
  clearance: number;
}

/**
 * The stack from the top: ring, name, legend, cue. The ring takes 82vw; when
 * the viewport is too short for that, the ring gives way, never the name,
 * which has already broken to its lines from its length alone.
 */
export function phoneStack(input: PhoneStackInput): PhoneStack {
  const name = PHONE.eyebrow + PHONE.nameGap + input.nameLines * input.nameSize * PHONE.nameLineHeight;
  const legend = PHONE.legendRows * PHONE.legendRow + (PHONE.legendRows - 1) * PHONE.legendGap;
  const cue = PHONE.cue;
  const hudTop = input.viewportHeight - PHONE.hudBand;
  const rest = 3 * PHONE.gap + name + legend + cue;
  const top = PHONE.nav + PHONE.padTop;
  const svgMax = hudTop - PHONE.clearance - top - rest;
  const svgWanted = (input.viewportWidth * PHONE.ringShare) / PHONE.ringOfSvg;
  const svg = Math.max(0, Math.min(svgWanted, svgMax));
  const ring = svg * PHONE.ringOfSvg;
  const stemBottom = top + svg + rest - PHONE.cuePad;
  return { order: ["ring", "name", "legend", "cue"], svg, ring, name, legend, cue, stemBottom, hudTop, clearance: hudTop - stemBottom };
}
