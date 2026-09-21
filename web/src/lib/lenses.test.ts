import { describe, expect, it } from "vitest";
import { HOW_OPTIONS, HOW_QUESTION, LENSES, PAIR_CHAPTER_TITLES, PARENT_QUESTION, lensInfo, pairTabTitle, pairTitle } from "./lenses";

describe("the lens table", () => {
  it("holds the three lenses, Partners, Parent and child, Two people, with their registers and doors", () => {
    expect(LENSES.map((l) => l.lens)).toEqual(["partners", "parent_child", "people"]);
    expect(LENSES.map((l) => l.title)).toEqual(["Partners", "Parent and child", "Two people"]);
    expect(lensInfo("people").door).toBe("Friends, family, colleagues");
    expect(lensInfo("people").register).toMatch(/the group chat/);
    expect(lensInfo("partners").register).toMatch(/an argument at 11 pm/);
  });

  it("asks who the parent is only under parent and child, and how they know each other only under two people", () => {
    expect(lensInfo("parent_child").asksParent).toBe(true);
    expect(lensInfo("parent_child").roles).toEqual(["parent", "child"]);
    expect(lensInfo("partners").asksParent).toBe(false);
    expect(lensInfo("people").asksParent).toBe(false);
    expect(lensInfo("people").asksHow).toBe(true);
    expect(lensInfo("partners").asksHow).toBe(false);
    expect(PARENT_QUESTION).toBe("Who is the parent?");
    expect(HOW_QUESTION).toBe("How do you know each other?");
    expect(HOW_OPTIONS).toEqual(["family", "friends", "colleagues"]);
  });

  it("gives seven chapter titles a lens, the two charts first and the practice last, the five between set by the lens", () => {
    for (const l of LENSES) {
      const titles = PAIR_CHAPTER_TITLES(l.lens);
      expect(titles.length).toBe(7);
      expect(titles[0]).toBe("Your two charts");
      expect(titles[6]).toBe("What to practise");
      expect(titles.slice(1, 6)).toEqual(l.chapters);
    }
    expect(PAIR_CHAPTER_TITLES("partners")[1]).toBe("How you love");
    expect(PAIR_CHAPTER_TITLES("parent_child")[5]).toBe("Rules, freedom and screens");
    expect(PAIR_CHAPTER_TITLES("people")[4]).toBe("The hard talk");
  });

  it("names the tile and the tab without the trade word", () => {
    expect(pairTitle("Marie Curie", "Oprah Winfrey")).toBe("Marie Curie & Oprah Winfrey");
    expect(pairTabTitle("A", "B")).toBe("A & B · Compatibility Report · Stars Decoded");
    expect(JSON.stringify(LENSES).toLowerCase()).not.toContain("synastry");
  });
});
