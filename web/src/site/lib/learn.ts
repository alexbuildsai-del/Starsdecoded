/**
 * What the two Learn pages say about houses and birth times, each read off the
 * zodiac's order or the engine (R-3.1, ADR-98): the sign each house holds under
 * a rising sign, the sample's houses in a sentence, and a whole day's rising
 * signs to the minute. No sign, degree or clock time here is typed.
 */
import { calculateNatalChart, localParts, offsetAtBirth, type DegreeBand, type HorizonFact } from "@workspace/engine";
import { SIGN_ORDER, norm360 } from "@/components/chart/wheel-geometry";
import { ORDINALS, houseWithWord, houseWord } from "@/lib/evidence-glossary";
import { degreeLine, skySentence } from "@/lib/sky-now";
import type { ChartData } from "@/types/chart";
import type { Birth } from "@/site/lib/chart";
import { formatUpdated } from "@/site/site";

export const MINUTES_IN_DAY = 24 * 60;
const NOON = MINUTES_IN_DAY / 2;

const two = (n: number): string => String(n).padStart(2, "0");

/** "03:05" for the day's 185th minute. */
export function clockOf(minute: number): string {
  return `${two(Math.floor(minute / 60))}:${two(minute % 60)}`;
}

export function minuteOf(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

const signOf = (absoluteDegree: number): string => SIGN_ORDER[Math.floor(norm360(absoluteDegree) / 30)];

/** "4th house (home)": a house number is never printed without its word (ADR-98). */
const houseNamed = (house: number): string => `${ORDINALS[house - 1]} house (${houseWord(house)})`;

/** The sign in each house, 1st to 12th, when the zodiac's `rising`th sign is the 1st. */
export function houseSigns(rising: number): string[] {
  return Array.from({ length: 12 }, (_, house) => SIGN_ORDER[(rising + house) % 12]);
}

/** The chart's rising sign as its place in the zodiac's order; -1 on a chart with no horizon. */
export function risingIndex(chart: ChartData): number {
  const sign = chart.angles?.ascendant.sign;
  return sign ? (SIGN_ORDER as readonly string[]).indexOf(sign) : -1;
}

/** "Leo rising: Leo is the 1st house (self), Virgo the 2nd (money) and Taurus the 10th (career)." */
export function pickLine(rising: number): string {
  const signs = houseSigns(rising);
  return `${signs[0]} rising: ${signs[0]} is the ${houseNamed(1)}, ${signs[1]} the ${houseWithWord(2)} and ${signs[9]} the ${houseWithWord(10)}.`;
}

/** The bare ring's text equivalent: every house and the sign in it. */
export function ringLabel(rising: number): string {
  const signs = houseSigns(rising);
  return `Whole-sign houses with ${signs[0]} rising: ${signs.map((sign, i) => `${houseWithWord(i + 1)} ${sign}`).join(", ")}.`;
}

/** The houses her sentence walks through: the 1st, which the rising sign fills, and the one her Sun is in. */
export function litHouses(chart: ChartData): number[] {
  const sun = chart.planets.sun?.house;
  return sun && sun !== 1 ? [1, sun] : [1];
}

/**
 * The sample's houses said from her chart: her rising sign as the 1st house,
 * and her Sun's house counted from it. Null on a chart with no horizon.
 */
export function chartLine(name: string, chart: ChartData): string | null {
  const sun = chart.planets.sun;
  if (!chart.angles || !sun?.house) return null;
  const signs = houseSigns(risingIndex(chart));
  const rising = `When ${name} was born, ${signs[0]} was rising, so ${signs[0]} is her ${houseNamed(1)}, ${signs[1]} her ${houseWithWord(2)}, and so on around the wheel.`;
  const counted = sun.house === 1
    ? `Her Sun is in ${sun.sign} too, so it sits in her ${houseNamed(1)}.`
    : `Her Sun is in ${sun.sign}, the ${ORDINALS[sun.house - 1]} sign from ${signs[0]}, so it sits in her ${houseNamed(sun.house)}.`;
  return `${rising} ${counted}`;
}

/** Her ring's text equivalent: whose chart it is, then its facts. */
export function chartLabel(name: string, chart: ChartData): string {
  return `${name}'s birth chart on whole-sign houses: ${skySentence(chart)}`;
}

export interface RisingSpan {
  sign: string;
  /** Minutes of the swept day: the sign's first, and the next sign's first; null where the span runs past the day's edge. */
  from: number | null;
  to: number | null;
}

export interface SweptDay {
  /** The place and date swept, as a birth; its time plays no part. */
  at: Birth;
  /** The swept day's first minute as an instant: the place's midnight. */
  start: number;
  spans: RisingSpan[];
  /** Where the Moon and the Sun were at the day's first and last minute. */
  moon: DegreeBand;
  sun: DegreeBand;
}

/** The instant a wall-clock time names on the day of `at`, at the offset its zone kept at that time. */
export function instantOf(at: Birth, time: string): number {
  const [year, month, day] = at.birthDate.split("-").map(Number);
  const offset = at.timezone ? offsetAtBirth(at.timezone, at.birthDate, time) : at.timezoneOffset;
  return Date.UTC(year, month - 1, day) + minuteOf(time) * 60_000 - offset * 3_600_000;
}

/** Every minute of one parity gets the sign the engine's sweep holds there: its first value, moved on at each flip so far. */
function readSweep(fact: HorizonFact, first: 0 | 1, into: string[]): void {
  const flips = fact.flipsAt.map(minuteOf);
  let k = 0;
  for (let m = first; m < MINUTES_IN_DAY; m += 2) {
    while (k < flips.length && flips[k] <= m) k++;
    into[m] = fact.values[k];
  }
}

function nextDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/**
 * A day's rising signs to the minute. The engine sweeps a birth day's horizon
 * every two minutes from the birth time, so a whole-day sweep from noon reads
 * the even minutes and one from a minute past reads the odd: two engine runs
 * give what a run for each of the day's 1,440 minutes would. The first sweep
 * also carries where the Moon and the Sun were at the day's two ends.
 *
 * Both sweep from the place's midnight on the clock it kept then. A day that
 * skips an hour ends before the sweep does, so its spans stop at midnight; a
 * day that repeats one runs past it, so its last sign's end is unknown and
 * that span is left out rather than guessed.
 */
export function sweepDay(at: Birth): SweptDay {
  const midnight = clockOf(0);
  const offset = at.timezone ? offsetAtBirth(at.timezone, at.birthDate, midnight) : at.timezoneOffset;
  const sweep = (centre: number) => calculateNatalChart(at.birthDate, clockOf(centre), at.latitude, at.longitude, offset, NOON);
  const even = sweep(NOON);
  const odd = sweep(NOON + 1);
  const signs = new Array<string>(MINUTES_IN_DAY);
  readSweep(even.horizon.ascendant, 0, signs);
  readSweep(odd.horizon.ascendant, 1, signs);

  let spans: RisingSpan[] = [];
  for (let m = 0; m < MINUTES_IN_DAY; m++) {
    if (m > 0 && signs[m] === signs[m - 1]) continue;
    const last = spans[spans.length - 1];
    if (last) last.to = m;
    spans.push({ sign: signs[m], from: m === 0 ? null : m, to: null });
  }
  const [year, month, day] = at.birthDate.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day) - offset * 3_600_000;
  const end = Math.round((instantOf({ ...at, birthDate: nextDate(at.birthDate) }, midnight) - start) / 60_000);
  if (end < MINUTES_IN_DAY) {
    spans = spans.filter((s) => (s.from ?? 0) < end).map((s) => (s.to !== null && s.to >= end ? { ...s, to: null } : s));
  } else if (end > MINUTES_IN_DAY) {
    spans.pop();
  }
  const { moon, sun } = even.planets;
  if (!moon.band || !sun.band) throw new Error("A whole-day sweep should carry the Moon's and the Sun's bands.");
  return { at, start, spans, moon: moon.band, sun: sun.band };
}

/** A swept minute on the place's own wall clock, which a day that changes its clocks keeps apart from the swept one. */
export function clockAt(day: SweptDay, minute: number): string {
  const zone = day.at.timezone;
  return zone ? localParts(new Date(day.start + minute * 60_000), zone).time : clockOf(minute);
}

const sweptMinute = (day: SweptDay, time: string): number => Math.round((instantOf(day.at, time) - day.start) / 60_000);

/** The rising sign's span at a wall-clock time of the swept day; null for a time the sweep did not reach. */
export function spanAt(day: SweptDay, time: string): RisingSpan | null {
  const minute = sweptMinute(day, time);
  if (minute < 0 || minute >= MINUTES_IN_DAY) return null;
  return day.spans.find((s) => (s.from ?? -1) <= minute && minute < (s.to ?? MINUTES_IN_DAY)) ?? null;
}

export interface RiseWindow {
  sign: string;
  /** The sign that rose next, or null when the day ended first. */
  next: string | null;
  /** On the birth's clock: the sign's first minute, and the next sign's first; null where the day's edge cuts the span. */
  from: string | null;
  to: string | null;
  /** Minutes from the sign's first minute to the birth, and from the birth to the next sign. */
  since: number | null;
  left: number | null;
}

/** When the rising sign at a birth rose, to the minute, and how near the birth came to either end. */
export function riseWindow(birth: Birth, day: SweptDay = sweepDay(birth)): RiseWindow | null {
  const span = spanAt(day, birth.birthTime);
  if (!span) return null;
  const minute = sweptMinute(day, birth.birthTime);
  return {
    sign: span.sign,
    next: day.spans[day.spans.indexOf(span) + 1]?.sign ?? null,
    from: span.from === null ? null : clockAt(day, span.from),
    to: span.to === null ? null : clockAt(day, span.to),
    since: span.from === null ? null : minute - span.from,
    left: span.to === null ? null : span.to - minute,
  };
}

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const minutesSaid = (n: number): string => `${COUNT_WORDS[n] ?? n} ${n === 1 ? "minute" : "minutes"}`;
/** Close enough to a change of rising sign that a recorded time a little out would move it. */
const CLOSE_MINUTES = 15;

/**
 * The sample's day in three sentences: when her rising sign rose over her
 * birthplace, and how near her recorded minute came to the next sign or the
 * last one. Her birth time is from her birth record (reading 4).
 */
export function sampleDayLine(name: string, city: string, birth: Birth, w: RiseWindow): string {
  const span = w.from && w.to ? `from ${w.from} to ${w.to}` : w.to ? `from before midnight to ${w.to}` : w.from ? `from ${w.from} to after midnight` : "all day";
  const opening = `On ${formatUpdated(birth.birthDate)} in ${city}, the day ${name} was born, ${w.sign} was rising ${span}.`;
  const record = `Her birth record says ${birth.birthTime}`;
  if (w.left !== null && w.next && w.left <= CLOSE_MINUTES) {
    return `${opening} ${record}, just ${minutesSaid(w.left)} before ${w.next} began to rise. A little later, and her rising sign and every one of her houses would have been different.`;
  }
  if (w.since !== null && w.since <= CLOSE_MINUTES) {
    return `${opening} ${record}, just ${minutesSaid(w.since)} after ${w.sign} began to rise. A little earlier, and her rising sign and every one of her houses would have been different.`;
  }
  return `${opening} ${record}, well inside that window, so her rising sign holds even if the time is a few minutes out.`;
}

/** "Leo rises from 09:12 to 11:40 today."; the day's first and last signs rose before it or still rise after it. */
export function spanLine(day: SweptDay, span: RisingSpan): string {
  if (span.from === null && span.to === null) return `${span.sign} rises all day.`;
  if (span.from === null) return `${span.sign} rises from before midnight to ${clockAt(day, span.to ?? 0)}.`;
  if (span.to === null) return `${span.sign} rises from ${clockAt(day, span.from)} to after midnight.`;
  return `${span.sign} rises from ${clockAt(day, span.from)} to ${clockAt(day, span.to)} today.`;
}

/** "It moves 12.97° today, all of it in Pisces." The Moon and the Sun only ever move forward. */
export function moveLine(band: DegreeBand, digits: number): string {
  const moved = norm360(band.toDegree - band.fromDegree).toFixed(digits);
  const from = signOf(band.fromDegree);
  const to = signOf(band.toDegree);
  return from === to ? `It moves ${moved}° today, all of it in ${from}.` : `It moves ${moved}° today, from ${from} into ${to}.`;
}

export interface DayStat {
  label: string;
  value: string;
  note: string;
}

/**
 * The readout beside the day's wheel at one minute: the rising sign and its
 * span, the 1st house it makes, and the Moon and Sun with their whole day's
 * move. The span is said only when the sweep and the chart agree on the sign.
 */
export function dayStats(day: SweptDay, chart: ChartData, time: string): DayStat[] {
  const rows: DayStat[] = [];
  const ascendant = chart.angles?.ascendant;
  if (ascendant) {
    const span = spanAt(day, time);
    rows.push(
      { label: "Rising", value: degreeLine(ascendant), note: span?.sign === ascendant.sign ? spanLine(day, span) : "" },
      { label: "Houses", value: `${ascendant.sign} is the ${houseNamed(1)}`, note: "They turn with the rising sign." },
    );
  }
  rows.push(
    { label: "Moon", value: degreeLine(chart.planets.moon), note: moveLine(day.moon, 1) },
    { label: "Sun", value: degreeLine(chart.planets.sun), note: moveLine(day.sun, 2) },
  );
  return rows;
}
