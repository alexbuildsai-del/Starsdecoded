import { useLocation } from "wouter";
import { setPreview, useMounted, usePreviewFlag, withoutPreview } from "@/lib/prelaunch";
import { cn } from "@/lib/utils";
import { isPublicPath } from "@/site/site";

/** Ends the preview for the tab and drops ?prelaunch=1 from the address, so a reload keeps it ended. */
function exitPreview() {
  setPreview(false);
  const { pathname, search, hash } = window.location;
  const rest = withoutPreview(search);
  if (rest !== search) window.history.replaceState(window.history.state, "", `${pathname}${rest}${hash}`);
}

/** Drawn after mount only, so the prerendered page stays the same on every host and the tab's preview is known. */
export function StagingRibbon() {
  const mounted = useMounted();
  const preview = usePreviewFlag();
  const [location] = useLocation();
  if (!mounted) return null;

  // On a phone the public site's sticky nav and its Get my report sit at the top, so the badge goes to the bottom there
  // and in the preview, whose longer line has no room in a top bar. An app screen keeps it at the top, clear of its own
  // bottom controls (ADR-59).
  const atBottom = preview || isPublicPath(location);

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-3 left-3 z-[60] flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 font-label text-[10px] tracking-[0.2em] uppercase text-amber-200 backdrop-blur-sm",
        atBottom
          ? "max-sm:bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:left-1/2 max-sm:-translate-x-1/2"
          : "max-sm:bottom-auto max-sm:left-1/2 max-sm:top-4 max-sm:-translate-x-1/2",
      )}
    >
      <span role="status">{preview ? "Staging · Prelaunch preview" : "Staging"}</span>
      {preview && (
        <>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={exitPreview}
            aria-label="Exit the prelaunch preview"
            className="pointer-events-auto rounded uppercase underline underline-offset-2 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-200"
          >
            Exit
          </button>
        </>
      )}
    </div>
  );
}
