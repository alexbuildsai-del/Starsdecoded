import type { ReactNode } from "react";

/** One picture on a chart page, with what it shows. */
export function Fig({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="grid content-start gap-2">
      <figcaption className="font-label text-label uppercase text-paper-dim">{caption}</figcaption>
      {children}
    </figure>
  );
}

export function Row({ min = 240, children }: { min?: number; children: ReactNode }) {
  return (
    <div className="grid items-start gap-8" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}>
      {children}
    </div>
  );
}
