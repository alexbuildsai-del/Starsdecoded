import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import { ClaimsSchema, validateClaims } from "../evidence.js";

export const RelationshipsSchema = z.object({
  howYouLove: z.string().describe("one paragraph: what they need, how they give, what attracts them"),
  theChallenge: z.string().describe("one paragraph: the recurring edge in intimacy, as a pattern they will recognise"),
  whatPartnershipAsks: z.string().describe("one paragraph: the growth direction from the 7th ruler and the nodes"),
  actions: z.array(z.object({ action: z.string(), why: z.string() })).min(3).max(3),
  connectBestWith: z.array(z.object({
    item: z.string().describe("a placement or sign emphasis in the partner's chart, 3-8 words, e.g. 'A Moon or Venus in an earth sign'"),
    reason: z.string().describe("why, from this chart, in one clause; may name the reader's own placement it answers"),
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

Then three or four placements they connect best with in a partner's chart: a planet in a sign or element, an emphasis, or a prominent body, of the form "A Moon or Venus in an earth sign" or "A prominent Mercury". Each item is followed by one concrete reason from this chart, and the reason may name the reader's own placement it answers, as in "matching the earth weight your Venus carries" or "talking every day is how you bond". This list is a labelled register, so rule 8 does not apply to it. Phrase every item as a tendency and never as a promise. They carry no claims.

Write the difficult truth compassionately and concretely. No planet, sign, or house names in the prose. 350 to 450 words.

Sect. Venus and Mars are both sect-determined. Night chart: Venus is in sect and strong, Mars is constructive. Day chart: Venus is out of sect and less reliable, Mars is out of sect and the difficult planet in intimacy. Do not write this section without the SECT block.`,
};
