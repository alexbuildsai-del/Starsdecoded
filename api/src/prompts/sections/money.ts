import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";

export const MoneySchema = z.object({
  relationshipToResources: z.string().describe("one paragraph: how they earn, keep, and value, from the 2nd ruler"),
  whatWorks: z.string().describe("one paragraph: the specific way resources come to them and what fails"),
  sharedAndExposed: z.string().describe("one paragraph: joint resources, debt, backing, from the 8th ruler"),
  actions: z.array(z.object({ action: z.string(), why: z.string() })).min(3).max(3),
});

export const money: SectionSpec<typeof MoneySchema> = {
  key: "natal:money",
  label: "Money & Resources",
  adminLabel: "Money & Resources",
  wordTarget: [250, 300],
  maxTokens: 1_100,
  schema: MoneySchema,
  instructions: `Write Money & Resources. This section is the most likely to drift into generic advice, so it must be anchored: the ruler of the 2nd and where it sits, the ruler of the 8th and where it sits, the Lot of Fortune's house, and Venus and Saturn by sect. Cite the behaviour those facts produce, never the facts.

One paragraph on their relationship to earning, keeping, and valuing. One paragraph on the specific way resources come to them and the specific way they lose them, with an example. One paragraph on money that is not solely theirs: backing, debt, inheritance, shared arrangements, and where the exposure is. Then exactly three actions with a short why.

If the chart is genuinely quiet here, say what that quiet looks like in practice rather than inventing drama. No planet, sign, or house names in the prose. 250 to 300 words.`,
};
