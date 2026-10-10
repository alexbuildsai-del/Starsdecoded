import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { StatusDots } from "@/ds/atoms/StatusDots";

export const buttonStyles = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border font-sans font-medium no-underline " +
    "cursor-pointer select-none transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease)] " +
    "active:scale-[.97] motion-reduce:transition-none motion-reduce:active:scale-100 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus " +
    "aria-disabled:cursor-progress [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "border-indigo-hover bg-indigo text-on-indigo hover:border-indigo-lt",
        secondary: "border-control-edge bg-transparent text-paper hover:border-indigo-lt",
        danger: "border-error/55 bg-transparent text-error hover:border-error",
      },
      size: {
        default: "h-[46px] px-5 text-[15px] leading-none",
        // 36 px seen, 44 px tapped: the ::after grows the hit area without moving the row.
        compact:
          "h-9 min-w-11 px-3 text-[13.5px] leading-none after:absolute after:-inset-x-0.5 after:-inset-y-1 after:content-['']",
      },
      full: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "default", full: false },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "default" | "compact";
  full?: boolean;
  /** The status word shown with three dots in place of the idle verb (ADR-130). */
  busy?: string;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, full, busy, asChild = false, children, onClick, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const working = busy !== undefined && !asChild;
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        aria-busy={working || undefined}
        aria-disabled={working || props.disabled || undefined}
        onClick={working ? (e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault() : onClick}
        className={cn(buttonStyles({ variant, size, full }), className)}
        {...props}
      >
        {working ? <StatusDots label={busy} /> : children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export default Button;
