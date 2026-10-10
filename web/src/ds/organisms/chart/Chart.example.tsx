import { useState } from "react";
import TriadPlate from "@/components/report/TriadPlate";
import { Chart } from "@/ds/organisms/chart/Chart";
import { chartExamples } from "@/ds/organisms/chart/example-charts";
import { Fig, Row } from "@/ds/organisms/chart/figure";

export default function ChartExample() {
  const { known, unknown } = chartExamples();
  const [house, setHouse] = useState<number | undefined>(undefined);
  return (
    <Row min={280}>
      <Fig caption="After: the report's own plate (TriadPlate), now the Chart's triad ring">
        <TriadPlate chart={known} name="Audrey Hepburn" className="block h-auto w-full max-w-[260px]" />
      </Fig>
      <Fig caption={`After: Full, then Focus on a pick (${house ? `house ${house}` : "point at a planet, pick a house"})`}>
        <Chart
          chart={known}
          state={house ? "focus" : "full"}
          size={600}
          fluid
          stops
          focus={house ? { house } : undefined}
          onPickHouse={(h) => setHouse((cur) => (cur === h ? undefined : h))}
        />
      </Fig>
      <Fig caption="After: no birth time, Aries at 9 o'clock, no houses or horizon, the Moon's stretch">
        <Chart chart={unknown} state="full" size={600} fluid />
      </Fig>
    </Row>
  );
}
