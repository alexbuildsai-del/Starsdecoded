import { describe, expect, it } from "vitest";
import { chartOf } from "@/site/lib/chart";
import fixture from "../../../fixtures/charts/audrey-hepburn.json";
import { leaders, said } from "./leaders";

describe("leaders", () => {
  it("names the one key that leads, as the dominance does", () => {
    expect(leaders({ fire: 4, earth: 3, air: 2, water: 1 })).toEqual(["fire"]);
    expect(said(["fire"])).toBe("fire");
  });

  it("names every key sharing the top count, in the counts' order", () => {
    expect(leaders({ fire: 3, earth: 3, air: 1, water: 3 })).toEqual(["fire", "earth", "water"]);
    expect(said(["fire", "earth", "water"])).toBe("fire, earth and water");
    expect(said(["cardinal", "mutable"])).toBe("cardinal and mutable");
  });

  it("names none when nothing was counted", () => {
    expect(leaders({ fire: 0, earth: 0 })).toEqual([]);
    expect(leaders({})).toEqual([]);
    expect(said([])).toBe("");
  });

  it("reads Audrey Hepburn's chart, computed from her birth, as fire, earth and water level", () => {
    const chart = chartOf({ ...fixture, birthTimeWindowMinutes: 0 });
    expect(leaders(chart.elements)).toEqual(["fire", "earth", "water"]);
    expect(chart.dominance.dominantElement).toBe("fire");
  });
});
