import { PATH_SEEN_KEY } from "@/lib/credits-view";
import { FORM_DRAFT_KEY } from "@/lib/form-draft";
import { SELECTION_KEY } from "@/lib/pair-selection";
import { PREVIEW_KEY } from "@/lib/prelaunch";
import { RETURN_TO_KEY } from "@/lib/return-to";
import { NOT_NOW_KEY } from "@/lib/teaser-view";

/**
 * The privacy page's lists (ADR-145): who handles a visitor's data for Stars Decoded, who takes their payments, and what
 * the browser keeps. They live here rather than in the page so a test can hold them to the code: a storage key the web
 * starts writing fails the test until the page names it (MB-43's rule), and a service the site stops using can be
 * dropped in one place.
 */

export interface Processor {
  name: string;
  /** Printed after the name, which is its subject: what it does for us and what it gets. */
  does: string;
  /** "server": our servers send it data. "browser": the visitor's browser asks it directly. */
  from: "server" | "browser";
  /** Where it stores the data, once confirmed. */
  region: string | null;
  /** Where the company is based, with its article, shown while the region is unconfirmed. */
  country: string | null;
}

// MB-33 provisional: only Railway's region (ADR-164) and Resend's (the Owner, 2026-10-02) are confirmed, so each other
// company shows its country (reading 10).
export const PROCESSORS: readonly Processor[] = [
  {
    name: "Supabase",
    does: "holds our database: birth details and charts, reports, accounts, what you buy, the people you share a report with or give a gift to, and the waitlist.",
    from: "server",
    region: null,
    country: "the United States",
  },
  {
    name: "Railway",
    does: "runs our servers. Everything you send us, birth details included, passes through them.",
    from: "server",
    region: "Railway's EU West region",
    country: "the United States",
  },
  {
    name: "Vercel",
    does: "serves our web pages and passes your requests on to our servers. Like any web host, it sees your IP address.",
    from: "server",
    region: null,
    country: "the United States",
  },
  {
    name: "OpenAI",
    does: "writes the text of each report. It gets the name you gave and the positions we worked out, never a birth date, time or place.",
    from: "server",
    region: null,
    country: "the United States",
  },
  {
    name: "Clerk",
    does: "runs sign-in and holds your account's email address and sign-in details.",
    from: "server",
    region: null,
    country: "the United States",
  },
  {
    name: "Resend",
    does: "sends our emails, such as the link that confirms your place on the waitlist, a receipt for what you buy, or a report you share or a gift you give someone. It gets the address each email goes to.",
    from: "server",
    region: "Resend's EU West region, in Ireland",
    country: "the United States",
  },
  // No time zone service follows it: our server reads each place's zone from a table of its own (ADR-246).
  {
    name: "Nominatim",
    does: "is OpenStreetMap's place search, run by the OpenStreetMap Foundation. It gets the words you type in the place field.",
    from: "server",
    region: null,
    country: "the United Kingdom",
  },
];

/** ADR-145's basis for data sent to a company in the US: each one's standard contractual clauses or the Data Privacy Framework. */
export const US_TRANSFER =
  "Data we send to a company in the United States is covered by the EU's standard contractual clauses or the EU-US Data Privacy Framework.";

/** The line under a processor: its confirmed region first, else where the company is based, else nothing (reading 10). */
export function whereLine(processor: Pick<Processor, "region" | "country">): string | null {
  if (processor.region) return `Stores data in ${processor.region}`;
  if (processor.country) return `Based in ${processor.country}`;
  return null;
}

/** Who takes a buyer's payment on /checkout (ADR-274). */
export interface PaymentProvider {
  name: string;
  /** The company an account in the EU has its contract with. */
  company: string;
  country: string;
  policy: string;
}

// Stripe takes payments for us and also uses a buyer's payment details for its own needs, like stopping fraud, so it is
// not only one of the companies that handle data for us and the page gives it a section of its own (QA-04 #2, R-3.5).
export const PAYMENTS: PaymentProvider = {
  name: "Stripe",
  company: "Stripe Payments Europe",
  country: "Ireland",
  policy: "https://stripe.com/privacy",
};

export interface CheckoutCookie {
  name: string;
  /** Printed after "for". */
  lasts: string;
}

// Stripe.js sets these on our own domain to spot fraud. The page ties them to the checkout page, which holds while
// Stripe.js loads there alone; what it keeps inside its fields' frames sits on Stripe's domains, under its own policy.
export const STRIPE_COOKIES: readonly CheckoutCookie[] = [
  { name: "__stripe_mid", lasts: "a year" },
  { name: "__stripe_sid", lasts: "30 minutes" },
];

export interface BrowserKey {
  /** As the page prints it; a trailing <…> stands for the part that changes. */
  name: string;
  /** "tab": sessionStorage, gone when the tab closes. "kept": localStorage, until the reader clears it. */
  store: "tab" | "kept";
  holds: string;
}

// The house deck's hint and the ledger's marks keep their keys inside their components, so those two are written out
// here, as is the offer link's `sd.campaign`, which lib/prices.ts writes (R17-14); the test holds each name to the code.
export const BROWSER_KEYS: readonly BrowserKey[] = [
  {
    name: FORM_DRAFT_KEY,
    store: "tab",
    holds: "The birth details you typed, and the name on the birth form, so you don't type them twice after you sign in or pay. They're deleted as soon as the birth form reads them.",
  },
  {
    name: RETURN_TO_KEY,
    store: "tab",
    holds: "The page to take you to after you sign in. It's deleted as soon as you leave the sign-in pages.",
  },
  {
    name: SELECTION_KEY,
    store: "tab",
    holds: "The two reports and the choices you made for a Compatibility report, so they're still there if you leave the page and come back.",
  },
  {
    name: "sd.campaign",
    store: "tab",
    holds: "Only when a link with an offer brought you: the offer's code, so this tab shows the offer's price, at checkout too.",
  },
  {
    name: PREVIEW_KEY,
    store: "tab",
    holds: "Only when we test the site: that this tab shows the site as visitors see it before we launch.",
  },
  {
    name: PATH_SEEN_KEY,
    store: "kept",
    holds: "Whether you've seen the steps we suggest after you buy a bundle of credits.",
  },
  {
    name: "sd.explorer.hint",
    store: "kept",
    holds: "That you've seen the tip on how to explore your chart.",
  },
  {
    name: "sd.marks.<report id>",
    store: "kept",
    holds: "Whether a report shows what changed after you updated your birth time.",
  },
  {
    name: NOT_NOW_KEY,
    store: "kept",
    holds: "The day you chose Not now on your life's big cycles, and whether they have come back. Your dashboard shows them once more, when your next one is under a year away.",
  },
];

/** The key as the code writes it: a name's trailing <…> is the part each report fills in. */
export function storageKeyOf(key: BrowserKey): string {
  return key.name.replace(/<[^>]*>$/, "");
}
