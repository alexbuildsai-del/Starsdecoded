/**
 * The compatibility hero (ADR-70, ADR-99): no ring. One centred group under
 * the eyebrow "Compatibility report · {lens}": each person's name once,
 * heading its own column of three rows, Sun, Moon and rising with the natal
 * hero's renders, AND between; side by side from the measured width and
 * stacked on a phone; degree and sign on a phone, house and ruler from 640 px
 * up; the reader's own report on the left. A blind side reads "rising · not
 * drawn" and a Moon with a band shows its degree range. The cue sits clear of
 * the corners, which carry A's birth record on the left and B's on the right.
 * The hero keeps the starfield and blobs of its own sky and no gather; print
 * keeps the names over their rows and the corners and drops the sky. The
 * ringed plate the hero drew until R09 is TriadPlate, kept for the dashboard
 * sky card (MB-86).
 */
import { useEffect, useRef, useState } from "react";
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";
import { ReportSky } from "@/components/report/ReportSky";
import { NOT_DRAWN, pairHeroLayout, pairStack, rowText, triadRows, type PairSide } from "@/components/report/pair-hero-layout";
import { timeOfBirthLabel } from "@/lib/birth-time";
import { lensInfo } from "@/lib/lenses";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { ChartData, Lens } from "@/types/chart";

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

const NAME_CLASS = "font-display font-normal text-[clamp(28px,4.2vw,52px)] leading-[1.08] text-[#F2F4F9]";

/** One person's column: the name once, then the three rows at today's sizes. */
function Column({ person, detail }: { person: PairPerson; detail: "degree" | "full" }) {
  const blind = !person.chartData.angles;
  const rows = triadRows(person.chartData, detail);
  return (
    <div className="grid gap-2 min-w-0 justify-items-center" data-side-blind={blind || undefined}>
      <p className={`${NAME_CLASS} text-center`} style={{ letterSpacing: "-0.02em" }}>{person.name}</p>
      <dl className="rp-legend" style={{ width: "auto" }}>
        {rows.map((row) => (
          <div key={row.key} className="lr">
            {row.key === "rising"
              ? <span aria-hidden className="rp-ascdot" />
              : <img src={row.key === "sun" ? SUN_HERO : PLANET_RENDERS[row.key]} alt="" width={22} height={22} />}
            <dt className="k">{row.label}</dt>
            <dd className={`v${row.blind ? " opacity-70" : ""}`}>{rowText(row)}</dd>
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
  const and = <span className="font-label text-[11px] tracking-[0.34em] uppercase text-[var(--sky)]">and</span>;

  return (
    <>
      <div ref={skyRef} className="rp-hsky rp-grain no-print narrow" style={{ alignContent: "center", gap: 18, padding: "16px 16px 84px" }}>
        <ReportSky variant="hero" accent={accent} opening />
        <h1 className="sr-only">{left.name} and {right.name}</h1>
        <p className="font-label text-[10px] tracking-[0.28em] uppercase text-[var(--sky)] opacity-85 text-center px-2">{eyebrow}</p>
        {stack.columnsSideBySide ? (
          <div className="grid grid-cols-[auto_auto_auto] gap-x-6 items-start justify-center w-full" data-columns="side-by-side">
            <Column person={left} detail={layout.detail} />
            <div className="pt-[clamp(10px,1.6vw,22px)]">{and}</div>
            <Column person={right} detail={layout.detail} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 justify-items-center w-full" data-columns="stacked">
            <Column person={left} detail={layout.detail} />
            {and}
            <Column person={right} detail={layout.detail} />
          </div>
        )}
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
          <p className="font-label text-[10px] tracking-[0.28em] uppercase">{eyebrow}</p>
          <div className="mt-6 grid grid-cols-2 gap-8">
            {[left, right].map((p) => (
              <div key={p.name}>
                <p className="font-display text-4xl">{p.name}</p>
                <p className="font-numeric text-xs mt-3">
                  {triadRows(p.chartData, "full").map((r) => `${r.label} ${r.blind ? NOT_DRAWN : r.value}`).join(" · ")}
                </p>
                <p className="font-numeric text-xs mt-2">DOB · {dateText(p.birthDate)} · TOB · {timeOfBirthLabel({ birthTime: p.birthTime, birthTimeWindowMinutes: p.birthTimeWindowMinutes })}</p>
                <p className="font-numeric text-xs mt-1">POB · {p.birthPlace} · {coordinate(p.latitude, "N", "S")} / {coordinate(p.longitude, "E", "W")}</p>
              </div>
            ))}
          </div>
        </header>
      </section>
    </>
  );
}

export default PairHero;
