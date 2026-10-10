import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export type NumbersSize = "data" | "data-sm" | "stat";

export interface NumbersProps extends ComponentPropsWithoutRef<"span"> {
  size?: NumbersSize;
}

const SIZE: Record<NumbersSize, string> = {
  data: "text-data",
  "data-sm": "text-data-sm uppercase",
  stat: "text-stat",
};

// Every degree, orb, time and price is mono and tabular, so columns line up.
export function Numbers({ size = "data", className, ...rest }: NumbersProps) {
  return <span className={cn("font-mono tabular-nums text-paper-dim", SIZE[size], className)} {...rest} />;
}
