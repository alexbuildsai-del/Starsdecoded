/**
 * The skies the home page and /sky draw (ADR-107, 108): the minute now over
 * the visitor's city, a birth, the sample as a worked example, and the rewind
 * from one to another. Every position is the engine's, the one a report is
 * written from (R-3.1); this module only picks the minutes and says what they
 * show, so it runs the same in the browser, the prerender and a test.
 */
import {
  calculateNatalChart,
  localParts,
  offsetAtBirth,
  placeForZone,
  skyAt,
  type NatalChartData,
  type Place,
} from "@workspace/engine";
import { houseOf } from "@/components/chart/wheel-geometry";
import { DEFAULT_ANSWER, WINDOW_UNKNOWN, isTime, toValue, type BirthTimeAnswer } from "@/lib/birth-time";
import { clockWords, type Clock } from "@/lib/date-entry";
import { ORDINALS, houseWithWord, houseWord } from "@/lib/evidence-glossary";
import type { FormDraft } from "@/lib/form-draft";
import { placeTitle, type GeocodeResult } from "@/lib/places";
import { clockLine, latLngLine, sunLine } from "@/lib/sky-now";
import { toChartData, type Birth } from "@/site/lib/chart";
import { PLANET_LABELS, type ChartData, type ChartPlanet } from "@/types/chart";

/** The ten bodies the landing's wheel draws, each as its render, as the locked artifact does; the points stay in the report's. */
export const BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;
export type Body = (typeof BODIES)[number];

/** A birth as the sky form takes it: the time is null when the visitor left it blank. */
export interface SkyBirth {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM on the local clock. */
  time: string | null;
  place: GeocodeResult;
}

export interface Sky {
  /** "sample": someone else's birth, shown as a worked example until the reader's own sky is drawn. */
  kind: "now" | "birth" | "sample";
  chart: ChartData;
  /** The minute drawn: now, the birth minute, or noon on a birth day with no time. */
  at: Date;
  /** Where it is drawn from, and whose calendar and clock name its dates. */
  place: GeocodeResult;
  birth?: SkyBirth;
  /** Whose birth a sample is. */
  name?: string;
}

/** A zone's first part, as a reader would say it: "Europe/Brussels" is in Europe. */
const AREAS: Record<string, string> = {
  Africa: "Africa", America: "Americas", Antarctica: "Antarctica", Arctic: "Arctic", Asia: "Asia", Atlantic: "Atlantic",
  Australia: "Australia", Europe: "Europe", Indian: "Indian Ocean", Pacific: "Pacific",
};

/** The engine's zone city as the place field holds a place, so the form can start on it. The zone names no country. */
export function placeOfZone(place: Place, offsetHours: number): GeocodeResult {
  return {
    name: place.city,
    city: place.city,
    region: AREAS[place.zone.split("/")[0]] ?? "",
    country: "",
    latitude: place.lat,
    longitude: place.lon,
    timezoneOffset: offsetHours,
    timezone: place.zone,
    placeType: "city",
  };
}

/** The visitor's city from their time zone (ADR-107): nothing is asked, and London stands in for a zone with no city. */
export function visitorPlace(now: Date, zone?: string): GeocodeResult {
  const place = placeForZone(zone);
  const { date, time } = localParts(now, place.zone);
  return placeOfZone(place, offsetAtBirth(place.zone, date, time));
}

function skyOf(kind: Sky["kind"], natal: NatalChartData, place: GeocodeResult, birth?: SkyBirth): Sky {
  return { kind, chart: toChartData(natal), at: new Date(natal.datetimeUtc), place, ...(birth ? { birth } : {}) };
}

export function skyNow(now: Date, zone?: string): Sky {
  const city = placeForZone(zone);
  const natal = skyAt(now, city);
  return skyOf("now", natal, placeOfZone(city, natal.timezoneOffset));
}

/**
 * A blank time is the birth form's "I don't know": the day is swept whole, so
 * the chart has no horizon or houses (ADR-34) and the Moon comes back as the
 * arc it covered that day.
 */
export function birthSky(birth: SkyBirth): Sky {
  const value = toValue(timeAnswer(birth)) ?? { birthTime: "12:00", birthTimeWindowMinutes: WINDOW_UNKNOWN };
  const { latitude, longitude, timezone, timezoneOffset } = birth.place;
  const natal = calculateNatalChart(birth.date, value.birthTime, latitude, longitude, timezone ?? timezoneOffset, value.birthTimeWindowMinutes);
  return skyOf("birth", natal, birth.place, birth);
}

function timeAnswer(birth: SkyBirth): BirthTimeAnswer {
  return birth.time && isTime(birth.time) ? { ...DEFAULT_ANSWER, mode: "known", time: birth.time } : { ...DEFAULT_ANSWER, mode: "unknown" };
}

/** What the birth form opens with after sign-in (ADR-140, reading 14): the date, the time answer and the place. */
export function draftOf(birth: SkyBirth): FormDraft {
  return { birthDate: birth.date, time: timeAnswer(birth), place: birth.place };
}

/** The UTC minute of a time on a place's clock, turned as the engine turns a birth into one. */
function instantAt(date: string, time: string, place: GeocodeResult): Date {
  const offset = place.timezone ? offsetAtBirth(place.timezone, date, time) : place.timezoneOffset;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wall = new Date(0);
  wall.setUTCFullYear(year, month - 1, day);
  wall.setUTCHours(hour, minute, 0, 0);
  return new Date(wall.getTime() - offset * 3_600_000);
}

/**
 * A named person's birth as the worked example, on a chart the sample module
 * has already worked out, so the page pays for no second engine run. `where`
 * is the place as her record names it, "Ixelles, Brussels".
 */
export function sampleSky(name: string, where: string, birth: Birth, chart: ChartData): Sky {
  const [city, ...rest] = where.split(",").map((part) => part.trim());
  const place: GeocodeResult = {
    name: where,
    city,
    region: rest.join(", "),
    country: "",
    latitude: birth.latitude,
    longitude: birth.longitude,
    timezoneOffset: birth.timezoneOffset,
    timezone: birth.timezone ?? null,
    placeType: "city",
  };
  return {
    kind: "sample",
    name,
    chart,
    at: instantAt(birth.birthDate, birth.birthTime, place),
    place,
    birth: { date: birth.birthDate, time: birth.birthTime, place },
  };
}

/** The date and minute on the place's own clock: its zone when the search found one, else the offset it gave. */
function wallClock(at: Date, place: GeocodeResult): { date: string; time: string } {
  if (place.timezone) return localParts(at, place.timezone);
  const shifted = new Date(at.getTime() + place.timezoneOffset * 3_600_000).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

/** The site's one easing (landing scope 15), as CSS takes it. */
export const EASE_CSS = "cubic-bezier(.16, 1, .3, 1)";
export const LIFT_MS = 750;
export const REWIND_MS = 2900;

function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const miss = sx(t) - x;
      if (Math.abs(miss) < 1e-7) return sy(t);
      const slope = dx(t);
      if (Math.abs(slope) < 1e-7) break;
      t -= miss / slope;
    }
    // Newton's step can leave the unit interval on a flat stretch; halving always lands.
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 40; i++) {
      if (sx(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

/** The same curve for motion drawn frame by frame, so a frame and a CSS move started together agree. */
export const ease = cubicBezier(0.16, 1, 0.3, 1);

const norm360 = (d: number): number => ((d % 360) + 360) % 360;

/** The wheel is framed on the Ascendant; a chart with no horizon on 0° Aries, as the product's wheel frames it. */
export function frameOf(chart: ChartData): number {
  return chart.angles?.ascendant.absoluteDegree ?? 0;
}

export interface Rewind {
  from: Date;
  to: Date;
  /** The band's frame at the start. */
  frame: number;
  /**
   * Degrees the band turns by the end: two whole turns, back when the birth is
   * earlier and forward when it is later, plus the short way to its Ascendant.
   */
  turn: number;
  /** The birth's place: every frame is worked out there, so the last is its chart. */
  place: GeocodeResult;
}

export function planRewind(from: Sky, to: Sky): Rewind {
  const start = frameOf(from.chart);
  const way = norm360(frameOf(to.chart) - start);
  const short = way > 180 ? way - 360 : way;
  const back = to.at.getTime() < from.at.getTime();
  return { from: from.at, to: to.at, frame: start, turn: back ? short - 720 : short + 720, place: to.place };
}

export interface RewindFrame {
  at: Date;
  /** The band's frame on this frame, the plan's start plus its share of the turn. */
  frame: number;
  longitudes: Record<Body, number>;
  /** The date the centre counts, on the birth place's calendar. */
  count: string;
}

/** `u` is the share of the rewind's time gone, 0 to 1; the sky's time and the band's turn follow the one easing. */
export function rewindAt(plan: Rewind, u: number): { at: Date; frame: number } {
  const e = ease(Math.min(1, Math.max(0, u)));
  const span = plan.to.getTime() - plan.from.getTime();
  return { at: e >= 1 ? plan.to : new Date(plan.from.getTime() + Math.round(span * e)), frame: plan.frame + plan.turn * e };
}

/** "1929 · 05 · 04" */
export function countLine(date: string): string {
  return `${date.slice(0, 4)} · ${date.slice(5, 7)} · ${date.slice(8, 10)}`;
}

/**
 * One frame of the rewind: the engine's chart at that minute on the birth
 * place's clock. Its last frame is the birth minute itself, handed to the
 * engine as the birth was, so it lands on the birth chart and not near it.
 */
export function rewindFrame(plan: Rewind, u: number): RewindFrame {
  const { at, frame } = rewindAt(plan, u);
  const { date, time } = wallClock(at, plan.place);
  const { latitude, longitude, timezone, timezoneOffset } = plan.place;
  const natal = calculateNatalChart(date, time, latitude, longitude, timezone ?? timezoneOffset);
  const longitudes = Object.fromEntries(BODIES.map((b) => [b, natal.planets[b].absoluteDegree])) as Record<Body, number>;
  return { at, frame, longitudes, count: countLine(date) };
}

/** The date the centre shows at `u`: the rewind's minute on the birth place's calendar. */
export function countAt(plan: Rewind, u: number): string {
  return countLine(wallClock(rewindAt(plan, u).at, plan.place).date);
}

/** A frame worked out ahead: where the engine put every body at `u`'s minute. */
export interface RewindKey {
  u: number;
  longitudes: Record<Body, number>;
}

export interface PreparedRewind {
  plan: Rewind;
  keys: RewindKey[];
}

function longitudesOf(chart: ChartData): Record<Body, number> {
  return Object.fromEntries(BODIES.map((b) => [b, chart.planets[b].absoluteDegree])) as Record<Body, number>;
}

/**
 * How many frames to work out ahead: as many as one engine chart's cost fits
 * into the lift, from 12 to 32. A chart takes about 30 ms on a laptop and four
 * times that on a slow phone, most of it the horizon sweep, so a chart per
 * display frame would stall the rewind.
 */
export function keyCount(chartMs: number): number {
  return Math.min(32, Math.max(12, Math.round(LIFT_MS / Math.max(1, chartMs))));
}

/**
 * Works out the rewind's frames, one engine chart per turn of the event loop
 * so the lift keeps moving, then hands them over. They are even in the
 * rewind's time, so on its eased clock they close in on the birth; the first
 * and last are the two skies' own charts.
 */
export function prepareRewind(from: Sky, to: Sky, count: number, done: (rewind: PreparedRewind) => void): () => void {
  const plan = planRewind(from, to);
  const keys: RewindKey[] = [{ u: 0, longitudes: longitudesOf(from.chart) }];
  const last = Math.max(2, count) - 1;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const next = () => {
    if (stopped) return;
    if (keys.length < last) {
      const u = keys.length / last;
      keys.push({ u, longitudes: rewindFrame(plan, u).longitudes });
      timer = setTimeout(next, 0);
      return;
    }
    keys.push({ u: 1, longitudes: longitudesOf(to.chart) });
    done({ plan, keys });
  };
  timer = setTimeout(next, 0);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

/**
 * The bodies at `u`: exactly the engine's on a frame worked out ahead, and
 * between two frames each glides the short way from one to the next. Near the
 * birth the frames are minutes apart, so the glide is the sky's own path; the
 * last is the birth chart itself.
 */
export function bodiesAt(keys: readonly RewindKey[], u: number): Record<Body, number> {
  const n = keys.length - 1;
  if (u >= 1 || n < 1) return keys[n].longitudes;
  const x = Math.max(0, u) * n;
  const k = Math.min(n - 1, Math.floor(x));
  const s = x - k;
  const a = keys[k].longitudes;
  if (s < 1e-9) return a;
  const b = keys[k + 1].longitudes;
  return Object.fromEntries(BODIES.map((body) => {
    const way = norm360(b[body] - a[body]);
    return [body, norm360(a[body] + (way > 180 ? way - 360 : way) * s)];
  })) as Record<Body, number>;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;

/** "4 May 1929", by hand so Node and every browser print the same. */
export function dayLine(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** A birth's minute on the reader's clock (MB-178), so a page never prints two clocks; a blank time says so. */
const timeLine = (birth: SkyBirth, clock: Clock): string => (birth.time === null ? "Time unknown" : clockWords(birth.time, clock));

/**
 * "4 May 1929 · 03:00 · Ixelles", or "4 May 1929 · 3 am · Ixelles" on a
 * 12-hour clock; 24-hour unless told, as the prerender draws it (reading 5).
 */
export function summaryLine(birth: SkyBirth, clock: Clock = 24): string {
  return `${dayLine(birth.date)} · ${timeLine(birth, clock)} · ${placeTitle(birth.place)}`;
}

/** ["13.12°", "Taurus"], from the engine's longitude, to the hundredth every readout prints. */
function degreeParts(absoluteDegree: number): [string, string] {
  const d = norm360(absoluteDegree);
  return [`${(d % 30).toFixed(2)}°`, SIGNS[Math.floor(d / 30) % 12]];
}

/** "13.12° Taurus" */
function degreeAt(absoluteDegree: number): string {
  return degreeParts(absoluteDegree).join(" ");
}

/** The Moon's arc across a birth day with no time (ADR-34): where it was at the day's first and last minute. */
export function moonDay(chart: ChartData): { from: number; to: number } | null {
  const band = chart.planets.moon?.band;
  return chart.angles || !band ? null : { from: band.fromDegree, to: band.toDegree };
}

/** "Aries", or "Aries or Taurus" when the body changed sign during a day with no time. */
function signsOf(chart: ChartData, body: "sun" | "moon"): string {
  const values = chart.angles ? [] : (body === "sun" ? chart.horizon.sunSign.values : chart.horizon.moonSign.values);
  const signs = [...new Set(values)];
  return signs.length > 1 ? signs.join(" or ") : chart.planets[body].sign;
}

/** The chart in one sentence, and the wheel's text equivalent: "Sun in Taurus, Moon in Pisces, Aquarius rising." */
export function plainLine(chart: ChartData): string {
  const rising = chart.angles ? `, ${chart.angles.ascendant.sign} rising` : "";
  return `Sun in ${signsOf(chart, "sun")}, Moon in ${signsOf(chart, "moon")}${rising}.`;
}

/**
 * A body's position in the parts a narrow table stacks: ["13.12°", "Taurus"],
 * or, on a day with no time, the Moon's range across it (and the Sun's when it
 * changed sign): ["2.10° Pisces", "to 15.40° Pisces"].
 */
export function positionParts(chart: ChartData, body: string): string[] {
  const p: ChartPlanet | undefined = chart.planets[body];
  if (!p) return [];
  const moved = body === "moon" || (body === "sun" && signsOf(chart, "sun").includes(" or "));
  if (!chart.angles && p.band && moved) return [degreeAt(p.band.fromDegree), `to ${degreeAt(p.band.toDegree)}`];
  return degreeParts(p.absoluteDegree);
}

/** "13.12° Taurus · 4th (home)"; a day with no time gives the range when the body changed sign. */
export function placementLine(chart: ChartData, body: string): string {
  const p: ChartPlanet | undefined = chart.planets[body];
  if (!p) return "";
  return `${positionParts(chart, body).join(" ")}${p.house ? ` · ${houseWithWord(p.house)}` : ""}`;
}

export function risingLine(chart: ChartData): string | null {
  return chart.angles ? degreeAt(chart.angles.ascendant.absoluteDegree) : null;
}

/** ["4th", "(home)"]: `houseWithWord` in the two parts a narrow table stacks. */
export function houseParts(house: number): [string, string] {
  return [ORDINALS[house - 1], `(${houseWord(house)})`];
}

export interface PlacementRow {
  key: string;
  label: string;
  /** Rising and the Midheaven, which the table marks as angles rather than bodies. */
  angle: boolean;
  position: string[];
  /** The whole-sign house, null when the chart has no horizon. */
  house: number | null;
}

/**
 * The placements table's rows: the ten bodies the wheel draws, then Rising and
 * the Midheaven with the house each falls in, which a chart with no time has
 * none of (ADR-34).
 */
export function placementRows(chart: ChartData): PlacementRow[] {
  const rows: PlacementRow[] = BODIES.filter((body) => chart.planets[body]).map((body) => ({
    key: body,
    label: PLANET_LABELS[body],
    angle: false,
    position: positionParts(chart, body),
    house: chart.planets[body].house ?? null,
  }));
  if (!chart.angles) return rows;
  const { ascendant, midheaven } = chart.angles;
  return [
    ...rows,
    { key: "ascendant", label: "Rising", angle: true, position: degreeParts(ascendant.absoluteDegree), house: 1 },
    {
      key: "midheaven",
      label: "Midheaven",
      angle: true,
      position: degreeParts(midheaven.absoluteDegree),
      house: houseOf(midheaven.absoluteDegree, ascendant.absoluteDegree),
    },
  ];
}

export interface HudLines {
  tl: string;
  tr: string;
  bl: string;
  br: string;
}

/** The four corners around the wheel, set in capitals by the page, the minute on the reader's clock. */
export function hudLines(sky: Sky, clock: Clock = 24): HudLines {
  const { chart, place } = sky;
  const at = latLngLine(place.latitude, place.longitude);
  const whose = sky.kind === "sample" ? `Sample · ${sky.name ?? ""}` : "Your chart";
  const tl = sky.kind === "now" && place.timezone
    ? `Live · ${clockLine(sky.at, place.timezone, clock)}`
    : sky.birth ? `${whose} · ${dayLine(sky.birth.date)} · ${timeLine(sky.birth, clock)}` : "";
  return {
    tl,
    tr: `${sky.kind === "now" ? "Over " : ""}${placeTitle(place)} · ${at}`,
    bl: chart.angles ? "Whole sign · tropical" : "Tropical · no horizon without a time",
    br: sunLine(chart),
  };
}

/** What a screen reader hears for the wheel: whose sky it is, then its facts. */
export function wheelLabel(sky: Sky): string {
  const whose = sky.kind === "now"
    ? `The sky now over ${placeTitle(sky.place)}, drawn as a birth chart`
    : sky.kind === "sample" ? `${sky.name ?? ""}'s birth chart, a sample` : "Your birth chart";
  return `${whose}: ${plainLine(sky.chart)}`;
}

export interface ResultLines {
  eyebrow: string;
  title: string;
  /** Set in capitals by the page, as the corners are. */
  summary: string;
  /** The placements table's caption, for a screen reader. */
  caption: string;
}

/** The words over /sky's placements: whose sky the table lists, and when and where it is from, on the reader's clock. */
export function resultLines(sky: Sky, clock: Clock = 24): ResultLines {
  const { chart, place, birth } = sky;
  if (sky.kind === "now") {
    return {
      eyebrow: "The sky right now",
      title: `Where the planets are over ${placeTitle(place)} right now`,
      summary: `${latLngLine(place.latitude, place.longitude)} · Whole sign · tropical`,
      caption: "Where each planet is now",
    };
  }
  const when = birth ? summaryLine(birth, clock) : "";
  return {
    eyebrow: sky.kind === "sample" ? "Sample chart" : "Your birth chart",
    title: plainLine(chart),
    summary: sky.kind === "sample" ? `${sky.name ?? ""} · ${when}` : when,
    caption: "Where each planet was",
  };
}

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** A count as a sentence says it: "ten", and the figure past twelve. */
export function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

/** The sky form's earliest birth, the bound its error line names. */
export const EARLIEST_BIRTH = "1900-01-01";

/** The visitor's own date, YYYY-MM-DD, on their device's clock. */
export function todayOf(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Null when the form can draw the date, else the line to show beside it. */
export function birthDateProblem(date: string, today: string): string | null {
  const t = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00Z`) : Number.NaN;
  const real = !Number.isNaN(t) && new Date(t).toISOString().startsWith(date);
  return real && date >= EARLIEST_BIRTH && date <= today ? null : `Enter a birth date from ${EARLIEST_BIRTH.slice(0, 4)} to today.`;
}

export const PLACE_PROBLEM = "Pick your birth place from the list. A town nearby is fine.";
