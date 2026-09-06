import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Download, ChevronDown, AlertTriangle, Sparkles, User, TrendingUp, Heart, Compass, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";
import { BirthLocationHorizon } from "@/components/BirthLocationHorizon";
import { useGetReport, getGetReportQueryKey, type ReportInterpretationAngleMeaningsAscendant, type ReportInterpretationAngleMeaningsMidheaven } from "@workspace/api-client-react";
import RadialOrbitalNatal from "@/components/ui/radial-orbital-natal";
import LoadingState from "@/components/LoadingState";
import {
  PLANET_GLYPHS,
  PLANET_LABELS,
  isStructuredRelationships,
  isStructuredCareer,
  isStructuredAspectGroup,
  isStructuredFinalSummary,
  type ChartData,
  type ChartPlanet,
  type Interpretation,
  type ThemeCard,
} from "@/types/chart";
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

function ThemeCardGrid({ cards, synthesis }: { cards: ThemeCard[]; synthesis: string }) {
  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        {cards.map((card, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card/40 p-5 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">{card.icon}</span>
              <p className="font-label text-xs tracking-[0.16em] uppercase text-primary/80">
                {card.title}
              </p>
            </div>
            <ul className="space-y-2 flex-1">
              {card.bullets.map((bullet, j) => (
                <li key={j} className="flex gap-2 text-sm leading-snug text-foreground/80">
                  <span className="text-primary/50 mt-[3px] shrink-0">·</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {synthesis && (
        <div className="relative rounded-xl border border-border/40 bg-card/30 px-6 py-5">
          <span
            className="absolute -top-3 left-5 text-4xl leading-none text-primary/20 select-none font-serif"
            aria-hidden
          >
            "
          </span>
          <p className="text-sm leading-relaxed text-foreground/85 italic pl-3">
            {synthesis}
          </p>
        </div>
      )}
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
  const interpretation = report.interpretation as unknown as Interpretation;

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
        </motion.div>

        {/* Key themes */}
        {interpretation?.keyThemes?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2 justify-center mb-12"
          >
            {interpretation.keyThemes.map((theme: string) => (
              <span
                key={theme}
                className="px-3 py-1.5 rounded-full border border-border/60 bg-card/60 text-sm font-label text-muted-foreground"
              >
                {theme}
              </span>
            ))}
          </motion.div>
        )}

        {/* Archetype — restyled with bigger serif & two-column layout */}
        {interpretation?.archetypeName && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="mb-16 print-section"
          >
            <div className="grid lg:grid-cols-[1.55fr_1fr] gap-5">
              {/* Left: Archetype headline + summary */}
              <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8 lg:p-10">
                <p className="font-label text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-6">
                  Archetype Summary
                </p>
                <h2 className="font-display font-light leading-[1.05] tracking-[-0.02em] text-4xl md:text-5xl lg:text-[3.25rem] mb-8 text-foreground">
                  {interpretation.archetypeName}
                </h2>
                {interpretation.archetypeSummary && (
                  <div className="text-foreground/80 text-[15px] leading-[1.7] md:columns-2 md:gap-8 [&>p]:mb-4 [&>p:last-child]:mb-0">
                    {interpretation.archetypeSummary
                      .split("\n\n")
                      .map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                  </div>
                )}
              </div>

              {/* Right: The Core Triad */}
              {interpretation?.coreTriad && (
                <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-7">
                  <p className="font-label text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-5">
                    The Core Triad
                  </p>
                  <div className="space-y-5">
                    {[
                      {
                        glyph: "☉",
                        label: `Sun in ${chartData.planets.sun?.sign}`,
                        text: interpretation.coreTriad.identity,
                      },
                      {
                        glyph: "☽",
                        label: `Moon in ${chartData.planets.moon?.sign}`,
                        text: interpretation.coreTriad.emotionalLife,
                      },
                      {
                        glyph: "↑",
                        label: `${chartData.angles.ascendant.sign} Rising`,
                        text: interpretation.coreTriad.outwardManner,
                      },
                    ].map(({ glyph, label, text }) => {
                      if (!text) return null;
                      const short = text.split(/(?<=[\.\?!])\s+/)[0];
                      return (
                        <div key={label} className="flex gap-3">
                          <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-primary/90 text-sm">
                            {glyph}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-label text-[10px] tracking-[0.18em] uppercase text-primary/75 mb-1">
                              {label}
                            </p>
                            <p className="text-[13px] leading-[1.55] text-foreground/80">
                              {short}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}

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
                archetypeName={interpretation?.archetypeName}
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

          {/* Elements & Modalities — applied interpretation */}
          {interpretation?.elementsModalities && (
            interpretation.elementsModalities.energyStyle ||
            interpretation.elementsModalities.decisionStyle ||
            interpretation.elementsModalities.imbalanceEffect
          ) && (
            <div className="mt-4 p-5 rounded-xl border border-border/60 bg-card/40">
              <p className="font-label text-xs text-muted-foreground mb-4 tracking-wider uppercase">
                What This Balance Means
              </p>
              <div className="space-y-3">
                {interpretation.elementsModalities.energyStyle && (
                  <div>
                    <p className="font-label text-[10px] tracking-[0.18em] uppercase text-primary/75 mb-1">
                      Energy Style
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/85">
                      {interpretation.elementsModalities.energyStyle}
                    </p>
                  </div>
                )}
                {interpretation.elementsModalities.decisionStyle && (
                  <div>
                    <p className="font-label text-[10px] tracking-[0.18em] uppercase text-primary/75 mb-1">
                      Decision Style
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/85">
                      {interpretation.elementsModalities.decisionStyle}
                    </p>
                  </div>
                )}
                {interpretation.elementsModalities.imbalanceEffect && (
                  <div>
                    <p className="font-label text-[10px] tracking-[0.18em] uppercase text-primary/75 mb-1">
                      Imbalance Effect
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/85">
                      {interpretation.elementsModalities.imbalanceEffect}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Section>

        {/* Lunar Nodes — past pattern, growth direction, challenge, integration */}
        {(chartData.planets.north_node || chartData.planets.south_node) && (
          <Section title="Lunar Nodes" label="03b — Nodes">
            <div className="grid md:grid-cols-2 gap-4">
              {/* South Node card — left */}
              {chartData.planets.south_node && (
                <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-5 flex flex-col">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label text-xs text-secondary/80 tracking-wider uppercase flex items-center gap-1.5">
                      <span className="text-base">{PLANET_GLYPHS.south_node}</span> South Node
                    </span>
                    <span className="font-label text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
                      {chartData.planets.south_node.degree.toFixed(1)}° {chartData.planets.south_node.sign} · H{chartData.planets.south_node.house}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Inherited pattern — your familiar default</p>

                  {/* Past Pattern sub-section */}
                  {interpretation?.nodes?.pastPattern && (
                    <div className="border-t border-border/40 pt-4 mt-4">
                      <p className="font-label text-[10px] tracking-wider uppercase text-secondary/75 mb-1.5">
                        <span className="text-xs mr-1">⟲</span> Past Pattern
                      </p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {interpretation.nodes.pastPattern}
                      </p>
                    </div>
                  )}

                  {/* Challenge sub-section */}
                  {interpretation?.nodes?.challenge && (
                    <div className="border-t border-border/40 pt-4 mt-4">
                      <p className="font-label text-[10px] tracking-wider uppercase text-amber-400/80 mb-1.5">
                        <span className="text-xs mr-1">⚠</span> Challenge
                      </p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {interpretation.nodes.challenge}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* North Node card — right */}
              {chartData.planets.north_node && (
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-5 flex flex-col">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label text-xs text-primary/80 tracking-wider uppercase flex items-center gap-1.5">
                      <span className="text-base">{PLANET_GLYPHS.north_node}</span> North Node
                    </span>
                    <span className="font-label text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
                      {chartData.planets.north_node.degree.toFixed(1)}° {chartData.planets.north_node.sign} · H{chartData.planets.north_node.house}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Growth direction — what you're being called toward</p>

                  {/* Growth Direction sub-section */}
                  {interpretation?.nodes?.growthDirection && (
                    <div className="border-t border-border/40 pt-4 mt-4">
                      <p className="font-label text-[10px] tracking-wider uppercase text-primary/75 mb-1.5">
                        <span className="text-xs mr-1">↗</span> Growth Direction
                      </p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {interpretation.nodes.growthDirection}
                      </p>
                    </div>
                  )}

                  {/* Integration sub-section */}
                  {interpretation?.nodes?.integration && (
                    <div className="border-t border-border/40 pt-4 mt-4">
                      <p className="font-label text-[10px] tracking-wider uppercase text-primary/75 mb-1.5">
                        <span className="text-xs mr-1">∞</span> Integration
                      </p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {interpretation.nodes.integration}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Relationships */}
        {interpretation?.relationships && (
          <Section title="Relationships & Intimacy" label="04 — Relationships">
            {isStructuredRelationships(interpretation.relationships) ? (
              <ThemeCardGrid
                cards={interpretation.relationships.cards}
                synthesis={interpretation.relationships.synthesis}
              />
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                {(interpretation.relationships as string).split("\n\n").map((p, i) => (
                  <p key={i} className="text-foreground/85 leading-relaxed mb-4 last:mb-0">{p}</p>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Career */}
        {interpretation?.career && (
          <Section title="Career & Vocation" label="05 — Purpose">
            {isStructuredCareer(interpretation.career) ? (
              <ThemeCardGrid
                cards={interpretation.career.cards}
                synthesis={interpretation.career.synthesis}
              />
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                {(interpretation.career as string).split("\n\n").map((p, i) => (
                  <p key={i} className="text-foreground/85 leading-relaxed mb-4 last:mb-0">{p}</p>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Aspects — stacked dynamic cards */}
        {chartData.aspects?.length > 0 && interpretation?.aspectsDynamic && (
          interpretation.aspectsDynamic.dynamic ||
          interpretation.aspectsDynamic.tension ||
          interpretation.aspectsDynamic.behavior ||
          interpretation.aspectsDynamic.growth
        ) && (
          <Section title="Key Aspects" label="06 — Aspects">
            <p className="text-sm leading-relaxed text-muted-foreground mb-5">
              How the major angles between your planets shape your overall pattern — the dynamics that recur across your chart rather than any single connection in isolation.
            </p>
            <div className="space-y-3">
              {(
                [
                  {
                    key: "dynamic" as const,
                    title: "Dominant Dynamic",
                    badge: "foundation",
                    icon: "◎",
                    border: "border-l-primary/60",
                    cardBorder: "border-primary/20",
                    cardBg: "bg-primary/5",
                    iconBg: "bg-primary/20",
                    iconColor: "text-primary",
                    badgeColor: "text-primary/50",
                    labelColor: "text-primary/70",
                    chipColor: "text-primary border-primary/30 bg-primary/10 hover:bg-primary/20",
                  },
                  {
                    key: "tension" as const,
                    title: "Core Tension",
                    badge: "where it pulls",
                    icon: "⊗",
                    border: "border-l-amber-400/60",
                    cardBorder: "border-amber-400/20",
                    cardBg: "bg-amber-400/5",
                    iconBg: "bg-amber-400/20",
                    iconColor: "text-amber-400",
                    badgeColor: "text-amber-400/50",
                    labelColor: "text-amber-400/70",
                    chipColor: "text-amber-400 border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20",
                  },
                  {
                    key: "behavior" as const,
                    title: "Behavioral Expression",
                    badge: "how it shows up",
                    icon: "⊕",
                    border: "border-l-secondary/60",
                    cardBorder: "border-secondary/20",
                    cardBg: "bg-secondary/5",
                    iconBg: "bg-secondary/20",
                    iconColor: "text-secondary",
                    badgeColor: "text-secondary/50",
                    labelColor: "text-secondary/70",
                    chipColor: "text-secondary border-secondary/30 bg-secondary/10 hover:bg-secondary/20",
                  },
                  {
                    key: "growth" as const,
                    title: "Growth Arc",
                    badge: "the path forward",
                    icon: "↗",
                    border: "border-l-green-400/60",
                    cardBorder: "border-green-400/20",
                    cardBg: "bg-green-400/5",
                    iconBg: "bg-green-400/20",
                    iconColor: "text-green-400",
                    badgeColor: "text-green-400/50",
                    labelColor: "text-green-400/70",
                    chipColor: "text-green-400 border-green-400/30 bg-green-400/10 hover:bg-green-400/20",
                  },
                ] as const
              ).map((card) => {
                const group = interpretation.aspectsDynamic![card.key];
                if (!group) return null;
                const synthesis = isStructuredAspectGroup(group) ? group.synthesis : (group as string);
                const aspectKeys = isStructuredAspectGroup(group) ? group.aspects : [];
                return (
                  <div
                    key={card.key}
                    className={`rounded-xl border ${card.cardBorder} ${card.cardBg} border-l-2 ${card.border} p-5`}
                  >
                    {/* Card header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${card.iconBg} flex items-center justify-center`}>
                        <span className={`text-sm ${card.iconColor}`}>{card.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-label text-xs font-semibold tracking-wider uppercase ${card.iconColor}`}>
                            {card.title}
                          </span>
                          <span className={`font-label text-[10px] tracking-[0.14em] uppercase ${card.badgeColor} border border-current/30 rounded-full px-2 py-0.5`}>
                            {card.badge}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Aspect chips */}
                    {aspectKeys.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4 pl-11">
                        {aspectKeys.map((ak) => (
                          <AspectChip
                            key={ak}
                            aspectKey={ak}
                            meaning={interpretation.aspectMeanings?.[ak]}
                            colorClass={card.chipColor}
                          />
                        ))}
                      </div>
                    )}

                    {/* Synthesis label + prose */}
                    <div className="pl-11">
                      <p className={`font-label text-[9px] tracking-[0.2em] uppercase ${card.labelColor} mb-1.5`}>
                        Synthesis
                      </p>
                      <p className="text-sm leading-relaxed text-foreground/85">{synthesis}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Strengths & Blind Spots */}
        {interpretation?.strengthsAndBlindSpots && (
          <Section title="Strengths & Shadow" label="07 — Self-Knowledge">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
                <p className="font-label text-xs text-primary/70 mb-4 tracking-wider uppercase">Strengths</p>
                <ul className="space-y-3">
                  {interpretation.strengthsAndBlindSpots.strengths.map((s: string, i: number) => {
                    const [label, ...rest] = s.split(":");
                    return (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-primary mt-0.5">✦</span>
                        <span>
                          <strong className="text-foreground">{label.trim()}</strong>
                          {rest.length > 0 && <span className="text-foreground/70">:{rest.join(":")}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="p-5 rounded-xl border border-amber-400/20 bg-amber-400/5">
                <p className="font-label text-xs text-amber-400/70 mb-4 tracking-wider uppercase">Blind Spots</p>
                <ul className="space-y-3">
                  {interpretation.strengthsAndBlindSpots.blindSpots.map((s: string, i: number) => {
                    const [label, ...rest] = s.split(":");
                    return (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-amber-400 mt-0.5">◆</span>
                        <span>
                          <strong className="text-foreground">{label.trim()}</strong>
                          {rest.length > 0 && <span className="text-foreground/70">:{rest.join(":")}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </Section>
        )}

        {/* Final Summary — Section 08 */}
        {interpretation?.finalSummary && (
          <Section title="Closing Integration" label="08 — Summary">
            {isStructuredFinalSummary(interpretation.finalSummary) ? (
              <div className="space-y-4">
                {/* Block 1: Core Identity — archetypeSummary + keyThemes pills */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-primary/80" />
                    </div>
                    <p className="font-label text-xs tracking-[0.18em] uppercase text-primary/80">Core Identity</p>
                  </div>
                  {interpretation.archetypeSummary && (
                    <p className="text-sm leading-relaxed text-foreground/85 mb-4">
                      {interpretation.archetypeSummary}
                    </p>
                  )}
                  {interpretation.keyThemes?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {interpretation.keyThemes.map((theme: string) => (
                        <span
                          key={theme}
                          className="px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs font-label text-primary/80"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Block 2: Core Risk — amber/red accent card */}
                <div className="rounded-xl border border-amber-400/30 border-l-2 border-l-amber-400/70 bg-amber-400/5 p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-amber-400/15 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400/90" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-label text-xs tracking-[0.18em] uppercase text-amber-400/80 mb-2">Core Risk</p>
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {interpretation.finalSummary.coreRisk}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Block 3: Growth Edges — 2×2 grid */}
                {interpretation.finalSummary.growthEdges?.length > 0 && (() => {
                  const GROWTH_ICONS = [TrendingUp, Heart, Compass, Zap];
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <p className="font-label text-xs tracking-[0.18em] uppercase text-muted-foreground">Growth Edges</p>
                        <div className="flex-1 h-px bg-border/30" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {interpretation.finalSummary.growthEdges.slice(0, 4).map((edge, i) => {
                          const Icon = GROWTH_ICONS[i % GROWTH_ICONS.length];
                          return (
                            <div
                              key={i}
                              className="rounded-xl border border-border/60 bg-card/40 p-5 flex gap-3"
                            >
                              <div className="w-7 h-7 rounded-full bg-secondary/15 flex items-center justify-center shrink-0 mt-0.5">
                                <Icon className="w-3.5 h-3.5 text-secondary/80" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-label text-xs tracking-[0.16em] uppercase text-secondary/80 mb-1.5">
                                  {edge.label}
                                </p>
                                <p className="text-sm leading-relaxed text-foreground/80">
                                  {edge.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Block 4: What Makes This Chart Distinctive — green accent */}
                {interpretation.finalSummary.distinctive && (
                  <div className="rounded-xl border border-green-400/30 bg-green-400/5 p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-green-400/15 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-green-400/90" />
                      </div>
                      <p className="font-label text-xs tracking-[0.18em] uppercase text-green-400/80">What Makes This Chart Distinctive</p>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/85 mb-4">
                      {interpretation.finalSummary.distinctive.description}
                    </p>
                    {interpretation.finalSummary.distinctive.pills?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {interpretation.finalSummary.distinctive.pills.map((pill, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-full border border-green-400/30 bg-green-400/10 text-xs font-label text-green-400/80"
                          >
                            {pill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Closing quote — italic serif below all cards */}
                {interpretation.finalSummary.closingQuote && (
                  <div className="pt-2 pb-1 text-center">
                    <p className="font-serif text-base italic text-foreground/60 leading-relaxed max-w-xl mx-auto">
                      {interpretation.finalSummary.closingQuote}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Backward-compat: existing reports with prose string */
              <div className="p-6 rounded-xl border border-secondary/20 bg-secondary/5">
                <div className="prose prose-invert prose-sm max-w-none">
                  {(interpretation.finalSummary as string).split("\n\n").map((p, i) => (
                    <p key={i} className="text-foreground/90 leading-relaxed mb-4 last:mb-0">{p}</p>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

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
