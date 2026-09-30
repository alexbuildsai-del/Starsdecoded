import type { AppEnv } from "@/lib/appEnv";
import { PAGES, SITE, isPublicPath, pageFor, type PageEntry, type PagePath } from "./site";

/** Production's address on every host, so a preview never offers itself as the page to index (ADR-115). */
export function pageUrl(path: PagePath): string {
  return path === "/" ? `${SITE.origin}/` : `${SITE.origin}${path}`;
}

/** Only production asks to be found; staging and every preview stay out of search (reading 15). */
export function indexable(env: AppEnv): boolean {
  return env === "production";
}

/** The waitlist lasts only until launch and a gated sample answers 404, so neither is offered to an index. */
function lastingPages(): PageEntry[] {
  return PAGES.filter((page) => page.sitemap && isPublicPath(page.path));
}

const XML_ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const escapeXml = (text: string) => text.replace(/[&<>"']/g, (c) => XML_ENTITIES[c]);

/**
 * Every crawler, AI search's included, reads the public pages; the API and the admin are not pages (ADR-115). Disallow
 * rules only, so a crawler that takes the first matching line and one that takes the longest agree.
 */
export function robotsTxt(env: AppEnv): string {
  const lines = indexable(env)
    ? ["User-agent: *", "Disallow: /api/", "Disallow: /admin", "", `Sitemap: ${SITE.origin}/sitemap.xml`]
    : ["User-agent: *", "Disallow: /"];
  return `${lines.join("\n")}\n`;
}

/**
 * `lastmod` is the page's Updated date, which moves only when its words do (ADR-116). The list is the same on every
 * host: staging's robots.txt turns every crawler away and names no sitemap, so its copy is only a preview of
 * production's, and it agrees with llms.txt.
 */
export function sitemapXml(_env: AppEnv): string {
  const url = (page: PageEntry) =>
    `  <url>\n    <loc>${escapeXml(pageUrl(page.path))}</loc>\n    <lastmod>${page.updated}</lastmod>\n  </url>\n`;
  return [
    `<?xml version="1.0" encoding="UTF-8"?>\n`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`,
    ...lastingPages().map(url),
    `</urlset>\n`,
  ].join("");
}

const linkText = (text: string) => text.replace(/[[\]]/g, "\\$&");
const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

/** The llmstxt.org shape: the name, the home page's answer-first lede as the summary, then each page with its own. */
export function llmsTxt(): string {
  const pages = lastingPages();
  const line = (page: PageEntry) => `- [${linkText(page.h1)}](${pageUrl(page.path)}): ${oneLine(page.lede)}`;
  return [
    `# ${SITE.name}`,
    "",
    `> ${oneLine(pageFor("/").lede)}`,
    "",
    "## Pages",
    "",
    ...pages.filter((page) => page.kind !== "legal").map(line),
    "",
    "## Legal",
    "",
    ...pages.filter((page) => page.kind === "legal").map(line),
    "",
  ].join("\n");
}
