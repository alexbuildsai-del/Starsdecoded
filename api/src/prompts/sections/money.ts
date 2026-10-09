import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import { ClaimsSchema, validateSectionClaims } from "../evidence.js";

export const MoneySchema = z.object({
  relationshipToResources: z.string().describe("one paragraph: how they earn, keep, and value, from the 2nd ruler"),
  whatWorks: z.string().describe("one paragraph: the specific way resources come to them and what fails"),
  sharedAndExposed: z.string().describe("one paragraph: joint resources, debt, backing, from the 8th ruler"),
  actions: z.array(z.object({ action: z.string(), why: z.string() })).min(3).max(3),
  claims: ClaimsSchema,
});

export const money: SectionSpec<typeof MoneySchema> = {
  key: "natal:money",
  label: "Money & Resources",
  adminLabel: "Money & Resources",
  wordTarget: [250, 320],
  blindWordTarget: [200, 260],
  maxTokens: 2_500,
  schema: MoneySchema,
  validate: (out, brief) => validateSectionClaims(out, brief.chart),
  instructions: `Write Money & Resources. This section is the most likely to drift into generic advice, so it must be anchored: the ruler of the 2nd and where it sits, the ruler of the 8th and where it sits, the Lot of Fortune's house, and Venus and Saturn by sect. Lead with the behaviour those facts produce, and let a fact follow as its reason.

One paragraph on their relationship to earning, keeping, and valuing. One paragraph on the specific way resources come to them and the specific way they lose them, with an example. One paragraph on money that is not solely theirs: backing, debt, inheritance, shared arrangements, and where the exposure is. Then exactly three actions with a short why.

An empty 2nd or 8th is read through its planet in charge, as its EMPTY HOUSES line says: how at ease that planet is in its sign, and why, and which part of life it sits in. Never call money easy or quiet without that reason, and never invent drama.

Going backwards. When the RETROGRADE AT BIRTH lines hold Venus or the planet in charge of the 2nd or 8th, it shapes how they handle money. Let its line in the vocabulary show in the behaviour you describe.

Each paragraph opens on the reader's life, then gives the reason. Name at most one placement a paragraph, inside a sentence, where it first matters: its plain meaning in the next sentence, then a moment the reader can check. Anything ahead is a possibility: could, might, you may notice, never will. The chapter ends on its actions. 250 to 320 words.

Sect. Read the rulers of the 2nd and 8th by sect where they are Venus, Mars, Jupiter or Saturn. The benefic of sect gives resources reliably. The benefic out of sect gives them unreliably or with a cost. The malefic out of sect is where money is lost.`,
};
