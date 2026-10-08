/**
 * A contact's passes on one line (Review 08/10 note 1): forward passes in brass, backwards ones in rose, the stretch
 * the planet goes backwards shaded in rose, today a tick in indigo. The scale is linear in days. It is drawn at the width
 * the sheet gives it, so its words keep one size on a phone instead of shrinking with a fixed picture.
 */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TimelineEvent } from "@workspace/api-client-react";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { stripLayout } from "@/lib/passes-view";

const BRASS = "#D4B06A";
const ROSE = "#D98C8C";
const TODAY = "#8E9BE6";
const LINE = "#242C3B";
const PAPER = "#E8EBF2";
const DIM = "#AEB6C6";
const FAINT = "#7E889A";
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
  const color = (direction: string) => (direction === "forward" ? BRASS : ROSE);

  return (
    <div ref={box} className="overflow-hidden rounded-[14px] border border-[#242C3B] bg-[#0D1117]">
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
            <rect x={s.x1} y={axisY - 15} width={Math.max(s.x2 - s.x1, 1)} height={30} fill={ROSE} fillOpacity={0.16} />
            <text x={s.labelX} y={axisY - 21 - 14 * s.row} fill={ROSE} textAnchor="middle">
              {s.label}
            </text>
          </g>
        ))}
        <line x1={from} y1={axisY} x2={to} y2={axisY} stroke={LINE} strokeWidth={2} />
        {strip.lit.map((s, i) => (
          <line key={i} x1={s.x1} y1={axisY} x2={s.x2} y2={axisY} stroke={PAPER} strokeOpacity={0.55} strokeWidth={2} />
        ))}
        {strip.dots
          .filter((dot) => dot.row > 0)
          .map((dot, i) => (
            <line key={i} x1={dot.x} y1={axisY + 8} x2={dot.x} y2={axisY + 20 + ROW_HEIGHT * dot.row} stroke={LINE} strokeWidth={1} />
          ))}
        {strip.dots.map((dot, i) => {
          const y = axisY + ROW_HEIGHT * dot.row;
          return (
            <g key={i} textAnchor="middle">
              <circle cx={dot.x} cy={axisY} r={6} fill={color(dot.direction)} />
              <text x={dot.x} y={y + 31} fill={PAPER}>
                {dot.day}
              </text>
              <text x={dot.x} y={y + 45} fill={PAPER}>
                {dot.year}
              </text>
              <text x={dot.x} y={y + 59} fill={DIM}>
                {dot.direction}
              </text>
            </g>
          );
        })}
        {strip.today ? (
          <g>
            <line x1={strip.today.x} y1={axisY - 13} x2={strip.today.x} y2={axisY + 13} stroke={TODAY} strokeWidth={2} />
            <text
              x={Math.min(Math.max(strip.today.x, 4 + (strip.today.label.length * 6.6) / 2), strip.width - 4 - (strip.today.label.length * 6.6) / 2)}
              y={strip.today.y}
              fill={TODAY}
              textAnchor="middle"
            >
              {strip.today.label}
            </text>
          </g>
        ) : null}
        <g fill={FAINT} fontSize={10}>
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
