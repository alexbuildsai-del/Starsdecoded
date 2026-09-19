/**
 * The shapes every pair section is built from: the spec type, the shared
 * schemas, the chapter factory and the validators. Sections import from here
 * and the registry imports the sections, so nothing is circular.
 */
import { z } from "zod/v4";
import type { PairBrief } from "../../lib/pairBrief.js";
import { LENS_REGISTER, type Lens } from "../../lib/pairBrief.js";
import { PairClaimsSchema, validatePairClaims, type PairClaim } from "./evidence.js";

export interface PairSectionSpec<T extends z.ZodType = z.ZodType> {
  /** Prompt key, e.g. "pair:howYouMeet". `:system` and `:user` rows derive from it. */
  key: string;
  label: string;
  adminLabel: string;
  /** Chapter number on the page, 0 for the foundation and the link cards. */
  chapter: number;
  wordTarget: [number, number];
  maxTokens: number;
  schema: T;
  instructions: string;
  /** The lens sets the title of chapters 07 and 08 (ADR-40). */
  lensTitles?: Record<Lens, string>;
  extraContext?: (brief: PairBrief) => string;
  validate?: (output: z.infer<T>, brief: PairBrief) => string[];
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export const PairPassageSchema = z.object({
  text: z.string().describe("one paragraph of prose"),
  source: z.enum(["natal", "new"]).describe("natal: read from one of the two stored reports; new: written for the pair from cross-chart evidence"),
  of: z.enum(["A", "B", "both"]).describe("whose report a natal passage reads from; both for a new passage about the pair"),
});

export const PairChapterSchema = z.object({
  headline: z.string().describe("one sentence: what this chapter is built around, addressed to both"),
  passages: z.array(PairPassageSchema).min(2).max(6),
  claims: PairClaimsSchema,
});
export type PairChapterOutput = z.infer<typeof PairChapterSchema>;

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
  planetA: z.string().describe("the aspect's A body, exactly as the brief names it; empty for an overlay"),
  planetB: z.string().describe("the aspect's B body; empty for an overlay"),
  aspect: z.string().describe("the aspect type; empty for an overlay"),
  orb: z.number().describe("the orb as listed; 0 for an overlay"),
  planet: z.string().describe("an overlay's body; empty for an aspect"),
  of: z.enum(["A", "B", "none"]).describe("an overlay's owner; none for an aspect"),
  house: z.int().describe("an overlay's house; 0 for an aspect"),
  reading: z.string().describe("40 to 70 words, ending on a sentence that begins 'Behaviour check:'"),
});

export const PairLinksSchema = z.object({
  links: z.array(PairLinkSchema).min(1).max(16),
});

/** Every string leaf but the claims, as one text. */
export function proseText(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(proseText).join(" ");
  if (v && typeof v === "object") return Object.entries(v).filter(([k]) => k !== "claims").map(([, x]) => proseText(x)).join(" ");
  return "";
}

/** No number describes the pair (ADR-41): a percentage, a score, a mark out of ten, a rating word. */
export function ratingProblems(text: string): string[] {
  const problems: string[] = [];
  if (/\d+\s?%/.test(text)) problems.push("a percentage describes the pair");
  if (/\b\d+\s?(?:\/|out of)\s?(?:10|100|ten)\b/i.test(text)) problems.push("a mark out of ten describes the pair");
  if (/\b(?:compatibility|match|harmony)\s+(?:score|rating|percentage)\b/i.test(text)) problems.push("a score names the pair");
  if (/\b(?:scores?|rated|rating)\b/i.test(text)) problems.push("a rating word describes the pair");
  return problems;
}

function chapterProblems(out: PairChapterOutput, brief: PairBrief): string[] {
  const problems: string[] = [];
  out.passages.forEach((p, i) => {
    if (p.source === "natal" && p.of === "both") problems.push(`passage ${i + 1}: a natal passage reads from A or B, never both`);
    if (!p.text.trim()) problems.push(`passage ${i + 1}: empty`);
  });
  if (brief.blind && /\b(\d+(st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) house\b/i.test(proseText(out))) {
    problems.push("a house is named although a chart has no horizon");
  }
  problems.push(...ratingProblems(proseText(out)));
  problems.push(...validatePairClaims(out, out.claims as PairClaim[], brief));
  return problems;
}

/** The lens block appended to every section: the register, and who is the parent. */
export function lensContext(brief: PairBrief): string {
  const r = LENS_REGISTER[brief.lens];
  const lines = [
    `LENS: ${r.label}. Every example in this section comes from this register: ${r.examples.join(", ")}.`,
  ];
  if (brief.lens === "parent_child") {
    const parent = brief.parent === "B" ? brief.b.name : brief.a.name;
    const child = brief.parent === "B" ? brief.a.name : brief.b.name;
    lines.push(`${parent} is the parent and ${child} is the child. Read ${child}'s chart as potential, never a verdict, and address ${parent} as the one who adapts.`);
  }
  return lines.join("\n");
}

interface ChapterInput {
  id: string;
  label: string;
  chapter: number;
  wordTarget: [number, number];
  instructions: string;
  lensTitles?: Record<Lens, string>;
}

export function chapter(input: ChapterInput): PairSectionSpec<typeof PairChapterSchema> {
  return {
    key: `pair:${input.id}`,
    label: input.label,
    adminLabel: input.label,
    chapter: input.chapter,
    wordTarget: input.wordTarget,
    maxTokens: 3_500,
    schema: PairChapterSchema,
    instructions: input.instructions,
    lensTitles: input.lensTitles,
    extraContext: lensContext,
    validate: chapterProblems,
  };
}

