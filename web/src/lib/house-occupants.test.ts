/**
 * The longitudes are the engine's own output for the committed `marie-curie`
 * birth-data fixture, the same numbers wheel-geometry.test.ts pins.
 */
import { describe, expect, it } from "vitest";
import { houseOccupants, isQuietHouse, midheavenHouse } from "./house-occupants";
import type { ChartData, ChartPlanet } from "@/types/chart";

const LONGITUDE: Record<string, number> = {
  sun: 224.58, mercury: 246.63, venus: 235.57, mars: 239.62, jupiter: 328.01,
  saturn: 235.27, uranus: 102.73, neptune: 12.85, pluto: 45.13, moon: 346.48,
  chiron: 119.36, north_node: 160.97, south_node: 340.97,
};
const ASC = 282.07;
const MC = 228.63;

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function angle(absoluteDegree: number) {
  return {
    sign: SIGNS[Math.floor(absoluteDegree / 30)],
    degree: absoluteDegree % 30,
    absoluteDegree,
  };
}

function planet(absoluteDegree: number): ChartPlanet {
  // Whole sign: the 1st house is the Ascendant's sign and each next sign follows.
  const house = Math.floor((((absoluteDegree - Math.floor(ASC / 30) * 30) % 360) + 360) % 360 / 30) + 1;
  return { ...angle(absoluteDegree), house, retrograde: false, speed: 1 };
}

const CURIE = {
  planets: Object.fromEntries(Object.entries(LONGITUDE).map(([k, v]) => [k, planet(v)])),
  angles: { ascendant: angle(ASC), midheaven: angle(MC), descendant: angle(102.07), ic: angle(48.63) },
} as unknown as ChartData;

describe("houseOccupants", () => {
  it("puts the Ascendant on the 1st and the Midheaven on its own whole-sign house", () => {
    expect(midheavenHouse(CURIE)).toBe(11);
    expect(houseOccupants(CURIE, 1).map((o) => o.key)).toEqual(["ascendant"]);
    expect(houseOccupants(CURIE, 11).map((o) => o.key))
      .toEqual(["sun", "midheaven", "saturn", "venus", "mars"]);
  });

  it("lists the nodes and Chiron as points, not planets", () => {
    const third = houseOccupants(CURIE, 3);
    expect(third.map((o) => o.key)).toEqual(["south_node", "moon"]);
    expect(third.map((o) => o.kind)).toEqual(["point", "planet"]);
    expect(houseOccupants(CURIE, 7).map((o) => [o.key, o.kind]))
      .toEqual([["uranus", "planet"], ["chiron", "point"]]);
    expect(houseOccupants(CURIE, 9).map((o) => o.key)).toEqual(["north_node"]);
  });

  it("reports a degree in its own sign, and sorts by position round the wheel", () => {
    const eleventh = houseOccupants(CURIE, 11);
    expect(eleventh[0].degree).toBeCloseTo(14.58, 2);
    expect(eleventh.map((o) => o.absoluteDegree)).toEqual([...eleventh.map((o) => o.absoluteDegree)].sort((a, b) => a - b));
  });

  it("calls a house quiet only when nothing at all is placed in it", () => {
    expect(isQuietHouse(CURIE, 8)).toBe(true);
    expect(isQuietHouse(CURIE, 1)).toBe(false);
    expect(isQuietHouse(CURIE, 9)).toBe(false);
    const quiet = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => isQuietHouse(CURIE, h));
    expect(quiet).toEqual([6, 8, 10]);
  });
});
