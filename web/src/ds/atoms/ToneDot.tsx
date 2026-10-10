import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type Tone = "heavy" | "mixed" | "light" | "credit";

const FILL: Record<Tone, string> = {
  heavy: "bg-rose",
  mixed: "bg-paper-dim",
  light: "bg-teal",
  credit: "bg-violet",
};

interface ToneDotProps {
  tone: Tone;
  /** A one-off colour (the third Compatibility dot); the tone still names the default. */
  hue?: string;
  className?: string;
}

// Always sits beside its word, so the dot is decoration: colour is never the only signal.
export function ToneDot({ tone, hue, className }: ToneDotProps) {
  const style: CSSProperties | undefined = hue ? { backgroundColor: hue } : undefined;
  return (
    <span
      aria-hidden="true"
      data-tone={tone}
      style={style}
      className={cn("inline-block size-[9px] shrink-0 rounded-full", FILL[tone], className)}
    />
  );
}

export default ToneDot;
