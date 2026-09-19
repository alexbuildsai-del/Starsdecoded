import { describe, expect, it } from "vitest";
import { LENSES, PAIR_CHAPTER_TITLES, PARENT_QUESTION, lensInfo, pairTabTitle, pairTitle } from "./lenses";

describe("the lens table", () => {
  it("holds the three lenses with their chapter titles and registers", () => {
    expect(LENSES.map((l) => l.lens)).toEqual(["partners", "parent_child", "family"]);
    expect(lensInfo("partners").chapterSeven).toBe("Love and closeness");
    expect(lensInfo("partners").chapterEight).toBe("Building a life");
    expect(lensInfo("parent_child").chapterSeven).toBe("What this child needs");
    expect(lensInfo("parent_child").chapterEight).toBe("How you parent them");
    expect(lensInfo("family").chapterSeven).toBe("Being family");
    expect(lensInfo("family").chapterEight).toBe("Gatherings, gifts and hard talks");
    expect(lensInfo("family").register).toMatch(/the group chat/);
  });

  it("asks who the parent is only under parent and child", () => {
    expect(lensInfo("parent_child").asksParent).toBe(true);
    expect(lensInfo("parent_child").roles).toEqual(["parent", "child"]);
    expect(lensInfo("partners").asksParent).toBe(false);
    expect(lensInfo("family").asksParent).toBe(false);
    expect(PARENT_QUESTION).toBe("Who is the parent?");
  });

  it("gives nine chapter titles that change at 07 and 08 only", () => {
    const partners = PAIR_CHAPTER_TITLES("partners");
    const family = PAIR_CHAPTER_TITLES("family");
    expect(partners.length).toBe(9);
    expect(partners.slice(0, 6)).toEqual(family.slice(0, 6));
    expect(partners[8]).toBe(family[8]);
    expect(partners[6]).not.toBe(family[6]);
    expect(partners[7]).not.toBe(family[7]);
  });

  it("names the tile and the tab without the trade word", () => {
    expect(pairTitle("Marie Curie", "Oprah Winfrey")).toBe("Marie Curie & Oprah Winfrey");
    expect(pairTabTitle("A", "B")).toBe("A & B · Compatibility Report · Stars Decoded");
    expect(JSON.stringify(LENSES).toLowerCase()).not.toContain("synastry");
  });
});
