/**
 * The compatibility report (ADR-63, ADR-97 to ADR-103): a seven-chapter
 * document that opens on the two charts. The hero is one centred group, each
 * name once over its rows; chapter 01 draws each person's chart alone, side
 * by side, then the ledger of what is naturally strong and what will take
 * work beside the links they rest on, the share card and the link cards;
 * chapters 02 to 06 are the lens's workbook chapters, 02 introducing the
 * scenes; 07 is the practice. Streams behind the same door as the natal page,
 * n = 8. No number, rating, percentage or bar anywhere, on screen or in the
 * PDF. No dawn, no gather.
 */
import { useMemo, useState, type CSSProperties } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetReportQueryKey, getListReportsQueryKey, useStopSharingCompatibility } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";
import LoadingState from "@/components/LoadingState";
import { SendDialog } from "@/components/SendDialog";
import { NatalWheel } from "@/components/chart/NatalWheel";
import { Chapter } from "@/components/report/Chapter";
import { ChapterRail } from "@/components/report/ChapterRail";
import { ChapterSkeleton } from "@/components/report/ChapterSkeleton";
import { LinkCards } from "@/components/report/LinkCard";
import { MethodologyStrip } from "@/components/report/MethodologyStrip";
import { OpeningOverlay } from "@/components/report/OpeningOverlay";
import { PairHero, type PairPerson } from "@/components/report/PairHero";
import { ReportSky } from "@/components/report/ReportSky";
import { LensChapterBlock, PractiseBlock, ScenesIntro, first } from "@/components/report/PairSections";
import { ShareCard } from "@/components/report/ShareCard";
import { TwoChartsLedger } from "@/components/report/TwoChartsLedger";
import { WorkbookProvider } from "@/lib/workbook";
import { useLiveReport } from "@/hooks/useLiveReport";
import { usePageTitle } from "@/lib/page-title";
import { chapterAccent } from "@/lib/chapter-accent";
import { PAIR_CHAPTER_TITLES, pairTabTitle } from "@/lib/lenses";
import { pairSectionIds } from "@/lib/progress";
import { recipientOf } from "@/lib/share-card";
import { isCurrentPairInterpretation, lensChapterOf, type ChartData, type Lens, type PairInterpretation } from "@/types/chart";

const OPENING_ACCENT = "#5C6BC0";

function Centred({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md px-6">{children}</div>
    </div>
  );
}

export default function CompatibilityReportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [active, setActive] = useState(-1);
  const [sending, setSending] = useState(false);
  const client = useQueryClient();
  const stopSharing = useStopSharingCompatibility();

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
        <OpeningOverlay progress={progress} provisional={null} chart={chartA} failureLine={live.failureReason?.line ?? null} onOpen={setOpen} />
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
  const ch = (n: number) => ({ number: n, total: titles.length, eyebrow: titles[n - 1], title: titles[n - 1] });
  const recipient = recipientOf({ name: a.name, isSelf: a.isSelf }, { name: b.name, isSelf: b.isSelf });
  // The route refuses a pair still being written, so the offer waits for the last chapter, as Export PDF does.
  const send = writing ? null : report.send ?? null;
  // MB-103 provisional: only the pair's sender stops sharing it, and the other person's reading ends at once.
  // Only its maker can send a pair, so the owner is its sender; a missing access is read as owner.
  const sender = (report.access ?? "owner") === "owner";
  const stop = async () => {
    await stopSharing.mutateAsync({ id: id! });
    await Promise.all([
      client.invalidateQueries({ queryKey: getGetReportQueryKey(id!) }),
      client.invalidateQueries({ queryKey: getListReportsQueryKey() }),
    ]);
  };
  const lensChapter = (n: number) => {
    const key = ids[n - 1];
    const s = lensChapterOf(interpretation, key);
    return (
      <Chapter key={key} {...ch(n)} intro={n === 2 ? <ScenesIntro /> : undefined} lede={s?.headline}>
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
        <OpeningOverlay progress={progress} provisional={null} chart={chartA} failureLine={live.failureReason?.line ?? null} onOpen={setOpen} />
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

      <ChapterRail chapters={rail} active={active} onActive={setActive} />

      <main className="rp-body pb-20">
        {/* Chapter 01 opens on the two charts (ADR-97): each alone, then the ledger, the share card and the link cards (ADR-101, ADR-102). */}
        <Chapter {...ch(1)} lede={interpretation?.twoCharts?.headline}>
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-8" data-two-charts>
            <div className="min-w-0"><NatalWheel chartData={chartA} centreName={first(names.a)} /></div>
            <div className="min-w-0"><NatalWheel chartData={chartB} centreName={first(names.b)} /></div>
          </div>
          {done("twoCharts") && interpretation?.twoCharts
            ? (
              <>
                <TwoChartsLedger s={interpretation.twoCharts} names={names} interpretation={interpretation} lens={lens} />
                <ShareCard
                  names={names}
                  lens={lens}
                  headline={interpretation.twoCharts.headline}
                  strengths={interpretation.twoCharts.strengths}
                  recipient={recipient}
                  send={send}
                  onSend={() => setSending(true)}
                  onStopSharing={sender ? stop : undefined}
                />
              </>
            )
            : <div className="mt-8"><ChapterSkeleton /></div>}
          {done("links") && interpretation?.links
            ? <LinkCards links={interpretation.links.links} nameA={names.a} nameB={names.b} />
            : <div className="mt-6"><ChapterSkeleton lines={4} /></div>}
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

      <SendDialog open={sending} onClose={() => setSending(false)} target={send ? { kind: "pair", reportId: id!, send } : null} />
    </div>
    </WorkbookProvider>
  );
}
