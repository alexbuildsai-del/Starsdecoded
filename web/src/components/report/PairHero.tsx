/**
 * The compatibility hero (ADR-70): no ring. Two triad plates side by side,
 * one per person, Sun, Moon and rising at their true degrees with the natal
 * hero's renders on a small ring each; degree and sign on a phone, house and
 * ruler from 640 px up; the reader's own report on the left. A blind chart
 * reads "rising · not drawn" and shows the Moon's arc as the natal hero does.
 * The eyebrow is "Compatibility report · {lens}" with the whole-sign line,
 * the two names with AND between, the cue clear of the corners, which carry
 * A's birth record on the left and B's on the right. The hero keeps the
 * starfield and blobs of its own sky and no gather; print keeps the plates
 * and the corners and drops the sky.
 */
import { useEffect, useRef, useState } from "react";
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";
import { pointAt, theta } from "@/components/chart/wheel-geometry";
import { layoutHero, moonArc } from "@/components/report/hero-layout";
import { AngleGlyphShape } from "@/components/report/AngleGlyph";
import { ReportSky } from "@/components/report/ReportSky";
import { pairHeroLayout, pairStack, triadRows, type PairSide } from "@/components/report/pair-hero-layout";
import { timeOfBirthLabel } from "@/lib/birth-time";
import { lensInfo } from "@/lib/lenses";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { ChartData, Lens } from "@/types/chart";

const SKY = "var(--sky)";
const SKY_DIM = "var(--sky-dim)";
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

export interface PairPerson {
  name: string;
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes: number;
  birthPlace: string;
  latitude: number;
  longitude: number;
  isSelf: boolean;
  chartData: ChartData;
}

export interface PairHeroProps {
  a: PairPerson;
  b: PairPerson;
  lens: Lens;
  accent: string;
}

function useViewport(): { width: number; height: number } {
  const read = () => ({ width: typeof window === "undefined" ? 1440 : window.innerWidth, height: typeof window === "undefined" ? 900 : window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const onResize = () => setSize(read());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

function coordinate(value: number, positive: string, negative: string): string {
  return `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`;
}

function dateText(birthDate: string): string {
  const d = new Date(`${birthDate}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? birthDate : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** One person's plate: a small ring with the Sun, the Moon and the rising marker at their true degrees, then the three rows. */
function Plate({ person, detail }: { person: PairPerson; detail: "degree" | "full" }) {
  const chart = person.chartData;
  const asc = chart.angles?.ascendant ?? null;
  const blind = asc === null;
  const sun = chart.planets.sun;
  const moon = chart.planets.moon;
  const W = 220;
  const cx = W / 2;
  const cy = W / 2;
  const R = 72;
  const frame = asc ? asc.absoluteDegree : 0;
  const ascTheta = theta(frame, frame);
  const ascAt = pointAt(cx, cy, R, ascTheta);
  const arc = moon?.band ? moonArc(cx, cy, R, frame, moon.band) : null;
  const layout = layoutHero({
    cx, cy, ringRadius: R, frameDegree: frame,
    bodies: [
      sun && { key: "sun", absoluteDegree: sun.absoluteDegree, size: 44 },
      moon && { key: "moon", absoluteDegree: moon.absoluteDegree, size: 28 },
    ].filter(Boolean) as { key: string; absoluteDegree: number; size: number }[],
    labelWidth: 0, labelHeight: 0, obstacles: [],
  });
  const rows = triadRows(chart, detail);
  return (
    <div className="grid justify-items-center gap-2 min-w-0" data-side-blind={blind || undefined}>
      <svg viewBox={`0 0 ${W} ${W}`} className="block w-[min(220px,40vw)] h-auto" role="img" aria-label={`${person.name}: Sun, Moon and rising at their true positions${blind ? "; the horizon is not drawn" : ""}`}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={SKY} strokeOpacity={0.42} />
        {!blind && (
          <line
            x1={pointAt(cx, cy, R + 14, ascTheta).x.toFixed(1)} y1={pointAt(cx, cy, R + 14, ascTheta).y.toFixed(1)}
            x2={pointAt(cx, cy, R + 14, theta(frame + 180, frame)).x.toFixed(1)} y2={pointAt(cx, cy, R + 14, theta(frame + 180, frame)).y.toFixed(1)}
            stroke={SKY_DIM} strokeOpacity={0.55} strokeDasharray="2 5"
          />
        )}
        {arc && <path d={arc.d} fill="none" stroke={SKY} strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round" data-moon-arc />}
        {layout.bodies.map((b) => (
          <image key={b.key} href={b.key === "sun" ? SUN_HERO : PLANET_RENDERS[b.key]} x={b.x - b.size / 2} y={b.y - b.size / 2} width={b.size} height={b.size} />
        ))}
        {!blind && <AngleGlyphShape x={ascAt.x} y={ascAt.y} r={7} direction={ascTheta} stroke={SKY} fill="#0B0E14" strokeWidth={1.3} />}
      </svg>
      <p className="font-display text-[15px] text-[#F2F4F9] leading-tight text-center">{person.name}</p>
      <dl className="rp-legend" style={{ width: "auto" }}>
        {rows.map((row) => (
          <div key={row.key} className="lr">
            {row.key === "rising"
              ? <span aria-hidden className="rp-ascdot" />
              : <img src={row.key === "sun" ? SUN_HERO : PLANET_RENDERS[row.key]} alt="" width={22} height={22} />}
            <dt className="k">{row.label}</dt>
            <dd className={`v${row.blind ? " opacity-70" : ""}`}>{row.blind ? `rising · ${row.value}` : row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Corner({ person, side }: { person: PairPerson; side: "l" | "r" }) {
  const tob = timeOfBirthLabel({ birthTime: person.birthTime, birthTimeWindowMinutes: person.birthTimeWindowMinutes });
  return (
    <div className={`col${side === "r" ? " e" : ""}`}>
      <span className="live"><i />DOB · {dateText(person.birthDate)}</span>
      <span className="d">TOB · {tob}</span>
    </div>
  );
}

function CornerPlace({ person, side }: { person: PairPerson; side: "l" | "r" }) {
  return (
    <div className={`col${side === "r" ? " e" : ""}`}>
      <span>POB · {person.birthPlace}</span>
      <span className="d">{coordinate(person.latitude, "N", "S")} / {coordinate(person.longitude, "E", "W")}</span>
    </div>
  );
}

export function PairHero({ a, b, lens, accent }: PairHeroProps) {
  const reduced = useReducedMotion();
  const viewport = useViewport();
  const skyRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const selfSide: PairSide | null = a.isSelf && !b.isSelf ? "A" : b.isSelf && !a.isSelf ? "B" : null;
  const layout = pairHeroLayout({ viewportWidth: viewport.width, selfSide });
  const stack = pairStack(viewport.width, viewport.height);
  const left = layout.left === "A" ? a : b;
  const right = layout.left === "A" ? b : a;
  const info = lensInfo(lens);

  // The hero layer and the corners fade over the first 0.6 screens, as the natal hero's do.
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
    }
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; place(); });
    }
    place();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const eyebrow = `Compatibility report · ${info.title}`;
  const method = "whole-sign · tropical";

  return (
    <>
      <div ref={skyRef} className="rp-hsky rp-grain no-print narrow" style={{ alignContent: "center", gap: 18, padding: "16px 16px 84px" }}>
        <ReportSky variant="hero" accent={accent} opening />
        <div className="text-center px-2">
          <p className="font-label text-[10px] tracking-[0.28em] uppercase text-[var(--sky)] opacity-85">{eyebrow} · {method}</p>
          <h1 className="mt-3 font-display font-normal text-[clamp(28px,4.2vw,52px)] leading-[1.08] text-[#F2F4F9]" style={{ letterSpacing: "-0.02em" }}>
            <span className="block">{left.name}</span>
            <span className="block font-label text-[11px] tracking-[0.34em] uppercase text-[var(--sky)] my-2">and</span>
            <span className="block">{right.name}</span>
          </h1>
        </div>
        <div className={`grid gap-4 w-full max-w-[560px] ${stack.platesSideBySide ? "grid-cols-2" : "grid-cols-1"}`}>
          <Plate person={left} detail={layout.detail} />
          <Plate person={right} detail={layout.detail} />
        </div>
        <div ref={cueRef} className="rp-cue rp-cue-flow no-print">
          <button
            type="button"
            onClick={() => document.getElementById("chapter-1")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })}
            aria-label="Scroll to chapter 1"
          >
            Scroll<i aria-hidden />
          </button>
        </div>
      </div>

      <div ref={hudRef} className="rp-hud no-print" aria-hidden>
        <div className="fr" />
        <span className="br tl" /><span className="br tr" /><span className="br bl" /><span className="br brr" />
        <span className="tick l" /><span className="tick r" />
        <div className="r">
          <Corner person={left} side="l" />
          <Corner person={right} side="r" />
        </div>
        <div className="r b">
          <CornerPlace person={left} side="l" />
          <CornerPlace person={right} side="r" />
        </div>
      </div>

      <section className="rp-hero" aria-label="Opening">
        <header className="hidden print:block px-8 pt-12">
          <p className="font-label text-[10px] tracking-[0.28em] uppercase">{eyebrow} · {method}</p>
          <h1 className="font-display text-5xl mt-2">{left.name} and {right.name}</h1>
          <div className="mt-6 grid grid-cols-2 gap-8">
            {[left, right].map((p) => (
              <div key={p.name}>
                <p className="font-display text-xl">{p.name}</p>
                <p className="font-numeric text-xs mt-2">DOB · {dateText(p.birthDate)} · TOB · {timeOfBirthLabel({ birthTime: p.birthTime, birthTimeWindowMinutes: p.birthTimeWindowMinutes })}</p>
                <p className="font-numeric text-xs mt-1">POB · {p.birthPlace} · {coordinate(p.latitude, "N", "S")} / {coordinate(p.longitude, "E", "W")}</p>
                <p className="font-numeric text-xs mt-1">
                  {triadRows(p.chartData, "full").map((r) => `${r.label} ${r.blind ? "not drawn" : r.value}`).join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </header>
      </section>
    </>
  );
}

export default PairHero;
