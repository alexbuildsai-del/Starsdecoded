/**
 * The small ring's one promise: the two nodes are one axis, drawn from their
 * true degrees. The longitudes are the engine's output for the committed
 * `marie-curie` fixture, the same numbers wheel-geometry.test.ts pins.
 */
import { describe, expect, it } from "vitest";
import { pointAt, theta } from "@/components/chart/wheel-geometry";

const ASC = 282.07;
const NORTH = 160.97;
const SOUTH = 340.97;
const CHIRON = 119.36;
const SIZE = 220;
const R = 78;
const C = SIZE / 2;

const at = (deg: number) => pointAt(C, C, R, theta(deg, ASC));

describe("the nodal axis", () => {
  it("puts the two nodes exactly opposite each other on the ring", () => {
    expect(Math.abs(theta(NORTH, ASC) - theta(SOUTH, ASC))).toBeCloseTo(180, 6);
    const n = at(NORTH);
    const s = at(SOUTH);
    // Opposite means the centre is their midpoint.
    expect((n.x + s.x) / 2).toBeCloseTo(C, 6);
    expect((n.y + s.y) / 2).toBeCloseTo(C, 6);
    expect(Math.hypot(n.x - s.x, n.y - s.y)).toBeCloseTo(2 * R, 6);
  });

  it("keeps every mark on the ring, Chiron included", () => {
    for (const deg of [NORTH, SOUTH, CHIRON]) {
      const p = at(deg);
      expect(Math.hypot(p.x - C, p.y - C)).toBeCloseTo(R, 6);
    }
  });
});
