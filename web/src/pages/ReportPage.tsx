import { useState, type CSSProperties } from "react";
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
import { ReportSky } from "@/components/report/ReportSky";
import { Chapter } from "@/components/report/Chapter";
import { ChapterRail } from "@/components/report/ChapterRail";
import { HouseCard } from "@/components/report/HouseCard";
import { HouseGrid, planetsByHouse } from "@/components/report/HouseGrid";
import { MethodologyStrip } from "@/components/report/MethodologyStrip";
import { chapterAccent, ELEMENT_HEX } from "@/lib/chapter-accent";

const CHAPTERS = [
  { eyebrow: "Overview", title: "Chart Overview" },
  { eyebrow: "Chart", title: "Natal Chart" },
  { eyebrow: "Elements", title: "Elemental Profile" },
  { eyebrow: "Triad", title: "Core Triad" },
  { eyebrow: "Mind", title: "Mind & Communication" },
  { eyebrow: "Work", title: "Career & Calling" },
  { eyebrow: "Resources", title: "Money & Resources" },
  { eyebrow: "Relationships", title: "Relationships & Intimacy" },
  { eyebrow: "Roots", title: "Family & Roots" },
  { eyebrow: "Self-Knowledge", title: "Superpowers, Chronic Patterns & Growing Edges" },
  { eyebrow: "Paradoxes", title: "Key Paradoxes & Discoveries" },
  { eyebrow: "Focus", title: "What to Focus On" },
];
const TOTAL = CHAPTERS.length;
const OPENING_ACCENT = "#5C6BC0";

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

function Bar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="rp-lab capitalize" style={{ color }}>{label}</span>
        <span className="font-numeric text-xs" style={{ color: "var(--muted)" }}>{count} / {total}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.07)" }}>
        <div className="h-full rounded-full" style={{ width: `${(count / total) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [active, setActive] = useState(-1);

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
  const angles = interpretation.angleMeanings;

  const accent = active < 0 ? OPENING_ACCENT : chapterAccent(active + 1, asc.absoluteDegree);
  const onHero = active < 0;
  const ch = (n: number) => ({ number: n, total: TOTAL, ...CHAPTERS[n - 1] });

  return (
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

      <ChapterRail chapters={CHAPTERS} active={active} onActive={setActive} />

      <main className="rp-body pb-20">
        <Chapter {...ch(1)} lede={interpretation.overview.headline}>
          <OverviewBlock s={interpretation.overview} />
        </Chapter>

        <Chapter {...ch(2)}>
          <div className="rp-wheelbox">
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

        <Chapter {...ch(3)}>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rp-box" style={{ marginTop: 0, maxWidth: "none" }}>
              <span className="rp-lab block mb-4">Elements</span>
              <div className="space-y-3">
                {Object.entries(chartData.elements).map(([el, count]) => (
                  <Bar key={el} label={el} count={count} total={totalPlanets} color={ELEMENT_HEX[el] ?? "var(--accent)"} />
                ))}
              </div>
            </div>
            <div className="rp-box" style={{ marginTop: 0, maxWidth: "none" }}>
              <span className="rp-lab block mb-4">Modalities</span>
              <div className="space-y-3">
                {Object.entries(chartData.modalities).map(([mod, count]) => (
                  <Bar key={mod} label={mod} count={count} total={totalPlanets} color="var(--accent)" />
                ))}
              </div>
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--line-soft)" }}>
                <div className="flex justify-between font-numeric text-xs">
                  <span style={{ color: "var(--muted)" }}>Dominant</span>
                  <span className="capitalize" style={{ color: "var(--paper-dim)" }}>
                    {chartData.dominance.dominantElement} · {chartData.dominance.dominantModality}
                  </span>
                </div>
                {chartData.chartShape && (
                  <div className="flex justify-between font-numeric text-xs mt-1.5">
                    <span style={{ color: "var(--muted)" }}>Chart shape</span>
                    <span className="capitalize" style={{ color: "var(--paper-dim)" }}>{chartData.chartShape}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Chapter>

        <Chapter {...ch(4)}>
          <TriadBlock s={interpretation.triad} />
        </Chapter>

        <Chapter {...ch(5)}>
          <MindBlock s={interpretation.mind} />
        </Chapter>

        <Chapter {...ch(6)}>
          <CareerBlock s={interpretation.career} />
        </Chapter>

        <Chapter {...ch(7)}>
          <MoneyBlock s={interpretation.money} />
        </Chapter>

        <Chapter {...ch(8)}>
          <RelationshipsBlock s={interpretation.relationships} />
        </Chapter>

        <Chapter {...ch(9)}>
          <FamilyBlock s={interpretation.family} />
        </Chapter>

        <Chapter {...ch(10)}>
          <SuperpowersBlock s={interpretation.superpowers} />
        </Chapter>

        <Chapter {...ch(11)}>
          <DiscoveriesBlock s={interpretation.discoveries} />
        </Chapter>

        <Chapter {...ch(12)}>
          <FocusBlock s={interpretation.focus} />
        </Chapter>

        <div className="rp-chapter">
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
            <p className="text-muted-foreground text-xs">Use your browser's Save as PDF option</p>
          </div>
        </div>
      </main>
    </div>
  );
}
