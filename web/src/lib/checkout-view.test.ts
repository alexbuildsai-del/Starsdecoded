import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PriceItem } from "@workspace/api-client-react";
import { CHECKOUT_TICK, PLAN_TICK, type CatalogueItemId } from "@workspace/commerce";
import {
  CHECKOUT_LINES,
  DEFAULT_RETURN,
  RETURN_TO,
  SESSION_DAY_MS,
  WAIT_MS,
  backLabel,
  backLine,
  campaignLine,
  checkoutChoices,
  checkoutHref,
  checkoutItem,
  checkoutQuery,
  donePhase,
  donePurchase,
  doneHref,
  doneView,
  payLabel,
  replacedCheckout,
  startRefusal,
  startRetries,
  stepName,
} from "./checkout-view";
import { CAMPAIGN_KEY, campaignSlug, checkoutOptionsParams, keepCampaign, pricedItems, type CampaignStore } from "./prices";

const searchOf = (href: string) => new URL(href, "https://mystarsdecoded.com").search;

function priced(id: CatalogueItemId, cents: number, fullCents: number, campaign: PriceItem["campaign"] = null): PriceItem {
  return { id, kind: "bundle", name: "", line: null, credits: null, interval: null, cents, fullCents, campaign };
}

function memoryStore(initial: Record<string, string> = {}): CampaignStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe("checkoutHref", () => {
  it("names the item, then the step to go back to, encoded so the step's own query survives", () => {
    expect(checkoutHref("couple", "/dashboard?open=pair")).toBe("/checkout?item=couple&returnTo=%2Fdashboard%3Fopen%3Dpair");
    expect(checkoutHref("timeline_month", "/dashboard")).toBe("/checkout?item=timeline_month&returnTo=%2Fdashboard");
  });

  it("leaves the item out when the step asked for none", () => {
    expect(checkoutHref(null, "/chart")).toBe("/checkout?returnTo=%2Fchart");
  });

  it("reads back as the item and the step it was made from", () => {
    for (const [item, returnTo] of [
      ["couple", "/dashboard?open=pair"],
      ["family", "/dashboard?open=credits"],
      ["solo", "/report/0b8f2d4e-1c3a-4e5f-9a7b-2c4d6e8f0a1b"],
      ["timeline_year", "/dashboard/account"],
      [null, "/chart"],
    ] as const) {
      expect(checkoutQuery(searchOf(checkoutHref(item, returnTo)))).toEqual({ item, returnTo });
    }
  });

  it("sends a step off reading 2's list, or none, back to the dashboard, and drops an item the catalogue lacks", () => {
    for (const returnTo of ["//evil.example", "https://evil.example/chart", "/dashboard?open=everything", "/chart?x=1", ""]) {
      expect(checkoutQuery(searchOf(checkoutHref("couple", returnTo))).returnTo).toBe(DEFAULT_RETURN);
    }
    expect(checkoutQuery("?item=lifetime&returnTo=%2Fchart")).toEqual({ item: null, returnTo: "/chart" });
    expect(checkoutQuery("")).toEqual({ item: null, returnTo: DEFAULT_RETURN });
  });

  it("keeps the server's list of steps, word for word", () => {
    const server = readFileSync(new URL("../../../api/src/lib/purchases.ts", import.meta.url), "utf8");
    const source = /export const RETURN_TO = \/(.+)\/;/.exec(server)?.[1];
    expect(source).toBe(RETURN_TO.source);
  });
});

describe("what /checkout offers", () => {
  it("opens the three bundles with Single first when no item is asked for", () => {
    expect(checkoutChoices(null)).toEqual({ ids: ["solo", "couple", "family"], first: "solo" });
  });

  it("opens both plans, the month first, on the plan asked for", () => {
    expect(checkoutChoices("timeline_month")).toEqual({ ids: ["timeline_month", "timeline_year"], first: "timeline_month" });
    expect(checkoutChoices("timeline_year")).toEqual({ ids: ["timeline_month", "timeline_year"], first: "timeline_year" });
  });

  it("opens a bundle asked for on its own", () => {
    expect(checkoutChoices("family")).toEqual({ ids: ["family"], first: "family" });
  });
});

describe("the item's lines", () => {
  it("prints a bundle with its credits, what they make and the credits' tick", () => {
    expect(checkoutItem("couple")).toEqual({
      id: "couple",
      plan: false,
      name: "Couple",
      line: "3 credits · 2 Personal reports, 1 Compatibility report",
      cents: 5400,
      price: "€54",
      full: null,
      campaign: null,
      credits: 3,
      tick: CHECKOUT_TICK,
      renewal: null,
    });
    expect(checkoutItem("solo").line).toBe("1 credit · 1 Personal report or 1 Compatibility report");
    expect(checkoutItem("family").line).toBe("5 credits · 3 Personal reports, 2 Compatibility reports");
  });

  it("prints a plan with its period, the year's credit to give, the plan's tick and its renewal line", () => {
    const month = checkoutItem("timeline_month");
    expect([month.name, month.line, month.price, month.tick, month.renewal]).toEqual([
      "Timeline, monthly",
      "Paid each month",
      "€9.99",
      PLAN_TICK,
      "It renews each month. You can stop it any time on your Account page.",
    ]);
    const year = checkoutItem("timeline_year");
    expect([year.name, year.line, year.price, year.renewal]).toEqual([
      "Timeline, yearly",
      "Paid each year · 1 credit to give someone a report",
      "€69.99",
      "It renews each year. You can stop it any time on your Account page.",
    ]);
  });

  it("takes the server's price, and a live campaign's with the full price struck and its last day once (reading 6)", () => {
    const campaign = { name: "Autumn", endsOn: "2026-10-31" };
    const view = checkoutItem("couple", priced("couple", 4500, 5400, campaign));
    expect([view.price, view.full, view.cents, view.campaign]).toEqual(["€45", "€54", 4500, campaign]);
    expect(campaignLine(campaign, "dmy")).toBe("Autumn · until 31 October");
    expect(campaignLine(campaign, "mdy")).toBe("Autumn · until October 31");
  });

  it("shows no campaign that saves nothing, and ignores a price for another item", () => {
    expect(checkoutItem("couple", priced("couple", 5400, 5400, { name: "Same", endsOn: "2026-10-31" })).campaign).toBeNull();
    expect(checkoutItem("couple", priced("family", 100, 7200)).price).toBe("€54");
  });

  it("puts the amount in Pay", () => {
    expect(payLabel(5400)).toBe("Pay €54");
    expect(payLabel(999)).toBe("Pay €9.99");
  });

  it("names the step that asked as the reader saw it", () => {
    expect(
      ["/chart", "/dashboard", "/dashboard?open=credits", "/dashboard?open=gift", "/dashboard?open=add", "/dashboard?open=pair",
        "/dashboard/account", "/report/0b8f2d4e-1c3a-4e5f-9a7b-2c4d6e8f0a1b"].map(stepName),
    ).toEqual([
      "your birth details", "your dashboard", "your credits", "your gift", "Add someone", "your pair", "your account", "your report",
    ]);
    expect(backLine("/dashboard?open=pair")).toBe("VAT included · then back to your pair");
    expect(backLabel("/chart")).toBe("Back to your birth details");
  });

  it("says each refusal in its own words, and offers Try again only where trying again can help", () => {
    expect(startRefusal(503, "checkout_unavailable")).toBe(CHECKOUT_LINES.notReady);
    expect(startRefusal(429, "rate_limited")).toBe(CHECKOUT_LINES.tooMany);
    expect(startRefusal(409, "no_personal_report")).toBe(CHECKOUT_LINES.noPersonalReport);
    expect(startRefusal(409, "already_subscribed")).toBe(CHECKOUT_LINES.alreadySubscribed);
    expect(startRefusal(undefined, undefined)).toBe(CHECKOUT_LINES.failed);
    expect([503, 429, 500, undefined].map((status) => startRetries(status, undefined))).toEqual([true, true, true, true]);
    expect(startRetries(409, "already_subscribed")).toBe(false);
    expect(startRetries(400, "bad_return")).toBe(false);
  });
});

describe("the lines around Stripe's fields (B-34, B-56)", () => {
  it("names what the Payment Element lists under the wallets: other ways to pay, never the card alone", () => {
    expect(CHECKOUT_LINES.orAnotherWay).toBe("or pay another way");
    expect(Object.values(CHECKOUT_LINES)).not.toContain("or pay by card");
  });

  it("tells a tab a newer checkout replaced, in checkout's own words, and gives the way on", () => {
    expect([CHECKOUT_LINES.replaced, CHECKOUT_LINES.startAgain]).toEqual([
      "A newer checkout replaced this one.",
      "Start checkout again",
    ]);
    // R16-29: the line speaks of checkout, never of credits or a report.
    expect(CHECKOUT_LINES.replaced).toMatch(/\bcheckout\b/);
    expect(`${CHECKOUT_LINES.replaced} ${CHECKOUT_LINES.startAgain}`).not.toMatch(/credit|report|[—;!]/);
    expect(checkoutHref("timeline_month", "/dashboard/account")).toBe("/checkout?item=timeline_month&returnTo=%2Fdashboard%2Faccount");
  });

  it("reads a failed payment as replaced only for a plan whose purchase the server reads expired within the session's day", () => {
    const young = 5 * 60_000;
    expect(replacedCheckout("timeline_month", { status: "expired" }, young)).toBe(true);
    expect(replacedCheckout("timeline_year", { status: "expired" }, SESSION_DAY_MS - 1)).toBe(true);
    expect(replacedCheckout("timeline_month", { status: "expired" }, SESSION_DAY_MS), "Stripe's own day ran out").toBe(false);
    expect(replacedCheckout("couple", { status: "expired" }, young), "a bundle is never replaced").toBe(false);
    for (const status of ["open", "failed", "granted", "refunded"] as const) {
      expect(replacedCheckout("timeline_month", { status }, young), status).toBe(false);
    }
    expect(replacedCheckout("timeline_month", null, young), "a purchase the page couldn't read").toBe(false);
  });
});

describe("the page that waits for the credit", () => {
  const bought = { item: "couple" as const, returnTo: "/dashboard?open=pair", credits: 3 };

  it("comes back with the purchase in the address Stripe returns to", () => {
    expect(doneHref("6f1c")).toBe("/checkout/done?purchase=6f1c");
    expect(donePurchase("?purchase=6f1c&redirect_status=succeeded")).toBe("6f1c");
    expect(donePurchase("?purchase=")).toBeNull();
    expect(donePurchase("")).toBeNull();
  });

  it("waits up to 60 s, then stops and says so (R16-24)", () => {
    expect(WAIT_MS).toBe(60_000);
    expect(donePhase({ status: "open" }, { missing: false, elapsedMs: 0 })).toBe("waiting");
    expect(donePhase(null, { missing: false, elapsedMs: WAIT_MS - 1 })).toBe("waiting");
    expect(donePhase({ status: "open" }, { missing: false, elapsedMs: WAIT_MS })).toBe("slow");
    expect(donePhase({ status: "granted" }, { missing: false, elapsedMs: WAIT_MS })).toBe("granted");
    expect(donePhase({ status: "failed" }, { missing: false, elapsedMs: 0 })).toBe("unpaid");
    expect(donePhase({ status: "expired" }, { missing: false, elapsedMs: 0 })).toBe("unpaid");
    expect(donePhase({ status: "refunded" }, { missing: false, elapsedMs: 0 })).toBe("refunded");
    expect(donePhase(null, { missing: true, elapsedMs: 0 })).toBe("missing");
  });

  it("says what happens next while it waits, and goes back by itself once the credits are in", () => {
    expect(doneView("waiting", bought)).toEqual({
      title: "Confirming your payment",
      body: "This takes a few seconds. Then we add your 3 credits and take you back to your pair.",
      status: "Confirming",
      back: null,
      retry: null,
    });
    expect(doneView("waiting", null).body).toBe("This takes a few seconds.");
    expect(doneView("granted", bought)).toMatchObject({ title: "3 credits added", body: "Taking you back to your pair.", back: null });
    expect(doneView("waiting", { item: "timeline_year", returnTo: "/dashboard", credits: null }).body).toBe(
      "This takes a few seconds. Then Timeline starts and we take you back to your dashboard.",
    );
    expect(doneView("granted", { item: "timeline_month", returnTo: "/dashboard", credits: null }).title).toBe("Timeline started");
  });

  it("after the wait, says the payment is still being confirmed and gives the way back", () => {
    expect(doneView("slow", bought)).toEqual({
      title: "Your payment is still being confirmed",
      body: "It can take a few minutes. Your 3 credits show up on their own once it's confirmed.",
      status: null,
      back: "Back to your pair",
      retry: null,
    });
  });

  it("offers checkout again for a payment that never went through", () => {
    expect(doneView("unpaid", bought)).toEqual({
      title: "The payment didn't go through",
      body: "You haven't been charged.",
      status: null,
      back: "Back to your pair",
      retry: checkoutHref("couple", "/dashboard?open=pair"),
    });
    expect(doneView("missing", null)).toMatchObject({ title: "We couldn't find this payment", back: "Back to your dashboard" });
  });
});

describe("the offer's code a link brings", () => {
  it("is kept for the tab only when the address carries ?c=", () => {
    const store = memoryStore();
    keepCampaign("?utm_source=mail", store);
    keepCampaign("", store);
    keepCampaign("?c=", store);
    keepCampaign("?c=no%20spaces", store);
    expect(store.data).toEqual({});
    keepCampaign("?c=waitlist", store);
    expect(store.data).toEqual({ [CAMPAIGN_KEY]: "waitlist" });
    expect(CAMPAIGN_KEY).toBe("sd.campaign");
  });

  it("is asked for from the address first, then from the tab, and only as a slug", () => {
    expect(campaignSlug("?c=spring", memoryStore({ [CAMPAIGN_KEY]: "waitlist" }))).toBe("spring");
    expect(campaignSlug("", memoryStore({ [CAMPAIGN_KEY]: "waitlist" }))).toBe("waitlist");
    expect(campaignSlug("", memoryStore({ [CAMPAIGN_KEY]: "<script>" }))).toBeNull();
    expect(campaignSlug("", null)).toBeNull();
    expect(checkoutOptionsParams("waitlist")).toEqual({ c: "waitlist" });
    expect(checkoutOptionsParams(null)).toBeUndefined();
  });

  it("leaves a surface on the catalogue's prices for a body that isn't the contract's", () => {
    expect(pricedItems(undefined)).toBeNull();
    expect(pricedItems("<!doctype html>" as unknown as Parameters<typeof pricedItems>[0])).toBeNull();
    expect(pricedItems({ publishableKey: null, ready: false, items: [] })).toEqual([]);
  });
});
