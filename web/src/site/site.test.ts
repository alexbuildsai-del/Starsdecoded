import { afterEach, describe, expect, it, vi } from "vitest";
import { waitlistReady } from "@workspace/commerce";
import { PERSONAL_REPORT } from "@/lib/product";
import { SAMPLE } from "./data/sample";
import { PUBLIC_ROUTES } from "./routes";
import {
  FOOTER,
  NAV,
  PAGES,
  SITE,
  formatUpdated,
  isPublicPath,
  pageFor,
  updatedLabel,
  type PagePath,
} from "./site";

const SITE_PAGES = [
  "/",
  "/sky",
  "/sample",
  "/method",
  "/compatibility",
  "/timeline",
  "/learn/whole-sign-houses",
  "/learn/birth-time",
  "/faq",
];
const LEGAL_PAGES = ["/privacy", "/terms", "/refunds", "/company"];
const APP_PATHS = ["/chart", "/dashboard", "/sign-in", "/sign-up", "/report/abc", "/compatibility/abc", "/claim", "/admin", "/no-such-page"];

const words = () => [
  ...PAGES.flatMap((p) => [p.title, p.eyebrow, p.h1, p.lede]),
  ...NAV.map((l) => l.label),
  ...FOOTER.flatMap((c) => [c.heading, ...c.links.map((l) => l.label)]),
];

describe("the registry", () => {
  it("names the nine site pages, the waitlist and the four legal pages, once each", () => {
    const paths = PAGES.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect([...paths].sort()).toEqual([...SITE_PAGES, "/waitlist", ...LEGAL_PAGES].sort());
  });

  it("gives every page its whole head", () => {
    for (const page of PAGES) {
      for (const text of [page.title, page.eyebrow, page.h1, page.lede]) expect(text.trim()).not.toBe("");
      expect(page.title).toContain(SITE.name);
      expect(page.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${page.updated}T00:00:00Z`).toISOString().slice(0, 10)).toBe(page.updated);
    }
  });

  it("opens every lede with a whole sentence", () => {
    for (const page of PAGES) expect(page.lede).toMatch(/^[A-Z][^.?!]*[a-z)][.?!](\s|$)/);
  });

  it("keeps the house punctuation: no dash between clauses, semicolon or exclamation mark", () => {
    for (const text of words()) expect(text).not.toMatch(/[—–;!]/);
  });

  it("asks a question in an H1 only on the FAQ and the Learn pages", () => {
    for (const page of PAGES.filter((p) => p.h1.endsWith("?"))) expect(["faq", "learn"]).toContain(page.kind);
  });

  it("titles /company as who runs Stars Decoded", () => {
    expect(pageFor("/company").h1).toBe("Who runs Stars Decoded");
    expect(pageFor("/company").title).toBe("Who runs Stars Decoded");
  });

  it("sorts the pages into their kinds", () => {
    const of = (kind: string) => PAGES.filter((p) => p.kind === kind).map((p) => p.path);
    expect(of("home")).toEqual(["/"]);
    expect(of("learn")).toEqual(["/learn/whole-sign-houses", "/learn/birth-time"]);
    expect(of("faq")).toEqual(["/faq"]);
    expect(of("waitlist")).toEqual(["/waitlist"]);
    expect(of("legal").sort()).toEqual([...LEGAL_PAGES].sort());
    for (const page of PAGES) expect(page.parent === undefined).toBe(page.kind !== "learn");
    for (const path of of("learn")) expect(pageFor(path)?.parent).toBe("/faq");
  });

  it("types each page's structured data by what it shows", () => {
    expect(pageFor("/faq").schema).toEqual(["FAQPage"]);
    expect(pageFor("/timeline").schema).toEqual(["WebPage", "FAQPage"]);
    for (const path of ["/sample", "/learn/whole-sign-houses", "/learn/birth-time"] as const) {
      expect(pageFor(path).schema).toContain("Article");
    }
  });

  it("maps every page but the waitlist, the sample included (ADR-166)", () => {
    for (const page of PAGES) expect(page.sitemap, page.path).toBe(page.path !== "/waitlist");
  });

  it("heads /timeline with the locked words, the report named as the product names it and no price (ADR-116, 170, 255)", () => {
    const timeline = pageFor("/timeline");
    expect(timeline.eyebrow).toBe("Coming soon · Timeline");
    expect(timeline.h1).toBe("Your chart, with the sky moving across it");
    expect(timeline.lede.startsWith(`Timeline is ${SITE.name}'s one subscription, for people with a ${PERSONAL_REPORT}. `)).toBe(true);
    expect(timeline.lede).not.toMatch(/€|\d/);
  });

  it("names the sample's person and dates the page as the stored run does", () => {
    expect(pageFor("/sample").h1.startsWith(SAMPLE.name)).toBe(true);
    expect(pageFor("/sample").updated).toBe(SAMPLE.generatedAt.slice(0, 10));
  });
});

describe("pageFor and isPublicPath", () => {
  it("finds a page with or without a trailing slash, query or hash", () => {
    expect(pageFor("/faq/")?.path).toBe("/faq");
    expect(pageFor("/waitlist?confirm=abc")?.path).toBe("/waitlist");
    expect(pageFor("/privacy#waitlist")?.path).toBe("/privacy");
    expect(pageFor("/?utm_source=chatgpt.com")?.path).toBe("/");
  });

  it("leaves the app's routes and unknown paths out", () => {
    for (const path of APP_PATHS) {
      expect(pageFor(path)).toBeUndefined();
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it("opens every registered page, the sample included (ADR-166)", () => {
    for (const page of PAGES) expect(isPublicPath(page.path), page.path).toBe(true);
  });
});

describe("the nav and the footer", () => {
  it("lists the locked nav", () => {
    expect(NAV.map((l) => l.label)).toEqual([
      "Free chart",
      "Sample report",
      "Compatibility",
      "How it works",
      "FAQ",
    ]);
  });

  it("groups the footer into Reports, Learn and Company, with who runs Stars Decoded", () => {
    expect(FOOTER.map((c) => c.heading)).toEqual(["Reports", "Learn", "Company"]);
    expect(FOOTER[2].links.map((l) => l.href)).toEqual(["/privacy", "/terms", "/refunds", "/company"]);
    expect(FOOTER[2].links[3].label).toBe("Who runs Stars Decoded");
  });

  it("lists Timeline last in the footer's Reports column, and keeps it out of the top menu until it opens", () => {
    expect(FOOTER[0].links.map((l) => l.href)).toEqual(["/", "/compatibility", "/sample", "/sky", "/timeline"]);
    expect(FOOTER[0].links[4].label).toBe("Timeline");
    expect(NAV.map((l) => l.href)).not.toContain("/timeline");
  });

  it("links only to pages a visitor can open", () => {
    for (const link of [...NAV, ...FOOTER.flatMap((c) => c.links)]) expect(isPublicPath(link.href)).toBe(true);
  });
});

describe("the public routes", () => {
  it("route every page a visitor can open, and nothing else", () => {
    const routed = PUBLIC_ROUTES.map((r) => r.path);
    expect(new Set(routed).size).toBe(routed.length);
    expect([...routed].sort()).toEqual(PAGES.filter((p) => isPublicPath(p.path)).map((p) => p.path).sort());
    for (const route of PUBLIC_ROUTES) expect(typeof route.load).toBe("function");
  });
});

describe("the date line", () => {
  it("writes a day the same way on the server and in the browser", () => {
    expect(formatUpdated("2026-09-30")).toBe("30 Sep 2026");
    expect(formatUpdated("2027-01-04")).toBe("4 Jan 2027");
  });

  it("calls a legal page a draft until the seller's waitlist fields are in, and every other page updated", () => {
    for (const page of PAGES) {
      const expected = page.kind === "legal" && !waitlistReady() ? "Draft dated" : "Updated";
      expect(updatedLabel(page)).toBe(expected);
    }
  });
});

describe("a production build", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps the sample in the pages, the nav, the map and the routes (ADR-166)", async () => {
    vi.stubEnv("VITE_APP_ENV", "production");
    vi.resetModules();
    const site = await import("./site");
    const { PUBLIC_ROUTES: routes } = await import("./routes");
    const sample: PagePath = "/sample";
    expect(site.SAMPLE_LIVE).toBe(true);
    expect(site.isPublicPath(sample)).toBe(true);
    expect(site.pageFor(sample).sitemap).toBe(true);
    expect(site.NAV.map((l) => l.href)).toContain(sample);
    expect(site.FOOTER.flatMap((c) => c.links.map((l) => l.href))).toContain(sample);
    expect(routes.map((r) => r.path)).toContain(sample);
    expect(routes).toHaveLength(14);
  });
});
