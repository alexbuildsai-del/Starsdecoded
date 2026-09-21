/**
 * The report opens when the reader chooses (ADR-47). One overlay over the
 * page: the orrery, one percentage, one of five labels, and once the door
 * opens "Start reading" over one line with no numbers. At 100% the page
 * opens itself after a 1.2 s hold. A failed report keeps the overlay with
 * its message and "Try again". A report in revising is already readable and
 * shows no overlay.
 */
import { useEffect, useState } from "react";
import { Orrery } from "@/components/report/Orrery";
import type { Positions } from "@/lib/orrery";
import type { Progress } from "@/lib/progress";
import type { ChartData } from "@/types/chart";

export const SELF_OPEN_HOLD_MS = 1200;

export interface OpeningOverlayProps {
  progress: Progress;
  provisional: Positions | null;
  chart: ChartData | null;
  errorMessage?: string | null;
  onOpen: () => void;
  onRetry?: () => void;
  retrying?: boolean;
}

export function OpeningOverlay({ progress, provisional, chart, errorMessage, onOpen, onRetry, retrying }: OpeningOverlayProps) {
  const [away, setAway] = useState(false);

  // The 1.2 s hold at 100%, then the page opens on its own.
  useEffect(() => {
    if (!progress.complete || away) return;
    const t = window.setTimeout(() => { setAway(true); onOpen(); }, SELF_OPEN_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [progress.complete, away, onOpen]);

  function take() {
    setAway(true);
    onOpen();
  }

  return (
    <div className={`rp-open no-print${away ? " away" : ""}`} role="dialog" aria-modal="true" aria-label="Your report is being written">
      <div className="plate">
        <Orrery provisional={provisional} chart={chart} progress={progress.shown} />
        {progress.failed ? (
          <>
            <p className="fail">{errorMessage ?? "This report could not be written."}</p>
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
                <button type="button" onClick={take}>Start reading →</button>
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
