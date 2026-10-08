/**
 * What the credit surfaces print, pure so a test can pin it: the one balance
 * as dots, the bundles as the catalogue names and prices them, History's
 * lines (ADR-95, 168 to 170), and where each step's Get credits goes and
 * comes back to (ADR-274, 275). The path after a bundle left with its sheet:
 * Your first steps guide the reader now (ADR-330).
 */
import type { CreditHistoryItem, PriceItem } from "@workspace/api-client-react";
import { BUNDLES, bundleById, formatEuro, type Bundle, type BundleId } from "@workspace/commerce";
import type { DateOrder } from "./date-entry";
import { COMPATIBILITY_REPORT } from "./product";

function whole(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function creditCount(n: number): string {
  const count = whole(n);
  return `${count} ${count === 1 ? "credit" : "credits"}`;
}

/** One lit dot per credit still to use, capped at ten so a large balance stays one row, the rest as "+N". */
export function creditDots(n: number): { lit: number; more: number } {
  const count = whole(n);
  const lit = Math.min(count, 10);
  return { lit, more: count - lit };
}

export interface BundleMix {
  text: string;
  kind: "personal" | "compatibility";
}

/** One bundle as every price list prints it (ADR-172). */
export interface BundleRow {
  id: BundleId;
  name: string;
  /**
   * The catalogue's line under the name, word for word: the home page's JSON-LD gives it as the Offer's description,
   * which may only describe what the page shows (MB-140).
   */
  line: string;
  credits: number;
  /**
   * "For example:" over mixes that are only one way to spend the credits; null on Single, whose mixes are alternatives.
   * The line already counts the credits, so nothing under it counts them again (B-08).
   */
  lead: string | null;
  /** Single's mixes are alternatives, read with "or" between them; the others add up to the credits (ADR-170). */
  either: boolean;
  mixes: BundleMix[];
  /** What the bundle costs today: a live campaign's price while one runs, else the catalogue's. */
  price: string;
  launch: boolean;
  /** The same credits bought as Singles, struck through beside a launch price; null where there is none (ADR-169). */
  singles: string | null;
  save: string | null;
  /** A live campaign: the full price struck through beside `price`, and its last day said once; null without one. */
  campaign: { full: string; until: string } | null;
}

const NB = "\u00a0";
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * "12 October", or "October 12" where the month comes first, as checkout prints the same day (ADR-222): read from the
 * calendar day itself, so no clock zone can move it, and null for a day that isn't real (R16-05).
 */
function lastDay(day: string, order: DateOrder): string | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!parts) return null;
  const [year, month, date] = parts.slice(1).map(Number);
  const at = new Date(Date.UTC(year, month - 1, date));
  if (at.getUTCFullYear() !== year || at.getUTCMonth() !== month - 1 || at.getUTCDate() !== date) return null;
  return order === "dmy" ? `${date}${NB}${MONTHS[month - 1]}` : `${MONTHS[month - 1]}${NB}${date}`;
}

// MB-149 provisional: reading 6's campaign beside the launch price. The server prices each request, so its line wins
// only when it holds a real day and a price under the full one; anything else keeps the catalogue's row.
function campaignOf(price: PriceItem | null, order: DateOrder): { cents: number; full: string; until: string } | null {
  if (!price?.campaign) return null;
  const { cents, fullCents } = price;
  if (!Number.isSafeInteger(cents) || !Number.isSafeInteger(fullCents) || cents < 0 || cents >= fullCents) return null;
  const day = lastDay(price.campaign.endsOn, order);
  return day ? { cents, full: formatEuro(fullCents), until: `until ${day}` } : null;
}

/**
 * `price` is the server's item for this bundle (`usePrices`), or null for the catalogue's own row; `order` is the
 * reader's date order, which only a campaign's last day uses.
 */
export function bundleRow(bundle: Bundle, price: PriceItem | null = null, order: DateOrder = "dmy"): BundleRow {
  const campaign = campaignOf(price?.id === bundle.id ? price : null, order);
  const saved = bundle.fullCents - bundle.cents;
  // A launch price that saves nothing would strike a total the price equals, so it shows no comparison at all; a live
  // campaign brings its own comparison, and the Singles one steps aside while it runs.
  const launch = !campaign && bundle.launch && saved > 0;
  const either = bundle.credits === 1;
  return {
    id: bundle.id,
    name: bundle.name,
    line: bundle.line,
    credits: bundle.credits,
    lead: either ? null : "For example:",
    either,
    mixes: bundle.mixes.map((text) => ({ text, kind: text.includes(COMPATIBILITY_REPORT) ? "compatibility" : "personal" })),
    price: formatEuro(campaign?.cents ?? bundle.cents),
    launch,
    singles: launch ? `${bundle.credits} ${bundleById("solo").name}s ${formatEuro(bundle.fullCents)}` : null,
    save: launch ? `you save ${formatEuro(saved)}` : null,
    campaign: campaign && { full: campaign.full, until: campaign.until },
  };
}

/** `prices` is `usePrices().items`: null while they load or after a refusal, which keeps every row the catalogue's. */
export function bundleRows(prices: readonly PriceItem[] | null = null, order: DateOrder = "dmy"): BundleRow[] {
  return BUNDLES.map((bundle) => bundleRow(bundle, prices?.find((item) => item.id === bundle.id) ?? null, order));
}

/** The dashboard's asking steps a checkout comes back to, each reopened once from `?open=` (reading 2). */
export const REOPENS = ["credits", "gift", "add", "pair"] as const;
export type Reopen = (typeof REOPENS)[number];

/** The step whose Get credits it is: one of the dashboard's, or the birth form the empty dashboard sends a reader to. */
export type AskingStep = Reopen | "chart";

export type ReturnPath = "/chart" | `/dashboard?open=${Reopen}`;

/** Where a step's checkout comes back to, each one an address reading 2's pattern lets a checkout return to. */
export function returnPath(step: AskingStep): ReturnPath {
  return step === "chart" ? "/chart" : `/dashboard?open=${step}`;
}

/** The step a checkout came back to reopen, from the dashboard's query string with or without its "?". */
export function openFrom(search: string): Reopen | null {
  const asked = new URLSearchParams(search).get("open");
  return REOPENS.find((step) => step === asked) ?? null;
}

/** The dashboard's address once its step has reopened, so a reload or Back never opens it a second time. */
export function withoutOpen(search: string): string {
  const rest = new URLSearchParams(search);
  rest.delete("open");
  const query = rest.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

/** Only an account buys (reading 1): a reader without one signs in on the way and lands on the same checkout. */
export function signInFirst(href: string, signedOut: boolean): string {
  return signedOut ? `/sign-in?return_to=${encodeURIComponent(href)}` : href;
}

export interface HistoryLine {
  amount: string;
  text: string;
  test: boolean;
}

const HISTORY_FALLBACK: Record<CreditHistoryItem["kind"], (count: number) => string> = {
  bought: (count) => `${creditCount(count)} added`,
  gift: () => "A gift",
  spent: () => "A report",
  granted: () => "From Stars Decoded",
  refunded: () => "Refunded",
};

const TAKES_AWAY: ReadonlySet<CreditHistoryItem["kind"]> = new Set(["spent", "refunded"]);

/** The ledger sends a positive count and lets the kind carry the sign (reading 9). */
export function historyLine(item: Pick<CreditHistoryItem, "kind" | "count" | "label" | "test">): HistoryLine {
  const count = whole(item.count);
  const text = item.label.trim() || HISTORY_FALLBACK[item.kind](count);
  return {
    amount: `${TAKES_AWAY.has(item.kind) ? "−" : "+"}${count}`,
    text,
    // Reading 9 marks the test bundle's line only: off production every
    // credit is a test one, so a mark on each spend would say nothing. The
    // ledger's own label may already say so, and the line says it once.
    test: item.kind === "bought" && item.test && !/\btest\b/i.test(text),
  };
}

// MB-43 provisional: the path sheet's key, which nothing writes since Your first steps replaced the sheet (ADR-330);
// it stays only while the privacy page imports its name.
export const PATH_SEEN_KEY = "sd.path.seen";
