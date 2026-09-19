import type { PairSectionSpec } from "../shapes.js";
import { PairPractiseSchema, lensContext, proseText, ratingProblems } from "../shapes.js";
import { validatePairClaims, type PairClaim } from "../evidence.js";

export const whatToPractise: PairSectionSpec<typeof PairPractiseSchema> = {
  key: "pair:whatToPractise",
  label: "What to practise",
  adminLabel: "What to practise",
  chapter: 9,
  wordTarget: [420, 560],
  maxTokens: 3_500,
  schema: PairPractiseSchema,
  extraContext: lensContext,
  validate: (out, brief) => [
    ...ratingProblems(proseText(out)),
    ...validatePairClaims(out, out.claims as PairClaim[], brief),
  ],
  instructions: `Write What to practise, the closing chapter: an opening paragraph, three checklists and a closing paragraph, 420 to 560 words in total.

The opening says plainly what this pair asks of each of them. Then three checklists of exactly three items each, with one intro sentence: for A, for B, and for both, using their names in the intros. Each item is a specific, doable action of 8 to 18 words from the lens register, with a why clause that says what it trains, in the words a friend would use, with a verb. The items for one person answer what the other's chart needs; the items for both are things they do together.

The closing paragraph, 80 to 100 words, is the last thing in the report and the one place it may speak to the pair as a whole: what these two make possible for each other, grounded and hopeful, no prediction. Cite the claims from the cross aspects and overlays that carry the actions, and sources where an action answers a sentence in one report. No planet, sign or house names in prose. No score, no number.`,
};
