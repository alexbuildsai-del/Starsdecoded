/**
 * The R03 marker for an angle drawn as an occupant (ADR-49): a brass ring, a
 * brass point at its centre and a tick from the rim outward along the angle,
 * east for the Ascendant, up for the Midheaven. An angle is a point on the
 * horizon and never a body, so it is never a render.
 */
export type AngleKey = "ascendant" | "midheaven";

/** SVG degrees, clockwise from +x: east is on the left of every plate, the Midheaven above. */
export const TICK_DIRECTION: Record<AngleKey, number> = { ascendant: 180, midheaven: 270 };

export interface AngleGlyphShapeProps {
  x: number;
  y: number;
  /** The ring's radius. The centre point and the tick scale with it. */
  r: number;
  /** SVG degrees of the tick, clockwise from +x. */
  direction: number;
  stroke: string;
  /** The ring's ground, so the horizon line does not show through it. */
  fill?: string;
  strokeWidth?: number;
}

/** The glyph as an SVG group, for a plate that places it itself. */
export function AngleGlyphShape({ x, y, r, direction, stroke, fill = "none", strokeWidth = 1.5 }: AngleGlyphShapeProps) {
  const a = (direction * Math.PI) / 180;
  const from = { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
  const to = { x: x + Math.cos(a) * r * 1.85, y: y + Math.sin(a) * r * 1.85 };
  return (
    <g>
      <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={Math.max(1.5, r * 0.3)} fill={stroke} />
      <line x1={from.x.toFixed(1)} y1={from.y.toFixed(1)} x2={to.x.toFixed(1)} y2={to.y.toFixed(1)} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </g>
  );
}

export interface AngleGlyphProps {
  angle: AngleKey;
  /** Box size in pixels; the ring fills a little over half of it so the tick has room. */
  size?: number;
  className?: string;
}

/** The glyph in HTML flow, for a card. */
export function AngleGlyph({ angle, size = 36, className }: AngleGlyphProps) {
  const c = size / 2;
  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className={className}
      data-angle={angle}
    >
      <AngleGlyphShape x={c} y={c} r={size * 0.3} direction={TICK_DIRECTION[angle]} stroke="hsl(var(--brass))" strokeWidth={1.5} />
    </svg>
  );
}

export default AngleGlyph;
