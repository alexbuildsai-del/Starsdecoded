import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PLANET_LABELS,
  SIGN_ELEMENTS,
  SIGN_MODALITIES,
  type ChartData } from "@/types/chart";

import sunImg from "@/assets/planets/sun.webp";
import moonImg from "@/assets/planets/moon.webp";
import mercuryImg from "@/assets/planets/mercury.webp";
import venusImg from "@/assets/planets/venus.webp";
import marsImg from "@/assets/planets/mars.webp";
import jupiterImg from "@/assets/planets/jupiter.webp";
import saturnImg from "@/assets/planets/saturn.webp";
import uranusImg from "@/assets/planets/uranus.webp";
import neptuneImg from "@/assets/planets/neptune.webp";
import plutoImg from "@/assets/planets/pluto.webp";

const PLANET_IMAGES: Record<string, string> = {
  sun: sunImg,
  moon: moonImg,
  mercury: mercuryImg,
  venus: venusImg,
  mars: marsImg,
  jupiter: jupiterImg,
  saturn: saturnImg,
  uranus: uranusImg,
  neptune: neptuneImg,
  pluto: plutoImg,
};

const ELEMENT_COLORS = {
  fire: "from-orange-400 to-red-500",
  earth: "from-emerald-400 to-green-600",
  air: "from-sky-300 to-blue-500",
  water: "from-blue-400 to-indigo-600",
} as const;

const MAJOR_ASPECTS = new Set(["conjunction", "opposition", "square", "trine", "sextile"]);

// Stroke colours for aspect lines on the wheel. These mirror the
// AspectBadge palette used elsewhere in the report so the wheel reads as
// the same colour language.
const ASPECT_STROKES: Record<string, string> = {
  conjunction: "#facc15", // yellow-400
  opposition: "#f87171", // red-400
  square: "#fb923c", // orange-400
  trine: "hsl(var(--primary))",
  sextile: "#4ade80", // green-400
};

// Faint baseline opacity when no planet is selected. Selected-planet
// aspects use SELECTED_OPACITY; other aspects fade to 0.
const IDLE_LINE_OPACITY = 0.22;
const SELECTED_OPACITY = 0.85;

// Ambient rotation speed. Original code used setInterval(50ms) at +0.25°/tick
// = 5°/sec. We keep the same visual cadence but drive it from rAF so React
// no longer re-renders on every frame.
const ROTATION_DEG_PER_SEC = 5;

// Duration of the snap-to-top easing applied when a node is expanded or
// collapsed. We toggle transitions on imperatively for this window only —
// during ambient rotation transitions are off so rAF updates aren't smeared.
const SNAP_DURATION_MS = 600;
const SNAP_TRANSITION = `left ${SNAP_DURATION_MS}ms ease-out, top ${SNAP_DURATION_MS}ms ease-out, transform ${SNAP_DURATION_MS}ms ease-out, opacity ${SNAP_DURATION_MS}ms ease-out`;

interface OrbitalNode {
  id: string; // planet name (lowercase)
  label: string;
  sign: string;
  degree: number;
  house?: number;
  retrograde?: boolean;
  imageSrc?: string;
  relatedIds: string[]; // ids of other nodes this aspects
  bodyText: string;
  scrollTargetId: string;
}

/** The wheel only needs the composed per-planet cards. */
export type WheelInterpretation = { personalPlanets?: Record<string, string> };

interface RadialOrbitalNatalProps {
  chartData: ChartData;
  interpretation?: WheelInterpretation | null;
  userName?: string;
  archetypeName?: string;
}

const NODE_ORDER = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
] as const;

function buildNodes(
  chartData: ChartData,
  interpretation?: WheelInterpretation | null,
): OrbitalNode[] {
  // Map from planet name → set of other planet names it aspects
  const aspectMap: Record<string, Set<string>> = {};
  for (const a of chartData.aspects ?? []) {
    if (!MAJOR_ASPECTS.has(a.type)) continue;
    aspectMap[a.planet1] ??= new Set();
    aspectMap[a.planet2] ??= new Set();
    aspectMap[a.planet1].add(a.planet2);
    aspectMap[a.planet2].add(a.planet1);
  }

  const nodes: OrbitalNode[] = [];

  for (const id of NODE_ORDER) {
    const planet = chartData.planets[id];
    if (!planet) continue;
    const interp = interpretation?.personalPlanets?.[id];
    const fallback = `${PLANET_LABELS[id]} sits at ${planet.degree.toFixed(1)}° ${planet.sign}, in your ${ordinal(planet.house)} house.`;
    // Use the full interpretation text — the expanded card now scrolls so
    // the entire applied meaning is visible in place.
    const body = interp || fallback;
    const related = Array.from(aspectMap[id] ?? []).filter((p) =>
      NODE_ORDER.includes(p as typeof NODE_ORDER[number]),
    );
    nodes.push({
      id,
      label: PLANET_LABELS[id] ?? id,
      sign: planet.sign,
      degree: planet.degree,
      house: planet.house,
      retrograde: planet.retrograde,
      imageSrc: PLANET_IMAGES[id],
      relatedIds: related,
      bodyText: body,
      scrollTargetId: `planet-detail-${id}`,
    });
  }

  return nodes;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

interface NodePose {
  left: string;
  top: string;
  transform: string;
  zIndex: number;
  opacity: number;
}

// Radius (as a percent of container width) used by both the planet pose
// computation and the aspect line endpoint computation. Kept as a single
// constant so lines always meet planet centres.
const ORBIT_RADIUS_PCT = 38;

function calcPose(index: number, total: number, rotation: number): NodePose {
  const angle = ((index / total) * 360 + rotation) % 360;
  const radian = (angle * Math.PI) / 180;
  const xPct = ORBIT_RADIUS_PCT * Math.cos(radian);
  const yPct = ORBIT_RADIUS_PCT * Math.sin(radian);
  const zIndex = Math.round(100 + 50 * Math.cos(radian));
  const opacity = Math.max(0.55, Math.min(1, 0.55 + 0.45 * ((1 + Math.sin(radian)) / 2)));
  const scale = 0.85 + 0.25 * ((1 + Math.cos(radian)) / 2);
  return {
    left: `${50 + xPct}%`,
    top: `${50 + yPct}%`,
    transform: `translate(-50%, -50%) scale(${scale})`,
    zIndex,
    opacity,
  };
}

// Coordinates inside the SVG viewBox (0..100) for a node at the given
// index. Aspect lines are drawn at rotation = 0 and the entire `<g>`
// group is then rotated via CSS to match the wheel — this keeps per-frame
// updates to a single transform mutation.
function calcLinePoint(index: number, total: number): { x: number; y: number } {
  const angle = (index / total) * 360;
  const radian = (angle * Math.PI) / 180;
  return {
    x: 50 + ORBIT_RADIUS_PCT * Math.cos(radian),
    y: 50 + ORBIT_RADIUS_PCT * Math.sin(radian),
  };
}

interface AspectLine {
  i1: number;
  i2: number;
  type: string;
  stroke: string;
  planet1: string;
  planet2: string;
}

export default function RadialOrbitalNatal({
  chartData,
  interpretation,
  userName,
  archetypeName,
}: RadialOrbitalNatalProps) {
  const nodes = useMemo(
    () => buildNodes(chartData, interpretation),
    [chartData, interpretation],
  );
  const aspectLines = useMemo<AspectLine[]>(() => {
    const lines: AspectLine[] = [];
    const indexById = new Map(nodes.map((n, i) => [n.id, i] as const));
    for (const a of chartData.aspects ?? []) {
      if (!MAJOR_ASPECTS.has(a.type)) continue;
      const i1 = indexById.get(a.planet1);
      const i2 = indexById.get(a.planet2);
      if (i1 === undefined || i2 === undefined) continue;
      lines.push({
        i1,
        i2,
        type: a.type,
        stroke: ASPECT_STROKES[a.type] ?? "currentColor",
        planet1: a.planet1,
        planet2: a.planet2,
      });
    }
    return lines;
  }, [chartData.aspects, nodes]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const aspectGroupRef = useRef<SVGGElement | null>(null);

  // Rotation lives in a ref so the rAF loop can update it without triggering
  // React re-renders. The initial JSX render uses this value as the starting
  // pose; subsequent frames mutate node DOM styles directly.
  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const snapTimeoutRef = useRef<number | null>(null);

  const totalNodes = nodes.length;

  // Briefly turns on a CSS transition for left/top/transform/opacity on every
  // node so the upcoming snap or collapse animates smoothly. Transitions are
  // cleared after SNAP_DURATION_MS so the rAF loop can resume mutating styles
  // without each tick being smeared by a 600ms easing.
  const enableSnapTransition = () => {
    for (let i = 0; i < totalNodes; i++) {
      const el = nodeRefs.current[i];
      if (el) el.style.transition = SNAP_TRANSITION;
    }
    if (aspectGroupRef.current) {
      aspectGroupRef.current.style.transition = `transform ${SNAP_DURATION_MS}ms ease-out`;
    }
    if (snapTimeoutRef.current !== null) {
      window.clearTimeout(snapTimeoutRef.current);
    }
    snapTimeoutRef.current = window.setTimeout(() => {
      for (let i = 0; i < totalNodes; i++) {
        const el = nodeRefs.current[i];
        if (el) el.style.transition = "";
      }
      if (aspectGroupRef.current) {
        aspectGroupRef.current.style.transition = "";
      }
      snapTimeoutRef.current = null;
    }, SNAP_DURATION_MS + 50);
  };

  useEffect(() => {
    return () => {
      if (snapTimeoutRef.current !== null) {
        window.clearTimeout(snapTimeoutRef.current);
      }
    };
  }, []);

  // Apply current rotation to every (non-expanded) node by writing styles
  // straight to the DOM. Keeping this off React lets us animate at 60fps
  // without spending a single render cycle per frame.
  const applyRotationToDOM = (rotation: number) => {
    for (let i = 0; i < totalNodes; i++) {
      const el = nodeRefs.current[i];
      if (!el) continue;
      const pose = calcPose(i, totalNodes, rotation);
      el.style.left = pose.left;
      el.style.top = pose.top;
      el.style.transform = pose.transform;
      el.style.zIndex = String(pose.zIndex);
      el.style.opacity = String(pose.opacity);
    }
    if (aspectGroupRef.current) {
      aspectGroupRef.current.style.transform = `rotate(${rotation}deg)`;
    }
  };

  // Auto-rotation via requestAnimationFrame.
  useEffect(() => {
    if (!autoRotate || expandedId) return;
    const loop = (now: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = now;
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      rotationRef.current =
        (rotationRef.current + (ROTATION_DEG_PER_SEC * dt) / 1000) % 360;
      applyRotationToDOM(rotationRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = 0;
    };
    // applyRotationToDOM closes over totalNodes which only changes when
    // nodes change identity, so we list nodes here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRotate, expandedId, nodes]);

  // Close expanded card on Escape
  useEffect(() => {
    if (!expandedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeExpanded();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedId]);

  const closeExpanded = () => {
    enableSnapTransition();
    setExpandedId(null);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      closeExpanded();
    }
  };

  const toggleNode = (nodeId: string) => {
    if (expandedId === nodeId) {
      closeExpanded();
      return;
    }
    // Enable a brief CSS transition first, then write the snapped pose to the
    // DOM. The browser sees the value change with transitions on, so the
    // planets ease into their new positions instead of jumping.
    enableSnapTransition();
    const idx = nodes.findIndex((n) => n.id === nodeId);
    if (idx >= 0) {
      const targetAngle = (idx / totalNodes) * 360;
      rotationRef.current = (((270 - targetAngle) % 360) + 360) % 360;
      applyRotationToDOM(rotationRef.current);
    }
    setExpandedId(nodeId);
  };

  const initial = (userName ?? "").trim().charAt(0).toUpperCase() || "✦";

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className="relative w-full mx-auto aspect-square max-w-[640px] select-none"
        style={{ perspective: "1200px" }}
      >
        {/* Background glow rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-[78%] h-[78%] rounded-full border border-primary/10" />
          <div className="absolute w-[55%] h-[55%] rounded-full border border-primary/10" />
          <div className="absolute w-[35%] h-[35%] rounded-full border border-primary/15" />
        </div>

        {/* Centre — user pulse. One ping ring instead of two; paint cost halves
            with no real visible difference. */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex flex-col items-center">
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary via-secondary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/30">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-transparent animate-pulse" />
              <div className="absolute -inset-2 rounded-full border border-primary/30 animate-ping opacity-60" />
              <div className="relative w-12 h-12 rounded-full bg-background/85 backdrop-blur-md flex items-center justify-center">
                <span className="font-display text-xl font-medium text-foreground">
                  {initial}
                </span>
              </div>
            </div>
            {archetypeName && (
              <div className="mt-3 px-3 py-1 rounded-full border border-primary/30 bg-background/60 backdrop-blur-sm">
                <span className="font-label text-[10px] tracking-[0.18em] uppercase text-primary/80">
                  {archetypeName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Orbit nodes */}
        <div
          ref={orbitRef}
          className="absolute inset-0"
        >
          {/* Aspect lines — drawn behind planets, never intercept clicks.
              Lines are positioned at rotation = 0 and the entire group is
              rotated via CSS transform. During ambient rotation that
              transform is mutated directly by the rAF loop; during
              snap/collapse it animates via the same SNAP_DURATION_MS
              transition used for nodes so lines stay glued to planets. */}
          {aspectLines.length > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <g
                ref={aspectGroupRef}
                style={{
                  transform: `rotate(${rotationRef.current}deg)`,
                  transformOrigin: "50% 50%",
                  transformBox: "view-box",
                }}
              >
                {(() => {
                  const highlightActive = expandedId !== null;
                  return aspectLines.map((line) => {
                  const involvesSelected =
                    highlightActive &&
                    (line.planet1 === expandedId || line.planet2 === expandedId);
                  const opacity = !highlightActive
                    ? IDLE_LINE_OPACITY
                    : involvesSelected
                      ? SELECTED_OPACITY
                      : 0;
                  const p1 = calcLinePoint(line.i1, totalNodes);
                  const p2 = calcLinePoint(line.i2, totalNodes);
                  return (
                    <line
                      key={`${line.planet1}-${line.planet2}-${line.type}`}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={line.stroke}
                      strokeWidth={involvesSelected ? 1.2 : 0.6}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      opacity={opacity}
                      style={{
                        transition:
                          "opacity 400ms ease, stroke-width 300ms ease",
                      }}
                    />
                  );
                  });
                })()}
              </g>
            </svg>
          )}
          {nodes.map((node, index) => {
            const isExpanded = expandedId === node.id;
            const elementClass = ELEMENT_COLORS[SIGN_ELEMENTS[node.sign] ?? "air"];

            // Initial style at mount/re-render. While auto-rotating the rAF
            // loop overwrites these directly on the DOM so React stays out of
            // the per-frame loop. When expanded, we use the snapped pose.
            const basePose = calcPose(index, totalNodes, rotationRef.current);
            const style: React.CSSProperties = isExpanded
              ? {
                  left: basePose.left,
                  top: basePose.top,
                  transform: `translate(-50%, -50%) scale(1.1)`,
                  zIndex: 300,
                  opacity: 1,
                }
              : basePose;

            return (
              <div
                key={node.id}
                ref={(el) => {
                  nodeRefs.current[index] = el;
                }}
                className="absolute"
                style={style}
              >
                {/* Glow halo */}
                {isExpanded && (
                  <div
                    className={`absolute inset-0 rounded-full blur-xl bg-gradient-to-br ${elementClass}`}
                    style={{
                      width: "70px",
                      height: "70px",
                      left: "-15px",
                      top: "-15px",
                      opacity: 0.55,
                    }}
                  />
                )}

                {/* Node body */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(node.id);
                  }}
                  className={`relative cursor-pointer flex items-center justify-center rounded-full transition-transform duration-300 ${isExpanded ? "ring-2 ring-primary/70 shadow-xl shadow-primary/40" : "hover:scale-110"}`}
                  style={{ width: "40px", height: "40px" }}
                  aria-label={`${node.label} in ${node.sign}`}
                  aria-expanded={isExpanded}
                >
                  {node.imageSrc ? (
                    <img
                      src={node.imageSrc}
                      alt={node.label}
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                    />
                  ) : (
                    <div
                      className={`w-full h-full rounded-full flex items-center justify-center bg-gradient-to-br ${elementClass} text-white font-label text-[10px] font-bold tracking-wider shadow-md shadow-black/30`}
                    >
                      {node.label.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {node.retrograde && (
                    <span className="absolute -top-1 -right-1 text-[8px] text-amber-400 bg-background/90 rounded-full w-3.5 h-3.5 flex items-center justify-center font-label font-bold">
                      R
                    </span>
                  )}
                </button>

                {/* Label */}
                <div
                  className={`absolute left-1/2 top-full -translate-x-1/2 mt-1.5 whitespace-nowrap pointer-events-none transition-colors duration-300 ${isExpanded ? "text-foreground scale-110" : "text-foreground/60"}`}
                >
                  <span className="font-label text-[10px] tracking-[0.1em] uppercase">
                    {node.label}
                  </span>
                </div>

                {/* Expanded card */}
                {isExpanded && (
                  <Card
                    className="absolute left-1/2 top-full mt-10 -translate-x-1/2 w-72 bg-background/95 backdrop-blur-xl border-primary/30 shadow-2xl shadow-primary/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-px h-2 bg-primary/50" />
                    <CardHeader className="pb-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={`px-2 text-[10px] font-label tracking-wider ${
                            node.retrograde
                              ? "border-amber-400/50 text-amber-400 bg-amber-400/10"
                              : "border-primary/40 text-primary/90 bg-primary/10"
                          }`}
                        >
                          {node.retrograde ? "RETROGRADE" : "DIRECT"}
                        </Badge>
                        <span className="font-label text-[10px] text-muted-foreground tracking-wider">
                          {node.degree.toFixed(1)}° {node.sign}
                        </span>
                      </div>
                      <CardTitle className="text-base font-display font-medium">
                        {node.label}
                        {node.house !== undefined && (
                          <span className="ml-2 text-xs font-label text-muted-foreground">
                            · House {node.house}
                          </span>
                        )}
                      </CardTitle>
                      <p className="font-label text-[10px] text-muted-foreground tracking-wider uppercase">
                        {SIGN_ELEMENTS[node.sign]} · {SIGN_MODALITIES[node.sign]}
                      </p>
                    </CardHeader>
                    <CardContent className="text-xs text-foreground/80 space-y-3 max-h-[60vh] overflow-y-auto">
                      <p className="leading-relaxed whitespace-pre-line">{node.bodyText}</p>

                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="flex items-center gap-1 text-muted-foreground font-label tracking-wider">
                            <Sparkles className="h-2.5 w-2.5" />
                            Sign progress
                          </span>
                          <span className="font-mono text-foreground/70">
                            {node.degree.toFixed(1)}° / 30°
                          </span>
                        </div>
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${
                              ELEMENT_COLORS[SIGN_ELEMENTS[node.sign] ?? "air"]
                            }`}
                            style={{ width: `${(node.degree / 30) * 100}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>

        {/* Pause / Play */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setAutoRotate((p) => !p);
          }}
          className="absolute bottom-3 right-3 z-[400] h-8 w-8 rounded-full border border-border/60 bg-background/70 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/90 transition-colors"
          aria-label={autoRotate ? "Pause rotation" : "Resume rotation"}
        >
          {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
      </div>

      <p className="text-center text-[10px] font-label tracking-[0.18em] uppercase text-muted-foreground/60 mt-4">
        Tap any planet to explore
      </p>
    </div>
  );
}
