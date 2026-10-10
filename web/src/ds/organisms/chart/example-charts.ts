import { calculateNatalChart } from "@workspace/engine";
import type { ChartData } from "@/types/chart";
import { exampleCharts } from "@/ds/atoms/TriadRing.example";
import type { GuestOption } from "@/ds/organisms/chart/scene";

/** Separation of two longitudes, 0 to 180. */
function apart(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

const LINK_ANGLES: { angle: number; kind: GuestOption["kind"] }[] = [
  { angle: 0, kind: "same" }, { angle: 60, kind: "easy" }, { angle: 90, kind: "tense" }, { angle: 120, kind: "easy" }, { angle: 180, kind: "tense" },
];

/**
 * The pages' charts, computed from the birth data of the committed fixtures (audrey-hepburn, marie-curie-unknown,
 * beatrice, athena), never typed in. The pair's link is read off the two charts, as the compatibility walk reads it.
 */
export function chartExamples() {
  const { known, unknown } = exampleCharts();
  const beatrice = calculateNatalChart("1988-08-08", "20:18", 51.521, -0.1445, "Europe/London", 0) as ChartData;
  const athena = calculateNatalChart("2025-01-22", "12:57", 51.4846, -0.1818, "Europe/London", 0) as ChartData;
  const jupiter = beatrice.planets.jupiter.absoluteDegree;
  const sun = athena.planets.sun.absoluteDegree;
  const sep = apart(jupiter, sun);
  const near = LINK_ANGLES.reduce((best, a) => (Math.abs(sep - a.angle) < Math.abs(sep - best.angle) ? a : best));
  return {
    known,
    unknown,
    beatrice,
    athena,
    /** Beatrice's Jupiter and Athena's Sun, each a guest on the other's chart. */
    link: {
      onBeatrice: { own: "jupiter", guest: { body: "sun", absoluteDegree: sun, kind: near.kind, angle: near.angle } },
      onAthena: { own: "sun", guest: { body: "jupiter", absoluteDegree: jupiter, kind: near.kind, angle: near.angle } },
      orb: Math.round(Math.abs(sep - near.angle) * 10) / 10,
    },
  };
}
