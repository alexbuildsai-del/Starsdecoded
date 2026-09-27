/**
 * Two skies (ADR-59). `chapters`: the sky behind the reading exactly as R04
 * shipped it, one drifting starfield and three blurred blobs that take the
 * active chapter's accent and move at three depths, fading in over the first
 * 0.6 screens as the opening plate fades out, fixed behind everything.
 * `hero`: the hero's own sky, mounted inside the hero's fixed layer and
 * sized to it, with the starfield and, once the door is taken, the ring of
 * stars: about 70% of them glide to the hero's ring over 1.6 s on one slow
 * easing and stay. A landed star is kept as an angle and a radius from the
 * ring's centre and drawn from it each frame, so a resize, an address-bar
 * collapse or a rotation re-measures and re-projects the ring without
 * re-seeding the field or clearing the gather. Under reduced motion each
 * sky is painted once, the gathered stars already on the ring.
 */
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

export interface ReportSkyProps {
  accent: string;
  opening: boolean;
  count?: number;
  /** Which sky this is; the chapters' sky is the default. */
  variant?: "chapters" | "hero";
  /** Hero only: the ring in viewport pixels; the gather runs once when it turns non-null and follows it after. */
  gatherTo?: Ring | null;
}

export function ReportSky({ accent, opening, count = 130, variant = "chapters", gatherTo = null }: ReportSkyProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const b1 = useRef<HTMLDivElement>(null);
  const b2 = useRef<HTMLDivElement>(null);
  const b3 = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const hero = variant === "hero";
  const world = useRef<{ stars: Star[]; w: number; h: number; plan: GatherPlan | null; gatherAt: number | null; landed: boolean }>({
    stars: [], w: 0, h: 0, plan: null, gatherAt: null, landed: false,
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

    /** The field is seeded once; a resize only re-measures the canvas. */
    function seed() {
      if (wd.stars.length) return;
      wd.stars = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.7 + 0.3,
        o: Math.random() * 0.6 + 0.15,
        depth: Math.random(),
      }));
    }

    function size() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      wd.w = canvas.width = Math.max(1, Math.round(rect.width * 2));
      wd.h = canvas.height = Math.max(1, Math.round(rect.height * 2));
    }

    /** The ring in the sky's own CSS pixels: the hero's sky sits under the top bar, the chapters' at the origin. */
    function ringHere(): Ring | null {
      const target = ring.current;
      if (!target || !canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return { cx: target.cx - rect.left, cy: target.cy - rect.top, r: target.r };
    }

    /** A star's CSS-pixel position at this scroll offset, before any gather. The hero's field does not drift. */
    function driftAt(s: Star, offset: number): { x: number; y: number } {
      const y = hero ? s.y : (((s.y + offset * 0.00012 * (0.3 + s.depth)) % 1) + 1) % 1;
      return { x: (s.x * wd.w) / 2, y: (y * wd.h) / 2 };
    }

    function paint(offset: number, now: number) {
      if (!ctx || !wd.w) return;
      ctx.clearRect(0, 0, wd.w, wd.h);
      // The gather's frame is arithmetic on the plan and the ring as it is now; landed stars keep their angle and radius.
      const gathered = new Map<number, { x: number; y: number }>();
      const here = ringHere();
      if (wd.plan && here) {
        const seconds = wd.gatherAt === null || reduced ? GATHER_SECONDS : Math.min(GATHER_SECONDS, (now - wd.gatherAt) / 1000);
        for (const p of gatherFrame(wd.plan, seconds, here)) gathered.set(p.index, { x: p.x, y: p.y });
        if (seconds >= GATHER_SECONDS) { wd.gatherAt = null; wd.landed = true; }
      }
      wd.stars.forEach((s, i) => {
        const g = gathered.get(i);
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
      if (!root) return;
      if (!hero) {
        // R04's fade: the reading's sky comes in over the first 0.6 screens as the plate goes out.
        const q = Math.min(1, top / (Math.max(1, window.innerHeight) * 0.6));
        root.style.opacity = q.toFixed(3);
      }
      if (reduced) { paint(0, performance.now()); return; }
      if (!hero) {
        if (b1.current) b1.current.style.transform = `translateY(${-top * 0.06}px)`;
        if (b2.current) b2.current.style.transform = `translateY(${-top * 0.11}px)`;
        if (b3.current) b3.current.style.transform = `translateY(${-top * 0.03}px)`;
      }
      paint(top, performance.now());
    }

    /** Runs once when the ring arrives: the plan is chosen from where the stars are now, in the sky's pixels. */
    function startGather() {
      const here = ringHere();
      if (!here || wd.plan) return;
      wd.plan = planGather(wd.stars.map((s) => driftAt(s, reduced ? 0 : window.scrollY)), here);
      wd.gatherAt = performance.now();
      if (reduced) { paint(0, performance.now()); return; }
      const tick = (now: number) => {
        paint(window.scrollY, now);
        if (wd.gatherAt !== null) gatherRaf = window.requestAnimationFrame(tick);
      };
      gatherRaf = window.requestAnimationFrame(tick);
    }

    seed();
    size();
    place(window.scrollY);
    startGather();

    // A resize re-measures and repaints; the field and the plan are kept, so the ring re-projects and the gather stands.
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
    if (!hero) window.addEventListener("scroll", onScroll, { passive: true });
    (root as HTMLDivElement & { __gather?: () => void; __repaint?: () => void }).__gather = startGather;
    (root as HTMLDivElement & { __gather?: () => void; __repaint?: () => void }).__repaint = () => place(window.scrollY);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      if (gatherRaf) window.cancelAnimationFrame(gatherRaf);
    };
  }, [count, reduced, hero]);

  // The gather runs once, when the ring turns non-null; a ring that moved after landing re-projects on the next paint.
  useEffect(() => {
    if (!gatherTo) return;
    const root = rootRef.current as (HTMLDivElement & { __gather?: () => void; __repaint?: () => void }) | null;
    root?.__gather?.();
    root?.__repaint?.();
  }, [gatherTo]);

  useEffect(() => {
    const rgb = hexToRgb(accent).join(",");
    if (b1.current) b1.current.style.background = `rgba(${rgb},.55)`;
    if (b2.current) b2.current.style.background = opening ? "rgba(149,117,205,.42)" : `rgba(${rgb},.32)`;
    if (b3.current) b3.current.style.background = `rgba(${mix(accent, INDIGO, 0.55).join(",")},.34)`;
  }, [accent, opening]);

  return (
    <div ref={rootRef} className={`rp-sky rp-grain no-print${hero ? " hero" : ""}`} aria-hidden style={hero ? undefined : { opacity: 0 }}>
      <canvas ref={canvasRef} />
      <div ref={b1} className="blob b1" />
      <div ref={b2} className="blob b2" />
      <div ref={b3} className="blob b3" />
      <div className="veil" />
    </div>
  );
}

export default ReportSky;
