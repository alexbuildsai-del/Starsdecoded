import type { ReactNode } from "react";
import { ChapterDivider } from "@/components/report/ChapterDivider";

/**
 * Eyebrow, title, hairline, lede, prose. The title always outranks the first
 * line of prose beneath it (acceptance 5).
 */
export function Chapter({
  number,
  total,
  eyebrow,
  title,
  lede,
  accent,
  ghost,
  wide = false,
  children,
}: {
  number: number;
  total: number;
  eyebrow: string;
  title: string;
  lede?: string;
  accent: string;
  ghost?: string;
  /** Prose sits at 64 ch; a diagram or a grid takes the full measure. */
  wide?: boolean;
  children: ReactNode;
}) {
  const pad = String(number).padStart(2, "0");
  return (
    <section className="print-section">
      <ChapterDivider word={eyebrow} accent={accent} />
      <header className="relative mb-6">
        {ghost && (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 right-0 font-display text-[8rem] leading-none text-foreground/[0.045] select-none no-print"
          >
            {ghost}
          </span>
        )}
        <p className="font-label text-[11px] tracking-[0.2em] uppercase mb-2" style={{ color: accent }}>
          <span className="font-numeric">{pad} / {total}</span> · {eyebrow.toUpperCase()}
        </p>
        <h2 className="font-display text-3xl md:text-4xl leading-[1.15] tracking-[-0.01em] text-foreground">
          {title}
        </h2>
        <span className="mt-4 block h-px w-16" style={{ backgroundColor: accent }} />
        {lede && (
          <p className="mt-5 font-display text-lg md:text-xl leading-[1.5] text-foreground/80 max-w-[48ch]">
            {lede}
          </p>
        )}
      </header>
      <div className={wide ? "" : "max-w-[64ch]"}>{children}</div>
    </section>
  );
}

export default Chapter;
