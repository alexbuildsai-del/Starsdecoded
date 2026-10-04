/**
 * Both charts are the engine's own output for real birth data (the
 * marie-curie fixture's longitudes, as hero-layout.test.ts pins them); the
 * blind one is the same birth with no horizon.
 */
import { describe, expect, it } from "vitest";
import { NOT_DRAWN, PAIR_COLUMNS_FROM, PAIR_DETAIL_FROM, PAIR_STACK, pairHeroLayout, pairStack } from "./pair-hero-layout";
import { triadRowsOf, triadText } from "@/lib/triad-row";
import type { ChartData } from "@/types/chart";

const planet = (sign: string, degree: number, absoluteDegree: number, house?: number) => ({ sign, degree, absoluteDegree, house, retrograde: false, speed: 1 });

const drawn = {
  planets: { sun: planet("Scorpio", 14.58, 224.58, 11), moon: planet("Pisces", 16.48, 346.48, 3) },
  angles: { ascendant: { sign: "Capricorn", degree: 12.07, absoluteDegree: 282.07 }, midheaven: { sign: "Scorpio", degree: 18.2, absoluteDegree: 228.2 }, descendant: { sign: "Cancer", degree: 12.07, absoluteDegree: 102.07 }, ic: { sign: "Taurus", degree: 18.2, absoluteDegree: 48.2 } },
} as unknown as ChartData;

const blind = { windowMinutes: 720, planets: { sun: planet("Scorpio", 14.58, 224.58), moon: { ...planet("Pisces", 16.48, 346.48), band: { fromDegree: 340.2, toDegree: 352.85 } } } } as unknown as ChartData;

const crossing = { windowMinutes: 720, planets: { sun: planet("Scorpio", 14.58, 224.58), moon: { ...planet("Pisces", 29.9, 359.9), band: { fromDegree: 355.5, toDegree: 4.25 } } } } as unknown as ChartData;

describe("the compatibility hero", () => {
  it("puts the reader's own report on the left and A when neither is theirs", () => {
    expect(pairHeroLayout({ viewportWidth: 1440, selfSide: "B" })).toMatchObject({ left: "B", right: "A" });
    expect(pairHeroLayout({ viewportWidth: 1440, selfSide: "A" })).toMatchObject({ left: "A", right: "B" });
    expect(pairHeroLayout({ viewportWidth: 390, selfSide: null })).toMatchObject({ left: "A", right: "B" });
  });

  it("reads sign and degrees on a phone, the house with its word too from 640 px up (ADR-98)", () => {
    expect(PAIR_DETAIL_FROM).toBe(640);
    expect(pairHeroLayout({ viewportWidth: 390, selfSide: null }).detail).toBe("degree");
    expect(pairHeroLayout({ viewportWidth: 640, selfSide: null }).detail).toBe("full");
    const rows = triadRowsOf(drawn);
    expect(rows.map((r) => triadText(r, true))).toEqual(["Scorpio 14.58°", "Pisces 16.48°", "Capricorn 12.07°"]);
    expect(rows.map((r) => triadText(r))).toEqual(["Scorpio 14.58° · 11th (friends)", "Pisces 16.48° · 3rd (mind)", "Capricorn 12.07° · 1st (self)"]);
  });

  it("prints no ruler on any row", () => {
    expect(triadRowsOf(drawn).map((r) => triadText(r)).join(" ")).not.toMatch(/ruled by|ruler/i);
  });

  it("shows a Moon over a rough birth time as a degree range, both signs named when it crosses one", () => {
    expect(triadText(triadRowsOf(blind)[1])).toBe("10.20° to 22.85° Pisces");
    expect(triadText(triadRowsOf(crossing)[1])).toBe("25.50° Pisces to 4.25° Aries");
  });

  it("reads Not drawn on a blind chart's Rising and never a house", () => {
    const rows = triadRowsOf(blind, { blind: NOT_DRAWN });
    expect(rows[2]).toMatchObject({ key: "rising", at: null, blind: "Not drawn" });
    expect(triadText(rows[2])).toBe("Not drawn");
    expect(triadText(rows[0])).toBe("Scorpio 14.58°");
    expect(rows.map((r) => r.house).join(" ")).not.toMatch(/\d+(st|nd|rd|th)/);
  });

  it("stacks eyebrow, columns, cue; side by side from the measured width, the stem clear of the corners", () => {
    expect(PAIR_COLUMNS_FROM).toBe(2 * 354 + 88 + 32);
    for (const [w, h] of [[390, 844], [390, 664], [768, 1024], [1440, 900]] as const) {
      const s = pairStack(w, h);
      expect(s.order).toEqual(["eyebrow", "columns", "cue"]);
      expect(s.columnsSideBySide).toBe(w >= PAIR_COLUMNS_FROM);
      expect(s.clearance).toBeGreaterThanOrEqual(PAIR_STACK.clearance);
      expect(s.stemBottom).toBeLessThan(s.hudTop);
    }
    expect(pairStack(390, 844).columnsSideBySide).toBe(false);
    expect(pairStack(1440, 900).columnsSideBySide).toBe(true);
  });
});
