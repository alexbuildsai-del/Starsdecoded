import type { PairSectionSpec } from "../shapes.js";
import { PairTwoChartsSchema, lensContext, twoChartsChecks } from "../shapes.js";

/** Chapter 01, Your two charts: the introduction under the two charts, set out as a ledger (ADR-63, ADR-101, ADR-106). */
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
  validate: (out, brief) => twoChartsChecks(out, brief),
  instructions: `Write Your two charts, the introduction. The reader sees the two charts side by side, each alone. Under them this chapter's lines are set out as a ledger, each beside the link it rests on, with a pointer to the chapter that shows it; the link cards follow. 300 to 360 words across the headline, the six lines, the paradox and the pointer; the strengths card sits outside that count.

The headline is the verdict: the pair thesis in one sentence, addressed to both, plain and a little dry. Then what is naturally strong between you: three lines, one sentence each, each cited to one of this chapter's links. Then what will take work: three lines, each framed as what it trains, never as a flaw, each cited to a link. Then the paradox: one line on the thing that is both the ease and the cost, cited. Then the strengths card: three lines of twelve words at most, naming only the two people, the ones the foundation gave you. Then one pointer sentence: where the report goes from here.

Do not list every link; the link cards do that. Do not describe the drawing, the colours or the rings. Citations live in the claims field only: no body, sign, aspect or orb in a sentence. No score, no number.`,
};
