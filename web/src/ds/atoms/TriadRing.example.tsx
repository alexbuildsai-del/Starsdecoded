import { calculateNatalChart } from "@workspace/engine";
import type { ChartData } from "@/types/chart";
import { TriadRing } from "@/ds/atoms/TriadRing";
import TriadPlate from "@/components/report/TriadPlate";

// Birth data of fixtures/charts/audrey-hepburn.json and marie-curie-unknown.json; the charts are computed here, never typed in.
export function exampleCharts(): { known: ChartData; unknown: ChartData } {
  return {
    known: calculateNatalChart("1929-05-04", "03:00", 50.8333, 4.3667, "Europe/Brussels", 0) as ChartData,
    unknown: calculateNatalChart("1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720) as ChartData,
  };
}

export default function TriadRingExample() {
  const { known, unknown } = exampleCharts();
  return (
    <div className="grid gap-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
      <figure>
        <figcaption>After: TriadPlate, the report's plate, drawn by this ring</figcaption>
        <TriadPlate chart={known} name="Audrey Hepburn" />
      </figure>
      <figure>
        <figcaption>After, 104 px: no names (under 200 px)</figcaption>
        <TriadRing chart={known} name="Audrey Hepburn" size={104} />
      </figure>
      <figure>
        <figcaption>After, 260 px: names on</figcaption>
        <TriadRing chart={known} name="Audrey Hepburn" size={260} className="block w-[260px] h-auto" />
      </figure>
      <figure>
        <figcaption>After, no birth time: Aries at 9 o'clock, no horizon, the Moon's stretch</figcaption>
        <TriadRing chart={unknown} name="Marie Curie" size={260} className="block w-[260px] h-auto" />
      </figure>
    </div>
  );
}
