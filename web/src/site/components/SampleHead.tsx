/**
 * /sample's first screen (annex /sample): "A sample: 4 of 10 chapters from"
 * over the registry's H1, so the two read as one line (ADR-178), then its lede
 * beside the report's opening ring, drawn from her computed chart. The ring is
 * framed on the Ascendant itself, as the site's wheels are, so its dotted line
 * is her horizon and east is on the left; the Sun and the Moon sit at their
 * true angles and the rising marker on the horizon (§9, ADR-49).
 */
import { norm360, pointAt } from "@/components/chart/wheel-geometry";
import { AngleGlyphShape } from "@/components/report/AngleGlyph";
import { CONJUNCTION_DEGREES, separation } from "@/components/report/hero-layout";
import { CHAPTERS } from "@/lib/chapters";
import { PLANET_RENDERS } from "@/lib/planet-renders";
import { PERSONAL_REPORT } from "@/lib/product";
import { clockWords } from "@/lib/date-entry";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { triadRowsOf } from "@/lib/triad-row";
import { TriadRow } from "@/components/TriadRow";
import type { ChartData } from "@/types/chart";
import { OPEN_CHAPTERS, SAMPLE, sampleChart } from "@/site/data/sample";
import { formatUpdated, type PageEntry } from "@/site/site";

export const SAMPLE_KICKER_ID = "sd-sample-kicker";
export const SAMPLE_TITLE_ID = "sd-sample-title";

const C = 150;
const RING = 112;
const MARKER = 7;
const CLEAR = 4;
const SIZE = { sun: 48, moon: 34 } as const;

const at2 = (n: number) => n.toFixed(2);
const angleOf = (degree: number, frame: number) => 180 + norm360(degree - frame);

// A light never leaves its angle (§9): when the two meet, the Moon holds the ring and the Sun steps outside it (ADR-22);
// a light that would sit on the rising marker steps inward along its own spoke instead.
function lights(chart: ChartData, frame: number, drawn: boolean) {
  const { sun, moon } = chart.planets;
  const together = separation(sun.absoluteDegree, moon.absoluteDegree) < CONJUNCTION_DEGREES;
  return (["moon", "sun"] as const).map((key) => {
    const degree = chart.planets[key].absoluteDegree;
    const reach = SIZE[key] / 2 + MARKER + CLEAR;
    const apart = (separation(degree, frame) * Math.PI) / 180;
    const onMarker = drawn && 2 * RING * Math.sin(apart / 2) < reach;
    // Only as far in as clears the marker: where its spoke first lies `reach` from the marker's centre.
    const inward = RING * Math.cos(apart) - Math.sqrt(reach ** 2 - (RING * Math.sin(apart)) ** 2);
    const radius = key === "sun" && together ? RING + (SIZE.sun + SIZE.moon) / 2 + CLEAR : onMarker ? inward : RING;
    const p = pointAt(C, C, radius, angleOf(degree, frame));
    return { key, x: p.x, y: p.y, size: SIZE[key] };
  });
}

function Opening({ chart }: { chart: ChartData }) {
  const asc = chart.angles?.ascendant;
  const frame = asc?.absoluteDegree ?? 0;
  const drawn = asc !== undefined;

  return (
    <div className="w-full max-w-[300px] justify-self-end max-[1000px]:max-w-[280px] max-[1000px]:justify-self-start">
      <svg viewBox="0 0 300 300" className="block h-auto w-full overflow-visible" role="img" aria-label={`${SAMPLE.name}'s Sun, Moon and rising sign at their true angles`}>
        <circle cx={C} cy={C} r={RING} fill="none" stroke="var(--sd-brass)" strokeOpacity={0.5} />
        <circle cx={C} cy={C} r={86} fill="none" stroke="var(--sd-brass)" strokeOpacity={0.12} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = angleOf(i * 30, frame);
          const p = pointAt(C, C, RING - 6, a);
          const q = pointAt(C, C, RING + 6, a);
          return <line key={i} x1={at2(p.x)} y1={at2(p.y)} x2={at2(q.x)} y2={at2(q.y)} stroke="var(--sd-brass)" strokeOpacity={0.35} />;
        })}
        {drawn && <line x1={8} y1={C} x2={292} y2={C} stroke="var(--sd-brass)" strokeOpacity={0.32} strokeDasharray="2 5" />}
        {lights(chart, frame, drawn).map((b) => (
          <image key={b.key} href={PLANET_RENDERS[b.key]} x={at2(b.x - b.size / 2)} y={at2(b.y - b.size / 2)} width={b.size} height={b.size} />
        ))}
        {drawn && <AngleGlyphShape x={C - RING} y={C} r={MARKER} direction={180} stroke="var(--sd-brass)" fill="var(--bg)" strokeWidth={1.5} />}
        <text x={C} y={128} textAnchor="middle" className="font-numeric" fontSize={8.5} letterSpacing={2.2} fill="var(--indigo-lt)">
          {PERSONAL_REPORT.toUpperCase()}
        </text>
        <text x={C} y={162} textAnchor="middle" className="font-display" fontSize={34} fill="var(--paper-hi)">
          {SAMPLE.name.split(" ")[0]}
        </text>
      </svg>
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
