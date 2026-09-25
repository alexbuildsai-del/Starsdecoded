/**
 * The night sky behind the app: the GitHubSky card's twinkle and pointer
 * parallax, grown to a full screen with a Milky Way band. The band, its dust
 * and the faint stars are painted once per size to an offscreen canvas; only
 * the brighter stars move, so a frame is one drawImage and a few hundred arcs.
 * The layer sits under the content, so the pointer is read from the window.
 * Under reduced motion it is painted once.
 */
import * as React from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

export interface NightSkyProps extends Omit<React.ComponentPropsWithoutRef<"div">, "children"> {
  /** Twinkling stars in front of the band. */
  starCount?: number;
  /** Faint static stars, most of them inside the band. */
  dustCount?: number;
  seed?: number;
}

interface Star { x: number; y: number; r: number; o: number; speed: number; phase: number; tint: string }

const PARALLAX_RADIUS = 220;
const PARALLAX_STRENGTH = 6;
const TINTS = ["255,255,255", "255,255,255", "214,226,255", "255,236,210"];

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  return Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
}

/** A point on the band in normalised coordinates: lower left to upper right, like the photograph it is drawn from. */
function onBand(t: number, off: number): { x: number; y: number } {
  const ax = 0.12, ay = 1.05, bx = 0.66, by = -0.05;
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  const wobble = 0.03 * Math.sin(t * 5.1);
  return { x: ax + dx * t + (-dy / len) * (off + wobble), y: ay + dy * t + (dx / len) * (off + wobble) };
}

function makeStars(count: number, rand: () => number): Star[] {
  return Array.from({ length: count }, () => {
    const inBand = rand() < 0.4;
    const p = inBand ? onBand(rand(), gaussian(rand) * 0.09) : { x: rand(), y: rand() };
    const bright = rand() < 0.06;
    return {
      x: p.x,
      y: p.y,
      r: bright ? 1.3 + rand() * 0.9 : 0.45 + rand() * 0.8,
      o: bright ? 0.7 + rand() * 0.3 : 0.25 + rand() * 0.5,
      speed: 0.25 + rand() * 0.9,
      phase: rand() * Math.PI * 2,
      tint: TINTS[Math.floor(rand() * TINTS.length)],
    };
  });
}

/** The still part of the sky: the gradient, the band's glow and dust lanes, and the faint stars. */
function paintBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, dust: number, seed: number) {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, "#03060F");
  base.addColorStop(0.55, "#0A1630");
  base.addColorStop(1, "#1B355A");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const span = Math.hypot(w, h);
  for (let i = 0; i < 26; i++) {
    const p = onBand(i / 25, gaussian(rand) * 0.02);
    const r = span * (0.1 + rand() * 0.08);
    const g = ctx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, r);
    const core = i > 7 && i < 15 ? "205,195,180" : "140,165,210";
    g.addColorStop(0, `rgba(${core},0.06)`);
    g.addColorStop(1, `rgba(${core},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  for (let i = 0; i < 40; i++) {
    const p = onBand(0.1 + rand() * 0.7, gaussian(rand) * 0.025);
    const r = span * (0.01 + rand() * 0.025);
    const g = ctx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, r);
    g.addColorStop(0, "rgba(4,7,16,0.28)");
    g.addColorStop(1, "rgba(4,7,16,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  const scale = Math.sqrt((w * h) / (1440 * 900));
  const n = Math.round(dust * Math.min(1.6, Math.max(0.4, scale)));
  for (let i = 0; i < n; i++) {
    const inBand = rand() < 0.7;
    const p = inBand ? onBand(rand(), gaussian(rand) * 0.07) : { x: rand(), y: rand() };
    ctx.globalAlpha = 0.1 + rand() * (inBand ? 0.5 : 0.35);
    ctx.fillStyle = rand() < 0.2 ? "#FFE9CF" : "#FFFFFF";
    const d = rand() < 0.12 ? 1.5 : 1;
    ctx.fillRect(p.x * w, p.y * h, d, d);
  }
  ctx.globalAlpha = 1;
}

export function NightSky({ starCount = 480, dustCount = 12000, seed = 7, className, ...props }: NightSkyProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const stars = React.useMemo(() => makeStars(starCount, mulberry32(seed)), [starCount, seed]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const backdrop = document.createElement("canvas");
    const bctx = backdrop.getContext("2d");
    if (!bctx) return;
    const pointer = { x: 0, y: 0, inside: false };
    let w = 1, h = 1, dpr = 1, raf = 0;

    function size() {
      if (!canvas || !bctx) return;
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = backdrop.width = Math.round(w * dpr);
      canvas.height = backdrop.height = Math.round(h * dpr);
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintBackdrop(bctx, w, h, dustCount, seed);
    }

    function paint(now: number) {
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(backdrop, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const time = now / 1000;
      for (const s of stars) {
        let x = s.x * w, y = s.y * h;
        let o = reduced ? s.o : s.o * (0.55 + 0.45 * Math.sin(time * s.speed * Math.PI * 2 + s.phase));
        let r = s.r;
        if (pointer.inside && !reduced) {
          const dx = x - pointer.x, dy = y - pointer.y;
          const dist = Math.hypot(dx, dy);
          const pull = Math.max(0, 1 - dist / PARALLAX_RADIUS);
          if (dist > 0.5) { x += (dx / dist) * pull * PARALLAX_STRENGTH; y += (dy / dist) * pull * PARALLAX_STRENGTH; }
          o *= 1 + pull * 0.55;
          r *= 1 + pull * 0.12;
        }
        ctx.globalAlpha = Math.min(1, Math.max(0.04, o));
        ctx.fillStyle = `rgb(${s.tint})`;
        if (r > 1.2) { ctx.shadowColor = `rgba(${s.tint},0.6)`; ctx.shadowBlur = r * 3; }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    const tick = (now: number) => { paint(now); raf = requestAnimationFrame(tick); };
    const onResize = () => { size(); if (reduced) paint(0); };
    const onMove = (e: PointerEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.inside = true;
    };
    const onLeave = () => { pointer.inside = false; };

    size();
    if (reduced) paint(0);
    else {
      raf = requestAnimationFrame(tick);
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    const observer = new ResizeObserver(onResize);
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [stars, dustCount, seed, reduced]);

  return (
    <div
      aria-hidden
      data-slot="night-sky"
      className={cn("pointer-events-none fixed inset-0 -z-10 print:hidden overflow-hidden bg-[#03060F]", className)}
      {...props}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

export default NightSky;
