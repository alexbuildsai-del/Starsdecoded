import { describe, expect, it } from "vitest";
import { chapterAccent, ELEMENT_HEX } from "./chapter-accent";

const CHAPTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

describe("chapterAccent", () => {
  it("gives the eleven chapters the six fixed hues, 07 to 11 repeating 01 to 05", () => {
    expect(CHAPTERS.map((c) => chapterAccent(c))).toEqual([
      "#5C6BC0", "#3F8FD2", "#9575CD", "#3FA796", "#D9668A", "#B565A7",
      "#5C6BC0", "#3F8FD2", "#9575CD", "#3FA796", "#D9668A",
    ]);
  });

  it("never repeats a hue between neighbours", () => {
    const hues = CHAPTERS.map((c) => chapterAccent(c));
    for (let i = 1; i < hues.length; i++) expect(hues[i]).not.toEqual(hues[i - 1]);
  });

  it("ignores the chart, so two readers see the same chapter in the same hue", () => {
    for (const c of CHAPTERS) {
      expect(chapterAccent(c, 12.07)).toEqual(chapterAccent(c, 281.4));
      expect(chapterAccent(c, 0)).toEqual(chapterAccent(c));
    }
  });

  it("keeps the element hues out of the chapter table", () => {
    const hues = new Set(CHAPTERS.map((c) => chapterAccent(c)));
    for (const hex of Object.values(ELEMENT_HEX)) expect(hues.has(hex)).toBe(false);
  });
});
