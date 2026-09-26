import { describe, expect, it } from "vitest";
import { isPlacementLine, plainProse } from "./plain-prose";

const paragraph = "You do the work before anyone asks for it, and you resent being thanked for it late.";
const label = "**10th ruler: Mercury in Aquarius, 6th house (peregrine)**";

describe("the page prints plain text (ADR-104)", () => {
  it("drops the stored Career field's label above its paragraph, after one newline and after a blank line", () => {
    expect(plainProse(`${label}\n${paragraph}`)).toBe(paragraph);
    expect(plainProse(`${label}\n\n${paragraph}`)).toBe(paragraph);
    expect(plainProse(`${paragraph}\n\n${label}`)).toBe(paragraph);
  });

  it("reads emphasis without its asterisks", () => {
    expect(plainProse("You **really** decide first.")).toBe("You really decide first.");
    expect(plainProse("*You decide first.*")).toBe("You decide first.");
  });

  it("keeps a sentence that opens on a placement and goes on", () => {
    const sentence = "Mercury in Aquarius, 6th house, makes you decide late and all at once.";
    expect(plainProse(sentence)).toBe(sentence);
    expect(isPlacementLine(sentence)).toBe(false);
    expect(isPlacementLine("Sun in Scorpio, 11th house")).toBe(true);
    expect(isPlacementLine("10th ruler Venus in Scorpio, 11th house (detriment)")).toBe(true);
    // A verb outside the vocabulary makes it a sentence, and a sentence stays.
    expect(isPlacementLine("Venus rules the 10th and sits in Scorpio, 11th house, in detriment")).toBe(false);
    expect(isPlacementLine("Moon square Saturn, 1.2° orb")).toBe(true);
  });

  it("keeps a pass's paragraphs and their blank line, and leaves an empty field empty", () => {
    const two = `${paragraph}\n\nWith your birth time the horizon settles this.`;
    expect(plainProse(two)).toBe(two);
    expect(plainProse("")).toBe("");
  });
});
