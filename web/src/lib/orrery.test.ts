import { describe, expect, it } from "vitest";
import {
  DAYS_PER_SECOND, MEAN_MOTION, MOON_SETTLE_CAP, RINGS, TURN_DEGREES_PER_SECOND,
  advance, ringOf, settleAt, settleStart, shortestArc, sweep, turnAt,
} from "./orrery";

describe("the orrery's rings", () => {
  it("run outward Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, Chiron, Uranus, Neptune, Pluto", () => {
    expect(RINGS).toEqual(["moon", "mercury", "venus", "sun", "mars", "jupiter", "saturn", "chiron", "uranus", "neptune", "pluto"]);
    expect(RINGS.map(ringOf)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("put the nodes on the Moon's ring", () => {
    expect(ringOf("north_node")).toBe(0);
    expect(ringOf("south_node")).toBe(0);
  });
});

describe("mean daily motion", () => {
  it("is pinned for the eleven bodies and the nodes", () => {
    expect(MEAN_MOTION.moon).toBe(13.176);
    expect(MEAN_MOTION.mercury).toBe(4.092);
    expect(MEAN_MOTION.venus).toBe(1.602);
    expect(MEAN_MOTION.sun).toBe(0.9856);
    expect(MEAN_MOTION.mars).toBe(0.524);
    expect(MEAN_MOTION.jupiter).toBe(0.0831);
    expect(MEAN_MOTION.saturn).toBe(0.0335);
    expect(MEAN_MOTION.chiron).toBe(0.0193);
    expect(MEAN_MOTION.uranus).toBe(0.0117);
    expect(MEAN_MOTION.neptune).toBe(0.00598);
    expect(MEAN_MOTION.pluto).toBe(0.00397);
    expect(MEAN_MOTION.north_node).toBe(-0.053);
  });

  it("moves at one second to eight days, so the Moon covers 105.4° a second and Saturn barely moves", () => {
    expect(DAYS_PER_SECOND).toBe(8);
    expect(advance(0, "moon", 1)).toBeCloseTo(13.176 * 8, 6);
    expect(advance(0, "sun", 1)).toBeCloseTo(0.9856 * 8, 6);
    expect(advance(0, "saturn", 10)).toBeCloseTo(0.0335 * 80, 6);
    expect(advance(350, "moon", 1)).toBeCloseTo((350 + 105.408) % 360, 6);
  });

  it("runs a retrograde body backwards and the nodes always backwards", () => {
    expect(advance(100, "mars", 1, true)).toBeCloseTo(100 - 0.524 * 8, 6);
    expect(advance(100, "north_node", 1)).toBeCloseTo(100 - 0.053 * 8, 6);
    expect(advance(100, "south_node", 1, false)).toBeLessThan(100);
    const s = sweep({ moon: { absoluteDegree: 10, retrograde: false }, mars: { absoluteDegree: 200, retrograde: true } }, 2);
    expect(s.moon).toBeCloseTo(10 + 13.176 * 16, 6);
    expect(s.mars).toBeCloseTo(200 - 0.524 * 16, 6);
  });
});

describe("the settle", () => {
  it("eases each body onto its stored degree", () => {
    const start = settleStart(120, 123, "mars");
    expect(settleAt(start, 123, 0)).toBeCloseTo(start, 6);
    expect(settleAt(start, 123, 1)).toBeCloseTo(123, 6);
    expect(shortestArc(settleAt(start, 123, 0.5), 123)).toBeLessThan(shortestArc(start, 123));
  });

  it("caps the Moon at eight degrees of travel and lands exactly", () => {
    expect(MOON_SETTLE_CAP).toBe(8);
    const far = settleStart(0, 200, "moon");
    expect(Math.abs(shortestArc(far, 200))).toBeCloseTo(8, 6);
    expect(settleAt(far, 200, 1)).toBeCloseTo(200, 6);
    const near = settleStart(198, 200, "moon");
    expect(Math.abs(shortestArc(near, 200))).toBeCloseTo(2, 6);
  });

  it("takes the shorter way round the zero", () => {
    expect(shortestArc(350, 10)).toBe(20);
    expect(shortestArc(10, 350)).toBe(-20);
    expect(settleAt(355, 3, 1)).toBeCloseTo(3, 6);
  });
});

describe("the turn after the settle", () => {
  it("moves the whole sky at one slow constant rate and never stands still", () => {
    expect(TURN_DEGREES_PER_SECOND).toBe(1.5);
    expect(turnAt(0)).toBe(0);
    expect(turnAt(10)).toBeCloseTo(360 - 15, 6);
    expect(turnAt(20) - turnAt(10)).toBeCloseTo(-15, 6);
    expect(turnAt(1)).not.toBe(turnAt(2));
  });
});
