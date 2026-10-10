import { tokens } from "@workspace/design";

const c = tokens.color;

/** The four element hues are data and belong to the balance bars alone. */
export const ELEMENT_HEX: Record<string, string> = {
  fire: c["element-fire"],
  earth: c["element-earth"],
  air: c["element-air"],
  water: c["element-water"],
};

/**
 * One accent per chapter, in a fixed order, the same for every reader (ADR-23).
 * Six hues carry the ten chapters, so 07 to 10 repeat 01 to 04 and no two
 * neighbours ever share one; chapter 10, Closing, is teal (ADR-46). The chart
 * does not reach this: element hues stay data and brass stays geometry.
 */
const ACCENTS = [c["chapter-1"], c["chapter-2"], c["chapter-3"], c["chapter-4"], c["chapter-5"], c["chapter-6"]] as const;

export function chapterAccent(chapter: number): string {
  const i = Math.max(1, Math.round(chapter)) - 1;
  return ACCENTS[i % ACCENTS.length];
}

export default chapterAccent;
