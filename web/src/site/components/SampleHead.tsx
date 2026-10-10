/**
 * /sample's first screen (annex /sample): "A sample: 4 of 10 chapters from"
 * over the registry's H1, so the two read as one line (ADR-178), then its lede
 * beside her chart in its Sun, Moon and rising state (EveryChart). The plate
 * is tilted so her rising degree sits on the level horizon, east on the left,
 * as the site's wheels stand (ADR-49, 395).
 */
import { Chart } from "@/ds/organisms/chart/Chart";
import { CHAPTERS } from "@/lib/chapters";
import { PERSONAL_REPORT } from "@/lib/product";
import { clockWords } from "@/lib/date-entry";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { tiltToAscendant } from "@/lib/sky-now";
import { triadRowsOf } from "@/lib/triad-row";
import { TriadRow } from "@/components/TriadRow";
import type { ChartData } from "@/types/chart";
import { OPEN_CHAPTERS, SAMPLE, sampleChart } from "@/site/data/sample";
import { formatUpdated, type PageEntry } from "@/site/site";

export const SAMPLE_KICKER_ID = "sd-sample-kicker";
export const SAMPLE_TITLE_ID = "sd-sample-title";

const PLATE = 300;

function Opening({ chart }: { chart: ChartData }) {
  return (
    <div className="w-full max-w-[300px] justify-self-end max-[1000px]:max-w-[280px] max-[1000px]:justify-self-start">
      <div className="relative">
        {/* The words stay level; only the plate turns onto her horizon. */}
        <div style={{ transform: `rotate(${tiltToAscendant(chart)}deg)` }}>
          <Chart chart={chart} state="sun-moon-rising" size={PLATE} fluid label={`${SAMPLE.name}'s Sun, Moon and rising sign at their true angles`} />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-content-center justify-items-center gap-1">
          <span className="font-numeric text-data-sm text-indigo-lt">{PERSONAL_REPORT.toUpperCase()}</span>
          <span className="font-display text-section leading-none text-paper">{SAMPLE.name.split(" ")[0]}</span>
        </div>
      </div>
      <TriadRow rows={triadRowsOf(chart)} className="mt-5" />
    </div>
  );
}

export function SampleHead({ page }: { page: PageEntry }) {
  const { name, birth, place, run } = SAMPLE;
  const { clock } = useEntryFormat();
  const written = run.meta.generatedAt.slice(0, 10);
  const sect = run.meta.sect ? [`${run.meta.sect.charAt(0).toUpperCase()}${run.meta.sect.slice(1)} chart`] : [];

  return (
    <header className="sd-head">
      <div className="sd-wrap grid-cols-[minmax(0,1fr)_minmax(0,300px)] items-center gap-x-14 max-[1000px]:grid-cols-1">
        <div className="grid min-w-0 gap-[18px]">
          {/* The prerender holds the H1 to the registry's words, so the count leads into it from the eyebrow's line. */}
          <p id={SAMPLE_KICKER_ID} className="sd-eyebrow">{`A sample: ${OPEN_CHAPTERS.length} of ${CHAPTERS.length} chapters from`}</p>
          <h1 id={SAMPLE_TITLE_ID} className="sd-page-h1">
            {page.h1}
          </h1>
          <p className="sd-lede">
            {page.lede} It was written from {name}'s birth chart: {formatUpdated(birth.birthDate)} at {clockWords(birth.birthTime, clock)} in {place}.
          </p>
          <p className="sd-meta">
            Written <time dateTime={written}>{formatUpdated(written)}</time> · {[...sect, "Whole sign", "Tropical"].join(" · ")}
          </p>
        </div>
        <Opening chart={sampleChart()} />
      </div>
    </header>
  );
}
