import { describe, expect, it } from "vitest";
import type { ReportSummary } from "@workspace/api-client-react";
import {
  SELECTION_KEY, forgetSelection, parseSelection, readSelection, reconcileSelection, rememberSelection, unpickable, type SelectionStore,
} from "./pair-selection";

// sessionStorage's three calls over a Map: no jsdom here (MB-47).
function memoryStore(stored?: string): SelectionStore & { raw: () => string | null } {
  const data = new Map<string, string>();
  if (stored !== undefined) data.set(SELECTION_KEY, stored);
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    raw: () => data.get(SELECTION_KEY) ?? null,
  };
}

const report = (id: string, over: Partial<ReportSummary> = {}): ReportSummary => ({
  id, kind: "natal", name: id, status: "complete", createdAt: "2026-09-20T10:00:00.000Z", ...over,
});

const PAIR = JSON.stringify({ a: "r1", b: "r2", lens: "partners", parent: "A" });

describe("the remembered pair", () => {
  it("waits while the report list has not loaded, and keeps what is stored", () => {
    const store = memoryStore(PAIR);
    expect(reconcileSelection(readSelection(store), undefined)).toEqual({ state: "waiting" });
    expect(store.raw()).toBe(PAIR);
  });

  it("is dropped when a remembered report is missing from the loaded list, and the store forgets it", () => {
    const store = memoryStore(PAIR);
    expect(reconcileSelection(readSelection(store), [report("r1"), report("r3")])).toEqual({ state: "dropped" });
    forgetSelection(store);
    expect(store.raw()).toBeNull();
    expect(reconcileSelection({ a: "r1", b: "r2" }, [])).toEqual({ state: "dropped" });
    expect(reconcileSelection({ a: "r1", lens: "partners" }, [report("r1"), report("r2")])).toEqual({ state: "dropped" });
  });

  it("comes back whole, lens, parent and how, when both reports are in the list", () => {
    const store = memoryStore(JSON.stringify({ a: "r1", b: "r2", lens: "people", parent: "B", how: "friends" }));
    expect(reconcileSelection(readSelection(store), [report("r3"), report("r2"), report("r1")])).toEqual({
      state: "kept",
      selection: { a: "r1", b: "r2", lens: "people", parent: "B", how: "friends" },
    });
  });

  it("reads malformed stored JSON, or a field of the wrong shape, as nothing", () => {
    for (const raw of ["{not json", "null", "42", "\"r1\"", "[\"r1\",\"r2\"]"]) expect(readSelection(memoryStore(raw))).toEqual({});
    expect(readSelection(memoryStore())).toEqual({});
    expect(parseSelection(JSON.stringify({ a: 7, b: "r2", lens: "enemies", parent: "C", how: "rivals" }))).toEqual({ b: "r2" });
    expect(reconcileSelection(readSelection(memoryStore("{not json")), [report("r1"), report("r2")])).toEqual({ state: "dropped" });
  });

  it("is remembered and forgotten through the store, and a store the browser refuses costs nothing", () => {
    const store = memoryStore();
    rememberSelection({ a: "r1", b: "r2", lens: "parent_child", parent: "B" }, store);
    expect(readSelection(store)).toEqual({ a: "r1", b: "r2", lens: "parent_child", parent: "B" });
    forgetSelection(store);
    expect(store.raw()).toBeNull();

    const refuse = () => {
      throw new Error("SecurityError");
    };
    const refusing: SelectionStore = { getItem: refuse, setItem: refuse, removeItem: refuse };
    expect(readSelection(refusing)).toEqual({});
    expect(() => rememberSelection({ a: "r1" }, refusing)).not.toThrow();
    expect(() => forgetSelection(refusing)).not.toThrow();
    expect(readSelection(null)).toEqual({});
  });
});

describe("unpickable", () => {
  it("reads a report the list no longer holds as no longer available, and keeps the other reasons", () => {
    expect(unpickable(undefined)).toBe("no longer available");
    expect(unpickable(report("r1"))).toBeNull();
    expect(unpickable(report("r1", { status: "interpreting" }))).toBe("still writing");
    expect(unpickable(report("r1", { status: "failed" }))).toBe("could not be written");
    expect(unpickable(report("r1", { status: "failed", failureReason: { code: "quality", line: "The writing did not hold up." } }))).toBe("The writing did not hold up.");
    expect(unpickable(report("c1", { kind: "compatibility" }))).toBe("not a personal natal report");
  });
});
