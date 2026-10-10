import { cn } from "@/lib/utils";
import { Mark } from "@/ds/atoms/Mark";

/** 18 px on the site, 17 px in checkout and admin (logo spec). */
export function Wordmark({ className, size = 18 }: { className?: string; size?: 17 | 18 }) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 font-display text-foreground", className)}
      style={{ fontSize: size }}
    >
      <Mark className="h-5 w-5 text-primary" title="Stars Decoded" />
      <span>Stars Decoded</span>
    </span>
  );
}

export default Wordmark;
