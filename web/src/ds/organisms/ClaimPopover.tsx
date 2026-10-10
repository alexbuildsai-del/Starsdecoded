import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Claim } from "@/types/chart";
import { Sheet, SheetContent, SheetTitle } from "@/ds/organisms/Sheet";
import { glossFor, sourceLines, withHouseWords } from "@/lib/evidence-glossary";
import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 8, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={12}
      className={cn(
        "z-50 rounded-card border border-line bg-raised p-4 text-paper shadow-raised outline-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

/** Children of an `.rp-card`, so no wrapper of its own. Every house number carries its word (ADR-98). */
export function EvidenceCard({ claim }: { claim: Claim }) {
  const n = claim.evidence.length;
  return (
    <>
      <p className="q">“{claim.quote}”</p>
      {claim.evidence.map((e, i) => {
        // A source claim reads as two labelled lines and no sentence (ADR-60).
        if (e.ref.kind === "source") {
          const lines = sourceLines(e.ref, e.label);
          return (
            <div className="ev" key={i}>
              <div className="t"><span className="k source">source</span><span className="l">{lines.source}</span></div>
              <div className="t"><span className="k source">evidence</span><span className="l">{withHouseWords(lines.evidence)}</span></div>
            </div>
          );
        }
        return (
          <div className="ev" key={i}>
            <div className="t">
              <span className={`k ${e.ref.kind}`}>{e.ref.kind}</span>
              <span className="l">{withHouseWords(e.label)}</span>
            </div>
            <div className="w">{glossFor(e.ref)}</div>
          </div>
        );
      })}
      <p className="foot">
        {n} verified reference{n === 1 ? "" : "s"} · whole sign · tropical
      </p>
    </>
  );
}

function isCoarsePointer(): boolean {
  return typeof window !== "undefined"
    && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 720);
}

// `.rp-card` carries the report's tokens and the card's inner type; its fixed placement and the narrow-screen sheet rules are
// switched off here because Radix places the card and the Sheet is the phone version.
const CARD = "rp-card !static !w-[min(344px,calc(100vw-32px))] !max-h-none !overflow-visible !rounded-card";
const IN_SHEET = "rp-card [&_.q]:pr-10 !static !w-full !max-h-none !overflow-visible !rounded-none !border-0 !bg-transparent !p-0 !shadow-none";

/**
 * The citation mark and its evidence card. Desktop opens on hover (a short grace to reach the card), focus-click and tap;
 * Escape and an outside click close it. Phone or touch: the same card in a bottom Sheet.
 */
export function ClaimPopover({ index, claim }: { index: number; claim: Claim }) {
  const [open, setOpen] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const markRef = useRef<HTMLButtonElement>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const closeSoon = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  }, [cancelClose]);
  useEffect(() => cancelClose, [cancelClose]);

  const change = useCallback((next: boolean) => {
    if (next) setCoarse(isCoarsePointer());
    setOpen(next);
  }, []);

  const name = `Evidence for “${claim.quote.slice(0, 60)}${claim.quote.length > 60 ? "…" : ""}”`;

  return (
    <span
      onMouseEnter={() => { if (!isCoarsePointer()) { cancelClose(); setCoarse(false); setOpen(true); } }}
      onMouseLeave={() => { if (!isCoarsePointer()) closeSoon(); }}
      onBlur={(e) => {
        if (!coarse && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Popover open={open && !coarse} onOpenChange={change}>
        <PopoverTrigger asChild>
          <button
            ref={markRef}
            type="button"
            aria-label={name}
            aria-expanded={open}
            className={`rp-cite no-print relative after:absolute after:-inset-[7px] after:content-['']${open ? " open" : ""}`}
          >
            {index}
          </button>
        </PopoverTrigger>
        <PopoverContent
          role="dialog"
          aria-label={name}
          side="top"
          avoidCollisions
          className={CARD}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onMouseEnter={cancelClose}
          onMouseLeave={() => closeSoon()}
        >
          <EvidenceCard claim={claim} />
        </PopoverContent>
      </Popover>
      <Sheet open={open && coarse} onOpenChange={change}>
        <SheetContent
          side="bottom"
          aria-describedby={undefined}
          // The mark is not a SheetTrigger, so Radix has nowhere to return focus to.
          onCloseAutoFocus={(e) => { e.preventDefault(); markRef.current?.focus(); }}
          className="max-h-[70vh] overflow-y-auto pb-[calc(18px+env(safe-area-inset-bottom,0px))]">
          <SheetTitle className="sr-only">{name}</SheetTitle>
          <div className={IN_SHEET}>
            <EvidenceCard claim={claim} />
          </div>
        </SheetContent>
      </Sheet>
    </span>
  );
}

export default ClaimPopover;
