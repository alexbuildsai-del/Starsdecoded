// The v5 proof: the trailer's opening and the Personal report in the reference's grammar. One shot,
// no scene cuts: the Sun sits in the first sentence, bursts into every body, the bodies land on the real
// wheel, the wheel becomes the bubble the report's chapters rotate through, and the bubble becomes the Mark.
// Timing lives in opening.json, which score/sfx.mjs reads too.
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { NatalWheel } from "@/components/chart/NatalWheel";
import { Mark } from "@/components/Mark";
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";
import { brand, clamp, inOut, lerp, p, quadIn, rng } from "../lib/motion";
import { bodyOnWheel, chartAt } from "../lib/sky";
import { useClock } from "../lib/useClock";
import { C, F, Field, Finish } from "../parts";
import { Chip, Glow, Sentence, slot, spring, typed, useReady, type SentenceSpec } from "./kit";
import TL from "./opening.json";

export interface OpeningProps { date: string; music: string | null }

const CX = 540, CY = 960;
const HOOK = TL.hook as SentenceSpec, REST = TL.rest as SentenceSpec, REPORT = TL.report as SentenceSpec;
const BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const WHEEL = { x: CX, y: 1080, w: 900 };
const BUBBLE = { x: CX, y: 650, d: 236 };

export const Opening = ({ date, music }: OpeningProps) => {
  const ready = useReady();
  const t = useClock();
  if (!ready) return <AbsoluteFill style={{ background: C.void }} />;
  return (
    <AbsoluteFill className="dark" style={{ background: C.void, overflow: "hidden", fontFamily: F.sans }}>
      {music ? <Audio src={staticFile(music)} /> : null}
      <Field t={t} drift={t / 30} glow={0.5} />
      <Glow t={t} strength={lerp(0.35, 1, p(t, 0, 2))} />
      <Hook t={t} />
      <Burst t={t} date={date} />
      <Wheel t={t} date={date} />
      <Sentence t={t} spec={REST} />
      <Report t={t} />
      <End t={t} />
      <Finish frame={Math.round(t * 30)} />
    </AbsoluteFill>
  );
};

/** The Sun alone, then a sentence builds around it with the Sun in its place; then it steps out to the centre. */
function Hook({ t }: { t: number }) {
  if (t > TL.burst.at + 0.1) return null;
  const s = slot(t, HOOK, "sun")!;
  const join = p(t, 0.3, 1.1, brand);
  const leave = p(t, HOOK.out! + 0.1, TL.burst.at - 0.1, inOut);
  const x = lerp(s.x, CX, leave), y = lerp(s.y, CY, leave);
  const size = lerp(lerp(250, 112, join), 230, leave) * spring(t, { freq: 1.8, bounce: 0.4 });
  const pulse = 1 - 0.12 * Math.sin(Math.PI * p(t, TL.burst.at - 0.25, TL.burst.at + 0.05, (u) => u));
  return (
    <>
      <Sentence t={t} spec={HOOK} />
      <Sun x={x} y={y} size={size * pulse} glow={1 - join * 0.6 + leave * 0.6} />
    </>
  );
}

function Sun({ x, y, size, glow = 1 }: { x: number; y: number; size: number; glow?: number }) {
  return (
    <>
      <div style={{ position: "absolute", left: x - size * 1.4, top: y - size * 1.4, width: size * 2.8, height: size * 2.8, background: `radial-gradient(closest-side, rgba(255,190,110,${0.22 * glow}), transparent)` }} />
      <img src={SUN_HERO} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, filter: "drop-shadow(0 12px 30px rgba(0,0,0,.5))" }} />
    </>
  );
}

// The burst: every body, many times over, in a hex field that ripples out from the Sun.
const FIELD = (() => {
  const r = rng(5);
  const cells: { x: number; y: number; body: string; d: number; rot: number }[] = [];
  for (let row = -1; row <= 15; row++) {
    for (let col = -1; col <= 8; col++) {
      const x = col * 148 + (row % 2 ? 74 : 0) + 22, y = row * 132 + 38;
      const d = Math.hypot(x - CX, y - CY);
      if (d < 70) continue;
      cells.push({ x, y, body: BODIES[1 + Math.floor(r() * 9)], d, rot: (r() - 0.5) * 30 });
    }
  }
  return cells;
})();

function Burst({ t, date }: { t: number; date: string }) {
  const { at, collapse, land } = TL.burst;
  if (t < at || t > land + 0.6) return null;
  const chart = chartAt(date, "09:00");
  const zoom = lerp(1, 1.1, p(t, at, collapse, (u) => u)), rise = -50 * p(t, at, collapse, (u) => u);
  // The instance of each body nearest its place on the wheel is the one that lands there.
  const target = (b: string) => { const q = bodyOnWheel(chart, b, WHEEL.w, false); return { x: WHEEL.x + q.x, y: WHEEL.y + q.y }; };
  const chosen = new Map<string, number>();
  BODIES.slice(1).forEach((b) => {
    const tg = target(b);
    let best = -1, bd = Infinity;
    FIELD.forEach((c, i) => { if (c.body === b) { const d = Math.hypot(c.x - tg.x, c.y - tg.y); if (d < bd) { bd = d; best = i; } } });
    chosen.set(b, best);
  });
  const lands = new Set(chosen.values());
  const wheelSize = 58;
  const items = FIELD.map((c, i) => {
    const t0 = at + c.d / 2600;
    const out = p(t, t0, t0 + 0.8, brand);
    const fx = CX + (lerp(CX, c.x, out) - CX) * zoom, fy = CY + (lerp(CY, c.y, out) - CY) * zoom + rise;
    let x = fx, y = fy, size = 84 * Math.max(0, spring(t - t0, { freq: 2, bounce: 0.4 })), op = 1, rot = c.rot * out;
    if (lands.has(i)) {
      const u = p(t, collapse + 0.15, land, inOut), tg = target(c.body);
      x = lerp(fx, tg.x, u); y = lerp(fy, tg.y, u); size = lerp(size, wheelSize, u); rot = lerp(rot, 0, u);
      op = 1 - p(t, land + 0.1, land + 0.5);
    } else {
      const u = p(t, collapse + (1500 - c.d) / 6000, collapse + (1500 - c.d) / 6000 + 0.55, quadIn);
      x = lerp(fx, CX, u * 0.35); y = lerp(fy, CY, u * 0.35); size *= 1 - u; op = 1 - u;
    }
    if (size <= 0.5 || op <= 0) return null;
    return <img key={i} src={PLANET_RENDERS[c.body]} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: op, transform: `rotate(${rot}deg)`, filter: "drop-shadow(0 8px 16px rgba(0,0,0,.5))" }} />;
  });
  // The Sun stays at the heart of the burst, then lands on its own degree.
  const su = p(t, collapse + 0.15, land, inOut), sg = target("sun");
  const sunSize = lerp(230 * (1 - 0.3 * Math.sin(Math.PI * p(t, at, at + 0.5, (u) => u))), wheelSize, su);
  return (
    <>
      {items}
      <div style={{ opacity: 1 - p(t, land + 0.1, land + 0.5) }}>
        <Sun x={lerp(CX, sg.x, su)} y={lerp(CY, sg.y, su)} size={sunSize} glow={1 - su} />
      </div>
    </>
  );
}

/** The real wheel for today, 09:00, Paris; then it shrinks into the bubble. */
function Wheel({ t, date }: { t: number; date: string }) {
  const { land } = TL.burst, m = TL.morph.at;
  if (t < land - 0.5 || t > m + 0.9) return null;
  const chart = chartAt(date, "09:00");
  const inn = p(t, land - 0.35, land + 0.35);
  const u = p(t, m, m + 0.7, inOut);
  const scale = lerp(1, BUBBLE.d / WHEEL.w, u);
  const x = lerp(WHEEL.x, BUBBLE.x, u), y = lerp(WHEEL.y, BUBBLE.y, u);
  const bloom = Math.sin(Math.PI * p(t, land - 0.2, land + 1.2, (v) => v));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(36% 22% at 50% ${WHEEL.y / 19.2}%, rgba(159,168,218,${0.16 * bloom}), transparent 70%)` }} />
      <div className="sd" style={{ position: "absolute", left: x - WHEEL.w / 2, top: y - WHEEL.w / 2, width: WHEEL.w, background: "transparent", opacity: inn * (1 - p(t, m + 0.45, m + 0.85)), transform: `scale(${scale * lerp(0.96, 1, inn)}) rotate(${(t - land) * 1.2}deg)` }}>
        <NatalWheel chartData={chart} centreName="Today" />
      </div>
    </>
  );
}

/** The bubble: a chapter's body in the product's surface, its chapter on a chip, while the slot names what it reads. */
function Report({ t }: { t: number }) {
  const m = TL.morph.at;
  if (t < m || t > TL.end.at + 0.8) return null;
  const surf = p(t, m + 0.3, m + 0.8);
  const toMark = p(t, TL.end.at, TL.end.at + 0.6, inOut);
  const bubbles = TL.bubble;
  return (
    <>
      <div style={{ position: "absolute", left: BUBBLE.x - BUBBLE.d / 2, top: BUBBLE.y - BUBBLE.d / 2, width: BUBBLE.d, height: BUBBLE.d, borderRadius: "50%", background: C.surface, border: `1.5px solid ${C.line}`, boxShadow: "0 30px 80px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.04)", opacity: surf * (1 - toMark), transform: `scale(${lerp(0.9, 1, surf) * lerp(1, 0.7, toMark)})` }} />
      {bubbles.map((b, i) => {
        const next = bubbles[i + 1];
        const inn = spring(t - b.at, { freq: 2, bounce: 0.45 });
        const out = next ? p(t, next.at - 0.05, next.at + 0.3, quadIn) : toMark;
        if (t < b.at || out >= 1) return null;
        const size = 168 * Math.max(0, inn) * (1 - out);
        return <img key={b.body} src={PLANET_RENDERS[b.body]} style={{ position: "absolute", left: BUBBLE.x - size / 2, top: BUBBLE.y - size / 2, width: size, height: size, transform: `rotate(${(1 - clamp(inn)) * -40 + out * 40}deg)`, filter: "drop-shadow(0 10px 22px rgba(0,0,0,.5))" }} />;
      })}
      {bubbles.map((b, i) => {
        const next = bubbles[i + 1];
        const inn = p(t, b.at + 0.1, b.at + 0.5);
        const out = next ? p(t, next.at - 0.1, next.at + 0.15) : toMark;
        if (t < b.at + 0.1 || out >= 1) return null;
        return (
          <div key={b.label} style={{ position: "absolute", left: 0, right: 0, top: BUBBLE.y + BUBBLE.d / 2 + 26, display: "flex", justifyContent: "center", opacity: inn * (1 - out), transform: `translateY(${(1 - inn) * 14}px)` }}>
            <Chip style={{ fontSize: 26, padding: "10px 22px" }}>{typed(t, b.at + 0.15, b.label, 40)}</Chip>
          </div>
        );
      })}
      <Sentence t={t} spec={REPORT} />
    </>
  );
}

/** The bubble becomes the Mark; the name, the line and the address arrive under it. */
function End({ t }: { t: number }) {
  const e = TL.end;
  if (t < e.at + 0.2) return null;
  const pop = spring(t - (e.at + 0.25), { freq: 1.8, bounce: 0.35 });
  const word = "Stars Decoded".split("");
  return (
    <>
      <div style={{ position: "absolute", left: CX - 120, top: 760 - 120, width: 240, height: 240, color: C.indigo, transform: `scale(${Math.max(0, pop)})` }}>
        <Mark className="w-full h-full" />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 940, textAlign: "center", fontFamily: F.serif, fontSize: 112, color: C.paper }}>
        {word.map((ch, i) => {
          const u = p(t, e.word + i * 0.035, e.word + i * 0.035 + 0.5);
          return <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: u, transform: `translateY(${(1 - u) * 30}px)`, filter: `blur(${(1 - u) * 10}px)` }}>{ch}</span>;
        })}
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 1100, textAlign: "center", fontFamily: F.serif, fontSize: 44, color: C.dim, opacity: p(t, e.line, e.line + 0.5), filter: `blur(${(1 - p(t, e.line, e.line + 0.5)) * 8}px)` }}>
        Find out what your birth chart says about you.
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1190, textAlign: "center", fontFamily: F.mono, fontSize: 30, letterSpacing: "0.08em", color: C.brass, opacity: p(t, e.url, e.url + 0.4) }}>
        MYSTARSDECODED.COM
      </div>
    </>
  );
}
