// The launch trailer, 30 s at 120 BPM, from the product's own components fed by the engine on every frame.
// Storyboard and rules: docs/specs/draft/launch-trailer.md. One clock (seconds); scenes overlap where they hand over.
import { useEffect, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { NatalWheel } from "@/components/chart/NatalWheel";
import { TwoPlates } from "@/site/components/TwoPlates";
import { TriadPlate } from "@/components/report/TriadPlate";
import { Placements } from "@/site/components/Placements";
import { HorizonWheel } from "@/site/components/HorizonWheel";
import { Chapter } from "@/components/report/Chapter";
import { EvidenceCard } from "@/components/report/EvidenceCard";
import { Mark } from "@/components/Mark";
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";
import { RINGS, MEAN_MOTION, DAYS_PER_SECOND } from "@/lib/orrery";
import { sampleSky } from "@/site/lib/sky";
import { samplePerson } from "@/site/data/people";
import type { Claim } from "@/types/chart";
import { arc, BAR, BEAT, clamp, DROP, FPS, inOut, kick, lerp, p, quadIn, win } from "./lib/motion";
import { ascOnWheel, bodyOnWheel, chartAt, clock, dayLine, ordinal, PLACE, polar, reading, rising, saturnOn, saturnReturn, tilt } from "./lib/sky";
import { C, Caption, F, Field, Finish, Layer, Readout, Reticle, Shock, Typed } from "./parts";

export interface TrailerProps { date: string; music: string | null }

const CX = 540, CY = 1010;
const GAP: [number, number] = [6 * BAR - BEAT, 6 * BAR];

// A line from Marie Curie's report, written blind (no birth time, so no houses: rule 8 allows her date alone).
// fixtures/passes/marie-curie.r05.json, sections.mind.claims[0], quoted whole.
const CURIE: Claim = {
  quote: "You notice the principle, the direction, and the implication fast, then you fill in the missing steps later.",
  evidence: [
    { label: "Mercury 6.6° Sagittarius", ref: { kind: "placement", body: "mercury", sign: "sagittarius" } },
    { label: "Moon square Mercury, 3.6° orb", ref: { kind: "aspect", type: "square", body1: "moon", body2: "mercury" } },
  ],
} as unknown as Claim;

function useReady() {
  const [handle] = useState(() => delayRender("fonts and renders"));
  useEffect(() => {
    const imgs = [...Object.values(PLANET_RENDERS), SUN_HERO].map((src) => { const i = new Image(); i.src = src; return i.decode().catch(() => undefined); });
    const fonts = ["400 100px Newsreader", "italic 400 100px Newsreader", "400 40px Inter", "500 40px 'Space Grotesk'", "400 40px 'IBM Plex Mono'", "500 40px 'IBM Plex Mono'"].map((f) => document.fonts.load(f));
    Promise.all([...imgs, ...fonts]).then(() => document.fonts.ready).then(() => continueRender(handle));
  }, [handle]);
}

function Wheel({ chart, size, centreName, style }: { chart: ReturnType<typeof chartAt>; size: number; centreName?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "absolute", left: -size / 2, top: -size / 2, width: size, height: size, transform: `rotate(${tilt(chart)}deg)`, ...style }}>
      <NatalWheel chartData={chart} selectedHouse={0} centreName={centreName} />
    </div>
  );
}

export const Trailer = ({ date, music }: TrailerProps) => {
  useReady();
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const k = kick(t, [GAP]);
  const natal = chartAt(date, "09:00");
  const twinMin = lerp(9 * 60, 21 * 60, p(t, 6 * BAR, 6 * BAR + 1.25, inOut));
  const twin = chartAt(date, clock(twinMin));

  return (
    <AbsoluteFill className="dark" style={{ background: C.void, overflow: "hidden", fontFamily: F.sans }}>
      {music ? <Audio src={staticFile(music)} /> : null}
      <Field t={t} drift={t / 30} glow={t < DROP ? 0.6 + 0.4 * p(t, 0, 2) : 1} />
      <Horizon t={t} />
      <Hook t={t} />
      <OrreryScene t={t} date={date} />
      <Shock t={t} at={DROP} x={CX} y={CY} />
      <Natal t={t} chart={natal} k={k} date={date} />
      <Twins t={t} natal={natal} twin={twin} twinMin={twinMin} />
      <FreeChart t={t} chart={natal} date={date} />
      <Report t={t} />
      <Pair t={t} k={k} />
      <Cycles t={t} date={date} natal={natal} />
      <End t={t} />
      <Finish frame={frame} />
    </AbsoluteFill>
  );
};

/** The brass horizon: drawn in the first second, quiet under the charts, bright again for the mark, and gone into its point. */
function Horizon({ t }: { t: number }) {
  const x0 = 92;
  const draw = p(t, 0.12, 0.95);
  const retract = p(t, 29.0, 29.85, inOut);
  const alpha = t < 2 ? 1 : t < 4 ? lerp(1, 0.28, p(t, 2, 2.6)) : t < 14 ? 0.32 : t < 24 ? lerp(0.32, 0.12, p(t, 14, 14.5)) : t < 27 ? lerp(0.12, 0.3, p(t, 24, 24.5)) : lerp(0.3, 1, p(t, 27, 27.6));
  const x1 = x0 + (1080 - x0) * draw * (1 - retract);
  const pointA = t < 2 ? 1 : t > 27.5 ? p(t, 27.5, 28.2) : Math.max(0, 1 - p(t, 2, 2.4));
  const glow = 0.5 + 0.5 * Math.sin(t * 5);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="hz" x1="0" x2="1">
          <stop offset="0" stopColor={C.brass} stopOpacity={0.95} />
          <stop offset="1" stopColor={C.brass} stopOpacity={0.25} />
        </linearGradient>
      </defs>
      <line x1={x0} x2={x1} y1={CY} y2={CY} stroke="url(#hz)" strokeWidth={2} opacity={alpha} />
      <circle cx={x0} cy={CY} r={22 + 6 * glow} fill={C.brass} opacity={0.12 * pointA} />
      <circle cx={x0} cy={CY} r={11} fill={C.brass} opacity={pointA} />
    </svg>
  );
}

/** 0:00 Your star sign is only your Sun. The Sun rises onto the horizon, then shrinks onto its ring. */
function Hook({ t }: { t: number }) {
  if (t > 2.3) return null;
  const rise = p(t, 0.2, 1.7);
  const shrink = p(t, 1.65, 2.15, inOut);
  const size = lerp(430, 60, shrink);
  const x = CX, y = lerp(lerp(CY + 240, CY - 170, rise), CY - RING_R.sun, shrink);
  return (
    <>
      <div style={{ position: "absolute", left: x - size * 1.3, top: y - size * 1.3, width: size * 2.6, height: size * 2.6, background: `radial-gradient(closest-side, rgba(255,190,110,${0.26 * rise * (1 - shrink)}), rgba(255,190,110,${0.08 * rise * (1 - shrink)}) 45%, transparent)`, opacity: 1 - p(t, 2.05, 2.2) }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: shrink > 0 ? 1920 : CY, overflow: "hidden", opacity: 1 - p(t, 2.05, 2.2) }}>
        <img src={SUN_HERO} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size }} />
      </div>
      <Caption t={t} at={0.15} out={2.25} lines={[["Your", "star", "sign"], ["is", "only", "your", { i: "Sun." }]]} />
    </>
  );
}

// The orrery's rings, the generation screen's order (lib/orrery.ts), Moon innermost.
const RING_R: Record<string, number> = Object.fromEntries(RINGS.map((b, i) => [b, 112 + i * 34]));
const SIZE: Record<string, number> = { moon: 56, mercury: 42, venus: 50, sun: 60, mars: 48, jupiter: 74, saturn: 84, chiron: 14, uranus: 54, neptune: 54, pluto: 38 };

/** 0:02 Here's the rest of you. The orrery sweeps faster and faster and lands every body on its true degree on the drop. */
function OrreryScene({ t, date }: { t: number; date: string }) {
  if (t < 1.9 || t > 4.9) return null;
  const chart = chartAt(date, "09:00");
  const asc = chart.angles!.ascendant.absoluteDegree;
  const V = 12;
  const virt = (tt: number) => V * clamp((tt - 2) / 2) ** 2.4;
  const deg = (body: string, tt: number) => {
    const pl = chart.planets[body];
    const dir = pl.retrograde ? -1 : 1;
    const m = Math.abs(MEAN_MOTION[body] ?? 0) * DAYS_PER_SECOND;
    if (tt < DROP) return pl.absoluteDegree - dir * m * (V - virt(tt));
    const s = tt - DROP, amp = Math.min(5, dir * m * 0.9);
    return pl.absoluteDegree + amp * Math.exp(-s * 7) * Math.sin(s * 24);
  };
  const off0 = 90 - deg("sun", 2), off1 = 180 - asc;
  const off = (tt: number) => off0 + arc(off0, off1) * p(tt, 2.0, 3.95, inOut);
  const screen = (body: string, tt: number) => deg(body, tt) + off(tt);
  const tiltX = Math.sin(Math.PI * p(t, 2.05, 3.95, inOut)) * 52;
  const appear = p(t, 1.95, 2.5);
  const leave = p(t, 4.05, 4.6);
  const scale = lerp(0.92, 1, appear) * lerp(1, 1.25, leave);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, perspective: 1600, opacity: 1 - leave, filter: `blur(${leave * 6}px)` }}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, transform: `rotateX(${tiltX}deg) scale(${scale})`, transformOrigin: `${CX}px ${CY}px` }}>
          {RINGS.map((b, i) => {
            const r = RING_R[b], c = 2 * Math.PI * r, u = p(t, 1.95 + i * 0.04, 2.6 + i * 0.04);
            return <circle key={b} cx={CX} cy={CY} r={r} fill="none" stroke={C.line} strokeWidth={1.4} strokeDasharray={c} strokeDashoffset={c * (1 - u)} transform={`rotate(${-90 - i * 18} ${CX} ${CY})`} />;
          })}
          <circle cx={CX} cy={CY} r={9} fill={C.indigo} opacity={appear} />
          {RINGS.map((b) => {
            if (!chart.planets[b]) return null;
            const r = RING_R[b];
            const now = screen(b, t), then = screen(b, t - 0.16);
            const sweep = clamp(Math.abs(now - then), 0, 300) * Math.sign(now - then);
            const segs = 8;
            return (
              <g key={b} opacity={b === "sun" ? p(t, 2.0, 2.12) : appear}>
                {Array.from({ length: segs }, (_, s) => {
                  const a0 = now - (sweep * s) / segs, a1 = now - (sweep * (s + 1)) / segs;
                  const P0 = polar(r, a0), P1 = polar(r, a1);
                  return <line key={s} x1={CX + P0.x} y1={CY + P0.y} x2={CX + P1.x} y2={CY + P1.y} stroke={C.indigoLt} strokeWidth={SIZE[b] * 0.35 * (1 - s / segs)} strokeLinecap="round" opacity={0.45 * (1 - s / segs) * clamp(Math.abs(sweep) / 6)} />;
                })}
                {PLANET_RENDERS[b] ? (
                  <image href={PLANET_RENDERS[b]} x={CX + polar(r, now).x - SIZE[b] / 2} y={CY + polar(r, now).y - SIZE[b] / 2} width={SIZE[b]} height={SIZE[b]} />
                ) : (
                  <circle cx={CX + polar(r, now).x} cy={CY + polar(r, now).y} r={6} fill={C.brass} />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <Caption t={t} at={2.1} out={3.85} lines={[["Here's", "the", "rest"], ["of", { i: "you." }]]} />
    </>
  );
}

const W_MAIN = 940;
/** 0:04 to 0:10. The wheel lands on the drop, then the camera finds the Sun, the Moon and the Ascendant. */
function Natal({ t, chart, k, date }: { t: number; chart: ReturnType<typeof chartAt>; k: number; date: string }) {
  if (t < DROP - 0.05 || t > 10.95) return null;
  const sun = bodyOnWheel(chart, "sun", W_MAIN), moon = bodyOnWheel(chart, "moon", W_MAIN), asc = ascOnWheel(W_MAIN);
  // The camera: keys of (time, scale, focus), eased between.
  const keys: [number, number, { x: number; y: number }][] = [
    [6.0, 1, { x: 0, y: 0 }], [6.55, 1.75, sun], [7.45, 1.75, sun], [8.0, 1.75, moon], [8.9, 1.75, moon],
    [9.45, 1.45, asc], [9.9, 1.45, asc], [10.4, 1, { x: 0, y: 0 }],
  ];
  const cam = (tt: number) => {
    if (tt <= keys[0][0]) return { s: 1, x: 0, y: 0 };
    for (let i = 1; i < keys.length; i++) {
      const [ta, sa, fa] = keys[i - 1], [tb, sb, fb] = keys[i];
      if (tt <= tb) { const u = p(tt, ta, tb, inOut); return { s: lerp(sa, sb, u), x: lerp(fa.x, fb.x, u), y: lerp(fa.y, fb.y, u) }; }
    }
    return { s: 1, x: 0, y: 0 };
  };
  const a = cam(t), b = cam(t - 1 / FPS);
  const speed = Math.hypot((a.x - b.x) * a.s, (a.y - b.y) * a.s) + Math.abs(a.s - b.s) * 400;
  const reveal = p(t, DROP, DROP + 0.85, (u) => u);
  const spin = lerp(-26, 0, p(t, DROP, DROP + 1.3));
  const land = lerp(1.1, 1, p(t, DROP, DROP + 1.3));
  const fade = 1 - p(t, 10.25, 10.6);
  const pulse = 1 + 0.008 * k;
  const ch = chart;
  const s = reading(ch, "sun"), m = reading(ch, "moon"), r = rising(ch);
  return (
    <>
      <Layer style={{ opacity: fade }}>
        <div style={{
          position: "absolute", left: CX, top: CY,
          transform: `scale(${a.s * pulse}) translate(${-a.x}px, ${-a.y}px)`,
          filter: `blur(${Math.min(7, speed * 0.12)}px)`,
        }}>
          <div style={{
            position: "absolute", left: 0, top: 0, transform: `rotate(${spin}deg) scale(${land})`,
          }}>
            <Wheel chart={ch} size={W_MAIN} style={{ WebkitMaskImage: reveal < 1 ? `conic-gradient(from 270deg at 50% 50%, #000 ${reveal * 360}deg, transparent ${reveal * 360 + 0.5}deg)` : undefined }} />
          </div>
        </div>
        {/* A scrim keeps the captions off the wheel while the camera is in close (G5). */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 760, background: "linear-gradient(#06080C 40%, rgba(6,8,12,.0))", opacity: p(t, 5.9, 6.3) * (1 - p(t, 9.8, 10.2)) }} />
      </Layer>
      <Layer style={{ opacity: 1 - p(t, 5.75, 6.05) }}>
        <Typed t={t} at={4.45} text={`BORN ${dayLine(date)} · 09:00 · ${PLACE.city.toUpperCase()}`} style={{ position: "absolute", left: 92, top: 300, fontSize: 40, color: C.brass }} />
        <Typed t={t} at={4.95} text="WHOLE SIGN · TROPICAL · 48.86°N 2.35°E" style={{ position: "absolute", left: 92, top: 362, fontSize: 26, color: C.muted }} />
      </Layer>
      <Caption t={t} at={6.05} out={9.85} lines={[["Every", "planet,"], ["to", "the", { i: "degree." }]]} />
      {[
        { a: 6.5, b: 7.5, el: <Readout t={t} at={6.62} label="SUN" value={s.degree} unit={s.sign} sub={s.house} /> },
        { a: 7.95, b: 8.95, el: <Readout t={t} at={8.07} label="MOON" value={m.degree} unit={m.sign} sub={m.house} /> },
        { a: 9.4, b: 10.0, el: <Readout t={t} at={9.5} label="RISING" value={r.degree} unit={r.sign} sub="DUE EAST, ON THE HORIZON" brass /> },
      ].map(({ a: ta, b: tb, el }, i) => {
        const on = win(t, ta, tb, 0.2, 0.22);
        if (on <= 0) return null;
        return (
          <Layer key={i} style={{ opacity: on }}>
            <Reticle t={t} at={ta} x={CX} y={CY} r={i === 2 ? 34 : 64} color={i === 2 ? C.brass : C.paper} />
            <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
              <line x1={CX} y1={CY + 96} x2={CX} y2={CY + 96 + 90 * p(t, ta + 0.1, ta + 0.4)} stroke={i === 2 ? C.brass : C.dim} strokeWidth={1.5} />
            </svg>
            <div style={{ position: "absolute", left: 150, right: 150, top: CY + 190, padding: "30px 0 34px", background: "rgba(6,8,12,.86)", border: `1px solid ${C.line}`, borderRadius: 30, boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}>{el}</div>
          </Layer>
        );
      })}
    </>
  );
}

const W_TWIN = 500;
/** 0:10 Same birthday, twelve hours apart. A silent beat, then the second sky turns half a day. */
function Twins({ t, natal, twin, twinMin }: { t: number; natal: ReturnType<typeof chartAt>; twin: ReturnType<typeof chartAt>; twinMin: number }) {
  if (t < 10.15 || t > 14.6) return null;
  const go = p(t, 10.2, 10.95);
  const split = p(t, 10.4, 11.15);
  const scaleA = lerp(W_MAIN / W_TWIN, 1, go);
  const ax = lerp(CX, CX - 262, split), bx = lerp(CX, CX + 262, split);
  const through = p(t, 13.85, 14.45, quadIn);
  const zoom = lerp(1, 2.6, through);
  const out = 1 - through;
  const blur = through * 22;
  const hold = t >= GAP[0] && t < GAP[1] ? 1 + 0.015 * p(t, GAP[0], GAP[1]) : 1;
  const landed = p(t, 6 * BAR + 1.25, 6 * BAR + 1.6);
  const label = (x: number, c: ReturnType<typeof chartAt>, min: number, hot: number) => (
    <div style={{ position: "absolute", left: x - 260, width: 520, top: CY + 290, display: "grid", justifyItems: "center", gap: 12, opacity: p(t, 11.0, 11.4) * (1 - p(t, 13.7, 14.0)) }}>
      <div style={{ fontFamily: F.mono, fontSize: 64, color: C.paper, fontVariantNumeric: "tabular-nums" }}>{clock(min)}</div>
      <div style={{ fontFamily: F.mono, fontSize: 27, letterSpacing: "0.08em", color: hot ? C.brass : C.dim, borderBottom: `2px solid rgba(212,176,106,${hot})`, paddingBottom: 6 }}>
        RISING {rising(c).degree.toFixed(2)}° {rising(c).sign}
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 27, letterSpacing: "0.08em", color: hot ? C.paper : C.dim }}>SUN IN THE {ordinal(c.planets.sun.house ?? 1)} HOUSE</div>
    </div>
  );
  return (
    <>
      <Layer style={{ opacity: out, filter: `blur(${blur}px)`, transform: `scale(${zoom * hold})`, transformOrigin: `${CX}px ${CY}px` }}>
        <div style={{ position: "absolute", left: ax, top: CY, transform: `scale(${scaleA})` }}>
          <Wheel chart={natal} size={W_TWIN} centreName="09:00" />
        </div>
        <div style={{ position: "absolute", left: bx, top: CY, opacity: split }}>
          <Wheel chart={twin} size={W_TWIN} centreName={clock(twinMin)} />
        </div>
      </Layer>
      {label(CX - 262, natal, 9 * 60, 0)}
      {label(CX + 262, twin, twinMin, landed)}
      <Caption t={t} at={10.3} out={13.8} lines={[["Same", "birthday."], ["Twelve", "hours", { i: "apart." }]]} />
    </>
  );
}

/** 0:14 Your chart, free. The free chart's own parts float in from depth on the beat. */
function FreeChart({ t, chart, date }: { t: number; chart: ReturnType<typeof chartAt>; date: string }) {
  if (t < 13.9 || t > 18.5) return null;
  const birth = { birthDate: date, birthTime: "09:00", latitude: PLACE.lat, longitude: PLACE.lon, timezone: PLACE.zone, timezoneOffset: 2 };
  const sky = sampleSky("Born today", "Paris, France", birth, chart);
  const leave = p(t, 17.75, 18.3, quadIn);
  // A carousel on the beat: the live wheel, then the triad, then every placement, each taking the front in turn.
  const focus = p(t, 15.0, 15.55, inOut) + p(t, 16.0, 16.55, inOut);
  const cards: [number, React.ReactNode][] = [
    [700, <HorizonWheel sky={sky} arrival="still" hud />],
    [560, <div className="rp-root" style={{ background: "transparent", display: "grid", justifyItems: "center", gap: 18, padding: "10px 0" }}>
      <TriadPlate chart={chart} name="Born today" className="block w-[400px] h-auto" />
      <div style={{ display: "grid", gap: 8, justifyItems: "center", fontFamily: F.mono, fontSize: 24, letterSpacing: "0.08em", color: C.dim }}>
        <span>SUN {chart.planets.sun.degree.toFixed(2)}° {chart.planets.sun.sign.toUpperCase()}</span>
        <span>MOON {chart.planets.moon.degree.toFixed(2)}° {chart.planets.moon.sign.toUpperCase()}</span>
        <span style={{ color: C.brass }}>RISING {chart.angles!.ascendant.degree.toFixed(2)}° {chart.angles!.ascendant.sign.toUpperCase()}</span>
      </div>
    </div>],
    [640, <Placements chart={chart} caption="Born today, 09:00, Paris" />],
  ];
  const enter = p(t, 14.0, 14.85);
  return (
    <>
      <Layer style={{ perspective: 2000, opacity: 1 - leave, transform: `translateY(${-leave * 260}px)`, filter: `blur(${leave * 12}px)` }}>
        <div className="sd" style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", background: "transparent" }}>
          {cards.map(([w, body], i) => {
            const d = i - focus;
            const ad = Math.abs(d);
            const z = lerp(-1600, 0, enter) - ad * 520;
            return (
              <div key={i} style={{
                position: "absolute", left: CX - w / 2, top: CY + 60, width: w,
                transform: `translate3d(${d * 470}px, -50%, ${z}px) rotateY(${-d * 32}deg) translateY(${Math.sin((t - 14) * Math.PI) * 5}px)`,
                opacity: clamp(enter * 1.4) * clamp(1 - ad * 0.55), filter: `blur(${ad * 3 + (1 - enter) * 10}px)`, zIndex: 10 - Math.round(ad * 3),
                background: C.ground, border: `1px solid ${C.line}`, borderRadius: 34, padding: 26, boxShadow: "0 40px 120px rgba(0,0,0,.65)",
              }}>{body}</div>
            );
          })}
        </div>
      </Layer>
      <Caption t={t} at={14.1} out={17.85} lines={[["Your", "chart,", "free."], [{ i: "Nothing" }, { i: "you" }, { i: "type" }], [{ i: "is" }, { i: "saved." }]]} size={92} />
    </>
  );
}

/** 0:18 Then a report. A real line lights its citation and its evidence card rises: claims, not vibes. */
function Report({ t }: { t: number }) {
  if (t < 17.8 || t > 22.4) return null;
  const rise = p(t, 18.0, 18.9);
  const leave = p(t, 21.7, 22.2, quadIn);
  const under = p(t, 19.0, 19.7, inOut);
  const card = p(t, 19.75, 20.45);
  const sup = Math.exp(-Math.max(0, t - 19.65) * 4) * (t > 19.65 ? 1 : 0);
  return (
    <>
      <Layer style={{ perspective: 1800, opacity: (1 - leave) * clamp(rise * 1.4), filter: `blur(${(1 - rise) * 10 + leave * 14}px)` }}>
        <div style={{
          position: "absolute", left: 90, width: 900, top: 640,
          transform: `translateY(${(1 - rise) * 240 - leave * 120}px) rotateX(${lerp(26, 7, rise) - 4 * p(t, 19, 22)}deg) scale(${1 - leave * 0.1})`, transformOrigin: "50% 0%",
        }}>
          <div style={{ fontFamily: F.mono, fontSize: 24, letterSpacing: "0.16em", color: C.muted, marginBottom: 26 }}>FROM MARIE CURIE'S REPORT · BORN 7 NOV 1867 · TIME UNKNOWN</div>
          <div className="rp-root" style={{ background: C.ground, border: `1px solid ${C.line}`, borderRadius: 34, padding: "40px 46px 46px", fontSize: 30, boxShadow: "0 50px 140px rgba(0,0,0,.6)" }}>
            <Chapter number={3} total={10} eyebrow="Mind" title="Mind & Communication">
              <div style={{ fontFamily: F.label, fontSize: 22, letterSpacing: "0.18em", color: C.indigoLt, margin: "18px 0 14px" }}>HOW YOU THINK</div>
              <p style={{ fontFamily: F.serif, fontSize: 44, lineHeight: 1.32, color: C.paper, margin: 0, position: "relative" }}>
                <span style={{ backgroundImage: `linear-gradient(${C.brass}, ${C.brass})`, backgroundSize: `${under * 100}% 2px`, backgroundRepeat: "no-repeat", backgroundPosition: "0 100%" }}>
                  {CURIE.quote}
                </span>
                <sup style={{ fontFamily: F.mono, fontSize: 24, color: C.brass, marginLeft: 6, padding: "2px 8px", borderRadius: 99, boxShadow: `0 0 0 ${2 + sup * 14}px rgba(212,176,106,${0.15 + sup * 0.35})` }}>1</sup>
              </p>
            </Chapter>
          </div>
          <div className="rp-card" style={{
            position: "relative", inset: "auto", marginTop: 16, transform: `translateY(${(1 - card) * 120}px)`, opacity: card, filter: `blur(${(1 - card) * 8}px)`,
            padding: 22, borderRadius: 28, boxShadow: "0 40px 120px rgba(0,0,0,.7)", zoom: 1.75, width: 440, marginLeft: 70,
          }}>
            <EvidenceCard claim={CURIE} />
          </div>
        </div>
      </Layer>
      <Caption t={t} at={18.1} out={21.8} lines={[["Then", "a", "report", "on"], ["how", "you", { i: "think," }, { i: "work" }, { i: "and" }, { i: "love." }]]} size={88} />
    </>
  );
}

/** 0:22 Two people: the two plates on one horizon, sliding together on the downbeat. No score. */
function Pair({ t, k }: { t: number; k: number }) {
  if (t < 21.9 || t > 24.5) return null;
  const a = samplePerson("mira"), b = samplePerson("tomas");
  if (!a || !b) return null;
  const u = p(t, 22.0, 22.75);
  const leave = p(t, 23.8, 24.3, quadIn);
  const half = (side: "l" | "r") => (
    <div style={{ position: "absolute", inset: 0, clipPath: side === "l" ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)", transform: `translateX(${(side === "l" ? -1 : 1) * (1 - u) * 180}px)` }}>
      <div className="sd" style={{ position: "absolute", left: 10, width: 1060, top: CY - 220, background: "transparent" }}>
        <TwoPlates a={{ name: a.name.split(" ")[0], chart: a.chart }} b={{ name: b.name.split(" ")[0], chart: b.chart }} />
      </div>
    </div>
  );
  return (
    <>
      <Layer style={{ opacity: clamp(u * 1.4) * (1 - leave), filter: `blur(${(1 - u) * 8 + leave * 16}px)`, transform: `scale(${lerp(1.08, 1, u) * (1 + leave * 0.4)})`, transformOrigin: `${CX}px ${CY}px` }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(22% 14% at 50% ${CY / 19.2}%, rgba(149,117,205,${0.28 + 0.12 * k}), transparent 70%)` }} />
        {half("l")}
        {half("r")}
        <div style={{ position: "absolute", left: 0, right: 0, top: CY + 300, textAlign: "center", fontFamily: F.mono, fontSize: 24, letterSpacing: "0.2em", color: C.muted }}>SAMPLE PEOPLE</div>
      </Layer>
      <Caption t={t} at={22.05} out={23.85} lines={[["And", "how", "the", "two"], ["of", "you", { i: "get" }, { i: "along." }]]} size={96} />
    </>
  );
}

/** 0:24 Coming soon: the big cycles. Saturn walks its real path round the chart until it comes home, at 29. */
function Cycles({ t, date, natal }: { t: number; date: string; natal: ReturnType<typeof chartAt> }) {
  if (t < 23.9 || t > 27.8) return null;
  const asc = natal.angles!.ascendant.absoluteDegree;
  const natalSat = natal.planets.saturn.absoluteDegree;
  const hit = saturnReturnMemo(date, natalSat);
  const birth = new Date(`${date}T12:00:00Z`).getTime(), end = new Date(`${hit}T12:00:00Z`).getTime();
  const run = p(t, 24.45, 26.15, inOut);
  const at = (u: number) => new Date(lerp(birth, end, u)).toISOString().slice(0, 10);
  const R = 345;
  const ang = (d: number) => 180 + d - asc;
  const steps = 90;
  const trail = Array.from({ length: Math.max(2, Math.round(steps * run)) }, (_, i) => {
    const P = polar(R, ang(saturnOn(at((i / steps)))));
    return `${CX + P.x},${CY + 40 + P.y}`;
  }).join(" ");
  const now = polar(R, ang(saturnOn(at(run))));
  const home = polar(R, ang(natalSat));
  const appear = p(t, 24.0, 24.7);
  const collapse = p(t, 27.0, 27.6, inOut);
  const landed = p(t, 26.15, 26.5);
  const year = Math.floor(lerp(new Date(birth).getUTCFullYear() + new Date(birth).getUTCMonth() / 12, new Date(end).getUTCFullYear() + new Date(end).getUTCMonth() / 12, run));
  const age = Math.floor((lerp(birth, end, run) - birth) / (365.25 * 864e5));
  return (
    <>
      <Layer style={{ opacity: appear * (1 - collapse), transform: `scale(${lerp(0.9, 1, appear) * lerp(1, 0.25, collapse)})`, transformOrigin: `${CX}px ${CY + 40}px`, filter: `blur(${collapse * 6}px)` }}>
        <div style={{ position: "absolute", left: CX, top: CY + 40 }}>
          <Wheel chart={natal} size={560} centreName="Born today" />
        </div>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <circle cx={CX} cy={CY + 40} r={R} fill="none" stroke="#1A202C" strokeWidth={1.5} />
          {Array.from({ length: 12 }, (_, i) => { const A = polar(R - 10, i * 30 + 180 - (asc % 30)), B = polar(R + 10, i * 30 + 180 - (asc % 30)); return <line key={i} x1={CX + A.x} y1={CY + 40 + A.y} x2={CX + B.x} y2={CY + 40 + B.y} stroke={C.line} strokeWidth={2} />; })}
          <polyline points={trail} fill="none" stroke={C.indigoLt} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
          <circle cx={CX + home.x} cy={CY + 40 + home.y} r={10} fill={C.brass} />
          <circle cx={CX + home.x} cy={CY + 40 + home.y} r={10 + landed * 60} fill="none" stroke={C.brass} strokeWidth={2} opacity={landed > 0 ? 1 - landed : 0} />
          <image href={PLANET_RENDERS.saturn} x={CX + now.x - 34} y={CY + 40 + now.y - 34} width={68} height={68} />
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, top: CY + 40 + R + 50, display: "grid", justifyItems: "center", gap: 10 }}>
          <div style={{ fontFamily: F.mono, fontSize: 44, color: landed ? C.brass : C.paper, fontVariantNumeric: "tabular-nums" }}>{year} · AGE {age}</div>
          <div style={{ fontFamily: F.mono, fontSize: 26, letterSpacing: "0.12em", color: C.brass, opacity: landed }}>FIRST SATURN RETURN · {dayLine(hit)}</div>
        </div>
      </Layer>
      <div style={{ position: "absolute", left: 92, top: 250, opacity: win(t, 24.0, 26.9, 0.3, 0.3) }}>
        <span style={{ fontFamily: F.label, fontSize: 26, letterSpacing: "0.2em", color: C.paper, border: `1.5px solid ${C.indigo}`, borderRadius: 99, padding: "10px 22px" }}>COMING SOON · TIMELINE AND ASK</span>
      </div>
      <Caption t={t} at={24.15} out={26.95} top={330} lines={[["The", "big", "cycles"], ["of", "your", { i: "life." }]]} />
    </>
  );
}
const memo = new Map<string, string>();
function saturnReturnMemo(date: string, natalSat: number) {
  const key = `${date}`;
  if (!memo.has(key)) memo.set(key, saturnReturn(date, natalSat));
  return memo.get(key)!;
}

/** 0:27 Everything folds into the mark; the name; the line; then only the brass point on the horizon, where it began. */
function End({ t }: { t: number }) {
  if (t < 26.9) return null;
  const ring = p(t, 27.05, 27.75);
  const fade = 1 - p(t, 29.0, 29.6, inOut);
  const letters = "Stars Decoded".split("");
  return (
    <Layer style={{ opacity: fade }}>
      <div style={{
        position: "absolute", left: CX - 150, top: CY - 150, width: 300, height: 300, color: C.indigo,
        opacity: ring, transform: `scale(${lerp(0.6, 1, ring)}) rotate(${lerp(-40, 0, ring)}deg)`,
        WebkitMaskImage: `conic-gradient(from 270deg, #000 ${ring * 360}deg, transparent ${ring * 360 + 0.5}deg)`,
      }}>
        <Mark className="w-full h-full" />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: CY + 230, textAlign: "center", fontFamily: F.serif, fontSize: 112, color: C.paper, letterSpacing: "-0.01em" }}>
        {letters.map((ch, i) => {
          const u = p(t, 27.45 + i * 0.03, 28.1 + i * 0.03);
          return <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: u, transform: `translateY(${(1 - u) * 40}px)`, filter: `blur(${(1 - u) * 10}px)` }}>{ch}</span>;
        })}
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: CY + 380, textAlign: "center", fontFamily: F.serif, fontSize: 42, lineHeight: 1.25, color: C.dim, opacity: p(t, 27.95, 28.5), transform: `translateY(${(1 - p(t, 27.95, 28.5)) * 20}px)` }}>
        Find out what your birth chart says about you.
      </div>
      <Typed t={t} at={28.35} text="GET YOUR FREE CHART · MYSTARSDECODED.COM" rate={60} style={{ position: "absolute", left: 0, right: 0, top: CY + 470, textAlign: "center", fontSize: 28, color: C.brass }} />
    </Layer>
  );
}
