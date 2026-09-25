/**
 * The quick look on the dashboard orbit: what one natal chart leans on, read
 * straight from the computed chart. Pure; nothing here is written by a model.
 */
import { PLANET_LABELS, type ChartData } from "@/types/chart";

export type Element = "fire" | "earth" | "air" | "water";

export const ELEMENTS: readonly Element[] = ["fire", "earth", "air", "water"];

export const ELEMENT_LABELS: Record<Element, string> = {
  fire: "Fire",
  earth: "Earth",
  air: "Air",
  water: "Water",
};

export interface ElementBalance {
  counts: Record<Element, number>;
  total: number;
  /** The element that clearly leads, or null when the chart is spread. */
  lead: Element | null;
  /** Elements with nothing in them: an absence reads as loudly as a lead. */
  missing: Element[];
}

/**
 * A lead needs both a share and a margin: 4 of 10 against a runner-up of 3 is a
 * spread chart, not a fire chart.
 */
const LEAD_SHARE = 0.4;
const LEAD_MARGIN = 2;

export function elementBalance(chart: ChartData): ElementBalance {
  const counts = { ...chart.elements };
  const total = ELEMENTS.reduce((sum, e) => sum + counts[e], 0);
  const ranked = [...ELEMENTS].sort((a, b) => counts[b] - counts[a]);
  const [first, second] = ranked;
  const lead = total > 0
    && counts[first] / total >= LEAD_SHARE
    && counts[first] - counts[second] >= LEAD_MARGIN
    ? first
    : null;
  return { counts, total, lead, missing: ELEMENTS.filter((e) => counts[e] === 0) };
}

const BODIES = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
] as const;

export interface HouseTally {
  house: number;
  bodies: string[];
}

/** The ten planets by whole-sign house, 1 to 12. Empty for a blind chart, which has no houses (ADR-34). */
export function planetsByHouse(chart: ChartData): HouseTally[] {
  if (!chart.angles) return [];
  const tally: HouseTally[] = Array.from({ length: 12 }, (_, i) => ({ house: i + 1, bodies: [] }));
  for (const key of BODIES) {
    const h = chart.planets[key]?.house;
    if (h && h >= 1 && h <= 12) tally[h - 1].bodies.push(key);
  }
  return tally;
}

/** Three or more planets in one house is where the life gathers; the busiest one wins. */
export function busiestHouse(tally: HouseTally[]): HouseTally | null {
  let best: HouseTally | null = null;
  for (const t of tally) {
    if (t.bodies.length >= 3 && (!best || t.bodies.length > best.bodies.length)) best = t;
  }
  return best;
}

export function bodyLabel(key: string): string {
  return PLANET_LABELS[key] ?? key;
}
