/**
 * The Failures tab's arithmetic (ADR-85), pure so a test can pin it: counts
 * grouped by section, the flagged rules first, and the rate as the panel
 * prints it. No text ever reaches this module; the server sends counts.
 */
import type { FailureCount } from "@/lib/labApi";

export interface SectionFailures {
  section: string;
  flagged: number;
  total: number;
  rules: FailureCount[];
}

/** Per section, flagged sections first, then by total; inside a section the flagged rules first, then by count. */
export function groupBySection(counts: FailureCount[]): SectionFailures[] {
  const map = new Map<string, FailureCount[]>();
  for (const c of counts) map.set(c.section, [...(map.get(c.section) ?? []), c]);
  return [...map.entries()].map(([section, rules]) => ({
    section,
    flagged: rules.filter((r) => r.flagged).length,
    total: rules.reduce((n, r) => n + r.count, 0),
    rules: [...rules].sort((a, b) => Number(b.flagged) - Number(a.flagged) || b.count - a.count || a.rule.localeCompare(b.rule)),
  })).sort((a, b) => b.flagged - a.flagged || b.total - a.total || a.section.localeCompare(b.section));
}

/** "3 of 20" from a rate over the section's last 20 writes, so the figure is a count the Owner can check. */
export function rateLabel(rate: number, window = 20): string {
  return `${Math.round(rate * window)} of ${window}`;
}

/** The annex row a rule id comes from: chk-21a is row 21, chk-00-json the engine's row 0. */
export function annexRow(rule: string): number | null {
  const m = /^chk-(\d+)/.exec(rule);
  return m ? Number(m[1]) : null;
}
