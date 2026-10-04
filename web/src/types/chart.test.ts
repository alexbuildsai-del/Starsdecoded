import { describe, expect, it } from "vitest";
import { RENDERABLE_PROMPT_VERSIONS, RENDERABLE_PAIR_PROMPT_VERSIONS, isCurrentInterpretation, isCurrentPairInterpretation, rewriteOffer, sceneTitleOf, type PairInterpretation } from "./chart";

const withVersion = (promptVersion: string) => ({ meta: { promptVersion } });

describe("the page renders v6 to v11 (ADR-104), and offers a regeneration below that (MB-45)", () => {
  it("renders a stored v6 to v10 report and a new v11 one", () => {
    expect(RENDERABLE_PROMPT_VERSIONS).toEqual(["v6", "v7", "v8", "v9", "v10", "v11"]);
    for (const v of ["v6", "v7", "v8", "v9", "v10", "v11"]) expect(isCurrentInterpretation(withVersion(v)), v).toBe(true);
  });

  it("offers v5 and a report with no meta the regenerate call", () => {
    expect(isCurrentInterpretation(withVersion("v5"))).toBe(false);
    expect(isCurrentInterpretation(withVersion("v1"))).toBe(false);
    expect(isCurrentInterpretation({})).toBe(false);
    expect(isCurrentInterpretation(null)).toBe(false);
    expect(isCurrentInterpretation("v7")).toBe(false);
  });

  it("renders a stored p2 to p5 pair and a new p6 one, and nothing older", () => {
    expect(RENDERABLE_PAIR_PROMPT_VERSIONS).toEqual(["p2", "p3", "p4", "p5", "p6"]);
    for (const v of ["p2", "p3", "p4", "p5", "p6"]) expect(isCurrentPairInterpretation(withVersion(v)), v).toBe(true);
    expect(isCurrentPairInterpretation(withVersion("p1"))).toBe(false);
    expect(isCurrentPairInterpretation(withVersion("v10"))).toBe(false);
    expect(isCurrentPairInterpretation({})).toBe(false);
  });
});

describe("a rewrite is offered only where the server allows one (MB-169, MB-170)", () => {
  const row = (status: string | undefined, canRegenerate?: boolean, outdated?: boolean) => ({ status, canRegenerate, outdated });
  const none = { tryAgain: false, outdated: false, regenerate: false };

  it("offers Try again on a failed report to its writer, or its holder after a hand-over", () => {
    expect(rewriteOffer(row("failed", true))).toEqual({ tryAgain: true, outdated: false, regenerate: true });
  });

  it("offers a shared reader, or a claimed one who doesn't hold the report, neither Try again nor Regenerate", () => {
    expect(rewriteOffer(row("failed", false))).toEqual(none);
    expect(rewriteOffer(row("complete", false))).toEqual(none);
  });

  it("offers nothing where the API doesn't say, as one from before canRegenerate", () => {
    expect(rewriteOffer(row("failed"))).toEqual(none);
    expect(rewriteOffer(row("complete", undefined, true))).toEqual({ ...none, outdated: true });
  });

  it("offers Try again on a failure only", () => {
    for (const status of [undefined, "pending", "computing", "interpreting", "revising", "complete"]) {
      expect(rewriteOffer(row(status, true)).tryAgain, String(status)).toBe(false);
    }
  });

  it("tells every reader an outdated report is outdated, and gives Regenerate only to one who may run it", () => {
    expect(rewriteOffer(row("complete", true, true))).toEqual({ tryAgain: false, outdated: true, regenerate: true });
    expect(rewriteOffer(row("complete", false, true))).toEqual({ tryAgain: false, outdated: true, regenerate: false });
  });

  it("drops the outdated line once a rewrite or a pass is under way, and never shows it on a current report", () => {
    for (const status of [undefined, "pending", "interpreting", "revising", "failed"]) {
      expect(rewriteOffer(row(status, true, true)).outdated, String(status)).toBe(false);
    }
    expect(rewriteOffer(row("complete", true, false)).outdated).toBe(false);
    expect(rewriteOffer(row("complete", true)).outdated).toBe(false);
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
