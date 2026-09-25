/**
 * The generation screen is its own screen (ADR-47, ADR-59): while the report
 * is not open, `/report/:id` renders it full-bleed, the document scroll is
 * locked on the root and focus stays inside. The orrery, one percentage, one
 * of five labels, and once the door opens "Start reading" over one line with
 * no numbers. At 100% the page opens itself after a 1.2 s hold. Taking the
 * door crossfades the screen out, under Reduce Motion too, then hands the
 * page back so it can unmount it, show the report at the top and run the
 * gather once. A failed report keeps the screen with its message and "Try
 * again". A report in revising is already readable and shows no screen.
 */
import { useEffect, useRef, useState } from "react";
import { Orrery } from "@/components/report/Orrery";
import type { Positions } from "@/lib/orrery";
import type { Progress } from "@/lib/progress";
import type { ChartData } from "@/types/chart";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export const SELF_OPEN_HOLD_MS = 1200;
/** The crossfade out, the one move the screen makes when it leaves. */
export const CROSSFADE_MS = 350;

export interface OpeningOverlayProps {
  progress: Progress;
  provisional: Positions | null;
  chart: ChartData | null;
  /** The coded line a failed report shows (ADR-84); the internal message never reaches the page. */
  failureLine?: string | null;
  onOpen: () => void;
  onRetry?: () => void;
  retrying?: boolean;
}

/** The `internal` line of the failure vocabulary, the fallback when a failed report carries no code yet. */
export const INTERNAL_LINE = "Something went wrong on our side. We've been alerted.";

/** The hero's ground, so the screen is a page of its own and not a veil over one. */
const GROUND = "radial-gradient(120% 92% at 50% 38%, #141B28 0%, #0B0E14 56%, #06080C 100%)";

export function OpeningOverlay({ progress, provisional, chart, failureLine, onOpen, onRetry, retrying }: OpeningOverlayProps) {
  const [away, setAway] = useState(false);
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  // The document does not scroll behind the screen, and focus stays inside it.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const el = rootRef.current;
    el?.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab" || !el) return;
      const focusable = Array.from(el.querySelectorAll<HTMLElement>("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) { e.preventDefault(); el.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Leaving: the crossfade, then the page takes over. Reduce Motion keeps the fade, which is the one move here.
  function leave() {
    if (away) return;
    setAway(true);
    window.setTimeout(onOpen, CROSSFADE_MS);
  }

  // The 1.2 s hold at 100%, then the page opens on its own.
  useEffect(() => {
    if (!progress.complete || away) return;
    const t = window.setTimeout(leave, SELF_OPEN_HOLD_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.complete, away]);

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={`rp-open no-print${away ? " away" : ""}`}
      style={{ background: GROUND, transition: reduced ? `opacity ${CROSSFADE_MS}ms linear, visibility ${CROSSFADE_MS}ms` : undefined }}
      role="dialog"
      aria-modal="true"
      aria-label="Your report is being written"
    >
      <div className="plate">
        <Orrery provisional={provisional} chart={chart} progress={progress.shown} />
        {progress.failed ? (
          <>
            <p className="fail">{failureLine ?? INTERNAL_LINE}</p>
            {onRetry && (
              <div className="door">
                <button type="button" onClick={onRetry} disabled={retrying}>{retrying ? "Starting…" : "Try again"}</button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="pct" aria-live="polite">{Math.floor(progress.shown)}%</p>
            <p className="lab">{progress.label}</p>
            {progress.door && (
              <div className="door">
                <button type="button" onClick={leave}>Start reading →</button>
                <small>The last chapters will be there when you reach them.</small>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default OpeningOverlay;
