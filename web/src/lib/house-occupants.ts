/**
 * Who stands in a house. An angle is an occupant: a house is quiet only when no
 * planet, node, Chiron, Ascendant or Midheaven is placed in it (ADR-27).
 *
 * Pure. Takes the chart and a house number, returns what the card should draw.
 */
import { PLANET_LABELS, type ChartData } from "@/types/chart";
import { firstHouseCusp, houseOf, norm360 } from "@/components/chart/wheel-geometry";

/** A planet has a render, a point is drawn, an angle is an open brass marker. */
export type OccupantKind = "planet" | "point" | "angle";

export interface Occupant {
  key: string;
  label: string;
  kind: OccupantKind;
  /** Degrees into its own sign, as the chart reports them. */
  degree: number;
  absoluteDegree: number;
  retrograde?: boolean;
}

const PLANETS = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
] as const;

const POINTS = ["chiron", "north_node", "south_node"] as const;

export const ANGLE_LABELS: Record<string, string> = {
  ascendant: "Ascendant",
  midheaven: "Midheaven",
};

/** The whole-sign house the Midheaven falls in. It is not always the 10th; a blind chart has none. */
export function midheavenHouse(chart: ChartData): number | null {
  if (!chart.angles) return null;
  return houseOf(chart.angles.midheaven.absoluteDegree, chart.angles.ascendant.absoluteDegree);
}

export function houseOccupants(chart: ChartData, house: number): Occupant[] {
  // A blind chart has no houses to stand in (ADR-34): nothing reads a house it does not carry.
  if (!chart.angles) return [];
  const asc = chart.angles.ascendant;
  const out: Occupant[] = [];

  for (const kind of ["planet", "point"] as const) {
    for (const key of kind === "planet" ? PLANETS : POINTS) {
      const p = chart.planets[key];
      if (!p || p.house !== house) continue;
      out.push({
        key,
        label: PLANET_LABELS[key] ?? key,
        kind,
        degree: p.degree,
        absoluteDegree: p.absoluteDegree,
        retrograde: p.retrograde,
      });
    }
  }

  if (house === 1) {
    out.push({
      key: "ascendant", label: ANGLE_LABELS.ascendant, kind: "angle",
      degree: asc.degree, absoluteDegree: asc.absoluteDegree,
    });
  }
  if (house === midheavenHouse(chart)) {
    const mc = chart.angles.midheaven;
    out.push({
      key: "midheaven", label: ANGLE_LABELS.midheaven, kind: "angle",
      degree: mc.degree, absoluteDegree: mc.absoluteDegree,
    });
  }

  const cusp = firstHouseCusp(asc.absoluteDegree);
  return out.sort((a, b) => norm360(a.absoluteDegree - cusp) - norm360(b.absoluteDegree - cusp));
}

/** No planet, node, Chiron or angle: the only case the card reads through the ruler. */
export function isQuietHouse(chart: ChartData, house: number): boolean {
  return houseOccupants(chart, house).length === 0;
}
