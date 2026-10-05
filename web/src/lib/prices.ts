/**
 * The prices the server sets for this tab (R-7.1, ADR-278). A surface paints the catalogue's and takes these once
 * they land, a live campaign's among them; any refusal, prelaunch's included, leaves it on the catalogue's. A link
 * with an offer's code (`?c=`) is kept for the tab, so the price rows and checkout ask for that offer.
 */
import {
  getGetCheckoutOptionsQueryKey,
  useGetCheckoutOptions,
  type CheckoutOptions,
  type GetCheckoutOptionsParams,
  type PriceItem,
} from "@workspace/api-client-react";

/** The tab's sessionStorage, which the privacy page names (R17-08). */
export const CAMPAIGN_KEY = "sd.campaign";

/** The part of Storage the code touches, so a test can hand in its own. */
export type CampaignStore = Pick<Storage, "getItem" | "setItem">;

/** Null on the server, and where the browser refuses storage, which some private modes do on first touch. */
function tabStore(): CampaignStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function pageSearch(): string {
  return typeof window === "undefined" ? "" : window.location.search;
}

// A code is a slug the admin chose; anything else is not one, so it is neither kept nor sent.
const SLUG = /^[A-Za-z0-9_-]{1,64}$/;

function slugIn(search: string): string | null {
  const slug = new URLSearchParams(search).get("c")?.trim();
  return slug && SLUG.test(slug) ? slug : null;
}

/** Writes only when the address carries `?c=`, so a tab no offer's link brought keeps nothing. */
export function keepCampaign(search: string, store: CampaignStore | null = tabStore()): void {
  const slug = slugIn(search);
  if (!slug) return;
  try {
    store?.setItem(CAMPAIGN_KEY, slug);
  } catch {
    // A store the browser refuses keeps the offer to this page view, through the address.
  }
}

/** The address's code first, so the first render asks for it before any effect has kept it. */
export function campaignSlug(search: string = pageSearch(), store: CampaignStore | null = tabStore()): string | null {
  const asked = slugIn(search);
  if (asked) return asked;
  try {
    const kept = store?.getItem(CAMPAIGN_KEY)?.trim();
    return kept && SLUG.test(kept) ? kept : null;
  } catch {
    return null;
  }
}

export function checkoutOptionsParams(slug: string | null = campaignSlug()): GetCheckoutOptionsParams | undefined {
  return slug ? { c: slug } : undefined;
}

/** One request per tab and offer, shared by the price rows and /checkout. */
export function useCheckoutOptions() {
  const params = checkoutOptionsParams();
  return useGetCheckoutOptions(params, {
    query: {
      queryKey: getGetCheckoutOptionsQueryKey(params),
      // A refusal is an answer: the surface keeps the catalogue's prices rather than asking again.
      retry: false,
      staleTime: 60_000,
    },
  });
}

/** A body that isn't the contract's (a proxy's page, say) counts as a refusal. */
export function pricedItems(options: CheckoutOptions | undefined): PriceItem[] | null {
  return options && Array.isArray(options.items) ? options.items : null;
}

export function usePrices(): { items: PriceItem[] | null } {
  const options = useCheckoutOptions();
  return { items: pricedItems(options.data) };
}
