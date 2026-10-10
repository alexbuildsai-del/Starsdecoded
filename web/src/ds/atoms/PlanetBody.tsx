import { PLANET_GLYPHS } from "@/types/chart";
import { MAX_SUN_HERO_PX, SUN_HERO, renderFor } from "@/lib/planet-renders";
import { tokens } from "@workspace/design";

const c = tokens.color;

/** The picture for a body at a size, or null when it is a drawn point (Chiron, the nodes) or too big for its 192 px source. */
export function bodySource(body: string, size: number): string | null {
  const render = renderFor(body, size);
  if (render) return render;
  return body === "sun" && size <= MAX_SUN_HERO_PX ? SUN_HERO : null;
}

export interface PlanetBodyMarkProps {
  body: string;
  /** Width of the picture, in the units of the svg it sits in. */
  size: number;
  x: number;
  y: number;
  /** The backing disc a body wears on a chart, so lines and ticks do not run through it. */
  disc?: boolean;
  /** The "R" for going backwards; off in Pair and Small. */
  retrograde?: boolean;
}

/** A body at a point inside an svg: the render, or a drawn point where there is none. */
export function PlanetBodyMark({ body, size, x, y, disc = false, retrograde = false }: PlanetBodyMarkProps) {
  const src = bodySource(body, size);
  return (
    <g>
      {disc && <circle cx={x} cy={y} r={size * (body === "sun" ? 0.48 : 0.62)} fill={c.ground} fillOpacity={0.92} />}
      {src ? (
        <image href={src} x={x - size / 2} y={y - size / 2} width={size} height={size} preserveAspectRatio="xMidYMid meet" />
      ) : (
        <>
          <circle cx={x} cy={y} r={size * 0.42} fill={c.ground} stroke={c.muted} strokeWidth={0.8} />
          <text x={x} y={y + size * 0.16} textAnchor="middle" fontSize={size * 0.5} fill={c["paper-dim"]}>
            {PLANET_GLYPHS[body] ?? "·"}
          </text>
        </>
      )}
      {retrograde && (
        <text
          x={x + size * 0.46}
          y={y - size * 0.32}
          fontFamily="IBM Plex Mono, monospace"
          fontSize={size * 0.38}
          fill={c.back}
        >
          R
        </text>
      )}
    </g>
  );
}

export interface PlanetBodyProps {
  body: string;
  /** Pixels, square. */
  size: number;
}

/** A body in flow, as in a Chip's icon slot. Decorative: the planet's name sits beside it. */
export function PlanetBody({ body, size }: PlanetBodyProps) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden focusable="false" className="shrink-0">
      <PlanetBodyMark body={body} size={size} x={size / 2} y={size / 2} />
    </svg>
  );
}

export default PlanetBody;
