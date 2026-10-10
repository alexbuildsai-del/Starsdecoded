import { calculateNatalChart } from "@workspace/engine";
import type { ChartData } from "@/types/chart";
import { Chart } from "@/ds/organisms/chart/Chart";
import { chartExamples } from "@/ds/organisms/chart/example-charts";
import { Fig, Row } from "@/ds/organisms/chart/figure";
import { CHART_STATES, CHART_STATE_LABEL, type ChartState } from "@/ds/organisms/chart/states";

/** Each state at a size it is used at; Small and the Sun, Moon and rising plate at their real pixels. */
const SIZE: Record<ChartState, number> = {
  full: 320, focus: 320, "sun-moon-rising": 104, small: 92, pair: 186, teach: 320, build: 320, "no-birth-time": 320, "live-sky": 320,
};

/** The sky this minute over London, the Live sky's fallback city, from the engine. */
function skyNow(): ChartData {
  const now = new Date().toISOString();
  return calculateNatalChart(now.slice(0, 10), now.slice(11, 16), 51.5074, -0.1278, 0) as ChartData;
}

export default function ChartStatesExample() {
  const { known, unknown, beatrice, link } = chartExamples();
  const sky = skyNow();
  return (
    <Row min={240}>
      {CHART_STATES.map((state) => (
        <Fig key={state} caption={`${CHART_STATE_LABEL[state]} · ${SIZE[state]} px`}>
          <Chart
            chart={state === "no-birth-time" ? unknown : state === "pair" ? beatrice : state === "live-sky" ? sky : known}
            state={state}
            size={SIZE[state]}
            focus={state === "pair" ? { body: link.onBeatrice.own } : state === "focus" ? { body: "venus", house: known.planets.venus.house } : { house: 10 }}
            guest={state === "pair" ? link.onBeatrice.guest : undefined}
          />
        </Fig>
      ))}
    </Row>
  );
}
