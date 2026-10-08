/**
 * Life's pieces as words and geometry, pure so a node test pins them: a
 * cycle's card (its ages, dates, status and look-back), a planet's round as a
 * ring, and the waves from birth to 90 with their returns, oppositions and
 * quarter turns found in the engine's monthly distances. Dates are the
 * reader's days, "YYYY-MM-DD", in their language's order (reading 4).
 */
import { longitudeAt, type CycleId, type SkyBody } from "@workspace/engine";
import type { DateOrder } from "@/lib/date-entry";
import { ORDINALS, houseWord } from "@/lib/evidence-glossary";
import { dayIn, dayMonth, fullDate, listOf, monthYear } from "@/lib/timeline-view";

/** One cycle as its card shows it, built from the engine's `LifeCycle` or the API's view of one. */
export interface CycleView {
  /** The engine's `cycle.{id}.{yyyymmdd}` (reading 5), or the id where a list holds one of each. */
  key: string;
  id: CycleId;
  /** `CYCLE_WORDS[id]`: the cycle's name and its plain word. */
  name: string;
  word: string;
  /** Whole years at its first exact pass, or at its window's start when it never is exact. */
  age: number;
  /** Its exact passes in order: one for most, two or three when a retrograde splits it. */
  exact: readonly string[];
  /** Its window, from coming within the orb to leaving it. */
  start: string;
  end: string;
  /** It comes more than once in a life, so its card looks back to the last time. */
  repeats: boolean;
  /** The day the card is for: the reader's today, or Mira's day on /timeline. Its status and look-back count from it. */
  today: string;
  /** How far round its planet has come since birth on `today`, 0 to 1 (the engine's `roundProgress`); null when unknown. */
  progress: number | null;
  /** The engine's degrees travelled since birth at the cycle (90, 180, 270, 360…), which places it on the ring exactly. */
  angle?: number;
  /** The time before, for the look-back: its first exact day and the age then. */
  last: { on: string; age: number } | null;
  /** Every age it comes at in a life, for the compact card's head. */
  ages?: readonly number[];
  /** A line on why it matters, which the compact card shows in place of the plain word (the finder's). */
  why?: string | null;
  /** The instant of its first exact pass, or of its window's start, which the science asks the engine about. */
  at?: string;
  /** The reader's day of each age in `ages`, which says what is behind them. */
  ageDays?: readonly string[];
}

const NB = "\u00a0";
const DAY_MS = 86_400_000;
const YEAR_MS = 365.25 * DAY_MS;

function dayMs(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** The day a cycle is dated by: its first exact pass, or its window's start when it never is exact. */
export function cycleDay(cycle: Pick<CycleView, "exact" | "start">): string {
  return cycle.exact[0] ?? cycle.start;
}

export type CycleWhen = "past" | "now" | "ahead";

/** Behind the reader once its window has closed, happening while it is open, ahead before. */
export function cycleWhen(cycle: Pick<CycleView, "start" | "end">, today: string): CycleWhen {
  if (cycle.end < today) return "past";
  return cycle.start <= today ? "now" : "ahead";
}

/** The status chip: "Behind you", "Happening now", "Within a year" or "In 3 years". */
export function cycleChip(cycle: Pick<CycleView, "exact" | "start" | "end">, today: string): string {
  const when = cycleWhen(cycle, today);
  if (when === "past") return "Behind you";
  if (when === "now") return "Happening now";
  const years = (dayMs(cycleDay(cycle)) - dayMs(today)) / YEAR_MS;
  if (years < 1) return "Within a year";
  const n = Math.round(years);
  return `In ${n} ${n === 1 ? "year" : "years"}`;
}

/** The Your cycles card's countdown: "behind you", "now", "this year" or "in 4 years", counted to its first exact day. */
export function cycleCountdown(cycle: Pick<CycleView, "exact" | "start" | "end">, today: string): string {
  const when = cycleWhen(cycle, today);
  if (when === "past") return "behind you";
  if (when === "now") return "now";
  const years = (dayMs(cycleDay(cycle)) - dayMs(today)) / YEAR_MS;
  if (years < 1) return "this year";
  const n = Math.round(years);
  return `in ${n} ${n === 1 ? "year" : "years"}`;
}

/** The compact card's head: "At 29, 58 and 88", "About every 12 years, from 11", or "Once, at 44". */
export function cycleAges(cycle: Pick<CycleView, "age" | "ages" | "repeats">): string {
  if (!cycle.repeats) return `Once, at ${cycle.age}`;
  const ages = cycle.ages?.length ? cycle.ages : [cycle.age];
  if (ages.length <= 4) return `At ${listOf(ages.map(String))}`;
  const every = Math.round((ages[ages.length - 1] - ages[0]) / (ages.length - 1));
  // A narrow card's head never leaves the first age alone on a line below its "from".
  return `About every ${every} years, from${NB}${ages[0]}`;
}

/** Passes in one year share it, "16 Aug and 28 Dec 2035"; across years each keeps its own. */
export function passList(days: readonly string[], order: DateOrder): string {
  const years = new Set(days.map((day) => day.slice(0, 4)));
  if (days.length < 2 || years.size > 1) return listOf(days.map((day) => fullDate(day, order)));
  const year = days[0].slice(0, 4);
  const short = listOf(days.map((day) => dayMonth(day, order)));
  if (order === "dmy") return `${short}${NB}${year}`;
  return order === "mdy" ? `${short},${NB}${year}` : `${year}${NB}${short}`;
}

/** Its exact passes, or its window when it never is exact. */
export function cycleDates(cycle: Pick<CycleView, "exact" | "start" | "end">, order: DateOrder): string {
  if (cycle.exact.length) return passList(cycle.exact, order);
  return `${fullDate(cycle.start, order)} to ${fullDate(cycle.end, order)}`;
}

/** The full card's one fact, its numbers quieter than its words (ADR-98): "19 Jan 2021 · age 29". */
export function cycleFact(cycle: Pick<CycleView, "exact" | "start" | "end" | "age">, order: DateOrder): string {
  return `${cycleDates(cycle, order)} · age ${cycle.age}`;
}

/**
 * A repeating cycle's look-back (reading 19; Review 05/10 §4): a month and year, since a season would need the
 * reader's hemisphere, and only a time that has happened. A cycle now or ahead looks back to the time before it; one
 * behind the reader, one that comes once, or one with nothing before it that is already past, has none.
 */
export function lookBack(cycle: CycleView, today: string, order: DateOrder): string | null {
  if (!cycle.repeats || cycle.end < today || !cycle.last || cycle.last.on >= today) return null;
  return `Think back to ${monthYear(cycle.last.on, order)}, when you were ${cycle.last.age}.`;
}

export interface AgeStep {
  age: number;
  /** "this" is the card's own age; the rest are behind the reader or still ahead. */
  state: "past" | "this" | "ahead";
}

/** Every age the cycle comes at in a life, each marked: behind the reader, this card's own, or ahead. */
export function cycleAgeSteps(cycle: Pick<CycleView, "age" | "ages" | "ageDays" | "end">, today: string): AgeStep[] {
  const ages = cycle.ages?.length ? cycle.ages : [cycle.age];
  const own = ages.indexOf(cycle.age);
  return ages.map((age, i) => {
    if (i === own) return { age, state: "this" };
    const day = cycle.ageDays?.[i];
    // Without the days (Ask's card) an age before this one is behind the reader only while this one is not.
    const past = day !== undefined ? day < today : i < own && cycle.end >= today;
    return { age, state: past ? "past" : "ahead" };
  });
}

/** The line under the ages: "Next on 20 Nov 2030, at 35." for a cycle still to come, "It was on 2 Aug 2000, at 4." after. */
export function cycleNextLine(cycle: Pick<CycleView, "exact" | "start" | "age">, today: string, order: DateOrder): string {
  const day = cycleDay(cycle);
  return `${day >= today ? "Next on" : "It was on"} ${fullDate(day, order)}, at ${cycle.age}.`;
}

export type CycleKind = "return" | "opposition" | "square";

export function cycleKind(id: CycleId): CycleKind {
  if (id.endsWith("-return")) return "return";
  return id.endsWith("-opposition") ? "opposition" : "square";
}

/** The body a cycle belongs to, as the engine names it. */
export function cycleBody(id: CycleId): string {
  return id.startsWith("node-") ? "north_node" : id.slice(0, id.indexOf("-"));
}

/**
 * Where the cycle falls on its planet's round, 0 to 1: a half for an
 * opposition, a quarter or three quarters for a square, none for a return,
 * which sits on the birth point. From the engine's angle when it came, else
 * the age and the planet's mean round tell an opening square from a closing one.
 */
export function ringTarget(cycle: Pick<CycleView, "id" | "age" | "angle">): number | null {
  if (cycle.angle != null) {
    const turn = (((cycle.angle % 360) + 360) % 360) / 360;
    return turn === 0 ? null : turn;
  }
  const kind = cycleKind(cycle.id);
  if (kind === "return") return null;
  if (kind === "opposition") return 0.5;
  const period = MARKED[cycleBody(cycle.id)]?.period;
  const turn = period ? (cycle.age % period) / period : 0.25;
  return Math.abs(turn - 0.25) <= Math.abs(turn - 0.75) ? 0.25 : 0.75;
}

/**
 * A point a fraction of the way round a ring of radius r about (c, c): from
 * the left, where our mark's brass point sits, and anticlockwise, the way the
 * zodiac runs on every wheel the site draws.
 */
export function ringPoint(fraction: number, c: number, r: number): [number, number] {
  const a = fraction * 2 * Math.PI;
  return [round2(c - r * Math.cos(a)), round2(c + r * Math.sin(a))];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The arc from the birth point to `progress` of the way round; none for nothing, two halves for a whole turn. */
export function ringArc(progress: number, c: number, r: number): string {
  const p = Math.min(Math.max(progress, 0), 1);
  if (p <= 0) return "";
  const [x0, y0] = ringPoint(0, c, r);
  if (p >= 1) {
    const [xh, yh] = ringPoint(0.5, c, r);
    return `M${x0} ${y0}A${r} ${r} 0 1 0 ${xh} ${yh}A${r} ${r} 0 1 0 ${x0} ${y0}`;
  }
  const [x1, y1] = ringPoint(p, c, r);
  return `M${x0} ${y0}A${r} ${r} 0 ${p > 0.5 ? 1 : 0} 0 ${x1} ${y1}`;
}

export type WaveMarkKind = CycleKind;

export interface WaveMark {
  age: number;
  kind: WaveMarkKind;
}

/** One planet's distance from its place at birth, 0 to 180°, by age: the engine's `Wave`, or the API's. */
export interface WaveLine {
  body: string;
  points: readonly { age: number; distance: number }[];
  /**
   * Its cycles where the engine dates them (`cycleMark`). Without them the
   * marks are found in the monthly points, where the line reaches each place:
   * a planet standing still inside the orb gets there up to a few months
   * before the engine's first exact pass, so a page that prints the ages
   * passes these.
   */
  marks?: readonly WaveMark[];
}

/**
 * A cycle as a mark on its wave, at the engine's date for it: its first exact
 * pass, or its window's start. Whole years count birthdays as the engine's
 * `ageAt` does, so the mark's age is the card's.
 */
export function cycleMark(id: CycleId, first: Date | string, birth: Date | string): WaveMark {
  const at = new Date(first);
  const born = new Date(birth);
  let whole = at.getUTCFullYear() - born.getUTCFullYear();
  if (at.getTime() < birthdayAt(born, whole)) whole--;
  const from = birthdayAt(born, whole);
  return { age: whole + (at.getTime() - from) / (birthdayAt(born, whole + 1) - from), kind: cycleKind(id) };
}

/** The instant of a birthday: the birth's own hour, `years` on. */
function birthdayAt(born: Date, years: number): number {
  const day = new Date(born.getTime());
  day.setUTCFullYear(born.getUTCFullYear() + years);
  return day.getTime();
}

/** The instant a fractional age falls on, the inverse of `cycleMark`'s count. */
export function ageInstant(birth: Date | string, age: number): Date {
  const born = new Date(birth);
  const whole = Math.floor(age);
  const from = birthdayAt(born, whole);
  return new Date(from + (age - whole) * (birthdayAt(born, whole + 1) - from));
}

/** Life runs from birth to 90 (ADR-209). */
export const WAVE_UNTIL = 90;

/** Across the wave, 0 to 100: birth on the left, 90 on the right. */
export function waveX(age: number): number {
  return (Math.min(Math.max(age, 0), WAVE_UNTIL) / WAVE_UNTIL) * 100;
}

/** Down the wave, 0 to 100: opposite at the top, a return at the bottom, a little room at each edge for the line. */
export function waveY(distance: number): number {
  return 4 + (1 - Math.min(Math.max(distance, 0), 180) / 180) * 92;
}

/** The wave as a path in a 1000 by 100 box, stretched to its row. */
export function wavePath(points: WaveLine["points"]): string {
  let d = "";
  for (const point of points) {
    if (point.age > WAVE_UNTIL) break;
    d += `${d ? "L" : "M"}${(waveX(point.age) * 10).toFixed(1)} ${waveY(point.distance).toFixed(1)}`;
  }
  return d;
}

interface Marked {
  /** The cycles the doctrine names for the body (CycleId); its other turns stay unmarked. */
  kinds: readonly WaveMarkKind[];
  /** The doctrine's orb for the body's cycles (ADR-208): a dip this close is inside the cycle's window. */
  orb: number;
  /** Its mean round in years: passes under a quarter of it apart are one passage a retrograde split. */
  period: number;
}

const MARKED: Readonly<Record<string, Marked>> = {
  jupiter: { kinds: ["return", "opposition"], orb: 2, period: 11.862 },
  saturn: { kinds: ["return", "opposition", "square"], orb: 2, period: 29.457 },
  north_node: { kinds: ["return", "opposition"], orb: 1, period: 18.613 },
  uranus: { kinds: ["return", "opposition", "square"], orb: 1.5, period: 84.02 },
  neptune: { kinds: ["square"], orb: 1.5, period: 164.79 },
  pluto: { kinds: ["square"], orb: 1.5, period: 247.94 },
};

type Point = WaveLine["points"][number];

/** How far a point is from where a turn is exact: the birth place for a return, the opposite place for an opposition. */
const OFF: Readonly<Record<"return" | "opposition", (distance: number) => number>> = {
  return: (distance) => distance,
  opposition: (distance) => 180 - distance,
};

// Three readings of a dip in five monthly points: the planet turned back short of the place, or passed it just after
// the middle point, or just before it. Past the place its offset is on the other side, so it counts as negative.
const READINGS = [
  [1, 1, 1, 1, 1],
  [1, 1, 1, -1, -1],
  [-1, -1, 1, 1, 1],
] as const;

/** How unevenly five signed offsets change: a planet's place changes smoothly, so the true reading is the smoothest. */
function roughness(v: readonly number[]): number {
  const bend = [v[0] - 2 * v[1] + v[2], v[1] - 2 * v[2] + v[3], v[2] - 2 * v[3] + v[4]];
  return Math.abs(bend[1] - bend[0]) + Math.abs(bend[2] - bend[1]);
}

/**
 * The age the wave reaches a turn's place beside the middle of five points, or
 * null. A planet that stands still and turns back short of the place dips
 * there too, so each dip is read the three ways: a pass that reads smoothest
 * is dated from the two points either side of it; a dip that doesn't is kept
 * only inside the orb, where the cycle's window is open, or two passes hide
 * between two months.
 */
function passAt(five: readonly Point[], off: (distance: number) => number, orb: number): number | null {
  const v = five.map((p) => off(p.distance));
  if (!(v[2] <= v[1] && v[2] < v[3])) return null;
  const rough = READINGS.map((signs) => roughness(v.map((value, k) => value * signs[k])));
  const best = rough.indexOf(Math.min(...rough));
  const b = five[2];
  if (best === 0) return v[2] <= orb ? b.age : null;
  const [near, w] = best === 1 ? [five[3], v[3]] : [five[1], v[1]];
  return v[2] + w > 0 ? b.age + (v[2] / (v[2] + w)) * (near.age - b.age) : b.age;
}

/**
 * The cycles a wave shows as marks: the engine's own when the line carries
 * them, else found in its monthly points so each sits on the line. A return
 * where it reaches its birth place, an opposition where it reaches the
 * opposite place, a quarter turn where it crosses 90°; a passage a retrograde
 * splits into two or three passes is one mark, at the first, as the engine
 * dates a cycle; leaving the birth place is no return.
 */
export function waveMarks(line: WaveLine): WaveMark[] {
  if (line.marks) return [...line.marks].filter((m) => m.age <= WAVE_UNTIL).sort((x, y) => x.age - y.age);
  const rule = MARKED[line.body];
  if (!rule) return [];
  const points = line.points.filter((p) => p.age <= WAVE_UNTIL);
  const marks: WaveMark[] = [];
  const last: Partial<Record<WaveMarkKind, number>> = {};
  const seen = (age: number, kind: WaveMarkKind) => {
    const before = last[kind];
    last[kind] = age;
    if (before === undefined || age - before >= rule.period / 4) marks.push({ age, kind });
  };
  const wants = (kind: WaveMarkKind) => rule.kinds.includes(kind);
  for (let i = 1; i < points.length; i++) {
    const five = i >= 2 && i + 2 < points.length ? points.slice(i - 2, i + 3) : null;
    if (five && wants("return")) {
      const age = passAt(five, OFF.return, rule.orb);
      if (age !== null && age >= rule.period / 4) seen(age, "return");
    }
    if (five && wants("opposition")) {
      const age = passAt(five, OFF.opposition, rule.orb);
      if (age !== null) seen(age, "opposition");
    }
    const a = points[i - 1];
    const b = points[i];
    // Quarter turns need no reading: 90° is no fold of the distance, so the line truly crosses it.
    if (wants("square") && a.distance !== b.distance && (a.distance - 90) * (b.distance - 90) <= 0) {
      seen(a.age + ((90 - a.distance) / (b.distance - a.distance)) * (b.age - a.age), "square");
    }
  }
  return marks.sort((x, y) => x.age - y.age);
}

const BODY_NAMES: Readonly<Record<string, string>> = {
  jupiter: "Jupiter", saturn: "Saturn", north_node: "The Moon's nodes", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto",
};

/** A wave's row label. */
export function bodyName(body: string): string {
  return BODY_NAMES[body] ?? body.charAt(0).toUpperCase() + body.slice(1);
}

/** A wave's marks in words, for a screen reader: "At 29, 58 and 88, Saturn comes back to where it was when you were born. …" */
export function waveSentence(line: WaveLine): string {
  const marks = waveMarks(line);
  const nodes = line.body === "north_node";
  let subject = nodes ? "the Moon's nodes" : bodyName(line.body);
  let place = nodes ? "where they were when you were born" : "where it was when you were born";
  const sentences: string[] = [];
  const say = (kind: WaveMarkKind, words: (subject: string, place: string) => string) => {
    const ages = marks.filter((m) => m.kind === kind).map((m) => String(Math.floor(m.age)));
    if (!ages.length) return;
    sentences.push(`At ${listOf(ages)}, ${words(subject, place)}.`);
    subject = nodes ? "they" : "it";
    place = "that place";
  };
  say("return", (s, p) => `${s} ${nodes ? "come" : "comes"} back to ${p}`);
  say("opposition", (s, p) => `${s} ${nodes ? "are" : "is"} opposite ${p}`);
  say("square", (s, p) => `${s} ${nodes ? "are" : "is"} a quarter turn from ${p}`);
  return sentences.join(" ");
}

/** The whole figure in words: every wave's marks, then where today falls. */
export function wavesLabel(lines: readonly WaveLine[], today: number): string {
  return [...lines.map(waveSentence).filter(Boolean), `You are ${Math.floor(today)} now.`].join(" ");
}

// On a phone eight years is about 30 px, as much as "Today" and an age beside it need.
const TODAY_ROOM = 8;

/** The ages along the top, every ten years, leaving room around today's mark for its label. */
export function waveTicks(today: number): number[] {
  const ticks: number[] = [];
  for (let age = 0; age <= WAVE_UNTIL; age += 10) if (Math.abs(age - today) >= TODAY_ROOM) ticks.push(age);
  return ticks;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
// The line on Life says "today" this close to it, and the card under it is the next cycle still to come.
const TODAY_DAYS = 29;

export interface LineStamp {
  /** "Today · age 31 · Oct 2026", or "age 64 · Aug 2059" anywhere else. */
  text: string;
  /** The line is on today, near enough that the card is the next cycle ahead. */
  atToday: boolean;
}

/** What rides on Life's line at a fractional age: the whole age (floored, as the cards count) and the reader's month. */
export function lineStamp(age: number, birth: string, zone: string, today: string, order: DateOrder): LineStamp {
  const day = dayIn(ageInstant(birth, age), zone);
  const atToday = Math.abs(dayMs(day) - dayMs(today)) <= TODAY_DAYS * DAY_MS;
  const month = SHORT_MONTHS[Number(day.slice(5, 7)) - 1];
  const stamp = order === "ymd" ? `${day.slice(0, 4)}${NB}${month}` : `${month}${NB}${day.slice(0, 4)}`;
  return { text: `${atToday ? "Today \u00b7 " : ""}age ${Math.floor(age)} \u00b7 ${stamp}`, atToday };
}

export interface LifeStop {
  key: string;
  body: string;
  kind: WaveMarkKind;
  /** Where its mark sits on its wave, which is where the line stops. */
  age: number;
}

/** The cycle marks the line snaps to, in order of age: each cycle at the age `cycleMark` puts it on its wave. */
export function lifeStops(
  cycles: readonly { key: string; id: CycleId; exact: readonly string[]; start: string }[],
  birth: string,
): LifeStop[] {
  return cycles
    .map((cycle) => {
      const mark = cycleMark(cycle.id, cycle.exact[0] ?? cycle.start, birth);
      return { key: cycle.key, body: cycleBody(cycle.id), kind: mark.kind, age: mark.age };
    })
    .filter((stop) => stop.age <= WAVE_UNTIL)
    .sort((a, b) => a.age - b.age);
}

/** The stop nearest an age; the earlier one when two are as near. */
export function nearestStop<T extends { age: number }>(stops: readonly T[], age: number): T | null {
  let best: T | null = null;
  for (const stop of stops) if (best === null || Math.abs(stop.age - age) < Math.abs(best.age - age)) best = stop;
  return best;
}

const LENGTHS: Readonly<Record<string, string>> = {
  jupiter: "12 years", saturn: "29\u00bd years", north_node: "18\u00bd years", uranus: "84 years", neptune: "165 years", pluto: "248 years",
};

const WHAT: Readonly<Record<CycleKind, string>> = {
  return: "comes back to where it was when you were born",
  opposition: "gets halfway round, opposite where it was when you were born",
  square: "gets a quarter of the way round from where it was when you were born",
};

/** What happens in the sky, in a sentence: "Jupiter comes back to where it was when you were born." */
export function cycleWhat(id: CycleId): string {
  const kind = cycleKind(id);
  if (cycleBody(id) === "north_node") {
    return kind === "return"
      ? "The Moon's nodes come back to where they were when you were born."
      : "The Moon's nodes reverse: the North Node reaches where the South Node was.";
  }
  return `${bodyName(cycleBody(id))} ${WHAT[kind]}.`;
}

/** The card's "what and how often": the sentence and the planet's whole trip. */
export function cycleAbout(id: CycleId): string {
  const length = LENGTHS[cycleBody(id)];
  return length ? `${cycleWhat(id)} It takes ${length}.` : cycleWhat(id);
}

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const turn = (deg: number) => ((deg % 360) + 360) % 360;

/** "6.21\u00b0 Sagittarius": the degree cut, never rounded up into the next sign. */
function placeOf(lon: number): string {
  const at = turn(lon);
  return `${(Math.floor((at % 30) * 100) / 100).toFixed(2)}\u00b0 ${SIGNS[Math.floor(at / 30) % 12]}`;
}

/** Whole-sign, as the chart counts: the Ascendant's sign is the 1st. */
function houseOf(lon: number, ascendant: number): number {
  return ((Math.floor(turn(lon) / 30) - Math.floor(turn(ascendant) / 30) + 12) % 12) + 1;
}

function houseIn(lon: number, ascendant: number | null, lead: string): string {
  if (ascendant === null) return "";
  const house = houseOf(lon, ascendant);
  return `${lead}${ORDINALS[house - 1]} house`;
}

/**
 * The ⓘ's three lines, from the engine: where the planet stood at birth and where it is on the cycle's first exact
 * day (each with its house when the birth time gives one), and how long it stays close, with its passes. The engine's
 * own positions, so a return reads the same degree twice.
 */
export function cycleScience(
  cycle: Pick<CycleView, "id" | "exact" | "start" | "end" | "at">,
  birth: string,
  ascendant: number | null,
  order: DateOrder,
): string[] {
  const body = cycleBody(cycle.id) as SkyBody;
  const day = cycleDay(cycle);
  const born = longitudeAt(body, new Date(birth));
  const then = longitudeAt(body, new Date(cycle.at ?? `${day}T12:00:00Z`));
  const planet = body === "north_node" ? "the North Node" : bodyName(body);
  const bornHouse = ascendant === null ? "" : `${houseIn(born, ascendant, ", in your ")} (${houseWord(houseOf(born, ascendant))})`;
  const passes = cycle.exact.length > 1 ? `, exact ${cycle.exact.length} times as it goes back and forth` : "";
  return [
    `When you were born, ${planet} was at ${placeOf(born)}${bornHouse}.`,
    `On ${fullDate(day, order)} it is at ${placeOf(then)}${houseIn(then, ascendant, ", your ")}.`,
    `It stays close from ${fullDate(cycle.start, order)} to ${fullDate(cycle.end, order)}${passes}.`,
  ];
}
