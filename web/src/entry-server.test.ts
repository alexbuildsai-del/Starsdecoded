import { describe, expect, it } from "vitest";
import { NOT_FOUND_TITLE } from "@/pages/not-found";
import { appHead, notFoundHead } from "./entry-server";

/** Cover A, the card every page's head names (ADR-228). */
const COVER = "https://mystarsdecoded.com/share-cover-v2.jpg";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"' };
const unescape = (text: string) => text.replace(/&(amp|lt|gt|quot);/g, (_, name: string) => ENTITIES[name]);
const titlesOf = (head: string) => [...head.matchAll(/<title>([^<]*)<\/title>/g)].map((found) => unescape(found[1]));
const metaOf = (head: string, key: string) => {
  const found = new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)" />`).exec(head);
  return found ? unescape(found[1]) : undefined;
};
const SHARE_CARD = [
  "og:type", "og:site_name", "og:title", "og:description", "og:image", "og:image:width", "og:image:height",
  "twitter:card", "twitter:title", "twitter:description", "twitter:image",
];

describe("404.html's head", () => {
  it("keeps its own title and noindex, and a broken link someone shares previews with the site's card", () => {
    const head = notFoundHead();
    expect(titlesOf(head)).toEqual([NOT_FOUND_TITLE]);
    expect(metaOf(head, "robots")).toBe("noindex");
    expect(metaOf(head, "og:image")).toBe(COVER);
    expect(metaOf(head, "twitter:image")).toBe(COVER);
    for (const key of SHARE_CARD) {
      expect(metaOf(head, key), key).toBeDefined();
      expect(metaOf(head, key), `${key}, as app.html has it`).toBe(metaOf(appHead(), key));
    }
    expect(head, "no address of its own").not.toContain('rel="canonical"');
    expect(metaOf(head, "og:url")).toBeUndefined();
    // An inline script would need its hash in vercel.json's policy (csp:write).
    expect(head).not.toContain("<script");
  });
});
