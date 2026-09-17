/**
 * Pure wheel geometry. No React, no DOM, no chart fetching: every function here
 * takes degrees and returns degrees, radii or path strings, so the one promise
 * the wheel makes — a body sits at its true degree — is testable in isolation.
 */

export const SIGN_ORDER = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

export const QUADRANT_NAMES = [
  "Self · Development", "Self · Expression", "Self · Expansion", "Self · Transcendence",
] as const;

export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** The whole-sign 1st-house cusp: the start of the sign the Ascendant falls in. */
export function firstHouseCusp(ascendantAbsoluteDegree: number): number {
  return Math.floor(norm360(ascendantAbsoluteDegree) / 30) * 30;
}

/**
 * Ecliptic longitude to the wheel's polar angle, measured counter-clockwise from
 * the positive x axis. The 1st-house cusp sits at 180°, which puts the eastern
 * horizon on the left of the plate as every chart draws it.
 */
export function theta(absoluteDegree: number, ascendantAbsoluteDegree: number): number {
  return 180 + norm360(absoluteDegree - firstHouseCusp(ascendantAbsoluteDegree));
}

export function houseSign(house: number, ascendantAbsoluteDegree: number): string {
  const first = firstHouseCusp(ascendantAbsoluteDegree) / 30;
  return SIGN_ORDER[(first + house - 1) % 12];
}

export function houseOf(absoluteDegree: number, ascendantAbsoluteDegree: number): number {
  return Math.floor(norm360(absoluteDegree - firstHouseCusp(ascendantAbsoluteDegree)) / 30) + 1;
}

/** The angle opposite a given one. ChartData carries only ASC and MC. */
export function opposite(absoluteDegree: number): number {
  return norm360(absoluteDegree + 180);
}

export interface Point { x: number; y: number }

export function pointAt(cx: number, cy: number, r: number, angleDeg: number): Point {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}

export interface WheelRadii {
  centre: number;
  signOuter: number;
  signInner: number;
  tick: number;
  houseOuter: number;
  houseInner: number;
  aspect: number;
  lanes: [number, number, number];
  node: number;
}

/** Ring radii as fractions of the plate, so the wheel scales without re-tuning. */
export function wheelRadii(size: number): WheelRadii {
  return {
    centre: size / 2,
    signOuter: size * 0.478,
    signInner: size * 0.41,
    tick: size * 0.404,
    houseOuter: size * 0.2,
    houseInner: size * 0.152,
    aspect: size * 0.146,
    lanes: [size * 0.348, size * 0.29, size * 0.232],
    node: size * 0.05,
  };
}

export function wedgePath(
  cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number,
): string {
  const o0 = pointAt(cx, cy, rOuter, a0);
  const o1 = pointAt(cx, cy, rOuter, a1);
  const i1 = pointAt(cx, cy, rInner, a1);
  const i0 = pointAt(cx, cy, rInner, a0);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${o0.x.toFixed(2)} ${o0.y.toFixed(2)} A${rOuter} ${rOuter} 0 ${large} 0 ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`
    + ` L${i1.x.toFixed(2)} ${i1.y.toFixed(2)} A${rInner} ${rInner} 0 ${large} 1 ${i0.x.toFixed(2)} ${i0.y.toFixed(2)} Z`;
}

export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p0 = pointAt(cx, cy, r, a0);
  const p1 = pointAt(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A${r} ${r} 0 ${large} 0 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

/**
 * A label arc drawn in whichever direction keeps the glyphs the right way up.
 * Counter-clockwise reads upright only on the lower half of the circle.
 */
export function arcLabelPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const mid = norm360((a0 + a1) / 2);
  if (Math.sin((mid * Math.PI) / 180) < 0) return arcPath(cx, cy, r, a0, a1);
  const p0 = pointAt(cx, cy, r, a1);
  const p1 = pointAt(cx, cy, r, a0);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

export interface LadderBody {
  key: string;
  absoluteDegree: number;
}

export interface LadderPlacement {
  key: string;
  /** The body's true angle. Laddering never changes this. */
  theta: number;
  lane: number;
  radius: number;
}

export interface LadderOptions {
  lanes: readonly number[];
  /** Diameter of a body node in plate units. */
  node: number;
  /** Minimum clear space between two nodes in the same lane, in plate units. */
  gap: number;
}

/**
 * Crowding is resolved by radius, never by moving a body off its degree
 * (ADR-17). Bodies are walked in angular order and each takes the outermost
 * lane whose last occupant is far enough behind it; a body that fits nowhere
 * stays in the outer lane rather than being dropped.
 */
export function assignLanes(
  bodies: readonly LadderBody[],
  ascendantAbsoluteDegree: number,
  { lanes, node, gap }: LadderOptions,
): LadderPlacement[] {
  const ordered = bodies
    .map((b) => ({ key: b.key, theta: theta(b.absoluteDegree, ascendantAbsoluteDegree) }))
    .sort((a, b) => a.theta - b.theta);

  const lastInLane = lanes.map(() => Number.NEGATIVE_INFINITY);

  return ordered.map((b) => {
    for (let lane = 0; lane < lanes.length; lane++) {
      // The arc a node of this size occupies at this radius.
      const needed = ((node + gap) / lanes[lane]) * (180 / Math.PI);
      if (b.theta - lastInLane[lane] >= needed) {
        lastInLane[lane] = b.theta;
        return { key: b.key, theta: b.theta, lane, radius: lanes[lane] };
      }
    }
    lastInLane[0] = b.theta;
    return { key: b.key, theta: b.theta, lane: 0, radius: lanes[0] };
  });
}

/** 0 at the aspect's maximum orb, 1 at exact. Drives weight, never position. */
export function aspectStrength(orb: number, maxOrb: number): number {
  if (!(maxOrb > 0)) return 0;
  return 1 - Math.min(Math.abs(orb), maxOrb) / maxOrb;
}
