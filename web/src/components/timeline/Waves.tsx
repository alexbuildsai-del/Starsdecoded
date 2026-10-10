/**
 * Life's waves (Timeline's Life; timeline-page §2; Review 05/10 §4): each planet's distance from where it was when you
 * were born, from birth to 90. A return sits at the bottom of its wave, an opposition at the top and a quarter turn
 * halfway; the years already lived are shaded, and the line is today. With a `control` the line is a handle: pressed
 * or dragged anywhere on the graph it moves the card under it, and a dot sends it to its cycle. Without one (the
 * public page's Mira) the line is just today. The marks are the engine's cycles when a line carries them, else found
 * in its own monthly points (`waveMarks`), so each sits on its line.
 *
 * The lines stretch to any width while their strokes keep their weight, and the words and marks are HTML over them,
 * so nothing scales with the box. On a phone the graph keeps a width to read and scrolls sideways inside its box.
 */
import { tokens } from "@workspace/design";
import { useEffect, useRef, type PointerEvent } from "react";
import {
  WAVE_UNTIL,
  bodyName,
  waveMarks,
  wavePath,
  waveX,
  waveY,
  wavesLabel,
  type LifeStop,
  type WaveLine,
  type WaveMarkKind,
} from "@/lib/life-view";

const DOT_SIZE: Readonly<Record<WaveMarkKind, string>> = {
  return: "h-2.5 w-2.5",
  opposition: "h-2 w-2",
  square: "h-1.5 w-1.5",
};

const KIND_WORD: Readonly<Record<WaveMarkKind, string>> = { return: "return", opposition: "opposition", square: "square" };
const MARK_DISTANCE: Readonly<Record<WaveMarkKind, number>> = { return: 0, opposition: 180, square: 90 };
const DECADES = Array.from({ length: WAVE_UNTIL / 10 + 1 }, (_, i) => i * 10);
// A label at either end of the axis hangs inward, so it never runs off the box.
function hang(age: number): string {
  if (age <= 0) return "";
  return age >= WAVE_UNTIL ? "-translate-x-full" : "-translate-x-1/2";
}

const GRAPH_NAME =
  "Jupiter, Saturn, the Moon's nodes and Uranus moving away from their places at your birth and back, from birth to 90.";
// A press this close to where it started is a tap, so a swipe that scrolls the graph sideways moves no line.
const TAP_PX = 8;

export interface WaveControl {
  /** Where the line is, in years from birth. */
  age: number;
  /** What rides on the line: "Today · age 31 · Oct 2026". */
  label: string;
  /** Every cycle's mark, to make each dot a button and to light the chosen one. */
  stops: readonly LifeStop[];
  selected: string | null;
  /** The line moved to an age; `settle` is the end of a press, when it snaps to the nearest mark. */
  onSeek: (age: number, settle: boolean) => void;
  onPick: (key: string) => void;
}

function Dot({
  line,
  age,
  kind,
  past,
  stop,
  control,
}: {
  line: WaveLine;
  age: number;
  kind: WaveMarkKind;
  past: boolean;
  stop: LifeStop | undefined;
  control: WaveControl | undefined;
}) {
  const chosen = stop !== undefined && stop.key === control?.selected;
  const look = `${chosen ? "h-3.5 w-3.5 ring-2 ring-paper" : `${DOT_SIZE[kind]} ring-[1.5px] ring-void`} ${past ? "bg-brass-dim" : "bg-brass"}`;
  const place = { left: `${waveX(age)}%`, top: `${waveY(MARK_DISTANCE[kind])}%` };
  if (!stop || !control) {
    return <i aria-hidden className={`absolute block -translate-x-1/2 -translate-y-1/2 rounded-full ${look}`} style={place} />;
  }
  return (
    <button
      type="button"
      aria-label={`${bodyName(line.body)} ${KIND_WORD[kind]}, age ${Math.floor(age)}`}
      aria-pressed={chosen}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => control.onPick(stop.key)}
      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full before:absolute before:-inset-2 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper ${look}`}
      style={place}
    />
  );
}

function WaveRow({ line, today, control }: { line: WaveLine; today: number; control: WaveControl | undefined }) {
  return (
    <div className="relative z-[1] grid gap-1">
      <span className="font-label text-xs leading-none tracking-[.06em] text-paper-dim">{bodyName(line.body)}</span>
      <div className="relative h-12">
        <svg aria-hidden viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 block h-full w-full overflow-visible">
          <path
            d={wavePath(line.points)}
            fill="none"
            stroke={tokens.color["indigo-lt"]}
            strokeOpacity={0.85}
            strokeWidth={1.4}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {waveMarks(line).map((mark) => (
          <Dot
            key={`${mark.kind}-${mark.age}`}
            line={line}
            age={mark.age}
            kind={mark.kind}
            past={mark.age < today}
            stop={control?.stops.find((s) => s.body === line.body && s.kind === mark.kind && s.age === mark.age)}
            control={control}
          />
        ))}
      </div>
    </div>
  );
}

export function Waves({ wave, today, control }: { wave: WaveLine | readonly WaveLine[]; today: number; control?: WaveControl }) {
  const lines: readonly WaveLine[] = "points" in wave ? [wave] : wave;
  const track = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; drag: boolean } | null>(null);
  const now = waveX(today);
  const at = waveX(control ? control.age : today);

  // On a phone the graph is wider than its box, so a line the slider or a key moved out of sight is scrolled back into it.
  useEffect(() => {
    const frame = box.current;
    const plot = track.current;
    if (!control || !frame || !plot || press.current) return;
    const x = plot.offsetLeft + (plot.offsetWidth * at) / 100;
    const margin = 48;
    if (x < frame.scrollLeft + margin || x > frame.scrollLeft + frame.clientWidth - margin) {
      frame.scrollTo({ left: Math.max(0, x - frame.clientWidth / 2) });
    }
  }, [control, at]);

  const ageAt = (clientX: number): number => {
    const box = track.current?.getBoundingClientRect();
    if (!box || box.width === 0) return 0;
    const share = Math.min(Math.max((clientX - box.left) / box.width, 0), 1);
    return Math.round(share * WAVE_UNTIL * 100) / 100;
  };

  // A mouse or pen press moves the line at once and then follows it; a finger does so from the handle, and on the
  // rest of the graph a tap moves it while a swipe scrolls the box.
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!control) return;
    const onHandle = (e.target as HTMLElement).closest("[data-handle]") !== null;
    const drag = e.pointerType !== "touch" || onHandle;
    press.current = { x: e.clientX, drag };
    if (!drag) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // A pointer the browser has already let go of cannot be captured; the press then simply ends.
    }
    control.onSeek(ageAt(e.clientX), false);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (control && press.current?.drag) control.onSeek(ageAt(e.clientX), false);
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const held = press.current;
    press.current = null;
    if (!control || !held) return;
    if (held.drag || Math.abs(e.clientX - held.x) < TAP_PX) control.onSeek(ageAt(e.clientX), true);
  };
  const onCancel = () => {
    press.current = null;
  };

  return (
    <div
      ref={box}
      role={control ? "group" : "img"}
      aria-label={control ? GRAPH_NAME : wavesLabel(lines, today)}
      // A box that scrolls sideways has to be reachable by keyboard; with a control the dots already are.
      tabIndex={control ? undefined : 0}
      className="m-0 min-w-0 overflow-x-auto rounded-card border border-line bg-ground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-[620px] px-6 pb-3 pt-12">
        <div
          ref={track}
          className={`relative grid gap-4 ${control ? "cursor-ew-resize" : ""}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
        >
          <div aria-hidden className="pointer-events-none absolute -inset-y-3 left-0 bg-raised" style={{ width: `${now}%` }} />
          {lines.map((line) => (
            <WaveRow key={line.body} line={line} today={today} control={control} />
          ))}
          <div aria-hidden className="pointer-events-none absolute -top-3 bottom-0 w-0.5 -translate-x-1/2 bg-paper" style={{ left: `${at}%` }} />
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 whitespace-nowrap rounded-full bg-paper px-2.5 py-1 font-numeric text-data font-medium leading-none text-void"
            style={{ left: `${at}%`, transform: `translateX(-${at}%)` }}
          >
            {control ? control.label : "Today"}
          </span>
          {control ? (
            <div
              data-handle
              aria-hidden
              className="absolute -bottom-3 z-10 grid h-11 w-11 -translate-x-1/2 translate-y-1/2 place-items-center"
              style={{ left: `${at}%`, touchAction: "none" }}
            >
              <i className="block h-3.5 w-3.5 rounded-full border-2 border-void bg-paper" />
            </div>
          ) : null}
        </div>
        <div aria-hidden className="relative mt-7 h-4 font-numeric text-data leading-4 text-muted">
          {DECADES.map((age) => (
            <span key={age} className={`absolute top-0 ${hang(age)}`} style={{ left: `${waveX(age)}%` }}>
              {age}
            </span>
          ))}
        </div>
        <p aria-hidden className="m-0 mt-0.5 text-right font-label text-label uppercase leading-none text-muted">
          Age
        </p>
      </div>
    </div>
  );
}
