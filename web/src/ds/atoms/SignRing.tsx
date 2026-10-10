import { useId } from "react";
import { tokens } from "@workspace/design";
import {
  SIGN_ORDER, arcLabelPath, firstHouseCusp, pointAt, theta, wedgePath, wheelRadii,
} from "@/components/chart/wheel-geometry";

const c = tokens.color;

/** Under this the ring keeps its slices and drops names and ticks (ChartStates, Small). */
export const NAMES_FROM_PX = 200;

export type LitTone = "home" | "strain" | "this";

export interface LitSign {
  sign: string;
  tone: LitTone;
  /** Filled at 42% while the report explains it, 12% after. */
  explained?: boolean;
}

const LIT_COLOUR: Record<LitTone, string> = { home: c.teal, strain: c.rose, this: c.brass };

export interface SignRingProps {
  /** The plate's side; every radius is `wheelRadii(size)`. */
  size: number;
  /** The rising degree; 0 for a chart with no birth time, which puts Aries at 9 o'clock. */
  asc: number;
  names?: boolean;
  ticks?: boolean;
  /** The circle at the houses' inner edge; the Sun, Moon and rising state leaves it out (no houses). */
  innerCircle?: boolean;
  lit?: readonly LitSign[];
}

export interface RingTick {
  longitude: number;
  angle: number;
  /** Where the tick starts (on the ring's inside) and ends. */
  from: number;
  to: number;
  major: boolean;
}

/** The 72 ticks, one every 5 degrees of longitude, each at theta(longitude). */
export function ringTicks(size: number, asc: number): RingTick[] {
  const r = wheelRadii(size);
  return Array.from({ length: 72 }, (_, i) => {
    const longitude = i * 5;
    const major = longitude % 30 === 0;
    return { longitude, angle: theta(longitude, asc), from: r.tick, to: r.tick - size * (major ? 0.02 : 0.008), major };
  });
}

// To the hundredth, as wheel-geometry writes its paths: the engine that prerenders a wheel and the browser that hydrates
// it can differ in a sine's last digit, and hydration needs the attributes the server wrote.
function at(cx: number, r: number, angle: number) {
  const p = pointAt(cx, cx, r, angle);
  return { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 };
}

/** The twelve signs and their degree ticks, as a group inside the caller's svg, on a plate from 0 to `size`. */
export function SignRing({ size, asc, names = size >= NAMES_FROM_PX, ticks = size >= NAMES_FROM_PX, innerCircle = true, lit = [] }: SignRingProps) {
  const uid = `sign-ring${useId().replace(/[^\w-]/g, "")}`;
  const r = wheelRadii(size);
  const cx = r.centre;
  const first = firstHouseCusp(asc) / 30;
  const litBy = new Map(lit.map((l) => [l.sign, l]));

  return (
    <g data-sign-ring>
      {Array.from({ length: 12 }, (_, k) => {
        const sign = SIGN_ORDER[(first + k) % 12];
        const a0 = theta(firstHouseCusp(asc) + k * 30, asc);
        const a1 = a0 + 30;
        const on = litBy.get(sign);
        const id = `${uid}-s${k}`;
        return (
          <g key={sign}>
            <path
              d={wedgePath(cx, cx, r.signOuter, r.signInner, a0, a1)}
              fill={on ? LIT_COLOUR[on.tone] : c.muted}
              fillOpacity={on ? (on.explained ? 0.42 : 0.12) : k % 2 === 0 ? 0.05 : 0.085}
              stroke={c.muted}
              strokeOpacity={0.3}
              strokeWidth={1}
            />
            {names && (
              <>
                <path id={id} d={arcLabelPath(cx, cx, r.bandSign, a0 + 1.5, a1 - 1.5)} fill="none" />
                <text
                  fontFamily="Space Grotesk, sans-serif"
                  fontSize={size * 0.0225}
                  letterSpacing={size * 0.0023}
                  fill={c["paper-dim"]}
                  dominantBaseline="middle"
                >
                  <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{sign.toUpperCase()}</textPath>
                </text>
              </>
            )}
          </g>
        );
      })}
      <circle cx={cx} cy={cx} r={r.signInner} fill="none" stroke={c.muted} strokeOpacity={0.28} />
      {innerCircle && <circle cx={cx} cy={cx} r={r.aspect} fill="none" stroke={c.muted} strokeOpacity={0.2} />}
      {ticks &&
        ringTicks(size, asc).map((t) => {
          const p0 = at(cx, t.from, t.angle);
          const p1 = at(cx, t.to, t.angle);
          return (
            <line
              key={t.longitude}
              x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y}
              stroke={c.muted}
              strokeOpacity={t.major ? 0.42 : 0.16}
              strokeWidth={1}
            />
          );
        })}
    </g>
  );
}

export default SignRing;
