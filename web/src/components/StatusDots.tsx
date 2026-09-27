import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface StatusDotsProps {
  label: string;
}

/**
 * What a control under way becomes instead of its idle verb ("Generating",
 * "Writing"; ADR-130): three dots beside the status word, never a percentage
 * nobody can compute. Reduced motion holds them still rather than removing
 * them, so the status still reads as in progress (annex, Micro animations).
 */
export function StatusDots({ label }: StatusDotsProps) {
  const reduced = useReducedMotion();
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-flex items-center gap-[3px]">
        {[0, 1, 2].map((i) => (
          <i
            key={i}
            className={`block h-1 w-1 rounded-full bg-current ${reduced ? "opacity-70" : "animate-pulse"}`}
            style={reduced ? undefined : { animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </span>
      {label}
    </span>
  );
}

export default StatusDots;
