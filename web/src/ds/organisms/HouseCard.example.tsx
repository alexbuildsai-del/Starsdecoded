import { chartPatterns } from "@workspace/engine";
import { houseSign } from "@/components/chart/wheel-geometry";
import { houseOccupants } from "@/lib/house-occupants";
import { HOUSE_NUMBERS, goesBackwards, quietLine, signRuler, stelliumBodies } from "@/lib/house-deck";
import { SAMPLE, sampleChart } from "@/site/data/sample";
import { AddBirthTimeCard, HouseCard, chartRuler, type HouseCardProps } from "./HouseCard";

// Her chart is computed at run time from the fixture, and the readings are the stored r06 run's. r06 stores no blocks
// (they came with v12), so the blocks example carries bracketed stand-ins, as the Design System does.
const chart = sampleChart();
const asc = chart.angles!.ascendant.absoluteDegree;
const patterns = chartPatterns(chart.planets, chart.angles);
const readings = SAMPLE.run.houses?.houses ?? [];

function card(h: number): HouseCardProps {
  const sign = houseSign(h, asc);
  const occupants = houseOccupants(chart, h);
  return {
    house: h,
    sign,
    occupants,
    ruler: h === 1 ? chartRuler(chart) : null,
    quiet: occupants.length === 0 ? quietLine(sign, signRuler(chart, sign)) : null,
    reading: readings.find((r) => r.house === h)?.reading,
    stellium: stelliumBodies(patterns, h),
  };
}

const crowded = HOUSE_NUMBERS.find((h) => stelliumBodies(patterns, h)) ?? 4;
const quiet = HOUSE_NUMBERS.find((h) => houseOccupants(chart, h).length === 0) ?? 8;
const backwards = Object.entries(chart.planets).find(([k, p]) => goesBackwards(k, p.retrograde))?.[0] ?? "saturn";

function Caption({ children }: { children: string }) {
  return <p className="m-0 font-label text-label uppercase text-label-dim">{children}</p>;
}

export default function HouseCardExample() {
  return (
    <div className="rp-root grid gap-6 p-4">
      <section className="grid gap-2">
        <Caption>Today · RP27, RP51</Caption>
        <p className="m-0 max-w-prose text-small text-paper-dim">
          The card as R19 left it: no planet row since R19-48, labels at 9.5 and 10 px, the R block in its own pinks. After restores
          the row (planet renders, the brass angle marker, Chiron and the nodes as glyphs; no degree, no R) and takes the tokens.
        </p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <Caption>After · lit, collapsed, chart ruler</Caption>
          <HouseCard {...card(1)} />
        </div>
        <div className="grid content-start gap-2">
          <Caption>After · unlit neighbour</Caption>
          <HouseCard {...card(2)} lit={false} />
        </div>
        <div className="grid content-start gap-2">
          <Caption>After · stellium, row and blocks, whole</Caption>
          <HouseCard
            {...card(crowded)}
            whole
            blocks={{
              noticed: { idea: "[stored noticed idea]", why: "[stored why]" },
              stellium: { text: "[stored stellium text]", balance: "[stored balance]" },
              retrograde: [{ planet: backwards, text: "[stored retrograde text]" }],
            }}
          />
        </div>
        <div className="grid content-start gap-2">
          <Caption>After · a quiet house, still writing</Caption>
          <HouseCard {...card(quiet)} reading={undefined} />
        </div>
        <div className="grid content-start gap-2">
          <Caption>After · no birth time</Caption>
          <AddBirthTimeCard birthPlace={SAMPLE.place} onAddBirthTime={() => {}} />
        </div>
      </section>
    </div>
  );
}
