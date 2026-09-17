import { houseSign } from "@/components/chart/wheel-geometry";

/** The four element hues are the data, so a chapter borrows one only through its house. */
export const ELEMENT_HEX: Record<string, string> = {
  fire: "#E0845C",
  earth: "#7FB08B",
  air: "#8FC5E0",
  water: "#6B7FD7",
};

const SIGN_ELEMENT: Record<string, string> = {
  Aries: "fire", Leo: "fire", Sagittarius: "fire",
  Taurus: "earth", Virgo: "earth", Capricorn: "earth",
  Gemini: "air", Libra: "air", Aquarius: "air",
  Cancer: "water", Scorpio: "water", Pisces: "water",
};

const INDIGO = "#5C6BC0";
const VIOLET = "#9575CD";

/**
 * The house each chapter reads through, as the locked prototype colours it.
 * Whole-chart chapters carry the product hues instead. The map itself is
 * still the Owner's to confirm, so it lives here and nowhere else.
 */
// MB-40 provisional
export const CHAPTER_HOUSE: Record<number, number> = {
  5: 3,
  6: 10,
  7: 2,
  8: 7,
  9: 4,
  12: 6,
};

const WHOLE_CHART: Record<number, string> = {
  10: VIOLET,
  11: VIOLET,
};

export function chapterAccent(chapter: number, ascendantAbsoluteDegree: number): string {
  const house = CHAPTER_HOUSE[chapter];
  if (house) {
    const element = SIGN_ELEMENT[houseSign(house, ascendantAbsoluteDegree)];
    return ELEMENT_HEX[element] ?? INDIGO;
  }
  return WHOLE_CHART[chapter] ?? INDIGO;
}

export default chapterAccent;
