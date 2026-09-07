import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";

export const FamilySchema = z.object({
  whatYouCarry: z.string().describe("one paragraph: inherited patterns and the atmosphere of origin"),
  whatRootsYou: z.string().describe("one paragraph: what they need in order to feel at home, as behaviour"),
  theInheritedEdge: z.string().describe("one paragraph: the family pattern that is theirs to change"),
  actions: z.array(z.object({ action: z.string(), why: z.string() })).min(2).max(3),
});

export const family: SectionSpec<typeof FamilySchema> = {
  key: "natal:family",
  label: "Family & Roots",
  adminLabel: "Family & Roots",
  wordTarget: [250, 300],
  maxTokens: 1_100,
  schema: FamilySchema,
  instructions: `Write Family & Roots. Primary evidence: the ruler of the 4th and where it sits, the Moon by sect and dignity, Saturn by sect, and anything in the 4th.

One paragraph on what they carry from where they came from: the atmosphere, the inherited habits, the roles they were handed. One paragraph on what actually roots them now and what they need in a home, as behaviour. One paragraph on the inherited pattern that is theirs to change rather than repeat. Then two or three actions with a short why.

Do not speculate about specific family events. Describe patterns the reader can confirm or reject. No planet, sign, or house names in the prose. 250 to 300 words.`,
};
