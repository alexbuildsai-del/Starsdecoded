/**
 * The in-and-out curve the report's settle and gather move on, kept here so a module can take it without the
 * orrery's library (R18-27 retires that). Pure: 0 to 1 in, 0 to 1 out, clamped at both ends.
 */
export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
