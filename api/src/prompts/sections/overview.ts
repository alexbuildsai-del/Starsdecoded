import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import { ClaimsSchema, validateSectionClaims } from "../evidence.js";
import { DidYouKnowSchema, didYouKnowContext } from "../didYouKnow.js";

export const OverviewSchema = z.object({
  headline: z.string().describe("one sentence: what this chart is built around"),
  concentration: z.string().describe("one paragraph: where the energy concentrates and what is quiet, as behaviour"),
  temperament: z.string().describe("one paragraph: the baseline way this person operates, with recognisable examples"),
  distinctive: z.string().describe("one paragraph: what is unusual about this specific combination"),
  bridge: z.string().describe("one sentence that points forward: 'Everything here points toward ...'"),
  claims: ClaimsSchema,
  didYouKnow: DidYouKnowSchema,
});

export const overview: SectionSpec<typeof OverviewSchema> = {
  key: "natal:overview",
  label: "Chart Overview",
  adminLabel: "Chart Overview",
  wordTarget: [400, 500],
  blindWordTarget: [320, 400],
  maxTokens: 3_000,
  schema: OverviewSchema,
  validate: (out, brief) => validateSectionClaims(out, brief.chart),
  extraContext: (brief) => didYouKnowContext("overview", brief),
  blindRules: [
    "There is no house, chart ruler or sect. A stellium is named by its sign: the headline names that sign and says in plain words what it brings out in this person, and every mention of the stellium's house above reads as its sign. Ground the rest in the Sun, the Moon and the planets at home in their signs.",
  ],
  // MB-92 provisional: two of five r14-staging overviews printed the old quoted form word for word, so the stellium
  // opening is described and never given as a line.
  // MB-142 provisional: Luna wrote 306 to 381 words here on all five r14-staging charts, under the 400 floor.
  // With two stelliums the personal planets choose the opening: a group of outer planets is shared by everyone born
  // within a few years, so it says less about this one person.
  instructions: `Write the Chart Overview. This is the entry point: the reader should feel accurately seen within the first two sentences.

Open with a headline that names what the chart is built around. Then one paragraph on where the energy concentrates and what is quiet, written as behaviour the reader will recognise. Then one paragraph on temperament: how they take in the world, decide, and act, with at least two concrete examples the reader can check against an ordinary week. Then one paragraph on what makes this combination unusual. Close with a single bridging sentence beginning "Everything here points toward".

The opening. When the STELLIUMS lines hold one, the Overview opens on it. The headline names the house it fills and says in plain words which part of life gets most of this person's attention. The paragraph on where the energy concentrates is read apart from the headline. It opens on where that attention goes in their life, then gives the reason: which bodies share that house, and that three or more together is called a stellium. Then one moment where it shows. With two stelliums, open on the one holding more of the Sun, Moon, Mercury, Venus and Mars, or the first listed when they hold as many. There is no set first line: word it for this chart. With no stellium, the headline opens on the reader's life. Ground the rest in the chart ruler and the sect light.

Half the sky. When the brief has a HALF THE SKY line, give it one sentence in the paragraph on where the energy concentrates, in life words. Most planets above the horizon point to a life lived more in public, below it to one lived more in private. Most in the east point to a self-led life, in the west to one shaped more by other people.

Temperament names the pair. The DISTRIBUTION line gives the dominant element and the dominant modality. Name both in the temperament paragraph, in plain words, as how this person runs: what they are made of and what they do with a course once they are on it. Cardinal starts, fixed holds, mutable adapts. Give that paragraph a claim for each placement it rests on.

Each paragraph opens on the reader's life, then gives the reason. Name at most one placement a paragraph, inside a sentence, where it first matters: its plain meaning in the next sentence, then a moment the reader can check. Anything ahead is a possibility: could, might, you may notice, never will. Do not list. 400 to 500 words total. Write at least 400 words: each of the three paragraphs runs 125 to 150 words.

Sect. The SECT block names the sect light: write it as the side of this person the chart is organised around, in behaviour. Never write luminary, sect, day chart or night chart. Name the malefic out of sect as the chart's central friction, in behaviour. The planet may be named as the rule above allows, but its sect stays out of the words.`,
};
