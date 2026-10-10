/** The chart is computed live through the real engine from Audrey Hepburn's fixture birth data; no placement is typed in. */
import { describe, expect, it } from "vitest";
import { calculateNatalChart } from "@workspace/engine";
import audrey from "../../../../fixtures/charts/audrey-hepburn.json";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { PLANET_LABELS, type ChartData } from "@/types/chart";
import { HOUSE_NUMBERS, goesBackwards } from "@/lib/house-deck";
import { houseOccupants, midheavenHouse } from "@/lib/house-occupants";
import { houseOf } from "@/components/chart/wheel-geometry";
import { chartRuler, planetRow } from "./HouseCard";

const drawn = calculateNatalChart(
  audrey.birthDate, audrey.birthTime, audrey.latitude, audrey.longitude, audrey.timezone, 0,
) as unknown as ChartData;
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

describe("the planet row on each house card (RP51, restored)", () => {
  const asc = drawn.angles!.ascendant.absoluteDegree;
  const rows = HOUSE_NUMBERS.map((h) => planetRow(houseOccupants(drawn, h)));

  it("lists each body the wheel draws on the card of the house the wheel draws it in, and on no other", () => {
    const bodies = Object.entries(drawn.planets);
    expect(bodies.length).toBeGreaterThanOrEqual(13);
    for (const [key, p] of bodies) {
      const onWheel = houseOf(p.absoluteDegree, asc);
      const cards = HOUSE_NUMBERS.filter((h) => rows[h - 1].some((m) => m.key === key));
      expect(cards, key).toEqual([onWheel]);
    }
  });

  it("carries the Ascendant on the 1st and the Midheaven on its own house", () => {
    expect(rows[0].find((m) => m.key === "ascendant")?.look).toBe("angle");
    expect(rows[midheavenHouse(drawn)! - 1].find((m) => m.key === "midheaven")?.look).toBe("angle");
  });

  it("draws planets as renders and Chiron and the nodes as glyphs, named for the screen reader", () => {
    for (const m of rows.flat()) {
      if (m.look === "angle") continue;
      expect(m.look, m.key).toBe(["chiron", "north_node", "south_node"].includes(m.key) ? "glyph" : "render");
      expect(m.label).toBe(PLANET_LABELS[m.key]);
    }
  });

  it("is empty without a horizon", () => {
    expect(HOUSE_NUMBERS.every((h) => planetRow(houseOccupants(noHorizon, h)).length === 0)).toBe(true);
  });
});

describe("the R line on house cards", () => {
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
