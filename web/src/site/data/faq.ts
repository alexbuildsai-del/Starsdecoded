/**
 * Every question the site answers, written once: the home page shows the ten marked `home`, /faq all fifteen by topic,
 * and /faq's FAQPage markup repeats them word for word (landing-and-ai-search scope 12, annex /faq; ADR-116, 117).
 * Answers stay plain text whose first sentence answers alone, so an answer engine can quote it without the page around it.
 */
import { BUNDLES, formatEuro } from "@workspace/commerce";
import { CHAPTERS } from "@/lib/chapters";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { SAMPLE_LIVE } from "../site";

export interface FaqItem {
  q: string;
  a: string;
  /** One of the ten the home page shows, in `HOME_FAQ`'s order. */
  home: boolean;
  /** A page that goes deeper, which /faq links in the words `FAQ_LINK_LABELS` gives it. */
  link?: string;
}

export interface FaqGroup {
  topic: string;
  items: readonly FaqItem[];
}

// Keyed by the registry's length, so adding or cutting a chapter fails the typecheck here instead of leaving the answer wrong.
const CHAPTER_COUNT: Record<typeof CHAPTERS.length, string> = { 10: "ten" };

/** Each bundle's price and credits from the one catalogue (R-6.3), so no answer types a price. */
function creditPrices(): string {
  const each = BUNDLES.map((bundle) => `${formatEuro(bundle.cents)} for ${bundle.credits}`);
  return each.length > 1 ? `${each.slice(0, -1).join(", ")} or ${each[each.length - 1]}` : each[0];
}

const whatIs: FaqItem = {
  q: `What is a ${PERSONAL_REPORT}?`,
  a: `It's the ${PRODUCT} report about you, written from your birth chart. It has ${CHAPTER_COUNT[CHAPTERS.length]} chapters, including a short read of each of your twelve houses. Every sentence shows which part of your chart it is based on.`,
  home: true,
  // Only while the sample is switched on, so the answer never links to a page that answers 404.
  ...(SAMPLE_LIVE ? { link: "/sample" } : {}),
};

const howWritten: FaqItem = {
  q: "How is the report written?",
  a: "We work out your chart and note what stands out in it. Your report is then written from those notes with the help of AI, following our own rules. Every reference is checked against your chart before you see it.",
  home: true,
  link: "/method",
};

const scientific: FaqItem = {
  q: "Is this scientific?",
  a: "The planet positions are real astronomy, worked out from the sky at the minute you were born. What they mean comes from astrology, which science doesn't back, so think of the report as a way to reflect on yourself.",
  home: true,
};

const predicts: FaqItem = {
  q: "Does it predict the future?",
  a: "No. It doesn't forecast events, name dates or talk about fate. It describes how you tend to work and gives you things to try.",
  home: true,
};

const howLong: FaqItem = {
  q: "How long does it take?",
  a: "It takes a few minutes, and you can start reading the first chapters while the rest are still being written.",
  home: true,
};

const needToStart: FaqItem = {
  q: "What do I need to start?",
  a: "You need your birth date and where you were born. If you know your birth time, add it too, because it gives you a rising sign and houses.",
  home: true,
};

const noBirthTime: FaqItem = {
  q: "What if I don't know my birth time?",
  a: "You still get the full report. Tell us what you have: the exact time, a part of the day, or nothing. The report only uses what that supports, and says what a time would add. If you find it later, add it once for free and we'll mark every change.",
  home: true,
  link: "/learn/birth-time",
};

const birthPlace: FaqItem = {
  q: "Why does my birth place matter?",
  a: "It sets which sign was rising and so where your houses fall. A town nearby is fine, because a short distance moves your rising degree only a little.",
  home: false,
};

const wholeSign: FaqItem = {
  q: "What are whole-sign houses?",
  a: "It's a simple way to split your chart into twelve houses. Each zodiac sign is one house, starting from the sign that was rising when you were born. Every house is the same size, wherever you were born.",
  home: true,
  link: "/learn/whole-sign-houses",
};

const twoOfYou: FaqItem = {
  q: "Can I get a report about me and someone else?",
  a: `Yes. When you both have a ${PERSONAL_REPORT}, you can get a ${COMPATIBILITY_REPORT} about the two of you. You choose whether you're a couple, a parent and child, or friends, family or colleagues, and it never gives you a score.`,
  home: true,
  link: "/compatibility",
};

const score: FaqItem = {
  q: `Does the ${COMPATIBILITY_REPORT} give us a score?`,
  a: "No. It looks at everyday life together, where you clash and what you can try, and it never rates the two of you.",
  home: false,
};

const birthData: FaqItem = {
  q: "Is my birth data private?",
  a: "Yes. Our writing service only gets your name and where your planets are, never your birth date, time or place.",
  home: false,
  link: "/privacy",
};

const deleting: FaqItem = {
  q: "Can I delete my report?",
  a: "Yes, any time. Deleting a report removes it, and your birth details too, unless another report uses them. We keep a record of the purchase.",
  home: true,
};

const payOnce: FaqItem = {
  q: "Do I pay once or every month?",
  a: `Once. There's no subscription, and each report uses one credit. Credits cost ${creditPrices()}, VAT included.`,
  home: false,
};

const goesWrong: FaqItem = {
  q: "What if something goes wrong?",
  // MB-91 provisional: the soft pass writes some reports on no credit, so until credits go hard (R12) the answer
  // gives back only the credit a report used, as the refund rule words it (R-6.6).
  a: "If your report can't be finished, we tell you what happened and give back the credit it used, so you can try again.",
  home: false,
  link: "/refunds",
};

export const FAQ_GROUPS: readonly FaqGroup[] = [
  { topic: "The report", items: [whatIs, howWritten, scientific, predicts, howLong] },
  { topic: "Birth details", items: [needToStart, noBirthTime, birthPlace, wholeSign] },
  { topic: "Compatibility", items: [twoOfYou, score] },
  { topic: "Privacy", items: [birthData, deleting] },
  { topic: "Paying", items: [payOnce, goesWrong] },
];

/**
 * The home page's ten in the locked home page's order, which asks what you need before how the report is written, so
 * AI comes up only after the practical questions; /faq keeps its topics.
 */
export const HOME_FAQ: readonly FaqItem[] = [
  whatIs,
  needToStart,
  noBirthTime,
  wholeSign,
  howWritten,
  predicts,
  scientific,
  twoOfYou,
  deleting,
  howLong,
];

/** The words /faq links each deeper page with, written to make sense out of context. */
export const FAQ_LINK_LABELS: Readonly<Record<string, string>> = {
  "/sample": "Read a sample report",
  "/method": "How we make your report",
  "/learn/birth-time": "More about birth times",
  "/learn/whole-sign-houses": "More about whole-sign houses",
  "/compatibility": `About the ${COMPATIBILITY_REPORT}`,
  "/privacy": "Privacy policy",
  "/refunds": "How refunds work",
};
