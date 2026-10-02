import { describe, expect, it } from "vitest";
import { pointAt, theta } from "@/components/chart/wheel-geometry";
import { MOON_SIZE, moonDayArc } from "./TriadPlate";

const PLATE = { cx: 110, cy: 110, ring: 72 };

describe("the Moon's day arc on the triad plate", () => {
  const frame = 190;
  const moonAt = 215;

  it("clears the Moon's picture even for a band of a few degrees, which on the ring the picture would cover whole", () => {
    for (const span of [3, 6.5, 13]) {
      const band = { fromDegree: moonAt - span / 2, toDegree: moonAt + span / 2 };
      const moon = pointAt(PLATE.cx, PLATE.cy, PLATE.ring, theta(moonAt, frame));
      const arc = moonDayArc(PLATE.cx, PLATE.cy, PLATE.ring, frame, band);
      const points = [...arc.d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
      for (const p of points) expect(Math.hypot(p.x - moon.x, p.y - moon.y)).toBeGreaterThan(MOON_SIZE / 2);
    }
  });

  it("ends on the Moon's longitudes at the band's two edges and stays inside the plate", () => {
    const band = { fromDegree: 200, toDegree: 229 };
    const arc = moonDayArc(PLATE.cx, PLATE.cy, PLATE.ring, frame, band);
    const start = pointAt(PLATE.cx, PLATE.cy, Math.hypot(arc.from.x - PLATE.cx, arc.from.y - PLATE.cy), theta(band.fromDegree, frame));
    expect(arc.from.x).toBeCloseTo(start.x, 6);
    expect(arc.from.y).toBeCloseTo(start.y, 6);
    expect(arc.span).toBeCloseTo(29, 6);
    expect(Math.hypot(arc.from.x - PLATE.cx, arc.from.y - PLATE.cy)).toBeLessThan(PLATE.cx - 6);
  });
});
