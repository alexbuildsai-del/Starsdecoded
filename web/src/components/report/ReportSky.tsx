import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { GATHER_SECONDS, gatherFrame, planGather, type GatherPlan, type Ring } from "@/lib/gather";

interface Star { x: number; y: number; r: number; o: number; depth: number }

export function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function mix(a: string, b: string, t: number): [number, number, number] {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return [0, 1, 2].map((i) => Math.round(x[i] + (y[i] - x[i]) * t)) as [number, number, number];
}

const INDIGO = "#5C6BC0";

/**
 * The sky behind the reading: one drifting starfield and three blurred blobs
 * that take the active chapter's accent and move at three depths. It is
 * present from the first pixel (ADR-51): no fade-in, the plate sits on it.
 * `gatherTo` runs the gather once when it turns non-null: about 70% of the
 * stars glide to a point on the hero's ring over 1.6 s on one slow easing,
 * inside this paint loop, and they stay (ADR-47). Under reduced motion the
 * field is painted once, with the gathered stars already on the ring.
 */
export function ReportSky({ accent, opening, count = 130, gatherTo = null }: {
  accent: string;
  opening: boolean;
  count?: number;
  /** The hero ring in CSS pixels of the viewport. */
  gatherTo?: Ring | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const b1 = useRef<HTMLDivElement>(null);
  const b2 = useRef<HTMLDivElement>(null);
  const b3 = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const world = useRef<{ stars: Star[]; w: number; h: number; plan: GatherPlan | null; gatherAt: number | null; gathered: Map<number, { x: number; y: number }> }>({
    stars: [], w: 0, h: 0, plan: null, gatherAt: null, gathered: new Map(),
  });
  const ring = useRef<Ring | null>(null);
  ring.current = gatherTo;

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const wd = world.current;
    let frame = 0;
    let gatherRaf = 0;

    function size() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      wd.w = canvas.width = Math.max(1, Math.round(rect.width * 2));
      wd.h = canvas.height = Math.max(1, Math.round(rect.height * 2));
      wd.stars = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.7 + 0.3,
        o: Math.random() * 0.6 + 0.15,
        depth: Math.random(),
      }));
      wd.plan = null;
      wd.gatherAt = null;
      wd.gathered.clear();
    }

    /** A star's CSS-pixel position at this scroll offset, before any gather. */
    function driftAt(s: Star, offset: number): { x: number; y: number } {
      const y = (((s.y + offset * 0.00012 * (0.3 + s.depth)) % 1) + 1) % 1;
      return { x: (s.x * wd.w) / 2, y: (y * wd.h) / 2 };
    }

    function paint(offset: number, now: number) {
      if (!ctx || !wd.w) return;
      ctx.clearRect(0, 0, wd.w, wd.h);
      // The gather's frame is arithmetic on the plan; landed stars keep their place.
      if (wd.plan && wd.gatherAt !== null) {
        const seconds = reduced ? GATHER_SECONDS : (now - wd.gatherAt) / 1000;
        for (const p of gatherFrame(wd.plan, Math.min(GATHER_SECONDS, seconds))) wd.gathered.set(p.index, { x: p.x, y: p.y });
        if (seconds >= GATHER_SECONDS) { wd.gatherAt = null; }
      }
      wd.stars.forEach((s, i) => {
        const g = wd.gathered.get(i);
        const at = g ?? driftAt(s, offset);
        ctx.globalAlpha = g ? Math.min(1, s.o + 0.25) : s.o;
        ctx.fillStyle = "#E8EBF2";
        ctx.beginPath();
        ctx.arc(at.x * 2, at.y * 2, s.r * 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function place(top: number) {
      if (reduced) { paint(0, performance.now()); return; }
      if (b1.current) b1.current.style.transform = `translateY(${-top * 0.06}px)`;
      if (b2.current) b2.current.style.transform = `translateY(${-top * 0.11}px)`;
      if (b3.current) b3.current.style.transform = `translateY(${-top * 0.03}px)`;
      paint(top, performance.now());
    }

    /** Runs once when the ring arrives: the plan is chosen from where the stars are now. */
    function startGather() {
      const target = ring.current;
      if (!target || wd.plan) return;
      const offset = reduced ? 0 : window.scrollY;
      wd.plan = planGather(wd.stars.map((s) => driftAt(s, offset)), target);
      wd.gatherAt = performance.now();
      if (reduced) { paint(0, performance.now()); return; }
      const tick = (now: number) => {
        paint(window.scrollY, now);
        if (wd.gatherAt !== null) gatherRaf = window.requestAnimationFrame(tick);
      };
      gatherRaf = window.requestAnimationFrame(tick);
    }

    size();
    place(window.scrollY);
    startGather();

    function onResize() {
      size();
      place(window.scrollY);
      startGather();
    }
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        place(window.scrollY);
      });
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    (root as HTMLDivElement & { __gather?: () => void }).__gather = startGather;
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      if (gatherRaf) window.cancelAnimationFrame(gatherRaf);
    };
  }, [count, reduced]);

  // The gather runs once, when the ring turns non-null.
  useEffect(() => {
    if (!gatherTo) return;
    (rootRef.current as (HTMLDivElement & { __gather?: () => void }) | null)?.__gather?.();
  }, [gatherTo]);

  useEffect(() => {
    const rgb = hexToRgb(accent).join(",");
    if (b1.current) b1.current.style.background = `rgba(${rgb},.55)`;
    if (b2.current) b2.current.style.background = opening ? "rgba(149,117,205,.42)" : `rgba(${rgb},.32)`;
    if (b3.current) b3.current.style.background = `rgba(${mix(accent, INDIGO, 0.55).join(",")},.34)`;
  }, [accent, opening]);

  return (
    <div ref={rootRef} className="rp-sky rp-grain no-print" aria-hidden>
      <canvas ref={canvasRef} />
      <div ref={b1} className="blob b1" />
      <div ref={b2} className="blob b2" />
      <div ref={b3} className="blob b3" />
      <div className="veil" />
    </div>
  );
}

export default ReportSky;
