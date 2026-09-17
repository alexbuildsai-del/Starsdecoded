export function ChapterDivider({ word, accent }: { word: string; accent: string }) {
  return (
    <div className="flex items-center gap-4 pt-16 pb-8 print-page-break" aria-hidden>
      <span className="h-px flex-1 bg-border/50" />
      <span
        className="font-label text-[10px] tracking-[0.28em] uppercase"
        style={{ color: accent }}
      >
        {word}
      </span>
      <span className="h-px flex-1 bg-border/50" />
    </div>
  );
}

export default ChapterDivider;
