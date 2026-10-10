/**
 * The one balance in sight (ADR-95, 129): the pill in the nav on every
 * dashboard view, the dots both credit sheets and every bundle list draw, and
 * the panel's credit row (dashboard-sky acceptance 8). Each reads the same
 * credits query, so the numbers never disagree, and none shows a bundle or a
 * price; the row says what a credit buys, as every price list does (ADR-170).
 */
import { CREDIT_LINE } from "@workspace/commerce";
import { useGetCredits } from "@workspace/api-client-react";
import { Button } from "@/ds/atoms/Button";
import { TextButton } from "@/ds/atoms/TextButton";
import { creditDots } from "@/lib/credits-view";
import { cn } from "@/lib/utils";

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
    <TextButton
      onClick={onOpen}
      disabled={!loaded}
      className={cn(
        "h-7 min-h-0 shrink-0 whitespace-nowrap rounded-full border px-2.5 font-label text-caption font-medium",
        "transition-[background-color,border-color,color,transform] duration-[var(--dur-base)] active:scale-[.97] motion-reduce:active:scale-100 disabled:cursor-default",
        grey
          ? "border-line bg-transparent text-muted hover:border-indigo-lt/40"
          : "border-indigo/35 bg-indigo-tint text-indigo-lt hover:border-indigo/60",
        className,
      )}
    >
      {loaded ? (
        <>
          <span className={cn("font-numeric text-caption", grey ? "text-muted" : "text-paper")}>{count}</span>{" "}
          {count === 1 ? "credit" : "credits"}
        </>
      ) : (
        "Credits"
      )}
    </TextButton>
  );
}

export interface CreditDotsProps {
  count: number;
  className?: string;
}

/**
 * Decorative: whatever draws the dots also states the number in words. A balance and a bundle draw the same dot, so
 * three credits look alike on the price list and in the sheet (ADR-172).
 */
export function CreditDots({ count, className }: CreditDotsProps) {
  const { lit, more } = creditDots(count);
  if (lit === 0) return null;
  return (
    <div aria-hidden="true" className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {Array.from({ length: lit }, (_, i) => (
        <i key={i} className="block h-[9px] w-[9px] rounded-full bg-violet shadow-[0_0_8px_var(--color-violet)]" />
      ))}
      {more > 0 && <span className="ml-0.5 font-numeric text-caption text-indigo-lt">+{more}</span>}
    </div>
  );
}

export interface CreditRowProps {
  /** Opens the credits sheet, from Get more or, at zero, Get credits. */
  onGetCredits: () => void;
  className?: string;
}

/** The panel's credit row and the reader's own card's credit slot (annex, Credits). */
export function CreditRow({ onGetCredits, className }: CreditRowProps) {
  const available = useGetCredits().data?.available;
  if (available === undefined) return null;
  const count = Math.max(0, available);
  const zero = count === 0;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 rounded-card border border-line bg-surface-glass px-3 py-2.5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-small leading-snug text-paper">
          {zero ? "No credits left" : (
            <>
              <span className="font-numeric">{count}</span> {count === 1 ? "credit" : "credits"} left
            </>
          )}
        </p>
        <p className="text-caption leading-snug text-muted">{CREDIT_LINE}</p>
      </div>
      <Button size="compact" variant={zero ? "primary" : "secondary"} onClick={onGetCredits}>
        {zero ? "Get credits" : "Get more"}
      </Button>
    </div>
  );
}

export default CreditPill;
