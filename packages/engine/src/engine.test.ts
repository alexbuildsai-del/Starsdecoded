/**
 * The engine's output for Audrey Hepburn, the site's sample, and Marie Curie,
 * whose five points api's chartCalculation.test.ts checks against Meeus, pinned
 * to the hundredth of a degree the engine rounds to. A pin that moves means the
 * engine now computes differently: CHART_VERSION bumps (R-3.2) and the report
 * lab runs (R-4.4).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHART_VERSION, calculateNatalChart, hasHorizon, type AngleData, type NatalChartData } from "./index.js";

interface Fixture {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset: number;
}

function chartOf(name: string): NatalChartData {
  const f = JSON.parse(readFileSync(new URL(`../../../fixtures/charts/${name}.json`, import.meta.url), "utf8")) as Fixture;
  return calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset);
}

type Point = "sun" | "moon" | "north_node" | "ascendant" | "midheaven";

const PINS: Record<string, Partial<Record<Point, readonly [sign: string, degree: string]>>> = {
  "audrey-hepburn": { sun: ["Taurus", "13.12"], moon: ["Pisces", "6.45"], ascendant: ["Aquarius", "28.62"] },
  "marie-curie": {
    sun: ["Scorpio", "14.58"],
    moon: ["Pisces", "16.48"],
    north_node: ["Virgo", "10.97"],
    ascendant: ["Capricorn", "12.07"],
    midheaven: ["Scorpio", "18.63"],
  },
};

for (const [name, pins] of Object.entries(PINS)) {
  test(`${name}: every pinned point to the hundredth of a degree`, () => {
    const chart = chartOf(name);
    assert.ok(hasHorizon(chart), `${name} has a horizon`);
    for (const [point, pin] of Object.entries(pins) as Array<[Point, readonly [string, string]]>) {
      const at: AngleData = point === "ascendant" || point === "midheaven" ? chart.angles[point] : chart.planets[point];
      assert.equal(at.sign, pin[0], `${point} sign`);
      assert.equal(at.degree.toFixed(2), pin[1], `${point} degree`);
    }
  });
}

test("the chart version is 3, and every computed chart carries it", () => {
  assert.equal(CHART_VERSION, 3);
  assert.equal(chartOf("audrey-hepburn").chartVersion, 3);
});
