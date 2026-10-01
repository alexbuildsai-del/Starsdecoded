import { describe, expect, it } from "vitest";
import { RENDERABLE_PROMPT_VERSIONS, RENDERABLE_PAIR_PROMPT_VERSIONS, isCurrentInterpretation, isCurrentPairInterpretation, sceneTitleOf, type PairInterpretation } from "./chart";

const withVersion = (promptVersion: string) => ({ meta: { promptVersion } });

describe("the page renders v6 to v9 (ADR-104), and offers a regeneration below that (MB-45)", () => {
  it("renders a stored v6, v7, v8 report and a new v9 one", () => {
    expect(RENDERABLE_PROMPT_VERSIONS).toEqual(["v6", "v7", "v8", "v9"]);
    expect(isCurrentInterpretation(withVersion("v6"))).toBe(true);
    expect(isCurrentInterpretation(withVersion("v7"))).toBe(true);
    expect(isCurrentInterpretation(withVersion("v8"))).toBe(true);
    expect(isCurrentInterpretation(withVersion("v9"))).toBe(true);
  });

  it("offers v5 and a report with no meta the regenerate call", () => {
    expect(isCurrentInterpretation(withVersion("v5"))).toBe(false);
    expect(isCurrentInterpretation({})).toBe(false);
    expect(isCurrentInterpretation(null)).toBe(false);
    expect(isCurrentInterpretation("v7")).toBe(false);
  });

  it("renders a stored p2, p3 pair and a new p4 one, and nothing older", () => {
    expect(RENDERABLE_PAIR_PROMPT_VERSIONS).toEqual(["p2", "p3", "p4"]);
    expect(isCurrentPairInterpretation(withVersion("p2"))).toBe(true);
    expect(isCurrentPairInterpretation(withVersion("p3"))).toBe(true);
    expect(isCurrentPairInterpretation(withVersion("p4"))).toBe(true);
    expect(isCurrentPairInterpretation(withVersion("p1"))).toBe(false);
    expect(isCurrentPairInterpretation(withVersion("v8"))).toBe(false);
    expect(isCurrentPairInterpretation({})).toBe(false);
  });
});

describe("a lens chapter's one scene (ADR-176)", () => {
  const pair = (scenes: PairInterpretation["scenes"]) => ({ meta: { promptVersion: "p3" }, scenes }) as unknown as PairInterpretation;

  it("titles a p3 chapter with its one fixed scene", () => {
    expect(sceneTitleOf(pair({ partners02: { titles: ["The end of a long day"], written: 0, texts: {} } }), "partners02")).toBe("The end of a long day");
  });

  it("titles a p2 chapter with the scene the report wrote, and leaves the ones written on tap unread", () => {
    const p2 = pair({ partners03: { titles: ["the argument at 11 pm", "the silent car ride", "day two of an apology"], written: 1, texts: { "2": "Written on tap." } } });
    expect(sceneTitleOf(p2, "partners03")).toBe("the silent car ride");
  });

  it("gives no title where none was stored", () => {
    expect(sceneTitleOf(pair({}), "partners02")).toBeNull();
    expect(sceneTitleOf(pair({ partners02: { titles: [], written: 0, texts: {} } }), "partners02")).toBeNull();
    expect(sceneTitleOf(null, "partners02")).toBeNull();
  });
});
