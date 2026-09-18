/**
 * The closing: dawn in the corner. As chapter 11 enters, the Sun slides in from
 * beyond the top right corner and stops cropped by both edges, its light warming
 * that corner and falling diagonally across the chapter. The closing reads at
 * the left, upright, with its citations and no caption under it.
 *
 * Progress is one CSS variable set from the section's own position in the
 * viewport, on a rAF-throttled scroll handler and no timers (MASTERFILE §9).
 * Reduced motion renders the final frame and listens to nothing.
 */
import { useEffect, useRef } from "react";
import { SUN_HERO } from "@/lib/planet-renders";
import { Checklist } from "@/components/report/Checklist";
import { CitedText, newCitationCounter, type CitationCounter } from "@/components/report/Citation";
import { itemKey } from "@/lib/workbook";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { FocusGroup, FocusSection } from "@/types/chart";

const GROUPS: { key: "leanInto" | "notice" | "practice"; title: string }[] = [
  { key: "leanInto", title: "Lean into" },
  { key: "notice", title: "Notice" },
  { key: "practice", title: "Practice" },
];

function GroupCard({ title, group, path }: { title: string; group: FocusGroup; path: string }) {
  return (
    <div className="rp-box" style={{ marginTop: 0 }}>
      <span className="rp-lab">{title}</span>
      <p className="tn">{group.intro}</p>
      <Checklist
        heading="What to do"
        items={group.bullets.map((b, i) => ({
          key: itemKey("focus", `${path}.bullets`, i),
          action: b.point,
          why: b.why,
        }))}
      />
    </div>
  );
}

export function DawnClosing({ s, counter }: { s: FocusSection; counter?: CitationCounter }) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const k = counter ?? newCitationCounter();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (reduced) {
      root.style.setProperty("--p", "1");
      return;
    }
    let frame = 0;
    function place() {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = Math.max(1, window.innerHeight);
      // 0 while the chapter is still below the fold, 1 once it has risen a screen.
      const p = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.9)));
      el.style.setProperty("--p", p.toFixed(3));
    }
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        place();
      });
    }
    place();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <div ref={rootRef} className="rp-dawn">
      <div className="sun no-print" aria-hidden>
        <img src={SUN_HERO} alt="" />
      </div>
      <div className="warm no-print" aria-hidden />
      <div className="body pt-[calc(min(560px,82vw)*0.74)] md:pt-14">
        <p className="rp-pull max-w-[44ch]">
          {CitedText({ text: s.closing, claims: s.claims, counter: k })}
        </p>
        <div className="rp-cols mt-10">
          {GROUPS.map((g) => (
            <GroupCard key={g.key} title={g.title} group={s[g.key]} path={g.key} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default DawnClosing;
