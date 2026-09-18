import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import { ClaimsSchema, validateClaims } from "../evidence.js";

export const PathSchema = z.object({
  fallBackOn: z.string().describe("one paragraph: the moves already fluent, and the moment they become an escape"),
  headedToward: z.string().describe("one paragraph: the unpractised direction and what doing it looks like on an ordinary day"),
  tenderSpot: z.string().describe("one paragraph: what stays sensitive and what they do with it"),
  claims: ClaimsSchema,
});

export const path: SectionSpec<typeof PathSchema> = {
  key: "natal:path",
  label: "Your Path",
  adminLabel: "Your Path",
  wordTarget: [250, 300],
  maxTokens: 2_500,
  schema: PathSchema,
  validate: (out, brief) => validateClaims(out, out.claims, brief.chart),
  instructions: `Write Your Path. Three short paragraphs, 250 to 300 words in total.

Read the nodes as one axis and never as two separate things: what they fall back on and where they are headed are the two ends of one line. The South Node end is the set of moves already fluent, the ones that work and the ones that get reached for too early. The North Node end is the direction that feels unpractised and is worth practising anyway. Chiron is the tender spot: the place that stays sensitive, and usually the place where they are careful with other people because they know the feeling.

What you fall back on: the competence that is already there, and the exact moment it turns into an escape. Where you are headed: what the unfamiliar end asks for in ordinary terms, with one example of what doing it looks like on a normal day. The tender spot: what still stings and what they do with it, honestly and with no diagnosis.

No fate and no karma. Never write "past life", "destiny", "meant to", "soul", or "wounded healer". The nodes and Chiron rule nothing and have no dignity, so read them by house and by axis, as colour on the rest of the chart. No planet, sign, or house names in the prose.`,
};
