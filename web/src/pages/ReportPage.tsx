import { useState, type CSSProperties } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";
import { useRegenerateReport } from "@workspace/api-client-react";
import LoadingState from "@/components/LoadingState";
import {
  PLANET_GLYPHS,
  PLANET_LABELS,
  isCurrentInterpretation,
  type ChartData,
  type ChartPlanet,
} from "@/types/chart";
import {
  OverviewBlock, DeepdiveBlock, MindBlock, MindRail, CareerBlock, CareerRail,
  MoneyBlock, MoneyRail, RelationshipsBlock, RelationshipsRail,
  FamilyBlock, FamilyRail, SuperpowersBlock, DiscoveriesBlock,
} from "@/components/ReportSections";
import { ReportHero } from "@/components/report/ReportHero";
import { ReportSky } from "@/components/report/ReportSky";
import { Chapter } from "@/components/report/Chapter";
import { ChapterRail } from "@/components/report/ChapterRail";
import { ChartExplorer } from "@/components/report/ChartExplorer";
import { BalanceRail } from "@/components/report/BalanceRail";
import { PathBlock } from "@/components/report/PathBlock";
import { NodalAxis } from "@/components/report/NodalAxis";
import { DawnClosing } from "@/components/report/DawnClosing";
import { MethodologyStrip } from "@/components/report/MethodologyStrip";
import { WorkbookProvider } from "@/lib/workbook";
import { useLiveReport } from "@/hooks/useLiveReport";
import { chapterAccent } from "@/lib/chapter-accent";

/** Eleven chapters, in the locked order. The section each one waits for is its own. */
const CHAPTERS = [
  { eyebrow: "Overview", title: "Chart Overview", section: "overview" },
  { eyebrow: "Chart", title: "Natal Chart Deepdive", section: "houses" },
  { eyebrow: "Mind", title: "Mind & Communication", section: "mind" },
  { eyebrow: "Work", title: "Career & Calling", section: "career" },
  { eyebrow: "Resources", title: "Money & Resources", section: "money" },
  { eyebrow: "Relationships", title: "Relationships & Intimacy", section: "relationships" },
  { eyebrow: "Roots", title: "Family & Roots", section: "family" },
  { eyebrow: "Self-Knowledge", title: "Superpowers, Chronic Patterns & Growing Edges", section: "superpowers" },
  { eyebrow: "Paradoxes", title: "Key Paradoxes & Discoveries", section: "discoveries" },
  { eyebrow: "Path", title: "Your Path", section: "path" },
  { eyebrow: "Focus", title: "What to Focus On", section: "focus" },
];
const TOTAL = CHAPTERS.length;
const OPENING_ACCENT = "#5C6BC0";

function Writing() {
  return (
    <p className="font-label text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
      Still writing this chapter
    </p>
  );
}

function PlanetRow({
  name,
  planet,
  meaning,
}: {
  name: string;
  planet: ChartPlanet;
  meaning?: string;
}) {
  return (
    <div
      id={`planet-${name}`}
      className="py-3 border-b border-border/30 last:border-0 scroll-mt-24"
    >
      <div className="flex items-center gap-3">
        <span className="w-6 text-center text-lg text-primary/80">{PLANET_GLYPHS[name] ?? "·"}</span>
        <span className="font-label text-sm w-24 text-muted-foreground">{PLANET_LABELS[name] ?? name}</span>
        <span className="font-numeric text-base flex-1">
          {planet.degree.toFixed(1)}° {planet.sign}
        </span>
        <span className="font-numeric text-xs text-muted-foreground">H{planet.house}</span>
        {planet.retrograde && (
          <span className="text-xs text-amber-400 font-label">Rx</span>
        )}
      </div>
      {meaning && (
        <p className="mt-2 ml-9 pr-2 text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
          {meaning}
        </p>
      )}
    </div>
  );
}

function Centred({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md px-6">{children}</div>
    </div>
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [active, setActive] = useState(-1);

  const regenerate = useRegenerateReport();
  const live = useLiveReport(id!);
  const { report, interpretation, sections, workbook, writing } = live;

  const handlePrint = () => window.print();

  if (live.isLoading) return <LoadingState label="Loading your report…" />;

  if (live.isError || !report) {
    return (
      <Centred>
        <p className="text-muted-foreground mb-4">Report not found.</p>
        <Button onClick={() => navigate("/chart")} variant="outline">Start over</Button>
      </Centred>
    );
  }

  if (report.status === "failed") {
    return (
      <Centred>
        <p className="text-muted-foreground mb-4">
          {live.errorMessage ?? "This report could not be generated."}
        </p>
        <Button onClick={() => navigate("/chart")} variant="outline">Start over</Button>
      </Centred>
    );
  }

  // The chart is what the page opens on. Until it exists there is nothing to show.
  if (!report.chartData || !interpretation) {
    return (
      <Centred>
        <p className="text-muted-foreground mb-4">This report is still being computed.</p>
        <Button onClick={() => navigate(`/generating/${id}`)} variant="outline">Check status</Button>
      </Centred>
    );
  }

  const chartData = report.chartData as unknown as ChartData;

  // MB-45 provisional: a finished report from an earlier prompt version keeps
  // its words but not this page's shape, so it is offered a regeneration and
  // never regenerated on its own.
  if (!writing && !isCurrentInterpretation(interpretation)) {
    return (
      <Centred>
        <p className="text-muted-foreground mb-4">
          This report was generated with an earlier version and needs to be regenerated to view.
        </p>
        <Button
          variant="outline"
          disabled={regenerate.isPending}
          onClick={() => regenerate.mutate({ id: id! }, { onSuccess: () => navigate(`/generating/${id}`) })}
        >
          {regenerate.isPending ? "Starting…" : "Regenerate"}
        </Button>
        {regenerate.isError && (
          <p className="text-sm text-destructive mt-3">Could not start regeneration. Please try again in a minute.</p>
        )}
      </Centred>
    );
  }

  const mainPlanets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  const minorPlanets = ["chiron", "north_node", "south_node"];
  const angles = interpretation.angleMeanings;

  const accent = active < 0 ? OPENING_ACCENT : chapterAccent(active + 1);
  const onHero = active < 0;
  const done = (key: string) => !writing || sections[key] === "done";
  const rail = CHAPTERS.map((c) => ({ eyebrow: c.eyebrow, title: c.title, writing: !done(c.section) }));
  const ch = (n: number) => ({
    number: n,
    total: TOTAL,
    eyebrow: CHAPTERS[n - 1].eyebrow,
    title: CHAPTERS[n - 1].title,
  });

  return (
    <WorkbookProvider reportId={id!} initial={workbook}>
    <div className="rp-root min-h-screen" style={{ "--accent": accent } as CSSProperties}>
      <ReportSky accent={accent} opening={onHero} />

      <ReportHero
        name={report.name}
        birthDate={report.birthDate}
        birthTime={report.birthTime}
        birthPlace={report.birthPlace}
        latitude={report.latitude}
        longitude={report.longitude}
        chartData={chartData}
        meta={interpretation.meta}
      />

      {/* Chrome sits on the opening plate without a ground, and takes one once the reading starts. */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 border-b no-print transition-colors duration-500 ${
          onHero ? "border-transparent bg-transparent" : "border-border/40 bg-background/90 backdrop-blur-md"
        }`}
      >
        <div className="max-w-[880px] mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-sm font-label"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <div className="flex items-center gap-2">
            {/* MB-44 provisional: a half-written report is readable but not exportable. */}
            <Button
              variant="outline"
              size="sm"
              disabled={writing}
              onClick={handlePrint}
              className="font-label text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {writing ? "Writing…" : "Export PDF"}
            </Button>
            <AccountMenu />
          </div>
        </div>
      </nav>

      <ChapterRail chapters={rail} active={active} onActive={setActive} />

      <main className="rp-body pb-20">
        <Chapter {...ch(1)} lede={interpretation.overview?.headline}>
          {interpretation.overview ? <OverviewBlock s={interpretation.overview} /> : <Writing />}
        </Chapter>

        <Chapter {...ch(2)}>
          <ChartExplorer
            chartData={chartData}
            orbs={interpretation.meta.orbs}
            readings={interpretation.houses?.houses}
            triad={interpretation.triad}
          />

          <div className="mt-10">
            {interpretation.overview ? <DeepdiveBlock s={interpretation.overview} /> : <Writing />}
            <div className="mt-6">
              <BalanceRail chartData={chartData} />
            </div>
          </div>

          {/* Print only: the PDF is where the composed per-planet and angle text
              lives, since the cards on screen now read the generated section. */}
          <div className="hidden print:block mt-5 space-y-3">
            {(["mercury", "venus", "mars", "jupiter", "saturn"] as const).map((name) => {
              const text = interpretation.personalPlanets[name];
              const planet = chartData.planets[name];
              if (!text || !planet) return null;
              return (
                <div key={name} className="p-5 rounded-xl border border-border/60 bg-card/40">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-primary text-base">{PLANET_GLYPHS[name]}</span>
                      <span className="font-display text-base text-foreground">
                        {PLANET_LABELS[name]} in {planet.sign}
                      </span>
                    </div>
                    <span className="font-numeric text-[11px] text-muted-foreground">
                      H{planet.house}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/80">{text}</p>
                </div>
              );
            })}
            {angles && (
              <div className="p-5 rounded-xl border border-border/60 bg-card/40">
                <p className="font-label text-xs text-muted-foreground tracking-wider uppercase mb-2">Angles</p>
                <p className="text-sm leading-relaxed text-foreground/80">{angles.ascendant.firstImpression}</p>
                <p className="text-sm leading-relaxed text-foreground/80 mt-2">{angles.ascendant.orientationStyle}</p>
                <p className="text-sm leading-relaxed text-foreground/80 mt-2">{angles.midheaven.publicDirection}</p>
                <p className="text-sm leading-relaxed text-foreground/80 mt-2">{angles.midheaven.whereYouThrive}</p>
              </div>
            )}
          </div>

          {/* Placement table — print only; the PDF is the one place every
              degree appears. */}
          <div className="hidden print:block print:mt-8">
            <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/30 overflow-hidden">
              <div className="px-5 py-3 bg-muted/20">
                <p className="font-label text-xs text-muted-foreground tracking-wider uppercase">Personal Planets</p>
              </div>
              <div className="px-5">
                {mainPlanets.map((name) => {
                  const planet = chartData.planets[name];
                  if (!planet) return null;
                  return (
                    <PlanetRow
                      key={name}
                      name={name}
                      planet={planet}
                      meaning={interpretation.personalPlanets?.[name]}
                    />
                  );
                })}
              </div>
              <div className="px-5 py-3 bg-muted/20">
                <p className="font-label text-xs text-muted-foreground tracking-wider uppercase">Points</p>
              </div>
              <div className="px-5">
                {minorPlanets.map((name) => {
                  const planet = chartData.planets[name];
                  if (!planet) return null;
                  return (
                    <PlanetRow
                      key={name}
                      name={name}
                      planet={planet}
                      meaning={interpretation.personalPlanets?.[name]}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </Chapter>

        <Chapter {...ch(3)} aside={interpretation.mind ? <MindRail s={interpretation.mind} /> : undefined}>
          {interpretation.mind ? <MindBlock s={interpretation.mind} /> : <Writing />}
        </Chapter>

        <Chapter {...ch(4)} aside={interpretation.career ? <CareerRail s={interpretation.career} /> : undefined}>
          {interpretation.career ? <CareerBlock s={interpretation.career} /> : <Writing />}
        </Chapter>

        <Chapter {...ch(5)} aside={interpretation.money ? <MoneyRail s={interpretation.money} /> : undefined}>
          {interpretation.money ? <MoneyBlock s={interpretation.money} /> : <Writing />}
        </Chapter>

        <Chapter {...ch(6)} aside={interpretation.relationships ? <RelationshipsRail s={interpretation.relationships} /> : undefined}>
          {interpretation.relationships ? <RelationshipsBlock s={interpretation.relationships} /> : <Writing />}
        </Chapter>

        <Chapter {...ch(7)} aside={interpretation.family ? <FamilyRail s={interpretation.family} /> : undefined}>
          {interpretation.family ? <FamilyBlock s={interpretation.family} /> : <Writing />}
        </Chapter>

        <Chapter {...ch(8)}>
          {interpretation.superpowers ? <SuperpowersBlock s={interpretation.superpowers} /> : <Writing />}
        </Chapter>

        <Chapter {...ch(9)}>
          {interpretation.discoveries ? <DiscoveriesBlock s={interpretation.discoveries} /> : <Writing />}
        </Chapter>

        <Chapter {...ch(10)} aside={<NodalAxis chartData={chartData} />}>
          {interpretation.path ? <PathBlock s={interpretation.path} /> : <Writing />}
        </Chapter>

        <Chapter {...ch(11)}>
          {interpretation.focus ? <DawnClosing s={interpretation.focus} /> : <Writing />}
        </Chapter>

        <div className="rp-chapter">
          <MethodologyStrip meta={interpretation.meta} />
        </div>
      </main>
    </div>
    </WorkbookProvider>
  );
}
