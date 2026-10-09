/**
 * The generation screen is its own screen (ADR-47, ADR-59): while the report
 * is not open, `/report/:id` renders it full-bleed, the document scroll is
 * locked on the root and focus stays inside. The story on the shared grid, one
 * progress bar with its percentage and what is being written, and once the door
 * opens "Start reading" over one line with no numbers. Nothing opens the report
 * but that tap (ADR-393): the finished story holds still on it. Taking the
 * door crossfades the screen out, under Reduce Motion too, then hands the
 * page back so it can unmount it, show the report at the top and run the
 * gather once. A failed report keeps the screen with its message, and "Try
 * again", free, only for a reader the server lets rewrite it (MB-169); one we
 * finally could not write shows its line that the credit is back and no
 * button (ADR-313). A report in
 * revising is already readable and shows no screen.
 */
import { useEffect, useRef, useState } from "react";
import { LoadingFrame, type LoadingSlots } from "@/components/loading/LoadingFrame";
import { ProgressBar } from "@/components/loading/ProgressBar";
import type { Progress } from "@/lib/progress";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { TRY_AGAIN } from "@/lib/home-view";

/** The crossfade out, the one move the screen makes when it leaves. */
export const CROSSFADE_MS = 350;

export interface OpeningOverlayProps {
  progress: Progress;
  /** The coded line a failed report shows (ADR-84); the internal message never reaches the page. */
  failureLine?: string | null;
  onOpen: () => void;
  /** Try again. Left out where the reader may not rewrite the report, a shared reader say, so no button leads to a refusal. */
  onRetry?: () => void;
  retrying?: boolean;
  /** The story on the shared grid (ADR-351). */
  slots: LoadingSlots;
}

/** The line under a finished story: the reader opens the report, never the page. */
export const READY_SUBTITLE = "Tap Start reading to open it.";

/** The bar from the report's own progress and label (ADR-394); no timer and no guess go into it, and 100 is only the finished report. */
export function barOf(progress: Progress): { pct: number; line: string } {
  if (progress.complete) return { pct: 100, line: "100% · your report is ready" };
  const pct = Math.min(99, Math.floor(progress.shown));
  return { pct, line: `${pct}% · ${progress.label.toLowerCase()}` };
}

/** The `internal` line of the failure vocabulary, the fallback when a failed report carries no code yet. */
export const INTERNAL_LINE = "Something went wrong on our side. We've been alerted.";

/**
 * The grid's slots when the story cannot be told yet, a chart missing: a still frame with the words the writing
 * step uses, so the percentage, the label and the door keep their places.
 */
export function plainSlots(progress: Progress): LoadingSlots {
  return {
    title: progress.complete ? "Your report is ready" : "Now writing your report",
    subtitle: progress.complete ? READY_SUBTITLE : progress.door ? "The first chapters are in." : "It opens here when it's ready.",
    stage: null,
  };
}

/** The hero's ground, so the screen is a page of its own and not a veil over one. */
const GROUND = "radial-gradient(120% 92% at 50% 38%, #141B28 0%, #0B0E14 56%, #06080C 100%)";

export function OpeningOverlay({ progress, failureLine, onOpen, onRetry, retrying, slots }: OpeningOverlayProps) {
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

  // The tap is the only way in, so a finished story takes focus to its button, as Timeline's setup does.
  const start = useRef<HTMLButtonElement>(null);
  const finished = progress.complete && !progress.failed;
  useEffect(() => {
    if (finished) start.current?.focus({ preventScroll: true });
  }, [finished]);

  const retry = onRetry && (
    <div className="door">
      <button type="button" onClick={onRetry} disabled={retrying} aria-describedby="try-again-free">{retrying ? "Starting…" : TRY_AGAIN.label}</button>
      <small id="try-again-free">{TRY_AGAIN.free}</small>
    </div>
  );
  const openDoor = progress.door && (
    <div className="door">
      <button ref={start} type="button" onClick={leave}>Start reading →</button>
      {!progress.complete && <small>We'll finish the last chapters while you read.</small>}
    </div>
  );

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={`rp-open rp-grid no-print${away ? " away" : ""}`}
      style={{ background: GROUND, transition: reduced ? `opacity ${CROSSFADE_MS}ms linear, visibility ${CROSSFADE_MS}ms` : undefined }}
      role="dialog"
      aria-modal="true"
      aria-label="Your report is being written"
    >
      <LoadingFrame
        {...slots}
        detail={progress.failed ? <p className="fail">{failureLine ?? INTERNAL_LINE}</p> : slots.detail}
        pct={progress.failed ? undefined : <ProgressBar {...barOf(progress)} />}
        door={progress.failed ? retry : openDoor}
      />
    </div>
  );
}

export default OpeningOverlay;
