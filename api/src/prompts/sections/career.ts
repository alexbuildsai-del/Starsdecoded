import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import { ClaimsSchema, validateClaims } from "../evidence.js";

export const CareerSchema = z.object({
  vocationalPull: z.string().describe("one paragraph: what kind of work this chart is drawn to and why it works"),
  howYouShowUp: z.string().describe("one paragraph: how they operate at work and what colleagues notice"),
  growthThroughWork: z.string().describe("one paragraph: the edge the North Node and the 10th ruler ask for"),
  actions: z.array(z.object({
    action: z.string().describe("a specific, doable action"),
    why: z.string().describe("one short clause: why it matters for this chart"),
  })).min(3).max(3),
  careerPaths: z.array(z.object({
    item: z.string().describe("a kind of work or a role, 2-6 words"),
    reason: z.string().describe("one concrete reason this chart does well there"),
  })).min(3).max(4),
  claims: ClaimsSchema,
});

export const career: SectionSpec<typeof CareerSchema> = {
  key: "natal:career",
  label: "Career & Calling",
  adminLabel: "Career & Calling",
  wordTarget: [350, 450],
  blindWordTarget: [280, 360],
  maxTokens: 3_200,
  schema: CareerSchema,
  validate: (out, brief) => validateClaims(out, out.claims, brief.chart),
  instructions: `Write Career & Calling. The primary evidence is the ruler of the 10th: where it sits, its dignity, its sect condition. Then the Sun and Saturn by sect, then the Lot of Spirit's house, then the North Node.

One paragraph on the kind of work this chart is pulled toward and the route that actually works for them, not the route they may assume. One paragraph on how they show up: what they are like to work with and what people notice first. One paragraph on the growth edge at work. Then exactly three actions, each with a short why.

Then three or four career paths. Each is a kind of work or a role, followed by one concrete reason this chart does well in it. Phrase them as a tendency and never as a promise: what the work asks for is what this chart already does. They carry no claims, so keep each reason to something the prose above has already earned.

Be honest about cost. Where the 10th ruler is in detriment or fall, say plainly that the route is not the easy one, as behaviour, not as doctrine. No planet, sign, or house names in the prose. 350 to 450 words.

Sect. Read Saturn by sect. Day chart: Saturn is structure, endurance and earned authority. Night chart: Saturn is the harshest planet in this chart, and the career copy must say so in behaviour rather than default to \"discipline\". Read the Sun by sect for how visibly the person wants to be seen doing the work.`,
};
