/**
 * Who leads a count. The engine's `dominance` keeps one name per count, the
 * first of a tie, so a chart with fire, earth and water level reads as fire
 * alone; the counts it already carries say the rest (MB-124 provisional).
 */

/** Every key sharing the top count, in the counts' own order; none when nothing was counted. */
export function leaders(counts: Record<string, number>): string[] {
  const top = Math.max(0, ...Object.values(counts));
  return top === 0 ? [] : Object.entries(counts).filter(([, n]) => n === top).map(([key]) => key);
}

/** "fire", "fire and earth", "fire, earth and water": the site's plain list, with no comma before "and". */
export function said(names: string[]): string {
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
