import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Download, ChevronDown, AlertTriangle, Sparkles, User, TrendingUp, Heart, Compass, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";
import { BirthLocationHorizon } from "@/components/BirthLocationHorizon";
import { useGetReport, getGetReportQueryKey, useRegenerateReport, type ReportInterpretationAngleMeaningsAscendant, type ReportInterpretationAngleMeaningsMidheaven } from "@workspace/api-client-react";
import RadialOrbitalNatal from "@/components/ui/radial-orbital-natal";
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
  FamilyBlock, SuperpowersBlock, DiscoveriesBlock, FocusBlock, HouseSystemNote, HouseSystemExplainer,
} from "@/components/ReportSections";
import { AspectChip } from "@/components/AspectChip";
import sunImg from "@/assets/planets/sun.webp";
import moonImg from "@/assets/planets/moon.webp";
import mercuryImg from "@/assets/planets/mercury.webp";
import venusImg from "@/assets/planets/venus.webp";
import marsImg from "@/assets/planets/mars.webp";
import jupiterImg from "@/assets/planets/jupiter.webp";
import saturnImg from "@/assets/planets/saturn.webp";
import uranusImg from "@/assets/planets/uranus.webp";
import neptuneImg from "@/assets/planets/neptune.webp";
import plutoImg from "@/assets/planets/pluto.webp";

const PLANET_IMAGES: Record<string, string> = {
  sun: sunImg,
  moon: moonImg,
  mercury: mercuryImg,
  venus: venusImg,
  mars: marsImg,
  jupiter: jupiterImg,
  saturn: saturnImg,
  uranus: uranusImg,
  neptune: neptuneImg,
  pluto: plutoImg,
};

const ELEMENT_COLORS: Record<string, string> = {
  fire: "text-orange-400",
  earth: "text-green-400",
  air: "text-sky-400",
  water: "text-blue-400",
};

const ELEMENT_BG: Record<string, string> = {
  fire: "bg-orange-400/15 border-orange-400/30",
  earth: "bg-green-400/15 border-green-400/30",
  air: "bg-sky-400/15 border-sky-400/30",
  water: "bg-blue-400/15 border-blue-400/30",
};

const HOUSE_REFERENCE: { numeral: string; theme: string; tagline: string; description: string }[] = [
  {
    numeral: "I",
    theme: "Self & Identity",
    tagline: "How you show up before anyone knows you.",
    description: "The First House shapes your outer personality — the first impression you make and the mask you wear before people know you deeply. It governs your physical appearance, your instinctive reactions, and the energy you lead with. Planets here colour every room you walk into.",
  },
  {
    numeral: "II",
    theme: "Values & Assets",
    tagline: "What you own, earn, and hold dear.",
    description: "The Second House rules your relationship with money, possessions, and self-worth. It describes how you earn, what you value, and the security you seek in the material world. Planets here reveal whether abundance comes easily or requires deliberate cultivation.",
  },
  {
    numeral: "III",
    theme: "Mind & Learning",
    tagline: "How you think, speak, and connect nearby.",
    description: "The Third House governs your everyday mind — curiosity, communication, and short journeys. It covers siblings, neighbours, early schooling, and the way you process and share information. Planets here shape your voice and the texture of your local world.",
  },
  {
    numeral: "IV",
    theme: "Home & Roots",
    tagline: "Where you come from and what feels like home.",
    description: "The Fourth House is the foundation of your chart — family of origin, ancestral patterns, and the private self you retreat to. It rules your home environment and the emotional bedrock you build your life upon. Planets here echo through childhood and inner security.",
  },
  {
    numeral: "V",
    theme: "Creativity & Joy",
    tagline: "Where you play, create, and fall in love.",
    description: "The Fifth House is the domain of self-expression, pleasure, and romance. It governs creative projects, children, passionate affairs, and the pure joy of play. Planets here describe what lights you up and how you pour yourself into the things you love.",
  },
  {
    numeral: "VI",
    theme: "Service & Health",
    tagline: "How you work, serve, and tend your body.",
    description: "The Sixth House covers daily routines, physical wellbeing, and the work you do in service of others. It governs habits, diet, craft, and the satisfaction of useful labour. Planets here reveal where discipline thrives and where the body speaks loudest.",
  },
  {
    numeral: "VII",
    theme: "Partnerships",
    tagline: "Who you seek and what you mirror in others.",
    description: "The Seventh House rules committed partnerships — romantic and professional. It shows what you project onto others and what qualities you need in a close ally. Planets here describe both your ideal partner and the mirror that relationships hold up to you.",
  },
  {
    numeral: "VIII",
    theme: "Transformation",
    tagline: "Where you meet depth, loss, and rebirth.",
    description: "The Eighth House governs the deepest passages of life — shared resources, intimacy, death, and regeneration. It rules what is hidden, taboo, or transformative. Planets here push you through the fires of change and reveal what endures on the other side.",
  },
  {
    numeral: "IX",
    theme: "Beliefs & Philosophy",
    tagline: "How you seek meaning and expand your world.",
    description: "The Ninth House is the realm of higher learning, long journeys, and the philosophies that give your life meaning. It covers religion, ethics, foreign cultures, and the hunger for a bigger picture. Planets here shape your worldview and your need for horizons.",
  },
  {
    numeral: "X",
    theme: "Career & Status",
    tagline: "How the world sees your achievements.",
    description: "The Tenth House sits at the very top of your chart and rules public reputation, career, and legacy. It shows the role you grow into and how society recognises your contribution. Planets here leave a visible mark on your ambitions and your standing in the world.",
  },
  {
    numeral: "XI",
    theme: "Community",
    tagline: "Your tribe, your vision, your collective purpose.",
    description: "The Eleventh House governs friendships, social networks, and long-range hopes. It describes the groups you belong to and the ideals that draw you toward collective action. Planets here reveal how you connect with like-minded people and the future you are working to build.",
  },
  {
    numeral: "XII",
    theme: "Subconscious",
    tagline: "What hides in the shadows, awaiting integration.",
    description: "The Twelfth House is the most interior zone of the chart — the realm of dreams, the unconscious, and what we keep hidden even from ourselves. It governs solitude, spiritual retreat, and old wounds seeking healing. Planets here operate quietly but shape your life from beneath the surface.",
  },
];

function HouseReferenceGuide({ planetsByHouse }: { planetsByHouse: Record<number, string[]> }) {
  const [expandedHouses, setExpandedHouses] = useState<Set<number>>(new Set());

  function toggleHouse(num: number) {
    setExpandedHouses((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        next.add(num);
      }
      return next;
    });
  }

  return (
    <div className="mt-5 rounded-xl border border-border/60 bg-card/40 p-6 sm:p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-border/40" />
        <p className="font-label text-xs tracking-[0.22em] uppercase text-primary/70">
          House Reference Guide
        </p>
        <div className="flex-1 h-px bg-border/40" />
      </div>
      {HOUSE_REFERENCE.some((_, i) => (planetsByHouse[i + 1] ?? []).length === 0) && (
        <p className="text-sm leading-relaxed text-muted-foreground mb-5">
          Your energy is focused in a few key life areas. Other areas are still active, just less emphasized and operate more quietly in the background. Think of your life like 12 rooms. Some rooms are busy and full, others are quiet — but you still use all of them.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {HOUSE_REFERENCE.map((h, i) => {
          const houseNum = i + 1;
          const occupants = planetsByHouse[houseNum] ?? [];
          const isPopulated = occupants.length > 0;
          const isExpanded = expandedHouses.has(houseNum);

          return (
            <div
              key={h.numeral}
              className={
                isPopulated
                  ? "rounded-lg border border-primary/40 bg-primary/5"
                  : "rounded-lg border border-border/40 bg-card/20"
              }
            >
              <button
                onClick={() => toggleHouse(houseNum)}
                className="w-full text-left p-4 flex items-start gap-3"
                aria-expanded={isExpanded}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-label text-[10px] tracking-[0.18em] uppercase ${
                        isPopulated ? "text-primary/80" : "text-muted-foreground"
                      }`}
                    >
                      House {h.numeral}
                    </span>
                    {isPopulated ? (
                      <span className="inline-flex items-center rounded-full bg-primary/15 border border-primary/30 px-1.5 py-px font-label text-[9px] tracking-[0.12em] uppercase text-primary/80">
                        {occupants.length} {occupants.length === 1 ? "planet" : "planets"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-muted/30 border border-border/30 px-1.5 py-px font-label text-[9px] tracking-[0.12em] uppercase text-muted-foreground/60">
                        Quiet
                      </span>
                    )}
                  </div>
                  <p
                    className={`font-display text-base leading-tight mb-0.5 ${
                      isPopulated ? "text-foreground" : "text-foreground/70"
                    }`}
                  >
                    {h.theme}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground/80">
                    {h.tagline}
                  </p>
                </div>
                <ChevronDown
                  className={`shrink-0 mt-0.5 w-4 h-4 text-muted-foreground/60 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
                  <p className="text-sm leading-relaxed text-foreground/75">
                    {h.description}
                  </p>
                  {isPopulated && (
                    <div className="flex flex-wrap gap-3">
                      {occupants.map((name) => {
                        const img = PLANET_IMAGES[name];
                        if (!img) return null;
                        const label = PLANET_LABELS[name] ?? name;
                        return (
                          <div key={name} className="flex items-center gap-1.5">
                            <img
                              src={img}
                              alt={label}
                              className="w-[18px] h-[18px] rounded-full object-cover shrink-0"
                            />
                            <span className="font-label text-[10px] tracking-[0.12em] uppercase text-foreground/70">
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Section({ title, label, children }: { title: string; label: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      className="mb-12 print-section"
    >
      <div className="mb-5">
        <p className="font-label text-xs tracking-[0.18em] uppercase text-primary/70 mb-1">{label}</p>
        <h2 className="font-display text-2xl font-light">{title}</h2>
      </div>
      {children}
    </motion.section>
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
        <span className="font-display text-base font-medium flex-1">
          {planet.degree.toFixed(1)}° {planet.sign}
        </span>
        <span className="font-label text-xs text-muted-foreground">H{planet.house}</span>
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

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [chartTab, setChartTab] = useState<"wheel" | "table">("wheel");

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

  const HOUSE_GUIDE_EXCLUDED = new Set(["chiron", "north_node", "south_node"]);
  const planetsByHouse: Record<number, string[]> = {};
  for (const [name, planet] of Object.entries(chartData.planets)) {
    if (!planet || typeof planet.house !== "number") continue;
    if (HOUSE_GUIDE_EXCLUDED.has(name)) continue;
    (planetsByHouse[planet.house] ??= []).push(name);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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

      <main className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-3">Natal Chart Report</p>
          <h1 className="font-display text-4xl md:text-5xl font-light leading-tight mb-2">
            {report.name}
          </h1>
          <p className="text-muted-foreground font-label text-sm">
            {new Date(report.birthDate + "T12:00:00").toLocaleDateString("en-GB", {
              year: "numeric", month: "long", day: "numeric",
            })} · {report.birthTime} · {report.birthPlace}
          </p>
          <HouseSystemNote />
        </motion.div>

        {/* 01 — Chart Overview */}
        <Section title="Chart Overview" label="01 — Overview">
          <OverviewBlock s={interpretation.overview} />
        </Section>


        {/* Natal Chart — single combined section with a Wheel / Table tab
            toggle. The wheel view shows the radial chart plus the house
            reference grid folded directly underneath; the table view shows
            the planetary placements list and angle detail cards. Personal-
            planet detail cards are kept print-only so the print PDF still
            includes the full applied interpretation alongside the wheel. */}
        <Section title="Natal Chart" label="02 — Chart">
          {/* Tab toggle — hidden in print; print always renders both views
              stacked so PDF readers see the same content. */}
          <div className="no-print mb-5 inline-flex rounded-full border border-border/60 bg-card/40 p-1">
            <button
              type="button"
              onClick={() => setChartTab("wheel")}
              className={`px-4 py-1.5 rounded-full font-label text-xs tracking-[0.18em] uppercase transition-colors ${
                chartTab === "wheel"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={chartTab === "wheel"}
            >
              Wheel
            </button>
            <button
              type="button"
              onClick={() => setChartTab("table")}
              className={`hidden px-4 py-1.5 rounded-full font-label text-xs tracking-[0.18em] uppercase transition-colors ${
                chartTab === "table"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={chartTab === "table"}
            >
              Table
            </button>
          </div>

          {/* Wheel view */}
          <div className={chartTab === "wheel" ? "block" : "hidden print:block"}>
            <div className="rounded-xl border border-border/60 bg-card/40 p-2 sm:p-4">
              <RadialOrbitalNatal
                chartData={chartData}
                interpretation={interpretation}
                userName={report.name}
                archetypeName={interpretation.overview.headline}
              />
              <div className="mt-2 grid grid-cols-3 gap-2 text-center pt-4 border-t border-border/30">
                <div>
                  <p className="font-label text-xs text-muted-foreground mb-1">Sun</p>
                  <p className="font-display text-sm">
                    {chartData.planets.sun?.degree.toFixed(0)}° {chartData.planets.sun?.sign}
                  </p>
                </div>
                <div>
                  <p className="font-label text-xs text-muted-foreground mb-1">Moon</p>
                  <p className="font-display text-sm">
                    {chartData.planets.moon?.degree.toFixed(0)}° {chartData.planets.moon?.sign}
                  </p>
                </div>
                <div>
                  <p className="font-label text-xs text-muted-foreground mb-1">Rising</p>
                  <p className="font-display text-sm">
                    {chartData.angles.ascendant.degree.toFixed(0)}° {chartData.angles.ascendant.sign}
                  </p>
                </div>
              </div>
            </div>

            {/* House Reference Guide folded under the wheel */}
            <HouseReferenceGuide planetsByHouse={planetsByHouse} />

            {/* Personal planet detail cards — print-only so the exported PDF
                still carries the full applied interpretation under the wheel
                even when on-screen readers are using the Table tab. */}
            {interpretation?.personalPlanets && (
              <div className="hidden print:block mt-5 space-y-3">
                {(["mercury", "venus", "mars", "jupiter", "saturn"] as const).map((name) => {
                  const text = interpretation.personalPlanets[name];
                  const planet = chartData.planets[name];
                  if (!text || !planet) return null;
                  return (
                    <div
                      key={name}
                      className="p-5 rounded-xl border border-border/60 bg-card/40"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-primary text-base">{PLANET_GLYPHS[name]}</span>
                          <span className="font-display text-base text-foreground">
                            {PLANET_LABELS[name]} in {planet.sign}
                          </span>
                        </div>
                        <span className="font-label text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                          H{planet.house}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/80">
                        {text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Table view */}
          <div className={chartTab === "table" ? "block" : "hidden print:block print:mt-8"}>
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
                      meaning={interpretation?.personalPlanets?.[name]}
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
                      meaning={interpretation?.personalPlanets?.[name]}
                    />
                  );
                })}
              </div>
            </div>

          </div>

          {/* Dedicated Angles section — always visible below the wheel/table.
              Replaces the old in-wheel ASC/MC overlay. Styled to echo the
              House Reference Guide chrome above. */}
          {(() => {
            // Cast to unknown first so we can discriminate between legacy string
            // values (pre-schema-change DB rows) and the new structured object shape.
            const rawAsc = interpretation?.angleMeanings?.ascendant as unknown;
            const rawMc = interpretation?.angleMeanings?.midheaven as unknown;
            const ascSlots = (rawAsc != null && typeof rawAsc === "object")
              ? (rawAsc as ReportInterpretationAngleMeaningsAscendant)
              : null;
            const mcSlots = (rawMc != null && typeof rawMc === "object")
              ? (rawMc as ReportInterpretationAngleMeaningsMidheaven)
              : null;
            const ascLegacy = typeof rawAsc === "string" ? rawAsc : null;
            const mcLegacy = typeof rawMc === "string" ? rawMc : null;
            return (
          <div className="mt-5 rounded-xl border border-border/60 bg-card/40 p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-border/40" />
              <p className="font-label text-xs tracking-[0.22em] uppercase text-primary/70">
                Your Angles
              </p>
              <div className="flex-1 h-px bg-border/40" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Ascendant card */}
              <div
                id="angle-asc"
                aria-label={`Ascendant in ${chartData.angles.ascendant.sign}`}
                className="scroll-mt-24 rounded-lg border border-primary/40 bg-primary/5 p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-label text-[10px] tracking-[0.18em] uppercase text-primary/80">
                    Ascendant
                  </p>
                  <span className="font-label text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
                    {chartData.angles.ascendant.degree.toFixed(1)}° {chartData.angles.ascendant.sign}
                  </span>
                </div>
                <p className="font-display text-base text-foreground mb-4">
                  How you arrive
                </p>
                {ascSlots ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-border/40 bg-background/30 p-3">
                      <p className="font-label text-[9px] tracking-[0.20em] uppercase text-primary/60 mb-1.5">First Impression</p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {ascSlots.firstImpression ?? `Your ${chartData.angles.ascendant.sign} rising is what others encounter before they meet your inner Sun — the instinctive mask you wear into every new room.`}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/40 bg-background/30 p-3">
                      <p className="font-label text-[9px] tracking-[0.20em] uppercase text-primary/60 mb-1.5">How You Orient</p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {ascSlots.orientationStyle ?? `Your chart ruler's sign and house placement colours how you naturally orient yourself when entering unfamiliar territory.`}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/40 bg-background/30 p-3">
                      <p className="font-label text-[9px] tracking-[0.20em] uppercase text-primary/60 mb-1.5">At Your Best</p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {ascSlots.atYourBest ?? `At your best, your ${chartData.angles.ascendant.sign} Ascendant brings a natural ease in first encounters and a clear sense of personal presence.`}
                      </p>
                    </div>
                    <div className="rounded-md border-l-2 border-l-red-500/60 border border-border/40 bg-background/30 p-3">
                      <p className="font-label text-[9px] tracking-[0.20em] uppercase text-red-400/80 mb-1.5">Under Stress</p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {ascSlots.underStress ?? `Under stress, the ${chartData.angles.ascendant.sign} Ascendant may over-project a rehearsed front rather than allowing authentic contact.`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
                    {ascLegacy ?? `How you arrive — your outer manner and the first impression you make on the world. Your ${chartData.angles.ascendant.sign} rising shapes the lens others see you through before they meet your inner Sun.`}
                  </p>
                )}
              </div>
              {/* Midheaven card */}
              <div
                id="angle-mc"
                aria-label={`Midheaven in ${chartData.angles.midheaven.sign}`}
                className="scroll-mt-24 rounded-lg border border-secondary/40 bg-secondary/5 p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-label text-[10px] tracking-[0.18em] uppercase text-secondary/80">
                    Midheaven
                  </p>
                  <span className="font-label text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
                    {chartData.angles.midheaven.degree.toFixed(1)}° {chartData.angles.midheaven.sign}
                  </span>
                </div>
                <p className="font-display text-base text-foreground mb-4">
                  Where you're heading
                </p>
                {mcSlots ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-border/40 bg-background/30 p-3">
                      <p className="font-label text-[9px] tracking-[0.20em] uppercase text-secondary/60 mb-1.5">Public Direction</p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {mcSlots.publicDirection ?? `Your ${chartData.angles.midheaven.sign} Midheaven points to the public face and vocational direction the world will come to associate with you.`}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/40 bg-background/30 p-3">
                      <p className="font-label text-[9px] tracking-[0.20em] uppercase text-secondary/60 mb-1.5">Where You Thrive</p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {mcSlots.whereYouThrive ?? `Your 10th-house ruler's placement points to the environments and fields where your ambition finds its most natural expression.`}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/40 bg-background/30 p-3">
                      <p className="font-label text-[9px] tracking-[0.20em] uppercase text-secondary/60 mb-1.5">At Your Best</p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {mcSlots.atYourBest ?? `At your best, your ${chartData.angles.midheaven.sign} Midheaven channels ambition into work that is both visible and meaningful to others.`}
                      </p>
                    </div>
                    <div className="rounded-md border-l-2 border-l-red-500/60 border border-border/40 bg-background/30 p-3">
                      <p className="font-label text-[9px] tracking-[0.20em] uppercase text-red-400/80 mb-1.5">Under Pressure</p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {mcSlots.underPressure ?? `Under pressure, the ${chartData.angles.midheaven.sign} Midheaven can drive a relentless need for external recognition at the expense of sustainable direction.`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
                    {mcLegacy ?? `Where you're heading — your public role, vocation, and the highest expression of your direction. ${chartData.angles.midheaven.sign} on the Midheaven points to how the world will know your work.`}
                  </p>
                )}
              </div>
            </div>
          </div>
            );
          })()}
        </Section>

        {/* Elemental Profile */}
        <HouseSystemExplainer />

        <Section title="Elemental Profile" label="03 — Elements & Modalities">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border/60 bg-card/40">
              <p className="font-label text-xs text-muted-foreground mb-4 tracking-wider uppercase">Elements</p>
              <div className="space-y-3">
                {Object.entries(chartData.elements).map(([el, count]) => (
                  <div key={el}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-label text-xs capitalize ${ELEMENT_COLORS[el]}`}>{el}</span>
                      <span className="font-label text-xs text-muted-foreground">{count} / {totalPlanets}</span>
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
                      <span className="font-label text-xs text-muted-foreground">{count} / {totalPlanets}</span>
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

        </Section>

        {/* 04 — Core Triad */}
        <Section title="Core Triad" label="04 — Sun, Moon, Rising">
          <TriadBlock s={interpretation.triad} />
        </Section>

        <Section title="Mind & Communication" label="05 — Mind">
          <MindBlock s={interpretation.mind} />
        </Section>

        <Section title="Career & Calling" label="06 — Work">
          <CareerBlock s={interpretation.career} />
        </Section>

        <Section title="Money & Resources" label="07 — Resources">
          <MoneyBlock s={interpretation.money} />
        </Section>

        <Section title="Relationships & Intimacy" label="08 — Relationships">
          <RelationshipsBlock s={interpretation.relationships} />
        </Section>

        <Section title="Family & Roots" label="09 — Roots">
          <FamilyBlock s={interpretation.family} />
        </Section>

        <Section title="Superpowers, Chronic Patterns & Growing Edges" label="10 — Self-Knowledge">
          <SuperpowersBlock s={interpretation.superpowers} />
        </Section>

        <Section title="Key Paradoxes & Discoveries" label="11 — Paradoxes">
          <DiscoveriesBlock s={interpretation.discoveries} />
        </Section>

        <Section title="What to Focus On" label="12 — Focus">
          <FocusBlock s={interpretation.focus} />
        </Section>


        {/* Birth Location & Horizon */}
        <BirthLocationHorizon
          birthPlace={report.birthPlace}
          birthTime={report.birthTime}
          latitude={report.latitude}
          longitude={report.longitude}
          ascendantSign={chartData.angles.ascendant.sign}
          ascendantDegree={chartData.angles.ascendant.degree}
          ascendantAbsoluteDegree={chartData.angles.ascendant.absoluteDegree}
        />

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
