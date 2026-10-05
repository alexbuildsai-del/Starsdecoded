/**
 * /checkout/done (stripe-payments, Checkout; ADR-274, 275): where Pay, or the bank a payment went through, sends the
 * reader. Only the webhook grants (R-6.2), so the page asks GET /checkout/{id} until the purchase is granted, reads the
 * credits and the home answer again, and opens the step that asked with focus on its heading (R14-12). After 60 s it
 * stops asking, says the payment is still being confirmed and gives the way back (R16-24).
 */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getCheckout,
  getGetCreditHistoryQueryKey,
  getGetCreditsQueryKey,
  getGetHomeQueryKey,
  getGetTimelineAccessQueryKey,
  type CheckoutState,
} from "@workspace/api-client-react";
import { StatusDots } from "@/components/StatusDots";
import { Wordmark } from "@/components/Wordmark";
import {
  CHECKOUT_LINES,
  DEFAULT_RETURN,
  POLL_MS,
  RETURN_TO,
  WAIT_MS,
  donePhase,
  donePurchase,
  doneView,
  isPlanId,
} from "@/lib/checkout-view";
import { usePageTitle } from "@/lib/page-title";

const EYEBROW = "font-label text-[11px] font-medium uppercase leading-none tracking-[.14em] text-[#9AA3B5]";
const MUTED = "text-[13.5px] leading-snug text-[#AEB6C6]";
const BUTTON =
  "inline-flex min-h-10 items-center justify-center rounded-[10px] px-4 text-[13.5px] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** A slow read of the new balance doesn't hold the reader here: the step that asked reads it again as it opens. */
const REFRESH_MS = 3_000;
/** How long the step that asked may take to draw its heading, its sheet's when it reopens one. */
const HEADING_MS = 5_000;

/**
 * The step that asked opens with focus on its heading: a sheet's title when the address reopens one, else the page's
 * own. The page that waited is gone by then, so its heading is passed over.
 */
function landOnHeading(returnTo: string): void {
  const sheet = returnTo.includes("?open=");
  const until = Date.now() + HEADING_MS;
  const look = () => {
    const late = Date.now() >= until;
    const heading =
      (sheet ? document.querySelector<HTMLElement>('[role="dialog"] h2') : null) ??
      (!sheet || late ? document.querySelector<HTMLElement>("h1:not([data-checkout-done])") : null);
    if (!heading) {
      if (!late) window.setTimeout(look, 100);
      return;
    }
    // Two frames on, a sheet has already moved focus inside itself, so this lands after it rather than before.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!heading.isConnected) return;
        if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
        heading.focus();
      }),
    );
  };
  window.setTimeout(look, 0);
}

export default function CheckoutDonePage() {
  usePageTitle("Checkout");
  const search = useSearch();
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const purchaseId = donePurchase(search);
  const heading = useRef<HTMLHeadingElement>(null);

  const [state, setState] = useState<CheckoutState | null>(null);
  const [missing, setMissing] = useState(purchaseId === null);
  const [late, setLate] = useState(false);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    setState(null);
    setMissing(purchaseId === null);
    setLate(false);
    if (!purchaseId) return;
    let gone = false;
    let expired = false;
    let next: ReturnType<typeof setTimeout> | undefined;
    const stop = setTimeout(() => {
      expired = true;
      clearTimeout(next);
      setLate(true);
    }, WAIT_MS);
    // A read still on its way when the wait ends is taken all the same: a grant that lands then still carries on.
    const ask = async () => {
      try {
        const now = await getCheckout(purchaseId);
        if (gone) return;
        setState(now);
        if (now.status !== "open") {
          clearTimeout(stop);
          return;
        }
      } catch (error) {
        if (gone) return;
        if ((error as { status?: unknown } | null)?.status === 404) {
          clearTimeout(stop);
          setMissing(true);
          return;
        }
      }
      if (!expired) next = setTimeout(() => void ask(), POLL_MS);
    };
    void ask();
    return () => {
      gone = true;
      clearTimeout(stop);
      clearTimeout(next);
    };
  }, [purchaseId]);

  const phase = donePhase(state, { missing, elapsedMs: late ? WAIT_MS : 0 });
  const view = doneView(phase, state);
  const target = state && RETURN_TO.test(state.returnTo) ? state.returnTo : DEFAULT_RETURN;

  useEffect(() => {
    if (phase !== "granted" || !state) return;
    let gone = false;
    const keys = [
      getGetCreditsQueryKey(),
      getGetHomeQueryKey(),
      getGetCreditHistoryQueryKey(),
      ...(isPlanId(state.item) ? [getGetTimelineAccessQueryKey()] : []),
    ];
    const refreshed = Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey, refetchType: "all" })));
    const waited = new Promise((done) => setTimeout(done, REFRESH_MS));
    void Promise.race([refreshed, waited]).then(() => {
      if (gone) return;
      // In place of this page, so Back from the step that asked doesn't land here and leave again.
      navigate(target, { replace: true });
      landOnHeading(target);
    });
    return () => {
      gone = true;
    };
  }, [phase, state, target, client, navigate]);

  const backTo = phase === "missing" ? DEFAULT_RETURN : target;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <main className="mx-auto grid w-full max-w-[440px] gap-4 px-4 pb-12 pt-5 sm:pt-10">
        <header className="flex items-center justify-between gap-3">
          <Wordmark className="text-[17px]" />
          <p className={EYEBROW}>{CHECKOUT_LINES.eyebrow}</p>
        </header>
        <section aria-live="polite" className="grid gap-3 rounded-[10px] border border-[#242C3B] bg-[#11161F] p-5">
          <h1
            ref={heading}
            tabIndex={-1}
            data-checkout-done=""
            className="font-display text-[22px] font-normal leading-snug text-[#E8EBF2] focus:outline-none"
          >
            {view.title}
          </h1>
          {view.body && <p className={MUTED}>{view.body}</p>}
          {view.status && (
            <p className="text-[13px] text-[#9AA3B5]">
              <StatusDots label={view.status} />
            </p>
          )}
          {(view.retry || view.back) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {view.retry && (
                <Link href={view.retry} className={`${BUTTON} bg-primary text-white hover:brightness-110`}>
                  {CHECKOUT_LINES.tryAgain}
                </Link>
              )}
              {view.back && (
                <Link
                  href={backTo}
                  className={`${BUTTON} border border-[#242C3B] bg-[#171D29] text-[#E8EBF2] hover:border-[#5C6BC0]`}
                >
                  {view.back}
                </Link>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
