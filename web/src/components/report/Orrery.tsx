/**
 * The wheel is the sky (ADR-47): a geocentric orrery on one canvas. Eleven
 * rings in order of distance from Earth, the planets as renders, Chiron and
 * the nodes as drawn points, each sweeping at its mean daily motion at one
 * second to eight days, retrogrades backwards. When the chart arrives each
 * body eases onto its stored degree, the wheel turns so the Ascendant sits
 * east, the marker, the Descendant and the horizon appear, and the progress
 * arc runs round the rim. A blind chart settles and draws no horizon.
 *
 * Once settled the sky keeps turning over the horizon at one slow constant
 * rate, so the wheel never stands still (ADR-59): R05 held every body on its
 * stored degree after the settle, and a phone, whose page mounts after the
 * chart is already stored, never saw a body move at all. Under Reduce Motion
 * the settle is immediate and the same slow turn runs.
 *
 * The canvas is sized from its own box, width and height, DPR-aware, on a
 * resize observer, so a phone's narrower plate and a rotation redraw it
 * square. One rAF loop, no timers, no DOM per body. Placement is
 * wheel-geometry's theta and pointAt (§9).
 */
import { useEffect, useRef } from "react";
import { PLANET_RENDERS } from "@/lib/planet-renders";
import { pointAt, theta } from "@/components/chart/wheel-geometry";
import {
  MEAN_MOTION, RINGS, SETTLE_SECONDS, advance, easeInOutCubic, norm360, ringOf, settleAt, settleStart, shortestArc, turnAt,
  type Positions,
} from "@/lib/orrery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { ChartData } from "@/types/chart";

const BRASS = "#D4B06A";
const PAPER = "#E8EBF2";
const BODIES = [...RINGS, "north_node", "south_node"] as const;
const POINTS = new Set(["chiron", "north_node", "south_node"]);

export interface OrreryProps {
  /** The birth day's positions at offset zero, from /status, until the chart is stored. */
  provisional: Positions | null;
  chart: ChartData | null;
  /** 0 to 100, the shown percentage; the arc round the rim. */
  progress: number;
  /** The plate's largest side in CSS pixels; the box shrinks with its container and its own 62svh cap. */
  size?: number;
}

interface BodyState {
  degree: number;
  retrograde: boolean;
  settleFrom: number | null;
}

function positionsOf(chart: ChartData): Positions {
  const out: Positions = {};
  for (const [k, p] of Object.entries(chart.planets)) out[k] = { absoluteDegree: p.absoluteDegree, retrograde: p.retrograde };
  return out;
}

export function Orrery({ provisional, chart, progress, size = 440 }: OrreryProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const state = useRef<{
    bodies: Record<string, BodyState>;
    seeded: boolean;
    frame: number;
    frameFrom: number | null;
    settleStartedAt: number | null;
    /** When the sky began its slow turn: at the end of the settle, or at once when seeded from a stored chart. */
    turnStartedAt: number | null;
    lastT: number;
    images: Record<string, HTMLImageElement>;
  }>({ bodies: {}, seeded: false, frame: 0, frameFrom: null, settleStartedAt: null, turnStartedAt: null, lastT: 0, images: {} });
  const latest = useRef({ chart, provisional, progress, reduced });
  latest.current = { chart, provisional, progress, reduced };

  useEffect(() => {
    const s = state.current;
    for (const [k, src] of Object.entries(PLANET_RENDERS)) {
      if (s.images[k]) continue;
      const img = new Image();
      img.src = src;
      s.images[k] = img;
    }
  }, []);

  // Seed from whatever exists first; a chart arriving later starts the settle.
  useEffect(() => {
    const s = state.current;
    const source = chart ? positionsOf(chart) : provisional;
    if (!source) return;
    if (!s.seeded) {
      for (const b of BODIES) {
        const p = source[b];
        s.bodies[b] = { degree: p ? p.absoluteDegree : Math.random() * 360, retrograde: p?.retrograde ?? false, settleFrom: null };
      }
      s.seeded = true;
      if (chart) {
        s.frame = chart.angles?.ascendant.absoluteDegree ?? 0;
        // Seeded from a stored chart there is nothing to settle: the turn starts now.
        s.turnStartedAt = -1;
      }
      return;
    }
    if (chart && s.settleStartedAt === null) {
      const target = positionsOf(chart);
      for (const b of BODIES) {
        const cur = s.bodies[b];
        const t = target[b];
        if (!cur || !t) continue;
        cur.settleFrom = settleStart(cur.degree, t.absoluteDegree, b);
        cur.retrograde = t.retrograde;
      }
      s.frameFrom = s.frame;
      s.settleStartedAt = -1;
    }
  }, [chart, provisional]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;
    const s = state.current;
    let raf = 0;
    // The box the canvas actually has, in CSS pixels; the drawing follows it.
    let box = 0;

    function fit() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const side = Math.max(1, Math.round(Math.min(rect.width, rect.height || rect.width)));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (side === box && canvas.width === Math.round(side * dpr)) return;
      box = side;
      canvas.width = Math.round(side * dpr);
      canvas.height = Math.round(side * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(now: number) {
      fit();
      const c = box / 2;
      const rim = box * 0.47;
      const inner = box * 0.13;
      const step = (rim - box * 0.06 - inner) / (RINGS.length - 1);
      const ringRadius = (i: number) => inner + i * step;

      const { chart: ch, progress: pct, reduced: still } = latest.current;
      const dt = s.lastT ? Math.min(0.1, (now - s.lastT) / 1000) : 0;
      s.lastT = now;
      const target = ch ? positionsOf(ch) : null;
      const ascendant = ch?.angles?.ascendant.absoluteDegree ?? null;

      // The settle: 1.4 s from the frozen sweep onto the stored degrees, the frame turning with it.
      let settleT: number | null = null;
      if (s.settleStartedAt !== null) {
        if (s.settleStartedAt < 0) s.settleStartedAt = now;
        settleT = still ? 1 : Math.min(1, (now - s.settleStartedAt) / (SETTLE_SECONDS * 1000));
        if (settleT >= 1 && s.turnStartedAt === null) s.turnStartedAt = now;
      }
      if (s.turnStartedAt !== null && s.turnStartedAt < 0) s.turnStartedAt = now;
      for (const b of BODIES) {
        const st = s.bodies[b];
        if (!st) continue;
        if (target && settleT !== null && st.settleFrom !== null) {
          st.degree = settleAt(st.settleFrom, target[b]?.absoluteDegree ?? st.degree, settleT);
        } else if (target && ch) {
          st.degree = target[b]?.absoluteDegree ?? st.degree;
        } else if (!still) {
          st.degree = advance(st.degree, b, dt, st.retrograde);
        }
      }
      const frameTarget = ascendant ?? 0;
      if (settleT !== null && s.frameFrom !== null) s.frame = norm360(s.frameFrom + shortestArc(s.frameFrom, frameTarget) * easeInOutCubic(settleT));
      else if (ch) s.frame = frameTarget;
      // Once settled the sky turns over the horizon as one, slowly, and never stands still.
      const turn = s.turnStartedAt !== null && s.turnStartedAt >= 0 ? turnAt((now - s.turnStartedAt) / 1000) : 0;

      ctx.clearRect(0, 0, box, box);

      // Rings, faint; the rim carries the progress arc.
      ctx.lineWidth = 1;
      for (let i = 0; i < RINGS.length; i++) {
        ctx.beginPath();
        ctx.arc(c, c, ringRadius(i), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(212,176,106,${i === 0 ? 0.28 : 0.14})`;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(c, c, rim, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(212,176,106,.22)";
      ctx.stroke();
      const arc = Math.max(0, Math.min(100, pct)) / 100;
      if (arc > 0) {
        ctx.beginPath();
        ctx.arc(c, c, rim, -Math.PI / 2, -Math.PI / 2 + arc * Math.PI * 2);
        ctx.strokeStyle = BRASS;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // The horizon, only once the chart is drawn and the settle has turned the wheel. It stays put; the sky turns over it.
      const horizonAlpha = ascendant !== null && settleT !== null ? easeInOutCubic(settleT) : ascendant !== null && !s.settleStartedAt ? 1 : 0;
      if (ascendant !== null && horizonAlpha > 0) {
        const east = pointAt(c, c, rim - 6, theta(ascendant, s.frame));
        const west = pointAt(c, c, rim - 6, theta(ascendant + 180, s.frame));
        ctx.save();
        ctx.globalAlpha = horizonAlpha;
        ctx.setLineDash([2, 5]);
        ctx.strokeStyle = "rgba(138,115,67,.7)";
        ctx.beginPath();
        ctx.moveTo(east.x, east.y);
        ctx.lineTo(west.x, west.y);
        ctx.stroke();
        ctx.setLineDash([]);
        // The Ascendant is the R03 marker: a brass ring, a centre point, a tick outward along the angle.
        const tick = pointAt(c, c, rim + 6, theta(ascendant, s.frame));
        ctx.strokeStyle = BRASS;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(east.x, east.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(east.x, east.y);
        ctx.lineTo(tick.x, tick.y);
        ctx.stroke();
        ctx.fillStyle = BRASS;
        ctx.beginPath();
        ctx.arc(east.x, east.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(west.x, west.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Bodies, innermost ring first so an outer render sits above.
      for (const b of BODIES) {
        const st = s.bodies[b];
        if (!st) continue;
        const r = ringRadius(ringOf(b));
        const at = pointAt(c, c, r, theta(st.degree + turn, s.frame));
        if (POINTS.has(b)) {
          ctx.fillStyle = b === "chiron" ? BRASS : "rgba(212,176,106,.75)";
          ctx.beginPath();
          ctx.arc(at.x, at.y, b === "chiron" ? 2.4 : 2, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        const img = s.images[b];
        const scale = box / 440;
        const px = (b === "sun" ? 22 : b === "moon" ? 14 : b === "jupiter" || b === "saturn" ? 16 : 12) * Math.max(0.7, Math.min(1, scale));
        if (img && img.complete && img.naturalWidth > 0) ctx.drawImage(img, at.x - px / 2, at.y - px / 2, px, px);
        else {
          ctx.fillStyle = PAPER;
          ctx.beginPath();
          ctx.arc(at.x, at.y, px / 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = window.requestAnimationFrame(draw);
    }

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => fit()) : null;
    observer?.observe(canvas);
    fit();
    raf = window.requestAnimationFrame(draw);
    return () => {
      observer?.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
      s.lastT = 0;
    };
  }, [reduced, chart, provisional]);

  return (
    <canvas
      ref={canvasRef}
      // Square, as wide as its plate allows, and never taller than 62svh: its own cap, on the canvas.
      style={{ width: "min(100%, 62svh)", maxWidth: size, aspectRatio: "1 / 1", height: "auto", display: "block" }}
      role="img"
      aria-label={chart ? "Your chart, every body at its place" : "The sky on your birth day, every body moving at its own speed"}
      data-motion={Object.keys(MEAN_MOTION).length}
    />
  );
}

export default Orrery;
