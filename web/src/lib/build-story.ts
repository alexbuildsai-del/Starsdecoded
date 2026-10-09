/**
 * The Personal report's loading story (report-loading-story §1, ADR-316 to 318): five steps that show how a chart
 * is made, each drawn from the engine's chart. The globe turns to the birthplace; the sky draws round "you" and each
 * body runs on its own ring at its mean daily motion to its degree; the rings fold onto the chart and the lines
 * between planets draw, closest first; the birth time turns the sky under the horizon on the engine's Ascendant;
 * then the houses arrive in their six pairs while the report writes, and the chart holds still. With no birth time
 * there is no horizon, angle or house, steps 4 and 5 say why in one line, and the Moon is its day's arc (ADR-33).
 *
 * Pure: `frameAt` hands over every word for the grid's slots (ADR-351) and every mark's place on a square stage, so
 * `BuildStory` only draws, and the film and the reels can draw the same frame. Timing, words and geometry are the
 * locked artifact's player; motion takes the site's one easing.
 */
import { offsetAtBirth } from "@workspace/engine";
import { SIGN_ORDER, degreesMinutes } from "@/components/chart/wheel-geometry";
import { GRATICULE, orthographic, visiblePath } from "@/lib/globe";
import { HOUSES, PAIRS } from "@/lib/houses";
import { LAND_110M } from "@/lib/land-110m";
import type { Progress } from "@/lib/progress";
import { dayLine, ease } from "@/site/lib/sky";
import { PLANET_LABELS, type ChartData } from "@/types/chart";

export interface StoryInput {
  chart: ChartData;
  birth: {
    lat: number;
    lon: number;
    /** The birthplace as the reader picked it: "Lisbon, Portugal". */
    place: string;
    /** "YYYY-MM-DD" */
    date: string;
    /** "HH:MM" on the birthplace's clock; null when the reader gave none. */
    time: string | null;
    /** A time was given with a window: `time` is null, and the pair story says the time is rough, not missing. */
    rough?: boolean;
  };
}

/** When each step starts, in seconds: steps 1 to 4 take about 20 s inside the first pass; step 5 is the writing. */
export const STORY_STEPS_S = [0, 4.5, 9.5, 14.5, 20] as const;
/** Each house pair's time on screen; the six take about 43 s, slow enough to read (ADR-316). */
export const PAIR_S = 7;

const [, S2, S3, S4, S5] = STORY_STEPS_S;
const PAIRS_FROM = S5 + 1;
const PAIRS_END = PAIRS_FROM + PAIRS.length * PAIR_S;
/** From here nothing moves: the chart with its six pairs and their closing line. Reduced motion paints this frame. */
export const STORY_END_S = PAIRS_END + 0.6;

/** The square every mark is placed in; the component scales it into the grid's stage slot. */
export const STAGE = { size: 360, cx: 180, cy: 180 } as const;
const { cx: CX, cy: CY } = STAGE;
const GLOBE_R = 124;
const ZODIAC_OUT = 158;
const ZODIAC_IN = 138;
const HOUSES_IN = 116;
const CHART_R = 102;
/** A body that would touch one already on its ring steps this far inward (R-3.1). */
const CROWD_STEP = 13;
const CROWD_DEG = 7.5;

/**
 * The bodies the story draws, innermost ring first: the ten and Chiron, each only where the chart has it, so a chart
 * outside Chiron's table draws none (ADR-221). The nodes are points, not bodies, and stay out, as in the artifact.
 */
export const STORY_BODIES = [
  "moon", "mercury", "venus", "sun", "mars", "jupiter", "saturn", "chiron", "uranus", "neptune", "pluto",
] as const;
export type StoryBodyKey = (typeof STORY_BODIES)[number];

/** Mean daily motion along the zodiac as seen from Earth, in degrees: each body's speed while it runs to its degree. */
const MEAN_MOTION: Record<StoryBodyKey, number> = {
  moon: 13.176, mercury: 0.9856, venus: 0.9856, sun: 0.9856, mars: 0.524, jupiter: 0.0831, saturn: 0.0335,
  chiron: 0.0197, uranus: 0.0117, neptune: 0.006, pluto: 0.004,
};
/** The bodies start this many days before the birth and stop on it, as the date counts up. */
const RUN_DAYS = 120;
/** The globe starts this far east of the birthplace and near the equator, so every birthplace gets the same turn. */
const TURN_DEG = 80;
const START_LAT = 8;
/** The sky turns once a sidereal day: 360.9856° in 24 clock hours. */
const SIDEREAL_DEG_PER_MIN = 360.98564736629 / 1440;
const RAD = Math.PI / 180;

const DOOR_LINE = "Start reading now. We'll finish the last chapters while you read.";
// The report no longer opens itself at 100%, so the subtitle points at the button instead of saying it is still writing.
const READY_LINE = "Tap Start reading to open it.";

export interface StoryPoint {
  x: number;
  y: number;
}

export interface StoryLabel extends StoryPoint {
  text: string;
  anchor: "start" | "middle" | "end";
  /** Font size in stage units; (x, y) is the baseline's anchor. */
  size: number;
  opacity: number;
}

export interface StoryLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
  width: number;
  dashed: boolean;
}

export interface StoryGlobe {
  cx: number;
  cy: number;
  r: number;
  /** Where the globe faces: the birthplace once the turn ends. */
  lat0: number;
  lon0: number;
  opacity: number;
  /** SVG paths of the near side: the 30° grid, and Natural Earth's coastline while the globe is big enough to show it. */
  graticule: string;
  land: string;
  coastWidth: number;
}

export interface StoryZodiac {
  outer: number;
  inner: number;
  /** How much of the two circles has drawn, 0 to 1. */
  drawn: number;
  spokes: StoryLine[];
  /** The twelve sign names, in capitals as drawn. */
  signs: StoryLabel[];
}

export interface StoryOrbit {
  key: StoryBodyKey;
  r: number;
  opacity: number;
}

export interface StoryBody extends StoryPoint {
  key: StoryBodyKey;
  name: string;
  /** The longitude drawn, in degrees: the chart's own once the body has stopped. */
  lon: number;
  /** The ring it sits on, and its dot's radius. */
  ring: number;
  dot: number;
  opacity: number;
  label: StoryLabel | null;
}

export interface StoryAspect extends StoryLine {
  a: string;
  b: string;
  type: string;
  orb: number;
}

export interface StoryHouse {
  n: number;
  /** The house's word, in capitals as drawn. */
  word: string;
  /** The house's slice of the band inside the signs. */
  path: string;
  fillOpacity: number;
  edgeOpacity: number;
  /** One of the pair on screen now: drawn brighter, its word in paper. */
  now: boolean;
  label: StoryLabel;
}

export interface StoryAngle extends StoryPoint {
  key: "ascendant" | "midheaven";
  lon: number;
  /** The tick's outer end, along the angle (ADR-49). */
  tick: StoryPoint;
  opacity: number;
}

export interface StoryArc {
  path: string;
  ring: number;
  from: number;
  to: number;
  opacity: number;
}

/**
 * A line in the detail slot. `figure` is the running date or clock, `numbers` a line of degrees or coordinates
 * (both IBM Plex Mono), `place` the birthplace (Inter), `pair` the two words of a house pair and `closing` the
 * pairs' last line (Newsreader). Brass is the Ascendant once it locks: measured geometry (§9).
 */
export interface StoryDetail {
  text: string;
  kind: "figure" | "numbers" | "place" | "pair" | "closing";
  tone: "paper" | "dim" | "brass";
  opacity: number;
}

/**
 * One moment of the story. The stage draws in this order: globe, pin, you, zodiac, houses, pairLines, emptyBand,
 * horizon, veil, orbits, aspects, moonArc, bodies with their labels, angles. A mark that is not on screen is null or
 * missing from its list.
 */
export interface StoryFrame {
  t: number;
  step: 1 | 2 | 3 | 4 | 5;
  /** A birth time and a horizon: steps 4 and 5 draw the horizon, the angles and the houses. */
  known: boolean;
  counter: string;
  title: string;
  subtitle: string;
  /** The counter, title and subtitle fade in together at each step's start. */
  wordsOpacity: number;
  detail: StoryDetail[];
  /** Step 5's six pairs, filled once each has come. Empty before them and with no birth time. */
  pairDots: boolean[];
  /** With no birth time, step 5 shows the Did you know card (ADR-317): its opacity, 0 when it is not shown. */
  didYouKnow: number;
  /** The degree drawn at east, on the left: the Ascendant at `minute`, or 0° Aries with no birth time. */
  frame: number;
  /** The birth day's clock, in minutes from midnight, that the sky is turned to; null with no birth time. */
  minute: number | null;
  globe: StoryGlobe | null;
  /** The brass point on the birthplace. */
  pin: (StoryPoint & { opacity: number }) | null;
  /** The dot at the centre once the Earth has shrunk: you. Its opacity. */
  you: number;
  zodiac: StoryZodiac | null;
  houses: StoryHouse[];
  pairLines: StoryLine[];
  /** With no birth time, the band where the houses would be, left empty and dashed. */
  emptyBand: { r: number; width: number; opacity: number } | null;
  horizon: StoryLine | null;
  /** The half below the horizon, darkened. */
  veil: { path: string; opacity: number } | null;
  orbits: StoryOrbit[];
  aspects: StoryAspect[];
  /** With no birth time, the Moon from step 4 on: the arc it covered that day, in place of its dot. */
  moonArc: StoryArc | null;
  bodies: StoryBody[];
  angles: StoryAngle[];
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const seg = (t: number, from: number, to: number): number => clamp01((t - from) / (to - from));
/** Exact at both ends, so a run that has finished lands on its value and not a rounding away from it. */
const lerp = (a: number, b: number, p: number): number => a * (1 - p) + b * p;
const norm360 = (d: number): number => {
  const n = d % 360;
  return n < 0 ? n + 360 : n;
};
const wrap180 = (d: number): number => (d > 180 ? d - 360 : d <= -180 ? d + 360 : d);
const separation = (a: number, b: number): number => Math.min(norm360(a - b), norm360(b - a));
const signedArc = (from: number, to: number): number => {
  const d = norm360(to - from);
  return d > 180 ? d - 360 : d;
};
const pad2 = (n: number): string => String(n).padStart(2, "0");
const signOf = (lon: number): string => SIGN_ORDER[Math.floor(norm360(lon) / 30) % 12];
/** "12°07′ Aries" */
const position = (lon: number): string => `${degreesMinutes(norm360(lon) % 30)} ${signOf(lon)}`;

/** A point on the wheel framed on `frame`, the degree at east on the left; longitude runs counter-clockwise. */
function at(r: number, lon: number, frame: number): StoryPoint {
  const th = (180 + lon - frame) * RAD;
  return { x: CX + r * Math.cos(th), y: CY - r * Math.sin(th) };
}

const f1 = (n: number): string => n.toFixed(1);

function arcPath(r: number, from: number, to: number, frame: number): string {
  const a = at(r, from, frame);
  const b = at(r, to, frame);
  return `M${f1(a.x)} ${f1(a.y)}A${r} ${r} 0 ${norm360(to - from) > 180 ? 1 : 0} 0 ${f1(b.x)} ${f1(b.y)}`;
}

function bandPath(inner: number, outer: number, from: number, to: number, frame: number): string {
  const [a, b, c, d] = [at(outer, from, frame), at(outer, to, frame), at(inner, to, frame), at(inner, from, frame)];
  const large = norm360(to - from) > 180 ? 1 : 0;
  return `M${f1(a.x)} ${f1(a.y)}A${outer} ${outer} 0 ${large} 0 ${f1(b.x)} ${f1(b.y)}L${f1(c.x)} ${f1(c.y)}`
    + `A${inner} ${inner} 0 ${large} 1 ${f1(d.x)} ${f1(d.y)}Z`;
}

function lineOf(a: StoryPoint, b: StoryPoint, share: number, opacity: number, width = 1, dashed = false): StoryLine {
  return { x1: a.x, y1: a.y, x2: a.x + (b.x - a.x) * share, y2: a.y + (b.y - a.y) * share, opacity, width, dashed };
}

function minutesOf(time: string | null): number | null {
  const m = time ? /^(\d{1,2}):(\d{2})$/.exec(time) : null;
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2])];
  return h < 24 && min < 60 ? h * 60 + min : null;
}

const clockOf = (minute: number): string => `${pad2(Math.floor(minute / 60))}:${pad2(Math.floor(minute % 60))}`;

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(0);
  day.setUTCFullYear(y, m - 1, d + days);
  return day.toISOString().slice(0, 10);
}

/** "38.72° N · 9.14° W" */
function coordinates(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"} · ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? "E" : "W"}`;
}

/** The engine's mean obliquity of the ecliptic (Meeus 22.2): the tilt its Ascendant formula takes. */
function obliquity(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const noon = new Date(0);
  noon.setUTCFullYear(y, m - 1, d);
  noon.setUTCHours(12, 0, 0, 0);
  const T = (noon.getTime() - Date.UTC(2000, 0, 1, 12)) / 86_400_000 / 36_525;
  return 23.43929111 - (46.815 / 3600) * T - (0.00059 / 3600) * T * T + (0.001813 / 3600) * T * T * T;
}

/** The engine's Ascendant for a local sidereal time, a latitude and the obliquity (Meeus ch. 13). */
function ascendantFor(lst: number, lat: number, eps: number): number {
  const l = lst * RAD;
  const e = eps * RAD;
  return norm360(Math.atan2(Math.cos(l), -(Math.sin(l) * Math.cos(e) + Math.tan(lat * RAD) * Math.sin(e))) / RAD);
}

interface ClockChange {
  /** The first clock minute on the birth's own offset. */
  from: number;
  /** Minutes the clocks moved between midnight and that minute: 60 when they went forward. */
  shift: number;
}

/** Each answer costs several time-zone look-ups and the clock asks on every frame, so a birth's is worked out once. */
const changes = new Map<string, ClockChange>();

/**
 * Whether the birth day's clocks changed before the birth, as the engine reads the zone. A day without a change, or a
 * birth recorded with an offset and no zone, keeps one offset from midnight on.
 */
function clockChange(zone: string | undefined, date: string, birthMinute: number): ClockChange {
  if (!zone) return { from: 0, shift: 0 };
  const key = `${zone}|${date}|${birthMinute}`;
  const kept = changes.get(key);
  if (kept) return kept;
  let found: ClockChange = { from: 0, shift: 0 };
  // A zone missing from the browser's time-zone data throws; the story then keeps one offset rather than stop.
  try {
    const offset = (minute: number) => offsetAtBirth(zone, date, clockOf(minute));
    const atBirth = offset(birthMinute);
    const atMidnight = offset(0);
    if (atBirth !== atMidnight) {
      let [lo, hi] = [0, birthMinute];
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (offset(mid) === atBirth) hi = mid;
        else lo = mid;
      }
      found = { from: hi, shift: Math.round(60 * (atBirth - atMidnight)) };
    }
  } catch {
    found = { from: 0, shift: 0 };
  }
  if (changes.size > 64) changes.clear();
  changes.set(key, found);
  return found;
}

/**
 * The Ascendant at a minute of the birth day's clock, from midnight (0) to the birth: the engine's formula, turned
 * back from the chart's Midheaven at the sky's sidereal rate, so the run ends exactly on the chart's Ascendant and
 * agrees with the engine's own chart at every minute between. Null with no birth time or no horizon.
 */
export function ascendantAt(input: StoryInput, minute: number): number | null {
  const { chart, birth } = input;
  const birthMinute = minutesOf(birth.time);
  if (!chart.angles || birthMinute === null) return null;
  const asc = chart.angles.ascendant.absoluteDegree;
  if (minute >= birthMinute) return asc;
  const mc = chart.angles.midheaven.absoluteDegree;
  const eps = obliquity(birth.date);
  // tan(LST) = tan(MC)·cos(ε): the Midheaven gives the sidereal time at the birth.
  const lst = Math.atan2(Math.sin(mc * RAD) * Math.cos(eps * RAD), Math.cos(mc * RAD)) / RAD;
  // The chart's angles are rounded to the hundredth; the day's run carries that rounding so it ends on the chart.
  const fix = signedArc(ascendantFor(lst, birth.lat, eps), asc);
  const m = Math.max(0, minute);
  const change = clockChange(chart.timezone, birth.date, birthMinute);
  const before = birthMinute - m - (m < change.from ? change.shift : 0);
  return norm360(ascendantFor(lst - SIDEREAL_DEG_PER_MIN * before, birth.lat, eps) + fix);
}

/** Crowding moves a body inward, never around (R-3.1): one that would touch a body already on its ring steps in. */
function chartRadii(pos: Partial<Record<StoryBodyKey, number>>): Partial<Record<StoryBodyKey, number>> {
  const keys = (Object.keys(pos) as StoryBodyKey[]).sort((a, b) => pos[a]! - pos[b]!);
  const placed: { r: number; lon: number }[] = [];
  const radii: Partial<Record<StoryBodyKey, number>> = {};
  for (const key of keys) {
    let r = CHART_R;
    while (placed.some((p) => p.r === r && separation(p.lon, pos[key]!) < CROWD_DEG)) r -= CROWD_STEP;
    radii[key] = Math.max(r, 8);
    placed.push({ r, lon: pos[key]! });
  }
  return radii;
}

/** A label for each body, beside it on the side away from the centre, nudged down so two never touch. */
function labelRows(points: Partial<Record<StoryBodyKey, StoryPoint>>, keys: readonly StoryBodyKey[]): Partial<Record<StoryBodyKey, number>> {
  const rows: Partial<Record<StoryBodyKey, number>> = {};
  for (const left of [true, false]) {
    const side = keys.filter((k) => points[k]!.x < CX === left).sort((a, b) => points[a]!.y - points[b]!.y);
    let prevY = -Infinity;
    let prevX = 0;
    for (const k of side) {
      const p = points[k]!;
      let y = p.y + 3;
      if (y - prevY < 9 && Math.abs(p.x - prevX) < 40) y = prevY + 9;
      rows[k] = y;
      prevY = y;
      prevX = p.x;
    }
  }
  return rows;
}

export function frameAt(t: number, input: StoryInput, progress: Progress): StoryFrame {
  const time = Number.isNaN(t) ? 0 : Math.max(0, t);
  const { chart, birth } = input;
  const birthMinute = minutesOf(birth.time);
  const known = chart.angles !== undefined && birthMinute !== null;
  const angles = known ? chart.angles : undefined;
  const keys = STORY_BODIES.filter((b) => chart.planets[b] !== undefined);
  const pos: Partial<Record<StoryBodyKey, number>> = Object.fromEntries(keys.map((b) => [b, chart.planets[b].absoluteDegree]));
  // A conjunction's two bodies share a spot, so it has no line to draw; the closest pair named is the closest line.
  // With no birth time the Moon is a stretch, not a point, so a line to it, or an orb named for it, would claim a
  // time we were not given (ADR-33).
  const lines = chart.aspects
    .filter((a) => a.type !== "conjunction" && pos[a.planet1 as StoryBodyKey] !== undefined && pos[a.planet2 as StoryBodyKey] !== undefined)
    .filter((a) => known || (a.planet1 !== "moon" && a.planet2 !== "moon"))
    .sort((a, b) => a.orb - b.orb);
  const op = (from: number) => seg(time, from, from + 0.5);

  // The sky stands at midnight's until the clock runs it to the birth; with no birth time 0° Aries stays at east.
  const clockRun = ease(seg(time, S4 + 0.8, S4 + 4.4));
  const minute = known && birthMinute !== null ? clockRun * birthMinute : null;
  const frame = minute !== null ? ascendantAt(input, minute) ?? 0 : 0;

  // Step 1: the globe turns to the birthplace and the brass point lands; step 2 shrinks it to "you".
  const shrink = ease(seg(time, S2, S2 + 1.6));
  let globe: StoryGlobe | null = null;
  let pin: StoryFrame["pin"] = null;
  if (time < S2 + 1.7) {
    const turn = ease(seg(time, 0.2, 3.4));
    const r = lerp(GLOBE_R, 5, shrink);
    const lat0 = lerp(START_LAT, birth.lat, turn);
    const lon0 = wrap180(birth.lon + TURN_DEG * (1 - turn));
    const project = orthographic({ lat0, lon0, r });
    globe = {
      cx: CX, cy: CY, r, lat0, lon0,
      opacity: seg(time, 0, 0.6) * (1 - seg(time, S2 + 1.2, S2 + 1.7)),
      graticule: visiblePath(project, GRATICULE, CX, CY),
      land: r > 20 ? visiblePath(project, LAND_110M, CX, CY) : "",
      coastWidth: r > 60 ? 0.9 : 0.6,
    };
    const pinIn = seg(time, 2.6, 3.2) * (1 - shrink);
    if (pinIn > 0) {
      const p = project(birth.lat, birth.lon);
      pin = { x: CX + p.x, y: CY + p.y, opacity: pinIn };
    }
  }
  const you = seg(time, S2 + 1.2, S2 + 1.8);

  const drawn = ease(seg(time, S2 + 1, S2 + 2.8));
  let zodiac: StoryZodiac | null = null;
  if (drawn > 0) {
    const named = seg(time, S2 + 2.2, S2 + 3.2);
    zodiac = {
      outer: ZODIAC_OUT,
      inner: ZODIAC_IN,
      drawn,
      spokes: SIGN_ORDER.map((_, i) => lineOf(at(ZODIAC_IN, i * 30, frame), at(ZODIAC_OUT, i * 30, frame), 1, named)),
      signs: SIGN_ORDER.map((sign, i) => {
        const p = at((ZODIAC_OUT + ZODIAC_IN) / 2, i * 30 + 15, frame);
        return { text: sign.toUpperCase(), x: p.x, y: p.y + 3, anchor: "middle", size: 6.8, opacity: named };
      }),
    };
  }

  // Step 5: the houses arrive with their opposites, one pair at a time, and the pair's line draws across.
  const sincePairs = time - PAIRS_FROM;
  const current = Math.min(PAIRS.length - 1, Math.max(0, Math.floor(sincePairs / PAIR_S)));
  const allPairs = sincePairs >= PAIRS.length * PAIR_S;
  const houses: StoryHouse[] = [];
  const pairLines: StoryLine[] = [];
  if (angles && sincePairs > 0) {
    const first = Math.floor(norm360(angles.ascendant.absoluteDegree) / 30);
    HOUSES.forEach((house, h) => {
      const pair = h % PAIRS.length;
      const on = ease(clamp01((sincePairs - pair * PAIR_S) / 1.2));
      if (on <= 0) return;
      const now = pair === current && !allPairs;
      const a = ((first + h) % 12) * 30;
      const p = at((HOUSES_IN + ZODIAC_IN) / 2, a + 15, frame);
      houses.push({
        n: house.n,
        word: house.word.toUpperCase(),
        path: bandPath(HOUSES_IN, ZODIAC_IN, a + 0.6, a + 29.4, frame),
        fillOpacity: (now ? 0.32 : 0.1) * on,
        edgeOpacity: on,
        now,
        label: { text: house.word.toUpperCase(), x: p.x, y: p.y + 3, anchor: "middle", size: 6.6, opacity: on },
      });
    });
    PAIRS.forEach(([house], i) => {
      const on = ease(clamp01((sincePairs - i * PAIR_S - 0.8) / 1.4));
      if (on <= 0) return;
      const now = i === current && !allPairs;
      const a = ((first + house - 1) % 12) * 30 + 15;
      pairLines.push(lineOf(at(HOUSES_IN - 2, a, frame), at(HOUSES_IN - 2, a + 180, frame), on, now || allPairs ? 0.85 : 0.3, now ? 1.5 : 1));
    });
  }
  const emptyBand = !known && time > S5
    ? { r: (HOUSES_IN + ZODIAC_IN) / 2, width: ZODIAC_IN - HOUSES_IN, opacity: 0.35 * seg(time, S5, S5 + 1) }
    : null;

  // Step 4: the horizon draws, the clock turns the sky under it, the angles lock in brass and the half below darkens.
  const horizonIn = ease(seg(time, S4, S4 + 0.9));
  const horizon = known && horizonIn > 0
    ? lineOf({ x: CX - (ZODIAC_OUT + 12) * horizonIn, y: CY }, { x: CX + (ZODIAC_OUT + 12) * horizonIn, y: CY }, 1, 0.55)
    : null;
  const veilIn = seg(time, S4 + 4.4, S4 + 5.2);
  const veil = known && veilIn > 0
    ? { path: `M${CX - ZODIAC_OUT} ${CY}A${ZODIAC_OUT} ${ZODIAC_OUT} 0 0 0 ${CX + ZODIAC_OUT} ${CY}Z`, opacity: 0.45 * veilIn }
    : null;

  // Steps 2 and 3: each body runs on its own ring to its degree as the date counts up, then the rings fold onto the chart.
  const bodyIn = seg(time, S2 + 1.6, S2 + 2.2);
  const settle = ease(seg(time, S2 + 1.6, S3 - 0.2));
  const fold = ease(seg(time, S3, S3 + 1.6));
  const daysBack = RUN_DAYS * (1 - settle);
  const radii = chartRadii(pos);
  const moonBand = chart.planets.moon.band;
  const moonAsArc = !known && time > S4 && moonBand !== undefined;
  const orbits: StoryOrbit[] = [];
  const aspects: StoryAspect[] = [];
  const bodies: StoryBody[] = [];
  let moonArc: StoryArc | null = null;
  if (bodyIn > 0) {
    const points: Partial<Record<StoryBodyKey, StoryPoint>> = {};
    const lons: Partial<Record<StoryBodyKey, number>> = {};
    const rings: Partial<Record<StoryBodyKey, number>> = {};
    for (const b of keys) {
      const orbit = 22 + STORY_BODIES.indexOf(b) * 7.6;
      lons[b] = daysBack > 0 ? norm360(pos[b]! - MEAN_MOTION[b] * daysBack) : pos[b]!;
      rings[b] = lerp(orbit, radii[b]!, fold);
      points[b] = at(rings[b]!, lons[b]!, frame);
      if (fold < 1) orbits.push({ key: b, r: orbit, opacity: bodyIn * (1 - fold) });
    }
    const linesIn = seg(time, S3 + 2, S4 - 0.3);
    if (linesIn > 0) {
      lines.forEach((a, i) => {
        const share = clamp01(linesIn * lines.length - i);
        if (share <= 0) return;
        const hard = a.type === "square" || a.type === "opposition";
        const line = lineOf(points[a.planet1 as StoryBodyKey]!, points[a.planet2 as StoryBodyKey]!, share, hard ? 0.5 : 0.32, 1, !hard);
        aspects.push({ ...line, a: a.planet1, b: a.planet2, type: a.type, orb: a.orb });
      });
    }
    if (moonAsArc && moonBand) {
      moonArc = {
        path: arcPath(radii.moon!, moonBand.fromDegree, moonBand.toDegree, frame),
        ring: radii.moon!,
        from: moonBand.fromDegree,
        to: moonBand.toDegree,
        opacity: 0.55 * seg(time, S4, S4 + 1),
      };
    }
    const dots = keys.filter((b) => !(moonAsArc && b === "moon"));
    const labelsIn = seg(time, S3 + 1.2, S3 + 2);
    const rows = labelsIn > 0 ? labelRows(points, dots) : {};
    for (const b of dots) {
      const p = points[b]!;
      const left = p.x < CX;
      const name = PLANET_LABELS[b];
      bodies.push({
        key: b, name, lon: lons[b]!, x: p.x, y: p.y, ring: rings[b]!,
        dot: b === "sun" || b === "moon" ? 4.2 : 3.2,
        opacity: bodyIn,
        label: labelsIn > 0
          ? { text: name, x: p.x + (left ? -7 : 7), y: rows[b]!, anchor: left ? "end" : "start", size: 7.6, opacity: labelsIn }
          : null,
      });
    }
  }

  const locked = seg(time, S4 + 4.3, S4 + 5);
  const angleMarks: StoryAngle[] = angles && locked > 0
    ? ([["ascendant", angles.ascendant.absoluteDegree], ["midheaven", angles.midheaven.absoluteDegree]] as const).map(([key, lon]) => ({
      key, lon, ...at(ZODIAC_OUT, lon, frame), tick: at(ZODIAC_OUT + 9, lon, frame), opacity: locked,
    }))
    : [];

  // The words: one title, one plain sentence and the step's numbers, each part in its slot of the grid.
  const step: StoryFrame["step"] = time < S2 ? 1 : time < S3 ? 2 : time < S4 ? 3 : time < S5 ? 4 : 5;
  let title: string;
  let subtitle: string;
  const detail: StoryDetail[] = [];
  let pairDots: boolean[] = [];
  let didYouKnow = 0;
  if (step === 1) {
    title = "Where you were born";
    subtitle = "Your place puts you on the Earth.";
    const shown = seg(time, 2.6, 3.2);
    detail.push({ text: coordinates(birth.lat, birth.lon), kind: "numbers", tone: "paper", opacity: shown });
    if (birth.place) detail.push({ text: birth.place, kind: "place", tone: "dim", opacity: shown });
  } else if (step === 2) {
    title = "The sky on your birth day";
    subtitle = "Each planet runs on its own path. We stop them on your birth date.";
    detail.push({ text: dayLine(addDays(birth.date, -Math.round(daysBack))), kind: "figure", tone: "paper", opacity: seg(time, S2 + 1.4, S2 + 2) });
  } else if (step === 3) {
    const closest = time > S3 + 2 ? lines[0] : undefined;
    if (closest) {
      title = "How the planets face each other";
      subtitle = "Lines join planets at set angles. The closest pair:";
      const text = `${PLANET_LABELS[closest.planet1]} ${closest.type} ${PLANET_LABELS[closest.planet2]} · ${closest.orb.toFixed(1)}° from exact`;
      detail.push({ text, kind: "numbers", tone: "paper", opacity: op(S3 + 2.2) });
    } else {
      title = "Where each planet stood";
      subtitle = "Each one lands on its exact degree.";
      const moon = known || !moonBand
        ? position(chart.planets.moon.absoluteDegree)
        : `somewhere in a ${Math.round(norm360(moonBand.toDegree - moonBand.fromDegree))}° stretch`;
      detail.push({ text: `Sun ${position(chart.planets.sun.absoluteDegree)} · Moon ${moon}`, kind: "numbers", tone: "paper", opacity: op(S3 + 1.2) });
    }
  } else if (step === 4) {
    if (known && minute !== null) {
      title = "Your birth time sets the horizon";
      subtitle = time < S4 + 4.6
        ? "The Earth turns once a day. The time says how far it had turned."
        : "Above the line is the sky you could see. Below it is under the Earth.";
      detail.push({ text: clockOf(minute), kind: "figure", tone: "paper", opacity: op(S4 + 0.4) });
      detail.push({ text: `Rising: ${position(frame)}`, kind: "numbers", tone: locked > 0 ? "brass" : "dim", opacity: op(S4 + 0.8) });
    } else {
      title = "No birth time, so no horizon";
      subtitle = `The Moon moves ${Math.round(Math.abs(chart.planets.moon.speed))}° in a day. We show the stretch it could be in.`;
      if (moonBand) {
        const text = `Moon ${position(moonBand.fromDegree)} to ${position(moonBand.toDegree)}`;
        detail.push({ text, kind: "numbers", tone: "paper", opacity: op(S4 + 0.6) });
      }
    }
  } else if (known) {
    // A failed report is not writing, so step 5 stops saying it is; the overlay shows the failure in the detail slot.
    title = "Your houses, two at a time";
    subtitle = progress.complete ? READY_LINE : progress.door ? DOOR_LINE : progress.failed ? "Each house faces its opposite." : "Each house faces its opposite. Your report writes meanwhile.";
    if (sincePairs > 0) {
      if (allPairs) {
        detail.push({ text: "Six pairs, and you know all twelve.", kind: "closing", tone: "paper", opacity: clamp01((sincePairs - PAIRS.length * PAIR_S) / 0.6) });
      } else {
        const [n, side, otherSide] = PAIRS[current];
        const [mine, opposite] = [HOUSES[n - 1], HOUSES[n + 5]];
        const into = sincePairs - current * PAIR_S;
        const shown = clamp01(Math.min(into / 0.6, (PAIR_S - into) / 0.4));
        detail.push({ text: `${n} ${mine.object} · ${mine.word} ⟷ ${opposite.word} · ${opposite.object} ${opposite.n}`, kind: "numbers", tone: "dim", opacity: shown });
        detail.push({ text: `${side} · ${otherSide}`, kind: "pair", tone: "paper", opacity: shown });
      }
      pairDots = PAIRS.map((_, i) => allPairs || i <= current);
    }
  } else if (progress.failed) {
    title = "No birth time, so no houses";
    subtitle = "";
  } else {
    title = "Now writing your report";
    subtitle = progress.complete ? READY_LINE : progress.door ? DOOR_LINE : "No birth time, so no houses. While it writes, a few things worth knowing.";
    didYouKnow = op(S5 + 0.6);
  }

  return {
    t: time,
    step,
    known,
    counter: `Step ${step} of ${STORY_STEPS_S.length}`,
    title,
    subtitle,
    wordsOpacity: op(STORY_STEPS_S[step - 1]),
    detail,
    pairDots,
    didYouKnow,
    frame,
    minute,
    globe,
    pin,
    you,
    zodiac,
    houses,
    pairLines,
    emptyBand,
    horizon,
    veil,
    orbits,
    aspects,
    moonArc,
    bodies,
    angles: angleMarks,
  };
}

/** One step as the still list shows it under reduced motion: its words once settled, and its numbers. */
export interface StoryStep {
  counter: string;
  title: string;
  subtitle: string;
  detail: string[];
}

/** The five steps, each as its last moment reads, so the still list and the moving story never say different things. */
export function storySteps(input: StoryInput, progress: Progress): StoryStep[] {
  const settled = [...STORY_STEPS_S.slice(1).map((s) => s - 0.05), STORY_END_S];
  return settled.map((s) => {
    const f = frameAt(s, input, progress);
    return { counter: f.counter, title: f.title, subtitle: f.subtitle, detail: f.detail.filter((d) => d.opacity > 0).map((d) => d.text) };
  });
}
