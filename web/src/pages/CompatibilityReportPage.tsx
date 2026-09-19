/**
 * The compatibility report (ADR-39, ADR-43): the natal page's furniture, the
 * hero replaced by a plate naming both people, the bi-wheel and its cards the
 * whole of chapter 02 and the first thing on the page, nine chapters by
 * accent index, streaming behind the same door. No number, rating,
 * percentage or bar anywhere, on screen or in the PDF. No dawn.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
import { ReportSky } from "@/components/report/ReportSky";
import { PairChapterBlock, PractiseBlock } from "@/components/report/PairSections";
import { WorkbookProvider } from "@/lib/workbook";
import { useLiveReport } from "@/hooks/useLiveReport";
import { chapterAccent } from "@/lib/chapter-accent";
import { PAIR_CHAPTER_TITLES, lensInfo, pairTabTitle, pairTitle } from "@/lib/lenses";
import { PAIR_SECTIONS } from "@/lib/progress";
import { isCurrentPairInterpretation, type ChartData, type Lens, type PairChapter, type PairInterpretation } from "@/types/chart";

const OPENING_ACCENT = "#5C6BC0";
const TOTAL = 9;
/** Chapter n reads section PAIR_SECTIONS[n-1]; the links land with chapter 02. */
const SECTION_OF = PAIR_SECTIONS.slice(0, 9);

function Centred({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md px-6">{children}</div>
    </div>
  );
}

/** The plate: two names, the lens, the two birth places. Page type, no number. */
function PairPlate({ a, b, lens }: { a: string; b: string; lens: Lens }) {
  const info = lensInfo(lens);
  return (
    <section className="rp-hero flex items-center justify-center px-6" aria-label="Opening">
      <div className="text-center">
        <p className="font-label text-[10px] tracking-[0.28em] uppercase text-[var(--sky)] opacity-85">Compatibility report · {info.title}</p>
        <h1 className="mt-4 font-display text-[clamp(30px,4.5vw,56px)] leading-[1.08] text-[#F2F4F9]">
          <span className="block">{a}</span>
          <span className="block font-label text-[12px] tracking-[0.34em] uppercase text-[var(--sky)] my-3">and</span>
          <span className="block">{b}</span>
        </h1>
        <p className="mt-6 font-numeric text-xs text-muted-foreground">How compatible you are, and why. Two charts, read together.</p>
      </div>
    </section>
  );
}

export default function CompatibilityReportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [active, setActive] = useState(-1);
  const [host, setHost] = useState<Host>("A");

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

  useEffect(() => {
    if (a && b) document.title = pairTabTitle(a.name, b.name);
    return () => { document.title = "Stars Decoded"; };
  }, [a, b]);

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

  if (!writing && interpretation && !isCurrentPairInterpretation(interpretation)) {
    return (
      <Centred>
        <p className="text-muted-foreground mb-4">This report was written with an earlier version. Write a new one from the dashboard.</p>
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

  const titles = PAIR_CHAPTER_TITLES(lens);
  const done = (key: string) => !writing || sections[key] === "done";
  const rail = titles.map((title, i) => ({ eyebrow: title, title, writing: !done(SECTION_OF[i]) }));
  const ch = (n: number) => ({ number: n, total: TOTAL, eyebrow: titles[n - 1], title: titles[n - 1] });
  const chapter = (n: number, s: PairChapter | undefined) => (
    <Chapter key={n} {...ch(n)} lede={s?.headline}>
      {done(SECTION_OF[n - 1]) && s ? <PairChapterBlock s={s} names={names} /> : <ChapterSkeleton />}
    </Chapter>
  );
  const prose: Array<PairChapter | undefined> = [
    interpretation?.howYouMeet, interpretation?.twoCharts, interpretation?.twoWays, interpretation?.whereItFlows,
    interpretation?.whereItRubs, interpretation?.howYouTalk, interpretation?.lensOne, interpretation?.lensTwo,
  ];

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

      <PairPlate a={names.a} b={names.b} lens={lens} />
      <header className="hidden print:block px-8 pt-12">
        <p className="font-label text-[10px] tracking-[0.28em] uppercase">Compatibility report · {lensInfo(lens).title}</p>
        <h1 className="font-display text-5xl mt-2">{pairTitle(names.a, names.b)}</h1>
      </header>

      <ChapterRail chapters={rail} active={active} onActive={setActive} />

      <main className="rp-body pb-20">
        {/* The two charts come first (ADR-43): the bi-wheel, then its cards, then chapter 02's words. */}
        <Chapter {...ch(2)} lede={interpretation?.twoCharts?.headline}>
          <BiWheel chartA={chartA} chartB={chartB} nameA={names.a} nameB={names.b} links={links} host={host} onHost={setHost} />
          {done("links") && interpretation?.links
            ? <LinkCards links={interpretation.links.links} nameA={names.a} nameB={names.b} />
            : <div className="mt-6"><ChapterSkeleton lines={4} /></div>}
          <div className="mt-10">
            {done("twoCharts") && interpretation?.twoCharts ? <PairChapterBlock s={interpretation.twoCharts} names={names} /> : <ChapterSkeleton />}
          </div>
        </Chapter>

        {chapter(1, prose[0])}
        {[3, 4, 5, 6, 7, 8].map((n) => chapter(n, prose[n - 1]))}

        <Chapter {...ch(9)}>
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
