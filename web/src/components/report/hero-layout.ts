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
import { norm360, pointAt, theta } from "@/components/chart/wheel-geometry";

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
  ascendantAbsoluteDegree: number;
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
  const { cx, cy, ringRadius, ascendantAbsoluteDegree: asc, labelWidth, labelHeight } = input;

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
