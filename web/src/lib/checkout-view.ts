/**
 * What /checkout and the page that waits for its credit print, and where every Get credits goes, pure so a test can
 * pin them (ADR-274; readings 2 and 6). A price is the server's for this request once it has answered (R-7.1), and the
 * catalogue's until then, so no number is typed here (R-6.3).
 */
import type { CheckoutState, PriceItem } from "@workspace/api-client-react";
import {
  BUNDLES,
  CHECKOUT_TICK,
  PLANS,
  PLAN_TICK,
  formatEuro,
  itemById,
  renewalLine,
  type Bundle,
  type CatalogueItemId,
  type Plan,
  type PlanId,
} from "@workspace/commerce";
import { resetDay } from "./ask-view";
import type { DateOrder } from "./date-entry";

/**
 * Reading 2's list, as the server holds it: POST /checkout refuses anything else, so the page sends an address off it
 * back to the dashboard rather than to a refusal.
 */
export const RETURN_TO = /^\/(chart|dashboard(\/account)?(\?open=(credits|gift|add|pair))?|report\/[0-9a-f-]{36})$/;
export const DEFAULT_RETURN = "/dashboard";

/** No item opens the three bundles, Single first; a plan opens both plans, the month first. */
export function checkoutHref(item: CatalogueItemId | null, returnTo: string): string {
  const query = new URLSearchParams();
  if (item) query.set("item", item);
  query.set("returnTo", returnTo);
  return `/checkout?${query.toString()}`;
}

/** Where Stripe and the page send a reader once they have paid, to wait for the webhook's grant. */
export function doneHref(purchaseId: string): string {
  return `/checkout/done?${new URLSearchParams({ purchase: purchaseId }).toString()}`;
}

export function payLabel(cents: number): string {
  return `Pay ${formatEuro(cents)}`;
}

const ITEM_IDS: readonly CatalogueItemId[] = [...BUNDLES.map((bundle) => bundle.id), ...PLANS.map((plan) => plan.id)];

export function isPlanId(id: CatalogueItemId): id is PlanId {
  return PLANS.some((plan) => plan.id === id);
}

export interface CheckoutQuery {
  item: CatalogueItemId | null;
  returnTo: string;
}

export function checkoutQuery(search: string): CheckoutQuery {
  const query = new URLSearchParams(search);
  const asked = query.get("item");
  const returnTo = query.get("returnTo");
  return {
    item: ITEM_IDS.find((id) => id === asked) ?? null,
    returnTo: returnTo && RETURN_TO.test(returnTo) ? returnTo : DEFAULT_RETURN,
  };
}

export function donePurchase(search: string): string | null {
  const id = new URLSearchParams(search).get("purchase")?.trim();
  return id ? id : null;
}

export interface CheckoutChoices {
  ids: CatalogueItemId[];
  first: CatalogueItemId;
}

export function checkoutChoices(item: CatalogueItemId | null): CheckoutChoices {
  if (item === null) return { ids: BUNDLES.map((bundle) => bundle.id), first: BUNDLES[0].id };
  if (isPlanId(item)) return { ids: PLANS.map((plan) => plan.id), first: item };
  return { ids: [item], first: item };
}

/** The Account page's names for the two plans, so the reader meets one name for each. */
const PLAN_NAMES: Record<PlanId, string> = {
  timeline_month: "Timeline, monthly",
  timeline_year: "Timeline, yearly",
};

function creditCount(count: number): string {
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

/** The artifact's line: the credits, then what they make, with Single's two kinds as alternatives (ADR-170). */
function bundleLine(bundle: Bundle): string {
  return `${creditCount(bundle.credits)} · ${bundle.mixes.join(bundle.credits === 1 ? " or " : ", ")}`;
}

function planLine(plan: Plan): string {
  const paid = `Paid each ${plan.interval}`;
  return plan.creditsToGive > 0 ? `${paid} · ${creditCount(plan.creditsToGive)} to give someone a report` : paid;
}

export interface CheckoutItemView {
  id: CatalogueItemId;
  plan: boolean;
  name: string;
  line: string;
  cents: number;
  price: string;
  /** The full price, struck through beside a campaign's; null without one, and the Singles total never shows here. */
  full: string | null;
  campaign: { name: string; endsOn: string } | null;
  credits: number | null;
  tick: string;
  /** MB-225 provisional: the plan's line under Pay, as plain text beside its box. */
  renewal: string | null;
}

/** One item at the server's price for this request, or the catalogue's while that hasn't landed or was refused. */
export function checkoutItem(id: CatalogueItemId, priced?: PriceItem | null): CheckoutItemView {
  const row = itemById(id);
  const fromServer = priced && priced.id === id ? priced : null;
  const cents = fromServer?.cents ?? row.cents;
  const fullCents = fromServer?.fullCents ?? row.cents;
  const campaign = fromServer?.campaign && cents < fullCents ? fromServer.campaign : null;
  if ("interval" in row) {
    return {
      id,
      plan: true,
      name: PLAN_NAMES[row.id],
      line: planLine(row),
      cents,
      price: formatEuro(cents),
      full: null,
      campaign: null,
      credits: null,
      tick: PLAN_TICK,
      renewal: renewalLine(row),
    };
  }
  return {
    id,
    plan: false,
    name: row.name,
    line: bundleLine(row),
    cents,
    price: formatEuro(cents),
    full: campaign ? formatEuro(fullCents) : null,
    campaign: campaign ? { name: campaign.name, endsOn: campaign.endsOn } : null,
    credits: row.credits,
    tick: CHECKOUT_TICK,
    renewal: null,
  };
}

/** Reading 6: the campaign's name and its last day, said once. */
export function campaignLine(campaign: { name: string; endsOn: string }, order: DateOrder): string {
  return `${campaign.name} · until ${resetDay(campaign.endsOn, order)}`;
}

const STEPS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/chart$/, "your birth details"],
  [/^\/dashboard\?open=credits$/, "your credits"],
  [/^\/dashboard\?open=gift$/, "your gift"],
  [/^\/dashboard\?open=add$/, "Add someone"],
  [/^\/dashboard\?open=pair$/, "your pair"],
  [/^\/dashboard\/account$/, "your account"],
  [/^\/report\//, "your report"],
];

/** The step that asked, named as the reader saw it. */
export function stepName(returnTo: string): string {
  return STEPS.find(([path]) => path.test(returnTo))?.[1] ?? "your dashboard";
}

export function backLine(returnTo: string): string {
  return `VAT included · then back to ${stepName(returnTo)}`;
}

export function backLabel(returnTo: string): string {
  return `Back to ${stepName(returnTo)}`;
}

export const CHECKOUT_LINES = {
  eyebrow: "Checkout",
  title: "Checkout",
  chooseBundle: "Pick a bundle",
  choosePlan: "Pick a plan",
  tickFirst: "Tick the box above to see the ways to pay.",
  waysToPay: "Ways to pay",
  orCard: "or pay by card",
  paying: "Paying",
  foot: "Card details go to Stripe, never to us.",
  refunds: "Refunds",
  terms: "Terms",
  newTab: "(opens in a new tab)",
  loading: "Loading the payment form",
  optionsFailed: "We couldn't load checkout.",
  notReady: "Checkout isn't open right now. Try again later.",
  stripeFailed: "The payment form didn't load. Check your connection, then try again.",
  tryAgain: "Try again",
  tooMany: "That's a lot of tries. Wait a minute, then try again.",
  noPersonalReport: "Timeline reads your own Personal report. Write yours first.",
  alreadySubscribed: "You already have Timeline. You can manage it on your Account page.",
  failed: "We couldn't start the payment. Try again in a minute.",
  payFailed: "The payment didn't go through. Try again, or use another card.",
} as const;

/** The page's words for a refusal that came without the API's own line, a dropped call's among them. */
export function startRefusal(status: number | undefined, code: string | undefined): string {
  if (status === 503 || code === "checkout_unavailable") return CHECKOUT_LINES.notReady;
  if (status === 429) return CHECKOUT_LINES.tooMany;
  if (code === "no_personal_report") return CHECKOUT_LINES.noPersonalReport;
  if (code === "already_subscribed") return CHECKOUT_LINES.alreadySubscribed;
  return CHECKOUT_LINES.failed;
}

/** A plan's two refusals and a refused body stand as they are; a limit, a pause or a dropped call may pass. */
export function startRetries(status: number | undefined, code: string | undefined): boolean {
  return status !== 400 && status !== 409 && code !== "no_personal_report" && code !== "already_subscribed";
}

/** R16-24: the done page stops waiting after this long, says so and gives the way back. */
export const WAIT_MS = 60_000;
export const POLL_MS = 2_000;

export type DonePhase = "waiting" | "slow" | "granted" | "unpaid" | "refunded" | "missing";

export function donePhase(
  state: Pick<CheckoutState, "status"> | null | undefined,
  { missing, elapsedMs }: { missing: boolean; elapsedMs: number },
): DonePhase {
  if (missing) return "missing";
  switch (state?.status) {
    case "granted":
      return "granted";
    case "failed":
    case "expired":
      return "unpaid";
    case "refunded":
      return "refunded";
    default:
      return elapsedMs >= WAIT_MS ? "slow" : "waiting";
  }
}

export interface DoneView {
  title: string;
  body: string | null;
  /** The status the page shows with its three dots while it waits; null once it stops. */
  status: string | null;
  /** Back to the step that asked, unless the page is about to take the reader there. */
  back: string | null;
  /** Checkout again for the same item and step, when the payment never went through. */
  retry: string | null;
}

export function doneView(
  phase: DonePhase,
  state: Pick<CheckoutState, "item" | "returnTo" | "credits"> | null | undefined,
): DoneView {
  const returnTo = state && RETURN_TO.test(state.returnTo) ? state.returnTo : DEFAULT_RETURN;
  const plan = state ? isPlanId(state.item) : false;
  const what = plan ? "Timeline" : state?.credits ? `your ${creditCount(state.credits)}` : "your credits";
  const step = stepName(returnTo);
  switch (phase) {
    case "waiting":
      return {
        title: "Confirming your payment",
        // Until the first answer the page knows neither the item nor the step, so it names neither.
        body: !state
          ? "This takes a few seconds."
          : plan
            ? `This takes a few seconds. Then Timeline starts and we take you back to ${step}.`
            : `This takes a few seconds. Then we add ${what} and take you back to ${step}.`,
        status: "Confirming",
        back: null,
        retry: null,
      };
    case "granted":
      return {
        title: plan ? "Timeline started" : state?.credits ? `${creditCount(state.credits)} added` : "Credits added",
        body: `Taking you back to ${step}.`,
        status: null,
        back: null,
        retry: null,
      };
    case "slow":
      return {
        title: "Your payment is still being confirmed",
        body: plan
          ? "It can take a few minutes. Timeline starts on its own once it's confirmed."
          : `It can take a few minutes. ${what.charAt(0).toUpperCase()}${what.slice(1)} show up on their own once it's confirmed.`,
        status: null,
        back: backLabel(returnTo),
        retry: null,
      };
    case "unpaid":
      return {
        title: "The payment didn't go through",
        body: "You haven't been charged.",
        status: null,
        back: backLabel(returnTo),
        retry: state ? checkoutHref(state.item, returnTo) : null,
      };
    case "refunded":
      return {
        title: "This payment was refunded",
        body: plan ? "Your Account page shows your plan." : "Its credits aren't in your balance.",
        status: null,
        back: backLabel(returnTo),
        retry: null,
      };
    case "missing":
      return {
        title: "We couldn't find this payment",
        body: "Your dashboard shows your credits.",
        status: null,
        back: backLabel(DEFAULT_RETURN),
        retry: null,
      };
  }
}
