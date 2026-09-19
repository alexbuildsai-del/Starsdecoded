/** The four element hues are data and belong to the balance bars alone. */
export const ELEMENT_HEX: Record<string, string> = {
  fire: "#E0845C",
  earth: "#7FB08B",
  air: "#8FC5E0",
  water: "#6B7FD7",
};

/**
 * One accent per chapter, in a fixed order, the same for every reader (ADR-23).
 * Six hues carry the ten chapters, so 07 to 10 repeat 01 to 04 and no two
 * neighbours ever share one; chapter 10, Closing, is teal (ADR-46). The chart
 * does not reach this: element hues stay data and brass stays geometry.
 */
const ACCENTS = ["#5C6BC0", "#3F8FD2", "#9575CD", "#3FA796", "#D9668A", "#B565A7"] as const;

export function chapterAccent(chapter: number): string {
  const i = Math.max(1, Math.round(chapter)) - 1;
  return ACCENTS[i % ACCENTS.length];
}

export default chapterAccent;
