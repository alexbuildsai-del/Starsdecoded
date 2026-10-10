import { COMFORT } from "@workspace/engine";
import { HouseRing } from "@/site/components/HouseRing";
import { Chart } from "@/ds/organisms/chart/Chart";
import { chartExamples } from "@/ds/organisms/chart/example-charts";
import { Fig, Row } from "@/ds/organisms/chart/figure";

/** Each loop's last frame, which is also what reduced motion shows. */
export default function TeachingExample() {
  const { known, beatrice, link } = chartExamples();
  const venus = [
    ...COMFORT.venus.home.map((sign) => ({ sign, tone: "home" as const })),
    ...COMFORT.venus.leastAtEase.map((sign) => ({ sign, tone: "strain" as const, explained: true })),
  ];
  return (
    <Row>
      <Fig caption="Today: /learn/houses draws its own ring (HouseRing)">
        <HouseRing chart={known} lit={[1]} label="Today's house ring" className="block h-auto w-full" />
      </Fig>
      <Fig caption="1 · Your houses start at your rising sign">
        <Chart chart={known} state="teach" size={600} fluid only={[]} focus={{ house: 1 }} />
      </Fig>
      <Fig caption="2 · Each house is one part of life">
        <Chart chart={known} state="teach" size={600} fluid only={[]} focus={{ house: 7 }} />
      </Fig>
      <Fig caption="4 · At home, or least at ease">
        <Chart chart={known} state="teach" size={600} fluid only={["venus"]} signs={venus} />
      </Fig>
      <Fig caption="5 · How two planets meet">
        <Chart chart={beatrice} state="pair" size={300} focus={{ body: link.onBeatrice.own }} guest={link.onBeatrice.guest} />
      </Fig>
    </Row>
  );
}
