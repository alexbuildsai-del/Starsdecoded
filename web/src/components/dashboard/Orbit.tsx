/**
 * The dashboard's orbit (ADR-89 to 91, 96, 112): the reader at the centre, the
 * people they wrote on a plain dotted ring, a tap that holds the drift and
 * opens the card. It is not a chart (ADR-89): nothing on it sits at a degree,
 * so no zodiac, house, render or glyph is drawn. Who is on it, and in what
 * order, is `orbitPoints` (ADR-121 as ADR-139 narrows it); this only draws them.
 *
 * One SVG on a fixed 440 box that scales with its column, so the phone's full
 * width and the desktop's 440 px share one geometry. React draws the points;
 * one frame loop moves them in place (the drift, the float, the ring's cuts),
 * so no frame re-renders. Under reduced motion the same sky is drawn once,
 * whole and still at first paint.
 */
import {
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type AnimationEvent as ReactAnimationEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent,
} from "react";
import { pointAngles, ringGaps, type OrbitPoint, type RingGap } from "@/lib/orbit";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import "./orbit.css";

/** What a tap on the centre selects: the reader's own card, or the chart they still have to generate. */
export const CENTRE_ID = "self";

export interface OrbitCentre {
  /** The reader's first name, drawn once their own chart exists. */
  firstName: string;
  /** False with no chart of their own, or several marked as theirs (reading 3): the dashed disc asks for it. */
  hasReport: boolean;
  /** Their own report is still being written. */
  writing: boolean;
}

export interface OrbitProps {
  centre: OrbitCentre;
  /** In ring order, clockwise from the top: `orbitPoints`. */
  points: readonly OrbitPoint[];
  /** A point's id, `CENTRE_ID`, or null while nothing is open. */
  selectedId: string | null;
  /** Who keeps full light and a lit violet ring while something is open: `partnersOf`. Ids the orbit does not draw are ignored. */
  partners: readonly string[];
  onSelect: (id: string | null) => void;
}

/** The name's box and the disc, relative to the disc's centre, as far as the ring must stay clear of them. */
export interface Footprint {
  disc: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const SIZE = 440;
const MID = SIZE / 2;
const RADIUS = MID - 46;
const PLATE = 58;
const NODE = 19;
const LABEL_Y = NODE + 19;
const LABEL_SIZE = 9.5;
const LABEL_TRACK = 1.3;
const LINE_GAP = 11.5;
/** Past this a name slid in from nine o'clock would reach the centre's glow; the estimate runs a tenth wide. */
const LABEL_BUDGET = 165;
const SEPARATOR = " · ";
const EDGE = 4;

const DRIFT_DEG_PER_S = 3;
const FLOAT_X = 2.6;
const FLOAT_Y = 3.6;
const ARRIVAL_STAGGER_MS = 70;
const DIM = 0.4;
/** The reader's own card leaves the sky drifting and only softens it, as the artifact does: nothing on the ring needs holding still. */
const DIM_UNDER_CENTRE = 0.6;
/** The float's reach plus some air, so a bobbing disc or name never touches the ring. */
const CLEAR = Math.hypot(FLOAT_X, FLOAT_Y) + 5;
const REACH_STEP_DEG = 0.25;
const SIDES = [-1, 1] as const;

/** `orbitPoints` names the add point this way at zero credits where credits are enforced (ADR-138). */
const OUT_OF_CREDITS = "GET CREDITS";

const PAPER = "#E8EBF2";
const GROUND = "#0D1117";
const INDIGO = "#5C6BC0";
const INDIGO_LT = "#9FA8DA";
const GRADIENT_END = "#8967C1";
const VIOLET = "#9575CD";
const TEAL = "#3FA796";
const BRASS = "#D4B06A";
const MUTED = "#7E889A";
const SERIF = "Newsreader, Georgia, serif";
const GROTESK = "'Space Grotesk', ui-sans-serif, system-ui, sans-serif";

const round2 = (n: number) => Math.round(n * 100) / 100;
const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * How far from a point's centre, as a chord, the ring must be cut at this
 * angle: the disc always, the name only where the ring runs under it. Names
 * stay upright while the drift carries them round, so the cut follows the
 * angle; clearing every angle's worst case at once would leave a crowded
 * orbit with hardly any ring.
 */
export function ringReach(angleDeg: number, radius: number, f: Footprint): number {
  if (!(radius > 0)) return f.disc;
  const a = rad(angleDeg);
  const px = radius * Math.cos(a);
  const py = radius * Math.sin(a);
  const far = Math.max(f.disc, Math.hypot(Math.max(-f.left, f.right), Math.max(-f.top, f.bottom)));
  const span = far >= 2 * radius ? 180 : (2 * Math.asin(far / (2 * radius)) * 180) / Math.PI;
  let reach = f.disc;
  for (let d = REACH_STEP_DEG; d <= span + REACH_STEP_DEG; d += REACH_STEP_DEG) {
    for (const side of SIDES) {
      const b = a + side * rad(d);
      const x = radius * Math.cos(b) - px;
      const y = radius * Math.sin(b) - py;
      // One step past the last sample inside, so the cut never stops short of the name.
      if (x >= f.left && x <= f.right && y >= f.top && y <= f.bottom) {
        reach = Math.max(reach, 2 * radius * Math.sin(rad(d + REACH_STEP_DEG) / 2));
      }
    }
  }
  return reach;
}

/**
 * The dotted ring between the cuts, one arc per stretch in ring order. The
 * gaps come from `ringGaps` over angles ascending within one turn, which is
 * what `pointAngles` plus one drift gives; with no points the ring is whole.
 */
export function ringPath(cx: number, cy: number, radius: number, gaps: readonly RingGap[]): string {
  const at = (deg: number) => `${round2(cx + radius * Math.cos(rad(deg)))} ${round2(cy + radius * Math.sin(rad(deg)))}`;
  if (gaps.length === 0) return `M ${at(0)} A ${radius} ${radius} 0 1 1 ${at(180)} A ${radius} ${radius} 0 1 1 ${at(360)}`;
  const arcs: string[] = [];
  gaps.forEach((gap, i) => {
    const from = gap.end;
    const to = i + 1 < gaps.length ? gaps[i + 1].start : gaps[0].start + 360;
    if (to - from < 0.5) return;
    arcs.push(`M ${at(from)} A ${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${at(to)}`);
  });
  return arcs.join(" ");
}

/** How far a name slides in from under its disc to stay inside the box, so a long one at nine o'clock never leaves the orbit's column. */
export function labelShift(x: number, half: number, size = SIZE, edge = EDGE): number {
  const least = edge + half - x;
  const most = size - edge - half - x;
  if (least > most) return size / 2 - x;
  return Math.min(Math.max(0, least), most);
}

/** The first name at 21, smaller only when a long one would run into the plate's ring. */
export function centreNameSize(name: string): number {
  const n = Array.from(name.trim()).length;
  return n === 0 ? 21 : Math.max(11, Math.min(21, 192 / n));
}

/** Space Grotesk capitals at 9.5 with 1.3 tracking, generous by a tenth, until the name can be measured. */
function estimateLabelWidth(label: string): number {
  let width = 0;
  for (const ch of label) width += (ch === " " || ch === "·" ? 0.3 : 0.66) * LABEL_SIZE + LABEL_TRACK;
  return width;
}

/**
 * A name and its status on one line after the name, as the specs write them,
 * until the line grows past the budget: then the status drops under the name,
 * so a long name with GIFT WAITING never runs into the centre as the drift
 * carries it past three or nine o'clock. Decided from the text alone, so a
 * label never jumps between one line and two as fonts load.
 */
export function labelLines(label: string): string[] {
  const at = label.indexOf(SEPARATOR);
  if (at < 0 || estimateLabelWidth(label) <= LABEL_BUDGET) return [label];
  return [label.slice(0, at), label.slice(at + SEPARATOR.length)];
}

function footprint(shift: number, half: number, lines: number): Footprint {
  return {
    disc: NODE + 6 + CLEAR,
    left: shift - half - CLEAR,
    right: shift + half + CLEAR,
    top: LABEL_Y - 0.72 * LABEL_SIZE - CLEAR,
    bottom: LABEL_Y + (lines - 1) * LINE_GAP + 3 + CLEAR,
  };
}

/** A rhythm of its own per point, kept when someone joins or leaves the orbit. */
function phaseOf(id: string): number {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h >>> 0) % 6283) / 1000;
}

function pointName(p: OrbitPoint): string {
  if (p.kind === "add") return p.name;
  if (p.kind === "gift") return `${p.name}, gift waiting`;
  return [p.name, p.writing ? "writing" : "", p.sharedPair ? "you share a Compatibility report" : ""].filter(Boolean).join(", ");
}

function centreName(c: OrbitCentre): string {
  if (!c.hasReport) return "Your chart. Generate it";
  const glance = c.firstName.trim() ? `${c.firstName.trim()}, your chart at a glance` : "Your chart at a glance";
  return c.writing ? `${glance}. Writing your report` : glance;
}

function targetOf(el: EventTarget | null): string | null {
  return el instanceof Element ? el.closest("[data-orbit-id]")?.getAttribute("data-orbit-id") ?? null : null;
}

export function Orbit({ centre, points, selectedId, partners, onSelect }: OrbitProps) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const ringRef = useRef<SVGPathElement>(null);
  const els = useRef({ nodes: new Map<string, SVGGElement>(), labels: new Map<string, SVGTextElement>() });
  const widths = useRef(new Map<string, { label: string; width: number }>());
  const motion = useRef({ drift: 0, last: 0 });
  const seen = useRef(new Set<string>());
  const [arriving, setArriving] = useState<ReadonlyMap<string, number>>(() => new Map());

  const lone = points.length === 1 && points[0].kind === "add";
  const active = selectedId !== null && (selectedId === CENTRE_ID || points.some((p) => p.id === selectedId)) ? selectedId : null;
  // The centre never moves, so only a point holds the drift still under its card.
  const held = active !== null && active !== CENTRE_ID;
  const lit = new Set(active === null ? [] : partners);

  const live = useRef({ points, lone, held, reduced });
  live.current = { points, lone, held, reduced };

  const place = useCallback((now: number) => {
    const { points: pts, lone: alone, reduced: still } = live.current;
    const { nodes, labels } = els.current;
    const secs = now / 1000;
    const bob = still || alone ? 0 : 1;
    // The lone Add someone point waits at the bottom of an empty ring, as the empty states show it.
    const angles = alone ? pointAngles(1, 90) : pointAngles(pts.length).map((a) => a + motion.current.drift);
    const reach = pts.map((p, i) => {
      const phase = phaseOf(p.id);
      const x = MID + RADIUS * Math.cos(rad(angles[i])) + bob * FLOAT_X * Math.sin(secs * 0.55 + phase);
      const y = MID + RADIUS * Math.sin(rad(angles[i])) + bob * FLOAT_Y * Math.cos(secs * 0.42 + phase * 1.3);
      nodes.get(p.id)?.setAttribute("transform", `translate(${round2(x)} ${round2(y)})`);
      const lines = labelLines(p.label);
      const half = (widths.current.get(p.id)?.width ?? Math.max(...lines.map(estimateLabelWidth))) / 2;
      const shift = labelShift(x, half);
      labels.get(p.id)?.setAttribute("transform", `translate(${round2(shift)} 0)`);
      return ringReach(angles[i], RADIUS, footprint(shift, half, lines.length));
    });
    ringRef.current?.setAttribute("d", ringPath(MID, MID, RADIUS, ringGaps(angles, RADIUS, reach)));
  }, []);

  // A name not laid out yet measures 0 and keeps its estimate until it can be measured.
  const measure = useCallback((all: boolean) => {
    for (const [id, text] of els.current.labels) {
      const label = text.textContent ?? "";
      if (!all && widths.current.get(id)?.label === label) continue;
      let width = 0;
      try {
        width = text.getBBox().width;
      } catch {
        width = 0;
      }
      if (width > 0) widths.current.set(id, { label, width });
      else widths.current.delete(id);
    }
  }, []);

  // After every render, before paint: the elements React just drew, their names' widths, their places.
  useLayoutEffect(() => {
    const nodes = new Map<string, SVGGElement>();
    const labels = new Map<string, SVGTextElement>();
    svgRef.current?.querySelectorAll<SVGGElement>("g[data-orbit-point]").forEach((g) => {
      const id = g.getAttribute("data-orbit-point") ?? "";
      nodes.set(id, g);
      const text = g.querySelector<SVGTextElement>("text[data-orbit-label]");
      if (text) labels.set(id, text);
    });
    els.current = { nodes, labels };
    for (const id of widths.current.keys()) if (!labels.has(id)) widths.current.delete(id);
    measure(false);
    place(performance.now());
  });

  // Space Grotesk arrives from its CDN after first paint (MB-42); the names are measured again in it.
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => {
      if (!alive) return;
      measure(true);
      place(performance.now());
    });
    return () => {
      alive = false;
    };
  }, [measure, place]);

  // Points pop on 70 ms apart as they first appear, on first load or when someone joins later.
  const ids = points.map((p) => p.id).join("\n");
  useLayoutEffect(() => {
    const fresh = ids ? ids.split("\n").filter((id) => !seen.current.has(id)) : [];
    fresh.forEach((id) => seen.current.add(id));
    if (reduced || fresh.length === 0) return;
    setArriving((prev) => {
      const next = new Map(prev);
      fresh.forEach((id, i) => next.set(id, i * ARRIVAL_STAGGER_MS));
      return next;
    });
  }, [ids, reduced]);

  const arrived = useCallback((e: ReactAnimationEvent<SVGGElement>) => {
    if (e.target !== e.currentTarget || e.animationName !== "orbit-pop") return;
    const id = e.currentTarget.getAttribute("data-arrive") ?? "";
    setArriving((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // The lone Add someone point stands still, so an empty orbit runs no frame loop at all.
  useEffect(() => {
    if (reduced || lone) return;
    const m = motion.current;
    const svg = svgRef.current;
    let frame = 0;
    let visible = true;
    const tick = (now: number) => {
      // A tab in the background comes back where it left off rather than a jump ahead.
      const dt = m.last ? Math.min(0.1, (now - m.last) / 1000) : 0;
      m.last = now;
      if (!live.current.held) m.drift = (m.drift + DRIFT_DEG_PER_S * dt) % 360;
      place(now);
      frame = visible ? requestAnimationFrame(tick) : 0;
    };
    // Scrolled out of sight, the sky stops drawing and resumes where it was.
    const io = svg && typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (visible && frame === 0) {
          m.last = 0;
          frame = requestAnimationFrame(tick);
        }
      })
      : null;
    if (svg) io?.observe(svg);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      io?.disconnect();
      m.last = 0;
    };
  }, [reduced, lone, place]);

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // A dialog opened from the card closes on its own Escape and leaves the card open.
      if (e.target instanceof Element && e.target.closest("[role='dialog'], [role='alertdialog']")) return;
      onSelect(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, onSelect]);

  const onClick = (e: ReactMouseEvent<SVGSVGElement>) => {
    const id = targetOf(e.target);
    if (id !== null) onSelect(id === active ? null : id);
    else if (active !== null) onSelect(null);
  };

  const onKeyDown = (e: ReactKeyboardEvent<SVGSVGElement>) => {
    if ((e.key !== "Enter" && e.key !== " ") || e.repeat) return;
    const id = targetOf(e.target);
    if (id === null) return;
    e.preventDefault();
    onSelect(id === active ? null : id);
  };

  const opacityOf = (id: string) => {
    if (active === null || id === active || lit.has(id)) return 1;
    return active === CENTRE_ID ? DIM_UNDER_CENTRE : DIM;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="group"
      aria-label="Your orbit"
      className="orbit mx-auto block aspect-square h-auto w-full max-w-[440px] select-none overflow-visible"
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <defs>
        <radialGradient id={`${uid}-haze`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={INDIGO} stopOpacity={0.22} />
          <stop offset="0.6" stopColor={VIOLET} stopOpacity={0.06} />
          <stop offset="1" stopColor={GROUND} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${uid}-plate`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={INDIGO} />
          <stop offset="1" stopColor={GRADIENT_END} />
        </linearGradient>
      </defs>
      <circle cx={MID} cy={MID} r={MID} fill={`url(#${uid}-haze)`} />
      <path ref={ringRef} fill="none" stroke={PAPER} strokeOpacity={0.26} strokeWidth={1} strokeDasharray="1 5" />
      <Centre centre={centre} selected={active === CENTRE_ID} reduced={reduced} plate={`url(#${uid}-plate)`} />
      {points.map((p) => (
        <PointMark
          key={p.id}
          point={p}
          selected={p.id === active}
          lit={lit.has(p.id)}
          opacity={opacityOf(p.id)}
          delay={reduced ? undefined : arriving.get(p.id)}
          reduced={reduced}
          onArrived={arrived}
        />
      ))}
    </svg>
  );
}

function Centre({ centre, selected, reduced, plate }: { centre: OrbitCentre; selected: boolean; reduced: boolean; plate: string }) {
  const name = centre.firstName.trim();
  const nameSize = centreNameSize(name);
  return (
    <g
      data-orbit-id={CENTRE_ID}
      className="orbit-hit orbit-centre"
      role="button"
      tabIndex={0}
      aria-pressed={centre.hasReport ? selected : undefined}
      aria-label={centreName(centre)}
      transform={`translate(${MID} ${MID})`}
    >
      <g className="orbit-lift">
        {centre.hasReport ? (
          <>
            {/* While their own report is written, its turning ring is the centre's one motion, as the dashed disc turns instead of breathing. */}
            <circle className={reduced || centre.writing ? undefined : "orbit-breathe"} r={PLATE + 10} fill={INDIGO} fillOpacity={0.16} />
            {selected && !reduced && <circle className="orbit-pulse" r={PLATE + 4} fill="none" stroke={INDIGO_LT} strokeWidth={1.5} />}
            <circle className="orbit-focus" r={PLATE + 14} fill="none" strokeWidth={1.5} />
            {centre.writing && (
              <circle
                className={reduced ? undefined : "orbit-turn"}
                r={PLATE + 5}
                fill="none"
                stroke={INDIGO_LT}
                strokeOpacity={0.8}
                strokeWidth={1.2}
                strokeDasharray="3 3"
                pathLength={396}
              />
            )}
            <circle r={PLATE} fill={plate} fillOpacity={0.92} stroke={selected ? PAPER : "none"} strokeWidth={1.5} />
            <circle r={PLATE - 3} fill={GROUND} fillOpacity={selected ? 0.45 : 0.58} />
            <text y={-PLATE * 0.34} textAnchor="middle" fontFamily={GROTESK} fontSize={8.5} fontWeight={500} letterSpacing={centre.writing ? 1.4 : 2} fill={BRASS} fillOpacity={0.9}>
              {centre.writing ? "YOU · WRITING" : "YOU"}
            </text>
            <text y={round2(nameSize / 3)} textAnchor="middle" fontFamily={SERIF} fontSize={nameSize} fill="#F2F4F9">{name}</text>
            <text y={PLATE * 0.5} textAnchor="middle" fontFamily={GROTESK} fontSize={9.5} letterSpacing={0.8} fill={INDIGO_LT}>At a glance ›</text>
          </>
        ) : (
          <>
            {selected && !reduced && <circle className="orbit-pulse" r={PLATE + 4} fill="none" stroke={INDIGO_LT} strokeWidth={1.5} />}
            <circle className="orbit-focus" r={PLATE + 6} fill="none" strokeWidth={1.5} />
            <circle
              className={reduced ? undefined : "orbit-turn-slow"}
              r={PLATE}
              fill={GROUND}
              stroke={INDIGO}
              strokeOpacity={0.7}
              strokeDasharray="3 4"
              pathLength={364}
            />
            <text y={-2} textAnchor="middle" fontFamily={SERIF} fontSize={16} fill={PAPER}>Your chart</text>
            <text y={18} textAnchor="middle" fontFamily={GROTESK} fontSize={9.5} fill={INDIGO_LT}>Generate it ›</text>
          </>
        )}
      </g>
    </g>
  );
}

interface PointMarkProps {
  point: OrbitPoint;
  selected: boolean;
  lit: boolean;
  opacity: number;
  /** Milliseconds before this point pops on; undefined once it has arrived. */
  delay: number | undefined;
  reduced: boolean;
  onArrived: (e: ReactAnimationEvent<SVGGElement>) => void;
}

function PointMark({ point, selected, lit, opacity, delay, reduced, onArrived }: PointMarkProps) {
  const out = point.kind === "add" && point.label === OUT_OF_CREDITS;
  const tint = point.kind === "gift" ? TEAL : point.kind === "add" ? (out ? MUTED : INDIGO_LT) : PAPER;
  const labelOpacity = point.kind !== "person" ? 0.9 : selected ? 1 : 0.8;
  const lines = labelLines(point.label);
  return (
    <g
      data-orbit-point={point.id}
      data-orbit-id={point.id}
      className="orbit-hit orbit-point"
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={pointName(point)}
      style={{ opacity }}
    >
      <g
        data-arrive={point.id}
        className={delay === undefined ? undefined : "orbit-arrive"}
        style={delay ? { animationDelay: `${delay}ms` } : undefined}
        onAnimationEnd={onArrived}
      >
        <g className="orbit-lift">
          <circle r={NODE + 12} fill="transparent" />
          <circle className="orbit-glow" r={NODE + 9} fill={PAPER} fillOpacity={selected ? 0.12 : 0.04} />
          {selected && !reduced && <circle className="orbit-pulse" r={NODE + 6} fill="none" stroke={INDIGO_LT} strokeWidth={1.5} />}
          <circle className="orbit-focus" r={NODE + 11} fill="none" strokeWidth={1.5} />
          {(point.sharedPair || lit) && (
            <circle
              className={lit && !reduced ? "orbit-lit" : undefined}
              r={NODE + 4.5}
              fill="none"
              stroke={VIOLET}
              strokeWidth={lit ? 2.2 : 1.4}
              strokeOpacity={lit ? 1 : 0.9}
            />
          )}
          <Disc point={point} selected={selected} out={out} reduced={reduced} />
          <text
            data-orbit-label=""
            y={LABEL_Y}
            textAnchor="middle"
            fontFamily={GROTESK}
            fontSize={LABEL_SIZE}
            fontWeight={500}
            letterSpacing={LABEL_TRACK}
            fill={tint}
            fillOpacity={labelOpacity}
            stroke={GROUND}
            strokeWidth={3}
            strokeLinejoin="round"
            style={{ paintOrder: "stroke" }}
          >
            {lines.length === 1
              ? point.label
              : lines.map((line, i) => <tspan key={i} x={0} dy={i === 0 ? 0 : LINE_GAP}>{line}</tspan>)}
          </text>
        </g>
      </g>
    </g>
  );
}

function Disc({ point, selected, out, reduced }: { point: OrbitPoint; selected: boolean; out: boolean; reduced: boolean }) {
  if (point.kind === "gift") {
    return (
      <>
        <circle r={NODE} fill={selected ? "rgba(63,167,150,.18)" : GROUND} stroke={TEAL} strokeWidth={1.6} strokeDasharray="2 3" pathLength={120} />
        <g transform="translate(-7 -5)" fill="none" stroke={TEAL} strokeWidth={1.4} strokeLinejoin="round">
          <rect width={14} height={10} rx={1.5} />
          <path d="M0 1 L7 6 L14 1" />
        </g>
      </>
    );
  }
  if (point.kind === "add") {
    return (
      <>
        <circle
          r={NODE}
          fill={selected ? "rgba(92,107,192,.25)" : GROUND}
          stroke={out ? MUTED : INDIGO}
          strokeOpacity={out ? 0.6 : 0.9}
          strokeWidth={1.5}
          strokeDasharray="3 3"
          pathLength={120}
        />
        <path d="M-6 0 H6 M0 -6 V6" stroke={out ? MUTED : INDIGO_LT} strokeWidth={1.5} strokeLinecap="round" />
      </>
    );
  }
  const dashed = point.writing && !selected;
  return (
    <>
      <circle
        className={dashed && !reduced ? "orbit-turn" : undefined}
        r={NODE}
        fill={selected ? PAPER : GROUND}
        stroke={selected ? INDIGO : PAPER}
        strokeOpacity={selected ? 1 : 0.45}
        strokeWidth={selected ? 2 : 1.4}
        strokeDasharray={dashed ? "3 3" : undefined}
        pathLength={120}
      />
      <text y={5} textAnchor="middle" fontFamily={SERIF} fontSize={14} fill={selected ? GROUND : PAPER}>{point.initials}</text>
    </>
  );
}

export default Orbit;
