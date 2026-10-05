/**
 * /timeline's first screen (timeline-page §1 item 1; ADR-116, 249, 250; reading 18): the registry's eyebrow, heading
 * and lede, Get my report and the jump to the finder, then Timeline's dial on Mira's chart. The prerender draws her
 * Monday whole and still; Play steps through her next six months only when pressed, and the day's plain headlines
 * follow it.
 */
import { useState } from "react";
import type { Tone } from "@workspace/engine";
import { ToneWord } from "@/components/timeline/ContactCard";
import { Dial } from "@/components/timeline/Dial";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { dayWords, type DialFrame } from "@/lib/dial";
import { PERSONAL_REPORT } from "@/lib/product";
import { ReportCta } from "@/site/cta";
import { MIRA, MIRA_WEEK, pairOf } from "@/site/data/timeline/mira";
import { pageFor } from "@/site/site";

const page = pageFor("/timeline");

/** The finder's own section (CycleFinder), where Life's link lands too. */
const FINDER = "#finder";

// A frame names its contacts but not what each says, and the week's file holds each one's headline and tone.
const SAID = new Map(MIRA_WEEK.contacts.map((c) => [pairOf(c), { headline: c.headline, tone: c.tone }]));

interface DayLines {
  lines: { headline: string; tone: Tone | null }[];
  /** Headlines that day beyond the frame's three. */
  more: number;
}

function dayLines(frame: DialFrame | undefined): DayLines {
  const said = (frame?.contacts ?? []).flatMap((c) => SAID.get(pairOf(c)) ?? []);
  const lines = (frame?.headlines ?? []).map((headline) => ({
    headline,
    tone: said.find((s) => s.headline === headline)?.tone ?? null,
  }));
  return { lines, more: Math.max(0, new Set(said.map((s) => s.headline)).size - lines.length) };
}

export default function Hero() {
  const [day, setDay] = useState(0);
  const { order } = useEntryFormat();
  const frame = MIRA.frames[day];
  const { lines, more } = dayLines(frame);

  return (
    <header className="sd-head">
      <div className="sd-wrap gap-y-10 min-[880px]:grid-cols-[minmax(0,1fr)_minmax(0,440px)] min-[880px]:items-center min-[880px]:gap-x-14">
        <div className="grid min-w-0 content-center gap-[18px]">
          <p className="sd-eyebrow">{page.eyebrow}</p>
          <h1 className="sd-page-h1">{page.h1}</h1>
          <p className="sd-lede">{page.lede}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <ReportCta source="timeline" className="sd-btn" />
            <a className="sd-btn sd-btn-g" href={FINDER}>
              When is your Saturn return?
            </a>
          </div>
          <p className="text-[13px] leading-normal text-[color:var(--sd-muted)]">
            Timeline opens after launch. You'll need a {PERSONAL_REPORT}.
          </p>
        </div>

        <figure className="m-0 grid w-full min-w-0 max-w-[440px] justify-self-center gap-4">
          <Dial
            points={MIRA.points}
            angles={MIRA.angles}
            frames={MIRA.frames}
            day={day}
            onDay={setDay}
            playable
            trail="played"
            label="Mira's chart"
          >
            <p className="grid min-w-0 gap-0.5">
              <span className="font-display text-lg leading-tight text-[color:var(--paper)]">
                {frame ? dayWords(frame.date, order) : null}
              </span>
              <span className="text-xs text-[color:var(--sd-muted)]">Mira's chart · the next six months</span>
            </p>
          </Dial>
          {/* Room for three lines and the count, so nothing under the dial moves while it plays. */}
          <div className="grid min-h-[6.75rem] content-start gap-2">
            {lines.length > 0 ? (
              <ul role="list" className="m-0 grid list-none gap-2 p-0">
                {lines.map(({ headline, tone }) => (
                  <li key={headline} className="grid grid-cols-[5rem_minmax(0,1fr)] items-baseline gap-x-3">
                    {tone ? <ToneWord tone={tone} /> : <span />}
                    <span className="text-[14.5px] leading-snug text-[color:var(--paper)]">{headline}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14.5px] leading-snug text-[color:var(--paper-dim)]">A quiet day on her chart.</p>
            )}
            {more > 0 ? <p className="text-[13px] text-[color:var(--sd-muted)]">and {more} more</p> : null}
          </div>
          <figcaption className="text-xs leading-normal text-[color:var(--sd-muted)]">
            Mira is our sample account. Inside, her chart and houses. Outside, each planet on its own track, coloured by how
            it feels.
          </figcaption>
        </figure>
      </div>
    </header>
  );
}
