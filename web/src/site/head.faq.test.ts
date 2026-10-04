/**
 * The FAQPage markup, page by page (R16-14, R16-17; ADR-115, 252; landing-and-ai-search scope 12). Google's rules for FAQ
 * markup allow no question or answer a page does not show, so each page marks up its own list and no other: /faq its
 * eighteen, /timeline its six, and nothing else is a FAQPage. Pages render no component here (MB-47), so what a page
 * shows is read from its source, and what a crawler reads from its head.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FAQ_GROUPS, HOME_FAQ, TIMELINE_FAQ, type FaqItem } from "./data/faq";
import { headFor } from "./head";
import { PAGES, isPublicPath, type PageEntry } from "./site";

type Question = { "@type": string; name: string; acceptedAnswer: { "@type": string; text: string } };
type Block = Record<string, unknown> & { "@type": string; mainEntity?: Question[] };

const blocksOf = (head: string): Block[] =>
  [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]) as Block);
const faqOf = (path: string, env: "production" | "staging" | "development" = "production"): Block | undefined =>
  blocksOf(headFor(path, env)).find((b) => b["@type"] === "FAQPage");
const askedOn = (path: string): Array<[string, string]> => (faqOf(path)?.mainEntity ?? []).map((q) => [q.name, q.acceptedAnswer.text]);
const pair = (items: readonly FaqItem[]): Array<[string, string]> => items.map((i) => [i.q, i.a]);
const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const PUBLIC = PAGES.filter((p) => isPublicPath(p.path));
const WITH_FAQ = PUBLIC.filter((p) => p.schema.includes("FAQPage"));
const FAQ = FAQ_GROUPS.flatMap((g) => g.items);

describe("which pages carry FAQPage", () => {
  it("are the ones the registry names, and no page carries it twice or without a question", () => {
    expect(WITH_FAQ.map((p) => p.path)).toEqual(["/timeline", "/faq"]);
    for (const page of PUBLIC) {
      const blocks = blocksOf(headFor(page.path, "production")).filter((b) => b["@type"] === "FAQPage");
      expect(blocks, page.path).toHaveLength(page.schema.includes("FAQPage") ? 1 : 0);
      if (blocks[0]) expect(blocks[0].mainEntity!.length, `${page.path} marks up at least one question`).toBeGreaterThan(0);
    }
  });

  it("is nowhere on the home page, whose ten questions /faq already marks up", () => {
    expect(faqOf("/")).toBeUndefined();
    expect(HOME_FAQ.length).toBeGreaterThan(0);
    const onFaq = new Set(askedOn("/faq").map(([q]) => q));
    for (const item of HOME_FAQ) expect(onFaq.has(item.q), item.q).toBe(true);
  });

  it("is not on a path outside the public site, or one the registry lacks", () => {
    for (const path of ["/Timeline", "/timeline.html", "/timelines", "/timeline/extra", "/faq/x", "/dashboard", "/admin", "/"]) {
      expect(faqOf(path), path).toBeUndefined();
    }
  });
});

describe("each page marks up its own questions, word for word, in the order it shows them", () => {
  it("gives /timeline its six and /faq its eighteen", () => {
    expect(askedOn("/timeline")).toEqual(pair(TIMELINE_FAQ));
    expect(askedOn("/timeline")).toHaveLength(6);
    expect(askedOn("/faq")).toEqual(pair(FAQ));
    expect(askedOn("/faq")).toHaveLength(18);
  });

  it("marks up no question on both pages, and none twice on one", () => {
    const [timeline, faq] = [askedOn("/timeline"), askedOn("/faq")];
    const shared = timeline.map(([q]) => q).filter((q) => faq.some(([f]) => f === q));
    expect(shared).toEqual([]);
    for (const asked of [timeline, faq]) {
      expect(new Set(asked.map(([q]) => q)).size).toBe(asked.length);
      expect(new Set(asked.map(([, a]) => a)).size).toBe(asked.length);
    }
  });

  it("reads the same off every host and at every address a page answers to", () => {
    const live = faqOf("/timeline");
    for (const path of ["/timeline/", "/timeline?utm_source=chatgpt.com", "/timeline#finder", "/timeline/?a=b#c"]) {
      expect(faqOf(path), path).toEqual(live);
    }
    for (const env of ["staging", "development"] as const) {
      expect(faqOf("/timeline", env)).toEqual(live);
      expect(faqOf("/faq", env)).toEqual(faqOf("/faq"));
    }
  });

  it("states each page as what it is: its name, address, description and date", () => {
    for (const page of WITH_FAQ) {
      const block = faqOf(page.path)!;
      expect(block).toMatchObject({
        "@type": "FAQPage",
        name: page.h1,
        url: `https://mystarsdecoded.com${page.path}`,
        description: page.lede,
        dateModified: page.updated,
      });
      expect(page.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect((block.isPartOf as { "@id": string })["@id"]).toMatch(/#website$/);
    }
  });
});

describe("every marked-up question is shown on its page", () => {
  it("has /timeline render TIMELINE_FAQ and /faq render FAQ_GROUPS, the lists their markup is made from", () => {
    const timeline = source("./pages/TimelinePage.tsx");
    expect(timeline).toMatch(/<Questions items=\{TIMELINE_FAQ\} \/>/);
    expect(timeline).not.toMatch(/FAQ_GROUPS|HOME_FAQ/);
    expect(timeline).toMatch(/\{item\.q\}/);
    expect(timeline).toMatch(/\{item\.a\}/);
    const faq = source("./pages/FaqPage.tsx");
    expect(faq).toMatch(/FAQ_GROUPS\.map/);
    expect(faq).not.toMatch(/TIMELINE_FAQ/);
    const head = source("./head.ts");
    expect(head).toMatch(/"\/timeline": TIMELINE_FAQ/);
    expect(head).toMatch(/"\/faq": FAQ_GROUPS\.flatMap\(\(group\) => group\.items\)/);
  });

  it("keeps the answer in the markup as the page prints it: plain text, no markup of its own, and the same spaces", () => {
    for (const page of WITH_FAQ) {
      for (const [q, a] of askedOn(page.path)) {
        expect(q, page.path).toBe(q.trim());
        expect(a, page.path).toBe(a.trim());
        expect(q.length).toBeGreaterThan(0);
        expect(a.length).toBeGreaterThan(0);
        expect(`${q} ${a}`).not.toMatch(/<[a-z/][^>]*>|\[[^\]]+\]\([^)]+\)|\*\*|&[a-z]+;|\{\{/i);
        expect(q).toMatch(/\?$/);
      }
    }
  });

  it("names no price in any answer on /timeline, which has none to name yet (ADR-255)", () => {
    for (const [q, a] of askedOn("/timeline")) {
      expect(`${q} ${a}`, q).not.toMatch(/[€$£]\s?\d|\d\s?(?:EUR|euro)/i);
    }
  });
});

describe("the page types the registry names are the ones the head writes", () => {
  it("writes a WebPage block beside /timeline's FAQPage, and an Article beside neither", () => {
    const types = (page: PageEntry) => blocksOf(headFor(page.path, "production")).map((b) => b["@type"]);
    const timeline = PAGES.find((p) => p.path === "/timeline")!;
    expect(types(timeline)).toEqual(expect.arrayContaining(["WebPage", "FAQPage", "BreadcrumbList"]));
    expect(types(timeline)).not.toContain("Article");
    expect(types(timeline)).not.toContain("Product");
  });
});
