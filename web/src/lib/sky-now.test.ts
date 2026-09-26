import { describe, expect, it } from "vitest";
import { clockLine, degreeLine, latLngLine, sunLine, tiltToAscendant, utcLine } from "@/lib/sky-now";

describe("the words around the live wheel", () => {
  it("reads the city's own clock, summer time included", () => {
    expect(clockLine(new Date("2026-09-26T18:04:00Z"), "Europe/Brussels")).toBe("26 SEP 2026 · 20:04");
    expect(clockLine(new Date("2026-01-05T23:30:00Z"), "Asia/Kolkata")).toBe("6 JAN 2026 · 05:00");
  });

  it("prints a place and an offset the way the readouts do", () => {
    expect(latLngLine(50.83, 4.33)).toBe("50.83°N 4.33°E");
    expect(latLngLine(-33.87, -70.65)).toBe("33.87°S 70.65°W");
    expect(utcLine(2)).toBe("UTC+2");
    expect(utcLine(5.5)).toBe("UTC+5:30");
    expect(utcLine(-3)).toBe("UTC-3");
  });

  it("says where the Sun is against the horizon, and nothing without one", () => {
    expect(sunLine({ sunAltitude: -16.6 })).toBe("SUN 16.6° BELOW THE HORIZON");
    expect(sunLine({ sunAltitude: 44.62 })).toBe("SUN 44.6° ABOVE THE HORIZON");
    expect(sunLine({})).toBe("");
    expect(degreeLine({ degree: 3.671, sign: "Libra" })).toBe("3.67° Libra");
  });

  it("turns the wheel by the Ascendant's degree in its sign, and not at all without a horizon", () => {
    const ascendant = { sign: "Aquarius", degree: 28.62, absoluteDegree: 328.62 };
    expect(tiltToAscendant({ angles: { ascendant, midheaven: ascendant, descendant: ascendant, ic: ascendant } })).toBeCloseTo(28.62, 5);
    expect(tiltToAscendant({})).toBe(0);
  });
});
