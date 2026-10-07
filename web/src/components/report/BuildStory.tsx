/**
 * The Personal report's opening screen shows how a chart is made (report-loading-story §1, ADR-316 to 318): R18-10's
 * frames, drawn in the shared grid (ADR-351). The browser works the chart out from the report's own birth fields, as
 * the public sky pages do, so the story starts at once and never waits on the network; once the server has stored the
 * chart, the story holds that one (ADR-319). The percentage, its label and Start reading stay the overlay's, on their
 * own rule, whatever step is playing (ADR-47).
 *
 * One clock drives every slot. The page builds the slots and the clock moves only the parts that draw, so a frame never
 * re-renders the report waiting behind the screen, and the clock outlives the page's switch from the bare screen to the
 * screen over the report body, so the story never starts again halfway. Once the story holds still the clock stops.
 */
import { useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { DidYouKnow } from "@/components/loading/DidYouKnow";
import type { LoadingSlots } from "@/components/loading/LoadingFrame";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  STAGE,
  STORY_END_S,
  frameAt,
  storySteps,
  type StoryDetail,
  type StoryFrame,
  type StoryInput,
  type StoryLabel,
  type StoryLine,
  type StoryStep,
} from "@/lib/build-story";
import type { Progress } from "@/lib/progress";
import { chartOf } from "@/site/lib/chart";
import { plainLine } from "@/site/lib/sky";
import type { ChartData } from "@/types/chart";

/** The engine's "unknown" band: the reader gave no birth time (ADR-33). */
const NO_TIME_WINDOW = 720;
/** One step of the clock at most, so a tab that was hidden picks the story up where it left it. */
const MAX_STEP_S = 0.05;
const BRASS = "hsl(var(--brass))";

/** The report's own birth fields, which the story's chart is worked out from before the server has stored one. */
export interface StoryReport {
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes: number;
  birthPlace: string;
  latitude: number;
  longitude: number;
  timezone?: string | null;
  timezoneOffset: number;
  chartData?: unknown;
}

class StoryClock {
  t = 0;
  private listeners = new Set<() => void>();
  private raf = 0;
  private last = 0;
  private kept: { t: number; input: StoryInput; failed: boolean; frame: StoryFrame } | null = null;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    this.run();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.halt();
    };
  };

  now = (): number => this.t;

  /** Every slot asks for the same moment on each tick, so the frame is worked out once and shared. */
  frame(t: number, input: StoryInput, progress: Progress): StoryFrame {
    const kept = this.kept;
    if (kept && kept.t === t && kept.input === input && kept.failed === progress.failed) return kept.frame;
    // The door's line sits under Start reading in the overlay, so step 5's subtitle keeps saying what the screen shows.
    const frame = frameAt(t, input, { ...progress, door: false });
    this.kept = { t, input, failed: progress.failed, frame };
    return frame;
  }

  private run(): void {
    if (this.raf || this.t >= STORY_END_S || typeof window === "undefined") return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private halt(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tick = (now: number): void => {
    const step = Math.min(MAX_STEP_S, Math.max(0, now - this.last) / 1000);
    this.last = now;
    this.t = Math.min(STORY_END_S, this.t + step);
    this.raf = this.t < STORY_END_S ? requestAnimationFrame(this.tick) : 0;
    this.listeners.forEach((listener) => listener());
  };
}

const holdStill = () => () => {};
const atEnd = () => STORY_END_S;

interface PartProps {
  clock: StoryClock;
  input: StoryInput;
  progress: Progress;
  /** Reduced motion: the story's last frame, complete and still at first paint. */
  still: boolean;
}

function useStoryFrame({ clock, input, progress, still }: PartProps): StoryFrame {
  const t = useSyncExternalStore(still ? holdStill : clock.subscribe, still ? atEnd : clock.now, atEnd);
  return clock.frame(t, input, progress);
}

function Words({ part, ...props }: PartProps & { part: "counter" | "title" | "subtitle" }) {
  const frame = useStoryFrame(props);
  return <span style={{ opacity: frame.wordsOpacity }}>{frame[part]}</span>;
}

function StoryText({ l, fill, spacing }: { l: StoryLabel; fill: string; spacing?: number }) {
  return (
    <text
      x={l.x}
      y={l.y}
      textAnchor={l.anchor}
      fontSize={l.size}
      letterSpacing={spacing}
      fill={fill}
      opacity={l.opacity}
      className="font-label"
    >
      {l.text}
    </text>
  );
}

function StrokeLine({ l, stroke, dash }: { l: StoryLine; stroke: string; dash?: string }) {
  return (
    <line
      x1={l.x1}
      y1={l.y1}
      x2={l.x2}
      y2={l.y2}
      stroke={stroke}
      strokeOpacity={l.opacity}
      strokeWidth={l.width}
      strokeDasharray={l.dashed ? dash : undefined}
    />
  );
}

export interface BuildStoryProps {
  frame: StoryFrame;
  /** The chart's facts for a screen reader, since the drawing is the chart (ux-copy, accessibility). */
  label: string;
  className?: string;
  style?: CSSProperties;
}

/** One frame of the story on its square stage, in the order the frame lists its marks; it only draws. */
export function BuildStory({ frame, label, className, style }: BuildStoryProps) {
  const { globe, pin, zodiac, emptyBand, horizon, veil, moonArc } = frame;
  const { size, cx, cy } = STAGE;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className={className} style={style}>
      {globe && (
        <g opacity={globe.opacity}>
          <circle cx={globe.cx} cy={globe.cy} r={globe.r} fill="var(--ground)" stroke="var(--line)" />
          <path d={globe.graticule} fill="none" stroke="var(--line-soft)" />
          {globe.land && (
            <path d={globe.land} fill="none" stroke="var(--paper-dim)" strokeOpacity={0.55} strokeWidth={globe.coastWidth} strokeLinejoin="round" />
          )}
        </g>
      )}
      {pin && (
        <g opacity={pin.opacity}>
          <circle cx={pin.x} cy={pin.y} r={7} fill="none" stroke={BRASS} strokeWidth={1.2} />
          <circle cx={pin.x} cy={pin.y} r={2} fill={BRASS} />
        </g>
      )}
      {frame.you > 0 && <circle cx={cx} cy={cy} r={3} fill="var(--paper)" opacity={frame.you} />}
      {zodiac && (
        <g>
          {[zodiac.outer, zodiac.inner].map((r) => {
            const round = 2 * Math.PI * r;
            return (
              <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeDasharray={round} strokeDashoffset={round * (1 - zodiac.drawn)} />
            );
          })}
          {zodiac.spokes.map((l, i) => <StrokeLine key={i} l={l} stroke="var(--line)" />)}
          {zodiac.signs.map((l) => <StoryText key={l.text} l={l} fill="hsl(var(--muted-foreground))" spacing={0.6} />)}
        </g>
      )}
      {frame.houses.map((h) => (
        <g key={h.n}>
          <path d={h.path} fill="var(--indigo)" fillOpacity={h.fillOpacity} stroke="var(--line)" strokeOpacity={h.edgeOpacity} />
          <StoryText l={h.label} fill={h.now ? "var(--paper)" : "var(--indigo-lt)"} spacing={0.5} />
        </g>
      ))}
      {frame.pairLines.map((l, i) => <StrokeLine key={i} l={l} stroke="var(--indigo-lt)" />)}
      {emptyBand && (
        <circle cx={cx} cy={cy} r={emptyBand.r} fill="none" stroke="var(--line)" strokeWidth={emptyBand.width} strokeOpacity={emptyBand.opacity} strokeDasharray="2 5" />
      )}
      {horizon && <StrokeLine l={horizon} stroke="var(--paper)" />}
      {veil && <path d={veil.path} fill="var(--void)" fillOpacity={veil.opacity} />}
      {frame.orbits.map((o) => (
        <circle key={o.key} cx={cx} cy={cy} r={o.r} fill="none" stroke="var(--line-soft)" opacity={o.opacity} />
      ))}
      {frame.aspects.map((a) => <StrokeLine key={`${a.a}-${a.type}-${a.b}`} l={a} stroke="var(--paper-dim)" dash="3 3" />)}
      {moonArc && <path d={moonArc.path} fill="none" stroke="var(--paper)" strokeWidth={5} strokeLinecap="round" opacity={moonArc.opacity} />}
      {frame.bodies.map((b) => (
        <g key={b.key}>
          <circle cx={b.x} cy={b.y} r={b.dot} fill="var(--paper-dim)" stroke="var(--void)" strokeWidth={1.2} opacity={b.opacity} />
          {b.label && <StoryText l={b.label} fill="var(--paper-dim)" />}
        </g>
      ))}
      {frame.angles.map((a) => (
        <g key={a.key} opacity={a.opacity}>
          <line x1={a.x} y1={a.y} x2={a.tick.x} y2={a.tick.y} stroke={BRASS} strokeWidth={1.4} />
          <circle cx={a.x} cy={a.y} r={5} fill="var(--void)" stroke={BRASS} strokeWidth={1.3} />
          <circle cx={a.x} cy={a.y} r={1.6} fill={BRASS} />
        </g>
      ))}
    </svg>
  );
}

/** Sizes follow the frame's height, as the grid's own words do, so the lines fit their slot on any screen. */
const DETAIL_TYPE: Record<StoryDetail["kind"], { className: string; size: string }> = {
  figure: { className: "font-numeric", size: "clamp(17px, 3.2cqh, 22px)" },
  numbers: { className: "font-numeric", size: "clamp(11.5px, 1.95cqh, 13px)" },
  place: { className: "", size: "clamp(12px, 2cqh, 14px)" },
  pair: { className: "font-display", size: "clamp(19px, 3.8cqh, 26px)" },
  closing: { className: "font-display", size: "clamp(16px, 3cqh, 20px)" },
};
const TONE: Record<StoryDetail["tone"], string> = { paper: "var(--paper)", dim: "var(--paper-dim)", brass: BRASS };
/** A scrolling band fades out at its edges rather than cut a line of the card in half. */
const EDGE_FADE = "linear-gradient(to bottom, transparent, #000 12px, #000 calc(100% - 24px), transparent)";
const SCROLL_EDGE: CSSProperties = { maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE };

function Detail(props: PartProps & { steps: StoryStep[] | null }) {
  const frame = useStoryFrame(props);
  if (props.steps) return frame.didYouKnow > 0 ? null : <StepList steps={props.steps} />;
  return (
    <div className="flex flex-col items-center gap-[min(6px,0.9cqh)]">
      {frame.detail.map((d, i) => (
        <p
          key={`${i}-${d.kind}`}
          className={`leading-tight text-balance ${DETAIL_TYPE[d.kind].className}`}
          style={{ fontSize: DETAIL_TYPE[d.kind].size, color: TONE[d.tone], opacity: d.opacity }}
        >
          {d.text}
        </p>
      ))}
      {frame.pairDots.length > 0 && (
        <span className="mt-[min(6px,0.9cqh)] flex gap-2" aria-hidden="true">
          {frame.pairDots.map((come, i) => (
            <i
              key={i}
              className="block size-[5px] rounded-full border border-[var(--indigo-lt)]"
              style={{ background: come ? "var(--indigo-lt)" : "transparent" }}
            />
          ))}
        </span>
      )}
    </div>
  );
}

/** Reduced motion's five steps, still: each step's title, and its numbers where the screen has room for them. */
function StepList({ steps }: { steps: StoryStep[] }) {
  const last = steps.length - 1;
  return (
    <ol className="mx-auto grid w-fit max-w-full gap-[min(4px,0.5cqh)] text-left">
      {steps.map((s, i) => (
        <li key={s.counter} className="flex min-w-0 items-baseline gap-2.5 leading-snug" style={{ fontSize: "clamp(12px, 1.9cqh, 14px)" }}>
          <span className="font-numeric shrink-0" style={{ color: i === last ? "var(--indigo-lt)" : "var(--muted)" }}>{i + 1}</span>
          <span className="min-w-0 truncate" style={{ color: i === last ? "var(--paper)" : "var(--paper-dim)" }}>
            {s.title}
            {s.detail.length > 0 && <span className="font-numeric hidden text-[var(--muted)] sm:inline"> · {s.detail.join(" · ")}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Stage(props: PartProps & { label: string }) {
  const frame = useStoryFrame(props);
  if (props.still && frame.didYouKnow > 0) return null;
  // With no birth time the Did you know card takes step 5 (ADR-317), and the chart steps back to make room for it.
  return <BuildStory frame={frame} label={props.label} style={{ opacity: 1 - frame.didYouKnow }} />;
}

/**
 * The Did you know card is taller than the detail slot on every screen, so while it shows it takes the band from the
 * stage's top to the detail's bottom, clear of the percentage and the door. Under reduced motion the band also holds
 * the still chart and the steps above the card, and scrolls; the chart is drawn small enough there that the card's top
 * shows under the steps, so a reader can see there is more.
 */
function CardBand(props: PartProps & { label: string; steps: StoryStep[] | null }) {
  const frame = useStoryFrame(props);
  if (frame.didYouKnow <= 0) return null;
  const card = (
    <div className="mx-auto w-full max-w-[560px]">
      <DidYouKnow chart={props.input.chart} />
    </div>
  );
  const band = "absolute inset-x-0 top-[24%] bottom-[16%] mx-auto max-w-[1000px] px-4";
  if (props.steps) {
    return (
      <div className={`${band} overflow-y-auto overscroll-contain`} style={SCROLL_EDGE}>
        <div className="flex h-[56%] justify-center">
          <BuildStory frame={frame} label={props.label} className="aspect-square h-full max-w-full" />
        </div>
        <div className="h-[3.4%]" />
        <StepList steps={props.steps} />
        <div className="mt-4 pb-7">{card}</div>
      </div>
    );
  }
  return (
    <div className={`${band} flex items-center`} style={{ opacity: frame.didYouKnow }}>
      {card}
    </div>
  );
}

/**
 * The story's slots for `OpeningOverlay`, or undefined while there is no chart to tell it from. Called on every render
 * of the page, before its early returns, so the clock lives as long as the page does.
 */
export function useBuildStory(report: StoryReport | undefined, chartReady: boolean, progress: Progress): LoadingSlots | undefined {
  const [clock] = useState(() => new StoryClock());
  const still = useReducedMotion();
  const stored = chartReady && report?.chartData ? (report.chartData as ChartData) : null;
  const birthDate = report?.birthDate;
  const birthTime = report?.birthTime;
  const windowMinutes = report?.birthTimeWindowMinutes;
  const latitude = report?.latitude;
  const longitude = report?.longitude;
  const zone = report?.timezone ?? undefined;
  const offset = report?.timezoneOffset;
  const place = report?.birthPlace ?? "";

  const computed = useMemo(() => {
    if (stored || birthDate === undefined || birthTime === undefined || latitude === undefined || longitude === undefined || offset === undefined) {
      return null;
    }
    // Birth fields the engine cannot read leave the story waiting for the stored chart rather than stopping the page.
    try {
      return chartOf({ birthDate, birthTime, latitude, longitude, timezone: zone, timezoneOffset: offset, birthTimeWindowMinutes: windowMinutes });
    } catch {
      return null;
    }
  }, [stored, birthDate, birthTime, windowMinutes, latitude, longitude, zone, offset]);

  const chart = stored ?? computed;
  const input = useMemo<StoryInput | null>(() => {
    if (!chart || birthDate === undefined || birthTime === undefined || latitude === undefined || longitude === undefined) return null;
    const time = (windowMinutes ?? 0) >= NO_TIME_WINDOW ? null : birthTime;
    return { chart, birth: { lat: latitude, lon: longitude, place, date: birthDate, time } };
  }, [chart, birthDate, birthTime, windowMinutes, latitude, longitude, place]);

  // The still list's words read only whether the report failed, so the percentage moving never works out five frames again.
  const failed = progress.failed;
  const steps = useMemo(
    () => (still && input ? storySteps(input, { ...progress, door: false }) : null),
    [still, input, failed],
  );

  if (!input) return undefined;
  const part = { clock, input, progress, still };
  const label = plainLine(input.chart);
  return {
    counter: <Words {...part} part="counter" />,
    title: <Words {...part} part="title" />,
    subtitle: <Words {...part} part="subtitle" />,
    stage: <Stage {...part} label={label} />,
    detail: <Detail {...part} steps={steps} />,
    below: <CardBand {...part} label={label} steps={steps} />,
  };
}
