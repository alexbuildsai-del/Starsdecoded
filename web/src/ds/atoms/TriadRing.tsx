import { tokens } from "@workspace/design";
import type { ChartData } from "@/types/chart";
import { SignRing } from "@/ds/atoms/SignRing";
import { PlanetBodyMark } from "@/ds/atoms/PlanetBody";
import { arcPath, assignLanes, norm360, pointAt, theta, wheelRadii } from "@/components/chart/wheel-geometry";

const c = tokens.color;

export interface TriadRingProps {
  chart: ChartData;
  /** Whose chart; the accessible name keeps today's words. */
  name: string;
  size: number;
  className?: string;
}

export interface TriadBody {
  key: "sun" | "moon";
  angle: number;
  radius: number;
  size: number;
}

/** The rising degree the ring is framed on: the Ascendant, or 0 for a chart with no birth time. */
export function ringFrame(chart: ChartData): number {
  return chart.angles?.ascendant?.absoluteDegree ?? 0;
}

/** Where the Sun and the Moon sit: each at theta(longitude), only the lane moves when they crowd. */
export function triadBodies(chart: ChartData, size: number): TriadBody[] {
  const r = wheelRadii(size);
  const body = Math.max(r.node, 16);
  const asc = ringFrame(chart);
  const found = (["sun", "moon"] as const).flatMap((key) => {
    const p = chart.planets[key];
    return p ? [{ key, absoluteDegree: p.absoluteDegree }] : [];
  });
  return assignLanes(found, asc, { lanes: r.lanes, node: body, gap: size * 0.01 }).map((p) => ({
    key: p.key as "sun" | "moon",
    angle: p.theta,
    radius: p.radius,
    size: body,
  }));
}

/** The Sun, Moon and rising state: the sign ring without ticks, the two lights at their degrees, the horizon and its marker. */
export function TriadRing({ chart, name, size, className }: TriadRingProps) {
  const r = wheelRadii(size);
  const cx = r.centre;
  const asc = ringFrame(chart);
  const blind = !chart.angles?.ascendant;
  const east = theta(asc, asc);
  const west = east + 180;
  const markerR = Math.max(3, size * 0.0142);
  const band = blind ? chart.planets.moon?.band : undefined;
  const bandStart = band ? theta(band.fromDegree, asc) : 0;
  const bandSpan = band ? norm360(band.toDegree - band.fromDegree) : 0;
  const reach = size * 0.398;

  function line(angle: number, width: number, opacity: number) {
    const a = pointAt(cx, cx, r.aspect, angle);
    const b = pointAt(cx, cx, reach, angle);
    return (
      <line
        x1={a.x.toFixed(2)} y1={a.y.toFixed(2)} x2={b.x.toFixed(2)} y2={b.y.toFixed(2)}
        stroke={c.paper} strokeOpacity={opacity} strokeWidth={width}
      />
    );
  }

  const tail = pointAt(cx, cx, r.signOuter, east);
  const tip = pointAt(cx, cx, r.signOuter + markerR + size * 0.02, east);
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={`${name}: Sun, Moon and rising at their true positions${blind ? "; the horizon is not drawn" : ""}`}
      data-side-blind={blind || undefined}
    >
      <SignRing size={size} asc={asc} ticks={false} innerCircle={false} />
      {!blind && (
        <g data-horizon>
          {line(east, (1.5 * size) / 600, 0.45)}
          {line(west, size / 600, 0.25)}
          <g data-rising-marker>
            <line
              x1={tail.x.toFixed(2)} y1={tail.y.toFixed(2)} x2={tip.x.toFixed(2)} y2={tip.y.toFixed(2)}
              stroke={c.paper} strokeWidth={Math.max(1.2, size * 0.003)} strokeLinecap="round"
            />
            <circle cx={tail.x.toFixed(2)} cy={tail.y.toFixed(2)} r={markerR} fill={c.ground} stroke={c.paper} strokeWidth={Math.max(1.2, size * 0.003)} />
            <circle cx={tail.x.toFixed(2)} cy={tail.y.toFixed(2)} r={markerR * 0.35} fill={c.paper} />
          </g>
        </g>
      )}
      {band && (
        <path
          d={arcPath(cx, cx, r.lanes[0], bandStart, bandStart + bandSpan)}
          fill="none" stroke={c["paper-dim"]} strokeOpacity={0.7} strokeWidth={size * 0.011} strokeLinecap="round" data-moon-band
        />
      )}
      {triadBodies(chart, size).map((b) => {
        const p = pointAt(cx, cx, b.radius, b.angle);
        return <PlanetBodyMark key={b.key} body={b.key} size={b.size} x={p.x} y={p.y} disc />;
      })}
    </svg>
  );
}

export default TriadRing;
