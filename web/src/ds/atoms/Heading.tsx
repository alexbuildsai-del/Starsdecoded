import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

export type HeadingStyle = "hero" | "section" | "page-title" | "sheet-title" | "card-title" | "card-title-sm" | "lede";

export interface HeadingProps extends Omit<ComponentPropsWithoutRef<"h2">, "style"> {
  style: HeadingStyle;
  as?: ElementType;
}

// Hero and section grow on desktop; the rest hold their size.
const STYLE: Record<HeadingStyle, string> = {
  hero: "text-hero md:text-[68px]",
  section: "text-section md:text-[54px]",
  "page-title": "text-page-title",
  "sheet-title": "text-sheet-title",
  "card-title": "text-card-title",
  "card-title-sm": "text-card-title-sm",
  lede: "text-lede",
};

const TAG: Record<HeadingStyle, ElementType> = {
  hero: "h1",
  section: "h2",
  "page-title": "h1",
  "sheet-title": "h2",
  "card-title": "h3",
  "card-title-sm": "h3",
  lede: "p",
};

// Newsreader at 400 only: a bold title is not a style here.
export function Heading({ style, as, className, ...rest }: HeadingProps) {
  const Tag = as ?? TAG[style];
  return <Tag className={cn("font-display font-normal text-paper", STYLE[style], className)} {...rest} />;
}
