/**
 * The page's one guard on prose (ADR-104), not a check: a stored field reads
 * clean whatever the model did. Markdown asterisks go, and so does a line
 * that is nothing but a placement, the evidence heading a Career field
 * used to open on. A sentence that opens on a placement and goes on is
 * prose and stays. Nothing is logged, nothing fails, nothing is retried.
 */

const VOCABULARY = new Set([
  // bodies, angles, lots, nodes
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron",
  "node", "nodes", "north", "south", "lot", "lots", "fortune", "spirit", "ascendant", "asc", "midheaven", "mc", "descendant", "dsc", "ic", "rising",
  // signs
  "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
  // houses and rulers
  "house", "houses", "ruler", "rulers", "rules", "ruled", "rule", "ruling", "cusp", "angular", "cadent", "succedent", "stellium",
  // dignities
  "domicile", "exaltation", "exalted", "detriment", "fall", "peregrine", "dignity", "dignified",
  // aspects
  "conjunction", "conjunct", "opposition", "opposite", "opposing", "trine", "square", "sextile", "aspect", "applying", "separating",
  // the glue
  "in", "of", "the", "and", "a", "an", "at", "to", "by", "with", "on", "its", "orb", "degree", "degrees", "sect", "day", "night", "chart", "retrograde",
]);

const ORDINAL = /^\d{1,2}(st|nd|rd|th)$/;
const NUMBER = /^\d+(\.\d+)?°?$/;

/** A line every word of which is placement vocabulary: evidence, never prose. */
export function isPlacementLine(line: string): boolean {
  const tokens = line.replace(/[#*_]/g, " ").split(/\s+/).map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}°]+$/gu, "")).filter(Boolean);
  if (!tokens.length) return false;
  return tokens.every((t) => {
    const w = t.toLowerCase();
    return VOCABULARY.has(w) || ORDINAL.test(w) || NUMBER.test(w);
  });
}

/** The text as the page prints it: no asterisks, no placement-only line; a pass's paragraphs keep their blank line. */
export function plainProse(text: string): string {
  if (!text) return text;
  const lines = text.replace(/\*+/g, "").split("\n");
  const out: string[] = [];
  let dropping = false;
  for (const line of lines) {
    if (isPlacementLine(line)) { dropping = true; continue; }
    // The newline or blank line that followed a dropped label goes with it.
    if (dropping && !line.trim()) continue;
    dropping = false;
    out.push(line);
  }
  return out.join("\n").trim();
}
