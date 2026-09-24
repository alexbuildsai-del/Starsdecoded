import { cn } from "@/lib/utils";
import { Mark } from "@/components/Mark";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-lg text-foreground", className)}>
      <Mark className="h-5 w-5 text-primary" title="Stars Decoded" />
      <span>Stars Decoded</span>
    </span>
  );
}
