import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "@/lib/appEnv";
import { indexable, llmsTxt, pageUrl, robotsTxt, sitemapXml } from "./crawl";
import { PAGES, SITE, isPublicPath, pageFor, type PagePath } from "./site";

type Build = "staging" | "production";

// Held by hand, in the registry's order, so a page joining or leaving the map is a decision a test sees. One list for
// both builds, since the sample reached production too (ADR-166).
const MAPPED: PagePath[] = [
  "/",
  "/sky",
  "/sample",
  "/method",
  "/compatibility",
  "/timeline",
  "/learn/whole-sign-houses",
  "/learn/birth-time",
  "/faq",
  "/privacy",
  "/terms",
  "/refunds",
  "/company",
];
const LEGAL: PagePath[] = ["/privacy", "/terms", "/refunds", "/company"];

const CRAWLERS = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Applebot",
  "Applebot-Extended",
];
const NOT_PAGES = ["/api/healthz", "/api/waitlist", "/admin", "/admin/lab"];

/** RFC 9309 as the big crawlers read it: the group naming the agent, else `*`; the longest matching rule wins. */
function allows(robots: string, agent: string, path: string): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let open: (typeof groups)[number] | undefined;
  let ruled = false;
  for (const raw of robots.split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (!open || ruled) {
        open = { agents: [], rules: [] };
        groups.push(open);
        ruled = false;
      }
      open.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && open) {
      ruled = true;
      if (value) open.rules.push({ allow: key === "allow", path: value });
    }
  }
  const group =
    groups.find((g) => g.agents.includes(agent.toLowerCase())) ?? groups.find((g) => g.agents.includes("*"));
  const matched = (group?.rules ?? [])
    .filter((rule) => path.startsWith(rule.path))
    .sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  return matched.length === 0 || matched[0].allow;
}

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
const links = (txt: string) => [...txt.matchAll(/^- \[[^\]]*\]\(([^)]*)\)/gm)].map((m) => m[1]);

async function built(env: Build) {
  vi.stubEnv("VITE_APP_ENV", env);
  vi.resetModules();
  const [crawl, site] = await Promise.all([import("./crawl"), import("./site")]);
  return { ...crawl, pageFor: site.pageFor };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("pageUrl and indexable", () => {
  it("gives every page production's address, the home page with its slash", () => {
    expect(pageUrl("/")).toBe("https://mystarsdecoded.com/");
    expect(pageUrl("/learn/birth-time")).toBe("https://mystarsdecoded.com/learn/birth-time");
    for (const page of PAGES) expect(pageUrl(page.path).startsWith(SITE.origin)).toBe(true);
  });

  it("asks to be indexed on production only", () => {
    const envs: AppEnv[] = ["production", "staging", "development"];
    expect(envs.map(indexable)).toEqual([true, false, false]);
  });
});

describe("robots.txt", () => {
  it("is pinned for production: every crawler, the API and the admin kept out, the map named", () => {
    expect(robotsTxt("production")).toBe(
      [
        "User-agent: *",
        "Disallow: /api/",
        "Disallow: /admin",
        "",
        "Sitemap: https://mystarsdecoded.com/sitemap.xml",
        "",
      ].join("\n"),
    );
  });

  it("is pinned for staging and previews: every crawler turned away, no map named", () => {
    for (const env of ["staging", "development"] as const) expect(robotsTxt(env)).toBe("User-agent: *\nDisallow: /\n");
  });

  it("lets every crawler, AI search's included, read every public page on production", () => {
    const robots = robotsTxt("production");
    for (const agent of CRAWLERS) {
      for (const page of PAGES) expect(allows(robots, agent, page.path), `${agent} ${page.path}`).toBe(true);
      for (const path of NOT_PAGES) expect(allows(robots, agent, path), `${agent} ${path}`).toBe(false);
    }
  });

  it("keeps every crawler off every path on staging", () => {
    const robots = robotsTxt("staging");
    for (const agent of CRAWLERS) {
      for (const page of PAGES) expect(allows(robots, agent, page.path)).toBe(false);
    }
  });
});

describe("sitemap.xml", () => {
  it.each(["production", "staging"] as const)("is pinned for a %s build", async (env) => {
    const crawl = await built(env);
    const entry = (path: PagePath) =>
      `  <url>\n    <loc>${pageUrl(path)}</loc>\n    <lastmod>${crawl.pageFor(path).updated}</lastmod>\n  </url>\n`;
    const open =
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    expect(crawl.sitemapXml(env)).toBe(`${open}${MAPPED.map(entry).join("")}</urlset>\n`);
  });

  it("dates each page by its Updated date", () => {
    const xml = sitemapXml("staging");
    for (const [, loc, lastmod] of xml.matchAll(/<loc>([^<]*)<\/loc>\s*<lastmod>([^<]*)<\/lastmod>/g)) {
      const page = pageFor(loc.slice(SITE.origin.length));
      expect(lastmod).toBe(page?.updated);
      expect(lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("maps the legal pages and the sample, never the waitlist, whatever the build", async () => {
    for (const env of ["production", "staging"] as const) {
      const crawl = await built(env);
      const mapped = locs(crawl.sitemapXml(env));
      for (const path of LEGAL) expect(mapped).toContain(pageUrl(path));
      expect(mapped).not.toContain(pageUrl("/waitlist"));
      expect(mapped).toContain(pageUrl("/sample"));
    }
  });

  it("lists only pages a visitor can open", () => {
    for (const loc of locs(sitemapXml("staging"))) expect(isPublicPath(loc.slice(SITE.origin.length))).toBe(true);
  });
});

describe("llms.txt", () => {
  it.each(["production", "staging"] as const)("is pinned for a %s build", async (env) => {
    const crawl = await built(env);
    const line = (path: PagePath) => {
      const page = crawl.pageFor(path);
      return `- [${page.h1}](${pageUrl(path)}): ${page.lede}`;
    };
    const home = crawl.pageFor("/");
    expect(crawl.llmsTxt()).toBe(
      [
        "# Stars Decoded",
        "",
        `> ${home.lede}`,
        "",
        "## Pages",
        "",
        ...MAPPED.filter((path) => !LEGAL.includes(path)).map(line),
        "",
        "## Legal",
        "",
        ...LEGAL.map(line),
        "",
      ].join("\n"),
    );
  });

  it("lists the same pages as the sitemap, whatever the build", async () => {
    for (const env of ["production", "staging"] as const) {
      const crawl = await built(env);
      expect(links(crawl.llmsTxt())).toEqual(locs(crawl.sitemapXml(env)));
    }
  });

  it("offers the sample in a production build (ADR-166)", async () => {
    const crawl = await built("production");
    expect(links(crawl.llmsTxt())).toContain(pageUrl("/sample"));
  });
});
