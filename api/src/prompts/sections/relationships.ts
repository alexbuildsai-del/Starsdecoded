import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";

export const RelationshipsSchema = z.object({
  howYouLove: z.string().describe("one paragraph: what they need, how they give, what attracts them"),
  theChallenge: z.string().describe("one paragraph: the recurring edge in intimacy, as a pattern they will recognise"),
  whatPartnershipAsks: z.string().describe("one paragraph: the growth direction from the 7th ruler and the nodes"),
  actions: z.array(z.object({ action: z.string(), why: z.string() })).min(3).max(3),
});

export const relationships: SectionSpec<typeof RelationshipsSchema> = {
  key: "natal:relationships",
  label: "Relationships & Intimacy",
  adminLabel: "Relationships & Intimacy",
  wordTarget: [350, 400],
  maxTokens: 1_300,
  schema: RelationshipsSchema,
  instructions: `Write Relationships & Intimacy. Primary evidence: the ruler of the 7th and where it sits, Venus and Mars by dignity and sect, the Moon, and the ruler of the 8th.

One paragraph on how they love: what they need to feel secure, how they give, and what actually attracts them versus what they say does. One paragraph on the recurring challenge, written as a pattern they will recognise from their own history, honest and not judgemental. One paragraph on what partnership is asking them to develop. Then exactly three actions with a short why.

Write the difficult truth compassionately and concretely. No planet, sign, or house names in the prose. 350 to 400 words.`,
};
