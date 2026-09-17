import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface RailChapter { eyebrow: string; title: string }

/**
 * The chapter rail on the left and, on a phone, the bar under the nav. It also
 * owns the one scroll listener that decides which chapter is active: the last
 * divider whose top has passed 140 px, or -1 while the opening is on screen.
 */
export function ChapterRail({
  chapters,
  active,
  onActive,
}: {
  chapters: RailChapter[];
  active: number;
  onActive: (index: number) => void;
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
    if (index < 0) {
      window.scrollTo({ top: 0, behavior });
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-ch="${index}"]`);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 10, behavior });
  }

  const current = active < 0 ? "Opening" : chapters[active]?.title ?? "";

  return (
    <>
      <nav className="rp-rail no-print" aria-label="Chapters">
        <button type="button" className={active < 0 ? "on" : ""} onClick={() => jump(-1)}>
          <i /><span>Opening</span>
        </button>
        {chapters.map((c, i) => (
          <button
            key={c.title}
            type="button"
            className={active === i ? "on" : ""}
            aria-current={active === i ? "true" : undefined}
            onClick={() => jump(i)}
          >
            <i /><span>{c.eyebrow}</span>
          </button>
        ))}
      </nav>
      <div ref={mobRef} className="rp-mobbar no-print" aria-hidden style={{ opacity: 0 }}>
        <span className="cur">{current}</span>
        <span className="bar"><i ref={barRef} /></span>
      </div>
    </>
  );
}

export default ChapterRail;
