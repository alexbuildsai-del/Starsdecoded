import { Chart } from "@/ds/organisms/chart/Chart";
import { chartExamples } from "@/ds/organisms/chart/example-charts";
import { Fig, Row } from "@/ds/organisms/chart/figure";

export default function HorizonExample() {
  const { known, unknown } = chartExamples();
  return (
    <Row>
      <Fig caption="East on the left through the rising degree, west on the right, never through the middle">
        <Chart chart={known} state="full" size={600} fluid />
      </Fig>
      <Fig caption="The rising sign the subject: house 1 lit, the marker brass">
        <Chart chart={known} state="focus" size={600} fluid focus={{ house: 1 }} />
      </Fig>
      <Fig caption="No birth time: no horizon and no marker">
        <Chart chart={unknown} state="sun-moon-rising" size={300} />
      </Fig>
    </Row>
  );
}
