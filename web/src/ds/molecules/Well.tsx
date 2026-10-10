import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** A group inside a card, on the ground fill; the only box allowed inside a card besides Strip. */
export function Well({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid min-w-0 content-start gap-2 rounded-control border border-line bg-ground p-3.5", className)} {...rest} />;
}
