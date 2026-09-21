import { describe, expect, it } from "vitest";
import { GATHER_MAX, GATHER_SECONDS, GATHER_SHARE, gatherDone, gatherFrame, landing, planGather } from "./gather";

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
    const angles = plan.moves.map((m) => { const to = landing(m, ring); return Math.atan2(to.y - ring.cy, to.x - ring.cx); });
    const quadrants = new Set(angles.map((a) => Math.floor(((a + Math.PI) / (Math.PI * 2)) * 4)));
    expect(quadrants.size).toBe(4);
  });

  it("keeps a landed star as an angle and a radius, so a moved or resized ring takes it along without re-planning", () => {
    const plan = planGather(field(130), ring, fixed);
    const moved = { cx: 195, cy: 300, r: 160 };
    for (const p of gatherFrame(plan, GATHER_SECONDS, moved)) {
      expect(Math.abs(Math.hypot(p.x - moved.cx, p.y - moved.cy) - moved.r)).toBeLessThanOrEqual(1.5 * (moved.r / ring.r) + 0.01);
    }
    const before = gatherFrame(plan, GATHER_SECONDS);
    const after = gatherFrame(plan, GATHER_SECONDS, moved);
    // The same stars, in the same order round the ring, at the same angles.
    before.forEach((p, i) => {
      const a = Math.atan2(p.y - ring.cy, p.x - ring.cx);
      const b = Math.atan2(after[i].y - moved.cy, after[i].x - moved.cx);
      expect(b).toBeCloseTo(a, 6);
      expect(after[i].index).toBe(p.index);
    });
  });

  it("is planned once: a second plan from the same frame is a no-op for the loop", () => {
    const stars = field(80);
    const a = planGather(stars, ring, fixed);
    const b = planGather(stars, ring, fixed);
    expect(b.moves).toEqual(a.moves);
  });
});
