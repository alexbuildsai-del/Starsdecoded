/**
 * The dial (ADR-207, 211, 249, 250; reading 18): the natal chart inside, each planet on its own track outside, a brass
 * line for each contact. It draws the frames it is given and nothing else, so the page's hero, the home line and
 * Timeline are one drawing, complete at first paint. Play is its one motion and runs only when pressed; the dial itself
 * is one slider on the arrow keys, so a keyboard walks the days a hand plays.
 *
 * Bodies are their renders, never glyphs, sitting at their true degrees on their own tracks, so crowding never moves
 * one (§9). The colours are the tokens' own values, since the dial draws on the site, in the app and on the dashboard,
 * outside any one token scope.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { PLANET_LABELS } from "@/types/chart";
import { PLANET_RENDERS } from "@/lib/planet-renders";
import { AngleGlyphShape } from "@/components/report/AngleGlyph";
import { arcLabelPath, norm360 } from "@/components/chart/wheel-geometry";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  DIAL, bandSegments, beatMs, clampDay, dialAngle, dialAt, frameText, keyDay, leavesTrail, playStart, playStep, trackRadii,
  trailPath, type DialAngles, type DialFrame, type DialPoint,
} from "@/lib/dial";

export type DialTrail = "played" | "range";

export interface DialProps {
  points: readonly DialPoint[];
  angles: DialAngles | null;
  frames: readonly DialFrame[];
  /** The frame shown, an index into `frames`. */
  day: number;
  onDay: (day: number) => void;
  /** Shows Play, which steps through the frames only when pressed. */
  playable: boolean;
  /** "played" draws each body's way from the first frame to the day shown, the trail Play leaves; "range" its whole path. */
  trail?: DialTrail;
  /** A fixed width and height in pixels; without it the dial fills its box. */
  size?: number;
  /** Whose chart the dial is, for its name: "Mira's chart". */
  label?: string;
  /** Beside Play: the date the dial shows, as the page words it. */
  children?: ReactNode;
}

const GROUND = "#0D1117";
const RAISED = "#171D29";
const LINE = "#242C3B";
const PAPER = "#E8EBF2";
const GREY = "#AEB6C6";
const MUTED = "#7E889A";
const FAINT = "#6E7789";
const BRASS = "hsl(var(--brass))";
// A retrograde's dashed ring, in the light indigo both Timeline artifacts give it.
const RETRO = "#9FA8DA";
// The R beside it, in the rose the explaining line's badge uses, so the two read as one mark.
const RETRO_R = "#E3A3AD";

// An angle is drawn from `angles` as the R03 marker (ADR-49), never as a natal point's dot, whatever `points` carries.
const ANGLE_KEYS = new Set(["ascendant", "midheaven", "descendant", "ic"]);

// MB-196 provisional: the dial's focus is the site's own focus colour, the one `.sd :focus-visible` draws, never brass,
// which is measured geometry and never a control (§9). A ring in the dial's own shape, since an outline round the box
// would cut across the page beside it; non-scaling, so it stays 2 px at any size of dial.
const FOCUS_RING = {
  fill: "none",
  stroke: "var(--indigo-lt, #9FA8DA)",
  strokeWidth: 2,
  vectorEffect: "non-scaling-stroke",
  opacity: 0,
  className: "group-focus-visible/dial:opacity-100",
} as const;

// Below this many pixels a word on the dial is a smudge, so a small dial draws the sky alone.
const DETAIL_PX = 160;

export function Dial({ points, angles, frames, day, onDay, playable, trail, size, label = "Your chart", children }: DialProps) {
  const uid = `dial${useId().replace(/[^\w-]/g, "")}`;
  const { order } = useEntryFormat();
  const reduced = useReducedMotion();

  const last = Math.max(0, frames.length - 1);
  const at = clampDay(day, last);
  const frame = frames[at];
  const moving = frames.length > 1;
  const east = angles?.ascendant ?? 0;
  const detailed = size === undefined || size >= DETAIL_PX;

  const [playing, setPlaying] = useState(false);
  // The day Play last sent, so each beat steps on from it rather than from a render still to come.
  const pos = useRef(at);
  const latestOnDay = useRef(onDay);
  useEffect(() => {
    latestOnDay.current = onDay;
  });
  useEffect(() => {
    if (!playing) pos.current = at;
    // The page moved the day itself, say to a date the reader tapped: that jump wins over Play.
    else if (at !== pos.current) setPlaying(false);
  }, [at, playing]);

  // A new range stops Play; a parent that rebuilds the same frames each render does not.
  const range = `${frames.length}:${frames[0]?.date ?? ""}`;
  useEffect(() => {
    setPlaying(false);
  }, [range]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      const next = playStep(pos.current, last, reduced);
      pos.current = next;
      latestOnDay.current(next);
      if (next >= last) setPlaying(false);
    }, beatMs(frames.length, reduced));
    return () => window.clearInterval(timer);
  }, [playing, last, reduced, frames.length]);

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    const start = playStart(at, last);
    pos.current = start;
    if (start !== at) onDay(start);
    setPlaying(true);
  }

  // Keyed on the bodies' names, so a parent that rebuilds the same frames each render keeps the same tracks.
  const bodiesKey = frames[0]?.bodies.map((b) => b.body).join(",") ?? "";
  const radii = useMemo(() => trackRadii(bodiesKey.split(",")), [bodiesKey]);
  const hasHorizon = angles !== null;

  // Everything that stays put while the dial plays: drawn once per chart, not once per day.
  const ground = useMemo(() => {
    const segments = bandSegments(hasHorizon ? east : null);
    const stroke = detailed ? 1 : 5;
    const rise = dialAt(east, DIAL.bandInner, east);
    const set = dialAt(east + 180, DIAL.bandInner, east);
    return (
      <g>
        {Object.entries(radii).map(([body, r]) => (
          <circle key={body} cx={DIAL.centre} cy={DIAL.centre} r={r} fill="none" stroke={LINE} strokeOpacity={0.85} strokeWidth={stroke} />
        ))}
        <circle cx={DIAL.centre} cy={DIAL.centre} r={DIAL.bandOuter} fill={GROUND} stroke={LINE} strokeWidth={stroke * 1.2} />
        <circle cx={DIAL.centre} cy={DIAL.centre} r={DIAL.bandInner} fill="none" stroke={LINE} strokeWidth={stroke * 1.2} />
        {segments.map((s) => {
          const a = dialAt(s.from, DIAL.bandInner, east);
          const b = dialAt(s.from, DIAL.bandOuter, east);
          return <line key={`d${s.from}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={LINE} strokeWidth={stroke} />;
        })}
        {detailed && segments.map((s) => {
          const id = `${uid}-b${s.from}`;
          // Longer than the segment and centred on it: a textPath drops any letter that falls off its ends.
          const a0 = dialAngle(s.from, east) - 3;
          return (
            <g key={`w${s.from}`}>
              <path id={id} d={arcLabelPath(DIAL.centre, DIAL.centre, DIAL.band, a0, a0 + 36)} fill="none" />
              <text fontFamily="Space Grotesk, sans-serif" fontSize={9} letterSpacing={0.4} fill={MUTED} dominantBaseline="middle">
                <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{s.label}</textPath>
              </text>
            </g>
          );
        })}
        {hasHorizon && <line x1={rise.x} y1={rise.y} x2={set.x} y2={set.y} stroke={PAPER} strokeOpacity={0.35} strokeWidth={stroke} />}
      </g>
    );
  }, [radii, east, hasHorizon, detailed, uid]);

  const touched = new Set<string>(frame?.contacts.map((c) => c.target) ?? []);
  const targetLon = (target: string): number | undefined => {
    if (target === "ascendant") return angles?.ascendant;
    if (target === "midheaven") return angles?.midheaven;
    return points.find((p) => p.body === target)?.lon;
  };
  const disc = detailed ? DIAL.disc : DIAL.disc * 2;
  const trailTo = trail === "range" ? last : trail === "played" ? at : -1;
  const text = frameText(frame, order);

  const drawing = (
    <>
      {moving && <circle cx={DIAL.centre} cy={DIAL.centre} r={DIAL.ring} {...FOCUS_RING} />}
      {ground}

      {trailTo > 0 && Object.entries(radii).filter(([body]) => leavesTrail(body)).map(([body, r]) => {
        const d = trailPath(frames, body, r, east, 0, trailTo);
        return d ? (
          <path
            key={`t-${body}`} d={d} fill="none" stroke={GREY} strokeOpacity={0.35} strokeWidth={detailed ? 5 : 9}
            strokeLinecap="round" strokeLinejoin="round"
          />
        ) : null;
      })}

      {frame?.contacts.map((c) => {
        const place = frame.bodies.find((b) => b.body === c.body);
        const r = radii[c.body];
        const lon = targetLon(c.target);
        if (!place || r === undefined || lon === undefined) return null;
        const from = dialAt(place.lon, r - disc, east);
        const to = dialAt(lon, DIAL.point, east);
        return (
          <line
            key={`c-${c.body}-${c.aspect}-${c.target}`}
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke={BRASS} strokeWidth={detailed ? 1.8 : 4}
            // A conjunction is a planet on the point itself, so only its line is solid.
            strokeDasharray={c.aspect === "conjunction" ? undefined : "5 4"}
          />
        );
      })}

      {points.filter((p) => !ANGLE_KEYS.has(p.body)).map((p) => {
        const hit = touched.has(p.body);
        const q = dialAt(p.lon, DIAL.point, east);
        const name = dialAt(p.lon, DIAL.pointLabel, east);
        return (
          <g key={`p-${p.body}`} data-point={p.body}>
            <circle cx={q.x} cy={q.y} r={hit ? 5 : 2.8} fill={hit ? PAPER : FAINT} />
            {hit && detailed && (
              <text
                x={name.x} y={name.y + 4} textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize={12.5}
                letterSpacing={0.75} fill={PAPER}
              >
                {(PLANET_LABELS[p.body] ?? p.body).toUpperCase()}
              </text>
            )}
          </g>
        );
      })}

      {angles && ([["ascendant", "ASC"], ["midheaven", "MC"]] as const).map(([key, short]) => {
        const lon = angles[key];
        const q = dialAt(lon, DIAL.point, east);
        const name = dialAt(lon, DIAL.pointLabel, east);
        return (
          <g key={`a-${key}`} data-point={key}>
            <AngleGlyphShape
              x={q.x} y={q.y} r={5} direction={norm360(-dialAngle(lon, east))} stroke={BRASS} fill={GROUND} strokeWidth={1.5}
            />
            {touched.has(key) && detailed && (
              <text
                x={name.x} y={name.y + 4} textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize={12.5}
                letterSpacing={0.75} fill={PAPER}
              >
                {short}
              </text>
            )}
          </g>
        );
      })}

      {frame?.bodies.map((b) => {
        const r = radii[b.body];
        if (r === undefined) return null;
        const q = dialAt(b.lon, r, east);
        const src = detailed ? PLANET_RENDERS[b.body] : undefined;
        const half = DIAL.render / 2;
        return (
          <g
            key={`b-${b.body}`} data-body={b.body} data-tone={b.tone ?? "none"} data-retrograde={b.retrograde || undefined}
            className={b.tone ? `sd-tone-${b.tone}` : undefined}
          >
            <circle
              cx={q.x} cy={q.y} r={disc}
              fill={b.tone ? "var(--sd-tone)" : detailed ? RAISED : MUTED}
              stroke={b.retrograde ? RETRO : GROUND}
              strokeWidth={b.retrograde ? 1.6 : 2}
              strokeDasharray={b.retrograde ? "2.5 2" : undefined}
            />
            {b.retrograde && detailed && (
              <text
                x={q.x + disc * 0.85} y={q.y - disc * 0.45} fontFamily="IBM Plex Mono, monospace" fontSize={14} fontWeight={600}
                fill={RETRO_R} stroke={GROUND} strokeWidth={3} paintOrder="stroke" data-retrograde-mark
              >
                R
              </text>
            )}
            {src && <image href={src} x={q.x - half} y={q.y - half} width={DIAL.render} height={DIAL.render} preserveAspectRatio="xMidYMid meet" />}
          </g>
        );
      })}
    </>
  );

  const box = `${-DIAL.pad} ${-DIAL.pad} ${DIAL.size + 2 * DIAL.pad} ${DIAL.size + 2 * DIAL.pad}`;
  const fixed = size === undefined ? undefined : { width: size, height: size };
  const showPlay = playable && moving;

  return (
    <div className={size === undefined ? "grid w-full justify-items-center gap-3" : "inline-grid justify-items-center gap-3"} data-dial>
      {moving ? (
        <div
          id={`${uid}-day`}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={last}
          aria-valuenow={at}
          aria-valuetext={text}
          data-day={at}
          className="group/dial block w-full outline-none"
          style={fixed}
          onKeyDown={(e) => {
            const next = keyDay(e.key, at, last);
            if (next === null) return;
            e.preventDefault();
            setPlaying(false);
            if (next !== at) onDay(next);
          }}
        >
          <svg viewBox={box} className="block h-auto w-full" aria-hidden="true">{drawing}</svg>
        </div>
      ) : (
        <svg
          viewBox={box} role="img" aria-label={text ? `${label}. ${text}` : label} data-day={at}
          className={size === undefined ? "block h-auto w-full" : "block"} {...fixed}
        >
          {drawing}
        </svg>
      )}
      {(showPlay || children) && (
        <div className="flex w-full flex-wrap items-center gap-3">
          {showPlay && (
            // Wide enough for its longest word, so nothing beside it moves when Play becomes Pause.
            <button
              type="button"
              aria-controls={`${uid}-day`}
              onClick={togglePlay}
              className="inline-flex min-h-11 min-w-[6.5rem] items-center justify-center rounded-[10px] border border-[#242C3B] bg-[#171D29] px-4 font-label text-sm font-medium text-[#E8EBF2] transition-colors hover:border-[#5C6BC0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--indigo-lt,#9FA8DA)] motion-reduce:transition-none"
            >
              {playing ? "Pause" : at >= last ? "Play again" : "Play"}
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

export default Dial;
