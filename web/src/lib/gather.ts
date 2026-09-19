/**
 * The gather: on opening, about 70% of the stars glide to a point on the
 * hero's ring over 1.6 s on one slow easing, and stay there, so the ring is
 * made of them (ADR-47, ADR-51). Pure: the plan is chosen once, each frame is
 * arithmetic on it, and the paint loop applies the result.
 */
import { easeInOutCubic } from "@/lib/orrery";

export const GATHER_SECONDS = 1.6;
export const GATHER_SHARE = 0.7;
export const GATHER_MAX = 150;

export interface StarPoint { x: number; y: number }
export interface Ring { cx: number; cy: number; r: number }

export interface GatherPlan {
  /** Index of the star, where it started, where on the ring it lands. */
  moves: Array<{ index: number; from: StarPoint; to: StarPoint }>;
  ring: Ring;
}

/**
 * Which stars go and where. The nearest 70% by distance are chosen, so the
 * motion reads as the field drawing in rather than stars crossing the screen,
 * and the landing points are spread evenly round the ring with a little
 * jitter so the ring reads as stars and not as a dotted line.
 */
export function planGather(stars: StarPoint[], ring: Ring, random: () => number = Math.random): GatherPlan {
  const count = Math.min(GATHER_MAX, Math.round(stars.length * GATHER_SHARE));
  const byDistance = stars
    .map((s, index) => ({ index, s, d: Math.hypot(s.x - ring.cx, s.y - ring.cy) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count);
  const moves = byDistance.map(({ index, s }, i) => {
    const angle = ((i + random() * 0.6) / Math.max(1, count)) * Math.PI * 2;
    const radius = ring.r + (random() - 0.5) * 2.5;
    return { index, from: { x: s.x, y: s.y }, to: { x: ring.cx + radius * Math.cos(angle), y: ring.cy + radius * Math.sin(angle) } };
  });
  return { moves, ring };
}

/** Where every gathered star is at `seconds` into the gather. After 1.6 s they are on the ring and stay. */
export function gatherFrame(plan: GatherPlan, seconds: number): Array<{ index: number; x: number; y: number }> {
  const t = easeInOutCubic(seconds / GATHER_SECONDS);
  return plan.moves.map((m) => ({ index: m.index, x: m.from.x + (m.to.x - m.from.x) * t, y: m.from.y + (m.to.y - m.from.y) * t }));
}

export function gatherDone(seconds: number): boolean {
  return seconds >= GATHER_SECONDS;
}
