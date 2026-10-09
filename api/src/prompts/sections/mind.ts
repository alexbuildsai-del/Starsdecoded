import { z } from "zod/v4";
import type { SectionSpec } from "../types.js";
import { ClaimsSchema, validateSectionClaims } from "../evidence.js";
import { DidYouKnowSchema, didYouKnowContext } from "../didYouKnow.js";

export const MindSchema = z.object({
  howYouThink: z.string().describe("one paragraph: perception, reasoning, what kind of thinking comes easily"),
  howYouDecide: z.string().describe("one paragraph: the actual decision process, with an example"),
  howYouAreUnderstood: z.string().describe("one paragraph: how they explain themselves and where it goes wrong"),
  practice: z.string().describe("one concrete practice, one or two sentences"),
  claims: ClaimsSchema,
  didYouKnow: DidYouKnowSchema,
});

export const mind: SectionSpec<typeof MindSchema> = {
  key: "natal:mind",
  label: "Mind & Communication",
  adminLabel: "Mind & Communication",
  wordTarget: [250, 320],
  blindWordTarget: [200, 260],
  maxTokens: 2_500,
  schema: MindSchema,
  validate: (out, brief) => validateSectionClaims(out, brief.chart),
  extraContext: (brief) => didYouKnowContext("mind", brief),
  // MB-142 provisional: Luna wrote 209 to 247 words here on all five r14-staging charts, under the 250 floor.
  instructions: `Write Mind & Communication. Read Mercury by sign, house, dignity, and its aspects, then the rulers of the 3rd and 9th and where they sit.

One paragraph on how they think: what they notice, what they miss, what kind of reasoning is native to them. One paragraph on how they actually decide, including one example of a decision going the way it usually goes. One paragraph on how they make themselves understood and the specific way it misfires. End with one practice.

How they decide reads the modality. The dominant modality on the DISTRIBUTION line is the shape of a decision: cardinal opens one and moves, fixed settles it once and holds, mutable keeps it revisable. Say what that looks like when this person decides something real, and give that paragraph a claim for each placement it rests on. The modality word may be used, with its plain meaning.

Going backwards. When the RETROGRADE AT BIRTH lines hold Mercury, it shapes how they think and speak. When they hold Jupiter, it shapes what they believe, in the paragraph on how they think. The planet in charge of the 3rd or 9th does the same when it is listed there. Let each one's line in the vocabulary show in the behaviour you describe.

Every paragraph opens on the reader's life and contains a checkable behaviour, then gives the reason. Name at most one placement a paragraph, inside a sentence, where it first matters: its plain meaning in the next sentence, then a moment the reader can check. Anything ahead is a possibility: could, might, you may notice, never will. The chapter ends on its practice. 250 to 320 words. Write at least 250 words: each of the three paragraphs runs 80 to 95 words.

Sect. Mercury has no sect. Read it by placement, dignity and its aspects. Do not import day or night framing here.`,
};
