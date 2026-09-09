import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Star, BookOpen, Clock, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";
import { Show } from "@clerk/react";
import RadialOrbitalNatal from "@/components/ui/radial-orbital-natal";
import { DEMO_CHART_DATA, DEMO_ARCHETYPE, DEMO_USER_INITIAL, DEMO_INTERPRETATION } from "@/data/demoChart";

const PLANET_SYMBOLS = ["☉", "☽", "☿", "♀", "♂", "♃", "♄", "⛢", "♆", "♇"];

function PlanetOrbit({ symbol, radius, duration, delay, size = "text-base" }: {
  symbol: string; radius: number; duration: number; delay: number; size?: string;
}) {
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{ width: radius * 2, height: radius * 2, marginLeft: -radius, marginTop: -radius }}
      animate={{ rotate: 360 }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    >
      <span className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 ${size} text-primary/70`}>
        {symbol}
      </span>
    </motion.div>
  );
}

const features = [
  {
    icon: Star,
    title: "Precise Natal Chart",
    description: "Planetary positions computed locally with astronomy-engine and whole-sign houses: sun, moon, every planet, the lunar nodes, the angles and a mean-element Chiron. Nothing is guessed by a model.",
  },
  {
    icon: BookOpen,
    title: "Deep Psychological Report",
    description: "Your core triad, mind, career, money, relationships, family, strengths and growing edges. A general language model writes it, prompted with your computed chart and a written doctrine. Nothing is trained on your data.",
  },
  {
    icon: Clock,
    title: "Generated in Minutes",
    description: "No waiting days for a human to write your report. Your full ten-section analysis is ready in minutes.",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description: "Your birth data is yours. We never sell personal data and you can delete your report at any time.",
  },
];

// Mirrors REPORT_SECTIONS in api/src/prompts/index.ts by label, in registry
// order. Generation from the registry is open (MB-8); keep these in sync by hand.
const REPORT_SECTION_LABELS = [
  "Chart Overview",
  "Core Triad",
  "Mind & Communication",
  "Career & Calling",
  "Money & Resources",
  "Relationships & Intimacy",
  "Family & Roots",
  "Superpowers, Chronic Patterns & Growing Edges",
  "Key Paradoxes & Discoveries",
  "What to Focus On",
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds" },
  { href: "/company", label: "Company" },
];

const samplePlanets = [
  { name: "Sun", sign: "Scorpio", house: 8, degree: "14°" },
  { name: "Moon", sign: "Pisces", house: 12, degree: "29°" },
  { name: "Rising", sign: "Capricorn", house: 1, degree: "7°" },
  { name: "Mercury", sign: "Scorpio", house: 8, degree: "2°" },
  { name: "Venus", sign: "Libra", house: 7, degree: "22°" },
  { name: "Mars", sign: "Leo", house: 6, degree: "11°" },
];

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-display text-lg font-semibold tracking-tight gradient-text">Astra</span>
          <div className="flex items-center gap-2">
            <Show when="signed-in">
              <Button
                onClick={() => navigate("/dashboard")}
                size="sm"
                variant="outline"
                className="font-label font-medium border-border/60"
              >
                Dashboard
              </Button>
            </Show>
            <Button
              onClick={() => navigate("/chart")}
              size="sm"
              className="gradient-primary text-white border-0 font-label font-medium"
            >
              Get Your Chart
            </Button>
            <AccountMenu />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center bg-stars overflow-hidden pt-14">
        {/* Orbital illustration */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <div className="relative" style={{ width: 600, height: 600 }}>
            {/* Rings */}
            {[120, 200, 280, 360].map((r) => (
              <div
                key={r}
                className="absolute left-1/2 top-1/2 chart-ring opacity-20"
                style={{ width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r }}
              />
            ))}
            {/* Planets */}
            <PlanetOrbit symbol="☽" radius={120} duration={12} delay={0} size="text-xl" />
            <PlanetOrbit symbol="☿" radius={200} duration={20} delay={-5} size="text-sm" />
            <PlanetOrbit symbol="♀" radius={200} duration={26} delay={-12} />
            <PlanetOrbit symbol="♂" radius={280} duration={38} delay={-8} />
            <PlanetOrbit symbol="♃" radius={280} duration={52} delay={-20} size="text-xl" />
            <PlanetOrbit symbol="♄" radius={360} duration={70} delay={-30} size="text-lg" />
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-6">Natal Chart Analysis & more</p>
            <h1 className="font-display text-5xl md:text-7xl font-light leading-tight mb-6 glow-text">
              Your stars,<br />
              <em className="gradient-text not-italic">decoded.</em>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed mb-10 max-w-xl mx-auto">Precise astronomy meets deep character analysis.</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={() => navigate("/chart")}
                size="lg"
                className="gradient-primary text-white border-0 font-label font-semibold px-8 py-6 text-base glow-primary hover:opacity-90 transition-opacity"
              >
                Generate Your Report
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <span className="text-muted-foreground text-sm font-label">
                One-time report · €24
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sample preview strip */}
      <section className="border-y border-border/40 bg-card/40 py-8 overflow-hidden">
        <div style={{ display: "flex", animation: "none" }}>
          <div className="flex gap-3 px-6">
            {[...samplePlanets, ...samplePlanets].map((p, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border border-border/40 bg-card text-sm"
              >
                <span className="font-label text-muted-foreground text-xs">{p.name}</span>
                <span className="font-display text-foreground font-medium">{p.degree} {p.sign}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-4">What You Receive</p>
          <h2 className="font-display text-3xl md:text-4xl font-light">More than a horoscope.</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-20">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm"
            >
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-display text-xl font-medium mb-2">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{f.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Wheel showcase */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="rounded-2xl border border-primary/20 bg-card/40 backdrop-blur-sm px-6 py-10 flex flex-col items-center gap-6"
        >
          <div className="text-center">
            <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-2">Included in every report</p>
            <h3 className="font-display text-2xl md:text-3xl font-light">Your interactive natal chart wheel</h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
              Tap any planet to read its full interpretation. Aspects illuminate on selection. Yours will show your real placements.
            </p>
          </div>
          <div className="w-full max-w-[480px]">
            <RadialOrbitalNatal
              chartData={DEMO_CHART_DATA}
              interpretation={DEMO_INTERPRETATION}
              userName={DEMO_USER_INITIAL}
              archetypeName={DEMO_ARCHETYPE}
            />
          </div>
          <p className="font-label text-[11px] tracking-[0.15em] uppercase text-muted-foreground/60 text-center">
            An example chart — Aria Solis, Jun 21 1992, Lisbon
          </p>
          <Button
            onClick={() => navigate("/chart")}
            size="sm"
            className="gradient-primary text-white border-0 font-label font-medium px-6"
          >
            Generate Your Report
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </motion.div>
      </section>

      {/* Report sections preview */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-4">Inside Your Report</p>
          <h2 className="font-display text-3xl md:text-4xl font-light">Ten sections of insight.</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {REPORT_SECTION_LABELS.map((section, i) => (
            <div
              key={section}
              className="px-4 py-3 rounded-lg border border-border/40 bg-card/40 text-center"
            >
              <span className="font-label text-xs text-muted-foreground block mb-1">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm font-medium">{section}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center p-12 rounded-2xl border border-primary/30 bg-card/60 backdrop-blur-sm glow-primary">
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-6" />
          <h2 className="font-display text-3xl md:text-4xl font-light mb-4">
            Ready to meet yourself?
          </h2>
          <p className="text-muted-foreground mb-8">
            Enter your birth details and receive your complete psychological natal chart report in minutes.
          </p>
          <Button
            onClick={() => navigate("/chart")}
            size="lg"
            className="gradient-primary text-white border-0 font-label font-semibold px-10 py-6 text-base"
          >
            Generate Your Report · €24
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-display text-lg gradient-text">Astra</span>
          <nav className="flex items-center gap-4" aria-label="Legal">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-label text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Astra. Powered by astronomy & AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
