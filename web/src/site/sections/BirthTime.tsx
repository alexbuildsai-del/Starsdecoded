import { useMemo, type CSSProperties } from "react";
import { Link } from "wouter";
import { TriadPlate } from "@/components/report/TriadPlate";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { MODE_LABELS } from "@/lib/birth-time";
import { SAMPLE_PEOPLE } from "@/site/data/people";
import { partsOfDay, plateAnswer, plateLine, plateReadout, timePlates } from "@/site/lib/readouts";
import { formatUpdated } from "@/site/site";

// The triad plate strokes in the report page's two brass tokens, which the site does not define: both are drawn from the site's brass.
const PLATE_TOKENS = {
  "--sky": "var(--sd-brass)",
  "--sky-dim": "color-mix(in srgb, var(--sd-brass) 65%, var(--color-void))",
} as CSSProperties;

const PLATE =
  "grid min-w-0 content-start justify-items-center gap-[9px] rounded-card border border-line bg-surface/60 px-[14px] py-4 text-center";

/**
 * Birth time (landing scope 10), set under How it works as the locked design
 * sets it, so it keeps that section's ground and needs no top rule. The three
 * plates are one sample person's birth as the birth form takes each answer,
 * each read through the form's own sweep and readout (ADR-33).
 */
export default function BirthTime() {
  const person = SAMPLE_PEOPLE[0];
  const { clock } = useEntryFormat();
  // Two of the plates are sweeps across the day, a phone's tenth of a second each, so a re-render must not redo them.
  const plates = useMemo(() => timePlates(person.birth, person.chart), [person]);

  return (
    <section className="sd-sec pt-0" aria-labelledby="birth-time-h">
      <div className="sd-wrap">
        <div className="sd-duo mt-0 grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] items-center max-[900px]:grid-cols-1 max-[900px]:gap-8">
          <div>
            <p className="sd-eyebrow">Birth time</p>
            <h3 id="birth-time-h">You still get the full report without a birth time</h3>
            <p className="t max-w-[62ch]">
              Many people only know roughly, from what a parent remembers. Some don't know at all. Tell us what you have: the
              exact time, a part of the day, or nothing. The report only uses what your answer can tell us. It says what it
              leaves out. If you find your time later, add it for free and we'll mark every change.
            </p>
            <ul className="sd-parts" aria-label="Parts of the day">
              {partsOfDay(clock).map(({ part, hours }) => (
                <li key={part}>
                  <span>
                    {part} <i>{hours}</i>
                  </span>
                </li>
              ))}
            </ul>
            <Link className="sd-more" href="/learn/birth-time">
              More about birth times
            </Link>
          </div>

          <figure className="grid min-w-0 gap-3" style={PLATE_TOKENS}>
            <figcaption className="sd-tag text-center">
              {`A sample person · ${person.name} · born ${formatUpdated(person.birthDate)}`}
            </figcaption>
            <ul className="grid grid-cols-3 gap-[14px] max-[560px]:grid-cols-1">
              {plates.map((plate) => (
                <li key={plate.mode} className={PLATE}>
                  <p className="sd-eyebrow text-caption tracking-[.2em] text-paper">{MODE_LABELS[plate.mode].title}</p>
                  <p className="min-h-[2.8em] text-caption leading-[1.4] text-muted">{plateAnswer(plate, clock)}</p>
                  {/* The readout under the plate states its facts, so the drawing stays out of the reading order. */}
                  <div aria-hidden="true">
                    <TriadPlate chart={plate.chart} name={person.name} className="block h-auto w-[150px] max-w-full" />
                  </div>
                  <p className="sd-mono text-kicker leading-[1.5] tracking-[.04em] uppercase text-paper-dim">
                    {plateReadout(plate, clock)}
                  </p>
                  <p className="text-caption leading-[1.45] text-muted">{plateLine(plate)}</p>
                </li>
              ))}
            </ul>
          </figure>
        </div>
      </div>
    </section>
  );
}
