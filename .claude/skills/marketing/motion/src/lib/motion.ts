// Timing on one clock: seconds, a 120 BPM grid, and the product's one easing for anything that settles.
export const FPS = 30;
export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const DROP = 2 * BAR;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const norm360 = (d: number) => ((d % 360) + 360) % 360;
export const arc = (from: number, to: number) => ((to - from + 540) % 360) - 180;

// cubic-bezier(.16,1,.3,1), the product's easing (web-taste), solved for x.
export function brand(u: number): number {
  u = clamp(u);
  const cx = 3 * 0.16, bx = 3 * (0.3 - 0.16) - cx, ax = 1 - cx - bx;
  const cy = 3 * 1, by = 3 * (1 - 1) - cy, ay = 1 - cy - by;
  let x = u;
  for (let i = 0; i < 8; i++) {
    const f = ((ax * x + bx) * x + cx) * x - u;
    const d = (3 * ax * x + 2 * bx) * x + cx;
    if (Math.abs(d) < 1e-6) break;
    x -= f / d;
  }
  return ((ay * x + by) * x + cy) * x;
}
export const inOut = (u: number) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2; };
export const expoIn = (u: number) => (clamp(u) === 0 ? 0 : 2 ** (10 * clamp(u) - 10));
export const quadIn = (u: number) => clamp(u) ** 2;

/** Progress of a window [a, b] at time t, eased. */
export const p = (t: number, a: number, b: number, ease: (u: number) => number = brand) => ease(clamp((t - a) / (b - a)));
/** In over [a, a+fi], out over [b-fo, b]. */
export const win = (t: number, a: number, b: number, fi = 0.35, fo = 0.35) => Math.min(p(t, a, a + fi), 1 - p(t, b - fo, b, quadIn));

/** The kick's envelope after the drop: 1 on each beat, decaying, 0 before the drop and in the gaps. */
export function kick(t: number, gaps: [number, number][] = []): number {
  if (t < DROP) return 0;
  if (gaps.some(([a, b]) => t >= a && t < b)) return 0;
  return Math.exp(-((t - DROP) % BEAT) * 9);
}

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
