import { describe, expect, it } from "vitest";
import { countTicked, isItemKey, itemKey, mergeWorkbook } from "./workbook";

describe("workbook keys", () => {
  it("names an item by its section, its path and its index", () => {
    expect(itemKey("career", "actions", 0)).toBe("career.actions.0");
    expect(itemKey("mind", "practice", 0)).toBe("mind.practice.0");
    expect(itemKey("superpowers", "growingEdge.actions", 2)).toBe("superpowers.growingEdge.actions.2");
    expect(itemKey("focus", "leanInto.bullets", 1)).toBe("focus.leanInto.bullets.1");
  });

  it("accepts the keys the report writes and refuses anything else", () => {
    for (const key of ["career.actions.0", "superpowers.growingEdge.actions.2", "focus.leanInto.bullets.1"]) {
      expect(isItemKey(key)).toBe(true);
    }
    for (const key of ["career", "career.actions", "career.actions.x", ".actions.0", "Career.actions.0", "career..0"]) {
      expect(isItemKey(key)).toBe(false);
    }
  });
});

describe("mergeWorkbook", () => {
  const at = "2026-09-18T10:00:00.000Z";

  it("merges shallowly and leaves untouched items alone", () => {
    expect(mergeWorkbook({ "career.actions.0": at }, { "money.actions.1": at }))
      .toEqual({ "career.actions.0": at, "money.actions.1": at });
  });

  it("removes an item on null rather than storing an empty tick", () => {
    expect(mergeWorkbook({ "career.actions.0": at }, { "career.actions.0": null })).toEqual({});
  });

  it("does not mutate the workbook it was given", () => {
    const current = { "career.actions.0": at };
    mergeWorkbook(current, { "career.actions.0": null, "mind.practice.0": at });
    expect(current).toEqual({ "career.actions.0": at });
  });

  it("counts only the keys asked about", () => {
    const w = { "career.actions.0": at, "career.actions.2": at, "money.actions.0": at };
    expect(countTicked(w, ["career.actions.0", "career.actions.1", "career.actions.2"])).toBe(2);
    expect(countTicked(w, [])).toBe(0);
  });
});
