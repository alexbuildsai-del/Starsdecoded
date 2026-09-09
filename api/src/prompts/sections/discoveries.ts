import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import { ClaimsSchema, validateClaims } from "../evidence.js";

export const DiscoveriesSchema = z.object({
  opening: z.string().describe("one or two sentences introducing the most revealing paradox plainly"),
  paradoxes: z.array(z.object({
    title: z.string().describe("2-5 words"),
    tension: z.string().describe("80-100 words: the two things that do not naturally go together, shown in real life"),
    invitation: z.string().describe("40-60 words: what this paradox invites, ending on possibility not problem"),
  })).min(2).max(3),
  claims: ClaimsSchema,
});

export const discoveries: SectionSpec<typeof DiscoveriesSchema> = {
  key: "natal:discoveries",
  label: "Key Paradoxes & Discoveries",
  adminLabel: "Key Paradoxes",
  wordTarget: [400, 450],
  maxTokens: 1_400,
  schema: DiscoveriesSchema,
  validate: (out, brief) => validateClaims(out, out.claims, brief.chart),
  instructions: `Write Key Paradoxes & Discoveries: two or three genuine paradoxes specific to this chart. Look for a dignified planet contrary to sect, a ruler in detriment in a strong house, a stellium that contradicts the chart ruler, a Lot in an unexpected house, or an opposition that plays out between two life areas.

Each paradox: a title of 2 to 5 words; 80 to 100 words showing the two things that do not naturally go together, as lived behaviour the reader will recognise; then 40 to 60 words on what it invites, ending on possibility.

A paradox is a real insight, not a clever opposite. Do not repeat material from the Overview or Superpowers. No planet, sign, or house names in the prose. 400 to 450 words total.

Sect. The benefic out of sect is a strong paradox source: help that arrives unreliably or at a cost. A dignified planet that is out of sect is another.`,
};
