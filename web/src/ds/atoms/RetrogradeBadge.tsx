import { cn } from "@/lib/utils";

interface RetrogradeBadgeProps {
  size?: "default" | "small";
  /** Set only when no word sits beside the badge; otherwise the badge is decoration. */
  label?: string;
  className?: string;
}

export function RetrogradeBadge({ size = "default", label, className }: RetrogradeBadgeProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-grid shrink-0 place-items-center border border-back/55 font-mono font-semibold leading-none text-back",
        size === "small" ? "size-[18px] rounded-[5px] text-[11px]" : "size-[22px] rounded-md text-[11px]",
        className,
      )}
    >
      R
    </span>
  );
}

export default RetrogradeBadge;
