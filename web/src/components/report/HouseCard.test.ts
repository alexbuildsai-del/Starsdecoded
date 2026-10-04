/** The chart is computed live through the real engine from Audrey Hepburn's fixture birth data; no placement is typed in. */
import { describe, expect, it } from "vitest";
import { calculateNatalChart } from "@workspace/engine";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { PLANET_LABELS, type ChartData } from "@/types/chart";
import { chartRuler } from "./HouseCard";

const drawn = calculateNatalChart("1929-05-04", "03:00", 50.8333, 4.3667, "Europe/Brussels", 0) as unknown as ChartData;
const noHorizon = { ...drawn, angles: undefined } as ChartData;

describe("the chart ruler on the 1st house card", () => {
  it("names the planet that goes with the rising sign and where the chart puts it", () => {
    const key = TRADITIONAL_RULER[drawn.angles!.ascendant.sign];
    const planet = drawn.planets[key];
    expect(chartRuler(drawn)).toEqual({ label: PLANET_LABELS[key], sign: planet.sign, house: planet.house });
  });

  it("is nothing without a horizon", () => {
    expect(chartRuler(noHorizon)).toBeNull();
  });
});
