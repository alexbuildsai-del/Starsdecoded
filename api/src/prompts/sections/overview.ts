import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";

export const OverviewSchema = z.object({
  headline: z.string().describe("one sentence: what this chart is built around"),
  concentration: z.string().describe("one paragraph: where the energy concentrates and what is quiet, as behaviour"),
  temperament: z.string().describe("one paragraph: the baseline way this person operates, with recognisable examples"),
  distinctive: z.string().describe("one paragraph: what is unusual about this specific combination"),
  bridge: z.string().describe("one sentence that points forward: 'Everything here points toward ...'"),
});

export const overview: SectionSpec<typeof OverviewSchema> = {
  key: "natal:overview",
  label: "Chart Overview",
  adminLabel: "Chart Overview",
  wordTarget: [400, 450],
  maxTokens: 1_200,
  schema: OverviewSchema,
  instructions: `Write the Chart Overview. This is the entry point: the reader should feel accurately seen within the first two sentences.

Open with a headline that names what the chart is built around. Then one paragraph on where the energy concentrates and what is quiet, written entirely as behaviour the reader will recognise. Then one paragraph on temperament: how they take in the world, decide, and act, with at least two concrete examples of the form "You investigate first and commit second." Then one paragraph on what makes this combination unusual. Close with a single bridging sentence beginning "Everything here points toward".

Ground the whole thing in sect, the chart ruler, and any stellium. Do not name planets, signs, or houses in the prose. Do not list. 400 to 450 words total.`,
};
