import { BUNDLES, type Bundle } from "@workspace/commerce";
import { LAUNCHED } from "@workspace/launch";
import type { AppEnv } from "@/lib/appEnv";
import { PERSONAL_REPORT } from "@/lib/product";
import { indexable, pageUrl } from "./crawl";
import { FAQ_GROUPS, TIMELINE_FAQ, type FaqItem } from "./data/faq";
import { SITE, isPublicPath, pageFor, type PageEntry, type PagePath, type PageSchema } from "./site";

type Block = Record<string, unknown>;

const HOME = pageUrl("/");
const ORGANIZATION_ID = `${HOME}#organization`;
const WEBSITE_ID = `${HOME}#website`;
/**
 * Cover A, the home page's hero as a still, drawn at 1200 by 630 by scripts/render-brand.mjs (ADR-227). A new cover
 * takes a new file name, so no preview a crawler cached can stand in for it (ADR-228).
 */
const SHARE_IMAGE = `${SITE.origin}/share-cover-v2.jpg`;
const NOINDEX = `<meta name="robots" content="noindex" />`;

const HTML_ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => HTML_ENTITIES[c]);
const meta = (attribute: "name" | "property", key: string, content: string) =>
  `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;

/**
 * The commit this build is of, which production's API waits to read off the home page before it tells IndexNow about the
 * pages (R11-27). A build that knows no commit, a local one or CI, writes no tag rather than an empty one.
 */
function commitTags(): string[] {
  const commit: unknown = import.meta.env.VITE_COMMIT;
  return typeof commit === "string" && commit.trim() ? [meta("name", "commit", commit.trim())] : [];
}

/** Inside a script element `<` and `>` go as escapes, so no answer or lede can close the element or open a comment. */
function jsonLd(block: Block): string {
  const json = JSON.stringify({ "@context": "https://schema.org", ...block }).replace(/[<>]/g, (c) =>
    c === "<" ? "\\u003c" : "\\u003e",
  );
  return `<script type="application/ld+json">${json}</script>`;
}

const ORGANIZATION: Block = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE.name,
  url: HOME,
  logo: `${SITE.origin}/logo.svg`,
};

const WEBSITE: Block = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  name: SITE.name,
  url: HOME,
  publisher: { "@id": ORGANIZATION_ID },
};

/** Named in full where it is the author, since a reader of one block may not follow the id to another. */
const BY_US: Block = { "@type": "Organization", "@id": ORGANIZATION_ID, name: SITE.name, url: HOME };

/** The trail the page shows: the wordmark home, then on a Learn page its "Learn" crumb, then the page itself. */
function breadcrumbs(page: PageEntry): Block {
  const parent = page.kind === "learn" ? page.parent : undefined;
  const trail = [
    { name: SITE.name, path: "/" as const },
    ...(parent ? [{ name: "Learn", path: parent }] : []),
    { name: parent ? page.eyebrow : page.h1, path: page.path },
  ];
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: pageUrl(crumb.path),
    })),
  };
}

/** A plain decimal with the currency apart, as schema.org reads a price; only the catalogue types one (R-6.3). */
const decimalEuros = (cents: number) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;

function offer(bundle: Bundle): Block {
  return {
    "@type": "Offer",
    name: bundle.name,
    description: bundle.line,
    price: decimalEuros(bundle.cents),
    priceCurrency: "EUR",
    url: HOME,
    // Nothing can be bought before launch, so no offer claims to be in stock until then (reading 13).
    ...(LAUNCHED ? { availability: "https://schema.org/InStock" } : {}),
  };
}

/** The home page's prices: one Product, the Personal report, with an Offer per bundle (ADR-142, reading 13). */
function product(home: PageEntry): Block {
  return {
    "@type": "Product",
    name: PERSONAL_REPORT,
    description: home.lede,
    brand: { "@type": "Brand", name: SITE.name },
    offers: BUNDLES.map(offer),
  };
}

/**
 * Each FAQ page's questions as that page shows them, /faq's by topic and /timeline's own six. Google's rules for FAQ
 * markup allow no question or answer the page does not show, so neither page marks up the other's.
 */
const ASKED: Partial<Record<PagePath, readonly FaqItem[]>> = {
  "/timeline": TIMELINE_FAQ,
  "/faq": FAQ_GROUPS.flatMap((group) => group.items),
};

function questions(page: PageEntry): Block[] {
  return (ASKED[page.path] ?? []).map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  }));
}

/** The date is the one the page shows, moved only when its words change (ADR-116). */
function pageBlock(type: PageSchema, page: PageEntry): Block {
  const url = pageUrl(page.path);
  const about = { url, description: page.lede, dateModified: page.updated, isPartOf: { "@id": WEBSITE_ID } };
  if (type === "Article") {
    return { "@type": "Article", headline: page.h1, ...about, mainEntityOfPage: url, author: BY_US, publisher: BY_US };
  }
  if (type === "FAQPage") return { "@type": "FAQPage", name: page.h1, ...about, mainEntity: questions(page) };
  return { "@type": "WebPage", name: page.h1, ...about };
}

function socialTags(card: { type: "website" | "article"; title: string; description: string; url?: string }): string[] {
  return [
    meta("property", "og:type", card.type),
    meta("property", "og:site_name", SITE.name),
    meta("property", "og:title", card.title),
    meta("property", "og:description", card.description),
    ...(card.url ? [meta("property", "og:url", card.url)] : []),
    meta("property", "og:image", SHARE_IMAGE),
    meta("property", "og:image:width", "1200"),
    meta("property", "og:image:height", "630"),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", card.title),
    meta("name", "twitter:description", card.description),
    meta("name", "twitter:image", SHARE_IMAGE),
  ];
}

/**
 * An app route, an unknown path or a gated page: never indexed (ADR-114), but a shared link, such as a gift's, still
 * previews with the site's card. No canonical and no structured data, since there is no public page to describe.
 */
function shellHead(): string {
  const home = pageFor("/");
  return [
    `<title>${escapeHtml(SITE.name)}</title>`,
    meta("name", "description", home.lede),
    ...commitTags(),
    NOINDEX,
    ...socialTags({ type: "website", title: SITE.name, description: home.lede }),
  ].join("\n");
}

/**
 * The tags that change from page to page, for the prerender to write into the page's head: the registry's title and
 * lede, the address, the share card and the structured data (ADR-115), and the build's commit. Off production a page
 * asks not to be indexed and names no canonical, so a preview can never pass for the page or hand its noindex to
 * production's.
 */
export function headFor(path: string, env: AppEnv): string {
  const page = isPublicPath(path) ? pageFor(path) : undefined;
  if (!page) return shellHead();
  const open = indexable(env);
  const url = pageUrl(page.path);
  const blocks = [
    ORGANIZATION,
    WEBSITE,
    page.kind === "home" ? product(page) : breadcrumbs(page),
    ...page.schema.map((type) => pageBlock(type, page)),
  ];
  return [
    `<title>${escapeHtml(page.title)}</title>`,
    meta("name", "description", page.lede),
    ...commitTags(),
    open ? `<link rel="canonical" href="${escapeHtml(url)}" />` : NOINDEX,
    ...socialTags({
      type: page.schema.includes("Article") ? "article" : "website",
      title: page.title,
      description: page.lede,
      url: open ? url : undefined,
    }),
    ...blocks.map(jsonLd),
  ].join("\n");
}
