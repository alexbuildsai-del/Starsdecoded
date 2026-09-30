/**
 * The Compatibility report on its own page (annex /compatibility): the sample
 * people under each lens on one horizon (ADR-113), how to get the report, and
 * how it differs from the Personal natal report. It quotes no pair text until a
 * pair run is stored (MB-93), and it never scores the two people.
 */
import { Link } from "wouter";
import { CHAPTERS } from "@/lib/chapters";
import { LENSES, PAIR_CHAPTER_TITLES, lensInfo } from "@/lib/lenses";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";
import { SiteLayout } from "../SiteLayout";
import { ReportCta } from "../cta";
import { PairLenses } from "../sections/TwoCharts";
import { SAMPLE_LIVE, pageFor } from "../site";

const page = pageFor("/compatibility");

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const countWord = (n: number): string => COUNT_WORDS[n] ?? String(n);
const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const two = (n: number): string => String(n).padStart(2, "0");

// Each lens writes its own five chapters between the same first and last (ADR-63), so any lens gives the count.
const PAIR_CHAPTERS = capital(countWord(PAIR_CHAPTER_TITLES(LENSES[0].lens).length));
const NATAL_CHAPTERS = capital(countWord(CHAPTERS.length));

const STEPS: readonly { title: string; text: string }[] = [
  {
    title: `Each of you has a ${PERSONAL_REPORT}`,
    text: "If they don't have one yet, add theirs from your dashboard with their birth details. You can send it to them once it's written.",
  },
  {
    title: "You say who they are to you",
    text: "Your partner, your child, or a friend, relative or colleague. For a parent and a child, you say who the parent is.",
  },
  {
    title: `You get your ${COMPATIBILITY_REPORT}`,
    text: `${PAIR_CHAPTERS} chapters about everyday life together, with things to try for each of you and for both.`,
  },
];

const ROWS: readonly { label: string; natal: string; pair: string }[] = [
  { label: "About", natal: "One person", pair: "Two people, and how they get along" },
  { label: "You need", natal: "A birth date and place, and the time if you know it", pair: `A ${PERSONAL_REPORT} for each of you` },
  { label: "Chapters", natal: NATAL_CHAPTERS, pair: `${PAIR_CHAPTERS}, set by who they are to you` },
  // One credit is one report, whatever the report (R-6.4).
  { label: "Credits", natal: "One", pair: "One" },
  { label: "Scores", natal: "None", pair: "None" },
];

const QUESTIONS: readonly { q: string; a: string }[] = [
  {
    q: `Do we both need a ${PERSONAL_REPORT}?`,
    a: `Yes. The ${COMPATIBILITY_REPORT} is written from both of your charts, so each of you needs a ${PERSONAL_REPORT} first.`,
  },
  {
    q: `Can I get a ${COMPATIBILITY_REPORT} about me and my child?`,
    a: `Yes. Pick “${lensInfo("parent_child").door}” and say who the parent is. The report looks at what your child needs from you at their age and how you can give it.`,
  },
  {
    q: "What happens to the other person's birth details?",
    a: "The same as for any report. Our writing service only gets names and where the planets are, never anyone's birth date, time or place.",
  },
];

// On a phone the labels tighten and the cells pad less, so the three columns fit a 320 px screen without scrolling sideways.
const LABEL = "text-left font-label text-[10.5px] leading-[1.3] font-medium tracking-[.1em] uppercase min-[560px]:tracking-[.16em]";
const PAD = "px-2.5 min-[560px]:px-4";

function Lenses() {
  return (
    <section className="sd-pg-sec sd-sec-a sd-line" aria-labelledby="lens-h">
      <div className="sd-wrap grid gap-7">
        <div className="sd-shead mb-0">
          <p className="sd-eyebrow">Pick who they are to you</p>
          <h2 className="sd-h2" id="lens-h">
            What it covers depends on who they are to you
          </h2>
        </div>
        <PairLenses />
      </div>
    </section>
  );
}

function TwoReports() {
  return (
    <div className="mt-7 overflow-x-auto rounded-[14px] border border-[var(--line)] bg-[rgba(17,22,31,.45)]">
      <table className="w-full border-collapse text-[14.5px]">
        <caption className="sr-only">The two reports side by side</caption>
        <thead>
          <tr>
            <td className={`border-b border-[var(--line)] ${PAD}`} />
            {[PERSONAL_REPORT, COMPATIBILITY_REPORT].map((name) => (
              <th key={name} scope="col" className={`border-b border-[var(--line)] py-3.5 align-bottom text-[var(--paper-dim)] ${LABEL} ${PAD}`}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => {
            const rule = i < ROWS.length - 1 ? "border-b border-[var(--line-soft)]" : "";
            return (
              <tr key={row.label}>
                <th scope="row" className={`py-3 text-[var(--sd-muted)] min-[560px]:w-[24%] ${LABEL} ${PAD} ${rule}`}>
                  {row.label}
                </th>
                <td className={`py-3 leading-[1.5] text-[var(--paper-dim)] ${PAD} ${rule}`}>{row.natal}</td>
                <td className={`py-3 leading-[1.5] text-[var(--paper-dim)] ${PAD} ${rule}`}>{row.pair}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HowToGetIt() {
  return (
    <section className="sd-pg-sec sd-sec-c sd-line" aria-labelledby="how-h">
      <div className="sd-wrap">
        <div className="sd-shead">
          <p className="sd-eyebrow">How it works</p>
          <h2 className="sd-h2" id="how-h">
            How to get a {COMPATIBILITY_REPORT}
          </h2>
        </div>

        <ol className="m-0 grid list-none gap-[18px] p-0 min-[760px]:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="grid content-start gap-2 border-t border-[var(--line)] pt-4">
              <span aria-hidden="true" className="sd-mono text-[12px] tracking-[.1em] text-[var(--violet)]">
                {two(i + 1)}
              </span>
              <h3 className="text-[21px] leading-[1.25] text-[var(--paper)]">{step.title}</h3>
              <p className="text-[15px] text-[var(--paper-dim)]">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="sd-facts mt-14">
          <p className="sd-fact">
            <b>No scores</b> It doesn't rate the two of you or say whether you should be together.
          </p>
          <p className="sd-fact">
            <b>Everyday life</b> It's about the moments you share, from chores and money to plans and arguments.
          </p>
          <p className="sd-fact">
            <b>One credit</b> Like any report, a {COMPATIBILITY_REPORT} uses one credit.
          </p>
        </div>

        <TwoReports />

        <div className="sd-faq mt-14">
          {QUESTIONS.map((item) => (
            <div key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Start() {
  return (
    <div className="sd-cta">
      <div>
        <p className="sd-eyebrow text-[var(--violet)]">{COMPATIBILITY_REPORT}</p>
        <h2>Start with your own {PERSONAL_REPORT}</h2>
        <p>Then add the people you care about from your dashboard, and pick who you want a {COMPATIBILITY_REPORT} with.</p>
      </div>
      <div className="sd-cta-acts">
        <ReportCta source="compatibility" className="sd-btn" />
        {/* MB-90 provisional: a production build has no /sample until her name clears its check. */}
        {SAMPLE_LIVE && (
          <Link className="sd-btn sd-btn-g" href="/sample">
            Read a sample
          </Link>
        )}
      </div>
    </div>
  );
}

export default function CompatibilityPage() {
  return (
    <SiteLayout page={page} end={<Start />}>
      <Lenses />
      <HowToGetIt />
    </SiteLayout>
  );
}
