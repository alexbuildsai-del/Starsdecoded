/**
 * Where each of the seven classical planets is at home and where it is least at ease, with the one line that says
 * why (explain-like-a-friend §0b, §0c, ADR-380). The brief, the primer's table and House by House read this one
 * table, so a comfort word is never said without its reason. Home is the planet's own sign; least at ease is the
 * sign opposite it, each pair in the same place in its list. Uranus, Neptune, Pluto, Chiron and the nodes have
 * neither.
 */
export type ComfortPlanet = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn";

export const COMFORT: Record<ComfortPlanet, { home: readonly string[]; leastAtEase: readonly string[]; why: string }> = {
  sun: { home: ["Leo"], leastAtEase: ["Aquarius"], why: "Wants to shine as one. Aquarius puts the group first." },
  moon: { home: ["Cancer"], leastAtEase: ["Capricorn"], why: "Wants comfort. Capricorn says feelings can wait." },
  mercury: {
    home: ["Gemini", "Virgo"],
    leastAtEase: ["Sagittarius", "Pisces"],
    why: "Wants the details. These two go for the big picture.",
  },
  venus: {
    home: ["Taurus", "Libra"],
    leastAtEase: ["Scorpio", "Aries"],
    why: "Wants ease and peace. These two want intensity or a win.",
  },
  mars: {
    home: ["Aries", "Scorpio"],
    leastAtEase: ["Libra", "Taurus"],
    why: "Wants to act now. These two want peace or to stay put.",
  },
  jupiter: {
    home: ["Sagittarius", "Pisces"],
    leastAtEase: ["Gemini", "Virgo"],
    why: "Wants the big picture. These two get lost in details.",
  },
  saturn: {
    home: ["Capricorn", "Aquarius"],
    leastAtEase: ["Cancer", "Leo"],
    why: "Wants rules and distance. These two want feelings or attention.",
  },
};

const isComfortPlanet = (body: string): body is ComfortPlanet => Object.keys(COMFORT).includes(body);

/**
 * Whether a body is at home or least at ease in a sign; null for any other sign and for a body the table does not
 * hold. Either case is read, since a chart spells a sign "Aries" and the writer's vocabulary "aries".
 */
export function comfortOf(body: string, sign: string): "home" | "least-at-ease" | null {
  const planet = body.toLowerCase();
  if (!isComfortPlanet(planet)) return null;
  const name = sign.toLowerCase();
  const { home, leastAtEase } = COMFORT[planet];
  if (home.some((s) => s.toLowerCase() === name)) return "home";
  if (leastAtEase.some((s) => s.toLowerCase() === name)) return "least-at-ease";
  return null;
}
