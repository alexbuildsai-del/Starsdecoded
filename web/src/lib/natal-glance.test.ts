import { describe, expect, it } from "vitest";
import type { ChartData } from "@/types/chart";
import { busiestHouse, elementBalance, planetsByHouse } from "./natal-glance";

function chart(partial: Partial<ChartData>): ChartData {
  return {
    planets: {},
    horizon: { status: "known" } as ChartData["horizon"],
    elements: { fire: 0, earth: 0, air: 0, water: 0 },
    modalities: { cardinal: 0, fixed: 0, mutable: 0 },
    dominance: { dominantElement: "", dominantModality: "", dominantPlanets: [] },
    aspects: [],
    chartShape: null,
    ...partial,
  };
}

const planet = (house?: number) => ({ sign: "Aries", degree: 1, absoluteDegree: 1, retrograde: false, speed: 1, house });

describe("elementBalance", () => {
  it("names a lead only with both share and margin", () => {
    expect(elementBalance(chart({ elements: { fire: 5, earth: 2, air: 2, water: 1 } })).lead).toBe("fire");
    expect(elementBalance(chart({ elements: { fire: 4, earth: 3, air: 2, water: 1 } })).lead).toBeNull();
  });

  it("lists the empty elements", () => {
    expect(elementBalance(chart({ elements: { fire: 6, earth: 0, air: 4, water: 0 } })).missing).toEqual(["earth", "water"]);
  });

  it("reads an empty chart as spread", () => {
    expect(elementBalance(chart({})).lead).toBeNull();
  });
});

describe("planetsByHouse", () => {
  it("has no houses without a horizon", () => {
    expect(planetsByHouse(chart({ planets: { sun: planet(1) } }))).toEqual([]);
  });

  it("files the planets by house and finds the busiest", () => {
    const angles = {} as NonNullable<ChartData["angles"]>;
    const tally = planetsByHouse(chart({
      angles,
      planets: { sun: planet(10), mercury: planet(10), venus: planet(10), moon: planet(4), chiron: planet(10) },
    }));
    expect(tally).toHaveLength(12);
    expect(tally[9].bodies).toEqual(["sun", "mercury", "venus"]);
    expect(busiestHouse(tally)?.house).toBe(10);
    expect(busiestHouse(planetsByHouse(chart({ angles, planets: { sun: planet(1) } })))).toBeNull();
  });
});
