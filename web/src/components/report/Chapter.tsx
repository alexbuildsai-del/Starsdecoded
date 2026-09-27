import type { ReactNode } from "react";

/**
 * Divider, ghost numeral, counter, title, rule, intro, lede, then the body.
 * The divider carries `data-ch` so the rail and the sky can tell where a
 * chapter begins; every colour here reads `--accent`, which the page morphs as
 * the reader crosses from one chapter into the next. The counter is the two
 * padded numbers alone (ADR-100); the eyebrow's word stays on the divider.
 *
 * A chapter given an `aside` lays out in two columns above 960 px, the prose at
 * 64 ch with the aside sticky beside it; below that the aside follows the prose
 * (ADR-24).
 */
export function Chapter({
  number,
  total,
  eyebrow,
  title,
  intro,
  lede,
  aside,
  children,
}: {
  number: number;
  total: number;
  eyebrow: string;
  title: string;
  /** Sits between the title's rule and the lede: a chapter that introduces what follows (ADR-103). */
  intro?: ReactNode;
  lede?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const pad = String(number).padStart(2, "0");
  const padTotal = String(total).padStart(2, "0");
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
            <span className="font-numeric">{pad} / {padTotal}</span>
          </p>
          <h2>{title}</h2>
          <div className="rp-rule" />
          {intro}
          {lede && <p className="rp-lede">{lede}</p>}
        </header>
        {aside ? (
          <div className="rp-two">
            <div className="main">{children}</div>
            <aside className="side">{aside}</aside>
          </div>
        ) : children}
      </div>
    </section>
  );
}

export default Chapter;
