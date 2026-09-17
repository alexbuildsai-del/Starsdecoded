/**
 * The wheel's one promise, asserted rather than eyeballed: a body's angle comes
 * from its longitude and nothing else. The longitudes below are the engine's
 * own output for the committed `marie-curie` birth-data fixture (Warsaw,
 * 1867-11-07 12:00 LMT), not hand-written positions.
 */
import { describe, expect, it } from "vitest";
import {
  assignLanes, firstHouseCusp, houseOf, houseSign, norm360, opposite, theta, wheelRadii,
} from "@/components/chart/wheel-geometry";

const MARIE_CURIE = {
  ascendant: 282.07,
  midheaven: 228.63,
  planets: {
    sun: 224.58,
    mercury: 246.63,
    venus: 235.57,
    mars: 239.62,
    jupiter: 328.01,
    saturn: 235.27,
    uranus: 102.73,
    neptune: 12.85,
    pluto: 45.13,
    moon: 346.48,
    chiron: 119.36,
    north_node: 160.97,
    south_node: 340.97,
  },
};

const ASC = MARIE_CURIE.ascendant;

describe("theta", () => {
  it("puts the 1st-house cusp on the left of the plate", () => {
    expect(theta(firstHouseCusp(ASC), ASC)).toBe(180);
  });

  it("places the Ascendant at its offset into its own sign", () => {
    // 12.07° Capricorn, so 12.07° past the cusp at 180°.
    expect(theta(ASC, ASC)).toBeCloseTo(192.07, 5);
  });

  it("places the Sun on the radius through 14.58 degrees of Scorpio", () => {
    // Scorpio starts at 210°; the cusp of the 1st is 270°, so the Sun's
    // 224.58° is 314.58° round the wheel from it.
    expect(theta(MARIE_CURIE.planets.sun, ASC)).toBeCloseTo(180 + 314.58, 5);
  });

  it("is stable under whole turns of the input", () => {
    for (const body of Object.values(MARIE_CURIE.planets)) {
      expect(theta(body + 360, ASC)).toBeCloseTo(theta(body, ASC), 10);
      expect(theta(body - 720, ASC)).toBeCloseTo(theta(body, ASC), 10);
    }
  });
});

describe("whole-sign houses", () => {
  it("starts the 1st house at the Ascendant's sign", () => {
    expect(houseSign(1, ASC)).toBe("Capricorn");
    expect(houseSign(10, ASC)).toBe("Libra");
    expect(houseSign(11, ASC)).toBe("Scorpio");
  });

  it("puts the Scorpio stellium in the 11th", () => {
    for (const body of ["sun", "venus", "mars", "saturn"] as const) {
      expect(houseOf(MARIE_CURIE.planets[body], ASC)).toBe(11);
    }
  });

  it("derives the angles ChartData does not carry", () => {
    expect(opposite(ASC)).toBeCloseTo(102.07, 5);
    expect(opposite(MARIE_CURIE.midheaven)).toBeCloseTo(48.63, 5);
    expect(norm360(opposite(opposite(ASC)))).toBeCloseTo(ASC, 5);
  });
});

describe("assignLanes", () => {
  const radii = wheelRadii(600);
  const bodies = Object.entries(MARIE_CURIE.planets)
    .map(([key, absoluteDegree]) => ({ key, absoluteDegree }));
  const options = { lanes: radii.lanes, node: radii.node, gap: 6 };
  const placed = assignLanes(bodies, ASC, options);

  it("keeps every body", () => {
    expect(placed).toHaveLength(bodies.length);
    expect(new Set(placed.map((p) => p.key))).toEqual(new Set(bodies.map((b) => b.key)));
  });

  it("changes radius and never angle", () => {
    for (const p of placed) {
      const source = MARIE_CURIE.planets[p.key as keyof typeof MARIE_CURIE.planets];
      expect(p.theta).toBeCloseTo(theta(source, ASC), 10);
      expect(p.radius).toBe(radii.lanes[p.lane]);
    }
  });

  it("separates the four-body Scorpio stellium instead of stacking it", () => {
    const stellium = placed.filter((p) => ["sun", "venus", "mars", "saturn"].includes(p.key));
    expect(stellium).toHaveLength(4);
    // Four distinct degrees, and no two of them share a lane at this spacing.
    expect(new Set(stellium.map((p) => p.theta)).size).toBe(4);
    const crowded = stellium.filter((p) => p.key !== "sun");
    expect(new Set(crowded.map((p) => p.lane)).size).toBe(crowded.length);
  });

  it("uses an inner lane only when the outer one is occupied", () => {
    const wideOpen = assignLanes(
      [{ key: "a", absoluteDegree: 0 }, { key: "b", absoluteDegree: 120 }, { key: "c", absoluteDegree: 240 }],
      ASC,
      options,
    );
    expect(wideOpen.every((p) => p.lane === 0)).toBe(true);
  });

  it("never drops a body when every lane is full", () => {
    const pileUp = Array.from({ length: 8 }, (_, i) => ({ key: `b${i}`, absoluteDegree: 200 + i * 0.05 }));
    const result = assignLanes(pileUp, ASC, options);
    expect(result).toHaveLength(8);
    for (const p of result) {
      expect(p.lane).toBeGreaterThanOrEqual(0);
      expect(p.lane).toBeLessThan(options.lanes.length);
    }
  });
});
