"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, type PanInfo } from "framer-motion";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { TextButton } from "@/ds/atoms/TextButton";

const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

export interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The non-modal version: the page stays live behind it; it rests at 45% and opens to 96%. */
  peek?: boolean;
  /** Radix's own default, for a sheet its trigger opens without a parent holding the state. */
  defaultOpen?: boolean;
  children?: React.ReactNode;
  /** Peek only: the accessible name of the sheet. */
  label?: string;
  /** Peek only: changes when the content is someone else, so the sheet drops back to the rest height. */
  contentKey?: string | null;
  /** Peek only: the content draws its own close; otherwise the grab bar carries one. */
  selfClosing?: boolean;
}

export function Sheet({ peek = false, label, contentKey, selfClosing, children, ...root }: SheetProps) {
  if (peek) {
    return (
      <PeekSheet
        open={!!root.open}
        onClose={() => root.onOpenChange?.(false)}
        label={label ?? ""}
        contentKey={contentKey ?? null}
        selfClosing={!!selfClosing}
      >
        {children}
      </PeekSheet>
    );
  }
  return <SheetPrimitive.Root {...root}>{children}</SheetPrimitive.Root>;
}

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-scrim ease-[var(--ease)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-300 " +
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-200",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-raised p-6 text-paper shadow-raised ease-[var(--ease)] focus-visible:outline-none " +
    "data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=closed]:animate-out data-[state=closed]:duration-200",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b border-line data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 rounded-t-sheet border-t border-line data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r border-line data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l border-line data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: { side: "right" },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, style, ...props }, ref) => {
    const inner = React.useRef<HTMLDivElement | null>(null);
    const [drag, setDrag] = React.useState<{ from: number; at: number; t: number } | null>(null);
    const bottom = side === "bottom";

    const closer = React.useRef<HTMLButtonElement>(null);

    const finish = () => {
      if (!drag) return;
      const height = inner.current?.offsetHeight ?? 1;
      const speed = drag.at / Math.max(1, performance.now() - drag.t);
      setDrag(null);
      if (drag.at > height / 3 || speed > 0.6) closer.current?.click();
    };

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={(node) => {
            inner.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          className={cn(sheetVariants({ side }), className)}
          style={drag ? { ...style, transform: `translateY(${drag.at}px)`, transition: "none" } : style}
          {...props}
        >
          {bottom && (
            <div
              aria-hidden
              data-sheet-grab
              className="absolute inset-x-0 top-0 grid h-6 touch-none place-items-center"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setDrag({ from: e.clientY, at: 0, t: performance.now() });
              }}
              onPointerMove={(e) => drag && setDrag({ ...drag, at: Math.max(0, e.clientY - drag.from) })}
              onPointerUp={finish}
              onPointerCancel={() => setDrag(null)}
            >
              <span className="block h-1 w-10 rounded-pill bg-control-edge" />
            </div>
          )}
          <SheetPrimitive.Close
            ref={closer}
            className="absolute right-3 top-3 grid size-11 place-items-center rounded-control text-paper-dim transition-colors duration-150 ease-[var(--ease)] hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
          {children}
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("font-display text-sheet-title text-paper", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-ui text-paper-dim", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

const PEEK = 0.45;
const SHEET_HEIGHT = 0.96;
const EASE = [0.16, 1, 0.3, 1] as const;

function glide(reduced: boolean) {
  return reduced ? { duration: 0 } : { duration: 0.3, ease: EASE };
}

function useViewportHeight(): number {
  const [height, setHeight] = React.useState(() => window.innerHeight);
  React.useEffect(() => {
    const measure = () => setHeight(window.innerHeight);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return height;
}

interface PeekSheetProps {
  open: boolean;
  onClose: () => void;
  label: string;
  contentKey: string | null;
  selfClosing: boolean;
  children?: React.ReactNode;
}

// vaul's non-modal drawer still blocks the page when opened from state, so the peek is drawn here.
function PeekSheet({ open: shown, onClose, label, contentKey, selfClosing, children }: PeekSheetProps) {
  const reduced = useReducedMotion();
  const viewport = useViewportHeight();
  const height = Math.round(viewport * SHEET_HEIGHT);
  const peekY = height - Math.round(viewport * PEEK);
  const [full, setFull] = React.useState(false);
  const y = useMotionValue(height);
  const drag = useDragControls();
  const sheet = React.useRef<HTMLDivElement>(null);
  const scroller = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!contentKey) return;
    setFull(false);
    scroller.current?.scrollTo({ top: 0 });
  }, [contentKey]);

  React.useEffect(() => {
    if (!shown) return;
    const controls = animate(y, full ? 0 : peekY, glide(reduced));
    return () => controls.stop();
  }, [shown, full, peekY, reduced, y]);

  // Escape inside the sheet closes it; the page behind answers Escape pressed anywhere outside a dialog.
  React.useEffect(() => {
    if (!shown) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (e.target instanceof Node && sheet.current?.contains(e.target)) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shown, onClose]);

  const settle = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const at = y.get();
    const speed = info.velocity.y;
    if (at > peekY + (height - peekY) / 3 || (speed > 600 && !full)) {
      onClose();
      return;
    }
    const toFull = speed < -400 || (Math.abs(speed) <= 400 && at < peekY / 2);
    if (toFull === full) animate(y, full ? 0 : peekY, glide(reduced));
    else setFull(toFull);
  };

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key="sheet"
          ref={sheet}
          role="dialog"
          aria-modal="false"
          aria-label={label}
          drag="y"
          dragControls={drag}
          // At the rest height the whole sheet drags up; once open only its top does, so the content scrolls.
          dragListener={!full}
          dragConstraints={{ top: 0, bottom: height }}
          dragElastic={{ top: 0.04, bottom: 0.3 }}
          dragMomentum={false}
          onDragEnd={settle}
          exit={{ y: height, transition: reduced ? { duration: 0 } : { duration: 0.2, ease: EASE } }}
          style={{ y, height }}
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-sheet border border-b-0 border-line bg-raised shadow-raised"
        >
          <div
            onPointerDown={(e) => {
              if (full) drag.start(e);
            }}
            className="relative flex h-10 shrink-0 touch-none items-center justify-center"
          >
            <TextButton
              aria-label="Show all"
              aria-expanded={full}
              onClick={() => setFull((was) => !was)}
              className="grid h-8 w-16 place-items-center rounded-inner"
            >
              <span aria-hidden className="block h-1 w-10 rounded-pill bg-control-edge" />
            </TextButton>
            {!selfClosing && (
              <TextButton onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 font-label text-label uppercase text-paper-dim">
                Close
              </TextButton>
            )}
          </div>
          <div
            ref={scroller}
            className={cn(
              "min-h-0 flex-1 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
              full ? "overflow-y-auto overscroll-contain" : "overflow-hidden",
            )}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export {
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
