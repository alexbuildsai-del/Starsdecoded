/**
 * Every check a section can fail, classified (ADR-81; the annex
 * `docs/annex/pair-reliability-checks.md`, rows 1 to 39). A check blocks
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
  "chk-39": { row: 39, cls: "warn" },
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

/** "energy" counts only where it stands for a mood: stamina ("the energy to finish", "nervous energy") is plain English. */
const ENERGY_AS_MOOD = new RegExp([
  "\\b(?:good|bad|positive|negative|calm|chaotic|chill|heavy|light|soft|big|intense|warm|cold|gentle|fiery|grounded|grounding|nurturing|playful|magnetic|electric|tense|weird|awkward|masculine|feminine|fire|earth|air|water|cardinal|fixed|mutable|sister|brother|mom|mum|dad|boss) energy\\b",
  "\\benergy (?:in|of) (?:the|a|this|that|any) room\\b",
  "\\benergy between\\b",
  "\\b(?:give|gives|giving|gave|given) off\\b[^.!?]{0,30}?\\benergy\\b",
  "\\b(?:protect|protects|protecting|match|matches|matching|matched|read|reads|reading) (?:the|your|their|his|her|each other['’]s|someone['’]s) energy\\b",
  "\\bthe energy (?:shifts?|shifted|changes?|changed)\\b",
].join("|"), "gi");

export type RegisterList = "high" | "low";

/**
 * Rule 13's two lists (ADR-185): each word as the style contract names it,
 * beside the pattern that finds it in prose, so one test holds the prompt
 * and chk-39 to the same words.
 */
export const REGISTER: Record<RegisterList, ReadonlyArray<readonly [word: string, pattern: RegExp]>> = {
  high: [
    ["oriented to", /\borient(?:at)?ed (?:to|towards?)\b/gi],
    ["predisposed", /\bpredispos(?:ed|itions?)\b/gi],
    ["proclivity", /\bproclivit(?:y|ies)\b/gi],
    ["dichotomy", /\bdichotom(?:y|ies)\b/gi],
    ["paradigm", /\bparadigms?\b/gi],
  ],
  low: [
    ["vibe", /\bvib(?:e|es|ey|ing)\b/gi],
    ["toxic", /\btoxic(?:ity)?\b/gi],
    ["red flag", /\bred[- ]flags?\b/gi],
    ["lowkey", /\blow ?key\b/gi],
    ["main character", /\bmain[- ]character\b/gi],
    ["energy", ENERGY_AS_MOOD],
  ],
};

export interface RegisterHit {
  list: RegisterList;
  word: string;
  /** For a person reading a run; the failure log never carries it (R-3.5). */
  sentence: string;
}

/** Claims only quote the prose, so reading them would count a word twice. */
function proseLeaves(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) proseLeaves(v, out);
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) if (k !== "claims") proseLeaves(v, out);
  return out;
}

function sentenceAt(text: string, at: number): string {
  const start = Math.max(0, ...[". ", "! ", "? ", "\n"].map((p) => { const i = text.lastIndexOf(p, at); return i < 0 ? 0 : i + p.length; }));
  const ends = [".", "!", "?", "\n"].map((p) => text.indexOf(p, at)).filter((i) => i >= 0);
  return text.slice(start, ends.length ? Math.min(...ends) + 1 : text.length).trim();
}

/** Each hit keeps its sentence, so a person reading a fixture run can judge the word where it fell before a Promote. */
export function registerHits(value: unknown): RegisterHit[] {
  const hits: RegisterHit[] = [];
  for (const text of proseLeaves(value)) {
    for (const list of ["high", "low"] as const) {
      for (const [word, pattern] of REGISTER[list]) {
        for (const m of text.matchAll(pattern)) hits.push({ list, word, sentence: sentenceAt(text, m.index ?? 0) });
      }
    }
  }
  return hits;
}

/**
 * chk-39 (annex row 39), one WARN per list that fired. A word too fancy or
 * too trendy reads badly but is not wrong for the reader (ADR-81), so the
 * count is logged for the Failures tab and is never a block, a retry or a
 * lab fault. The message names the list's words, never the reader's text.
 */
export function registerChecks(value: unknown): Check[] {
  const hits = registerHits(value);
  return (["high", "low"] as const).flatMap((list) => {
    const counts = new Map<string, number>();
    for (const h of hits) if (h.list === list) counts.set(h.word, (counts.get(h.word) ?? 0) + 1);
    if (!counts.size) return [];
    return [warned("chk-39", `register too ${list}: ${[...counts].map(([w, n]) => (n > 1 ? `${w} ×${n}` : w)).join(", ")}`)];
  });
}
