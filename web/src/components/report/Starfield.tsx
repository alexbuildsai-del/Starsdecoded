import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Star { x: number; y: number; r: number; o: number; depth: number }

/**
 * One drifting depth behind the reading. Under reduced motion it is painted
 * once and never touched again, so nothing on the page moves.
 */
export function Starfield({ count = 130 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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

    size();
    paint(0);

    function onResize() {
      size();
      paint(reduced ? 0 : window.scrollY);
    }
    window.addEventListener("resize", onResize);

    if (reduced) {
      return () => window.removeEventListener("resize", onResize);
    }

    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        paint(window.scrollY);
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [count, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-70 no-print"
    />
  );
}

export default Starfield;
