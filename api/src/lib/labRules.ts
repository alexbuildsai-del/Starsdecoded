/**
 * The report lab's rules, shared by the script and the lab routes so the
 * panel and the paste trail cannot disagree on what a fault is (annex scope
 * 3): the style-contract regexes, the banned characters, the why-verb check,
 * the house-card shape, the blind flags, the word bands, and the release
 * gate (ADR-76). Pure of the model and the database.
 */
import { BLIND_WORD_TARGETS, SECTION_IDS, WORD_TARGETS, hasClaims, sectionById, validateClaims, type ReportSectionId } from "../prompts/index.js";
import type { NatalChartData } from "./chartCalculation.js";
import { tierFor, type ServiceTier } from "./models.js";
import { costUsd } from "./usage.js";

/** The five charts every full lab and every release gate runs on (ADR-77); the other fixtures run only when their own brain changed. */
export const MATRIX_CHARTS = ["day-angular", "high-latitude", "marie-curie", "night-angular", "audrey-hepburn"] as const;

/** The product target (Owner, 2026-09-18). The registry's bands sum inside it. */
export const REPORT_TOTAL: [number, number] = [3500, 5500];

/** A release may cost this much more than the last one and still ship (ADR-76). */
export const COST_TOLERANCE = 1.1;

/**
 * Style-contract rule 1: the report must never explain its own method. These
 * are the phrasings that review rejected, plus the obvious neighbours. Matching
 * is a warning rather than a failure: the lab reports, the human decides.
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
  "in its own sign",
  "about as strong as a planet gets",
  "which means astrologically",
  "astrologers say",
  "this placement means",
  "the first honest thing",
  "what this means astrologically",
  "in your chart, ",
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

export function hasVerb(clause: string): boolean {
  const tokens = clause.toLowerCase().match(/[a-z']+/g) ?? [];
  return tokens.some((t) => VERBS.has(t) || (t.length > 3 && /(?:s|ing|ed)$/.test(t)));
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
      .filter(([k]) => k !== "claims")
      .map(([, v]) => proseOf(v))
      .join(" ");
  }
  return "";
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
  const text = proseOf(value);
  for (const [name, re] of HORIZON_WORDS) if (re.test(text)) flags.push(`blind:${name} in text`);
  const stored = (value as { claims?: Array<{ evidence: Array<{ ref: { kind: string; house?: number | null } }> }> } | undefined)?.claims ?? [];
  for (const c of stored) for (const e of c.evidence) {
    if (HORIZON_KINDS.has(e.ref.kind)) flags.push(`blind:${e.ref.kind} claim`);
    if (e.ref.kind === "placement" && e.ref.house != null) flags.push("blind:placement claim carries a house");
  }
  return [...new Set(flags)];
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
  const lower = prose.toLowerCase();
  return {
    section,
    words: w,
    target,
    inRange: target ? w >= target[0] && w <= target[1] : null,
    structured: isStructured(value),
    methodTalk: METHOD_TALK.filter((p) => lower.includes(p)),
    bannedChars: BANNED_CHARS.filter(([, re]) => re.test(prose)).map(([n]) => n),
    claims: { count: stored.length, problems },
    missing,
    whyNotes: whys.filter((x) => !hasVerb(x.why)).map((x) => `${x.path || "why"}: "${x.why}"`),
    houseNotes: houseNotes(value),
    blindFlags: blind && !missing ? blindFlags(value) : [],
  };
}

/** Every reader-facing section of a stored interpretation; a blind report has no house readings row. */
export function measureReport(interpretation: Record<string, unknown>, chart?: NatalChartData): SectionMeasure[] {
  const blind = (interpretation.meta as { horizon?: string } | undefined)?.horizon === "unknown";
  const ids = blind ? SECTION_IDS.filter((id) => id !== "houses") : SECTION_IDS;
  return ids.map((section) => measureSection(section, interpretation[section], chart, blind));
}

/** The contract failures a section is judged on; the warnings (why, house shape) stay off this list. */
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
  let refCost = 0, candCost = 0, priced = true;
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
      for (const r of [...cand, ...ref]) if (r.costUsd === null) priced = false;
      candCost += cand.reduce((n, r) => n + (r.costUsd ?? 0), 0);
      refCost += ref.reduce((n, r) => n + (r.costUsd ?? 0), 0);
    }
  }
  if (refCost > 0 && priced && candCost > refCost * COST_TOLERANCE) {
    problems.push(`cost $${candCost.toFixed(4)} is ${Math.round((candCost / refCost - 1) * 100)}% over the reference $${refCost.toFixed(4)} (tolerance ${Math.round((COST_TOLERANCE - 1) * 100)}%)`);
  }
  if (refCost === 0) problems.push("no reference run to compare cost against");
  return problems;
}

/** The token shape of one section of a base run, what an estimate is priced on. */
export interface TokenShape {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

/** A section with no stored shape is priced on the R05 mean (spec, mixes table). */
export const FALLBACK_SHAPE: TokenShape = { inputTokens: 2_700, cachedInputTokens: 7_750, outputTokens: 1_260 };

/** What one section costs on one writer at one tier, from a base shape; Flex only where the model offers it. */
export function priceSection(model: string, shape: TokenShape, tier: ServiceTier = "standard"): number | null {
  return costUsd(model, { attempts: 1, reasoningTokens: 0, ms: 0, ...shape }, tierFor(model, tier));
}

/** The out-of-credit refusal as it reads from a status message, so a campaign can stop on it (ADR-77). */
export function isOutOfCreditMessage(message: string): boolean {
  return /out of credit|insufficient_quota|no credits/i.test(message);
}
