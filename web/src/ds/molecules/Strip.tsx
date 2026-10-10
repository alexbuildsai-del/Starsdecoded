import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** A raised band inside a card for a quote or a "For you" line; no edge, so it never reads as a card. */
export function Strip({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <div className={cn("min-w-0 rounded-control bg-raised px-3.5 py-3 text-paper", className)} {...rest} />;
}
