/**
 * Timeline's own page at its edges (R16-27; acceptance 1; readings 4, 7, 9, 10, 18, 19): which card shows on which day
 * when an event leaves its orb and comes back, the reader's zone moving an instant across midnight, the order of a
 * day's cards and what comes up, a dial index that is out of range, and Life's cards when the API sends less than a
 * full life. `now-ahead.test.ts` reads both screens against the engine; the payloads here are chosen, not computed, so
 * each edge sits where the test says: only their days and the words around them are under test.
 */
import { describe, expect, it } from "vitest";
import type { KnownAge, LifeCycleView, TimelineEvent, TimelineLife, TimelineNow } from "@workspace/api-client-react";
import {
  BLIND_FIX,
  BLIND_LINE,
  NEXT_MAX,
  ONE_DAY,
  RANGES,
  buildsOnText,
  comingUpTitle,
  contactOf,
  housesText,
  lifeModel,
  nothingNext,
  nowDay,
  nowModel,
  paragraphs,
  rangeAhead,
  rangeSpan,
  reads,
  waveLinesOf,
  type EventCard,
} from "./now-ahead";

const seen = (text: string) => text.replace(/ /g, " ");

function event(over: Partial<TimelineEvent> & Pick<TimelineEvent, "key" | "start" | "end">): TimelineEvent {
  return {
    kind: "contact",
    body: "saturn",
    aspect: "conjunction",
    target: "ascendant",
    houses: [1],
    exact: [],
    spans: [{ start: over.start, end: over.end }],
    orbNow: null,
    tone: "intense",
    headline: `Headline of ${over.key}`,
    facts: { sky: `Sky of ${over.key}`, house: "1st house" },
    line: null,
    reading: "none",
    ...over,
  };
}

function week(events: TimelineEvent[], next: TimelineNow["next"] = [], over: Partial<TimelineNow> = {}): TimelineNow {
  const days = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${String(5 + i).padStart(2, "0")}`, tones: [] as ("easy" | "mixed" | "intense")[] }));
  return { range: "week", from: "2026-10-05", to: "2026-10-11", zone: "UTC", blind: false, natal: [], angles: null, days, events, next, ...over };
}

const at = (day: string, hhmm = "12:00") => `${day}T${hhmm}:00.000Z`;
const keysOn = (now: TimelineNow, index: number, order: "dmy" | "mdy" | "ymd" = "dmy") => nowDay(nowModel(now), index, order).cards.map((c) => c.key);

describe("which cards show on a day, when an event leaves its orb and comes back", () => {
  const split = event({
    key: "contact.split",
    start: at("2026-10-03"),
    end: at("2026-10-20"),
    spans: [{ start: at("2026-10-03"), end: at("2026-10-07") }, { start: at("2026-10-10"), end: at("2026-10-20") }],
    exact: [at("2026-10-05")],
  });
  const now = week([split]);

  it("shows it on every day inside a stretch, at its ends included, and on none between two", () => {
    expect([0, 1, 2].map((i) => keysOn(now, i).length)).toEqual([1, 1, 1]);
    expect([3, 4].map((i) => keysOn(now, i).length)).toEqual([0, 0]);
    expect([5, 6].map((i) => keysOn(now, i).length)).toEqual([1, 1]);
  });

  it("says when it eases and when it comes back, from the stretch the shown day sits in", () => {
    const model = nowModel(now);
    expect(seen(nowDay(model, 0, "dmy").cards[0].lasts)).toBe("Until 7 Oct, back in October 2026");
    expect(seen(nowDay(model, 5, "dmy").cards[0].lasts)).toBe("Until 20 Oct");
  });

  it("is on a day by the reader's zone: an end at 23:30 UTC is the 8th in New York and the 9th in Lisbon, in Tokyo the 9th", () => {
    const late = event({ key: "contact.late", start: at("2026-10-01"), end: at("2026-10-08", "23:30"), spans: [{ start: at("2026-10-01"), end: at("2026-10-08", "23:30") }] });
    const onThe9th = (zone: string) => keysOn(week([late], [], { zone }), 4);
    expect(onThe9th("America/New_York")).toEqual([]);
    expect(onThe9th("Europe/Lisbon")).toEqual(["contact.late"]);
    expect(onThe9th("Asia/Tokyo")).toEqual(["contact.late"]);
    expect(keysOn(week([late], [], { zone: "America/New_York" }), 3)).toEqual(["contact.late"]);
  });

  it("reads a zone Intl cannot as UTC, as the API's keys do", () => {
    const late = event({ key: "contact.late", start: at("2026-10-01"), end: at("2026-10-08", "23:30") });
    expect(keysOn(week([late], [], { zone: "Not/AZone" }), 4)).toEqual([]);
    expect(keysOn(week([late], [], { zone: "Not/AZone" }), 3)).toEqual(["contact.late"]);
  });
});

describe("a day's cards: order, orb and words", () => {
  const events = [
    event({ key: "contact.b", start: at("2026-10-04"), end: at("2026-10-10"), tone: "intense" }),
    event({ key: "contact.a", start: at("2026-10-03"), end: at("2026-10-10"), tone: "intense", orbNow: 0.52, exact: [at("2026-10-06")] }),
    event({ key: "contact.0", start: at("2026-10-03"), end: at("2026-10-10"), tone: "intense" }),
    event({ key: "contact.easy", start: at("2026-10-02"), end: at("2026-10-10"), tone: "easy" }),
    event({ key: "retrograde.mars", kind: "retrograde", aspect: null, target: null, houses: [8, 7], start: at("2026-10-01"), end: at("2026-11-14"), tone: "mixed" }),
    event({ key: "eclipse.sun", kind: "eclipse", body: "sun", aspect: null, target: null, houses: [], start: at("2026-10-05"), end: at("2026-10-05"), exact: [at("2026-10-05")], tone: null }),
  ];
  const now = week(events);
  const model = nowModel(now);

  it("puts the strongest tone first, then contact before retrograde before eclipse, then the earlier start, then the key; a toneless eclipse last", () => {
    expect(nowDay(model, 0, "dmy").cards.map((c) => c.key)).toEqual(["contact.0", "contact.a", "contact.b", "retrograde.mars", "contact.easy", "eclipse.sun"]);
    expect(nowDay(model, 1, "dmy").cards.map((c) => c.key)).not.toContain("eclipse.sun");
  });

  it("prints a contact's orb on today only, whichever contact it is, and its exact days always", () => {
    const first = nowDay(model, 0, "dmy").cards.find((c) => c.key === "contact.a")!;
    const later = nowDay(model, 1, "dmy").cards.find((c) => c.key === "contact.a")!;
    expect(first.facts).toContain("orb 0.52°");
    expect(later.facts).not.toContain("orb");
    expect(seen(later.facts)).toContain("exact 6 Oct");
    expect(seen(nowDay(model, 0, "dmy").cards.find((c) => c.key === "contact.b")!.facts)).toContain("never exact");
  });

  it("words a retrograde by its houses and its stations, and an eclipse as one day with no date and no 'never exact'", () => {
    const [retro, eclipse] = ["retrograde.mars", "eclipse.sun"].map((key) => nowDay(model, 0, "dmy").cards.find((c) => c.key === key)!);
    expect(seen(retro.facts)).toBe("Sky of retrograde.mars · 8th (depth) and 7th (partnership) houses · 1 Oct to 14 Nov");
    expect(retro.facts).not.toContain("exact");
    expect(eclipse.lasts).toBe(ONE_DAY);
    expect(seen(eclipse.facts)).toBe("Sky of eclipse.sun");
    expect(eclipse.tone).toBeNull();
    expect(contactOf(eclipse)).toBeNull();
  });

  it("says which cards get a reading: every contact, a retrograde in a known house, an eclipse near a point", () => {
    const flags = new Map(nowDay(model, 0, "dmy").cards.map((c) => [c.key, c.reads]));
    expect([...flags]).toEqual([["contact.0", true], ["contact.a", true], ["contact.b", true], ["retrograde.mars", true], ["contact.easy", true], ["eclipse.sun", false]]);
    const bare = { kind: "retrograde" as const, houses: [] as number[], target: null };
    expect([reads(bare), reads({ ...bare, houses: [3] }), reads({ kind: "eclipse", houses: [], target: "sun" }), reads({ kind: "eclipse", houses: [4], target: null })]).toEqual([false, true, true, false]);
  });

  it("hands a card with a tone to the shared contact card with its own line, and carries a reading's state through", () => {
    const written: EventCard = { ...nowDay(model, 0, "dmy").cards[0], line: "A line.", reading: "ready" };
    expect(contactOf(written)).toEqual({ key: written.key, tone: "intense", headline: written.headline, line: "A line.", lasts: written.lasts, facts: written.facts });
    const reading = nowModel(week([event({ key: "contact.r", start: at("2026-10-01"), end: at("2026-10-31"), line: "A line.", reading: "ready" })]));
    expect(nowDay(reading, 0, "dmy").cards[0]).toMatchObject({ line: "A line.", reading: "ready" });
  });
});

describe("the dial's index and a range with no days", () => {
  const now = week([event({ key: "contact.only", start: at("2026-10-01"), end: at("2026-10-31") })]);
  const model = nowModel(now);

  it("clamps an index to the range, rounds a fraction, and reads one that is not a number as the first day", () => {
    const date = (i: number) => nowDay(model, i, "dmy").date;
    expect([date(-4), date(0), date(6), date(7), date(400)]).toEqual(["2026-10-05", "2026-10-05", "2026-10-11", "2026-10-11", "2026-10-11"]);
    expect([date(2.4), date(2.5), date(2.6)]).toEqual(["2026-10-07", "2026-10-08", "2026-10-08"]);
    expect([date(Number.NaN), date(Number.POSITIVE_INFINITY), date(Number.NEGATIVE_INFINITY)]).toEqual(["2026-10-05", "2026-10-05", "2026-10-05"]);
    expect(nowDay(model, 99, "dmy")).toMatchObject({ index: 6, today: false });
    expect(nowDay(model, 0, "dmy").today).toBe(true);
  });

  it("shows no day, no tone and no card for a range the API sent with no days, and does not fail", () => {
    const none = nowModel(week([event({ key: "contact.only", start: at("2026-10-01"), end: at("2026-10-31") })], [], { days: [] }));
    expect(nowDay(none, 3, "dmy")).toMatchObject({ index: 0, date: "2026-10-05", today: true, tones: [], next: [] });
  });

  it("titles the day with its weekday in each order, and with its year only where the date could be misread", () => {
    expect(seen(nowDay(model, 0, "dmy").title)).toBe("Monday 5 October");
    expect(seen(nowDay(model, 0, "mdy").title)).toBe("Monday, October 5");
    const far = nowModel(week([], [], { days: [{ date: "2026-10-05", tones: [] }, { date: "2027-06-01", tones: [] }, { date: "2027-02-01", tones: [] }] }));
    expect(seen(nowDay(far, 1, "dmy").title)).toBe("Tuesday 1 June 2027");
    expect(seen(nowDay(far, 1, "mdy").title)).toBe("Tuesday, June 1, 2027");
    expect(seen(nowDay(far, 2, "dmy").title)).toBe("Monday 1 February");
  });

  it("names the range it shows, and what comes up in it", () => {
    expect(RANGES.map((r) => [r.id, r.label])).toEqual([["week", "Week"], ["month", "Month"], ["six-months", "6 months"]]);
    expect([rangeAhead("week"), rangeAhead("month"), rangeAhead("six-months")]).toEqual(["this week", "this month", "in the next 6 months"]);
    expect(rangeAhead("year" as never)).toBe("");
    expect(comingUpTitle("month")).toBe("Coming up this month");
    expect(nothingNext("six-months")).toBe("Nothing else starts, peaks or eases in the next 6 months.");
    expect(seen(rangeSpan(now, "dmy"))).toBe("5 Oct to 11 Oct");
    expect(seen(rangeSpan(week([], [], { from: "2026-12-28", to: "2027-01-03" }), "dmy"))).toBe("28 Dec to 3 Jan");
    expect(BLIND_LINE).toContain("leaves out your Ascendant, Midheaven, Moon and houses");
    expect(BLIND_FIX).toBe("Add your birth time on your Personal report to see them.");
  });
});

describe("what comes up after the day shown", () => {
  const events = ["a", "b", "c", "d"].map((k) => event({ key: `contact.${k}`, start: at("2026-10-01"), end: at("2026-10-31") }));
  const change = (key: string, day: string, kind: "starts" | "peaks" | "eases" = "peaks") => ({ key, at: at(day), change: kind });
  const next = [
    change("contact.a", "2026-10-06"),
    change("contact.ghost", "2026-10-07"),
    change("contact.b", "2026-10-31"),
    change("contact.a", "2026-10-08", "eases"),
    change("contact.c", "2026-10-09"),
    change("contact.d", "2026-10-09", "starts"),
    change("contact.a", "2026-10-10"),
    change("contact.b", "2026-10-10", "eases"),
    change("contact.c", "2026-10-11"),
    change("contact.d", "2026-10-11", "eases"),
  ];
  const model = nowModel(week(events, next));

  it("lists only what is after the day, in the API's order, with no entry for a key the range does not hold or a day it does not show", () => {
    const keys = (i: number) => nowDay(model, i, "dmy").next.map((n) => `${n.key} ${n.change} ${n.date}`);
    expect(keys(0)).toEqual([
      "contact.a peaks 2026-10-06",
      "contact.a eases 2026-10-08",
      "contact.c peaks 2026-10-09",
      "contact.d starts 2026-10-09",
      "contact.a peaks 2026-10-10",
      "contact.b eases 2026-10-10",
    ]);
    expect(keys(1)).toEqual(keys(0).slice(1).concat(["contact.c peaks 2026-10-11"]));
    expect(keys(4)).toEqual(["contact.a peaks 2026-10-10", "contact.b eases 2026-10-10", "contact.c peaks 2026-10-11", "contact.d eases 2026-10-11"]);
    expect(keys(6)).toEqual([]);
  });

  it("stops at six, the day itself is never 'after', and each entry knows its place in the range and its own id", () => {
    expect(NEXT_MAX).toBe(6);
    const shown = nowDay(model, 3, "dmy");
    expect(shown.next.every((n) => n.date > shown.date)).toBe(true);
    const [first] = nowDay(model, 0, "dmy").next;
    expect(first).toMatchObject({ id: "contact.a.peaks.2026-10-06", index: 1, headline: "Headline of contact.a", change: "peaks" });
    expect(seen(first.when)).toBe("Tue 6 Oct");
    expect(seen(nowDay(nowModel(week(events, next)), 0, "mdy").next[0].when)).toBe("Tue Oct 6");
  });
});

describe("houses and what a reading builds on, in words", () => {
  it("names a house with its word, and leaves out one that has none", () => {
    expect(housesText([])).toBeNull();
    expect(housesText([0])).toBeNull();
    expect(housesText([13])).toBeNull();
    expect(housesText([1])).toBe("1st house (self)");
    expect(housesText([8, 7])).toBe("8th (depth) and 7th (partnership) houses");
    expect(housesText([4, 13])).toBe("4th house (home)");
    expect(housesText([1, 2, 3])).toBe("1st (self), 2nd (money) and 3rd (mind) houses");
  });

  it("says where a reading starts: a house by its word, a chapter by its title, anything else by the report", () => {
    expect(buildsOnText(null)).toBeNull();
    expect(buildsOnText({ kind: "house", house: 7 })).toEqual({ text: "This reading starts from what your Personal report says about your 7th house (partnership).", chapter: 2 });
    expect(buildsOnText({ kind: "house", house: 13 })).toMatchObject({ text: "This reading starts from what your Personal report says about your houses." });
    expect(buildsOnText({ kind: "chapter", chapter: "career" })).toEqual({ text: "This reading starts from what your Personal report says in Career & Calling.", chapter: 4 });
    expect(buildsOnText({ kind: "chapter", chapter: "no-such-chapter" })).toEqual({ text: "This reading starts from your Personal report.", chapter: null });
  });

  it("splits a reading at blank lines of any kind and keeps one line break inside a paragraph", () => {
    expect(paragraphs("One.\r\n\r\nTwo.\n  \n\n  Three.")).toEqual(["One.", "Two.", "Three."]);
    expect(paragraphs("One.\nStill one.")).toEqual(["One.\nStill one."]);
    expect(paragraphs("  \n\n ")).toEqual([]);
  });
});

describe("Life when the API sends less than a full life", () => {
  const BIRTH = "1991-03-14T07:40:00.000Z";
  const life = (over: Partial<TimelineLife> = {}): TimelineLife => ({ age: 35.2, birth: BIRTH, ages: [], cycles: [], waves: [], ...over });
  const cycle = (over: Partial<LifeCycleView> & Pick<LifeCycleView, "key" | "start" | "end">): LifeCycleView => ({
    id: "saturn-return", body: "saturn", name: "Saturn return", word: "settling", age: 29, exact: [over.start], past: false, repeats: false, passes: 1, reading: "none", ...over,
  });
  const known = (over: Partial<KnownAge>): KnownAge => ({ id: "saturn-return", age: 29, last: null, next: null, progress: 0.4, ...over });

  it("is empty for a life with nothing in it, and does not fail", () => {
    const model = lifeModel(life(), "2026-10-05", "UTC", "dmy");
    expect(model).toMatchObject({ ages: [], ahead: [], behind: [], waves: [], age: 35.2 });
    expect([...model.readings]).toEqual([]);
  });

  it("opens a known age on its next date at its age, or says it is happening now once its window has opened", () => {
    const ahead = cycle({ key: "cycle.saturn-return.20280604", start: at("2028-05-01"), end: at("2028-09-01"), exact: [at("2028-06-04")], age: 37 });
    const under = cycle({ key: "cycle.saturn-return.20260901", start: at("2026-08-01"), end: at("2026-12-01"), exact: [at("2026-09-01")] });
    const coming = lifeModel(life({ ages: [known({ age: 37, next: at("2028-06-04") })], cycles: [ahead] }), "2026-10-05", "UTC", "dmy");
    expect(seen(coming.ages[0].yours)).toBe("Next on 4 Jun 2028, at 37.");
    const now = lifeModel(life({ ages: [known({ next: at("2026-09-01") })], cycles: [under] }), "2026-10-05", "UTC", "dmy");
    expect(now.ages[0].yours).toBe("Happening now, at 29.");
    expect(now.ages[0].opens).toEqual({ key: under.key, name: "Saturn return", reading: "none" });
  });

  it("gives the age a last date was at from the cycle that held it, else the known age's own when nothing is next, else none", () => {
    const last = cycle({ key: "cycle.saturn-return.20200119", start: at("2019-12-01"), end: at("2020-03-01"), exact: [at("2020-01-19")], age: 28, past: true });
    const withCycle = lifeModel(life({ ages: [known({ last: at("2020-01-19") })], cycles: [last] }), "2026-10-05", "UTC", "dmy");
    expect(seen(withCycle.ages[0].yours)).toBe("Last on 19 Jan 2020, at 28.");
    const aloneNothingNext = lifeModel(life({ ages: [known({ last: at("2020-01-19") })] }), "2026-10-05", "UTC", "dmy");
    expect(seen(aloneNothingNext.ages[0].yours)).toBe("Last on 19 Jan 2020, at 29.");
    const aloneWithNext = lifeModel(life({ ages: [known({ last: at("2020-01-19"), next: at("2049-06-01") })] }), "2026-10-05", "UTC", "dmy");
    expect(seen(aloneWithNext.ages[0].yours)).toBe("Next on 1 Jun 2049, at 29. Last on 19 Jan 2020.");
    expect(aloneWithNext.ages[0].opens).toBeNull();
  });

  it("matches a cycle to a known age by the instant, not by how the string is written", () => {
    const c = cycle({ key: "cycle.saturn-return.20280604", start: at("2028-05-01"), end: at("2028-09-01"), exact: ["2028-06-04T12:00:00Z"], age: 37 });
    const model = lifeModel(life({ ages: [known({ age: 37, next: "2028-06-04T12:00:00.000Z" })], cycles: [c] }), "2026-10-05", "UTC", "dmy");
    expect(model.ages[0].opens?.key).toBe(c.key);
  });

  it("puts what is under way or ahead soonest first, what is behind most recent first, and breaks a tie by key", () => {
    const mk = (key: string, start: string, end: string, exact?: string) => cycle({ key, id: "jupiter-return", body: "jupiter", start: at(start), end: at(end), exact: exact ? [at(exact)] : [], repeats: true });
    const cycles = [
      mk("cycle.jupiter-return.20300101", "2029-12-01", "2030-02-01", "2030-01-01"),
      mk("cycle.jupiter-return.20270101", "2026-12-01", "2027-02-01", "2027-01-01"),
      mk("cycle.jupiter-return.20150101", "2014-12-01", "2015-02-01", "2015-01-01"),
      mk("cycle.jupiter-return.20030101", "2002-12-01", "2003-02-01", "2003-01-01"),
      mk("cycle.jupiter-return.b", "2027-06-01", "2027-07-01", "2027-06-15"),
      mk("cycle.jupiter-return.a", "2027-06-01", "2027-07-01", "2027-06-15"),
    ];
    const model = lifeModel(life({ cycles }), "2026-10-05", "UTC", "dmy");
    expect(model.ahead.map((c) => c.key)).toEqual(["cycle.jupiter-return.20270101", "cycle.jupiter-return.a", "cycle.jupiter-return.b", "cycle.jupiter-return.20300101"]);
    expect(model.behind.map((c) => c.key)).toEqual(["cycle.jupiter-return.20150101", "cycle.jupiter-return.20030101"]);
  });

  it("looks back from a repeating cycle to the one before it of the same kind, and not across kinds", () => {
    const first = cycle({ key: "cycle.jupiter-return.20030101", id: "jupiter-return", body: "jupiter", start: at("2002-12-01"), end: at("2003-02-01"), exact: [at("2003-01-01")], age: 12, past: true });
    const second = cycle({ key: "cycle.jupiter-return.20150101", id: "jupiter-return", body: "jupiter", start: at("2014-12-01"), end: at("2015-02-01"), exact: [at("2015-01-01")], age: 24, past: true });
    const other = cycle({ key: "cycle.saturn-return.20200101", start: at("2019-12-01"), end: at("2020-02-01"), exact: [at("2020-01-01")], past: true });
    const model = lifeModel(life({ cycles: [second, other, first] }), "2026-10-05", "UTC", "dmy");
    const byKey = new Map([...model.ahead, ...model.behind].map((c) => [c.key, c]));
    expect(byKey.get(first.key)?.last).toBeNull();
    expect(byKey.get(second.key)?.last).toEqual({ on: "2003-01-01", age: 12 });
    expect(byKey.get(second.key)?.ages).toEqual([12, 24]);
    expect(byKey.get(other.key)?.last).toBeNull();
  });

  it("rings a cycle with its planet's round only where a known age sends one, and keeps each cycle's reading state by key", () => {
    const saturn = cycle({ key: "cycle.saturn-return.20200101", start: at("2019-12-01"), end: at("2020-02-01"), reading: "ready" });
    const neptune = cycle({ key: "cycle.neptune-square.20400101", id: "neptune-square", body: "neptune", name: "Neptune square", start: at("2039-12-01"), end: at("2040-02-01"), reading: "writing" });
    const model = lifeModel(life({ ages: [known({ progress: 0.83 })], cycles: [saturn, neptune] }), "2026-10-05", "UTC", "dmy");
    const rings = new Map([...model.ahead, ...model.behind].map((c) => [c.key, c.progress]));
    expect([rings.get(saturn.key), rings.get(neptune.key)]).toEqual([0.83, null]);
    expect([...model.readings]).toEqual([[saturn.key, "ready"], [neptune.key, "writing"]]);
  });

  it("marks each cycle on its planet's wave at the first exact pass, from the reader's own birth, and leaves a wave with none bare", () => {
    const saturn = cycle({ key: "cycle.saturn-return.20200101", start: at("2019-12-01"), end: at("2020-02-01"), exact: [at("2020-01-19")] });
    const noExact = cycle({ key: "cycle.saturn-opposition.20330101", id: "saturn-opposition", start: at("2032-12-01"), end: at("2033-02-01"), exact: [] });
    const waves = [{ body: "saturn", points: [{ age: 0, distance: 0 }, { age: 1, distance: 30 }] }, { body: "jupiter", points: [{ age: 0, distance: 0 }] }];
    const lines = waveLinesOf({ birth: BIRTH, cycles: [saturn, noExact], waves });
    expect(lines.map((l) => [l.body, l.marks?.length])).toEqual([["saturn", 2], ["jupiter", 0]]);
    const first = lines[0].marks![0];
    expect(first.age).toBeGreaterThan(28.5);
    expect(first.age).toBeLessThan(29.5);
    expect(waveLinesOf({ birth: BIRTH, cycles: [saturn], waves: [] })).toEqual([]);
  });
});
