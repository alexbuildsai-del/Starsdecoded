/**
 * Every check a section can fail, classified (ADR-81; the annex
 * `docs/annex/pair-reliability-checks.md`, rows 1 to 38). A check blocks
 * only when the text would be wrong or harmful for the reader or would cost
 * money; everything else is fixed in code, logged, or buffered by 20% around
 * the target the prompt states. Rule ids are stable so the failure log and
 * the Failures tab can count them (ADR-85).
 */
export type CheckClass = "block" | "fix" | "warn" | "buffer" | "repair";

export interface Check {
  rule: string;
  cls: CheckClass;
  message: string;
}

/** The annex row each rule comes from and the class it takes when it fires as designed. A rule may fire at a stricter class in its fallback. */
export const RULES: Record<string, { row: number; cls: CheckClass }> = {
  "chk-00-json": { row: 0, cls: "block" },
  "chk-00-schema": { row: 0, cls: "block" },
  "chk-00-truncated": { row: 0, cls: "block" },
  "chk-00-refused": { row: 0, cls: "block" },
  "chk-01": { row: 1, cls: "fix" },
  "chk-02": { row: 2, cls: "fix" },
  "chk-03": { row: 3, cls: "fix" },
  "chk-04": { row: 4, cls: "fix" },
  "chk-05": { row: 5, cls: "fix" },
  "chk-06": { row: 6, cls: "fix" },
  "chk-07": { row: 7, cls: "fix" },
  "chk-08": { row: 8, cls: "fix" },
  "chk-09": { row: 9, cls: "repair" },
  "chk-10": { row: 10, cls: "buffer" },
  "chk-11": { row: 11, cls: "fix" },
  "chk-12": { row: 12, cls: "fix" },
  "chk-13": { row: 13, cls: "fix" },
  "chk-14": { row: 14, cls: "fix" },
  "chk-15": { row: 15, cls: "block" },
  "chk-16": { row: 16, cls: "fix" },
  "chk-17": { row: 17, cls: "fix" },
  "chk-18": { row: 18, cls: "block" },
  "chk-19": { row: 19, cls: "warn" },
  "chk-20": { row: 20, cls: "fix" },
  "chk-21a": { row: 21, cls: "block" },
  "chk-21b": { row: 21, cls: "warn" },
  "chk-22": { row: 22, cls: "block" },
  "chk-23": { row: 23, cls: "buffer" },
  "chk-24": { row: 24, cls: "block" },
  "chk-25": { row: 25, cls: "block" },
  "chk-26": { row: 26, cls: "fix" },
  "chk-27": { row: 27, cls: "warn" },
  "chk-28": { row: 28, cls: "warn" },
  "chk-29": { row: 29, cls: "warn" },
  "chk-30": { row: 30, cls: "block" },
  "chk-31": { row: 31, cls: "fix" },
  "chk-32": { row: 32, cls: "buffer" },
  "chk-33": { row: 33, cls: "fix" },
  "chk-34": { row: 34, cls: "fix" },
  "chk-35": { row: 35, cls: "fix" },
  "chk-36": { row: 36, cls: "block" },
  "chk-37": { row: 37, cls: "warn" },
  "chk-38": { row: 38, cls: "fix" },
};

export const block = (rule: string, message: string): Check => ({ rule, cls: "block", message });
export const fixed = (rule: string, message: string): Check => ({ rule, cls: "fix", message });
export const warned = (rule: string, message: string): Check => ({ rule, cls: "warn", message });
export const buffered = (rule: string, message: string): Check => ({ rule, cls: "buffer", message });
export const repair = (rule: string, message: string): Check => ({ rule, cls: "repair", message });

/** What a validator returns: the output as it should be stored and every check that fired on the way. */
export interface Validated<T> {
  output: T;
  checks: Check[];
}

export const clean = <T>(output: T): Validated<T> => ({ output, checks: [] });

export function blocking(checks: Check[]): Check[] {
  return checks.filter((c) => c.cls === "block");
}

export function needsRepair(checks: Check[]): boolean {
  return checks.some((c) => c.cls === "repair");
}

/** The messages a retry carries, one line each, the rule first so the model sees what class of thing it broke. */
export function describeChecks(checks: Check[]): string[] {
  return checks.map((c) => c.message);
}
