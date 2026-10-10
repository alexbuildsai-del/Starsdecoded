import { Chart } from "@/ds/organisms/chart/Chart";
import { chartExamples } from "@/ds/organisms/chart/example-charts";
import { Fig, Row } from "@/ds/organisms/chart/figure";

export default function PlanetsExample() {
  const { known, beatrice, link } = chartExamples();
  return (
    <Row>
      <Fig caption="Renders at their true degrees on three lanes; Chiron and the nodes grey points; R in red">
        <Chart chart={known} state="full" size={600} fluid />
      </Fig>
      <Fig caption="Teach: only the planets the idea needs, 1.25 times">
        <Chart chart={known} state="teach" size={600} fluid only={["sun", "moon", "saturn"]} />
      </Fig>
      <Fig caption="Pair: this chart's own planet ringed in ink, the rest at 14%">
        <Chart chart={beatrice} state="pair" size={600} fluid focus={{ body: link.onBeatrice.own }} />
      </Fig>
    </Row>
  );
}
