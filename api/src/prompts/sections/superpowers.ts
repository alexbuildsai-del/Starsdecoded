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
  label: "Superpowers, Chronic Patterns & Growing Edges",
  adminLabel: "Superpowers / Patterns / Edges",
  wordTarget: [600, 700],
  blindWordTarget: [480, 580],
  maxTokens: 3_600,
  schema: SuperpowersSchema,
  validate: (out, brief) => validateSectionClaims(out, brief.chart),
  // MB-142 provisional: Luna wrote 446 to 502 words here on all five r14-staging charts. Items of 100 to 120 words with
  // two or three actions add up to under 600, so the floor comes with item text and actions that reach it.
  instructions: `Write Superpowers, Chronic Patterns & Growing Edges. Three distinct items that never overlap.

Superpower: what comes naturally and reliably. Evidence: planets in domicile or exaltation, the benefic of sect, angular planets, the South Node. Chronic pattern: what is structurally rooted, cannot be removed, only noticed and managed. Evidence: the malefic contrary to sect, planets in detriment or fall, the tightest hard aspect. Growing edge: what is uncomfortable but possible. Evidence: the North Node, the sect light, the weakest necessary function.

Each item: a title of 2 to 4 words, 130 to 150 words of text with at least one checkable behaviour, and three actions with a short why. Actions are specific to this chart and doable this week. The style is empowering and realistic: no flattery, no diagnosis. No planet, sign, or house names in the prose. 600 to 700 words total. Write at least 600 words: about 200 for each item.

Sect. The benefic of sect is the strongest candidate for the superpower. The malefic of sect also qualifies: day Saturn as earned discipline is a superpower, not a limit. The malefic out of sect is the chronic pattern's first candidate.`,
};
