/**
 * Every question the site answers, written once: the home page shows the ten marked `home`, /faq every one in
 * `FAQ_GROUPS` by topic, and /faq's FAQPage markup repeats them word for word (landing-and-ai-search scope 12, annex
 * /faq; ADR-116, 117). Answers stay plain text whose first sentence answers alone, so an answer engine can quote it
 * without the page around it. /compatibility asks none of its own: its three moved here (ADR-180). Timeline's six are
 * /timeline's alone (`TIMELINE_FAQ`).
 */
import { BUNDLES, CREDIT_LINE, formatEuro } from "@workspace/commerce";
import { CHAPTERS } from "@/lib/chapters";
import { lensInfo } from "@/lib/lenses";
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
  // MB-160 provisional: every claim, not every sentence, shows its part of the chart.
  a: `It's the ${PRODUCT} report about you, written from your birth chart. It has ${CHAPTER_COUNT[CHAPTERS.length]} chapters, including a short read of each of your twelve houses. Every claim in it shows which part of your chart it comes from.`,
  home: true,
  // Only while the sample is switched on, so the answer never links to a page that answers 404.
  ...(SAMPLE_LIVE ? { link: "/sample" } : {}),
};

const howWritten: FaqItem = {
  q: "How is the report written?",
  a: "We work out your chart and note what stands out in it. Then AI helps us write your report from those notes, following our own rules. We check every claim against your chart before you see it.",
  home: true,
  link: "/method",
};

const scientific: FaqItem = {
  q: "Is this scientific?",
  a: "The planet positions are real astronomy, worked out from the sky at the minute you were born. What they mean comes from astrology, which science doesn't back. So think of the report as a way to reflect on yourself.",
  home: true,
};

// All but its last sentence is the Owner's, approved word for word with Timeline's page (ADR-253).
const predicts: FaqItem = {
  q: "Does it predict the future?",
  a: "No. It never puts a date on anything in your life or talks about fate. The only dates we show are for the sky, like your Saturn return. It describes how you tend to work and gives you things to try.",
  home: true,
};

const howLong: FaqItem = {
  q: "How long does it take?",
  a: "It takes a few minutes. You can start reading the first chapters while the rest are still being written.",
  home: true,
};

const needToStart: FaqItem = {
  q: "What do I need to start?",
  a: "You need your birth date and where you were born. If you know your birth time, add it too, because it gives you a rising sign and houses.",
  home: true,
};

const noBirthTime: FaqItem = {
  q: "What if I don't know my birth time?",
  a: "You still get the full report. Tell us what you have: the exact time, a part of the day, or nothing. The report only uses what your answer can tell us. It also says what a time would add. If you find it later, add it once for free. We'll mark every change.",
  home: true,
  link: "/learn/birth-time",
};

const birthPlace: FaqItem = {
  q: "Why does my birth place matter?",
  a: "It sets which sign was rising and so where your houses are. A town nearby is fine, because a short distance moves your rising degree only a little.",
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
  a: `Yes. When you both have a ${PERSONAL_REPORT}, you can get a ${COMPATIBILITY_REPORT} about the two of you. You choose whether you're a couple, a parent and child, or friends, family or colleagues. It never gives you a score.`,
  home: true,
  link: "/compatibility",
};

const bothNeed: FaqItem = {
  q: `Do we both need a ${PERSONAL_REPORT}?`,
  a: `Yes. The ${COMPATIBILITY_REPORT} is written from both of your charts, so each of you needs a ${PERSONAL_REPORT} first.`,
  home: false,
};

const withChild: FaqItem = {
  q: `Can I get a ${COMPATIBILITY_REPORT} about me and my child?`,
  a: `Yes. Pick “${lensInfo("parent_child").door}” and say who the parent is. The report looks at what your child needs from you at their age and how you can give it.`,
  home: false,
};

const score: FaqItem = {
  q: `Does the ${COMPATIBILITY_REPORT} give us a score?`,
  a: "No. It never rates the two of you. It looks at everyday life together, where you clash and what you can try.",
  home: false,
};

// Not "only names": for a pair the writer also gets passages from both reports and, for a parent and child, the
// child's age (/privacy).
const theirDetails: FaqItem = {
  q: "What happens to the other person's birth details?",
  a: "They stay private, the same as yours. Our writing service gets names and where the planets are, never anyone's birth date, time or place.",
  home: false,
  link: "/privacy",
};

const birthData: FaqItem = {
  q: "Is my birth data private?",
  a: "Yes. Our writing service only gets your name and where your planets are, never your birth date, time or place.",
  home: false,
  link: "/privacy",
};

const deleting: FaqItem = {
  q: "Can I delete my report?",
  a: "Yes, any time. Deleting a report removes it. It also removes your birth details, unless another report uses them. We keep a record of the purchase.",
  home: true,
};

// Its first two sentences are the Owner's, approved word for word with Timeline's page (ADR-253).
const payOnce: FaqItem = {
  q: "Do I pay once or every month?",
  a: `Once for each report. Timeline, coming after launch, will be our one subscription. ${CREDIT_LINE} Credits cost ${creditPrices()}, VAT included.`,
  home: false,
};

// ADR-313: a failed report keeps its credit, so Try again is free and only a final failure gives it back. A
// Compatibility report has no Try again, so its failure gives the credit back at once.
const goesWrong: FaqItem = {
  q: "What if something goes wrong?",
  a: `If your report fails, we tell you what happened, and Try again is free. If we still can't write it, its credit comes back to your balance. For a ${COMPATIBILITY_REPORT}, the credit comes back at once.`,
  home: false,
  link: "/refunds",
};

const whatTimeline: FaqItem = {
  q: "What is Timeline?",
  a: `Timeline is ${PRODUCT}'s one subscription, for people with a ${PERSONAL_REPORT}. It shows the sky moving across your own chart. You get your life's big cycles, what's happening for you now and next with a reading for each, and Ask. It opens after launch. The price comes later.`,
  home: false,
};

const horoscope: FaqItem = {
  q: "Is it a daily horoscope?",
  a: "No. It only says something when a slow planet reaches a point in your own chart, and stays quiet otherwise. Nothing is written for your sign.",
  home: false,
};

// Its ages hold for every chart, from Saturn's own period, so they are words here; a reader's own dates and ages come
// from the engine (timeline-page acceptance 1).
const saturnReturn: FaqItem = {
  q: "What is a Saturn return?",
  a: "A Saturn return is when Saturn comes back to where it was when you were born. Saturn takes about 29.5 years to go round the Sun, so this happens at about 29 and again at 58. Astrology reads it as a time of growing up. It can cross the exact point up to three times, which is why some dates come in threes.",
  home: false,
};

const timelineBirthTime: FaqItem = {
  q: "Do I need my birth time?",
  a: "No. The Saturn finder needs only your birth date. In Timeline, a birth time adds your rising sign, your houses and your Moon. Without one, it shows what it can and says so.",
  home: false,
};

const mira: FaqItem = {
  q: "Who is Mira?",
  a: "Mira is our sample account. She's invented, and her chart is worked out from her made-up birth details the same way yours would be. The words in her examples are samples of what Timeline writes.",
  home: false,
};

// Cancelling lives on the Account page (ADR-263), as the page's own steps say too. What a reader keeps after cancelling
// is billing's to decide (ADR-264), so the answer promises nothing about it yet.
const cancelling: FaqItem = {
  q: "How do I cancel?",
  a: "From your Account page, in two clicks.",
  home: false,
};

export const FAQ_GROUPS: readonly FaqGroup[] = [
  { topic: "The report", items: [whatIs, howWritten, scientific, predicts, howLong] },
  { topic: "Birth details", items: [needToStart, noBirthTime, birthPlace, wholeSign] },
  { topic: "Compatibility", items: [twoOfYou, bothNeed, withChild, score, theirDetails] },
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

/**
 * The Timeline topic, which /timeline asks and marks up as its FAQPage (timeline-page §1 item 6). It stays off the home
 * page and off /faq, so each question has one page to answer it.
 */
export const TIMELINE_FAQ: readonly FaqItem[] = [whatTimeline, horoscope, saturnReturn, timelineBirthTime, mira, cancelling];

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
