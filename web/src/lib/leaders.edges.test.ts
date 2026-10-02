import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { chartOf } from "@/site/lib/chart";
import { leaders, said } from "./leaders";

const FIXTURES = fileURLToPath(new URL("../../../fixtures/charts/", import.meta.url));
const NAMES = readdirSync(FIXTURES).filter((file) => file.endsWith(".json"));

describe("leaders at the edges of a count", () => {
  it("names all four elements when all four are level, and all three modalities", () => {
    expect(leaders({ fire: 2, earth: 2, air: 2, water: 2 })).toEqual(["fire", "earth", "air", "water"]);
    expect(said(leaders({ fire: 2, earth: 2, air: 2, water: 2 }))).toBe("fire, earth, air and water");
    expect(said(leaders({ cardinal: 4, fixed: 4, mutable: 4 }))).toBe("cardinal, fixed and mutable");
  });

  it("names the one that leads by a single count, and ignores the ones below it, empty or not", () => {
    expect(leaders({ fire: 0, earth: 5, air: 4, water: 0 })).toEqual(["earth"]);
    expect(leaders({ fire: 1, earth: 0, air: 0, water: 0 })).toEqual(["fire"]);
  });

  it("keeps the order the counts were given in, not alphabetical and not by count", () => {
    expect(leaders({ water: 3, air: 3, earth: 1, fire: 3 })).toEqual(["water", "air", "fire"]);
  });

  it("names none for a count that is empty, all zero, or has no positive number in it", () => {
    expect(leaders({ fire: 0 })).toEqual([]);
    expect(leaders({ fire: -1, earth: -1 })).toEqual([]);
    expect(leaders({ fire: Number.NaN, earth: 0 })).toEqual([]);
  });

  it("does not change the counts it was given", () => {
    const counts = { fire: 3, earth: 3, air: 1, water: 0 };
    leaders(counts);
    expect(counts).toEqual({ fire: 3, earth: 3, air: 1, water: 0 });
  });

  it("joins two names with and alone, four with commas and one and, and never a comma before and", () => {
    expect(said(["fire", "earth"])).toBe("fire and earth");
    expect(said(["a", "b", "c", "d"])).toBe("a, b, c and d");
    expect(said(["a", "b", "c"])).not.toMatch(/, and/);
  });
});

describe("leaders over every fixture's computed chart", () => {
  it.each(NAMES)("%s: every leader holds the top count, none outside holds it, and the engine's one name is the first", (file) => {
    const birth = JSON.parse(readFileSync(`${FIXTURES}${file}`, "utf8"));
    const chart = chartOf({ birthTimeWindowMinutes: 0, ...birth });
    for (const [counts, dominant] of [
      [chart.elements, chart.dominance.dominantElement],
      [chart.modalities, chart.dominance.dominantModality],
    ] as const) {
      const top = Math.max(...Object.values(counts));
      const named = leaders(counts);
      expect(top, file).toBeGreaterThan(0);
      for (const key of Object.keys(counts)) expect(named.includes(key), `${file} ${key}`).toBe(counts[key as keyof typeof counts] === top);
      expect(named[0], file).toBe(dominant);
    }
  });
});
