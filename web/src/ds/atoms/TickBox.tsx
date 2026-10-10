import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TickBoxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The box's accessible name: the thing to try, in today's words. */
  label: string;
  disabled?: boolean;
  /** Text beside the box, inside the same 44 px row. */
  children?: ReactNode;
  className?: string;
}

// A tick is silent: no live region, no count, no toast. The check stays drawn once ticked.
export function TickBox({ checked, onChange, label, disabled, children, className }: TickBoxProps) {
  return (
    <label
      className={cn(
        "flex min-h-11 min-w-11 items-center gap-3",
        disabled ? "cursor-default" : "cursor-pointer",
        className,
      )}
    >
      <span className="relative grid h-11 w-11 flex-none place-items-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
          className="peer m-0 h-[18px] w-[18px] cursor-[inherit] appearance-none rounded-[5px] border-[1.5px] border-indigo-lt bg-transparent transition-colors checked:border-indigo checked:bg-indigo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
        />
        <Check
          aria-hidden="true"
          strokeWidth={3.2}
          className="pointer-events-none absolute h-3 w-3 text-on-indigo opacity-0 peer-checked:opacity-100"
        />
      </span>
      {children}
    </label>
  );
}
