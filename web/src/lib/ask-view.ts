/**
 * Ask's panel as words and data (ADR-213, 263; readings 13 to 16), pure so a
 * node test pins them: what a message may send, the line under the box, an
 * answer's paragraphs, a thread as a send answers it, a refusal as one line,
 * and each computed card as Timeline's own pieces draw it (ADR-172). Every date
 * and degree on a card is one the API sent; its days are the reader's, in the
 * zone the API read them in (reading 4), printed in their language's order
 * with no clock time.
 */
import type { Tone } from "@workspace/engine";
import type {
  AskCard,
  AskChoice,
  AskMessage,
  AskThread,
  AskUsage,
  LifeCycleView,
  SendAskBody,
  TimelineEvent,
} from "@workspace/api-client-react";
import type { DateOrder } from "@/lib/date-entry";
import type { CycleView } from "@/lib/life-view";
import { PERSONAL_REPORT } from "@/lib/product";
import { refusalLine } from "@/lib/refusals";
import {
  dayIn,
  dayMonth,
  factsLine,
  fullDate,
  lastsLine,
  nearDate,
  weekdayOf,
  type ContactSpan,
  type ContactView,
  type DayView,
} from "@/lib/timeline-view";

/** `SendAskBody.text`'s bound. */
export const ASK_TEXT_MAX = 500;

/** From here the box says how much room is left, so a long question is never cut without warning. */
export const ASK_TEXT_WARN = 450;

/** A window's first five weeks show at once; six months of day cells would bury the answer above them. */
export const WINDOW_SHOWN = 35;

const NB = "\u00a0";
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** What the box may send: its words trimmed, 1 to 500 characters, else nothing. */
export function askText(draft: string): string | null {
  const text = draft.trim();
  return text.length >= 1 && text.length <= ASK_TEXT_MAX ? text : null;
}

/** A typed message, with the report page it was sent from (reading 16). */
export function textBody(text: string, reportId?: string): SendAskBody {
  return reportId ? { text, reportId } : { text };
}

/** A tapped choice, never with text: the server reads it from the message that offered it. */
export function choiceBody(choiceId: string, reportId?: string): SendAskBody {
  return reportId ? { choiceId, reportId } : { choiceId };
}

/** How much room the box has left once a question is long, else null. */
export function roomLine(draft: string): string | null {
  if (draft.length < ASK_TEXT_WARN) return null;
  const left = Math.max(0, ASK_TEXT_MAX - draft.length);
  return `${left} ${left === 1 ? "character" : "characters"} left`;
}

/** An answer's paragraphs, up to three split by a blank line; the words inside each stay as Ask gave them. */
export function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** "1 November", or "November 1" where the month comes first: the day the count starts again. */
export function resetDay(resetsOn: string, order: DateOrder): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(resetsOn);
  const month = match ? MONTH_NAMES[Number(match[2]) - 1] : undefined;
  if (!match || !month) return resetsOn;
  const day = Number(match[3]);
  return order === "dmy" ? `${day}${NB}${month}` : `${month}${NB}${day}`;
}

/**
 * The cap's line in the API's own words (`capLine` in Ask's fixed lines), for
 * a panel opened at the cap: no refusal has carried the API's line yet, and
 * the reader should read the same words either way.
 */
export function capLine(resetsOn: string, order: DateOrder): string {
  return `You've used all your Ask messages for this month. They come back on ${resetDay(resetsOn, order)}. Everything else in Timeline still works.`;
}

/** The count the panel shows: the thread's once it has been read, since a send answers it; until then the access answer's. */
export function usageOf(thread: AskThread | undefined, access: AskUsage | null | undefined): AskUsage | null {
  return thread?.usage ?? access ?? null;
}

/** A 429 `ask_cap` the panel has been answered with: the API's line and the day the count starts again. */
export interface CapNote {
  line: string;
  resetsOn: string;
}

/**
 * The line always under the box (ADR-263): what's left this month, or at the
 * cap its line and date, the API's when a send was refused, else the same
 * words from the count. Null only while no count has come.
 */
export function usageLine(usage: AskUsage | null, cap: CapNote | null, order: DateOrder): { line: string; capped: boolean } | null {
  if (cap) return { line: cap.line, capped: true };
  if (!usage) return null;
  if (usage.left <= 0) return { line: capLine(usage.resetsOn, order), capped: true };
  return { line: `${usage.left} left this month`, capped: false };
}

export const NO_TIMELINE_LINE = "Ask is part of Timeline. This account doesn't have Timeline right now.";
export const NO_REPORT_LINE = `Ask reads your chart from your own ${PERSONAL_REPORT}. You don't have one yet.`;
export const NOT_TAKEN_LINE = "Ask couldn't take that message. Try asking it another way.";
export const NOT_SENT_LINE = "Your message didn't send. Try again in a moment.";

export type SendRefusal = { kind: "cap"; cap: CapNote } | { kind: "line"; line: string };

/**
 * A send the API refused, or one that never reached it, as the one line the
 * panel shows. A choice that closed comes with the API's own line for the
 * reader; any other 400 may carry a validator's words, which a reader never reads.
 */
export function sendRefusal(error: unknown, now: Date = new Date()): SendRefusal {
  const failed = (error ?? {}) as { status?: unknown; data?: unknown };
  const body = failed.data && typeof failed.data === "object" ? (failed.data as Record<string, unknown>) : {};
  const said = typeof body.message === "string" && body.message ? body.message : null;
  if (body.error === "ask_cap" && said && typeof body.resetsOn === "string") {
    return { kind: "cap", cap: { line: said, resetsOn: body.resetsOn } };
  }
  const limit = refusalLine(error, now);
  if (limit) return { kind: "line", line: limit };
  if (body.error === "no_timeline") return { kind: "line", line: NO_TIMELINE_LINE };
  if (body.error === "no_personal_report") return { kind: "line", line: NO_REPORT_LINE };
  if (body.error === "choice_not_offered" && said) return { kind: "line", line: said };
  return { kind: "line", line: failed.status === 400 ? NOT_TAKEN_LINE : NOT_SENT_LINE };
}

/**
 * The thread once a send is answered. A whole thread back, which holds
 * messages the panel already has, replaces it, so the 31 days stay the
 * server's; the new messages alone go on the end.
 */
export function mergeThread(current: AskThread | undefined, answer: AskThread): AskThread {
  if (!current?.messages.length) return answer;
  const ids = new Set(answer.messages.map((m) => m.id));
  const whole = current.messages.some((m) => ids.has(m.id));
  return { messages: whole ? answer.messages : [...current.messages, ...answer.messages], usage: answer.usage };
}

/** Only the last message's choices take a tap: the server reads a choice from the message it last offered. */
export function openChoices(messages: readonly AskMessage[]): AskChoice[] {
  const last = messages[messages.length - 1];
  return last?.role === "ask" ? last.choices : [];
}

/** A sky event on a day card. An eclipse far from every natal point has no tone (MB-188), so it carries no tone word. */
export type EventView = Omit<ContactView, "tone"> & { tone: Tone | null };

/** An eclipse is one moment, the day it peaks. */
export const ONE_DAY = "One day";

interface DaySpan {
  start: string;
  end: string;
}

function spansIn(event: TimelineEvent, zone: string): DaySpan[] {
  const spans = event.spans.length ? event.spans : [{ start: event.start, end: event.end }];
  return spans.map((s) => ({ start: dayIn(s.start, zone), end: dayIn(s.end, zone) }));
}

/** The stretch in orb on the day, else the next one, else the last; and when it comes back after it. */
function spanOn(spans: readonly DaySpan[], day: string): ContactSpan {
  let i = spans.findIndex((s) => s.start <= day && day <= s.end);
  if (i < 0) i = spans.findIndex((s) => s.start > day);
  if (i < 0) i = spans.length - 1;
  return { end: spans[i].end, back: spans[i + 1]?.start ?? null };
}

const EASES_TODAY = "Eases today";

/** A card in the thread is read again on later days, so where Timeline's own card says "today" it says the date. */
function lastsOn(span: ContactSpan, day: string, order: DateOrder): string {
  const line = lastsLine(span, day, order);
  return line.startsWith(EASES_TODAY) ? `Until ${nearDate(span.end, day, order)}${line.slice(EASES_TODAY.length)}` : line;
}

/** The facts line: a contact's as Timeline prints it; a retrograde its two stations and an eclipse its day, never "never exact". */
function factsOn(event: TimelineEvent, exact: readonly string[], day: string, zone: string, order: DateOrder): string {
  if (event.kind === "contact") return factsLine(event.facts, exact, day, order, event.orbNow);
  const parts = [event.facts.sky];
  if (event.facts.house) parts.push(event.facts.house);
  if (event.kind === "retrograde") {
    parts.push(`${nearDate(dayIn(event.start, zone), day, order)} to ${nearDate(dayIn(event.end, zone), day, order)}`);
  } else {
    parts.push(nearDate(exact[0] ?? dayIn(event.start, zone), day, order));
  }
  return parts.join(" · ");
}

/** One event as its card shows it on `day`, the day the card is about. */
export function eventView(event: TimelineEvent, day: string, zone: string, order: DateOrder): EventView {
  const exact = event.exact.map((at) => dayIn(at, zone));
  return {
    key: event.key,
    tone: event.tone,
    headline: event.headline,
    line: event.line,
    lasts: event.kind === "eclipse" ? ONE_DAY : lastsOn(spanOn(spansIn(event, zone), day), day, order),
    facts: factsOn(event, exact, day, zone, order),
  };
}

/** A life cycle as Life's card draws it. The API sends no round, so its ring shows the birth point and where the cycle falls. */
export function cycleView(cycle: LifeCycleView, today: string, zone: string): CycleView {
  return {
    key: cycle.key,
    id: cycle.id,
    name: cycle.name,
    word: cycle.word,
    age: cycle.age,
    exact: cycle.exact.map((at) => dayIn(at, zone)),
    start: dayIn(cycle.start, zone),
    end: dayIn(cycle.end, zone),
    repeats: cycle.repeats,
    today,
    progress: null,
    last: null,
  };
}

/** "Fri 18 Sep 2026", or "Fri Sep 18, 2026" where the month comes first: a card's day, with its year, since the thread is reread. */
export function cardDay(day: string, order: DateOrder): string {
  return `${weekdayOf(day)}${NB}${fullDate(day, order)}`;
}

/** "5 Oct to 31 Oct 2026": the year once when both ends share it. */
export function rangeWords(from: string, to: string, order: DateOrder): string {
  if (from.slice(0, 4) !== to.slice(0, 4)) return `${fullDate(from, order)} to ${fullDate(to, order)}`;
  return order === "ymd" ? `${fullDate(from, order)} to ${dayMonth(to, order)}` : `${dayMonth(from, order)} to ${fullDate(to, order)}`;
}

export type AskCardView =
  | { kind: "day"; title: string; moon: string; quiet: string | null; events: EventView[] }
  | { kind: "person"; title: string; quiet: string | null; events: EventView[] }
  | { kind: "window"; title: string; days: DayView[] }
  | { kind: "cycle"; cycle: CycleView }
  | { kind: "quote"; text: string; source: string };

/**
 * A computed card as Timeline's pieces draw it (ADR-172): a day or a person's
 * day as contact cards, a window as day cells, a cycle as Life's card, a quote
 * as the report's evidence. `today` is the reader's, which only a cycle's
 * status reads; a day card counts from its own day.
 */
export function cardView(card: AskCard, today: string, zone: string, order: DateOrder): AskCardView {
  switch (card.kind) {
    case "day": {
      const moon = card.moon.phase ? `Moon in ${card.moon.sign}, ${card.moon.phase}` : `Moon in ${card.moon.sign}`;
      return {
        kind: "day",
        title: `Your chart · ${cardDay(card.date, order)}`,
        moon,
        quiet: card.events.length ? null : "Nothing touches your chart that day.",
        events: card.events.map((event) => eventView(event, card.date, zone, order)),
      };
    }
    case "person": {
      const who = card.name.trim();
      return {
        kind: "person",
        title: `${who ? `${who}'s` : "Their"} chart · ${cardDay(card.date, order)}`,
        quiet: card.events.length ? null : `Nothing touches ${who ? `${who}'s` : "their"} chart that day.`,
        events: card.events.map((event) => eventView(event, card.date, zone, order)),
      };
    }
    case "window":
      return {
        kind: "window",
        title: rangeWords(card.from, card.to, order),
        days: card.days.map((d) => ({ date: d.date, tones: d.tone ? [d.tone] : [] })),
      };
    case "cycle":
      return { kind: "cycle", cycle: cycleView(card.cycle, today, zone) };
    case "quote":
      return { kind: "quote", text: card.text, source: card.section ? `${card.reportName} · ${card.section}` : card.reportName };
  }
}
