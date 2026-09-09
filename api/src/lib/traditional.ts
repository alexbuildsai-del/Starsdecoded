/**
 * Traditional (Hellenistic) derivation over a computed natal chart.
 *
 * Pure functions. Everything here is lookup tables and arithmetic on data the
 * engine already produces; nothing touches the ephemeris, a database or an AI.
 *
 * Technique follows the classical sources the product is grounded in:
 * Demetra George, Ancient Astrology in Theory and Practice (vols 1–2) and
 * Astrology and the Authentic Self; Chris Brennan, Hellenistic Astrology;
 * Helena Avelar & Luís Ribeiro, On the Heavenly Spheres. Only doctrine is
 * encoded — sect, the seven domiciles and exaltations, the Lot formulas, the
 * house-ruler method — none of their prose.
 *
 * Where the tradition offers choices, this file picks one and says so:
 *  - Traditional rulerships only. Uranus, Neptune and Pluto appear in the
 *    chart but rule nothing, so they never enter a rulership chain.
 *  - Sect is decided by the Sun's true altitude at birth (geometric centre,
 *    no refraction): above 0° is day. Within 5° of the horizon is flagged
 *    marginal for the methodology box only.
 *  - Dignity is by sign. Exaltation degrees are recorded but not required.
 */
import type { NatalChartData } from "./chartCalculation.js";

export const TRADITIONAL_PLANETS = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
] as const;
export type TraditionalPlanet = (typeof TRADITIONAL_PLANETS)[number];

export type Sect = "day" | "night";
export type Dignity = "domicile" | "exaltation" | "detriment" | "fall" | "peregrine";
export type Angularity = "angular" | "succedent" | "cadent";

const SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;
type Sign = (typeof SIGNS)[number];

/** Domicile (traditional rulership) by sign. */
export const DOMICILE: Record<Sign, TraditionalPlanet> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter",
};

/** The seven classical exaltations, with the traditional exaltation degree. */
export const EXALTATION: Record<TraditionalPlanet, { sign: Sign; degree: number }> = {
  sun: { sign: "aries", degree: 19 },
  moon: { sign: "taurus", degree: 3 },
  mercury: { sign: "virgo", degree: 15 },
  venus: { sign: "pisces", degree: 27 },
  mars: { sign: "capricorn", degree: 28 },
  jupiter: { sign: "cancer", degree: 15 },
  saturn: { sign: "libra", degree: 21 },
};

function normalize(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function asSign(name: string): Sign {
  const s = name.toLowerCase() as Sign;
  if (!SIGNS.includes(s)) throw new Error(`Unknown sign: ${name}`);
  return s;
}

function oppositeSign(sign: Sign): Sign {
  return SIGNS[(SIGNS.indexOf(sign) + 6) % 12];
}

function isTraditional(planet: string): planet is TraditionalPlanet {
  return (TRADITIONAL_PLANETS as readonly string[]).includes(planet);
}

/** Whole-sign house of a longitude, counting from the Ascendant's sign. */
export function wholeSignHouse(longitude: number, ascendantLongitude: number): number {
  const asc = Math.floor(normalize(ascendantLongitude) / 30);
  const lon = Math.floor(normalize(longitude) / 30);
  return ((lon - asc + 12) % 12) + 1;
}

export function angularity(house: number): Angularity {
  const h = ((house - 1) % 12) + 1;
  if ([1, 4, 7, 10].includes(h)) return "angular";
  if ([2, 5, 8, 11].includes(h)) return "succedent";
  return "cadent";
}

// ---------------------------------------------------------------------------
// Sect
// ---------------------------------------------------------------------------

export interface SectInfo {
  sect: Sect;
  /** The luminary that leads the chart: Sun by day, Moon by night. */
  light: "sun" | "moon";
  /** Jupiter by day, Venus by night: the more helpful benefic. */
  beneficOfSect: "jupiter" | "venus";
  beneficContrary: "jupiter" | "venus";
  /** Saturn by day, Mars by night: the malefic on its best behaviour. */
  maleficOfSect: "saturn" | "mars";
  /** Mars by day, Saturn by night: the malefic that exacts a price. */
  maleficContrary: "saturn" | "mars";
  /** True altitude of the Sun's centre at birth, degrees, no refraction. */
  sunAltitude: number;
  /** Within 5° of the horizon. Shown in the methodology box only; the reading never hedges. */
  marginal: boolean;
}

/** The brief's payload names, for prompts and the report meta. */
export interface SectPayload {
  sect: Sect;
  sect_light: "sun" | "moon";
  benefic_of_sect: "jupiter" | "venus";
  benefic_out_of_sect: "jupiter" | "venus";
  malefic_of_sect: "saturn" | "mars";
  malefic_out_of_sect: "saturn" | "mars";
}

export const SECT_MARGINAL_DEGREES = 5;

/**
 * Sect from the Sun's true altitude: its geometric centre at exactly 0° is
 * the boundary, with no refraction and no upper-limb convention. Above is day.
 */
export function sect(chart: NatalChartData): SectInfo {
  const sunAltitude = chart.sunAltitude;
  const day = sunAltitude > 0;
  const marginal = Math.abs(sunAltitude) <= SECT_MARGINAL_DEGREES;
  return day
    ? { sect: "day", light: "sun", beneficOfSect: "jupiter", beneficContrary: "venus", maleficOfSect: "saturn", maleficContrary: "mars", sunAltitude, marginal }
    : { sect: "night", light: "moon", beneficOfSect: "venus", beneficContrary: "jupiter", maleficOfSect: "mars", maleficContrary: "saturn", sunAltitude, marginal };
}

export function sectPayload(s: SectInfo): SectPayload {
  return {
    sect: s.sect,
    sect_light: s.light,
    benefic_of_sect: s.beneficOfSect,
    benefic_out_of_sect: s.beneficContrary,
    malefic_of_sect: s.maleficOfSect,
    malefic_out_of_sect: s.maleficContrary,
  };
}

// ---------------------------------------------------------------------------
// Essential dignity
// ---------------------------------------------------------------------------

/**
 * Dignity of a traditional planet in a sign. Returns null for bodies the
 * tradition assigns no dignity to (the outer planets, Chiron, the nodes).
 */
export function essentialDignity(planet: string, signName: string): Dignity | null {
  if (!isTraditional(planet)) return null;
  const sign = asSign(signName);
  if (DOMICILE[sign] === planet) return "domicile";
  if (EXALTATION[planet].sign === sign) return "exaltation";
  if (DOMICILE[oppositeSign(sign)] === planet) return "detriment";
  if (EXALTATION[planet].sign === oppositeSign(sign)) return "fall";
  return "peregrine";
}

// ---------------------------------------------------------------------------
// House rulers
// ---------------------------------------------------------------------------

export interface HouseRuler {
  house: number;
  sign: Sign;
  ruler: TraditionalPlanet;
  /** Where the ruler actually sits. */
  rulerSign: Sign;
  rulerHouse: number;
  rulerDegree: number;
  rulerDignity: Dignity;
  rulerAngularity: Angularity;
  /** The ruler occupies the house it rules. */
  inOwnHouse: boolean;
}

/**
 * The topical method: to read a house, find its domicile ruler and see where
 * that ruler landed and how it is doing. One entry per house, 1 through 12.
 */
export function houseRulers(chart: NatalChartData): HouseRuler[] {
  const out: HouseRuler[] = [];
  for (let house = 1; house <= 12; house++) {
    const cusp = chart.houses[String(house)];
    if (!cusp) throw new Error(`Chart has no house ${house}`);
    const sign = asSign(cusp.sign);
    const ruler = DOMICILE[sign];
    const placement = chart.planets[ruler];
    if (!placement) throw new Error(`Chart has no placement for ${ruler}`);
    const rulerSign = asSign(placement.sign);
    out.push({
      house,
      sign,
      ruler,
      rulerSign,
      rulerHouse: placement.house,
      rulerDegree: placement.degree,
      rulerDignity: essentialDignity(ruler, rulerSign) ?? "peregrine",
      rulerAngularity: angularity(placement.house),
      inOwnHouse: placement.house === house,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Lots
// ---------------------------------------------------------------------------

export interface LotPosition {
  longitude: number;
  sign: Sign;
  degree: number;
  house: number;
}

export interface Lots {
  fortune: LotPosition;
  spirit: LotPosition;
}

function project(longitude: number, ascendantLongitude: number): LotPosition {
  const lon = normalize(longitude);
  return {
    longitude: Math.round(lon * 100) / 100,
    sign: SIGNS[Math.floor(lon / 30)],
    degree: Math.round((lon % 30) * 100) / 100,
    house: wholeSignHouse(lon, ascendantLongitude),
  };
}

/**
 * Lot of Fortune: Asc + Moon − Sun by day, Asc + Sun − Moon by night.
 * Lot of Spirit is the mirror. The two are always equidistant from the
 * Ascendant in opposite directions.
 */
export function lots(chart: NatalChartData): Lots {
  const asc = chart.angles.ascendant.absoluteDegree;
  const sun = chart.planets.sun.absoluteDegree;
  const moon = chart.planets.moon.absoluteDegree;
  const day = sect(chart).sect === "day";
  const fortune = day ? asc + moon - sun : asc + sun - moon;
  const spirit = day ? asc + sun - moon : asc + moon - sun;
  return { fortune: project(fortune, asc), spirit: project(spirit, asc) };
}

// ---------------------------------------------------------------------------
// Everything at once
// ---------------------------------------------------------------------------

export interface PlanetCondition {
  planet: TraditionalPlanet;
  sign: Sign;
  house: number;
  degree: number;
  retrograde: boolean;
  dignity: Dignity;
  angularity: Angularity;
  /** Whether this planet belongs to the chart's sect. Luminaries and Mercury excluded. */
  inSect: boolean | null;
}

export interface TraditionalFactors {
  sect: SectInfo;
  planets: PlanetCondition[];
  houseRulers: HouseRuler[];
  lots: Lots;
  /** Domicile ruler of the rising sign: the chart ruler. */
  chartRuler: HouseRuler;
}

export function deriveTraditional(chart: NatalChartData): TraditionalFactors {
  const s = sect(chart);
  const rulers = houseRulers(chart);
  const planets = TRADITIONAL_PLANETS.map((planet): PlanetCondition => {
    const p = chart.planets[planet];
    if (!p) throw new Error(`Chart has no placement for ${planet}`);
    const sign = asSign(p.sign);
    let inSect: boolean | null = null;
    if (planet === "jupiter" || planet === "venus") inSect = s.beneficOfSect === planet;
    if (planet === "saturn" || planet === "mars") inSect = s.maleficOfSect === planet;
    return {
      planet,
      sign,
      house: p.house,
      degree: p.degree,
      retrograde: p.retrograde,
      dignity: essentialDignity(planet, sign) ?? "peregrine",
      angularity: angularity(p.house),
      inSect,
    };
  });
  return { sect: s, planets, houseRulers: rulers, lots: lots(chart), chartRuler: rulers[0] };
}
