import { cn } from "@/lib/utils";
import { Progress } from "@/ds/atoms/Progress";
import { StatusDots } from "@/ds/atoms/StatusDots";

export interface LoaderProps {
  /** The status word beside the dots, or above the bar. */
  label: string;
  /** Real work only (ADR-394). Present for a wait over 5 s: a step bar; absent: StatusDots. */
  progress?: { pct: number; line: string };
  className?: string;
}

/** The full-screen wait before a page can show anything. Never inside a card. */
export function Loader({ label, progress, className }: LoaderProps) {
  return (
    <div className={cn("flex min-h-dvh w-full flex-col items-center justify-center gap-4 px-6 text-[#AEB6C6]", className)}>
      {progress ? (
        <>
          <p className="m-0 text-sm">{label}</p>
          <Progress {...progress} className="max-w-xs" />
        </>
      ) : (
        <StatusDots label={label} />
      )}
    </div>
  );
}

export default Loader;
