/**
 * Ask's first call on a message (reading 12): what happens next. It writes no
 * answer. It picks an intent, the tools the server computes from the reader's
 * own chart, and, to ask back, one short question with choices whose labels
 * the server writes. No function calling: the tools are ours.
 *
 * Every name the prompt holds sits in a data block (ADR-202): the reader's,
 * each report's and each person's. Ask's earlier replies are model text and go
 * back masked (ADR-240). The reader's own words arrive on one line under their
 * heading, so they can open no block and start no line of the prompt.
 */
import { z } from "zod/v4";
import { CYCLE_WORDS, type CycleId } from "@workspace/engine";
import { dataBlock, dataValue, maskNames } from "../data.js";

/** A report the reader can read (`natalReportAccess`, `pairReadable`), as this call names it. */
export interface AskReport {
  /** Short and unique in the call, like r1; the server maps it back to the report. */
  id: string;
  kind: "personal" | "compatibility";
  /** Whose report it is, as typed: one name for a Personal report, two for a Compatibility report. */
  names: string[];
  /** Its sections as the report shows them: the id a quote asks for and the title the reader sees. */
  sections: { id: string; title: string }[];
}

/** Someone the reader can ask about, only through a Compatibility report they can read (reading 14). */
export interface AskPerson {
  /** Short and unique in the call, like p1. */
  id: string;
  /** Their name as typed in that report. */
  name: string;
  /** The id of the report the reader sees them through. */
  report: string;
}

export interface AskTurn {
  role: "reader" | "ask";
  text: string;
}

/** What both calls read about the reader and the message. */
export interface AskContext {
  /** What the reader typed, at most 500 characters; empty when they tapped a choice. */
  message: string;
  /** The choice the reader tapped, as the last ask back offered it. */
  tapped?: AskPlanChoice | null;
  /** The thread so far, oldest first. The prompt keeps the last eight. */
  history: AskTurn[];
  /** Today in the reader's zone, YYYY-MM-DD (reading 4). */
  today: string;
  /** The reader's name as typed on their own profile. */
  name: string;
  /** No birth time: no angle, no house and no natal Moon (R-4.6). */
  blind: boolean;
  reports: AskReport[];
  people: AskPerson[];
  /** The report the message was sent from, by its id here, only when the reader can read it (reading 16). */
  fromReport?: string | null;
}

export type AskPlanInput = AskContext;

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const ymd = (what: string) => z.string().regex(YMD).describe(`${what}, YYYY-MM-DD`);
const CYCLE_IDS = Object.keys(CYCLE_WORDS) as [CycleId, ...CycleId[]];

/** An id from the call's own list when there is one, so strict output can name no other; a free id for the static shape. */
const idOf = (ids: readonly string[] | null, what: string) =>
  (ids ? z.enum(ids as [string, ...string[]]) : z.string()).describe(what);

type Ids = readonly string[] | null;

function toolSchema(reports: Ids, people: Ids) {
  const options = [
    z.object({ tool: z.literal("day"), date: ymd("the day") })
      .describe("what touches the reader's chart that day, with the Moon's sign and phase"),
    z.object({ tool: z.literal("window"), from: ymd("the first day"), to: ymd("the last day") })
      .describe("each day's tone from the first day to the last, at most 182 days"),
    z.object({ tool: z.literal("cycle"), cycle: z.enum(CYCLE_IDS), which: z.enum(["last", "next"]) })
      .describe("one of the reader's life cycles: the last one to start before today, or the next one to end after it"),
    z.object({ tool: z.literal("reports") })
      .describe("the reports the reader can read and the sections in each"),
    ...(reports === null || reports.length
      ? [z.object({ tool: z.literal("quote"), report: idOf(reports, "a report id from REPORTS"), section: z.string().describe("a section id from that report's list") })
        .describe("a passage from that section, shown word for word")]
      : []),
    ...(people === null || people.length
      ? [z.object({ tool: z.literal("person"), person: idOf(people, "a person id from PEOPLE"), date: ymd("the day asked about") })
        .describe("what touched that person's chart on that day")]
      : []),
  ];
  return z.discriminatedUnion("tool", options as unknown as [typeof options[0], ...typeof options]);
}

function choiceSchema(reports: Ids, people: Ids) {
  const options = [
    z.object({ kind: z.literal("date"), date: ymd("the day") }),
    z.object({ kind: z.literal("window"), from: ymd("the first day"), to: ymd("the last day") }),
    ...(reports === null || reports.length ? [z.object({ kind: z.literal("report"), report: idOf(reports, "a report id from REPORTS") })] : []),
    ...(people === null || people.length ? [z.object({ kind: z.literal("person"), person: idOf(people, "a person id from PEOPLE") })] : []),
  ];
  return z.discriminatedUnion("kind", options as unknown as [typeof options[0], ...typeof options]);
}

function planSchema(reports: Ids, people: Ids) {
  return z.object({
    intent: z.enum(["answer", "ask_back", "harm", "off_topic"]),
    tools: z.array(toolSchema(reports, people)).max(4).describe("answer only: what the server computes for the answer, empty otherwise."),
    question: z.string().describe("ask_back only: one short question of at most 12 words, empty otherwise"),
    choices: z.array(choiceSchema(reports, people)).max(4).describe("ask_back only: the likely answers to the question, the likeliest first, empty otherwise."),
  });
}

/** The plan's shape with free ids. Each call sends `planSchemaFor`, which allows only the ids it lists. */
export const AskPlanSchema = planSchema(null, null);
export type AskPlan = z.infer<typeof AskPlanSchema>;
export type AskIntent = AskPlan["intent"];
export type AskPlanTool = AskPlan["tools"][number];
export type AskPlanChoice = AskPlan["choices"][number];

/** The strict shape one call sends: a report or a person tool only when the reader has one, and only their ids. */
export function planSchemaFor(input: Pick<AskContext, "reports" | "people">): z.ZodType<AskPlan> {
  return planSchema(input.reports.map((r) => r.id), input.people.map((p) => p.id)) as unknown as z.ZodType<AskPlan>;
}

/** The plan writes a short reply, never prose: room for four tools, four choices and a question, twice over. */
export const PLAN_MAX_TOKENS = 600;

/** The editable instructions, the `ask:plan:user` row. Everything after them is assembled in code. */
export const ASK_PLAN_INSTRUCTIONS = `THE PLAN. Read the reader's message and the conversation, then decide what happens next. You write no answer here. You choose the intent, the tools the server runs and, only when you must ask back, one short question with its choices.

Intent:
- "answer": you can answer from the reader's chart, their reports or their timeline. List the tools that fetch what the answer needs.
- "ask_back": the answer depends on a date, a stretch of time, a person or a report that the message and the conversation don't settle. Ask one short question and offer the likely choices.
- "harm": the message is about someone being hurt or in danger, or about the reader hurting themselves or someone else, even if it also asks about the chart. The reader gets a fixed reply with where to get help.
- "off_topic": the message isn't about the reader's chart, reports or timeline, or it wants a diagnosis or medical, legal or money advice. The reader gets a fixed line. A question about how astrology reads a time in their chart is never off topic, even when it touches health, law or money: plan the answer, and the answer leaves the advice out.

Tools. The server computes each one from the reader's own chart. You never work out a date, a degree or a position yourself.
- day: one date. What touches the reader's chart that day, with the Moon's sign and phase.
- window: a first and a last date, at most 182 days apart. How each day in that stretch feels: easy, mixed or intense.
- cycle: one of the reader's life cycles, by its id from LIFE CYCLES, the last one to start or the next one to end.
- quote: a passage from a report in REPORTS, by the report's id and a section id from its list.
- reports: the reports the reader can read and what each covers.
- person: someone from PEOPLE, for one date: what touched their chart that day. Only for someone listed there.
Use up to four tools for "answer" and none for the other intents. A question about the reader's birth chart alone may need none: the answer reads their chart brief.

Asking back. Ask only when the answer would change with the choice. A question about the reader's own week, month or chart needs no asking back: today is the day. One question, at most 12 words, like "Which Friday?" or "Who was it with?". At most four choices, each a date, a window, a person from PEOPLE or a report from REPORTS, the likeliest first. The server writes each choice's label.

Dates are YYYY-MM-DD. Count "today", "last Friday" and "next month" from TODAY with the CALENDAR. A tapped choice answers your last question: plan the answer with it.

When you plan an answer about someone in PEOPLE, named in the message or tapped as a choice, the Compatibility report about the two of them comes first. Make the first tool a quote from the report PEOPLE lists them through, from the section whose title fits the question best. Then add what else the answer needs, like their day.

Someone the reader names who isn't in PEOPLE can't be looked at. Plan the answer from the reader's own chart.

When the message was sent from a report, "this" and "this chapter" mean that report.`;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_MS = 86_400_000;

function utcDay(ymd: string): Date {
  if (!YMD.test(ymd)) throw new RangeError(`today must be YYYY-MM-DD, got ${ymd}`);
  const at = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== ymd) throw new RangeError(`today is not a calendar day: ${ymd}`);
  return at;
}

/** "Thursday 1 October 2026 (2026-10-01)": the words a model reads a weekday from, beside the form it writes. */
export function todayLine(today: string): string {
  const at = utcDay(today);
  return `TODAY: ${WEEKDAYS[at.getUTCDay()]} ${at.getUTCDate()} ${MONTHS[at.getUTCMonth()]} ${at.getUTCFullYear()} (${today})`;
}

/**
 * Two weeks either side of today, Monday to Sunday, so "last Friday" is read
 * off a page instead of counted: a model at no reasoning effort miscounts
 * weekdays, and a wrong day is a whole wrong answer.
 */
export function calendarLines(today: string): string[] {
  const at = utcDay(today);
  const monday = at.getTime() - ((at.getUTCDay() + 6) % 7) * DAY_MS;
  const lines = ["CALENDAR (Monday to Sunday)"];
  for (let week = -2; week <= 2; week++) {
    const days: string[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday + (week * 7 + d) * DAY_MS);
      const iso = day.toISOString().slice(0, 10);
      days.push(`${WEEKDAYS[day.getUTCDay()].slice(0, 3)} ${iso}${iso === today ? " (today)" : ""}`);
    }
    lines.push(days.join(" · "));
  }
  return lines;
}

/** The longest message the contract takes (`SendAskBody.text`). */
export const MESSAGE_MAX = 500;

/**
 * What the reader typed, as the prompt carries it: cleaned as a block's value
 * is, so one line with no control, invisible or marker character, then cut at
 * the contract's 500. A block needs three lines of its own, so one line can
 * neither open nor close one.
 */
export function readerLine(text: string): string {
  return Array.from(dataValue(text, "quote")).slice(0, MESSAGE_MAX).join("").trim();
}

/** Every name the call's prompt holds, so model text going back in is masked against each (ADR-240). */
export function namesIn(input: Pick<AskContext, "name" | "reports" | "people">): string[] {
  const all = [input.name, ...input.reports.flatMap((r) => r.names), ...input.people.map((p) => p.name)];
  return [...new Set(all.map((n) => n.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
}

/** Model text with every typed name the call holds put in a block of its own; masking twice changes nothing. */
export function maskedFor(text: string, names: readonly string[]): string {
  return names.reduce((out, name) => maskNames(out, { name }), text);
}

const HISTORY_KEPT = 8;

function birthTimeLine(blind: boolean): string {
  return blind
    ? "BIRTH TIME: unknown. No Ascendant, no Midheaven, no house, and no contact to the natal Moon."
    : "BIRTH TIME: known.";
}

function reportLines(reports: readonly AskReport[]): string[] {
  if (!reports.length) return ["REPORTS THE READER CAN READ: none."];
  const lines = ["REPORTS THE READER CAN READ"];
  for (const r of reports) {
    lines.push(`${r.id} · ${r.kind === "personal" ? "Personal report" : "Compatibility report"} about`);
    for (const name of r.names) lines.push(dataBlock("name", name));
    lines.push(`sections: ${r.sections.map((s) => `${s.id} (${s.title})`).join(" · ") || "none"}`);
  }
  return lines;
}

function peopleLines(people: readonly AskPerson[]): string[] {
  if (!people.length) return ["PEOPLE THE READER CAN ASK ABOUT: none."];
  const lines = ["PEOPLE THE READER CAN ASK ABOUT (each through a Compatibility report above)"];
  for (const p of people) lines.push(`${p.id}, through ${p.report}:`, dataBlock("name", p.name));
  return lines;
}

/** A tapped choice in words the plan reads: its kind and its value, a person or a report by id. */
export function tappedLine(choice: AskPlanChoice): string {
  switch (choice.kind) {
    case "date":
      return `a date: ${choice.date}`;
    case "window":
      return `a stretch of days: ${choice.from} to ${choice.to}`;
    case "person":
      return `a person: ${choice.person}`;
    case "report":
      return `a report: ${choice.report}`;
  }
}

/** The reader, their reports and the people they can ask about: what stays the same across one reader's messages. */
export function readerBlock(input: AskContext): string[] {
  return [birthTimeLine(input.blind), "", "THE READER", dataBlock("name", input.name), "", ...reportLines(input.reports), "", ...peopleLines(input.people)];
}

/** The conversation and the message, last, since they change with every message. */
export function messageBlock(input: AskContext): string[] {
  const names = namesIn(input);
  const turns = input.history.slice(-HISTORY_KEPT);
  const lines: string[] = [];
  if (input.fromReport) lines.push(`SENT FROM REPORT: ${input.fromReport}`, "");
  lines.push("THE CONVERSATION SO FAR (oldest first)");
  if (!turns.length) lines.push("(none)");
  for (const t of turns) lines.push(t.role === "reader" ? `Reader: ${readerLine(t.text)}` : `Ask: ${maskedFor(t.text, names)}`);
  lines.push("");
  if (input.tapped) lines.push("THE READER TAPPED A CHOICE", tappedLine(input.tapped));
  else lines.push("THE READER'S MESSAGE", readerLine(input.message));
  return lines;
}

function cycleLines(): string[] {
  return ["LIFE CYCLES (ids for the cycle tool)", ...CYCLE_IDS.map((id) => `- ${id}: ${CYCLE_WORDS[id].name}, ${CYCLE_WORDS[id].word.toLowerCase()}`)];
}

const PLAN_CHECK = "Before you answer: dates as YYYY-MM-DD, ids only from the lists above, a quote from the Compatibility report first in an answer about someone in PEOPLE, and the question empty unless you ask back.";

/** The plan's user turn: its instructions, the static lists, the reader, the day, then the conversation and the message. */
export function planUser(input: AskPlanInput, instructions: string): string {
  return [
    instructions.trim(),
    "",
    ...cycleLines(),
    "",
    ...readerBlock(input),
    "",
    todayLine(input.today),
    ...calendarLines(input.today),
    "",
    ...messageBlock(input),
    "",
    PLAN_CHECK,
  ].join("\n");
}
