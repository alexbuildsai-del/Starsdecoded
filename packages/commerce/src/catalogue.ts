// MB-119 provisional: the locked spec keeps the price catalogue in api/src/, but the landing,
// the prerender and the credits sheet read it too and the web cannot import api/ (MB-108).
// Dated offers and Stripe's amounts stay out until R12.

export type BundleId = "solo" | "couple" | "family";

export interface Bundle {
  id: BundleId;
  name: string;
  line: string;
  credits: 1 | 3 | 5;
  /** Euro cents, VAT included. The only place a price is typed (R-6.3). */
  cents: number;
}

export const BUNDLES: readonly Bundle[] = [
  { id: "solo", name: "Single", line: "1 credit · one report", credits: 1, cents: 2400 },
  // MB-112 provisional: the Owner's name for this bundle is still open.
  {
    id: "couple",
    name: "Couple",
    line: "3 credits · a report each and how you get along",
    credits: 3,
    cents: 4800,
  },
  {
    id: "family",
    name: "Family & friends",
    line: "5 credits · for the people close to you",
    credits: 5,
    cents: 7200,
  },
];

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
