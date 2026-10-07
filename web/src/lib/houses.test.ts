import { describe, expect, it } from "vitest";
import { HOUSES, HOUSE_COVERS, HOUSE_OBJECTS, HOUSE_WORDS, PAIRS } from "./houses";

describe("the one house set (ADR-321)", () => {
  it("keeps the twelve words the pages and the writer already print", () => {
    expect(HOUSE_WORDS).toEqual([
      "Self", "Money", "Mind", "Home", "Play", "Work",
      "Partnership", "Depth", "Belief", "Career", "Friends", "Solitude",
    ]);
  });

  it("covers each house in the after column's words, the 5th saying love", () => {
    expect(HOUSE_COVERS).toHaveLength(12);
    expect(HOUSE_COVERS[4]).toBe("fun, making things, love, children");
    for (const line of HOUSE_COVERS) {
      expect(line).not.toMatch(/romance/);
      expect(line.charAt(0), line).toBe(line.charAt(0).toLowerCase());
    }
  });

  it("gives every house its own object", () => {
    expect(new Set(HOUSE_OBJECTS).size).toBe(12);
    expect(HOUSE_OBJECTS[0]).toBe("Mirror");
    expect(HOUSE_OBJECTS[6]).toBe("Handshake");
  });

  it("pairs each house with the one across the wheel, in the six pairs as locked", () => {
    expect(PAIRS.map(([h, a, b]) => `${h}–${h + 6} ${a} · ${b}`)).toEqual([
      "1–7 me · the other person",
      "2–8 mine · shared",
      "3–9 everyday · big picture",
      "4–10 private · public",
      "5–11 my joy · our hopes",
      "6–12 doing · resting",
    ]);
  });

  it("reads one row per house, each pair from that house's side", () => {
    expect(HOUSES.map((h) => h.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const h of HOUSES) {
      expect(h.word).toBe(HOUSE_WORDS[h.n - 1]);
      expect(h.object).toBe(HOUSE_OBJECTS[h.n - 1]);
      expect(h.covers).toBe(HOUSE_COVERS[h.n - 1]);
      const across = HOUSES[h.opposite - 1];
      expect(Math.abs(h.opposite - h.n)).toBe(6);
      expect(across.opposite).toBe(h.n);
      expect(across.pair).toEqual([h.pair[1], h.pair[0]]);
    }
    expect(HOUSES[0].pair).toEqual(["me", "the other person"]);
    expect(HOUSES[6].pair).toEqual(["the other person", "me"]);
  });
});
