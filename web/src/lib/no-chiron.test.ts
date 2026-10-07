/**
 * Outside the Horizons table's 1800 to 2150 a chart has no Chiron (ADR-221), and what the web draws from a
 * chart must take that: the wheel lays out the bodies the chart has, the house cards list the ones in each
 * house, the opening story draws the ones the chart has. The charts are the engine's own, computed here.
 */
import { describe, expect, it } from "vitest";
import { chartOf } from "@/site/lib/chart";
import { houseOccupants } from "@/lib/house-occupants";
import { assignLanes, wheelRadii } from "@/components/chart/wheel-geometry";
import { STORY_BODIES, STORY_END_S, frameAt } from "@/lib/build-story";
import type { Progress } from "@/lib/progress";

const birth = (birthDate: string) => ({ birthDate, birthTime: "12:00", latitude: 51.4779, longitude: 0, timezoneOffset: 0 });
const CHARTS = { 1799: chartOf(birth("1799-12-31")), 2151: chartOf(birth("2151-01-01")) };
const BIRTH = { lat: 51.4779, lon: 0, place: "Greenwich, United Kingdom", date: "2000-01-01", time: "12:00" };
const WRITING: Progress = { real: 30, shown: 31, label: "Writing your report", next: 40, door: false, complete: false, failed: false };
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

  it("draws every body the chart has in the story and invents none", () => {
    // The nodes are points the story leaves out, so "every body the chart has" is the story's list, kept to the chart's keys.
    const drawn = frameAt(STORY_END_S, { chart, birth: BIRTH }, WRITING).bodies.map((b) => b.key);
    expect([...drawn].sort()).toEqual(STORY_BODIES.filter((b) => chart.planets[b] !== undefined).sort());
    expect(drawn).not.toContain("chiron");
  });
});

it("a chart inside the span keeps its Chiron, and its house card lists it", () => {
  expect(WITHIN.planets.chiron).toBeDefined();
  const listed = Array.from({ length: 12 }, (_, i) => houseOccupants(WITHIN, i + 1)).flat().map((o) => o.key);
  expect(listed).toContain("chiron");
});
