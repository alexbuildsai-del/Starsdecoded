/**
 * Timeline on the server (ADR-207, 209, 211, 212): the sky on the reader's own chart as every app surface prints it,
 * Now and ahead, Life, Your week and the dashboard's teaser, in the engine's plain words and with no model call. Every
 * date and degree comes from the engine (acceptance 1). Days are the reader's, in the zone their browser names, else
 * their birth place's (reading 4). The reader is their own chart with a finished Personal report they can read, and
 * nobody else's (reading 2, R-3.6).
 */
import { and, eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import { db, profilesTable, reportsTable } from "@workspace/db";
import type { GetHomeResponse, GetTimelineLifeResponse, GetTimelineNowResponse } from "@workspace/api-zod";
import {
  CHART_VERSION,
  CYCLE_WORDS,
  // Aliased: api/src/prompts exports its own DOCTRINE, the writer's, and this is the sky's.
  DOCTRINE as SKY_DOCTRINE,
  KNOWN_AGES,
  ageAt,
  exactHits,
  factsOf,
  hasHorizon,
  headlineOf,
  inEffect,
  lifeCycles,
  longitudeAt,
  natalLongitudes,
  offsetAtBirth,
  readsAs,
  roundProgress,
  skyEvents,
  waves,
  weekSentence,
  type ContactEvent,
  type LifeCycle,
  type NatalChartData,
  type NatalLongitudes,
  type NatalTarget,
  type SkyEvent,
  type Tone,
  type Wave,
} from "@workspace/engine";
import { isSelfFor, natalReportAccess, type ProfileHolders, type Viewer } from "./access.js";
import { zoneAt } from "./places.js";
import { chartForProfile } from "./profiles.js";
import { ownChartOf, sharedProfileIds } from "./shares.js";
import { TIMELINE_PROMPT_VERSION } from "../prompts/timeline/index.js";

export type TimelineNow = z.infer<typeof GetTimelineNowResponse>;
export type TimelineEvent = TimelineNow["events"][number];
export type TimelineRange = TimelineNow["range"];
export type ReadingStatus = TimelineEvent["reading"];
export type TimelineLife = z.infer<typeof GetTimelineLifeResponse>;
export type LifeCycleView = TimelineLife["cycles"][number];
type HomeContract = z.infer<typeof GetHomeResponse>;
export type Week = NonNullable<HomeContract["week"]>;
export type Teaser = NonNullable<HomeContract["teaser"]>;
type NatalPoint = TimelineNow["natal"][number];
type Angles = NonNullable<TimelineNow["angles"]>;
type TimelineDay = TimelineNow["days"][number];
type TimelineChange = TimelineNow["next"][number];
type KnownAge = TimelineLife["ages"][number];
type TeaserCycle = Teaser["cycles"][number];
type Span = TimelineEvent["spans"][number];

/** Where a stored reading stands: its status, with its own line once it is ready. */
export type ReadingState = ReadingStatus | { status: ReadingStatus; line?: string | null };
/** By event or cycle key; a key the map lacks has no reading yet. */
export type ReadingStatuses = ReadonlyMap<string, ReadingState>;

const NO_READINGS: ReadingStatuses = new Map();

/**
 * The reader as Timeline reads them (reading 2): their own chart, its newest finished Personal report, the zone of
 * their birth place, and the basis a reading of it is written against (reading 8).
 */
export interface ReaderChart {
  userId: string;
  profileId: string;
  /** What a reading builds on (reading 10). */
  reportId: string;
  chart: NatalChartData;
  /** No horizon: no angle, house or natal Moon to time a contact to (R-4.6). */
  blind: boolean;
  /** The birth place's zone, the reader's days when their browser sends no zone the server can read (reading 4). */
  zone: string;
  /** The birth instant, the band's centre when the time is a band. */
  birth: Date;
  basis: string;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const SECOND_MS = 1_000;
// Crossings the engine finds at a window's own start or end are those ends again, give or take its rounding to the minute.
const EDGE_MS = 2 * 60_000;
// A key's day is a sky event in the reader's life, never one before they were born or long after.
const KEYED_YEARS = 120;

/** Seven days from today, thirty or 182 (reading 4). */
export const RANGE_DAYS: Readonly<Record<TimelineRange, number>> = { week: 7, month: 30, "six-months": 182 };

/** A Personal report under a horizon pass keeps its text, so it reads as finished, as `ownChartOf` counts it. */
const FINISHED = ["complete", "revising"];

/** The band a profile with no birth time recorded carries (ADR-33). */
const NO_TIME_WINDOW = 720;

const TONE_RANK: Readonly<Record<Tone, number>> = { intense: 0, mixed: 1, easy: 2 };
const KIND_RANK: Readonly<Record<SkyEvent["kind"], number>> = { contact: 0, retrograde: 1, eclipse: 2 };
const CHANGE_RANK: Readonly<Record<TimelineChange["change"], number>> = { starts: 0, peaks: 1, eases: 2 };
const ANGLE_TARGETS: readonly NatalTarget[] = ["ascendant", "midheaven"];
/** The doctrine's natal planets, which the dial draws inside the chart beside the angles. */
const NATAL_BODIES = SKY_DOCTRINE.targets.filter((target) => !ANGLE_TARGETS.includes(target));

const norm = (deg: number): number => ((deg % 360) + 360) % 360;
/** Signed shortest arc from b to a, -180 to 180. */
const arc = (a: number, b: number): number => {
  const d = norm(a - b);
  return d > 180 ? d - 360 : d;
};
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const copy = (at: Date): Date => new Date(at.getTime());

/** A zone by its canonical name when Intl can read it, else null, so a reader's `tz` never reaches a format unchecked. */
export function validZone(tz: unknown): string | null {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64 || !/^[A-Za-z0-9_+\-/]+$/.test(tz)) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

// Building a format costs far more than using one; only zones `validZone` passed are ever keys.
const dayFormats = new Map<string, Intl.DateTimeFormat>();

/** The reader's calendar day of an instant, "YYYY-MM-DD", in their zone (reading 4). */
export function dayIn(at: Date, zone: string): string {
  let format = dayFormats.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
    dayFormats.set(zone, format);
  }
  const parts = format.formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`;
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * The instant a reader's day "YYYY-MM-DD" begins in their zone. The engine's wall-clock offset finds local midnight;
 * where a clock change skips midnight, the day begins at the first second its calendar shows, found by halving around
 * that guess.
 */
export function dayStart(day: string, zone: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d) - offsetAtBirth(zone, day, "00:00") * HOUR_MS;
  if (dayIn(new Date(guess), zone) === day && dayIn(new Date(guess - SECOND_MS), zone) < day) return new Date(guess);
  // A day starts on a whole second, so the halving stays on whole seconds and lands on one.
  let before = Math.floor(guess / SECOND_MS) * SECOND_MS - 12 * HOUR_MS;
  let after = before + 24 * HOUR_MS;
  while (after - before > SECOND_MS) {
    const mid = before + Math.floor((after - before) / (2 * SECOND_MS)) * SECOND_MS;
    if (dayIn(new Date(mid), zone) < day) before = mid;
    else after = mid;
  }
  return new Date(after);
}

/** Least recently used goes first, so a chart opened often stays while one opened once ages out. */
function remember<V>(cache: Map<string, V>, limit: number, key: string, make: () => V): V {
  const held = cache.get(key);
  if (held !== undefined) {
    cache.delete(key);
    cache.set(key, held);
    return held;
  }
  const made = make();
  cache.set(key, made);
  if (cache.size > limit) cache.delete(cache.keys().next().value as string);
  return made;
}

/** Everything the engine reads from a chart here, so the same birth shares the work and a changed birth time does not. */
function chartKey(chart: NatalChartData): string {
  return [chart.chartVersion, chart.datetimeUtc, chart.latitude, chart.longitude, chart.windowMinutes].join("|");
}

interface Life {
  natal: NatalLongitudes;
  cycles: LifeCycle[];
  waves: Wave[];
}

// A life holds about 6,500 wave points, a few hundred kilobytes, and costs about a quarter of a second to compute.
const LIFE_LIMIT = 32;
const lives = new Map<string, Life>();

function lifeOf(reader: ReaderChart): Life {
  return remember(lives, LIFE_LIMIT, chartKey(reader.chart), () => {
    const natal = natalLongitudes(reader.chart);
    return { natal, cycles: lifeCycles(natal, reader.birth), waves: waves(natal, reader.birth) };
  });
}

interface Sky {
  /** Each day's first instant, then the instant after the last day ends. */
  starts: number[];
  dates: string[];
  events: SkyEvent[];
  /** By the index of its event: where a contact perfects, null for the others. */
  points: (number | null)[];
  spans: Span[][];
  days: TimelineDay[];
}

// A range's events cost about a tenth of a second whatever its length, its days as much again over six months.
const SKY_LIMIT = 128;
const skies = new Map<string, Sky>();

/** `count` of the reader's days from `first`: every event the doctrine names on them, its stretches in orb and each day's tones. */
function skyOf(chart: NatalChartData, zone: string, first: string, count: number): Sky {
  return remember(skies, SKY_LIMIT, `${chartKey(chart)}|${zone}|${first}|${count}`, () => {
    const dates = Array.from({ length: count }, (_, i) => addDays(first, i));
    const starts = [...dates, addDays(first, count)].map((day) => dayStart(day, zone).getTime());
    const events = skyEvents(chart, new Date(starts[0]), new Date(starts[count] - 1));
    const points = events.map((event) => (event.kind === "contact" ? aspectPoint(chart, event) : null));
    const spans = events.map((event, i) => spansOf(event, points[i]));
    const contacts = events.filter((event): event is ContactEvent => event.kind === "contact");
    // Reading 17 weighs contacts only, so a day with none is quiet whatever else the sky does.
    const days = dates.map((date, i) => ({ date, tones: byTone(inEffect(contacts, new Date(starts[i])).map((e) => e.tone)) }));
    return { starts, dates, events, points, spans, days };
  });
}

function byTone(tones: Tone[]): Tone[] {
  return tones.sort((a, b) => TONE_RANK[a] - TONE_RANK[b]);
}

function natalLongitude(chart: NatalChartData, target: NatalTarget): number {
  if (target === "ascendant") return chart.angles?.ascendant.absoluteDegree ?? Number.NaN;
  if (target === "midheaven") return chart.angles?.midheaven.absoluteDegree ?? Number.NaN;
  return chart.planets[target]?.absoluteDegree ?? Number.NaN;
}

/**
 * Where the planet perfects a contact: the natal point as the doctrine reads it, from the chart's stored degrees,
 * turned by the aspect. A square or a trine has a place on either side, and the window holds the one nearer the planet.
 */
function aspectPoint(chart: NatalChartData, event: ContactEvent): number {
  const base = natalLongitude(chart, event.target);
  const angle = SKY_DOCTRINE.angles[event.aspect];
  const places = angle === 0 || angle === 180 ? [norm(base + angle)] : [norm(base + angle), norm(base - angle)];
  const at = longitudeAt(event.body, event.window.exact[0] ?? event.window.start);
  return places.reduce((best, place) => (Math.abs(arc(at, place)) < Math.abs(arc(at, best)) ? place : best));
}

/**
 * The stretches an event is within orb. `inOrb` keeps the passes a retrograde splits as one window, so the planet's
 * crossings of the orb's two edges inside it, from the engine's own exact search, cut it where it leaves and comes
 * back. Each piece between two crossings is in or out as most of three points in it say: a crossing the daily search
 * could miss would leave a piece only partly out.
 */
function spansOf(event: SkyEvent, point: number | null): Span[] {
  if (event.kind === "retrograde") return [{ start: event.start, end: event.end }];
  if (event.kind === "eclipse") return [{ start: event.eclipse.at, end: event.eclipse.at }];
  const { body, orb, window } = event;
  if (point === null || !Number.isFinite(point)) return [{ start: window.start, end: window.end }];
  const start = window.start.getTime();
  const end = window.end.getTime();
  const crossings = [norm(point + orb), norm(point - orb)]
    .flatMap((edge) => exactHits(body, edge, window.start, window.end))
    .map((at) => at.getTime())
    .filter((t) => t - start > EDGE_MS && end - t > EDGE_MS)
    .sort((a, b) => a - b);
  const marks = [start, ...crossings, end];
  const within = (t: number): boolean => Math.abs(arc(longitudeAt(body, new Date(t)), point)) <= orb;
  const spans: Span[] = [];
  for (let i = 1; i < marks.length; i++) {
    const a = marks[i - 1];
    const b = marks[i];
    if (b <= a) continue;
    const quarter = (b - a) / 4;
    if ([a + quarter, a + 2 * quarter, a + 3 * quarter].filter(within).length < 2) continue;
    const last = spans[spans.length - 1];
    if (last && last.end.getTime() === a) last.end = new Date(b);
    else spans.push({ start: new Date(a), end: new Date(b) });
  }
  return spans.length ? spans : [{ start: window.start, end: window.end }];
}

/** A contact's distance from exact at `now`, while it is within orb. */
function orbNowOf(event: SkyEvent, point: number | null, now: Date): number | null {
  if (event.kind !== "contact" || point === null || !Number.isFinite(point)) return null;
  const t = now.getTime();
  if (t < event.window.start.getTime() || t > event.window.end.getTime()) return null;
  const orb = Math.abs(arc(longitudeAt(event.body, now), point));
  return orb <= event.orb ? round2(orb) : null;
}

/** An event that gets no reading has none to show, whatever a caller passes for its key (reading 7). */
function stateOf(state: ReadingState | undefined, reads = true): { status: ReadingStatus; line: string | null } {
  if (!reads || state === undefined) return { status: "none", line: null };
  if (typeof state === "string") return { status: state, line: null };
  // A failed reading's line is the sheet's apology, never the card's everyday line.
  return { status: state.status, line: state.status === "ready" ? (state.line ?? null) : null };
}

function eventView(event: SkyEvent, spans: Span[], point: number | null, statuses: ReadingStatuses, now: Date): TimelineEvent {
  const { status, line } = stateOf(statuses.get(event.key), readsAs(event));
  const words = {
    spans: spans.map((s) => ({ start: copy(s.start), end: copy(s.end) })),
    orbNow: orbNowOf(event, point, now),
    tone: event.tone,
    headline: headlineOf(event),
    facts: factsOf(event),
    line,
    reading: status,
  };
  switch (event.kind) {
    case "contact":
      return {
        key: event.key,
        kind: "contact",
        body: event.body,
        aspect: event.aspect,
        target: event.target,
        houses: event.house === null ? [] : [event.house],
        start: copy(event.window.start),
        end: copy(event.window.end),
        exact: event.window.exact.map(copy),
        ...words,
      };
    case "retrograde":
      return {
        key: event.key,
        kind: "retrograde",
        body: event.body,
        aspect: null,
        target: null,
        houses: [...event.houses],
        start: copy(event.start),
        end: copy(event.end),
        exact: [],
        ...words,
      };
    case "eclipse":
      return {
        key: event.key,
        kind: "eclipse",
        // The body eclipsed, as the event's key names it.
        body: event.eclipse.kind === "solar" ? "sun" : "moon",
        aspect: null,
        target: event.near?.target ?? null,
        houses: event.house === null ? [] : [event.house],
        start: copy(event.eclipse.at),
        end: copy(event.eclipse.at),
        // An eclipse is one moment, its greatest, which is when it peaks.
        exact: [copy(event.eclipse.at)],
        ...words,
      };
  }
}

/** What starts, peaks and eases, as the engine's week sentence counts them: a window's ends and passes, a retrograde's stations, an eclipse. */
function changesOf(event: SkyEvent): { at: Date; change: TimelineChange["change"] }[] {
  switch (event.kind) {
    case "contact":
      return [
        { at: event.window.start, change: "starts" },
        ...event.window.exact.map((at) => ({ at, change: "peaks" as const })),
        { at: event.window.end, change: "eases" },
      ];
    case "retrograde":
      return [{ at: event.start, change: "starts" }, { at: event.end, change: "eases" }];
    case "eclipse":
      return [{ at: event.eclipse.at, change: "peaks" }];
  }
}

/** The doctrine's natal planets, each with its whole-sign house. Without a birth time the Moon is too loose to place (R-4.6). */
function natalPointsOf(chart: NatalChartData): NatalPoint[] {
  const drawn = hasHorizon(chart);
  return NATAL_BODIES.flatMap((body): NatalPoint[] => {
    const planet = chart.planets[body];
    if (!planet || (!drawn && body === "moon")) return [];
    return [{ body, lon: planet.absoluteDegree, house: drawn ? (planet.house ?? null) : null }];
  });
}

function anglesOf(chart: NatalChartData): Angles | null {
  if (!hasHorizon(chart)) return null;
  return { ascendant: chart.angles.ascendant.absoluteDegree, midheaven: chart.angles.midheaven.absoluteDegree };
}

/**
 * Now and ahead (ADR-207): from the reader's today over the range, the natal points and angles the dial draws, each
 * day's tones, every event on a day of the range with its whole window, and what starts, peaks or eases after `now`
 * before the range ends, soonest first. `statuses` are the readings' as stored, by key.
 */
export function nowView(
  reader: ReaderChart,
  range: TimelineRange,
  tz: string | null | undefined,
  statuses: ReadingStatuses,
  now: Date = new Date(),
): TimelineNow {
  const count = RANGE_DAYS[range];
  if (!count) throw new RangeError(`A range is week, month or six-months, not ${String(range)}`);
  const zone = validZone(tz) ?? reader.zone;
  const sky = skyOf(reader.chart, zone, dayIn(now, zone), count);
  const after = now.getTime();
  const close = sky.starts[count];
  return {
    range,
    from: sky.dates[0],
    to: sky.dates[count - 1],
    zone,
    blind: reader.blind,
    natal: natalPointsOf(reader.chart),
    angles: anglesOf(reader.chart),
    days: sky.days.map(({ date, tones }) => ({ date, tones: [...tones] })),
    events: sky.events.map((event, i) => eventView(event, sky.spans[i], sky.points[i], statuses, now)),
    next: sky.events
      .flatMap((event) => changesOf(event).map(({ at, change }) => ({ key: event.key, at, change })))
      .filter(({ at }) => at.getTime() > after && at.getTime() < close)
      .sort((x, y) => x.at.getTime() - y.at.getTime() || CHANGE_RANK[x.change] - CHANGE_RANK[y.change] || x.key.localeCompare(y.key))
      .map(({ key, at, change }) => ({ key, at: copy(at), change })),
  };
}

/** The UTC instant a cycle is dated by: its first exact pass, or its window's start when it never is exact (reading 5). */
function anchorOf(cycle: LifeCycle): Date {
  return cycle.window.exact[0] ?? cycle.window.start;
}

/**
 * Whole years and the thousandths of the year since the last birthday, counted as the engine's `ageAt` counts
 * birthdays. Cut, never rounded: rounding read the last hours before a birthday as the new age.
 */
function exactAge(birth: Date, at: Date): number {
  const whole = ageAt(birth, at);
  const birthday = (years: number): number => {
    const day = new Date(birth.getTime());
    day.setUTCFullYear(birth.getUTCFullYear() + years);
    return day.getTime();
  };
  const last = birthday(whole);
  const thousandths = Math.floor((1000 * (at.getTime() - last)) / (birthday(whole + 1) - last));
  return (whole * 1000 + thousandths) / 1000;
}

/** One known age's cycles split at today: the one under way or next, if any is left by 90, and the one before it. */
function splitAt(cycles: readonly LifeCycle[], past: (cycle: LifeCycle) => boolean): { focus: LifeCycle | null; before: LifeCycle | null } {
  const at = cycles.findIndex((cycle) => !past(cycle));
  if (at < 0) return { focus: null, before: cycles[cycles.length - 1] ?? null };
  return { focus: cycles[at], before: cycles[at - 1] ?? null };
}

function cycleView(cycle: LifeCycle, past: boolean, statuses: ReadingStatuses): LifeCycleView {
  const words = CYCLE_WORDS[cycle.id];
  return {
    key: cycle.key,
    id: cycle.id,
    body: cycle.body,
    name: words.name,
    word: words.word,
    age: cycle.age,
    exact: cycle.window.exact.map(copy),
    start: copy(cycle.window.start),
    end: copy(cycle.window.end),
    past,
    repeats: cycle.repeats,
    passes: cycle.passes,
    reading: stateOf(statuses.get(cycle.key)).status,
  };
}

/**
 * Life (ADR-209): the four known ages first, each with the cycle under way or next and the one before it, then every
 * cycle from birth to 90 and each slow planet's wave, with the reader's age today and their birth instant, which place
 * today and every cycle on the waves. A cycle is past once its window closed before the reader's today.
 */
export function lifeView(
  reader: ReaderChart,
  tz: string | null | undefined,
  statuses: ReadingStatuses,
  now: Date = new Date(),
): TimelineLife {
  const zone = validZone(tz) ?? reader.zone;
  const today = dayIn(now, zone);
  const life = lifeOf(reader);
  const past = (cycle: LifeCycle): boolean => dayIn(cycle.window.end, zone) < today;
  return {
    age: exactAge(reader.birth, now),
    birth: copy(reader.birth),
    ages: KNOWN_AGES.flatMap(({ id, body }): KnownAge[] => {
      const home = life.natal[body];
      const { focus, before } = splitAt(life.cycles.filter((cycle) => cycle.id === id), past);
      const shown = focus ?? before;
      if (!shown || home === undefined) return [];
      return [{
        id,
        age: shown.age,
        last: before ? copy(anchorOf(before)) : null,
        next: focus ? copy(anchorOf(focus)) : null,
        progress: round3(roundProgress(body, home, now)),
      }];
    }),
    cycles: life.cycles.map((cycle) => cycleView(cycle, past(cycle), statuses)),
    waves: life.waves.map((wave) => ({ body: wave.body, points: wave.points.map(({ age, distance }) => ({ age, distance })) })),
  };
}

type Ranked = { event: SkyEvent; at: number; today: boolean };

/**
 * What is on the reader today before the rest of the week, then strongest first, then a contact before a retrograde
 * before an eclipse, then the engine's order: the dashboard artifact's "what's on you" is today's strongest contact.
 */
function onFirst(a: Ranked, b: Ranked): number {
  const rank = (tone: Tone | null) => (tone === null ? 3 : TONE_RANK[tone]);
  return Number(b.today) - Number(a.today)
    || rank(a.event.tone) - rank(b.event.tone)
    || KIND_RANK[a.event.kind] - KIND_RANK[b.event.kind]
    || a.at - b.at;
}

/**
 * Your week on the dashboard (ADR-211): seven days from the reader's today with their tones, the week's sentence from
 * the engine, and everything that touches the chart in them, today's first. The dashboard opens no reading, so none
 * is looked up.
 */
export function weekView(reader: ReaderChart, tz: string | null | undefined, now: Date = new Date()): Week {
  const zone = validZone(tz) ?? reader.zone;
  const count = RANGE_DAYS.week;
  const sky = skyOf(reader.chart, zone, dayIn(now, zone), count);
  const today = new Set(inEffect(sky.events, new Date(sky.starts[0])));
  return {
    headline: weekSentence(sky.events, new Date(sky.starts[0])),
    natal: natalPointsOf(reader.chart),
    angles: anglesOf(reader.chart),
    days: sky.days.map(({ date, tones }) => ({ date, tones: [...tones] })),
    on: sky.events
      .map((event, at): Ranked => ({ event, at, today: today.has(event) }))
      .sort(onFirst)
      .map(({ at }) => eventView(sky.events[at], sky.spans[at], sky.points[at], NO_READINGS, now)),
  };
}

/**
 * The dashboard's teaser (ADR-212, reading 26), in the birth place's days. Its ring is the reader's first Saturn return,
 * the one the dashboard artifact's ring always names, with Saturn's round since birth; its list, the four known ages'
 * cycles, each the one under way or next, else the last, dated by its first exact pass, those still to come or under
 * way first and soonest first, so a later Saturn return is the list's. Null only for a chart with no Saturn return by
 * 90, which cannot happen: Saturn comes back within 30 years.
 */
export function teaserView(reader: ReaderChart, now: Date = new Date()): Teaser | null {
  const zone = reader.zone;
  const today = dayIn(now, zone);
  const life = lifeOf(reader);
  const firstReturn = life.cycles.find((cycle) => cycle.id === "saturn-return");
  const home = life.natal.saturn;
  if (!firstReturn || home === undefined) return null;
  const past = (cycle: LifeCycle): boolean => dayIn(cycle.window.end, zone) < today;
  const cycles = KNOWN_AGES.flatMap(({ id }) => {
    const { focus, before } = splitAt(life.cycles.filter((cycle) => cycle.id === id), past);
    const cycle = focus ?? before;
    return cycle ? [{ cycle, ahead: focus !== null }] : [];
  }).sort((x, y) => Number(y.ahead) - Number(x.ahead) || anchorOf(x.cycle).getTime() - anchorOf(y.cycle).getTime());
  return {
    saturn: { age: firstReturn.age, progress: round3(roundProgress("saturn", home, now)) },
    cycles: cycles.map(({ cycle }): TeaserCycle => ({
      id: cycle.id,
      name: CYCLE_WORDS[cycle.id].name,
      word: CYCLE_WORDS[cycle.id].word,
      age: cycle.age,
      on: dayIn(anchorOf(cycle), zone),
    })),
  };
}

export type KeyedEvent =
  | { kind: "sky"; event: SkyEvent; view: TimelineEvent }
  | { kind: "cycle"; cycle: LifeCycle; view: LifeCycleView };

const SKY_KEY = /^(contact|retrograde|eclipse)\.[a-z_]+\.(?:[a-z]+|-)\.(?:[a-z]+|-)\.(\d{4})(\d{2})(\d{2})$/;
const CYCLE_KEY = /^cycle\.[a-z-]+\.\d{8}$/;

/** The UTC day a key names, when the calendar has it. */
function keyDay(y: string, m: string, d: string): string | null {
  const day = `${y}-${m}-${d}`;
  const at = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== day ? null : day;
}

/**
 * The event or life cycle a key names on the reader's own chart, computed afresh (reading 5): a sky event from the
 * key's UTC day, where its window is exact, starts, turns or peaks, and a cycle from Life. Null for a key nothing on
 * the chart carries, and for an event that gets no reading (reading 7), so neither is ever written.
 */
export function eventByKey(reader: ReaderChart, key: string, now: Date = new Date()): KeyedEvent | null {
  if (typeof key !== "string" || key.length > 80) return null;
  if (CYCLE_KEY.test(key)) {
    const cycle = lifeOf(reader).cycles.find((c) => c.key === key);
    if (!cycle) return null;
    const past = dayIn(cycle.window.end, reader.zone) < dayIn(now, reader.zone);
    return { kind: "cycle", cycle, view: cycleView(cycle, past, NO_READINGS) };
  }
  const parts = SKY_KEY.exec(key);
  const day = parts && keyDay(parts[2], parts[3], parts[4]);
  if (!day) return null;
  const at = Date.parse(`${day}T00:00:00Z`);
  const born = reader.birth.getTime();
  if (at < born - DAY_MS || at > born + KEYED_YEARS * 365.25 * DAY_MS) return null;
  const sky = skyOf(reader.chart, "UTC", day, 1);
  const i = sky.events.findIndex((event) => event.key === key);
  if (i < 0 || !readsAs(sky.events[i])) return null;
  return { kind: "sky", event: sky.events[i], view: eventView(sky.events[i], sky.spans[i], sky.points[i], NO_READINGS, now) };
}

/** The columns the reader is found by: one of their own chart's Personal reports, with that chart's profile. */
export interface ReaderRow {
  report: { id: string; status: string; sessionId: string; createdAt: Date };
  profile: ProfileHolders & {
    id: string;
    isSelf: boolean;
    claimedAsSelf: boolean;
    birthDate: string;
    birthTime: string;
    birthTimeWindowMinutes: number;
    latitude: number;
    longitude: number;
    timezoneOffset: number;
    timezone: string | null;
    chartData: unknown;
  };
}

/**
 * The Personal report Timeline reads (reading 2): of a chart's natal reports, the newest finished one, on a chart that
 * is the viewer's own and that they can read. Pure over the rows, so its rule is tested without a database (MB-49).
 */
export function readerReportOf(viewer: Viewer, rows: readonly ReaderRow[], shared: ReadonlySet<string>): ReaderRow | null {
  let best: ReaderRow | null = null;
  for (const row of rows) {
    if (!FINISHED.includes(row.report.status) || !isSelfFor(viewer, row.profile)) continue;
    if (!natalReportAccess(viewer, row.profile, row.report, shared.has(row.profile.id))) continue;
    const newer = !best
      || row.report.createdAt.getTime() > best.report.createdAt.getTime()
      || (row.report.createdAt.getTime() === best.report.createdAt.getTime() && row.report.id > best.report.id);
    if (newer) best = row;
  }
  return best;
}

/** What a reading was written against (reading 8): one whose basis no longer matches is written again. */
export function basisOf(birthTime: string, windowMinutes: number): string {
  const time = windowMinutes >= NO_TIME_WINDOW ? "none" : birthTime;
  return `${CHART_VERSION}:${time}:${windowMinutes}:${TIMELINE_PROMPT_VERSION}`;
}

/** The birth place's zone: the one the profile was made with, else the one its coordinates lie in, else UTC, the engine's keys' day. */
function birthZoneOf(profile: ReaderRow["profile"]): string {
  return validZone(profile.timezone) ?? validZone(zoneAt(profile.latitude, profile.longitude)) ?? "UTC";
}

/** The reader from their row and their chart as the engine computes it today. */
export function readerOf(userId: string, row: ReaderRow, chart: NatalChartData): ReaderChart {
  return {
    userId,
    profileId: row.profile.id,
    reportId: row.report.id,
    chart,
    blind: !hasHorizon(chart),
    zone: birthZoneOf(row.profile),
    birth: new Date(chart.datetimeUtc),
    basis: basisOf(row.profile.birthTime, row.profile.birthTimeWindowMinutes),
  };
}

/** Whether an older engine wrote the stored chart, or none is stored (R-4.5). */
export function chartIsStale(chartData: unknown): boolean {
  const version = (chartData as { chartVersion?: unknown } | null)?.chartVersion;
  return typeof version !== "number" || version < CHART_VERSION;
}

/**
 * The profile's stored chart, recomputed and kept on the profile when an older engine wrote it (R-4.5). The write
 * holds only while the birth time is the one it was computed from, so a time changed meanwhile keeps its own chart.
 */
async function chartOf(profile: ReaderRow["profile"]): Promise<NatalChartData> {
  if (!chartIsStale(profile.chartData)) return profile.chartData as NatalChartData;
  const chart = chartForProfile(profile);
  await db
    .update(profilesTable)
    .set({ chartData: chart as unknown as object, updatedAt: new Date() })
    .where(
      and(
        eq(profilesTable.id, profile.id),
        eq(profilesTable.birthTime, profile.birthTime),
        eq(profilesTable.birthTimeWindowMinutes, profile.birthTimeWindowMinutes),
      ),
    );
  return chart;
}

/**
 * The signed-in viewer's own chart with a finished Personal report they can read, or null, which the Timeline routes
 * answer 409 `no_personal_report` (reading 2). It starts from `ownChartOf`, so a chart someone else claimed, or one of
 * several marked as theirs before they settle which, is never read as theirs (R-3.6).
 */
export async function readerChart(viewer: Viewer): Promise<ReaderChart | null> {
  const userId = viewer.userId;
  if (!userId) return null;
  const own = await ownChartOf(userId);
  if (!own?.finished) return null;
  const [rows, shared] = await Promise.all([
    db
      .select({
        report: {
          id: reportsTable.id,
          status: reportsTable.status,
          sessionId: reportsTable.sessionId,
          createdAt: reportsTable.createdAt,
        },
        profile: {
          id: profilesTable.id,
          userId: profilesTable.userId,
          sessionId: profilesTable.sessionId,
          claimedByUserId: profilesTable.claimedByUserId,
          isSelf: profilesTable.isSelf,
          claimedAsSelf: profilesTable.claimedAsSelf,
          birthDate: profilesTable.birthDate,
          birthTime: profilesTable.birthTime,
          birthTimeWindowMinutes: profilesTable.birthTimeWindowMinutes,
          latitude: profilesTable.latitude,
          longitude: profilesTable.longitude,
          timezoneOffset: profilesTable.timezoneOffset,
          timezone: profilesTable.timezone,
          chartData: profilesTable.chartData,
        },
      })
      .from(reportsTable)
      .innerJoin(profilesTable, eq(reportsTable.profileId, profilesTable.id))
      .where(
        and(
          eq(reportsTable.profileId, own.profileId),
          eq(reportsTable.type, "natal"),
          inArray(reportsTable.status, FINISHED),
        ),
      ),
    sharedProfileIds(userId),
  ]);
  const row = readerReportOf(viewer, rows, shared);
  if (!row) return null;
  return readerOf(userId, row, await chartOf(row.profile));
}
