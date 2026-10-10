import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface StatusDotsProps {
  label: string;
}

// The word is always there and reduced motion holds the dots still, so motion is never the only sign (ADR-130).
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
