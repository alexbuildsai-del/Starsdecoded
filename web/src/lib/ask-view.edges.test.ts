/**
 * Ask's panel at its edges (R16-28; ADR-213, 263; readings 13 to 16): the line under the box at 0, 1 and past the cap,
 * a reset date that is not a date, what a refusal may and may not say, a thread merged from a partial answer, and the
 * cards' dates in zones a day apart. `ask-view.test.ts` reads the cards against the engine; the events here are API
 * payloads with instants chosen to sit at midnight, since only their days are under test.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AskCard, AskMessage, AskThread, AskUsage, LifeCycleView, TimelineEvent } from "@workspace/api-client-react";
import type { DateOrder } from "./date-entry";
import {
  ASK_TEXT_MAX,
  NOT_SENT_LINE,
  NOT_TAKEN_LINE,
  NO_REPORT_LINE,
  NO_TIMELINE_LINE,
  ONE_DAY,
  askText,
  browserZone,
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
} from "./ask-view";

const seen = (text: string) => text.replace(/ /g, " ");
const USAGE: AskUsage = { used: 3, left: 47, cap: 50, resetsOn: "2026-11-01" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the line always under the box, at its edges", () => {
  it("says how many are left down to 1, and the cap's line at 0 and at anything past it", () => {
    for (const left of [50, 2, 1]) expect(usageLine({ ...USAGE, left }, null, "dmy")).toEqual({ line: `${left} left this month`, capped: false });
    for (const left of [0, -1, -50]) expect(usageLine({ ...USAGE, used: 50 - left, left }, null, "dmy")).toEqual({ line: capLine("2026-11-01", "dmy"), capped: true });
  });

  it("names the reset day the usage carries, not a day of its own: the 1st of the next month, whichever month it is", () => {
    for (const [resetsOn, words] of [["2026-12-01", "1 December"], ["2027-01-01", "1 January"], ["2027-03-01", "1 March"]] as const) {
      expect(seen(usageLine({ ...USAGE, left: 0 }, null, "dmy")!.line)).toContain("1 November");
      expect(seen(usageLine({ ...USAGE, left: 0, resetsOn }, null, "dmy")!.line)).toContain(`come back on ${words}.`);
    }
  });

  it("keeps the API's cap line after a refusal even when the count it holds still says there is room", () => {
    const refused = { line: "The line from the API.", resetsOn: "2026-11-01" };
    expect(usageLine({ ...USAGE, left: 12 }, refused, "mdy")).toEqual({ line: "The line from the API.", capped: true });
  });

  it("reads the count the thread holds before the one the access answer held, and neither when there is none", () => {
    const thread: AskThread = { messages: [], usage: { ...USAGE, used: 50, left: 0 } };
    expect(usageOf(thread, USAGE)).toBe(thread.usage);
    expect(usageOf(undefined, undefined)).toBeNull();
    expect(usageOf(undefined, USAGE)).toBe(USAGE);
  });
});

describe("the reset day", () => {
  it("names every month of the year in either order", () => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    months.forEach((name, i) => {
      const day = `2026-${String(i + 1).padStart(2, "0")}-01`;
      expect(seen(resetDay(day, "dmy"))).toBe(`1 ${name}`);
      expect(seen(resetDay(day, "mdy"))).toBe(`${name} 1`);
      expect(seen(resetDay(day, "ymd"))).toBe(`${name} 1`);
    });
  });

  it("reads a full timestamp's day, and hands back anything that is not a date as it came, never 'undefined' or 'NaN'", () => {
    expect(seen(resetDay("2026-11-01T00:00:00.000Z", "dmy"))).toBe("1 November");
    for (const bad of ["", "tomorrow", "2026-13-01", "2026-00-10", "01/11/2026", "2026-1-1"]) expect(resetDay(bad, "dmy")).toBe(bad);
    expect(capLine("soon", "dmy")).toContain("They come back on soon.");
  });
});

describe("what the box may send, at its edges", () => {
  it("counts a message as the server does, in UTF-16 units: 250 two-unit characters fit and 251 do not", () => {
    expect(askText("😀".repeat(250))).toHaveLength(500);
    expect(askText("😀".repeat(251))).toBeNull();
    expect("😀".repeat(250).length).toBe(ASK_TEXT_MAX);
  });

  it("trims every kind of space off the ends and keeps the ones inside", () => {
    expect(askText("  What now? \n")).toBe("What now?");
    expect(askText("What   now?")).toBe("What   now?");
    expect(askText("  ")).toBeNull();
  });

  it("leaves the report off a body when the page has none, an empty id included", () => {
    expect(textBody("Why?", "")).toEqual({ text: "Why?" });
    expect(choiceBody("c1", "")).toEqual({ choiceId: "c1" });
    expect(textBody("Why?", undefined)).not.toHaveProperty("reportId");
  });

  it("says no room is left, never a negative, once a draft is at or past the end", () => {
    expect(roomLine("a".repeat(500))).toBe("0 characters left");
    expect(roomLine("a".repeat(501))).toBe("0 characters left");
    expect(roomLine("a".repeat(2000))).toBe("0 characters left");
    expect(roomLine("")).toBeNull();
  });

  it("splits a text at blank lines of any kind, keeps a single break inside a paragraph, and drops the empty ones", () => {
    expect(paragraphs("One.\r\rTwo.")).toEqual(["One.", "Two."]);
    expect(paragraphs("One.\n\n\n\n\nTwo.")).toEqual(["One.", "Two."]);
    expect(paragraphs("  One.  \n \n  Two.  ")).toEqual(["One.", "Two."]);
    expect(paragraphs("\n\n\n")).toEqual([]);
    expect(paragraphs("One.\nStill one.")).toEqual(["One.\nStill one."]);
  });
});

describe("a refused send, at its edges", () => {
  const refused = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
  const now = new Date(2026, 9, 4, 14, 5);

  it("takes the cap only with its line and its date: either one missing or the wrong kind is a send that did not go", () => {
    for (const data of [
      { error: "ask_cap", message: "A line.", resetsOn: 20261101 },
      { error: "ask_cap", message: "", resetsOn: "2026-11-01" },
      { error: "ask_cap", resetsOn: "2026-11-01" },
      { error: "ask_cap", message: 4, resetsOn: "2026-11-01" },
    ]) {
      expect(sendRefusal(refused(429, data), now), JSON.stringify(data)).toEqual({ kind: "line", line: NOT_SENT_LINE });
    }
  });

  it("never prints a body that is not a refusal Ask knows: a string, null, an array, a number, or an error with no body", () => {
    for (const error of ["boom", null, undefined, 7, [], {}, { status: 500 }, { status: 500, data: "Internal Server Error" }, { status: 400, data: null }]) {
      const line = sendRefusal(error, now);
      expect(line.kind).toBe("line");
      expect(line.kind === "line" && [NOT_SENT_LINE, NOT_TAKEN_LINE]).toContain(line.kind === "line" ? line.line : "");
    }
    expect(sendRefusal({ status: 400, data: "bad" }, now)).toEqual({ kind: "line", line: NOT_TAKEN_LINE });
    expect(sendRefusal({ status: 500, data: "bad" }, now)).toEqual({ kind: "line", line: NOT_SENT_LINE });
  });

  it("uses the API's words for a closed choice only when it sent some; a choice without them is a message not taken", () => {
    expect(sendRefusal(refused(400, { error: "choice_not_offered" }), now)).toEqual({ kind: "line", line: NOT_TAKEN_LINE });
    expect(sendRefusal(refused(400, { error: "choice_not_offered", message: "" }), now)).toEqual({ kind: "line", line: NOT_TAKEN_LINE });
  });

  it("answers the two doors by their own lines whatever words the API put with them", () => {
    expect(sendRefusal(refused(403, { error: "no_timeline", message: "forbidden: admin only" }), now)).toEqual({ kind: "line", line: NO_TIMELINE_LINE });
    expect(sendRefusal(refused(409, { error: "no_personal_report", message: "no report" }), now)).toEqual({ kind: "line", line: NO_REPORT_LINE });
  });

  it("restates a limit's hour in the reader's clock and keeps a minute's line as the API wrote it", () => {
    const hour = sendRefusal(refused(429, { error: "rate_limited", message: "You've sent too many. Try again within the hour.", retryAfterSeconds: 600 }), now);
    expect(hour.kind === "line" && hour.line.startsWith("You've sent too many. Try again")).toBe(true);
    expect(hour.kind === "line" && hour.line).not.toContain("within the hour");
    const minute = "You've sent Ask 6 messages in the last minute. Try again in a minute.";
    expect(sendRefusal(refused(429, { error: "rate_limited", message: minute, retryAfterSeconds: 30 }), now)).toEqual({ kind: "line", line: minute });
  });
});

describe("the thread, merged", () => {
  const msg = (id: string, role: AskMessage["role"], text: string): AskMessage => ({ id, role, text, cards: [], choices: [], createdAt: "2026-10-04T09:00:00.000Z" });
  const before: AskThread = { messages: [msg("m1", "reader", "Hi"), msg("m2", "ask", "Hello.")], usage: USAGE };
  const after = { ...USAGE, used: 4, left: 46 };

  it("takes the answer's whole list when any one message in it is one the panel holds, even the last", () => {
    const partial: AskThread = { messages: [msg("m2", "ask", "Hello."), msg("m3", "reader", "More"), msg("m4", "ask", "Yes.")], usage: after };
    expect(mergeThread(before, partial)).toEqual(partial);
  });

  it("puts nothing on the end for an empty answer, but takes its count", () => {
    expect(mergeThread(before, { messages: [], usage: after })).toEqual({ messages: before.messages, usage: after });
  });

  it("is not fooled by an old thread that was emptied by the 31 days: an empty panel takes the answer whole", () => {
    const answer: AskThread = { messages: [msg("m9", "ask", "A new day.")], usage: after };
    expect(mergeThread({ messages: [], usage: USAGE }, answer)).toBe(answer);
  });

  it("offers no tap when the last message is the reader's, is Ask's with none to offer, or there is no message", () => {
    expect(openChoices([msg("m1", "ask", "Hello."), msg("m2", "reader", "Hi")])).toEqual([]);
    expect(openChoices([msg("m1", "ask", "Hello.")])).toEqual([]);
    expect(openChoices([])).toEqual([]);
  });
});

describe("the browser's zone", () => {
  it("is the one Intl names, and UTC when Intl names none or throws", () => {
    expect(browserZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    vi.stubGlobal("Intl", { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: "" }) }) });
    expect(browserZone()).toBe("UTC");
    vi.stubGlobal("Intl", { DateTimeFormat: () => { throw new RangeError("no Intl"); } });
    expect(browserZone()).toBe("UTC");
  });
});

/** An API event whose instants are chosen, not computed: the days it prints are what is under test. */
function event(over: Partial<TimelineEvent> & Pick<TimelineEvent, "start" | "end">): TimelineEvent {
  return {
    key: "contact.test.conjunction.test.20261001",
    kind: "contact",
    body: "saturn",
    aspect: "conjunction",
    target: "ascendant",
    houses: [1],
    exact: [],
    spans: [],
    orbNow: null,
    tone: "easy",
    headline: "A test headline",
    facts: { sky: "A test sky line", house: "1st house" },
    line: null,
    reading: "none",
    ...over,
  };
}

const ORDERS: DateOrder[] = ["dmy", "mdy", "ymd"];

describe("a card's dates, in zones a day apart", () => {
  const late = "2026-10-08T23:30:00.000Z";
  const e = event({ start: "2026-10-01T10:00:00.000Z", end: late, exact: ["2026-10-06T23:30:00.000Z"], spans: [{ start: "2026-10-01T10:00:00.000Z", end: late }] });

  it("is the reader's own day for every instant: past midnight in Lisbon's summer, before it in New York, a day on in Kiritimati", () => {
    expect(seen(eventView(e, "2026-10-05", "Europe/Lisbon", "dmy").lasts)).toBe("Until 9 Oct");
    expect(seen(eventView(e, "2026-10-05", "America/New_York", "dmy").lasts)).toBe("Until 8 Oct");
    expect(seen(eventView(e, "2026-10-05", "Pacific/Kiritimati", "dmy").lasts)).toBe("Until 9 Oct");
    expect(seen(eventView(e, "2026-10-05", "Pacific/Pago_Pago", "dmy").lasts)).toBe("Until 8 Oct");
    expect(seen(eventView(e, "2026-10-05", "Europe/Lisbon", "dmy").facts)).toContain("exact 7 Oct");
    expect(seen(eventView(e, "2026-10-05", "America/New_York", "mdy").facts)).toContain("exact Oct 6");
  });

  it("reads a zone Intl cannot as UTC, as the API's keys do", () => {
    expect(seen(eventView(e, "2026-10-05", "Not/AZone", "dmy").lasts)).toBe("Until 8 Oct");
  });

  it("prints no day the event's instants do not give, in any order or zone", () => {
    const sent = (zone: string) => new Set([e.start, e.end, ...e.exact].map((at) => new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date(at))));
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (const zone of ["Europe/Lisbon", "America/New_York", "Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
      const days = [...sent(zone)].map((d) => ({ m: Number(d.slice(5, 7)), d: Number(d.slice(8)) }));
      for (const order of ORDERS) {
        const view = eventView(e, "2026-10-05", zone, order);
        const printed = seen(`${view.lasts} ${view.facts}`);
        for (const m of printed.matchAll(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2})\b/g)) {
          const day = Number(m[1] ?? m[4]);
          const month = months.indexOf((m[2] ?? m[3]) as string) + 1;
          expect(days, `${zone} ${order}: ${m[0]} in "${printed}"`).toContainEqual({ m: month, d: day });
        }
      }
    }
  });
});

describe("a card on a day the event is out of orb, or has no stretches", () => {
  const first = { start: "2026-10-01T12:00:00.000Z", end: "2026-10-08T12:00:00.000Z" };
  const second = { start: "2026-10-20T12:00:00.000Z", end: "2026-11-05T12:00:00.000Z" };
  const split = event({ start: first.start, end: second.end, spans: [first, second], exact: ["2026-10-04T12:00:00.000Z", "2026-10-28T12:00:00.000Z"] });

  it("says 'until' the end of the stretch the day sits in, and when it comes back after it", () => {
    // It comes back in the month it is already in, so the month alone would read as now: the year goes with it.
    expect(seen(eventView(split, "2026-10-05", "UTC", "dmy").lasts)).toBe("Until 8 Oct, back in October 2026");
    expect(seen(eventView(split, "2026-10-25", "UTC", "dmy").lasts)).toBe("Until 5 Nov");
  });

  it("reads the next stretch on a day between two, and the last on a day after all of them", () => {
    expect(seen(eventView(split, "2026-10-12", "UTC", "dmy").lasts)).toBe("Until 5 Nov");
    expect(seen(eventView(split, "2026-12-01", "UTC", "dmy").lasts)).not.toContain("back in");
    expect(seen(eventView(split, "2026-09-20", "UTC", "dmy").lasts)).toBe("Until 8 Oct, back in October");
  });

  it("says 'until' the day itself on a stretch's last day, never 'today', since a card is read again later", () => {
    for (const order of ORDERS) expect(eventView(split, "2026-11-05", "UTC", order).lasts.toLowerCase()).not.toContain("today");
    expect(seen(eventView(split, "2026-11-05", "UTC", "dmy").lasts)).toBe("Until 5 Nov");
  });

  it("falls back to its start and end when it sends no stretches", () => {
    const whole = event({ start: first.start, end: first.end, spans: [] });
    expect(seen(eventView(whole, "2026-10-05", "UTC", "dmy").lasts)).toBe("Until 8 Oct");
  });

  it("says 'never exact' for a contact with no exact pass and gives a retrograde its stations instead", () => {
    expect(eventView(event({ start: first.start, end: first.end, spans: [first], exact: [] }), "2026-10-05", "UTC", "dmy").facts).toContain("never exact");
    const retro = event({ kind: "retrograde", aspect: null, target: null, start: "2026-12-20T12:00:00.000Z", end: "2027-01-10T12:00:00.000Z", exact: [], spans: [], tone: "mixed", houses: [8] });
    const mid = seen(eventView(retro, "2026-12-25", "UTC", "dmy").facts);
    expect(mid).toBe("A test sky line · 1st house · 20 Dec to 10 Jan");
    const later = seen(eventView(retro, "2027-01-12", "UTC", "dmy").facts);
    expect(later).toContain("20 Dec 2026");
  });

  it("is one day for an eclipse, dated by its peak, or by its start when it sends no peak, and carries no tone when it has none", () => {
    const eclipse = event({ kind: "eclipse", body: "sun", aspect: null, target: null, start: "2026-08-12T17:46:00.000Z", end: "2026-08-12T17:46:00.000Z", exact: ["2026-08-12T17:46:00.000Z"], spans: [], tone: null, houses: [] });
    const view = eventView(eclipse, "2026-08-12", "UTC", "dmy");
    expect(view.lasts).toBe(ONE_DAY);
    expect(view.tone).toBeNull();
    expect(seen(view.facts)).toBe("A test sky line · 1st house · 12 Aug");
    expect(seen(eventView({ ...eclipse, exact: [] }, "2026-08-12", "UTC", "dmy").facts)).toBe("A test sky line · 1st house · 12 Aug");
    expect(seen(eventView({ ...eclipse, facts: { sky: "A test sky line", house: null } }, "2026-08-12", "UTC", "dmy").facts)).toBe("A test sky line · 12 Aug");
  });
});

describe("the other cards, at their edges", () => {
  const day = (over: Partial<Extract<AskCard, { kind: "day" }>> = {}): AskCard => ({ kind: "day", date: "2026-10-20", moon: { sign: "Leo", phase: "full moon" }, events: [], ...over });

  it("names the Moon by its sign alone when it has no phase, and by both when it has", () => {
    expect(cardView(day({ moon: { sign: "Leo", phase: "" } }), "2026-10-04", "UTC", "dmy")).toMatchObject({ moon: "Moon in Leo" });
    expect(cardView(day(), "2026-10-04", "UTC", "dmy")).toMatchObject({ moon: "Moon in Leo, full moon" });
  });

  it("titles a day by its weekday and its year in each order, from the day the card names, not today's", () => {
    expect(seen(cardDay("2026-10-20", "dmy"))).toBe("Tue 20 Oct 2026");
    expect(seen(cardDay("2026-10-20", "mdy"))).toBe("Tue Oct 20, 2026");
    expect(seen(cardDay("2026-10-20", "ymd"))).toBe("Tue 2026 Oct 20");
    expect(seen((cardView(day(), "2031-01-01", "UTC", "dmy") as { title: string }).title)).toBe("Your chart · Tue 20 Oct 2026");
  });

  it("calls a person with no usable name 'Their', and says their chart is quiet in the same words", () => {
    for (const name of ["", " ", " \n"]) {
      const view = cardView({ kind: "person", name, date: "2026-10-20", events: [] }, "2026-10-04", "UTC", "dmy");
      expect(view).toMatchObject({ quiet: "Nothing touches their chart that day." });
      expect(seen((view as { title: string }).title)).toBe("Their chart · Tue 20 Oct 2026");
    }
    const named = cardView({ kind: "person", name: " Tomás ", date: "2026-10-20", events: [] }, "2026-10-04", "UTC", "dmy");
    expect(named).toMatchObject({ quiet: "Nothing touches Tomás's chart that day." });
  });

  it("draws a window of no days as no cells, and a day with no tone as a quiet cell", () => {
    expect(cardView({ kind: "window", from: "2026-10-05", to: "2026-10-05", days: [] }, "2026-10-04", "UTC", "dmy")).toMatchObject({ days: [] });
    const view = cardView({ kind: "window", from: "2026-10-05", to: "2026-10-06", days: [{ date: "2026-10-05", tone: null }, { date: "2026-10-06", tone: "easy" }] }, "2026-10-04", "UTC", "dmy");
    expect(view).toMatchObject({ days: [{ date: "2026-10-05", tones: [] }, { date: "2026-10-06", tones: ["easy"] }] });
  });

  it("words a window across a year, a month, and the same year, once each", () => {
    expect(seen(rangeWords("2026-12-28", "2027-01-03", "mdy"))).toBe("Dec 28, 2026 to Jan 3, 2027");
    expect(seen(rangeWords("2026-12-28", "2027-01-03", "ymd"))).toBe("2026 Dec 28 to 2027 Jan 3");
    expect(seen(rangeWords("2026-10-05", "2026-10-11", "dmy"))).toBe("5 Oct to 11 Oct 2026");
  });

  it("keeps a quote's words exactly, line breaks and all, and gives a report with no section only its name", () => {
    const text = "First line.\nSecond line, with  two spaces.";
    expect(cardView({ kind: "quote", reportId: "r", reportName: "Mira", section: "Love", text }, "2026-10-04", "UTC", "dmy")).toEqual({ kind: "quote", text, source: "Mira · Love" });
    expect(cardView({ kind: "quote", reportId: "r", reportName: "Mira", section: "", text }, "2026-10-04", "UTC", "dmy")).toEqual({ kind: "quote", text, source: "Mira" });
  });

  it("gives a cycle the days of the reader's zone and the card's own today, with the round and the look-back left to the API", () => {
    const cycle: LifeCycleView = {
      key: "cycle.saturn-return.20200101", id: "saturn-return", body: "saturn", name: "Saturn return", word: "settling", age: 29,
      exact: ["2020-01-01T02:00:00.000Z", "2020-06-01T12:00:00.000Z"], start: "2019-12-01T12:00:00.000Z", end: "2020-07-01T12:00:00.000Z",
      past: true, repeats: true, passes: 2, reading: "none",
    };
    const view = cycleView(cycle, "2026-10-04", "America/New_York");
    expect(view).toMatchObject({ exact: ["2019-12-31", "2020-06-01"], start: "2019-12-01", end: "2020-07-01", today: "2026-10-04", progress: null, last: null, repeats: true });
    expect(cycleView({ ...cycle, exact: [] }, "2026-10-04", "UTC").exact).toEqual([]);
  });
});
