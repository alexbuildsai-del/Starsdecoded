import { cn } from "@/lib/utils";

export interface ChoiceTileProps {
  title: string;
  line: string;
  /** The group's one main action, which differs by colour only (ADR-333). */
  main?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** One of two actions of the same weight, side by side: a title in Inter over its small line. */
export function ChoiceTile({ title, line, main = false, disabled = false, onClick }: ChoiceTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid min-h-14 min-w-0 content-center gap-0.5 rounded-control border px-3 py-2.5 text-left transition duration-[var(--dur-fast)] ease-[var(--ease)]",
        "active:scale-[.98] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:cursor-default disabled:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        main
          ? "border-indigo-hover bg-indigo text-on-indigo hover:bg-indigo-hover"
          : "border-control-edge bg-transparent text-paper hover:border-indigo-lt disabled:hover:border-control-edge",
      )}
    >
      <span className={cn("text-button font-medium leading-tight", disabled && "text-paper-dim")}>{title}</span>
      <span className={cn("text-caption", main ? "text-on-indigo" : "text-muted")}>{line}</span>
    </button>
  );
}
