/**
 * The two workbook cards after the home page's hero and again at the end of /sample (ADR-243 to 245): How you work
 * and How you spend, two pages of the sample's stored run, read here and never typed, so a card can only say what her
 * report says (ADR-18).
 *
 * The pieces are named by hand, since no rule can tell whether four lines belong together (ADR-244). The pull
 * request that moves /sample to another run picks them again from that run, by this rule:
 * - the moment: a sentence of a house's reading about an everyday moment, with no astrology in it;
 * - the plain sentence: a sentence of the same reading naming that house's placements and what they do;
 * - the chips: those placements, as the run's evidence prints them;
 * - the check: that house's Behaviour check;
 * - the action: the chapter action that answers the check.
 * Each piece is looked up in the run at import and a missing one throws, so a run without it fails the prerender
 * rather than a card quoting less.
 */
import type { ChecklistItem } from "@/ds/organisms/Checklist";
import { HOUSE_WORDS, withHouseWords } from "@/lib/evidence-glossary";
import { splitReading } from "@/lib/house-deck";
import { plainProse } from "@/lib/plain-prose";
import { itemKey } from "@/lib/workbook";
import type { Interpretation } from "@/types/chart";
import { CLAIM_SECTIONS, SAMPLE } from "./sample";

/** The chapters with an actions list of their own, the only ones a card's action can come from. */
type ActionChapter = "career" | "money" | "relationships" | "family";

interface CardPick {
  name: string;
  house: number;
  moment: string;
  plain: string;
  /** Evidence labels as the run prints them, in the order the chips show them. */
  chips: readonly string[];
  action: { chapter: ActionChapter; index: number };
}

const WORK: CardPick = {
  name: "How you work",
  house: 6,
  moment:
    "You can work through conditions that would stop other people, but you also take stress into your body and then act like it is normal.",
  plain: "Mars and Pluto here make you intense about duties, and you do not half-do what you have agreed to handle.",
  chips: ["Mars 25.2° Cancer, 6th house", "Pluto 16.4° Cancer, 6th house"],
  action: { chapter: "career", index: 0 },
};

const SPEND: CardPick = {
  name: "How you spend",
  house: 2,
  moment: "You spend to soothe, and you save to feel safe.",
  plain:
    "The Moon here makes your sense of “enough” change with your mood, so your budget works best when it includes softness on purpose.",
  chips: ["Moon 6.5° Pisces, 2nd house"],
  action: { chapter: "money", index: 1 },
};

export interface WorkbookCard {
  /** The card's name, its brass label. */
  name: string;
  house: number;
  /** An everyday moment with no astrology in it: a sentence of the house's reading. */
  moment: string;
  /** The placements behind the moment, as the run's evidence labels them. */
  chips: string[];
  /** The same reading's sentence on what those placements do. */
  plain: string;
  /** The house's Behaviour check, read as the report's house card reads it. */
  check: string;
  /** The chapter action that answers the check, under the key her report ticks it by, with its why as stored. */
  action: ChecklistItem;
}

function cardOf(run: Interpretation, pick: CardPick): WorkbookCard {
  const reading = run.houses?.houses.find((h) => h.house === pick.house)?.reading;
  if (!reading) throw new Error(`The sample run has no reading for house ${pick.house}, which ${pick.name} quotes.`);
  const printed = plainProse(reading);
  for (const sentence of [pick.moment, pick.plain]) {
    if (!printed.includes(sentence)) {
      throw new Error(`House ${pick.house}'s reading in the sample run does not say: ${sentence}`);
    }
  }
  const { check } = splitReading(reading);
  if (!check) throw new Error(`House ${pick.house}'s reading in the sample run has no Behaviour check.`);
  const evidence = CLAIM_SECTIONS.flatMap((s) => run[s]?.claims ?? []).flatMap((c) => c.evidence);
  for (const label of pick.chips) {
    const printedHere = evidence.some(
      (e) => e.ref.kind === "placement" && e.ref.house === pick.house && e.label === label,
    );
    if (!printedHere) throw new Error(`The sample run's evidence never prints "${label}" in house ${pick.house}.`);
  }
  const { chapter, index } = pick.action;
  const item = run[chapter]?.actions[index];
  if (!item) throw new Error(`The sample run's ${chapter} chapter has no action ${index}, which ${pick.name} offers.`);
  return {
    name: pick.name,
    house: pick.house,
    moment: pick.moment,
    chips: [...pick.chips],
    plain: pick.plain,
    check,
    action: { key: itemKey(chapter, "actions", index), action: item.action, why: item.why },
  };
}

/** The two cards from a run, How you work first; throws on any piece the run lacks. */
export function workbookCards(run: Interpretation = SAMPLE.run): readonly [WorkbookCard, WorkbookCard] {
  return [cardOf(run, WORK), cardOf(run, SPEND)];
}

export const WORKBOOK_CARDS = workbookCards();

/** "06 · Work": the house in two digits and its word, as every house number the site prints carries one (ADR-98). */
export function houseTag(house: number): string {
  return `${String(house).padStart(2, "0")} · ${HOUSE_WORDS[house - 1] ?? ""}`;
}

const HOUSE_MENTION = /\b\d{1,2}(?:st|nd|rd|th) house\b/;

/**
 * A chip as the card prints it, the house with its word (ADR-98) apart from the placement, so the house can take the
 * evidence hue and stay on one line.
 */
export function chipParts(label: string): { at: string; house: string } {
  const text = withHouseWords(label);
  const found = HOUSE_MENTION.exec(text);
  if (!found) return { at: text, house: "" };
  return { at: text.slice(0, found.index).trimEnd(), house: text.slice(found.index) };
}
