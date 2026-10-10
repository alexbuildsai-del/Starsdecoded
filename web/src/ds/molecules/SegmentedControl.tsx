import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  className?: string;
}

export function SegmentedControl<const T extends string>({ options, value, onChange, className, "aria-label": ariaLabel }: SegmentedControlProps<T>) {
  const group = useRef<HTMLDivElement>(null);

  // Arrows pick the neighbour and move focus with it; Enter and Space only press the focused segment, and type="button"
  // keeps Enter from submitting a form the control sits in (R14-12).
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const at = options.findIndex((option) => option.id === value);
    const next = options[(at + step + options.length) % options.length];
    onChange(next.id);
    group.current?.querySelectorAll<HTMLButtonElement>("button")[options.indexOf(next)]?.focus();
  }

  return (
    <div
      ref={group}
      role="group"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn("inline-flex gap-0.5 rounded-control border border-line bg-ground p-[3px]", className)}
    >
      {options.map(({ id, label }) => {
        const on = id === value;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(id)}
            className={cn(
              "relative min-h-9 rounded-inner px-3 font-label text-[13px] font-medium transition-colors duration-(--dur-fast) ease-[var(--ease)]",
              "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-lt",
              on ? "bg-raised text-paper" : "text-muted hover:text-paper",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
