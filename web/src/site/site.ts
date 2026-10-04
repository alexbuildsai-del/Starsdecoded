import { LEGAL_IDENTITY, waitlistReady } from "@workspace/commerce";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT, PRODUCT } from "@/lib/product";

export const SITE = { origin: "https://mystarsdecoded.com", name: PRODUCT } as const;

export type PagePath =
  | "/"
  | "/sky"
  | "/sample"
  | "/method"
  | "/compatibility"
  | "/learn/whole-sign-houses"
  | "/learn/birth-time"
  | "/faq"
  | "/waitlist"
  | "/privacy"
  | "/terms"
  | "/refunds"
  | "/company";

export type PageKind = "home" | "page" | "learn" | "faq" | "legal" | "waitlist";

export type PageSchema = "WebPage" | "Article" | "FAQPage";

export interface PageEntry {
  path: PagePath;
  /** The whole <title>, brand included, so the prerendered head and a visit from another page show the same words. */
  title: string;
  /** On a Learn page, the crumb after "Learn". */
  eyebrow: string;
  h1: string;
  /** Its first sentence answers the page's question alone (ADR-116); the page shows the whole of it under the H1. */
  lede: string;
  /** YYYY-MM-DD, moved only when the page's words change (ADR-116): the visible date, `dateModified` and `lastmod`. */
  updated: string;
  kind: PageKind;
  schema: PageSchema[];
  sitemap: boolean;
  parent?: PagePath;
}

// ADR-166 put her report on production too, text and chart only; the constant stays as the one switch that takes it down.
export const SAMPLE_LIVE = true;

const titled = (words: string) => `${words} · ${PRODUCT}`;

export const PAGES: readonly PageEntry[] = [
  {
    path: "/",
    title: titled("Find out what your birth chart says about you"),
    eyebrow: PERSONAL_REPORT,
    h1: "Find out what your birth chart says about you",
    // MB-160 provisional: "every claim", the same idea in the FAQ and /method's step 3.
    lede: `${PRODUCT} works out where the planets were when you were born. Then it writes you a report about how you think, work and love. Every claim in it shows which part of your chart it comes from.`,
    updated: "2026-10-03",
    kind: "home",
    schema: ["WebPage"],
    sitemap: true,
  },
  {
    path: "/sky",
    title: titled("Free birth chart"),
    eyebrow: "Free, no account needed",
    h1: "Free birth chart",
    lede: "A birth chart is a map of where the Sun, Moon and planets were at the minute you were born, seen from the place you were born. Enter your birth details to see yours. We work it out from real astronomy. It's free, and we don't save anything you type.",
    updated: "2026-10-03",
    kind: "page",
    schema: ["WebPage"],
    sitemap: true,
  },
  // The registry loads on every page and the run is far too heavy to import here, so her name and the run's day are
  // written here too, and site.test.ts fails the day they drift from data/sample.ts (ADR-166, MB-101).
  {
    path: "/sample",
    title: titled(`Audrey Hepburn's ${PERSONAL_REPORT}`),
    eyebrow: "Sample report",
    h1: `Audrey Hepburn's ${PERSONAL_REPORT}`,
    lede: `This is a real ${PERSONAL_REPORT} from ${PRODUCT}, copied word for word, so you can read one before you get your own.`,
    updated: "2026-09-21",
    kind: "page",
    schema: ["Article"],
    sitemap: SAMPLE_LIVE,
  },
  {
    path: "/method",
    title: titled("How we make your report"),
    eyebrow: "How it works",
    h1: "How we make your report",
    lede: `${PRODUCT} works out your birth chart from where the planets really were. It notes what stands out. It writes your report from those notes. Then it checks every claim against your chart before you see it.`,
    updated: "2026-10-03",
    kind: "page",
    schema: ["Article"],
    sitemap: true,
  },
  {
    path: "/compatibility",
    title: titled(COMPATIBILITY_REPORT),
    eyebrow: COMPATIBILITY_REPORT,
    h1: "How the two of you get along",
    lede: `A ${COMPATIBILITY_REPORT} from ${PRODUCT} uses both of your birth charts to show how the two of you get along. You each need a ${PERSONAL_REPORT} first. Then you pick who the other person is to you: your partner, your child, or a friend, relative or colleague.`,
    updated: "2026-10-01",
    kind: "page",
    schema: ["WebPage"],
    sitemap: true,
  },
  {
    path: "/learn/whole-sign-houses",
    title: titled("What are whole-sign houses?"),
    eyebrow: "Whole-sign houses",
    h1: "What are whole-sign houses?",
    lede: "Whole-sign houses split your birth chart into twelve houses, one for each zodiac sign. The first house is the sign that was rising in the east when you were born. It's the oldest way to divide a chart. Every house is the same size, wherever you were born.",
    updated: "2026-09-30",
    kind: "learn",
    schema: ["Article"],
    sitemap: true,
    parent: "/faq",
  },
  {
    path: "/learn/birth-time",
    title: titled("What if you don't know your birth time?"),
    eyebrow: "Birth time",
    h1: "What if you don't know your birth time?",
    lede: `You can still get a full ${PERSONAL_REPORT} without your birth time. Your rising sign and houses need the time, so the report leaves them out and says so. Everything else comes from where the planets were on the day you were born.`,
    updated: "2026-10-03",
    kind: "learn",
    schema: ["Article"],
    sitemap: true,
    parent: "/faq",
  },
  {
    path: "/faq",
    title: titled("Questions people ask"),
    eyebrow: "FAQ",
    h1: "Questions people ask",
    lede: `Short answers about ${PRODUCT}: the reports, your birth details, privacy and paying.`,
    updated: "2026-10-02",
    kind: "faq",
    schema: ["FAQPage"],
    sitemap: true,
  },
  // The waitlist's page lasts only until launch, so it stays out of the sitemap.
  {
    path: "/waitlist",
    title: titled("Join the waitlist"),
    eyebrow: "Launching soon",
    h1: "Get an email when we launch",
    lede: `${PRODUCT} hasn't launched yet. Join the waitlist and we'll email you when you can get your ${PERSONAL_REPORT}.`,
    updated: "2026-09-30",
    kind: "waitlist",
    schema: ["WebPage"],
    sitemap: false,
  },
  {
    path: "/privacy",
    title: titled("Privacy policy"),
    eyebrow: "Legal",
    h1: "Privacy policy",
    lede: `This policy says what ${PRODUCT} keeps about you, why, who handles it for us and how to have it deleted.`,
    updated: "2026-10-03",
    kind: "legal",
    schema: ["WebPage"],
    sitemap: true,
  },
  {
    path: "/terms",
    title: titled("Terms of service"),
    eyebrow: "Legal",
    h1: "Terms of service",
    lede: `These are the terms you agree to when you use ${PRODUCT} and buy credits for reports.`,
    updated: "2026-10-01",
    kind: "legal",
    schema: ["WebPage"],
    sitemap: true,
  },
  {
    path: "/refunds",
    title: titled("Refunds"),
    eyebrow: "Legal",
    h1: "Refunds",
    lede: `This page sets out when ${PRODUCT} refunds you and when a credit comes back to your balance.`,
    updated: "2026-09-30",
    kind: "legal",
    schema: ["WebPage"],
    sitemap: true,
  },
  {
    path: "/company",
    title: `Who runs ${PRODUCT}`,
    eyebrow: "Legal",
    h1: `Who runs ${PRODUCT}`,
    lede: `${LEGAL_IDENTITY.tradingName} is run by ${LEGAL_IDENTITY.name}, a private individual based in ${LEGAL_IDENTITY.country}.`,
    updated: "2026-09-30",
    kind: "legal",
    schema: ["WebPage"],
    sitemap: true,
  },
];

function normalize(path: string): string {
  const bare = path.split(/[?#]/, 1)[0] || "/";
  return bare.length > 1 && bare.endsWith("/") ? bare.slice(0, -1) : bare;
}

export function pageFor(path: PagePath): PageEntry;
export function pageFor(path: string): PageEntry | undefined;
export function pageFor(path: string): PageEntry | undefined {
  const at = normalize(path);
  return PAGES.find((page) => page.path === at);
}

export function isPublicPath(path: string): boolean {
  const page = pageFor(path);
  return page !== undefined && (page.path !== "/sample" || SAMPLE_LIVE);
}

export interface SiteLink {
  href: PagePath;
  label: string;
}

const sampleLink = (label: string): SiteLink[] => (SAMPLE_LIVE ? [{ href: "/sample", label }] : []);

export const NAV: readonly SiteLink[] = [
  { href: "/sky", label: "Free chart" },
  ...sampleLink("Sample report"),
  { href: "/compatibility", label: "Compatibility" },
  { href: "/method", label: "How it works" },
  { href: "/faq", label: "FAQ" },
];

export const FOOTER: readonly { heading: string; links: readonly SiteLink[] }[] = [
  {
    heading: "Reports",
    links: [
      { href: "/", label: PERSONAL_REPORT },
      { href: "/compatibility", label: COMPATIBILITY_REPORT },
      ...sampleLink("Sample report"),
      { href: "/sky", label: "Free birth chart" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { href: "/method", label: "How it works" },
      { href: "/learn/whole-sign-houses", label: "Whole-sign houses" },
      { href: "/learn/birth-time", label: "If you don't know your birth time" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/refunds", label: "Refunds" },
      { href: "/company", label: `Who runs ${PRODUCT}` },
    ],
  },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** By hand rather than with Intl, whose month names differ between Node and browsers, so hydration finds the same text. */
export function formatUpdated(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTHS[month - 1]} ${year}`;
}

/** The legal pages stay drafts until the seller's waitlist fields are in, and their date line says so (reading 10). */
export function updatedLabel(page: PageEntry): "Updated" | "Draft dated" {
  return page.kind === "legal" && !waitlistReady() ? "Draft dated" : "Updated";
}
