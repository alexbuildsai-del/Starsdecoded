/**
 * The Account page (ADR-263; reading 28), at /dashboard/account from the account menu, for every signed-in reader:
 * what the account holds beside its reports, which today is Timeline. With access it says how the reader has it, the
 * day it renews or ends and how much of Ask's month is used, with the day the count starts again, then Manage payment
 * and Cancel Timeline, which both open Stripe's Portal (ADR-264, 277; reading 7). Without, the price and Start
 * Timeline, which opens /checkout. Credits stay on the dashboard, about reports. Kept out of search as every app
 * route is.
 */
import { useEffect, useId } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetTimelineAccessQueryKey, useOpenBillingPortal } from "@workspace/api-client-react";
import { AccountMenu } from "@/components/AccountMenu";
import { StatusDots } from "@/components/StatusDots";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { resetDay } from "@/lib/ask-view";
import type { DateOrder } from "@/lib/date-entry";
import { checkoutHref } from "@/lib/checkout-view";
import { usePageTitle } from "@/lib/page-title";
import { START_TIMELINE, planPriceLine } from "@/lib/teaser-view";
import {
  PAST_DUE_LINE, PORTAL_ERROR_LINE, planDayLine, planLine, useTimelineAccess, type TimelineAccessState,
} from "@/lib/timeline-access";

// The dashboard's section eyebrow and Timeline's own button, so the page reads as part of the app beside them.
const EYEBROW = "font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[0.18em] text-[#8E9BE0]";
const PLAN = "font-display text-[22px] font-normal leading-snug text-[#E8EBF2]";
const BUTTON =
  "inline-flex min-h-10 items-center justify-self-start rounded-[10px] border border-[#242C3B] bg-[#171D29] px-4 font-label text-sm font-medium text-[#E8EBF2] transition-colors hover:border-[#5C6BC0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const LINK =
  "justify-self-start rounded text-sm text-[#9FA8DA] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ACCOUNT = "/dashboard/account";
const NEEDS_REPORT = "Timeline reads your own Personal report. Write yours first.";

/** Manage payment and Cancel Timeline open the same Portal, where the reader does the rest; it returns here. */
function PortalButtons({ canCancel }: { canCancel: boolean }) {
  const portal = useOpenBillingPortal({
    mutation: {
      onSuccess: ({ url }) => window.location.assign(url),
    },
  });

  // Back from the Portal through the browser's cache, this page comes back as it was left, with the buttons waiting.
  const { reset } = portal;
  useEffect(() => {
    const back = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    window.addEventListener("pageshow", back);
    return () => window.removeEventListener("pageshow", back);
  }, [reset]);

  const open = () => portal.mutate({ data: { returnTo: ACCOUNT } });
  const busy = portal.isPending || portal.isSuccess;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={open} disabled={busy} className={`${BUTTON} disabled:opacity-60`}>
          Manage payment
        </button>
        {canCancel ? (
          <button type="button" onClick={open} disabled={busy} className={`${BUTTON} disabled:opacity-60`}>
            Cancel Timeline
          </button>
        ) : null}
      </div>
      {portal.isError ? (
        <p role="alert" className="text-sm leading-normal text-[#AEB6C6]">
          {PORTAL_ERROR_LINE}
        </p>
      ) : null}
    </>
  );
}

function TimelinePlan({ state, order, onRetry }: { state: TimelineAccessState; order: DateOrder; onRetry: () => void }) {
  if (state.loading) {
    return (
      <div className="min-h-10 font-label text-sm text-muted-foreground">
        <StatusDots label="Loading" />
      </div>
    );
  }
  if (state.error) {
    return (
      <>
        <p className="text-sm leading-normal text-[#AEB6C6]">We couldn't load this. Check your connection and try again.</p>
        <button type="button" onClick={onRetry} className={BUTTON}>
          Try again
        </button>
      </>
    );
  }
  if (!state.access) {
    return (
      <>
        <p className={PLAN}>Your account doesn't have Timeline.</p>
        <p className="text-sm leading-normal text-[#E8EBF2]">{planPriceLine()}</p>
        {state.hasPersonalReport ? (
          <Link href={checkoutHref("timeline_month", ACCOUNT)} className={BUTTON}>
            {START_TIMELINE}
          </Link>
        ) : (
          <p className="text-sm leading-normal text-[#AEB6C6]">{NEEDS_REPORT}</p>
        )}
        <Link href="/timeline" className={LINK}>
          What Timeline does <span aria-hidden="true">›</span>
        </Link>
      </>
    );
  }
  const { ask, plan } = state;
  const dayLine = plan ? planDayLine(plan, order) : null;
  return (
    <>
      <p className={PLAN}>{planLine(state.source, plan)}</p>
      {plan && state.source !== "admin" ? (
        <div className="grid gap-0.5">
          {dayLine ? <p className="text-sm leading-normal text-[#E8EBF2]">{dayLine}</p> : null}
          {plan.status === "past_due" ? <p className="text-sm leading-normal text-[#AEB6C6]">{PAST_DUE_LINE}</p> : null}
        </div>
      ) : null}
      {ask ? (
        <div className="grid gap-0.5">
          <p className="text-sm leading-normal text-[#E8EBF2]">
            {ask.used} of {ask.cap} Ask messages used this month
          </p>
          <p className="text-sm leading-normal text-[#9AA3B5]">The count starts again on {resetDay(ask.resetsOn, order)}.</p>
        </div>
      ) : null}
      <Link href="/dashboard/timeline" className={BUTTON}>
        Open Timeline
      </Link>
      {plan && state.source !== "admin" ? <PortalButtons canCancel={plan.endsOn === null} /> : null}
    </>
  );
}

export default function AccountPage() {
  usePageTitle("Account");
  const client = useQueryClient();
  const { user } = useUser();
  const { order } = useEntryFormat();
  const timeline = useTimelineAccess();
  const headingId = useId();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  // The answer is read once a visit, and Ask's count in it moves with each message, sent here or on another device, so
  // the page reads it again as it opens; a read already under way is left to finish rather than sent twice.
  useEffect(() => {
    void client.invalidateQueries({ queryKey: getGetTimelineAccessQueryKey() }, { cancelRefetch: false });
  }, [client]);

  const retry = () => void client.resetQueries({ queryKey: getGetTimelineAccessQueryKey() });

  return (
    <div className="min-h-screen bg-background bg-stars text-foreground">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded font-label text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Dashboard
          </Link>
          <AccountMenu />
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-[74px] sm:px-6 sm:pt-20">
        <header className="grid gap-1">
          <h1 className="font-display text-[30px] font-normal leading-[1.15] tracking-[-0.01em]">Account</h1>
          {email ? (
            <p className="text-[13px] leading-snug text-[#9AA3B5]">
              Signed in as <span className="[overflow-wrap:anywhere]">{email}</span>
            </p>
          ) : null}
        </header>

        <section
          aria-labelledby={headingId}
          className="mt-6 grid max-w-[560px] gap-3 rounded-[14px] border border-[#242C3B] bg-[#11161F] p-5 md:mt-8"
        >
          <h2 id={headingId} className={EYEBROW}>
            Timeline
          </h2>
          <TimelinePlan state={timeline} order={order} onRetry={retry} />
        </section>
      </main>
    </div>
  );
}
