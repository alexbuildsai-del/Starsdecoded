import { cn } from "@/lib/utils";

// One place to change when the logo lands.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-lg gradient-text", className)}>
      Stars Decoded
    </span>
  );
}
