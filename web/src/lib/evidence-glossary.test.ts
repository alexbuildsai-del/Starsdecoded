import { describe, expect, it } from "vitest";
import { HOUSE_NAMES, HOUSE_WORDS, glossFor, houseWithWord, houseWord, sourceLines, withHouseWords } from "./evidence-glossary";
import { whySentence } from "@/components/report/Checklist";

describe("one word per house (ADR-98)", () => {
  it("is the first word of each house title", () => {
    expect(HOUSE_WORDS).toHaveLength(12);
    HOUSE_WORDS.forEach((word, i) => expect(HOUSE_NAMES[i].split(/\s+/)[0]).toBe(word));
    expect(houseWord(3)).toBe("mind");
    expect(houseWord(11)).toBe("friends");
    expect(houseWord(0)).toBe("");
    expect(houseWord(13)).toBe("");
    expect(houseWithWord(3)).toBe("3rd (mind)");
    expect(houseWithWord(7)).toBe("7th (partnership)");
  });

  it("adds the word once after every Nth house and rules the Nth, and a second pass changes nothing", () => {
    expect(withHouseWords("Venus 21.3° Scorpio, 11th house")).toBe("Venus 21.3° Scorpio, 11th house (friends)");
    const ruler = withHouseWords("Venus rules the 10th and sits in Scorpio, 11th house, exalted");
    expect(ruler).toBe("Venus rules the 10th (career) and sits in Scorpio, 11th house (friends), exalted");
    expect(withHouseWords(ruler)).toBe(ruler);
    expect(withHouseWords("Oprah's Sun in Marie's 2nd house")).toBe("Oprah's Sun in Marie's 2nd house (money)");
    expect(withHouseWords("Mars is the malefic out of sect")).toBe("Mars is the malefic out of sect");
    expect(withHouseWords("")).toBe("");
  });

  it("carries the word in the ruler gloss", () => {
    expect(glossFor({ kind: "ruler", house: 10, ruler: "venus", rulerSign: "scorpio", rulerHouse: 11, dignity: "detriment" }))
      .toBe("The 10th (career, public role, reputation) answers to Venus, which sits in Scorpio in the 11th (friends), out of place, working hard for uneven results.");
  });
});

describe("the evidence sheet of a source claim (ADR-60)", () => {
  it("reads as two labelled lines from the stored label and no sentence", () => {
    const ref = { kind: "source", report: "A", section: "relationships", claim: 2 };
    const lines = sourceLines(ref, "Marie Curie's report: Venus 21.3° Scorpio, 11th house; Moon square Saturn, 1.2° orb");
    expect(lines.source).toBe("Marie's personal report · Relationships & Intimacy");
    expect(lines.evidence).toBe("Venus 21.3° Scorpio, 11th house; Moon square Saturn, 1.2° orb");
    expect(glossFor(ref)).toBe("");
  });

  it("leaves the cross gloss unchanged", () => {
    expect(glossFor({ kind: "cross", planetA: "moon", planetB: "jupiter", aspect: "square" })).toMatch(/one person's Moon and the other's Jupiter/);
  });
});

describe("a why is a sentence on its own line (ADR-62)", () => {
  it("is capitalised and closed by the page, the prompt's clause untouched otherwise", () => {
    expect(whySentence("so nobody plans it twice in private")).toBe("So nobody plans it twice in private.");
    expect(whySentence("It trains patience.")).toBe("It trains patience.");
    expect(whySentence("")).toBe("");
  });
});
