/**
 * Chapter 02's deck in numbers and words (ADR-179): a step round the wheel, the
 * card a swipe settled on, the twelve ticks, the pinned bar's line, and a house
 * reading cut where the card cuts it: the first sentence, the rest, and the
 * Behaviour check the houses prompt ends every reading on. Pure, so the deck on
 * a report and the deck on /sample read the same houses the same way.
 */
import { HOUSE_WORDS, ORDINALS } from "@/lib/evidence-glossary";
import { HOUSES } from "@/lib/houses";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { plainProse } from "@/lib/plain-prose";
import { PLANET_LABELS, type ChartData } from "@/types/chart";

export const HOUSE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** A step round the wheel: after the 12th house comes the 1st, before the 1st the 12th. */
export function stepHouse(house: number, by: number): number {
  const n = HOUSE_NUMBERS.length;
  return ((((house - 1 + by) % n) + n) % n) + 1;
}

/** The two arrow keys step through the houses; every other key stays the page's. */
export function keyStep(key: string): -1 | 0 | 1 {
  if (key === "ArrowRight") return 1;
  if (key === "ArrowLeft") return -1;
  return 0;
}

export interface CardBox {
  left: number;
  width: number;
}

/** The card whose centre sits nearest the deck's centre, which is the one a swipe settles on; -1 with no cards. */
export function nearestCard(scrollLeft: number, viewWidth: number, cards: readonly CardBox[]): number {
  const centre = scrollLeft + viewWidth / 2;
  let best = -1;
  let bestGap = Infinity;
  cards.forEach((card, i) => {
    const gap = Math.abs(card.left + card.width / 2 - centre);
    if (gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  });
  return best;
}

export type Tick = "on" | "seen" | "ahead";

/** The house being read is on and the houses before it are seen, so the ticks fill like a progress bar. */
export function tickState(tick: number, house: number): Tick {
  if (tick === house) return "on";
  return tick < house ? "seen" : "ahead";
}

/** "4th house · Home": a house number the page prints carries its word (ADR-98). */
export function houseName(house: number): string {
  return `${ORDINALS[house - 1]} house · ${HOUSE_WORDS[house - 1]}`;
}

/** The pinned bar's line: "4th house · Home · Taurus". */
export function houseLine(house: number, sign: string): string {
  return `${houseName(house)} · ${sign}`;
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Opposite: 7th, Partnership. Me · the other person." (report-loading-story §3); the pair reads from this house's side. */
export function oppositeLine(house: number): string {
  const h = HOUSES[house - 1];
  const across = HOUSES[h.opposite - 1];
  return `Opposite: ${ORDINALS[across.n - 1]}, ${across.word}. ${capital(h.pair[0])} · ${h.pair[1]}.`;
}

/** A planet that rides a sign's house: its label and the house the chart puts it in. */
export interface SignRuler {
  label: string;
  house: number;
}

/** The planet that goes with a sign, and the house the chart puts it in; null when the chart does not place it. */
export function signRuler(chart: ChartData, sign: string): SignRuler | null {
  const key = TRADITIONAL_RULER[sign];
  const planet = key ? chart.planets[key] : undefined;
  if (!key || !planet || !planet.house) return null;
  return { label: PLANET_LABELS[key] ?? key, house: planet.house };
}

/** A house nobody stands in keeps one small line: its sign, and where the sign's planet is (review-05-10 §7). */
export function quietLine(sign: string, ruler: SignRuler | null): string {
  const start = `No planets here · ${sign} starts this house`;
  return ruler ? `${start} · its planet, ${ruler.label}, is in your ${ORDINALS[ruler.house - 1]}` : start;
}

// The mean nodes are always marked R, which says nothing about the sky that day, so only a body that really turned counts.
const ALWAYS_R = ["north_node", "south_node"];

/** True for a planet or Chiron the chart marks retrograde; false for the nodes. */
export function goesBackwards(key: string, retrograde: boolean | undefined): boolean {
  return retrograde === true && !ALWAYS_R.includes(key);
}

/** Whether any body in the chart looks like it moves backwards, so the full chart carries the R line. */
export function chartGoesBackwards(chart: ChartData): boolean {
  return Object.entries(chart.planets).some(([key, p]) => goesBackwards(key, p.retrograde));
}

export interface ReadingParts {
  /** The first sentence, which a card on a phone leads with. */
  lead: string;
  /** What follows the first sentence, up to the check; "" for a one-sentence reading. */
  rest: string;
  /** The Behaviour check without its label; null when the reading has none. */
  check: string | null;
}

// The prompt asks for "Behaviour check:". The US spelling or a dash after it is read the same way, so a check never
// prints as prose; the last one wins, since the prompt puts it at the end.
const CHECK = /\bBehaviou?r check\s*[:–—-]\s*/gi;

// A sentence ends at . ! ? or an ellipsis, after any closing quote or bracket, where the next one opens on a capital,
// a digit or an opening quote. "U.S." and "2.5" run on.
const SENTENCE_END = /[.!?…]+["'”’)\]]*(?=\s+["'“‘([]?[\p{Lu}\d])/u;

/** A house reading as the card shows it, read through the page's prose guard first (ADR-104). */
export function splitReading(text: string): ReadingParts {
  const plain = plainProse(text).replace(/\s+/g, " ").trim();
  let at = -1;
  let after = -1;
  for (const m of plain.matchAll(CHECK)) {
    at = m.index;
    after = m.index + m[0].length;
  }
  const body = at < 0 ? plain : plain.slice(0, at).trim();
  const check = at < 0 ? null : plain.slice(after).trim() || null;
  const end = SENTENCE_END.exec(body);
  const cut = end ? end.index + end[0].length : body.length;
  return { lead: body.slice(0, cut).trim(), rest: body.slice(cut).trim(), check };
}
