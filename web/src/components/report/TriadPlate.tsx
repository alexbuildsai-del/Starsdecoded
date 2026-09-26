/**
 * The ringed triad plate: a small ring with the Sun, the Moon and the rising
 * marker at their true degrees, the Moon's band as an arc, no rows. The
 * compatibility hero drew it until R09 and no longer does (ADR-99); it lives
 * here because the dashboard sky card keeps its ring (ADR-92, MB-86). Nothing
 * on main renders it yet.
 */
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";
import { pointAt, theta } from "@/components/chart/wheel-geometry";
import { layoutHero, moonArc } from "@/components/report/hero-layout";
import { AngleGlyphShape } from "@/components/report/AngleGlyph";
import type { ChartData } from "@/types/chart";

const SKY = "var(--sky)";
const SKY_DIM = "var(--sky-dim)";

export interface TriadPlateProps {
  chart: ChartData;
  name: string;
  className?: string;
}

export function TriadPlate({ chart, name, className }: TriadPlateProps) {
  const asc = chart.angles?.ascendant ?? null;
  const blind = asc === null;
  const sun = chart.planets.sun;
  const moon = chart.planets.moon;
  const W = 220;
  const cx = W / 2;
  const cy = W / 2;
  const R = 72;
  const frame = asc ? asc.absoluteDegree : 0;
  const ascTheta = theta(frame, frame);
  const ascAt = pointAt(cx, cy, R, ascTheta);
  const arc = moon?.band ? moonArc(cx, cy, R, frame, moon.band) : null;
  const layout = layoutHero({
    cx, cy, ringRadius: R, frameDegree: frame,
    bodies: [
      sun && { key: "sun", absoluteDegree: sun.absoluteDegree, size: 44 },
      moon && { key: "moon", absoluteDegree: moon.absoluteDegree, size: 28 },
    ].filter(Boolean) as { key: string; absoluteDegree: number; size: number }[],
    labelWidth: 0, labelHeight: 0, obstacles: [],
  });
  return (
    <svg
      viewBox={`0 0 ${W} ${W}`}
      className={className ?? "block w-[min(220px,40vw)] h-auto"}
      role="img"
      aria-label={`${name}: Sun, Moon and rising at their true positions${blind ? "; the horizon is not drawn" : ""}`}
      data-side-blind={blind || undefined}
    >
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={SKY} strokeOpacity={0.42} />
      {!blind && (
        <line
          x1={pointAt(cx, cy, R + 14, ascTheta).x.toFixed(1)} y1={pointAt(cx, cy, R + 14, ascTheta).y.toFixed(1)}
          x2={pointAt(cx, cy, R + 14, theta(frame + 180, frame)).x.toFixed(1)} y2={pointAt(cx, cy, R + 14, theta(frame + 180, frame)).y.toFixed(1)}
          stroke={SKY_DIM} strokeOpacity={0.55} strokeDasharray="2 5"
        />
      )}
      {arc && <path d={arc.d} fill="none" stroke={SKY} strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round" data-moon-arc />}
      {layout.bodies.map((b) => (
        <image key={b.key} href={b.key === "sun" ? SUN_HERO : PLANET_RENDERS[b.key]} x={b.x - b.size / 2} y={b.y - b.size / 2} width={b.size} height={b.size} />
      ))}
      {!blind && <AngleGlyphShape x={ascAt.x} y={ascAt.y} r={7} direction={ascTheta} stroke={SKY} fill="#0B0E14" strokeWidth={1.3} />}
    </svg>
  );
}

export default TriadPlate;
