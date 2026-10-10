import { Link, useLocation } from "wouter";
import { OPEN_BEFORE_LAUNCH, useMounted, usePrelaunchView } from "@/lib/prelaunch";
import { cn } from "@/lib/utils";
import { isPublicPath } from "@/site/site";

/**
 * The admin's reminder, on production before launch, that visitors see the
 * public site with the waitlist over its buttons, not the app (ADR-141). Drawn
 * after mount only, since the admin is known only then.
 */
export function PrelaunchRibbon() {
  const mounted = useMounted();
  const visitorView = usePrelaunchView();
  const [location] = useLocation();
  if (!mounted) return null;

  // On a phone the public site's sticky nav sits at the top, so the reminder goes to the bottom there. An app path
  // shows a visitor the waitlist page, nav included, so it counts as the site too (App.tsx's AppGate); an app screen
  // keeps the top, clear of its own bottom controls.
  const onSite = isPublicPath(location) || (visitorView && !OPEN_BEFORE_LAUNCH.test(location));

  return (
    <Link
      href="/admin/waitlist"
      className={cn(
        "fixed bottom-3 left-3 z-[60] rounded-full border border-indigo/40 bg-indigo/15 px-3 py-1 font-label text-kicker tracking-[0.2em] uppercase text-paper backdrop-blur-sm hover:bg-indigo/25 max-sm:left-1/2 max-sm:w-max max-sm:max-w-[calc(100vw-2rem)] max-sm:-translate-x-1/2 max-sm:text-center",
        onSite ? "max-sm:bottom-[max(0.75rem,env(safe-area-inset-bottom))]" : "max-sm:bottom-auto max-sm:top-4",
      )}
    >
      Before launch · visitors see the site with the waitlist
    </Link>
  );
}
