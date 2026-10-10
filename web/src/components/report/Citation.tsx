/**
 * A claim is marked where the model actually wrote it and carries a numbered
 * superscript; the evidence lives in a card, not in a block reprinted under
 * the paragraph the reader just finished (ADR-18).
 */
import { Fragment, type ReactNode } from "react";
import type { Claim } from "@/types/chart";
import { ClaimPopover } from "@/ds/organisms/ClaimPopover";
import { AddedBlock, RevisedSpan, findMark, isAdded, useRevisions } from "@/components/report/RevisedText";
import { plainProse } from "@/lib/plain-prose";

/** Numbering runs per section, so the owning block creates one of these per render. */
export function newCitationCounter() {
  return { n: 0 };
}
export type CitationCounter = ReturnType<typeof newCitationCounter>;

/** Length-preserving, so an offset found in the haystack is valid in the display text. The API's softenQuote does the same, so a claim that validated is found here. */
function soften(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-");
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Prose with each matched claim marked in place. Overlapping hits are skipped,
 * so a quote inside another quote never produces two superscripts on one span.
 * A horizon pass's marks come through the revision context (ADR-35): a
 * paragraph the pass added carries its rule and kicker, and an amended
 * sentence its underline; the marks are the report's own, never a diff.
 * The text is printed plain first (ADR-104): no asterisk, no line that is
 * only a placement.
 */
export function CitedText({
  text,
  claims,
  counter,
}: {
  text: string;
  claims?: Claim[];
  counter: CitationCounter;
}): ReactNode {
  const revisions = useRevisions();
  const plain = plainProse(text);
  // A pass inserts a paragraph with a blank line; without a pass a field is one paragraph.
  const paragraphs = plain.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length > 1) {
    return paragraphs.map((p, i) => {
      const inner = citedParagraph(p, claims, counter, revisions);
      const added = revisions?.shown && isAdded(p, revisions);
      return added
        ? <AddedBlock key={i}>{inner}</AddedBlock>
        : <span key={i} className={i > 0 ? "block mt-[15px]" : "block"}>{inner}</span>;
    });
  }
  return citedParagraph(plain, claims, counter, revisions);
}

type Revisions = ReturnType<typeof useRevisions>;

/** One paragraph: the revised sentence wrapped first, then the claims marked inside each part. */
function citedParagraph(text: string, claims: Claim[] | undefined, counter: CitationCounter, revisions: Revisions): ReactNode {
  const display = collapse(text);
  const hit = revisions?.shown ? findMark(display, revisions) : null;
  if (!hit) return citedRun(display, claims, counter);
  return (
    <>
      {hit.start > 0 && citedRun(display.slice(0, hit.start), claims, counter)}
      <RevisedSpan mark={hit.mark}>{citedRun(display.slice(hit.start, hit.end), claims, counter)}</RevisedSpan>
      {hit.end < display.length && citedRun(display.slice(hit.end), claims, counter)}
    </>
  );
}

function citedRun(display: string, claims: Claim[] | undefined, counter: CitationCounter): ReactNode {
  if (!claims?.length) return display;

  const hay = soften(display);
  const hits: { start: number; end: number; claim: Claim }[] = [];
  for (const claim of claims) {
    const needle = soften(collapse(claim.quote));
    if (!needle) continue;
    const start = hay.indexOf(needle);
    if (start >= 0) hits.push({ start, end: start + needle.length, claim });
  }
  if (!hits.length) return display;
  hits.sort((a, b) => a.start - b.start);

  const out: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const hit of hits) {
    if (hit.start < cursor) continue;
    if (hit.start > cursor) out.push(<Fragment key={key++}>{display.slice(cursor, hit.start)}</Fragment>);
    out.push(
      <mark key={key++} className="rp-claimed">
        {display.slice(hit.start, hit.end)}
      </mark>,
    );
    out.push(<ClaimPopover key={key++} index={++counter.n} claim={hit.claim} />);
    cursor = hit.end;
  }
  if (cursor < display.length) out.push(<Fragment key={key++}>{display.slice(cursor)}</Fragment>);
  return out;
}
