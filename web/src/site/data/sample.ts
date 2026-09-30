/**
 * The public sample, whole (ADR-119): the stored run's text, her chart
 * computed from her birth record, and the order a reader meets the run's
 * claims. Every page that shows the sample reads it here, so another run can
 * take the slot in one edit.
 */
import type { ChartData, Claim, Interpretation } from "@/types/chart";
import { CHAPTERS, type ChapterSection } from "@/lib/chapters";
import { plainProse } from "@/lib/plain-prose";
import { chartOf, type Birth } from "@/site/lib/chart";
import fixture from "../../../../fixtures/charts/audrey-hepburn.json";
// MB-101 provisional: the run is committed, r06's interpretation byte for byte without its foundation or usage, so the site needs no database or key.
import run from "./sample/audrey-hepburn.r06.json";

export interface Sample {
  name: string;
  birth: Birth;
  /** Where she was born, as the fixture's note records it. */
  place: string;
  /** Where the birth time comes from, for the fine print (reading 4). */
  source: string;
  run: Interpretation;
  generatedAt: string;
}

// MB-90 provisional: her name waits on a legal check; if it fails, Marie Curie's fixture and run take these imports and this object.
export const SAMPLE: Sample = {
  name: fixture.name,
  birth: {
    birthDate: fixture.birthDate,
    birthTime: fixture.birthTime,
    latitude: fixture.latitude,
    longitude: fixture.longitude,
    timezone: fixture.timezone,
    timezoneOffset: fixture.timezoneOffset,
  },
  place: "Ixelles, Brussels",
  source: "Astro-Databank, Rodden AA",
  run: run as Interpretation,
  generatedAt: run.meta.generatedAt,
};

let chart: ChartData | undefined;

/** Computed on the first call rather than at import, so only a page that draws her chart pays for the engine run. */
export function sampleChart(): ChartData {
  chart ??= chartOf(SAMPLE.birth);
  return chart;
}

export type ClaimSection =
  | "overview" | "triad" | "mind" | "career" | "money"
  | "relationships" | "family" | "superpowers" | "discoveries" | "focus";

/** Chapter 2 prints the triad on its cards, and its house readings carry no claims of their own, so its marks are the triad's. */
const CLAIMS_OF: Record<ChapterSection, ClaimSection> = {
  overview: "overview",
  houses: "triad",
  mind: "mind",
  career: "career",
  money: "money",
  relationships: "relationships",
  family: "family",
  superpowers: "superpowers",
  discoveries: "discoveries",
  focus: "focus",
};

export interface ReadingClaim {
  /** The mark's number, counted from 1 in each chapter, as the report numbers its marks. */
  n: number;
  section: ClaimSection;
  /** 1 to 10, the chapter's place in `CHAPTERS`. */
  chapter: number;
  /** "section.index" in the stored run: the claim's own address, which `HOME_CLAIMS` uses. */
  id: string;
  claim: Claim;
}

const actionTexts = (items: readonly { action: string; why: string }[]) => items.flatMap((a) => [a.action, a.why]);
const listTexts = (items: readonly { item: string; reason: string }[]) => items.flatMap((l) => [l.item, l.reason]);

/**
 * A chapter's prose in the order /sample prints it, the locked artifact's
 * chapter bodies: /sample marks claims in every field, where the report page
 * leaves its rails and checklists unmarked, so all of the run's claims find
 * their sentence. Headings and titles carry no claims and are left out. The
 * page renders its blocks in this order, or the numbers stop running in
 * reading order.
 */
export function chapterTexts(chapter: ChapterSection, source: Interpretation = SAMPLE.run): string[] {
  switch (chapter) {
    case "overview": {
      const s = source.overview;
      return s ? [s.headline, s.concentration, s.temperament, s.distinctive, s.bridge] : [];
    }
    case "houses": {
      const s = source.triad;
      const triad = s ? [s.sun.text, s.moon.text, ...(s.rising ? [s.rising.text] : [])] : [];
      return [...triad, ...(source.houses?.houses.map((h) => h.reading) ?? [])];
    }
    case "mind": {
      const s = source.mind;
      return s ? [s.howYouThink, s.howYouDecide, s.howYouAreUnderstood, s.practice] : [];
    }
    case "career": {
      const s = source.career;
      return s ? [s.vocationalPull, s.howYouShowUp, s.growthThroughWork, ...actionTexts(s.actions), ...listTexts(s.careerPaths)] : [];
    }
    case "money": {
      const s = source.money;
      return s ? [s.relationshipToResources, s.whatWorks, s.sharedAndExposed, ...actionTexts(s.actions)] : [];
    }
    case "relationships": {
      const s = source.relationships;
      return s ? [s.howYouLove, s.theChallenge, s.whatPartnershipAsks, ...actionTexts(s.actions), ...listTexts(s.connectBestWith)] : [];
    }
    case "family": {
      const s = source.family;
      return s ? [s.whatYouCarry, s.whatRootsYou, s.theInheritedEdge, ...actionTexts(s.actions)] : [];
    }
    case "superpowers": {
      const s = source.superpowers;
      return s ? [s.superpower, s.chronicPattern, s.growingEdge].flatMap((i) => [i.text, ...actionTexts(i.actions)]) : [];
    }
    case "discoveries": {
      const s = source.discoveries;
      return s ? [s.opening, ...s.paradoxes.flatMap((p) => [p.tension, p.invitation])] : [];
    }
    case "focus": {
      const s = source.focus;
      return s
        ? [...[s.leanInto, s.notice, s.practice].flatMap((g) => [g.intro, ...g.bullets.flatMap((b) => [b.point, b.why])]), s.closing]
        : [];
    }
  }
}

/** Length-preserving, as the report page's Citation softens both sides, so a quote the API validated is found here too. */
const soften = (s: string): string => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-");
const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();

/** A text as the page prints it (ADR-104), one entry per paragraph, since a quote never spans two. */
export function printedParagraphs(text: string): string[] {
  return plainProse(text).split(/\n{2,}/).map((p) => soften(collapse(p))).filter(Boolean);
}

export function quoteNeedle(claim: Claim): string {
  return soften(collapse(claim.quote));
}

/**
 * Each claim at its first sentence in reading order, as Citation marks it:
 * hits in a paragraph taken left to right, one inside another skipped, and a
 * claim marked once in its chapter.
 */
function readingOrder(source: Interpretation): ReadingClaim[] {
  const out: ReadingClaim[] = [];
  CHAPTERS.forEach((c, i) => {
    const section = CLAIMS_OF[c.section];
    const claims = source[section]?.claims ?? [];
    const needles = claims.map(quoteNeedle);
    const marked = new Set<number>();
    let n = 0;
    for (const text of chapterTexts(c.section, source)) {
      for (const hay of printedParagraphs(text)) {
        const hits: { start: number; end: number; k: number }[] = [];
        needles.forEach((needle, k) => {
          if (!needle || marked.has(k)) return;
          const start = hay.indexOf(needle);
          if (start >= 0) hits.push({ start, end: start + needle.length, k });
        });
        hits.sort((a, b) => a.start - b.start);
        let cursor = 0;
        for (const hit of hits) {
          if (hit.start < cursor) continue;
          marked.add(hit.k);
          out.push({ n: ++n, section, chapter: i + 1, id: `${section}.${hit.k}`, claim: claims[hit.k] });
          cursor = hit.end;
        }
      }
    }
  });
  return out;
}

let order: ReadingClaim[] | undefined;

/** A fresh array on every call, so a caller that sorts or filters it cannot reorder the next caller's. */
export function claimsInReadingOrder(): ReadingClaim[] {
  order ??= readingOrder(SAMPLE.run);
  return [...order];
}

export function claimById(id: string): ReadingClaim | undefined {
  return claimsInReadingOrder().find((c) => c.id === id);
}
