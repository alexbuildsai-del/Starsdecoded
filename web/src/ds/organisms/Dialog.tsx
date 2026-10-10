import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const OVERLAY = [
  "fixed inset-0 z-50 bg-[var(--scrim)] duration-300 ease-[var(--ease)]",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  "motion-reduce:animate-none",
].join(" ");

// A bottom sheet below 640 px, where the thumb is; a centred window above. Written whole so Tailwind sees every class.
export const WINDOW = [
  "fixed z-50 flex flex-col gap-3.5 overflow-hidden border border-line-strong bg-raised text-paper outline-none duration-300 ease-[var(--ease)]",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
  "max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[92dvh] max-sm:rounded-t-sheet max-sm:px-[18px] max-sm:pb-[max(18px,env(safe-area-inset-bottom))] max-sm:pt-2.5 max-sm:shadow-raised",
  "max-sm:data-[state=open]:slide-in-from-bottom-full max-sm:data-[state=closed]:slide-out-to-bottom-full",
  "sm:left-1/2 sm:top-1/2 sm:max-h-[min(86dvh,720px)] sm:w-[calc(100%-2rem)] sm:max-w-[480px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-sheet sm:p-[18px] sm:shadow-raised",
  "sm:data-[state=open]:slide-in-from-bottom-2 sm:data-[state=closed]:slide-out-to-bottom-2",
].join(" ");

export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus";

/**
 * A window opened from state has no trigger for Radix to hand focus back to (B-99), and a trigger that
 * re-rendered is a new node. So focus goes back to whatever held it on open, while that is still on the page.
 */
export function useOpenerReturn(handlers: {
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const opener = React.useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: (event: Event) => {
      const active = document.activeElement;
      opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
      handlers.onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus: (event: Event) => {
      handlers.onCloseAutoFocus?.(event);
      if (event.defaultPrevented || !opener.current?.isConnected) return;
      event.preventDefault();
      opener.current.focus();
    },
  };
}

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => <DialogPrimitive.Overlay ref={ref} className={cn(OVERLAY, className)} {...props} />);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const GrabHandle = () => <span aria-hidden="true" className="mx-auto h-1 w-10 shrink-0 rounded-pill bg-line-strong sm:hidden" />;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) => {
  const focus = useOpenerReturn({
    onOpenAutoFocus: (event) => {
      onOpenAutoFocus?.(event);
      if (event.defaultPrevented) return;
      // Enter must not land on Close: with nothing else to take focus, the window itself does.
      const content = (event.currentTarget as HTMLElement | null) ?? null;
      const first = content?.querySelector<HTMLElement>("input, select, textarea, a[href], button:not([data-dialog-close]), [tabindex]:not([tabindex='-1'])");
      if (!first) {
        event.preventDefault();
        content?.focus({ preventScroll: true });
      }
    },
    onCloseAutoFocus,
  });
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        tabIndex={-1}
        className={cn(WINDOW, className)}
        onOpenAutoFocus={focus.onOpenAutoFocus}
        onCloseAutoFocus={focus.onCloseAutoFocus}
        {...props}
      >
        <GrabHandle />
        {children}
        <DialogPrimitive.Close
          data-dialog-close=""
          onKeyDown={(event) => {
            // A held or stray Enter from the control that opened this window must not shut it.
            if (event.key === "Enter" && event.repeat) event.preventDefault();
          }}
          className={cn("absolute right-3 top-3 inline-grid size-11 place-items-center rounded-control text-paper-dim hover:text-paper", FOCUS)}
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 pr-9 text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-row flex-wrap justify-end gap-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("font-display text-card-title font-normal text-paper", className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-small text-paper-dim", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
