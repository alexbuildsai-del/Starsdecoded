import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import { ClaimsSchema, validateClaims } from "../evidence.js";

export const OverviewSchema = z.object({
  headline: z.string().describe("one sentence: what this chart is built around"),
  concentration: z.string().describe("one paragraph: where the energy concentrates and what is quiet, as behaviour"),
  temperament: z.string().describe("one paragraph: the baseline way this person operates, with recognisable examples"),
  distinctive: z.string().describe("one paragraph: what is unusual about this specific combination"),
  bridge: z.string().describe("one sentence that points forward: 'Everything here points toward ...'"),
  claims: ClaimsSchema,
});

export const overview: SectionSpec<typeof OverviewSchema> = {
  key: "natal:overview",
  label: "Chart Overview",
  adminLabel: "Chart Overview",
  wordTarget: [400, 500],
  maxTokens: 3_000,
  schema: OverviewSchema,
  validate: (out, brief) => validateClaims(out, out.claims, brief.chart),
  instructions: `Write the Chart Overview. This is the entry point: the reader should feel accurately seen within the first two sentences.

Open with a headline that names what the chart is built around. Then one paragraph on where the energy concentrates and what is quiet, written entirely as behaviour the reader will recognise. Then one paragraph on temperament: how they take in the world, decide, and act, with at least two concrete examples of the form "You investigate first and commit second." Then one paragraph on what makes this combination unusual. Close with a single bridging sentence beginning "Everything here points toward".

Temperament names the pair. The DISTRIBUTION line gives the dominant element and the dominant modality. Name both in the temperament paragraph, in plain words, as how this person runs: what they are made of and what they do with a course once they are on it. Cardinal starts, fixed holds, mutable adapts. Element and modality words are allowed here, because they are not planet, sign or house names. Cite that paragraph to the placements that carry the pair.

Ground the whole thing in sect, the chart ruler, and any stellium. Do not name planets, signs, or houses in the prose. Do not list. 400 to 500 words total.

Sect. The SECT block names the sect light: frame it as the leading luminary, the one this chart is organised around. Name the malefic out of sect as the chart's central friction, in behaviour, not by name.`,
};
