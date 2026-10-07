/**
 * /checkout/done (stripe-payments, Checkout; ADR-274, 275): where Pay, or the bank a payment went through, sends the
 * reader. Only the webhook grants (R-6.2), so the page asks GET /checkout/{id} until the purchase is granted, reads the
 * credits and the home answer again, and opens the step that asked with focus on its heading (R14-12). A Timeline plan
 * opens Timeline instead, where its setup screen shows while the readings payment started are written (ADR-362, reading
 * 8). After 60 s it stops asking, says the payment is still being confirmed and gives the way back (R16-24); after 120 s
 * when the API failed to answer meanwhile, as it can while a deploy hands over (B-48).
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
  getGetTimelineSetupQueryOptions,
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
import { sentZone } from "@/lib/reader-zone";
import { TIMELINE_APP, setupParams } from "@/lib/timeline-setup";

const EYEBROW = "font-label text-[11px] font-medium uppercase leading-none tracking-[.14em] text-[#9AA3B5]";
const MUTED = "text-[13.5px] leading-snug text-[#AEB6C6]";
const BUTTON =
  "inline-flex min-h-10 items-center justify-center rounded-[10px] px-4 text-[13.5px] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** A slow read of the new balance doesn't hold the reader here: the step that asked reads it again as it opens. */
const REFRESH_MS = 3_000;
/** How long the step that asked may take to draw its page. */
const HEADING_MS = 5_000;
/** Time for the step to settle first: a sheet it reopens takes focus inside itself, the picker focuses its own section. */
const SETTLE_MS = 300;
/**
 * The wait in all once the API has failed to answer (B-48): a deploy left every /api call at 502 for about a minute
 * (QA-06 #2), and a grant made before it still has to reach the reader once the API is back.
 */
const GAP_WAIT_MS = 120_000;
/** A read that hangs is no answer too: it is dropped after this long, so the next one can go out. */
const ASK_MS = 10_000;

/** How a deploy's gap reaches the page: the host's 502, 503 or 504, or no answer at all. A 500 is the API answering. */
function apiAway(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status !== "number" || status === 502 || status === 503 || status === 504;
}

/**
 * The step that asked opens with focus on its heading (R14-12): the title of a sheet it reopened, or the page's own
 * heading when nothing on it took focus. A step that put focus somewhere of its own, as the picker does, keeps it. The
 * page that waited is passed over, in case it is still on its way out.
 */
function landOnHeading(): void {
  const until = Date.now() + HEADING_MS;
  const look = () => {
    const page = document.querySelector<HTMLElement>("h1:not([data-checkout-done])");
    if (!page) {
      if (Date.now() < until) window.setTimeout(look, 100);
      return;
    }
    window.setTimeout(
      () =>
        requestAnimationFrame(() => {
          const active = document.activeElement;
          const sheet = active instanceof HTMLElement ? active.closest<HTMLElement>('[role="dialog"]') : null;
          const heading = sheet ? sheet.querySelector<HTMLElement>("h2") : !active || active === document.body ? page : null;
          if (!heading?.isConnected) return;
          if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
          heading.focus();
        }),
      SETTLE_MS,
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
    let away = false;
    let next: ReturnType<typeof setTimeout> | undefined;
    const giveUp = () => {
      expired = true;
      clearTimeout(next);
      setLate(true);
    };
    let stop = setTimeout(() => {
      if (away) stop = setTimeout(giveUp, GAP_WAIT_MS - WAIT_MS);
      else giveUp();
    }, WAIT_MS);
    // A read still on its way when the wait ends is taken all the same: a grant that lands then still carries on.
    const ask = async () => {
      try {
        const now = await getCheckout(purchaseId, { signal: AbortSignal.timeout(ASK_MS) });
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
        // Any other failure is "not yet"; one that says the API is away also lengthens the wait.
        if (apiAway(error)) away = true;
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
  // A plan, once granted, opens Timeline, where its setup screen shows (reading 8); every way back is the step's.
  const granted = state && isPlanId(state.item) ? TIMELINE_APP : target;

  useEffect(() => {
    if (phase !== "granted" || !state) return;
    let gone = false;
    const plan = isPlanId(state.item);
    const keys = [
      getGetCreditsQueryKey(),
      getGetHomeQueryKey(),
      getGetCreditHistoryQueryKey(),
      ...(plan ? [getGetTimelineAccessQueryKey()] : []),
    ];
    const refreshed = Promise.all([
      ...keys.map((queryKey) => client.invalidateQueries({ queryKey, refetchType: "all" })),
      // The setup, read ahead, so the screen shows the moment Timeline opens rather than after a read of its own.
      ...(plan ? [client.prefetchQuery(getGetTimelineSetupQueryOptions(setupParams(sentZone())))] : []),
    ]);
    const waited = new Promise((done) => setTimeout(done, REFRESH_MS));
    void Promise.race([refreshed, waited]).then(() => {
      if (gone) return;
      // In place of this page, so Back from the step that asked doesn't land here and leave again.
      navigate(granted, { replace: true });
      landOnHeading();
    });
    return () => {
      gone = true;
    };
  }, [phase, state, granted, client, navigate]);

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
