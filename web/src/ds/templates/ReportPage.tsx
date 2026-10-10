import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ReportPageProps {
  header?: ReactNode;
  /** The hero: the title, the chart, the first lines. */
  hero: ReactNode;
  /** The rail: chapter links; beside the chapters from 1024 px, hidden on a phone. */
  rail?: ReactNode;
  /** Chapters, each a ReportPageChapter. */
  children?: ReactNode;
  /** The closing: last words, sharing, the end. */
  closing?: ReactNode;
  footer?: ReactNode;
}

/** The reading tempo: a narrow column, a long line at 64ch, nothing beside the words. */
export function ReportPage({ header, hero, rail, children, closing, footer }: ReportPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-ground text-paper">
      {header}
      <main className="mx-auto w-full max-w-[880px] flex-1 px-5 pb-16 pt-8 sm:px-6">
        {hero}
        <div className="mt-10 lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10">
          {rail && <nav aria-label="Chapters" className="hidden lg:sticky lg:top-20 lg:block lg:self-start">{rail}</nav>}
          <div className="grid min-w-0 gap-12 lg:col-start-2">{children}</div>
        </div>
        {closing && <div className="mt-16 border-t border-line pt-10">{closing}</div>}
      </main>
      {footer}
    </div>
  );
}

export type ChapterAccent = 1 | 2 | 3 | 4 | 5 | 6;

// Written out whole so Tailwind sees every class.
const ACCENT: Record<ChapterAccent, string> = {
  1: "border-l-chapter-1",
  2: "border-l-chapter-2",
  3: "border-l-chapter-3",
  4: "border-l-chapter-4",
  5: "border-l-chapter-5",
  6: "border-l-chapter-6",
};

export interface ReportPageChapterProps {
  accent: ChapterAccent;
  id?: string;
  title?: ReactNode;
  children?: ReactNode;
}

export function ReportPageChapter({ accent, id, title, children }: ReportPageChapterProps) {
  return (
    <section id={id} className={cn("min-w-0 border-l-[3px] pl-4 sm:pl-6", ACCENT[accent])}>
      {title && <h2 className="m-0 mb-4 font-display text-page-title text-paper">{title}</h2>}
      <div className="grid max-w-[64ch] gap-4">{children}</div>
    </section>
  );
}

export default ReportPage;
