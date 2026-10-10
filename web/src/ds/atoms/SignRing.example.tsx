import { NatalWheel } from "@/ds/organisms/chart/NatalWheel";
import { SignRing } from "@/ds/atoms/SignRing";
import { exampleCharts } from "@/ds/atoms/TriadRing.example";

const asc = (chart: { angles?: { ascendant: { absoluteDegree: number } } }) => chart.angles?.ascendant.absoluteDegree ?? 0;

export default function SignRingExample() {
  const { known, unknown } = exampleCharts();
  return (
    <div className="grid gap-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
      <figure>
        <figcaption>The wheel, now drawn by the Chart part</figcaption>
        <NatalWheel chartData={known} stops={false} />
      </figure>
      <figure>
        <figcaption>After, full: names and ticks</figcaption>
        <svg viewBox="0 0 600 600" className="block w-full h-auto"><SignRing size={600} asc={asc(known)} /></svg>
      </figure>
      <figure>
        <figcaption>Small, under 200 px: slices only</figcaption>
        <svg viewBox="0 0 120 120" width={120} height={120}><SignRing size={120} asc={asc(known)} /></svg>
      </figure>
      <figure>
        <figcaption>No birth time: Aries at 9 o'clock</figcaption>
        <svg viewBox="0 0 600 600" className="block w-full h-auto"><SignRing size={600} asc={asc(unknown)} /></svg>
      </figure>
      <figure>
        <figcaption>Lit: Taurus explained (brass), Pisces at home (teal), Scorpio strained (rose, after)</figcaption>
        <svg viewBox="0 0 600 600" className="block w-full h-auto">
          <SignRing
            size={600}
            asc={asc(known)}
            lit={[
              { sign: "Taurus", tone: "this", explained: true },
              { sign: "Pisces", tone: "home", explained: true },
              { sign: "Scorpio", tone: "strain" },
            ]}
          />
        </svg>
      </figure>
    </div>
  );
}
