/**
 * The Compatibility report's loading story on the shared grid (compatibility-loading-story, ADR-347 to 351). Every
 * word and mark is `pairFrameAt`'s, worked out from the two stored charts and birthplaces, so this file only paints
 * it: the caption, the stage and the detail go into the grid's slots, and the opening screen keeps the percentage,
 * the label, the door, the failure line and the wait for the Start reading tap whatever plays (ADR-47, 59). The page keeps the
 * screen and its props and is handed the slots each frame, so only the screen redraws while the story moves.
 *
 * It plays once from the moment the screen opens and holds its last frame. Reduced motion paints that frame at
 * once, still; so does a failed report, which has nothing left to show being written.
 */
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { LoadingSlots } from "@/components/loading/LoadingFrame";
import type { PairPerson } from "@/components/report/PairHero";
import { NOT_DRAWN, pairHeroLayout } from "@/components/report/pair-hero-layout";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { WINDOW_UNKNOWN } from "@/lib/birth-time";
import type { StoryInput } from "@/lib/build-story";
import {
  PAIR_STILL_S, pairFrameAt, pairView,
  type PairDetail, type PairGlobe, type PairHouse, type PairInput, type PairLine, type PairLines, type PairPlate,
  type PairStage, type PairText, type PairView,
} from "@/lib/pair-story";
import type { Progress } from "@/lib/progress";
import { triadRowsOf, triadText } from "@/lib/triad-row";

export interface PairStoryProps {
  a: PairPerson;
  b: PairPerson;
  progress: Progress;
  /** The opening screen, given the grid's slots for the frame on show. */
  children: (slots: LoadingSlots) => ReactNode;
}

const VOID = "#06080C";
const GROUND = "#0D1117";
const LINE = "#242C3B";
const LINE_SOFT = "#1A202C";
const PAPER = "#E8EBF2";
const PAPER_DIM = "#AEB6C6";
const INDIGO = "#5C6BC0";
const INDIGO_LT = "#9FA8DA";
const VIOLET = "#9575CD";
const BRASS = "#D4B06A";

const FONT: Record<PairText["font"] | "label", string> = {
  serif: "'Newsreader', Georgia, serif",
  sans: "'Inter', ui-sans-serif, system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
  label: "'Space Grotesk', ui-monospace, sans-serif",
};

const TONE: Record<PairText["tone"], string> = { paper: PAPER, dim: PAPER_DIM, brass: BRASS };

/** A plate's sizes were drawn for a radius of 76, as the hero's plates are. */
const unitOf = (plate: PairPlate): number => plate.r / 76;

/**
 * Only a time given to the minute reaches the story: a rough one is stored as the middle of its window, a time
 * nobody gave, and the first sky would print it as theirs.
 */
function storyOf(p: PairPerson): StoryInput {
  return {
    chart: p.chartData,
    birth: {
      lat: p.latitude,
      lon: p.longitude,
      place: p.birthPlace,
      date: p.birthDate,
      time: p.birthTimeWindowMinutes === 0 ? p.birthTime : null,
      // MB-235 provisional: a time with a window reads "rough" in the story; a time nobody gave still reads "no birth time".
      rough: p.birthTimeWindowMinutes > 0 && p.birthTimeWindowMinutes < WINDOW_UNKNOWN,
    },
  };
}

/** The stage's text equivalent: each person's Sun, Moon and Rising, as the rows under the plates print them. */
function chartsLabel(people: readonly PairPerson[]): string {
  return people
    .map((p) => `${p.name}: ${triadRowsOf(p.chartData, { blind: NOT_DRAWN }).map((row) => `${row.label} ${triadText(row, true)}`).join(", ")}.`)
    .join(" ");
}

/**
 * Seconds since the screen opened, on the display's own frames, up to the held frame and never past it, so the
 * story stops rather than loops. `still` paints the held frame at once.
 */
function useStoryClock(still: boolean): number {
  const [t, setT] = useState(still ? PAIR_STILL_S : 0);
  const shown = useRef(t);
  useEffect(() => {
    if (still) {
      shown.current = PAIR_STILL_S;
      setT(PAIR_STILL_S);
      return undefined;
    }
    if (shown.current >= PAIR_STILL_S) return undefined;
    const from = performance.now() - shown.current * 1000;
    let raf = requestAnimationFrame(function tick(stamp) {
      // A frame's stamp can fall a little before the moment it was asked for; time never runs back.
      const s = Math.min(PAIR_STILL_S, Math.max(shown.current, (stamp - from) / 1000));
      shown.current = s;
      setT(s);
      if (s < PAIR_STILL_S) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [still]);
  return t;
}

interface Box {
  w: number;
  h: number;
}

/**
 * The stage slot's size, read off the drawing that fills it before the first paint and again on every resize: its
 * shape picks the phone or the wide layout, and the detail lines up under the plates it draws.
 */
function useStageBox(): [(el: SVGSVGElement | null) => (() => void) | undefined, Box] {
  const [box, setBox] = useState<Box>({ w: 0, h: 0 });
  const measure = useCallback((el: SVGSVGElement | null) => {
    if (!el) return undefined;
    const read = (w: number, h: number) => {
      if (w > 0 && h > 0) setBox((old) => (old.w === w && old.h === h ? old : { w, h }));
    };
    const rect = el.getBoundingClientRect();
    read(rect.width, rect.height);
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => read(entry.contentRect.width, entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [measure, box];
}

function Globe({ globe, clipId }: { globe: PairGlobe; clipId: string }) {
  const { cx, cy, r } = globe;
  return (
    <g opacity={globe.opacity}>
      <circle cx={cx} cy={cy} r={r} fill={GROUND} stroke={LINE} />
      <clipPath id={clipId}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      {/* The projection runs wider than the disc while the globe comes in close; nothing of it may spill past the edge. */}
      <g clipPath={`url(#${clipId})`}>
        <path d={globe.grid} fill="none" stroke={LINE_SOFT} strokeWidth={1} />
        {globe.land && <path d={globe.land} fill="none" stroke={PAPER_DIM} strokeOpacity={0.6} strokeWidth={globe.landWidth} strokeLinejoin="round" />}
        {globe.route && <path d={globe.route.d} fill="none" stroke={BRASS} strokeWidth={1.2} strokeDasharray="3 3" opacity={globe.route.opacity} />}
      </g>
      {globe.places.map((place, i) => (
        <g key={i} opacity={place.opacity}>
          <circle cx={place.x} cy={place.y} r={7} fill="none" stroke={BRASS} strokeWidth={1.3} />
          <circle cx={place.x} cy={place.y} r={2.2} fill={BRASS} />
        </g>
      ))}
    </g>
  );
}

/** Painted apart from its bodies, so a horizon can run over the plate and still pass under every body. */
function PlateBase({ plate }: { plate: PairPlate }) {
  const { cx, cy } = plate;
  const k = unitOf(plate);
  return (
    <>
      <g opacity={plate.opacity}>
        <circle cx={cx} cy={cy} r={plate.r} fill={GROUND} fillOpacity={plate.fillOpacity} />
        {plate.sectors.map((s) => (
          <path key={s.sign} d={s.d} fill={s.lit ? INDIGO_LT : INDIGO} fillOpacity={s.fillOpacity} />
        ))}
        {plate.sectors.flatMap((s) =>
          s.words.map((word, j) => (
            <text
              key={`${s.sign}-${j}`}
              x={s.x}
              y={s.y}
              transform={`rotate(${s.rotate} ${s.x} ${s.y})`}
              fontFamily={FONT.label}
              fontSize={s.size}
              letterSpacing={0.12 * k}
              fill={s.lit ? PAPER : INDIGO_LT}
              opacity={word.opacity}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {word.text.toUpperCase()}
            </text>
          )),
        )}
        {plate.ticks.map((tick, i) => (
          <line key={i} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke={BRASS} strokeOpacity={0.35} />
        ))}
        <circle cx={cx} cy={cy} r={plate.r} fill="none" stroke={BRASS} strokeOpacity={0.45} />
        <circle cx={cx} cy={cy} r={plate.inner} fill="none" stroke={LINE} />
      </g>
      {/* Its opacity already counts the plate's own, so it sits outside the plate's group. */}
      {plate.shade && <path d={plate.shade.d} fill={VOID} fillOpacity={plate.shade.opacity} />}
    </>
  );
}

/** The bodies and the Ascendant's marker, over every plate's base and the horizon, so no line ever crosses a body. */
function PlateTop({ plate }: { plate: PairPlate }) {
  const k = unitOf(plate);
  const m = plate.marker;
  return (
    <>
      {plate.bodies.map((body) =>
        body.kind === "arc" ? (
          <path key={body.key} d={body.d} fill="none" stroke={PAPER} strokeOpacity={body.opacity} strokeWidth={body.width} strokeLinecap="round" />
        ) : (
          <circle key={body.key} cx={body.x} cy={body.y} r={body.r} fill={body.big ? PAPER : PAPER_DIM} stroke={VOID} strokeWidth={k} opacity={body.opacity} />
        ),
      )}
      {m && (
        <g opacity={m.opacity}>
          <line x1={m.x} y1={m.y} x2={m.x - m.tail} y2={m.y} stroke={BRASS} strokeWidth={m.stroke} />
          <circle cx={m.x} cy={m.y} r={m.r} fill={GROUND} stroke={BRASS} strokeWidth={m.stroke} />
          <circle cx={m.x} cy={m.y} r={m.dot} fill={BRASS} />
        </g>
      )}
    </>
  );
}

function Horizon({ horizon, w, ids }: { horizon: NonNullable<PairStage["horizon"]>; w: number; ids: string }) {
  const { y } = horizon;
  return (
    <>
      <defs>
        {/* In the stage's own units: a flat line has no height for a gradient sized to its box. */}
        <linearGradient id={`${ids}-hz`} gradientUnits="userSpaceOnUse" x1={0} y1={y} x2={w} y2={y}>
          <stop offset={0} stopColor={BRASS} stopOpacity={0} />
          <stop offset={0.1} stopColor={BRASS} stopOpacity={0.75} />
          <stop offset={0.9} stopColor={BRASS} stopOpacity={0.75} />
          <stop offset={1} stopColor={BRASS} stopOpacity={0} />
        </linearGradient>
        <radialGradient id={`${ids}-glow`}>
          <stop offset={0} stopColor={VIOLET} stopOpacity={0.32} />
          <stop offset={1} stopColor={VIOLET} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={w / 2} cy={y} r={horizon.glow} fill={`url(#${ids}-glow)`} />
      <line x1={horizon.x1} y1={y} x2={horizon.x2} y2={y} stroke={`url(#${ids}-hz)`} strokeWidth={horizon.width} strokeDasharray="2 5" />
    </>
  );
}

function Stage({ stage, label, ids, svgRef }: {
  stage: PairStage;
  label: string;
  ids: string;
  svgRef: (el: SVGSVGElement | null) => (() => void) | undefined;
}) {
  const { w, h, centre } = stage;
  return (
    <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
      {stage.globe && <Globe globe={stage.globe} clipId={`${ids}-globe`} />}
      {stage.plates.filter((p) => !p.overHorizon).map((p) => <PlateBase key={p.person} plate={p} />)}
      {stage.horizon && <Horizon horizon={stage.horizon} w={w} ids={ids} />}
      {stage.plates.filter((p) => p.overHorizon).map((p) => <PlateBase key={p.person} plate={p} />)}
      {stage.plates.map((p) => <PlateTop key={p.person} plate={p} />)}
      {centre && (
        <g opacity={centre.opacity}>
          <circle cx={centre.x} cy={centre.y} r={centre.r} fill={GROUND} stroke={VIOLET} strokeWidth={1.6} />
          <circle cx={centre.x} cy={centre.y} r={centre.dot} fill={VIOLET} />
        </g>
      )}
      {stage.texts.map((text, i) => (
        <text
          key={i}
          x={text.x}
          y={text.y}
          fontFamily={FONT[text.font]}
          fontSize={text.size}
          fill={TONE[text.tone]}
          opacity={text.opacity}
          textAnchor={text.anchor}
        >
          {text.text}
        </text>
      ))}
    </svg>
  );
}

/** Sizes cap at the phone's and shrink with the frame's height, so the block fits its slot on a short screen too. */
const LINE_LOOK: Record<PairLine["role"], CSSProperties> = {
  place: { fontSize: "min(12px, 1.7cqh)", lineHeight: 1.6, color: PAPER },
  distance: { fontSize: "min(12px, 1.7cqh)", lineHeight: 1.6, color: BRASS },
  date: { fontSize: "min(17px, 2.4cqh)", lineHeight: 1.5, color: PAPER },
  when: { fontSize: "min(11px, 1.55cqh)", lineHeight: 1.7, color: PAPER_DIM },
};

const MONO: CSSProperties = { fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums", margin: 0 };

function Lines({ detail }: { detail: PairLines }) {
  return (
    <div style={{ alignSelf: "stretch", textAlign: "center", paddingTop: "min(4px, .5cqh)" }}>
      {detail.lines.map((line, i) => (
        // Each line keeps its row while it fades, so the one above never moves.
        <p key={i} aria-hidden={line.opacity === 0 || undefined} style={{ ...MONO, ...LINE_LOOK[line.role], opacity: line.opacity }}>
          {line.text}
        </p>
      ))}
    </div>
  );
}

function House({ detail, inset }: { detail: PairHouse; inset: number }) {
  const start = detail.align === "start";
  const row: CSSProperties = { ...MONO, fontSize: "min(11.5px, 1.6cqh)", lineHeight: 1.5, color: PAPER_DIM };
  return (
    <div style={{ alignSelf: "stretch", height: "100%", display: "flex", flexDirection: "column", textAlign: start ? "left" : "center", paddingLeft: start ? inset : 0 }}>
      <div style={{ opacity: detail.opacity }}>
        <p style={{ margin: 0, fontFamily: FONT.label, fontSize: "min(10px, 1.45cqh)", lineHeight: 1.3, letterSpacing: ".16em", textTransform: "uppercase", color: INDIGO_LT }}>
          {detail.label}
        </p>
        <p style={{ margin: "min(4px, .5cqh) 0 0", fontFamily: FONT.serif, fontSize: "min(30px, 3.6cqh)", lineHeight: 1.1, color: PAPER }}>
          {detail.word}
        </p>
        {start ? (
          <div style={{ marginTop: "min(6px, .8cqh)" }}>
            <p style={row}>{detail.rows[0]}</p>
            <p style={row}>{detail.rows[1]}</p>
          </div>
        ) : (
          // Side by side about the middle, as the two plates stand over them.
          <div style={{ marginTop: "min(6px, .8cqh)", display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 32 }}>
            <p style={{ ...row, textAlign: "right" }}>{detail.rows[0]}</p>
            <p style={{ ...row, textAlign: "left" }}>{detail.rows[1]}</p>
          </div>
        )}
      </div>
      <div aria-hidden style={{ marginTop: "auto", paddingTop: "min(8px, 1cqh)", display: "flex", gap: 7, justifyContent: start ? "flex-start" : "center", opacity: detail.dotsOpacity }}>
        {detail.dots.map((dot, i) => (
          <i
            key={i}
            style={{
              display: "block", width: 6, height: 6, boxSizing: "border-box", borderRadius: "50%",
              border: `1px solid ${INDIGO_LT}`, borderColor: dot.reached ? "rgba(159,168,218,.9)" : "rgba(159,168,218,.35)",
              background: dot.filled ? INDIGO_LT : "transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The detail, as wide as the drawing above it, so on the phone layout the house block starts where the artifact
 * starts it, at the frame's margin, however wide the screen.
 */
function Detail({ detail, stage, box }: { detail: PairDetail; stage: PairStage; box: Box }) {
  const drawn = box.w > 0 && box.h > 0 ? Math.min(box.w, (box.h * stage.w) / stage.h) : 0;
  return (
    <div style={{ width: "100%", maxWidth: drawn || undefined, height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {detail.kind === "lines" ? <Lines detail={detail} /> : <House detail={detail} inset={drawn ? (24 / stage.w) * drawn : 8} />}
    </div>
  );
}

export function PairStory({ a, b, progress, children }: PairStoryProps) {
  const reduced = useReducedMotion();
  const t = useStoryClock(reduced || progress.failed);
  const [measure, box] = useStageBox();
  const ids = `ps${useId().replace(/[^\w-]/g, "")}`;

  // The reader's own chart on the left, as the hero that follows puts it.
  const selfSide = a.isSelf && !b.isSelf ? "A" : b.isSelf && !a.isSelf ? "B" : null;
  const [left, right] = pairHeroLayout({ viewportWidth: 0, selfSide }).left === "B" ? [b, a] : [a, b];
  const input: PairInput = { a: storyOf(left), b: storyOf(right), names: [left.name, right.name] };
  const view: PairView = box.w > 0 ? pairView(box.w, box.h) : "phone";
  const frame = pairFrameAt(t, input, progress, view);

  const { caption } = frame;
  const faded = (text: string | null) => (text ? <span style={{ opacity: caption.opacity }}>{text}</span> : undefined);
  return children({
    counter: faded(caption.counter),
    title: faded(caption.title),
    subtitle: faded(caption.subtitle),
    stage: <Stage stage={frame.stage} label={chartsLabel([left, right])} ids={ids} svgRef={measure} />,
    detail: frame.detail ? <Detail detail={frame.detail} stage={frame.stage} box={box} /> : undefined,
  });
}

export default PairStory;
