import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SitePageProps {
  /** The TopBar. */
  header: ReactNode;
  /** The hero: kicker, title, lede, actions. */
  hero: ReactNode;
  /** Sections, each one a SitePageSection with one job. */
  children?: ReactNode;
  /** The Footer. */
  footer: ReactNode;
}

/** The marketing tempo: slow, wide, one idea per section. */
export function SitePage({ header, hero, children, footer }: SitePageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-ground text-paper">
      {header}
      <main className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-5xl px-5 pb-12 pt-14 sm:px-8 md:pb-20 md:pt-24">{hero}</div>
        {children}
      </main>
      {footer}
    </div>
  );
}

export interface SitePageSectionProps {
  id?: string;
  /** The kicker over the title. */
  kicker?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function SitePageSection({ id, kicker, title, children, className }: SitePageSectionProps) {
  return (
    <section id={id} className={cn("mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 md:py-20", className)}>
      {kicker && <p className="m-0 mb-3 font-label text-label uppercase text-label-dim">{kicker}</p>}
      {title && <h2 className="m-0 mb-6 font-display text-section text-paper md:text-[54px]">{title}</h2>}
      <div className="grid gap-6">{children}</div>
    </section>
  );
}

export default SitePage;
