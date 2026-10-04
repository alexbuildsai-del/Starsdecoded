/**
 * Ask's panel as words and data (R16-28; ADR-213, 263; readings 13 to 16): what a message sends, the line always under
 * the box, an answer's paragraphs, a refusal as one line, the thread after a send, and the cards. The cards hold Mira's
 * and Tomás's sky as the engine computes it from their fixtures, shaped as the API sends it (R16-23), so every date and
 * degree a card prints can be checked against what the API sent (acceptance 1).
 */
import { describe, expect, it } from "vitest";
import {
  CYCLE_WORDS,
  calculateNatalChart,
  dayTone,
  exactHits,
  factsOf,
  hasHorizon,
  headlineOf,
  inEffect,
  lifeCycles,
  longitudeAt,
  natalLongitudes,
  skyEvents,
  type ContactEvent,
  type NatalChartData,
  type SkyEvent,
} from "@workspace/engine";
import type { AskCard, AskMessage, AskThread, AskUsage, LifeCycleView, TimelineEvent } from "@workspace/api-client-react";
import mira from "../../../fixtures/sample-people/mira.json";
import tomas from "../../../fixtures/sample-people/tomas.json";
import type { DateOrder } from "./date-entry";
import { cycleChip, cycleDates, cycleFact, lookBack } from "./life-view";
import { dayIn, dayLabel, dayMonth, fullDate, longDay, monthYear } from "./timeline-view";
import {
  ASK_TEXT_MAX,
  NOT_SENT_LINE,
  NOT_TAKEN_LINE,
  NO_REPORT_LINE,
  NO_TIMELINE_LINE,
  ONE_DAY,
  WINDOW_SHOWN,
  askText,
  capLine,
  cardDay,
  cardView,
  choiceBody,
  cycleView,
  eventView,
  mergeThread,
  openChoices,
  paragraphs,
  rangeWords,
  resetDay,
  roomLine,
  sendRefusal,
  textBody,
  usageLine,
  usageOf,
  type AskCardView,
  type EventView,
} from "./ask-view";

const seen = (text: string) => text.replace(/\u00a0/g, " ");
const ORDERS: DateOrder[] = ["dmy", "mdy", "ymd"];
const LISBON = mira.timezone;
const NEW_YORK = "America/New_York";

// The API as R16-23's server shapes it, from the engine, so the cards read what the API would send.
const MIRA = calculateNatalChart(mira.birthDate, mira.birthTime, mira.latitude, mira.longitude, mira.timezone);
const TOMAS = calculateNatalChart(tomas.birthDate, tomas.birthTime, tomas.latitude, tomas.longitude, tomas.timezone);

const norm = (deg: number) => ((deg % 360) + 360) % 360;
const arc = (a: number, b: number) => {
  const d = norm(a - b);
  return d > 180 ? d - 360 : d;
};
const iso = (at: Date) => at.toISOString();
const ANGLES = { conjunction: 0, square: 90, opposition: 180, trine: 120 } as const;

/** The instant a reader's day begins in their zone. */
function midnight(day: string, zone: string): Date {
  let t = Date.parse(`${day}T00:00:00Z`) - 14 * 3_600_000;
  while (dayIn(new Date(t), zone) < day) t += 15 * 60_000;
  return new Date(t);
}

function nextDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

function natalLon(chart: NatalChartData, target: ContactEvent["target"]): number {
  if (!hasHorizon(chart)) return chart.planets[target as "sun"].absoluteDegree;
  if (target === "ascendant") return chart.angles.ascendant.absoluteDegree;
  if (target === "midheaven") return chart.angles.midheaven.absoluteDegree;
  return chart.planets[target].absoluteDegree;
}

/** Where the planet perfects the contact, the side of a square or trine its window holds. */
function pointOf(chart: NatalChartData, event: ContactEvent): number {
  const base = natalLon(chart, event.target);
  const angle = ANGLES[event.aspect];
  const places = angle === 0 || angle === 180 ? [norm(base + angle)] : [norm(base + angle), norm(base - angle)];
  const at = longitudeAt(event.body, event.window.exact[0] ?? event.window.start);
  return places.reduce((best, place) => (Math.abs(arc(at, place)) < Math.abs(arc(at, best)) ? place : best));
}

/** The stretches in orb, cut where the planet leaves the orb and comes back, as the server cuts them. */
function spansOf(event: ContactEvent, point: number): { start: Date; end: Date }[] {
  const start = event.window.start.getTime();
  const end = event.window.end.getTime();
  const crossings = [norm(point + event.orb), norm(point - event.orb)]
    .flatMap((edge) => exactHits(event.body, edge, event.window.start, event.window.end))
    .map((at) => at.getTime())
    .filter((t) => t - start > 120_000 && end - t > 120_000)
    .sort((a, b) => a - b);
  const marks = [start, ...crossings, end];
  const within = (t: number) => Math.abs(arc(longitudeAt(event.body, new Date(t)), point)) <= event.orb;
  const spans: { start: Date; end: Date }[] = [];
  for (let i = 1; i < marks.length; i++) {
    const [a, b] = [marks[i - 1], marks[i]];
    const q = (b - a) / 4;
    if ([a + q, a + 2 * q, a + 3 * q].filter(within).length < 2) continue;
    const last = spans[spans.length - 1];
    if (last && last.end.getTime() === a) last.end = new Date(b);
    else spans.push({ start: new Date(a), end: new Date(b) });
  }
  return spans;
}

function apiEvent(chart: NatalChartData, event: SkyEvent, on: Date): TimelineEvent {
  const words = { headline: headlineOf(event), facts: factsOf(event), line: null, reading: "none" as const };
  switch (event.kind) {
    case "contact": {
      const point = pointOf(chart, event);
      const orb = Math.abs(arc(longitudeAt(event.body, on), point));
      return {
        key: event.key,
        kind: "contact",
        body: event.body,
        aspect: event.aspect,
        target: event.target,
        houses: event.house === null ? [] : [event.house],
        start: iso(event.window.start),
        end: iso(event.window.end),
        exact: event.window.exact.map(iso),
        spans: spansOf(event, point).map((s) => ({ start: iso(s.start), end: iso(s.end) })),
        orbNow: orb <= event.orb ? Math.round(orb * 100) / 100 : null,
        tone: event.tone,
        ...words,
      };
    }
    case "retrograde":
      return {
        key: event.key,
        kind: "retrograde",
        body: event.body,
        aspect: null,
        target: null,
        houses: [...event.houses],
        start: iso(event.start),
        end: iso(event.end),
        exact: [],
        spans: [{ start: iso(event.start), end: iso(event.end) }],
        orbNow: null,
        tone: event.tone,
        ...words,
      };
    case "eclipse":
      return {
        key: event.key,
        kind: "eclipse",
        body: event.eclipse.kind === "solar" ? "sun" : "moon",
        aspect: null,
        target: event.near?.target ?? null,
        houses: event.house === null ? [] : [event.house],
        start: iso(event.eclipse.at),
        end: iso(event.eclipse.at),
        exact: [iso(event.eclipse.at)],
        spans: [{ start: iso(event.eclipse.at), end: iso(event.eclipse.at) }],
        orbNow: null,
        tone: event.tone,
        ...words,
      };
  }
}

/** Everything on a chart on the reader's day, from their zone's midnight. */
function eventsOn(chart: NatalChartData, day: string, zone: string): TimelineEvent[] {
  const from = midnight(day, zone);
  const to = new Date(midnight(nextDay(day), zone).getTime() - 1);
  return inEffect(skyEvents(chart, from, to), from).map((event) => apiEvent(chart, event, from));
}

/** One sky event by its key, on a day it is in effect. */
function eventByKey(chart: NatalChartData, key: string, day: string, zone: string): TimelineEvent {
  const event = eventsOn(chart, day, zone).find((e) => e.key === key);
  if (!event) throw new Error(`${key} is not on ${day}`);
  return event;
}

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const PHASES = ["new", "waxing crescent", "first quarter", "waxing gibbous", "full", "waning gibbous", "last quarter", "waning crescent"];

function dayCard(day: string, zone: string): AskCard {
  const noon = new Date(`${day}T12:00:00Z`);
  const moon = longitudeAt("moon", noon);
  const elongation = norm(moon - longitudeAt("sun", noon));
  return {
    kind: "day",
    date: day,
    moon: { sign: SIGNS[Math.floor(moon / 30)], phase: PHASES[Math.round(elongation / 45) % 8] },
    events: eventsOn(MIRA, day, zone),
  };
}

function personCard(day: string, zone: string): AskCard {
  return { kind: "person", name: "Tomás", date: day, events: eventsOn(TOMAS, day, zone) };
}

function windowCard(from: string, to: string, zone: string): AskCard {
  const contacts = skyEvents(MIRA, midnight(from, zone), midnight(nextDay(to), zone)).filter((e) => e.kind === "contact");
  const days: { date: string; tone: ReturnType<typeof dayTone> }[] = [];
  for (let day = from; day <= to; day = nextDay(day)) days.push({ date: day, tone: dayTone(inEffect(contacts, midnight(day, zone))) });
  return { kind: "window", from, to, days };
}

const BORN = new Date(MIRA.datetimeUtc);
const CYCLES = lifeCycles(natalLongitudes(MIRA), BORN);

function apiCycle(id: string, nth = 0, now = new Date("2026-10-04T12:00:00Z")): LifeCycleView {
  const cycle = CYCLES.filter((c) => c.id === id)[nth];
  if (!cycle) throw new Error(`Mira has no ${id} number ${nth + 1}`);
  return {
    key: cycle.key,
    id: cycle.id,
    body: cycle.body,
    name: CYCLE_WORDS[cycle.id].name,
    word: CYCLE_WORDS[cycle.id].word,
    age: cycle.age,
    exact: cycle.window.exact.map(iso),
    start: iso(cycle.window.start),
    end: iso(cycle.window.end),
    past: cycle.window.end < now,
    repeats: cycle.repeats,
    passes: cycle.passes,
    reading: "none",
  };
}

const USAGE: AskUsage = { used: 3, left: 47, cap: 50, resetsOn: "2026-11-01" };

function message(id: string, role: AskMessage["role"], text: string, extra: Partial<AskMessage> = {}): AskMessage {
  return { id, role, text, cards: [], choices: [], createdAt: "2026-10-04T09:00:00.000Z", ...extra };
}

describe("what a message sends", () => {
  it("sends the reader's words trimmed, 1 to 500 characters, and nothing else", () => {
    expect(askText("  Why was Friday so tense?\n")).toBe("Why was Friday so tense?");
    expect(askText("")).toBeNull();
    expect(askText(" \n\t ")).toBeNull();
    expect(askText("a".repeat(ASK_TEXT_MAX))).toHaveLength(500);
    expect(askText("a".repeat(ASK_TEXT_MAX + 1))).toBeNull();
  });

  it("carries the report it was asked from, and a tapped choice never carries text", () => {
    expect(textBody("Why?")).toEqual({ text: "Why?" });
    expect(textBody("Why?", "rep_1")).toEqual({ text: "Why?", reportId: "rep_1" });
    expect(choiceBody("c2")).toEqual({ choiceId: "c2" });
    expect(choiceBody("c2", "rep_1")).toEqual({ choiceId: "c2", reportId: "rep_1" });
    expect(choiceBody("c2", "rep_1")).not.toHaveProperty("text");
  });

  it("says how much room is left only once a question is long", () => {
    expect(roomLine("a".repeat(449))).toBeNull();
    expect(roomLine("a".repeat(450))).toBe("50 characters left");
    expect(roomLine("a".repeat(499))).toBe("1 character left");
    expect(roomLine("a".repeat(500))).toBe("0 characters left");
  });
});

describe("the line always under the box", () => {
  it("says what's left this month", () => {
    expect(usageLine(USAGE, null, "dmy")).toEqual({ line: "47 left this month", capped: false });
    expect(usageLine({ ...USAGE, used: 49, left: 1 }, null, "dmy")).toEqual({ line: "1 left this month", capped: false });
  });

  it("at the cap says so with the day it resets, in the API's own words", () => {
    const api = "You've used all your Ask messages for this month. They come back on 1 November. Everything else in Timeline still works.";
    expect(seen(capLine("2026-11-01", "dmy"))).toBe(api);
    expect(seen(capLine("2026-11-01", "mdy"))).toBe(api.replace("1 November", "November 1"));
    expect(usageLine({ ...USAGE, used: 50, left: 0 }, null, "dmy")).toEqual({ line: capLine("2026-11-01", "dmy"), capped: true });
    expect(seen(resetDay("2027-01-01", "ymd"))).toBe("January 1");
    expect(resetDay("next month", "dmy")).toBe("next month");
  });

  it("shows the API's line once a send was refused at the cap, whatever count it held", () => {
    const cap = { line: "The API's cap line.", resetsOn: "2026-11-01" };
    expect(usageLine(USAGE, cap, "dmy")).toEqual({ line: "The API's cap line.", capped: true });
    expect(usageLine(null, cap, "dmy")).toEqual({ line: "The API's cap line.", capped: true });
    expect(usageLine(null, null, "dmy")).toBeNull();
  });

  it("reads the thread's count once it has come, the access answer's until then", () => {
    const thread: AskThread = { messages: [], usage: { ...USAGE, used: 4, left: 46 } };
    expect(usageOf(thread, USAGE)?.left).toBe(46);
    expect(usageOf(undefined, USAGE)?.left).toBe(47);
    expect(usageOf(undefined, null)).toBeNull();
  });
});

describe("an answer's text", () => {
  it("splits up to three paragraphs at blank lines and keeps the words inside each as given", () => {
    expect(paragraphs("One.\n\nTwo.\n\nThree.")).toEqual(["One.", "Two.", "Three."]);
    expect(paragraphs("One.\r\n\r\nTwo.")).toEqual(["One.", "Two."]);
    expect(paragraphs("One.\n  \t\n\nTwo.")).toEqual(["One.", "Two."]);
    expect(paragraphs("One line,\nthen the next.")).toEqual(["One line,\nthen the next."]);
    expect(paragraphs("\n\nOne.\n\n")).toEqual(["One."]);
    expect(paragraphs("")).toEqual([]);
  });

  it("leaves a reply with no blank line whole, word for word, as the harm reply comes", () => {
    const reply =
      "Ask can't help with this. If you or someone else is in danger, call your local emergency number now. A person you trust, a doctor or a helpline in your country can help.";
    expect(paragraphs(reply)).toEqual([reply]);
  });
});

describe("a refused send", () => {
  const now = new Date(2026, 9, 4, 14, 5);
  const refused = (status: number, data: unknown) => ({ status, data, headers: new Headers() });

  it("at the month's cap keeps the API's line and the day it resets", () => {
    const line = "You've used all your Ask messages for this month. They come back on 1 November. Everything else in Timeline still works.";
    expect(sendRefusal(refused(429, { error: "ask_cap", message: line, resetsOn: "2026-11-01" }), now)).toEqual({
      kind: "cap",
      cap: { line, resetsOn: "2026-11-01" },
    });
  });

  it("shows a limit's or a pause's line as the API wrote it", () => {
    const minute = "You've sent Ask 6 messages in the last minute. Try again in a minute.";
    expect(sendRefusal(refused(429, { error: "rate_limited", message: minute, retryAfterSeconds: 40 }), now)).toEqual({ kind: "line", line: minute });
    expect(sendRefusal(refused(503, { error: "paused", message: "Writing is paused for now." }), now)).toEqual({
      kind: "line",
      line: "Writing is paused for now.",
    });
  });

  it("shows the API's own line for a choice that closed, and never a validator's words", () => {
    const gone = "That choice isn't open any more. Type your question instead.";
    expect(sendRefusal(refused(400, { error: "choice_not_offered", message: gone }), now)).toEqual({ kind: "line", line: gone });
    expect(sendRefusal(refused(400, { error: "validation_error", message: "text: Too big: expected string to have <=500 characters" }), now)).toEqual({
      kind: "line",
      line: NOT_TAKEN_LINE,
    });
  });

  it("says plainly when Timeline is gone, there's no Personal report, a message wasn't taken, or nothing reached the API", () => {
    expect(sendRefusal(refused(403, { error: "no_timeline" }), now)).toEqual({ kind: "line", line: NO_TIMELINE_LINE });
    expect(sendRefusal(refused(409, { error: "no_personal_report" }), now)).toEqual({ kind: "line", line: NO_REPORT_LINE });
    expect(NO_REPORT_LINE).toBe("Ask reads your chart from your own Personal report. You don't have one yet.");
    expect(sendRefusal(refused(400, { error: "bad_request", message: "choiceId: unknown" }), now)).toEqual({ kind: "line", line: NOT_TAKEN_LINE });
    expect(sendRefusal(new TypeError("Failed to fetch"), now)).toEqual({ kind: "line", line: NOT_SENT_LINE });
    expect(sendRefusal(refused(429, { error: "ask_cap" }), now)).toEqual({ kind: "line", line: NOT_SENT_LINE });
    expect(sendRefusal(undefined, now)).toEqual({ kind: "line", line: NOT_SENT_LINE });
  });
});

describe("the thread after a send", () => {
  const before: AskThread = { messages: [message("m1", "reader", "Hi"), message("m2", "ask", "Hello.")], usage: USAGE };
  const asked = message("m3", "reader", "Why was Friday tense?");
  const answered = message("m4", "ask", "Mars was square your Venus.");
  const after = { ...USAGE, used: 4, left: 46 };

  it("takes a whole thread back as the server's, dropping what it dropped", () => {
    const whole: AskThread = { messages: [before.messages[1], asked, answered], usage: after };
    expect(mergeThread(before, whole)).toEqual(whole);
  });

  it("puts the two new messages on the end when only they come back", () => {
    expect(mergeThread(before, { messages: [asked, answered], usage: after })).toEqual({
      messages: [...before.messages, asked, answered],
      usage: after,
    });
  });

  it("starts the thread with the answer when there was none", () => {
    const answer: AskThread = { messages: [asked, answered], usage: after };
    expect(mergeThread(undefined, answer)).toBe(answer);
    expect(mergeThread({ messages: [], usage: USAGE }, answer)).toBe(answer);
  });

  it("offers a tap only on the choices of Ask's last message", () => {
    const choices = [
      { id: "c1", label: "Fri 18 Sep", kind: "date" as const },
      { id: "c2", label: "Fri 25 Sep", kind: "date" as const },
    ];
    const askBack = message("m5", "ask", "Which Friday?", { choices });
    expect(openChoices([...before.messages, askBack])).toEqual(choices);
    expect(openChoices([askBack, message("m6", "reader", "Fri 18 Sep")])).toEqual([]);
    expect(openChoices([])).toEqual([]);
  });
});

const FRIDAY = "2026-09-18";
const SATURN_ASC = "contact.saturn.conjunction.ascendant.20260530";
const MARS_VENUS = "contact.mars.square.venus.20260918";

function dayOf(view: AskCardView): Extract<AskCardView, { kind: "day" }> {
  if (view.kind !== "day") throw new Error(`a ${view.kind} card`);
  return view;
}

function find(events: readonly EventView[], key: string): EventView {
  const event = events.find((e) => e.key === key);
  if (!event) throw new Error(`no ${key}`);
  return { ...event, lasts: seen(event.lasts), facts: seen(event.facts) };
}

describe("a day's card", () => {
  const day = dayOf(cardView(dayCard(FRIDAY, LISBON), "2026-10-04", LISBON, "dmy"));

  it("names the chart and the day with its year, the Moon, and a contact card for each event in effect", () => {
    expect(seen(day.title)).toBe("Your chart · Fri 18 Sep 2026");
    expect(day.moon).toMatch(/^Moon in (Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces), [a-z ]+$/);
    expect(day.quiet).toBeNull();
    expect(day.events.map((e) => e.key)).toEqual(expect.arrayContaining([SATURN_ASC, MARS_VENUS]));
  });

  it("prints a contact's orb that day to two decimals, as the API sent it, and its exact day", () => {
    const sent = eventByKey(MIRA, MARS_VENUS, FRIDAY, LISBON);
    const mars = find(day.events, MARS_VENUS);
    expect(mars.tone).toBe("intense");
    expect(mars.headline).toBe(sent.headline);
    expect(mars.facts).toBe(`Mars square to your Venus · 1st house · orb ${sent.orbNow?.toFixed(2)}° · exact 18 Sep`);
    expect(mars.lasts).toBe("Until 20 Sep");
  });

  it("says when a contact eases and when it comes back, counted from the card's own day", () => {
    const saturn = find(day.events, SATURN_ASC);
    expect(saturn.lasts).toBe("Until 19 Oct, back in January");
    expect(saturn.facts).toMatch(/^Saturn on your Ascendant · 1st house · orb \d+\.\d{2}° · exact 30 May, 24 Sep and 20 Feb$/);
  });

  it("reads each instant as the reader's own day: Saturn is exact on 24 September in Lisbon and the 23rd in New York", () => {
    const lisbon = eventView(eventByKey(MIRA, SATURN_ASC, FRIDAY, LISBON), FRIDAY, LISBON, "dmy");
    const newYork = eventView(eventByKey(MIRA, SATURN_ASC, FRIDAY, NEW_YORK), FRIDAY, NEW_YORK, "mdy");
    expect(seen(lisbon.facts)).toContain("24 Sep");
    expect(seen(newYork.facts)).toContain("Sep 23");
  });

  it("never says today, since the thread is read again on later days", () => {
    const lastDay = "2026-10-19";
    const saturn = eventView(eventByKey(MIRA, SATURN_ASC, lastDay, LISBON), lastDay, LISBON, "dmy");
    expect(seen(saturn.lasts)).toBe("Until 19 Oct, back in January");
    for (const order of ORDERS) {
      const card = cardView(dayCard(lastDay, LISBON), lastDay, LISBON, order);
      for (const event of dayOf(card).events) expect(event.lasts.toLowerCase()).not.toContain("today");
    }
  });

  it("gives a retrograde its two stations and an eclipse its day, never 'never exact'", () => {
    const venus = eventView(eventByKey(MIRA, "retrograde.venus.-.-.20261003", "2026-10-20", LISBON), "2026-10-20", LISBON, "dmy");
    expect(venus.tone).toBe("mixed");
    expect(seen(venus.lasts)).toBe("Until 14 Nov");
    expect(seen(venus.facts)).toBe("Venus retrograde · 8th and 7th houses · 3 Oct to 14 Nov");

    const eclipse = eventView(eventByKey(MIRA, "eclipse.sun.-.-.20260812", "2026-08-12", LISBON), "2026-08-12", LISBON, "dmy");
    expect(eclipse.tone).toBeNull();
    expect(eclipse.lasts).toBe(ONE_DAY);
    expect(seen(eclipse.facts)).toBe("Solar eclipse · 5th house · 12 Aug");
    for (const facts of [venus.facts, eclipse.facts]) expect(facts).not.toContain("never exact");
  });

  it("says a day with nothing on the chart is quiet", () => {
    const quiet = cardView({ kind: "day", date: FRIDAY, moon: { sign: "Cancer", phase: "waxing crescent" }, events: [] }, FRIDAY, LISBON, "dmy");
    expect(quiet).toMatchObject({ kind: "day", quiet: "Nothing touches your chart that day.", events: [], moon: "Moon in Cancer, waxing crescent" });
  });
});

describe("a person's day, a window, a cycle and a quote", () => {
  it("draws someone in a Compatibility report on the day asked about, from their own chart", () => {
    const view = cardView(personCard(FRIDAY, LISBON), "2026-10-04", LISBON, "dmy");
    if (view.kind !== "person") throw new Error(view.kind);
    expect(seen(view.title)).toBe("Tomás's chart · Fri 18 Sep 2026");
    expect(view.events.map((e) => e.key)).toEqual(eventsOn(TOMAS, FRIDAY, LISBON).map((e) => e.key));
    const nobody = cardView({ kind: "person", name: " ", date: FRIDAY, events: [] }, FRIDAY, LISBON, "dmy");
    expect(nobody).toMatchObject({ quiet: "Nothing touches their chart that day." });
    expect(seen((nobody as { title: string }).title)).toBe("Their chart · Fri 18 Sep 2026");
  });

  it("shows a window as day cells, a quiet day with no tone", () => {
    const card = windowCard("2026-10-05", "2026-10-31", LISBON);
    const view = cardView(card, "2026-10-04", LISBON, "dmy");
    if (view.kind !== "window" || card.kind !== "window") throw new Error(view.kind);
    expect(seen(view.title)).toBe("5 Oct to 31 Oct 2026");
    expect(view.days).toHaveLength(27);
    view.days.forEach((d, i) => expect(d).toEqual({ date: card.days[i].date, tones: card.days[i].tone ? [card.days[i].tone] : [] }));
    expect(view.days.length).toBeLessThan(WINDOW_SHOWN);
    expect(seen(rangeWords("2026-12-28", "2027-01-03", "dmy"))).toBe("28 Dec 2026 to 3 Jan 2027");
    expect(seen(rangeWords("2026-10-05", "2026-10-31", "mdy"))).toBe("Oct 5 to Oct 31, 2026");
    expect(seen(rangeWords("2026-10-05", "2026-10-31", "ymd"))).toBe("2026 Oct 5 to Oct 31");
  });

  it("shows a cycle as Life's card, its days the reader's, and no round the API didn't send", () => {
    const sent = apiCycle("saturn-return");
    const view = cardView({ kind: "cycle", cycle: sent }, "2026-10-04", LISBON, "dmy");
    if (view.kind !== "cycle") throw new Error(view.kind);
    expect(view.cycle).toMatchObject({
      key: sent.key,
      id: "saturn-return",
      name: "Saturn return",
      age: sent.age,
      exact: sent.exact.map((at) => dayIn(at, LISBON)),
      start: dayIn(sent.start, LISBON),
      end: dayIn(sent.end, LISBON),
      today: "2026-10-04",
      progress: null,
      last: null,
    });
    expect(cycleChip(view.cycle, "2026-10-04")).toBe("Behind you");
    expect(seen(lookBack(view.cycle, "2026-10-04", "dmy") ?? "")).toMatch(/^Think back to \w+ \d{4}, when you were 29\.$/);
  });

  it("quotes a report word for word with its name and section", () => {
    const text = "A passage from the report, kept as the server put it in.";
    const view = cardView({ kind: "quote", reportId: "rep_1", reportName: "Mira & Tomás", section: "Love and closeness", text }, "2026-10-04", LISBON, "dmy");
    expect(view).toEqual({ kind: "quote", text, source: "Mira & Tomás · Love and closeness" });
    expect(cardView({ kind: "quote", reportId: "rep_1", reportName: "Mira", section: "", text }, "2026-10-04", LISBON, "dmy")).toMatchObject({ source: "Mira" });
  });
});

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Every way a card may print one of the API's days in an order, longest first. */
function renders(days: Iterable<string>, order: DateOrder): string[] {
  const out = new Set<string>();
  for (const day of days) {
    for (const text of [cardDay(day, order), fullDate(day, order), dayMonth(day, order), monthYear(day, order), longDay(day, order)]) out.add(seen(text));
  }
  return [...out].sort((a, b) => b.length - a.length);
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * What is left of a printed line once every sent day, sent orb and age is taken out. A day only goes where no digit
 * touches it, so a sent "1 Oct" never hides an invented "31 Oct"; a month alone only where a contact comes back.
 */
function leftover(text: string, days: string[], months: Set<string>, orbs: Set<string>, ages: Set<number>): string {
  let rest = seen(text).replace(/orb (\d+\.\d{2})°/g, (whole, orb: string) => (orbs.has(orb) ? "§" : whole));
  for (const day of days) rest = rest.replace(new RegExp(`(?<!\\d)${escape(day)}(?!\\d)`, "g"), "§");
  rest = rest.replace(/back in ([A-Z][a-z]+)\b(?! \d)/g, (whole, month: string) => (months.has(month) ? "back in §" : whole));
  return rest.replace(/\b(age |were |at |Once, at )(\d{1,3})\b/g, (whole, lead: string, n: string) => (ages.has(Number(n)) ? `${lead}§` : whole));
}

const DATE_LIKE = /\d+\.\d+°|\b\d{4}\b|\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}\b|\d:\d/;

describe("acceptance 1: every date and degree on Ask's cards is one the API sent", () => {
  const today = "2026-10-04";
  const cards: AskCard[] = [
    dayCard(FRIDAY, LISBON),
    dayCard("2026-10-20", LISBON),
    dayCard("2026-08-12", LISBON),
    personCard(FRIDAY, LISBON),
    windowCard("2026-10-05", "2026-10-31", LISBON),
    { kind: "cycle", cycle: apiCycle("saturn-return") },
    { kind: "cycle", cycle: apiCycle("jupiter-return", 2) },
    { kind: "cycle", cycle: apiCycle("uranus-opposition") },
  ];

  const sentDays = new Set<string>([today]);
  const orbs = new Set<string>();
  const ages = new Set<number>();
  const instant = (at: string) => sentDays.add(dayIn(at, LISBON));
  for (const card of cards) {
    if (card.kind === "day" || card.kind === "person") {
      sentDays.add(card.date);
      for (const e of card.events) {
        [e.start, e.end, ...e.exact, ...e.spans.flatMap((s) => [s.start, s.end])].forEach(instant);
        if (e.orbNow !== null) orbs.add(e.orbNow.toFixed(2));
      }
    }
    if (card.kind === "window") card.days.forEach((d) => sentDays.add(d.date));
    if (card.kind === "cycle") {
      [card.cycle.start, card.cycle.end, ...card.cycle.exact].forEach(instant);
      ages.add(card.cycle.age);
    }
  }

  const months = new Set([...sentDays].map((day) => MONTHS[Number(day.slice(5, 7)) - 1]));

  for (const order of ORDERS) {
    it(`holds in ${order} order`, () => {
      const days = renders(sentDays, order);
      const printed: string[] = [];
      for (const card of cards) {
        const view = cardView(card, today, LISBON, order);
        if (view.kind === "day" || view.kind === "person") {
          printed.push(view.title);
          for (const e of view.events) printed.push(e.lasts, e.facts);
        }
        if (view.kind === "window") printed.push(view.title, ...view.days.map((d) => dayLabel(d, order)));
        if (view.kind === "cycle") {
          const c = view.cycle;
          printed.push(cycleDates(c, order), cycleFact(c, order), cycleChip(c, today), lookBack(c, today, order) ?? "");
        }
      }
      expect(printed.length).toBeGreaterThan(20);
      for (const line of printed) expect(leftover(line, days, months, orbs, ages), line).not.toMatch(DATE_LIKE);
    });
  }
});
