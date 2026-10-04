/**
 * Your week (R16-31; acceptance 1; readings 4, 17, 18, 26): the week is built here as the server's `weekView` builds
 * it (`api/src/lib/timeline.ts`, which the web cannot import), from Mira's fixture through the engine, so no placement
 * in it is typed by hand. The section's lines are then read back against that payload and against Now and ahead's own
 * card for the same day, which is the one look a contact has (ADR-172).
 */
import { describe, expect, it } from "vitest";
import {
  DOCTRINE, calculateNatalChart, exactHits, factsOf, hasHorizon, headlineOf, inEffect, longitudeAt, offsetAtBirth,
  skyEvents, weekSentence,
  type ContactEvent, type NatalChartData, type NatalTarget, type SkyEvent, type Tone,
} from "@workspace/engine";
import type { TimelineEvent, TimelineNow, TimelineRange, Week } from "@workspace/api-client-react";
import { contactOf, nowDay, nowModel } from "./now-ahead";
import { dayIn, nearDate, weekdayOf } from "./timeline-view";
import { TODAY, dialWhen, loadLine, moreLine, nowSource, weekAsNow, weekModel, weekSource } from "./week-view";
import fixture from "../../../fixtures/sample-people/mira.json";

const ZONE = fixture.timezone;
/** A Monday morning in Lisbon, inside Saturn's second pass over Mira's Ascendant. */
const NOW = new Date("2026-10-05T09:00:00Z");
/** The day of the solar eclipse of 12 August 2026, in her 5th house and far from every natal point, so it has no tone. */
const ECLIPSE_DAY = new Date("2026-08-12T09:00:00Z");
const ORDERS = ["dmy", "mdy", "ymd"] as const;
const NB = " ";

const timed = calculateNatalChart(fixture.birthDate, fixture.birthTime, fixture.latitude, fixture.longitude, ZONE, 0);
// The same birth with the time not recorded, the band at 720 minutes around noon (ADR-33): no horizon.
const blind = calculateNatalChart(fixture.birthDate, "12:00", fixture.latitude, fixture.longitude, ZONE, 720);

const TONE_RANK: Record<Tone, number> = { intense: 0, mixed: 1, easy: 2 };
const KIND_RANK: Record<SkyEvent["kind"], number> = { contact: 0, retrograde: 1, eclipse: 2 };
const NATAL_BODIES = DOCTRINE.targets.filter((t) => t !== "ascendant" && t !== "midheaven");
const EDGE_MS = 2 * 60_000;

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

/** The stretches in orb, cut where the planet crosses the orb's edges, as the server's `spansOf` cuts them. */
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
    .filter((t) => t - start > EDGE_MS && end - t > EDGE_MS)
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

/** An event as GET /home's week sends it: the dashboard opens no reading, so none is looked up. */
function eventOf(chart: NatalChartData, event: SkyEvent, now: Date): TimelineEvent {
  const point = event.kind === "contact" ? aspectPoint(chart, event) : null;
  const words = {
    spans: spansOf(event, point).map((s) => ({ start: iso(s.start), end: iso(s.end) })),
    tone: event.tone,
    headline: headlineOf(event),
    facts: factsOf(event),
    line: null,
    reading: "none" as const,
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

/** The server's `weekView`: seven of the reader's days from today, the engine's sentence, today's events first. */
function weekOf(chart: NatalChartData, now: Date = NOW, zone: string = ZONE): Week {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(dayIn(now, zone), i));
  const starts = [...dates, addDays(dates[0], 7)].map((day) => startOf(day, zone).getTime());
  const events = skyEvents(chart, new Date(starts[0]), new Date(starts[7] - 1));
  const contacts = events.filter((e): e is ContactEvent => e.kind === "contact");
  const today = new Set(inEffect(events, new Date(starts[0])));
  const rank = (tone: Tone | null) => (tone === null ? 3 : TONE_RANK[tone]);
  const drawn = hasHorizon(chart);
  return {
    headline: weekSentence(events, new Date(starts[0])),
    natal: NATAL_BODIES.flatMap((body) => {
      const planet = chart.planets[body];
      if (!planet || (!drawn && body === "moon")) return [];
      return [{ body, lon: planet.absoluteDegree, house: drawn ? (planet.house ?? null) : null }];
    }),
    angles: drawn ? { ascendant: chart.angles!.ascendant.absoluteDegree, midheaven: chart.angles!.midheaven.absoluteDegree } : null,
    days: dates.map((date, i) => ({
      date,
      tones: inEffect(contacts, new Date(starts[i])).map((e) => e.tone).sort((a, b) => TONE_RANK[a] - TONE_RANK[b]),
    })),
    on: events
      .map((event, at) => ({ event, at, today: today.has(event) }))
      .sort((a, b) => Number(b.today) - Number(a.today) || rank(a.event.tone) - rank(b.event.tone)
        || KIND_RANK[a.event.kind] - KIND_RANK[b.event.kind] || a.at - b.at)
      .map(({ event }) => eventOf(chart, event, now)),
  };
}

/** GET /timeline/now's view of the same chart over a longer range, for the dial's source alone. */
function rangeOf(week: Week, range: TimelineRange, days: number): TimelineNow {
  const dates = Array.from({ length: days }, (_, i) => addDays(week.days[0].date, i));
  return {
    range, from: dates[0], to: dates[days - 1], zone: ZONE, blind: week.angles === null, natal: week.natal, angles: week.angles,
    days: dates.map((date) => ({ date, tones: [] })), events: [], next: [],
  };
}

const week = weekOf(timed);
const today = dayIn(NOW, ZONE);

/** What touches Mira's chart on her day, by the payload's own spans, as her readers' days. */
function touchingOn(payload: Week, day: string): TimelineEvent[] {
  return payload.on.filter((event) => event.spans.some((s) => dayIn(s.start, ZONE) <= day && day <= dayIn(s.end, ZONE)));
}

describe("the week as Now and ahead reads it", () => {
  it("is a one-week range from the reader's today, nothing after it to come next (reading 4)", () => {
    const now = weekAsNow(week, ZONE);
    expect(now.range).toBe("week");
    expect(now.from).toBe(today);
    expect(now.to).toBe(addDays(today, 6));
    expect(now.days).toBe(week.days);
    expect(now.events).toBe(week.on);
    expect(now.natal).toBe(week.natal);
    expect(now.angles).toBe(week.angles);
    expect(now.zone).toBe(ZONE);
    expect(now.next).toEqual([]);
    expect(now.blind).toBe(false);
    expect(weekAsNow(weekOf(blind), ZONE).blind).toBe(true);
  });

  it("prints the week's own days, its sentence from the engine, and its first and last day", () => {
    for (const order of ORDERS) {
      const model = weekModel(week, ZONE, order);
      expect(model.days).toEqual(week.days);
      expect(model.headline).toBe(week.headline);
      expect(model.span).toContain(nearDate(today, today, order));
      expect(model.span).toContain(nearDate(addDays(today, 6), today, order));
    }
    expect(weekModel(week, ZONE, "dmy").span).toBe(`5${NB}Oct to 11${NB}Oct`);
    expect(weekModel(week, ZONE, "mdy").span).toBe(`Oct${NB}5 to Oct${NB}11`);
    expect(weekModel({ ...week, headline: null }, ZONE, "dmy").headline).toBeNull();
  });
});

describe("what's on you today", () => {
  it("is Now and ahead's first card for today, the strongest thing touching the chart (ADR-172, reading 17)", () => {
    for (const order of ORDERS) {
      const model = weekModel(week, ZONE, order);
      const cards = nowDay(nowModel(weekAsNow(week, ZONE)), 0, order).cards.filter((card) => card.tone !== null);
      expect(model.onYou).toEqual(contactOf(cards[0]));
      expect(model.more).toBe(cards.length - 1);
    }
    const touching = touchingOn(week, today).filter((event) => event.tone !== null);
    const onYou = weekModel(week, ZONE, "dmy").onYou!;
    expect(onYou.tone).toBe("intense");
    expect(touching.filter((event) => event.tone === "intense").map((event) => event.headline)).toContain(onYou.headline);
    expect(weekModel(week, ZONE, "dmy").more).toBe(touching.length - 1);
  });

  it("says how long it lasts and the astronomy under it, today's orb included, from the payload", () => {
    const model = weekModel(week, ZONE, "dmy");
    const event = week.on.find((e) => e.key === model.onYou!.key)!;
    expect(model.onYou!.facts.startsWith(event.facts.sky)).toBe(true);
    expect(model.onYou!.lasts).toMatch(/^(Until |Eases today)/);
    if (event.orbNow !== null) expect(model.onYou!.facts).toContain(`orb ${event.orbNow.toFixed(2)}°`);
  });

  it("is never an eclipse far from every natal point, which has no tone and touches nothing (MB-188)", () => {
    const eclipseWeek = weekOf(timed, ECLIPSE_DAY);
    const day = dayIn(ECLIPSE_DAY, ZONE);
    const eclipse = eclipseWeek.on.find((event) => event.kind === "eclipse");
    expect(eclipse?.tone).toBeNull();
    expect(touchingOn(eclipseWeek, day).map((event) => event.key)).toContain(eclipse!.key);
    const model = weekModel(eclipseWeek, ZONE, "dmy");
    expect(model.onYou?.key).not.toBe(eclipse!.key);
    expect(model.more).toBe(touchingOn(eclipseWeek, day).filter((event) => event.tone !== null).length - 1);
  });

  it("is nothing on a day with nothing touching the chart, which the section calls a quiet day (acceptance 3)", () => {
    const quiet = { ...week, on: week.on.filter((event) => !touchingOn(week, today).includes(event)) };
    const model = weekModel(quiet, ZONE, "dmy");
    expect(model.onYou).toBeNull();
    expect(model.more).toBe(0);
    expect(moreLine(model.more)).toBeNull();
  });

  it("counts the rest in one plain sentence", () => {
    expect(moreLine(0)).toBeNull();
    expect(moreLine(1)).toBe("1 more thing touches your chart today.");
    expect(moreLine(6)).toBe("6 more things touch your chart today.");
  });
});

describe("the dial's source", () => {
  it("draws the week from GET /home and a longer range from GET /timeline/now, each from today", () => {
    const source = weekSource(week);
    expect(source.points).toBe(week.natal);
    expect(source.angles).toBe(week.angles);
    expect(source.from).toBe(today);
    expect(source.days).toBe(7);
    const month = nowSource(rangeOf(week, "month", 30));
    const six = nowSource(rangeOf(week, "six-months", 182));
    expect([month.from, month.days, six.days]).toEqual([today, 30, 182]);
    expect(new Set([source.key, month.key, six.key]).size).toBe(3);
  });

  it("keys its frames by the chart too, so a birth time added meanwhile draws new ones", () => {
    const withTime = weekSource(week);
    const without = weekSource(weekOf(blind));
    expect(without.angles).toBeNull();
    expect(without.key).not.toBe(withTime.key);
    expect(weekSource(weekOf(timed)).key).toBe(withTime.key);
  });

  it("says Today on today and the day it shows after, in the reader's order (reading 4)", () => {
    for (const order of ORDERS) {
      expect(dialWhen(today, today, order)).toBe(TODAY);
      const later = addDays(today, 5);
      expect(dialWhen(later, today, order)).toBe(`${weekdayOf(later)} ${nearDate(later, today, order)}`);
    }
    expect(dialWhen("2026-10-10", today, "dmy")).toBe(`Sat 10${NB}Oct`);
    expect(dialWhen("2026-10-10", today, "mdy")).toBe(`Sat Oct${NB}10`);
  });

  it("says which range didn't load and what to do", () => {
    expect(loadLine("month")).toBe("We couldn't load the next month. Check your connection and try again.");
    expect(loadLine("six-months")).toBe("We couldn't load the next 6 months. Check your connection and try again.");
  });
});
