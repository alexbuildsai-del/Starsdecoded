import { Chart } from "@/ds/organisms/chart/Chart";
import { chartExamples } from "@/ds/organisms/chart/example-charts";
import { Fig, Row } from "@/ds/organisms/chart/figure";

export default function ChartDrawingsExample() {
  const { known } = chartExamples();
  const venus = known.planets.venus;
  return (
    <Row min={280}>
      <Fig caption="Full, touchable: point at a planet for its ring and chip; Tab to a house for its brass outline">
        <Chart chart={known} state="full" size={600} fluid stops />
      </Fig>
      <Fig caption="A house picked: Focus, the house brass 22%, its word white, the rest quiet">
        <Chart chart={known} state="focus" size={600} fluid focus={{ house: 10 }} />
      </Fig>
      <Fig caption="A planet the subject: ringed, its house lit, only its own lines kept">
        <Chart chart={known} state="focus" size={600} fluid focus={{ body: "venus", house: venus.house }} />
      </Fig>
    </Row>
  );
}
