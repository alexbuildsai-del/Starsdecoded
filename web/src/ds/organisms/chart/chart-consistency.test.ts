/**
 * The chart stays one chart (design-system Scope 8, ADR-273: the Owner asked). For every committed fixture, in every
 * state and at four plate sizes, the scene is built without a browser and checked against facts written here by hand:
 * the ChartStates table and the engine's own longitudes. Nothing below reads the part's own rules back to it.
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateNatalChart } from "@workspace/engine";
import type { ChartData } from "@/types/chart";
import { theta, wheelRadii } from "@/components/chart/wheel-geometry";
import { CHART_STATES, type ChartState } from "@/ds/organisms/chart/states";
import { buildScene, type Scene } from "@/ds/organisms/chart/scene";

const DIR = new URL("../../../../../fixtures/charts/", import.meta.url);

const FIXTURES: Record<string, ChartData> = Object.fromEntries(
  readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const b = JSON.parse(readFileSync(new URL(f, DIR), "utf8"));
      const chart = calculateNatalChart(
        b.birthDate, b.birthTime, b.latitude, b.longitude, b.timezone ?? b.timezoneOffset, b.birthTimeWindowMinutes ?? 0,
      ) as unknown as ChartData;
      return [f.replace(/\.json$/, ""), chart];
    }),
);

const SIZES = [92, 150, 200, 600];

/** The ChartStates table, typed by hand. A number is "from this many pixels"; true is on, false off, "some" is a subset. */
type Cell = boolean | "some" | number;
type Row = "slices" | "names" | "ticks" | "houses" | "words" | "planets" | "points" | "r" | "lines" | "horizon" | "lit" | "guest";

const TABLE: Record<ChartState, Record<Row, Cell>> = {
  full:              { slices: true, names: true, ticks: true, houses: true, words: true, planets: true, points: true, r: true, lines: true, horizon: true, lit: false, guest: false },
  focus:             { slices: true, names: true, ticks: true, houses: true, words: true, planets: true, points: "some", r: "some", lines: "some", horizon: true, lit: true, guest: false },
  "sun-moon-rising": { slices: true, names: 200, ticks: false, houses: false, words: false, planets: "some", points: false, r: false, lines: false, horizon: true, lit: false, guest: false },
  small:             { slices: true, names: false, ticks: false, houses: true, words: false, planets: "some", points: false, r: false, lines: false, horizon: true, lit: true, guest: false },
  pair:              { slices: true, names: 150, ticks: 150, houses: false, words: false, planets: true, points: false, r: false, lines: false, horizon: false, lit: true, guest: true },
  teach:             { slices: true, names: true, ticks: false, houses: "some", words: "some", planets: "some", points: false, r: false, lines: false, horizon: "some", lit: true, guest: false },
  build:             { slices: true, names: true, ticks: true, houses: true, words: true, planets: true, points: true, r: true, lines: true, horizon: true, lit: false, guest: false },
  "no-birth-time":   { slices: true, names: true, ticks: true, houses: false, words: false, planets: true, points: true, r: true, lines: "some", horizon: false, lit: false, guest: false },
  "live-sky":        { slices: true, names: true, ticks: true, houses: true, words: true, planets: true, points: true, r: true, lines: true, horizon: true, lit: false, guest: false },
};

/** The scene's layer ids for each table row; the horizon row is two layers (the line and the rising marker). */
const IDS: Record<Row, string[]> = {
  slices: ["sign-slices"], names: ["sign-names"], ticks: ["ticks"], houses: ["houses"], words: ["house-words"],
  planets: ["planets"], points: ["points"], r: ["retrograde"], lines: ["lines"], horizon: ["horizon", "rising-marker"],
  lit: ["lit"], guest: ["guest"],
};

/** Rows a chart with no recorded birth time never draws, in any state. */
const NEEDS_HORIZON: Row[] = ["houses", "words", "horizon"];

function drawn(scene: Scene, id: string): boolean {
  return scene.layers.some((l) => l.id === id);
}

function expectedOn(state: ChartState, row: Row, size: number, timed: boolean): boolean {
  if (!timed && NEEDS_HORIZON.includes(row)) return false;
  const cell = TABLE[state][row];
  if (typeof cell === "number") return size >= cell;
  return cell !== false;
}

function frameOf(chart: ChartData): number {
  return chart.angles?.ascendant.absoluteDegree ?? 0;
}

function bodiesOf(scene: Scene) {
  return scene.layers.flatMap((l) => (l.id === "planets" || l.id === "points" ? l.bodies : []));
}

const NAMES = Object.keys(FIXTURES);

describe("chart consistency: fixtures", () => {
  it("reads every committed chart fixture", () => {
    expect(NAMES.length).toBeGreaterThanOrEqual(10);
    expect(NAMES).toContain("marie-curie-unknown");
  });
});

describe.each(NAMES)("chart consistency: %s", (name) => {
  const chart = FIXTURES[name];
  const timed = chart.angles !== undefined;
  const frame = frameOf(chart);

  it("puts every body at theta(longitude) on a lane of wheelRadii(S), in every state", () => {
    for (const state of CHART_STATES) {
      for (const size of SIZES) {
        const scene = buildScene(chart, state, size);
        const lanes = wheelRadii(size).lanes;
        for (const b of bodiesOf(scene)) {
          const longitude = chart.planets[b.id].absoluteDegree;
          expect(b.angle, `${state} ${size} ${b.id}`).toBeCloseTo(theta(longitude, frame), 6);
          const onRing = lanes.some((r) => Math.abs(r - b.radius) < 1e-6);
          expect(onRing, `${state} ${size} ${b.id} radius ${b.radius}`).toBe(true);
        }
      }
    }
  });

  it("gives the same body the same angle in every state and at every size", () => {
    const seen = new Map<string, number>();
    for (const state of CHART_STATES) {
      for (const size of SIZES) {
        for (const b of bodiesOf(buildScene(chart, state, size))) {
          const first = seen.get(b.id);
          if (first === undefined) seen.set(b.id, b.angle);
          else expect(b.angle, `${state} ${size} ${b.id}`).toBeCloseTo(first, 6);
        }
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it("draws the layers the ChartStates table gives each state", () => {
    for (const state of CHART_STATES) {
      for (const size of SIZES) {
        const scene = buildScene(chart, state, size);
        for (const row of Object.keys(IDS) as Row[]) {
          const want = expectedOn(state, row, size, timed);
          for (const id of IDS[row]) {
            // The table's Horizon row is one row for the line and the rising marker.
            expect(drawn(scene, id), `${state} ${size} layer ${id}`).toBe(want);
          }
        }
      }
    }
  });

  it("draws only the Sun and Moon in Sun, Moon and rising", () => {
    const ids = bodiesOf(buildScene(chart, "sun-moon-rising", 104)).map((b) => b.id).sort();
    expect(ids).toEqual(["moon", "sun"]);
  });

  it("shows R exactly for the bodies the engine marks backwards", () => {
    for (const state of CHART_STATES) {
      for (const size of SIZES) {
        const scene = buildScene(chart, state, size);
        const bodies = bodiesOf(scene);
        for (const b of bodies) expect(b.retrograde, `${state} ${size} ${b.id}`).toBe(chart.planets[b.id].retrograde === true);
        const layer = scene.layers.find((l) => l.id === "retrograde");
        if (!layer || layer.id !== "retrograde") continue;
        const engine = bodies.filter((b) => chart.planets[b.id].retrograde === true).map((b) => b.id).sort();
        expect([...layer.ids].sort(), `${state} ${size}`).toEqual(engine);
      }
    }
  });

  it("frames the plate on the rising sign, or on Aries at 9 o'clock with no birth time", () => {
    for (const state of CHART_STATES) {
      const scene = buildScene(chart, state, 600);
      expect(scene.timed).toBe(timed);
      const slices = scene.layers.find((l) => l.id === "sign-slices");
      if (!slices || slices.id !== "sign-slices") throw new Error(`no sign slices in ${state}`);
      expect(slices.signs[0].from).toBeCloseTo(180, 6);
      if (!timed) expect(slices.signs[0].sign).toBe("Aries");
    }
  });

  if (!timed) {
    it("drops the houses, the horizon and the rising sign in every state", () => {
      for (const state of CHART_STATES) {
        for (const size of SIZES) {
          const scene = buildScene(chart, state, size);
          for (const id of ["houses", "house-words", "horizon", "rising-marker"]) {
            expect(drawn(scene, id), `${state} ${size} ${id}`).toBe(false);
          }
          for (const b of bodiesOf(scene)) expect(b.house, `${state} ${size} ${b.id}`).toBeUndefined();
        }
      }
    });

    it("leaves the Moon's lines out", () => {
      for (const size of SIZES) {
        const lines = buildScene(chart, "full", size).layers.find((l) => l.id === "lines");
        if (!lines || lines.id !== "lines") continue;
        for (const l of lines.lines) {
          expect(l.a).not.toBe("moon");
          expect(l.b).not.toBe("moon");
        }
      }
    });
  }
});
