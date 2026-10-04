/**
 * A planet's round since birth as a ring (both Timeline artifacts): the brass
 * point where it was when you were born, at the left where our mark's point
 * sits; the arc it has come round since; the light dot where it is today; and
 * for a cycle that is not a return, the open circle where that cycle falls. It
 * runs anticlockwise, the way the zodiac runs on every wheel the site draws.
 * `AgeRing` is the big one with an age in its middle: the finder's and the
 * dashboard invitation's Saturn ring.
 */
import { ringArc, ringPoint } from "@/lib/life-view";

export function CycleRing({
  progress,
  target = null,
  size = 56,
  className = "block flex-none",
}: {
  /** 0 to 1 of the way round since birth; null draws the birth point alone. */
  progress: number | null;
  /** Where the cycle falls, 0 to 1 (`ringTarget`); null for a return, which sits on the birth point. */
  target?: number | null;
  size?: number;
  className?: string;
}) {
  const c = size / 2;
  const r = c - Math.max(6, size * 0.07);
  const tick = size * 0.03;
  const dot = Math.max(3.5, size * 0.03);
  const [bx, by] = ringPoint(0, c, r);
  const now = progress == null ? null : ringPoint(progress, c, r);
  const aim = target == null ? null : ringPoint(target, c, r);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" className={className}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#242C3B" strokeWidth={1.2} />
      {Array.from({ length: 12 }, (_, i) => {
        const [x1, y1] = ringPoint(i / 12, c, r - tick);
        const [x2, y2] = ringPoint(i / 12, c, r + tick);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#242C3B" />;
      })}
      {progress != null && progress > 0 ? (
        <path
          d={ringArc(progress, c, r)}
          fill="none"
          stroke="#5C6BC0"
          strokeOpacity={0.55}
          strokeWidth={Math.max(2, size * 0.018)}
          strokeLinecap="round"
        />
      ) : null}
      {aim ? <circle cx={aim[0]} cy={aim[1]} r={dot} fill="#06080C" stroke="#D4B06A" strokeWidth={1.5} /> : null}
      <circle cx={bx} cy={by} r={dot} fill="#D4B06A" />
      {now ? <circle cx={now[0]} cy={now[1]} r={dot} fill="#9FA8DA" stroke="#06080C" strokeWidth={2} /> : null}
    </svg>
  );
}

export function AgeRing({ age, progress, label, size = 220 }: { age: number; progress: number; label: string; size?: number }) {
  return (
    <div role="img" aria-label={`Age ${age}, ${label}`} className="relative" style={{ width: size, maxWidth: "100%", aspectRatio: "1 / 1" }}>
      <CycleRing progress={progress} size={size} className="absolute inset-0 block h-full w-full" />
      <div aria-hidden className="absolute inset-0 grid place-content-center justify-items-center gap-0.5 text-center">
        <span className="font-label text-[10.5px] uppercase leading-none tracking-[.16em] text-[#7E889A]">Age</span>
        <span className="font-numeric leading-[.95] tracking-[-.03em] text-[#E8EBF2]" style={{ fontSize: Math.round(size * 0.27) }}>
          {age}
        </span>
        {/* Half the ring wide, so a label of any length wraps inside the ring's line at any size. */}
        <span className="text-[12.5px] leading-snug text-[#AEB6C6]" style={{ maxWidth: Math.round(size * 0.5) }}>
          {label}
        </span>
      </div>
    </div>
  );
}
