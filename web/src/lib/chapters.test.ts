import { describe, expect, it } from "vitest";
import { CHAPTERS } from "./chapters";
import { NATAL_CHAPTER_OF } from "./evidence-glossary";

const titleOf = (section: string) => CHAPTERS.find((c) => c.section === section)?.title;

describe("the chapter titles (ADR-258)", () => {
  it("renames chapter 8 and keeps chapter 9's title", () => {
    expect(titleOf("superpowers")).toBe("Strengths, Habits & Where You Can Grow");
    expect(titleOf("discoveries")).toBe("Key Paradoxes & Discoveries");
  });

  it("is the name a source claim's sheet prints for each chapter", () => {
    expect(NATAL_CHAPTER_OF.superpowers).toBe(titleOf("superpowers"));
    expect(NATAL_CHAPTER_OF.discoveries).toBe(titleOf("discoveries"));
  });
});
