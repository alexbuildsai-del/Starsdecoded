/**
 * The shapes every pair section is built from: the spec type, the p2 chapter
 * schemas, the lens chapter factory and the validators (ADR-63, ADR-69).
 * Sections import from here and the registry imports the sections, so
 * nothing is circular.
 */
import { z } from "zod/v4";
import type { Band, PairBrief } from "../../lib/pairBrief.js";
import { LENS_REGISTER, type Lens } from "../../lib/pairBrief.js";
import { PairClaimsSchema, reconcilePairClaims, type PairClaim } from "./evidence.js";
import { ASPECTS, BODIES, BODY_LABELS } from "../vocabulary.js";
import type { ReportSectionId } from "../index.js";
import { block, buffered, fixed, warned, type Check, type Validated } from "../checks.js";

export type SceneTitles = readonly [string, string, string];
export type SceneSet = SceneTitles | ((band: Band | null) => SceneTitles);

/** A chapter's three scene titles for the band in force. */
export function scenesOf(spec: { scenes?: SceneSet }, band: Band | null): SceneTitles | undefined {
  return typeof spec.scenes === "function" ? spec.scenes(band) : spec.scenes;
}

export interface PairSectionSpec<T extends z.ZodType = z.ZodType> {
  /** Prompt key, e.g. "pair:partners02". `:system` and `:user` rows derive from it. */
  key: string;
  label: string;
  adminLabel: string;
  /** Chapter number on the page, 0 for the foundation and the link cards. */
  chapter: number;
  /** The lens a chapter belongs to; the fixed chapters and the link cards belong to every lens. */
  lens?: Lens;
  wordTarget: [number, number];
  maxTokens: number;
  schema: T;
  instructions: string;
  /** The three curated scenes, in the spec's order, or per band under the parent lens; the foundation picks the written one (ADR-65). */
  scenes?: SceneSet;
  /** The personal-report sections whose claims this chapter's brief carries (ADR-66). */
  draws?: readonly ReportSectionId[];
  extraContext?: (brief: PairBrief) => string;
  /** Runs on the raw reply before the parse: cuts, drops, spellings (ADR-81). */
  normalise?: (raw: unknown, brief: PairBrief) => { raw: unknown; checks: Check[] };
  /** Post-parse: snaps, drops, fills, blocks; the output as it should be stored (ADR-81, ADR-82). */
  validate?: (output: z.infer<T>, brief: PairBrief) => Validated<z.infer<T>>;
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** Chapter 01, Your two charts: the introduction under the two charts (ADR-63, ADR-106). */
export const PairTwoChartsSchema = z.object({
  headline: z.string().describe("the verdict headline: one sentence, the pair thesis, addressed to both"),
  strong: z.array(z.string().describe("one sentence, what is naturally strong between you")).min(3).max(3),
  work: z.array(z.string().describe("one sentence, what will take work, framed as what it trains")).min(3).max(3),
  paradox: z.string().describe("the paradox, one line"),
  strengths: z.array(z.string().describe("a card line, at most twelve words, naming only the two people")).min(3).max(3),
  pointer: z.string().describe("one pointer sentence: where the report goes from here"),
  claims: PairClaimsSchema,
});
export type PairTwoChartsOutput = z.infer<typeof PairTwoChartsSchema>;

const CardSide = z.array(z.string().describe("one line in this person's own words from their personal report, at most twelve words, no body name, no number")).min(3).max(3);

const NextTimeItem = z.object({
  for: z.enum(["A", "B", "both"]).describe("who the item is for"),
  action: z.string().describe("a specific, doable action, 8 to 18 words"),
  why: z.string().describe("one short clause with a verb: what the action trains"),
});

/** Chapters 02 to 06 under every lens: the workbook chapter (ADR-63, ADR-64). */
export const PairLensChapterSchema = z.object({
  headline: z.string().describe("the verdict headline, one sentence in B's voice"),
  card: z.object({
    a: CardSide,
    b: CardSide,
    pair: z.string().describe("one line for the pair, at most twelve words"),
  }),
  scene: z.string().describe("four to six present-tense sentences with both names; may hold a short quoted exchange; no fact outside the brief"),
  whatJustHappened: z.object({
    becauseA: z.string().describe("25 to 40 words: the need, fear or habit under A's side, in A's report's words"),
    becauseB: z.string().describe("25 to 40 words: the same for B"),
  }),
  pattern: z.string().describe("40 to 60 words: the pattern under it, whether this is where it flows or rubs"),
  nextTime: z.object({ items: z.array(NextTimeItem).min(2).max(3) }),
  claims: PairClaimsSchema,
});
export type PairLensChapterOutput = z.infer<typeof PairLensChapterSchema>;

const PairItem = z.object({ action: z.string().describe("a specific, doable action, 8 to 18 words"), why: z.string().describe("one short clause with a verb: what the action trains") });
const PairChecklistSchema = z.object({ intro: z.string().describe("one sentence"), items: z.array(PairItem).min(3).max(3) });

export const PairPractiseSchema = z.object({
  opening: z.string().describe("one paragraph: what this pair is asking of each of them, plainly"),
  forA: PairChecklistSchema,
  forB: PairChecklistSchema,
  forBoth: PairChecklistSchema,
  closing: z.string().describe("80 to 100 words: the closing of the whole report, read upright and alone, no prediction"),
  claims: PairClaimsSchema,
});

export const PairLinkSchema = z.object({
  kind: z.enum(["flows", "rubs", "overlay"]),
  // Enums, not strings: given the list's "A Moon square B Jupiter", a free
  // string came back as "A Moon" and no card could ever match its aspect.
  planetA: z.enum([...BODIES, ""]).describe("the aspect's A body as a key, e.g. moon; empty for an overlay"),
  planetB: z.enum([...BODIES, ""]).describe("the aspect's B body as a key; empty for an overlay"),
  aspect: z.enum([...ASPECTS, ""]).describe("the aspect type; empty for an overlay"),
  orb: z.number().describe("the orb as listed; 0 for an overlay"),
  planet: z.enum([...BODIES, ""]).describe("an overlay's lead body as a key, e.g. sun; empty for an aspect"),
  of: z.enum(["A", "B", "none"]).describe("an overlay's owner; none for an aspect"),
  house: z.int().describe("an overlay's house; 0 for an aspect"),
  reading: z.string().describe("40 to 70 words, ending on a sentence that begins 'Behaviour check:'"),
});

export const PairLinksSchema = z.object({
  links: z.array(PairLinkSchema).min(1).max(24),
});

/** Every string leaf but the claims, as one text. */
export function proseText(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(proseText).join(" ");
  if (v && typeof v === "object") return Object.entries(v).filter(([k]) => k !== "claims").map(([, x]) => proseText(x)).join(" ");
  return "";
}

// ---------------------------------------------------------------------------
// Checks (ADR-81): a block only where the text would be wrong for the reader.
// ---------------------------------------------------------------------------

/** No number describes the pair (ADR-41): a percentage, a mark and a named score block; an ordinary rating word is logged (annex rows 18, 19). */
export function ratingChecks(text: string): Check[] {
  const checks: Check[] = [];
  if (/\d+\s?%/.test(text)) checks.push(block("chk-18", "a percentage describes the pair"));
  if (/\b\d+\s?(?:\/|out of)\s?(?:10|100|ten)\b/i.test(text)) checks.push(block("chk-18", "a mark out of ten describes the pair"));
  if (/\b(?:compatibility|match|harmony)\s+(?:score|rating|percentage)\b/i.test(text)) checks.push(block("chk-18", "a score names the pair"));
  const word = text.match(/\b(?:scores?|rated|rating)\b/i);
  if (word) {
    const beside = new RegExp(`\\d\\s*\\w*\\s*\\b${word[0]}\\b|\\b${word[0]}\\b\\s*\\w*\\s*\\d|\\b(?:the pair|you both|the two of you)\\b[^.]{0,20}\\b${word[0]}\\b`, "i");
    checks.push(beside.test(text) ? block("chk-19", `"${word[0]}" sits beside a digit or the pair`) : warned("chk-19", `the word "${word[0]}" describes something; ordinary English, logged`));
  }
  return checks;
}

/** Kept for the lab's fault rules and the scene call: the messages of every rating check. */
export function ratingProblems(text: string): string[] {
  return ratingChecks(text).map((c) => c.message);
}

const BODY_NAMES = Object.values(BODY_LABELS);
const BODY_ALT = BODY_NAMES.map((n) => n.replace(/\s/g, "\\s")).join("|");
/** Capitalised only: "the sun on the balcony" is weather (annex row 24). */
const CAPITALISED_BODY_RE = new RegExp(`(?<![\\p{L}])(?:${BODY_ALT})(?![\\p{L}])`, "u");
const BRACKETED_BODY_RE = new RegExp(`\\s?[\\[(][^\\])]*\\b(?:${BODY_ALT})\\b[^\\])]*[\\])]`, "gi");
const HARD_ASPECT_RE = /\b(?:trine|sextile)\b/i;
const SOFT_ASPECT_RE = /\b(?:square|opposition|conjunction)\b/i;
const BODY_NEAR_RE = new RegExp(`\\b(?:${BODY_ALT})\\b`, "i");

/** A bracketed body name is stripped from a text, so the quote match runs on what prints (annex row 20). */
export function stripBracketedBodies(text: string): { text: string; stripped: number } {
  let stripped = 0;
  const out = text.replace(BRACKETED_BODY_RE, () => { stripped += 1; return ""; }).replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1");
  return { text: out, stripped };
}

/** Every string leaf but the claims, bracketed bodies stripped, with how many were. */
export function stripBracketsDeep<T>(value: T): { value: T; stripped: number } {
  let stripped = 0;
  const walk = (v: unknown, key?: string): unknown => {
    if (key === "claims") return v;
    if (typeof v === "string") { const r = stripBracketedBodies(v); stripped += r.stripped; return r.text; }
    if (Array.isArray(v)) return v.map((x) => walk(x));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    return v;
  };
  return { value: walk(value) as T, stripped };
}

/** Evidence lives in claims only (ADR-60): trine and sextile are jargon and block; square, opposition and conjunction block beside a body name and are logged alone; orb blocks (annex rows 21, 22). */
export function evidenceChecks(text: string): Check[] {
  const checks: Check[] = [];
  const hard = text.match(HARD_ASPECT_RE);
  if (hard) checks.push(block("chk-21a", `the aspect name "${hard[0]}" sits in the prose; evidence lives in the claims field only`));
  const soft = text.match(SOFT_ASPECT_RE);
  if (soft) {
    const at = soft.index ?? 0;
    const around = text.slice(Math.max(0, at - 40), at + soft[0].length + 40);
    checks.push(BODY_NEAR_RE.test(around)
      ? block("chk-21b", `the aspect word "${soft[0]}" sits beside a body name in the prose`)
      : warned("chk-21b", `the word "${soft[0]}" sits in the prose; ordinary English, logged`));
  }
  if (/\borbs?\b/i.test(text)) checks.push(block("chk-22", "the word orb sits in the prose; evidence lives in the claims field only"));
  return checks;
}

/** Kept for the lab's fault rules and the scene call: the messages of every evidence check. */
export function evidenceProblems(text: string): string[] {
  return evidenceChecks(text).map((c) => c.message);
}

const words = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);
const first = (name: string): string => name.trim().split(/\s+/)[0];

const NOT_A_NAME = new Set([
  "I", "You", "Your", "Yours", "Both", "We", "Us", "Mum", "Dad", "Mom", "Nan", "Gran", "Grandma", "Grandad", "Grandpa", "God",
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
  "Christmas", "Easter", "Eid", "Diwali", "Hanukkah", "Ramadan", "New", "Year", "Halloween", "Thanksgiving",
  "Netflix", "Instagram", "Zoom", "Uber", "Ikea", "Amazon", "Google", "Spotify", "Whatsapp", "Facebook", "Tiktok", "Youtube",
  "English", "French", "Spanish", "German", "Italian", "Polish", "Sunday", "Monday", "Ok", "Okay",
]);

const SUBJECT_VERB_RE = /\b(?:you|he|she|they|we|it|both|i)\b\s+(?:(?:both|each|never|always|still|just|only|also|can|will|would|could|should|might|must|do|does|did|don't|won't)\s+)*[a-z']+/i;

/** A why has a verb: it says what the action trains (ADR-62, R-5.1). A pronoun subject followed by a word is a verb phrase, so "so you pause first" passes (annex row 28). */
export function hasVerb(clause: string): boolean {
  const tokens = clause.toLowerCase().match(/[a-z']+/g) ?? [];
  if (tokens.some((t) => VERBS.has(t) || (t.length > 3 && /(?:s|ing|ed)$/.test(t)))) return true;
  if (SUBJECT_VERB_RE.test(clause)) return true;
  return /\bto\s+[a-z]+/i.test(clause);
}

/** A capitalised word after the first, not opening a sentence or a quote, that is neither of the two first names: a third person or a stray. */
function strangerIn(line: string, names: { a: string; b: string }): { word: string; person: boolean } | undefined {
  // Every part of either name is theirs: "Curie" alone is still Marie.
  // A body name is row 24's, not a stranger.
  const allowed = new Set([...names.a.split(/\s+/), ...names.b.split(/\s+/), ...NOT_A_NAME, ...BODY_NAMES.flatMap((n) => n.split(" "))]);
  const tokens = line.split(/\s+/);
  for (let i = 1; i < tokens.length; i++) {
    const prev = tokens[i - 1];
    if (/[.!?:"“]$/.test(prev)) continue;
    const raw = tokens[i].replace(/^[("“']+|[)"”',.!?;:]+$/g, "");
    const word = raw.replace(/['’]s$/, "");
    if (/^\p{Lu}\p{Ll}+$/u.test(word) && !allowed.has(word)) {
      // A possessive, or a word that then acts, reads as a person; a place or a brand is logged.
      const next = (tokens[i + 1] ?? "").replace(/[^a-z']/gi, "").toLowerCase();
      const person = raw !== word || /^(?:and|with|tells|asks|calls|texts|rings|meets|sees|hugs)$/i.test(prev) || (next.length > 0 && hasVerb(next));
      return { word, person };
    }
  }
  return undefined;
}

const SMALL_NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

/** Small numbers are spelled out in code (annex row 26); a larger one stays and is logged, and a score is caught by row 18. */
export function spellSmallNumbers(line: string): { line: string; spelled: number; left: number } {
  let spelled = 0;
  let left = 0;
  const out = line.replace(/(?<![\d.,%])\b(\d+)\b(?![\d.,%]|\s?%|\s?(?:\/|out of))/g, (m) => {
    const n = Number(m);
    if (n <= 20) { spelled += 1; return SMALL_NUMBERS[n]; }
    left += 1;
    return m;
  });
  return { line: out, spelled, left };
}

/** The card line limit and its 20% buffer (annex row 23). */
export const CARD_LINE_WORDS = 12;
export const CARD_LINE_BUFFER = 15;

/** A card line: twelve words at most with a buffer to fifteen, naming only the two people, no capitalised body, no number (ADR-63; annex rows 23 to 26). */
export function cardLineChecks(line: string, names: { a: string; b: string }, tag: string): { line: string; checks: Check[] } {
  const checks: Check[] = [];
  const spelled = spellSmallNumbers(line);
  let out = spelled.line;
  if (spelled.spelled) checks.push(fixed("chk-26", `${tag}: ${spelled.spelled} small number(s) spelled out`));
  if (spelled.left) checks.push(warned("chk-26", `${tag}: carries a number`));
  const w = words(out);
  if (w > CARD_LINE_BUFFER) checks.push(block("chk-23", `${tag}: ${w} words, a card line takes ${CARD_LINE_WORDS} at most`));
  else if (w > CARD_LINE_WORDS) checks.push(buffered("chk-23", `${tag}: ${w} words, over the ${CARD_LINE_WORDS} the prompt asks and inside the buffer`));
  const body = out.match(CAPITALISED_BODY_RE);
  if (body) checks.push(block("chk-24", `${tag}: names ${body[0]}, and a card line names nothing but the two people`));
  const stranger = strangerIn(out, names);
  if (stranger) {
    checks.push(stranger.person
      ? block("chk-25", `${tag}: names "${stranger.word}", and a card line names nothing but the two people`)
      : warned("chk-25", `${tag}: carries the capitalised word "${stranger.word}"; not a person, logged`));
  }
  return { line: out, checks };
}

/** Kept for the lab's fault rules: the messages of every card line check. */
export function cardLineProblems(line: string, names: { a: string; b: string }, tag: string): string[] {
  return cardLineChecks(line, names, tag).checks.map((c) => c.message);
}

/** A name in running text, with letters on neither side: Zoë, José and Élodie match where \b never did (annex row 27). */
export function nameRegExp(name: string): RegExp {
  return new RegExp(`(?<![\\p{L}])${first(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "u");
}

/** A scene names both people (ADR-64); logged when it does not. */
export function sceneChecks(scene: string, names: { a: string; b: string }): Check[] {
  const checks: Check[] = [];
  for (const name of [names.a, names.b]) {
    if (!nameRegExp(name).test(scene)) checks.push(warned("chk-27", `the scene never names ${first(name)}`));
  }
  return checks;
}

/** Kept for the lab's fault rules and the scene call: the messages of every scene check. */
export function sceneProblems(scene: string, names: { a: string; b: string }): string[] {
  return sceneChecks(scene, names).map((c) => c.message);
}

const VERBS = new Set([
  "is", "are", "be", "do", "does", "has", "have", "can", "will", "would", "should", "must", "let", "go", "get", "keep", "make",
  "take", "give", "know", "see", "say", "tell", "ask", "want", "need", "find", "feel", "come", "put", "hold", "build", "run",
  "name", "notice", "choose", "leave", "move", "try", "turn", "train", "spend", "cost", "work", "stay", "stop", "start", "show",
  "read", "write", "meet", "set", "cut", "think", "learn", "hear", "lose", "win", "wait", "plan", "fix", "grow", "teach", "pause",
]);

export function whyChecks(items: Array<{ why: string }>, tag: string): Check[] {
  return items.flatMap((it, i) => (hasVerb(it.why) ? [] : [warned("chk-28", `${tag} ${i + 1}: the why "${it.why}" has no verb`)]));
}

export function whyProblems(items: Array<{ why: string }>, tag: string): string[] {
  return whyChecks(items, tag).map((c) => c.message);
}

/** What a band line may never say, per band: the doctrine table's own contradictions (ADR-67). */
export type BandDoctrine = Record<Band, { never: Array<[string, RegExp]> }>;

/** A band line that reads another age is logged, and the now-and-later rule in the prompt does the rest (annex row 29). */
export function bandChecks(text: string, band: Band | null, table: BandDoctrine): Check[] {
  if (!band) return [];
  return table[band].never.filter(([, re]) => re.test(text)).map(([why]) => warned("chk-29", `reads another age than the ${band} band: ${why}`));
}

export function bandProblems(text: string, band: Band | null, table: BandDoctrine): string[] {
  return bandChecks(text, band, table).map((c) => c.message);
}

/** A blind pair names no house: a numeral blocks, a word ordinal is logged (annex row 30). */
export function houseChecks(brief: PairBrief, text: string): Check[] {
  if (!brief.blind) return [];
  if (/\b\d+(?:st|nd|rd|th) house\b/i.test(text)) return [block("chk-30", "a house is named by numeral although a chart has no horizon")];
  if (/\b(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) house\b/i.test(text)) return [warned("chk-30", "a house is named in words although a chart has no horizon")];
  return [];
}

const names = (brief: PairBrief) => ({ a: brief.a.name, b: brief.b.name });

/** The lens chapter's checks: the card, the scene, the whys, evidence out of prose, no number, the claims reconciled in allocation. */
export function lensChapterChecks(out: PairLensChapterOutput, brief: PairBrief, chapterId?: string, table?: BandDoctrine): Validated<PairLensChapterOutput> {
  const checks: Check[] = [];
  const n = names(brief);
  const stripped = stripBracketsDeep(out);
  if (stripped.stripped) checks.push(fixed("chk-20", `${stripped.stripped} bracketed body name(s) stripped from the prose`));
  const output = stripped.value;
  const side = (lines: string[], who: string) => lines.map((l, i) => { const r = cardLineChecks(l, n, `card, ${who} line ${i + 1}`); checks.push(...r.checks); return r.line; });
  const pair = cardLineChecks(output.card.pair, n, "card, the pair line");
  checks.push(...pair.checks);
  output.card = { a: side(output.card.a, first(n.a)), b: side(output.card.b, first(n.b)), pair: pair.line };
  checks.push(...sceneChecks(output.scene, n));
  checks.push(...whyChecks(output.nextTime.items, "next time"));
  const text = proseText(output);
  checks.push(...evidenceChecks(text));
  checks.push(...houseChecks(brief, text));
  checks.push(...ratingChecks(text));
  if (table) checks.push(...bandChecks(text, brief.band, table));
  const claims = reconcilePairClaims(output, output.claims as PairClaim[], brief, chapterId);
  checks.push(...claims.checks);
  return { output: { ...output, claims: claims.claims }, checks };
}

/** Chapter 01's checks: the strengths card, evidence out of prose, no number, the claims reconciled in allocation. */
export function twoChartsChecks(out: PairTwoChartsOutput, brief: PairBrief, chapterId = "twoCharts"): Validated<PairTwoChartsOutput> {
  const checks: Check[] = [];
  const stripped = stripBracketsDeep(out);
  if (stripped.stripped) checks.push(fixed("chk-20", `${stripped.stripped} bracketed body name(s) stripped from the prose`));
  const output = stripped.value;
  output.strengths = output.strengths.map((l, i) => { const r = cardLineChecks(l, names(brief), `strengths line ${i + 1}`); checks.push(...r.checks); return r.line; });
  const text = proseText(output);
  checks.push(...evidenceChecks(text));
  checks.push(...houseChecks(brief, text));
  checks.push(...ratingChecks(text));
  const claims = reconcilePairClaims(output, output.claims as PairClaim[], brief, chapterId);
  checks.push(...claims.checks);
  return { output: { ...output, claims: claims.claims }, checks };
}

/** Age bands are now and later (ADR-83): the report is written for the child's age on the day, may look ahead, and never treats a later stage as present. */
export const NOW_AND_LATER_RULE = "NOW AND LATER. Describe situations of this age now. A later stage may be discussed, framed as later: what will change, what to expect, never as something happening today.";
/** Over 18, childhood is remembered, never described as present. */
export const GROWN_RULE = "The child is an adult. Nothing from childhood is described as present: no bedtime, homework, pocket money or curfew today. The focus is a young adult's life: moving out, work, money, partners, visits home. Childhood may be remembered, in the past tense only.";

/** The lens block appended to every section: the register, who is the parent, the band and the child's age on the day. */
export function lensContext(brief: PairBrief): string {
  const r = LENS_REGISTER[brief.lens];
  const lines = [
    `LENS: ${r.label}. Every example in this section comes from this register: ${r.examples.join(", ")}.`,
  ];
  if (brief.lens === "parent_child") {
    const parent = brief.parent === "B" ? brief.b.name : brief.a.name;
    const child = brief.parent === "B" ? brief.a.name : brief.b.name;
    lines.push(`${parent} is the parent and ${child} is the child. Read ${child}'s chart as potential, never a verdict, and address ${parent} as the one who adapts.`);
    if (brief.band) lines.push(`${child} is in the ${brief.band} band${brief.childAge !== null ? `, ${brief.childAge} years old on the day this is written` : ""}. Every scene, card line and "fair at this age" line is written for that age.`);
    lines.push(NOW_AND_LATER_RULE);
    if (brief.band === "grown") lines.push(GROWN_RULE);
  }
  if (brief.lens === "people" && brief.label) lines.push(`How they know each other, in their words: ${brief.label}. That answer picks which scene fits and a few words of register, nothing else.`);
  return lines.join("\n");
}

export interface LensChapterInput {
  lens: Lens;
  /** 2 to 6. */
  n: number;
  title: string;
  /** What the chapter is grounded in, appended to the lens doctrine and never written for the reader. */
  grounding: string;
  scenes: SceneSet;
  draws: readonly ReportSectionId[];
  instructions: string;
  /** Parent and child only: the band doctrine the validator checks lines against. */
  bandDoctrine?: BandDoctrine;
}

const LENS_KEY: Record<Lens, string> = { partners: "partners", parent_child: "parentChild", people: "people" };

export function lensChapterId(lens: Lens, n: number): string {
  return `${LENS_KEY[lens]}${String(n).padStart(2, "0")}`;
}

/** The instruction every lens chapter carries after its own: evidence in claims only, the shape, the register. */
export const LENS_CHAPTER_CONTRACT = `Citations live in the claims field only. A passage never writes a body, a sign, an aspect or an orb; the reader sees the evidence on the card, not in the sentence. The headline is one sentence in B's voice: plain, a little dry, a verdict. The side-by-side card takes three lines a side in that person's own words from their personal report and one line for the pair, twelve words a line, naming only the two people, no body, no number. The scene is the one the brief marks as chosen, written in four to six present-tense sentences with both names, and may hold a short quoted exchange; it invents no fact outside the brief. What just happened gives because A and because B, 25 to 40 words each, the need, fear or habit under that side in that report's words, each cited as a source claim. The pattern is 40 to 60 words, cited to one of this chapter's own links, and says whether this is where it flows or where it rubs. Next time gives two or three items, each for A, for B or for both, an action of 8 to 18 words and a why with a verb that says what it trains. 230 to 300 words across the headline, scene, what just happened and pattern; the card and the items sit outside that count. No score, no number, no research named on the page.`;

export function lensChapter(input: LensChapterInput): PairSectionSpec<typeof PairLensChapterSchema> {
  const id = lensChapterId(input.lens, input.n);
  return {
    key: `pair:${id}`,
    label: input.title,
    adminLabel: `${LENS_REGISTER[input.lens].label} · ${String(input.n).padStart(2, "0")} ${input.title}`,
    chapter: input.n,
    lens: input.lens,
    wordTarget: [230, 300],
    maxTokens: 4_000,
    schema: PairLensChapterSchema,
    scenes: input.scenes,
    draws: input.draws,
    instructions: `${input.instructions.trim()}\n\n${LENS_CHAPTER_CONTRACT}`,
    extraContext: (brief) => [lensContext(brief), "", `GROUNDING (doctrine, never written for the reader): ${input.grounding}`].join("\n"),
    validate: (out, brief) => lensChapterChecks(out, brief, id, input.bandDoctrine),
  };
}
