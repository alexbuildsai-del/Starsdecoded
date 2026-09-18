/**
 * A small ring showing the nodal axis and Chiron at their true degrees, drawn
 * with the wheel's own geometry so it cannot disagree with the wheel above it.
 * Anything that looks like a chart is drawn from the chart (§9).
 */
import { PLANET_GLYPHS } from "@/types/chart";
import { pointAt, theta } from "@/components/chart/wheel-geometry";
import type { ChartData } from "@/types/chart";

const SIZE = 220;
const R = 78;
const BRASS = "hsl(var(--brass))";

export function NodalAxis({ chartData }: { chartData: ChartData }) {
  const asc = chartData.angles.ascendant.absoluteDegree;
  const north = chartData.planets.north_node;
  const south = chartData.planets.south_node;
  const chiron = chartData.planets.chiron;
  if (!north || !south) return null;

  const c = SIZE / 2;
  const at = (deg: number, radius = R) => pointAt(c, c, radius, theta(deg, asc));
  const n = at(north.absoluteDegree);
  const s = at(south.absoluteDegree);

  const marks = [
    { key: "north_node", label: "North Node", planet: north, point: n },
    { key: "south_node", label: "South Node", planet: south, point: s },
    chiron && { key: "chiron", label: "Chiron", planet: chiron, point: at(chiron.absoluteDegree) },
  ].filter(Boolean) as { key: string; label: string; planet: { sign: string; degree: number }; point: { x: number; y: number } }[];

  return (
    <div>
      <span className="rp-lab">The axis</span>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mt-2 block w-full" role="img" aria-label="The nodal axis and Chiron at their degrees">
        <circle cx={c} cy={c} r={R} fill="none" stroke={BRASS} strokeOpacity={0.35} />
        <line
          x1={n.x.toFixed(1)} y1={n.y.toFixed(1)} x2={s.x.toFixed(1)} y2={s.y.toFixed(1)}
          stroke={BRASS} strokeOpacity={0.6} strokeDasharray="2 4"
        />
        {marks.map((m) => (
          <g key={m.key}>
            <circle cx={m.point.x.toFixed(1)} cy={m.point.y.toFixed(1)} r={11} fill="hsl(var(--background))" stroke={BRASS} strokeOpacity={0.7} />
            <text
              x={m.point.x.toFixed(1)} y={(m.point.y + 4).toFixed(1)} textAnchor="middle"
              fontSize={12} fill={BRASS}
            >
              {PLANET_GLYPHS[m.key] ?? "·"}
            </text>
          </g>
        ))}
      </svg>
      <dl className="mt-3 grid gap-1.5">
        {marks.map((m) => (
          <div key={m.key} className="flex items-baseline justify-between gap-3">
            <dt className="font-label text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">{m.label}</dt>
            <dd className="font-numeric text-[11px] text-[var(--paper-dim)]">
              {m.planet.degree.toFixed(1)}° {m.planet.sign}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default NodalAxis;
