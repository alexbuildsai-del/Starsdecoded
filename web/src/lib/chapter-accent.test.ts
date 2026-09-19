import { describe, expect, it } from "vitest";
import { chapterAccent, ELEMENT_HEX } from "./chapter-accent";

const CHAPTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

describe("chapterAccent", () => {
  it("gives the ten chapters the six fixed hues, 07 to 10 repeating 01 to 04", () => {
    expect(CHAPTERS.map((c) => chapterAccent(c))).toEqual([
      "#5C6BC0", "#3F8FD2", "#9575CD", "#3FA796", "#D9668A", "#B565A7",
      "#5C6BC0", "#3F8FD2", "#9575CD", "#3FA796",
    ]);
  });

  it("closes on teal: chapter 10 is Closing (ADR-46)", () => {
    expect(chapterAccent(10)).toBe("#3FA796");
  });

  it("never repeats a hue between neighbours", () => {
    const hues = CHAPTERS.map((c) => chapterAccent(c));
    for (let i = 1; i < hues.length; i++) expect(hues[i]).not.toEqual(hues[i - 1]);
  });

  it("takes only the chapter, so two readers see the same chapter in the same hue", () => {
    expect(chapterAccent.length).toBe(1);
    for (const c of CHAPTERS) expect(chapterAccent(c)).toEqual(chapterAccent(c));
  });

  it("keeps the element hues out of the chapter table", () => {
    const hues = new Set(CHAPTERS.map((c) => chapterAccent(c)));
    for (const hex of Object.values(ELEMENT_HEX)) expect(hues.has(hex)).toBe(false);
  });
});
