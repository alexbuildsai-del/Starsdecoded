import { describe, expect, it } from "vitest";
import { NAME_RULE_LINE, isPersonName, nameRuleLine } from "@/lib/person-name";

describe("a name typed composed or decomposed is the same name", () => {
  const NAMES = ["José", "Zoë", "Nguyễn Thị Minh", "ジョン・スミス", "ガブリエル", "Åsa", "한국어", "सुनीता", "سارا حسین‌زاده", "Ṣọlá", "Müller-Schmidt"];

  it.each(NAMES)("%s: NFC and NFD both pass, and so do the compatibility forms", (name) => {
    for (const form of ["NFC", "NFD", "NFKC", "NFKD"] as const) {
      expect(isPersonName(name.normalize(form)), `${name} as ${form}`).toBe(true);
    }
  });

  it("takes a letter outside the first plane, and counts it as one", () => {
    expect(isPersonName("𠮷野家")).toBe(true);
    expect(isPersonName("𠮷".repeat(60))).toBe(true);
    expect(isPersonName("𠮷".repeat(61))).toBe(false);
  });

  it("refuses a name made only of marks, which has no letter to carry them", () => {
    for (const name of ["́", "́́", "゙", "・゙"]) expect(isPersonName(name), JSON.stringify(name)).toBe(false);
  });
});

describe("joiners and spaces alone, in any mix", () => {
  const JOINERS = ["‌", "　", " ", "・", "·", "'", "’", ".", "-"];

  it("refuse every string of 1 to 4 of them, in any order: none holds a letter", () => {
    const strings: string[] = [];
    const build = (prefix: string, left: number) => {
      if (prefix) strings.push(prefix);
      if (left > 0) for (const j of JOINERS) build(prefix + j, left - 1);
    };
    build("", 3);
    expect(strings.length).toBeGreaterThan(700);
    for (const name of strings) expect(isPersonName(name), JSON.stringify(name)).toBe(false);
  });

  it("takes a letter between any of them, but never a space of either width at an end", () => {
    for (const joiner of JOINERS) {
      const edge = joiner === " " || joiner === "　";
      expect(isPersonName(`a${joiner}b`), JSON.stringify(joiner)).toBe(true);
      expect(isPersonName(`${joiner}a`), `${JSON.stringify(joiner)} first`).toBe(!edge);
      expect(isPersonName(`a${joiner}`), `${JSON.stringify(joiner)} last`).toBe(!edge);
    }
  });

  it("takes a zero-width non-joiner at either end of a name that has a letter, since it is no space", () => {
    expect(isPersonName("‌سارا")).toBe(true);
    expect(isPersonName("سارا‌")).toBe(true);
  });

  it("refuses the joiner's neighbours: the zero-width joiner, space, word joiner, soft hyphen and byte order mark", () => {
    for (const bad of ["‍", "​", "⁠", "­", "﻿", " ", " ", "\u0085"]) {
      expect(isPersonName(`a${bad}b`), JSON.stringify(bad)).toBe(false);
    }
  });
});

describe("what the form says about a name once it has been typed", () => {
  it("says nothing for a name the rule takes, and for one that is only blanks, which the prompt covers", () => {
    for (const name of ["山田・太郎", "山田　太郎", "سارا‌حسین", "", " ", "　", " ", "\t"]) {
      expect(nameRuleLine(name), JSON.stringify(name)).toBeNull();
    }
  });

  it("says the rule for a name with no letter, for a name of joiners alone and for one past 60", () => {
    for (const name of ["‌", "・", "山田\n太郎", "1", "x".repeat(61)]) expect(nameRuleLine(name), JSON.stringify(name)).toBe(NAME_RULE_LINE);
  });
});
