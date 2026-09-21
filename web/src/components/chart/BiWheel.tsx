/**
 * The bi-wheel (ADR-43): inner ring A, outer ring B, the host's whole-sign
 * houses, the host swapped with one tap. Bodies at their true degrees with
 * crowding resolved by radius; the cross aspects within four degrees drawn,
 * brass for a conjunction, teal for a trine or sextile, rose for a square or
 * opposition. Brass stays geometry; no ring, bar, number or rating describes
 * the pair. A blind host drops the house ring and keeps the aspects.
 */
import { useState } from "react";
import { PLANET_GLYPHS, PLANET_LABELS, type ChartData } from "@/types/chart";
import { renderFor } from "@/lib/planet-renders";
import { arcLabelPath, houseSign, opposite, pointAt, theta, wedgePath } from "@/components/chart/wheel-geometry";
import { hostHouses, layoutBiWheel, linkColour, linkEndpoints, swapHost, type CrossLink, type Host } from "@/components/chart/bi-wheel";

const PLATE = 600;
const BRASS = "hsl(var(--brass))";
const COLOUR: Record<ReturnType<typeof linkColour>, string> = { brass: BRASS, teal: "#3FA796", rose: "#D9668A" };
let instances = 0;

function BodyMark({ body, x, y, size, ring }: { body: string; x: number; y: number; size: number; ring: "A" | "B" }) {
  const src = renderFor(body, size);
  if (src) return <image href={src} x={x - size / 2} y={y - size / 2} width={size} height={size} preserveAspectRatio="xMidYMid meet" />;
  return (
    <g>
      <circle cx={x} cy={y} r={size * 0.42} fill="hsl(var(--background))" stroke={ring === "A" ? BRASS : "hsl(var(--indigo-lt, 234 48% 74%))"} strokeOpacity={0.6} />
      <text x={x} y={y + size * 0.16} textAnchor="middle" fontSize={size * 0.46} fill={BRASS}>{PLANET_GLYPHS[body] ?? "·"}</text>
    </g>
  );
}

export interface BiWheelProps {
  chartA: ChartData;
  chartB: ChartData;
  nameA: string;
  nameB: string;
  /** The generated cards' links, once they land; the wheel draws the same set. */
  links?: CrossLink[];
  host?: Host;
  onHost?: (host: Host) => void;
}

export function BiWheel({ chartA, chartB, nameA, nameB, links, host: hostProp, onHost }: BiWheelProps) {
  const [uid] = useState(() => `bi-wheel-${++instances}`);
  const [internal, setInternal] = useState<Host>("A");
  const host = hostProp ?? internal;
  const setHost = (h: Host) => { setInternal(h); onHost?.(h); };
  const layout = layoutBiWheel(chartA, chartB, host, PLATE, links);
  const r = layout.radii;
  const c = r.centre;
  const pad = PLATE * 0.06;
  const houses = hostHouses(layout);
  const hostName = host === "A" ? nameA : nameB;
  const signFrame = Math.floor(layout.frame / 30) * 30;

  return (
    <div className="rp-biwheel">
      <svg viewBox={`${-pad} ${-pad} ${PLATE + 2 * pad} ${PLATE + 2 * pad}`} role="img" aria-label={`${nameA} inside, ${nameB} outside, ${hostName}'s houses`}>
        {/* The sign band, twelve wedges from the host's frame. */}
        {Array.from({ length: 12 }, (_, i) => {
          const b0 = theta(signFrame + i * 30, layout.frame);
          const sign = houseSign(i + 1, layout.frame);
          const id = `${uid}-s${i}`;
          return (
            <g key={i}>
              <path d={wedgePath(c, c, r.signOuter, r.signInner, b0, b0 + 30)} fill={`hsl(var(--brass) / ${i % 2 ? 0.05 : 0.085})`} stroke="hsl(var(--brass) / 0.3)" strokeWidth={1} />
              <path id={id} d={arcLabelPath(c, c, (r.signOuter + r.signInner) / 2, b0 + 1.5, b0 + 28.5)} fill="none" />
              <text fontFamily="Space Grotesk, sans-serif" fontSize={PLATE * 0.019} letterSpacing="1.2" fill={BRASS} dominantBaseline="middle">
                <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{sign.toUpperCase()}</textPath>
              </text>
            </g>
          );
        })}

        {/* The host's houses, numbered; none when the host has no horizon. */}
        {houses && houses.map((h) => {
          const at = pointAt(c, c, (r.houseOuter + r.houseInner) / 2, h.from + 15);
          return (
            <g key={h.house}>
              <path d={wedgePath(c, c, r.houseOuter, r.houseInner, h.from, h.to)} fill="none" stroke="hsl(var(--brass) / 0.18)" strokeWidth={1} />
              <text x={at.x} y={at.y + PLATE * 0.01} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize={PLATE * 0.024} fill="hsl(var(--foreground) / 0.45)">{h.house}</text>
            </g>
          );
        })}
        {houses && layout.ascendant !== null && (() => {
          const a = theta(layout.ascendant, layout.frame);
          const d = theta(opposite(layout.ascendant), layout.frame);
          const p0 = pointAt(c, c, r.aspect, a), p1 = pointAt(c, c, r.signInner, a);
          const q0 = pointAt(c, c, r.aspect, d), q1 = pointAt(c, c, r.signInner, d);
          const lab = pointAt(c, c, r.signOuter + PLATE * 0.028, a);
          return (
            <g>
              <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={BRASS} strokeWidth={1.5} strokeOpacity={0.7} />
              <line x1={q0.x} y1={q0.y} x2={q1.x} y2={q1.y} stroke={BRASS} strokeWidth={1} strokeOpacity={0.4} />
              <text x={lab.x} y={lab.y + 3} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize={PLATE * 0.022} fill={BRASS}>ASC</text>
            </g>
          );
        })()}

        <circle cx={c} cy={c} r={r.signInner} fill="none" stroke="hsl(var(--brass) / 0.28)" />
        <circle cx={c} cy={c} r={r.outerLanes[1] - r.node * 0.7} fill="none" stroke="hsl(var(--brass) / 0.14)" strokeDasharray="2 4" />
        <circle cx={c} cy={c} r={r.aspect} fill="none" stroke="hsl(var(--brass) / 0.2)" />

        {/* The cross aspects, between the two bodies' true angles. */}
        {layout.links.map((link, i) => {
          const ends = linkEndpoints(layout, link, chartA, chartB);
          if (!ends) return null;
          return (
            <line
              key={i}
              x1={ends.from.x} y1={ends.from.y} x2={ends.to.x} y2={ends.to.y}
              stroke={COLOUR[linkColour(link.type)]}
              strokeWidth={0.8 + 1.2 * (1 - Math.min(link.orb, 4) / 4)}
              strokeOpacity={0.35 + 0.45 * (1 - Math.min(link.orb, 4) / 4)}
              strokeLinecap="round"
            />
          );
        })}

        {/* Ring A inside, ring B outside; a tick on the disc marks each body's true degree. */}
        {(["a", "b"] as const).map((ring) => layout[ring].map((n) => {
          const chart = ring === "a" ? chartA : chartB;
          const p = chart.planets[n.key];
          const at = pointAt(c, c, n.radius, n.theta);
          const tick = pointAt(c, c, r.aspect, n.theta);
          const label = PLANET_LABELS[n.key] ?? n.key;
          return (
            <g key={`${ring}-${n.key}`} aria-label={`${ring === "a" ? nameA : nameB}: ${label} ${p.degree.toFixed(1)} degrees ${p.sign}`}>
              <line x1={tick.x} y1={tick.y} x2={at.x} y2={at.y} stroke={BRASS} strokeOpacity={0.22} strokeWidth={1} />
              <circle cx={at.x} cy={at.y} r={r.node * 0.6} fill="hsl(var(--background))" fillOpacity={0.92} />
              <BodyMark body={n.key} x={at.x} y={at.y} size={r.node} ring={ring === "a" ? "A" : "B"} />
            </g>
          );
        }))}

        {/* Who is where: page type in the plate's corners. */}
        <text x={0} y={PLATE + pad * 0.6} fontFamily="Space Grotesk, sans-serif" fontSize={PLATE * 0.02} letterSpacing="1.6" fill={BRASS} fillOpacity={0.8}>{nameA.toUpperCase()} · INNER</text>
        <text x={PLATE} y={PLATE + pad * 0.6} textAnchor="end" fontFamily="Space Grotesk, sans-serif" fontSize={PLATE * 0.02} letterSpacing="1.6" fill={BRASS} fillOpacity={0.8}>{nameB.toUpperCase()} · OUTER</text>
      </svg>
      <button type="button" className="swap no-print" onClick={() => setHost(swapHost(host))} aria-label={`Houses: ${hostName}. Swap to ${host === "A" ? nameB : nameA}'s houses`}>
        Houses · {hostName} ⇄
      </button>
    </div>
  );
}

export default BiWheel;
