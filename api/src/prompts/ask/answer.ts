/**
 * Ask's second call (reading 12): the text, and the ids of the cards to show
 * under it. The cards are what the server's tools computed. Their dates and
 * orbs are the only ones the text may use, and a quote card's words are put
 * in by the server, word for word, so the model reads a passage and never
 * writes one (ADR-213). The text answers to the readings' three blocks
 * (annex rows 44 to 46): a date or degree nothing computed, a life event
 * foretold, a do or a don't. A dignity word or a copied scene only warns,
 * as in every product (ADR-385).
 */
import { z } from "zod/v4";
import type { Tone } from "@workspace/engine";
import { hasHorizon } from "../../lib/chartCalculation.js";
import type { ChartBrief } from "../brief.js";
import { explainChecks, fixed, type Check, type Validated } from "../checks.js";
import { DATA_CLOSE, DATA_LABELS, DATA_OPEN, dataBlock, quoteBlocks, restoreBlocks } from "../data.js";
import { semicolonsToFullStops } from "../pair/shapes.js";
import { blockingChecks, type AllowedFacts } from "../timeline/index.js";
import { type AskContext, type AskReport, messageBlock, namesIn, readerBlock, todayLine } from "./plan.js";

/** One sky event on a card: the engine's words, its days in the reader's zone (reading 4). */
export interface AskEvent {
  kind: "contact" | "retrograde" | "eclipse";
  /** The engine's plain headline, which names no aspect. */
  headline: string;
  /** The facts line's two parts, "Saturn on your Ascendant" and "1st house"; the house is null without a birth time. */
  sky: string;
  house: string | null;
  tone: Tone | null;
  /** Its whole window, first and last day, YYYY-MM-DD: a retrograde's two stations, an eclipse's one day twice. */
  from: string;
  to: string;
  /** The days it is exact, in order; empty when it never is. */
  exact: string[];
  /** Its distance from exact on the card's day, in degrees, while it is in orb; null otherwise. */
  orb: number | null;
}

/** A life cycle on the reader's chart, as Life shows it, its days in the reader's zone. */
export interface AskCycle {
  /** The engine's CYCLE_WORDS name and plain word. */
  name: string;
  word: string;
  /** Whole years at its first exact pass. */
  age: number;
  from: string;
  to: string;
  exact: string[];
  passes: number;
  /** Its window closed before today. */
  past: boolean;
}

/**
 * What one tool computed, as a card the answer may show. `id` is short and
 * unique in the call, like c1. A person and a quote's report are named by
 * the ids the call lists them under, so their typed names stay in blocks.
 */
export type AskAnswerCard =
  | { id: string; kind: "day"; date: string; moon: { sign: string; phase: string }; events: AskEvent[] }
  | { id: string; kind: "window"; from: string; to: string; days: { date: string; tone: Tone | null }[] }
  | { id: string; kind: "cycle"; cycle: AskCycle }
  | { id: string; kind: "quote"; report: string; section: string; text: string }
  | { id: string; kind: "person"; person: string; date: string; events: AskEvent[] };

export interface AskAnswerInput extends AskContext {
  /** The reader's chart brief, their name already in its block; its chart is what the text's natal degrees are checked against. */
  brief: ChartBrief;
  /** What the plan's tools computed, in the order they ran. */
  cards: AskAnswerCard[];
}

/** A brief written without a horizon is blind, whatever the flag says (R-4.6). */
const blindOf = (input: AskAnswerInput): boolean => input.blind || input.brief.horizon === "unknown";

/** At most four cards under one answer, so the text stays the answer and the cards its evidence. */
export const CARDS_MAX = 4;

/** Free ids for the static shape; the call's own ids where it offers cards; none where it offers none. */
function answerSchema(cardIds: readonly string[] | null) {
  const id = cardIds?.length ? z.enum(cardIds as [string, ...string[]]) : z.string();
  return z.object({
    text: z.string().describe("the answer, at most 150 words, in one to three short paragraphs split by a blank line"),
    cards: z.array(id).max(cardIds === null || cardIds.length ? CARDS_MAX : 0).describe("the ids of the cards the text talks about, in the order it talks about them."),
  });
}

/** The answer's shape with free ids. Each call sends `answerSchemaFor`, which allows only the cards it offers. */
export const AskAnswerSchema = answerSchema(null);
export type AskAnswer = z.infer<typeof AskAnswerSchema>;

export function answerSchemaFor(input: Pick<AskAnswerInput, "cards">): z.ZodType<AskAnswer> {
  return answerSchema(input.cards.map((c) => c.id)) as unknown as z.ZodType<AskAnswer>;
}

/** 150 words is about 200 tokens: the cap leaves room for twice that and the card ids, so no answer is cut mid-string. */
export const ANSWER_MAX_TOKENS = 700;

/** The editable instructions, the `ask:answer:user` row. Everything after them is assembled in code. */
export const ASK_ANSWER_INSTRUCTIONS = `THE ANSWER. Answer the reader's message from the cards below, the chart brief and the conversation. Then name the cards to show under your text.

- Start with the answer itself, in the reader's own life. Then say why: what touched their chart, and how astrology reads it.
- Use only the dates, orbs, ages, signs and houses that the cards and the brief give, as they give them. If no card holds a date, write none.
- Name days by their dates, like "5 to 11 October", never as "tomorrow", "next week" or "this month", and never a season, a holiday or a clock time. The answer stays in the thread and is read again later.
- Name a planet, a point, a house or a cycle once, inside a sentence, where it first matters. Say what it means in plain words in the next sentence, like "Saturn is crossing your Ascendant. It's a time when you take yourself more seriously." Then give a moment from an ordinary day that they could check.
- Say how astrology reads a time, never what will happen. Never say what someone else will do, think or feel.
- Asked to choose, or whether a time is good for something, give astrology's reading of those dates and why. Then leave the choice with the reader in one plain sentence.
- When the question is about someone and a card quotes the Compatibility report about the two of them, start from what that card says.
- A quote card shows a passage from a report word for word, under your text. Point to it in your own words, like "your Compatibility report says how the two of you argue". Never copy its words.
- Each idea you offer gets one everyday example, framed as an option, in words like "for example, you could". Keep the example to one small moment from a normal day.
- Never give an order, not even a small one like "See below" or "Think back". Point to a card in a plain statement, like "The card below shows each day."
- The Moon's sign and phase come only from a day card.
- If the cards show nothing touching their chart, say so plainly. A quiet time is an answer too.
- If the reader asks about someone you can't look at, answer from the reader's own chart.
- If a question needs a birth time and BIRTH TIME reads unknown, say so in one plain sentence.
- At most 150 words, in one to three short paragraphs split by a blank line. Fewer when the question is simple.
- cards: the ids of the cards your text talks about, in the order it talks about them, at most four. Leave out a card your text doesn't use.`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "18 September 2026": the form a reader reads and the text copies. */
export function dayWords(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  if (!match || !month) throw new RangeError(`a card's day must be YYYY-MM-DD, got ${ymd}`);
  return `${Number(match[3])} ${month} ${match[1]}`;
}

/** An orb as the contact card under the answer prints it, to two decimals (reading 20), so the text and the card agree. */
export function orbWords(orb: number): string {
  return `${Math.abs(orb).toFixed(2)}°`;
}

function daysWords(days: readonly string[]): string {
  const words = days.map(dayWords);
  return words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

function eventLine(e: AskEvent): string {
  const head = `- "${e.headline}": ${e.sky}${e.house ? `, ${e.house}` : ""}. Tone: ${e.tone ?? "none"}.`;
  switch (e.kind) {
    case "contact": {
      const exact = e.exact.length ? ` Exact on ${daysWords(e.exact)}.` : " Never exact.";
      const orb = e.orb === null ? "" : ` ${orbWords(e.orb)} from exact that day.`;
      return `${head} In orb from ${dayWords(e.from)} to ${dayWords(e.to)}.${exact}${orb}`;
    }
    case "retrograde":
      return `${head} Turns back on ${dayWords(e.from)} and forward again on ${dayWords(e.to)}.`;
    case "eclipse":
      return `${head} On ${dayWords(e.from)}.`;
  }
}

/** A window's days as runs of one tone, so six months read as a few lines. */
function toneRuns(days: readonly { date: string; tone: Tone | null }[]): string[] {
  const runs: { from: string; to: string; tone: Tone | null }[] = [];
  for (const d of days) {
    const last = runs[runs.length - 1];
    if (last && last.tone === d.tone) last.to = d.date;
    else runs.push({ from: d.date, to: d.date, tone: d.tone });
  }
  return runs.map((r) => `- ${r.from === r.to ? dayWords(r.from) : `${dayWords(r.from)} to ${dayWords(r.to)}`}: ${r.tone ?? "quiet"}`);
}

function cycleLine(c: AskCycle): string {
  const passes = c.passes === 1 ? "one pass" : `${c.passes} passes`;
  const exact = c.exact.length ? `exact on ${daysWords(c.exact)}` : "never exact";
  return `${c.name} (${c.word.toLowerCase()}), at age ${c.age}: ${passes}, ${exact}, in orb from ${dayWords(c.from)} to ${dayWords(c.to)}. ${c.past ? "It has passed." : "It hasn't passed yet."}`;
}

/** A passage masked against the names of the report it comes from (ADR-240): one name in a block, a pair's two as A and B. */
function passageBlocks(text: string, report: AskReport | undefined): string {
  const names = report?.names ?? [];
  if (names.length === 2) return quoteBlocks(text, { a: names[0], b: names[1] });
  return quoteBlocks(text, { name: names[0] ?? "" });
}

function cardLines(card: AskAnswerCard, input: AskAnswerInput): string[] {
  switch (card.kind) {
    case "day":
      return [
        `${card.id} · a day: ${dayWords(card.date)}`,
        `The Moon that day: in ${card.moon.sign}, ${card.moon.phase}.`,
        ...(card.events.length ? card.events.map(eventLine) : ["Nothing touched the reader's chart that day."]),
      ];
    case "window":
      return [`${card.id} · each day's tone, ${dayWords(card.from)} to ${dayWords(card.to)}`, ...toneRuns(card.days)];
    case "cycle":
      return [`${card.id} · a life cycle`, cycleLine(card.cycle)];
    case "quote": {
      const report = input.reports.find((r) => r.id === card.report);
      const pair = report?.names.length === 2;
      return [
        `${card.id} · a passage from ${card.report}, section "${card.section}", shown word for word under your text`,
        passageBlocks(card.text, report),
        ...(pair ? [`A and B in this passage stand for the two names ${card.report} is about, in the order listed. Write the names, never the letters.`] : []),
      ];
    }
    case "person": {
      const person = input.people.find((p) => p.id === card.person);
      return [
        `${card.id} · ${card.person}'s day: ${dayWords(card.date)}`,
        ...(person ? [dataBlock("name", person.name)] : []),
        `These lines are about ${card.person}'s chart, so "your" in them means theirs.`,
        ...(card.events.length ? card.events.map(eventLine) : ["Nothing touched their chart that day."]),
      ];
    }
  }
}

function cardsBlock(input: AskAnswerInput): string[] {
  if (!input.cards.length) return ["WHAT THE TOOLS FOUND: nothing. Answer from the chart brief and the conversation."];
  return ["WHAT THE TOOLS FOUND (the cards you may show, by id)", ...input.cards.flatMap((c) => [...cardLines(c, input), ""])].slice(0, -1);
}

const ANSWER_CHECK = "Before you answer, check the text: no semicolons, no em dashes, no order, no quotation from a report, no day counted from today, and no date or orb the cards and the brief don't give.";

/** The answer's user turn: its instructions, the reader, the brief, the day, the cards, then the conversation and the message. */
export function answerUser(input: AskAnswerInput, instructions: string): string {
  return [
    instructions.trim(),
    "",
    ...readerBlock({ ...input, blind: blindOf(input) }),
    "",
    "CHART BRIEF",
    input.brief.text,
    "",
    todayLine(input.today),
    "",
    ...cardsBlock(input),
    "",
    ...messageBlock(input),
    "",
    ANSWER_CHECK,
  ].join("\n");
}

const noon = (ymd: string): Date => new Date(`${ymd}T12:00:00Z`);

function eventDays(events: readonly AskEvent[]): string[] {
  return events.flatMap((e) => [e.from, e.to, ...e.exact]);
}

/**
 * What the text may name: every day a card holds and today, at midday UTC so
 * the readings' day either side covers the reader's zone, and every orb a card
 * holds with the natal places the brief was written from.
 */
export function answerFacts(input: AskAnswerInput): AllowedFacts {
  const days: string[] = [input.today];
  const degrees: number[] = [];
  for (const card of input.cards) {
    switch (card.kind) {
      case "day":
      case "person":
        days.push(card.date, ...eventDays(card.events));
        for (const e of card.events) if (e.orb !== null) degrees.push(Math.abs(e.orb));
        break;
      case "window":
        days.push(card.from, card.to, ...card.days.map((d) => d.date));
        break;
      case "cycle":
        days.push(card.cycle.from, card.cycle.to, ...card.cycle.exact);
        break;
      case "quote":
        break;
    }
  }
  const chart = input.brief.chart;
  for (const p of Object.values(chart.planets)) degrees.push(p.degree, p.absoluteDegree);
  if (hasHorizon(chart)) for (const a of [chart.angles.ascendant, chart.angles.midheaven]) degrees.push(a.degree, a.absoluteDegree);
  return { instants: days.map(noon), degrees };
}

const MARKERS = new RegExp(`\\s*(?:${[...DATA_LABELS.map(DATA_OPEN), DATA_CLOSE].map((m) => m.replace(/[<>]/g, "\\$&")).join("|")})\\s*`, "g");

/** The readings' messages name THE EVENT; Ask's prompt calls the same thing the cards, and a retry reads its own prompt's words. */
const inAskWords = (c: Check): Check => ({ ...c, message: c.message.replace("THE EVENT does not list", "no card or the brief gives") });

/**
 * The answer as the reader gets it, and every check that fired: a copied name
 * block read back as the name, a copied marker taken out (row 48), a
 * semicolon made a full stop (row 41), the cards cut to the ones offered,
 * each once, the readings' three blocks on the text (rows 44 to 46), and the
 * plain-words checks, which warn and never block (ADR-385).
 */
export function checkAskAnswer(output: AskAnswer, input: AskAnswerInput): Validated<AskAnswer> {
  const checks: Check[] = [];
  let markers = 0;
  const unmarked = restoreBlocks(output.text).replace(MARKERS, (m: string, at: number, whole: string) => {
    markers += 1;
    const before = whole.slice(0, at);
    const after = whole.slice(at + m.length);
    return !before || !after || /[\s(“"‘]$/.test(before) || /^[\s.,!?;:)”"’]/.test(after) ? "" : " ";
  }).trim();
  if (markers) checks.push(fixed("chk-48", `text: ${markers} data marker(s) copied into the text taken out`));
  const stops = semicolonsToFullStops(unmarked);
  if (stops.replaced) checks.push(fixed("chk-41", `text: ${stops.replaced} semicolon(s) became full stops`));
  const offered = new Set(input.cards.map((c) => c.id));
  const cards = [...new Set(output.cards)].filter((id) => offered.has(id)).slice(0, CARDS_MAX);
  checks.push(...blockingChecks(stops.text, answerFacts(input), "text", namesIn(input)).map(inAskWords));
  checks.push(...explainChecks({ text: stops.text }));
  return { output: { text: stops.text, cards }, checks };
}
