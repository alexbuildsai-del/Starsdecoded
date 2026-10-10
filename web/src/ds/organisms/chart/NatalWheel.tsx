/**
 * Today's NatalWheel props on the one Chart, so every caller keeps working while group 3 moves each onto `<Chart>`
 * with the state its screen takes (EveryChart). The wheel is a 600 px plate that fills its box, as it always was.
 */
import { useState, type ReactNode } from "react";
import { tokens } from "@workspace/design";
import type { ChartData } from "@/types/chart";
import { degreesMinutes } from "@/components/chart/wheel-geometry";
import { Chart } from "@/ds/organisms/chart/Chart";
import type { ChartState } from "@/ds/organisms/chart/states";

export { houseBandLabel } from "@/ds/organisms/chart/scene";

const PLATE = 600;
const c = tokens.color;

export interface NatalWheelProps {
  chartData: ChartData;
  /** interpretation.meta.orbs — aspect weight is measured against the real budget. */
  orbs?: Record<string, number>;
  selectedHouse?: number;
  onSelectHouse?: (house: number) => void;
  /** Side panel slot. The wheel does not know what a house card looks like. */
  renderHouse?: (house: number) => ReactNode;
  /** The wheel stands alone: this name and the rising line in the centre, no aspect lines, no house to select. */
  centreName?: string;
  /**
   * False when a house or planet would do nothing on focus or a click (MB-177): the wheel is then one picture, with no
   * tab stop to wade through and no skip link past them.
   */
  stops?: boolean;
}

export function NatalWheel({
  chartData, orbs, selectedHouse, onSelectHouse, renderHouse, centreName, stops = true,
}: NatalWheelProps) {
  const [picked, setPicked] = useState<number | undefined>(undefined);
  const standalone = centreName !== undefined;
  const house = standalone ? undefined : selectedHouse ?? picked;
  const lit = house !== undefined && house >= 1 && house <= 12 && chartData.angles !== undefined;
  // Full until a house is picked, then Focus on it; a standalone wheel is one of the two charts of a pair.
  const state: ChartState = standalone ? "pair" : !chartData.angles ? "no-birth-time" : lit ? "focus" : "full";
  const ascendant = chartData.angles?.ascendant;
  const risingLine = ascendant ? `Rising ${degreesMinutes(ascendant.degree)} ${ascendant.sign}` : "Rising · not drawn";

  function pick(h: number) {
    setPicked(h);
    onSelectHouse?.(h);
  }

  return (
    <div className={`relative grid gap-4 items-start${renderHouse ? " lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]" : ""}`}>
      <Chart
        chart={chartData}
        state={state}
        size={PLATE}
        fluid
        orbs={orbs}
        focus={lit ? { house } : undefined}
        stops={stops}
        onPickHouse={standalone ? undefined : pick}
        label={standalone ? `${centreName}'s natal chart wheel` : undefined}
      >
        {standalone && (
          <g data-centre-name>
            <text x={PLATE / 2} y={PLATE / 2 - PLATE * 0.006} textAnchor="middle" fontFamily={tokens.fontFamily.display} fontSize={PLATE * 0.05} fill={c.paper}>
              {centreName}
            </text>
            <text
              x={PLATE / 2} y={PLATE / 2 + PLATE * 0.036} textAnchor="middle" fontFamily={tokens.fontFamily.mono}
              fontSize={PLATE * 0.0175} letterSpacing={PLATE * 0.0027} fill={c["paper-dim"]}
            >
              {risingLine.toUpperCase()}
            </text>
          </g>
        )}
      </Chart>
      {renderHouse && !standalone && <div className="min-w-0">{renderHouse(house ?? 1)}</div>}
    </div>
  );
}

export default NatalWheel;
