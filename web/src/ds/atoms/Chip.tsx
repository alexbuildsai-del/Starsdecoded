import type { HTMLAttributes, MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChipTone = "neutral" | "now" | "brass" | "back" | "teal";

const TONE: Record<ChipTone, string> = {
  neutral: "border-line text-paper-dim",
  now: "border-indigo bg-indigo/20 text-paper",
  brass: "border-brass/55 text-brass",
  back: "border-back/55 text-back",
  teal: "border-teal/55 text-teal",
};

const SELECTED = "border-indigo bg-indigo/20 text-paper";

interface ChipBase {
  /** A ToneDot, a RetrogradeBadge, a 16 px PlanetBody: any node. */
  icon?: ReactNode;
  tone?: ChipTone;
  selected?: boolean;
  /** Sentence case in the body face, for a fact that is not a state. */
  quiet?: boolean;
  className?: string;
  children: ReactNode;
}

type ChipProps = ChipBase & {
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, keyof ChipBase | "onClick">;

// The pill stays 24 px tall; a control gets its 44 px tap from the reach of ::after, so a row of chips does not grow.
const CONTROL =
  "relative cursor-pointer transition-colors duration-[var(--dur-fast)] ease-[var(--ease)] after:absolute after:-inset-x-1 after:-inset-y-[10px] after:content-[''] hover:border-indigo-lt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-lt motion-reduce:transition-none";

export function Chip(props: ChipProps) {
  const { icon, tone = "neutral", selected, quiet, className, children, disabled, href, onClick, ...rest } = props;
  const classes = cn(
    "inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5",
    quiet ? "font-sans text-xs font-normal leading-none" : "font-label text-[11px] font-medium uppercase leading-none tracking-[.14em]",
    selected ? SELECTED : TONE[tone],
    (onClick || href !== undefined) && CONTROL,
    disabled && "pointer-events-none opacity-50",
    className,
  );
  const inner = (
    <>
      {icon}
      {children}
    </>
  );
  if (href !== undefined) {
    return (
      <a
        {...rest}
        href={disabled ? undefined : href}
        onClick={onClick}
        aria-disabled={disabled || undefined}
        aria-current={selected ? "true" : undefined}
        className={classes}
      >
        {inner}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" {...rest} onClick={onClick} disabled={disabled} aria-pressed={selected ?? false} className={classes}>
        {inner}
      </button>
    );
  }
  return (
    <span {...rest} className={classes}>
      {inner}
    </span>
  );
}

export default Chip;
