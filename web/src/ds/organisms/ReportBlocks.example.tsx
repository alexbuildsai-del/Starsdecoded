import { chartPatterns } from "@workspace/engine";
import { goesBackwards } from "@/lib/house-deck";
import { sampleChart } from "@/site/data/sample";
import { ReportBlocks, StelliumChip } from "./ReportBlocks";

// The headings and the stellium count are her chart's, computed at run time; the block words are bracketed stand-ins,
// since the stored sample run predates the blocks.
const chart = sampleChart();
const stellium = chartPatterns(chart.planets, chart.angles).stelliums[0];
const backwards = Object.entries(chart.planets).filter(([k, p]) => goesBackwards(k, p.retrograde)).map(([k]) => k);

function Caption({ children }: { children: string }) {
  return <p className="m-0 font-label text-label uppercase text-label-dim">{children}</p>;
}

export default function ReportBlocksExample() {
  return (
    <div className="rp-root grid gap-6 p-4">
      <section className="grid gap-2">
        <Caption>Today · RP28</Caption>
        <p className="m-0 max-w-prose text-small text-paper-dim">
          The same three blocks in the same order; the R badge and heading drew in their own pinks (#6B3A42, #E3A3AD) and take
          `back` After, the RetrogradeBadge part.
        </p>
      </section>
      <section className="grid max-w-md gap-3 rounded-2xl border border-brass/35 bg-surface p-4">
        <Caption>After · Often noticed, the stellium, each body going backwards</Caption>
        <div><StelliumChip /></div>
        <ReportBlocks
          house={stellium?.house ?? 4}
          noticed={{ idea: "[stored noticed idea]", why: "[stored why]" }}
          stellium={stellium ? { text: "[stored stellium text]", balance: "[stored balance]", bodies: stellium.bodies } : null}
          retrograde={backwards.slice(0, 2).map((planet) => ({ planet, text: "[stored retrograde text]" }))}
          whole={false}
        />
      </section>
    </div>
  );
}
