/**
 * The natal wheel, drawn from the chart. A body's angle comes only from its
 * absoluteDegree; crowding moves it inward, never around (ADR-17). The
 * Ascendant is a point on the horizon and is never drawn as a body.
 *
 * The sign band names every house (ADR-98): the sign on its outer line, the
 * house's number and word under it; there is no house-number ring. A blind
 * chart (ADR-34) keeps the sign band and every body at its degree, framed on
 * 0° Aries, and draws no house line, no axes and no quadrant names: there is
 * no horizon to hang them on.
 *
 * Given `centreName` the wheel stands alone, as in the pair's chapter 01
 * (ADR-97): the name and the rising degree sit in the centre, no aspect line
 * is drawn and no house is selected or selectable; the degree chip stays.
 */
import { useState, type ReactNode } from "react";
import { PLANET_GLYPHS, PLANET_LABELS, type ChartData } from "@/types/chart";
import { renderFor } from "@/lib/planet-renders";
import { HOUSE_WORDS } from "@/lib/evidence-glossary";
import {
  QUADRANT_NAMES, arcLabelPath, aspectStrength, assignLanes, degreesMinutes, houseSign, opposite,
  pointAt, theta, wedgePath, wheelRadii,
} from "@/components/chart/wheel-geometry";

const PLATE = 600;

/* SVG ids must be valid XML names, which React's useId output is not. */
let instances = 0;

const ASPECT_STROKE: Record<string, string> = {
  conjunction: "hsl(var(--brass))",
  trine: "hsl(var(--chart-4))",
  sextile: "hsl(var(--chart-4))",
  square: "hsl(var(--destructive))",
  opposition: "hsl(var(--destructive))",
};

const BRASS = "hsl(var(--brass))";

function BodyMark({ body, x, y, size }: { body: string; x: number; y: number; size: number }) {
  const src = renderFor(body, size);
  if (src) {
    return (
      <image
        href={src}
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }
  // Points, and any marker too large for a 192 px source, are drawn.
  return (
    <g>
      <circle cx={x} cy={y} r={size * 0.42} fill="hsl(var(--background))" stroke={BRASS} strokeOpacity={0.55} />
      <text
        x={x}
        y={y + size * 0.16}
        textAnchor="middle"
        fontSize={size * 0.46}
        fill={BRASS}
      >
        {PLANET_GLYPHS[body] ?? "·"}
      </text>
    </g>
  );
}

/** The band's house line: the number and the house's one word (ADR-98). */
export function houseBandLabel(house: number): string {
  return `${house} · ${HOUSE_WORDS[house - 1].toUpperCase()}`;
}

export interface NatalWheelProps {
  chartData: ChartData;
  /** interpretation.meta.orbs — aspect weight is measured against the real budget. */
  orbs?: Record<string, number>;
  selectedHouse?: number;
  onSelectHouse?: (house: number) => void;
  /** Side panel slot. The wheel does not know what a house card looks like. */
  renderHouse?: (house: number) => ReactNode;
  /** The wheel stands alone: this name and the rising line in the centre, no aspect lines, no house to select. */
  centreName?: string;
}

export function NatalWheel({
  chartData,
  orbs,
  selectedHouse,
  onSelectHouse,
  renderHouse,
  centreName,
}: NatalWheelProps) {
  const [uid] = useState(() => `natal-wheel-${++instances}`);
  const [internalHouse, setInternalHouse] = useState(1);
  const [hovered, setHovered] = useState<string | null>(null);

  const standalone = centreName !== undefined;
  const house = standalone ? 0 : selectedHouse ?? internalHouse;
  function selectHouse(h: number) {
    if (standalone) return;
    setInternalHouse(h);
    onSelectHouse?.(h);
  }

  const drawn = chartData.angles !== undefined;
  const ascendant = chartData.angles?.ascendant;
  const asc = ascendant?.absoluteDegree ?? 0;
  const mc = chartData.angles?.midheaven.absoluteDegree ?? 90;
  const r = wheelRadii(PLATE);
  const c = r.centre;
  const pad = PLATE * 0.085;

  const bodies = Object.entries(chartData.planets)
    .filter(([, p]) => p && typeof p.absoluteDegree === "number");

  const placements = assignLanes(
    bodies.map(([key, p]) => ({ key, absoluteDegree: p.absoluteDegree })),
    asc,
    { lanes: r.lanes, node: r.node, gap: PLATE * 0.01 },
  );

  const axes: { key: string; label: string; degree: number; major: boolean }[] = drawn ? [
    { key: "asc", label: "ASC", degree: asc, major: true },
    { key: "mc", label: "MC", degree: mc, major: true },
    // ChartData carries only the two; the other pair is their opposition.
    { key: "dsc", label: "DSC", degree: opposite(asc), major: false },
    { key: "ic", label: "IC", degree: opposite(mc), major: false },
  ] : [];

  const risingLine = ascendant ? `Rising ${degreesMinutes(ascendant.degree)} ${ascendant.sign}` : "Rising · not drawn";

  return (
    // Without a side panel the wheel takes the whole box: the explorer lays the
    // card out itself, so the split here would only leave an empty column.
    <div className={`grid gap-4 items-start${renderHouse ? " lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]" : ""}`}>
      <svg
        viewBox={`${-pad} ${-pad} ${PLATE + 2 * pad} ${PLATE + 2 * pad}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${standalone ? `${centreName}'s natal chart wheel` : "Natal chart wheel"}${drawn ? "" : ", horizon not drawn"}`}
        data-horizon={drawn ? "drawn" : "none"}
      >
        <defs>
          <radialGradient id={uid}>
            <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={c} cy={c} r={r.aspect} fill={`url(#${uid})`} />

        {/* Quadrants, named in words, outside the plate; only a horizon gives them a meaning. */}
        {drawn && [0, 1, 2, 3].map((q) => {
          const a0 = theta(Math.floor(asc / 30) * 30 + q * 90, asc) + 6;
          const id = `${uid}-q${q}`;
          const t0 = pointAt(c, c, r.signOuter + PLATE * 0.028, a0 - 6);
          const t1 = pointAt(c, c, r.signOuter + PLATE * 0.062, a0 - 6);
          return (
            <g key={q}>
              <path id={id} d={arcLabelPath(c, c, r.signOuter + PLATE * 0.052, a0, a0 + 78)} fill="none" />
              <text
                fontFamily="Space Grotesk, sans-serif"
                fontSize={PLATE * 0.0205}
                letterSpacing="1.6"
                fill={BRASS}
                fillOpacity={0.55}
                dominantBaseline="middle"
              >
                <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
                  {QUADRANT_NAMES[q]}
                </textPath>
              </text>
              <line
                x1={t0.x} y1={t0.y} x2={t1.x} y2={t1.y}
                stroke={BRASS} strokeOpacity={0.4} strokeWidth={1}
              />
            </g>
          );
        })}

        {/* The sign band, two lines a segment, and the house hit area inside it. */}
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
          const b0 = theta(Math.floor(asc / 30) * 30 + (h - 1) * 30, asc);
          const b1 = b0 + 30;
          const sign = houseSign(h, asc);
          const selected = h === house;
          const signId = `${uid}-s${h}`;
          const houseId = `${uid}-h${h}`;
          const band = (
            <path
              d={wedgePath(c, c, r.signOuter, r.signInner, b0, b1)}
              fill={`hsl(var(--brass) / ${h % 2 ? 0.05 : 0.085})`}
              stroke="hsl(var(--brass) / 0.3)"
              strokeWidth={1}
            />
          );
          if (!drawn) {
            return (
              <g key={h}>
                {band}
                <path id={signId} d={arcLabelPath(c, c, (r.signOuter + r.signInner) / 2, b0 + 1.5, b1 - 1.5)} fill="none" />
                <text fontFamily="Space Grotesk, sans-serif" fontSize={PLATE * 0.0225} letterSpacing="1.4" fill={BRASS} dominantBaseline="middle">
                  <textPath href={`#${signId}`} startOffset="50%" textAnchor="middle">{sign.toUpperCase()}</textPath>
                </text>
              </g>
            );
          }
          const lines = (
            <>
              {band}
              <path id={signId} d={arcLabelPath(c, c, r.bandSign, b0 + 1.5, b1 - 1.5)} fill="none" />
              <text
                fontFamily="Space Grotesk, sans-serif"
                fontSize={PLATE * 0.0225}
                letterSpacing="1.4"
                fill={BRASS}
                dominantBaseline="middle"
              >
                <textPath href={`#${signId}`} startOffset="50%" textAnchor="middle">
                  {sign.toUpperCase()}
                </textPath>
              </text>
              <path id={houseId} d={arcLabelPath(c, c, r.bandHouse, b0 + 1.5, b1 - 1.5)} fill="none" />
              <text
                fontFamily="Space Grotesk, sans-serif"
                fontSize={PLATE * 0.019}
                letterSpacing="1.2"
                fill={selected ? BRASS : "hsl(var(--foreground) / 0.55)"}
                dominantBaseline="middle"
                data-house-word
              >
                <textPath href={`#${houseId}`} startOffset="50%" textAnchor="middle">
                  {houseBandLabel(h)}
                </textPath>
              </text>
            </>
          );
          if (standalone) return <g key={h}>{lines}</g>;
          return (
            <g
              key={h}
              tabIndex={0}
              role="button"
              aria-label={`House ${h}, ${sign}`}
              className="cursor-pointer focus:outline-none focus-visible:outline-none"
              onClick={() => selectHouse(h)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectHouse(h);
                }
              }}
            >
              <path
                d={wedgePath(c, c, r.tick, r.aspect, b0, b1)}
                fill={selected ? "hsl(var(--brass) / 0.14)" : `hsl(0 0% 100% / ${h % 2 ? 0.012 : 0.026})`}
              />
              {lines}
            </g>
          );
        })}

        <circle cx={c} cy={c} r={r.signInner} fill="none" stroke="hsl(var(--brass) / 0.28)" />
        <circle cx={c} cy={c} r={r.aspect} fill="none" stroke="hsl(var(--brass) / 0.2)" />

        {/* Every fifth degree, so a leader line has a tick to land on. */}
        {Array.from({ length: 72 }, (_, i) => i * 5).map((d) => {
          const a = theta(d, asc);
          const t0 = pointAt(c, c, r.tick, a);
          const t1 = pointAt(c, c, r.tick - (d % 30 === 0 ? PLATE * 0.02 : PLATE * 0.008), a);
          return (
            <line
              key={d}
              x1={t0.x} y1={t0.y} x2={t1.x} y2={t1.y}
              stroke={BRASS}
              strokeOpacity={d % 30 === 0 ? 0.42 : 0.16}
              strokeWidth={1}
            />
          );
        })}

        {/* Aspects, de-emphasised in the inner disc and weighted by orb. */}
        {!standalone && chartData.aspects?.map((a, i) => {
          const p1 = chartData.planets[a.planet1];
          const p2 = chartData.planets[a.planet2];
          if (!p1 || !p2) return null;
          const q1 = pointAt(c, c, r.aspect, theta(p1.absoluteDegree, asc));
          const q2 = pointAt(c, c, r.aspect, theta(p2.absoluteDegree, asc));
          const strength = aspectStrength(a.orb, orbs?.[a.type] ?? 6);
          return (
            <line
              key={i}
              x1={q1.x} y1={q1.y} x2={q2.x} y2={q2.y}
              stroke={ASPECT_STROKE[a.type] ?? "hsl(var(--muted-foreground))"}
              strokeWidth={0.6 + 1.2 * strength}
              strokeOpacity={0.18 + 0.42 * strength}
              strokeLinecap="round"
              strokeDasharray={a.applying ? undefined : "3 4"}
            />
          );
        })}

        {standalone && (
          <g data-centre-name>
            <text
              x={c}
              y={c - PLATE * 0.006}
              textAnchor="middle"
              fontFamily="Newsreader, serif"
              fontSize={PLATE * 0.05}
              fill="hsl(var(--foreground))"
            >
              {centreName}
            </text>
            <text
              x={c}
              y={c + PLATE * 0.036}
              textAnchor="middle"
              fontFamily="IBM Plex Mono, monospace"
              fontSize={PLATE * 0.0175}
              letterSpacing="1.6"
              fill={BRASS}
              fillOpacity={drawn ? 0.85 : 0.6}
            >
              {risingLine.toUpperCase()}
            </text>
          </g>
        )}

        {axes.map((axis) => {
          const a = theta(axis.degree, asc);
          const q0 = pointAt(c, c, r.aspect, a);
          const q1 = pointAt(c, c, r.signInner + PLATE * 0.012, a);
          const labelAt = pointAt(c, c, r.signOuter + PLATE * 0.026, a);
          return (
            <g key={axis.key}>
              <line
                x1={q0.x} y1={q0.y} x2={q1.x} y2={q1.y}
                stroke={BRASS}
                strokeWidth={axis.major ? 1.5 : 1}
                strokeOpacity={axis.major ? 0.72 : 0.4}
              />
              {axis.major && (
                <text
                  x={labelAt.x}
                  y={labelAt.y + 3}
                  textAnchor="middle"
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize={PLATE * 0.024}
                  letterSpacing="1.4"
                  fill={BRASS}
                >
                  {axis.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Leaders first, so a node always sits above every line. */}
        {placements.map((n) => {
          const tickAt = pointAt(c, c, r.tick, n.theta);
          const nodeAt = pointAt(c, c, n.radius + r.node * 0.5, n.theta);
          return (
            <g key={`leader-${n.key}`}>
              <line
                x1={tickAt.x} y1={tickAt.y} x2={nodeAt.x} y2={nodeAt.y}
                stroke={BRASS}
                strokeOpacity={n.lane ? 0.42 : 0.3}
                strokeWidth={1}
              />
              <circle cx={tickAt.x} cy={tickAt.y} r={1.7} fill={BRASS} fillOpacity={0.85} />
            </g>
          );
        })}

        {placements.map((n) => {
          const p = chartData.planets[n.key];
          const at = pointAt(c, c, n.radius, n.theta);
          const side = Math.cos((n.theta * Math.PI) / 180) >= 0 ? 1 : -1;
          const chipW = PLATE * 0.118;
          const chipX = at.x + side * r.node * 0.95 - (side > 0 ? 0 : chipW);
          const label = PLANET_LABELS[n.key] ?? n.key;
          return (
            <g
              key={n.key}
              tabIndex={0}
              role="button"
              aria-label={`${label} ${p.degree.toFixed(1)} degrees ${p.sign}${p.house ? `, house ${p.house}` : ""}`}
              className="cursor-pointer focus:outline-none focus-visible:outline-none"
              onMouseEnter={() => setHovered(n.key)}
              onMouseLeave={() => setHovered((h) => (h === n.key ? null : h))}
              onFocus={() => setHovered(n.key)}
              onBlur={() => setHovered((h) => (h === n.key ? null : h))}
              onClick={() => { if (!standalone && p.house) selectHouse(p.house); }}
              onKeyDown={(e) => {
                if (!standalone && (e.key === "Enter" || e.key === " ") && p.house) {
                  e.preventDefault();
                  selectHouse(p.house);
                }
              }}
            >
              <circle cx={at.x} cy={at.y} r={r.node * 0.62} fill="hsl(var(--background))" fillOpacity={0.92} />
              <BodyMark body={n.key} x={at.x} y={at.y} size={r.node} />
              {p.retrograde && (
                <text
                  x={at.x + r.node * 0.46}
                  y={at.y - r.node * 0.32}
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize={PLATE * 0.019}
                  fill="hsl(var(--destructive))"
                >
                  R
                </text>
              )}
              {hovered === n.key && (
                <g>
                  <rect
                    x={chipX}
                    y={at.y - PLATE * 0.017}
                    width={chipW}
                    height={PLATE * 0.032}
                    rx={PLATE * 0.016}
                    fill="hsl(var(--popover))"
                    stroke="hsl(var(--brass) / 0.45)"
                  />
                  <text
                    x={chipX + chipW / 2}
                    y={at.y + PLATE * 0.0075}
                    textAnchor="middle"
                    fontFamily="IBM Plex Mono, monospace"
                    fontSize={PLATE * 0.019}
                    fill={BRASS}
                  >
                    {label.slice(0, 3).toUpperCase()} {p.degree.toFixed(1)}°
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {renderHouse && !standalone && <div className="min-w-0">{renderHouse(house)}</div>}
    </div>
  );
}

export default NatalWheel;
