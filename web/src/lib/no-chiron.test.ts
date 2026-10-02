/**
 * Outside the Horizons table's 1800 to 2150 a chart has no Chiron (ADR-221), and what the web draws from a
 * chart must take that: the wheel lays out the bodies the chart has, the house cards list the ones in each
 * house, the orrery sweeps the ones it was given. The charts are the engine's own, computed here.
 */
import { describe, expect, it } from "vitest";
import { chartOf } from "@/site/lib/chart";
import { houseOccupants } from "@/lib/house-occupants";
import { assignLanes, wheelRadii } from "@/components/chart/wheel-geometry";
import { sweep, type Positions } from "@/lib/orrery";

const birth = (birthDate: string) => ({ birthDate, birthTime: "12:00", latitude: 51.4779, longitude: 0, timezoneOffset: 0 });
const CHARTS = { 1799: chartOf(birth("1799-12-31")), 2151: chartOf(birth("2151-01-01")) };
const WITHIN = chartOf(birth("1990-01-01"));

describe.each(Object.entries(CHARTS))("a %s chart", (_, chart) => {
  it("has every body but Chiron", () => {
    expect(chart.planets.chiron).toBeUndefined();
    expect(Object.keys(chart.planets)).toHaveLength(Object.keys(WITHIN.planets).length - 1);
  });

  it("puts every body it has on the wheel", () => {
    const bodies = Object.entries(chart.planets).map(([key, p]) => ({ key, absoluteDegree: p.absoluteDegree }));
    const r = wheelRadii(600);
    const placed = assignLanes(bodies, chart.angles!.ascendant.absoluteDegree, { lanes: r.lanes, node: r.node, gap: 6 });
    expect(placed.map((p) => p.key).sort()).toEqual(Object.keys(chart.planets).sort());
  });

  it("lists every body once across the twelve house cards, and Chiron in none", () => {
    const listed = Array.from({ length: 12 }, (_, i) => houseOccupants(chart, i + 1))
      .flat()
      .filter((o) => o.kind !== "angle")
      .map((o) => o.key);
    expect(listed).not.toContain("chiron");
    expect(listed.sort()).toEqual(Object.keys(chart.planets).sort());
  });

  it("sweeps the orrery with the bodies it has and invents none", () => {
    const positions: Positions = Object.fromEntries(
      Object.entries(chart.planets).map(([k, p]) => [k, { absoluteDegree: p.absoluteDegree, retrograde: p.retrograde }]),
    );
    const swept = sweep(positions, 5);
    expect(Object.keys(swept).sort()).toEqual(Object.keys(chart.planets).sort());
  });
});

it("a chart inside the span keeps its Chiron, and its house card lists it", () => {
  expect(WITHIN.planets.chiron).toBeDefined();
  const listed = Array.from({ length: 12 }, (_, i) => houseOccupants(WITHIN, i + 1)).flat().map((o) => o.key);
  expect(listed).toContain("chiron");
});
