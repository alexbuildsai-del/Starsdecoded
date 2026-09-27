/**
 * The card's pure rules: what "leads" among the elements, the modality line,
 * and the twelve whole-sign cells the busiest house is read from. Everything
 * here reads a chart already computed and writes nothing (ADR-92): the card
 * is never a source of new claims about a person.
 */
import type { ChartData } from "@/types/chart";
import { HOUSE_WORDS, ORDINALS } from "@/lib/evidence-glossary";

export type ElementKey = "fire" | "earth" | "air" | "water";

const ELEMENT_ORDER: ElementKey[] = ["fire", "earth", "air", "water"];
const ELEMENT_NAME: Record<ElementKey, string> = { fire: "Fire", earth: "Earth", air: "Air", water: "Water" };

export interface ElementLead {
  lead: ElementKey | null;
  line: string;
  /** Element keys with nobody in them, so the card can name them ("No air"). */
  empty: string[];
}

/**
 * A lead is named only when it is real: at least 40% of the ten planets and
 * two clear of the next element, else the four read as spread (dashboard-sky,
 * The card 3). Ties keep the elements' own order (fire, earth, air, water).
 */
export function elementLead(elements: Record<ElementKey, number>): ElementLead {
  const total = ELEMENT_ORDER.reduce((sum, key) => sum + elements[key], 0);
  const sorted = [...ELEMENT_ORDER].sort((a, b) => elements[b] - elements[a]);
  const [first, second] = sorted;
  const hasLead = total > 0 && elements[first] / total >= 0.4 && elements[first] - elements[second] >= 2;
  const lead = hasLead ? first : null;
  const line = lead ? `${ELEMENT_NAME[lead]} leads · ${elements[lead]} of ${total}` : "Spread across the four";
  const empty = ELEMENT_ORDER.filter((key) => elements[key] === 0);
  return { lead, line, empty };
}

/** "Cardinal 4 · Fixed 3 · Mutable 3", the one mono line the card prints. */
export function modalityLine(modalities: { cardinal: number; fixed: number; mutable: number }): string {
  return `Cardinal ${modalities.cardinal} · Fixed ${modalities.fixed} · Mutable ${modalities.mutable}`;
}

const BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;

export interface HouseCell {
  house: number;
  word: string;
  bodies: string[];
}

/**
 * Twelve whole-sign cells with who stands in each, in body order; [] on a
 * blind chart, since there is no horizon to count houses from (ADR-34). A
 * consumer reads the empty array as "Houses need a birth time".
 */
export function houseCells(chart: ChartData): HouseCell[] {
  if (!chart.angles) return [];
  const cells: HouseCell[] = Array.from({ length: 12 }, (_, i) => ({ house: i + 1, word: HOUSE_WORDS[i], bodies: [] }));
  for (const body of BODIES) {
    const house = chart.planets[body]?.house;
    if (house) cells[house - 1].bodies.push(body);
  }
  return cells;
}

export interface BusiestHouseInfo {
  house: number;
  count: number;
  line: string;
}

/**
 * The one house with three or more planets, first past the post on a tie
 * (dashboard-sky, The card 4); null below three, so the card outlines and
 * names nothing that is not genuinely busy.
 */
export function busiestHouse(cells: HouseCell[]): BusiestHouseInfo | null {
  let best: HouseCell | null = null;
  for (const cell of cells) {
    if (cell.bodies.length >= 3 && (!best || cell.bodies.length > best.bodies.length)) best = cell;
  }
  if (!best) return null;
  // Named as the spec's own example capitalises it ("9th (Belief)"), unlike
  // the lower-cased inline legend rows houseWithWord serves elsewhere.
  return {
    house: best.house,
    count: best.bodies.length,
    line: `${best.bodies.length} planets in the ${ORDINALS[best.house - 1]} (${best.word})`,
  };
}
