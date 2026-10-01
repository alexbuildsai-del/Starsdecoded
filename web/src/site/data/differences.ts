/**
 * The two differences (ADR-173): what Stars Decoded is, said right after the home page's hero and again at the end of
 * /sample. The first quotes the sample's stored run, read here and never typed, so the band can only say what her
 * report says (ADR-18). The second names the scenes a Compatibility report plays out, and quotes a pair only from a
 * sample pair's committed run, never a customer's (MB-93).
 */
import type { ChecklistItem } from "@/components/report/Checklist";
import { lensInfo } from "@/lib/lenses";
import { itemKey } from "@/lib/workbook";
import type { Lens } from "@/types/chart";
import { SAMPLE } from "./sample";

/** A sample pair's own words, from a run committed as /sample's was. */
export interface SamplePairQuote {
  /** The two sample people the run is about, as `people.ts` keys them, in the run's order. */
  people: readonly [string, string];
  /** Chapter 01's headline, as the run stores it. */
  headline: string;
  /** Two of the run's Next time items, shown under "Try together". */
  tryTogether: ChecklistItem[];
}

export interface Differences {
  /** The first sentence of the second house's reading. */
  line: string;
  /** That reading's Behaviour check, without its label. */
  check: string;
  /** Two of the Closing's Practice items, under the keys the report ticks them by. */
  practice: ChecklistItem[];
  pair: SamplePairQuote | null;
}

/** The house of money, whose reading opens on the line the approved artifact quotes. */
const HOUSE = 2;

/** The two the approved artifact shows, in its order: the money item first, since it answers the line above it. */
const PRACTICE = [2, 0] as const;

/** The houses prompt closes every reading on its check under this label. */
const CHECK = "Behaviour check:";

const run = SAMPLE.run;

// Each throws at import, so a sample run without the line fails the prerender rather than the band quoting less.
function houseReading(house: number): string {
  const reading = run.houses?.houses.find((h) => h.house === house)?.reading;
  if (!reading) throw new Error(`The sample run has no reading for house ${house}.`);
  return reading;
}

/** Up to the first full stop, question or exclamation mark that ends a sentence, so a degree like 13.1° never cuts it. */
function firstSentence(text: string): string {
  const t = text.trim();
  return /^[\s\S]*?[.!?](?=\s|$)/.exec(t)?.[0] ?? t;
}

function behaviourCheck(reading: string): string {
  const at = reading.lastIndexOf(CHECK);
  const check = at < 0 ? "" : reading.slice(at + CHECK.length).trim();
  if (!check) throw new Error(`The sample run's reading for house ${HOUSE} has no Behaviour check.`);
  return check;
}

function practiceItems(): ChecklistItem[] {
  const bullets = run.focus?.practice.bullets ?? [];
  return PRACTICE.map((i) => {
    const bullet = bullets[i];
    if (!bullet) throw new Error(`The sample run's Closing has no Practice item ${i}.`);
    return { key: itemKey("focus", "practice.bullets", i), action: bullet.point, why: bullet.why };
  });
}

const reading = houseReading(HOUSE);

export const DIFFERENCES: Differences = {
  line: firstSentence(reading),
  check: behaviourCheck(reading),
  practice: practiceItems(),
  // MB-93 provisional: no sample pair's run is committed, so the band draws the sample couple's plates and their
  // scenes, and quotes no pair.
  pair: null,
};

/** Parent and child has no fixed scenes: its chapters play out the one for the child's age (ADR-176). */
export type SceneLens = Exclude<Lens, "parent_child">;

/**
 * The scene each lens chapter plays out, chapters 02 to 06 in order, as the pair prompts fix them (ADR-176). The web
 * cannot import the prompts (MB-108), so this is a copy, and its test pins it to their list.
 */
export const SCENES: Record<SceneLens, readonly [string, string, string, string, string]> = {
  partners: ["The end of a long day", "The argument at 11 pm", "The bill nobody expected", "The weekend away", "The job offer in another city"],
  people: ["The big dinner", "The project with the deadline", "The weekend away", "Money between you", "The favour too big to ask"],
};

/** The lens the band draws while it quotes no pair: its words promise money, a weekend away and an argument, a couple's three. */
export const BAND_LENS: SceneLens = "partners";

/** The situations the band names, in the order the report reaches them. */
export const SITUATIONS: readonly string[] = ["The argument at 11 pm", "The bill nobody expected", "The weekend away"];

export interface SceneRow {
  /** The chapter that plays it out, numbered as the report numbers its seven. */
  n: number;
  scene: string;
  /** That chapter's title under the lens. */
  chapter: string;
}

/** Each situation beside the chapter that plays it out; a title the lens never plays out fails the prerender. */
export function sceneRows(lens: SceneLens = BAND_LENS, picked: readonly string[] = SITUATIONS): SceneRow[] {
  const chapters = lensInfo(lens).chapters;
  return picked.map((scene) => {
    const i = SCENES[lens].indexOf(scene);
    if (i < 0) throw new Error(`"${scene}" is not a scene the ${lens} lens plays out.`);
    return { n: i + 2, scene, chapter: chapters[i] };
  });
}
