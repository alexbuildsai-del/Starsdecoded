/**
 * The compatibility report (ADR-63, ADR-70): a seven-chapter document that
 * opens on the two charts. The hero is two triad plates; chapter 01 is the
 * bi-wheel with its legend, the link cards and the generated introduction;
 * chapters 02 to 06 are the lens's workbook chapters; 07 is the practice.
 * Streams behind the same door as the natal page, n = 8. No number, rating,
 * percentage or bar anywhere, on screen or in the PDF. No dawn, no gather.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";
import LoadingState from "@/components/LoadingState";
import { BiWheel } from "@/components/chart/BiWheel";
import { crossLinks, type CrossLink, type Host } from "@/components/chart/bi-wheel";
import { Chapter } from "@/components/report/Chapter";
import { ChapterRail } from "@/components/report/ChapterRail";
import { ChapterSkeleton } from "@/components/report/ChapterSkeleton";
import { LinkCards } from "@/components/report/LinkCard";
import { MethodologyStrip } from "@/components/report/MethodologyStrip";
import { OpeningOverlay } from "@/components/report/OpeningOverlay";
import { PairHero, type PairPerson } from "@/components/report/PairHero";
import { ReportSky } from "@/components/report/ReportSky";
import { LensChapterBlock, PractiseBlock, TwoChartsBlock, first } from "@/components/report/PairSections";
import { ShareCard } from "@/components/report/ShareCard";
import { WorkbookProvider } from "@/lib/workbook";
import { useLiveReport } from "@/hooks/useLiveReport";
import { usePageTitle } from "@/lib/page-title";
import { chapterAccent } from "@/lib/chapter-accent";
import { PAIR_CHAPTER_TITLES, lensInfo, pairTabTitle, pairTitle } from "@/lib/lenses";
import { pairSectionIds } from "@/lib/progress";
import { isCurrentPairInterpretation, lensChapterOf, type ChartData, type Lens, type PairInterpretation } from "@/types/chart";

const OPENING_ACCENT = "#5C6BC0";
const TOTAL = 7;

function Centred({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md px-6">{children}</div>
    </div>
  );
}

/** The wheel's legend, static product copy (ADR-63): what the rings and the lines are, and what to do with them. */
function WheelLegend({ a, b }: { a: string; b: string }) {
  const rows: Array<[string, string, string?]> = [
    ["Inner ring", `${first(a)}'s chart`],
    ["Outer ring", `${first(b)}'s chart`],
    ["A line", "where one of you meets the other"],
    ["Brass", "a touch: the same place in both charts", "#D4B06A"],
    ["Teal", "an ease between you", "#5FB3A1"],
    ["Rose", "a friction between you", "#D07A8A"],
  ];
  return (
    <dl className="mt-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 text-[13px] text-[var(--paper-dim)]" aria-label="How to read the wheel">
      {rows.map(([k, v, colour]) => (
        <div key={k} className="flex items-baseline gap-2">
          <dt className="font-label text-[10px] tracking-[0.18em] uppercase text-[var(--sky)] flex items-center gap-1.5 flex-none w-24">
            {colour && <span aria-hidden className="inline-block h-2 w-4 rounded-sm" style={{ background: colour }} />}
            {k}
          </dt>
          <dd>{v}</dd>
        </div>
      ))}
      <p className="sm:col-span-2 mt-1">Tap a line to read what that link does between you.</p>
    </dl>
  );
}

export default function CompatibilityReportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [active, setActive] = useState(-1);
  const [host, setHost] = useState<Host>("A");
  const wheelRef = useRef<HTMLDivElement>(null);

  const live = useLiveReport(id!);
  const { report, sections, workbook, writing, open, setOpen, progress } = live;
  const interpretation = live.interpretation as PairInterpretation | null;
  const lens = (live.lens ?? "partners") as Lens;
  const participants = live.participants ?? [];
  const a = participants[0];
  const b = participants[1];
  const chartA = (a?.chartData ?? null) as unknown as ChartData | null;
  const chartB = (b?.chartData ?? null) as unknown as ChartData | null;
  const names = useMemo(() => ({ a: a?.name ?? "A", b: b?.name ?? "B" }), [a?.name, b?.name]);

  // The browser offers document.title as the print-to-PDF filename, so the
  // loaded pair's title is the filename the buyer is handed.
  const named = Boolean(a && b);
  usePageTitle(named ? pairTabTitle(a!.name, b!.name) : "Compatibility Report", { raw: named });

  // The wheel draws the same set of links the cards were generated from (ADR-43).
  const links: CrossLink[] | undefined = useMemo(() => {
    const drawn = interpretation?.links?.links;
    if (!drawn || !chartA || !chartB) return undefined;
    const all = crossLinks(chartA, chartB);
    const chosen = all.filter((l) => drawn.some((d) => d.kind !== "overlay" && d.planetA === l.planetA && d.planetB === l.planetB && d.aspect === l.type));
    return chosen.length ? chosen : all;
  }, [interpretation?.links?.links, chartA, chartB]);

  if (live.isLoading) return <LoadingState label="Loading your report…" />;

  if (live.isError || !report || report.type !== "compatibility") {
    return (
      <Centred>
        <p className="text-muted-foreground mb-4">Report not found.</p>
        <Button onClick={() => navigate("/dashboard")} variant="outline">Dashboard</Button>
      </Centred>
    );
  }

  // MB-65 provisional: a report written before p2 cannot render on the seven-chapter page; it reads as unavailable and is listed nowhere.
  if (!writing && interpretation && !isCurrentPairInterpretation(interpretation)) {
    return (
      <Centred>
        <p className="text-muted-foreground mb-4">This report was written with an earlier version and is no longer available. Write a new one from the dashboard.</p>
        <Button onClick={() => navigate("/dashboard")} variant="outline">Dashboard</Button>
      </Centred>
    );
  }

  const ready = !!chartA && !!chartB && !!a && !!b;
  const failed = report.status === "failed" && !interpretation;
  const accent = active < 0 ? OPENING_ACCENT : chapterAccent(active + 1);
  const onHero = active < 0;

  if (!ready) {
    return (
      <div className="rp-root min-h-screen" style={{ "--accent": OPENING_ACCENT } as CSSProperties}>
        <ReportSky accent={OPENING_ACCENT} opening />
        <OpeningOverlay progress={progress} provisional={null} chart={chartA} errorMessage={live.errorMessage} onOpen={setOpen} />
      </div>
    );
  }

  const person = (p: NonNullable<typeof a>, chart: ChartData): PairPerson => ({
    name: p.name, birthDate: p.birthDate, birthTime: p.birthTime, birthTimeWindowMinutes: p.birthTimeWindowMinutes,
    birthPlace: p.birthPlace, latitude: p.latitude, longitude: p.longitude, isSelf: p.isSelf, chartData: chart,
  });
  const titles = PAIR_CHAPTER_TITLES(lens);
  const ids = pairSectionIds(lens);
  const done = (key: string) => !writing || sections[key] === "done";
  const rail = titles.map((title, i) => ({ eyebrow: title, title, writing: !done(ids[i]) }));
  const ch = (n: number) => ({ number: n, total: TOTAL, eyebrow: titles[n - 1], title: titles[n - 1] });
  const lensChapter = (n: number) => {
    const key = ids[n - 1];
    const s = lensChapterOf(interpretation, key);
    return (
      <Chapter key={key} {...ch(n)} lede={s?.headline}>
        {done(key) && s
          ? <LensChapterBlock s={s} names={names} chapter={key} scenes={interpretation?.scenes?.[key]} reportId={id!} />
          : <ChapterSkeleton />}
      </Chapter>
    );
  };

  return (
    <WorkbookProvider reportId={id!} initial={workbook}>
    <div className="rp-root min-h-screen" style={{ "--accent": accent } as CSSProperties}>
      <ReportSky accent={accent} opening={onHero} />

      {(!open || failed) && (
        <OpeningOverlay progress={progress} provisional={null} chart={chartA} errorMessage={live.errorMessage} onOpen={setOpen} />
      )}

      <nav
        className={`fixed top-0 inset-x-0 z-50 border-b no-print transition-colors duration-500 ${
          onHero ? "border-transparent bg-transparent" : "border-border/40 bg-background/90 backdrop-blur-md"
        }`}
      >
        <div className="max-w-[880px] mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-sm font-label">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={writing} onClick={() => window.print()} className="font-label text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" />
              {writing ? "Writing…" : "Export PDF"}
            </Button>
            <AccountMenu />
          </div>
        </div>
      </nav>

      <PairHero a={person(a, chartA)} b={person(b, chartB)} lens={lens} accent={OPENING_ACCENT} />
      <header className="hidden print:block px-8 pt-4">
        <p className="font-label text-[10px] tracking-[0.28em] uppercase">Compatibility report · {lensInfo(lens).title}</p>
        <h1 className="font-display text-5xl mt-2">{pairTitle(names.a, names.b)}</h1>
      </header>

      <ChapterRail chapters={rail} active={active} onActive={setActive} />

      <main className="rp-body pb-20">
        {/* Chapter 01 opens on the two charts (ADR-63): the wheel, its legend, the cards, then the introduction. */}
        <Chapter {...ch(1)} lede={interpretation?.twoCharts?.headline}>
          <div ref={wheelRef}>
            <BiWheel chartA={chartA} chartB={chartB} nameA={names.a} nameB={names.b} links={links} host={host} onHost={setHost} />
          </div>
          <WheelLegend a={names.a} b={names.b} />
          {done("links") && interpretation?.links
            ? <LinkCards links={interpretation.links.links} nameA={names.a} nameB={names.b} />
            : <div className="mt-6"><ChapterSkeleton lines={4} /></div>}
          <div className="mt-10">
            {done("twoCharts") && interpretation?.twoCharts
              ? (
                <>
                  <TwoChartsBlock s={interpretation.twoCharts} names={names} />
                  <ShareCard
                    names={names}
                    headline={interpretation.twoCharts.headline}
                    strengths={interpretation.twoCharts.strengths}
                    wheel={() => wheelRef.current?.querySelector("svg") ?? null}
                  />
                </>
              )
              : <ChapterSkeleton />}
          </div>
        </Chapter>

        {[2, 3, 4, 5, 6].map((n) => lensChapter(n))}

        <Chapter {...ch(7)}>
          {done("whatToPractise") && interpretation?.whatToPractise
            ? <PractiseBlock s={interpretation.whatToPractise} names={names} />
            : <ChapterSkeleton lines={4} />}
        </Chapter>

        {interpretation && (
          <div className="rp-chapter">
            <MethodologyStrip meta={interpretation.meta} />
          </div>
        )}
      </main>
    </div>
    </WorkbookProvider>
  );
}
