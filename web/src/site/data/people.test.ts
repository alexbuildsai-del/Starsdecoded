/**
 * The sample account holds invented people only, each chart computed from
 * birth data, and gives every lens its two plates (ADR-112, R-3.1).
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateNatalChart, offsetAtBirth } from "@workspace/engine";
import { LENSES } from "@/lib/lenses";
import { toChartData } from "@/site/lib/chart";
import { SAMPLE_PAIRS, SAMPLE_PEOPLE, samplePerson } from "./people";

const DIR = new URL("../../../../fixtures/sample-people/", import.meta.url);
const BIRTH_KEYS = ["name", "synthetic", "birthDate", "birthTime", "birthTimeWindowMinutes", "latitude", "longitude", "timezone", "timezoneOffset", "note"];

interface Fixture {
  name: string;
  synthetic: boolean;
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes?: number;
  latitude: number;
  longitude: number;
  timezone: string;
  timezoneOffset: number;
  note: string;
}

const fixtures: Record<string, Fixture> = Object.fromEntries(
  readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(new URL(f, DIR), "utf8")) as Fixture]),
);

describe("the sample-people fixtures", () => {
  it("are the account's people, four to six of them, one file each", () => {
    const ids = Object.keys(fixtures).sort();
    expect(ids.length).toBeGreaterThanOrEqual(4);
    expect(ids.length).toBeLessThanOrEqual(6);
    expect(SAMPLE_PEOPLE.map((p) => p.id).sort()).toEqual(ids);
  });

  it("hold a synthetic person's birth data and nothing else", () => {
    for (const [id, f] of Object.entries(fixtures)) {
      expect(f.synthetic, id).toBe(true);
      expect(f.note, id).toMatch(/^Synthetic: invented birth data, not a real person\./);
      for (const key of Object.keys(f)) expect(BIRTH_KEYS, `${id}.${key}`).toContain(key);
      expect(f.birthDate, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(f.birthTime, id).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it("keep the offset their zone had at that birth", () => {
    for (const [id, f] of Object.entries(fixtures)) {
      expect(offsetAtBirth(f.timezone, f.birthDate, f.birthTime), id).toBe(f.timezoneOffset);
    }
  });
});

describe("SAMPLE_PEOPLE", () => {
  it("computes each chart through the engine from its fixture", () => {
    for (const p of SAMPLE_PEOPLE) {
      const f = fixtures[p.id];
      const natal = calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone, f.birthTimeWindowMinutes ?? 0);
      expect(p.chart, p.id).toEqual(toChartData(natal));
      expect(p.chart, p.id).toBe(p.chart);
      expect(p.name, p.id).toBe(f.name);
      expect(p.birthDate, p.id).toBe(f.birthDate);
    }
  });

  it("opens on the account's owner and holds one person per relation", () => {
    expect(SAMPLE_PEOPLE[0].relation).toBe("self");
    const relations = SAMPLE_PEOPLE.map((p) => p.relation);
    expect(new Set(relations).size).toBe(relations.length);
  });

  it("draws the person without a birth time with no horizon, and everyone else with one", () => {
    for (const p of SAMPLE_PEOPLE) {
      const blind = (p.birth.birthTimeWindowMinutes ?? 0) === 720;
      expect(p.chart.horizon.status, p.id).toBe(blind ? "unknown" : "known");
      expect(p.chart.angles === undefined, p.id).toBe(blind);
      expect(p.chart.houses === undefined, p.id).toBe(blind);
    }
    expect(SAMPLE_PEOPLE.some((p) => p.chart.horizon.status === "unknown")).toBe(true);
  });
});

describe("SAMPLE_PAIRS", () => {
  it("gives every lens two different people of the account, the owner first", () => {
    expect(Object.keys(SAMPLE_PAIRS).sort()).toEqual(LENSES.map((l) => l.lens).sort());
    for (const [lens, [a, b]] of Object.entries(SAMPLE_PAIRS)) {
      expect(samplePerson(a)?.relation, lens).toBe("self");
      expect(samplePerson(b), lens).toBeDefined();
      expect(b, lens).not.toBe(a);
    }
  });

  it("pairs each lens with the relation it is about, the parent first under parent and child", () => {
    expect(samplePerson(SAMPLE_PAIRS.partners[1])?.relation).toBe("partner");
    expect(samplePerson(SAMPLE_PAIRS.parent_child[1])?.relation).toBe("child");
    expect(LENSES.find((l) => l.lens === "parent_child")?.roles).toEqual(["parent", "child"]);
    expect(["friend", "colleague", "parent"]).toContain(samplePerson(SAMPLE_PAIRS.people[1])?.relation);
  });
});
