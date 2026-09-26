import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import { fixed, type Check } from "../checks.js";

export const FoundationSchema = z.object({
  sect: z.enum(["day", "night"]).describe("copied exactly from the SECT block"),
  sectLight: z.enum(["sun", "moon"]).describe("copied exactly from the SECT block"),
  chartThesis: z.string().describe("2-3 sentences: the central psychological story of this chart"),
  dominantPattern: z.string().describe("2-3 sentences: the strongest repeated pattern and how it operates"),
  centralTension: z.string().describe("2-3 sentences: the most important push-pull and what each side protects"),
  supportingEvidence: z.array(z.object({
    placement: z.string().describe("the placement, ruler chain, lot, or aspect"),
    observation: z.string().describe("the specific evidence"),
    implication: z.string().describe("what it means in this person's life"),
  })).min(3).max(6),
  sectionGuidance: z.object({
    overview: z.string(), triad: z.string(), mind: z.string(), career: z.string(), money: z.string(),
    relationships: z.string(), family: z.string(), superpowers: z.string(), discoveries: z.string(), focus: z.string(),
  }).describe("one sentence per section: the single thing it must establish"),
});

/** Without a horizon there is no sect to echo. */
export const FoundationBlindSchema = FoundationSchema.omit({ sect: true, sectLight: true });

export const foundation: SectionSpec<typeof FoundationSchema> = {
  key: "natal:foundation",
  label: "Foundation",
  adminLabel: "Foundation (internal)",
  wordTarget: [0, 0],
  maxTokens: 4_000,
  schema: FoundationSchema,
  blindSchema: FoundationBlindSchema,
  blindRules: [
    "There is no sect, no chart ruler, no house ruler and no lot: return no sect fields, and read the chart in this order instead: the Sun, the Moon, the dignified planets, the stellium, then the tightest aspects.",
    "Never name a house, the Ascendant, the Midheaven, rising, day or night, or a lot anywhere in the handoff.",
  ],
  // The sect is computed, never the model's to decide: a wrong echo is overwritten and logged (annex row 12).
  validate: (out, brief) => {
    const s = brief.sect;
    const checks: Check[] = [];
    if (!s) return { output: out, checks };
    const output = { ...out };
    if (out.sect !== s.sect) { checks.push(fixed("chk-12", `sect is ${s.sect}, not ${out.sect}; overwritten from the brief`)); output.sect = s.sect; }
    if (out.sectLight !== s.sect_light) { checks.push(fixed("chk-12", `sect light is ${s.sect_light}, not ${out.sectLight}; overwritten from the brief`)); output.sectLight = s.sect_light; }
    return { output, checks };
  },
  instructions: `Build the internal foundation for this natal report. This is an editorial handoff, not reader-facing prose. Identify the few patterns that should organise the whole report so that every section can be specific and none repeat.

State the sect and sect light exactly as the SECT block gives them; every downstream section reads your value. Read the chart in this order: sect, chart ruler, the Sun, Moon and Ascendant, then the rulers of the 10th, 2nd, 7th, and 4th and where they sit, then the Lots, then the tightest aspects. Weigh rulers over occupants and dignified over peregrine.

Supporting evidence must cite specific chart facts from the brief. Section guidance must give each of the ten sections one distinct thing to establish, so they do not overlap. The style contract does not apply to this internal output, but keep it evidence-based and free of generic personality labels.`,
};
