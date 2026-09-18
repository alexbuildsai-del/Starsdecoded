/**
 * The opening plate, fixed behind the first screen: the Sun and the Moon as
 * renders at their true angles on a thin brass ring, the Ascendant as an open
 * marker because it is a point on the horizon and never a body (ADR-17), the
 * name at the centre of its own sky, and the birth data in the corners.
 *
 * East is on the left, as every chart is drawn. The dotted horizon is the
 * plate's only line: a label sits beside its body with nothing joining them
 * (ADR-27). The Sun's glow is painted on the sky layer rather than inside the
 * SVG, so no bar, edge or chapter can clip it. It fades out over the first 0.6
 * screens as the reading's sky fades in.
 */
import { useEffect, useRef, useState } from "react";
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";
import { ORDINALS } from "@/lib/evidence-glossary";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { opposite, pointAt, theta } from "@/components/chart/wheel-geometry";
import { layoutHero, type Rect } from "@/components/report/hero-layout";
import { PLANET_LABELS, type ChartData, type Interpretation } from "@/types/chart";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const SKY = "var(--sky)";
const SKY_DIM = "var(--sky-dim)";
const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

/** Four stops, transparent by about 1.6 Sun diameters out. */
const GLOW = "radial-gradient(circle, rgba(255,196,118,.46) 0%, rgba(236,142,62,.22) 24%,"
  + " rgba(150,82,38,.08) 56%, rgba(6,8,12,0) 100%)";
const GLOW_DIAMETERS = 3.2;

/** The name's own ladder: it is page type, so it never scales with the plate. */
function nameLines(name: string): { lines: string[]; size: number } {
  const n = name.trim();
  if (n.length <= 14) return { lines: [n], size: 64 };
  if (n.length <= 26) return { lines: [n], size: 48 };
  const words = n.split(/\s+/);
  if (words.length < 2) return { lines: [n], size: 40 };
  // Balanced: the break that leaves the two lines closest in length.
  let best = 1;
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const gap = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (gap < bestGap) { bestGap = gap; best = i; }
  }
  return { lines: [words.slice(0, best).join(" "), words.slice(best).join(" ")], size: 40 };
}

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
  const sunRef = useRef<SVGImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

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
      if (!reduced) {
        // The whole diagram is one group so ring, horizon and markers can never
        // drift apart on scroll; only the name moves at a different depth.
        diagramRef.current?.setAttribute("transform", `translate(0,${(-top * 0.12 * 1.6).toFixed(1)})`);
        if (nameRef.current) nameRef.current.style.transform = `translateY(calc(-50% - ${(top * 0.05 * 1.6).toFixed(1)}px))`;
      }
      // The glow is painted outside the SVG, so it is told where the Sun ended
      // up rather than being drawn with it.
      const sun = sunRef.current;
      const glow = glowRef.current;
      const sky = skyRef.current;
      if (sun && glow && sky) {
        const s = sun.getBoundingClientRect();
        const box = sky.getBoundingClientRect();
        const d = Math.max(s.width, 1) * GLOW_DIAMETERS;
        glow.style.width = `${d.toFixed(1)}px`;
        glow.style.height = `${d.toFixed(1)}px`;
        glow.style.left = `${(s.left - box.left + s.width / 2 - d / 2).toFixed(1)}px`;
        glow.style.top = `${(s.top - box.top + s.height / 2 - d / 2).toFixed(1)}px`;
      }
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
  }, [reduced, narrow, name]);

  const asc = chartData.angles.ascendant;
  const dsc = chartData.angles.descendant;
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

  const ascTheta = theta(asc.absoluteDegree, asc.absoluteDegree);
  const ascAt = pointAt(cx, cy, R, ascTheta);
  const east = pointAt(cx, cy, R + 58, ascTheta);
  const west = pointAt(cx, cy, R + 58, theta(opposite(asc.absoluteDegree), asc.absoluteDegree));

  const { lines: nameRows, size: nameSize } = nameLines(name);

  // What a label may not cover: the name plate at the centre and the two
  // horizon labels. Measured in plate units, like everything else here.
  const obstacles: Rect[] = [
    { x: cx - Math.min(W * 0.31, 230), y: cy - 66, w: Math.min(W * 0.62, 460), h: 132 },
    { x: east.x - 210, y: east.y + 10, w: 210, h: 42 },
    { x: west.x, y: west.y + 10, w: 210, h: 42 },
  ];

  const layout = layoutHero({
    cx, cy, ringRadius: R,
    ascendantAbsoluteDegree: asc.absoluteDegree,
    // The Sun is placed first, so it takes the room it needs.
    bodies: [
      sun && { key: "sun", absoluteDegree: sun.absoluteDegree, size: narrow ? 104 : 120 },
      moon && { key: "moon", absoluteDegree: moon.absoluteDegree, size: narrow ? 64 : 72 },
    ].filter(Boolean) as { key: string; absoluteDegree: number; size: number }[],
    labelWidth: 186,
    labelHeight: 34,
    obstacles,
  });

  const dob = new Date(`${birthDate}T00:00:00Z`);
  const dobText = `${dob.getUTCDate()} ${MONTHS[dob.getUTCMonth()]} ${dob.getUTCFullYear()}`;

  const legend = [
    sun && { key: "sun", label: "Sun", value: `${sun.degree.toFixed(2)}° ${sun.sign} · ${ORDINALS[sun.house - 1]}` },
    moon && { key: "moon", label: "Moon", value: `${moon.degree.toFixed(2)}° ${moon.sign} · ${ORDINALS[moon.house - 1]}` },
    { key: null, label: "Rising", value: rising },
  ].filter(Boolean) as { key: string | null; label: string; value: string }[];

  function bodyValue(key: string): string {
    const p = key === "sun" ? sun : moon;
    return p ? `${p.degree.toFixed(2)}° ${p.sign} · ${ORDINALS[p.house - 1]}` : "";
  }

  return (
    <>
      <div ref={skyRef} className={`rp-hsky rp-grain no-print${narrow ? " narrow" : ""}`}>
        {/* Under the transparent bar, off the plate's edges, fading with the sky. */}
        <div
          ref={glowRef}
          aria-hidden
          className="pointer-events-none absolute"
          style={{ background: GLOW, borderRadius: "50%" }}
        />
        <div className="rp-hplate">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${name}: Sun, Moon and Rising at their true positions`}
        >
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
              <Label x={east.x + 4} y={east.y + 22} anchor="start" size={9.5} fill={SKY_DIM}>EAST · RISING</Label>
            ) : (
              <>
                <Label x={east.x - 6} y={east.y + 26} anchor="end" size={11} fill={SKY_DIM}>EAST · RISING</Label>
                <text
                  x={(east.x - 6).toFixed(1)} y={(east.y + 44).toFixed(1)} textAnchor="end"
                  fontFamily="IBM Plex Mono, monospace" fontSize={11} fill="rgba(232,235,242,.5)"
                >
                  drawn facing south, so east is on your left
                </text>
                <Label x={west.x + 6} y={west.y + 26} anchor="start" size={11} fill={SKY_DIM}>WEST · SETTING</Label>
                <text
                  x={(west.x + 6).toFixed(1)} y={(west.y + 44).toFixed(1)} textAnchor="start"
                  fontFamily="IBM Plex Mono, monospace" fontSize={11.5} fill="rgba(232,235,242,.62)"
                >
                  {`${dsc.degree.toFixed(2)}° ${dsc.sign}`}
                </text>
              </>
            )}

            {layout.bodies.map((b) => (
              <image
                key={b.key}
                ref={b.key === "sun" ? sunRef : undefined}
                href={b.key === "sun" ? SUN_HERO : PLANET_RENDERS[b.key]}
                x={b.x - b.size / 2} y={b.y - b.size / 2}
                width={b.size} height={b.size}
              />
            ))}

            {!narrow && layout.labels.map((l) => (
              <g key={l.key}>
                <Label x={l.x} y={l.y - 3} anchor={l.anchor} size={9.5} fill={SKY_DIM}>
                  {(PLANET_LABELS[l.key] ?? l.key).toUpperCase()}
                </Label>
                <text
                  x={l.x.toFixed(1)} y={(l.y + 13).toFixed(1)} textAnchor={l.anchor}
                  fontFamily="IBM Plex Mono, monospace" fontSize={11.5} fill="rgba(232,235,242,.62)"
                >
                  {bodyValue(l.key)}
                </text>
              </g>
            ))}

            <circle cx={ascAt.x.toFixed(1)} cy={ascAt.y.toFixed(1)} r={13} fill="#0B0E14" stroke={SKY} strokeWidth={1.5} />
            <circle cx={ascAt.x.toFixed(1)} cy={ascAt.y.toFixed(1)} r={4} fill={SKY} />
          </g>
        </svg>
        <div ref={nameRef} className="rp-hname">
          <span className="k">Natal chart report</span>
          <div className="relative inline-block justify-self-center">
            {/* A halo fitted to the text box, so the ring reads through around it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: "156%", height: "240%",
                background: "radial-gradient(ellipse at center, rgba(18,24,38,.94) 0%,"
                  + " rgba(18,24,38,.64) 54%, rgba(18,24,38,0) 100%)",
              }}
            />
            <h1 className="relative" style={{ fontSize: `${nameSize}px` }}>
              {nameRows.map((line, i) => (
                <span key={i} className="block">{line}</span>
              ))}
            </h1>
          </div>
        </div>
        </div>

        {narrow && (
          <dl className="rp-legend">
            {legend.map((row) => (
              <div key={row.label} className="lr">
                {row.key
                  ? <img src={row.key === "sun" ? SUN_HERO : PLANET_RENDERS[row.key]} alt="" width={22} height={22} />
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
