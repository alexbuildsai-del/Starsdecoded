import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export type EyebrowKind = "kicker" | "label";

export interface EyebrowProps extends ComponentPropsWithoutRef<"span"> {
  kind?: EyebrowKind;
}

// Colour is a default, not a rule: a chart fact passes text-brass, good and hard text-teal and text-rose.
const KIND: Record<EyebrowKind, string> = {
  kicker: "text-kicker text-indigo-lt",
  label: "text-label text-label-dim",
};

export function Eyebrow({ kind = "label", className, ...rest }: EyebrowProps) {
  return <span className={cn("font-label uppercase", KIND[kind], className)} {...rest} />;
}
