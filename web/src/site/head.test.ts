import { afterEach, describe, expect, it, vi } from "vitest";
import { BUNDLES } from "@workspace/commerce";
import { PERSONAL_REPORT } from "@/lib/product";
import { FAQ_GROUPS } from "./data/faq";
import { SAMPLE } from "./data/sample";
import { headFor } from "./head";
import { PAGES, SITE, isPublicPath, pageFor, type PageEntry } from "./site";

type Block = Record<string, unknown> & { "@type": string };
type Crumb = { "@type": string; position: number; name: string; item: string };
type Offer = Record<string, unknown>;
type Question = { "@type": string; name: string; acceptedAnswer: { "@type": string; text: string } };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"' };
const unescape = (text: string) => text.replace(/&(amp|lt|gt|quot);/g, (_, name: string) => ENTITIES[name]);
const count = (text: string, part: string) => text.split(part).length - 1;

const titleOf = (head: string) => {
  const found = /<title>([^<]*)<\/title>/.exec(head);
  return found ? unescape(found[1]) : undefined;
};
const metaOf = (head: string, key: string) => {
  const found = new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)" />`).exec(head);
  return found ? unescape(found[1]) : undefined;
};
const canonicalOf = (head: string) => /<link rel="canonical" href="([^"]*)" \/>/.exec(head)?.[1];
const scriptsOf = (head: string) =>
  [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const blocksOf = (head: string) => scriptsOf(head).map((json) => JSON.parse(json) as Block);
const ofType = (head: string, type: string) => blocksOf(head).filter((block) => block["@type"] === type);
const only = (head: string, type: string) => {
  const found = ofType(head, type);
  expect(found, type).toHaveLength(1);
  return found[0];
};

const PUBLIC = PAGES.filter((page) => isPublicPath(page.path));
const HOME = `${SITE.origin}/`;
const urlOf = (page: PageEntry) => (page.path === "/" ? HOME : `${SITE.origin}${page.path}`);
const APP_PATHS = [
  "/chart",
  "/dashboard",
  "/sign-in",
  "/report/abc",
  "/compatibility/abc",
  "/claim",
  "/admin",
  "/no-such-page",
];
const PAGE_TYPES = ["WebPage", "Article", "FAQPage"];

function keysAndTypes(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysAndTypes);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, inner]) => [
      key,
      ...(key === "@type" ? [String(inner)] : []),
      ...keysAndTypes(inner),
    ]);
  }
  return [];
}

afterEach(() => {
  vi.doUnmock("@workspace/launch");
  vi.doUnmock("./data/faq");
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("a public page's head on production", () => {
  it("carries the registry's title and lede once each, and production's address", () => {
    for (const page of PUBLIC) {
      const head = headFor(page.path, "production");
      expect(count(head, "<title>")).toBe(1);
      expect(count(head, 'name="description"')).toBe(1);
      expect(titleOf(head)).toBe(page.title);
      expect(metaOf(head, "description")).toBe(page.lede);
      expect(canonicalOf(head)).toBe(urlOf(page));
      expect(metaOf(head, "robots")).toBeUndefined();
    }
  });

  it("gives every page the share card with its own words", () => {
    for (const page of PUBLIC) {
      const head = headFor(page.path, "production");
      expect(metaOf(head, "og:site_name")).toBe(SITE.name);
      expect(metaOf(head, "og:type")).toBe(page.schema.includes("Article") ? "article" : "website");
      expect(metaOf(head, "og:title")).toBe(page.title);
      expect(metaOf(head, "og:description")).toBe(page.lede);
      expect(metaOf(head, "og:url")).toBe(urlOf(page));
      expect(metaOf(head, "og:image")).toBe("https://mystarsdecoded.com/opengraph.jpg");
      expect(metaOf(head, "og:image:width")).toBe("1200");
      expect(metaOf(head, "og:image:height")).toBe("630");
      expect(metaOf(head, "twitter:card")).toBe("summary_large_image");
      expect(metaOf(head, "twitter:title")).toBe(page.title);
      expect(metaOf(head, "twitter:description")).toBe(page.lede);
      expect(metaOf(head, "twitter:image")).toBe("https://mystarsdecoded.com/opengraph.jpg");
    }
  });

  it("finds a page with a trailing slash or a query at its one address", () => {
    expect(canonicalOf(headFor("/faq/", "production"))).toBe(`${SITE.origin}/faq`);
    expect(canonicalOf(headFor("/?utm_source=chatgpt.com", "production"))).toBe(HOME);
  });
});

describe("structured data", () => {
  it("parses every block, and names the organization and the site on every page", () => {
    for (const page of PUBLIC) {
      const head = headFor(page.path, "production");
      for (const block of blocksOf(head)) expect(block["@context"]).toBe("https://schema.org");
      const organization = only(head, "Organization");
      expect(organization).toMatchObject({ name: SITE.name, url: HOME, logo: `${SITE.origin}/logo.svg` });
      const publisher = { "@id": organization["@id"] };
      expect(only(head, "WebSite")).toMatchObject({ name: SITE.name, url: HOME, publisher });
    }
  });

  it("gives every page but the home page the trail it shows", () => {
    expect(ofType(headFor("/", "production"), "BreadcrumbList")).toHaveLength(0);
    for (const page of PUBLIC.filter((p) => p.kind !== "home")) {
      const crumbs = only(headFor(page.path, "production"), "BreadcrumbList").itemListElement as Crumb[];
      expect(crumbs.map((c) => c.position)).toEqual(crumbs.map((_, i) => i + 1));
      for (const crumb of crumbs) expect(crumb["@type"]).toBe("ListItem");
      expect(crumbs[0]).toMatchObject({ name: SITE.name, item: HOME });
      const last = crumbs[crumbs.length - 1];
      expect(last.item).toBe(urlOf(page));
      if (page.kind === "learn") {
        expect(crumbs).toHaveLength(3);
        expect(crumbs[1]).toMatchObject({ name: "Learn", item: `${SITE.origin}/faq` });
        expect(last.name).toBe(page.eyebrow);
      } else {
        expect(crumbs).toHaveLength(2);
        expect(last.name).toBe(page.h1);
      }
    }
  });

  it("types each page as the registry does, in one block per type", () => {
    for (const page of PUBLIC) {
      const head = headFor(page.path, "production");
      const types = blocksOf(head).map((b) => b["@type"]).filter((t) => PAGE_TYPES.includes(t));
      expect(types.sort()).toEqual([...page.schema].sort());
      for (const type of page.schema) {
        expect(only(head, type)).toMatchObject({ url: urlOf(page), description: page.lede });
      }
    }
    expect(PUBLIC.filter((p) => p.schema.includes("FAQPage")).map((p) => p.path)).toEqual(["/faq"]);
    for (const path of ["/sample", "/method", "/learn/whole-sign-houses", "/learn/birth-time"]) {
      expect(ofType(headFor(path, "production"), "Article"), path).toHaveLength(1);
    }
  });

  it("offers every bundle on the home page, with no availability before launch, and on no other page", () => {
    const home = pageFor("/");
    const product = only(headFor("/", "production"), "Product");
    expect(product).toMatchObject({ name: PERSONAL_REPORT, description: home.lede, brand: { name: SITE.name } });
    const offers = product.offers as Offer[];
    expect(offers).toHaveLength(BUNDLES.length);
    offers.forEach((offer, i) => {
      const bundle = BUNDLES[i];
      expect(offer).toMatchObject({
        "@type": "Offer",
        name: bundle.name,
        description: bundle.line,
        price: (bundle.cents / 100).toFixed(2),
        priceCurrency: "EUR",
        url: HOME,
      });
      expect(offer).not.toHaveProperty("availability");
    });
    for (const page of PUBLIC.filter((p) => p.kind !== "home")) {
      expect(ofType(headFor(page.path, "production"), "Product")).toHaveLength(0);
      expect(headFor(page.path, "production")).not.toContain('"Offer"');
    }
  });

  it("says each offer is in stock once launched", async () => {
    vi.doMock("@workspace/launch", () => ({ LAUNCHED: true }));
    vi.resetModules();
    const { headFor: launchedHead } = await import("./head");
    const offers = only(launchedHead("/", "production"), "Product").offers as Offer[];
    for (const offer of offers) expect(offer.availability).toBe("https://schema.org/InStock");
  });

  it("dates each Article by the date its page shows, the sample by its run", () => {
    for (const page of PUBLIC.filter((p) => p.schema.includes("Article"))) {
      expect(only(headFor(page.path, "production"), "Article")).toMatchObject({
        headline: page.h1,
        description: page.lede,
        dateModified: page.updated,
        mainEntityOfPage: urlOf(page),
        author: { name: SITE.name },
        publisher: { name: SITE.name },
      });
    }
    expect(only(headFor("/sample", "production"), "Article").dateModified).toBe(SAMPLE.generatedAt.slice(0, 10));
  });

  it("answers the FAQ word for word, every question once", () => {
    const faq = only(headFor("/faq", "production"), "FAQPage");
    const questions = faq.mainEntity as Question[];
    const shown = FAQ_GROUPS.flatMap((group) => group.items);
    expect(questions.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(shown.map((item) => [item.q, item.a]));
    for (const q of questions) {
      expect(q["@type"]).toBe("Question");
      expect(q.acceptedAnswer["@type"]).toBe("Answer");
    }
    expect(faq.dateModified).toBe(pageFor("/faq").updated);
  });

  it("carries no review or rating anywhere", () => {
    for (const page of PUBLIC) {
      const words = keysAndTypes(blocksOf(headFor(page.path, "production")));
      for (const word of words) expect(word).not.toMatch(/review|rating/i);
    }
  });
});

describe("off production", () => {
  it("asks not to be indexed and names no address, with the same words and data", () => {
    for (const env of ["staging", "development"] as const) {
      for (const page of PUBLIC) {
        const head = headFor(page.path, env);
        const live = headFor(page.path, "production");
        expect(metaOf(head, "robots")).toBe("noindex");
        expect(canonicalOf(head)).toBeUndefined();
        expect(metaOf(head, "og:url")).toBeUndefined();
        expect(titleOf(head)).toBe(page.title);
        expect(metaOf(head, "description")).toBe(page.lede);
        expect(blocksOf(head)).toEqual(blocksOf(live));
      }
    }
  });
});

describe("the build's commit", () => {
  const COMMIT = "90c6bbf3a1d24e5f8b7c60d9e1f2a3b4c5d6e7f8";
  const EVERY_PATH = [...PUBLIC.map((page) => page.path), ...APP_PATHS];

  it("names the commit once in every head, the same on every host, for the API to read off the home page", () => {
    vi.stubEnv("VITE_COMMIT", COMMIT);
    for (const env of ["production", "staging", "development"] as const) {
      for (const path of EVERY_PATH) {
        const head = headFor(path, env);
        expect(count(head, 'name="commit"'), `${env} ${path}`).toBe(1);
        expect(metaOf(head, "commit"), `${env} ${path}`).toBe(COMMIT);
      }
    }
  });

  it("writes the tag in the shape api/src/lib/indexNow.ts looks for", () => {
    vi.stubEnv("VITE_COMMIT", COMMIT);
    expect(headFor("/", "production")).toContain(`<meta name="commit" content="${COMMIT}" />`);
  });

  it("writes no tag when the build knows no commit", () => {
    for (const commit of ["", "  "]) {
      vi.stubEnv("VITE_COMMIT", commit);
      for (const path of EVERY_PATH) expect(headFor(path, "production"), path).not.toContain('name="commit"');
    }
  });
});

describe("a path outside the public site", () => {
  it("gets the shell's head: never indexed, no address, no data, and the share card for a shared link", () => {
    for (const env of ["production", "staging"] as const) {
      for (const path of APP_PATHS) {
        const head = headFor(path, env);
        expect(metaOf(head, "robots"), path).toBe("noindex");
        expect(titleOf(head)).toBe(SITE.name);
        expect(metaOf(head, "description")).toBe(pageFor("/").lede);
        expect(canonicalOf(head)).toBeUndefined();
        expect(metaOf(head, "og:url")).toBeUndefined();
        expect(metaOf(head, "og:image")).toBe("https://mystarsdecoded.com/opengraph.jpg");
        expect(scriptsOf(head)).toHaveLength(0);
      }
    }
  });

  it("covers the sample in a production build, where it answers 404", async () => {
    vi.stubEnv("VITE_APP_ENV", "production");
    vi.resetModules();
    const { headFor: productionHead } = await import("./head");
    const head = productionHead("/sample", "production");
    expect(metaOf(head, "robots")).toBe("noindex");
    expect(canonicalOf(head)).toBeUndefined();
    expect(scriptsOf(head)).toHaveLength(0);
    expect(head).not.toContain(SAMPLE.name);
  });
});

describe("escaping", () => {
  it("never lets an answer close its script element, and reads back unchanged", async () => {
    const q = 'Is "</script><script>alert(1)</script>" shown?';
    const a = "Only as text & <!-- never --> as markup.";
    vi.doMock("./data/faq", () => ({ FAQ_GROUPS: [{ topic: "Odd", items: [{ q, a, home: false }] }] }));
    vi.resetModules();
    const { headFor: oddHead } = await import("./head");
    const head = oddHead("/faq", "production");
    const scripts = scriptsOf(head);
    expect(count(head, "</script>")).toBe(scripts.length);
    for (const json of scripts) expect(json).not.toMatch(/[<>]/);
    const [question] = only(head, "FAQPage").mainEntity as Question[];
    expect(question.name).toBe(q);
    expect(question.acceptedAnswer.text).toBe(a);
  });
});
