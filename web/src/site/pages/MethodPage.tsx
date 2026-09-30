/**
 * How we make your report, step by step (annex /method): the landing's steps at
 * length, each beside the sample's own data as the engine works it out (R-3.1).
 * AI is named once here, in the answer at the end, and once in the FAQ, never
 * first (ADR-117).
 */
import type { ReactNode } from "react";
import { Link } from "wouter";
import { chapterAccent } from "@/lib/chapter-accent";
import { CHAPTERS } from "@/lib/chapters";
import { withHouseWords } from "@/lib/evidence-glossary";
import { PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { SiteLayout } from "../SiteLayout";
import { homeClaims } from "../data/claims";
import { SAMPLE, sampleChart } from "../data/sample";
import { chartNotes, chartReadout, type NoteKind } from "../lib/readouts";
import { SAMPLE_LIVE, formatUpdated, pageFor } from "../site";

const page = pageFor("/method");

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const countWord = (n: number): string => COUNT_WORDS[n] ?? String(n);
const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const two = (n: number): string => String(n).padStart(2, "0");

// The home section's notes, chips and ticks are private to it, so the page draws the same ones with the same values.
const HUE: Record<NoteKind, string> = {
  sect: "var(--violet)",
  strongest: "var(--indigo-lt)",
  element: "var(--indigo-lt)",
  modality: "var(--indigo-lt)",
};
const CHIP =
  "sd-mono inline-flex min-h-[26px] items-center gap-[6px] rounded-[4px] border border-[var(--line)] bg-[rgba(6,8,12,.4)] px-[9px] py-[5px] text-[10.5px] leading-[1.3] font-medium tracking-[.06em] uppercase text-[var(--paper-dim)]";
const CHECK =
  "sd-mono flex items-center gap-[10px] rounded-[10px] border border-[rgba(127,176,139,.35)] bg-[rgba(127,176,139,.07)] px-3 py-[9px] text-[12px] leading-[1.4] tracking-[.04em] uppercase text-[var(--paper-dim)]";
const PROSE = "max-w-[54ch] text-[16.5px] leading-[1.7] text-[var(--paper-dim)]";

function Tick() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-[14px] shrink-0 text-[#7FB08B]"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Text left and the sample's data right; they stack before the data would be squeezed. */
function Step({ n, title, figure, children }: { n: number; title: string; figure: ReactNode; children: ReactNode }) {
  return (
    <li className="grid items-start gap-x-14 gap-y-7 border-t border-[var(--line-soft)] py-11 first:border-t-0 first:pt-0 last:pb-0 min-[1000px]:grid-cols-2">
      <div className="grid min-w-0 gap-3.5">
        <p className="sd-mono text-[12px] tracking-[.1em] text-[var(--indigo-lt)]" aria-hidden="true">
          {two(n)}
        </p>
        <h2 className="text-[clamp(26px,2.6vw,32px)] leading-[1.15]">{title}</h2>
        {children}
      </div>
      {figure}
    </li>
  );
}

function Shown({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="grid min-w-0 content-start gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(17,22,31,.55)] p-[18px]">
      <figcaption className="sd-tag">{caption}</figcaption>
      {children}
    </figure>
  );
}

function Steps() {
  const chart = sampleChart();
  // The home page checks the same claim, so both pages show one proof.
  const cited = homeClaims()[0].claim;
  const refs = cited.evidence.length;
  const chapters = countWord(CHAPTERS.length);

  return (
    <section className="sd-pg-sec sd-sec-a sd-line">
      <div className="sd-wrap">
        <ol className="m-0 grid list-none p-0">
          <Step
            n={1}
            title="We work out your chart"
            figure={
              <Shown caption={[SAMPLE.name, formatUpdated(SAMPLE.birth.birthDate), SAMPLE.birth.birthTime, SAMPLE.place].join(" · ")}>
                <div className="sd-readout">
                  {chartReadout(chart, SAMPLE.birth).map((row) => (
                    <span key={row.label}>
                      <b>{row.label}</b>
                      {` ${row.value}`}
                    </span>
                  ))}
                </div>
              </Shown>
            }
          >
            <p className={PROSE}>
              We find where the Sun, Moon and planets were at the minute and place you were born. {PRODUCT} uses
              astronomy-engine, an open-source astronomy library that's accurate to within one arcminute, a sixtieth of a degree,
              and tested against NASA's JPL Horizons. Every chart is worked out by the same code.
            </p>
            <p className={PROSE}>
              We also check your birth town's clock history, so summer time and old time zones are right. Your houses are whole
              sign and the zodiac is tropical. <Link href="/learn/whole-sign-houses">What whole-sign houses are</Link>
            </p>
          </Step>

          <Step
            n={2}
            title="We note what stands out"
            figure={
              <Shown caption="What stands out in her chart">
                <ul className="m-0 flex list-none flex-wrap gap-[6px] p-0">
                  {chartNotes(chart).map((note) => (
                    <li key={note.kind} className={CHIP}>
                      <span aria-hidden="true" className="size-[5px] shrink-0 rounded-full" style={{ background: HUE[note.kind] }} />
                      {note.text}
                    </li>
                  ))}
                </ul>
              </Shown>
            }
          >
            <p className={PROSE}>
              Before anything is written, we note what stands out in your chart, such as a day or night birth and your strongest
              planets. The notes also say which houses are crowded and which planet rules each part of your life.
            </p>
            <p className={PROSE}>
              These notes decide what each chapter is about, so your report is built around your chart rather than a template.
            </p>
          </Step>

          <Step
            n={3}
            title="We write your report"
            figure={
              <Shown caption={`${capital(chapters)} chapters`}>
                <ol className="m-0 grid list-none gap-x-4 gap-y-1 p-0 min-[760px]:grid-cols-2">
                  {CHAPTERS.map((chapter, i) => (
                    <li
                      key={chapter.section}
                      className="grid grid-cols-[24px_minmax(0,1fr)] border-t border-[var(--line-soft)] py-[5px] text-[13.5px] leading-[1.5] text-[var(--paper-dim)]"
                    >
                      <span aria-hidden="true" className="sd-mono text-[10.5px] leading-[1.9] font-medium" style={{ color: chapterAccent(i + 1) }}>
                        {two(i + 1)}
                      </span>
                      <span className="min-w-0">{chapter.title}</span>
                    </li>
                  ))}
                </ol>
              </Shown>
            }
          >
            <p className={PROSE}>
              Each of the {chapters} chapters is written from those notes, following our own rules for reading a chart. Every
              sentence has to be about you, in plain words, and has to point to the part of your chart it comes from.
            </p>
            <p className={PROSE}>
              It won't name dates, predict events or diagnose anything. It describes how you tend to think, work and love, and
              gives you things to try.
            </p>
          </Step>

          <Step
            n={4}
            title="We check every reference"
            figure={
              <Shown caption="One line from her report">
                <blockquote className="font-display text-[17px] leading-[1.45] text-[var(--paper)] italic">{`“${cited.quote}”`}</blockquote>
                <ul className="m-0 grid list-none p-0">
                  {cited.evidence.map((e, i) => (
                    <li
                      key={i}
                      className="sd-mono grid grid-cols-[14px_minmax(0,1fr)] items-center gap-2.5 border-t border-[var(--line-soft)] py-2 text-[12px] leading-[1.4] text-[var(--paper-dim)]"
                    >
                      <Tick />
                      <span className="min-w-0">
                        <span className="uppercase">{e.ref.kind}</span>
                        {` · ${withHouseWords(e.label)}`}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className={CHECK}>
                  <Tick />
                  {`${refs} ${refs === 1 ? "reference" : "references"} · all checked against her chart`}
                </p>
              </Shown>
            }
          >
            <p className={PROSE}>
              Every reference in your report is checked against your chart by code. If one doesn't match, that sentence is
              rewritten or taken out before you see it.
            </p>
            {/* MB-91 provisional: the soft pass writes some reports on no credit, so this holds for every failed report only once credits go hard (R12). */}
            <p className={PROSE}>If a chapter still can't pass, you get your credit back and we tell you what went wrong.</p>
          </Step>
        </ol>

        <p className="sd-fine">
          The line above is copied word for word from {SAMPLE.name}'s {PERSONAL_REPORT}. Her birth time comes from her public
          birth record ({SAMPLE.source}). {PRODUCT} has no connection to her family or estate.
        </p>
      </div>
    </section>
  );
}

function FactsAndAi() {
  return (
    <section className="sd-pg-sec sd-sec-c sd-line">
      <div className="sd-wrap">
        <div className="sd-facts mt-0">
          <p className="sd-fact">
            <b>Your birth details stay private</b>{" "}
            Our writing service only gets your name and where your planets are, never your birth date, time or place.
          </p>
          {/* The home page's wording would repeat step 3 a screen above it, so this page keeps the locked design's own. */}
          <p className="sd-fact">
            <b>No predictions</b> It won't name dates, talk about fate or diagnose anything. It's about how you tend to work.
          </p>
          {/* MB-91 provisional: the home page's words, kept until credits go hard (R12) and every failed report holds one to give back. */}
          <p className="sd-fact">
            <b>You get your credit back if something goes wrong</b> We tell you what happened, and you can try again.
          </p>
        </div>

        {/* It must agree with the FAQ's "How is the report written?", the only other place AI is named. */}
        <div className="mt-14 grid max-w-[64ch] gap-2.5">
          <h2 className="text-[clamp(26px,2.6vw,32px)] leading-[1.15]">Is the report written by AI?</h2>
          <p className="text-[16px] leading-[1.7] text-[var(--paper-dim)]">
            Yes, with the help of AI. It writes each chapter from the notes about your chart, following our own rules. Then code
            checks every reference against your chart before you see it.
          </p>
        </div>
      </div>
    </section>
  );
}

function Related() {
  const houses = pageFor("/learn/whole-sign-houses");
  const faq = pageFor("/faq");
  return (
    <div className="sd-rel">
      {SAMPLE_LIVE && (
        <Link className="sd-relcard" href="/sample">
          <span className="sd-eyebrow">{pageFor("/sample").eyebrow}</span>
          <b>Read a full report</b>
          <span>{`${SAMPLE.name}'s, word for word`}</span>
        </Link>
      )}
      <Link className="sd-relcard" href={houses.path}>
        <span className="sd-eyebrow">Learn</span>
        <b>{houses.h1}</b>
        <span>Why every house is one sign</span>
      </Link>
      <Link className="sd-relcard" href={faq.path}>
        <span className="sd-eyebrow">{faq.eyebrow}</span>
        <b>{faq.h1}</b>
        <span>Short answers about the reports</span>
      </Link>
    </div>
  );
}

export default function MethodPage() {
  return (
    <SiteLayout page={page} end={<Related />}>
      <Steps />
      <FactsAndAi />
    </SiteLayout>
  );
}
