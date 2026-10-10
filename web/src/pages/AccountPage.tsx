/**
 * The Account page (ADR-263; reading 28), at /dashboard/account from the account menu, for every signed-in reader:
 * what the account holds beside its reports, which today is Timeline. With access it says how the reader has it, the
 * day it renews or ends and how much of Ask's month is used, with the day the count starts again, then Manage payment
 * and Cancel Timeline, which both open Stripe's Portal (ADR-264, 277; reading 7). Without, the price and Start
 * Timeline, which opens /checkout. The admin, whose Timeline is no plan, sees a subscriber's instead, marked as a
 * preview (Review 05/10 §1). Credits stay on the dashboard, about reports; the page says where a report is deleted (B-57).
 * Kept out of search as every app route is.
 */
import { useEffect, useId, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetTimelineAccessQueryKey, useOpenBillingPortal, type AskUsage } from "@workspace/api-client-react";
import { AccountMenu } from "@/components/AccountMenu";
import { Button } from "@/ds/atoms/Button";
import { Eyebrow } from "@/ds/atoms/Eyebrow";
import { Heading } from "@/ds/atoms/Heading";
import { StatusDots } from "@/ds/atoms/StatusDots";
import { Text } from "@/ds/atoms/Text";
import { TextButton } from "@/ds/atoms/TextButton";
import { Card } from "@/ds/molecules/Card";
import { TopBar } from "@/ds/organisms/TopBar";
import { AppPage } from "@/ds/templates/AppPage";
import { cn } from "@/lib/utils";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { resetDay } from "@/lib/ask-view";
import type { DateOrder } from "@/lib/date-entry";
import { checkoutHref } from "@/lib/checkout-view";
import { usePageTitle } from "@/lib/page-title";
import { PAYMENTS } from "@/lib/processors";
import { START_TIMELINE, planPriceLine } from "@/lib/teaser-view";
import {
  PAST_DUE_LINE, PORTAL_ERROR_LINE, planDayLine, planLine, useTimelineAccess, type TimelineAccessState,
} from "@/lib/timeline-access";

const CARD = "max-w-[560px] gap-3";
const LINK = "justify-self-start text-ui underline underline-offset-2";

/** One line of the card's facts; `quiet` is the dimmer second line. */
function Line({ quiet, className, ...rest }: { quiet?: boolean } & React.ComponentProps<typeof Text>) {
  return <Text style="ui" className={cn(quiet ? "text-muted" : "text-paper", className)} {...rest} />;
}

const ACCOUNT = "/dashboard/account";
const NEEDS_REPORT = "Timeline reads your own Personal report. Write yours first.";

/** The marker, plan and next payment are Review 05/10's (Part 1, Mock C); it drew no words for the steps or the off line. */
const ACCOUNT_PREVIEW = {
  marker: "Preview · billing isn't on yet",
  plan: "Timeline",
  nextPayment: "Next payment: set at launch",
  manage: `This would open ${PAYMENTS.name}'s own page, where you change your card.`,
  cancel: `This would open ${PAYMENTS.name}'s own page, where you stop Timeline.`,
  off: "Billing isn't on yet, so nothing changed.",
} as const;

/** Where a report is deleted (B-57; QA-06 #15), as the privacy page says it, with the menu that holds Delete report. */
const YOUR_DATA = {
  title: "Your data",
  where: "You can delete any report yourself, from your dashboard.",
  how: "In People or Compatibility, open the ⋯ menu beside the report and choose Delete report.",
  goes: "Its birth details go too, unless another report uses them.",
  more: "How we keep and delete your data",
} as const;

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
        <Button variant="secondary" onClick={open} disabled={busy} className="disabled:opacity-60">
          Manage payment
        </Button>
        {canCancel ? (
          <Button variant="secondary" onClick={open} disabled={busy} className="disabled:opacity-60">
            Cancel Timeline
          </Button>
        ) : null}
      </div>
      {portal.isError ? (
        <Text role="alert">{PORTAL_ERROR_LINE}</Text>
      ) : null}
    </>
  );
}

function Plan({ children }: { children: React.ReactNode }) {
  return (
    <Heading style="card-title" as="p">
      {children}
    </Heading>
  );
}

function TimelinePlan({ state, order, onRetry }: { state: TimelineAccessState; order: DateOrder; onRetry: () => void }) {
  if (state.loading) {
    return (
      <div className="min-h-10 font-label text-ui text-muted">
        <StatusDots label="Loading" />
      </div>
    );
  }
  if (state.error) {
    return (
      <>
        <Text>We couldn't load this. Check your connection and try again.</Text>
        <Button variant="secondary" onClick={onRetry} className="justify-self-start">
          Try again
        </Button>
      </>
    );
  }
  if (!state.access) {
    return (
      <>
        <Plan>Your account doesn't have Timeline.</Plan>
        <Line>{planPriceLine()}</Line>
        {state.hasPersonalReport ? (
          <Button asChild className="justify-self-start">
            <Link href={checkoutHref("timeline_month", ACCOUNT)}>{START_TIMELINE}</Link>
          </Button>
        ) : (
          <Text>{NEEDS_REPORT}</Text>
        )}
        <TextButton asChild className={LINK}>
          <Link href="/timeline">
            What Timeline does <span aria-hidden="true">›</span>
          </Link>
        </TextButton>
      </>
    );
  }
  const { ask, plan } = state;
  if (state.source === "admin" && !plan) return <SubscriberPreview ask={ask} order={order} />;
  const dayLine = plan ? planDayLine(plan, order) : null;
  return (
    <>
      <Plan>{planLine(state.source, plan)}</Plan>
      {plan && state.source !== "admin" ? (
        <div className="grid gap-0.5">
          {dayLine ? <Line>{dayLine}</Line> : null}
          {plan.status === "past_due" ? <Text>{PAST_DUE_LINE}</Text> : null}
        </div>
      ) : null}
      {ask ? (
        <div className="grid gap-0.5">
          <Line>
            {ask.used} of {ask.cap} Ask messages used this month
          </Line>
          <Line quiet>The count starts again on {resetDay(ask.resetsOn, order)}.</Line>
        </div>
      ) : null}
      <Button asChild className="justify-self-start">
        <Link href="/dashboard/timeline">Open Timeline</Link>
      </Button>
      {plan && state.source !== "admin" ? <PortalButtons canCancel={plan.endsOn === null} /> : null}
    </>
  );
}

type PreviewStep = "manage" | "cancel";

/**
 * The admin's Timeline is no plan, so their page shows a subscriber's instead, under its marker (Review 05/10 §1, Q3),
 * holding nothing of the admin's account: Ask's line is a subscriber's at the start of a month, with the cap and the
 * day the count starts again, which are everyone's. Manage payment and Cancel Timeline both open Stripe's Portal for a
 * subscriber, and the admin has no account there, so each says what it would open and ends on billing's off line;
 * neither calls anything, so nothing is charged or changed (ADR-264).
 */
function SubscriberPreview({ ask, order }: { ask: AskUsage | null; order: DateOrder }) {
  const [step, setStep] = useState<PreviewStep | null>(null);
  return (
    <>
      <Plan>{ACCOUNT_PREVIEW.plan}</Plan>
      <p className="font-numeric text-caption text-brass">{ACCOUNT_PREVIEW.marker}</p>
      <Line>{ACCOUNT_PREVIEW.nextPayment}</Line>
      {ask ? (
        <div className="grid gap-0.5">
          <Line>0 of {ask.cap} Ask messages used this month</Line>
          <Line quiet>The count starts again on {resetDay(ask.resetsOn, order)}.</Line>
        </div>
      ) : null}
      <div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/timeline">Open Timeline</Link>
          </Button>
          <Button variant="secondary" onClick={() => setStep("manage")}>
            Manage payment
          </Button>
          <Button variant="secondary" onClick={() => setStep("cancel")}>
            Cancel Timeline
          </Button>
        </div>
        {/* Kept in the page while empty, so a screen reader is told each step as it shows. */}
        <div role="status">
          {step ? (
            <div className="mt-3 grid gap-0.5">
              <Line>{ACCOUNT_PREVIEW[step]}</Line>
              <Line quiet>{ACCOUNT_PREVIEW.off}</Line>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

/** Where a report is deleted, which the privacy page and the FAQ also say (B-57). */
function YourData() {
  const headingId = useId();
  return (
    <Card aria-labelledby={headingId} className={CARD}>
      <h2 id={headingId} className="m-0">
        <Eyebrow kind="kicker">{YOUR_DATA.title}</Eyebrow>
      </h2>
      <div className="grid gap-1.5">
        <Line>
          {YOUR_DATA.where} {YOUR_DATA.how}
        </Line>
        <Line quiet>{YOUR_DATA.goes}</Line>
      </div>
      <TextButton asChild className={LINK}>
        <Link href="/privacy">
          {YOUR_DATA.more} <span aria-hidden="true">›</span>
        </Link>
      </TextButton>
    </Card>
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
    <AppPage
      header={
          <TopBar
            left={
              <TextButton asChild className="font-label text-ui text-paper-dim">
                <Link href="/dashboard">
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Dashboard
                </Link>
              </TextButton>
            }
            right={<AccountMenu />}
          />
      }
      title="Account"
      titleAside={
        email ? (
          <Text style="small" className="text-muted">
            Signed in as <span className="[overflow-wrap:anywhere]">{email}</span>
          </Text>
        ) : null
      }
    >
      <Card aria-labelledby={headingId} className={cn(CARD, "md:mt-2")}>
        <h2 id={headingId} className="m-0">
          <Eyebrow kind="kicker">Timeline</Eyebrow>
        </h2>
        <TimelinePlan state={timeline} order={order} onRetry={retry} />
      </Card>
      <YourData />
    </AppPage>
  );
}
