/**
 * /sample (annex /sample, ADR-119, ADR-178): four of the stored run's ten
 * chapters read whole, in the report page's order, and the other six dimmed
 * where they fall, one line each, each opening to its first paragraph. Every
 * claim the page prints is marked in place with its number in reading order,
 * in a dimmed chapter's paragraph too. A mark opens the report's own evidence
 * card: beside the line on a wide screen, R10's bottom sheet on a phone.
 * Chapter 2 is the report's own House by House deck on her chart. The page
 * ends on the two differences (ADR-173), then Get my report. Everything but
 * the card is in the prerendered HTML.
 */
import {
  Fragment, createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type KeyboardEvent, type ReactNode,
} from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { Link } from "wouter";
import { Checklist, localTicks, type ChecklistHeading, type ChecklistItem } from "@/components/report/Checklist";
import { EvidenceCard } from "@/components/report/EvidenceCard";
import { HouseDeck } from "@/components/report/HouseDeck";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { chapterAccent } from "@/lib/chapter-accent";
import { CHAPTERS, type ChapterSection } from "@/lib/chapters";
import { plainProse } from "@/lib/plain-prose";
import { PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { skySentence } from "@/lib/sky-now";
import { cn } from "@/lib/utils";
import { itemKey } from "@/lib/workbook";
import type { ActionItem, ChartData, Claim, Interpretation, SuperpowerItem } from "@/types/chart";
import { SAMPLE_KICKER_ID, SAMPLE_TITLE_ID, SampleHead } from "../components/SampleHead";
import { RAIL_STRIP, SampleRail, chapterId } from "../components/SampleRail";
import { ReportCta } from "../cta";
import {
  CLAIMS_OF, DIMMED_LINES, DIMMED_STATUS, SAMPLE, isOpenChapter, markedClaims, printedParagraphs, quoteNeedle, sampleChart,
  sampleTexts, type DimmedChapter, type OpenChapter,
} from "../data/sample";
import Differences from "../sections/Differences";
import { SiteLayout } from "../SiteLayout";
import { pageFor } from "../site";

const page = pageFor("/sample");

interface Cite {
  n: number;
  id: string;
  claim: Claim;
  text: string;
}

type Run = string | Cite;
// A text as the page prints it: its paragraphs, each a row of plain runs and marked claims.
type Printed = Run[][];

const two = (n: number) => String(n).padStart(2, "0");
const counter = (n: number) => `${two(n)} / ${two(CHAPTERS.length)}`;
const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

// The sample module's reading order, walked again to cut each text at its marks: hits in a paragraph left to right,
// one inside another skipped, each claim marked once in its chapter and numbered from 1 in it.
function printChapter(section: ChapterSection): Printed[] {
  const owner = CLAIMS_OF[section];
  const claims = owner ? (SAMPLE.run[owner]?.claims ?? []) : [];
  const needles = claims.map(quoteNeedle);
  const marked = new Set<number>();
  let n = 0;
  return sampleTexts(section).map((text) => {
    const hays = printedParagraphs(text);
    const shown = plainProse(text).split(/\n{2,}/).map(collapse).filter(Boolean);
    return shown.map((display, p) => {
      const hay = hays[p];
      const hits = needles
        .flatMap((needle, k) => {
          const start = needle && !marked.has(k) ? hay.indexOf(needle) : -1;
          return start < 0 ? [] : [{ start, end: start + needle.length, k }];
        })
        .sort((a, b) => a.start - b.start);
      const runs: Run[] = [];
      let cursor = 0;
      for (const hit of hits) {
        if (hit.start < cursor) continue;
        marked.add(hit.k);
        if (hit.start > cursor) runs.push(display.slice(cursor, hit.start));
        runs.push({ n: ++n, id: `${owner}.${hit.k}`, claim: claims[hit.k], text: display.slice(hit.start, hit.end) });
        cursor = hit.end;
      }
      if (cursor < display.length) runs.push(display.slice(cursor));
      return runs;
    });
  });
}

let printedCache: Printed[][] | undefined;

// Throws rather than print a claim unmarked or misnumbered, so the prerender fails the build instead: the marks the page
// cuts must be the claims data/sample.ts counts in what the page prints, one for one.
function printedChapters(): Printed[][] {
  if (printedCache) return printedCache;
  const chapters = CHAPTERS.map((c) => printChapter(c.section));
  const marks = chapters.flatMap((texts, i) =>
    texts.flat(2).flatMap((run) => (typeof run === "string" ? [] : [`${i + 1}:${run.n}:${run.id}`])),
  );
  const expected = markedClaims().map((c) => `${c.chapter}:${c.n}:${c.id}`);
  if (marks.join() !== expected.join()) {
    throw new Error(`/sample marks ${marks.length} claims where data/sample.ts counts ${expected.length} printed in reading order: the two have drifted apart.`);
  }
  printedCache = chapters;
  return chapters;
}

interface Reader {
  take(text: string): Printed;
  finish(): void;
}

// A chapter hands its texts out in the module's order only, so a block moved on the page fails the build rather than
// quietly numbering its marks out of reading order.
function reader(index: number): Reader {
  const texts = sampleTexts(CHAPTERS[index].section);
  const chapter = printedChapters()[index];
  let at = 0;
  return {
    take(text) {
      if (texts[at] !== text) throw new Error(`/sample prints chapter ${index + 1}'s text ${at + 1} out of its reading order.`);
      return chapter[at++];
    },
    finish() {
      if (at !== texts.length) throw new Error(`/sample prints ${at} of chapter ${index + 1}'s ${texts.length} texts; the rest would be missing.`);
    },
  };
}

interface Opened {
  cite: Cite;
  from: HTMLButtonElement;
  sheet: boolean;
}

interface CardApi {
  openId: string | null;
  toggle(cite: Cite, from: HTMLButtonElement): void;
}

const CardContext = createContext<CardApi>({ openId: null, toggle: () => {} });

// The evidence card's own sheet rule in index.css, so the script and the stylesheet agree on which card shows.
const SHEET_QUERY = "(max-width: 720px), (pointer: coarse)";
const EASE = [0.16, 1, 0.3, 1] as const;
const CARD_LABEL = "Where this line comes from";

function Mark({ cite }: { cite: Cite }) {
  const { openId, toggle } = useContext(CardContext);
  const on = openId === cite.id;
  return (
    <>
      <mark className={cn("rp-claimed", on && "bg-[rgba(92,107,192,.18)] text-[color:var(--paper)]")}>{cite.text}</mark>
      <button
        type="button"
        // The number is small, so its hit area reaches past it for a thumb.
        className={cn("rp-cite relative after:absolute after:-inset-[7px] after:content-['']", on && "open")}
        aria-label={`Where line ${cite.n} comes from`}
        aria-haspopup="dialog"
        aria-expanded={on}
        onClick={(event) => toggle(cite, event.currentTarget)}
      >
        {cite.n}
      </button>
    </>
  );
}

const runNode = (run: Run, k: number) => (typeof run === "string" ? <Fragment key={k}>{run}</Fragment> : <Mark key={k} cite={run} />);

function Words({ printed: text }: { printed: Printed }) {
  if (text.length === 1) return <>{text[0].map(runNode)}</>;
  return (
    <>
      {text.map((runs, p) => (
        <span key={p} className={p ? "mt-[15px] block" : "block"}>
          {runs.map(runNode)}
        </span>
      ))}
    </>
  );
}

const LABEL = "font-label text-[11px] font-medium uppercase leading-[1.2] tracking-[.18em] text-[color:var(--sd-muted)]";
const PROSE = "text-[16.5px] leading-[1.75] text-[color:var(--paper-dim)] max-[760px]:text-base";
const CARD = "grid content-start gap-2 rounded-[14px] border border-[color:var(--line)] bg-[rgba(17,22,31,.45)] p-4";
const TITLE = "text-2xl leading-tight";

function Lede({ printed: text }: { printed: Printed }) {
  return (
    <p className="font-display text-[22px] leading-[1.5] text-[color:var(--paper)]">
      <Words printed={text} />
    </p>
  );
}

function Block({ label, printed: text }: { label: string; printed: Printed }) {
  return (
    <div className="grid gap-2">
      <h3 className={LABEL}>{label}</h3>
      <p className={PROSE}>
        <Words printed={text} />
      </p>
    </div>
  );
}

const hasMark = (text: Printed) => text.some((runs) => runs.some((run) => typeof run !== "string"));

// A thing to try carries the one tick box (ADR-172), which prints its words plain: a claim inside one would go unmarked,
// so the build stops instead.
function tryItems(section: string, path: string, actions: ActionItem[], r: Reader): ChecklistItem[] {
  return actions.map((a, i) => {
    if ([r.take(a.action), r.take(a.why)].some(hasMark)) throw new Error(`/sample would print a claim unmarked in ${section}'s ${path}.`);
    return { key: itemKey(section, path, i), action: a.action, why: a.why };
  });
}

type Body = (run: Interpretation, r: Reader, chart: ChartData) => ReactNode;

// Labels are the report page's own where it has them; the overview's five fields share chapter 1 here (data/sample.ts).
const BODIES: Record<OpenChapter, Body> = {
  overview: ({ overview: s }, r) =>
    s && (
      <>
        <Lede printed={r.take(s.headline)} />
        <Block label="Where the weight sits" printed={r.take(s.concentration)} />
        <Block label="How you run" printed={r.take(s.temperament)} />
        <Block label="What stands out" printed={r.take(s.distinctive)} />
        <p className="border-l-2 border-[color:var(--accent)] pl-[18px] font-display text-[20px] leading-[1.5] text-[color:var(--paper)]">
          <Words printed={r.take(s.bridge)} />
        </p>
      </>
    ),
  houses: ({ houses, meta }, r, chart) => {
    const readings = houses?.houses ?? [];
    // The deck draws each reading itself and a house reading carries no claim; taking them in turn still holds the deck to
    // the module's texts, so a passage added there and not here fails the build.
    for (const h of readings) r.take(h.reading);
    return (
      <>
        <p className="sr-only">{`${SAMPLE.name}'s birth chart: ${skySentence(chart)}`}</p>
        <HouseDeck chart={chart} readings={readings} counter={counter(2)} orbs={meta.orbs} />
      </>
    );
  },
  superpowers: ({ superpowers: s }, r) => {
    if (!s) return null;
    const trio: { kicker: string; heading: ChecklistHeading; path: string; item: SuperpowerItem }[] = [
      { kicker: "Your superpower", heading: "How to use it", path: "superpower.actions", item: s.superpower },
      { kicker: "The pattern you will always navigate", heading: "How to manage it", path: "chronicPattern.actions", item: s.chronicPattern },
      { kicker: "Your growing edge", heading: "Practice this week", path: "growingEdge.actions", item: s.growingEdge },
    ];
    const cards = trio.map((t) => ({ ...t, text: r.take(t.item.text), items: tryItems("superpowers", t.path, t.item.actions, r) }));
    return (
      <div className="grid gap-3.5">
        {cards.map((t) => (
          <div key={t.kicker} className={cn(CARD, "gap-2.5 p-[18px]")}>
            <p className={LABEL}>{t.kicker}</p>
            <h3 className={TITLE}>{t.item.title}</h3>
            <p className={PROSE}>
              <Words printed={t.text} />
            </p>
            {/* Ticks stay in this page's memory, as the site's other things to try do; nothing is sent. */}
            <Checklist heading={t.heading} items={t.items} store={localTicks()} />
          </div>
        ))}
      </div>
    );
  },
  discoveries: ({ discoveries: s }, r) => {
    if (!s) return null;
    const opening = r.take(s.opening);
    const paradoxes = s.paradoxes.map((p) => ({ title: p.title, tension: r.take(p.tension), invitation: r.take(p.invitation) }));
    return (
      <>
        <Lede printed={opening} />
        {paradoxes.map((p, i) => (
          <div key={i} className="grid gap-2.5 border-l-2 border-[color:var(--accent)] pl-[18px]">
            <h3 className={TITLE}>{p.title}</h3>
            <p className={PROSE}>
              <Words printed={p.tension} />
            </p>
            <p className="mt-1 font-label text-[10.5px] font-medium uppercase leading-[1.2] tracking-[.18em] text-[color:color-mix(in_srgb,var(--accent)_70%,var(--paper))]">
              A way through
            </p>
            <p className={PROSE}>
              <Words printed={p.invitation} />
            </p>
          </div>
        ))}
      </>
    );
  },
};

// Under the strip of chapter chips on a narrow screen, so a chapter the rail jumps to starts below it.
const ANCHOR = "max-[1000px]:scroll-mt-[calc(var(--nav)+var(--rail-strip)+16px)]";
// An open chapter or a run of dimmed ones, each closed by the same rule and space, the last by none.
const STRETCH = "mb-14 border-b border-[color:var(--line-soft)] pb-[72px] last:mb-0 last:border-b-0 last:pb-0";

function ChapterSection({ index, section, chart }: { index: number; section: OpenChapter; chart: ChartData }) {
  const chapter = CHAPTERS[index];
  const r = reader(index);
  const body = BODIES[section](SAMPLE.run, r, chart);
  r.finish();
  const id = chapterId(index);

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      style={{ "--accent": chapterAccent(index + 1) } as CSSProperties}
      // One column no wider than the page's: the deck's row of twelve cards would otherwise widen it past the screen. The
      // reading keeps its measure; the deck takes the column's width, for its wheel and card side by side.
      className={cn(STRETCH, ANCHOR, "grid grid-cols-[minmax(0,1fr)] gap-[22px]", section !== "houses" && "max-w-[70ch]")}
    >
      <p className="font-label text-[11px] font-medium uppercase leading-[1.2] tracking-[.22em] text-[color:color-mix(in_srgb,var(--accent)_70%,var(--paper))]">
        <span className="font-numeric">{counter(index + 1)}</span> · {chapter.eyebrow}
      </p>
      <h2 id={`${id}-title`} className="text-[clamp(32px,3.4vw,44px)] leading-[1.08]">
        {chapter.title}
      </h2>
      {body}
    </section>
  );
}

// The artifact's chapter row: number, title, what the chapter holds and where to find it. The first paragraph sits in a
// details element, so it opens before the page has hydrated and is in the HTML closed.
function DimmedSection({ index, section }: { index: number; section: DimmedChapter }) {
  const chapter = CHAPTERS[index];
  const r = reader(index);
  const [first] = sampleTexts(section).map((text) => r.take(text));
  r.finish();
  const id = chapterId(index);

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      style={{ "--accent": chapterAccent(index + 1) } as CSSProperties}
      className={cn(ANCHOR, "rounded-[12px] border border-[color:var(--line)]")}
    >
      <div className={cn("grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 pt-[11px]", first ? "pb-1" : "pb-[11px]")}>
        <span className="font-numeric text-[12px] font-medium text-[color:color-mix(in_srgb,var(--accent)_70%,var(--paper))]">{two(index + 1)}</span>
        <div className="grid min-w-0 gap-0.5">
          <h2 id={`${id}-title`} className="font-sans text-[15px] leading-[1.35] tracking-normal text-[color:var(--paper-dim)]">
            {chapter.title}
          </h2>
          <p className="text-[12.5px] leading-[1.45] text-[color:var(--sd-muted)]">{DIMMED_LINES[section]}</p>
        </div>
        <span className="font-label text-[10px] font-medium uppercase leading-[1.3] tracking-[.12em] text-[color:var(--sd-muted)]">
          {DIMMED_STATUS}
        </span>
      </div>
      {first && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 pb-[11px] pl-[58px] pr-3 pt-1 font-label text-[12.5px] font-medium text-[color:var(--indigo-lt)] transition-colors hover:text-[color:var(--paper)] pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Read the first paragraph</span>
            <span className="hidden group-open:inline">Show less</span>
            <span className="sr-only">{` of ${chapter.title}`}</span>
            <ChevronDown aria-hidden className="h-3.5 w-3.5 transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <p className={cn(PROSE, "px-3 pb-4 min-[760px]:pl-[58px] min-[760px]:pr-5")}>
            <Words printed={first} />
          </p>
        </details>
      )}
    </section>
  );
}

type Stretch =
  | { open: true; index: number; section: OpenChapter }
  | { open: false; chapters: { index: number; section: DimmedChapter }[] };

// An open chapter stands alone; dimmed neighbours share one stretch, so five in a row read as one list, as the artifact
// draws them, rather than five chapters.
const STRETCHES: Stretch[] = CHAPTERS.reduce<Stretch[]>((out, { section }, index) => {
  const last = out[out.length - 1];
  if (isOpenChapter(section)) out.push({ open: true, index, section });
  else if (last && !last.open) last.chapters.push({ index, section });
  else out.push({ open: false, chapters: [{ index, section }] });
  return out;
}, []);

// The report's citation classes read --label; the site names its label face --f-label.
const REPORT_TOKENS = { "--label": "var(--f-label)" } as CSSProperties;

// Memoised with no props: a card opening re-renders only the marks, through the context, never the text around them.
const Report = memo(function Report() {
  const chart = sampleChart();
  return (
    <article aria-labelledby={`${SAMPLE_KICKER_ID} ${SAMPLE_TITLE_ID}`} style={REPORT_TOKENS} className="min-w-0">
      {STRETCHES.map((s) =>
        s.open ? (
          <ChapterSection key={s.section} index={s.index} section={s.section} chart={chart} />
        ) : (
          <div key={s.chapters[0].section} className={cn(STRETCH, "grid max-w-[70ch] gap-2")}>
            {s.chapters.map((c) => (
              <DimmedSection key={c.section} index={c.index} section={c.section} />
            ))}
          </div>
        ),
      )}
    </article>
  );
});

const glide = (reduced: boolean, duration: number) => (reduced ? { duration: 0 } : { duration, ease: EASE });

function EvidenceLayer({ open, onClose }: { open: Opened | null; onClose: (refocus: boolean) => void }) {
  const reduced = useReducedMotion();
  const drag = useDragControls();
  const card = useRef<HTMLDivElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  const markTop = useRef(0);

  // Beside the line, below the nav: under the mark when the card fits there, above it when it does not. Placed before
  // the first paint, and on the element itself, so the card is never hidden while focus moves into it.
  useLayoutEffect(() => {
    const el = card.current;
    if (!open || open.sheet || !el) return;
    const mark = open.from.getBoundingClientRect();
    markTop.current = mark.top;
    const nav = document.querySelector(".sd-nav")?.getBoundingClientRect().bottom ?? 0;
    const below = mark.bottom + 10;
    const above = mark.top - el.offsetHeight - 10;
    const top =
      below + el.offsetHeight <= window.innerHeight - 8 ? below
      : above >= nav + 8 ? above
      : Math.max(nav + 8, window.innerHeight - el.offsetHeight - 12);
    el.style.left = `${Math.max(12, Math.min(window.innerWidth - el.offsetWidth - 12, mark.left - 24))}px`;
    el.style.top = `${top}px`;
  }, [open]);

  useEffect(() => {
    if (open) closer.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || card.current?.contains(target) || target.closest(".rp-cite")) return;
      onClose(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose(true);
    };
    // A card left where the page scrolled from would point at nothing; the sheet points at no line, so it stays. Only a
    // scroll that moved the mark counts: the one a browser owes a focus change can arrive after the card has opened.
    const onMove = (event: Event) => {
      if (event.type === "scroll" && Math.abs(open.from.getBoundingClientRect().top - markTop.current) < 4) return;
      onClose(card.current?.contains(document.activeElement) ?? false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    if (!open.sheet) {
      window.addEventListener("scroll", onMove, { passive: true });
      window.addEventListener("resize", onMove);
    }
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
    };
  }, [open, onClose]);

  // The card is a detour from its mark: Tab leaves it for the mark, so the reader keeps their place in the text.
  const onCardKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    onClose(true);
  };

  // A firm pull on the handle closes the sheet; a short one springs back, as R10's sheets do.
  const settle = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.y > 96 || info.velocity.y > 600) onClose(false);
  };

  return (
    <AnimatePresence>
      {open &&
        (open.sheet ? (
          <motion.div
            key="sheet"
            ref={card}
            role="dialog"
            aria-modal="false"
            aria-label={CARD_LABEL}
            className="rp-card"
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragMomentum={false}
            onDragEnd={settle}
            initial={reduced ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: glide(reduced, 0.35) }}
            transition={glide(reduced, 0.5)}
            onKeyDown={onCardKey}
          >
            <div onPointerDown={(event) => drag.start(event)} className="relative -mt-1 mb-1.5 flex h-9 touch-none items-center justify-center">
              <span aria-hidden="true" className="block h-1 w-9 rounded-full bg-[#3A4356]" />
              <button
                ref={closer}
                type="button"
                onClick={() => onClose(true)}
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded px-2 py-2 font-label text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--paper-dim)] transition-colors hover:text-[color:var(--paper)]"
              >
                Close
              </button>
            </div>
            <EvidenceCard claim={open.cite.claim} />
          </motion.div>
        ) : (
          <div
            key="card"
            ref={card}
            role="dialog"
            aria-modal="false"
            aria-label={CARD_LABEL}
            className="rp-card [&_.q]:pr-8"
            onKeyDown={onCardKey}
          >
            <button
              ref={closer}
              type="button"
              aria-label="Close"
              onClick={() => onClose(true)}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-[color:var(--paper-dim)] transition-colors hover:bg-[rgba(232,235,242,.06)] hover:text-[color:var(--paper)]"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
            <EvidenceCard claim={open.cite.claim} />
          </div>
        ))}
    </AnimatePresence>
  );
}

function SampleEnd() {
  return (
    <>
      {/* Clear of the differences band's dark edge, which the end would otherwise sit right on. */}
      <div className="sd-cta mt-14 max-[760px]:mt-10">
        <div>
          <p className="sd-eyebrow">{PERSONAL_REPORT}</p>
          <h2>Get a report like this about you</h2>
          <p>All you need is your birth date and where you were born. Add your birth time if you know it.</p>
        </div>
        <div className="sd-cta-acts">
          <ReportCta source="sample" className="sd-btn" />
          <Link href="/method" className="sd-btn sd-btn-g">
            How we make your report
          </Link>
        </div>
      </div>
      {/* ADR-166 lets the sample show her report and chart, never a photo, with this line crediting her public birth record. */}
      <p className="sd-fine">
        {SAMPLE.name}'s birth details are public. Her birth time comes from her birth record ({SAMPLE.source}). {PRODUCT} has no
        connection to her family or estate.
      </p>
    </>
  );
}

// The deck's bar and wheel pin under the site's nav, and under the strip of chapter chips where the rail becomes one.
const PINS = "[--deck-top:calc(var(--nav)+8px)] max-[1000px]:[--deck-top:calc(var(--nav)+var(--rail-strip)+8px)]";

export default function SamplePage() {
  const [open, setOpen] = useState<Opened | null>(null);
  const opened = useRef<Opened | null>(null);

  useEffect(() => {
    opened.current = open;
  }, [open]);

  const toggle = useCallback((cite: Cite, from: HTMLButtonElement) => {
    const sheet = window.matchMedia(SHEET_QUERY).matches;
    setOpen((was) => (was?.cite.id === cite.id ? null : { cite, from, sheet }));
  }, []);

  const close = useCallback((refocus: boolean) => {
    if (refocus) opened.current?.from.focus({ preventScroll: true });
    setOpen(null);
  }, []);

  const api = useMemo(() => ({ openId: open?.cite.id ?? null, toggle }), [open, toggle]);

  return (
    <SiteLayout page={page} head={<SampleHead page={page} />} end={<SampleEnd />}>
      <CardContext.Provider value={api}>
        <div className="border-t border-[color:var(--line-soft)] pb-16 pt-[72px] max-[760px]:pb-12 max-[760px]:pt-12">
          <div
            style={{ "--rail-strip": RAIL_STRIP } as CSSProperties}
            className={cn("sd-wrap grid grid-cols-[220px_minmax(0,1fr)] items-start gap-14 max-[1000px]:grid-cols-1 max-[1000px]:gap-7", PINS)}
          >
            <SampleRail />
            <Report />
          </div>
        </div>
        <EvidenceLayer open={open} onClose={close} />
      </CardContext.Provider>
      <Differences />
    </SiteLayout>
  );
}
