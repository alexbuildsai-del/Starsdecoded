/**
 * The site's questions: fifteen in five topics, ten on the home page, each answered first, AI named once and never first,
 * "Is this scientific?" as locked, every price from the catalogue (landing-and-ai-search scope 12 and settled at lock 3;
 * annex /faq; R-6.3).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUNDLES, formatEuro } from "@workspace/commerce";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";
import { isPublicPath } from "../site";
import { FAQ_GROUPS, FAQ_LINK_LABELS, HOME_FAQ } from "./faq";

const items = FAQ_GROUPS.flatMap((group) => group.items);
const sentences = (text: string) => text.split(/(?<=[.?!])\s+/);
const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
const answerTo = (q: string) => items.find((item) => item.q === q)?.a ?? "";

describe("the questions", () => {
  it("are fifteen in five topics, each asked once", () => {
    expect(FAQ_GROUPS.map((group) => group.topic)).toEqual(["The report", "Birth details", "Compatibility", "Privacy", "Paying"]);
    expect(items).toHaveLength(15);
    expect(new Set(items.map((item) => item.q)).size).toBe(15);
    for (const item of items) expect(item.q).toMatch(/^[A-Z][^?]*\?$/);
  });

  it("keep /faq's topics in the locked order", () => {
    expect(items.map((item) => item.q)).toEqual([
      `What is a ${PERSONAL_REPORT}?`,
      "How is the report written?",
      "Is this scientific?",
      "Does it predict the future?",
      "How long does it take?",
      "What do I need to start?",
      "What if I don't know my birth time?",
      "Why does my birth place matter?",
      "What are whole-sign houses?",
      "Can I get a report about me and someone else?",
      `Does the ${COMPATIBILITY_REPORT} give us a score?`,
      "Is my birth data private?",
      "Can I delete my report?",
      "Do I pay once or every month?",
      "What if something goes wrong?",
    ]);
  });

  it("mark ten for the home page, shown in the locked home order", () => {
    expect(HOME_FAQ.map((item) => item.q)).toEqual([
      `What is a ${PERSONAL_REPORT}?`,
      "What do I need to start?",
      "What if I don't know my birth time?",
      "What are whole-sign houses?",
      "How is the report written?",
      "Does it predict the future?",
      "Is this scientific?",
      "Can I get a report about me and someone else?",
      "Can I delete my report?",
      "How long does it take?",
    ]);
    const marked = items.filter((item) => item.home);
    expect(marked).toHaveLength(10);
    expect(new Set(HOME_FAQ)).toEqual(new Set(marked));
  });

  it("answer in the first sentence, with no sentence past 25 words", () => {
    for (const item of items) {
      expect(item.a, item.q).toMatch(/^[A-Z][^.?!]*[.?!](\s|$)/);
      for (const sentence of sentences(item.a)) expect(wordCount(sentence), sentence).toBeLessThanOrEqual(25);
    }
  });

  it("open a closed question on its answer, but for the locked one", () => {
    const closed = items.filter((item) => /^(Can|Does|Do|Is) /.test(item.q) && item.q !== "Is this scientific?");
    expect(closed).toHaveLength(6);
    for (const item of closed) expect(item.a, item.q).toMatch(/^(Yes|No|Once)\b/);
  });

  it("name AI once, plainly, in How is the report written?, and never first", () => {
    const naming = items.filter((item) => /\bAI\b/.test(`${item.q} ${item.a}`));
    expect(naming.map((item) => item.q)).toEqual(["How is the report written?"]);
    expect(naming[0].a.match(/\bAI\b/g)).toHaveLength(1);
    expect(sentences(naming[0].a)[0]).not.toMatch(/\bAI\b/);
    for (const text of [...FAQ_GROUPS.map((group) => group.topic), ...Object.values(FAQ_LINK_LABELS)]) {
      expect(text).not.toMatch(/\bAI\b/);
    }
  });

  it("keep Is this scientific? as locked", () => {
    expect(answerTo("Is this scientific?")).toBe(
      "The planet positions are real astronomy, worked out from the sky at the minute you were born. What they mean comes from astrology, which science doesn't back, so think of the report as a way to reflect on yourself.",
    );
  });

  it("read every price from the catalogue", () => {
    const paying = answerTo("Do I pay once or every month?");
    for (const bundle of BUNDLES) expect(paying).toContain(`${formatEuro(bundle.cents)} for ${bundle.credits}`);
    expect(paying).toContain("VAT included");
    const catalogue = new Set(BUNDLES.map((bundle) => formatEuro(bundle.cents)));
    for (const item of items) {
      for (const price of item.a.match(/€\d+(?:\.\d{2})?/g) ?? []) expect(catalogue.has(price), price).toBe(true);
    }
  });

  it("promise back only the credit a failed report used", () => {
    const failed = answerTo("What if something goes wrong?");
    expect(failed).toContain("the credit it used");
    expect(failed).not.toMatch(/your credit (back|comes back)/i);
  });

  it("keep the house punctuation and call each report by its name", () => {
    const text = [
      ...FAQ_GROUPS.map((group) => group.topic),
      ...items.flatMap((item) => [item.q, item.a]),
      ...Object.values(FAQ_LINK_LABELS),
    ];
    for (const line of text) {
      expect(line).not.toMatch(/[—–;!]/);
      expect(line).not.toMatch(/\bastra\b/i);
      for (const match of line.matchAll(/(\w+ )?natal report/gi)) expect(match[0]).toBe(PERSONAL_REPORT);
      for (const match of line.matchAll(/compatibility report/gi)) expect(match[0]).toBe(COMPATIBILITY_REPORT);
    }
  });

  it("link on only to pages a visitor can open, each in its own words", () => {
    const linked = items.flatMap((item) => (item.link ? [item.link] : []));
    expect(linked.length).toBeGreaterThan(0);
    for (const link of linked) {
      expect(isPublicPath(link), link).toBe(true);
      expect(FAQ_LINK_LABELS[link]?.trim(), link).toBeTruthy();
    }
  });
});

describe("a production build", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps all fifteen and links the sample, which is live there too (ADR-166)", async () => {
    vi.stubEnv("VITE_APP_ENV", "production");
    vi.resetModules();
    const { FAQ_GROUPS: groups } = await import("./faq");
    const site = await import("../site");
    const all = groups.flatMap((group) => group.items);
    expect(all).toHaveLength(15);
    expect(all.filter((item) => item.home)).toHaveLength(10);
    const linked = all.flatMap((item) => (item.link ? [item.link] : []));
    expect(linked).toContain("/sample");
    for (const link of linked) expect(site.isPublicPath(link), link).toBe(true);
  });
});
