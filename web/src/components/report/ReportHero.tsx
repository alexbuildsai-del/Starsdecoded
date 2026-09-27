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
 *
 * A blind chart (ADR-33, ADR-37) has no horizon to draw: no line, no east or
 * west, no rising marker. The plate is framed on 0° Aries, the Moon is the arc
 * it travelled across the band, the Sun sits at its centre-time degree, and the
 * legend's third line asks for the birth time instead of naming a sign.
 *
 * Three tiers (ADR-59): wide keeps the plate with the name at its centre;
 * narrow, up to 900 px, stacks the plate, the legend and the cue; the phone,
 * under 640 px, puts the ring on top at 82vw and the name under it, then the
 * legend, then the cue clear of the corner text (`phoneStack`).
 */
import { useEffect, useRef, useState } from "react";
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";
import { houseWithWord } from "@/lib/evidence-glossary";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { opposite, pointAt, theta } from "@/components/chart/wheel-geometry";
import { PHONE, layoutHero, moonArc, phoneStack, type Rect } from "@/components/report/hero-layout";
import { AngleGlyphShape } from "@/components/report/AngleGlyph";
import { timeOfBirthLabel } from "@/lib/birth-time";
import { Mark } from "@/components/Mark";
import { PLANET_LABELS, type ChartData, type ChartPlanet, type Interpretation } from "@/types/chart";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { PERSONAL_REPORT } from "@/lib/product";
import { ReportSky } from "@/components/report/ReportSky";
import type { Ring } from "@/lib/gather";

const SKY = "var(--sky)";
const SKY_DIM = "var(--sky-dim)";
const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

/** Four stops, transparent by about 1.6 Sun diameters out. */
const GLOW = "radial-gradient(circle closest-side, rgba(255,196,118,.46) 0%, rgba(236,142,62,.22) 24%,"
  + " rgba(150,82,38,.08) 56%, rgba(6,8,12,0) 100%)";
const GLOW_DIAMETERS = 3.2;

/** The name's own ladder: it is page type, so it never scales with the plate. A phone gets a smaller rung of the same ladder. */
function nameLines(name: string, narrow: boolean): { lines: string[]; size: number } {
  const n = name.trim();
  const [big, mid, small] = narrow ? [44, 34, 28] : [64, 48, 40];
  if (n.length <= 14) return { lines: [n], size: big };
  if (n.length <= 26) return { lines: [n], size: mid };
  const words = n.split(/\s+/);
  if (words.length < 2) return { lines: [n], size: small };
  // Balanced: the break that leaves the two lines closest in length.
  let best = 1;
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const gap = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (gap < bestGap) { bestGap = gap; best = i; }
  }
  return { lines: [words.slice(0, best).join(" "), words.slice(best).join(" ")], size: small };
}

type Tier = "wide" | "narrow" | "phone";

const PHONE_QUERY = "(max-width: 639px)";
const NARROW_QUERY = "(max-width: 900px)";

function tierNow(): Tier {
  if (typeof window === "undefined") return "wide";
  if (window.matchMedia(PHONE_QUERY).matches) return "phone";
  return window.matchMedia(NARROW_QUERY).matches ? "narrow" : "wide";
}

function useTier(): Tier {
  const [tier, setTier] = useState<Tier>(tierNow);
  useEffect(() => {
    const queries = [window.matchMedia(PHONE_QUERY), window.matchMedia(NARROW_QUERY)];
    const onChange = () => setTier(tierNow());
    onChange();
    for (const mq of queries) mq.addEventListener("change", onChange);
    return () => { for (const mq of queries) mq.removeEventListener("change", onChange); };
  }, []);
  return tier;
}

/** The phone's viewport, re-read on resize so the stack follows an address-bar collapse or a rotation. */
function useViewport(active: boolean): { width: number; height: number } {
  const read = () => ({ width: typeof window === "undefined" ? 390 : window.innerWidth, height: typeof window === "undefined" ? 844 : window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    if (!active) return;
    const onResize = () => setSize(read());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active]);
  return size;
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

/** A body's line in the legend: degree and sign, and its house with its word when the chart has one (ADR-98). */
function placementText(p: ChartPlanet): string {
  return `${p.degree.toFixed(2)}° ${p.sign}${p.house ? ` · ${houseWithWord(p.house)}` : ""}`;
}

const ADD_TIME = "add your birth time to draw the horizon";

/** The cue is a button (ADR-50): 44 px hit area, scrolls to chapter 01, fades over the first half screen. */
function ScrollCue({ flow, reduced, cueRef }: { flow?: boolean; reduced: boolean; cueRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={cueRef} className={`rp-cue no-print${flow ? " rp-cue-flow" : ""}`}>
      <button
        type="button"
        onClick={() => document.getElementById("chapter-1")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })}
        aria-label="Scroll to chapter 1"
      >
        Scroll<i aria-hidden />
      </button>
    </div>
  );
}

export interface ReportHeroProps {
  name: string;
  birthDate: string;
  birthTime: string;
  /** 0 when the time is exact; the corner reads "approximate" or "not recorded" otherwise. */
  birthTimeWindowMinutes?: number;
  birthPlace: string;
  latitude: number;
  longitude: number;
  chartData: ChartData;
  meta: Interpretation["meta"];
  /** Opens the three-way birth time control; the blind hero's third legend line. */
  onAddBirthTime?: () => void;
  /** The hero's own sky takes the opening accent; once the door is taken the stars gather onto the ring (ADR-59). */
  accent: string;
  gather: boolean;
}

export function ReportHero({
  name, birthDate, birthTime, birthTimeWindowMinutes = 0, birthPlace, latitude, longitude, chartData, meta, onAddBirthTime, accent, gather,
}: ReportHeroProps) {
  const tier = useTier();
  const narrow = tier !== "wide";
  const phone = tier === "phone";
  const viewport = useViewport(phone);
  const reduced = useReducedMotion();
  const skyRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<SVGGElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<SVGImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const [ring, setRing] = useState<Ring | null>(null);

  // The ring's place on screen, measured at rest and again on every resize,
  // so the ring of stars follows an address-bar collapse or a rotation.
  useEffect(() => {
    function measure() {
      const el = ringRef.current;
      if (!el) return;
      const b = el.getBoundingClientRect();
      if (b.width < 2) return;
      const next = { cx: b.left + b.width / 2, cy: b.top + b.height / 2, r: b.width / 2 };
      setRing((prev) => (prev && Math.abs(prev.cx - next.cx) < 0.5 && Math.abs(prev.cy - next.cy) < 0.5 && Math.abs(prev.r - next.r) < 0.5 ? prev : next));
    }
    measure();
    const raf = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => { window.cancelAnimationFrame(raf); window.removeEventListener("resize", measure); };
  }, [tier, viewport.width, viewport.height, name]);

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
        // drift apart on scroll; only the name moves at a different depth. On
        // the phone the name sits in the flow under the ring and stays put.
        diagramRef.current?.setAttribute("transform", `translate(0,${(-top * 0.12 * 1.6).toFixed(1)})`);
        if (nameRef.current && !phone) nameRef.current.style.transform = `translateY(calc(-50% - ${(top * 0.05 * 1.6).toFixed(1)}px))`;
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
  }, [reduced, tier, name]);

  const asc = chartData.angles?.ascendant ?? null;
  const dsc = chartData.angles?.descendant ?? null;
  const blind = asc === null;
  const sun = chartData.planets.sun;
  const moon = chartData.planets.moon;
  const ascRuler = asc ? TRADITIONAL_RULER[asc.sign] : undefined;
  const rising = asc ? `${asc.degree.toFixed(2)}° ${asc.sign}${ascRuler ? ` · ruled by ${PLANET_LABELS[ascRuler]}` : ""}` : ADD_TIME;
  const tob = timeOfBirthLabel({ birthTime, birthTimeWindowMinutes });

  // A narrow plate is wider than tall so the ring can fill the width and the
  // horizon labels still have room outside it. The phone's plate is square
  // with the ring at 82% of it, so the ring is 82vw when the svg is 100vw.
  const W = phone ? 560 : narrow ? 780 : 1000;
  const H = phone ? 560 : narrow ? 640 : 660;
  const cx = W / 2;
  const cy = H / 2;
  const R = phone ? Math.round(W * PHONE.ringOfSvg / 2) : narrow ? 236 : 200;
  const horizonReach = phone ? 20 : 58;
  const places = narrow ? 2 : 4;

  // A drawn plate is framed on the Ascendant, east on the left; a blind one on 0° Aries.
  const frame = asc ? asc.absoluteDegree : 0;
  const ascTheta = theta(frame, frame);
  const ascAt = pointAt(cx, cy, R, ascTheta);
  const east = pointAt(cx, cy, R + horizonReach, ascTheta);
  const west = pointAt(cx, cy, R + horizonReach, theta(opposite(frame), frame));
  const arc = moon?.band ? moonArc(cx, cy, R, frame, moon.band) : null;

  const { lines: nameRows, size: nameSize } = nameLines(name, narrow);
  // The name has already broken to its lines from its length; only the viewport's height can now cost the ring.
  const stack = phone ? phoneStack({ viewportWidth: viewport.width, viewportHeight: viewport.height, nameLines: nameRows.length, nameSize }) : null;

  // What a label may not cover: the name plate at the centre and the two
  // horizon labels. Measured in plate units, like everything else here.
  const obstacles: Rect[] = [
    ...(phone ? [] : [{ x: cx - Math.min(W * 0.31, 230), y: cy - 66, w: Math.min(W * 0.62, 460), h: 132 }]),
    ...(blind ? [] : [
      { x: east.x - 210, y: east.y + 10, w: 210, h: 42 },
      { x: west.x, y: west.y + 10, w: 210, h: 42 },
    ]),
  ];

  const layout = layoutHero({
    cx, cy, ringRadius: R,
    frameDegree: frame,
    // The Sun is placed first, so it takes the room it needs.
    bodies: [
      sun && { key: "sun", absoluteDegree: sun.absoluteDegree, size: phone ? 100 : narrow ? 108 : 120 },
      moon && { key: "moon", absoluteDegree: moon.absoluteDegree, size: phone ? 60 : narrow ? 64 : 72 },
    ].filter(Boolean) as { key: string; absoluteDegree: number; size: number }[],
    // The widest value, "29.99° Sagittarius · 7th (partnership)": 38 characters at 11.5 px Plex Mono (6.9 px each), plus air.
    labelWidth: 276,
    labelHeight: 34,
    obstacles,
  });

  const dob = new Date(`${birthDate}T00:00:00Z`);
  const dobText = `${dob.getUTCDate()} ${MONTHS[dob.getUTCMonth()]} ${dob.getUTCFullYear()}`;

  const legend = [
    sun && { key: "sun", label: "Sun", value: placementText(sun) },
    moon && { key: "moon", label: "Moon", value: placementText(moon) },
    { key: null, label: "Rising", value: rising },
  ].filter(Boolean) as { key: string | null; label: string; value: string }[];

  function bodyValue(key: string): string {
    const p = key === "sun" ? sun : moon;
    return p ? placementText(p) : "";
  }

  const sectLine = meta.sect && meta.sunAltitude !== undefined
    ? `${meta.sect} chart · sun alt ${meta.sunAltitude.toFixed(1)}°`
    : "horizon · not drawn";

  return (
    <>
      <div ref={skyRef} className={`rp-hsky rp-grain no-print${narrow ? " narrow" : ""}${phone ? " phone" : ""}`}>
        {/* The hero's own starfield and, once opened, the ring of stars, sized to this layer and fading with it. */}
        <ReportSky variant="hero" accent={accent} opening gatherTo={gather ? ring : null} />
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
          style={stack ? { maxHeight: `${stack.svg.toFixed(0)}px`, maxWidth: `${stack.svg.toFixed(0)}px` } : undefined}
          role="img"
          aria-label={blind ? `${name}: Sun and Moon at their true positions; the horizon is not drawn` : `${name}: Sun, Moon and Rising at their true positions`}
        >
          <g ref={diagramRef}>
            <circle ref={ringRef} cx={cx} cy={cy} r={R} fill="none" stroke={SKY} strokeOpacity={0.42} />
            {Array.from({ length: 12 }, (_, i) => i * 30).map((d) => {
              const t = theta(d, frame);
              const p1 = pointAt(cx, cy, R, t);
              const p2 = pointAt(cx, cy, R - (d % 90 === 0 ? 13 : 7), t);
              return (
                <line
                  key={d} x1={p1.x.toFixed(1)} y1={p1.y.toFixed(1)} x2={p2.x.toFixed(1)} y2={p2.y.toFixed(1)}
                  stroke={SKY} strokeOpacity={d % 90 === 0 ? 0.5 : 0.26}
                />
              );
            })}
            {!blind && (
              <line
                x1={east.x.toFixed(1)} y1={east.y.toFixed(1)} x2={west.x.toFixed(1)} y2={west.y.toFixed(1)}
                stroke={SKY_DIM} strokeOpacity={0.55} strokeDasharray="2 5"
              />
            )}
            {arc && (
              // The Moon's day: the arc between its longitudes at the band's edges, the render at its centre.
              <path d={arc.d} fill="none" stroke={SKY} strokeOpacity={0.7} strokeWidth={3} strokeLinecap="round" data-moon-arc />
            )}
            {blind ? null : narrow ? (
              <>
                <Label x={east.x} y={east.y + (phone ? 26 : 30)} anchor={east.x < cx ? "start" : "end"} size={phone ? 15 : 18} fill={SKY_DIM}>EAST · RISING</Label>
                <Label x={west.x} y={west.y + (phone ? 26 : 30)} anchor={west.x < cx ? "start" : "end"} size={phone ? 15 : 18} fill={SKY_DIM}>WEST · SETTING</Label>
              </>
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
                  {dsc ? `${dsc.degree.toFixed(2)}° ${dsc.sign}` : ""}
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

            {!blind && (
              // The R03 marker: ring, centre point, a tick outward along the horizon (ADR-49).
              <AngleGlyphShape x={ascAt.x} y={ascAt.y} r={13} direction={ascTheta} stroke={SKY} fill="#0B0E14" strokeWidth={1.5} />
            )}
            {blind && !narrow && (
              <Label x={cx} y={cy + R + 46} anchor="middle" size={11} fill={SKY_DIM}>{`RISING · ${ADD_TIME.toUpperCase()}`}</Label>
            )}
          </g>
        </svg>
        {blind && !narrow && onAddBirthTime && (
          <button
            type="button"
            onClick={onAddBirthTime}
            className="absolute left-1/2 -translate-x-1/2 rounded-full border border-brass/50 px-4 py-2 font-label text-[11px] uppercase tracking-[0.2em] text-brass hover:bg-brass/10"
            style={{ bottom: "4%" }}
          >
            Add my birth time
          </button>
        )}
        {!phone && (
        <div ref={nameRef} className="rp-hname">
          <span className="k">{PERSONAL_REPORT}</span>
          <div className="relative inline-block justify-self-center">
            {/* A halo fitted to the text box, so the ring reads through around it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: "156%", height: "240%",
                background: "radial-gradient(ellipse closest-side at center, rgba(18,24,38,.94) 0%,"
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
        )}
        </div>

        {/* The phone's name lives under the ring, in the flow, with no halo: the ring is above it, not behind it. */}
        {phone && (
          <div ref={nameRef} className="rp-hname rp-hname-flow">
            <span className="k">{PERSONAL_REPORT}</span>
            <h1 style={{ fontSize: `${nameSize}px` }}>
              {nameRows.map((line, i) => (
                <span key={i} className="block">{line}</span>
              ))}
            </h1>
          </div>
        )}

        {narrow && (
          <dl className="rp-legend">
            {legend.map((row) => (
              <div key={row.label} className="lr">
                {row.key
                  ? <img src={row.key === "sun" ? SUN_HERO : PLANET_RENDERS[row.key]} alt="" width={22} height={22} />
                  : <span aria-hidden className="rp-ascdot" />}
                <dt className="k">{row.label}</dt>
                <dd className="v">
                  {!row.key && blind && onAddBirthTime
                    ? <button type="button" onClick={onAddBirthTime} className="text-brass underline-offset-4 hover:underline">{row.value}</button>
                    : row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {narrow && <ScrollCue flow reduced={reduced} cueRef={cueRef} />}
      </div>

      <div ref={hudRef} className="rp-hud no-print" aria-hidden>
        <div className="fr" />
        <span className="br tl" /><span className="br tr" /><span className="br bl" /><span className="br brr" />
        <span className="tick l" /><span className="tick r" />
        <div className="r">
          <div className="col">
            <span className="live"><i />DOB · {dobText}</span>
            <span className="d">TOB · {tob}</span>
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
            <span className="d">{sectLine}</span>
          </div>
        </div>
      </div>

      <section className="rp-hero" aria-label="Opening">
        {!narrow && <ScrollCue reduced={reduced} cueRef={cueRef} />}
        <header className="hidden print:block px-8 pt-12">
          <p className="flex items-center gap-2 font-display text-base mb-6">
            <Mark className="h-[18px] w-[18px]" point="currentColor" />
            Stars Decoded
          </p>
          <p className="font-label text-[10px] tracking-[0.28em] uppercase">{PERSONAL_REPORT}</p>
          <h1 className="font-display text-5xl mt-2">{name}</h1>
          <p className="font-numeric text-xs mt-3">
            DOB · {dobText} · TOB · {tob} · POB · {birthPlace}
          </p>
          <p className="font-numeric text-xs mt-1">
            {legend.map((row) => `${row.label} ${!row.key && blind ? "not drawn" : row.value}`).join(" · ")}
          </p>
        </header>
      </section>
    </>
  );
}

export default ReportHero;
