import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CardVariant = "surface" | "glass" | "tint" | "tone";
export type CardTone = "rose" | "brass" | "teal" | "back" | "indigo-lt";

// Written out whole so Tailwind sees every class.
const VARIANT: Record<CardVariant, string> = {
  surface: "bg-surface border-line",
  glass: "bg-surface/60 border-line backdrop-blur-[6px]",
  tint: "bg-indigo/14 border-indigo-lt/35",
  tone: "bg-surface border-line border-l-[3px]",
};

const TONE_EDGE: Record<CardTone, string> = {
  rose: "border-l-rose",
  brass: "border-l-brass",
  teal: "border-l-teal",
  back: "border-l-back",
  "indigo-lt": "border-l-indigo-lt",
};

export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  /** Only read by the tone version. */
  tone?: CardTone;
  /** The hero panel keeps the sheet corner; every other card takes the card corner. */
  large?: boolean;
  as?: "section" | "article" | "div";
}

export function Card({ variant = "surface", tone = "rose", large, as: Tag = "section", className, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        "flex min-w-0 flex-col gap-2 border p-4 text-left sm:p-5",
        large ? "rounded-sheet" : "rounded-card",
        VARIANT[variant],
        variant === "tone" && TONE_EDGE[tone],
        className,
      )}
      {...rest}
    />
  );
}

export function CardLabel({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[.16em] text-label-dim", className)} {...rest} />;
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** 17 px for narrow grid cards, 20 px for a wide card; one size per kind of card. */
  size?: "default" | "sm";
  as?: "h2" | "h3" | "h4";
}

export function CardTitle({ size = "default", as: Tag = "h3", className, ...rest }: CardTitleProps) {
  return (
    <Tag
      className={cn(
        "font-display font-normal text-balance text-paper",
        size === "sm" ? "text-card-title-sm" : "text-card-title",
        className,
      )}
      {...rest}
    />
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-small text-paper-dim", className)} {...rest} />;
}

export function CardData({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("font-mono text-data tabular-nums text-muted", className)} {...rest} />;
}

export interface CardActionsProps extends HTMLAttributes<HTMLDivElement> {
  /** Share sits at the far end of the row, away from the main button. */
  share?: ReactNode;
}

export function CardActions({ share, children, className, ...rest }: CardActionsProps) {
  return (
    <div className={cn("mt-1.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2", className)} {...rest}>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      {share}
    </div>
  );
}
