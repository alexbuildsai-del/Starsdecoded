/**
 * Whole-sign houses on the product's band, split along its two text lines
 * (annex /learn/whole-sign-houses): the zodiac on the outer half turns, and the
 * twelve houses on the inner half stay put, counted from the east downward. At
 * rest the halves meet sign for house, as a whole-sign chart has them.
 *
 * Given a chart, the ring stands on its rising sign and carries its ten bodies
 * at their true degrees, crowding moved inward and never around (ADR-17), with
 * the 1st house's first degree on the east, as the report's own wheel frames
 * it. The Ascendant is its point, not a body (ADR-49).
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { houseBandLabel } from "@/components/chart/NatalWheel";
import { SIGN_ORDER, arcLabelPath, assignLanes, pointAt, theta, wedgePath, wheelRadii } from "@/components/chart/wheel-geometry";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { renderFor } from "@/lib/planet-renders";
import { cn } from "@/lib/utils";
import type { ChartData } from "@/types/chart";
import { risingIndex } from "@/site/lib/learn";
import { BODIES, ease } from "@/site/lib/sky";

const PLATE = 600;
const R = wheelRadii(PLATE);
const C = R.centre;
/** NatalWheel's padding, which leaves room outside the band for the horizon's words and the Ascendant's tick. */
const PAD = PLATE * 0.085;
const VIEW = PLATE + 2 * PAD;
/** Between the band's two text lines: the zodiac turns outside it and the houses stay inside. */
const SPLIT = (R.bandSign + R.bandHouse) / 2;
const BRASS = "hsl(var(--brass))";
const TURN_MS = 900;
const HOUSES = Array.from({ length: 12 }, (_, i) => i + 1);
const f2 = (n: number) => n.toFixed(2);

function Spoke({ from, to, at, stroke, width = 1, round = false }: {
  from: number; to: number; at: number; stroke: string; width?: number; round?: boolean;
}) {
  const p = pointAt(C, C, from, at);
  const q = pointAt(C, C, to, at);
  return (
    <line x1={f2(p.x)} y1={f2(p.y)} x2={f2(q.x)} y2={f2(q.y)} stroke={stroke} strokeWidth={width} strokeLinecap={round ? "round" : undefined} />
  );
}

/** A label along its arc, set the right way up wherever the arc sits. */
function ArcLabel({ id, radius, from, size, spacing, fill, children }: {
  id: string; radius: number; from: number; size: number; spacing: number; fill: string; children: string;
}) {
  return (
    <>
      <path id={id} d={arcLabelPath(C, C, radius, from + 1.5, from + 28.5)} fill="none" />
      <text fontFamily="Space Grotesk, sans-serif" fontSize={size} letterSpacing={spacing} fill={fill} dominantBaseline="middle">
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {children}
        </textPath>
      </text>
    </>
  );
}

/**
 * The zodiac's turn in degrees, eased the short way to each new rising sign.
 * The first paint and reduced motion take it at once, so the prerendered ring
 * is the settled one.
 */
function useTurn(target: number): number {
  const reduced = useReducedMotion();
  const [turn, setTurn] = useState(target);
  const drawn = useRef(target);

  useEffect(() => {
    const from = drawn.current;
    const way = ((((target - from) % 360) + 540) % 360) - 180;
    if (Math.abs(way) < 1e-6) return;
    if (reduced) {
      drawn.current = target;
      setTurn(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / TURN_MS);
      drawn.current = u < 1 ? from + way * ease(u) : target;
      setTurn(drawn.current);
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);

  return turn;
}

export type HouseRingProps = { label: string; className?: string } & (
  /** The bare ring: the system only, with no planets. */
  | { rising: number }
  /** A chart with its horizon; `lit` houses and `litBodies` are ringed. */
  | { chart: ChartData; lit?: readonly number[]; litBodies?: readonly string[] }
);

export function HouseRing(props: HouseRingProps) {
  const chart = "chart" in props ? props.chart : null;
  const rising = Math.max(0, "chart" in props ? risingIndex(props.chart) : props.rising);
  const lit = "chart" in props ? props.lit ?? [] : [1];
  const litBodies = "chart" in props ? props.litBodies ?? [] : [];
  const uid = `hr${useId().replace(/[^\w-]/g, "")}`;
  const turn = useTurn(rising * 30);
  const litKey = lit.join(",");

  // The houses never move, so a turn redraws only the zodiac.
  const houses = useMemo(
    () => (
      <g>
        {HOUSES.map((h) => {
          const from = 180 + (h - 1) * 30;
          const on = litKey.split(",").includes(String(h));
          return (
            <g key={h}>
              <path d={wedgePath(C, C, SPLIT, R.signInner, from, from + 30)} fill={`hsl(var(--brass) / ${on ? 0.16 : h % 2 ? 0.05 : 0.085})`} />
              <Spoke from={R.signInner} to={SPLIT} at={from} stroke="hsl(var(--brass) / 0.3)" />
              <ArcLabel id={`${uid}h${h}`} radius={R.bandHouse} from={from} size={PLATE * 0.019} spacing={1.2} fill={on ? BRASS : "hsl(var(--foreground) / 0.55)"}>
                {houseBandLabel(h)}
              </ArcLabel>
            </g>
          );
        })}
      </g>
    ),
    [uid, litKey],
  );

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${VIEW} ${VIEW}`}
      className={cn("block h-auto w-full overflow-visible", props.className)}
      role="img"
      aria-label={props.label}
    >
      {/* Below the horizon, the houses and the sky inside them are night side, as the chart convention has them. */}
      {!chart && <path d={`M${C - SPLIT} ${C}A${SPLIT} ${SPLIT} 0 0 0 ${C + SPLIT} ${C}Z`} fill="#06080C" fillOpacity={0.5} />}
      {houses}
      {chart?.angles &&
        lit.map((h) => {
          const from = 180 + (h - 1) * 30;
          return (
            <path
              key={h}
              d={wedgePath(C, C, R.tick, R.aspect, from, from + 30)}
              fill="hsl(var(--brass) / 0.1)"
              stroke="hsl(var(--brass) / 0.45)"
            />
          );
        })}

      <g>
        {SIGN_ORDER.map((sign, i) => {
          const from = 180 + i * 30 - turn;
          return (
            <g key={sign}>
              <path d={wedgePath(C, C, R.signOuter, SPLIT, from, from + 30)} fill="hsl(var(--brass) / 0.06)" />
              <Spoke from={SPLIT} to={R.signOuter} at={from} stroke="hsl(var(--brass) / 0.3)" />
              <ArcLabel id={`${uid}s${i}`} radius={R.bandSign} from={from} size={PLATE * 0.0225} spacing={1.4} fill={i === rising ? "#F2F4F9" : BRASS}>
                {sign.toUpperCase()}
              </ArcLabel>
            </g>
          );
        })}
        {Array.from({ length: 72 }, (_, k) => k * 5)
          .filter((d) => d % 30 !== 0)
          .map((d) => (
            <Spoke key={d} from={SPLIT} to={SPLIT + PLATE * 0.009} at={180 + d - turn} stroke="hsl(var(--brass) / 0.22)" />
          ))}
      </g>

      <circle cx={C} cy={C} r={R.signOuter} fill="none" stroke="hsl(var(--brass) / 0.3)" />
      <circle cx={C} cy={C} r={SPLIT} fill="none" stroke="hsl(var(--brass) / 0.22)" />
      <circle cx={C} cy={C} r={R.signInner} fill="none" stroke="hsl(var(--brass) / 0.28)" />

      {chart ? <Bodies chart={chart} litBodies={litBodies} /> : <Horizon />}
    </svg>
  );
}

/** The bare ring's horizon: east on the left, where each rising sign comes up. */
function Horizon() {
  const size = PLATE * 0.02;
  return (
    <g>
      <line x1={-PAD + 4} y1={C} x2={PLATE + PAD - 4} y2={C} stroke="hsl(var(--brass) / 0.55)" strokeDasharray="2 5" />
      <text x={-PAD + 4} y={C + 20} fontFamily="IBM Plex Mono, monospace" fontSize={size} letterSpacing={1.6} fill="#AEB6C6">
        EAST
      </text>
      <text x={PLATE + PAD - 4} y={C + 20} textAnchor="end" fontFamily="IBM Plex Mono, monospace" fontSize={size} letterSpacing={1.6} fill="#AEB6C6">
        WEST
      </text>
    </g>
  );
}

/** The chart's ten bodies as their renders, each on a lane at its degree, and its Ascendant as the R03 marker. */
function Bodies({ chart, litBodies }: { chart: ChartData; litBodies: readonly string[] }) {
  const asc = chart.angles?.ascendant.absoluteDegree;
  // Without a horizon the ring stands on Aries, as the report's wheel frames a chart with no time.
  const placed = assignLanes(
    BODIES.filter((key) => chart.planets[key]).map((key) => ({ key, absoluteDegree: chart.planets[key].absoluteDegree })),
    asc ?? 0,
    { lanes: R.lanes, node: R.node, gap: PLATE * 0.01 },
  );
  const disc = R.node * 0.62;
  const at = asc === undefined ? null : theta(asc, asc);
  const marker = at === null ? null : pointAt(C, C, R.signOuter, at);

  return (
    <g>
      <circle cx={C} cy={C} r={R.aspect} fill="none" stroke="hsl(var(--brass) / 0.2)" />
      {at !== null && (
        <>
          <Spoke from={R.aspect} to={R.signInner + PLATE * 0.012} at={at} stroke={BRASS} width={1.5} />
          <Spoke from={R.aspect} to={R.signInner + PLATE * 0.012} at={at + 180} stroke="hsl(var(--brass) / 0.4)" />
        </>
      )}
      {placed.map(({ key, theta: a, radius }) => {
        const tick = pointAt(C, C, R.tick, a);
        const end = pointAt(C, C, radius + R.node * 0.5, a);
        return (
          <g key={key}>
            <line x1={f2(tick.x)} y1={f2(tick.y)} x2={f2(end.x)} y2={f2(end.y)} stroke={BRASS} strokeOpacity={radius < R.lanes[0] ? 0.42 : 0.3} />
            <circle cx={f2(tick.x)} cy={f2(tick.y)} r={1.7} fill={BRASS} fillOpacity={0.85} />
          </g>
        );
      })}
      {placed.map(({ key, theta: a, radius }) => {
        const p = pointAt(C, C, radius, a);
        const src = renderFor(key, R.node);
        return (
          <g key={key} transform={`translate(${f2(p.x)} ${f2(p.y)})`}>
            <circle r={disc} fill="hsl(var(--background))" fillOpacity={0.92} />
            {src ? <image href={src} x={-R.node / 2} y={-R.node / 2} width={R.node} height={R.node} preserveAspectRatio="xMidYMid meet" /> : null}
            {litBodies.includes(key) ? <circle r={disc + 7} fill="none" stroke="#E8EBF2" strokeOpacity={0.75} strokeWidth={1.3} /> : null}
          </g>
        );
      })}
      {marker && at !== null && (
        <g>
          <circle cx={f2(marker.x)} cy={f2(marker.y)} r={15} fill="none" stroke="hsl(var(--brass) / 0.5)" />
          <circle cx={f2(marker.x)} cy={f2(marker.y)} r={8.5} fill="hsl(var(--background))" stroke={BRASS} strokeWidth={1.8} />
          <circle cx={f2(marker.x)} cy={f2(marker.y)} r={3} fill={BRASS} />
          <Spoke from={R.signOuter + 8.5} to={R.signOuter + 20.5} at={at} stroke={BRASS} width={1.8} round />
        </g>
      )}
    </g>
  );
}

export default HouseRing;
