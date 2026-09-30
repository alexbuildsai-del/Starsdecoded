import { Link } from "wouter";
import { useMounted } from "@/lib/prelaunch";

/**
 * The admin's reminder, on production before launch, that visitors see the
 * public site with the waitlist over its buttons, not the app (ADR-141). Drawn
 * after mount only, since the admin is known only then.
 */
export function PrelaunchRibbon() {
  const mounted = useMounted();
  if (!mounted) return null;

  return (
    <Link
      href="/admin/waitlist"
      className="fixed bottom-3 left-3 z-[60] rounded-full border border-primary/40 bg-primary/15 px-3 py-1 font-label text-[10px] tracking-[0.2em] uppercase text-primary-foreground/90 backdrop-blur-sm hover:bg-primary/25 max-sm:bottom-auto max-sm:left-1/2 max-sm:top-4 max-sm:w-max max-sm:max-w-[calc(100vw-2rem)] max-sm:-translate-x-1/2 max-sm:text-center"
    >
      Before launch · visitors see the site with the waitlist
    </Link>
  );
}
