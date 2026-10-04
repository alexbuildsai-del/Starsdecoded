/**
 * Every check a section can fail, classified (ADR-81; the annex
 * `docs/annex/pair-reliability-checks.md`, rows 1 to 42). A check blocks
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
  "chk-40": { row: 40, cls: "fix" },
  "chk-41": { row: 41, cls: "fix" },
  "chk-42": { row: 42, cls: "fix" },
  "chk-43": { row: 43, cls: "warn" },
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

/** What a list knows, beside the pattern that finds it in a sentence, so a message names the list's word and never the reader's. */
type Listed = ReadonlyArray<readonly [word: string, pattern: RegExp]>;

const SUBJECT = String.raw`(?:you|they|he|she|we|i|it|this|that|there|people|others|(?:someone|somebody|everyone|everybody|nobody|no one)(?!\s+else\b)|(?:each|both|neither|one) of you)(?:['’]\w+)?\s+\w`;
const PERSON = String.raw`(?:you|they|he|she|we)(?:['’]\w+)?\s+\w`;

/**
 * Two clauses in one sentence, the audit's first pattern ("…when you were born and writes you a report…"): a joining
 * word after a comma, or "and" or "but" alone before a person doing something. After a comma "and" and "or" also close
 * a list, so they count only before a subject; "but only", "but because" and "but not" qualify one idea.
 */
export const JOINS: Listed = [
  ["then", new RegExp(String.raw`,\s+(?:and\s+)?then\s+\w`, "i")],
  ["and", new RegExp(String.raw`,\s+and\s+${SUBJECT}|[^,\s]\s+and\s+${PERSON}`, "i")],
  ["but", new RegExp(String.raw`,\s+but\s+(?!(?:only|because|not|also)\b)\w|[^,\s]\s+but\s+${PERSON}`, "i")],
  ["so", new RegExp(String.raw`,\s+so\s+(?!(?:much|many|far)\b)\w`, "i")],
  ["or", new RegExp(String.raw`,\s+or\s+${SUBJECT}`, "i")],
  ["yet", new RegExp(String.raw`,\s+yet\s+\w`, "i")],
  ["while", new RegExp(String.raw`,\s+(?:while|whereas)\s+\w`, "i")],
  ["though", new RegExp(String.raw`,\s+(?:although|(?:even\s+)?though)\s+\w`, "i")],
];

/** A colon joins two clauses when a clause stands before it; after a label ("Behaviour check:", "Example:") it opens one. */
const CLAUSE_BEFORE_COLON = 4;
const AFTER_COLON = new RegExp(String.raw`^\s*${SUBJECT}`, "i");

function joinOf(sentence: string): string | null {
  for (const [word, pattern] of JOINS) if (pattern.test(sentence)) return word;
  for (let at = sentence.indexOf(":"); at >= 0; at = sentence.indexOf(":", at + 1)) {
    if (sentence.slice(0, at).trim().split(/\s+/).length >= CLAUSE_BEFORE_COLON && AFTER_COLON.test(sentence.slice(at + 1))) return "colon";
  }
  return null;
}

/**
 * Figures the reader has to decode: the ones the audit named ("the chart's grain", "tidal", "permeable", "Fused",
 * "growing edge", "What roots you", "Lean into"), rule 13's rooms, and the stock images of the r06 base. A word that
 * is mostly literal in a report (door, path, base, weight on its own, land) stays off the list.
 */
export const FIGURES: Listed = [
  ["anchor", /\banchor(?:s|ed|ing)?\b/i],
  ["compass", /\bcompass(?:es)?\b/i],
  ["north star", /\bnorth star\b/i],
  ["fuel", /\bfuel(?:s|ed|led|ing|ling)?\b/i],
  ["engine", /\bengines?\b/i],
  ["spark", /\bspark(?:s|ed|ing)?\b/i],
  ["spotlight", /\bspotlights?\b/i],
  ["container", /\bcontainers?\b/i],
  ["blueprint", /\bblueprints?\b/i],
  ["mirror", /\bmirror(?:s|ed|ing)?\b/i],
  ["signature", /\bsignatures?\b/i],
  ["currency", /\bcurrenc(?:y|ies)\b/i],
  ["leak", /\bleak(?:s|ed|ing|y)?\b/i],
  ["verdict", /\bverdicts?\b/i],
  ["referendum", /\breferend(?:um|ums|a)\b/i],
  ["weight", /\b(?:the|a|an|emotional|moral|public|full|extra|whole) weight\b/i],
  ["growing edge", /\bgrow(?:th|ing) edges?\b/i],
  ["permeable", /\b(?:permeable|porous)\b/i],
  ["tide", /\btid(?:e|es|al)\b/i],
  ["undercurrent", /\bundercurrents?\b/i],
  ["storm", /\bstorm(?:s|y)?\b/i],
  ["fused", /\bfus(?:e|ed|es|ing)\b/i],
  ["grain", /\bgrain\b/i],
  ["see-saw", /\bsee-?saws?\b/i],
  ["armour", /\barmou?r(?:ed)?\b/i],
  ["fortress", /\bfortress(?:es)?\b/i],
  ["cocoon", /\bcocoon(?:s|ed|ing)?\b/i],
  ["sanctuary", /\bsanctuar(?:y|ies)\b/i],
  ["magnetic", /\bmagnet(?:ic|ism|s)?\b/i],
  ["volcano", /\bvolcan(?:o|oes|ic)\b/i],
  ["erupt", /\berupt(?:s|ed|ing|ion)?\b/i],
  ["simmer", /\bsimmer(?:s|ed|ing)?\b/i],
  ["bloom", /\b(?:bloom|blossom)(?:s|ed|ing)?\b/i],
  ["harvest", /\bharvest(?:s|ed|ing)?\b/i],
  ["alchemy", /\balchem(?:y|ical)\b/i],
  ["crucible", /\bcrucibles?\b/i],
  ["tapestry", /\btapestr(?:y|ies)\b/i],
  ["room to", /(?<!\b(?:a|an|one|own|quiet|spare|private|separate)\s)\broom to\b/i],
  ["make room", /\b(?:make|makes|making|made|leave|leaves|leaving|left) room\b/i],
  ["read the room", /\bread(?:s|ing)? the room\b/i],
  ["roots you", /\broots? (?:you|them|him|her|us)\b/i],
  ["lean into", /\blean(?:s|ed|ing)? into\b/i],
];

/** Before "like a", a person or a helper makes "like" the verb ("you like a plan", "would like a"), and a comma makes it "such as". */
const LIKE_AS_VERB = new Set([
  "i", "you", "we", "they", "he", "she", "people", "others", "who", "to", "would", "do", "does", "did", "don't", "doesn't",
  "didn't", "really", "also", "still", "may", "might", "will", "won't", "can", "could", "usually", "often", "rarely",
  "never", "always", "actually", "genuinely",
]);

function isSimile(sentence: string): boolean {
  for (const m of sentence.matchAll(/\blike an?\b/gi)) {
    const before = sentence.slice(0, m.index).trimEnd();
    if (!before || /[,;:(–—-]$/.test(before)) continue;
    const word = (/[\w'’]+$/.exec(before)?.[0] ?? "").toLowerCase().replace(/’/g, "'");
    if (LIKE_AS_VERB.has(word) || word.endsWith("'d")) continue;
    return true;
  }
  return false;
}

function figureOf(sentence: string): string | null {
  for (const [word, pattern] of FIGURES) if (pattern.test(sentence)) return word;
  return isSimile(sentence) ? "simile" : null;
}

/** Copied text is counted where it was written: a claim's quote, an amendment's quote and the sentence it follows, a reference. */
const COPIED = new Set(["claims", "quote", "after", "evidence"]);

function readerLeaves(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) readerLeaves(v, out);
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) if (!COPIED.has(k)) readerLeaves(v, out);
  return out;
}

/** A sentence has three words at least: a label or a one-word field is not one. */
function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?][”"’')\]]?)\s+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3);
}

export type PlainKind = "two ideas" | "metaphor";

export interface PlainHit {
  kind: PlainKind;
  /** The list's word for what fired: the joining word or "colon", the figure or "simile". */
  word: string;
  /** For a person reading a run; the failure log never carries it (R-3.5). */
  sentence: string;
}

/** Every sentence the reader reads, and the ones that miss the writer's rule; a sentence counts once for each kind. */
export function plainHits(value: unknown): { sentences: number; hits: PlainHit[] } {
  let sentences = 0;
  const hits: PlainHit[] = [];
  for (const text of readerLeaves(value)) {
    for (const sentence of sentencesOf(text)) {
      sentences++;
      const join = joinOf(sentence);
      if (join) hits.push({ kind: "two ideas", word: join, sentence });
      const figure = figureOf(sentence);
      if (figure) hits.push({ kind: "metaphor", word: figure, sentence });
    }
  }
  return { sentences, hits };
}

/** The lab's three numbers for a section as stored: its sentences and those with two ideas or a metaphor. */
export function plainCount(value: unknown): { sentences: number; twoIdeas: number; metaphor: number } {
  const { sentences, hits } = plainHits(value);
  return { sentences, twoIdeas: hits.filter((h) => h.kind === "two ideas").length, metaphor: hits.filter((h) => h.kind === "metaphor").length };
}

/**
 * chk-43 (annex row 43), one WARN per kind that fired: the writer's rule (ADR-257) counted over what the reader
 * reads. Lists find a join or a figure, never the meaning, so the counts are a trend read against the r06 base, not a
 * judgement of one sentence: never a block, a retry or a lab fault (ADR-81). The message names the list's words and
 * the counts, never the reader's text.
 */
export function plainChecks(value: unknown): Check[] {
  const { sentences, hits } = plainHits(value);
  return (["two ideas", "metaphor"] as const).flatMap((kind) => {
    const counts = new Map<string, number>();
    for (const h of hits) if (h.kind === kind) counts.set(h.word, (counts.get(h.word) ?? 0) + 1);
    const total = [...counts.values()].reduce((n, c) => n + c, 0);
    if (!total) return [];
    return [warned("chk-43", `${kind}: ${total} of ${sentences} sentences (${[...counts].map(([w, n]) => (n > 1 ? `${w} ×${n}` : w)).join(", ")})`)];
  });
}
