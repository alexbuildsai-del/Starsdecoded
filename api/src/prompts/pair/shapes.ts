/**
 * The shapes every pair section is built from: the spec type, the p2 chapter
 * schemas, the lens chapter factory and the validators (ADR-63, ADR-69).
 * Sections import from here and the registry imports the sections, so
 * nothing is circular.
 */
import { z } from "zod/v4";
import type { Band, PairBrief } from "../../lib/pairBrief.js";
import { LENS_REGISTER, type Lens } from "../../lib/pairBrief.js";
import { PairClaimsSchema, validatePairClaims, type PairClaim } from "./evidence.js";
import { ASPECTS, BODIES, BODY_LABELS } from "../vocabulary.js";
import type { ReportSectionId } from "../index.js";

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
  validate?: (output: z.infer<T>, brief: PairBrief) => string[];
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** Chapter 01, Your two charts: the introduction under the wheel (ADR-63). */
export const PairTwoChartsSchema = z.object({
  headline: z.string().describe("the verdict headline: one sentence, the pair thesis, addressed to both"),
  strong: z.array(z.string().describe("one sentence, what is naturally strong between you, pointing at the chapter that shows it")).min(3).max(3),
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
// Validators
// ---------------------------------------------------------------------------

/** No number describes the pair (ADR-41): a percentage, a score, a mark out of ten, a rating word. */
export function ratingProblems(text: string): string[] {
  const problems: string[] = [];
  if (/\d+\s?%/.test(text)) problems.push("a percentage describes the pair");
  if (/\b\d+\s?(?:\/|out of)\s?(?:10|100|ten)\b/i.test(text)) problems.push("a mark out of ten describes the pair");
  if (/\b(?:compatibility|match|harmony)\s+(?:score|rating|percentage)\b/i.test(text)) problems.push("a score names the pair");
  if (/\b(?:scores?|rated|rating)\b/i.test(text)) problems.push("a rating word describes the pair");
  return problems;
}

const BODY_NAMES = Object.values(BODY_LABELS);
const BODY_RE = new RegExp(`\\b(?:${BODY_NAMES.map((n) => n.replace(/\s/g, "\\s")).join("|")})\\b`, "i");
const BRACKETED_BODY_RE = new RegExp(`[\\[(][^\\])]*\\b(?:${BODY_NAMES.map((n) => n.replace(/\s/g, "\\s")).join("|")})\\b[^\\])]*[\\])]`, "i");
const ASPECT_RE = new RegExp(`\\b(?:${ASPECTS.join("|")})\\b`, "i");

/** Evidence lives in claims only (ADR-60): a passage never writes a bracketed body, an aspect name or an orb. */
export function evidenceProblems(text: string): string[] {
  const problems: string[] = [];
  if (BRACKETED_BODY_RE.test(text)) problems.push("a bracketed body name sits in the prose; evidence lives in the claims field only");
  const aspect = text.match(ASPECT_RE);
  if (aspect) problems.push(`the aspect name "${aspect[0]}" sits in the prose; evidence lives in the claims field only`);
  if (/\borbs?\b/i.test(text)) problems.push("the word orb sits in the prose; evidence lives in the claims field only");
  return problems;
}

const words = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);
const first = (name: string): string => name.trim().split(/\s+/)[0];

const NOT_A_NAME = new Set([
  "I", "You", "Your", "Yours", "Both", "We", "Us", "Mum", "Dad", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "Christmas",
]);

/** A capitalised word after the first, not opening a sentence or a quote, that is neither of the two first names: a third person. */
function strangerIn(line: string, names: { a: string; b: string }): string | undefined {
  const allowed = new Set([first(names.a), first(names.b), ...NOT_A_NAME]);
  const tokens = line.split(/\s+/);
  for (let i = 1; i < tokens.length; i++) {
    const prev = tokens[i - 1];
    if (/[.!?:"“]$/.test(prev)) continue;
    const word = tokens[i].replace(/^[("“']+|[)"”',.!?;:]+$/g, "");
    if (/^[A-Z][a-z]+$/.test(word) && !allowed.has(word) && !allowed.has(word.replace(/'s$/, ""))) return word;
  }
  return undefined;
}

/** A card line: twelve words at most, naming only the two people, no body, no number (ADR-63). */
export function cardLineProblems(line: string, names: { a: string; b: string }, tag: string): string[] {
  const problems: string[] = [];
  const w = words(line);
  if (w > 12) problems.push(`${tag}: ${w} words, a card line takes twelve at most`);
  const body = line.match(BODY_RE);
  if (body) problems.push(`${tag}: names ${body[0]}, and a card line names nothing but the two people`);
  const stranger = strangerIn(line, names);
  if (stranger) problems.push(`${tag}: names "${stranger}", and a card line names nothing but the two people`);
  if (/\d/.test(line)) problems.push(`${tag}: carries a number`);
  return problems;
}

/** A scene names both people (ADR-64). */
export function sceneProblems(scene: string, names: { a: string; b: string }): string[] {
  const problems: string[] = [];
  for (const name of [names.a, names.b]) {
    if (!new RegExp(`\\b${first(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(scene)) problems.push(`the scene never names ${first(name)}`);
  }
  return problems;
}

const VERBS = new Set([
  "is", "are", "be", "do", "does", "has", "have", "can", "will", "would", "should", "must", "let", "go", "get", "keep", "make",
  "take", "give", "know", "see", "say", "tell", "ask", "want", "need", "find", "feel", "come", "put", "hold", "build", "run",
  "name", "notice", "choose", "leave", "move", "try", "turn", "train", "spend", "cost", "work", "stay", "stop", "start", "show",
  "read", "write", "meet", "set", "cut", "think", "learn", "hear", "lose", "win", "wait", "plan", "fix", "grow", "teach",
]);

/** A why has a verb: it says what the action trains (ADR-62, R-5.1). */
export function hasVerb(clause: string): boolean {
  const tokens = clause.toLowerCase().match(/[a-z']+/g) ?? [];
  return tokens.some((t) => VERBS.has(t) || (t.length > 3 && /(?:s|ing|ed)$/.test(t)));
}

export function whyProblems(items: Array<{ why: string }>, tag: string): string[] {
  return items.flatMap((it, i) => (hasVerb(it.why) ? [] : [`${tag} ${i + 1}: the why "${it.why}" has no verb`]));
}

/** What a band line may never say, per band: the doctrine table's own contradictions (ADR-67). */
export type BandDoctrine = Record<Band, { never: Array<[string, RegExp]> }>;

/** A band line never contradicts the doctrine table: the forbidden lines for the band in force. */
export function bandProblems(text: string, band: Band | null, table: BandDoctrine): string[] {
  if (!band) return [];
  return table[band].never.filter(([, re]) => re.test(text)).map(([why]) => `contradicts the ${band} band: ${why}`);
}

function houseProblems(brief: PairBrief, text: string): string[] {
  return brief.blind && /\b(\d+(st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) house\b/i.test(text)
    ? ["a house is named although a chart has no horizon"]
    : [];
}

const names = (brief: PairBrief) => ({ a: brief.a.name, b: brief.b.name });

/** The lens chapter's checks: the card, the scene, the whys, evidence out of prose, no number, the claims in allocation. */
export function lensChapterProblems(out: PairLensChapterOutput, brief: PairBrief, chapterId?: string, table?: BandDoctrine): string[] {
  const problems: string[] = [];
  const n = names(brief);
  out.card.a.forEach((l, i) => problems.push(...cardLineProblems(l, n, `card, ${first(n.a)} line ${i + 1}`)));
  out.card.b.forEach((l, i) => problems.push(...cardLineProblems(l, n, `card, ${first(n.b)} line ${i + 1}`)));
  problems.push(...cardLineProblems(out.card.pair, n, "card, the pair line"));
  problems.push(...sceneProblems(out.scene, n));
  problems.push(...whyProblems(out.nextTime.items, "next time"));
  const text = proseText(out);
  problems.push(...evidenceProblems(text));
  problems.push(...houseProblems(brief, text));
  problems.push(...ratingProblems(text));
  if (table) problems.push(...bandProblems(text, brief.band, table));
  problems.push(...validatePairClaims(out, out.claims as PairClaim[], brief, chapterId));
  return problems;
}

/** Chapter 01's checks: the strengths card, evidence out of prose, no number, the claims in allocation. */
export function twoChartsProblems(out: PairTwoChartsOutput, brief: PairBrief, chapterId = "twoCharts"): string[] {
  const problems: string[] = [];
  out.strengths.forEach((l, i) => problems.push(...cardLineProblems(l, names(brief), `strengths line ${i + 1}`)));
  const text = proseText(out);
  problems.push(...evidenceProblems(text));
  problems.push(...houseProblems(brief, text));
  problems.push(...ratingProblems(text));
  problems.push(...validatePairClaims(out, out.claims as PairClaim[], brief, chapterId));
  return problems;
}

/** The lens block appended to every section: the register, who is the parent, the band. */
export function lensContext(brief: PairBrief): string {
  const r = LENS_REGISTER[brief.lens];
  const lines = [
    `LENS: ${r.label}. Every example in this section comes from this register: ${r.examples.join(", ")}.`,
  ];
  if (brief.lens === "parent_child") {
    const parent = brief.parent === "B" ? brief.b.name : brief.a.name;
    const child = brief.parent === "B" ? brief.a.name : brief.b.name;
    lines.push(`${parent} is the parent and ${child} is the child. Read ${child}'s chart as potential, never a verdict, and address ${parent} as the one who adapts.`);
    if (brief.band) lines.push(`${child} is in the ${brief.band} band. Every scene, card line and "fair at this age" line is written for that age.`);
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
    validate: (out, brief) => lensChapterProblems(out, brief, id, input.bandDoctrine),
  };
}
