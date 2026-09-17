/**
 * The spec asks for the element of the chapter's house, but the section to
 * house map is deferred, so there is no per-chapter element to read yet.
 */

const ELEMENT_HUE: Record<string, { h: number; s: number; l: number }> = {
  fire: { h: 18, s: 68, l: 62 },
  earth: { h: 140, s: 26, l: 60 },
  air: { h: 199, s: 60, l: 72 },
  water: { h: 230, s: 56, l: 63 },
};

const FALLBACK = { h: 234, s: 48, l: 60 };

/**
 * One accent per reader, derived from the chart's dominant element, morphing
 * lightness rather than hue as the chapters run. Hue would claim a meaning the
 * report has not made; lightness reads as progress through the reading.
 */
// MB-40 provisional
export function chapterAccent(dominantElement: string | undefined, index: number, total: number): string {
  const base = ELEMENT_HUE[(dominantElement ?? "").toLowerCase()] ?? FALLBACK;
  const span = total > 1 ? index / (total - 1) : 0;
  const l = Math.round(base.l - 8 + span * 16);
  return `hsl(${base.h} ${base.s}% ${l}%)`;
}

export default chapterAccent;
