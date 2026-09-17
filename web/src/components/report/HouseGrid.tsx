import { HouseCard } from "@/components/report/HouseCard";
import { houseSign } from "@/components/chart/wheel-geometry";
import type { AngleMeanings, ChartData } from "@/types/chart";

/** Points are not bodies, so they never claim a house card's planet row. */
const NOT_A_BODY = new Set(["chiron", "north_node", "south_node"]);

export function planetsByHouse(chartData: ChartData): Record<number, string[]> {
  const byHouse: Record<number, string[]> = {};
  for (const [name, planet] of Object.entries(chartData.planets)) {
    if (!planet || typeof planet.house !== "number") continue;
    if (NOT_A_BODY.has(name)) continue;
    (byHouse[planet.house] ??= []).push(name);
  }
  return byHouse;
}

export function HouseGrid({
  chartData,
  personalPlanets,
  angleMeanings,
}: {
  chartData: ChartData;
  personalPlanets: Record<string, string>;
  angleMeanings?: AngleMeanings;
}) {
  const occupants = planetsByHouse(chartData);
  const asc = chartData.angles.ascendant.absoluteDegree;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((house) => (
        <HouseCard
          key={house}
          house={house}
          sign={houseSign(house, asc)}
          occupants={occupants[house] ?? []}
          personalPlanets={personalPlanets}
          angleMeanings={angleMeanings}
        />
      ))}
    </div>
  );
}

export default HouseGrid;
