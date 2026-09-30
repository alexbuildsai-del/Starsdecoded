/**
 * The home page's first screen (landing scope 2, 3, 15, 16; ADR-107, 108): the
 * locked heading and lede, the sky now over the visitor's city on the
 * product's wheel, and the sky form. Show my chart opens the sky screen; when
 * it closes, the wheel keeps the birth's sky and the form gives way to that
 * chart's summary until the reader tries another date.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { GATHER_MAX, GATHER_SECONDS, landing, planGather, type Ring } from "@/lib/gather";
import { visitorZone } from "@/lib/sky-now";
import { ReportCta } from "@/site/cta";
import { HorizonWheel, RING_SHARE } from "@/site/components/HorizonWheel";
import { SkyForm } from "@/site/components/SkyForm";
import { birthSky, ease, keyCount, plainLine, skyNow, summaryLine, type Sky, type SkyBirth } from "@/site/lib/sky";
import { useLiveSky } from "@/site/lib/useLiveSky";
import { pageFor } from "../site";
import SkyScreen, { useKeepForForm } from "./SkyScreen";

const home = pageFor("/");

// Visibility flips at once, so the face coming in can take focus in the same commit; only its opacity eases.
const face = (on: boolean) =>
  `grid [grid-area:1/1] transition-[opacity,transform] duration-[350ms] ease-[cubic-bezier(.16,1,.3,1)] ${on ? "" : "invisible pointer-events-none translate-y-1.5 opacity-0"}`;

export default function Hero() {
  const [kept, setKept] = useState<Sky | null>(null);
  const [screen, setScreen] = useState<{ from: Sky; to: Sky; frames: number } | null>(null);
  const live = useLiveSky(kept !== null || screen !== null);
  const hero = useRef<HTMLElement>(null);
  const square = useRef<HTMLDivElement | null>(null);
  const dateField = useRef<HTMLInputElement | null>(null);
  const summary = useRef<HTMLDivElement>(null);
  const focusNext = useRef<"summary" | "date" | null>(null);
  const keepForForm = useKeepForForm(kept?.birth);

  useEffect(() => {
    const target = focusNext.current === "summary" ? summary.current : focusNext.current === "date" ? dateField.current : null;
    focusNext.current = null;
    target?.focus({ preventScroll: true });
  }, [kept, screen]);

  // The birth's chart is timed as it is worked out: its cost says how many rewind frames this device can ready in the lift.
  const show = (birth: SkyBirth) => {
    const from = kept ?? live ?? skyNow(new Date(), visitorZone());
    const started = performance.now();
    const to = birthSky(birth);
    setScreen({ from, to, frames: keyCount(performance.now() - started) });
  };

  const closed = (keep: boolean) => {
    focusNext.current = keep ? "summary" : "date";
    setKept(keep && screen ? screen.to : null);
    setScreen(null);
  };

  const again = () => {
    focusNext.current = "date";
    setKept(null);
  };

  // Clipped sideways for the horizon's run to the page's edges, but not downwards, where the place list opens over the
  // section below.
  return (
    <section ref={hero} className="sd-hero" style={{ overflowY: "visible", zIndex: 1 }}>
      <Gather host={hero} square={square} start={live !== null} />
      <div className="sd-wrap sd-hero-grid">
        <div className="sd-h-top">
          <p className="sd-eyebrow">{home.eyebrow}</p>
          <h1 className="sd-h1">{home.h1}</h1>
        </div>
        <div className="sd-h-wheel">
          <HorizonWheel sky={kept ?? live} arrival="intro" hud hidden={screen !== null} squareRef={square} />
        </div>
        <div className="sd-h-bot">
          <p className="sd-lede">{home.lede}</p>
          {/* Both faces hold the one cell, so the panel keeps the form's height and the wheel lands where it left. */}
          <div className="sd-panel">
            <div className="grid">
              <div className={face(!kept)} inert={kept ? true : undefined}>
                <SkyForm onShow={show} dateRef={dateField} />
              </div>
              <div ref={summary} tabIndex={-1} className={`${face(Boolean(kept))} content-start gap-3.5 outline-none`} inert={kept ? undefined : true}>
                {kept?.birth ? (
                  <>
                    <div className="sd-row">
                      <p className="sd-eyebrow">Your chart</p>
                      <span className="sd-tag">{summaryLine(kept.birth)}</span>
                    </div>
                    <p className="font-[family-name:var(--f-display)] text-[clamp(22px,2.3vw,28px)] leading-[1.18] text-[color:var(--paper)]">{plainLine(kept.chart)}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="contents" onClickCapture={keepForForm}>
                        <ReportCta source="hero-chart" className="sd-btn" />
                      </span>
                      <button type="button" className="sd-btn sd-btn-g" onClick={again}>
                        Try another date
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
      {screen ? <SkyScreen from={screen.from} to={screen.to} frames={screen.frames} origin={square} onClosed={closed} /> : null}
    </section>
  );
}

/**
 * First light's stars (landing scope 15): as the report's hero does, about 70%
 * of the field glides onto the ring and stays (ADR-47, ADR-59), here on the
 * site's one easing. The plan is the report's own; a resize re-projects the
 * ring without re-seeding the field.
 */
function Gather({ host, square, start }: { host: RefObject<HTMLElement | null>; square: RefObject<HTMLDivElement | null>; start: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const cv = canvas.current;
    const box = host.current;
    const wheel = square.current;
    const ctx = cv?.getContext("2d");
    if (!start || !cv || !box || !wheel || !ctx) return;
    const stars = Array.from({ length: GATHER_MAX }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.45 + Math.random() * 1.05,
      a: 0.22 + Math.random() * 0.6,
      cool: Math.random() < 0.3,
    }));
    let w = 0;
    let h = 0;
    const ring = (): Ring => {
      const b = box.getBoundingClientRect();
      const s = wheel.getBoundingClientRect();
      return { cx: s.left - b.left + s.width / 2, cy: s.top - b.top + s.height / 2, r: s.width * RING_SHARE + 12 };
    };
    const measure = () => {
      const b = box.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = b.width;
      h = b.height;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    measure();
    const plan = planGather(stars.map((s) => ({ x: s.x * w, y: s.y * h })), ring());
    const moving = new Map(plan.moves.map((m) => [m.index, m]));
    let k = reduced ? 1 : 0;
    const paint = () => {
      ctx.clearRect(0, 0, w, h);
      const now = ring();
      const e = ease(k);
      stars.forEach((s, i) => {
        const move = moving.get(i);
        let x = s.x * w;
        let y = s.y * h;
        if (move) {
          const to = landing(move, now);
          x = move.from.x + (to.x - move.from.x) * e;
          y = move.from.y + (to.y - move.from.y) * e;
        }
        ctx.globalAlpha = move ? s.a * (0.55 + 0.45 * e) : s.a * 0.7;
        ctx.fillStyle = s.cool ? "#C5CAE9" : "#FFFFFF";
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      k = Math.min(1, (t - t0) / 1000 / GATHER_SECONDS);
      paint();
      if (k < 1) raf = requestAnimationFrame(step);
    };
    if (reduced) paint();
    else raf = requestAnimationFrame(step);
    const resized = new ResizeObserver(() => {
      measure();
      paint();
    });
    resized.observe(box);
    return () => {
      cancelAnimationFrame(raf);
      resized.disconnect();
    };
  }, [start, reduced, host, square]);

  return <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}
