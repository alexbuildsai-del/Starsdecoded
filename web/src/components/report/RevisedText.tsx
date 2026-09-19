/**
 * The marks of a horizon pass (ADR-35): an amended sentence carries a brass
 * underline and the tag "revised", and hover or tap opens a card with before
 * struck through, now, and because as evidence chips, angle and lot in brass.
 * An added paragraph carries a brass rule and the kicker "Added with your
 * birth time", once per block. The marks come from the report's own record,
 * never from a diff made here, and every prose renderer reads them through
 * one context so no chapter has to know.
 */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { HorizonPass, RevisionMark, SectionAddition } from "@/types/chart";

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

export function RevisedSpan({ mark, children }: { mark: RevisionMark; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [coarse, setCoarse] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const close = useCallback(() => setOpen(false), []);
  const cancelClose = useCallback(() => { if (closeTimer.current !== null) { window.clearTimeout(closeTimer.current); closeTimer.current = null; } }, []);
  const closeSoon = useCallback(() => { cancelClose(); closeTimer.current = window.setTimeout(() => setOpen(false), 160); }, [cancelClose]);
  useEffect(() => cancelClose, [cancelClose]);

  useLayoutEffect(() => {
    if (!open) return;
    const c = isCoarsePointer();
    setCoarse(c);
    if (c) { setPos(null); return; }
    const r = ref.current?.getBoundingClientRect();
    const card = cardRef.current;
    if (!r || !card) return;
    const w = card.offsetWidth, h = card.offsetHeight;
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    const top = r.top - h - 10 < 12 ? r.bottom + 10 : r.top - h - 10;
    setPos({ left, top });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (cardRef.current?.contains(t) || ref.current?.contains(t)) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open, close]);

  return (
    <span onMouseEnter={() => { if (!isCoarsePointer()) { cancelClose(); setOpen(true); } }} onMouseLeave={() => { if (!isCoarsePointer()) closeSoon(); }}>
      <button
        ref={ref}
        type="button"
        className={`rp-rev${open ? " open" : ""}`}
        aria-expanded={open}
        aria-label="Revised with your birth time. Show what changed."
        onClick={() => setOpen((o) => !o)}
      >
        {children}
        <span className="tag no-print" aria-hidden>revised</span>
      </button>
      {open && createPortal(
        <div ref={cardRef} role="dialog" aria-label="What changed" className="rp-card" onMouseEnter={cancelClose} onMouseLeave={() => { if (!isCoarsePointer()) closeSoon(); }} style={coarse || !pos ? undefined : { left: pos.left, top: pos.top }}>
          <p className="before"><span className="sr-only">Before: </span>{mark.before}</p>
          <p className="now"><span className="sr-only">Now: </span>{mark.now}</p>
          <div className="chips" aria-label="Because">
            {mark.evidence.map((e, i) => (
              <span key={i} className={`chip ${BRASS_KINDS.has(e.ref.kind) ? e.ref.kind : ""}`}>{e.label}</span>
            ))}
          </div>
          <div className="foot">Because · your birth time</div>
        </div>,
        document.body,
      )}
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
