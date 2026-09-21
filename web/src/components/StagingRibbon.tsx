export function StagingRibbon() {
  return (
    <div
      role="status"
      // On a phone the badge sits in the top bar, so it never lands on the hero's corner text (ADR-59).
      className="pointer-events-none fixed bottom-3 left-3 z-[60] rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 font-label text-[10px] tracking-[0.2em] uppercase text-amber-200 backdrop-blur-sm max-sm:bottom-auto max-sm:left-1/2 max-sm:top-4 max-sm:-translate-x-1/2"
    >
      Staging
    </div>
  );
}
