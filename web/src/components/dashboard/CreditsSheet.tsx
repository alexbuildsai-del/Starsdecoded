/**
 * The credits sheet (credit-loop, Credits you can see): what is left to use as
 * one count and its dots, the two ways to spend a credit, the three bundles as
 * counts, and History behind a fold. It frames itself like the other dashboard
 * sheets, from the right on a desktop and from the bottom on a phone.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import {
  getGetCreditHistoryQueryKey,
  getGetCreditsQueryKey,
  useGetCreditHistory,
  useGetCredits,
  useTestCheckout,
} from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusDots } from "@/components/StatusDots";
import { CreditDots } from "@/components/dashboard/CreditPill";
import { useIsMobile } from "@/hooks/use-mobile";
import { BUNDLES, creditCount, creditsEnforced, historyLine } from "@/lib/credits-view";
import { cn } from "@/lib/utils";

const EYEBROW = "font-label text-[10.5px] font-medium uppercase leading-[1.2] tracking-[0.24em] text-[#9FA8DA]";
const BUTTON = cn(
  "inline-flex h-[30px] shrink-0 items-center justify-center rounded-md px-[11px] font-label text-xs font-medium",
  "transition duration-200 active:scale-[.97] motion-reduce:transition-none motion-reduce:active:scale-100",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45",
);
const FILLED = "bg-primary text-white hover:brightness-110";
const OUTLINED = "border border-[rgba(92,107,192,.6)] text-[#9FA8DA] hover:border-[#9FA8DA]";

export interface CreditsSheetProps {
  open: boolean;
  onClose: () => void;
  /** Add someone's three choices. The sheet closes first, and a single credit just added comes straight here (acceptance 6). */
  onAddSomeone: () => void;
  /** The gift flow. The sheet closes first. */
  onGift: () => void;
  /** `creditsEnforced()` when left out. */
  enforced?: boolean;
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
          "inline-flex cursor-pointer list-none items-center gap-1 rounded font-label text-xs font-medium text-muted-foreground",
          "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden",
        )}
      >
        <ChevronRight
          aria-hidden="true"
          className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
        />
        History
      </summary>
      <div className="mt-2.5 text-[12.5px] text-muted-foreground">
        {history.isError ? (
          <p>
            History didn't load.{" "}
            <button
              type="button"
              onClick={() => void history.refetch()}
              className="rounded text-[#9FA8DA] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Try again
            </button>
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
                  <span className="font-numeric text-xs">{day(item.date)}</span>
                  <span className="min-w-0 text-[#AEB6C6]">
                    {line.text}
                    {line.test && <span className="text-muted-foreground"> · test</span>}
                  </span>
                  <span className="font-numeric text-xs">{line.amount}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}

export function CreditsSheet({ open, onClose, onAddSomeone, onGift, enforced }: CreditsSheetProps) {
  const phone = useIsMobile();
  const qc = useQueryClient();
  const { isSignedIn } = useAuth();
  const [location, navigate] = useLocation();
  const [notice, setNotice] = useState<string | null>(null);
  const live = enforced ?? creditsEnforced();
  const available = Math.max(0, useGetCredits().data?.available ?? 0);
  const zero = available === 0;

  const checkout = useTestCheckout({
    mutation: {
      onSuccess: (counts, { data }) => {
        qc.setQueryData(getGetCreditsQueryKey(), counts);
        void qc.invalidateQueries({ queryKey: getGetCreditHistoryQueryKey() });
        onClose();
        // A bundle of 3 or more opens the path instead (`usePathOffer`, ADR-125).
        if (data.count < 3) onAddSomeone();
      },
      onError: (err) => {
        setNotice(
          err.status === 401
            ? "Sign in to get credits."
            : err.status === 403
              ? "Test credits aren't available here."
              : "The credits weren't added. Try again in a moment.",
        );
      },
    },
  });
  const { reset } = checkout;
  const adding = checkout.isPending ? (checkout.variables?.data.count ?? null) : null;

  useEffect(() => {
    if (!open) return;
    setNotice(null);
    reset();
  }, [open, reset]);

  const then = (next: () => void) => () => {
    onClose();
    next();
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={phone ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-4 overflow-y-auto",
          phone ? "max-h-[90dvh] rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]" : "w-full sm:max-w-md",
        )}
      >
        <SheetHeader className="space-y-1.5 pr-8 text-left">
          <SheetDescription className={EYEBROW}>Your credits</SheetDescription>
          <SheetTitle className="font-display text-2xl font-normal leading-[1.1] tracking-[-0.02em]">
            {zero ? "No credits left" : `${creditCount(available)} to use`}
          </SheetTitle>
        </SheetHeader>

        <CreditDots count={available} />
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {zero ? "Your orbit has room for more." : "One credit is one report: yours, someone else's, or two people together."}
        </p>

        {/* The soft pass spends with no balance, so production keeps both doors at zero (ADR-138). */}
        {(!zero || !live) && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={then(onAddSomeone)} className={cn(BUTTON, FILLED)}>
              Add someone
            </button>
            <button type="button" onClick={then(onGift)} className={cn(BUTTON, OUTLINED)}>
              Gift a report
            </button>
          </div>
        )}

        <div className="grid gap-2.5">
          {/* MB-6 provisional: Get credits is the free test checkout until real checkout exists (ADR-138). */}
          {live && <p className="text-[13px] text-[#AEB6C6]">Credits are free while we test.</p>}
          <ul className="grid gap-2">
            {BUNDLES.map((bundle) => (
              <li
                key={bundle.count}
                className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-[rgba(17,22,31,.7)] px-3.5 py-3"
              >
                <span className="font-display text-[26px] leading-none">{bundle.count}</span>
                <span className="min-w-0 text-[13px] leading-snug text-[#AEB6C6]">{bundle.name}</span>
                {live && isSignedIn !== false && (
                  adding === bundle.count ? (
                    <span className={cn(BUTTON, "border border-[rgba(92,107,192,.35)] bg-[rgba(92,107,192,.1)] text-[#9FA8DA]")}>
                      <StatusDots label="Adding" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={adding !== null}
                      onClick={() => {
                        setNotice(null);
                        checkout.mutate({ data: { count: bundle.count } });
                      }}
                      className={cn(BUTTON, OUTLINED)}
                    >
                      Get {creditCount(bundle.count)}
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
          {live && isSignedIn === false && (
            <button
              type="button"
              onClick={then(() => navigate(`/sign-in?return_to=${encodeURIComponent(location)}`))}
              className={cn(BUTTON, FILLED, "h-10 w-full text-[13.5px]")}
            >
              Sign in to get credits
            </button>
          )}
          <p role="status" aria-live="polite" className="text-[13px] text-muted-foreground empty:hidden">
            {notice}
          </p>
        </div>

        <History />
      </SheetContent>
    </Sheet>
  );
}

export default CreditsSheet;
