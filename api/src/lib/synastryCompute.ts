// Pure synastry compute. Takes two natal charts and produces deterministic
// cross-aspect, scoring, and theme data. No AI calls live in this module.
import type { NatalChartData } from "./chartCalculation.js";

export type AspectType =
  | "conjunction"
  | "sextile"
  | "square"
  | "trine"
  | "opposition";

export type Category =
  | "emotional"
  | "communication"
  | "physical"
  | "long_term"
  | "growth";

const ASPECT_ANGLES: { type: AspectType; angle: number; orb: number }[] = [
  { type: "conjunction", angle: 0, orb: 8 },
  { type: "opposition", angle: 180, orb: 8 },
  { type: "trine", angle: 120, orb: 6 },
  { type: "square", angle: 90, orb: 6 },
  { type: "sextile", angle: 60, orb: 4 },
];

const CROSS_PLANETS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;
type Planet = (typeof CROSS_PLANETS)[number];

const PLANET_WEIGHTS: Record<Planet, number> = {
  sun: 4,
  moon: 4,
  venus: 3.5,
  mars: 3.5,
  mercury: 2.5,
  jupiter: 2,
  saturn: 2.5,
  uranus: 1.5,
  neptune: 1.5,
  pluto: 2,
};

const ASPECT_VALENCE: Record<AspectType, number> = {
  conjunction: 1, // valence depends on planets — conjunctions are mostly positive but can be intense
  trine: 1.2,
  sextile: 0.8,
  square: -1,
  opposition: -0.9,
};

// "Hard" pairs that turn conjunctions intense rather than purely sweet.
const HARD_PAIRS = new Set([
  "mars-saturn",
  "mars-pluto",
  "saturn-pluto",
  "saturn-uranus",
  "moon-saturn",
  "moon-pluto",
  "venus-saturn",
  "venus-pluto",
]);

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("-");
}

export interface CrossAspect {
  planetA: Planet; // belongs to person A
  planetB: Planet; // belongs to person B
  type: AspectType;
  orb: number;
  weight: number; // signed contribution to overall score
  categories: Category[];
}

export interface CategoryScore {
  category: Category;
  score: number; // raw weighted sum
  count: number;
  rating: "low" | "moderate" | "high" | "intense";
}

export interface SynastryComputeResult {
  // Overall harmony score, normalized to roughly -100..+100.
  overallScore: number;
  // Bucketed reading of the overall score.
  overallRating: "challenging" | "mixed" | "supportive" | "powerful";
  // Per-category scores.
  categories: CategoryScore[];
  // All cross-aspects, sorted by absolute weight (most significant first).
  crossAspects: CrossAspect[];
  // Top harmonious connections.
  strengths: CrossAspect[];
  // Top frictional connections.
  tensions: CrossAspect[];
  // Top theme tags surfaced from the aspect set.
  themes: string[];
}

function categoriesFor(p1: Planet, p2: Planet, type: AspectType): Category[] {
  const set = new Set<Category>();
  const both = new Set<Planet>([p1, p2]);
  if (both.has("moon") || both.has("venus")) set.add("emotional");
  if (both.has("mercury")) set.add("communication");
  if (
    (both.has("mars") && both.has("venus"))
    || (both.has("mars") && both.has("mars"))
    || (both.has("venus") && both.has("venus"))
    || (both.has("mars") && both.has("pluto"))
  ) {
    set.add("physical");
  }
  if (both.has("saturn") || both.has("jupiter")) set.add("long_term");
  if (both.has("pluto") || both.has("uranus") || both.has("neptune")) {
    set.add("growth");
  }
  // Sun cross-aspects always carry identity weight — bucket by aspect type.
  if (both.has("sun")) {
    set.add(type === "square" || type === "opposition" ? "growth" : "long_term");
  }
  if (set.size === 0) set.add("growth");
  return Array.from(set);
}

function diff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

// Compute cross-aspects A -> B (planetA from chart A, planetB from chart B).
// Returns the strongest aspect per ordered pair (we take the first match in
// orb-priority order; planets very rarely satisfy two aspect angles within
// orb simultaneously).
export function computeCrossAspects(
  chartA: NatalChartData,
  chartB: NatalChartData,
): CrossAspect[] {
  const out: CrossAspect[] = [];
  for (const pa of CROSS_PLANETS) {
    const da = chartA.planets[pa];
    if (!da) continue;
    for (const pb of CROSS_PLANETS) {
      const db = chartB.planets[pb];
      if (!db) continue;
      const sep = diff(da.absoluteDegree, db.absoluteDegree);
      let matched: { type: AspectType; orb: number } | null = null;
      for (const cand of ASPECT_ANGLES) {
        const orb = Math.abs(sep - cand.angle);
        if (orb <= cand.orb) {
          if (!matched || orb < matched.orb) matched = { type: cand.type, orb };
        }
      }
      if (!matched) continue;

      const valence = ASPECT_VALENCE[matched.type];
      const planetWeight = (PLANET_WEIGHTS[pa] + PLANET_WEIGHTS[pb]) / 2;
      // Tighter orbs count more.
      const orbFactor = 1 - matched.orb / 10;
      // Hard pairs reduce conjunction sweetness.
      const isHardPair = HARD_PAIRS.has(pairKey(pa, pb));
      const valenceAdj =
        matched.type === "conjunction" && isHardPair ? -0.3 : valence;

      const weight = valenceAdj * planetWeight * orbFactor;

      out.push({
        planetA: pa,
        planetB: pb,
        type: matched.type,
        orb: Math.round(matched.orb * 10) / 10,
        weight: Math.round(weight * 100) / 100,
        categories: categoriesFor(pa, pb, matched.type),
      });
    }
  }
  out.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  return out;
}

function rateCategory(score: number): CategoryScore["rating"] {
  const abs = Math.abs(score);
  if (abs >= 12) return "intense";
  if (abs >= 6) return "high";
  if (abs >= 2.5) return "moderate";
  return "low";
}

function deriveThemes(cross: CrossAspect[]): string[] {
  const tags = new Map<string, number>();
  function add(tag: string, w = 1) {
    tags.set(tag, (tags.get(tag) ?? 0) + w);
  }
  for (const c of cross) {
    const both = new Set<Planet>([c.planetA, c.planetB]);
    const isHarmonious = c.weight > 0;
    if (both.has("sun") && both.has("moon")) {
      add(isHarmonious ? "core compatibility" : "core dissonance", 2);
    }
    if (both.has("venus") && both.has("mars")) {
      add("erotic charge", 2);
    }
    if (both.has("venus") && both.has("venus")) add("shared values");
    if (both.has("mercury") && both.has("mercury")) add("mind-meld");
    if (both.has("moon") && both.has("moon")) add("emotional rhythm");
    if (both.has("saturn") && (both.has("sun") || both.has("moon") || both.has("venus"))) {
      add(isHarmonious ? "stabilizing commitment" : "weight of obligation");
    }
    if (both.has("pluto")) add(isHarmonious ? "depth bond" : "power struggle");
    if (both.has("uranus")) add("electric unpredictability");
    if (both.has("neptune")) add("dreamy haze");
    if (both.has("jupiter")) add("growth & generosity");
  }
  return Array.from(tags.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);
}

export function computeSynastry(
  chartA: NatalChartData,
  chartB: NatalChartData,
): SynastryComputeResult {
  const cross = computeCrossAspects(chartA, chartB);

  const totalWeight = cross.reduce((s, c) => s + c.weight, 0);
  const totalAbs = cross.reduce((s, c) => s + Math.abs(c.weight), 0) || 1;
  // Normalize to roughly -100..+100 by referencing the absolute energy. A high
  // absolute total means lots of strong contacts; the signed total then
  // expresses how that energy leans.
  const overallScore = Math.round((totalWeight / Math.max(totalAbs, 12)) * 100);

  let overallRating: SynastryComputeResult["overallRating"];
  if (overallScore <= -25) overallRating = "challenging";
  else if (overallScore < 25) overallRating = "mixed";
  else if (overallScore < 55) overallRating = "supportive";
  else overallRating = "powerful";

  const cats: Category[] = [
    "emotional",
    "communication",
    "physical",
    "long_term",
    "growth",
  ];
  const categories: CategoryScore[] = cats.map((cat) => {
    const subset = cross.filter((c) => c.categories.includes(cat));
    const score = Math.round(subset.reduce((s, c) => s + c.weight, 0) * 10) / 10;
    return { category: cat, score, count: subset.length, rating: rateCategory(score) };
  });

  const strengths = cross.filter((c) => c.weight > 0).slice(0, 8);
  const tensions = cross
    .filter((c) => c.weight < 0)
    .sort((a, b) => a.weight - b.weight)
    .slice(0, 8);
  const themes = deriveThemes(cross);

  return {
    overallScore,
    overallRating,
    categories,
    crossAspects: cross,
    strengths,
    tensions,
    themes,
  };
}
