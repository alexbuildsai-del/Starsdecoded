import type { ReactNode } from "react";

/** What a loading screen puts on the grid (ADR-351); the slot's place is the frame's, never the content's. */
export interface LoadingSlots {
  counter?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  stage: ReactNode;
  detail?: ReactNode;
  /** After the frame, outside the grid, for what a screen adds below it. */
  below?: ReactNode;
}

export interface LoadingFrameProps extends LoadingSlots {
  pct?: ReactNode;
  door?: ReactNode;
}

/**
 * The one grid every loading screen shares. Each slot is placed at its share
 * of the frame's height (see `.lf` in index.css), so a long title or a missing
 * subtitle never moves the part under it, on a phone or on a computer.
 */
export function LoadingFrame({ counter, title, subtitle, stage, detail, below, pct, door }: LoadingFrameProps) {
  return (
    <div className="lf-wrap">
      <div className="lf">
        {counter && <div className="lf-counter">{counter}</div>}
        <h2 className="lf-title">{title}</h2>
        {subtitle && <p className="lf-subtitle">{subtitle}</p>}
        <div className="lf-stage">{stage}</div>
        {detail && <div className="lf-detail">{detail}</div>}
        {pct && <div className="lf-pct">{pct}</div>}
        {door && <div className="lf-door">{door}</div>}
      </div>
      {below}
    </div>
  );
}

export default LoadingFrame;
