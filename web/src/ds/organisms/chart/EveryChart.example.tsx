import { Chart } from "@/ds/organisms/chart/Chart";
import { chartExamples } from "@/ds/organisms/chart/example-charts";
import { Fig, Row } from "@/ds/organisms/chart/figure";
import { CHART_STATE_LABEL, type ChartState } from "@/ds/organisms/chart/states";

const SCREENS: { screen: string; state: ChartState; size: number; house?: number }[] = [
  { screen: "House by House, desktop", state: "full", size: 360 },
  { screen: "House by House, phone bar", state: "small", size: 92, house: 10 },
  { screen: "Did you know, emptiest house", state: "small", size: 96, house: 6 },
  { screen: "Opening plate", state: "sun-moon-rising", size: 300 },
  { screen: "Dashboard sky card", state: "sun-moon-rising", size: 104 },
  { screen: "Home claims, a claim lit", state: "focus", size: 360, house: 10 },
  { screen: "/learn/houses", state: "teach", size: 320, house: 1 },
  { screen: "Report loading, last frame", state: "build", size: 320 },
];

export default function EveryChartExample() {
  const { known, beatrice, athena, link } = chartExamples();
  return (
    <div className="grid gap-10">
      <Row min={200}>
        {SCREENS.map((s) => (
          <Fig key={s.screen} caption={`${s.screen} → ${CHART_STATE_LABEL[s.state]}`}>
            <Chart chart={known} state={s.state} size={s.size} focus={s.house ? { house: s.house } : undefined} />
          </Fig>
        ))}
      </Row>
      <Fig caption="Compatibility, the two charts → Pair, 132 px each">
        <div className="flex flex-wrap gap-6">
          <Chart chart={beatrice} state="pair" size={132} focus={{ body: link.onBeatrice.own }} guest={link.onBeatrice.guest} />
          <Chart chart={athena} state="pair" size={132} focus={{ body: link.onAthena.own }} guest={link.onAthena.guest} />
        </div>
      </Fig>
    </div>
  );
}
