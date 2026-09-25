import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SIGN_GLYPHS } from "@/types/chart";

export interface OrbitalItem {
  id: string;
  label: string;
  glyph: ReactNode;
  /** Ring and glow colour; data, so the caller decides it. */
  accent?: string;
  ariaLabel?: string;
  /** Drawn dashed: a person whose report is not written yet. */
  muted?: boolean;
}

interface RadialOrbitalTimelineProps {
  items: OrbitalItem[];
  center: ReactNode;
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
  className?: string;
}

const DEGREES_PER_SECOND = 4;
const SETTLE_MS = 700;
/** The selected body comes to rest at the bottom, nearest the card that opens under the orbit. */
const REST_ANGLE = 90;
const MAX_STAGE = 560;

const norm = (d: number) => ((d % 360) + 360) % 360;
const arc = (from: number, to: number) => ((to - from + 540) % 360) - 180;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Fixed so the sky does not reshuffle on every render.
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const STARS = Array.from({ length: 36 }, (_, i) => ({
  x: 4 + hash(i + 1) * 92,
  y: 4 + hash(i + 101) * 92,
  r: i % 7 === 0 ? 1.6 : i % 3 === 0 ? 1.1 : 0.7,
  delay: hash(i + 201) * 3,
  duration: 2.4 + (i % 5) * 0.6,
}));

const SIGNS = Object.values(SIGN_GLYPHS);

export default function RadialOrbitalTimeline({
  items,
  center,
  activeId,
  onActiveChange,
  className,
}: RadialOrbitalTimelineProps) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(360);
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const settleRef = useRef<{ from: number; delta: number; start: number } | null>(null);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setSize(Math.min(el.clientWidth, MAX_STAGE));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseAngle = useCallback((index: number) => (index / Math.max(items.length, 1)) * 360 - 90, [items.length]);

  useEffect(() => {
    if (!activeId) return;
    const index = items.findIndex((i) => i.id === activeId);
    if (index < 0) return;
    const from = rotationRef.current;
    const delta = arc(norm(from + baseAngle(index)), REST_ANGLE);
    if (reduced) {
      rotationRef.current = from + delta;
      setRotation(rotationRef.current);
      return;
    }
    settleRef.current = { from, delta, start: performance.now() };
  }, [activeId, items, baseAngle, reduced]);

  useEffect(() => {
    if (reduced && !settleRef.current) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const settle = settleRef.current;
      if (settle) {
        const t = Math.min(1, (now - settle.start) / SETTLE_MS);
        rotationRef.current = settle.from + settle.delta * ease(t);
        if (t >= 1) settleRef.current = null;
        setRotation(rotationRef.current);
      } else if (!activeId && !reduced) {
        rotationRef.current += DEGREES_PER_SECOND * dt;
        setRotation(rotationRef.current);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeId, reduced]);

  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onActiveChange(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, onActiveChange]);

  const radius = size / 2 - (size < 400 ? 34 : 46);
  // Past ten bodies the names collide; the tapped one still carries its name.
  const crowded = items.length > 10;
  const zodiacRadius = radius * 0.64;

  const positions = useMemo(
    () => items.map((_, index) => {
      const angle = norm(baseAngle(index) + rotation);
      const rad = (angle * Math.PI) / 180;
      // The lower half of the orbit is the near side: larger and brighter.
      const depth = (1 + Math.sin(rad)) / 2;
      return {
        x: radius * Math.cos(rad),
        y: radius * Math.sin(rad),
        scale: 0.82 + 0.18 * depth,
        opacity: 0.55 + 0.45 * depth,
        z: Math.round(10 + depth * 20),
      };
    }),
    [items, rotation, radius, baseAngle],
  );

  return (
    <div
      ref={stageRef}
      className={cn("relative w-full flex justify-center select-none", className)}
      onClick={(e) => { if (e.target === e.currentTarget) onActiveChange(null); }}
    >
      <div
        className="relative"
        style={{ width: size, height: size }}
        onClick={(e) => { if (e.target === e.currentTarget) onActiveChange(null); }}
      >
        <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100" aria-hidden>
          <defs>
            <radialGradient id="orbit-nebula" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(234 48% 60%)" stopOpacity="0.22" />
              <stop offset="55%" stopColor="hsl(263 42% 58%)" stopOpacity="0.07" />
              <stop offset="100%" stopColor="hsl(216 28% 7%)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill="url(#orbit-nebula)" />
          {STARS.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r * (100 / size) * 1.4}
              fill={i % 4 === 0 ? "#c5cae9" : "#ffffff"}
              className={reduced ? "opacity-50" : "animate-pulse"}
              style={reduced ? undefined : { animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}
            />
          ))}
          <circle
            cx="50" cy="50" r={(radius / size) * 100}
            fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={0.25} strokeDasharray="0.6 1.6"
          />
          <circle
            cx="50" cy="50" r={(zodiacRadius / size) * 100 + 4}
            fill="none" stroke="hsl(41 54% 62%)" strokeOpacity={0.18} strokeWidth={0.15}
          />
          <circle
            cx="50" cy="50" r={(zodiacRadius / size) * 100 - 4}
            fill="none" stroke="hsl(41 54% 62%)" strokeOpacity={0.12} strokeWidth={0.15}
          />
        </svg>

        {SIGNS.map((glyph, i) => {
          const a = ((i * 30 - 90 - rotation * 0.35) * Math.PI) / 180;
          return (
            <span
              key={glyph}
              aria-hidden
              className="absolute left-1/2 top-1/2 text-[11px] text-brass/40 pointer-events-none"
              style={{ transform: `translate(-50%, -50%) translate(${zodiacRadius * Math.cos(a)}px, ${zodiacRadius * Math.sin(a)}px)` }}
            >
              {glyph}
            </span>
          );
        })}

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40">{center}</div>

        {items.map((item, index) => {
          const p = positions[index];
          const active = item.id === activeId;
          const accent = item.accent ?? "hsl(234 48% 60%)";
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.ariaLabel ?? item.label}
              aria-pressed={active}
              onClick={(e) => { e.stopPropagation(); onActiveChange(active ? null : item.id); }}
              className="group absolute left-1/2 top-1/2 flex flex-col items-center focus-visible:outline-none"
              style={{
                transform: `translate(-50%, -50%) translate(${p.x}px, ${p.y}px) scale(${active ? 1.15 : p.scale})`,
                opacity: activeId && !active ? Math.min(p.opacity, 0.5) : active ? 1 : p.opacity,
                zIndex: active ? 50 : p.z,
              }}
              data-testid={`orbit-node-${item.id}`}
            >
              <span
                className="absolute -inset-3 rounded-full pointer-events-none transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle, ${accent}55 0%, transparent 70%)`,
                  opacity: active ? 1 : 0.55,
                }}
              />
              <span
                className={cn(
                  "relative h-11 w-11 rounded-full flex items-center justify-center text-lg border-2 transition-colors duration-300",
                  "group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background",
                  active ? "text-background" : "text-foreground bg-background/90",
                  item.muted && !active && "border-dashed",
                )}
                style={{
                  borderColor: active ? accent : `${accent}99`,
                  background: active ? accent : undefined,
                  boxShadow: active ? `0 0 24px ${accent}88` : undefined,
                }}
              >
                {item.glyph}
              </span>
              <span
                className={cn(
                  "relative mt-1.5 max-w-24 truncate font-label text-[11px] tracking-wide transition-colors",
                  active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                  crowded && !active && "opacity-0 group-hover:opacity-100",
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
