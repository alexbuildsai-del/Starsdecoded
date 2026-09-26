/**
 * The one balance in sight (ADR-95, 129): the pill in the nav on every
 * dashboard view, the dots both credit sheets draw, and the panel's credit
 * row (dashboard-sky acceptance 8). Each reads the same credits query, so the
 * numbers never disagree, and none shows a bundle or a price.
 */
import { useGetCredits } from "@workspace/api-client-react";
import { creditDots, creditsEnforced } from "@/lib/credits-view";
import { cn } from "@/lib/utils";

const PRESS = "active:scale-[.97] motion-reduce:transition-none motion-reduce:active:scale-100";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface CreditPillProps {
  /** Opens the credits sheet. */
  onOpen: () => void;
  className?: string;
}

export function CreditPill({ onOpen, className }: CreditPillProps) {
  const available = useGetCredits().data?.available;
  const loaded = available !== undefined;
  const count = loaded ? Math.max(0, available) : 0;
  // A balance still loading reads as neither a number nor zero.
  const grey = !loaded || count === 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!loaded}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 font-label text-[11.5px] font-medium",
        "transition-[background-color,border-color,color,transform] duration-300 disabled:cursor-default",
        PRESS,
        FOCUS,
        grey
          ? "border-border bg-transparent text-muted-foreground hover:border-[#9FA8DA]/40"
          : "border-[rgba(92,107,192,.35)] bg-[rgba(92,107,192,.1)] text-[#9FA8DA] hover:border-[rgba(92,107,192,.6)]",
        className,
      )}
    >
      {loaded ? (
        <>
          <span className={cn("font-numeric text-xs", grey ? "text-muted-foreground" : "text-foreground")}>{count}</span>{" "}
          {count === 1 ? "credit" : "credits"}
        </>
      ) : (
        "Credits"
      )}
    </button>
  );
}

export interface CreditDotsProps {
  count: number;
  className?: string;
}

/** Decorative: whatever draws the dots also states the number in words. */
export function CreditDots({ count, className }: CreditDotsProps) {
  const { lit, more } = creditDots(count);
  if (lit === 0) return null;
  return (
    <div aria-hidden="true" className={cn("flex flex-wrap items-center gap-[7px]", className)}>
      {Array.from({ length: lit }, (_, i) => (
        <i
          key={i}
          className="block h-3 w-3 rounded-full bg-[linear-gradient(135deg,#5C6BC0,#8967C1)] shadow-[0_0_8px_rgba(137,103,193,.5)]"
        />
      ))}
      {more > 0 && <span className="ml-0.5 font-numeric text-xs text-[#9FA8DA]">+{more}</span>}
    </div>
  );
}

export interface CreditRowProps {
  /** Opens the credits sheet, from Get more or, at zero, Get credits. */
  onGetCredits: () => void;
  /** `creditsEnforced()` when left out. */
  enforced?: boolean;
  className?: string;
}

/** The panel's credit row and the reader's own card's credit slot (annex, Credits). */
export function CreditRow({ onGetCredits, enforced, className }: CreditRowProps) {
  const available = useGetCredits().data?.available;
  if (available === undefined) return null;
  // MB-6 provisional: production's soft pass has no Get credits to offer (ADR-138).
  const live = enforced ?? creditsEnforced();
  const count = Math.max(0, available);
  const zero = count === 0;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 rounded-xl border border-border bg-[rgba(20,24,31,.6)] px-3 py-2.5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[13.5px] leading-snug text-foreground">
          {zero ? "No credits left" : (
            <>
              <span className="font-numeric">{count}</span> {count === 1 ? "credit" : "credits"} left
            </>
          )}
        </p>
        <p className="text-xs leading-snug text-muted-foreground">
          {zero && live ? "Get credits to add someone or see how two people fit." : "Each report uses one."}
        </p>
      </div>
      {live && (
        <button
          type="button"
          onClick={onGetCredits}
          className={cn(
            "inline-flex h-[30px] shrink-0 items-center rounded-md px-[11px] font-label text-xs font-medium transition duration-200",
            PRESS,
            FOCUS,
            zero ? "bg-primary text-white hover:brightness-110" : "border border-border text-foreground hover:border-[#9FA8DA]/55",
          )}
        >
          {zero ? "Get credits" : "Get more"}
        </button>
      )}
    </div>
  );
}

export default CreditPill;
