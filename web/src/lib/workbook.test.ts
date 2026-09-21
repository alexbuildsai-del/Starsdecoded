import { describe, expect, it } from "vitest";
import { isItemKey, itemKey, mergeWorkbook, togglePatch } from "./workbook";

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

});

describe("togglePatch (ADR-48)", () => {
  const at = new Date("2026-09-19T10:00:00.000Z");

  it("sends null for a ticked key and an ISO date for an unticked one, in both orders on one store", () => {
    let store = {};
    const tick = togglePatch(store, "career.actions.0", at);
    expect(tick).toEqual({ "career.actions.0": at.toISOString() });
    store = mergeWorkbook(store, tick);
    const untick = togglePatch(store, "career.actions.0", at);
    expect(untick).toEqual({ "career.actions.0": null });
    store = mergeWorkbook(store, untick);
    expect(store).toEqual({});
    expect(togglePatch(store, "career.actions.0", at)).toEqual({ "career.actions.0": at.toISOString() });
  });

  it("never sends an empty body", () => {
    expect(Object.keys(togglePatch({}, "mind.practice.0", at)).length).toBe(1);
    expect(Object.keys(togglePatch({ "mind.practice.0": "x" }, "mind.practice.0", at)).length).toBe(1);
  });
});
