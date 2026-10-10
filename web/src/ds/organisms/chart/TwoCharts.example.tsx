import { Chart } from "@/ds/organisms/chart/Chart";
import { chartExamples } from "@/ds/organisms/chart/example-charts";
import { Fig } from "@/ds/organisms/chart/figure";

export default function TwoChartsExample() {
  const { beatrice, athena, link } = chartExamples();
  const pair = (size: number) => (
    <div className="flex flex-wrap items-start gap-6">
      <Chart chart={beatrice} state="pair" size={size} label="Beatrice's natal chart wheel" focus={{ body: link.onBeatrice.own }} guest={link.onBeatrice.guest} />
      <Chart chart={athena} state="pair" size={size} label="Athena's natal chart wheel" focus={{ body: link.onAthena.own }} guest={link.onAthena.guest} />
    </div>
  );
  return (
    <div className="grid gap-8">
      <Fig caption={`Beatrice's Jupiter and Athena's Sun, ${link.onBeatrice.guest.angle}° (orb ${link.orb}°), on both charts · phone, 132 px`}>
        {pair(132)}
      </Fig>
      <Fig caption="Desktop, 186 px: names and ticks from 150 px">{pair(186)}</Fig>
    </div>
  );
}
