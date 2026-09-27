import type { PairSectionSpec } from "../shapes.js";
import { PairPractiseSchema, evidenceChecks, lensContext, proseText, ratingChecks, stripBracketsDeep, whyChecks } from "../shapes.js";
import { reconcilePairClaims, type PairClaim } from "../evidence.js";
import { fixed } from "../../checks.js";

/** Chapter 07 collects the lens chapters' next-time items into three checklists and adds nothing new (ADR-63). */
export const whatToPractise: PairSectionSpec<typeof PairPractiseSchema> = {
  key: "pair:whatToPractise",
  label: "What to practise",
  adminLabel: "07 What to practise",
  chapter: 7,
  wordTarget: [450, 560],
  maxTokens: 3_500,
  schema: PairPractiseSchema,
  draws: [],
  extraContext: lensContext,
  validate: (out, brief) => {
    const stripped = stripBracketsDeep(out);
    const output = stripped.value;
    const text = proseText(output);
    const claims = reconcilePairClaims(output, output.claims as PairClaim[], brief);
    return {
      output: { ...output, claims: claims.claims },
      checks: [
        ...(stripped.stripped ? [fixed("chk-20", `${stripped.stripped} bracketed body name(s) stripped from the prose`)] : []),
        ...ratingChecks(text),
        ...evidenceChecks(text),
        ...whyChecks(output.forA.items, "for A item"),
        ...whyChecks(output.forB.items, "for B item"),
        ...whyChecks(output.forBoth.items, "for both item"),
        ...claims.checks,
      ],
    };
  },
  instructions: `Write What to practise, the closing chapter: an opening paragraph, three checklists and a closing paragraph, 450 to 560 words in total, the items included.

The opening says plainly what this pair asks of each of them, in three or four sentences. Then three checklists of exactly three items each, with one intro sentence naming who it is for: for A, for B, and for both. Every item comes from the NEXT-TIME ITEMS listed below, collected and deduplicated, the wording kept or tightened, never a new action: an item for A goes under A, for B under B, for both under both; where a list has more than three, keep the three that carry the most, and where it has fewer than three, move the nearest item marked for both. Each item keeps a why with a verb that says what it trains.

The closing paragraph, 80 to 100 words, is the last thing in the report and the one place it may speak to the pair as a whole: what these two make possible for each other, grounded and hopeful, no prediction. Cite the claims to the links and sources listed. Citations live in the claims field only: no body, sign, aspect or orb in a sentence. No score, no number.`,
};
