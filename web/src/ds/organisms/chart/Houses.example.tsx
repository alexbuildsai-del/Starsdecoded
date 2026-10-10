import { Chart } from "@/ds/organisms/chart/Chart";
import { chartExamples } from "@/ds/organisms/chart/example-charts";
import { Fig, Row } from "@/ds/organisms/chart/figure";

export default function HousesExample() {
  const { known, unknown } = chartExamples();
  return (
    <Row>
      <Fig caption="Twelve houses, one whole sign each, house 1 the rising sign">
        <Chart chart={known} state="full" size={600} fluid />
      </Fig>
      <Fig caption="One lit: brass 22%, its word white, the others at 30%">
        <Chart chart={known} state="focus" size={600} fluid focus={{ house: 7 }} />
      </Fig>
      <Fig caption="Small, 92 px: the lit house only">
        <Chart chart={known} state="small" size={92} focus={{ house: 7 }} />
      </Fig>
      <Fig caption="No birth time: no houses at all">
        <Chart chart={unknown} state="full" size={600} fluid />
      </Fig>
    </Row>
  );
}
