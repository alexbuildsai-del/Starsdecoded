import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";

const Bullet = z.object({ point: z.string().describe("15-20 words, specific to this chart"), why: z.string().describe("one short clause") });

export const FocusSchema = z.object({
  leanInto: z.object({ intro: z.string().describe("one sentence"), bullets: z.array(Bullet).min(3).max(4) }),
  notice: z.object({ intro: z.string(), bullets: z.array(Bullet).min(3).max(4) }),
  practice: z.object({ intro: z.string(), bullets: z.array(Bullet).min(3).max(4) }),
  closing: z.string().describe("80-100 words: personal, grounded, forward-looking, tying the report together"),
});

export const focus: SectionSpec<typeof FocusSchema> = {
  key: "natal:focus",
  label: "What to Focus On",
  adminLabel: "What to Focus On",
  wordTarget: [400, 450],
  maxTokens: 1_400,
  schema: FocusSchema,
  instructions: `Write What to Focus On, the closing section. Three groups of bullets and a closing paragraph.

Lean Into: the strengths to build a life around, from the Superpower and the dignified planets. Notice: the patterns that will always be there, from the Chronic Pattern and the malefic contrary to sect. Practice: where real growth lives, from the Growing Edge and the North Node. Each group has one intro sentence and 3 to 4 bullets of 15 to 20 words, each with a short why. Bullets are specific to this chart and phrased as things to do or watch for, never generic advice.

The closing paragraph, 80 to 100 words, is the one place the report may speak to the whole person: what this chart is asking of them, grounded and hopeful, with no prediction. No planet, sign, or house names in the prose. 400 to 450 words total.`,
};
