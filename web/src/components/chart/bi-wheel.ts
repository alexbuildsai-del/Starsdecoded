/**
 * Pure bi-wheel geometry (ADR-43): two charts on one plate, inner ring A,
 * outer ring B, the host's whole-sign houses, the cross aspects within four
 * degrees drawn between them. Bodies sit at their true degrees; crowding is
 * resolved by radius, never by moving a body (§9). Swapping the host re-hosts
 * the houses and turns the wheel so the host's Ascendant sits east.
 */
import { assignLanes, firstHouseCusp, houseSign, norm360, pointAt, theta, type LadderPlacement } from "@/components/chart/wheel-geometry";
import type { ChartData } from "@/types/chart";

export type Host = "A" | "B";

export const CROSS_ORB = 4;
export const CROSS_ASPECTS: Array<{ type: string; angle: number }> = [
  { type: "conjunction", angle: 0 },
  { type: "opposition", angle: 180 },
  { type: "trine", angle: 120 },
  { type: "square", angle: 90 },
  { type: "sextile", angle: 60 },
];
const CROSS_BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;

export interface CrossLink {
  planetA: string;
  planetB: string;
  type: string;
  orb: number;
}

function separation(a: number, b: number): number {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
}

/** Every cross aspect within the drawn orb, tightest first. The engine draws the same set. */
export function crossLinks(chartA: ChartData, chartB: ChartData, orb = CROSS_ORB): CrossLink[] {
  const out: CrossLink[] = [];
  for (const pa of CROSS_BODIES) {
    const a = chartA.planets[pa];
    if (!a) continue;
    for (const pb of CROSS_BODIES) {
      const b = chartB.planets[pb];
      if (!b) continue;
      const sep = separation(a.absoluteDegree, b.absoluteDegree);
      let best: { type: string; orb: number } | null = null;
      for (const cand of CROSS_ASPECTS) {
        const o = Math.abs(sep - cand.angle);
        if (o <= orb && (!best || o < best.orb)) best = { type: cand.type, orb: o };
      }
      if (best) out.push({ planetA: pa, planetB: pb, type: best.type, orb: Math.round(best.orb * 10) / 10 });
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

/** Brass for a conjunction, teal for a trine or sextile, rose for a square or opposition. Brass stays geometry. */
export function linkColour(type: string): "brass" | "teal" | "rose" {
  if (type === "conjunction") return "brass";
  if (type === "trine" || type === "sextile") return "teal";
  return "rose";
}

export interface BiWheelRadii {
  centre: number;
  signOuter: number;
  signInner: number;
  outerLanes: [number, number];
  innerLanes: [number, number];
  houseOuter: number;
  houseInner: number;
  aspect: number;
  node: number;
}

export function biWheelRadii(size: number): BiWheelRadii {
  return {
    centre: size / 2,
    signOuter: size * 0.478,
    signInner: size * 0.43,
    outerLanes: [size * 0.39, size * 0.345],
    innerLanes: [size * 0.29, size * 0.245],
    houseOuter: size * 0.2,
    houseInner: size * 0.158,
    aspect: size * 0.15,
    node: size * 0.046,
  };
}

export interface BiWheelLayout {
  host: Host;
  /** The host's Ascendant, which sits east; null when the host is blind. */
  ascendant: number | null;
  /** The frame the wheel turns to: the host's Ascendant, or 0 when there is none. */
  frame: number;
  /** Whether the house ring is drawn at all. */
  houses: boolean;
  a: LadderPlacement[];
  b: LadderPlacement[];
  links: CrossLink[];
  radii: BiWheelRadii;
}

/**
 * The layout for one host. Chart A always takes the inner ring and B the
 * outer; the host decides the houses and the turn of the wheel. A blind host
 * has no houses to draw: the sign band and the bodies remain.
 */
export function layoutBiWheel(chartA: ChartData, chartB: ChartData, host: Host, size: number, links?: CrossLink[]): BiWheelLayout {
  const radii = biWheelRadii(size);
  const hostChart = host === "A" ? chartA : chartB;
  const ascendant = hostChart.angles?.ascendant.absoluteDegree ?? null;
  const frame = ascendant ?? 0;
  const bodies = (c: ChartData) => Object.entries(c.planets)
    .filter(([, p]) => p && typeof p.absoluteDegree === "number")
    .map(([key, p]) => ({ key, absoluteDegree: p.absoluteDegree }));
  return {
    host,
    ascendant,
    frame,
    houses: ascendant !== null,
    a: assignLanes(bodies(chartA), frame, { lanes: radii.innerLanes, node: radii.node, gap: size * 0.008 }),
    b: assignLanes(bodies(chartB), frame, { lanes: radii.outerLanes, node: radii.node, gap: size * 0.008 }),
    links: links ?? crossLinks(chartA, chartB),
    radii,
  };
}

export function swapHost(host: Host): Host {
  return host === "A" ? "B" : "A";
}

/** The endpoints of a drawn link on the aspect disc, in the host's frame. */
export function linkEndpoints(layout: BiWheelLayout, link: CrossLink, chartA: ChartData, chartB: ChartData) {
  const c = layout.radii.centre;
  const a = chartA.planets[link.planetA];
  const b = chartB.planets[link.planetB];
  if (!a || !b) return null;
  return {
    from: pointAt(c, c, layout.radii.aspect, theta(a.absoluteDegree, layout.frame)),
    to: pointAt(c, c, layout.radii.aspect, theta(b.absoluteDegree, layout.frame)),
  };
}

/** The host's twelve houses, sign by sign, from the host's Ascendant. */
export function hostHouses(layout: BiWheelLayout): Array<{ house: number; sign: string; from: number; to: number }> | null {
  if (layout.ascendant === null) return null;
  const cusp = firstHouseCusp(layout.ascendant);
  return Array.from({ length: 12 }, (_, i) => {
    const from = theta(cusp + i * 30, layout.frame);
    return { house: i + 1, sign: houseSign(i + 1, layout.ascendant!), from, to: from + 30 };
  });
}
