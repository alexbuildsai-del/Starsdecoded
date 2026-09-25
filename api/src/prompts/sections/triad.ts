import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import { ClaimsSchema, validateSectionClaims } from "../evidence.js";

export const TriadSchema = z.object({
  sun: z.object({ label: z.string().describe("e.g. 'Sun in Scorpio, 11th house'"), text: z.string().describe("80-100 words with one behavioural example") }),
  moon: z.object({ label: z.string(), text: z.string() }),
  rising: z.object({ label: z.string().describe("e.g. 'Capricorn rising'"), text: z.string() }),
  claims: ClaimsSchema,
});

/** Without a horizon there is no rising sign, so the blind triad is the two luminaries. */
export const TriadBlindSchema = TriadSchema.omit({ rising: true });

export const triad: SectionSpec<typeof TriadSchema> = {
  key: "natal:triad",
  label: "Core Triad",
  adminLabel: "Core Triad",
  wordTarget: [250, 320],
  blindWordTarget: [160, 200],
  maxTokens: 2_500,
  schema: TriadSchema,
  validate: (out, brief) => validateSectionClaims(out, brief.chart),
  blindSchema: TriadBlindSchema,
  blindRules: [
    "There is no rising part. Write the Sun and the Moon parts only, 80 to 100 words each, and return no rising field.",
    "Never name a house, the Ascendant, the Midheaven, a rising sign, day or night, or a lot. The Sun and Moon parts read the sign, the dignity and the aspects alone.",
  ],
  instructions: `Write the Core Triad: Sun, Moon, and rising sign, 80 to 100 words each.

Sun: how they build identity and what they organise their life around, weighted by sect. Moon: what steadies them, what they reach for under stress, and their daily rhythm. Rising: how they come across in the first minute. Read the rising sign first, then what the chart ruler's condition adds to it.

Each part carries exactly one behavioural example the reader can check against themselves. The label field names the placement; the text field never does. The three parts must not repeat each other or the Overview.

Sect. The sect light leads the triad. In a day chart the Sun part carries the most weight and the Moon part answers to it; in a night chart the reverse. Do not treat the three as co-equal.`,
};
