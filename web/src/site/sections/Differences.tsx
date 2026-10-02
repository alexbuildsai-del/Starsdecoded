/**
 * What a report is (ADR-173, review-02-10 scope 1): right after the home page's hero, and again at the end of /sample,
 * one line of the sample's stored run taken apart in three notes. The thing to try carries the report's one tick box
 * (ADR-172), its ticks kept in this page's memory and never sent.
 */
import { useId, useState, type ReactNode } from "react";
import { Checklist, localTicks } from "@/components/report/Checklist";
import { DIFFERENCES } from "@/site/data/differences";

const NOTE = "grid grid-cols-[22px_minmax(0,1fr)] items-start gap-x-2.5 gap-y-2.5";
const TITLE = "text-[13.5px] font-semibold leading-[1.5] text-[var(--paper)]";
// The section's note names the list, so the checklist's own rule and heading stand down, the heading kept for a screen reader.
const BARE = "[&>div]:mt-0 [&>div]:max-w-none [&>div]:border-t-0 [&>div]:pt-0 [&>div>span:first-child]:sr-only [&_ul]:mt-0";

function Note({ n, title, children }: { n: number; title: string; children?: ReactNode }) {
  return (
    <li className={NOTE}>
      <span
        aria-hidden="true"
        className="grid h-[22px] w-[22px] place-items-center rounded-full border border-[rgba(212,176,106,.5)] font-numeric text-[11px] font-medium text-[var(--sd-brass)]"
      >
        {n}
      </span>
      <div className="grid min-w-0 gap-2.5">
        <p className={TITLE}>{title}</p>
        {children}
      </div>
    </li>
  );
}

/** Void at both edges, the dark the hero's ground fades to and Claims starts on, so neither meets a lighter band. */
export default function Differences() {
  const id = useId();
  const { line, placement, action } = DIFFERENCES;
  const [ticks] = useState(localTicks);
  return (
    <section
      aria-labelledby={id}
      className="relative bg-[linear-gradient(180deg,var(--void)_0%,var(--bg)_22%,var(--bg)_78%,var(--void)_100%)] py-[64px] min-[900px]:py-[96px]"
    >
      <div className="sd-wrap grid gap-5">
        <p className="sd-eyebrow">Your report</p>
        <h2 id={id} className="sd-h2 max-w-[18ch] text-[clamp(28px,8vw,34px)] min-[900px]:text-[clamp(34px,3.8vw,46px)]">
          A personality report, not a horoscope
        </h2>
        <div className="mt-3 grid min-w-0 items-start gap-6 min-[900px]:mt-6 min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] min-[900px]:gap-x-16">
          <blockquote className="m-0 font-display text-[27px] leading-[1.25] text-[var(--paper)] min-[900px]:text-[clamp(30px,3.2vw,40px)]">
            <p>
              <q>{line}</q>
            </p>
          </blockquote>
          <ol className="m-0 grid min-w-0 list-none gap-4 p-0">
            <Note n={1} title="A moment you'd recognise." />
            <Note n={2} title="Checked against your chart.">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-label text-[9px] uppercase tracking-[.16em] text-[var(--indigo-lt)]">{placement.kind}</span>
                <span className="font-numeric text-[13px] font-medium leading-[1.5] text-[var(--paper)]">{placement.label}</span>
              </p>
            </Note>
            <Note n={3} title="Something to try.">
              <div className={BARE}>
                <Checklist heading="Practice" items={[action]} store={ticks} />
              </div>
            </Note>
          </ol>
        </div>
      </div>
    </section>
  );
}
