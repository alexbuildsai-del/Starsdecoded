/**
 * Inside the report (landing-and-ai-search scope 6, ADR-111): the chapter names
 * from the registry in their accents, each with what it tells you and the parts
 * it covers, stepping through once while in view, then resting on the first, or
 * stopping where the reader touches it. All ten panels are in the HTML, so a
 * crawler reads every chapter, not the first.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "wouter";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { chapterAccent } from "@/lib/chapter-accent";
import { CHAPTERS } from "@/lib/chapters";
import { cn } from "@/lib/utils";
import { CHAPTER_COUNT, INSIDE } from "@/site/data/inside";
import { SAMPLE_LIVE } from "@/site/site";

const STEP_MS = 4600;

const two = (n: number) => String(n).padStart(2, "0");

export default function Inside() {
  const reduced = useReducedMotion();
  const [cur, setCur] = useState(0);
  const [touched, setTouched] = useState(false);
  const [rested, setRested] = useState(false);
  const [seen, setSeen] = useState(false);
  // The first panel is whole in the HTML; only a change the reader sees slides in.
  const [changed, setChanged] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = box.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => setSeen(entry.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stepping = seen && !touched && !rested && !reduced;

  // One pass, then it rests on the first chapter: a step that never ends keeps pulling the eye from the page (/web-taste).
  useEffect(() => {
    if (!stepping) return;
    const timer = window.setTimeout(() => {
      const last = cur === CHAPTERS.length - 1;
      setChanged(true);
      if (last) setRested(true);
      setCur(last ? 0 : cur + 1);
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [stepping, cur]);

  const pick = (i: number) => {
    setTouched(true);
    setChanged(true);
    setCur(i);
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = CHAPTERS.length - 1;
    const to =
      event.key === "ArrowDown" ? (i + 1) % CHAPTERS.length
      : event.key === "ArrowUp" ? (i + last) % CHAPTERS.length
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : -1;
    if (to < 0) return;
    event.preventDefault();
    pick(to);
    tabs.current[to]?.focus();
  };

  return (
    <section className="sd-sec sd-sec-b sd-line" aria-labelledby="sd-inside-h">
      <div className="sd-wrap">
        <div className="sd-shead">
          <p className="sd-eyebrow">Inside the report</p>
          <h2 className="sd-h2" id="sd-inside-h">Here's what your report covers</h2>
          <p className="sd-sub">
            There are {CHAPTER_COUNT} chapters, starting with the big picture and ending with what to try next. In between
            they cover how you think, work, handle money and love, and the habits that keep coming back.
          </p>
        </div>
        <div className="sd-inside" ref={box}>
          <ol
            className="sd-toc"
            role="tablist"
            aria-label="Chapters"
            aria-orientation="vertical"
            style={{ ["--dur" as string]: `${STEP_MS}ms` }}
            onFocus={() => setTouched(true)}
          >
            {CHAPTERS.map((chapter, i) => (
              <li key={chapter.section} role="presentation">
                <button
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`sd-toc-${i}`}
                  aria-controls={`sd-chapter-${i}`}
                  aria-selected={i === cur}
                  tabIndex={i === cur ? 0 : -1}
                  style={{ ["--c" as string]: chapterAccent(i + 1) }}
                  onClick={() => pick(i)}
                  onKeyDown={(event) => onKey(event, i)}
                >
                  <span className="n">{two(i + 1)}</span>
                  <span className="t">{chapter.title}</span>
                  <span
                    key={i === cur && stepping ? `run-${cur}` : "idle"}
                    className={cn("prog", i === cur && stepping && "run")}
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ol>
          <div
            className="sd-pv"
            style={{ ["--acc" as string]: chapterAccent(cur + 1) }}
            onClick={() => setTouched(true)}
          >
            <span className="ghost" aria-hidden="true">{two(cur + 1)}</span>
            {CHAPTERS.map((chapter, i) => {
              const glimpse = INSIDE[chapter.section];
              const on = i === cur;
              return (
                <div
                  key={chapter.section}
                  id={`sd-chapter-${i}`}
                  role="tabpanel"
                  aria-labelledby={`sd-toc-${i}`}
                  className={cn("col-start-1 row-start-1 grid content-start gap-[18px]", on ? "visible" : "invisible", on && changed && "swap")}
                >
                  <p className="chap">
                    <span className="sd-mono">{two(i + 1)}</span> Chapter
                  </p>
                  <h3>{chapter.title}</h3>
                  <p className="glimpse">{glimpse.line}</p>
                  <p className="parts">{glimpse.parts.join(" · ")}</p>
                </div>
              );
            })}
          </div>
        </div>
        {SAMPLE_LIVE && (
          <Link className="sd-more" href="/sample">
            Read a sample report
          </Link>
        )}
      </div>
    </section>
  );
}
