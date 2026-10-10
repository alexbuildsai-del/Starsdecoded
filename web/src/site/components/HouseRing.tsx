/**
 * Whole-sign houses on the one Chart in its Teach state (Teaching, loops 1
 * and 2): the houses counted from the east downward, house 1 lit, and the
 * zodiac turning round them to each new rising sign while the houses stay
 * put. At rest each sign sits in its house, as a whole-sign chart has them.
 *
 * Given a chart, the ring stands on its rising sign with the bodies its
 * sentence names at their true degrees and the house it counts to lit; the
 * Ascendant is its point, not a body (ADR-49).
 */
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { SIGN_ORDER } from "@/components/chart/wheel-geometry";
import { Chart } from "@/ds/organisms/chart/Chart";
import { buildScene } from "@/ds/organisms/chart/scene";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import type { ChartData } from "@/types/chart";
import { risingIndex } from "@/site/lib/learn";
import { ease } from "@/site/lib/sky";

const PLATE = 600;
const TURN_MS = 900;

/**
 * The bare ring's frame: no body and no degree, only the picked sign as the 1st house, framed on its first degree as
 * the ring always turned to it. Nothing here is anyone's chart, so the marker that would claim a rising degree is not
 * drawn on it.
 */
function houseFrame(rising: number): ChartData {
  const ascendant = { sign: SIGN_ORDER[rising], degree: 0, absoluteDegree: rising * 30 };
  return { planets: {}, aspects: [], angles: { ascendant } } as unknown as ChartData;
}

/**
 * The zodiac turns the short way to each new rising sign while the houses stay: the Chart draws the new sign ring at
 * once, and this turns it back to where the last one stood and lets it go. The first paint and reduced motion take it
 * at once, so the prerendered ring is the settled one.
 */
function useTurn(host: RefObject<HTMLDivElement | null>, rising: number) {
  const reduced = useReducedMotion();
  const drawn = useRef(rising * 30);
  const centre = buildScene(houseFrame(0), "teach", PLATE).radii.centre;

  useLayoutEffect(() => {
    const ring = host.current?.querySelector<SVGGElement>("[data-sign-ring]");
    const target = rising * 30;
    const from = drawn.current;
    drawn.current = target;
    const way = ((((target - from) % 360) + 540) % 360) - 180;
    if (!ring || Math.abs(way) < 1e-6 || reduced) {
      ring?.removeAttribute("transform");
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / TURN_MS);
      if (u < 1) ring.setAttribute("transform", `rotate(${(-way * (1 - ease(u))).toFixed(2)} ${centre} ${centre})`);
      else ring.removeAttribute("transform");
      if (u < 1) raf = requestAnimationFrame(step);
    };
    step(t0);
    return () => cancelAnimationFrame(raf);
  }, [rising, reduced]);

  useEffect(() => () => host.current?.querySelector("[data-sign-ring]")?.removeAttribute("transform"), []);
}

export type HouseRingProps = { label: string; className?: string } & (
  /** The bare ring: the system only, with no planets. */
  | { rising: number }
  /** A chart with its horizon; the last of `lit` is the house its sentence counts to, and `litBodies` are drawn. */
  | { chart: ChartData; lit?: readonly number[]; litBodies?: readonly string[] }
);

export function HouseRing(props: HouseRingProps) {
  const host = useRef<HTMLDivElement>(null);
  const chart = "chart" in props ? props.chart : null;
  const rising = Math.max(0, chart ? risingIndex(chart) : (props as { rising: number }).rising);
  useTurn(host, rising);

  if (chart) {
    const lit = "chart" in props ? props.lit ?? [] : [];
    const only = "chart" in props ? props.litBodies ?? [] : [];
    const house = lit[lit.length - 1];
    return (
      <div ref={host} className={cn("w-full", props.className)}>
        <Chart chart={chart} state="teach" size={PLATE} fluid only={only} focus={house ? { house } : undefined} label={props.label} />
      </div>
    );
  }

  return (
    <div ref={host} className={cn("relative w-full", props.className)}>
      <Chart
        chart={houseFrame(rising)}
        state="teach"
        size={PLATE}
        fluid
        only={[]}
        focus={{ house: 1 }}
        label={props.label}
        className="[&_[data-rising-marker]]:hidden"
      />
      <span aria-hidden="true" className="absolute left-0 top-[56%] font-numeric text-data-sm text-paper-dim">
        EAST
      </span>
      <span aria-hidden="true" className="absolute right-0 top-[56%] font-numeric text-data-sm text-paper-dim">
        WEST
      </span>
    </div>
  );
}

export default HouseRing;
