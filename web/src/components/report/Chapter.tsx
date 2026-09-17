import type { ReactNode } from "react";

/**
 * Divider, ghost numeral, eyebrow, title, rule, lede, then the body. The
 * divider carries `data-ch` so the rail and the sky can tell where a chapter
 * begins; every colour here reads `--accent`, which the page morphs as the
 * reader crosses from one chapter into the next.
 */
export function Chapter({
  number,
  total,
  eyebrow,
  title,
  lede,
  children,
}: {
  number: number;
  total: number;
  eyebrow: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  const pad = String(number).padStart(2, "0");
  return (
    <section className="print-section" id={`chapter-${number}`}>
      <div className="rp-div" data-ch={number - 1} aria-hidden>
        <span className="ln" />
        <span className="mk">{eyebrow}</span>
      </div>
      <div className="rp-chapter">
        <header className="rp-head">
          <span className="rp-bignum no-print" aria-hidden>{pad}</span>
          <p className="rp-eye">
            <span className="font-numeric">{pad} / {total}</span> · {eyebrow.toUpperCase()}
          </p>
          <h2>{title}</h2>
          <div className="rp-rule" />
          {lede && <p className="rp-lede">{lede}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

export default Chapter;
