/**
 * The compatibility prompt registry (ADR-39, ADR-63): seventeen specs, two
 * fixed and fifteen lens chapters, plus the link cards. Everything the pair
 * generator, the admin page and the lab derive from. The same shape as the
 * natal registry, grounded in the pair brief instead of a chart brief.
 */
import { DOCTRINE, STYLE_CONTRACT } from "../system.js";
import { renderVocabularyBlock } from "../vocabulary.js";
import { LENSES, type Lens } from "../../lib/pairBrief.js";
import { pairFoundation } from "./foundation.js";
import { twoCharts } from "./sections/twoCharts.js";
import { whatToPractise } from "./sections/whatToPractise.js";
import { links } from "./sections/links.js";
import { PARTNERS } from "./sections/partners/index.js";
import { PARENT_CHILD } from "./sections/parent-child/index.js";
import { PEOPLE } from "./sections/people/index.js";
import type { PairSectionSpec } from "./shapes.js";

export { PAIR_CLAIMS_CONTRACT, PairClaimSchema, PairClaimsSchema, PairEvidenceRefSchema, crossLinkKey, labelPairEvidence, reconcilePairClaims, reconcilePairRef, storePairClaims, validatePairClaims, type PairClaim, type PairEvidenceRef } from "./evidence.js";
export {
  CARD_LINE_BUFFER, CARD_LINE_WORDS, GROWN_RULE, NOW_AND_LATER_RULE,
  PairLensChapterSchema, PairLinkSchema, PairLinksSchema, PairPractiseSchema, PairTwoChartsSchema,
  bandChecks, bandProblems, cardLineChecks, cardLineProblems, evidenceChecks, evidenceProblems, hasVerb, houseChecks, lensChapter, lensChapterChecks, lensChapterId, lensContext,
  nameRegExp, proseText, ratingChecks, ratingProblems, sceneChecks, sceneProblems, scenesOf, spellSmallNumbers, stripBracketedBodies, stripBracketsDeep, twoChartsChecks, whyChecks, whyProblems,
  type BandDoctrine, type PairLensChapterOutput, type PairSectionSpec, type PairTwoChartsOutput, type SceneSet, type SceneTitles,
} from "./shapes.js";
export { pairFoundation, PairFoundationSchema, allocationOf, foundationChecks, foundationProblems, LENS_CHAPTERS, type PairFoundationOutput } from "./foundation.js";

/** Bump when the pair's section set, schemas or doctrine change shape. p2: seven chapters, the two charts first. */
export const PAIR_PROMPT_VERSION = "p2";

export const PAIR_WRITER = `You are the voice of a perceptive, warm, direct human astrologer writing a premium compatibility report for two people who will read it together. You write in plain, exact prose addressed to both of them by their first names, and to each in turn. You treat astrology as a language for describing patterns between two people, never as fate or a verdict. You are specific to these two charts in every sentence, and what you describe is tangible: a room, an evening, a message, a bill. Your sentences average 15 words or fewer and none is over 25; simpler sentences over complicated vocabulary, always.`;

export const PAIR_DOCTRINE = `PAIR DOCTRINE (how to read two charts together, never to be written down for the reader).

- Nothing in either personal report is rewritten. A card line and a because-line take that person's own words from their personal report and cite its claim; the scene, the pattern and the verdict are written for the pair from the links and cite them.
- A cross aspect is one person's function meeting the other's: A's Moon square B's Jupiter is how A's need meets B's excess, in both directions. Read tight before wide, luminaries and Venus and Mars before the rest.
- An overlay is where one person lands in the other's life: A's Sun in B's 12th is A occupying B's private room. Read it from the host's side.
- The report is a counselling workbook: what happens on an ordinary day, then why, then what to do next time. The why is the mechanism, the need or fear or habit under the behaviour, never a label.
- No score, no number, no rating, no percentage describes the pair, ever. No research is named on the page: it is doctrine, and the reader gets its conclusion as plain behaviour.
- Hard aspects are framed as growth, never as doom. A square is a friction that trains something; the report says what. Every chapter's pattern says whether this is where it flows or where it rubs.
- The lens sets the register, the chapters and the scenes, never the astronomy. Under the parent and child lens the child's chart is read as potential, never a verdict, the parent is addressed as the one who adapts, and every line is fair to the child's age band. Under two people, how they know each other picks the scene and a few words of register.
- Voice: warm and exact in the body; the headline and the next-time items are drier, a verdict and a list, in the second person's own register.
- Addressing: use the two first names as the brief gives them. "You both" for the pair, the name for one of them. Never "person A" or "person B" in prose.`;

/** Assembled once at module load. Identical across all calls: the cached prefix. */
export const PAIR_SYSTEM = [PAIR_WRITER, "", STYLE_CONTRACT, "", renderVocabularyBlock(), "", DOCTRINE, "", PAIR_DOCTRINE].join("\n");

/** The five day-to-day chapters of each lens, 02 to 06 in order. */
export const LENS_SECTIONS: Record<Lens, readonly PairSectionSpec[]> = {
  partners: PARTNERS,
  parent_child: PARENT_CHILD,
  people: PEOPLE,
};

/** Every reader-facing spec under every lens, the fixed two once; `links` writes the bi-wheel's cards. */
export const PAIR_SECTIONS: readonly PairSectionSpec[] = [
  twoCharts, ...LENSES.flatMap((lens) => LENS_SECTIONS[lens]), whatToPractise, links,
];

export const PAIR_FOUNDATION = pairFoundation;

/** Everything the pipeline may call, foundation first. */
export const PAIR_ALL_SECTIONS: readonly PairSectionSpec[] = [pairFoundation, ...PAIR_SECTIONS];

export type PairSectionId = string;

const idOf = (spec: PairSectionSpec): string => spec.key.split(":")[1];

/** The specs a report under this lens calls, in report order, the link cards last. */
export function pairSpecsFor(lens: Lens): readonly PairSectionSpec[] {
  return [twoCharts, ...LENS_SECTIONS[lens], whatToPractise, links];
}

/** Eight ids in order: the two charts, the lens's five, the practice, the link cards. */
export function pairSectionIds(lens: Lens): string[] {
  return pairSpecsFor(lens).map(idOf);
}

/** The seven chapters, in order: everything but the link cards. */
export function pairChapterIds(lens: Lens): string[] {
  return pairSectionIds(lens).filter((id) => id !== "links");
}

/** The chapter id for a chapter number under a lens, 1 to 7. */
export function pairChapterId(lens: Lens, n: number): string | undefined {
  return pairChapterIds(lens)[n - 1];
}

/** Every id any lens can write: the two fixed, the fifteen, the link cards. */
export const PAIR_SECTION_IDS: readonly string[] = PAIR_SECTIONS.map(idOf);

export function pairSectionById(id: string): PairSectionSpec | undefined {
  return PAIR_ALL_SECTIONS.find((s) => s.key === `pair:${id}`);
}

export const PAIR_WORD_TARGETS: Record<string, [number, number]> = Object.fromEntries(
  PAIR_SECTIONS.map((s) => [idOf(s), s.wordTarget]),
);

/** The chapter's title on the page: the spec's own label. */
export function pairChapterTitle(id: string): string {
  return pairSectionById(id)?.label ?? id;
}

export function pairHasClaims(spec: PairSectionSpec): boolean {
  return "claims" in ((spec.schema as unknown as { shape?: Record<string, unknown> }).shape ?? {});
}
