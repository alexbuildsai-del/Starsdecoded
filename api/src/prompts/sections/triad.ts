import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";

export const TriadSchema = z.object({
  sun: z.object({ label: z.string().describe("e.g. 'Sun in Scorpio, 11th house'"), text: z.string().describe("80-100 words with one behavioural example") }),
  moon: z.object({ label: z.string(), text: z.string() }),
  rising: z.object({ label: z.string().describe("e.g. 'Capricorn rising'"), text: z.string() }),
});

export const triad: SectionSpec<typeof TriadSchema> = {
  key: "natal:triad",
  label: "Core Triad",
  adminLabel: "Core Triad",
  wordTarget: [250, 300],
  maxTokens: 1_000,
  schema: TriadSchema,
  instructions: `Write the Core Triad: Sun, Moon, and rising sign, 80 to 100 words each.

Sun: how they build identity and what they organise their life around, weighted by sect. Moon: what steadies them, what they reach for under stress, and their daily rhythm. Rising: how they come across in the first minute and what the chart ruler's condition adds to that.

Each part carries exactly one behavioural example the reader can check against themselves. The label field names the placement; the text field never does. The three parts must not repeat each other or the Overview.`,
};
