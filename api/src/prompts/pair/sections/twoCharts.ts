import type { PairSectionSpec } from "../shapes.js";
import { PairTwoChartsSchema, lensContext, twoChartsProblems } from "../shapes.js";

/** Chapter 01, Your two charts: the introduction under the wheel and its legend (ADR-63). */
export const twoCharts: PairSectionSpec<typeof PairTwoChartsSchema> = {
  key: "pair:twoCharts",
  label: "Your two charts",
  adminLabel: "01 Your two charts",
  chapter: 1,
  wordTarget: [300, 360],
  maxTokens: 4_000,
  schema: PairTwoChartsSchema,
  draws: ["overview", "relationships", "discoveries"],
  extraContext: lensContext,
  validate: (out, brief) => twoChartsProblems(out, brief),
  instructions: `Write Your two charts, the introduction. The reader is looking at both charts drawn on one wheel with the links drawn between them, and a legend has already told them what the lines and colours mean. 300 to 360 words across the headline, the six lines, the paradox and the pointer; the strengths card sits outside that count.

The headline is the verdict: the pair thesis in one sentence, addressed to both, plain and a little dry. Then what is naturally strong between you: three lines, one sentence each, each cited to one of this chapter's links and each pointing at the chapter that shows it, by its title. Then what will take work: three lines, each framed as what it trains, never as a flaw, each cited to a link. Then the paradox: one line on the thing that is both the ease and the cost, cited. Then the strengths card: three lines of twelve words at most, naming only the two people, the ones the foundation gave you. Then one pointer sentence: where the report goes from here.

Do not list every link; the cards under the wheel do that. Do not describe the drawing, the colours or the rings. Citations live in the claims field only: no body, sign, aspect or orb in a sentence. No score, no number.`,
};
