/**
 * Timeline's own page (R16-27; acceptance 1 and 3; readings 4, 7, 17 to 19): every date and degree Now and ahead and
 * Life print is one the API sent. The payloads are built here as the server builds them (`api/src/lib/timeline.ts`,
 * which the web cannot import), from Mira's fixture through the engine, so no placement in them is typed by hand; the
 * screens' strings are then read back line by line, every date and degree in them looked up in the payload.
 */
import { describe, expect, it } from "vitest";
import {
  CYCLE_WORDS, DOCTRINE, KNOWN_AGES, ageAt, calculateNatalChart, exactHits, factsOf, hasHorizon, headlineOf, inEffect, lifeCycles,
  longitudeAt, natalLongitudes, offsetAtBirth, readsAs, roundProgress, skyEvents, waves,
  type ContactEvent, type LifeCycle, type NatalChartData, type NatalTarget, type SkyEvent, type Tone,
} from "@workspace/engine";
import type { TimelineEvent, TimelineLife, TimelineNow, TimelineRange } from "@workspace/api-client-react";
import { cycleChip, cycleFact, cycleMark, lookBack, wavesLabel } from "./life-view";
import {
  BLIND_FIX, BLIND_LINE, NEXT_MAX, ONE_DAY, QUIET_DAY, RANGES, buildsOnText, comingUpTitle, contactOf, housesText,
  lifeModel, nothingNext, nowDay, nowModel, paragraphs, rangeSpan, reads, waveLinesOf, type LifeModel, type NowDay,
} from "./now-ahead";
import { READ_LINE, TONE_WORDS, dayIn, fullDate } from "./timeline-view";
import fixture from "../../../fixtures/sample-people/mira.json";

const ZONE = fixture.timezone;
/** A Monday morning in Lisbon, inside Saturn's second pass over Mira's Ascendant. */
const NOW = new Date("2026-10-05T09:00:00Z");
const RANGE_DAYS: Record<TimelineRange, number> = { week: 7, month: 30, "six-months": 182 };
const ORDERS = ["dmy", "mdy", "ymd"] as const;

const timed = calculateNatalChart(fixture.birthDate, fixture.birthTime, fixture.latitude, fixture.longitude, ZONE, 0);
// The same birth with the time not recorded, the band at 720 minutes around noon (ADR-33): no horizon, so blind.
const blind = calculateNatalChart(fixture.birthDate, "12:00", fixture.latitude, fixture.longitude, ZONE, 720);


const norm = (deg: number) => ((deg % 360) + 360) % 360;
const arc = (a: number, b: number) => {
  const d = norm(a - b);
  return d > 180 ? d - 360 : d;
};
const r2 = (n: number) => Math.round(n * 100) / 100;
const iso = (at: Date) => at.toISOString();

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function startOf(day: string, zone: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - offsetAtBirth(zone, day, "00:00") * 3_600_000);
}

function natalOf(chart: NatalChartData, target: NatalTarget): number {
  if (target === "ascendant") return chart.angles?.ascendant.absoluteDegree ?? Number.NaN;
  if (target === "midheaven") return chart.angles?.midheaven.absoluteDegree ?? Number.NaN;
  return chart.planets[target]?.absoluteDegree ?? Number.NaN;
}

function aspectPoint(chart: NatalChartData, event: ContactEvent): number {
  const base = natalOf(chart, event.target);
  const angle = DOCTRINE.angles[event.aspect];
  const places = angle === 0 || angle === 180 ? [norm(base + angle)] : [norm(base + angle), norm(base - angle)];
  const at = longitudeAt(event.body, event.window.exact[0] ?? event.window.start);
  return places.reduce((best, place) => (Math.abs(arc(at, place)) < Math.abs(arc(at, best)) ? place : best));
}

function spansOf(event: SkyEvent, point: number | null): { start: Date; end: Date }[] {
  if (event.kind === "retrograde") return [{ start: event.start, end: event.end }];
  if (event.kind === "eclipse") return [{ start: event.eclipse.at, end: event.eclipse.at }];
  const { body, orb, window } = event;
  if (point === null) return [{ start: window.start, end: window.end }];
  const start = window.start.getTime();
  const end = window.end.getTime();
  const crossings = [norm(point + orb), norm(point - orb)]
    .flatMap((edge) => exactHits(body, edge, window.start, window.end))
    .map((at) => at.getTime())
    .filter((t) => t - start > 120_000 && end - t > 120_000)
    .sort((a, b) => a - b);
  const marks = [start, ...crossings, end];
  const within = (t: number) => Math.abs(arc(longitudeAt(body, new Date(t)), point)) <= orb;
  const spans: { start: Date; end: Date }[] = [];
  for (let i = 1; i < marks.length; i++) {
    const [a, b] = [marks[i - 1], marks[i]];
    if (b <= a) continue;
    const q = (b - a) / 4;
    if ([a + q, a + 2 * q, a + 3 * q].filter(within).length < 2) continue;
    const last = spans[spans.length - 1];
    if (last && last.end.getTime() === a) last.end = new Date(b);
    else spans.push({ start: new Date(a), end: new Date(b) });
  }
  return spans.length ? spans : [{ start: window.start, end: window.end }];
}

function eventOf(chart: NatalChartData, event: SkyEvent, now: Date, line: string | null): TimelineEvent {
  const point = event.kind === "contact" ? aspectPoint(chart, event) : null;
  const words = {
    spans: spansOf(event, point).map((s) => ({ start: iso(s.start), end: iso(s.end) })),
    tone: event.tone,
    headline: headlineOf(event),
    facts: factsOf(event),
    line: readsAs(event) ? line : null,
    reading: (readsAs(event) && line ? "ready" : "none") as TimelineEvent["reading"],
  };
  if (event.kind === "contact") {
    const t = now.getTime();
    const inside = t >= event.window.start.getTime() && t <= event.window.end.getTime();
    const orb = point === null || !inside ? null : Math.abs(arc(longitudeAt(event.body, now), point));
    return {
      key: event.key, kind: "contact", body: event.body, aspect: event.aspect, target: event.target,
      houses: event.house === null ? [] : [event.house], start: iso(event.window.start), end: iso(event.window.end),
      exact: event.window.exact.map(iso), orbNow: orb !== null && orb <= event.orb ? r2(orb) : null, ...words,
    };
  }
  if (event.kind === "retrograde") {
    return {
      key: event.key, kind: "retrograde", body: event.body, aspect: null, target: null, houses: [...event.houses],
      start: iso(event.start), end: iso(event.end), exact: [], orbNow: null, ...words,
    };
  }
  return {
    key: event.key, kind: "eclipse", body: event.eclipse.kind === "solar" ? "sun" : "moon", aspect: null,
    target: event.near?.target ?? null, houses: event.house === null ? [] : [event.house], start: iso(event.eclipse.at),
    end: iso(event.eclipse.at), exact: [iso(event.eclipse.at)], orbNow: null, ...words,
  };
}

function changesOf(event: SkyEvent): { at: Date; change: "starts" | "peaks" | "eases" }[] {
  if (event.kind === "contact") {
    return [
      { at: event.window.start, change: "starts" },
      ...event.window.exact.map((at) => ({ at, change: "peaks" as const })),
      { at: event.window.end, change: "eases" },
    ];
  }
  if (event.kind === "retrograde") return [{ at: event.start, change: "starts" }, { at: event.end, change: "eases" }];
  return [{ at: event.eclipse.at, change: "peaks" }];
}

const RANK: Record<Tone, number> = { intense: 0, mixed: 1, easy: 2 };
const CHANGE_RANK = { starts: 0, peaks: 1, eases: 2 } as const;
const NATAL_BODIES = DOCTRINE.targets.filter((t) => t !== "ascendant" && t !== "midheaven");

/** One reading is written, Saturn's on her Ascendant, so a card's own line shows where a reading gives one. */
const SATURN_LINE = "For a few months you think more about how you come across and what you take on.";

function nowOf(chart: NatalChartData, range: TimelineRange, now: Date = NOW, zone: string = ZONE): TimelineNow {
  const count = RANGE_DAYS[range];
  const dates = Array.from({ length: count }, (_, i) => addDays(dayIn(now, zone), i));
  const starts = [...dates, addDays(dates[0], count)].map((day) => startOf(day, zone).getTime());
  const events = skyEvents(chart, new Date(starts[0]), new Date(starts[count] - 1));
  const contacts = events.filter((e): e is ContactEvent => e.kind === "contact");
  const drawn = hasHorizon(chart);
  return {
    range,
    from: dates[0],
    to: dates[count - 1],
    zone,
    blind: !drawn,
    natal: NATAL_BODIES.flatMap((body) => {
      const planet = chart.planets[body];
      if (!planet || (!drawn && body === "moon")) return [];
      return [{ body, lon: planet.absoluteDegree, house: drawn ? (planet.house ?? null) : null }];
    }),
    angles: drawn ? { ascendant: chart.angles!.ascendant.absoluteDegree, midheaven: chart.angles!.midheaven.absoluteDegree } : null,
    days: dates.map((date, i) => ({
      date,
      tones: inEffect(contacts, new Date(starts[i])).map((e) => e.tone).sort((a, b) => RANK[a] - RANK[b]),
    })),
    events: events.map((event) => eventOf(chart, event, now, event.key.startsWith("contact.saturn.conjunction.ascendant") ? SATURN_LINE : null)),
    next: events
      .flatMap((event) => changesOf(event).map(({ at, change }) => ({ key: event.key, at, change })))
      .filter(({ at }) => at.getTime() > now.getTime() && at.getTime() < starts[count])
      .sort((x, y) => x.at.getTime() - y.at.getTime() || CHANGE_RANK[x.change] - CHANGE_RANK[y.change] || x.key.localeCompare(y.key))
      .map(({ key, at, change }) => ({ key, at: iso(at), change })),
  };
}

function exactAge(birth: Date, at: Date): number {
  const whole = ageAt(birth, at);
  const birthday = (years: number) => {
    const day = new Date(birth.getTime());
    day.setUTCFullYear(birth.getUTCFullYear() + years);
    return day.getTime();
  };
  const last = birthday(whole);
  return (whole * 1000 + Math.floor((1000 * (at.getTime() - last)) / (birthday(whole + 1) - last))) / 1000;
}

function lifeOf(chart: NatalChartData, now: Date = NOW, zone: string = ZONE): TimelineLife {
  const natal = natalLongitudes(chart);
  const birth = new Date(chart.datetimeUtc);
  const cycles = lifeCycles(natal, birth);
  const today = dayIn(now, zone);
  const past = (cycle: LifeCycle) => dayIn(cycle.window.end, zone) < today;
  const anchor = (cycle: LifeCycle) => cycle.window.exact[0] ?? cycle.window.start;
  return {
    age: exactAge(birth, now),
    birth: iso(birth),
    ages: KNOWN_AGES.flatMap(({ id, body }) => {
      const home = natal[body];
      const own = cycles.filter((c) => c.id === id);
      const at = own.findIndex((c) => !past(c));
      const focus = at < 0 ? null : own[at];
      const before = at < 0 ? (own[own.length - 1] ?? null) : (own[at - 1] ?? null);
      const shown = focus ?? before;
      if (!shown || home === undefined) return [];
      return [{
        id, age: shown.age, last: before ? iso(anchor(before)) : null, next: focus ? iso(anchor(focus)) : null,
        progress: Math.round(roundProgress(body, home, now) * 1000) / 1000,
      }];
    }),
    cycles: cycles.map((cycle) => ({
      key: cycle.key, id: cycle.id, body: cycle.body, ...CYCLE_WORDS[cycle.id], age: cycle.age,
      exact: cycle.window.exact.map(iso), start: iso(cycle.window.start), end: iso(cycle.window.end), past: past(cycle),
      repeats: cycle.repeats, passes: cycle.passes, reading: "none" as const,
    })),
    waves: waves(natal, birth).map((w) => ({ body: w.body, points: w.points.map(({ age, distance }) => ({ age, distance })) })),
  };
}

const NOWS = Object.fromEntries((Object.keys(RANGE_DAYS) as TimelineRange[]).map((r) => [r, nowOf(timed, r)])) as Record<TimelineRange, TimelineNow>;
const BLIND_WEEK = nowOf(blind, "week");
const LIFE = lifeOf(timed);


const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = "Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday";
const S = SHORT.join("|");
const L = LONG.join("|");

interface Mention { raw: string; y?: number; m: number; d?: number }

const month = (name: string) => (SHORT.includes(name) ? SHORT.indexOf(name) : LONG.indexOf(name)) + 1;

/**
 * Every calendar date, month or year a printed line names, read in the order it was printed in: a year-first list
 * ("2025 Apr 15, 2025 May 24") would read as month-first dates with the next item's year.
 */
function mentions(line: string, order: (typeof ORDERS)[number] = "dmy"): Mention[] {
  const text = line.replace(/\u00a0/g, " ");
  const found: Mention[] = [];
  const scan = (re: RegExp, read: (m: RegExpExecArray) => Mention) => {
    for (const m of text.matchAll(re)) found.push(read(m as RegExpExecArray));
  };
  const dayFirst = (re: string) => scan(new RegExp(re, "g"), (m) => ({ raw: m[0], d: +m[1], m: month(m[2]), y: m[3] ? +m[3] : undefined }));
  const monthFirst = (re: string) => scan(new RegExp(re, "g"), (m) => ({ raw: m[0], m: month(m[1]), d: +m[2], y: m[3] ? +m[3] : undefined }));
  if (order === "dmy") {
    dayFirst(`\\b(\\d{1,2}) (${S}|${L})\\b(?: (\\d{4}))?`);
    scan(new RegExp(`\\b(${L}) (\\d{4})\\b`, "g"), (m) => ({ raw: m[0], m: month(m[1]), y: +m[2] }));
  } else if (order === "mdy") {
    monthFirst(`\\b(${S}|${L}) (\\d{1,2})\\b(?:, (\\d{4}))?`);
    scan(new RegExp(`\\b(${L}) (\\d{4})\\b`, "g"), (m) => ({ raw: m[0], m: month(m[1]), y: +m[2] }));
  } else {
    scan(new RegExp(`\\b(\\d{4}) (${S}) (\\d{1,2})\\b`, "g"), (m) => ({ raw: m[0], y: +m[1], m: month(m[2]), d: +m[3] }));
    monthFirst(`\\b(${S}) (\\d{1,2})\\b()`);
    // A long month comes first only after its weekday ("Monday, October 5"); "May" is a short name too.
    monthFirst(`(?:${DAYS}), (${L}) (\\d{1,2})\\b(?:, (\\d{4}))?`);
    scan(new RegExp(`\\b(\\d{4}) (${L})\\b`, "g"), (m) => ({ raw: m[0], y: +m[1], m: month(m[2]) }));
  }
  scan(new RegExp(`\\b(${L})\\b`, "g"), (m) => ({ raw: m[0], m: month(m[1]) }));
  scan(/\b((?:19|20)\d{2})\b/g, (m) => ({ raw: m[0], y: +m[1], m: 0 }));
  return found;
}

function degrees(line: string): string[] {
  return [...line.matchAll(/(\d+(?:\.\d+)?)°/g)].map((m) => m[1]);
}

/** The days a payload holds, as the reader's own, and the degrees it sends. */
function sentDays(values: readonly string[], zone: string): Set<string> {
  return new Set(values.map((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : dayIn(v, zone))));
}

function nowSent(now: TimelineNow): { days: Set<string>; degrees: Set<string> } {
  const values = [now.from, now.to, ...now.days.map((d) => d.date), ...now.next.map((n) => n.at)];
  for (const e of now.events) values.push(e.start, e.end, ...e.exact, ...e.spans.flatMap((s) => [s.start, s.end]));
  const degs = now.events.flatMap((e) => (e.orbNow === null ? [] : [Math.abs(e.orbNow).toFixed(2)]));
  return { days: sentDays(values, now.zone), degrees: new Set(degs) };
}

function lifeSent(life: TimelineLife, zone: string): Set<string> {
  const values = [life.birth];
  for (const c of life.cycles) values.push(c.start, c.end, ...c.exact);
  for (const a of life.ages) values.push(...[a.last, a.next].filter((v): v is string => v !== null));
  return sentDays(values, zone);
}

function unsent(lines: readonly string[], days: Set<string>, degs: Set<string>, order: (typeof ORDERS)[number] = "dmy"): string[] {
  const held = [...days].map((day) => day.split("-").map(Number));
  const bad: string[] = [];
  for (const line of lines) {
    for (const m of mentions(line, order)) {
      const ok = held.some(([y, mo, d]) => (m.y === undefined || m.y === y) && (m.m === 0 || m.m === mo) && (m.d === undefined || m.d === d));
      if (!ok) bad.push(`"${m.raw}" in "${line}"`);
    }
    for (const deg of degrees(line)) if (!degs.has(deg)) bad.push(`${deg}° in "${line}"`);
  }
  return bad;
}

/** Every string a Now and ahead day prints: the heading, each card as ContactCard draws it, and what comes up. */
function nowLines(now: TimelineNow, day: NowDay, order: (typeof ORDERS)[number]): string[] {
  const range = now.range;
  const lines = [day.title, rangeSpan(now, order), comingUpTitle(range), nothingNext(range), QUIET_DAY];
  for (const card of day.cards) {
    lines.push(card.headline, card.line ?? "", card.lasts, card.facts, card.tone ? TONE_WORDS[card.tone] : "", card.reads ? READ_LINE : "");
  }
  for (const next of day.next) lines.push(next.when, next.headline, next.change);
  if (now.blind) lines.push(BLIND_LINE, BLIND_FIX);
  return lines.filter(Boolean);
}

/** Every string Life prints: the known ages, each cycle as CycleCard draws it, and the waves in words. */
function lifeLines(model: LifeModel, today: string, order: (typeof ORDERS)[number]): string[] {
  const lines: string[] = [];
  for (const age of model.ages) lines.push(age.label, age.name, age.word, age.about, age.yours);
  for (const cycle of [...model.ahead, ...model.behind]) {
    lines.push(cycle.name, cycle.word, cycleFact(cycle, order), cycleChip(cycle, today), lookBack(cycle, today, order) ?? "");
  }
  lines.push(wavesLabel(model.waves, model.age));
  return lines.filter(Boolean);
}


describe("every date and degree on either screen is one the API sent (acceptance 1)", () => {
  it("reads a date in every order the page prints, and flags one the payload lacks", () => {
    const sent = nowSent(NOWS.week);
    expect(mentions("Until 18 Oct, back in February").map((m) => m.raw)).toEqual(["18 Oct", "February"]);
    expect(mentions("Oct 18, 2026", "mdy").map((m) => [m.y, m.m, m.d])).toContainEqual([2026, 10, 18]);
    expect(mentions("2025 Apr 15, 2025 May 24", "ymd").filter((m) => m.d && m.y).map((m) => [m.y, m.m, m.d])).toEqual([[2025, 4, 15], [2025, 5, 24]]);
    expect(mentions("Monday, May 24, 2027", "ymd").filter((m) => m.d && m.y).map((m) => [m.y, m.m, m.d])).toEqual([[2027, 5, 24]]);
    expect(unsent(["Monday 1 January 1999"], sent.days, sent.degrees)).not.toEqual([]);
    expect(unsent(["orb 9.99°"], sent.days, sent.degrees)).not.toEqual([]);
    expect(unsent([`exact ${NOWS.week.from}`], sent.days, sent.degrees)).toEqual([]);
  });

  for (const range of Object.keys(RANGE_DAYS) as TimelineRange[]) {
    it(`prints only the API's dates and degrees on each day of ${range}, in every order`, () => {
      const now = NOWS[range];
      const sent = nowSent(now);
      const model = nowModel(now);
      for (const order of ORDERS) {
        for (let i = 0; i < now.days.length; i++) {
          const day = nowDay(model, i, order);
          expect(unsent(nowLines(now, day, order), sent.days, sent.degrees, order), `${range} day ${i} (${order})`).toEqual([]);
        }
      }
    });
  }

  it("prints only the API's dates on a blind week", () => {
    const sent = nowSent(BLIND_WEEK);
    const model = nowModel(BLIND_WEEK);
    for (let i = 0; i < BLIND_WEEK.days.length; i++) {
      expect(unsent(nowLines(BLIND_WEEK, nowDay(model, i, "dmy"), "dmy"), sent.days, sent.degrees)).toEqual([]);
    }
  });

  it("prints only the API's dates across Life, in every order", () => {
    const sent = lifeSent(LIFE, ZONE);
    const today = dayIn(NOW, ZONE);
    for (const order of ORDERS) {
      expect(unsent(lifeLines(lifeModel(LIFE, today, ZONE, order), today, order), sent, new Set(), order), order).toEqual([]);
    }
  });
});

describe("Now and ahead: what the day shows", () => {
  const week = NOWS.week;
  const model = nowModel(week);
  const today = nowDay(model, 0, "dmy");

  it("lists every event the engine holds on that day, as its inEffect counts one", () => {
    for (const range of ["week", "month"] as TimelineRange[]) {
      const now = NOWS[range];
      const m = nowModel(now);
      const events = skyEvents(timed, startOf(now.from, ZONE), new Date(startOf(addDays(now.to, 1), ZONE).getTime() - 1));
      now.days.forEach((d, i) => {
        const held = inEffect(events, startOf(d.date, ZONE)).map((e) => e.key).sort();
        expect(nowDay(m, i, "dmy").cards.map((c) => c.key).sort(), `${range} ${d.date}`).toEqual(held);
      });
    }
  });

  it("draws the mix bar from the API's tones, which are the day's contact cards' tones", () => {
    for (const range of Object.keys(RANGE_DAYS) as TimelineRange[]) {
      const m = nowModel(NOWS[range]);
      NOWS[range].days.forEach((_, i) => {
        const day = nowDay(m, i, "dmy");
        const contacts = day.cards.filter((c) => c.kind === "contact").map((c) => c.tone as Tone).sort((a, b) => RANK[a] - RANK[b]);
        expect(day.tones, `${range} ${day.date}`).toEqual(contacts);
      });
    }
  });

  it("puts the strongest first, a contact before a retrograde before an eclipse, and says the day once", () => {
    const rank = (t: Tone | null) => (t === null ? 3 : RANK[t]);
    const sixMonths = nowModel(NOWS["six-months"]);
    for (let i = 0; i < NOWS["six-months"].days.length; i++) {
      const cards = nowDay(sixMonths, i, "dmy").cards;
      for (let k = 1; k < cards.length; k++) expect(rank(cards[k - 1].tone)).toBeLessThanOrEqual(rank(cards[k].tone));
    }
    expect(today.today).toBe(true);
    expect(today.title.replace(/ /g, " ")).toBe("Monday 5 October");
    expect(nowDay(model, 3, "dmy").today).toBe(false);
  });

  it("says how long Saturn on her Ascendant lasts, and that it comes back after the gap", () => {
    const saturn = today.cards.find((c) => c.key.startsWith("contact.saturn.conjunction.ascendant"));
    expect(saturn, "Saturn on her Ascendant this Monday").toBeDefined();
    expect(saturn!.lasts).toMatch(/^Until .+, back in [A-Z][a-z]+$/);
    expect(saturn!.line).toBe(SATURN_LINE);
    expect(saturn!.facts).toContain("Saturn on your Ascendant · 1st house (self)");
    expect(saturn!.facts).toMatch(/· orb \d+\.\d{2}° ·/);
    expect(contactOf(saturn!)).toEqual({ key: saturn!.key, tone: saturn!.tone, headline: saturn!.headline, line: saturn!.line, lasts: saturn!.lasts, facts: saturn!.facts });
  });

  it("prints a contact's orb on today only, since it is today's", () => {
    for (let i = 1; i < week.days.length; i++) {
      for (const card of nowDay(model, i, "dmy").cards) expect(card.facts, `${week.days[i].date} ${card.key}`).not.toMatch(/orb /);
    }
  });

  it("keeps a contact without a reading to its headline, and names a house with its word", () => {
    for (const card of today.cards.filter((c) => !c.key.startsWith("contact.saturn.conjunction.ascendant"))) expect(card.line).toBeNull();
    for (const card of today.cards) expect(card.facts).not.toMatch(/\d(st|nd|rd|th) house(?! \()/);
  });

  it("lists only what comes after the day shown, at most six, each with its day's place in the range", () => {
    const six = nowModel(NOWS["six-months"]);
    for (const i of [0, 10, 90, 181]) {
      const day = nowDay(six, i, "dmy");
      expect(day.next.length).toBeLessThanOrEqual(NEXT_MAX);
      for (const next of day.next) {
        expect(next.date > day.date).toBe(true);
        expect(NOWS["six-months"].days[next.index].date).toBe(next.date);
        expect(["starts", "peaks", "eases"]).toContain(next.change);
      }
    }
    expect(nowDay(six, 181, "dmy").next).toEqual([]);
  });

  it("says the range in the reader's order, and what comes up in it", () => {
    expect(rangeSpan(week, "dmy").replace(/ /g, " ")).toBe("5 Oct to 11 Oct");
    expect(rangeSpan(week, "mdy").replace(/ /g, " ")).toBe("Oct 5 to Oct 11");
    expect(RANGES.map((r) => r.label)).toEqual(["Week", "Month", "6 months"]);
    expect(comingUpTitle("week")).toBe("Coming up this week");
    expect(nothingNext("six-months")).toBe("Nothing else starts, peaks or eases in the next 6 months.");
  });

  it("gives a retrograde its station days and no exact pass", () => {
    const six = nowModel(NOWS["six-months"]);
    const retro = NOWS["six-months"].events.find((e) => e.kind === "retrograde");
    expect(retro, "a retrograde in six months").toBeDefined();
    const i = NOWS["six-months"].days.findIndex((d) => d.date >= dayIn(retro!.start, ZONE));
    const card = nowDay(six, Math.max(0, i), "dmy").cards.find((c) => c.key === retro!.key)!;
    expect(card.facts).not.toContain("exact");
    expect(card.facts).toMatch(/ to /);
    expect(card.lasts).toMatch(/^(Until |Eases today)/);
    expect(card.reads).toBe(retro!.houses.length > 0);
  });

  it("shows an eclipse on its day, and one far from every point has no tone word and no reading", () => {
    const six = NOWS["six-months"];
    const eclipse = six.events.find((e) => e.kind === "eclipse");
    expect(eclipse, "an eclipse in six months").toBeDefined();
    const at = six.days.findIndex((d) => d.date === dayIn(eclipse!.start, ZONE));
    const card = nowDay(nowModel(six), at, "dmy").cards.find((c) => c.key === eclipse!.key)!;
    expect(card.lasts).toBe(ONE_DAY);
    expect(card.facts).not.toContain("exact");
    // As the API sends an eclipse that falls near no natal point (ADR-208).
    const far: TimelineEvent = { ...eclipse!, target: null, tone: null, facts: { ...eclipse!.facts, sky: eclipse!.facts.sky.replace(/ near your .+$/, "") } };
    const alone: TimelineNow = { ...six, events: [far], next: [] };
    const farCard = nowDay(nowModel(alone), at, "dmy").cards[0];
    expect(farCard.tone).toBeNull();
    expect(farCard.reads).toBe(false);
    expect(contactOf(farCard)).toBeNull();
  });

  it("reads what the doctrine reads: every contact, a retrograde in a known house, an eclipse near a point (reading 7)", () => {
    expect(reads({ kind: "contact", houses: [], target: "sun" })).toBe(true);
    expect(reads({ kind: "retrograde", houses: [8, 7], target: null })).toBe(true);
    expect(reads({ kind: "retrograde", houses: [], target: null })).toBe(false);
    expect(reads({ kind: "eclipse", houses: [5], target: "sun" })).toBe(true);
    expect(reads({ kind: "eclipse", houses: [5], target: null })).toBe(false);
  });
});

describe("Now and ahead without a birth time (acceptance 3, R-4.6)", () => {
  const model = nowModel(BLIND_WEEK);

  it("has no angle, house or natal Moon contact, and prints no house", () => {
    expect(BLIND_WEEK.blind).toBe(true);
    expect(BLIND_WEEK.angles).toBeNull();
    for (let i = 0; i < BLIND_WEEK.days.length; i++) {
      for (const card of nowDay(model, i, "dmy").cards) {
        expect(card.key).not.toMatch(/\.(ascendant|midheaven|moon)\./);
        expect(card.facts).not.toMatch(/house/);
      }
    }
  });

  it("says once what can't be timed, and how to add the time", () => {
    expect(BLIND_LINE).toMatch(/^Without your birth time, Timeline leaves out your Ascendant, Midheaven, Moon and houses/);
    expect(BLIND_FIX).toBe("Add your birth time on your Personal report to see them.");
  });
});

describe("houses and readings in words", () => {
  it("never prints a house as a bare number (§9, ADR-98)", () => {
    expect(housesText([])).toBeNull();
    expect(housesText([1])).toBe("1st house (self)");
    expect(housesText([8, 7])).toBe("8th (depth) and 7th (partnership) houses");
    expect(housesText([0, 13])).toBeNull();
  });

  it("says where a reading starts in the report, and the chapter its link opens at (reading 10)", () => {
    expect(buildsOnText(null)).toBeNull();
    expect(buildsOnText({ kind: "house", house: 1 })).toEqual({
      text: "This reading starts from what your Personal report says about your 1st house (self).",
      chapter: 2,
    });
    expect(buildsOnText({ kind: "chapter", chapter: "career" })).toEqual({
      text: "This reading starts from what your Personal report says in Career & Calling.",
      chapter: 4,
    });
    expect(buildsOnText({ kind: "chapter", chapter: "nowhere" })).toEqual({ text: "This reading starts from your Personal report.", chapter: null });
  });

  it("splits a reading into its paragraphs at a blank line", () => {
    expect(paragraphs("One.\n\nTwo.\n  \nThree.\n")).toEqual(["One.", "Two.", "Three."]);
    expect(paragraphs("One line\nstill one.")).toEqual(["One line\nstill one."]);
  });
});

describe("Life (ADR-209)", () => {
  const today = dayIn(NOW, ZONE);
  const model = lifeModel(LIFE, today, ZONE, "dmy");

  it("opens on the four known ages, each with its label, its words and the reader's own dates", () => {
    expect(model.ages.map((a) => a.id)).toEqual(KNOWN_AGES.map((k) => k.id));
    expect(model.ages.map((a) => a.label)).toEqual(KNOWN_AGES.map((k) => k.label));
    for (const age of model.ages) {
      expect(age.name).toBe(CYCLE_WORDS[age.id].name);
      expect(age.word).toBe(CYCLE_WORDS[age.id].word);
      expect(age.about).not.toBe("");
      expect(age.yours).toMatch(/^(Happening now|Next on|Last on)/);
      expect(age.opens).not.toBeNull();
    }
    const saturn = model.ages.find((a) => a.id === "saturn-return")!;
    const sent = LIFE.ages.find((a) => a.id === "saturn-return")!;
    const said = (at: string) => fullDate(dayIn(at, ZONE), "dmy");
    expect(sent.next && sent.last).toBeTruthy();
    expect(saturn.yours).toBe(`Next on ${said(sent.next!)}, at ${sent.age}. Last on ${said(sent.last!)}, at 29.`);
  });

  it("gives every cycle a card, under way and ahead soonest first, behind most recent first", () => {
    const day = (c: { exact: readonly string[]; start: string }) => c.exact[0] ?? c.start;
    expect(model.ahead.length + model.behind.length).toBe(LIFE.cycles.length);
    for (let k = 1; k < model.ahead.length; k++) expect(day(model.ahead[k - 1]) <= day(model.ahead[k])).toBe(true);
    for (let k = 1; k < model.behind.length; k++) expect(day(model.behind[k - 1]) >= day(model.behind[k])).toBe(true);
    for (const cycle of model.behind) expect(cycle.end < today).toBe(true);
    for (const cycle of model.ahead) expect(cycle.end >= today).toBe(true);
  });

  it("looks a repeating cycle back to the one before, with its age, and lists every age it comes at", () => {
    const jupiter = [...model.ahead, ...model.behind].filter((c) => c.id === "jupiter-return").sort((a, b) => a.start.localeCompare(b.start));
    expect(jupiter.length).toBeGreaterThan(3);
    expect(jupiter[0].last).toBeNull();
    for (let k = 1; k < jupiter.length; k++) {
      expect(jupiter[k].last).toEqual({ on: jupiter[k - 1].exact[0] ?? jupiter[k - 1].start, age: jupiter[k - 1].age });
      expect(jupiter[k].ages).toEqual(jupiter.map((c) => c.age));
    }
  });

  it("rings a cycle with its planet's round today where the API sends one, and none where it doesn't", () => {
    const of = (id: string) => [...model.ahead, ...model.behind].find((c) => c.id === id);
    const saturnAge = LIFE.ages.find((a) => a.id === "saturn-return")!;
    expect(of("saturn-square")?.progress).toBe(saturnAge.progress);
    expect(of("pluto-square")?.progress ?? null).toBeNull();
  });

  it("marks each cycle on its wave at the engine's date for it", () => {
    const lines = waveLinesOf(LIFE);
    const saturn = lines.find((l) => l.body === "saturn")!;
    const first = LIFE.cycles.find((c) => c.id === "saturn-return")!;
    expect(saturn.marks).toContainEqual(cycleMark("saturn-return", first.exact[0] ?? first.start, LIFE.birth));
    expect(model.age).toBe(LIFE.age);
  });

  it("knows what each card's tap reads", () => {
    for (const cycle of LIFE.cycles) expect(model.readings.get(cycle.key)).toBe(cycle.reading);
  });
});
