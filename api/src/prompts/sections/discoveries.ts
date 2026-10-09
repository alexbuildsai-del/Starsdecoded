import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import { ClaimsSchema, validateSectionClaims } from "../evidence.js";
import { DidYouKnowSchema, didYouKnowContext } from "../didYouKnow.js";

export const DiscoveriesSchema = z.object({
  opening: z.string().describe("one or two sentences introducing the most revealing paradox plainly"),
  paradoxes: z.array(z.object({
    title: z.string().describe("2-5 words"),
    tension: z.string().describe("80-100 words: the two things that do not naturally go together, shown in real life"),
    invitation: z.string().describe("40-60 words: what this paradox invites, ending on possibility not problem"),
  })).min(2).max(3),
  claims: ClaimsSchema,
  didYouKnow: DidYouKnowSchema,
});

export const discoveries: SectionSpec<typeof DiscoveriesSchema> = {
  key: "natal:discoveries",
  label: "Key Paradoxes & Discoveries",
  adminLabel: "Key Paradoxes",
  wordTarget: [400, 500],
  blindWordTarget: [320, 400],
  maxTokens: 3_000,
  schema: DiscoveriesSchema,
  validate: (out, brief) => validateSectionClaims(out, brief.chart),
  extraContext: (brief) => didYouKnowContext("discoveries", brief),
  instructions: `Write Key Paradoxes & Discoveries: two or three genuine paradoxes specific to this chart. Look for a dignified planet contrary to sect, a ruler in detriment in a strong house, a stellium that contradicts the chart ruler, a Lot in an unexpected house, or an opposition that plays out between two life areas.

Each paradox: a title of 2 to 5 words. 80 to 100 words showing the two things that do not naturally go together, as lived behaviour the reader will recognise. Then 40 to 60 words on what it invites, ending on something they could try.

A paradox is a real insight, not a clever opposite. Do not repeat material from the Overview or from Strengths, Habits & Where You Can Grow. Each part opens on the reader's life, then gives the reason. Name at most one placement a part, inside a sentence, where it first matters: its plain meaning in the next sentence, then a moment the reader can check. Anything ahead is a possibility: could, might, you may notice, never will. 400 to 500 words total.

Sect. The benefic out of sect is a strong paradox source: help that arrives unreliably or at a cost. A dignified planet that is out of sect is another.`,
};
