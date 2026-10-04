/**
 * Life's waves (Timeline's Life; timeline-page §2): each planet's distance
 * from where it was when you were born, from birth to 90, with the ages along
 * the top. A return sits at the bottom of its wave, an opposition at the top
 * and a quarter turn halfway; the years already lived are shaded and a line
 * marks today. The marks are the engine's cycles when a line carries them,
 * else found in its own monthly points (`waveMarks`), so each sits on its line.
 *
 * The lines stretch to any width while their strokes keep their weight, and
 * the words and marks are HTML over them, so nothing scales with the box.
 */
import {
  WAVE_UNTIL,
  bodyName,
  waveMarks,
  wavePath,
  waveTicks,
  waveX,
  waveY,
  wavesLabel,
  type WaveLine,
  type WaveMarkKind,
} from "@/lib/life-view";

const MARK_LOOK: Readonly<Record<WaveMarkKind, string>> = {
  return: "h-[7px] w-[7px] bg-[#D4B06A]",
  opposition: "h-[5px] w-[5px] bg-[#D4B06A]",
  square: "h-1 w-1 bg-[#AEB6C6]",
};

const MARK_DISTANCE: Readonly<Record<WaveMarkKind, number>> = { return: 0, opposition: 180, square: 90 };

const DECADES = Array.from({ length: WAVE_UNTIL / 10 + 1 }, (_, i) => i * 10);

// A label at either end of the axis hangs inward, so it never runs off the figure.
function hang(x: number): string {
  if (x < 4) return "";
  return x > 96 ? "-translate-x-full" : "-translate-x-1/2";
}

function WaveRow({ line, today }: { line: WaveLine; today: number }) {
  return (
    <div className="grid gap-1">
      <span className="font-label text-[11px] leading-none tracking-[.06em] text-[#AEB6C6]">{bodyName(line.body)}</span>
      <div className="relative h-12">
        <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 block h-full w-full overflow-visible">
          {DECADES.map((age) => (
            <line key={age} x1={waveX(age) * 10} y1={0} x2={waveX(age) * 10} y2={100} stroke="#1A202C" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1={0} y1={waveY(0)} x2={1000} y2={waveY(0)} stroke="#242C3B" vectorEffect="non-scaling-stroke" />
          <path
            d={wavePath(line.points)}
            fill="none"
            stroke="#9FA8DA"
            strokeWidth={1.6}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {waveMarks(line).map((mark) => (
          <i
            key={`${mark.kind}-${mark.age}`}
            className={`absolute block -translate-x-1/2 -translate-y-1/2 rounded-full ${MARK_LOOK[mark.kind]}${mark.age < today ? " opacity-55" : ""}`}
            style={{ left: `${waveX(mark.age)}%`, top: `${waveY(MARK_DISTANCE[mark.kind])}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function Waves({ wave, today }: { wave: WaveLine | readonly WaveLine[]; today: number }) {
  const lines: readonly WaveLine[] = "points" in wave ? [wave] : wave;
  const now = waveX(today);
  return (
    <figure role="img" aria-label={wavesLabel(lines, today)} className="m-0 grid min-w-0 gap-1.5">
      <div className="relative h-4 font-numeric text-[10px] leading-4 text-[#7E889A]">
        {waveTicks(today).map((age) => (
          <span key={age} className={`absolute top-0 ${hang(waveX(age))}`} style={{ left: `${waveX(age)}%` }}>
            {age}
          </span>
        ))}
        <span className={`absolute top-0 whitespace-nowrap text-[#9FA8DA] ${hang(now)}`} style={{ left: `${now}%` }}>
          Today
        </span>
      </div>
      <div className="relative grid gap-2.5">
        <div className="pointer-events-none absolute inset-y-0 left-0 bg-[rgba(232,235,242,.05)]" style={{ width: `${now}%` }} />
        {lines.map((line) => (
          <WaveRow key={line.body} line={line} today={today} />
        ))}
        <div className="pointer-events-none absolute inset-y-0 w-[1.5px] -translate-x-1/2 bg-[#5C6BC0]" style={{ left: `${now}%` }} />
      </div>
    </figure>
  );
}
