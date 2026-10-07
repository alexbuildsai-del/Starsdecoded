/** The chart is computed live through the real engine from Audrey Hepburn's fixture birth data; no placement is typed in. */
import { describe, expect, it } from "vitest";
import { calculateNatalChart } from "@workspace/engine";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { PLANET_LABELS, type ChartData } from "@/types/chart";
import { HOUSE_NUMBERS, goesBackwards } from "@/lib/house-deck";
import { houseOccupants } from "@/lib/house-occupants";
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

describe("the R line on Audrey Hepburn's house cards", () => {
  it("sits on the 3rd, 7th and 12th, where Venus, Neptune and Saturn stand, and on no other", () => {
    const withLine = HOUSE_NUMBERS.filter((h) => houseOccupants(drawn, h).some((o) => goesBackwards(o.key, o.retrograde)));
    expect(withLine).toEqual([3, 7, 12]);
  });

  it("leaves the 4th without it, though the North Node there is marked R", () => {
    const fourth = houseOccupants(drawn, 4);
    expect(fourth.find((o) => o.key === "north_node")?.retrograde).toBe(true);
    expect(fourth.some((o) => goesBackwards(o.key, o.retrograde))).toBe(false);
  });
});
