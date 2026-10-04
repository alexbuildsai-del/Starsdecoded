/**
 * The site's questions: eighteen in five topics, ten on the home page, each answered first, AI named once and never first,
 * "Is this scientific?" as locked, every price from the catalogue and the one credit line beside them, /compatibility's
 * three in /faq's FAQPage markup (landing-and-ai-search scope 12 and settled at lock 3; annex /faq; R-6.3; ADR-170, 180).
 * Timeline's six for /timeline alone, and the four sentences and the home line that came with its page (ADR-252, 253).
 */
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUNDLES, CREDIT_LINE, formatEuro } from "@workspace/commerce";
import { lensInfo } from "@/lib/lenses";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { headFor } from "../head";
import { isPublicPath } from "../site";
import { FAQ_GROUPS, FAQ_LINK_LABELS, HOME_FAQ, TIMELINE_FAQ } from "./faq";

/** /faq's questions. */
const items = FAQ_GROUPS.flatMap((group) => group.items);
/** Every question the site answers, /timeline's included, for the rules every answer keeps. */
const every = [...items, ...TIMELINE_FAQ];
const sentences = (text: string) => text.split(/(?<=[.?!])\s+/);
const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
const answerTo = (q: string) => every.find((item) => item.q === q)?.a ?? "";

/** A page's words as JSX joins them, read from its source, since these tests render no component. */
const sourceOf = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\s+/g, " ");

const MOVED_FROM_COMPATIBILITY = [
  `Do we both need a ${PERSONAL_REPORT}?`,
  `Can I get a ${COMPATIBILITY_REPORT} about me and my child?`,
  "What happens to the other person's birth details?",
];

type Question = { "@type": string; name: string; acceptedAnswer: { "@type": string; text: string } };

/** The questions /faq's head marks up, read back from its JSON-LD as a crawler would. */
function markedUp(): Question[] {
  const blocks = [...headFor("/faq", "production").matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]) as { "@type": string; mainEntity?: Question[] },
  );
  return blocks.find((block) => block["@type"] === "FAQPage")?.mainEntity ?? [];
}

describe("the questions", () => {
  it("are eighteen in five topics, each asked once", () => {
    expect(FAQ_GROUPS.map((group) => group.topic)).toEqual(["The report", "Birth details", "Compatibility", "Privacy", "Paying"]);
    expect(items).toHaveLength(18);
    expect(new Set(items.map((item) => item.q)).size).toBe(18);
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
      `Do we both need a ${PERSONAL_REPORT}?`,
      `Can I get a ${COMPATIBILITY_REPORT} about me and my child?`,
      `Does the ${COMPATIBILITY_REPORT} give us a score?`,
      "What happens to the other person's birth details?",
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
    for (const item of every) {
      expect(item.a, item.q).toMatch(/^[A-Z][^.?!]*[.?!](\s|$)/);
      for (const sentence of sentences(item.a)) expect(wordCount(sentence), sentence).toBeLessThanOrEqual(25);
    }
  });

  it("open a closed question on its answer, but for the locked one", () => {
    const closed = every.filter((item) => /^(Can|Does|Do|Is) /.test(item.q) && item.q !== "Is this scientific?");
    expect(closed).toHaveLength(10);
    for (const item of closed) expect(item.a, item.q).toMatch(/^(Yes|No|Once)\b/);
  });

  it("name AI once, plainly, in How is the report written?, and never first", () => {
    const naming = every.filter((item) => /\bAI\b/.test(`${item.q} ${item.a}`));
    expect(naming.map((item) => item.q)).toEqual(["How is the report written?"]);
    expect(naming[0].a.match(/\bAI\b/g)).toHaveLength(1);
    expect(sentences(naming[0].a)[0]).not.toMatch(/\bAI\b/);
    for (const text of [...FAQ_GROUPS.map((group) => group.topic), ...Object.values(FAQ_LINK_LABELS)]) {
      expect(text).not.toMatch(/\bAI\b/);
    }
  });

  it("keep Is this scientific? as locked", () => {
    expect(answerTo("Is this scientific?")).toBe(
      "The planet positions are real astronomy, worked out from the sky at the minute you were born. What they mean comes from astrology, which science doesn't back. So think of the report as a way to reflect on yourself.",
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

  it("say what a credit buys where they say what credits cost", () => {
    const paying = answerTo("Do I pay once or every month?");
    expect(sentences(paying)).toContain(CREDIT_LINE);
    expect(paying.indexOf(CREDIT_LINE)).toBeLessThan(paying.indexOf("Credits cost"));
  });

  it("ask /compatibility's three under Compatibility, the lens named as the picker names it", () => {
    const compatibility = FAQ_GROUPS.find((group) => group.topic === "Compatibility")?.items.map((item) => item.q) ?? [];
    for (const q of MOVED_FROM_COMPATIBILITY) expect(compatibility, q).toContain(q);
    expect(answerTo(`Can I get a ${COMPATIBILITY_REPORT} about me and my child?`)).toContain(`“${lensInfo("parent_child").door}”`);
  });

  it("keep the other person's birth date, time and place from the writing service, as /privacy says", () => {
    const theirs = answerTo("What happens to the other person's birth details?");
    expect(theirs).toContain("never anyone's birth date, time or place");
    expect(theirs).not.toMatch(/\bonly gets\b/);
    expect(items.find((item) => item.a === theirs)?.link).toBe("/privacy");
  });

  it("are marked up for /faq word for word, the moved three and the credit line included", () => {
    const questions = markedUp();
    expect(questions.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(items.map((item) => [item.q, item.a]));
    for (const q of MOVED_FROM_COMPATIBILITY) expect(questions.map((question) => question.name)).toContain(q);
    expect(questions.find((q) => q.name === "Do I pay once or every month?")?.acceptedAnswer.text).toContain(CREDIT_LINE);
  });

  it("promise back only the credit a failed report used", () => {
    const failed = answerTo("What if something goes wrong?");
    expect(failed).toContain("the credit it used");
    expect(failed).not.toMatch(/your credit (back|comes back)/i);
  });

  it("keep the house punctuation and call each report by its name", () => {
    const text = [
      ...FAQ_GROUPS.map((group) => group.topic),
      ...every.flatMap((item) => [item.q, item.a]),
      ...Object.values(FAQ_LINK_LABELS),
    ];
    for (const line of text) {
      expect(line).not.toMatch(/[—–;!]/);
      expect(line).not.toMatch(/\bastra\b/i);
      // "natal chart" stays where people search; the report itself is never a "natal report" (ADR-170).
      expect(line).not.toMatch(/natal report/i);
      for (const match of line.matchAll(/personal report/gi)) expect(match[0]).toBe(PERSONAL_REPORT);
      for (const match of line.matchAll(/compatibility report/gi)) expect(match[0]).toBe(COMPATIBILITY_REPORT);
    }
  });

  it("link on only to pages a visitor can open, each in its own words", () => {
    const linked = every.flatMap((item) => (item.link ? [item.link] : []));
    expect(linked.length).toBeGreaterThan(0);
    for (const link of linked) {
      expect(isPublicPath(link), link).toBe(true);
      expect(FAQ_LINK_LABELS[link]?.trim(), link).toBeTruthy();
    }
  });
});

describe("what the answers promise (MB-160)", () => {
  it("say every claim shows its part of the chart, never every line or sentence", () => {
    expect(answerTo(`What is a ${PERSONAL_REPORT}?`)).toContain("Every claim in it shows which part of your chart it comes from.");
    for (const item of every) expect(item.a, item.q).not.toMatch(/every (line|sentence)/i);
  });
});

describe("/method and the FAQ (ADR-117)", () => {
  const code = sourceOf("../pages/MethodPage.tsx");

  it("answer How is the report written? in the same words", () => {
    const heading = code.indexOf("How is the report written?</h2>");
    expect(heading).toBeGreaterThan(0);
    const paragraph = code.slice(heading).match(/<p [^>]*> (.*?) <\/p>/)?.[1];
    expect(paragraph).toBe(answerTo("How is the report written?"));
  });
});

describe("Timeline's questions (timeline-page §1 item 6)", () => {
  it("are the spec's six in its order, on neither the home page nor /faq", () => {
    expect(TIMELINE_FAQ.map((item) => item.q)).toEqual([
      "What is Timeline?",
      "Is it a daily horoscope?",
      "What is a Saturn return?",
      "Do I need my birth time?",
      "Who is Mira?",
      "How do I cancel?",
    ]);
    for (const item of TIMELINE_FAQ) {
      expect(item.home, item.q).toBe(false);
      expect(items.map((shown) => shown.q), item.q).not.toContain(item.q);
    }
  });

  it("name the product and who it is for, with no price before Timeline has one (ADR-255)", () => {
    const opening = `Timeline is ${PRODUCT}'s one subscription, for people with a ${PERSONAL_REPORT}.`;
    expect(sentences(answerTo("What is Timeline?"))[0]).toBe(opening);
    for (const item of TIMELINE_FAQ) expect(item.a, item.q).not.toMatch(/€|\d+\s*(EUR|euros?)\b/);
  });

  it("type no date or degree: a reader's dates come from the engine (acceptance 1)", () => {
    const month = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/;
    for (const item of TIMELINE_FAQ) {
      expect(item.a, item.q).not.toMatch(month);
      expect(item.a, item.q).not.toMatch(/°|\b(1[89]|20)\d\d\b/);
    }
  });
});

describe("the four sentences (ADR-253)", () => {
  const pages = {
    pricing: sourceOf("../sections/Pricing.tsx"),
    method: sourceOf("../sections/Method.tsx"),
    methodPage: sourceOf("../pages/MethodPage.tsx"),
  };
  const METHOD = "It won't forecast events, put dates on your life or diagnose anything.";

  it("open the two FAQ answers word for word, the rest kept", () => {
    const paying = `Once for each report. Timeline, coming after launch, will be our one subscription. ${CREDIT_LINE} Credits cost`;
    expect(answerTo("Do I pay once or every month?").slice(0, paying.length)).toBe(paying);
    expect(answerTo("Does it predict the future?")).toBe(
      "No. It never puts a date on anything in your life or talks about fate. The only dates we show are for the sky, like your Saturn return. It describes how you tend to work and gives you things to try.",
    );
  });

  it("say Prices on home, and Method on home and /method, word for word", () => {
    expect(pages.pricing).toContain('<p className="sd-sub">You pay once for each report.</p>');
    expect(pages.method).toContain(`${METHOD} It describes how you tend to work and gives you things to try.`);
    expect(pages.methodPage).toContain(`${METHOD} It describes how you tend to think, work and love, and gives you things to try.`);
  });

  it("leave no line saying there is no subscription or that it names dates", () => {
    for (const text of [...Object.values(pages), ...every.map((item) => item.a)]) {
      expect(text).not.toMatch(/no subscription|name dates|names dates/i);
    }
  });
});

describe("the way in on home (ADR-252)", () => {
  const home = sourceOf("../pages/HomePage.tsx");
  const line = sourceOf("../sections/TimelineLine.tsx");

  it("puts Timeline's line between Prices and the questions, and moves nothing else", () => {
    const body = home.slice(home.indexOf("export default function HomePage"));
    const order = [...body.matchAll(/<([A-Z]\w*)\b/g)].map((m) => m[1]).filter((name) => !["SiteLayout", "Later"].includes(name));
    expect(order).toEqual([
      "Hero", "Differences", "Claims", "Inside", "YourPeople", "TwoCharts", "Method", "BirthTime", "Pricing", "TimelineLine", "Faq", "Dawn",
    ]);
  });

  it("says the locked words and links to /timeline, with no form and no price", () => {
    expect(line).toContain("Coming soon · Timeline");
    expect(line).toContain("See when the planets reach your chart, from your Saturn return to this week.");
    expect(line).toMatch(/<Link href="\/timeline"[^>]*> What's in it <span aria-hidden="true">›<\/span> <\/Link>/);
    expect(line).not.toMatch(/<(form|input|button)\b|€|ReportCta/);
  });
});

describe("a production build", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps all eighteen and links the sample, which is live there too (ADR-166)", async () => {
    vi.stubEnv("VITE_APP_ENV", "production");
    vi.resetModules();
    const { FAQ_GROUPS: groups } = await import("./faq");
    const site = await import("../site");
    const all = groups.flatMap((group) => group.items);
    expect(all).toHaveLength(18);
    expect(all.filter((item) => item.home)).toHaveLength(10);
    const linked = all.flatMap((item) => (item.link ? [item.link] : []));
    expect(linked).toContain("/sample");
    for (const link of linked) expect(site.isPublicPath(link), link).toBe(true);
  });
});
