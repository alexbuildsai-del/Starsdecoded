import { PATH_SEEN_KEY } from "@/lib/credits-view";
import { FORM_DRAFT_KEY } from "@/lib/form-draft";
import { NUDGE_SEEN_KEY } from "@/lib/nudges";
import { SELECTION_KEY } from "@/lib/pair-selection";
import { PREVIEW_KEY } from "@/lib/prelaunch";

/**
 * The privacy page's two lists (ADR-145): who handles a visitor's data for Stars Decoded, and what the browser keeps.
 * They live here rather than in the page so a test can hold them to the code: a storage key the web starts writing
 * fails the test until the page names it (MB-43's rule), and a service the site stops using can be dropped in one place.
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

// MB-33 provisional: only Railway's region is confirmed (ADR-164), so each other company shows its country (reading 10),
// and who runs timeapi.io, and where, is not confirmed at all.
export const PROCESSORS: readonly Processor[] = [
  {
    name: "Supabase",
    does: "holds our database: birth details and charts, reports, accounts, the people you send a report or gift to, and the waitlist.",
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
    does: "sends our emails, such as the link that confirms your place on the waitlist, or a report or gift you send someone. It gets the address each email goes to.",
    from: "server",
    region: null,
    country: "the United States",
  },
  {
    name: "Nominatim",
    does: "is OpenStreetMap's place search, run by the OpenStreetMap Foundation. It gets the words you type in the place field.",
    from: "browser",
    region: null,
    country: "the United Kingdom",
  },
  {
    name: "timeapi.io",
    does: "finds the time zone of the place you pick. It gets that place's latitude and longitude.",
    from: "browser",
    region: null,
    country: null,
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

export interface BrowserKey {
  /** As the page prints it; a trailing <…> stands for the part that changes. */
  name: string;
  /** "tab": sessionStorage, gone when the tab closes. "kept": localStorage, until the reader clears it. */
  store: "tab" | "kept";
  holds: string;
}

// The explorer's hint and the ledger's marks keep their keys inside their components, so those two are written out here.
export const BROWSER_KEYS: readonly BrowserKey[] = [
  {
    name: FORM_DRAFT_KEY,
    store: "tab",
    holds: "The birth details you typed to see your sky, carried through sign-in to the birth form so you don't type them twice. It's deleted as soon as the form reads it.",
  },
  {
    name: SELECTION_KEY,
    store: "tab",
    holds: "The two reports and the choices you made for a Compatibility report, so they're still there if you leave the page and come back.",
  },
  {
    name: PREVIEW_KEY,
    store: "tab",
    holds: "Only when we test the site: that this tab shows the site as visitors see it before we launch.",
  },
  {
    name: NUDGE_SEEN_KEY,
    store: "kept",
    holds: "Which suggestions on your dashboard you've already seen, by report ID.",
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
];

/** The key as the code writes it: a name's trailing <…> is the part each report fills in. */
export function storageKeyOf(key: BrowserKey): string {
  return key.name.replace(/<[^>]*>$/, "");
}
