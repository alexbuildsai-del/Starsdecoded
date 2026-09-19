/**
 * The compatibility prompt registry: the pair's section order and everything
 * the pair generator, the admin page and the lab derive from (ADR-39). The
 * same shape as the natal registry, grounded in the pair brief instead of a
 * chart brief.
 */
import { DOCTRINE, STYLE_CONTRACT } from "../system.js";
import { renderVocabularyBlock } from "../vocabulary.js";
import type { Lens } from "../../lib/pairBrief.js";
import { pairFoundation } from "./foundation.js";
import { howYouMeet } from "./sections/howYouMeet.js";
import { twoCharts } from "./sections/twoCharts.js";
import { twoWays } from "./sections/twoWays.js";
import { whereItFlows } from "./sections/whereItFlows.js";
import { whereItRubs } from "./sections/whereItRubs.js";
import { howYouTalk } from "./sections/howYouTalk.js";
import { lensOne } from "./sections/lensOne.js";
import { lensTwo } from "./sections/lensTwo.js";
import { whatToPractise } from "./sections/whatToPractise.js";
import { links } from "./sections/links.js";
import type { PairSectionSpec } from "./shapes.js";

export { PAIR_CLAIMS_CONTRACT, PairClaimSchema, PairClaimsSchema, PairEvidenceRefSchema, labelPairEvidence, storePairClaims, validatePairClaims, type PairClaim, type PairEvidenceRef } from "./evidence.js";
export { PairChapterSchema, PairLinkSchema, PairLinksSchema, PairPassageSchema, PairPractiseSchema, lensContext, proseText, ratingProblems, type PairChapterOutput, type PairSectionSpec } from "./shapes.js";
export { pairFoundation, PairFoundationSchema } from "./foundation.js";

/** Bump when the pair's section set, schemas or doctrine change shape. */
export const PAIR_PROMPT_VERSION = "p1";

export const PAIR_WRITER = `You are the voice of a perceptive, warm, direct human astrologer writing a premium compatibility report for two people who will read it together. You write in plain, exact prose addressed to both of them by their first names, and to each in turn. You treat astrology as a language for describing patterns between two people, never as fate or a verdict. You are specific to these two charts in every sentence.`;

export const PAIR_DOCTRINE = `PAIR DOCTRINE (how to read two charts together, never to be written down for the reader).

- Nothing in either natal report is rewritten. A passage tagged natal quotes or paraphrases one stored report and cites its claim; a passage tagged new is written for the pair from cross-chart evidence and cites a cross aspect or an overlay.
- A cross aspect is one person's function meeting the other's: A's Moon square B's Jupiter is how A's need meets B's excess, in both directions. Read tight before wide, luminaries and Venus and Mars before the rest.
- An overlay is where one person lands in the other's life: A's Sun in B's 12th is A occupying B's private room. Read it from the host's side.
- No score, no number, no rating, no percentage describes the pair, ever. The pair is described in behaviour: what happens on a weekend, at bedtime, in the group chat.
- Hard aspects are framed as growth, never as doom. A square is a friction that trains something; the report says what.
- The lens sets the register and two chapters, never the astronomy. Under the parent and child lens the child's chart is read as potential, never a verdict, and the parent is addressed as the one who adapts.
- Addressing: use the two first names as the brief gives them. "You both" for the pair, the name for one of them. Never "person A" or "person B" in prose.`;

/** Assembled once at module load. Identical across all calls: the cached prefix. */
export const PAIR_SYSTEM = [PAIR_WRITER, "", STYLE_CONTRACT, "", renderVocabularyBlock(), "", DOCTRINE, "", PAIR_DOCTRINE].join("\n");

/** Reader-facing sections in report order; `links` writes the bi-wheel's cards. */
export const PAIR_SECTIONS = [
  howYouMeet, twoCharts, twoWays, whereItFlows, whereItRubs, howYouTalk, lensOne, lensTwo, whatToPractise, links,
] as const;

export const PAIR_FOUNDATION = pairFoundation;

/** Everything the pipeline calls, foundation first. */
export const PAIR_ALL_SECTIONS = [pairFoundation, ...PAIR_SECTIONS] as const;

export type PairSectionId = "howYouMeet" | "twoCharts" | "twoWays" | "whereItFlows" | "whereItRubs" | "howYouTalk" | "lensOne" | "lensTwo" | "whatToPractise" | "links";

export const PAIR_SECTION_IDS: readonly PairSectionId[] = PAIR_SECTIONS.map((s) => s.key.split(":")[1] as PairSectionId);

/** The nine chapters, in order: everything but the link cards. */
export const PAIR_CHAPTER_IDS: readonly PairSectionId[] = PAIR_SECTION_IDS.filter((id) => id !== "links");

export function pairSectionById(id: string): PairSectionSpec | undefined {
  return PAIR_ALL_SECTIONS.find((s) => s.key === `pair:${id}`);
}

export const PAIR_WORD_TARGETS: Record<PairSectionId, [number, number]> = Object.fromEntries(
  PAIR_SECTIONS.map((s) => [s.key.split(":")[1], s.wordTarget]),
) as Record<PairSectionId, [number, number]>;

/** The chapter title under a lens: fixed for seven of them, set by the lens for 07 and 08. */
export function pairChapterTitle(id: PairSectionId, lens: Lens): string {
  const spec = pairSectionById(id);
  if (!spec) return id;
  return spec.lensTitles?.[lens] ?? spec.label;
}

export function pairHasClaims(spec: PairSectionSpec): boolean {
  return "claims" in ((spec.schema as unknown as { shape?: Record<string, unknown> }).shape ?? {});
}
