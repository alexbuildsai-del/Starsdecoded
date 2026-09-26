import { Link } from "wouter";

/** The admin's reminder, on production before launch, that visitors see the waitlist and not this (ADR-141). */
export function PrelaunchRibbon() {
  return (
    <Link
      href="/admin/waitlist"
      className="fixed bottom-3 left-3 z-[60] rounded-full border border-primary/40 bg-primary/15 px-3 py-1 font-label text-[10px] tracking-[0.2em] uppercase text-primary-foreground/90 backdrop-blur-sm hover:bg-primary/25 max-sm:bottom-auto max-sm:left-1/2 max-sm:top-4 max-sm:-translate-x-1/2"
    >
      Before launch · visitors see the waitlist
    </Link>
  );
}
