import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import RadialOrbitalTimeline, { type OrbitalItem } from "@/components/ui/radial-orbital-timeline";
import { ELEMENT_HEX } from "@/lib/chapter-accent";
import { HOUSE_NAMES, ORDINALS } from "@/lib/evidence-glossary";
import {
  ELEMENTS,
  ELEMENT_LABELS,
  bodyLabel,
  busiestHouse,
  elementBalance,
  planetsByHouse,
} from "@/lib/natal-glance";
import { PLANET_GLYPHS, SIGN_GLYPHS, type ChartData } from "@/types/chart";
import {
  getGetReportQueryKey,
  useGetReport,
  type ProfileSummary,
  type ReportSummary,
} from "@workspace/api-client-react";

const readable = (status: string | undefined) =>
  status === "complete" || status === "computing" || status === "interpreting" || status === "pending" || status === "revising";

const firstName = (name: string) => name.split(" ")[0];

interface SkyOrbitProps {
  selfProfile: ProfileSummary | null;
  selfReport: ReportSummary | null;
  people: ProfileSummary[];
  reportFor: (profileId: string) => ReportSummary | null;
}

/** The dashboard's sky: you at the centre, everyone you have read in orbit, a quick look on tap. */
export function SkyOrbit({ selfProfile, selfReport, people, reportFor }: SkyOrbitProps) {
  const [, navigate] = useLocation();
  const [activeId, setActiveId] = useState<string | null>(null);

  const items: OrbitalItem[] = useMemo(
    () => people.map((p) => {
      const report = reportFor(p.id);
      return {
        id: p.id,
        label: firstName(p.name),
        glyph: p.sunSign ? SIGN_GLYPHS[p.sunSign] ?? "✦" : "✦",
        muted: !report || !readable(report.status),
        ariaLabel: `${p.name}${p.sunSign ? `, Sun in ${p.sunSign}` : ""}`,
      };
    }),
    [people, reportFor],
  );

  const active = people.find((p) => p.id === activeId) ?? null;

  return (
    <div>
      <RadialOrbitalTimeline
        items={items}
        activeId={activeId}
        onActiveChange={setActiveId}
        center={
          <OrbitCentre
            profile={selfProfile && selfReport ? selfProfile : null}
            onOpen={() => {
              if (selfReport && readable(selfReport.status)) navigate(`/report/${selfReport.id}`);
            }}
            onCreate={() => navigate("/chart?self=1")}
          />
        }
      />

      {people.length === 0 && (
        <div className="flex justify-center -mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/chart")}
            className="font-label font-medium border-border/60 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Put someone in orbit
          </Button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            className="relative mx-auto max-w-md mt-3"
          >
            <span aria-hidden className="absolute -top-5 left-1/2 h-5 w-px bg-primary/50" />
            <QuickLook profile={active} report={reportFor(active.id)} onClose={() => setActiveId(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OrbitCentre({
  profile,
  onOpen,
  onCreate,
}: {
  profile: ProfileSummary | null;
  onOpen: () => void;
  onCreate: () => void;
}) {
  if (!profile) {
    return (
      <button
        type="button"
        onClick={onCreate}
        className="h-28 w-28 rounded-full border border-dashed border-primary/50 bg-background/80 flex flex-col items-center justify-center gap-1 text-center hover:border-primary transition-colors"
      >
        <Plus className="h-5 w-5 text-primary" />
        <span className="font-label text-[11px] leading-tight text-muted-foreground px-3">Your chart goes here</span>
      </button>
    );
  }

  const triad: [string, string | null | undefined][] = [
    ["☉", profile.sunSign],
    ["☽", profile.moonSign],
    ["↑", profile.risingSign],
  ];

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${profile.name}'s report`}
      className="group relative h-28 w-28 sm:h-32 sm:w-32 rounded-full flex flex-col items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      data-testid="orbit-centre"
    >
      <span aria-hidden className="absolute -inset-4 rounded-full bg-primary/20 blur-2xl group-hover:bg-primary/30 transition-colors" />
      <span aria-hidden className="absolute inset-0 rounded-full gradient-primary opacity-90 shadow-[0_0_50px_rgba(92,107,192,0.45)]" />
      <span aria-hidden className="absolute inset-[3px] rounded-full bg-background/60 backdrop-blur-sm" />
      <span className="relative font-display text-lg sm:text-xl leading-tight px-3 truncate max-w-full">
        {firstName(profile.name)}
      </span>
      <span className="relative mt-1 flex items-center gap-1.5 text-[11px] text-foreground/80">
        {triad.filter(([, sign]) => sign).map(([g, sign]) => (
          <span key={g} title={`${g} ${sign}`}>{g}{SIGN_GLYPHS[sign as string]}</span>
        ))}
      </span>
      <span className="relative mt-1 font-label text-[9px] tracking-[0.2em] uppercase text-primary/90 group-hover:text-primary">
        Your report
      </span>
    </button>
  );
}

function QuickLook({
  profile,
  report,
  onClose,
}: {
  profile: ProfileSummary;
  report: ReportSummary | null;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const id = report?.id ?? "";
  const full = useGetReport(id, { query: { queryKey: getGetReportQueryKey(id), enabled: !!report && readable(report.status) } });
  const chart = (full.data?.chartData ?? null) as unknown as ChartData | null;

  return (
    <div className="rounded-2xl border border-primary/25 bg-card/85 backdrop-blur-lg shadow-[0_0_40px_rgba(92,107,192,0.18)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl truncate">{profile.name}</p>
          {report?.archetypeName && (
            <p className="font-display italic text-sm text-primary/80 mt-0.5 line-clamp-2">{report.archetypeName}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-label text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground shrink-0"
        >
          Close
        </button>
      </div>

      <Triad profile={profile} chart={chart} />

      {!report || !readable(report.status) ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {report?.status === "failed" ? "This report did not finish." : "No natal report yet, so no chart to read."}
        </p>
      ) : full.isLoading || !chart ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
        </div>
      ) : (
        <>
          <Elements chart={chart} />
          <Houses chart={chart} />
          {chart.dominance.dominantPlanets.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="font-label text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Loudest</span>
              {chart.dominance.dominantPlanets.slice(0, 3).map((p) => (
                <span key={p} className="px-2 py-0.5 rounded-full border border-primary/25 bg-primary/10 text-xs">
                  {PLANET_GLYPHS[p] ?? ""} {bodyLabel(p)}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {report && readable(report.status) && (
        <Button
          size="sm"
          className="mt-5 w-full gradient-primary text-white border-0 font-label gap-1.5"
          onClick={() => navigate(`/report/${report.id}`)}
        >
          {report.status === "complete" ? "Open the report" : "Read as it writes"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function Triad({ profile, chart }: { profile: ProfileSummary; chart: ChartData | null }) {
  const blind = chart ? !chart.angles : profile.horizon === "unknown";
  const parts = [
    { glyph: "☉", label: "Sun", sign: chart?.planets.sun?.sign ?? profile.sunSign, house: chart?.planets.sun?.house },
    { glyph: "☽", label: "Moon", sign: chart?.planets.moon?.sign ?? profile.moonSign, house: chart?.planets.moon?.house },
    { glyph: "↑", label: "Rising", sign: blind ? null : chart?.angles?.ascendant.sign ?? profile.risingSign, house: undefined },
  ];
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {parts.map((p) => (
        <div key={p.label} className="rounded-xl border border-border/50 bg-background/40 px-2 py-2.5 text-center">
          <p className="font-label text-[10px] uppercase tracking-wider text-muted-foreground">{p.glyph} {p.label}</p>
          {p.sign ? (
            <>
              <p className="mt-1 text-lg leading-none">{SIGN_GLYPHS[p.sign] ?? ""}</p>
              <p className="mt-1 text-xs">{p.sign}</p>
              {p.house && <p className="font-numeric text-[10px] text-muted-foreground">{ORDINALS[p.house - 1]} house</p>}
            </>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
              {p.label === "Rising" && blind ? "Needs a birth time" : "—"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function Elements({ chart }: { chart: ChartData }) {
  const balance = elementBalance(chart);
  if (balance.total === 0) return null;
  const headline = balance.lead
    ? `${ELEMENT_LABELS[balance.lead]} leads, ${balance.counts[balance.lead]} of ${balance.total}`
    : "Spread across the elements";
  const modality = chart.dominance.dominantModality;
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm">{headline}</p>
        {modality && <p className="font-label text-[10px] uppercase tracking-wider text-muted-foreground">{modality}</p>}
      </div>
      <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={
        ELEMENTS.map((e) => `${ELEMENT_LABELS[e]} ${balance.counts[e]}`).join(", ")
      }>
        {ELEMENTS.map((e) => (
          <span
            key={e}
            style={{ width: `${(balance.counts[e] / balance.total) * 100}%`, background: ELEMENT_HEX[e], opacity: balance.lead && balance.lead !== e ? 0.45 : 1 }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-label text-[10px] text-muted-foreground">
        {ELEMENTS.map((e) => (
          <span key={e} className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ELEMENT_HEX[e] }} />
            {ELEMENT_LABELS[e]} <span className="font-numeric">{balance.counts[e]}</span>
          </span>
        ))}
      </div>
      {balance.missing.length > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          No {balance.missing.map((e) => ELEMENT_LABELS[e].toLowerCase()).join(" or ")} at all.
        </p>
      )}
    </div>
  );
}

function Houses({ chart }: { chart: ChartData }) {
  const tally = planetsByHouse(chart);
  if (tally.length === 0) {
    return <p className="mt-4 text-xs text-muted-foreground">Houses need a birth time; this chart is read without them.</p>;
  }
  const busiest = busiestHouse(tally);
  return (
    <div className="mt-4">
      <div className="grid grid-cols-6 gap-1">
        {tally.map((t) => (
          <div
            key={t.house}
            title={`${ORDINALS[t.house - 1]}, ${HOUSE_NAMES[t.house - 1]}`}
            className={`rounded-md border px-1 py-1 min-h-[42px] flex flex-col items-center ${
              t.bodies.length === 0
                ? "border-border/30 text-muted-foreground/40"
                : t.house === busiest?.house
                  ? "border-primary/60 bg-primary/15"
                  : "border-border/60 bg-background/40"
            }`}
          >
            <span className="font-numeric text-[9px] text-muted-foreground">{t.house}</span>
            <span className="text-[11px] leading-tight text-center break-all">
              {t.bodies.map((b) => PLANET_GLYPHS[b]).join("")}
            </span>
          </div>
        ))}
      </div>
      {busiest && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="text-foreground">{ORDINALS[busiest.house - 1]} house</span>, {HOUSE_NAMES[busiest.house - 1].toLowerCase()}:{" "}
          {busiest.bodies.map(bodyLabel).join(", ")}
        </p>
      )}
    </div>
  );
}
