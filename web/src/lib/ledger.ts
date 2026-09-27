/**
 * Chapter 01's ledger (ADR-101), pure: each strong and work line beside the
 * cross link its claims cite, the glyph that link draws, and the lens chapter
 * whose claims cite the same link. No number, bar or score; a line whose
 * claims cite no cross aspect has no glyph, and a link no lens chapter cites
 * has no chip.
 */
import { PAIR_CHAPTER_TITLES } from "@/lib/lenses";
import { pairSectionIds } from "@/lib/progress";
import { lensChapterOf, type Claim, type Lens, type PairInterpretation, type PairTwoCharts } from "@/types/chart";

export interface LedgerLink {
  planetA: string;
  aspect: string;
  planetB: string;
}

export interface LedgerRow {
  text: string;
  link: LedgerLink | null;
  /** A strong line's link is a straight line, brass for a touch and teal for a flow; a work line's is the rose zigzag. */
  glyph: "flow" | "touch" | "rub" | null;
  chapter: { number: number; title: string } | null;
}

/** The id of that aspect's link card, so a glyph can scroll to it. */
export function linkAnchor(link: LedgerLink): string {
  return `link-${link.planetA}-${link.aspect}-${link.planetB}`;
}

/** As Citation matches a quote: quotes softened and whitespace collapsed on both sides. */
const soften = (s: string): string => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();

function crossAspectOf(claim: Claim): LedgerLink | null {
  for (const e of claim.evidence) {
    const r = e.ref;
    if (r.kind === "cross" && typeof r.planetA === "string" && typeof r.planetB === "string" && typeof r.aspect === "string") {
      return { planetA: r.planetA, aspect: r.aspect, planetB: r.planetB };
    }
  }
  return null;
}

/** The first cross aspect cited by a claim whose quote sits in the line. */
export function linkOf(text: string, claims: Claim[]): LedgerLink | null {
  const hay = soften(text);
  for (const claim of claims) {
    const needle = soften(claim.quote);
    if (!needle || !hay.includes(needle)) continue;
    const link = crossAspectOf(claim);
    if (link) return link;
  }
  return null;
}

const sameLink = (a: LedgerLink, b: LedgerLink): boolean => a.planetA === b.planetA && a.planetB === b.planetB && a.aspect === b.aspect;

/** Whether any of a chapter's claims cites this link. */
export function citesLink(claims: Claim[] | undefined, link: LedgerLink): boolean {
  return (claims ?? []).some((c) => c.evidence.some((e) => {
    const r = e.ref;
    return r.kind === "cross" && typeof r.planetA === "string" && sameLink({ planetA: r.planetA, aspect: String(r.aspect), planetB: String(r.planetB) }, link);
  }));
}

// MB-89 provisional: the chip's chapter is read from the lens chapters' claims, the lowest chapter first.
export function chapterOf(link: LedgerLink, interpretation: PairInterpretation, lens: Lens): LedgerRow["chapter"] {
  const ids = pairSectionIds(lens);
  const titles = PAIR_CHAPTER_TITLES(lens);
  for (const n of [2, 3, 4, 5, 6]) {
    const chapter = lensChapterOf(interpretation, ids[n - 1]);
    if (chapter && citesLink(chapter.claims, link)) return { number: n, title: titles[n - 1] };
  }
  return null;
}

export function ledgerRows(s: PairTwoCharts, interpretation: PairInterpretation, lens: Lens): { strong: LedgerRow[]; work: LedgerRow[] } {
  const row = (text: string, column: "strong" | "work"): LedgerRow => {
    const link = linkOf(text, s.claims);
    if (!link) return { text, link: null, glyph: null, chapter: null };
    const glyph = column === "work" ? "rub" : link.aspect === "conjunction" ? "touch" : "flow";
    return { text, link, glyph, chapter: chapterOf(link, interpretation, lens) };
  };
  return { strong: s.strong.map((t) => row(t, "strong")), work: s.work.map((t) => row(t, "work")) };
}
