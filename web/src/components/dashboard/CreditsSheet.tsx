/**
 * The credits sheet (credit-loop, Credits you can see): what is left to use as
 * one count and its dots, the two ways to spend a credit, the bundles as the
 * site prices them (ADR-170, 172), each one the way to its checkout, and
 * History behind a fold. It frames itself like the other dashboard sheets,
 * from the right on a desktop and from the bottom on a phone.
 */
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { getGetCreditHistoryQueryKey, useGetCreditHistory, useGetCredits, type PriceItem } from "@workspace/api-client-react";
import type { BundleId } from "@workspace/commerce";
import { Button } from "@/ds/atoms/Button";
import { TextButton } from "@/ds/atoms/TextButton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/ds/organisms/Sheet";
import { BundleList } from "@/components/BundleList";
import { StatusDots } from "@/ds/atoms/StatusDots";
import { CreditDots } from "@/components/dashboard/CreditPill";
import { useIsMobile } from "@/hooks/use-mobile";
import { creditCount, historyLine } from "@/lib/credits-view";
import { cn } from "@/lib/utils";

const EYEBROW = "font-label text-kicker uppercase text-indigo-lt";

export interface CreditsSheetProps {
  open: boolean;
  onClose: () => void;
  /** Add someone's three choices. The sheet closes first. */
  onAddSomeone: () => void;
  /** The gift flow. The sheet closes first. */
  onGift: () => void;
  /** `usePrices().items`, so a live campaign shows on its row (reading 6). */
  prices: readonly PriceItem[] | null;
  /** Each bundle row's checkout, which comes back to this sheet (reading 2). */
  buy: (id: BundleId) => string;
}

function day(iso: string): string {
  const at = new Date(iso);
  return Number.isNaN(at.getTime())
    ? iso
    : at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Behind a fold and fetched on first opening: used credits show only here (ADR-129).
function History() {
  const [opened, setOpened] = useState(false);
  const history = useGetCreditHistory({ query: { queryKey: getGetCreditHistoryQueryKey(), enabled: opened } });
  const items = history.data ?? [];
  return (
    <details
      className="group"
      onToggle={(e) => {
        if (e.currentTarget.open) setOpened(true);
      }}
    >
      <summary
        className={cn(
          "inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-inner font-label text-caption font-medium text-muted",
          "hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus [&::-webkit-details-marker]:hidden",
        )}
      >
        <ChevronRight
          aria-hidden="true"
          className="h-3.5 w-3.5 transition-transform duration-[var(--dur-fast)] group-open:rotate-90 motion-reduce:transition-none"
        />
        History
      </summary>
      <div className="mt-2.5 text-caption text-muted">
        {history.isError ? (
          <p>
            History didn't load.{" "}
            <TextButton onClick={() => void history.refetch()} className="min-h-0 text-caption underline underline-offset-2">
              Try again
            </TextButton>
          </p>
        ) : history.isPending ? (
          <StatusDots label="Loading" />
        ) : items.length === 0 ? (
          <p>No credits bought or spent yet.</p>
        ) : (
          <ul className="grid gap-1.5">
            {items.map((item, i) => {
              const line = historyLine(item);
              return (
                <li key={`${item.date}-${i}`} className="grid grid-cols-[5.75rem_minmax(0,1fr)_auto] items-baseline gap-2.5">
                  <span className="font-numeric text-caption">{day(item.date)}</span>
                  <span className="min-w-0 text-paper-dim">
                    {line.text}
                    {line.test && <span className="text-muted"> · test</span>}
                  </span>
                  <span className="font-numeric text-caption">{line.amount}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}

export function CreditsSheet({ open, onClose, onAddSomeone, onGift, prices, buy }: CreditsSheetProps) {
  const phone = useIsMobile();
  const available = Math.max(0, useGetCredits().data?.available ?? 0);
  const zero = available === 0;

  const then = (next: () => void) => () => {
    onClose();
    next();
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={phone ? "bottom" : "right"}
        className={cn("flex flex-col gap-4 overflow-y-auto", phone && "max-h-[92dvh]")}
      >
        <SheetHeader className="space-y-1.5 pr-8 text-left">
          <SheetDescription className={EYEBROW}>Your credits</SheetDescription>
          <SheetTitle>{zero ? "No credits left" : `${creditCount(available)} to use`}</SheetTitle>
        </SheetHeader>

        <CreditDots count={available} />
        {/* A balance above zero needs no line here: what a credit buys is said once, under the bundles (ADR-170). */}
        {zero && <p className="text-small text-paper-dim">Your circle has room for more.</p>}

        {/* With no credit both doors would only ask for one, so at zero the bundles are the way on (ADR-275). */}
        {!zero && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="compact" onClick={then(onAddSomeone)}>
              Add someone
            </Button>
            <Button size="compact" variant="secondary" onClick={then(onGift)}>
              Gift a report
            </Button>
          </div>
        )}

        <div className="grid gap-2">
          <BundleList compact prices={prices} buy={buy} />
          <p className="text-caption text-muted">Tap a bundle to buy it.</p>
        </div>

        <History />
      </SheetContent>
    </Sheet>
  );
}

export default CreditsSheet;
