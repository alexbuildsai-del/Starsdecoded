import { describe, expect, it } from "vitest";
import { GATHER_MAX, GATHER_SECONDS, GATHER_SHARE, gatherDone, gatherFrame, planGather } from "./gather";

function field(n: number, seed = 1): Array<{ x: number; y: number }> {
  let s = seed;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  return Array.from({ length: n }, () => ({ x: rand() * 1440, y: rand() * 900 }));
}

const ring = { cx: 720, cy: 450, r: 200 };
const fixed = () => 0.5;

describe("the gather", () => {
  it("takes about 70% of the stars and never more than 150", () => {
    expect(planGather(field(130), ring, fixed).moves.length).toBe(Math.round(130 * GATHER_SHARE));
    expect(planGather(field(400), ring, fixed).moves.length).toBe(GATHER_MAX);
    expect(GATHER_SHARE).toBe(0.7);
  });

  it("lands every gathered star within a pixel and a half of the ring after 1.6 s, and keeps it there", () => {
    const plan = planGather(field(130), ring, fixed);
    for (const p of gatherFrame(plan, GATHER_SECONDS)) {
      expect(Math.abs(Math.hypot(p.x - ring.cx, p.y - ring.cy) - ring.r)).toBeLessThanOrEqual(1.5);
    }
    const later = gatherFrame(plan, 12);
    const at = gatherFrame(plan, GATHER_SECONDS);
    later.forEach((p, i) => { expect(p.x).toBeCloseTo(at[i].x, 6); expect(p.y).toBeCloseTo(at[i].y, 6); });
    expect(gatherDone(GATHER_SECONDS)).toBe(true);
    expect(gatherDone(1.0)).toBe(false);
  });

  it("starts where the star was, so nothing jumps", () => {
    const stars = field(50);
    const plan = planGather(stars, ring, fixed);
    for (const p of gatherFrame(plan, 0)) {
      expect(p.x).toBeCloseTo(stars[p.index].x, 6);
      expect(p.y).toBeCloseTo(stars[p.index].y, 6);
    }
  });

  it("spreads the landings round the whole ring rather than one arc", () => {
    const plan = planGather(field(130), ring, fixed);
    const angles = plan.moves.map((m) => Math.atan2(m.to.y - ring.cy, m.to.x - ring.cx));
    const quadrants = new Set(angles.map((a) => Math.floor(((a + Math.PI) / (Math.PI * 2)) * 4)));
    expect(quadrants.size).toBe(4);
  });

  it("is planned once: a second plan from the same frame is a no-op for the loop", () => {
    const stars = field(80);
    const a = planGather(stars, ring, fixed);
    const b = planGather(stars, ring, fixed);
    expect(b.moves).toEqual(a.moves);
  });
});
