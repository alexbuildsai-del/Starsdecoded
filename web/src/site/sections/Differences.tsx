/**
 * The two differences (ADR-173, review-01-10 scope 2): right after the home page's hero, and again at the end of
 * /sample, two pillars say what Stars Decoded is. A thing to try carries the report's one tick box (ADR-172), its ticks
 * kept in this page's memory and never sent. The first pillar quotes the sample's stored run; the second draws two
 * sample people and the scenes their lens plays out until a sample pair's run is committed (MB-93).
 */
import { useId, type ReactNode } from "react";
import { Checklist, localTicks } from "@/components/report/Checklist";
import { chapterAccent } from "@/lib/chapter-accent";
import { lensInfo } from "@/lib/lenses";
import { COMPATIBILITY_REPORT } from "@/lib/product";
import { first } from "@/lib/share-card";
import { TwoPlates } from "@/site/components/TwoPlates";
import { BAND_LENS, DIFFERENCES, sceneRows, type SamplePairQuote } from "@/site/data/differences";
import { SAMPLE_PAIRS, samplePerson } from "@/site/data/people";
import { SAMPLE } from "@/site/data/sample";

const EYEBROW = "font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[.18em]";
// The checklist's own heading, so a list of scenes under it reads as the same rank as the things to try beside it.
const LIST_HEAD = "font-label text-[10px] uppercase tracking-[.2em]";
const EXCERPT = "m-0 grid min-w-0 gap-2.5 rounded-[12px] border border-[var(--line)] bg-[var(--bg)] p-4";

const two = (n: number): string => String(n).padStart(2, "0");
const firstOf = (id: string): string => first(samplePerson(id)?.name ?? id);

// Drawn as the approved artifact draws them, so each pillar carries the mark the Owner approved.
const REPORT_MARK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M4 19.5V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2" />
    <path d="M9 8h6M9 12h4" />
  </svg>
);

const CIRCLE_MARK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className="h-5 w-5">
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="8.5" strokeDasharray="2 3" />
    <circle cx="19.5" cy="8" r="1.6" fill="currentColor" />
    <circle cx="5" cy="15" r="1.6" fill="currentColor" />
  </svg>
);

/** Each pillar names itself, so it reads whole when it is the only part a reader or an answer engine takes. */
function Pillar({ mark, title, text, children }: { mark: ReactNode; title: string; text: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="grid min-w-0 max-w-[620px] content-start gap-3.5">
      <span
        aria-hidden="true"
        className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--line)] bg-[rgba(6,8,12,.55)] text-[var(--indigo-lt)]"
      >
        {mark}
      </span>
      <h2 id={id} className="mt-1 text-[22px] leading-[1.2] min-[900px]:text-[26px]">
        {title}
      </h2>
      <p className="max-w-[46ch] text-[15px] leading-[1.6] text-[var(--paper-dim)] min-[900px]:text-[16px]">{text}</p>
      {children}
    </section>
  );
}

function ReportPillar() {
  return (
    <Pillar
      mark={REPORT_MARK}
      title="A personality report, not a horoscope"
      text="It describes how you think, work and love through moments from everyday life. Most chapters end with things to try, and you tick them off as you go."
    >
      <figure className={EXCERPT}>
        <figcaption className={`${EYEBROW} text-[var(--sd-brass)]`}>{`From ${SAMPLE.name}'s report · sample`}</figcaption>
        <blockquote className="m-0 font-display text-[18px] leading-[1.45] text-[var(--paper)]">
          <p>
            <q>{DIFFERENCES.line}</q>
          </p>
        </blockquote>
        <p className="text-[13px] leading-[1.5] text-[var(--paper)]">
          <span className={`${EYEBROW} mr-1.5 text-[var(--indigo-lt)]`}>Behaviour check</span> {DIFFERENCES.check}
        </p>
      </figure>
      <Checklist heading="Practice" items={DIFFERENCES.practice} store={localTicks()} />
    </Pillar>
  );
}

/** A sample pair's headline and two things to try together, in the same tick box as Practice beside it. */
function PairQuote({ pair }: { pair: SamplePairQuote }) {
  const [a, b] = pair.people;
  return (
    <>
      <figure className={EXCERPT}>
        <figcaption className={`${EYEBROW} text-[var(--violet)]`}>
          {`From a ${COMPATIBILITY_REPORT} · ${firstOf(a)} and ${firstOf(b)} · sample`}
        </figcaption>
        <blockquote className="m-0 font-display text-[18px] italic leading-[1.45] text-[var(--paper)]">
          <p>
            <q>{pair.headline}</q>
          </p>
        </blockquote>
      </figure>
      <Checklist heading="Try together" items={pair.tryTogether} store={localTicks()} />
    </>
  );
}

/** Two sample people's charts on one horizon and the scenes their lens plays out: computed, labelled, and nobody's words. */
function SamplePair() {
  const listId = useId();
  const [aId, bId] = SAMPLE_PAIRS[BAND_LENS];
  const a = samplePerson(aId);
  const b = samplePerson(bId);
  return (
    <>
      {a && b && (
        <div className={EXCERPT}>
          <p className={`${EYEBROW} text-[var(--violet)]`}>{`Sample people · ${first(a.name)} and ${first(b.name)}`}</p>
          {/*
            At a desktop column's full width the plates stood twice the height of the quote beside them; any narrower,
            "One horizon" breaks in two.
          */}
          <div className="mx-auto w-full max-w-[500px]">
            <TwoPlates a={a} b={b} />
          </div>
        </div>
      )}
      {/*
        The checklist's top rule and heading, so the scenes line up with Practice beside them; the rows are
        /compatibility's chapter rows, since a scene is not a thing to tick.
      */}
      <div className="mt-[18px] border-t border-[var(--line-soft)] pt-3">
        <p id={listId} className={`${LIST_HEAD} text-[var(--violet)]`}>
          {`Scenes for ${lensInfo(BAND_LENS).door.toLowerCase()}`}
        </p>
        <ul aria-labelledby={listId} className="m-0 mt-2 grid list-none gap-2 p-0">
          {sceneRows().map((row) => (
            <li
              key={row.scene}
              className="grid grid-cols-[30px_minmax(0,1fr)] items-baseline gap-2 rounded-[10px] border border-[var(--line-soft)] bg-[rgba(6,8,12,.55)] px-3.5 py-2.5"
            >
              <span aria-hidden="true" className="font-numeric text-[11.5px] font-medium" style={{ color: chapterAccent(row.n) }}>
                {two(row.n)}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[17px] leading-[1.3] text-[var(--paper)]">{row.scene}</span>
                <span className="mt-0.5 block text-[13px] leading-[1.45] text-[var(--sd-muted)]">{row.chapter}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function CirclePillar() {
  return (
    <Pillar
      mark={CIRCLE_MARK}
      title="Your circle starts with you"
      text={`Then add your partner, your mum, your kids or a friend. A ${COMPATIBILITY_REPORT} shows how the two of you get along in real situations, like money, a weekend away or an argument. It gives you both something to try.`}
    >
      {/* MB-93 provisional: a committed sample pair run takes this slot; until one exists, the plates and scenes hold it. */}
      {DIFFERENCES.pair ? <PairQuote pair={DIFFERENCES.pair} /> : <SamplePair />}
    </Pillar>
  );
}

/** Void at both edges, the dark the hero's ground fades to and Claims starts on, so neither meets a lighter band. */
export default function Differences() {
  return (
    <div className="relative bg-[linear-gradient(180deg,var(--void)_0%,var(--bg)_22%,var(--bg)_78%,var(--void)_100%)] py-[64px] min-[900px]:py-[96px]">
      <div className="sd-wrap grid items-start gap-x-12 gap-y-14 min-[900px]:grid-cols-2">
        <ReportPillar />
        <CirclePillar />
      </div>
    </div>
  );
}
