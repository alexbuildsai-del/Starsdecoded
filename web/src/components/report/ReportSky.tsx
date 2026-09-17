import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

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
 * that take the active chapter's accent and move at three depths. It fades in
 * over the first 0.6 screens, as the opening plate fades out. Under reduced
 * motion it is painted once and nothing moves.
 */
export function ReportSky({ accent, opening, count = 130 }: { accent: string; opening: boolean; count?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const b1 = useRef<HTMLDivElement>(null);
  const b2 = useRef<HTMLDivElement>(null);
  const b3 = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let frame = 0;

    function size() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      w = canvas.width = Math.max(1, Math.round(rect.width * 2));
      h = canvas.height = Math.max(1, Math.round(rect.height * 2));
      stars = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.7 + 0.3,
        o: Math.random() * 0.6 + 0.15,
        depth: Math.random(),
      }));
    }

    function paint(offset: number) {
      if (!ctx || !w) return;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const y = (((s.y + offset * 0.00012 * (0.3 + s.depth)) % 1) + 1) % 1;
        ctx.globalAlpha = s.o;
        ctx.fillStyle = "#E8EBF2";
        ctx.beginPath();
        ctx.arc(s.x * w, y * h, s.r * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function place(top: number) {
      if (!root) return;
      const q = Math.min(1, top / (Math.max(1, window.innerHeight) * 0.6));
      root.style.opacity = q.toFixed(3);
      if (reduced) return;
      if (b1.current) b1.current.style.transform = `translateY(${-top * 0.06}px)`;
      if (b2.current) b2.current.style.transform = `translateY(${-top * 0.11}px)`;
      if (b3.current) b3.current.style.transform = `translateY(${-top * 0.03}px)`;
      paint(top);
    }

    size();
    paint(reduced ? 0 : window.scrollY);
    place(window.scrollY);

    function onResize() {
      size();
      paint(reduced ? 0 : window.scrollY);
      place(window.scrollY);
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
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [count, reduced]);

  useEffect(() => {
    const rgb = hexToRgb(accent).join(",");
    if (b1.current) b1.current.style.background = `rgba(${rgb},.55)`;
    if (b2.current) b2.current.style.background = opening ? "rgba(149,117,205,.42)" : `rgba(${rgb},.32)`;
    if (b3.current) b3.current.style.background = `rgba(${mix(accent, INDIGO, 0.55).join(",")},.34)`;
  }, [accent, opening]);

  return (
    <div ref={rootRef} className="rp-sky rp-grain no-print" aria-hidden style={{ opacity: 0 }}>
      <canvas ref={canvasRef} />
      <div ref={b1} className="blob b1" />
      <div ref={b2} className="blob b2" />
      <div ref={b3} className="blob b3" />
      <div className="veil" />
    </div>
  );
}

export default ReportSky;
