import { describe, expect, it } from "vitest";
import {
  PIN_LIMIT, isItemKey, isPinKey, itemKey, localTicks, mergeWorkbook, pinCount, pinKey, pinPatch, sendPatch,
  togglePatch, workbookStore, type PatchOutcome, type WorkbookPatch,
} from "./workbook";
import type { Workbook } from "@/types/chart";

describe("workbook keys", () => {
  it("names an item by its section, its path and its index", () => {
    expect(itemKey("career", "actions", 0)).toBe("career.actions.0");
    expect(itemKey("mind", "practice", 0)).toBe("mind.practice.0");
    expect(itemKey("superpowers", "growingEdge.actions", 2)).toBe("superpowers.growingEdge.actions.2");
    expect(itemKey("focus", "leanInto.bullets", 1)).toBe("focus.leanInto.bullets.1");
    expect(itemKey("partners02", "nextTime.items", 0)).toBe("partners02.nextTime.items.0");
  });

  it("accepts the keys the report writes and refuses anything else", () => {
    for (const key of ["career.actions.0", "superpowers.growingEdge.actions.2", "focus.leanInto.bullets.1"]) {
      expect(isItemKey(key)).toBe(true);
    }
    for (const key of ["career", "career.actions", "career.actions.x", ".actions.0", "Career.actions.0", "career..0"]) {
      expect(isItemKey(key)).toBe(false);
    }
  });

  it("takes a digit after a segment's first letter, as a pair chapter's id carries one", () => {
    for (const key of ["partners02.nextTime.items.0", "parentChild06.nextTime.items.2", "people04.nextTime.items.1"]) {
      expect(isItemKey(key)).toBe(true);
    }
    for (const key of ["02partners.nextTime.items.0", "partners02.2nextTime.items.0", "partners02.nextTime.items.0a"]) {
      expect(isItemKey(key)).toBe(false);
    }
  });
});

describe("pin keys (ADR-174)", () => {
  it("is pin. and the item's key", () => {
    expect(pinKey("focus.practice.bullets.0")).toBe("pin.focus.practice.bullets.0");
    expect(pinKey("partners02.nextTime.items.1")).toBe("pin.partners02.nextTime.items.1");
  });

  it("knows a pin from a tick", () => {
    expect(isPinKey("pin.focus.practice.bullets.0")).toBe(true);
    expect(isPinKey("pin.partners02.nextTime.items.1")).toBe(true);
    for (const key of ["focus.practice.bullets.0", "pin.", "pin.focus", "pinned.focus.practice.bullets.0", "pin.Focus.practice.bullets.0"]) {
      expect(isPinKey(key)).toBe(false);
    }
  });

  it("allows three a report", () => {
    expect(PIN_LIMIT).toBe(3);
  });

  it("counts the pins and never the ticks", () => {
    const at = "2026-10-01T10:00:00.000Z";
    expect(pinCount({})).toBe(0);
    expect(pinCount({ "focus.practice.bullets.0": at, "career.actions.1": at })).toBe(0);
    expect(pinCount({ "focus.practice.bullets.0": at, "pin.focus.practice.bullets.0": at, "pin.focus.practice.bullets.2": at })).toBe(2);
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

describe("pinPatch (ADR-174)", () => {
  const at = new Date("2026-10-01T10:00:00.000Z");
  const iso = at.toISOString();

  it("pins with the date and unpins with null, and leaves the item's tick alone", () => {
    let workbook: Workbook = { "focus.practice.bullets.0": iso };
    const pin = pinPatch(workbook, "focus.practice.bullets.0", at);
    expect(pin).toEqual({ "pin.focus.practice.bullets.0": iso });
    workbook = mergeWorkbook(workbook, pin!);
    const unpin = pinPatch(workbook, "focus.practice.bullets.0", at);
    expect(unpin).toEqual({ "pin.focus.practice.bullets.0": null });
    expect(mergeWorkbook(workbook, unpin!)).toEqual({ "focus.practice.bullets.0": iso });
  });

  it("refuses a fourth pin, still unpins at the limit, and lets a freed place be taken", () => {
    const full: Workbook = {
      "pin.partners02.nextTime.items.0": iso,
      "pin.partners03.nextTime.items.0": iso,
      "pin.partners04.nextTime.items.1": iso,
    };
    expect(pinPatch(full, "partners05.nextTime.items.0", at)).toBeNull();
    const unpin = pinPatch(full, "partners03.nextTime.items.0", at);
    expect(unpin).toEqual({ "pin.partners03.nextTime.items.0": null });
    expect(pinPatch(mergeWorkbook(full, unpin!), "partners05.nextTime.items.0", at))
      .toEqual({ "pin.partners05.nextTime.items.0": iso });
  });

  it("does not count ticks toward the limit", () => {
    const ticks: Workbook = {
      "focus.practice.bullets.0": iso, "focus.practice.bullets.1": iso, "focus.practice.bullets.2": iso, "career.actions.0": iso,
    };
    expect(pinPatch(ticks, "focus.practice.bullets.0", at)).toEqual({ "pin.focus.practice.bullets.0": iso });
  });
});

describe("workbookStore", () => {
  const iso = "2026-10-01T10:00:00.000Z";

  function recorder(workbook: Workbook) {
    const sent: WorkbookPatch[] = [];
    return { sent, store: workbookStore(workbook, (body) => sent.push(body), false) };
  }

  it("reads ticks and pins under one item key, as the dashboard writes them", () => {
    const { store } = recorder({ "focus.practice.bullets.0": iso, "pin.focus.practice.bullets.1": iso });
    expect(store.ticked("focus.practice.bullets.0")).toBe(true);
    expect(store.pinned?.("focus.practice.bullets.0")).toBe(false);
    expect(store.ticked("focus.practice.bullets.1")).toBe(false);
    expect(store.pinned?.("focus.practice.bullets.1")).toBe(true);
  });

  it("sends one patch per press and says when a fourth pin is refused, sending nothing", () => {
    const { sent, store } = recorder({
      "pin.partners02.nextTime.items.0": iso, "pin.partners03.nextTime.items.0": iso, "pin.partners04.nextTime.items.0": iso,
    });
    store.toggle("partners05.nextTime.items.0");
    expect(store.togglePin?.("partners05.nextTime.items.0")).toBe(false);
    expect(store.togglePin?.("partners02.nextTime.items.0")).toBe(true);
    expect(sent).toHaveLength(2);
    expect(Object.keys(sent[0]!)).toEqual(["partners05.nextTime.items.0"]);
    expect(sent[1]).toEqual({ "pin.partners02.nextTime.items.0": null });
  });
});

describe("sendPatch, optimistic with rollback", () => {
  const iso = "2026-10-01T10:00:00.000Z";
  const before: Workbook = { "focus.practice.bullets.0": iso };
  const pin = { "pin.focus.practice.bullets.0": iso };

  function run(answer: (outcome: PatchOutcome) => void) {
    const shown: Workbook[] = [];
    const requested: WorkbookPatch[] = [];
    sendPatch(before, pin, (next) => shown.push(next), (body, outcome) => {
      requested.push(body);
      answer(outcome);
    });
    return { shown, requested };
  }

  it("shows the pin before the API answers and keeps the API's merged workbook", () => {
    const merged = { ...before, ...pin };
    const { shown, requested } = run((outcome) => outcome.onSuccess(merged));
    expect(requested).toEqual([pin]);
    expect(shown).toEqual([merged, merged]);
  });

  it("puts the workbook back when the API refuses, as with a fourth pin", () => {
    const { shown } = run((outcome) => outcome.onError());
    expect(shown[0]).toEqual({ ...before, ...pin });
    expect(shown[1]).toBe(before);
  });

  it("keeps what it showed when a success carries no workbook", () => {
    const { shown } = run((outcome) => outcome.onSuccess(null));
    expect(shown[1]).toEqual({ ...before, ...pin });
  });
});

describe("localTicks", () => {
  it("ticks and unticks in memory and cannot pin", () => {
    const store = localTicks();
    expect(store.ticked("sample.practice.0")).toBe(false);
    store.toggle("sample.practice.0");
    expect(store.ticked("sample.practice.0")).toBe(true);
    store.toggle("sample.practice.0");
    expect(store.ticked("sample.practice.0")).toBe(false);
    expect(store.saving).toBe(false);
    expect(store.pinned).toBeUndefined();
    expect(store.togglePin).toBeUndefined();
  });

  it("keeps each store's ticks to itself", () => {
    const a = localTicks();
    const b = localTicks();
    a.toggle("sample.tryTogether.1");
    expect(a.ticked("sample.tryTogether.1")).toBe(true);
    expect(b.ticked("sample.tryTogether.1")).toBe(false);
  });
});
