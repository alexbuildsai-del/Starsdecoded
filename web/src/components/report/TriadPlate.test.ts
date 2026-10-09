import { describe, expect, it } from "vitest";
import { pointAt } from "@/components/chart/wheel-geometry";
import { chartOf } from "@/site/lib/chart";
import { CONJUNCTION_DEGREES, heroTheta, separation } from "./hero-layout";
import { MOON_SIZE, moonDayArc, triadBodies } from "./TriadPlate";

const PLATE = { cx: 110, cy: 110, ring: 72, side: 220 };

/**
 * 11 August 1999 in London, the day of the total eclipse, on every hour: the Sun stays within 12° of the Moon all day
 * while every sign rises in turn, so the Sun comes near each edge of the plate. Then the same day with the time not
 * known, which frames the plate on 0° Aries. The engine computes each chart from the birth data here.
 */
const LONDON = { birthDate: "1999-08-11", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London", timezoneOffset: 1 };
const ECLIPSE_DAY = [
  ...Array.from({ length: 24 }, (_, hour) => chartOf({ ...LONDON, birthTime: `${String(hour).padStart(2, "0")}:10` })),
  chartOf({ ...LONDON, birthTime: "12:00", birthTimeWindowMinutes: 720 }),
];

describe("a Sun within 12° of the Moon on the triad plate (MB-171)", () => {
  it("steps outside the ring along its own spoke and stays on the 220-unit plate, with the Moon on the ring", () => {
    for (const chart of ECLIPSE_DAY) {
      const { sun, moon } = chart.planets;
      expect(separation(sun.absoluteDegree, moon.absoluteDegree)).toBeLessThan(CONJUNCTION_DEGREES);
      const frame = chart.angles?.ascendant.absoluteDegree ?? 0;
      const placed = triadBodies(chart);
      const s = placed.find((b) => b.key === "sun")!;
      const m = placed.find((b) => b.key === "moon")!;
      const reach = Math.hypot(s.x - PLATE.cx, s.y - PLATE.cy);
      const spoke = pointAt(PLATE.cx, PLATE.cy, reach, heroTheta(sun.absoluteDegree, frame, "degree"));
      expect(s.outside).toBe(true);
      expect(reach).toBeGreaterThan(PLATE.ring);
      expect(s.x).toBeCloseTo(spoke.x, 6);
      expect(s.y).toBeCloseTo(spoke.y, 6);
      expect(Math.min(s.x, s.y) - s.size / 2).toBeGreaterThanOrEqual(0);
      expect(Math.max(s.x, s.y) + s.size / 2).toBeLessThanOrEqual(PLATE.side);
      expect(Math.hypot(m.x - PLATE.cx, m.y - PLATE.cy)).toBeCloseTo(PLATE.ring, 6);
    }
  });
});

describe("the Moon's day arc on the triad plate", () => {
  const frame = 190;
  const moonAt = 215;

  it("clears the Moon's picture even for a band of a few degrees, which on the ring the picture would cover whole", () => {
    for (const span of [3, 6.5, 13]) {
      const band = { fromDegree: moonAt - span / 2, toDegree: moonAt + span / 2 };
      const moon = pointAt(PLATE.cx, PLATE.cy, PLATE.ring, heroTheta(moonAt, frame, "degree"));
      const arc = moonDayArc(PLATE.cx, PLATE.cy, PLATE.ring, frame, band);
      const points = [...arc.d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
      for (const p of points) expect(Math.hypot(p.x - moon.x, p.y - moon.y)).toBeGreaterThan(MOON_SIZE / 2);
    }
  });

  it("ends on the Moon's longitudes at the band's two edges and stays inside the plate", () => {
    const band = { fromDegree: 200, toDegree: 229 };
    const arc = moonDayArc(PLATE.cx, PLATE.cy, PLATE.ring, frame, band);
    const start = pointAt(PLATE.cx, PLATE.cy, Math.hypot(arc.from.x - PLATE.cx, arc.from.y - PLATE.cy), heroTheta(band.fromDegree, frame, "degree"));
    expect(arc.from.x).toBeCloseTo(start.x, 6);
    expect(arc.from.y).toBeCloseTo(start.y, 6);
    expect(arc.span).toBeCloseTo(29, 6);
    expect(Math.hypot(arc.from.x - PLATE.cx, arc.from.y - PLATE.cy)).toBeLessThan(PLATE.cx - 6);
  });
});
