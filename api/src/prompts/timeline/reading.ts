/**
 * One Timeline reading (ADR-210): a sky event the engine found, read for one
 * reader in plain words and built on their own report (reading 10). It is
 * written once per event per person and kept, so nothing in it may lean on the
 * day it was written: the prompt gives the event's own dates and no "today".
 */
import { z } from "zod/v4";
import {
  CYCLE_WORDS, factsOf, headlineOf,
  type LifeCycle, type NatalChartData, type SkyEvent,
} from "@workspace/engine";
import type { ChartBrief } from "../brief.js";
import { DATA_RULE, QUOTE_RULE, maskNames, quoteBlocks } from "../data.js";
import { DOCTRINE, STYLE_CONTRACT } from "../system.js";
import { HOUSE_WORDS, ordinal, renderVocabularyBlock } from "../vocabulary.js";
import { TIME_RULE, TIMELINE_DOCTRINE } from "./doctrine.js";

/** The things a reading is written for (reading 7): the doctrine's sky events and life's long cycles. */
export type ReadingEvent = SkyEvent | LifeCycle;

/** A life cycle is the one event without a `kind`: each of the engine's sky events carries its own. */
export function isCycle(event: ReadingEvent): event is LifeCycle {
  return !("kind" in event);
}

export interface Excerpt {
  /** Where in the report the passage sits, as the reading's link names it. */
  source: string;
  text: string;
}

export interface ReadingInput {
  event: ReadingEvent;
  brief: ChartBrief;
  /** Reading 10's passages: at most three of 120 words, none when the report says nothing on the point. */
  excerpts: Excerpt[];
  /** The name as typed. The brief holds it in its block, and the passages' copies of it are masked with it. */
  name: string;
  blind: boolean;
  /** The stretches it is within orb, as its card shows them, so the reading's dates agree with the card (Review 05/10 §2). */
  spans: readonly { start: Date; end: Date }[];
  /** The reader's whole years at its first exact pass or its start, floored (R16-23), for a child's words before 16. */
  age: number;
  /** A life cycle behind the reader's today, which gets a short paragraph; a sky event never is. */
  passed: boolean;
}

/** The family's one prompt: `:system` and `:user` rows derive from it, as a natal section's do. */
export const READING_KEY = "timeline:reading";

export const LINE_WORDS = 20;
export const BODY_WORDS: readonly [number, number] = [90, 140];
export const EXCERPTS_MAX = 3;
export const EXCERPT_WORDS = 120;

/** A ceiling, not a target: the two fields need about 250 tokens, and a reply cut at the cap fails whole. */
export const READING_MAX_TOKENS = 1_000;

export const ReadingSchema = z.strictObject({
  line: z.string().describe(`the everyday line under the headline: one or two short sentences, at most ${LINE_WORDS} words, with no date, number, planet, sign or house`),
  body: z.string().describe(`the reading: one paragraph of ${BODY_WORDS[0]} to ${BODY_WORDS[1]} words`),
});

export type ReadingOutput = z.infer<typeof ReadingSchema>;

export const TIMELINE_WRITER = `You are the voice of a perceptive, warm, direct human astrologer writing a short reading for one person about one stretch of time in their own chart. You write in plain, exact, second-person prose. You treat astrology as a language for describing patterns, never as fate. You are specific to this chart and this event in every sentence.`;

/** Assembled once at module load and identical for every reading: the cached prefix. */
export const TIMELINE_SYSTEM = [
  TIMELINE_WRITER, "", DATA_RULE, "", QUOTE_RULE, "", STYLE_CONTRACT, "", renderVocabularyBlock(), "", DOCTRINE, "", TIME_RULE, "", TIMELINE_DOCTRINE,
].join("\n");

export const READING_INSTRUCTIONS = `Write one Timeline reading: what one stretch of sky means for this reader, in their own chart, in plain words.

Write two fields.
- line: the everyday line under the headline. One or two short sentences, at most ${LINE_WORDS} words in all. Say what this time is like for the reader, the way a friend would say it. No date, no number, and no planet, sign or house name.
- body: one paragraph of ${BODY_WORDS[0]} to ${BODY_WORDS[1]} words. Open on what the sky is doing, in plain words, with a date from THE EVENT where it helps. Then say how astrology reads that time for this chart, as a pattern the reader can check against their own days. Where FROM THE READER'S REPORT gives a passage, say what their report says and how this time meets it. Close on something the reader may notice in themselves, said as what they may notice, never as advice or a command.

Never repeat the headline word for word. Write to the reader as "you".`;

const BLIND_RULES = [
  "HORIZON UNKNOWN. These rules replace any rule above they contradict:",
  "- The chart has no house, no Ascendant and no Midheaven. Name none of them, and never mention that the birth time is missing.",
];

/** Closes the user turn, as the natal self-check does (MB-129): a model weighs the end of a prompt most. */
export const READING_SELF_CHECK = "Before you answer, check both fields: no semicolons, no em dashes, no date or degree that THE EVENT does not list, nothing that will happen in the reader's life, and nothing they should or should not do.";

export interface EventFacts {
  /** What the prompt says about the event, one fact a line. */
  lines: string[];
  /** Every instant the engine computed for the event: the days a reading may name. */
  instants: Date[];
  /** Every degree the facts state: the degrees a reading may name. */
  degrees: number[];
}

const COUNTS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function dayFormat(zone: string | undefined): Intl.DateTimeFormat {
  const options = { day: "numeric", month: "long", year: "numeric" } as const;
  try {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: zone ?? "UTC" });
  } catch {
    // A zone the runtime does not know costs at most a day, which the date check allows either side.
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" });
  }
}

function list(items: readonly string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Degrees and minutes inside the sign, cut rather than rounded, as a chart prints them: 14.58 is 14°34′. */
function degreeText(degree: number): string {
  const whole = Math.floor(degree);
  return `${whole}°${String(Math.floor((degree - whole) * 60)).padStart(2, "0")}′`;
}

/** One decimal at most: an orb reads as 2° or 1.2°. */
const orbOf = (orb: number): number => Math.round(orb * 10) / 10;

function houseText(house: number): string {
  return `${ordinal(house)} house (${HOUSE_WORDS[house - 1].toLowerCase()})`;
}

type Placed = { degree: number; sign: string; absoluteDegree: number };

function placeOf(chart: NatalChartData, point: string): Placed | null {
  if (point === "ascendant" || point === "midheaven") return chart.angles?.[point] ?? null;
  return chart.planets[point] ?? null;
}

const NAMES: Record<string, string> = {
  sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn",
  uranus: "Uranus", neptune: "Neptune", pluto: "Pluto", north_node: "North Node", ascendant: "Ascendant", midheaven: "Midheaven",
};

/**
 * The event as the engine computed it, in the words the reader sees beside the
 * reading: the headline and facts line come from the engine's plain words
 * (reading 9), a cycle's name and word from `CYCLE_WORDS`. Days print in the
 * chart's own zone, reading 4's fallback, since a kept reading cannot follow
 * where the reader opens it.
 */
export function eventFacts(event: ReadingEvent, chart: NatalChartData, blind: boolean): EventFacts {
  const day = dayFormat(chart.timezone);
  const facts: EventFacts = { lines: [], instants: [], degrees: [] };
  const say = (line: string) => facts.lines.push(line);
  const on = (at: Date) => {
    facts.instants.push(at);
    return day.format(at);
  };
  const place = (label: string, placed: Placed | null | undefined) => {
    if (!placed) return;
    say(`${label}: ${degreeText(placed.degree)} ${placed.sign}`);
    facts.degrees.push(placed.degree, placed.absoluteDegree);
  };
  const house = (label: string, houses: readonly (number | null | undefined)[]) => {
    const known = houses.filter((h): h is number => typeof h === "number");
    if (!blind && known.length) say(`${label}: ${list(known.map(houseText))}`);
  };
  const span = (w: LifeCycle["window"]) => {
    say(`Within orb: from ${on(w.start)} to ${on(w.end)}`);
    if (w.exact.length) say(`Exact: ${list(w.exact.map(on))}, ${COUNTS[w.exact.length] ?? w.exact.length} ${w.exact.length === 1 ? "pass" : "passes"}`);
    else say("Exact: never. It comes within orb and leaves again without reaching the point.");
  };

  if (isCycle(event)) {
    const words = CYCLE_WORDS[event.id];
    // A return's angle counts whole rounds; an opposition or a square comes a fraction into the round it names.
    const round = event.id.endsWith("-return") ? event.angle / 360 : Math.floor(event.angle / 360) + 1;
    const nth = ORDINALS[round - 1] ?? ordinal(round);
    const which = event.id.endsWith("-square")
      ? `the ${event.angle % 360 === 90 ? "opening" : "closing"} one of its ${nth} round`
      : `the ${nth} one in a life`;
    say(`What: ${words.name}, ${which}`);
    say(`Its plain word: ${words.word}`);
    place(`${NAMES[event.body]} at birth`, placeOf(chart, event.body));
    house("House at birth", [chart.planets[event.body]?.house]);
    say(`Age ${event.window.exact.length ? "at the first exact pass" : "as it starts"}: ${event.age}`);
    span(event.window);
    say(event.repeats ? "It comes round again later in life." : "It comes once in a life.");
    return facts;
  }

  const plain = factsOf(event);
  say(`What: ${plain.sky}`);
  if (event.kind === "contact") say(`Aspect: ${event.aspect}`);
  say(`Headline the reader sees above your words: ${headlineOf(event)}`);
  if (event.tone) say(`Tone: ${event.tone}`);
  switch (event.kind) {
    case "contact":
      house("House", [event.house]);
      place(`Your ${NAMES[event.target]}`, placeOf(chart, event.target));
      say(`Orb: within ${orbOf(event.orb)}°`);
      facts.degrees.push(event.orb);
      span(event.window);
      break;
    case "retrograde":
      house("Houses it goes back over, in order", event.houses);
      say(`Turns back: ${on(event.start)}`);
      say(`Turns forward again: ${on(event.end)}`);
      break;
    case "eclipse": {
      house("House", [event.house]);
      const lon = event.eclipse.lon;
      place("Where", { degree: lon % 30, sign: SIGNS[Math.floor(lon / 30) % 12], absoluteDegree: lon });
      if (event.near) {
        say(`Near: your ${NAMES[event.near.target]}, ${orbOf(event.near.orb)}° away`);
        facts.degrees.push(event.near.orb);
      }
      say(`On: ${on(event.eclipse.at)}`);
      break;
    }
  }
  return facts;
}

function cutWords(text: string, max: number): string {
  const words = text.trim().split(/\s+/);
  return words.length > max ? words.slice(0, max).join(" ") : text.trim();
}

function reportPart(input: ReadingInput): string[] {
  const excerpts = input.excerpts.filter((e) => e.text.trim()).slice(0, EXCERPTS_MAX);
  if (!excerpts.length) return ["FROM THE READER'S REPORT: nothing on this event. Leave the report out of the reading."];
  const names = { name: input.name };
  return [
    "FROM THE READER'S REPORT (what this reading builds on)",
    // One line, as the passage is made, so nothing in a source can open a block of its own.
    ...excerpts.flatMap((e) => [`Source: ${maskNames(e.source.replace(/\s+/g, " ").trim(), names)}`, quoteBlocks(cutWords(e.text, EXCERPT_WORDS), names)]),
  ];
}

/** A stored prompt row may leave out the typed-data rules: they ride on every system all the same (ADR-202). */
function withDataRules(system: string): string {
  const missing = [DATA_RULE, QUOTE_RULE].filter((rule) => !system.includes(rule));
  return missing.length ? [system, ...missing.flatMap((rule) => ["", rule])].join("\n") : system;
}

/**
 * The prompt pair a reading sends. `override` is the family's stored rows, as
 * `resolveSection(READING_KEY)` gives them; an empty field keeps the default.
 * Everything the reader typed or the report holds sits in a data block.
 */
export function readingPrompt(input: ReadingInput, override?: { system?: string; user?: string }): { system: string; user: string } {
  const blind = input.blind || input.brief.horizon === "unknown";
  const instructions = override?.user?.trim() ? override.user : READING_INSTRUCTIONS;
  const facts = eventFacts(input.event, input.brief.chart, blind);
  const user = [
    instructions.trim(),
    ...(blind ? ["", ...BLIND_RULES] : []),
    "",
    "THE EVENT (computed by the engine: the only dates and degrees you may name)",
    ...facts.lines,
    "",
    "CHART BRIEF",
    input.brief.text,
    "",
    ...reportPart(input),
    "",
    READING_SELF_CHECK,
  ].join("\n");
  return { system: withDataRules(override?.system?.trim() ? override.system : TIMELINE_SYSTEM), user };
}
