/**
 * The one natal chart, painted from buildScene. Nothing here decides where a body goes: the scene holds every angle
 * and radius, so a chart drawn in any state, at any size, keeps each body at its true degree (MASTERFILE §9).
 */
import { useId, useRef, useState, type ReactNode, type SVGProps } from "react";
import { tokens } from "@workspace/design";
import { PLANET_LABELS, type ChartData } from "@/types/chart";
import { houseWithWord } from "@/lib/evidence-glossary";
import { SignRing } from "@/ds/atoms/SignRing";
import { PlanetBodyMark } from "@/ds/atoms/PlanetBody";
import { Button } from "@/ds/atoms/Button";
import {
  arcLabelPath, arcPath, degreesMinutes, pointAt, wedgePath, type Point,
} from "@/components/chart/wheel-geometry";
import {
  buildScene, layerOf, type Scene, type SceneBody, type SceneGuest, type SceneOptions,
} from "@/ds/organisms/chart/scene";
import type { ChartState } from "@/ds/organisms/chart/states";

const c = tokens.color;
const font = tokens.fontFamily;

// To the hundredth, as wheel-geometry writes its paths: the engine that prerenders a chart and the browser that
// hydrates it can differ in a sine's last digit, and hydration needs the attributes the server wrote.
function spot(cx: number, r: number, angle: number): Point {
  const p = pointAt(cx, cx, r, angle);
  return { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 };
}

// MB-196 provisional: keyboard focus on the chart takes the site's focus colour, never brass, since brass already
// means lit; a non-scaling 1.5 px line in the stop's own shape, since a CSS outline round an SVG group is a box across
// its neighbours.
const FOCUS_OUTLINE = {
  fill: "none",
  stroke: c.focus,
  strokeWidth: 1.5,
  vectorEffect: "non-scaling-stroke",
  opacity: 0,
  className: "group-focus-visible/stop:opacity-100",
} as const;

/** Where a reader can point at a planet and read its chip. */
const CHIPPED: readonly ChartState[] = ["full", "focus", "live-sky", "no-birth-time", "pair"];

export interface ChartProps extends SceneOptions {
  chart: ChartData;
  state: ChartState;
  /** The plate's side in pixels: every radius is wheelRadii(size), and names and ticks follow the table's sizes. */
  size: number;
  /** Fill the parent's width instead of `size` pixels; the layers still follow `size`. */
  fluid?: boolean;
  /** Houses and planets take focus and a click, with a link to skip past them. */
  stops?: boolean;
  onPickHouse?: (house: number) => void;
  /** The accessible name; "Natal chart wheel" by default, with ", horizon not drawn" added for a chart without one. */
  label?: string;
  className?: string;
  /** Drawn over the chart, in the plate's units (0 to size). */
  children?: ReactNode;
}

function chipText(chart: ChartData, id: string): string {
  const p = chart.planets[id];
  const parts = [`${PLANET_LABELS[id] ?? id}`, `${degreesMinutes(p.degree)} ${p.sign}`];
  if (p.house) parts.push(houseWithWord(p.house));
  if (p.retrograde) parts.push("going backwards");
  return parts.join(" · ");
}

function Chip({ scene, body, text }: { scene: Scene; body: SceneBody; text: string }) {
  const { size, radii } = scene;
  const at = spot(radii.centre, body.radius, body.angle);
  const fs = size * 0.022;
  const w = text.length * fs * 0.6 + fs * 1.6;
  const h = fs * 1.9;
  const x = Math.min(Math.max(at.x - w / 2, -scene.pad), size + scene.pad - w);
  const above = at.y <= radii.centre;
  const y = above ? at.y - body.size * 0.8 - h : at.y + body.size * 0.8;
  return (
    <g pointerEvents="none" data-chip>
      <rect x={x} y={y} width={w} height={h} rx={size * 0.008} fill={c.raised} stroke={c.line} />
      <text x={x + w / 2} y={y + h * 0.66} textAnchor="middle" fontFamily={font.mono} fontSize={fs} fill={c.paper}>
        {text}
      </text>
    </g>
  );
}

function zigzag(p0: Point, p1: Point, amp: number): string {
  const n = 8;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const off = i === 0 || i === n ? 0 : i % 2 ? amp : -amp;
    return `${(p0.x + dx * t + nx * off).toFixed(2)} ${(p0.y + dy * t + ny * off).toFixed(2)}`;
  });
  return `M${pts.join(" L")}`;
}

const SIDES: Record<number, number> = { 60: 6, 90: 4, 120: 3 };

/** The link drawn on this chart (TwoCharts): the guest at its true degree, both ticks, the shape, the side, the angle. */
function GuestLink({ scene, guest }: { scene: Scene; guest: SceneGuest }) {
  const { size, radii: r } = scene;
  const cx = r.centre;
  const tone = guest.kind === "easy" ? c.teal : c.rose;
  const g = spot(cx, guest.radius, guest.angle);
  const gIn = spot(cx, r.aspect, guest.angle);
  const own = guest.own;
  const sides = SIDES[guest.separation];
  const ownIn = own ? spot(cx, r.aspect, own.angle) : null;
  const between = own ? ((guest.angle - own.angle + 540) % 360) - 180 : 0;
  return (
    <g data-guest={guest.body}>
      {own && sides && (
        <polygon
          points={Array.from({ length: sides }, (_, i) => {
            const p = spot(cx, r.aspect, own.angle + (Math.sign(between) || 1) * (360 / sides) * i);
            return `${p.x} ${p.y}`;
          }).join(" ")}
          fill={tone} fillOpacity={0.06} stroke={tone} strokeOpacity={0.38} strokeWidth={size / 600}
        />
      )}
      {own && ownIn && guest.kind === "same" && <circle cx={ownIn.x} cy={ownIn.y} r={size * 0.012} fill={c.brass} />}
      {own && ownIn && guest.kind === "easy" && (
        <line x1={ownIn.x} y1={ownIn.y} x2={gIn.x} y2={gIn.y} stroke={tone} strokeWidth={size / 300} />
      )}
      {own && ownIn && guest.kind === "tense" && (
        <path d={zigzag(ownIn, gIn, size * 0.008)} fill="none" stroke={tone} strokeWidth={size / 300} strokeLinejoin="round" />
      )}
      {own && (
        <g data-angle>
          <path
            d={arcPath(cx, cx, r.aspect * 0.32, Math.min(own.angle, own.angle + between), Math.max(own.angle, own.angle + between))}
            fill="none" stroke={c.muted} strokeOpacity={0.7} strokeWidth={size / 600}
          />
          <text x={cx} y={cx + size * 0.012} textAnchor="middle" fontFamily={font.mono} fontSize={size * 0.04} fill={c.muted}>
            {guest.separation}°
          </text>
        </g>
      )}
      <line x1={gIn.x} y1={gIn.y} x2={g.x} y2={g.y} stroke={c.paper} strokeOpacity={0.5} strokeDasharray="2 3" strokeWidth={size / 600} />
      <g opacity={0.55}>
        <PlanetBodyMark body={guest.body} size={guest.size} x={g.x} y={g.y} disc />
      </g>
      <circle cx={g.x} cy={g.y} r={guest.size * 2 * 0.72} fill="none" stroke={c.paper} strokeDasharray="3 3" strokeWidth={size / 600} />
    </g>
  );
}

export function Chart({
  chart, state, size, fluid = false, stops = false, onPickHouse, label, className, children, ...options
}: ChartProps) {
  const uid = `chart${useId().replace(/[^\w-]/g, "")}`;
  const [pointed, setPointed] = useState<string | null>(null);
  const after = useRef<HTMLSpanElement>(null);
  const scene = buildScene(chart, state, size, options);
  const { radii: r, pad } = scene;
  const cx = r.centre;

  const slices = layerOf(scene, "sign-slices");
  const names = layerOf(scene, "sign-names");
  const ticks = layerOf(scene, "ticks");
  const houses = layerOf(scene, "houses");
  const words = layerOf(scene, "house-words");
  const planets = layerOf(scene, "planets");
  const points = layerOf(scene, "points");
  const backwards = new Set(layerOf(scene, "retrograde")?.ids ?? []);
  const lines = layerOf(scene, "lines");
  const horizon = layerOf(scene, "horizon");
  const marker = layerOf(scene, "rising-marker");
  const guest = layerOf(scene, "guest")?.guest ?? null;
  const chips = CHIPPED.includes(state) && size >= 200;
  const interactive = stops && houses !== undefined;

  const name = `${label ?? "Natal chart wheel"}${scene.timed ? "" : ", horizon not drawn"}`;
  const pick = (h: number) => onPickHouse?.(h);

  const bodies = [...(planets?.bodies ?? []), ...(points?.bodies ?? [])];

  return (
    <div className={`relative${fluid ? " w-full" : ""}${className ? ` ${className}` : ""}`} data-chart-state={state}>
      {stops && (
        <Button
          asChild
          size="compact"
          className="absolute! left-2 top-2 z-10 not-focus:sr-only not-focus:min-w-0"
        >
          <a
            href={`#${uid}-after`}
            onClick={(e) => {
              // Focus, not the fragment: the address keeps no generated id and the history no extra step.
              e.preventDefault();
              after.current?.focus();
            }}
          >
            Skip past the chart wheel
          </a>
        </Button>
      )}
      <svg
        viewBox={`${-pad} ${-pad} ${size + 2 * pad} ${size + 2 * pad}`}
        width={fluid ? undefined : size}
        height={fluid ? undefined : size}
        className={fluid ? "block h-auto w-full" : "block"}
        // A group while its planets and houses take focus, which an img role may not hold; with no stop it is one picture.
        role={stops ? "group" : "img"}
        aria-label={name}
        data-horizon={scene.timed ? "drawn" : "none"}
      >
        {slices && (
          <SignRing
            size={size}
            asc={scene.frame}
            names={names !== undefined}
            ticks={ticks !== undefined}
            innerCircle={state !== "sun-moon-rising"}
            lit={slices.lit}
          />
        )}

        {houses?.houses.map((h) => {
          const word = words?.words[h.house - 1];
          const wordId = `${uid}-h${h.house}`;
          const drawn = (
            <>
              <path
                d={wedgePath(cx, cx, r.tick, r.aspect, h.from, h.to)}
                fill={h.lit ? c.brass : c.paper}
                fillOpacity={h.opacity}
              />
              {word && (
                <>
                  <path id={wordId} d={arcLabelPath(cx, cx, words!.radius, word.from + 1.5, word.to - 1.5)} fill="none" />
                  <text
                    fontFamily={font.label}
                    fontSize={size * 0.019}
                    letterSpacing={size * 0.002}
                    fill={c.paper}
                    fillOpacity={word.opacity}
                    dominantBaseline="middle"
                    data-house-word
                  >
                    <textPath href={`#${wordId}`} startOffset="50%" textAnchor="middle">{word.label}</textPath>
                  </text>
                </>
              )}
            </>
          );
          if (!interactive) return <g key={h.house} data-house={h.house}>{drawn}</g>;
          return (
            <g
              key={h.house}
              data-house={h.house}
              tabIndex={0}
              role="button"
              aria-label={`House ${h.house}, ${h.sign}`}
              className="group/stop cursor-pointer outline-none"
              onClick={() => pick(h.house)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pick(h.house);
                }
              }}
            >
              {/* The whole slice, ring and all, answers a click, as the sign band did. */}
              <path d={wedgePath(cx, cx, r.signOuter, r.aspect, h.from, h.to)} fill="transparent" />
              {drawn}
              <path d={wedgePath(cx, cx, r.signOuter, r.aspect, h.from, h.to)} {...FOCUS_OUTLINE} />
            </g>
          );
        })}

        {lines?.lines.map((l) => {
          const p1 = spot(cx, r.aspect, l.from);
          const p2 = spot(cx, r.aspect, l.to);
          return (
            <line
              key={`${l.a}-${l.b}-${l.type}`}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={c[l.colour]}
              strokeWidth={l.width}
              strokeOpacity={l.opacity}
              strokeLinecap="round"
              strokeDasharray={l.dashed ? `${(3 * size) / 600} ${(4 * size) / 600}` : undefined}
            />
          );
        })}

        {horizon && (
          <g data-horizon-line>
            {([["east", horizon.east, horizon.eastWidth, 0.45], ["west", horizon.west, horizon.westWidth, 0.25]] as const).map(
              ([side, angle, width, opacity]) => {
                const a = spot(cx, horizon.from, angle);
                const b = spot(cx, horizon.to, angle);
                return <line key={side} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c.paper} strokeOpacity={opacity} strokeWidth={width} />;
              },
            )}
          </g>
        )}

        {marker && (() => {
          const at = spot(cx, marker.radius, marker.angle);
          const tip = spot(cx, marker.radius + marker.ring + marker.tail, marker.angle);
          const ink = marker.lit ? c.brass : c.paper;
          return (
            <g data-rising-marker>
              <line x1={at.x} y1={at.y} x2={tip.x} y2={tip.y} stroke={ink} strokeWidth={marker.stroke} strokeLinecap="round" />
              <circle cx={at.x} cy={at.y} r={marker.ring} fill={c.ground} stroke={ink} strokeWidth={marker.stroke} />
              <circle cx={at.x} cy={at.y} r={marker.ring * 0.35} fill={ink} />
            </g>
          );
        })()}

        {planets?.moonBand && (
          <path
            d={arcPath(cx, cx, planets.moonBand.radius, planets.moonBand.from, planets.moonBand.to)}
            fill="none" stroke={c["paper-dim"]} strokeOpacity={0.7} strokeWidth={size * 0.011} strokeLinecap="round" data-moon-band
          />
        )}

        {guest && <GuestLink scene={scene} guest={guest} />}

        {bodies.map((b) => {
          const at = spot(cx, b.radius, b.angle);
          const p = chart.planets[b.id];
          const show = () => setPointed(b.id);
          const hide = () => setPointed((cur) => (cur === b.id ? null : cur));
          const stop: SVGProps<SVGGElement> = stops ? {
            tabIndex: 0,
            role: "button",
            "aria-label": `${PLANET_LABELS[b.id] ?? b.id} ${p.degree.toFixed(1)} degrees ${p.sign}${p.house ? `, house ${p.house}` : ""}`,
            className: "group/stop cursor-pointer outline-none",
            onFocus: show,
            onBlur: hide,
            onClick: () => { if (p.house) pick(p.house); },
            onKeyDown: (e) => {
              if ((e.key === "Enter" || e.key === " ") && p.house) {
                e.preventDefault();
                pick(p.house);
              }
            },
          } : {};
          const hover = chips ? { onMouseEnter: show, onMouseLeave: hide } : {};
          const ring = b.ringed || pointed === b.id;
          return (
            // data-body is where a page finds the body as drawn; its first circle is the backing disc.
            <g key={b.id} data-body={b.id} opacity={b.opacity} {...hover} {...stop}>
              <PlanetBodyMark body={b.id} size={b.size} x={at.x} y={at.y} disc retrograde={backwards.has(b.id)} />
              {ring && (
                <circle
                  cx={at.x} cy={at.y} r={b.size * 0.72} fill="none"
                  stroke={state === "pair" ? c.paper : c.brass} strokeWidth={Math.max(1, size / 400)}
                  data-ring
                />
              )}
            </g>
          );
        })}

        {chips && pointed && bodies.some((b) => b.id === pointed) && (
          <Chip scene={scene} body={bodies.find((b) => b.id === pointed)!} text={chipText(chart, pointed)} />
        )}

        {children}
      </svg>
      {stops && <span ref={after} id={`${uid}-after`} tabIndex={-1} className="absolute bottom-0 left-0 outline-none" />}
    </div>
  );
}

export default Chart;
