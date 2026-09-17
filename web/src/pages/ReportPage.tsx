import { useParams, useLocation } from "wouter";
import { ArrowLeft, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";
import { BirthLocationHorizon } from "@/components/BirthLocationHorizon";
import { useGetReport, getGetReportQueryKey, useRegenerateReport } from "@workspace/api-client-react";
import { NatalWheel } from "@/components/chart/NatalWheel";
import { houseSign } from "@/components/chart/wheel-geometry";
import LoadingState from "@/components/LoadingState";
import {
  PLANET_GLYPHS,
  PLANET_LABELS,
  isV3Interpretation,
  type ChartData,
  type ChartPlanet,
} from "@/types/chart";
import {
  OverviewBlock, TriadBlock, MindBlock, CareerBlock, MoneyBlock, RelationshipsBlock,
  FamilyBlock, SuperpowersBlock, DiscoveriesBlock, FocusBlock,
} from "@/components/ReportSections";
import { ReportHero } from "@/components/report/ReportHero";
import { Chapter } from "@/components/report/Chapter";
import { Starfield } from "@/components/report/Starfield";
import { HouseCard } from "@/components/report/HouseCard";
import { HouseGrid, planetsByHouse } from "@/components/report/HouseGrid";
import { MethodologyStrip } from "@/components/report/MethodologyStrip";
import { chapterAccent } from "@/lib/chapter-accent";

const ELEMENT_COLORS: Record<string, string> = {
  fire: "text-orange-400",
  earth: "text-green-400",
  air: "text-sky-400",
  water: "text-blue-400",
};

const TOTAL_CHAPTERS = 12;

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

/** Angle detail. Only slots the report actually generated are shown (ADR-18). */
function AngleCard({
  kicker,
  tone,
  sign,
  degree,
  slots,
}: {
  kicker: string;
  tone: "primary" | "secondary";
  sign: string;
  degree: number;
  slots: { label: string; text?: string; stress?: boolean }[];
}) {
  const shown = slots.filter((s) => !!s.text);
  if (shown.length === 0) return null;
  const ring = tone === "primary" ? "border-primary/40 bg-primary/5" : "border-secondary/40 bg-secondary/5";
  const kickerTone = tone === "primary" ? "text-primary/80" : "text-secondary/80";
  return (
    <div className={`rounded-lg border p-5 ${ring}`}>
      <div className="flex items-center justify-between mb-4">
        <p className={`font-label text-[10px] tracking-[0.18em] uppercase ${kickerTone}`}>{kicker}</p>
        <span className="font-numeric text-[11px] text-muted-foreground">
          {degree.toFixed(1)}° {sign}
        </span>
      </div>
      <div className="space-y-3">
        {shown.map((s) => (
          <div
            key={s.label}
            className={`rounded-md border border-border/40 bg-background/30 p-3 ${
              s.stress ? "border-l-2 border-l-red-500/60" : ""
            }`}
          >
            <p className={`font-label text-[9px] tracking-[0.20em] uppercase mb-1.5 ${
              s.stress ? "text-red-400/80" : kickerTone
            }`}>
              {s.label}
            </p>
            <p className="text-sm leading-relaxed text-foreground/85">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const regenerate = useRegenerateReport();
  const { data: report, isLoading, isError } = useGetReport(id!, {
    query: { enabled: !!id, queryKey: getGetReportQueryKey(id!) },
  });

  const handlePrint = () => window.print();

  if (isLoading) return <LoadingState label="Loading your report…" />;

  if (isError || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Report not found.</p>
          <Button onClick={() => navigate("/chart")} variant="outline">Start over</Button>
        </div>
      </div>
    );
  }

  if (report.status !== "complete") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">This report is still generating.</p>
          <Button onClick={() => navigate(`/generating/${id}`)} variant="outline">Check status</Button>
        </div>
      </div>
    );
  }

  const chartData = report.chartData as unknown as ChartData;
  if (!isV3Interpretation(report.interpretation)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
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
        </div>
      </div>
    );
  }
  const interpretation = report.interpretation;

  const mainPlanets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  const minorPlanets = ["chiron", "north_node", "south_node"];
  const totalPlanets = Object.values(chartData.elements).reduce((a, b) => a + b, 0);
  const occupants = planetsByHouse(chartData);
  const asc = chartData.angles.ascendant;
  const mc = chartData.angles.midheaven;
  const angles = interpretation.angleMeanings;

  const accent = (index: number) =>
    chapterAccent(chartData.dominance?.dominantElement, index - 1, TOTAL_CHAPTERS);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Starfield />

      {/* Nav — hidden when printing */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-md no-print">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-sm font-label"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="font-label text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </Button>
            <AccountMenu />
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-20">
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

        <Chapter number={1} total={TOTAL_CHAPTERS} eyebrow="Overview" title="Chart Overview" accent={accent(1)} ghost="☉" wide>
          <OverviewBlock s={interpretation.overview} />
        </Chapter>

        <Chapter number={2} total={TOTAL_CHAPTERS} eyebrow="Chart" title="Natal Chart" accent={accent(2)} ghost="✧" wide>
          <div className="rounded-xl border border-border/60 bg-card/40 p-2 sm:p-4">
            <NatalWheel
              chartData={chartData}
              orbs={interpretation.meta.orbs}
              renderHouse={(house) => (
                <HouseCard
                  house={house}
                  sign={houseSign(house, asc.absoluteDegree)}
                  occupants={occupants[house] ?? []}
                  personalPlanets={interpretation.personalPlanets}
                  angleMeanings={angles}
                  open
                />
              )}
            />
          </div>

          <div className="mt-6">
            <HouseGrid
              chartData={chartData}
              personalPlanets={interpretation.personalPlanets}
              angleMeanings={angles}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <AngleCard
              kicker="Ascendant"
              tone="primary"
              sign={asc.sign}
              degree={asc.degree}
              slots={[
                { label: "First Impression", text: angles?.ascendant?.firstImpression },
                { label: "How You Orient", text: angles?.ascendant?.orientationStyle },
                { label: "At Your Best", text: angles?.ascendant?.atYourBest },
                { label: "Under Stress", text: angles?.ascendant?.underStress, stress: true },
              ]}
            />
            <AngleCard
              kicker="Midheaven"
              tone="secondary"
              sign={mc.sign}
              degree={mc.degree}
              slots={[
                { label: "Public Direction", text: angles?.midheaven?.publicDirection },
                { label: "Where You Thrive", text: angles?.midheaven?.whereYouThrive },
                { label: "At Your Best", text: angles?.midheaven?.atYourBest },
                { label: "Under Pressure", text: angles?.midheaven?.underPressure, stress: true },
              ]}
            />
          </div>

          {/* Personal planet detail cards — print-only, so the exported PDF
              carries the applied interpretation under the wheel. */}
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

        <Chapter number={3} total={TOTAL_CHAPTERS} eyebrow="Elements" title="Elemental Profile" accent={accent(3)} ghost="△" wide>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border/60 bg-card/40">
              <p className="font-label text-xs text-muted-foreground mb-4 tracking-wider uppercase">Elements</p>
              <div className="space-y-3">
                {Object.entries(chartData.elements).map(([el, count]) => (
                  <div key={el}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-label text-xs capitalize ${ELEMENT_COLORS[el]}`}>{el}</span>
                      <span className="font-numeric text-xs text-muted-foreground">{count} / {totalPlanets}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${el === "fire" ? "bg-orange-400" : el === "earth" ? "bg-green-400" : el === "air" ? "bg-sky-400" : "bg-blue-400"}`}
                        style={{ width: `${(count / totalPlanets) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 rounded-xl border border-border/60 bg-card/40">
              <p className="font-label text-xs text-muted-foreground mb-4 tracking-wider uppercase">Modalities</p>
              <div className="space-y-3">
                {Object.entries(chartData.modalities).map(([mod, count]) => (
                  <div key={mod}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-label text-xs capitalize text-secondary/80">{mod}</span>
                      <span className="font-numeric text-xs text-muted-foreground">{count} / {totalPlanets}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-secondary"
                        style={{ width: `${(count / totalPlanets) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border/30">
                <div className="flex justify-between text-xs font-label">
                  <span className="text-muted-foreground">Dominant</span>
                  <span className="capitalize text-foreground/80">
                    {chartData.dominance.dominantElement} · {chartData.dominance.dominantModality}
                  </span>
                </div>
                {chartData.chartShape && (
                  <div className="flex justify-between text-xs font-label mt-1.5">
                    <span className="text-muted-foreground">Chart Shape</span>
                    <span className="capitalize text-foreground/80">{chartData.chartShape}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Chapter>

        <Chapter number={4} total={TOTAL_CHAPTERS} eyebrow="Triad" title="Core Triad" accent={accent(4)} ghost="☽" wide>
          <TriadBlock s={interpretation.triad} />
        </Chapter>

        <Chapter number={5} total={TOTAL_CHAPTERS} eyebrow="Mind" title="Mind & Communication" accent={accent(5)} ghost="☿">
          <MindBlock s={interpretation.mind} />
        </Chapter>

        <Chapter number={6} total={TOTAL_CHAPTERS} eyebrow="Work" title="Career & Calling" accent={accent(6)} ghost="♄">
          <CareerBlock s={interpretation.career} />
        </Chapter>

        <Chapter number={7} total={TOTAL_CHAPTERS} eyebrow="Resources" title="Money & Resources" accent={accent(7)} ghost="♀">
          <MoneyBlock s={interpretation.money} />
        </Chapter>

        <Chapter number={8} total={TOTAL_CHAPTERS} eyebrow="Relationships" title="Relationships & Intimacy" accent={accent(8)} ghost="♁">
          <RelationshipsBlock s={interpretation.relationships} />
        </Chapter>

        <Chapter number={9} total={TOTAL_CHAPTERS} eyebrow="Roots" title="Family & Roots" accent={accent(9)} ghost="♆">
          <FamilyBlock s={interpretation.family} />
        </Chapter>

        <Chapter number={10} total={TOTAL_CHAPTERS} eyebrow="Self-Knowledge" title="Superpowers, Chronic Patterns & Growing Edges" accent={accent(10)} ghost="♃" wide>
          <SuperpowersBlock s={interpretation.superpowers} />
        </Chapter>

        <Chapter number={11} total={TOTAL_CHAPTERS} eyebrow="Paradoxes" title="Key Paradoxes & Discoveries" accent={accent(11)} ghost="∞" wide>
          <DiscoveriesBlock s={interpretation.discoveries} />
        </Chapter>

        <Chapter number={12} total={TOTAL_CHAPTERS} eyebrow="Focus" title="What to Focus On" accent={accent(12)} ghost="✦" wide>
          <FocusBlock s={interpretation.focus} />
        </Chapter>

        <BirthLocationHorizon
          birthPlace={report.birthPlace}
          birthTime={report.birthTime}
          latitude={report.latitude}
          longitude={report.longitude}
          ascendantSign={asc.sign}
          ascendantDegree={asc.degree}
          ascendantAbsoluteDegree={asc.absoluteDegree}
        />

        <MethodologyStrip meta={interpretation.meta} />

        {/* Saved state + PDF export */}
        <div className="text-center pt-8 no-print flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-label text-primary/90">
            <Check className="h-4 w-4" />
            Saved to your account
          </div>
          <Button
            onClick={handlePrint}
            size="lg"
            variant="outline"
            className="font-label font-semibold px-8"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Report as PDF
          </Button>
        </div>
        <p className="text-muted-foreground text-xs mt-3 text-center no-print">
          Use your browser's Save as PDF option
        </p>
      </main>
    </div>
  );
}
