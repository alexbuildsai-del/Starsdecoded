import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface RailChapter {
  eyebrow: string;
  title: string;
  /** The chapter's section has not landed yet. */
  writing?: boolean;
  /** A horizon pass is amending this chapter. */
  revising?: boolean;
}

/** What the last pass changed, from the report itself; the rail never recounts (ADR-35). */
export interface RailRevision {
  sentencesRevised: number;
  paragraphsAdded: number;
  at: string;
}

function revisionLine(r: RailRevision): string {
  const date = new Date(r.at);
  const when = Number.isNaN(date.getTime()) ? r.at : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${r.sentencesRevised} sentences revised · ${r.paragraphsAdded} added · ${when}`;
}

/**
 * The chapter rail on the left and, on a phone, the bar under the nav. It
 * lists chapters only (ADR-50): the hero is not an entry, and `active === -1`
 * still means the reader is on it. It also owns the one scroll listener that
 * decides which chapter is active: the last divider whose top has passed 140 px.
 */
export function ChapterRail({
  chapters,
  active,
  onActive,
  revision,
}: {
  chapters: RailChapter[];
  active: number;
  onActive: (index: number) => void;
  revision?: RailRevision | null;
}) {
  const reduced = useReducedMotion();
  const barRef = useRef<HTMLElement>(null);
  const mobRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    let frame = 0;
    function measure() {
      const dividers = Array.from(document.querySelectorAll<HTMLElement>("[data-ch]"));
      let act = -1;
      for (const d of dividers) {
        if (d.getBoundingClientRect().top <= 140) act = Number(d.dataset.ch);
      }
      if (act !== activeRef.current) onActive(act);
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (barRef.current) barRef.current.style.width = `${Math.round((window.scrollY / max) * 100)}%`;
      const q = Math.min(1, window.scrollY / (Math.max(1, window.innerHeight) * 0.6));
      if (mobRef.current) mobRef.current.style.opacity = q.toFixed(3);
    }
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    }
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [onActive]);

  function jump(index: number) {
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
    const el = document.querySelector<HTMLElement>(`[data-ch="${index}"]`);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 10, behavior });
  }

  const current = active < 0 ? "" : chapters[active]?.title ?? "";

  return (
    <>
      <nav className="rp-rail no-print" aria-label="Chapters">
        {chapters.map((c, i) => (
          <button
            key={c.title}
            type="button"
            className={active === i ? "on" : ""}
            aria-current={active === i ? "true" : undefined}
            onClick={() => jump(i)}
            aria-busy={c.writing || c.revising ? "true" : undefined}
          >
            <i />
            <span>
              {c.eyebrow}
              {c.revising ? <span className="opacity-60"> · revising</span> : c.writing && <span className="opacity-60"> · writing</span>}
            </span>
          </button>
        ))}
        {revision && (
          <span className="mt-1 font-numeric text-[9px] tracking-[0.04em] text-[var(--muted)] whitespace-nowrap">
            {revisionLine(revision)}
          </span>
        )}
      </nav>
      <div ref={mobRef} className="rp-mobbar no-print" aria-hidden style={{ opacity: 0 }}>
        <span className="cur">{current}</span>
        <span className="bar"><i ref={barRef} /></span>
      </div>
    </>
  );
}

export default ChapterRail;
