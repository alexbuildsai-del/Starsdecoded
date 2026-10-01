/**
 * /sample's rail: the ten chapters in their accents (ADR-23), the six the
 * sample leaves for your own report dimmed (ADR-178), sticky beside the
 * reading on a wide screen and a strip of chips under the nav on a narrow one
 * (annex, Shared: rails become chips). Plain anchors, so it works before the
 * page has hydrated; once it has, the chapter being read is marked.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { chapterAccent } from "@/lib/chapter-accent";
import { CHAPTERS } from "@/lib/chapters";
import { cn } from "@/lib/utils";
import { DIMMED_STATUS, isOpenChapter } from "@/site/data/sample";

export const chapterId = (index: number) => `chapter-${index + 1}`;

/** The strip's height on a narrow screen, fixed so that what pins under it can pin exactly there. */
export const RAIL_STRIP = "52px";

const two = (n: number) => String(n).padStart(2, "0");

// The chapter being read is the last one whose top has passed this share of the screen.
const READING_LINE = 0.35;

export function SampleRail() {
  const [active, setActive] = useState(-1);
  const list = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * READING_LINE;
      let at = -1;
      CHAPTERS.forEach((_, i) => {
        const top = document.getElementById(chapterId(i))?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) at = i;
      });
      setActive(at);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // On the strip, the chip being read scrolls into view; on the rail nothing scrolls sideways, so nothing moves.
  useEffect(() => {
    const strip = list.current;
    const chip = strip?.children[active] as HTMLElement | undefined;
    if (!strip || !chip || strip.scrollWidth <= strip.clientWidth) return;
    const hidden = chip.offsetLeft < strip.scrollLeft || chip.offsetLeft + chip.offsetWidth > strip.scrollLeft + strip.clientWidth;
    if (hidden) strip.scrollTo({ left: chip.offsetLeft - 16, behavior: reduced ? "auto" : "smooth" });
  }, [active, reduced]);

  return (
    <nav
      aria-label="Chapters"
      style={{ "--rail-strip": RAIL_STRIP } as CSSProperties}
      className={cn(
        "sticky top-[calc(var(--nav)+24px)] grid gap-3.5",
        // The strip sits over the deck's pinned bar, which slides up behind it as chapter 2 ends, and under the site's nav.
        "max-[1000px]:top-[var(--nav)] max-[1000px]:z-[15] max-[1000px]:-mx-6 max-[1000px]:h-[var(--rail-strip)] max-[1000px]:content-center max-[1000px]:border-b max-[1000px]:border-[color:var(--line-soft)] max-[1000px]:bg-[rgba(13,17,23,.92)] max-[1000px]:px-6 max-[1000px]:backdrop-blur-md",
        "max-[760px]:-mx-4 max-[760px]:px-4",
      )}
    >
      <p className="sd-eyebrow max-[1000px]:sr-only">Chapters</p>
      <ol
        ref={list}
        className="relative m-0 grid list-none gap-0.5 p-0 max-[1000px]:flex max-[1000px]:gap-1.5 max-[1000px]:overflow-x-auto max-[1000px]:[scrollbar-width:none]"
      >
        {CHAPTERS.map((chapter, i) => {
          const on = active === i;
          const open = isOpenChapter(chapter.section);
          return (
            <li key={chapter.section} className="max-[1000px]:flex-none">
              <a
                href={`#${chapterId(i)}`}
                aria-current={on ? "true" : undefined}
                style={{ "--c": chapterAccent(i + 1) } as CSSProperties}
                className={cn(
                  "grid grid-cols-[26px_minmax(0,1fr)] gap-1.5 rounded-lg px-2 py-[7px] text-[13.5px] leading-[1.35] no-underline transition-colors hover:bg-[rgba(232,235,242,.03)] hover:text-[color:var(--paper)]",
                  open ? "text-[color:var(--paper-dim)]" : "text-[color:var(--sd-muted)]",
                  "max-[1000px]:flex max-[1000px]:items-center max-[1000px]:gap-2 max-[1000px]:whitespace-nowrap max-[1000px]:rounded-full max-[1000px]:border max-[1000px]:px-3 max-[1000px]:py-1.5 max-[1000px]:text-[13px]",
                  open ? "max-[1000px]:border-[color:var(--line)]" : "max-[1000px]:border-[color:var(--line-soft)]",
                  on && "bg-[rgba(232,235,242,.05)] text-[color:var(--paper)] max-[1000px]:border-[color:var(--c)]",
                )}
              >
                <span className={cn("font-numeric text-[10.5px] font-medium leading-[1.6] text-[color:var(--c)]", !open && "opacity-60")}>{two(i + 1)}</span>
                <span className="max-[1000px]:hidden">{chapter.title}</span>
                <span className="min-[1000px]:hidden">{chapter.eyebrow}</span>
                {/* A screen reader hears what the dimming shows. */}
                {!open && <span className="sr-only">{`, ${DIMMED_STATUS.toLowerCase()}`}</span>}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
