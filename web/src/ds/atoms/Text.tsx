import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

export type TextStyle = "prose" | "ui" | "small" | "caption";

export interface TextProps extends Omit<ComponentPropsWithoutRef<"p">, "style"> {
  style?: TextStyle;
  as?: ElementType;
}

// The two button styles belong to Button, which sets Inter 500 itself.
const STYLE: Record<TextStyle, string> = {
  prose: "text-prose",
  ui: "text-ui",
  small: "text-small",
  caption: "text-caption",
};

export function Text({ style = "ui", as, className, ...rest }: TextProps) {
  const Tag = as ?? "p";
  return <Tag className={cn("font-sans text-paper-dim", STYLE[style], className)} {...rest} />;
}
