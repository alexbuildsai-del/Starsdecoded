import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface FooterColumn {
  heading: string;
  /** Links the caller draws, so the footer holds no router. */
  links: ReactNode[];
}

export interface FooterProps {
  /** The wordmark link. */
  brand: ReactNode;
  /** The one line under the wordmark. */
  tagline: ReactNode;
  columns: FooterColumn[];
  /** The method line and the page's date, at the base. */
  base: ReactNode[];
  className?: string;
}

export function Footer({ brand, tagline, columns, base, className }: FooterProps) {
  return (
    <footer className={cn("border-t border-brass/25 bg-void py-9 text-paper-dim", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-7 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <div className="text-paper">{brand}</div>
            <p className="mt-3 max-w-[30em] text-small text-muted">{tagline}</p>
          </div>
          {columns.map((column) => (
            <div key={column.heading}>
              <h2 className="mb-3.5 font-label text-label uppercase text-muted">{column.heading}</h2>
              <ul className="m-0 grid list-none gap-1 p-0 text-small">
                {column.links.map((link, i) => (
                  <li key={i} className="[&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:text-paper-dim [&_a]:no-underline [&_a:hover]:text-paper">
                    {link}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-line-soft pt-4 text-caption text-muted">
          {base.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default Footer;
