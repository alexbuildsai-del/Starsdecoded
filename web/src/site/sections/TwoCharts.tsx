/**
 * Two charts, one horizon (ADR-113, landing scope 8): the Compatibility report
 * on the sample people, one lens at a time, as two plates on one horizon and
 * the seven chapters that lens writes. No score, no age band, and no line from
 * one person's bodies to the other's.
 */
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link } from "wouter";
import { LENSES, PAIR_CHAPTER_TITLES } from "@/lib/lenses";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";
import { TwoPlates } from "@/site/components/TwoPlates";
import { SAMPLE_PAIRS, samplePerson } from "@/site/data/people";
import type { Lens } from "@/types/chart";

type LensLines = readonly [string, string, string, string, string];

/**
 * The artifact's words for each lens, written from `lenses.ts` and the pair
 * prompts, which the web cannot import (MB-108): a strapline, and one line for
 * each of the lens's five chapters in `lenses.ts` order. The titles themselves
 * are read from the code.
 */
export const LENS_COPY: Record<Lens, { strap: string; lines: LensLines }> = {
  partners: {
    strap: "How you love, argue, live together and plan ahead",
    lines: [
      "How each of you shows love, and how each of you likes to get it",
      "Who pushes and who pulls back when you argue, and how you make up",
      "Whose standards run the house, and who ends up doing the list",
      "How each of you likes to rest: going out or staying in, planning or winging it",
      "What you want to build together, and how much time apart you each need",
    ],
  },
  parent_child: {
    strap: "What your child needs from you right now and how you can give it",
    lines: [
      "What your child needs from a parent at this age",
      "How your child shows big feelings, and what helps",
      "What your child can fairly help with at home",
      "How your child learns, and how they show what they know",
      "How you set limits, and how your child tests them",
    ],
  },
  people: {
    strap: "How you get on, work together, have fun and talk about hard things",
    lines: [
      "Who does the talking, and who does the listening",
      "How you split a job, who starts it and who finishes it",
      "What the two of you enjoy together",
      "The conversation you both keep putting off",
      "What each of you brings that the other doesn't",
    ],
  },
};

/** Chapters 01 and 07 are the same under every lens (ADR-63): the headline over both charts, and three checklists. */
export const OPENING_LINE = "Both charts side by side, and the two of you summed up in one sentence";
export const CLOSING_LINE = "Three short lists, one for each of you and one for both";

/** A change of lens is confirmed, never staged: nothing fades in on first paint (landing scope 15). */
const SWAP = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-[6px] animation-duration-400 ease-[var(--ease)]";

export interface PairLensesProps {
  /** What stands beside the tabs: the home section's heading and words. A page with its own heading above leaves it out. */
  intro?: ReactNode;
}

/** The lens tabs and what each lens shows: its strapline, the sample pair's plates and its seven chapters. */
export function PairLenses({ intro }: PairLensesProps) {
  const uid = useId();
  const [lens, setLens] = useState<Lens>(LENSES[0].lens);
  const [moved, setMoved] = useState(false);
  const tabs = useRef(new Map<Lens, HTMLButtonElement>());
  const [aId, bId] = SAMPLE_PAIRS[lens];
  const a = samplePerson(aId);
  const b = samplePerson(bId);
  const titles = PAIR_CHAPTER_TITLES(lens);
  const lines = [OPENING_LINE, ...LENS_COPY[lens].lines, CLOSING_LINE];
  const tabId = (l: Lens) => `${uid}-tab-${l}`;
  const panelId = `${uid}-panel`;

  const choose = (next: Lens) => {
    if (next === lens) return;
    setLens(next);
    setMoved(true);
  };

  // The tabs are one stop in the tab order; the arrows move between them (WAI-ARIA tabs, automatic activation).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = LENSES.findIndex((l) => l.lens === lens);
    const to = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? LENSES.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const next = LENSES[(to + LENSES.length) % LENSES.length].lens;
    choose(next);
    tabs.current.get(next)?.focus();
  };

  return (
    <>
      <div className={intro ? "grid items-end gap-x-9 gap-y-5 min-[900px]:grid-cols-[minmax(0,1fr)_auto]" : undefined}>
        {intro && <div className="min-w-0">{intro}</div>}
        <div role="tablist" aria-label="Who they are to you" className="sd-lenses mt-0" onKeyDown={onKeyDown}>
          {LENSES.map((l) => (
            <button
              key={l.lens}
              ref={(el) => {
                if (el) tabs.current.set(l.lens, el);
                else tabs.current.delete(l.lens);
              }}
              type="button"
              role="tab"
              id={tabId(l.lens)}
              aria-selected={l.lens === lens}
              aria-controls={panelId}
              tabIndex={l.lens === lens ? 0 : -1}
              className="sd-lensbtn"
              onClick={() => choose(l.lens)}
            >
              {l.door}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={tabId(lens)} tabIndex={0} className="grid min-w-0 gap-[26px] rounded-lg max-[900px]:gap-5">
        <p
          key={`strap-${lens}`}
          className={`mx-auto max-w-[34em] text-center font-display text-[clamp(19px,2vw,23px)] italic leading-[1.45] text-[var(--paper)] ${moved ? SWAP : ""}`}
        >
          {LENS_COPY[lens].strap}
        </p>
        {a && b && <TwoPlates a={a} b={b} caption="Sample people" />}
        <ol key={`chapters-${lens}`} className={`m-0 grid list-none gap-x-9 p-0 md:grid-cols-2 ${moved ? SWAP : ""}`}>
          {titles.map((title, i) => {
            const shared = i === 0 || i === titles.length - 1;
            return (
              <li key={title} className="grid grid-cols-[34px_minmax(0,1fr)] gap-2.5 border-t border-[var(--line-soft)] py-3">
                <span className={`font-numeric text-[11.5px] font-medium leading-[1.7] ${shared ? "text-[var(--sd-muted)]" : "text-[var(--violet)]"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-[18px] leading-[1.3] text-[var(--paper)]">{title}</span>
                  <span className="mt-0.5 block text-[14px] leading-[1.45] text-[var(--sd-muted)]">{lines[i]}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}

export default function TwoCharts() {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="sd-sec pt-0">
      <div className="sd-wrap">
        <div
          className="grid gap-[26px] rounded-[22px] border border-[var(--line)] p-9 max-[900px]:gap-5 max-[900px]:px-4 max-[900px]:py-[22px]"
          style={{ background: "radial-gradient(60% 60% at 50% 40%, rgba(149,117,205,.1), transparent 72%), rgba(17,22,31,.5)" }}
        >
          <PairLenses
            intro={
              <>
                <p className="sd-eyebrow text-[var(--violet)]">{COMPATIBILITY_REPORT}</p>
                <h2 id={headingId} className="mt-2.5 text-[clamp(28px,3vw,38px)] leading-[1.1]">
                  How the two of you get along
                </h2>
                <p className="mt-3 max-w-[44em] text-[var(--paper-dim)]">
                  When you and someone close to you both have a {PERSONAL_REPORT}, you can get a {COMPATIBILITY_REPORT} about the two of
                  you. You choose who they are to you: your partner, your child, or a friend, relative or colleague. It looks at everyday
                  life together, where you clash and what you can try, and it never gives you a score.
                </p>
              </>
            }
          />
          <Link href="/compatibility" className="sd-more mt-0 justify-self-center">
            About the {COMPATIBILITY_REPORT}
          </Link>
        </div>
      </div>
    </section>
  );
}
