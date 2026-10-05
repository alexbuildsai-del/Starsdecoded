import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { SiteLayout } from "../SiteLayout";
import { pageFor } from "../site";
import BirthTime from "../sections/BirthTime";
import Claims from "../sections/Claims";
import Dawn from "../sections/Dawn";
import Differences from "../sections/Differences";
import Faq from "../sections/Faq";
import Hero from "../sections/Hero";
import Inside from "../sections/Inside";
import Method from "../sections/Method";
import Pricing from "../sections/Pricing";
import TimelineLine from "../sections/TimelineLine";
import TwoCharts from "../sections/TwoCharts";
import YourPeople from "../sections/YourPeople";

const page = pageFor("/");

/** Should the hero never report first light, the held sections still start after this long. */
const FIRST_LIGHT_FALLBACK_MS = 6000;
/** Where the browser has no idle callback (Safari), the gap left between two sections so a scroll can run between them. */
const NO_IDLE_GAP_MS = 120;

/** The same object on every render, so React never rewrites the kept HTML while a section waits. */
const KEEP = { __html: "" };
const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";
const nothingToWatch = () => () => {};

// Held sections in page order: their effects run top first, so the queue is the page's order.
const line: (() => void)[] = [];
let lit = false;
let asked = false;

/** One section per idle moment, so no two sections' charts land in the same frame. */
function letNextGo(): void {
  if (!lit || asked || line.length === 0) return;
  asked = true;
  const go = () => {
    asked = false;
    line.shift()?.();
    letNextGo();
  };
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(go, { timeout: 1000 });
  else window.setTimeout(go, NO_IDLE_GAP_MS);
}

function firstLightOver(): void {
  lit = true;
  letNextGo();
}

/**
 * A section below the hero whose charts wait for first light (R11-24). Each chart costs a mid-range phone about a
 * tenth of a second, and hydrating every section at once held first light back by more than a second. While the page
 * hydrates, React leaves the prerendered section as it is, whole and readable; the section then renders for real,
 * over identical HTML, when it nears the screen, when the reader points or tabs into it, or in the first idle moment
 * after first light. Arriving from another page there is no HTML to keep, so it renders at once.
 */
function Later({ ahead = "50%", children }: { ahead?: string; children: ReactNode }) {
  const hydrating = useSyncExternalStore(nothingToWatch, () => false, () => true);
  const [held, setHeld] = useState(hydrating);
  const box = useRef<HTMLDivElement>(null);
  const refocus = useRef(-1);

  useEffect(() => {
    const el = box.current;
    if (!held || !el) return;
    let done = false;
    const release = () => {
      if (done) return;
      done = true;
      // The section's controls are rebuilt in the same order, so a reader who has tabbed in keeps their place.
      const active = document.activeElement;
      refocus.current = active && el.contains(active) ? [...el.querySelectorAll(FOCUSABLE)].indexOf(active) : -1;
      flushSync(() => setHeld(false));
    };
    const section = el.firstElementChild;
    const near =
      section && "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((e) => e.isIntersecting)) release();
            },
            // More than touching: a section whose top sits on the fold at load is not yet in view.
            { rootMargin: `${ahead} 0px`, threshold: 0.01 },
          )
        : null;
    if (section) near?.observe(section);
    el.addEventListener("pointerover", release);
    el.addEventListener("focusin", release);
    line.push(release);
    letNextGo();
    return () => {
      near?.disconnect();
      el.removeEventListener("pointerover", release);
      el.removeEventListener("focusin", release);
      const at = line.indexOf(release);
      if (at >= 0) line.splice(at, 1);
    };
  }, [held, ahead]);

  useLayoutEffect(() => {
    if (held || refocus.current < 0) return;
    box.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[refocus.current]?.focus({ preventScroll: true });
    refocus.current = -1;
  }, [held]);

  if (typeof window === "undefined" || !held) {
    return (
      <div ref={box} className="contents">
        {children}
      </div>
    );
  }
  return <div ref={box} className="contents" dangerouslySetInnerHTML={KEEP} suppressHydrationWarning />;
}

/**
 * The sections stand in the locked order (landing-and-ai-search, scope 2 to 13), the two differences right after the
 * hero (ADR-173), prices above the questions (ADR-118) and Timeline's one line between them (ADR-252).
 */
export default function HomePage() {
  useEffect(() => {
    const fallback = window.setTimeout(firstLightOver, FIRST_LIGHT_FALLBACK_MS);
    return () => window.clearTimeout(fallback);
  }, []);

  return (
    <SiteLayout page={page}>
      <Hero onFirstLight={firstLightOver} />
      {/* Its top sits on the fold on a desktop, so only the reader's own scroll brings it in before first light ends. */}
      <Later ahead="0px">
        <Differences />
      </Later>
      <Later>
        <Claims />
      </Later>
      <Inside />
      <Later>
        <YourPeople />
      </Later>
      <Later>
        <TwoCharts />
      </Later>
      <Later>
        <Method />
      </Later>
      <Later>
        <BirthTime />
      </Later>
      <Pricing />
      <TimelineLine />
      <Faq />
      <Dawn />
    </SiteLayout>
  );
}
