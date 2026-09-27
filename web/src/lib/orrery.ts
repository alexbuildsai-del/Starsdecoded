/**
 * The wheel is the sky (ADR-47): a geocentric orrery, every body on its own
 * ring in order of distance from Earth, moving at its mean daily motion at
 * one second to eight days, retrogrades running backwards, the nodes on the
 * Moon's ring. When the chart arrives each body eases the last degrees onto
 * its stored place, the Moon at most eight. Pure: degrees in, degrees out.
 */

export const RINGS = [
  "moon", "mercury", "venus", "sun", "mars", "jupiter", "saturn", "chiron", "uranus", "neptune", "pluto",
] as const;
export type RingBody = (typeof RINGS)[number];

/** Mean daily motion in degrees; the nodes regress. */
export const MEAN_MOTION: Record<string, number> = {
  moon: 13.176, mercury: 4.092, venus: 1.602, sun: 0.9856, mars: 0.524, jupiter: 0.0831, saturn: 0.0335,
  chiron: 0.0193, uranus: 0.0117, neptune: 0.00598, pluto: 0.00397, north_node: -0.053, south_node: -0.053,
};

export const DAYS_PER_SECOND = 8;
/** The most the Moon travels during the settle; the rest is where it already is. */
export const MOON_SETTLE_CAP = 8;
export const SETTLE_SECONDS = 1.4;
/**
 * Once settled, the sky keeps turning over the horizon at one slow constant
 * rate, every body together, so the wheel never stands still (ADR-59). It is
 * the diurnal turn: bodies rise in the east while the horizon stays put.
 */
export const TURN_DEGREES_PER_SECOND = 1.5;

/** How far the settled sky has turned after `seconds`, in degrees along the zodiac. */
export function turnAt(seconds: number): number {
  return norm360(-Math.max(0, seconds) * TURN_DEGREES_PER_SECOND);
}

/** The ring a body sits on, 0 innermost. The nodes ride the Moon's ring. */
export function ringOf(body: string): number {
  if (body === "north_node" || body === "south_node") return 0;
  const i = (RINGS as readonly string[]).indexOf(body);
  return i < 0 ? RINGS.length - 1 : i;
}

export const norm360 = (d: number): number => ((d % 360) + 360) % 360;

/** The signed shortest way round from `from` to `to`, in (-180, 180]. */
export function shortestArc(from: number, to: number): number {
  const d = norm360(to - from);
  return d > 180 ? d - 360 : d;
}

/**
 * Where a body is after `seconds` of the sweep: forward at its mean motion,
 * backward when retrograde. The nodes are always retrograde.
 */
export function advance(degree: number, body: string, seconds: number, retrograde = false): number {
  const motion = Math.abs(MEAN_MOTION[body] ?? 0);
  const sign = retrograde || body === "north_node" || body === "south_node" ? -1 : 1;
  return norm360(degree + sign * motion * DAYS_PER_SECOND * seconds);
}

/** One slow easing for the settle and the gather alike. */
export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Where the settle starts: the stored degree less the last few degrees of
 * travel, so the body visibly arrives. Capped, so the Moon never swings more
 * than eight degrees to land.
 */
export function settleStart(current: number, target: number, body: string): number {
  const cap = body === "moon" ? MOON_SETTLE_CAP : Math.min(MOON_SETTLE_CAP, Math.abs(shortestArc(current, target)));
  const arc = shortestArc(current, target);
  const clamped = Math.max(-cap, Math.min(cap, arc));
  return norm360(target - clamped);
}

/** The body's degree at settle progress t, easing from its start onto its target. */
export function settleAt(start: number, target: number, t: number): number {
  return norm360(start + shortestArc(start, target) * easeInOutCubic(t));
}

/** The provisional or stored positions the orrery runs from. */
export type Positions = Record<string, { absoluteDegree: number; retrograde: boolean }>;

export interface OrreryFrame {
  /** Body to degree, every ring body and the two nodes. */
  degrees: Record<string, number>;
  /** Which way the wheel turns: the Ascendant's sign at the left once the chart exists. */
  ascendant: number | null;
}

/** The whole sweep for `seconds` from a starting set of positions. */
export function sweep(positions: Positions, seconds: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [body, p] of Object.entries(positions)) out[body] = advance(p.absoluteDegree, body, seconds, p.retrograde);
  return out;
}
