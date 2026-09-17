/**
 * The opening plate, fixed behind the first screen: Sun and Moon as lit renders
 * at their true angles on a thin brass ring, the Ascendant as an open marker
 * because it is a point on the horizon and never a body (ADR-17), the name at
 * the centre of its own sky, and the birth data in the corners. It fades out
 * over the first 0.6 screens as the reading's sky fades in.
 */
import { useEffect, useRef, useState } from "react";
import { PLANET_RENDERS } from "@/lib/planet-renders";
import { ORDINALS } from "@/lib/evidence-glossary";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { opposite, pointAt, theta } from "@/components/chart/wheel-geometry";
import { PLANET_LABELS, type ChartData, type Interpretation } from "@/types/chart";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const SKY = "var(--sky)";
const SKY_DIM = "var(--sky-dim)";
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

function Label({ x, y, anchor, size, fill, children }: {
  x: number; y: number; anchor: "start" | "middle" | "end"; size: number; fill: string; children: string;
}) {
  return (
    <text
      x={x.toFixed(1)} y={y.toFixed(1)} textAnchor={anchor}
      fontFamily="Space Grotesk, monospace" fontSize={size} letterSpacing="2.4" fill={fill}
    >
      {children}
    </text>
  );
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
  const skyRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<SVGGElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    function place() {
      const top = window.scrollY;
      const q = Math.min(1, top / (Math.max(1, window.innerHeight) * 0.6));
      const gone = q >= 1 ? "hidden" : "";
      if (skyRef.current) {
        skyRef.current.style.opacity = (1 - q).toFixed(3);
        skyRef.current.style.visibility = gone;
        skyRef.current.style.pointerEvents = q > 0.9 ? "none" : "";
      }
      if (hudRef.current) {
        hudRef.current.style.opacity = (0.62 * Math.max(0, 1 - q * 1.8)).toFixed(3);
        hudRef.current.style.visibility = gone;
      }
      if (cueRef.current) cueRef.current.style.opacity = Math.max(0, 1 - q * 2.2).toFixed(3);
      if (reduced) return;
      // The whole diagram is one group so ring, lines and markers can never
      // drift apart on scroll; only the name moves at a different depth.
      diagramRef.current?.setAttribute("transform", `translate(0,${(-top * 0.12 * 1.6).toFixed(1)})`);
      if (nameRef.current) nameRef.current.style.transform = `translateY(calc(-50% - ${(top * 0.05 * 1.6).toFixed(1)}px))`;
    }
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        place();
      });
    }
    place();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reduced, narrow]);

  const asc = chartData.angles.ascendant;
  const sun = chartData.planets.sun;
  const moon = chartData.planets.moon;
  const ascRuler = TRADITIONAL_RULER[asc.sign];
  const rising = `${asc.degree.toFixed(2)}° ${asc.sign}${ascRuler ? ` · ruled by ${PLANET_LABELS[ascRuler]}` : ""}`;

  const W = narrow ? 680 : 1000;
  const H = narrow ? 680 : 660;
  const cx = W / 2;
  const cy = H / 2;
  const R = narrow ? 196 : 200;
  const places = narrow ? 2 : 4;

  const bodies = [
    { key: "sun", planet: sun, size: narrow ? 104 : 116 },
    { key: "moon", planet: moon, size: narrow ? 64 : 72 },
  ].filter((b) => !!b.planet);

  const ascTheta = theta(asc.absoluteDegree, asc.absoluteDegree);
  const ascAt = pointAt(cx, cy, R, ascTheta);
  const ascOut = pointAt(cx, cy, R + 22, ascTheta);
  const ascIn = pointAt(cx, cy, R - 26, ascTheta);
  const east = pointAt(cx, cy, R + 58, ascTheta);
  const west = pointAt(cx, cy, R + 58, theta(opposite(asc.absoluteDegree), asc.absoluteDegree));

  const dob = new Date(`${birthDate}T00:00:00Z`);
  const dobText = `${dob.getUTCDate()} ${MONTHS[dob.getUTCMonth()]} ${dob.getUTCFullYear()}`;

  const legend = [
    sun && { key: "sun", label: "Sun", value: `${sun.degree.toFixed(2)}° ${sun.sign} · ${ORDINALS[sun.house - 1]}` },
    moon && { key: "moon", label: "Moon", value: `${moon.degree.toFixed(2)}° ${moon.sign} · ${ORDINALS[moon.house - 1]}` },
    { key: null, label: "Rising", value: rising },
  ].filter(Boolean) as { key: string | null; label: string; value: string }[];

  function outside(angle: number, radius: number, kicker: string, value: string) {
    const p = pointAt(cx, cy, radius, angle);
    const right = p.x >= cx;
    const anchor = right ? "start" : "end";
    const dx = right ? 16 : -16;
    return (
      <g>
        <Label x={p.x + dx} y={p.y - 3} anchor={anchor} size={9.5} fill={SKY_DIM}>{kicker}</Label>
        <text
          x={(p.x + dx).toFixed(1)} y={(p.y + 13).toFixed(1)} textAnchor={anchor}
          fontFamily="IBM Plex Mono, monospace" fontSize={11.5} fill="rgba(232,235,242,.62)"
        >
          {value}
        </text>
      </g>
    );
  }

  return (
    <>
      <div ref={skyRef} className={`rp-hsky rp-grain no-print${narrow ? " narrow" : ""}`}>
        <div className="rp-hplate">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${name}: Sun, Moon and Rising at their true positions`}
        >
          <defs>
            {/* Fades the spokes out under the name, which sits over the centre in page type. */}
            <radialGradient id="rp-name-veil">
              <stop offset="0%" stopColor="#121826" stopOpacity={0.92} />
              <stop offset="62%" stopColor="#121826" stopOpacity={0.66} />
              <stop offset="100%" stopColor="#121826" stopOpacity={0} />
            </radialGradient>
          </defs>
          <g ref={diagramRef}>
            <circle cx={cx} cy={cy} r={R} fill="none" stroke={SKY} strokeOpacity={0.42} />
            {Array.from({ length: 12 }, (_, i) => i * 30).map((d) => {
              const t = theta(d, asc.absoluteDegree);
              const p1 = pointAt(cx, cy, R, t);
              const p2 = pointAt(cx, cy, R - (d % 90 === 0 ? 13 : 7), t);
              return (
                <line
                  key={d} x1={p1.x.toFixed(1)} y1={p1.y.toFixed(1)} x2={p2.x.toFixed(1)} y2={p2.y.toFixed(1)}
                  stroke={SKY} strokeOpacity={d % 90 === 0 ? 0.5 : 0.26}
                />
              );
            })}
            <line
              x1={east.x.toFixed(1)} y1={east.y.toFixed(1)} x2={west.x.toFixed(1)} y2={west.y.toFixed(1)}
              stroke={SKY_DIM} strokeOpacity={0.55} strokeDasharray="2 5"
            />
            {narrow ? (
              <Label x={east.x + 4} y={east.y + 22} anchor="start" size={9.5} fill={SKY_DIM}>E. HORIZON</Label>
            ) : (
              <>
                <Label x={east.x - 6} y={east.y + 30} anchor="end" size={11} fill={SKY_DIM}>EASTERN HORIZON</Label>
                <Label x={west.x + 6} y={west.y + 30} anchor="start" size={11} fill={SKY_DIM}>WESTERN HORIZON</Label>
              </>
            )}

            {/* Every spoke runs from the centre to its body's edge, so each one points where it should. */}
            {bodies.map((b) => {
              const t = theta(b.planet.absoluteDegree, asc.absoluteDegree);
              const edge = pointAt(cx, cy, R - b.size / 2 - 3, t);
              return (
                <line
                  key={b.key} x1={cx} y1={cy} x2={edge.x.toFixed(1)} y2={edge.y.toFixed(1)}
                  stroke={SKY} strokeOpacity={0.3} strokeDasharray="2 5"
                />
              );
            })}
            <line
              x1={cx} y1={cy} x2={ascIn.x.toFixed(1)} y2={ascIn.y.toFixed(1)}
              stroke={SKY} strokeOpacity={0.3} strokeDasharray="2 5"
            />
            <circle cx={cx} cy={cy} r={narrow ? 120 : 136} fill="url(#rp-name-veil)" />

            {bodies.map((b) => {
              const t = theta(b.planet.absoluteDegree, asc.absoluteDegree);
              const p = pointAt(cx, cy, R, t);
              return (
                <g key={b.key}>
                  <image
                    href={PLANET_RENDERS[b.key]}
                    x={p.x - b.size / 2} y={p.y - b.size / 2}
                    width={b.size} height={b.size}
                  />
                  {!narrow && outside(
                    t, R + b.size * 0.5 + 16,
                    (PLANET_LABELS[b.key] ?? b.key).toUpperCase(),
                    `${b.planet.degree.toFixed(2)}° ${b.planet.sign} · ${ORDINALS[b.planet.house - 1]}`,
                  )}
                </g>
              );
            })}

            <circle cx={ascAt.x.toFixed(1)} cy={ascAt.y.toFixed(1)} r={13} fill="#0B0E14" stroke={SKY} strokeWidth={1.5} />
            <circle cx={ascAt.x.toFixed(1)} cy={ascAt.y.toFixed(1)} r={4} fill={SKY} />
            <line
              x1={ascAt.x.toFixed(1)} y1={ascAt.y.toFixed(1)} x2={ascOut.x.toFixed(1)} y2={ascOut.y.toFixed(1)}
              stroke={SKY} strokeWidth={1.5}
            />
            {!narrow && outside(ascTheta, R + 40, "RISING · THE SLICE CLIMBING", rising)}
          </g>
        </svg>
        <div ref={nameRef} className="rp-hname">
          <span className="k">Natal chart report</span>
          <h1>{name}</h1>
        </div>
        </div>

        {narrow && (
          <dl className="rp-legend">
            {legend.map((row) => (
              <div key={row.label} className="lr">
                {row.key
                  ? <img src={PLANET_RENDERS[row.key]} alt="" width={22} height={22} />
                  : <span aria-hidden className="rp-ascdot" />}
                <dt className="k">{row.label}</dt>
                <dd className="v">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div ref={hudRef} className="rp-hud no-print" aria-hidden>
        <div className="fr" />
        <span className="br tl" /><span className="br tr" /><span className="br bl" /><span className="br brr" />
        <span className="tick l" /><span className="tick r" />
        <div className="r">
          <div className="col">
            <span className="live"><i />DOB · {dobText}</span>
            <span className="d">TOB · {birthTime}</span>
          </div>
          <div className="col e">
            <span>Stars Decoded</span>
            <span className="d">{meta.houseSystem} · {meta.zodiac}</span>
          </div>
        </div>
        <div className="r b">
          <div className="col">
            <span>POB · {birthPlace}</span>
            <span className="d">{coordinate(latitude, "N", "S", places)} / {coordinate(longitude, "E", "W", places)}</span>
          </div>
          <div className="col e">
            <span>Ch. 00 / Horizon</span>
            <span className="d">{meta.sect} chart · sun alt {meta.sunAltitude.toFixed(1)}°</span>
          </div>
        </div>
      </div>

      <section className="rp-hero" aria-label="Opening">
        <div ref={cueRef} className="rp-cue no-print"><span><i />Scroll</span></div>
        <header className="hidden print:block px-8 pt-12">
          <p className="font-label text-[10px] tracking-[0.28em] uppercase">Natal chart report</p>
          <h1 className="font-display text-5xl mt-2">{name}</h1>
          <p className="font-numeric text-xs mt-3">
            DOB · {dobText} · TOB · {birthTime} · POB · {birthPlace}
          </p>
          <p className="font-numeric text-xs mt-1">
            {legend.map((row) => `${row.label} ${row.value}`).join(" · ")}
          </p>
        </header>
      </section>
    </>
  );
}

export default ReportHero;
