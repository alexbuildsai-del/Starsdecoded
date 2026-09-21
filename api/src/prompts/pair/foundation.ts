import { z } from "zod/v4";
import type { PairBrief } from "../../lib/pairBrief.js";
import type { PairSectionSpec } from "./shapes.js";
import { cardLineProblems, lensContext, ratingProblems, proseText } from "./shapes.js";

/** The lens chapters are 2 to 6; chapter 1 is the two charts and 7 the practice. */
export const LENS_CHAPTERS = [2, 3, 4, 5, 6] as const;
/** At most this many chapters own one link (ADR-66). */
export const OWNERS_PER_LINK = 2;

export const PairFoundationSchema = z.object({
  pairThesis: z.string().describe("2-3 sentences: the central story of how these two meet, in behaviour"),
  strongestLinks: z.array(z.object({
    link: z.int().describe("the link's number in the brief's LINKS list, e.g. 3 for L3"),
    why: z.string().describe("one sentence: what it does between them, on an ordinary day"),
  })).min(3).max(3),
  frictionThatMatters: z.string().describe("2-3 sentences: the one friction the report must be honest about, framed as what it trains"),
  strengths: z.array(z.string().describe("a card line, at most twelve words, naming only the two people")).min(3).max(3)
    .describe("the pair's three strengths, as chapter 01's card will carry them"),
  owners: z.array(z.object({
    link: z.int().describe("the link's number in the LINKS list"),
    chapters: z.array(z.int()).min(1).max(2).describe("the chapter numbers, 1 to 6, that may cite this link; at most two"),
  })).describe("every link in the LINKS list, once, with the chapters it belongs to"),
  scenes: z.array(z.object({
    chapter: z.int().describe("a lens chapter, 2 to 6"),
    index: z.int().describe("which of that chapter's three listed scenes fits this pair: 0, 1 or 2"),
  })).min(5).max(5).describe("one entry per lens chapter, 2 to 6"),
  guidance: z.array(z.string()).min(7).max(7).describe("one sentence per chapter, 1 to 7 in order: the single thing it must establish"),
});
export type PairFoundationOutput = z.infer<typeof PairFoundationSchema>;

/** The chapters as the foundation numbers them, and the link keys it gave each one. */
export function allocationOf(out: PairFoundationOutput, brief: PairBrief, chapterIdOf: (n: number) => string | undefined): Record<string, string[]> {
  const allocation: Record<string, string[]> = {};
  for (const o of out.owners) {
    const link = brief.links[o.link - 1];
    if (!link) continue;
    for (const n of o.chapters) {
      // Chapter 07 collects the others' items and cites freely, so a link given to it binds nothing.
      if (n > 6) continue;
      const id = chapterIdOf(n);
      if (!id) continue;
      (allocation[id] ??= []).push(link.key);
    }
  }
  return allocation;
}

export function foundationProblems(out: PairFoundationOutput, brief: PairBrief): string[] {
  const problems = ratingProblems(proseText(out));
  const n = brief.links.length;
  const inRange = (i: number) => i >= 1 && i <= n;
  out.strongestLinks.forEach((s, i) => { if (!inRange(s.link)) problems.push(`strongest link ${i + 1}: L${s.link} is not in the LINKS list (1 to ${n})`); });
  out.strengths.forEach((l, i) => problems.push(...cardLineProblems(l, { a: brief.a.name, b: brief.b.name }, `strength ${i + 1}`)));

  const seen = new Set<number>();
  const perChapter = new Map<number, number>();
  for (const o of out.owners) {
    if (!inRange(o.link)) { problems.push(`owners: L${o.link} is not in the LINKS list (1 to ${n})`); continue; }
    if (seen.has(o.link)) problems.push(`owners: L${o.link} is listed twice; list every link once`);
    seen.add(o.link);
    if (o.chapters.length > OWNERS_PER_LINK) problems.push(`owners: L${o.link} is given to ${o.chapters.length} chapters; two at most`);
    for (const c of o.chapters) {
      if (c < 1 || c > 7) { problems.push(`owners: L${o.link} names chapter ${c}; chapters run 1 to 7`); continue; }
      // A link given to chapter 07 is tolerated and counts for nothing: the first staging run failed three times on it (R06 lab).
      if (c === 7) continue;
      perChapter.set(c, (perChapter.get(c) ?? 0) + 1);
    }
  }
  for (let i = 1; i <= n; i++) if (!seen.has(i)) problems.push(`owners: L${i} is missing; every link is given to one or two chapters`);
  // Every chapter needs a link for its pattern, and chapter 01 three for its strong lines, when the list allows it.
  if (n * OWNERS_PER_LINK >= 8) {
    for (let c = 1; c <= 6; c++) {
      const need = c === 1 ? 3 : 1;
      if ((perChapter.get(c) ?? 0) < need) problems.push(`owners: chapter ${c} owns ${perChapter.get(c) ?? 0} link(s); it needs at least ${need}`);
    }
  }

  const chapters = out.scenes.map((s) => s.chapter);
  for (const c of LENS_CHAPTERS) if (!chapters.includes(c)) problems.push(`scenes: chapter ${c} has no chosen scene`);
  out.scenes.forEach((s) => { if (s.index < 0 || s.index > 2) problems.push(`scenes: chapter ${s.chapter} picks scene ${s.index}; the three are 0, 1 and 2`); });
  return problems;
}

export const pairFoundation: PairSectionSpec<typeof PairFoundationSchema> = {
  key: "pair:foundation",
  label: "Pair foundation",
  adminLabel: "Pair foundation (internal)",
  chapter: 0,
  wordTarget: [0, 0],
  maxTokens: 5_000,
  schema: PairFoundationSchema,
  extraContext: lensContext,
  validate: foundationProblems,
  instructions: `Build the internal foundation for this compatibility report. This is an editorial handoff, not reader-facing prose. Read both theses, then the links tight to wide, then each side's connectBestWith against the other's chart. Decide the few patterns that should organise the whole report so that every chapter is specific and none repeat.

Name the three strongest links by their number in the LINKS list, with one sentence each on what they do between these two people on an ordinary day from the lens register. Name the one friction that matters and what it trains. Write the pair's three strengths as card lines: twelve words at most, naming only the two people, no body, no number.

Give every link to one or two of chapters 1 to 6 (owners): chapter 1 is Your two charts and needs at least three links for its strong lines; chapters 2 to 6 are the lens chapters listed under CHAPTERS and each needs at least one link for its pattern. Chapter 7 collects the others' items and owns no link. A link given to two chapters is read from two angles; a link given to none is wasted. Then pick, for each lens chapter, which of its three listed scenes fits this pair best (0, 1 or 2). Give each of the seven chapters one distinct thing to establish, in order. No score, rating or number describes the pair. The style contract does not apply to this internal output, but keep it evidence-based and free of generic labels.`,
};
