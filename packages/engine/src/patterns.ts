/**
 * The chart's patterns live in the engine so the brief, House by House, the house cards and Did you know read them by
 * one rule (ADR-397). The rule is an astrology call, Decided by Claude (ADR-397, 398, 404; reading 25).
 */

const PLANETS: readonly string[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

/** The bodies a pattern counts, as reading 25 names them: the South Node is not one. */
export const PATTERN_BODIES: readonly string[] = [...PLANETS, "chiron", "north_node"];

export interface ChartPatterns {
  stelliums: { sign: string; house: number | null; bodies: string[] }[];
  pairs: { sign: string; house: number | null; bodies: string[] }[];
  emptyHouses: number[];
  angular: string[];
  halfSky: { side: "above" | "below" | "east" | "west"; count: number }[];
}

type Group = ChartPatterns["stelliums"][number];

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];
const HOUSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const ANGULAR_HOUSES = [1, 4, 7, 10];
const HALF_SKY = 7;

// Across a birth-time band the Sun's and Moon's sign is the one they held for most of it while their house stays the
// centre time's (calculateNatalChart), so the two can disagree; a sign's house is read from its other bodies first.
const BANDED = ["sun", "moon"];

const norm = (deg: number): number => ((deg % 360) + 360) % 360;

/** The line from `from` to the point opposite it cuts the circle in two: is `deg` in the half that holds `through`? */
function sameHalf(deg: number, from: number, through: number): boolean {
  return (norm(deg - from) < 180) === (norm(through - from) < 180);
}

/**
 * A stellium is 3 or more pattern bodies in one sign, at least two of them planets; a pair is exactly two. Whole sign
 * makes the sign its house, so each carries one when the chart has houses. Empty houses and angular planets (1st, 4th,
 * 7th, 10th; planets only) read the bodies' houses; half the sky (7 or more of the ten planets) reads their degrees from
 * the angles: above is the half from the Descendant to the Ascendant through the Midheaven, east the half from the
 * Midheaven to the IC through the Ascendant. A blind chart has neither, so it is read by sign alone.
 */
export function chartPatterns(
  planets: Readonly<Record<string, { sign: string; house?: number; absoluteDegree: number }>>,
  angles?: { ascendant: { absoluteDegree: number }; midheaven: { absoluteDegree: number } },
): ChartPatterns {
  const present = PATTERN_BODIES.filter((b) => planets[b] !== undefined);
  const presentPlanets = PLANETS.filter((p) => planets[p] !== undefined);

  const bySign = new Map<string, string[]>();
  for (const b of present) bySign.set(planets[b].sign, [...(bySign.get(planets[b].sign) ?? []), b]);

  const houseOf = (bodies: readonly string[]): number | null => {
    const steadyFirst = [...bodies].sort((a, b) => Number(BANDED.includes(a)) - Number(BANDED.includes(b)));
    return steadyFirst.map((b) => planets[b].house).find((h) => h !== undefined) ?? null;
  };
  // Signed, so a banded Sun or Moon whose degree lies just outside its sign still sorts beside that edge.
  const intoSign = (b: string): number => norm(planets[b].absoluteDegree - SIGNS.indexOf(planets[b].sign) * 30 + 180) - 180;

  const stelliums: Group[] = [];
  const pairs: Group[] = [];
  for (const [sign, bodies] of bySign) {
    const group: Group = { sign, house: houseOf(bodies), bodies: [...bodies].sort((a, b) => intoSign(a) - intoSign(b)) };
    if (bodies.length === 2) pairs.push(group);
    else if (bodies.length >= 3 && bodies.filter((b) => PLANETS.includes(b)).length >= 2) stelliums.push(group);
  }
  const order = (g: Group): number => g.house ?? SIGNS.indexOf(g.sign) + 1;
  stelliums.sort((a, b) => order(a) - order(b));
  pairs.sort((a, b) => order(a) - order(b));

  const held = new Set(present.map((b) => planets[b].house).filter((h): h is number => h !== undefined));
  const emptyHouses = held.size === 0 ? [] : HOUSES.filter((h) => !held.has(h));
  const angular = presentPlanets.filter((p) => ANGULAR_HOUSES.includes(planets[p].house ?? 0));

  const halfSky: ChartPatterns["halfSky"] = [];
  if (angles) {
    const asc = angles.ascendant.absoluteDegree;
    const mc = angles.midheaven.absoluteDegree;
    const degrees = presentPlanets.map((p) => planets[p].absoluteDegree);
    const above = degrees.filter((d) => sameHalf(d, asc, mc)).length;
    const east = degrees.filter((d) => sameHalf(d, mc, asc)).length;
    const sides = [["above", above], ["below", degrees.length - above], ["east", east], ["west", degrees.length - east]] as const;
    for (const [side, count] of sides) if (count >= HALF_SKY) halfSky.push({ side, count });
  }

  return { stelliums, pairs, emptyHouses, angular, halfSky };
}
