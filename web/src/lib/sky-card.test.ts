/**
 * `elementLead`, `houseCells` and `busiestHouse` are exercised against the
 * seven people in the dashboard-sky artifact's element table (charlotte,
 * beatrice, charles, george, athena, audrey-hepburn, marie-curie-unknown):
 * their birth data below matches fixtures/charts/{name}.json exactly, and
 * every chart is computed here, live, through the real engine (nothing
 * pasted from the mock). Every one of the seven agreed with the artifact's
 * table when checked; had any not, the computed chart would win (R-3.1).
 */
import { describe, expect, it } from "vitest";
import { calculateNatalChart } from "../../../api/src/lib/chartCalculation";
import { busiestHouse, elementLead, houseCells, modalityLine } from "./sky-card";
import type { ChartData } from "@/types/chart";

interface FixtureBirth {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset: number;
  windowMinutes?: number;
}

const FIXTURES: Record<string, FixtureBirth> = {
  charlotte: { birthDate: "2015-05-02", birthTime: "08:34", latitude: 51.517, longitude: -0.1735, timezone: "Europe/London", timezoneOffset: 1 },
  beatrice: { birthDate: "1988-08-08", birthTime: "20:18", latitude: 51.521, longitude: -0.1445, timezone: "Europe/London", timezoneOffset: 1 },
  charles: { birthDate: "1948-11-14", birthTime: "21:14", latitude: 51.5014, longitude: -0.1419, timezone: "Europe/London", timezoneOffset: 0 },
  george: { birthDate: "2013-07-22", birthTime: "16:24", latitude: 51.517, longitude: -0.1735, timezone: "Europe/London", timezoneOffset: 1 },
  athena: { birthDate: "2025-01-22", birthTime: "12:57", latitude: 51.4846, longitude: -0.1818, timezone: "Europe/London", timezoneOffset: 0 },
  "audrey-hepburn": { birthDate: "1929-05-04", birthTime: "03:00", latitude: 50.8333, longitude: 4.3667, timezone: "Europe/Brussels", timezoneOffset: 1 },
  "marie-curie-unknown": { birthDate: "1867-11-07", birthTime: "12:00", latitude: 52.2297, longitude: 21.0122, timezoneOffset: 1.4, windowMinutes: 720 },
};

function chartFor(name: keyof typeof FIXTURES) {
  const f = FIXTURES[name];
  return calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset, f.windowMinutes ?? 0);
}

describe("elementLead", () => {
  it("names a lead at exactly 40% of ten, two clear of the next", () => {
    expect(elementLead({ fire: 4, earth: 2, air: 2, water: 2 })).toEqual({
      lead: "fire", line: "Fire leads · 4 of 10", empty: [],
    });
  });

  it("needs two clear, not just the most", () => {
    const r = elementLead({ fire: 4, earth: 3, air: 2, water: 1 });
    expect(r.lead).toBeNull();
    expect(r.line).toBe("Spread across the four");
  });

  it("needs 40%, however clear the gap", () => {
    // 7 of 20 is a wide gap over the next (5) but short of 40%.
    expect(elementLead({ fire: 7, earth: 5, air: 4, water: 4 }).lead).toBeNull();
  });

  it("never leads on an empty chart", () => {
    expect(elementLead({ fire: 0, earth: 0, air: 0, water: 0 }).lead).toBeNull();
  });

  it("names every empty element, in the elements' own order", () => {
    expect(elementLead({ fire: 0, earth: 5, air: 0, water: 5 }).empty).toEqual(["fire", "air"]);
  });

  describe("the seven fixture charts, computed live, read as the artifact's table", () => {
    const cases: Array<[keyof typeof FIXTURES, string]> = [
      ["charlotte", "Spread across the four"],
      ["beatrice", "Fire leads · 5 of 10"],
      ["charles", "Spread across the four"],
      ["george", "Water leads · 6 of 10"],
      ["athena", "Water leads · 5 of 10"],
      ["audrey-hepburn", "Spread across the four"],
      ["marie-curie-unknown", "Water leads · 6 of 10"],
    ];

    it.each(cases)("%s reads: %s", (name, expected) => {
      expect(elementLead(chartFor(name).elements).line).toBe(expected);
    });

    it("names george's missing air and athena's missing fire", () => {
      expect(elementLead(chartFor("george").elements).empty).toEqual(["air"]);
      expect(elementLead(chartFor("athena").elements).empty).toEqual(["fire"]);
      expect(elementLead(chartFor("beatrice").elements).empty).toEqual([]);
    });
  });
});

describe("modalityLine", () => {
  it("prints the three counts on one line, in order", () => {
    expect(modalityLine({ cardinal: 4, fixed: 3, mutable: 3 })).toBe("Cardinal 4 · Fixed 3 · Mutable 3");
  });

  it("matches george's computed chart", () => {
    expect(modalityLine(chartFor("george").modalities)).toBe("Cardinal 7 · Fixed 1 · Mutable 2");
  });
});

describe("houseCells", () => {
  it("stands nobody anywhere on a blind chart", () => {
    expect(houseCells(chartFor("marie-curie-unknown") as unknown as ChartData)).toEqual([]);
  });

  it("carries every house's one word, and who stands there in body order", () => {
    const cells = houseCells(chartFor("george") as unknown as ChartData);
    expect(cells).toHaveLength(12);
    expect(cells[0]).toEqual({ house: 1, word: "Self", bodies: ["saturn"] });
    expect(cells.find((c) => c.house === 3)).toEqual({ house: 3, word: "Mind", bodies: ["moon", "pluto"] });
    expect(cells.find((c) => c.house === 9)).toEqual({ house: 9, word: "Belief", bodies: ["sun", "mercury", "mars", "jupiter"] });
    expect(cells.find((c) => c.house === 2)).toEqual({ house: 2, word: "Money", bodies: [] });
  });
});

describe("busiestHouse", () => {
  it("needs three or more: george's 9th, computed live", () => {
    const cells = houseCells(chartFor("george") as unknown as ChartData);
    expect(busiestHouse(cells)).toEqual({ house: 9, count: 4, line: "4 planets in the 9th (Belief)" });
  });

  it("a second real chart: athena's 10th", () => {
    const cells = houseCells(chartFor("athena") as unknown as ChartData);
    expect(busiestHouse(cells)).toEqual({ house: 10, count: 3, line: "3 planets in the 10th (Career)" });
  });

  it("is null wherever nothing reaches three", () => {
    for (const name of ["charlotte", "beatrice", "charles", "audrey-hepburn"] as const) {
      expect(busiestHouse(houseCells(chartFor(name) as unknown as ChartData))).toBeNull();
    }
  });

  it("is null on a blind chart, which has no cells to search", () => {
    expect(busiestHouse(houseCells(chartFor("marie-curie-unknown") as unknown as ChartData))).toBeNull();
  });
});
