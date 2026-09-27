import { describe, expect, it } from "vitest";
import {
  CHART_STORED, DOOR_AT, LABELS, NATAL_SECTIONS, PAIR_SECTIONS, REPORT_EXISTS,
  creep, landed, lensChapterId, pairDoor, pairSectionIds, progressOf, realProgress, registryFor,
} from "./progress";

const done = (ids: readonly string[]): Record<string, "pending" | "done"> => Object.fromEntries(ids.map((id) => [id, "done"]));
const natal = (over: Partial<Parameters<typeof progressOf>[0]> = {}) => progressOf({
  status: "interpreting", chartReady: true, sections: {}, registry: NATAL_SECTIONS, required: ["overview", "houses"], sinceMilestoneMs: 0, ...over,
});

describe("real progress", () => {
  it("is 4 once the report exists, 10 at chartReady, then 90 ÷ n per landed section", () => {
    expect(natal({ status: "pending", chartReady: false }).real).toBe(REPORT_EXISTS);
    expect(natal({ status: "computing", chartReady: false }).real).toBe(REPORT_EXISTS);
    expect(natal().real).toBe(CHART_STORED);
    expect(realProgress(true, 1, 11)).toBeCloseTo(10 + 90 / 11, 2);
    expect(realProgress(true, 7, 11)).toBeCloseTo(10 + (90 * 7) / 11, 2);
    expect(realProgress(true, 11, 11)).toBe(100);
    expect(realProgress(true, 10, 10)).toBe(100);
    expect(realProgress(false, 0, 11, false)).toBe(0);
  });

  it("counts only the registry's sections", () => {
    expect(landed(done(["overview", "path", "houses"]), NATAL_SECTIONS)).toBe(2);
    expect(landed(done(["twoCharts", "links"]), PAIR_SECTIONS)).toBe(2);
  });
});

describe("the five labels, in order", () => {
  it("runs inputs, chart, patterns, writing, ready", () => {
    expect(natal({ status: "pending", chartReady: false }).label).toBe(LABELS.inputs);
    expect(natal({ status: "computing", chartReady: false }).label).toBe(LABELS.chart);
    expect(natal().label).toBe(LABELS.patterns);
    expect(natal({ sections: done(["overview"]) }).label).toBe(LABELS.writing);
    expect(natal({ status: "complete", sections: done(NATAL_SECTIONS) }).label).toBe(LABELS.ready);
    expect(Object.values(LABELS).every((l) => !/\d/.test(l))).toBe(true);
  });
});

describe("the door", () => {
  it("opens at 67 of real progress only once overview and houses have landed", () => {
    const seven = NATAL_SECTIONS.slice(0, 7);
    const p = natal({ sections: done(seven) });
    expect(p.real).toBeGreaterThanOrEqual(DOOR_AT);
    expect(p.door).toBe(true);
    const withoutHouses = natal({ sections: done(["overview", "triad", "mind", "career", "money", "relationships", "family"]) });
    expect(withoutHouses.real).toBeGreaterThanOrEqual(DOOR_AT);
    expect(withoutHouses.door).toBe(false);
    const six = natal({ sections: done(NATAL_SECTIONS.slice(0, 6)) });
    expect(six.real).toBeLessThan(DOOR_AT);
    expect(six.door).toBe(false);
  });

  it("never opens on the crept value", () => {
    const six = natal({ sections: done(NATAL_SECTIONS.slice(0, 6)), sinceMilestoneMs: 10 * 60 * 1000 });
    expect(six.shown).toBeGreaterThan(six.real);
    expect(six.door).toBe(false);
  });

  it("stays shut on a failed report and opens on a complete one", () => {
    expect(natal({ status: "failed", sections: done(NATAL_SECTIONS) }).door).toBe(false);
    expect(natal({ status: "complete", sections: done(NATAL_SECTIONS) }).door).toBe(true);
    expect(natal({ status: "complete", sections: done(NATAL_SECTIONS) }).complete).toBe(true);
  });
});

describe("the creep (MB-55)", () => {
  it("rises toward, and stays one point below, the next milestone", () => {
    const real = 10;
    const next = realProgress(true, 1, 11);
    expect(creep(real, next, 0)).toBe(0);
    const late = creep(real, next, 60 * 60 * 1000);
    expect(late).toBeLessThan(next - real - 1 + 1e-9);
    expect(late).toBeGreaterThan(0.95 * (next - real - 1));
    expect(creep(real, next, 20_000)).toBeLessThan(creep(real, next, 40_000));
  });

  it("is snapped by a landed section and shows below 100 until complete", () => {
    const before = natal({ sections: done(["overview"]), sinceMilestoneMs: 30_000 });
    const after = natal({ sections: done(["overview", "triad"]), sinceMilestoneMs: 0 });
    expect(after.real).toBeGreaterThan(before.shown);
    expect(after.shown).toBe(after.real);
    const ten = natal({ sections: done(NATAL_SECTIONS.slice(0, 10)), sinceMilestoneMs: 1e9 });
    expect(ten.shown).toBeLessThan(100);
    expect(natal({ status: "complete", sections: done(NATAL_SECTIONS) }).shown).toBe(100);
  });
});

describe("the registries", () => {
  it("drops houses from a blind natal registry and from its door", () => {
    const { registry, required } = registryFor("natal", "unknown");
    expect(registry.length).toBe(10);
    expect(registry).not.toContain("houses");
    expect(required).toEqual(["overview"]);
    expect(registryFor("natal", "known").registry.length).toBe(11);
  });
});

describe("the pair's registry (ADR-63)", () => {
  it("has eight sections a lens, the two charts first and the link cards last, and n = 8", () => {
    for (const lens of ["partners", "parent_child", "people"] as const) {
      const ids = pairSectionIds(lens);
      expect(ids.length).toBe(8);
      expect(ids[0]).toBe("twoCharts");
      expect(ids.slice(6)).toEqual(["whatToPractise", "links"]);
      expect(registryFor("compatibility", undefined, lens).registry).toEqual(ids);
    }
    expect(pairSectionIds("parent_child")[1]).toBe("parentChild02");
    expect(lensChapterId("people", 6)).toBe("people06");
    expect(realProgress(true, 1, 8)).toBeCloseTo(10 + 90 / 8, 2);
  });

  it("opens the door at 67 of real progress once the two charts and the lens's chapter 02 have landed", () => {
    const lens = "people" as const;
    const { registry, required } = registryFor("compatibility", undefined, lens);
    expect(required).toEqual(pairDoor(lens));
    const pair = (sections: Record<string, "pending" | "done">) => progressOf({ status: "interpreting", chartReady: true, sections, registry, required, sinceMilestoneMs: 0 });
    const six = pair(done(registry.slice(0, 6)));
    expect(six.real).toBeGreaterThanOrEqual(DOOR_AT);
    expect(six.door).toBe(true);
    const withoutTwoCharts = pair(done(registry.slice(1, 7)));
    expect(withoutTwoCharts.real).toBeGreaterThanOrEqual(DOOR_AT);
    expect(withoutTwoCharts.door).toBe(false);
    const withoutChapterTwo = pair(done(["twoCharts", ...registry.slice(2, 7)]));
    expect(withoutChapterTwo.door).toBe(false);
    const five = pair(done(registry.slice(0, 5)));
    expect(five.real).toBeLessThan(DOOR_AT);
    expect(five.door).toBe(false);
  });
});
