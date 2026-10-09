import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  /** 0 to 100, from real work only (ADR-394). */
  pct: number;
  /** Its percentage and what is being written, "58% · writing this month". */
  line: string;
  className?: string;
}

/** The one bar both loading screens share: Timeline's setup and the Personal report's story. */
export function ProgressBar({ pct, line, className }: ProgressBarProps) {
  const value = Math.min(100, Math.max(0, pct));
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-valuetext={line}
        className="h-[6px] w-full overflow-hidden rounded-full bg-[#242C3B]"
      >
        <i
          className="block h-full rounded-full bg-[#E8EBF2] transition-[width] duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="m-0 truncate text-center font-numeric text-[length:min(12.5px,2.3cqh)] leading-[1.2] text-[#AEB6C6]">{line}</p>
    </div>
  );
}

export default ProgressBar;
