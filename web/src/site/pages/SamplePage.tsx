/**
 * /sample (annex /sample, ADR-119): the sample's stored run read end to end as
 * a Personal natal report. The chapters stand in the report page's order and
 * each chapter's blocks in the order the sample module reads them, so every
 * claim is marked in place with its number in reading order, in the lists and
 * checklists too, where the report page leaves them unmarked. A mark opens the
 * report's own evidence card: beside the line on a wide screen, R10's bottom
 * sheet on a phone. Everything but the card is in the prerendered HTML.
 */
import {
  Fragment, createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type KeyboardEvent, type ReactNode,
} from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { Link } from "wouter";
import { NatalWheel } from "@/components/chart/NatalWheel";
import { houseSign } from "@/components/chart/wheel-geometry";
import { EvidenceCard } from "@/components/report/EvidenceCard";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { chapterAccent } from "@/lib/chapter-accent";
import { CHAPTERS, type ChapterSection } from "@/lib/chapters";
import { HOUSE_NAMES, ORDINALS, withHouseWords } from "@/lib/evidence-glossary";
import { houseOccupants } from "@/lib/house-occupants";
import { plainProse } from "@/lib/plain-prose";
import { PLANET_RENDERS } from "@/lib/planet-renders";
import { PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { skySentence } from "@/lib/sky-now";
import { cn } from "@/lib/utils";
import type { ActionItem, ChartData, Claim, Interpretation, ListedItem } from "@/types/chart";
import { SAMPLE_TITLE_ID, SampleHead } from "../components/SampleHead";
import { SampleRail, chapterId } from "../components/SampleRail";
import { ReportCta } from "../cta";
import { SAMPLE, chapterTexts, claimsInReadingOrder, printedParagraphs, quoteNeedle, sampleChart, type ClaimSection } from "../data/sample";
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
const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const claimSectionOf = (section: ChapterSection): ClaimSection => (section === "houses" ? "triad" : section);

// The sample module's reading order, walked again to cut each text at its marks: hits in a paragraph left to right,
// one inside another skipped, each claim marked once in its chapter and numbered from 1 in it.
function printChapter(section: ChapterSection): Printed[] {
  const owner = claimSectionOf(section);
  const claims = SAMPLE.run[owner]?.claims ?? [];
  const needles = claims.map(quoteNeedle);
  const marked = new Set<number>();
  let n = 0;
  return chapterTexts(section).map((text) => {
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

// Throws rather than print a claim unmarked or misnumbered, so the prerender fails the build instead (acceptance: 63 of 63).
function printedChapters(): Printed[][] {
  if (printedCache) return printedCache;
  const chapters = CHAPTERS.map((c) => printChapter(c.section));
  const marks = chapters.flatMap((texts, i) =>
    texts.flat(2).flatMap((run) => (typeof run === "string" ? [] : [`${i + 1}:${run.n}:${run.id}`])),
  );
  const expected = claimsInReadingOrder().map((c) => `${c.chapter}:${c.n}:${c.id}`);
  if (marks.join() !== expected.join()) {
    throw new Error(`/sample marks ${marks.length} claims where data/sample.ts anchors ${expected.length} in reading order: the two have drifted apart.`);
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
  const texts = chapterTexts(CHAPTERS[index].section);
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

// A why reads as a sentence on its own line, capitalised and closed by the page, as the report's checklists print it (ADR-62).
function asSentence(text: Printed): Printed {
  if (text.length !== 1 || text[0].length === 0) return text;
  const runs = [...text[0]];
  const first = runs[0];
  if (typeof first === "string") runs[0] = first.charAt(0).toUpperCase() + first.slice(1);
  const last = runs[runs.length - 1];
  if (!/[.!?]$/.test(typeof last === "string" ? last : last.text)) runs.push(".");
  return [runs];
}

const LABEL = "font-label text-[11px] font-medium uppercase leading-[1.2] tracking-[.18em] text-[color:var(--sd-muted)]";
const PROSE = "text-[16.5px] leading-[1.75] text-[color:var(--paper-dim)] max-[760px]:text-base";
const CARD = "grid content-start gap-2 rounded-[14px] border border-[color:var(--line)] bg-[rgba(17,22,31,.45)] p-4";
const TITLE = "text-2xl leading-tight";
const ITEM = "rounded-[10px] border border-[color:var(--line-soft)] bg-[rgba(17,22,31,.45)] px-3.5 py-3 text-[15.5px] leading-[1.55] text-[color:var(--paper)]";

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

interface Item {
  main: Printed;
  why?: Printed;
}

function ItemList({ items }: { items: Item[] }) {
  return (
    <ul className="m-0 grid list-none gap-2.5 p-0">
      {items.map((item, i) => (
        <li key={i} className={ITEM}>
          <Words printed={item.main} />
          {item.why && (
            <span className="mt-0.5 block text-sm text-[color:var(--sd-muted)]">
              <Words printed={asSentence(item.why)} />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Items({ label, items, heading: Heading = "h3" }: { label: string; items: Item[]; heading?: "h3" | "h4" }) {
  return (
    <div className="grid gap-2">
      <Heading className={LABEL}>{label}</Heading>
      <ItemList items={items} />
    </div>
  );
}

function Listed({ label, items }: { label: string; items: { item: Printed; reason: Printed }[] }) {
  return (
    <div className="grid gap-2">
      <h3 className={LABEL}>{label}</h3>
      <ul className="m-0 grid list-none gap-2.5 p-0">
        {items.map((entry, i) => (
          <li key={i} className={ITEM}>
            <Words printed={entry.item} />
            <span className="text-[color:var(--paper-dim)]">
              : <Words printed={entry.reason} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const actions = (xs: ActionItem[], r: Reader): Item[] => xs.map((a) => ({ main: r.take(a.action), why: r.take(a.why) }));
const listed = (xs: ListedItem[], r: Reader) => xs.map((l) => ({ item: r.take(l.item), reason: r.take(l.reason) }));

interface TriadCard {
  key: string;
  label: string;
  house?: number;
  text: Printed;
}

interface HouseText {
  house: number;
  text: Printed;
}

// Chapter 2's picture, paired as the report's explorer pairs them: her wheel held in view beside the triad and the twelve
// house cards while they scroll, and each card lighting its house on it.
function HouseChart({ chart, triad, houses }: { chart: ChartData; triad: TriadCard[]; houses: HouseText[] }) {
  const [lit, setLit] = useState(0);
  const asc = chart.angles?.ascendant.absoluteDegree;
  const lights = (house?: number) => {
    const on = () => {
      if (house) setLit(house);
    };
    const off = () => {
      if (house) setLit((was) => (was === house ? 0 : was));
    };
    return { onPointerEnter: on, onPointerLeave: off, onFocus: on, onBlur: off };
  };
  const litCard = (house?: number) => cn(CARD, "transition-colors", house !== undefined && lit === house && "border-[color:rgba(159,168,218,.55)] bg-[rgba(92,107,192,.08)]");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-start gap-8 max-[760px]:grid-cols-1 max-[760px]:gap-6">
      <div className="sticky top-[calc(var(--nav)+24px)] max-[1000px]:top-[calc(var(--nav)+72px)] max-[760px]:static max-[760px]:w-full max-[760px]:max-w-[460px]">
        <NatalWheel chartData={chart} orbs={SAMPLE.run.meta.orbs} selectedHouse={lit} onSelectHouse={setLit} />
        <p className="sr-only">{`${SAMPLE.name}'s birth chart: ${skySentence(chart)}`}</p>
      </div>
      <div className="grid min-w-0 gap-3">
        {triad.map((t) => (
          <div key={t.key} className={litCard(t.house)} {...lights(t.house)}>
            <p className="font-numeric text-[10.5px] font-medium uppercase leading-[1.4] tracking-[.1em] text-[color:var(--sd-brass)]">{t.label}</p>
            <p className="text-[15px] leading-[1.65] text-[color:var(--paper-dim)]">
              <Words printed={t.text} />
            </p>
          </div>
        ))}
        {asc !== undefined && houses.length > 0 && (
          <>
            <h3 className={cn(LABEL, "mt-5")}>Your twelve houses</h3>
            {houses.map(({ house, text }) => {
              const i = house - 1;
              const planets = houseOccupants(chart, house).filter((o) => o.kind === "planet");
              return (
                <article key={house} tabIndex={0} aria-labelledby={`sd-house-${house}`} className={cn(litCard(house), "gap-1.5")} {...lights(house)}>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-numeric text-[10.5px] font-medium uppercase leading-[1.4] tracking-[.12em] text-[color:var(--sd-brass)]">
                    {ORDINALS[i]} house · {houseSign(house, asc)}
                    {planets.map((o) => (
                      <img key={o.key} src={PLANET_RENDERS[o.key]} alt={o.label} width={18} height={18} className="h-[18px] w-[18px]" />
                    ))}
                  </p>
                  <h4 id={`sd-house-${house}`} className="text-[20px] leading-[1.2] text-[color:var(--paper)]">
                    {HOUSE_NAMES[i]}
                  </h4>
                  <p className="text-[14.5px] leading-[1.65] text-[color:var(--paper-dim)]">
                    <Words printed={text} />
                  </p>
                </article>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

type Body = (run: Interpretation, r: Reader, chart: ChartData) => ReactNode;

// Labels are the report page's own where it has them; the overview's five fields share chapter 1 here (data/sample.ts).
const BODIES: Record<ChapterSection, Body> = {
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
  houses: ({ triad, houses }, r, chart) => {
    const cards = triad
      ? [
          { key: "sun", label: withHouseWords(triad.sun.label), house: chart.planets.sun?.house, text: r.take(triad.sun.text) },
          { key: "moon", label: withHouseWords(triad.moon.label), house: chart.planets.moon?.house, text: r.take(triad.moon.text) },
          ...(triad.rising ? [{ key: "rising", label: withHouseWords(triad.rising.label), house: 1, text: r.take(triad.rising.text) }] : []),
        ]
      : [];
    const readings = (houses?.houses ?? []).map((h) => ({ house: h.house, text: r.take(h.reading) }));
    return <HouseChart chart={chart} triad={cards} houses={readings} />;
  },
  mind: ({ mind: s }, r) =>
    s && (
      <>
        <Block label="How you think" printed={r.take(s.howYouThink)} />
        <Block label="How you decide" printed={r.take(s.howYouDecide)} />
        <Block label="How you are understood" printed={r.take(s.howYouAreUnderstood)} />
        <Items label="Practice this week" items={[{ main: r.take(s.practice) }]} />
      </>
    ),
  career: ({ career: s }, r) =>
    s && (
      <>
        <Block label="Vocational pull" printed={r.take(s.vocationalPull)} />
        <Block label="How you show up" printed={r.take(s.howYouShowUp)} />
        <Block label="Growth through work" printed={r.take(s.growthThroughWork)} />
        <Items label="What to do" items={actions(s.actions, r)} />
        <Listed label="Career paths" items={listed(s.careerPaths, r)} />
      </>
    ),
  money: ({ money: s }, r) =>
    s && (
      <>
        <Block label="Your relationship to resources" printed={r.take(s.relationshipToResources)} />
        <Block label="What works, and what does not" printed={r.take(s.whatWorks)} />
        <Block label="Shared money and exposure" printed={r.take(s.sharedAndExposed)} />
        <Items label="What to do" items={actions(s.actions, r)} />
      </>
    ),
  relationships: ({ relationships: s }, r) =>
    s && (
      <>
        <Block label="How you love" printed={r.take(s.howYouLove)} />
        <Block label="The challenge" printed={r.take(s.theChallenge)} />
        <Block label="What partnership asks of you" printed={r.take(s.whatPartnershipAsks)} />
        <Items label="What to do" items={actions(s.actions, r)} />
        <Listed label="You connect best with" items={listed(s.connectBestWith, r)} />
      </>
    ),
  family: ({ family: s }, r) =>
    s && (
      <>
        <Block label="What you carry" printed={r.take(s.whatYouCarry)} />
        <Block label="What roots you" printed={r.take(s.whatRootsYou)} />
        <Block label="The inherited edge" printed={r.take(s.theInheritedEdge)} />
        <Items label="What to do" items={actions(s.actions, r)} />
      </>
    ),
  superpowers: ({ superpowers: s }, r) => {
    if (!s) return null;
    const trio = [
      { kicker: "Your superpower", heading: "How to use it", item: s.superpower },
      { kicker: "The pattern you will always navigate", heading: "How to manage it", item: s.chronicPattern },
      { kicker: "Your growing edge", heading: "Practice this week", item: s.growingEdge },
    ].map((t) => ({ ...t, text: r.take(t.item.text), items: actions(t.item.actions, r) }));
    return (
      <div className="grid gap-3.5">
        {trio.map((t) => (
          <div key={t.kicker} className={cn(CARD, "gap-2.5 p-[18px]")}>
            <p className={LABEL}>{t.kicker}</p>
            <h3 className={TITLE}>{t.item.title}</h3>
            <p className={PROSE}>
              <Words printed={t.text} />
            </p>
            <Items label={t.heading} items={t.items} heading="h4" />
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
            <p className="mt-1 font-label text-[10.5px] font-medium uppercase leading-[1.2] tracking-[.18em] text-[color:var(--accent)]">
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
  focus: ({ focus: s }, r) => {
    if (!s) return null;
    const groups = (
      [
        ["Lean into", s.leanInto],
        ["Notice", s.notice],
        ["Practice", s.practice],
      ] as const
    ).map(([label, g]) => ({ label, intro: r.take(g.intro), items: g.bullets.map((b) => ({ main: r.take(b.point), why: r.take(b.why) })) }));
    const closing = r.take(s.closing);
    return (
      <>
        {groups.map((g) => (
          <div key={g.label} className="grid gap-2">
            <h3 className={LABEL}>{g.label}</h3>
            <p className={PROSE}>
              <Words printed={g.intro} />
            </p>
            <div className="mt-1">
              <ItemList items={g.items} />
            </div>
          </div>
        ))}
        {/* Upright, as the report prints its closing (natal-report-pass-two), in paper (ADR-46). */}
        <p className="font-display text-[24px] leading-[1.5] text-[color:var(--paper)]">
          <Words printed={closing} />
        </p>
      </>
    );
  },
};

function ChapterSection({ index, chart }: { index: number; chart: ChartData }) {
  const chapter = CHAPTERS[index];
  const r = reader(index);
  const body = BODIES[chapter.section](SAMPLE.run, r, chart);
  r.finish();
  const id = chapterId(index);

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      style={{ "--accent": chapterAccent(index + 1) } as CSSProperties}
      className={cn(
        "mb-14 grid gap-[22px] border-b border-[color:var(--line-soft)] pb-[72px] last:mb-0 last:border-b-0 last:pb-0 max-[1000px]:scroll-mt-[calc(var(--nav)+68px)]",
        // The reading keeps its measure; chapter 2 takes the column's width, for its wheel and cards side by side.
        chapter.section !== "houses" && "max-w-[70ch]",
      )}
    >
      <p className="font-label text-[11px] font-medium uppercase leading-[1.2] tracking-[.22em] text-[color:var(--accent)]">
        <span className="font-numeric">
          {two(index + 1)} / {two(CHAPTERS.length)}
        </span>{" "}
        · {chapter.eyebrow}
      </p>
      <h2 id={`${id}-title`} className="text-[clamp(32px,3.4vw,44px)] leading-[1.08]">
        {chapter.title}
      </h2>
      {body}
    </section>
  );
}

// The report's citation classes read --label; the site names its label face --f-label.
const REPORT_TOKENS = { "--label": "var(--f-label)" } as CSSProperties;

// Memoised with no props: a card opening re-renders only the marks, through the context, never the text around them.
const Report = memo(function Report() {
  const chart = sampleChart();
  return (
    <article aria-labelledby={SAMPLE_TITLE_ID} style={REPORT_TOKENS} className="min-w-0">
      {CHAPTERS.map((chapter, i) => (
        <ChapterSection key={chapter.section} index={i} chart={chart} />
      ))}
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
      <div className="sd-cta">
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
      {/* MB-90 provisional: the line the legal check beside MB-31 confirms or rewrites. */}
      <p className="sd-fine">
        {SAMPLE.name}'s birth details are public. Her birth time comes from her birth record ({SAMPLE.source}). {PRODUCT} has no
        connection to her family or estate.
      </p>
    </>
  );
}

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
          <div className="sd-wrap grid grid-cols-[220px_minmax(0,1fr)] items-start gap-14 max-[1000px]:grid-cols-1 max-[1000px]:gap-7">
            <SampleRail />
            <Report />
          </div>
        </div>
        <EvidenceLayer open={open} onClose={close} />
      </CardContext.Provider>
    </SiteLayout>
  );
}
