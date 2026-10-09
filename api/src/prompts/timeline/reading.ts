/**
 * One Timeline reading (ADR-210): a sky event the engine found, read for one
 * reader in plain words and built on their own report (reading 10). It is
 * written once per event per person and kept, so nothing in it may lean on the
 * day it was written: the prompt gives the event's own dates and no "today".
 */
import { z } from "zod/v4";
import {
  CYCLE_WORDS, factsOf, headlineOf,
  type ContactEvent, type LifeCycle, type NatalChartData, type SkyEvent, type Tone,
} from "@workspace/engine";
import type { ChartBrief } from "../brief.js";
import { DATA_RULE, QUOTE_RULE, maskNames, quoteBlocks } from "../data.js";
import { DOCTRINE, STYLE_CONTRACT } from "../system.js";
import { HOUSE_COVERS, HOUSE_WORDS, ordinal, renderVocabularyBlock } from "../vocabulary.js";
import { BACKWARDS_PASS_BODIES, CHILD_UNDER, TIME_RULE, TIMELINE_DOCTRINE } from "./doctrine.js";

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
/** A cycle behind the reader gets a short paragraph (Review 05/10 §4): the length its own rules ask instead. */
export const PAST_BODY_WORDS: readonly [number, number] = [40, 70];
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

// Review 05/10 §2's prompt lines (Light and Heavy, no "things") and its artifact's words, the possibilities and the
// ending of explain-like-a-friend §8 (ADR-375, 384), and Review 08/10 §1's backwards pass (ADR-392).
export const READING_INSTRUCTIONS = `Write one Timeline reading: what one stretch of sky may mean for this reader, in their own chart, in plain words.

Write two fields.
- line: the everyday line under the headline. One or two short sentences, at most ${LINE_WORDS} words in all. Say what this time may be like for the reader, the way a friend would say it. No date, no number, and no planet, sign or house name.
- body: one paragraph of ${BODY_WORDS[0]} to ${BODY_WORDS[1]} words. Open on the reader's life, in other words than the line: what this time may feel like day to day. Then give the reason: what the sky is doing, in plain words, with a date from THE EVENT where it helps, always with its year. Name the houses THE EVENT gives, each with what it covers: the house of the reader's own point and the houses the planet moves through. Where FROM THE READER'S REPORT gives a passage, say what their report says and how this time meets it. Where THE EVENT marks a pass as backwards, say what the backwards pass may change. End on one sentence that says what this time could be a good time to do.

On a Light time, say how it helps. On a Heavy time, say what it asks of you. On a Mixed time, say what helps and what it asks.
Talk in possibilities: could, might, may, you may notice. Never will, is going to or very likely, and never a life event as the outcome.
Never use the word "things". Never repeat the headline word for word. Write to the reader as "you".`;

const BLIND_RULES = [
  "HORIZON UNKNOWN. These rules replace any rule above they contradict:",
  "- The chart has no house, no Ascendant and no Midheaven. Name none of them, and never mention that the birth time is missing.",
];

/** Rules in code, as the blind ones are, so a stored instructions row can't drop them: a cycle already behind the reader. */
const PASSED_RULES = [
  "A CYCLE BEHIND THE READER. These rules replace any rule above they contradict:",
  `- body: one short paragraph of ${PAST_BODY_WORDS[0]} to ${PAST_BODY_WORDS[1]} words, not ${BODY_WORDS[0]} to ${BODY_WORDS[1]}. Say what that time may have been like, in the past tense, with "may have" or "could have".`,
  `- End the body on what that time may have been a good time to do, with "may have been a good time to".`,
];

function childRules(age: number): string[] {
  return [
    `A TIME BEFORE THE READER WAS ${CHILD_UNDER}. Their age then: ${age}. These rules replace any rule above they contradict:`,
    "- Read it as a childhood time. Say each house in its words for a child, as THE EVENT gives them. The 5th is play and making things, never romance.",
    "- Nothing about love, dating, money, a job or a partner.",
  ];
}

/** Closes the user turn, as the natal self-check does (MB-129): a model weighs the end of a prompt most. */
export const READING_SELF_CHECK = "Before you answer, check both fields: no semicolons, no em dashes, no date or degree that THE EVENT does not list, every date with its year, no \"things\", nothing that will happen in the reader's life, nothing they should or should not do, and a last sentence that says what the time could be, or may have been, a good time to do.";

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

/**
 * What each house covers for a child, so a time before 16 is never read through an adult's house: the 5th is play and
 * making things, never romance (Review 05/10 §4).
 */
const CHILD_HOUSE_WORDS = [
  "how you show yourself, and your body as it grows",
  "your own things, and what feels like yours",
  "school, talking, brothers and sisters, the neighbours",
  "home and family",
  "play and making things",
  "daily routines, chores and health",
  "best friends, and anyone you face one to one",
  "what the family shares, and deep feelings",
  "big questions, stories, trips and learning about the world",
  "how you do at school, and what grown-ups expect of you",
  "friends, teams and clubs",
  "time alone, sleep and dreams, and worries kept to yourself",
] as const;

/** The page's word for a house and what it covers (ADR-391), so the writer can say the house plainly. */
function houseText(house: number, child: boolean): string {
  const covers = child ? `for a child, ${CHILD_HOUSE_WORDS[house - 1]}` : `${HOUSE_WORDS[house - 1].toLowerCase()}: ${HOUSE_COVERS[house - 1]}`;
  return `${ordinal(house)} house (${covers})`;
}

/** The tone as the card words it, with its legend's line (Review 05/10 §2), so the reading writes to the word the reader sees. */
const TONE_WORDS: Readonly<Record<Tone, string>> = {
  easy: "Light (goes your way)",
  mixed: "Mixed (has its ups and downs)",
  intense: "Heavy (asks more of you)",
};

type Placed = { degree: number; sign: string; absoluteDegree: number };

function placeOf(chart: NatalChartData, point: string): Placed | null {
  if (point === "ascendant" || point === "midheaven") return chart.angles?.[point] ?? null;
  return chart.planets[point] ?? null;
}

const NAMES: Record<string, string> = {
  sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn",
  uranus: "Uranus", neptune: "Neptune", pluto: "Pluto", north_node: "North Node", ascendant: "Ascendant", midheaven: "Midheaven",
};

const passCount = (n: number): string => `${COUNTS[n] ?? n} ${n === 1 ? "pass" : "passes"}`;

/**
 * The nodes reversed, said plainly so it is never read as a return (Review 05/10 §4): the North Node on the South
 * Node's place at birth, the opposite sign at the same degree, and that sign's house.
 */
function reversed(north: Placed, home: number | undefined, child: boolean): string {
  const at = SIGNS.indexOf(north.sign);
  const south = at < 0 ? "" : `, ${degreeText(north.degree)} ${SIGNS[(at + 6) % 12]}`;
  const where = home === undefined ? "" : `, in your ${houseText(((home + 5) % 12) + 1, child)}`;
  return `Plainly: the nodes are reversed, and this is not a return. The North Node stands where your South Node was at birth${south}${where}. The South Node stands where your North Node was.`;
}

/** The backwards passes a contact's reading reads (ADR-392): none for a body whose going back is an event of its own. */
function backwardsPasses(event: ContactEvent): ContactEvent["passes"] {
  return BACKWARDS_PASS_BODIES.has(event.body) ? event.passes.filter((p) => p.direction === "backwards") : [];
}

/**
 * The event as the engine computed it, in the words the reader sees beside the
 * reading: the headline and facts line come from the engine's plain words
 * (reading 9), a cycle's name and word from `CYCLE_WORDS`. Days print in the
 * chart's own zone, reading 4's fallback, since a kept reading cannot follow
 * where the reader opens it, and always with their year (Review 05/10 §2).
 * `times` are the reading's own: with them, each stretch prints as the card
 * shows it, and a time before 16 says its houses in a child's words.
 */
export function eventFacts(
  event: ReadingEvent,
  chart: NatalChartData,
  blind: boolean,
  times: Partial<Pick<ReadingInput, "spans" | "age">> = {},
): EventFacts {
  const day = dayFormat(chart.timezone);
  const child = times.age !== undefined && times.age < CHILD_UNDER;
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
  const known = (houses: readonly (number | null | undefined)[]): number[] =>
    blind ? [] : houses.filter((h): h is number => typeof h === "number");
  const house = (label: string, houses: readonly (number | null | undefined)[]) => {
    const named = known(houses);
    if (named.length) say(`${label}: ${list(named.map((h) => houseText(h, child)))}`);
  };
  const within = (window: LifeCycle["window"]) => {
    const spans = times.spans?.length ? times.spans : [window];
    say(`Within orb: ${list(spans.map((s, i) => `${i ? "again " : ""}from ${on(s.start)} to ${on(s.end)}`))}`);
  };
  const exact = (at: readonly Date[]) => {
    if (at.length) say(`Exact: ${list(at.map(on))}, ${passCount(at.length)}`);
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
    const birth = placeOf(chart, event.body);
    place(`${NAMES[event.body]} at birth`, birth);
    const home = chart.planets[event.body]?.house;
    house("House at birth", [home]);
    if (event.id === "node-opposition" && birth) say(reversed(birth, known([home])[0], child));
    say(`Age ${event.window.exact.length ? "at the first exact pass" : "as it starts"}: ${event.age}`);
    within(event.window);
    exact(event.window.exact);
    say(event.repeats ? "It comes round again later in life." : "It comes once in a life.");
    return facts;
  }

  const plain = factsOf(event);
  say(`What: ${plain.sky}`);
  if (event.kind === "contact") say(`Aspect: ${event.aspect}`);
  say(`Headline the reader sees above your words: ${headlineOf(event)}`);
  if (event.tone) say(`Tone: ${TONE_WORDS[event.tone]}`);
  switch (event.kind) {
    case "contact": {
      const body = NAMES[event.body];
      place(`Your ${NAMES[event.target]}`, placeOf(chart, event.target));
      house(`Your ${NAMES[event.target]}'s house`, [event.house]);
      // ADR-384: where the planet itself is while it touches the point, the part of life the reader may notice it in.
      const moving = known(event.crosses);
      house(moving.length > 1 ? `Houses ${body} moves through while within orb, in order` : `House ${body} moves through while within orb`, moving);
      say(`Orb: within ${orbOf(event.orb)}°`);
      facts.degrees.push(event.orb);
      within(event.window);
      const back = backwardsPasses(event);
      if (!back.length) {
        exact(event.window.exact);
        break;
      }
      say(`Exact: ${list(event.passes.map((p) => `${on(p.at)} (${p.direction})`))}, ${passCount(event.passes.length)}`);
      // Several stretches can meet one long contact; only one that holds a backwards pass changes it (ADR-392).
      const held = event.backwards.filter((s) => back.some((p) => s.start.getTime() <= p.at.getTime() && p.at.getTime() <= s.end.getTime()));
      if (held.length) say(`${body} goes backwards: ${list(held.map((s) => `from ${on(s.start)} to ${on(s.end)}`))}`);
      break;
    }
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
  const facts = eventFacts(input.event, input.brief.chart, blind, input);
  const user = [
    instructions.trim(),
    ...(blind ? ["", ...BLIND_RULES] : []),
    ...(input.passed ? ["", ...PASSED_RULES] : []),
    ...(input.age < CHILD_UNDER ? ["", ...childRules(input.age)] : []),
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
