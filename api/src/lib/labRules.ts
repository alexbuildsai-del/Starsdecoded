/**
 * The report lab's rules, shared by the script and the lab routes so the
 * panel and the paste trail cannot disagree on what a fault is (annex scope
 * 3): the style-contract regexes, the banned characters, the why-verb check,
 * the house-card shape, the blind flags, the word bands, and the release
 * gate (ADR-76). Pure of the model and the database.
 */
import { BLIND_WORD_TARGETS, SECTION_IDS, WORD_TARGETS, hasClaims, sectionById, validateClaims, type ReportSectionId } from "../prompts/index.js";
import { DIGNITY_WORDS } from "../prompts/checks.js";
import { NOT_PROSE } from "../prompts/evidence.js";
import type { NatalChartData } from "./chartCalculation.js";
import { thinkingAllowance, tierFor, type ServiceTier } from "./models.js";
import { costUsd } from "./usage.js";

/** The five charts every full lab and every release gate runs on (ADR-77); the other fixtures run only when their own brain changed. */
export const MATRIX_CHARTS = ["day-angular", "high-latitude", "marie-curie", "night-angular", "audrey-hepburn"] as const;

/** The product target (Owner, 2026-09-18). The registry's bands sum inside it. */
export const REPORT_TOTAL: [number, number] = [3500, 5500];

/** A release may cost this much more than the last one and still ship (ADR-76). */
export const COST_TOLERANCE = 1.1;
/** ...and must also cost this much more a report before it is refused: a fraction of a cent is one run's noise, not a dearer brain. */
export const COST_FLOOR_USD = 0.01;

/**
 * Style-contract rule 1: the report must never explain its own method. These
 * are the phrasings that review rejected, plus the obvious neighbours. Matching
 * is a warning rather than a failure: the lab reports, the human decides.
 * "in its own sign" and "in your chart, " are not here: the plain-words rule
 * asks for the first and the second opens a sentence about the reader (ADR-385).
 */
export const METHOD_TALK = [
  "in traditional practice",
  "in traditional astrology",
  "traditionally speaking",
  "by day mars",
  "by night saturn",
  "out of sect",
  "in sect",
  "contrary to sect",
  "is in detriment",
  "is in domicile",
  "about as strong as a planet gets",
  "which means astrologically",
  "astrologers say",
  "this placement means",
  "the first honest thing",
  "what this means astrologically",
  "this section",
  "as we will see",
  "depending on the tradition",
  "some astrologers",
  "above the horizon",
  "below the horizon",
  "fun fact",
  "did you know",
  "interesting quirk",
];

/**
 * Style-contract rule 12: a why clause says what the action trains, and a
 * sentence that trains something has a verb in it. The list plus the common
 * inflections is deliberately generous, because a why wrongly flagged costs a
 * human a look and a why wrongly passed costs nothing but this check.
 */
const VERBS = new Set([
  "is", "are", "was", "were", "be", "been", "am", "has", "have", "had", "do", "does", "did",
  "can", "will", "would", "should", "must", "let", "go", "get", "keep", "make", "take", "give",
  "know", "see", "say", "tell", "ask", "want", "need", "find", "feel", "come", "put", "hold",
  "build", "run", "name", "notice", "choose", "leave", "move", "try", "turn", "train", "spend",
  "cost", "work", "stay", "stop", "start", "show", "read", "write", "meet", "set", "cut", "think",
]);

const SUBJECT_VERB_RE = /\b(?:you|he|she|they|we|it|both|i)\b\s+(?:(?:both|each|never|always|still|just|only|also|can|will|would|could|should|might|must|do|does|did|don't|won't)\s+)*[a-z']+/i;

/** A pronoun subject followed by a word is a verb phrase, so "so you pause first" passes (annex row 28). */
export function hasVerb(clause: string): boolean {
  const tokens = clause.toLowerCase().match(/[a-z']+/g) ?? [];
  if (tokens.some((t) => VERBS.has(t) || (t.length > 3 && /(?:s|ing|ed)$/.test(t)))) return true;
  return SUBJECT_VERB_RE.test(clause) || /\bto\s+[a-z]+/i.test(clause);
}

/** Every `why` a section carries, wherever it sits, with the path that found it. */
export function whyClauses(value: unknown, path: string, out: Array<{ path: string; why: string }>): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => whyClauses(v, `${path}.${i}`, out));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === "claims") continue;
    if (k === "why" && typeof v === "string") out.push({ path, why: v });
    else whyClauses(v, path ? `${path}.${k}` : k, out);
  }
}

export function words(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

/** The house readings answer to their own shape: 40 to 70 words, ending on a behaviour check. */
export function houseNotes(value: unknown): string[] {
  const readings = (value as { houses?: Array<{ house: number; reading: string }> } | undefined)?.houses;
  if (!Array.isArray(readings)) return [];
  const notes: string[] = [];
  if (readings.length !== 12) notes.push(`${readings.length} readings, not 12`);
  for (const r of readings) {
    const w = words(r.reading ?? "");
    if (w < 40 || w > 70) notes.push(`house ${r.house}: ${w} words`);
    if (!/Behaviour check:/.test(r.reading ?? "")) notes.push(`house ${r.house}: no behaviour check`);
  }
  return notes;
}

/** Style-contract rule 8: banned punctuation and formatting. */
export const BANNED_CHARS: Array<[string, RegExp]> = [
  ["em dash", /—/],
  ["semicolon", /;/],
];

/** Flatten any section value to the prose a reader actually sees. */
export function proseOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(proseOf).join(" ");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([k]) => !NOT_PROSE.has(k))
      .map(([, v]) => proseOf(v))
      .join(" ");
  }
  return "";
}

/** Every word the reader sees, the Did you know card's too: the checks for wrong words read it, the word counts don't. */
function seenOf(value: unknown): string {
  const card = (value as { didYouKnow?: unknown } | null | undefined)?.didYouKnow;
  return card && typeof value === "object" ? `${proseOf(value)} ${proseOf(card)}` : proseOf(value);
}

/** A section is structured when the model returned the object the prompt asked for; a raw string is a parse fallback. */
export function isStructured(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

/**
 * The blind report never names what the hour did not settle (ADR-34): a house
 * number, the rising sign, the Ascendant, the Midheaven, sect or a lot. Text
 * and claims are both searched, and a hit is a failure, not a warning.
 */
const HORIZON_WORDS: Array<[string, RegExp]> = [
  ["house number", /\b\d+(?:st|nd|rd|th) house\b/i],
  ["house number", /\b(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) house\b/i],
  ["rising", /\brising\b/i],
  ["Ascendant", /\bascendant\b/i],
  ["Midheaven", /\bmidheaven\b/i],
  ["sect", /\b(?:day chart|night chart|sect|by day|by night)\b/i],
  ["lot", /\blot of (?:fortune|spirit)\b/i],
];
const HORIZON_KINDS = new Set(["angle", "ruler", "sect", "lot"]);

export function blindFlags(value: unknown): string[] {
  const flags: string[] = [];
  const text = seenOf(value);
  for (const [name, re] of HORIZON_WORDS) if (re.test(text)) flags.push(`blind:${name} in text`);
  const stored = (value as { claims?: Array<{ evidence: Array<{ ref: { kind: string; house?: number | null } }> }> } | undefined)?.claims ?? [];
  for (const c of stored) for (const e of c.evidence) {
    if (HORIZON_KINDS.has(e.ref.kind)) flags.push(`blind:${e.ref.kind} claim`);
    if (e.ref.kind === "placement" && e.ref.house != null) flags.push("blind:placement claim carries a house");
  }
  return [...new Set(flags)];
}

/** Every prose string of a section, one paragraph each (a blank line inside one splits it), the claims left out. */
export function paragraphsOf(value: unknown): string[] {
  if (typeof value === "string") return value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(paragraphsOf);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).filter(([k]) => k !== "claims").flatMap(([, v]) => paragraphsOf(v));
  }
  return [];
}

/** A full stop, ! or ? followed by a space ends a sentence, so "19.07" and "9th." inside a number do not. */
export function sentencesOf(paragraph: string): string[] {
  return paragraph.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
}

const WORD_RE = /[A-Za-z0-9\u2019']+/g;

/** Vowel groups, less a silent final e, ed or es: close enough to rank two texts, wrong on some words ("created" counts one). */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const stem = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  return Math.max(1, stem.match(/[aeiouy]+/g)?.length ?? 1);
}

/** Flesch-Kincaid grade of some paragraphs: 0.39 words a sentence + 11.8 syllables a word - 15.59. Null when there is no sentence. */
export function gradeOf(paragraphs: readonly string[]): number | null {
  const sentences = paragraphs.flatMap(sentencesOf);
  const tokens = sentences.flatMap((x) => x.match(WORD_RE) ?? []);
  if (!sentences.length || !tokens.length) return null;
  const syl = tokens.reduce((n, t) => n + syllables(t), 0);
  return Math.round((0.39 * (tokens.length / sentences.length) + 11.8 * (syl / tokens.length) - 15.59) * 10) / 10;
}

/** The words in the longest sentence of some paragraphs. */
export function longestSentence(paragraphs: readonly string[]): number {
  return Math.max(0, ...paragraphs.flatMap(sentencesOf).map((x) => (x.match(WORD_RE) ?? []).length));
}

const PLACEMENT_BODIES = "sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|north node|south node|ascendant|midheaven|rising";
const PLACEMENT_SIGNS = "aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces";
const PLACEMENT_HOUSES = "\\d{1,2}(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth";
/** A body named where it stands: "Mars in Aries", "Venus in your 3rd house", "Saturn sits in the tenth". */
const PLACEMENT_RE = new RegExp(`\\b(${PLACEMENT_BODIES})\\b(?:\u2019s|'s)?,?\\s+(?:(?:is|sits|falls|stands|lands|moves|was)\\s+)?(?:in|at)\\s+(?:(?:your|the|its|his|her|their)\\s+)?(${PLACEMENT_SIGNS}|${PLACEMENT_HOUSES})\\b`, "gi");

/** The most distinct placements one paragraph names (explain-like-a-friend acceptance 1 asks for one). */
export function mostNamed(paragraphs: readonly string[]): number {
  return Math.max(0, ...paragraphs.map((p) => new Set([...p.matchAll(PLACEMENT_RE)].map((m) => `${m[1]} ${m[2]}`.toLowerCase())).size));
}

/**
 * Dignity and sect words in some prose (explain-like-a-friend §3, acceptance 2), whole words only. `fall` counts only as
 * "in fall" or "its fall" and `angular` only before "house" or "planet", the way R19-10's chk-49 reads them.
 */
export function dignityHits(prose: string): string[] {
  const text = prose.toLowerCase();
  return DIGNITY_WORDS.filter((w) => {
    const word = w.toLowerCase();
    const re = word === "fall" ? /\b(?:in|its) fall\b/
      : word === "angular" ? /\bangular (?:house|planet)/
      : new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    return re.test(text);
  });
}

const OPENER_WORDS = 3;
const OPENER_MIN_WORDS = 20;

/** A paragraph's first three words, lower case: what "opens the same way" means. Only a paragraph of a real length has one. */
export function openerOf(paragraph: string): string | null {
  const tokens = paragraph.toLowerCase().match(WORD_RE) ?? [];
  return tokens.length >= OPENER_MIN_WORDS ? tokens.slice(0, OPENER_WORDS).join(" ") : null;
}

/** Openers used by more than two paragraphs of a report, each with its count; the rows are the report's sections. */
export function repeatedOpeners(rows: readonly Pick<SectionMeasure, "openers">[]): Array<[opener: string, count: number]> {
  const seen = new Map<string, number>();
  for (const o of rows.flatMap((r) => r.openers)) seen.set(o, (seen.get(o) ?? 0) + 1);
  return [...seen].filter(([, n]) => n > 2).sort((a, b) => b[1] - a[1]);
}

export interface SectionMeasure {
  section: string;
  words: number;
  target: [number, number] | null;
  inRange: boolean | null;
  structured: boolean;
  methodTalk: string[];
  bannedChars: string[];
  /** Validated claims / total; problems when re-validation fails. */
  claims: { count: number; problems: string[] };
  /** A section the run has not written yet. Everything else on the row is empty. */
  missing: boolean;
  whyNotes: string[];
  houseNotes: string[];
  /** Horizon words in a blind report. Empty on a drawn one. */
  blindFlags: string[];
  /** The most distinct placements one paragraph names. The next four are the plain-words rule's measures (explain-like-a-friend acceptance 1, 2, 5): warnings, which `faultsOf` never reads (ADR-81, 385). */
  mostNamed: number;
  /** Dignity and sect words in the prose. */
  dignity: string[];
  /** Words in the longest sentence; the rule's ceiling is 25. */
  longestSentence: number;
  /** Flesch-Kincaid grade of the section; null with no sentence. The rule's reading level is 6 to 8. */
  grade: number | null;
  /** The first three words of each paragraph of a real length, for `repeatedOpeners` over a whole report. */
  openers: string[];
}

/** One section against the contract: the band in force, the regexes, the claims re-validated against the chart when there is one. */
export function measureSection(section: string, value: unknown, chart: NatalChartData | undefined, blind: boolean): SectionMeasure {
  const missing = value === undefined || value === null;
  const spec = sectionById(section);
  // A section whose schema has no claims is its own evidence, so an empty
  // claims list there is the contract, not a fault.
  const wantsClaims = spec ? hasClaims(spec) : true;
  const stored = (value as { claims?: Array<{ quote: string; evidence: Array<{ ref: unknown }> }> } | undefined)?.claims ?? [];
  const asModel = stored.map((c) => ({ quote: c.quote, evidence: c.evidence.map((e) => e.ref) }));
  const problems = chart && !missing ? validateClaims(value, asModel as never, chart) : [];
  if (wantsClaims && !missing && stored.length < 3) problems.push(`only ${stored.length} claims`);
  const whys: Array<{ path: string; why: string }> = [];
  whyClauses(value, "", whys);
  const prose = proseOf(value);
  const w = words(prose);
  // A blind report is written to its blind bands (MB-60).
  const target = (blind ? BLIND_WORD_TARGETS[section] : WORD_TARGETS[section as ReportSectionId]) ?? null;
  const seen = seenOf(value);
  const lower = seen.toLowerCase();
  const paragraphs = paragraphsOf(value);
  return {
    section,
    words: w,
    target,
    inRange: target ? w >= target[0] && w <= target[1] : null,
    structured: isStructured(value),
    methodTalk: METHOD_TALK.filter((p) => lower.includes(p)),
    bannedChars: BANNED_CHARS.filter(([, re]) => re.test(seen)).map(([n]) => n),
    claims: { count: stored.length, problems },
    missing,
    whyNotes: whys.filter((x) => !hasVerb(x.why)).map((x) => `${x.path || "why"}: "${x.why}"`),
    houseNotes: houseNotes(value),
    blindFlags: blind && !missing ? blindFlags(value) : [],
    mostNamed: mostNamed(paragraphs),
    dignity: dignityHits(seen),
    longestSentence: longestSentence(paragraphs),
    grade: gradeOf(paragraphs),
    openers: paragraphs.flatMap((p) => openerOf(p) ?? []),
  };
}

/** Every reader-facing section of a stored interpretation; a blind report has no house readings row. */
export function measureReport(interpretation: Record<string, unknown>, chart?: NatalChartData): SectionMeasure[] {
  const blind = (interpretation.meta as { horizon?: string } | undefined)?.horizon === "unknown";
  const ids = blind ? SECTION_IDS.filter((id) => id !== "houses") : SECTION_IDS;
  return ids.map((section) => measureSection(section, interpretation[section], chart, blind));
}

/** The contract failures a section is judged on; the warnings (why, house shape, the plain-words measures) stay off this list. */
export function faultsOf(row: SectionMeasure): string[] {
  return [
    ...(row.missing ? ["not written"] : []),
    ...(row.missing || row.structured ? [] : ["unstructured"]),
    ...row.methodTalk.map((m) => `method:"${m}"`),
    ...row.bannedChars.map((c) => `char:${c}`),
    ...row.claims.problems.map((c) => `claim:${c}`),
    ...row.blindFlags.map((b) => b.toUpperCase()),
  ];
}

/** The total band a report answers to: the blind bands' sum when it was written blind (MB-60). */
export function reportBand(blind: boolean): [number, number] {
  if (!blind) return REPORT_TOTAL;
  const targets = Object.values(BLIND_WORD_TARGETS);
  return [targets.reduce((n, [a]) => n + a, 0), targets.reduce((n, [, b]) => n + b, 0)];
}

/** What the gate and the panel keep of a section: numbers only, never text. */
export interface RunNumbers {
  fixture: string;
  label: string;
  section: string;
  words: number;
  costUsd: number | null;
  faults: string[];
  status?: string;
}

/**
 * The release gate (ADR-76): the candidate label fast-forwards only when no
 * section carries a fault the reference lacked, every drawn total sits inside
 * its band, and the cost over the charts both labels ran is within tolerance.
 * Returns the reasons it would refuse; empty means green.
 */
export function gateProblems(reference: RunNumbers[], candidate: RunNumbers[], charts: readonly string[] = MATRIX_CHARTS): string[] {
  const problems: string[] = [];
  const sectionsOf = (rows: RunNumbers[], fixture: string) => rows.filter((r) => r.fixture === fixture && r.section !== "foundation");
  let refCost = 0, candCost = 0, priced = true, compared = 0;
  for (const fixture of charts) {
    const cand = sectionsOf(candidate, fixture);
    const ref = sectionsOf(reference, fixture);
    if (!cand.length) { problems.push(`${fixture}: no candidate run`); continue; }
    for (const row of cand) {
      if (row.status && row.status !== "done") { problems.push(`${fixture}/${row.section}: ${row.status}`); continue; }
      const before = ref.find((r) => r.section === row.section)?.faults ?? [];
      const fresh = row.faults.filter((f) => !before.includes(f));
      if (fresh.length) problems.push(`${fixture}/${row.section}: new fault ${fresh.join(" ")}`);
    }
    const total = cand.reduce((n, r) => n + r.words, 0);
    if (total < REPORT_TOTAL[0] || total > REPORT_TOTAL[1]) problems.push(`${fixture}: ${total} words, outside ${REPORT_TOTAL[0]}-${REPORT_TOTAL[1]}`);
    if (ref.length) {
      compared += 1;
      for (const r of [...cand, ...ref]) if (r.costUsd === null) priced = false;
      candCost += cand.reduce((n, r) => n + (r.costUsd ?? 0), 0);
      refCost += ref.reduce((n, r) => n + (r.costUsd ?? 0), 0);
    }
  }
  if (refCost > 0 && priced && candCost > refCost * COST_TOLERANCE && candCost - refCost > COST_FLOOR_USD * compared) {
    problems.push(`cost $${candCost.toFixed(4)} is ${Math.round((candCost / refCost - 1) * 100)}% over the reference $${refCost.toFixed(4)} (tolerance ${Math.round((COST_TOLERANCE - 1) * 100)}%)`);
  }
  if (refCost === 0) problems.push("no reference run to compare cost against");
  return problems;
}

/** The token shape of one section of a base run, what an estimate is priced on; visible output only, since each writer thinks for itself. */
export interface TokenShape {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

/** A section with no stored shape is priced on the R05 mean (spec, mixes table). */
export const FALLBACK_SHAPE: TokenShape = { inputTokens: 2_700, cachedInputTokens: 7_750, outputTokens: 1_260 };

/** What one section costs on one writer at one tier, from a base shape plus the writer's thinking; Flex only where the model offers it. */
export function priceSection(model: string, shape: TokenShape, tier: ServiceTier = "standard"): number | null {
  const thinking = thinkingAllowance(model);
  return costUsd(model, { attempts: 1, ms: 0, ...shape, outputTokens: shape.outputTokens + thinking, reasoningTokens: thinking }, tierFor(model, tier));
}

/** The out-of-credit refusal as it reads from a status message, so a campaign can stop on it (ADR-77). */
export function isOutOfCreditMessage(message: string): boolean {
  return /out of credit|insufficient_quota|no credits/i.test(message);
}
