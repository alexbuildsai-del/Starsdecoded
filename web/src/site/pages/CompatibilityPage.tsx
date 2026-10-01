/**
 * The Compatibility report on its own page (annex /compatibility): how to get it, in three steps drawn with the site's
 * own pieces (ADR-180): the sample people on one horizon (ADR-113), the lenses, and each lens's seven chapters with what
 * they cover. Its questions are on /faq. It quotes no pair text until a pair run is stored (MB-93), and it never scores
 * the two people.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { chapterAccent } from "@/lib/chapter-accent";
import { LENSES, PAIR_CHAPTER_TITLES, PARENT_QUESTION, lensInfo } from "@/lib/lenses";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";
import { first } from "@/lib/share-card";
import type { Lens } from "@/types/chart";
import { SiteLayout } from "../SiteLayout";
import { TwoPlates } from "../components/TwoPlates";
import { ReportCta } from "../cta";
import { SAMPLE_PAIRS, samplePerson } from "../data/people";
import { CLOSING_LINE, LENS_COPY, OPENING_LINE } from "../sections/TwoCharts";
import { SAMPLE_LIVE, pageFor } from "../site";

const page = pageFor("/compatibility");

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const countWord = (n: number): string => COUNT_WORDS[n] ?? String(n);
const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const two = (n: number): string => String(n).padStart(2, "0");

// Each lens writes its own five chapters between the same first and last (ADR-63), so any lens gives both counts.
const PAIR_CHAPTERS = countWord(PAIR_CHAPTER_TITLES(LENSES[0].lens).length);
const SCENE_CHAPTERS = capital(countWord(LENSES[0].chapters.length));

/** The home page's line for each chapter, so the two pages say what a lens covers in the same words. */
const chapterLines = (lens: Lens): string[] => [OPENING_LINE, ...LENS_COPY[lens].lines, CLOSING_LINE];

// Under parent and child the parent comes first (people.ts), so step 01's mother and daughter are also the parent pick's.
const [PARENT, CHILD] = SAMPLE_PAIRS.parent_child.map((id) => samplePerson(id));
// Step 01 shows a mother and her daughter, so step 02 opens on the lens they would pick.
const STEP_LENS: Lens = "parent_child";

const ARRIVE: Keyframe[] = [
  { opacity: 0, transform: "translateY(6px)" },
  { opacity: 1, transform: "none" },
];
const ARRIVE_MS = 500;
const EASE = "cubic-bezier(.16, 1, .3, 1)";

interface Beat {
  from: number;
  every: number;
}

// The artifact's timing: the plates' rows, then the titles; a new lens replays the titles alone, quicker.
const ROWS_BEAT: Beat = { from: 150, every: 160 };
const TITLES_BEAT: Beat = { from: 1300, every: 120 };
const LENS_BEAT: Beat = { from: 60, every: 90 };
/** Both Suns, then both Moons, then both Risings, so the two readouts fill side by side. */
const ROW_ORDER = [0, 3, 1, 4, 2, 5];
/** The list can fill most of a phone's screen, so it starts with a third of it in view, as the artifact has it. */
const LIST_ON_VIEW = 0.35;
/** A row is one line, so it counts as in view only when nearly all of it is. */
const ROW_ON_VIEW = 0.95;

const moving = (): boolean =>
  typeof Element.prototype.animate === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// TwoPlates keeps its readouts to itself, so its rows are found by their markup: one <dl> per person, a row per body.
function readoutRows(box: HTMLElement | null): HTMLElement[] {
  return box ? [...box.querySelectorAll<HTMLElement>("dl > div")] : [];
}

const inTurn = (rows: readonly HTMLElement[]): HTMLElement[] => ROW_ORDER.flatMap((i) => (rows[i] ? [rows[i]] : []));

function chapterRows(box: HTMLElement | null, lens?: Lens): HTMLElement[] {
  return box ? [...box.querySelectorAll<HTMLElement>(lens ? `ol[data-lens="${lens}"] > li` : "ol > li")] : [];
}

function hide(els: readonly HTMLElement[]) {
  for (const el of els) el.style.opacity = "0";
}

function unhide(els: readonly HTMLElement[]) {
  for (const el of els) el.style.removeProperty("opacity");
}

function arrive(els: readonly HTMLElement[], beat: Beat): Animation[] {
  unhide(els);
  return els.map((el, k) =>
    el.animate(ARRIVE, { duration: ARRIVE_MS, delay: beat.from + k * beat.every, easing: EASE, fill: "backwards" }),
  );
}

const CHOICE =
  "relative inline-flex items-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--indigo-lt)]";
// The home page's lens tabs' look, where a choice is a radio rather than a tab.
const LENS_CHIP = `sd-lensbtn ${CHOICE} has-checked:border-[rgba(149,117,205,.75)] has-checked:bg-[rgba(149,117,205,.15)] has-checked:text-[var(--paper)]`;
const PARENT_CHIP = `${CHOICE} h-8 cursor-pointer rounded-full border border-[var(--line)] px-3 font-label text-[12.5px] text-[var(--paper-dim)] transition-colors has-checked:border-[var(--indigo)] has-checked:bg-[rgba(92,107,192,.15)] has-checked:text-[var(--paper)]`;

/** Words first, so on a phone each piece comes after the step that explains it. */
function Step({ n, title, titleId, text, children }: { n: number; title: string; titleId?: string; text: string; children: ReactNode }) {
  return (
    <li className="sd-step gap-5 p-5 min-[760px]:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] min-[760px]:items-center min-[760px]:gap-x-10 min-[760px]:p-7">
      <div className="grid content-start gap-2.5">
        <span className="sn" aria-hidden="true">
          {two(n)}
        </span>
        <h3 id={titleId} className="min-[760px]:text-[28px]">
          {title}
        </h3>
        <p className="max-w-[44ch]">{text}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </li>
  );
}

function HowToGetIt() {
  const uid = useId();
  const reduced = useReducedMotion();
  const [lens, setLens] = useState<Lens>(STEP_LENS);
  const [parent, setParent] = useState(PARENT?.id ?? "");
  const plates = useRef<HTMLDivElement>(null);
  const titles = useRef<HTMLDivElement>(null);
  const runs = useRef<{ rows: Animation[]; titles: Animation[] }>({ rows: [], titles: [] });
  const waiting = useRef({ rows: false, titles: false });
  const rowsAt = useRef<number | null>(null);
  const shownLens = useRef(lens);
  const whoId = `${uid}-who`;
  const parentId = `${uid}-parent`;

  const stop = (part: "rows" | "titles") => {
    for (const run of runs.current[part]) run.cancel();
    runs.current[part] = [];
  };

  const settle = () => {
    stop("rows");
    stop("titles");
    waiting.current.rows = false;
    waiting.current.titles = false;
    unhide(readoutRows(plates.current));
    unhide(chapterRows(titles.current));
  };

  // Once, on view. Only what starts below the fold waits hidden, so nothing a reader already sees blinks out to play.
  useEffect(() => {
    const platesEl = plates.current;
    const titlesEl = titles.current;
    if (!platesEl || !titlesEl || !moving() || !("IntersectionObserver" in window)) return;
    const below = (el: Element | undefined) => el !== undefined && el.getBoundingClientRect().top >= window.innerHeight;
    const rows = readoutRows(platesEl);
    const list = chapterRows(titlesEl, shownLens.current);
    const watching: IntersectionObserver[] = [];

    if (below(rows[0])) {
      waiting.current.rows = true;
      hide(rows);
      // Every row in view first, so none arrives off screen, whichever way the reader comes to them.
      const seen = new Set<Element>();
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.intersectionRatio >= ROW_ON_VIEW) seen.add(entry.target);
            else seen.delete(entry.target);
          }
          if (waiting.current.rows && seen.size < rows.length) return;
          io.disconnect();
          if (!waiting.current.rows) return;
          waiting.current.rows = false;
          rowsAt.current = performance.now();
          runs.current.rows = arrive(inTurn(rows), ROWS_BEAT);
        },
        { threshold: ROW_ON_VIEW },
      );
      for (const row of rows) io.observe(row);
      watching.push(io);
    }

    if (below(list[0])) {
      waiting.current.titles = true;
      hide(list);
      const io = new IntersectionObserver(
        ([entry]) => {
          if (waiting.current.titles && (!entry || entry.intersectionRatio < LIST_ON_VIEW)) return;
          io.disconnect();
          if (!waiting.current.titles) return;
          waiting.current.titles = false;
          // In view with the plates, the titles keep the artifact's place after the rows; reached later, they start at once.
          const since = rowsAt.current === null ? Infinity : performance.now() - rowsAt.current;
          const from = Math.max(LENS_BEAT.from, TITLES_BEAT.from - since);
          runs.current.titles = arrive(chapterRows(titlesEl, shownLens.current), { from, every: TITLES_BEAT.every });
        },
        { threshold: LIST_ON_VIEW },
      );
      io.observe(titlesEl);
      watching.push(io);
    }

    return () => {
      for (const io of watching) io.disconnect();
      settle();
    };
  }, []);

  // Before paint, so the new list never shows whole first.
  useLayoutEffect(() => {
    if (shownLens.current === lens) return;
    shownLens.current = lens;
    const box = titles.current;
    stop("titles");
    unhide(chapterRows(box));
    if (waiting.current.titles) hide(chapterRows(box, lens));
    else if (moving()) runs.current.titles = arrive(chapterRows(box, lens), LENS_BEAT);
  }, [lens]);

  useEffect(() => {
    if (reduced) settle();
  }, [reduced]);

  const replay = () => {
    if (!moving()) return;
    settle();
    rowsAt.current = performance.now();
    runs.current.rows = arrive(inTurn(readoutRows(plates.current)), ROWS_BEAT);
    runs.current.titles = arrive(chapterRows(titles.current, lens), TITLES_BEAT);
  };

  return (
    <section className="sd-pg-sec sd-sec-c sd-line" aria-labelledby="how-h">
      <div className="sd-wrap">
        <div className="mb-11 grid gap-5 min-[760px]:grid-cols-[minmax(0,1fr)_auto] min-[760px]:items-end">
          <div className="sd-shead mb-0">
            <p className="sd-eyebrow">How it works</p>
            <h2 className="sd-h2" id="how-h">
              How to get a {COMPATIBILITY_REPORT}
            </h2>
          </div>
          {/* Nothing plays under reduced motion, so the button goes too: by CSS, not state, so the HTML and hydration agree. */}
          <button type="button" className="sd-btn sd-btn-g sd-btn-sm justify-self-end motion-reduce:hidden" onClick={replay}>
            Play it again
          </button>
        </div>

        <ol className="m-0 grid list-none gap-[18px] p-0">
          <Step
            n={1}
            title={`You each have a ${PERSONAL_REPORT}`}
            text="Add theirs from your dashboard with their birth details. You can share it with them once it's written."
          >
            <div ref={plates}>{PARENT && CHILD && <TwoPlates a={PARENT} b={CHILD} caption="Sample people" />}</div>
          </Step>

          <Step
            n={2}
            title="Say who they are to you"
            titleId={whoId}
            text="Your partner, your child, or a friend, relative or colleague. For a parent and a child, you say who the parent is."
          >
            <div className="grid gap-3.5">
              <div role="radiogroup" aria-labelledby={whoId} className="flex flex-wrap gap-2">
                {LENSES.map((l) => (
                  <label key={l.lens} className={LENS_CHIP}>
                    <input
                      type="radio"
                      className="sr-only"
                      name={`${uid}-lens`}
                      value={l.lens}
                      checked={l.lens === lens}
                      onChange={() => setLens(l.lens)}
                    />
                    {l.door}
                  </label>
                ))}
              </div>
              <div
                role="radiogroup"
                aria-labelledby={parentId}
                hidden={!lensInfo(lens).asksParent}
                className="flex flex-wrap items-center gap-2"
              >
                <span id={parentId} className="mr-1 text-[13px] text-[var(--sd-muted)]">
                  {PARENT_QUESTION}
                </span>
                {[PARENT, CHILD].map(
                  (person) =>
                    person && (
                      <label key={person.id} className={PARENT_CHIP}>
                        <input
                          type="radio"
                          className="sr-only"
                          name={parentId}
                          value={person.id}
                          checked={person.id === parent}
                          onChange={() => setParent(person.id)}
                        />
                        {first(person.name)}
                      </label>
                    ),
                )}
              </div>
            </div>
          </Step>

          <Step
            n={3}
            title={`Read ${PAIR_CHAPTERS} chapters about everyday life`}
            text={`${SCENE_CHAPTERS} of them play out one scene between you and end with something to try together. Pick a relationship in step 2 to see its chapters.`}
          >
            {/* Every lens's chapters are in the HTML, so a crawler reads all three, not the one picked first. */}
            <div ref={titles}>
              {LENSES.map(({ lens: shown }) => {
                const lines = chapterLines(shown);
                return (
                  <ol key={shown} data-lens={shown} hidden={shown !== lens} className="m-0 grid list-none gap-1.5 p-0">
                    {PAIR_CHAPTER_TITLES(shown).map((title, i) => (
                      <li
                        key={title}
                        className="grid grid-cols-[30px_minmax(0,1fr)] items-baseline gap-2 rounded-[10px] border border-[var(--line-soft)] bg-[rgba(6,8,12,.55)] px-3.5 py-2.5"
                      >
                        <span aria-hidden="true" className="font-numeric text-[11.5px] font-medium" style={{ color: chapterAccent(i + 1) }}>
                          {two(i + 1)}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display text-[17px] leading-[1.3] text-[var(--paper)]">{title}</span>
                          <span className="mt-0.5 block text-[14px] leading-[1.45] text-[var(--sd-muted)]">{lines[i]}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                );
              })}
            </div>
          </Step>
        </ol>
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
      <HowToGetIt />
    </SiteLayout>
  );
}
