import type { ReactNode } from "react";

export interface LoadingStorySlots {
  counter?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  stage: ReactNode;
  detail?: ReactNode;
  /** The progress bar with its percentage line. */
  pct?: ReactNode;
  door?: ReactNode;
}

/**
 * The one grid for the Personal, Compatibility and Timeline loading screens (ADR-351).
 * The slot places live in index.css under `.lf`; a slot never moves with its content.
 * The parent gives it a height (the generation screen is full-bleed).
 */
export function LoadingStory({ counter, title, subtitle, stage, detail, pct, door }: LoadingStorySlots) {
  return (
    <div className="lf-wrap">
      <div className="lf">
        {counter && <div className="lf-counter">{counter}</div>}
        <h2 className="lf-title">{title}</h2>
        {subtitle && <p className="lf-subtitle">{subtitle}</p>}
        <div className="lf-stage">{stage}</div>
        {detail && <div className="lf-detail">{detail}</div>}
        {pct && <div className="lf-pct top-[85%] h-[5.5%]">{pct}</div>}
        {door && <div className="lf-door">{door}</div>}
      </div>
    </div>
  );
}

export default LoadingStory;
