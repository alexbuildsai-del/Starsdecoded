import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";

export const CareerSchema = z.object({
  vocationalPull: z.string().describe("one paragraph: what kind of work this chart is drawn to and why it works"),
  howYouShowUp: z.string().describe("one paragraph: how they operate at work and what colleagues notice"),
  growthThroughWork: z.string().describe("one paragraph: the edge the North Node and the 10th ruler ask for"),
  actions: z.array(z.object({
    action: z.string().describe("a specific, doable action"),
    why: z.string().describe("one short clause: why it matters for this chart"),
  })).min(3).max(3),
});

export const career: SectionSpec<typeof CareerSchema> = {
  key: "natal:career",
  label: "Career & Calling",
  adminLabel: "Career & Calling",
  wordTarget: [350, 400],
  maxTokens: 1_300,
  schema: CareerSchema,
  instructions: `Write Career & Calling. The primary evidence is the ruler of the 10th: where it sits, its dignity, its sect condition. Then the Sun and Saturn by sect, then the Lot of Spirit's house, then the North Node.

One paragraph on the kind of work this chart is pulled toward and the route that actually works for them, not the route they may assume. One paragraph on how they show up: what they are like to work with and what people notice first. One paragraph on the growth edge at work. Then exactly three actions, each with a short why.

Be honest about cost. Where the 10th ruler is in detriment or fall, say plainly that the route is not the easy one, as behaviour, not as doctrine. No planet, sign, or house names in the prose. 350 to 400 words.`,
};
