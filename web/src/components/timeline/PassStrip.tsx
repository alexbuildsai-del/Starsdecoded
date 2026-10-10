/**
 * A contact's passes on one line (Review 08/10 note 1): forward passes in brass, backwards ones in rose, the stretch
 * the planet goes backwards shaded in rose, today a tick in indigo. The scale is linear in days. It is drawn at the width
 * the sheet gives it, so its words keep one size on a phone instead of shrinking with a fixed picture.
 */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TimelineEvent } from "@workspace/api-client-react";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { stripLayout } from "@/lib/passes-view";

const SIZE = 11;
const ROW_HEIGHT = 42;
// A phone's sheet is about this wide inside its padding; the first paint uses it until the box is measured.
const FIRST_WIDTH = 330;

export function PassStrip({ event, now, zone }: { event: TimelineEvent; now: Date; zone: string }) {
  const { order } = useEntryFormat();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FIRST_WIDTH);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const read = () => setWidth(Math.max(240, Math.round(el.clientWidth)));
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const watch = new ResizeObserver(read);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  const strip = useMemo(() => stripLayout(event, now, zone, order, width), [event, now, zone, order, width]);
  if (!strip) return null;
  const { axisY, from, to } = strip;
  const dotFill = (direction: string) => (direction === "forward" ? "fill-brass" : "fill-rose");

  return (
    <div ref={box} className="overflow-hidden rounded-card border border-line bg-ground">
      <svg
        role="img"
        aria-label={strip.summary}
        viewBox={`0 0 ${strip.width} ${strip.height}`}
        width={strip.width}
        height={strip.height}
        className="block max-w-full font-numeric"
        fontSize={SIZE}
      >
        {strip.stretches.map((s, i) => (
          <g key={i}>
            <rect x={s.x1} y={axisY - 15} width={Math.max(s.x2 - s.x1, 1)} height={30} className="fill-rose" fillOpacity={0.16} />
            <text x={s.labelX} y={axisY - 21 - 14 * s.row} className="fill-rose" textAnchor="middle">
              {s.label}
            </text>
          </g>
        ))}
        <line x1={from} y1={axisY} x2={to} y2={axisY} className="stroke-line" strokeWidth={2} />
        {strip.lit.map((s, i) => (
          <line key={i} x1={s.x1} y1={axisY} x2={s.x2} y2={axisY} className="stroke-paper" strokeOpacity={0.55} strokeWidth={2} />
        ))}
        {strip.dots
          .filter((dot) => dot.row > 0)
          .map((dot, i) => (
            <line key={i} x1={dot.x} y1={axisY + 8} x2={dot.x} y2={axisY + 20 + ROW_HEIGHT * dot.row} className="stroke-line" strokeWidth={1} />
          ))}
        {strip.dots.map((dot, i) => {
          const y = axisY + ROW_HEIGHT * dot.row;
          return (
            <g key={i} textAnchor="middle">
              <circle cx={dot.x} cy={axisY} r={6} className={dotFill(dot.direction)} />
              <text x={dot.x} y={y + 31} className="fill-paper">
                {dot.day}
              </text>
              <text x={dot.x} y={y + 45} className="fill-paper">
                {dot.year}
              </text>
              <text x={dot.x} y={y + 59} className="fill-paper-dim">
                {dot.direction}
              </text>
            </g>
          );
        })}
        {strip.today ? (
          <g>
            <line x1={strip.today.x} y1={axisY - 13} x2={strip.today.x} y2={axisY + 13} className="stroke-indigo-lt" strokeWidth={2} />
            <text
              x={Math.min(Math.max(strip.today.x, 4 + (strip.today.label.length * 6.6) / 2), strip.width - 4 - (strip.today.label.length * 6.6) / 2)}
              y={strip.today.y}
              className="fill-indigo-lt"
              textAnchor="middle"
            >
              {strip.today.label}
            </text>
          </g>
        ) : null}
        <g className="fill-muted" fontSize={10}>
          <text x={from} y={strip.years.y}>
            {strip.years.left}
          </text>
          {strip.years.right ? (
            <text x={to} y={strip.years.y} textAnchor="end">
              {strip.years.right}
            </text>
          ) : null}
        </g>
      </svg>
    </div>
  );
}

export default PassStrip;
