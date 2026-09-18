import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import { ClaimsSchema, validateClaims } from "../evidence.js";

export const RelationshipsSchema = z.object({
  howYouLove: z.string().describe("one paragraph: what they need, how they give, what attracts them"),
  theChallenge: z.string().describe("one paragraph: the recurring edge in intimacy, as a pattern they will recognise"),
  whatPartnershipAsks: z.string().describe("one paragraph: the growth direction from the 7th ruler and the nodes"),
  actions: z.array(z.object({ action: z.string(), why: z.string() })).min(3).max(3),
  connectBestWith: z.array(z.object({
    item: z.string().describe("a kind of person, 2-6 words, never a sign"),
    reason: z.string().describe("one concrete reason this pairing works for this chart"),
  })).min(3).max(4),
  claims: ClaimsSchema,
});

export const relationships: SectionSpec<typeof RelationshipsSchema> = {
  key: "natal:relationships",
  label: "Relationships & Intimacy",
  adminLabel: "Relationships & Intimacy",
  wordTarget: [350, 450],
  maxTokens: 3_200,
  schema: RelationshipsSchema,
  validate: (out, brief) => validateClaims(out, out.claims, brief.chart),
  instructions: `Write Relationships & Intimacy. Primary evidence: the ruler of the 7th and where it sits, Venus and Mars by dignity and sect, the Moon, and the ruler of the 8th.

One paragraph on how they love: what they need to feel secure, how they give, and what actually attracts them versus what they say does. One paragraph on the recurring challenge, written as a pattern they will recognise from their own history, honest and not judgemental. One paragraph on what partnership is asking them to develop. Then exactly three actions with a short why.

Then three or four kinds of person they connect best with. Each is a kind of person described by how they behave, never a sign and never a chart, followed by one concrete reason that pairing works here. Phrase them as a tendency and never as a promise. They carry no claims.

Write the difficult truth compassionately and concretely. No planet, sign, or house names in the prose. 350 to 450 words.

Sect. Venus and Mars are both sect-determined. Night chart: Venus is in sect and strong, Mars is constructive. Day chart: Venus is out of sect and less reliable, Mars is out of sect and the difficult planet in intimacy. Do not write this section without the SECT block.`,
};
