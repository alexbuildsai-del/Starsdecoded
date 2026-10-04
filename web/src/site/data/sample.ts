/**
 * The public sample (ADR-119, ADR-178): the stored run's text, her chart
 * computed from her birth record, the four chapters /sample prints whole, and
 * the order a reader meets the claims it prints. Every page that shows the
 * sample reads it here, so another run can take the slot in one edit.
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

export const CLAIM_SECTIONS = [
  "overview", "triad", "mind", "career", "money", "relationships", "family", "superpowers", "discoveries", "focus",
] as const;

export type ClaimSection = (typeof CLAIM_SECTIONS)[number];

/** The chapters /sample prints whole (ADR-178); each of the other six shows one line and opens to its first paragraph. */
export const OPEN_CHAPTERS = ["overview", "houses", "superpowers", "discoveries"] as const satisfies readonly ChapterSection[];

export type OpenChapter = (typeof OPEN_CHAPTERS)[number];
export type DimmedChapter = Exclude<ChapterSection, OpenChapter>;

export function isOpenChapter(section: ChapterSection): section is OpenChapter {
  return (OPEN_CHAPTERS as readonly ChapterSection[]).includes(section);
}

/** Where a dimmed chapter is read whole, in the approved artifact's words. */
export const DIMMED_STATUS = "In your report";

/** What a dimmed chapter holds, in the approved artifact's words. */
export const DIMMED_LINES: Record<DimmedChapter, string> = {
  mind: "How you think, learn and talk things through",
  career: "The work that fits you and what it asks of you",
  money: "What makes you feel secure, and how you spend",
  relationships: "What you need from a partner and what you give",
  family: "Home, your parents and where you come from",
  focus: "Do more of, Watch for, Try next: the things to try",
};

/** The run's section whose claims a chapter marks. Chapter 2 prints its house readings alone, which carry none (reading 9). */
export const CLAIMS_OF: Record<ChapterSection, ClaimSection | null> = {
  overview: "overview",
  houses: null,
  mind: "mind",
  career: "career",
  money: "money",
  relationships: "relationships",
  family: "family",
  superpowers: "superpowers",
  discoveries: "discoveries",
  focus: "focus",
};

/** A claim of her reading, at its address in the stored run. */
export interface ReadingClaim {
  /** "section.index" in the stored run: the claim's own address, which `HOME_CLAIMS` uses. */
  id: string;
  section: ClaimSection;
  claim: Claim;
}

/** A claim /sample prints, with the number its mark shows. */
export interface MarkedClaim extends ReadingClaim {
  /** Counted from 1 in each chapter, as the report numbers its marks. */
  n: number;
  /** 1 to 10, the chapter's place in `CHAPTERS`. */
  chapter: number;
}

const actionTexts = (items: readonly { action: string; why: string }[]) => items.flatMap((a) => [a.action, a.why]);
const listTexts = (items: readonly { item: string; reason: string }[]) => items.flatMap((l) => [l.item, l.reason]);

/**
 * A chapter's prose in the order its blocks print, every field of it, lists
 * included, so a claim is found wherever the run put it. Chapter 2 is its
 * house readings alone, since the triad is still written but no page prints
 * it (reading 9). Headings and titles carry no claims and are left out.
 */
export function chapterTexts(chapter: ChapterSection, source: Interpretation = SAMPLE.run): string[] {
  switch (chapter) {
    case "overview": {
      const s = source.overview;
      return s ? [s.headline, s.concentration, s.temperament, s.distinctive, s.bridge] : [];
    }
    case "houses":
      return source.houses?.houses.map((h) => h.reading) ?? [];
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
 * What /sample prints of a chapter (ADR-178): an open chapter whole, a dimmed
 * one the first paragraph of its first block, whitespace collapsed as the page
 * shows it.
 */
export function sampleTexts(chapter: ChapterSection, source: Interpretation = SAMPLE.run): string[] {
  const texts = chapterTexts(chapter, source);
  if (isOpenChapter(chapter)) return texts;
  const first = texts.length ? plainProse(texts[0]).split(/\n{2,}/).map(collapse).find(Boolean) : undefined;
  return first ? [first] : [];
}

/**
 * Each claim at its first sentence in /sample's reading order, as Citation
 * marks it: hits in a paragraph taken left to right, one inside another
 * skipped, and a claim marked once in its chapter.
 */
function readingOrder(source: Interpretation): MarkedClaim[] {
  const out: MarkedClaim[] = [];
  CHAPTERS.forEach((c, i) => {
    const section = CLAIMS_OF[c.section];
    if (!section) return;
    const claims = source[section]?.claims ?? [];
    const needles = claims.map(quoteNeedle);
    const marked = new Set<number>();
    let n = 0;
    for (const text of sampleTexts(c.section, source)) {
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

let order: MarkedClaim[] | undefined;

/** The claims /sample prints, in reading order: a fresh array on every call, so a caller that sorts it cannot reorder the next one's. */
export function markedClaims(): MarkedClaim[] {
  order ??= readingOrder(SAMPLE.run);
  return [...order];
}

/** By its address in the stored run, printed on /sample or not: home cites a triad claim, which no page prints now (reading 9). */
export function claimById(id: string): ReadingClaim | undefined {
  const [section, index, ...rest] = id.split(".");
  if (rest.length || !/^\d+$/.test(index ?? "") || !(CLAIM_SECTIONS as readonly string[]).includes(section)) return undefined;
  const claim = SAMPLE.run[section as ClaimSection]?.claims[Number(index)];
  return claim ? { id, section: section as ClaimSection, claim } : undefined;
}
