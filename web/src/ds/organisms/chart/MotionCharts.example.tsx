import { Chart } from "@/ds/organisms/chart/Chart";
import { chartExamples } from "@/ds/organisms/chart/example-charts";
import { Fig, Row } from "@/ds/organisms/chart/figure";

/** Build's still frame: where every chart motion lands, and what reduced motion shows from the start. */
export default function MotionChartsExample() {
  const { known, unknown } = chartExamples();
  return (
    <Row>
      <Fig caption="Build, its last frame: Full">
        <Chart chart={known} state="build" size={600} fluid />
      </Fig>
      <Fig caption="Build with no birth time: the sky never turns, no houses arrive">
        <Chart chart={unknown} state="build" size={600} fluid />
      </Fig>
    </Row>
  );
}
