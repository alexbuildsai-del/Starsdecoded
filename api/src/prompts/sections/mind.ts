import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";

export const MindSchema = z.object({
  howYouThink: z.string().describe("one paragraph: perception, reasoning, what kind of thinking comes easily"),
  howYouDecide: z.string().describe("one paragraph: the actual decision process, with an example"),
  howYouAreUnderstood: z.string().describe("one paragraph: how they explain themselves and where it goes wrong"),
  practice: z.string().describe("one concrete practice, one or two sentences"),
});

export const mind: SectionSpec<typeof MindSchema> = {
  key: "natal:mind",
  label: "Mind & Communication",
  adminLabel: "Mind & Communication",
  wordTarget: [250, 300],
  maxTokens: 1_000,
  schema: MindSchema,
  instructions: `Write Mind & Communication. Read Mercury by sign, house, dignity, and its aspects, then the rulers of the 3rd and 9th and where they sit.

One paragraph on how they think: what they notice, what they miss, what kind of reasoning is native to them. One paragraph on how they actually decide, including one example of a decision going the way it usually goes. One paragraph on how they make themselves understood and the specific way it misfires. End with one practice.

Every paragraph contains a checkable behaviour. No planet, sign, or house names in the prose. 250 to 300 words.`,
};
