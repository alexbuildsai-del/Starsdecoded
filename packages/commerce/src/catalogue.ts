// MB-119 provisional: the locked spec keeps the price catalogue in api/src/, but the landing,
// the prerender and the credits sheet read it too and the web cannot import api/ (MB-108).
// Dated offers and Stripe's amounts stay out until R13.

export type BundleId = "solo" | "couple" | "family";

export interface Bundle {
  id: BundleId;
  name: string;
  line: string;
  credits: 1 | 3 | 5;
  /** Euro cents, VAT included. The only place a price is typed (R-6.3). */
  cents: number;
  /** What the same credits cost as Singles. Derived from Single's price, so the two cannot drift apart. */
  fullCents: number;
  /**
   * Shown as a launch price against `fullCents`, never against a "was" price, and never on Single (ADR-146, 169).
   * No end date is stored until the Owner sets one.
   */
  launch: boolean;
  /** One chip each. Single's two are alternatives; the other bundles' add up to `credits` (ADR-170). */
  mixes: readonly string[];
}

const SINGLE_CENTS = 2400;

function withSinglesTotal(row: Omit<Bundle, "fullCents">): Bundle {
  return { ...row, fullCents: SINGLE_CENTS * row.credits };
}

export const BUNDLES: readonly Bundle[] = [
  withSinglesTotal({
    id: "solo",
    name: "Single",
    line: "1 credit · a Personal report or a Compatibility report",
    credits: 1,
    cents: SINGLE_CENTS,
    launch: false,
    mixes: ["1 Personal report", "1 Compatibility report"],
  }),
  withSinglesTotal({
    id: "couple",
    name: "Couple",
    line: "3 credits · a report each and how you get along",
    credits: 3,
    cents: 5400,
    launch: true,
    mixes: ["2 Personal reports", "1 Compatibility report"],
  }),
  withSinglesTotal({
    id: "family",
    name: "Family & friends",
    line: "5 credits · for the people close to you",
    credits: 5,
    cents: 7200,
    launch: true,
    mixes: ["3 Personal reports", "2 Compatibility reports"],
  }),
];

/** Said wherever a price or a balance shows, so nobody has to ask what a credit buys (ADR-170, R-6.4). */
export const CREDIT_LINE = "1 credit = 1 report of either kind.";

export function bundleById(id: BundleId): Bundle {
  const bundle = BUNDLES.find((row) => row.id === id);
  if (!bundle) throw new Error(`No bundle has the id ${String(id)}`);
  return bundle;
}

/**
 * Built by hand rather than with Intl so the server's HTML and the browser's agree to the
 * character. It throws on anything but whole, non-negative cents: a build that fails beats
 * a wrong price on a page.
 */
export function formatEuro(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError(`A price is whole, non-negative cents, not ${cents}`);
  }
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? `€${euros}` : `€${euros}.${String(rest).padStart(2, "0")}`;
}
