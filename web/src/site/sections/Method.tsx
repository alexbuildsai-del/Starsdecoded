import { Link } from "wouter";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { clockWords } from "@/lib/date-entry";
import { PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { ReferenceCheck } from "@/site/components/ReferenceCheck";
import { SAMPLE, sampleChart } from "@/site/data/sample";
import { chartNotes, chartReadout, type NoteKind } from "@/site/lib/readouts";
import { formatUpdated } from "@/site/site";

// A note's dot takes the evidence card's hue for its kind: the sect's violet for a day or night birth, the placements' indigo for the rest.
const HUE: Record<NoteKind, string> = {
  sect: "var(--violet)",
  strongest: "var(--indigo-lt)",
  modality: "var(--indigo-lt)",
};

const FIGURE = "grid min-w-0 gap-[10px]";
// A step fills the page's width once the steps stack, so its lines stop at a reading measure.
const PROSE = "max-w-[62ch]";
// Chips wrap onto a second line rather than hold the artifact's fixed height, so the longest note fits a 320 px phone.
const CHIP =
  "sd-mono inline-flex min-h-[26px] items-center gap-[6px] rounded-[4px] border border-[var(--line)] bg-[rgba(6,8,12,.4)] px-[9px] py-[5px] text-[10.5px] leading-[1.3] font-medium tracking-[.06em] uppercase text-[var(--paper-dim)]";

/**
 * How it works, on the sample's own data (landing scope 9): her chart as the
 * engine works it out, what the engine notes in it, and one line of her report
 * with its evidence as the report shows it (review-01-10 scope 7). No model or
 * vendor is named here; AI is named in the FAQ and at the end of /method
 * (settled at lock, 3).
 */
export default function Method() {
  const chart = sampleChart();
  const { clock } = useEntryFormat();

  return (
    <section id="method" className="sd-sec sd-sec-c sd-line" aria-labelledby="method-h">
      <div className="sd-wrap">
        <div className="sd-shead">
          <p className="sd-eyebrow">How it works</p>
          <h2 className="sd-h2" id="method-h">
            How we make <em>your report</em>
          </h2>
          <p className="sd-sub">
            We work out your chart from where the planets really were, then write your report from it using our own rules for
            reading a chart.
          </p>
        </div>

        <ol className="sd-steps">
          <li className="sd-step">
            <span className="sn" aria-hidden="true">
              01
            </span>
            <h3>We work out your chart</h3>
            <p className={PROSE}>
              We find where the Sun, Moon and planets were at the minute and place you were born. We also check your birth town's
              clock history, so summer time is right.
            </p>
            <figure className={FIGURE}>
              <figcaption className="sd-tag">
                {[SAMPLE.name, formatUpdated(SAMPLE.birth.birthDate), clockWords(SAMPLE.birth.birthTime, clock), SAMPLE.place].join(" · ")}
              </figcaption>
              <div className="sd-readout">
                {chartReadout(chart, SAMPLE.birth).map((row) => (
                  <span key={row.label}>
                    <b>{row.label}</b>
                    {` ${row.value}`}
                  </span>
                ))}
              </div>
            </figure>
          </li>

          <li className="sd-step">
            <span className="sn" aria-hidden="true">
              02
            </span>
            <h3>We note what stands out</h3>
            <p className={PROSE}>
              Before anything is written, we note what stands out in your chart, such as a day or night birth and your strongest
              planets.
            </p>
            <figure className={FIGURE}>
              <figcaption className="sd-tag">What stands out in her chart</figcaption>
              <ul className="flex flex-wrap gap-[6px]">
                {chartNotes(chart).map((note) => (
                  <li key={note.kind} className={CHIP}>
                    <span aria-hidden="true" className="size-[5px] shrink-0 rounded-full" style={{ background: HUE[note.kind] }} />
                    {note.text}
                  </li>
                ))}
              </ul>
            </figure>
          </li>

          {/* The evidence card makes this step twice the height of the others, so on a wide screen it takes two columns and
              the first two steps stack beside it, rather than leaving two cards half empty. */}
          <li className="sd-step min-[901px]:col-span-2 min-[901px]:col-start-2 min-[901px]:row-span-2 min-[901px]:row-start-1">
            <span className="sn" aria-hidden="true">
              03
            </span>
            <h3>We write your report and check it</h3>
            <p className={PROSE}>
              Each chapter is written from those notes. Then every reference is checked against your chart, and anything that
              doesn't match is fixed or taken out before you see it.
            </p>
            <ReferenceCheck />
          </li>
        </ol>

        {/* Her name, chart and words appear above, so the sample's fine print does too (reading 4). */}
        <p className="sd-fine">
          These steps use {SAMPLE.name}'s chart and a line copied word for word from her {PERSONAL_REPORT}. Her birth time comes
          from her public birth record ({SAMPLE.source}). {PRODUCT} has no connection to her family or estate.
        </p>

        <div className="sd-facts">
          <p className="sd-fact">
            <b>Your birth details stay private</b>{" "}
            Our writing service only gets your name and where your planets are, never your birth date, time or place.
          </p>
          <p className="sd-fact">
            <b>No predictions</b>{" "}
            It won't forecast events, name dates or diagnose anything. It describes how you tend to work and gives you things to
            try.
          </p>
        </div>

        <Link className="sd-more" href="/method">
          How we make your report, step by step
        </Link>
      </div>
    </section>
  );
}
