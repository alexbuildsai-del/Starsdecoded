import { describe, expect, it } from "vitest";
import { RENDERABLE_PROMPT_VERSIONS, isCurrentInterpretation, isCurrentPairInterpretation } from "./chart";

const withVersion = (promptVersion: string) => ({ meta: { promptVersion } });

describe("the page renders v6 and v7 (ADR-104), and offers a regeneration below that (MB-45)", () => {
  it("renders a stored v6 report and a new v7 one", () => {
    expect(RENDERABLE_PROMPT_VERSIONS).toEqual(["v6", "v7"]);
    expect(isCurrentInterpretation(withVersion("v6"))).toBe(true);
    expect(isCurrentInterpretation(withVersion("v7"))).toBe(true);
  });

  it("offers v5 and a report with no meta the regenerate call", () => {
    expect(isCurrentInterpretation(withVersion("v5"))).toBe(false);
    expect(isCurrentInterpretation({})).toBe(false);
    expect(isCurrentInterpretation(null)).toBe(false);
    expect(isCurrentInterpretation("v7")).toBe(false);
  });

  it("keeps the pair page on p2", () => {
    expect(isCurrentPairInterpretation(withVersion("p2"))).toBe(true);
    expect(isCurrentPairInterpretation(withVersion("p1"))).toBe(false);
    expect(isCurrentPairInterpretation(withVersion("v7"))).toBe(false);
  });
});
