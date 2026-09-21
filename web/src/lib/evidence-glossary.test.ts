import { describe, expect, it } from "vitest";
import { glossFor, sourceLines } from "./evidence-glossary";
import { whySentence } from "@/components/report/Checklist";

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
