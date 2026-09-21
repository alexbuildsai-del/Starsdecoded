/**
 * A claim is marked where the model actually wrote it and carries a numbered
 * superscript; the evidence lives in a card, not in a block reprinted under
 * the paragraph the reader just finished (ADR-18).
 */
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Claim } from "@/types/chart";
import { EvidenceCard } from "@/components/report/EvidenceCard";
import { AddedBlock, RevisedSpan, findMark, isAdded, useRevisions } from "@/components/report/RevisedText";

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

function isCoarsePointer(): boolean {
  return typeof window !== "undefined"
    && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 720);
}

function Citation({ index, claim }: { index: number; claim: Claim }) {
  const [open, setOpen] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const supRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

  const close = useCallback(() => setOpen(false), []);
  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  // A short grace period, so the pointer can travel from the mark to the card.
  const closeSoon = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  useLayoutEffect(() => {
    if (!open) return;
    // The sheet variant is CSS-only, so coarse pointers need no measured position.
    const coarseNow = isCoarsePointer();
    setCoarse(coarseNow);
    if (coarseNow) { setPos(null); return; }
    const sup = supRef.current;
    const card = cardRef.current;
    if (!sup || !card) return;
    const r = sup.getBoundingClientRect();
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    const top = r.top - h - 10 < 12 ? r.bottom + 10 : r.top - h - 10;
    setPos({ left, top });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (cardRef.current?.contains(t) || supRef.current?.contains(t)) return;
      close();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, close]);

  const name = `Evidence for “${claim.quote.slice(0, 60)}${claim.quote.length > 60 ? "…" : ""}”`;

  return (
    <span
      onMouseEnter={() => { if (!isCoarsePointer()) { cancelClose(); setOpen(true); } }}
      onMouseLeave={() => { if (!isCoarsePointer()) closeSoon(); }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <button
        ref={supRef}
        type="button"
        aria-label={name}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`rp-cite no-print${open ? " open" : ""}`}
      >
        {index}
      </button>
      {/* Portalled: a card is not legal inside a paragraph, and nothing in the
          reading should be able to clip it. */}
      {open && createPortal(
        <div
          ref={cardRef}
          role="dialog"
          aria-label={name}
          onMouseEnter={cancelClose}
          onMouseLeave={() => { if (!isCoarsePointer()) closeSoon(); }}
          className="rp-card"
          style={coarse || !pos ? undefined : { left: pos.left, top: pos.top }}
        >
          <EvidenceCard claim={claim} />
        </div>,
        document.body,
      )}
    </span>
  );
}

/**
 * Prose with each matched claim marked in place. Overlapping hits are skipped,
 * so a quote inside another quote never produces two superscripts on one span.
 * A horizon pass's marks come through the revision context (ADR-35): a
 * paragraph the pass added carries its rule and kicker, and an amended
 * sentence its underline; the marks are the report's own, never a diff.
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
  // A pass inserts a paragraph with a blank line; without a pass a field is one paragraph.
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length > 1) {
    return paragraphs.map((p, i) => {
      const inner = citedParagraph(p, claims, counter, revisions);
      const added = revisions?.shown && isAdded(p, revisions);
      return added
        ? <AddedBlock key={i}>{inner}</AddedBlock>
        : <span key={i} className={i > 0 ? "block mt-[15px]" : "block"}>{inner}</span>;
    });
  }
  return citedParagraph(text, claims, counter, revisions);
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
    out.push(<Citation key={key++} index={++counter.n} claim={hit.claim} />);
    cursor = hit.end;
  }
  if (cursor < display.length) out.push(<Fragment key={key++}>{display.slice(cursor)}</Fragment>);
  return out;
}
