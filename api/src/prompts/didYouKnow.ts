/**
 * Did you know in the chapters (ADR-377, 383): one small card a chapter at most, beside the prose and outside it, on an
 * idea from astrology's traditions that the report does not build its reading on. Seven chapters carry one, each on
 * its own topic; Overview's needs a horizon and Discoveries' a planet going backwards at birth. The writer words the
 * card as tradition and says what it could mean for this chart (reading 7).
 *
 * A topic and its lesson are notes the writer reads, never lines to copy: a sentence handed to every chart comes
 * back word for word in every report (MB-92). They are our own words and the chart's facts, never a creator's
 * (ADR-381), and carry no instruction: the card's rules are rendered around them.
 */
import { z } from "zod/v4";
import type { ChartBrief } from "./brief.js";
import { hasHorizon, longitudeAt, type NatalChartData } from "../lib/chartCalculation.js";
import { BODY_LABELS, HOUSE_COVERS, ordinal, type Body } from "./vocabulary.js";

/**
 * The model's card. Strict mode always sends the field; the default lets a reply written before the card existed (a
 * stub's, a stored test's) read as a chapter with none, and leaves the schema the model is sent unchanged.
 */
export const DidYouKnowSchema = z.object({
  title: z.string().describe("a short title that finishes the words 'Did you know' and ends on a question mark"),
  body: z.string().describe("two to four sentences, worded as tradition"),
}).nullable().describe("the chapter's Did you know card, or null when the DID YOU KNOW block says there is none").default(null);

export interface DidYouKnowTopic {
  /** What the tradition reads, then where it sits in this chart. */
  topic: string;
  /** The lesson often read with it. */
  lesson: string;
}

/** The chapters that may carry a card (ADR-383): none in House by House, whose primer stands there, Money or Relationships. */
export const DID_YOU_KNOW_CHAPTERS = ["overview", "mind", "career", "family", "superpowers", "discoveries", "focus"] as const;

/**
 * Discoveries reads the rarest planet going backwards at birth, so the card tells the reader something few people
 * share: Review 05/10 §10's shares, fewest first (Venus 7 in 100 to Neptune 44). The Sun and Moon never go backwards,
 * the nodes always do, and Chiron is not a planet.
 */
const RAREST_BACKWARDS: readonly Body[] = ["venus", "mars", "mercury", "jupiter", "saturn", "uranus", "pluto", "neptune"];

const DAY_MS = 86_400_000;
const STEP_MS = DAY_MS / 4;
/** Further back than any phase can be: a new or a full moon comes round every 29.5 days. */
const SEARCH_DAYS = 31;

/** Where a body sits, with its house's everyday words when the hour settled one. */
function placed(chart: NatalChartData, body: Body): string {
  const p = chart.planets[body];
  return p.house !== undefined ? `${p.sign}, in the ${ordinal(p.house)} house (${HOUSE_COVERS[p.house - 1]})` : p.sign;
}

/** How far the Moon has run past `phase` degrees ahead of the Sun: it grows with time and wraps through 0 at the phase. */
function pastPhase(phase: number, ms: number): number {
  const at = new Date(ms);
  return (((longitudeAt("moon", at) - longitudeAt("sun", at) - phase) % 360) + 360) % 360;
}

/** When the Moon last stood `phase` degrees ahead of the Sun: back a quarter-day at a time to the wrap, then halved to the minute. */
function lastPhase(phase: number, at: number): number | null {
  let later = at;
  let pastLater = pastPhase(phase, later);
  for (let earlier = at - STEP_MS; earlier >= at - SEARCH_DAYS * DAY_MS; earlier -= STEP_MS) {
    const pastEarlier = pastPhase(phase, earlier);
    if (pastEarlier > pastLater) {
      let before = earlier;
      let after = later;
      while (after - before > 60_000) {
        const mid = before + (after - before) / 2;
        if (pastPhase(phase, mid) > 180) before = mid;
        else after = mid;
      }
      return after;
    }
    later = earlier;
    pastLater = pastEarlier;
  }
  return null;
}

/**
 * The Moon's phase at birth, in words that hold for every time the band allows. A new or full moon inside the band (or
 * within half a day of an exact time) could fall on either side of the birth, so it is "within a day of" it; otherwise
 * the half of the month is certain and the days are counted from its phase at the band's centre.
 */
function moonAtBirth(chart: NatalChartData): { starts: boolean; words: string } | null {
  const at = Date.parse(chart.datetimeUtc);
  if (!Number.isFinite(at)) return null;
  const reach = Math.max(DAY_MS / 2, (chart.windowMinutes ?? 0) * 60_000);
  for (const [phase, name] of [[0, "new"], [180, "full"]] as const) {
    if (pastPhase(phase, at + reach) < pastPhase(phase, at - reach)) return { starts: name === "new", words: `within a day of a ${name} moon` };
  }
  const growing = pastPhase(0, at) < 180;
  const last = lastPhase(growing ? 0 : 180, at);
  if (last === null) return null;
  const days = Math.round((at - last) / DAY_MS);
  return {
    starts: growing,
    words: `under a ${growing ? "growing" : "shrinking"} moon, about ${days} ${days === 1 ? "day" : "days"} after a ${growing ? "new" : "full"} moon`,
  };
}

/** The topic ADR-383 gives the chapter, read for this chart, or null when the chapter has no card here. */
export function topicFor(section: string, brief: ChartBrief): DidYouKnowTopic | null {
  const chart = brief.chart;
  switch (section) {
    case "overview":
      if (!hasHorizon(chart)) return null;
      return {
        topic: `The rising sign is often read as shaping how a person looks and moves: their style, the way they walk, the face they show someone new. This person's rising sign is ${chart.angles.ascendant.sign}.`,
        lesson: "What people see first is only the start. Knowing it can help a person use it on purpose, and show the rest in their own time.",
      };
    case "mind":
      return {
        topic: `Many astrologers read the sign Mercury is in as the way a person talks at a party: how they start a chat, who they end up talking to, and when they move on. This person's Mercury is in ${chart.planets.mercury.sign}.`,
        lesson: "No way of talking is the right one. Knowing their own can help a person find the people who enjoy it.",
      };
    case "career":
      return {
        topic: `Saturn is often read as the planet of slow results: what it touches tends to come late, and then to last. This person's Saturn is in ${placed(chart, "saturn")}.`,
        lesson: "Slow results are still results. What is built step by step in that part of life tends to hold.",
      };
    case "family":
      // Only the Sun and the Moon: the older day-or-night swap is a sect idea, and parent significators are out of
      // scope (ADR-383).
      return {
        topic: `Many astrologers read the Sun as the father and the Moon as the mother: what each one showed a person, and what that person had to learn from them. This person's Sun is in ${placed(chart, "sun")}, and their Moon is in ${placed(chart, "moon")}.`,
        lesson: "A person can keep what a parent showed them, and learn to give themselves what was missing.",
      };
    case "superpowers":
      return {
        topic: `Old astrology called Jupiter the greater benefic, which means the bigger helper. Where it sits is often read as where help and luck come most easily. This person's Jupiter is in ${placed(chart, "jupiter")}.`,
        lesson: "Help that comes easily still needs a yes. It tends to come where a person keeps showing up.",
      };
    case "discoveries": {
      const backwards = RAREST_BACKWARDS.find((b) => chart.planets[b]?.retrograde);
      if (!backwards) return null;
      return {
        topic: `Old astrology tends to read a planet that was going backwards at birth as slow to show what it stands for: it may come out late, or get a second try. This person's ${BODY_LABELS[backwards]} was going backwards when they were born.`,
        lesson: "Something slow to show is not missing. It may simply come out later, in its own time.",
      };
    }
    case "focus": {
      const moon = moonAtBirth(chart);
      if (!moon) return null;
      return {
        topic: `The new moon is often read as a time to start things, and the full moon as a time to finish them. Some astrologers also read the Moon's phase at birth. This person was born ${moon.words}.`,
        lesson: moon.starts
          ? "Read that way, starting may come easily to this person, and finishing is the part to plan for."
          : "Read that way, finishing may come easily to this person, and starting is the part to plan for.",
      };
    }
    default:
      return null;
  }
}

/** What each card must keep clear of: its own chapter, another section's reading, or what no card may say. */
const CARE: Readonly<Partial<Record<(typeof DID_YOU_KNOW_CHAPTERS)[number], string>>> = {
  overview: "Keep to looks and movement: style, posture, pace and gestures, never the body's size, weight or health. What the rising sign means for behaviour is read elsewhere in the report.",
  mind: "The party is this card's picture, so the chapter's paragraphs set their moments somewhere else.",
  family: "Only the Sun and the Moon stand for a parent. Say more about the one that tells more in this chart and name the other in a clause. No family event and no blame.",
  discoveries: "Its line under RETROGRADE AT BIRTH says how common that is.",
  focus: "No date: the card never says when a new or full moon comes.",
};

/**
 * The chapter's DID YOU KNOW block, after the brief: the topic, its lesson and the card's rules, or the ask for null,
 * since strict mode sends the field to every chapter that has it.
 */
export function didYouKnowContext(section: (typeof DID_YOU_KNOW_CHAPTERS)[number], brief: ChartBrief): string {
  const found = topicFor(section, brief);
  if (!found) return "DID YOU KNOW. This chapter has no card for this chart: set didYouKnow to null.";
  return [
    "DID YOU KNOW. Beside this chapter's paragraphs sits one small card, the didYouKnow field. It holds one idea from astrology's traditions that this report does not build its reading on.",
    `The idea, and where it sits in this chart: ${found.topic}`,
    `The lesson often read with it: ${found.lesson}`,
    ...(CARE[section] ? [CARE[section]] : []),
    `The title finishes the words "Did you know", which the card prints above it, and ends on a question mark, like "Each sign covers 30 degrees of the sky?". The body is two to four sentences: what the tradition reads, what it could mean for this reader, then the lesson, all in your own words. Word it as tradition, never as fact: "is often read as", "old astrology tends to", "many people find", "some astrologers say". Use your own everyday picture. The card is not part of the chapter: it adds nothing to the word count, no claim quotes it, and it repeats no sentence or image from the paragraphs. Every style rule holds in it: no dignity or sect word, and could, might or may, never will.`,
  ].join("\n");
}
