import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

export interface TextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  /**
   * No look of its own: for a control whose look lives in its own class (a tab, a citation, a chart's stop), where
   * the text look's utilities would override that class. It keeps the part's type and ref.
   */
  bare?: boolean;
}

export const TextButton = React.forwardRef<HTMLButtonElement, TextButtonProps>(
  ({ className, asChild = false, bare = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={bare ? className : cn(
          "relative inline-flex min-h-8 items-center gap-1.5 bg-transparent px-0.5 font-sans text-[13.5px] font-medium leading-tight text-indigo-lt " +
            "cursor-pointer transition-colors duration-150 ease-[var(--ease)] hover:text-paper motion-reduce:transition-none " +
            "after:absolute after:-inset-x-2 after:-inset-y-1.5 after:content-[''] " +
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus",
          className,
        )}
        {...props}
      />
    );
  },
);
TextButton.displayName = "TextButton";

export default TextButton;
