/**
 * The marks of a horizon pass (ADR-35): an amended sentence carries a brass
 * underline and the tag "revised", and hover or tap opens a card with before
 * struck through, now, and because as evidence chips, angle and lot in brass.
 * An added paragraph carries a brass rule and the kicker "Added with your
 * birth time", once per block. The marks come from the report's own record,
 * never from a diff made here, and every prose renderer reads them through
 * one context so no chapter has to know.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/ds/organisms/ClaimPopover";
import { Sheet, SheetContent, SheetTitle } from "@/ds/organisms/Sheet";
import type { HorizonPass, RevisionMark, SectionAddition } from "@/types/chart";
import { withHouseWords } from "@/lib/evidence-glossary";

export interface RevisionSet {
  marks: RevisionMark[];
  added: SectionAddition[];
  /** "Show what changed": off hides the underlines and kickers, the text stays. */
  shown: boolean;
}

const RevisionContext = createContext<RevisionSet | null>(null);

/** The whole report's marks, flattened: a sentence is found by its text wherever it sits. */
export function revisionSet(pass: HorizonPass | null | undefined, shown: boolean): RevisionSet | null {
  if (!pass) return null;
  const marks: RevisionMark[] = [];
  const added: SectionAddition[] = [];
  for (const s of Object.values(pass.sections)) {
    marks.push(...s.amended);
    added.push(...s.added);
  }
  return { marks, added, shown };
}

export function RevisionProvider({ value, children }: { value: RevisionSet | null; children: ReactNode }) {
  return <RevisionContext.Provider value={value}>{children}</RevisionContext.Provider>;
}

export function useRevisions(): RevisionSet | null {
  return useContext(RevisionContext);
}

/** Length-preserving, so an offset found in the haystack is valid in the display text. */
function soften(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

function isCoarsePointer(): boolean {
  return typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 720);
}

/** The kinds a chip colours brass: measured geometry. */
const BRASS_KINDS = new Set(["angle", "lot"]);

// The same shell as ClaimPopover's evidence card (the .rp-card type and tokens), placed by Radix; the narrow-screen
// fixed placement is switched off because Radix places the card and the Sheet is the phone version.
const CARD = "rp-card !static !w-[min(344px,calc(100vw-32px))] !max-h-none !overflow-visible !rounded-card";
const IN_SHEET = "rp-card !static !w-full !max-h-none !overflow-visible !rounded-none !border-0 !bg-transparent !p-0 !shadow-none";

function RevisionCard({ mark }: { mark: RevisionMark }) {
  return (
    <>
      <p className="before"><span className="sr-only">Before: </span>{mark.before}</p>
      <p className="now"><span className="sr-only">Now: </span>{mark.now}</p>
      <div className="chips" aria-label="Because">
        {mark.evidence.map((e, i) => (
          <span key={i} className={`chip ${BRASS_KINDS.has(e.ref.kind) ? e.ref.kind : ""}`}>{withHouseWords(e.label)}</span>
        ))}
      </div>
      <div className="foot">Because · your birth time</div>
    </>
  );
}

export function RevisedSpan({ mark, children }: { mark: RevisionMark; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const markRef = useRef<HTMLButtonElement>(null);
  const cancelClose = useCallback(() => { if (closeTimer.current !== null) { window.clearTimeout(closeTimer.current); closeTimer.current = null; } }, []);
  const closeSoon = useCallback(() => { cancelClose(); closeTimer.current = window.setTimeout(() => setOpen(false), 160); }, [cancelClose]);
  useEffect(() => cancelClose, [cancelClose]);

  const change = useCallback((next: boolean) => {
    if (next) setCoarse(isCoarsePointer());
    setOpen(next);
  }, []);

  return (
    <span
      onMouseEnter={() => { if (!isCoarsePointer()) { cancelClose(); setCoarse(false); setOpen(true); } }}
      onMouseLeave={() => { if (!isCoarsePointer()) closeSoon(); }}
    >
      <Popover open={open && !coarse} onOpenChange={change}>
        <PopoverTrigger
          ref={markRef}
          className={`rp-rev${open ? " open" : ""}`}
          aria-expanded={open}
          aria-label="Revised with your birth time. Show what changed."
        >
          {children}
          <span className="tag no-print" aria-hidden>revised</span>
        </PopoverTrigger>
        <PopoverContent
          role="dialog"
          aria-label="What changed"
          side="top"
          avoidCollisions
          className={CARD}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onMouseEnter={cancelClose}
          onMouseLeave={() => closeSoon()}
        >
          <RevisionCard mark={mark} />
        </PopoverContent>
      </Popover>
      <Sheet open={open && coarse} onOpenChange={change}>
        <SheetContent
          side="bottom"
          aria-describedby={undefined}
          // The mark is not a SheetTrigger, so Radix has nowhere to return focus to.
          onCloseAutoFocus={(e) => { e.preventDefault(); markRef.current?.focus(); }}
          className="max-h-[70vh] overflow-y-auto pb-[calc(18px+env(safe-area-inset-bottom,0px))]"
        >
          <SheetTitle className="sr-only">What changed</SheetTitle>
          <div className={IN_SHEET}>
            <RevisionCard mark={mark} />
          </div>
        </SheetContent>
      </Sheet>
    </span>
  );
}

export function AddedBlock({ children }: { children: ReactNode }) {
  return (
    <span className="rp-added block">
      <span className="kick">Added with your birth time</span>
      {children}
    </span>
  );
}

/** The mark whose sentence sits in this text, with its offsets, or null. */
export function findMark(text: string, set: RevisionSet | null): { mark: RevisionMark; start: number; end: number } | null {
  if (!set) return null;
  const hay = soften(text);
  for (const mark of set.marks) {
    const needle = soften(mark.now.trim());
    if (!needle) continue;
    const start = hay.indexOf(needle);
    if (start >= 0) return { mark, start, end: start + needle.length };
  }
  return null;
}

export function isAdded(paragraph: string, set: RevisionSet | null): boolean {
  if (!set) return false;
  const p = soften(paragraph.trim());
  return set.added.some((a) => soften(a.text.trim()) === p);
}
