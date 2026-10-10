import { COMFORT } from "@workspace/engine";
import { Chart } from "@/ds/organisms/chart/Chart";
import { chartExamples } from "@/ds/organisms/chart/example-charts";
import { Fig, Row } from "@/ds/organisms/chart/figure";

export default function ChartSignRingExample() {
  const { known, unknown } = chartExamples();
  const venus = [
    ...COMFORT.venus.home.map((sign) => ({ sign, tone: "home" as const, explained: true })),
    ...COMFORT.venus.leastAtEase.map((sign) => ({ sign, tone: "strain" as const, explained: true })),
  ];
  return (
    <Row>
      <Fig caption="Full: names and ticks, rising sign at 9 o'clock">
        <Chart chart={known} state="full" size={600} fluid />
      </Fig>
      <Fig caption="Small, 92 px: slices only">
        <Chart chart={known} state="small" size={92} />
      </Fig>
      <Fig caption="No birth time: Aries at 9 o'clock">
        <Chart chart={unknown} state="full" size={600} fluid />
      </Fig>
      <Fig caption="Teach: Venus at home (teal) and least at ease (rose), from the engine">
        <Chart chart={known} state="teach" size={600} fluid only={["venus"]} signs={venus} />
      </Fig>
    </Row>
  );
}
