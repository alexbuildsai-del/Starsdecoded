// Pure helpers that produce canonical keys for meaning library entries.
// All inputs are lowercased so keys are deterministic regardless of casing.

export const PLANETS = [
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

export type Planet = (typeof PLANETS)[number];

export const SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export type Sign = (typeof SIGNS)[number];

export const HOUSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type House = (typeof HOUSES)[number];

export const ASPECT_TYPES = [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition",
] as const;

export type AspectType = (typeof ASPECT_TYPES)[number];

export function planetSignKey(planet: string, sign: string): string {
  return `${planet.toLowerCase()}_sign_${sign.toLowerCase()}`;
}

export function planetHouseKey(planet: string, house: number): string {
  return `${planet.toLowerCase()}_house_${house}`;
}

export function ascendantSignKey(sign: string): string {
  return `ascendant_sign_${sign.toLowerCase()}`;
}

export function midheavenSignKey(sign: string): string {
  return `midheaven_sign_${sign.toLowerCase()}`;
}

// Aspect key normalizes planet ordering so `sun_square_saturn` and
// `saturn_square_sun` map to the same canonical key.
export function aspectKey(planet1: string, type: string, planet2: string): string {
  const p1 = planet1.toLowerCase();
  const p2 = planet2.toLowerCase();
  const t = type.toLowerCase();
  const [a, b] = [p1, p2].sort();
  return `${a}_${t}_${b}`;
}

// Synastry cross-aspect key. Same canonicalization as natal aspect — the
// generic dynamic of e.g. Venus square Mars is the same regardless of which
// chart owns which side; the per-direction colour is added at narration time.
export function synastryAspectKey(planet1: string, type: string, planet2: string): string {
  const p1 = planet1.toLowerCase();
  const p2 = planet2.toLowerCase();
  const t = type.toLowerCase();
  const [a, b] = [p1, p2].sort();
  return `${a}_${t}_${b}`;
}
