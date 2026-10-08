import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import { ClaimsSchema, validateSectionClaims } from "../evidence.js";

const Item = z.object({
  title: z.string().describe("2-4 words"),
  text: z.string().describe("130-150 words: what it is, where it shows, why it persists"),
  actions: z.array(z.object({ action: z.string(), why: z.string() })).min(2).max(3),
});

export const SuperpowersSchema = z.object({
  superpower: Item.describe("what comes naturally: dignified planets, the sect benefic, the South Node"),
  chronicPattern: Item.describe("what is structurally rooted and can only be managed: the malefic contrary to sect, detriment or fall"),
  growingEdge: Item.describe("what is uncomfortable and possible: the North Node, the sect light's growth"),
  claims: ClaimsSchema,
});

export const superpowers: SectionSpec<typeof SuperpowersSchema> = {
  key: "natal:superpowers",
  label: "Strengths, Habits & Where You Can Grow",
  adminLabel: "Strengths, Habits & Where You Can Grow",
  wordTarget: [600, 700],
  blindWordTarget: [480, 580],
  maxTokens: 3_600,
  schema: SuperpowersSchema,
  validate: (out, brief) => validateSectionClaims(out, brief.chart),
  // MB-142 provisional: Luna wrote 446 to 502 words here on all five r14-staging charts. Items of 100 to 120 words with
  // two or three actions add up to under 600, so the floor comes with item text and actions that reach it.
  instructions: `Write Strengths, Habits & Where You Can Grow. Three distinct items that never overlap.

Superpower: what comes naturally and reliably. Evidence: planets in domicile or exaltation, the benefic of sect, angular planets (the ANGULAR line), the South Node. Chronic pattern: what is structurally rooted, cannot be removed, only noticed and managed. Evidence: the malefic contrary to sect, planets in detriment or fall, the tightest hard aspect. Growing edge: what is uncomfortable but possible. Evidence: the North Node, the sect light, the weakest necessary function.

Going backwards. When the RETROGRADE AT BIRTH lines hold Jupiter and Jupiter is the benefic of sect, it shapes the superpower. Any other planet an item rests on shapes that item the same way when it is listed there. Let each one's line in the vocabulary show in the behaviour you describe.

Each item: a title of 2 to 4 words, 130 to 150 words of text with at least one checkable behaviour, and three actions with a short why. Actions are specific to this chart and doable this week. The style is empowering and realistic: no flattery, no diagnosis. Each text opens on the reader's life, then gives the reason. It names at most one placement, inside a sentence, where it first matters: its plain meaning in the next sentence, then a moment the reader can check. Anything ahead is a possibility: could, might, you may notice, never will. Each item ends on its actions. 600 to 700 words total. Write at least 600 words: about 200 for each item.

Sect. The benefic of sect is the strongest candidate for the superpower. The malefic of sect also qualifies: day Saturn as earned discipline is a superpower, not a limit. The malefic out of sect is the chronic pattern's first candidate.`,
};
