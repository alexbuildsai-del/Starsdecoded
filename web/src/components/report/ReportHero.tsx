/**
 * The opening plate: Sun and Moon as lit renders at their true angles on a thin
 * brass ring, the Ascendant as an open marker because it is a point on the
 * horizon and never a body (ADR-17).
 */
import { useEffect, useState } from "react";
import { PLANET_RENDERS } from "@/lib/planet-renders";
import { ORDINALS } from "@/lib/evidence-glossary";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { opposite, pointAt, theta } from "@/components/chart/wheel-geometry";
import { PLANET_LABELS, type ChartData, type Interpretation } from "@/types/chart";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const BRASS = "hsl(var(--brass))";
const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

function coordinate(value: number, positive: string, negative: string, places: number): string {
  return `${Math.abs(value).toFixed(places)}° ${value >= 0 ? positive : negative}`;
}

export interface ReportHeroProps {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  latitude: number;
  longitude: number;
  chartData: ChartData;
  meta: Interpretation["meta"];
}

export function ReportHero({
  name, birthDate, birthTime, birthPlace, latitude, longitude, chartData, meta,
}: ReportHeroProps) {
  const narrow = useNarrow();
  const reduced = useReducedMotion();
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (reduced) { setOffset(0); return; }
    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setOffset(Math.min(window.scrollY, 600));
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reduced]);

  const asc = chartData.angles.ascendant;
  const sun = chartData.planets.sun;
  const moon = chartData.planets.moon;

  const W = narrow ? 680 : 1000;
  const H = narrow ? 660 : 660;
  const cx = W / 2;
  const cy = narrow ? 330 : 320;
  const R = narrow ? 196 : 200;
  const places = narrow ? 2 : 4;

  const bodies = [
    { key: "sun", planet: sun, size: narrow ? 118 : 140 },
    { key: "moon", planet: moon, size: narrow ? 76 : 88 },
  ].filter((b) => !!b.planet);

  const ascTheta = theta(asc.absoluteDegree, asc.absoluteDegree);
  const ascAt = pointAt(cx, cy, R, ascTheta);
  const ascTickOut = pointAt(cx, cy, R + 22, ascTheta);
  const ascTickIn = pointAt(cx, cy, R - 26, ascTheta);
  const horizonEast = pointAt(cx, cy, R + 58, ascTheta);
  const horizonWest = pointAt(cx, cy, R + 58, theta(opposite(asc.absoluteDegree), asc.absoluteDegree));
  const ascRuler = TRADITIONAL_RULER[asc.sign];

  const dob = new Date(`${birthDate}T00:00:00Z`);
  const legend = [
    sun && { key: "sun", label: "Sun", value: `${sun.degree.toFixed(2)}° ${sun.sign} · ${ORDINALS[sun.house - 1]}` },
    moon && { key: "moon", label: "Moon", value: `${moon.degree.toFixed(2)}° ${moon.sign} · ${ORDINALS[moon.house - 1]}` },
    {
      key: null,
      label: "Rising",
      value: `${asc.degree.toFixed(2)}° ${asc.sign}${ascRuler ? ` · ruled by ${PLANET_LABELS[ascRuler]}` : ""}`,
    },
  ].filter(Boolean) as { key: string | null; label: string; value: string }[];

  function outsideLabel(angle: number, radius: number, kicker: string, value: string) {
    const p = pointAt(cx, cy, radius, angle);
    const right = p.x >= cx;
    const anchor = right ? "start" : "end";
    const dx = right ? 16 : -16;
    return (
      <g>
        <text
          x={p.x + dx} y={p.y - 4} textAnchor={anchor}
          fontFamily="Space Grotesk, sans-serif" fontSize={11} letterSpacing="2.4" fill={BRASS}
        >
          {kicker}
        </text>
        <text
          x={p.x + dx} y={p.y + 16} textAnchor={anchor}
          fontFamily="IBM Plex Mono, monospace" fontSize={14} fill="hsl(var(--foreground) / 0.92)"
        >
          {value}
        </text>
      </g>
    );
  }

  return (
    <header className="relative overflow-hidden rounded-2xl border border-brass/20 bg-card/20 px-4 py-6 sm:px-8 sm:py-10">
      {/* Frame corners. */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 font-numeric text-[11px] text-muted-foreground">
        <div>
          <p className="text-brass/90">DOB · {dob.getUTCDate()} {MONTHS[dob.getUTCMonth()]} {dob.getUTCFullYear()}</p>
          <p>TOB · {birthTime}</p>
        </div>
        <div className="text-right">
          <p className="font-label tracking-[0.2em] uppercase text-brass/80">Stars Decoded</p>
          <p>{meta.houseSystem} · {meta.zodiac}</p>
        </div>
      </div>

      <div style={reduced ? undefined : { transform: `translateY(${offset * -0.05}px)` }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto block w-full h-auto max-w-[64rem]"
          role="img"
          aria-label={`${name}: Sun, Moon and Rising at their true positions`}
        >
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={BRASS} strokeOpacity={0.42} />
          {Array.from({ length: 12 }, (_, i) => i * 30).map((d) => {
            const t = theta(d, asc.absoluteDegree);
            const p1 = pointAt(cx, cy, R, t);
            const p2 = pointAt(cx, cy, R - (d % 90 === 0 ? 13 : 7), t);
            return (
              <line
                key={d} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={BRASS} strokeOpacity={d % 90 === 0 ? 0.5 : 0.26}
              />
            );
          })}

          <line
            x1={horizonEast.x} y1={horizonEast.y} x2={horizonWest.x} y2={horizonWest.y}
            stroke={BRASS} strokeOpacity={0.35} strokeDasharray="2 5"
          />

          {bodies.map((b) => {
            const t = theta(b.planet.absoluteDegree, asc.absoluteDegree);
            const p = pointAt(cx, cy, R, t);
            const inner = pointAt(cx, cy, narrow ? 112 : 132, t);
            const outer = pointAt(cx, cy, R - b.size * 0.45, t);
            return (
              <g key={b.key}>
                <line
                  x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                  stroke={BRASS} strokeOpacity={0.3} strokeDasharray="2 5"
                />
                <image
                  href={PLANET_RENDERS[b.key]}
                  x={p.x - b.size / 2} y={p.y - b.size / 2}
                  width={b.size} height={b.size}
                />
                {!narrow && outsideLabel(
                  t, R + b.size * 0.5 + 20,
                  (PLANET_LABELS[b.key] ?? b.key).toUpperCase(),
                  `${b.planet.degree.toFixed(2)}° ${b.planet.sign} · ${ORDINALS[b.planet.house - 1]}`,
                )}
              </g>
            );
          })}

          {/* The Ascendant is a point on the horizon, so it never gets a body. */}
          <line
            x1={ascTickIn.x} y1={ascTickIn.y} x2={ascAt.x} y2={ascAt.y}
            stroke={BRASS} strokeOpacity={0.3} strokeDasharray="2 5"
          />
          <circle cx={ascAt.x} cy={ascAt.y} r={13} fill="hsl(var(--background))" stroke={BRASS} strokeWidth={1.5} />
          <circle cx={ascAt.x} cy={ascAt.y} r={4} fill={BRASS} />
          <line
            x1={ascAt.x} y1={ascAt.y} x2={ascTickOut.x} y2={ascTickOut.y}
            stroke={BRASS} strokeWidth={1.5}
          />
          {!narrow && outsideLabel(
            ascTheta, R + 44, "RISING · THE SLICE CLIMBING",
            `${asc.degree.toFixed(2)}° ${asc.sign}${ascRuler ? ` · ruled by ${PLANET_LABELS[ascRuler]}` : ""}`,
          )}

          <text
            x={cx} y={cy - (narrow ? 24 : 30)} textAnchor="middle"
            fontFamily="Space Grotesk, sans-serif" fontSize={narrow ? 10 : 12} letterSpacing="2.4" fill={BRASS}
          >
            NATAL CHART REPORT
          </text>
          <text
            x={cx} y={cy + (narrow ? 26 : 34)} textAnchor="middle"
            fontFamily="Newsreader, Georgia, serif" fontWeight={400} fontSize={narrow ? 44 : 62}
            fill="hsl(var(--foreground))"
          >
            {name}
          </text>
        </svg>
      </div>

      {/* At 400 px the readouts go under the ring, never beside it (acceptance 10). */}
      {narrow && (
        <dl className="mt-2 space-y-2">
          {legend.map((row) => (
            <div key={row.label} className="flex items-center gap-2.5">
              {row.key
                ? <img src={PLANET_RENDERS[row.key]} alt="" width={22} height={22} className="w-[22px] h-[22px]" />
                : <span aria-hidden className="w-[22px] grid place-items-center"><span className="block w-2.5 h-2.5 rounded-full border border-brass" /></span>}
              <dt className="font-label text-[10px] tracking-[0.18em] uppercase text-brass/80 w-16 shrink-0">{row.label}</dt>
              <dd className="font-numeric text-[12px] text-foreground/90 min-w-0 break-words">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 font-numeric text-[11px] text-muted-foreground">
        <div className="min-w-0">
          <p className="break-words">POB · {birthPlace}</p>
          <p>{coordinate(latitude, "N", "S", places)} / {coordinate(longitude, "E", "W", places)}</p>
        </div>
        <div className="text-right">
          <p>{meta.sect} chart · sun alt {meta.sunAltitude.toFixed(1)}°</p>
        </div>
      </div>
    </header>
  );
}

export default ReportHero;
