import { Chart } from "@/ds/organisms/chart/Chart";
import { chartExamples } from "@/ds/organisms/chart/example-charts";
import { Fig, Row } from "@/ds/organisms/chart/figure";

export default function LinesExample() {
  const { known, unknown } = chartExamples();
  return (
    <Row>
      <Fig caption="Full: the engine's lines, joined brass, easy blue, tense red; dashed when parting">
        <Chart chart={known} state="full" size={600} fluid />
      </Fig>
      <Fig caption="Focus on Venus: its own lines stay, the rest at 10%">
        <Chart chart={known} state="focus" size={600} fluid focus={{ body: "venus", house: known.planets.venus.house }} />
      </Fig>
      <Fig caption="No birth time: the Moon's lines left out">
        <Chart chart={unknown} state="no-birth-time" size={600} fluid />
      </Fig>
    </Row>
  );
}
