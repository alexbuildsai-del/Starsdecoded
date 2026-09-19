import { z } from "zod/v4";
import type { PairSectionSpec } from "./shapes.js";
import { lensContext, ratingProblems, proseText } from "./shapes.js";

export const PairFoundationSchema = z.object({
  pairThesis: z.string().describe("2-3 sentences: the central story of how these two meet, in behaviour"),
  strongestLinks: z.array(z.object({
    link: z.string().describe("the cross aspect or overlay, exactly as the brief lists it"),
    why: z.string().describe("one sentence: what it does between them, on an ordinary day"),
  })).min(3).max(3),
  frictionThatMatters: z.string().describe("2-3 sentences: the one friction the report must be honest about, framed as what it trains"),
  sectionGuidance: z.object({
    howYouMeet: z.string(), twoCharts: z.string(), twoWays: z.string(), whereItFlows: z.string(), whereItRubs: z.string(),
    howYouTalk: z.string(), lensOne: z.string(), lensTwo: z.string(), whatToPractise: z.string(),
  }).describe("one sentence per chapter: the single thing it must establish"),
});

export const pairFoundation: PairSectionSpec<typeof PairFoundationSchema> = {
  key: "pair:foundation",
  label: "Pair foundation",
  adminLabel: "Pair foundation (internal)",
  chapter: 0,
  wordTarget: [0, 0],
  maxTokens: 4_000,
  schema: PairFoundationSchema,
  extraContext: lensContext,
  validate: (out) => ratingProblems(proseText(out)),
  instructions: `Build the internal foundation for this compatibility report. This is an editorial handoff, not reader-facing prose. Read both theses, then the cross aspects tight to wide, then the notable overlays, then each side's connectBestWith against the other's chart. Decide the few patterns that should organise the whole report so that every chapter is specific and none repeat.

Name the three strongest links exactly as the brief lists them, with one sentence each on what they do between these two people on an ordinary day from the lens register. Name the one friction that matters and what it trains. Give each of the nine chapters one distinct thing to establish. No score, rating or number describes the pair. The style contract does not apply to this internal output, but keep it evidence-based and free of generic labels.`,
};
