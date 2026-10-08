/**
 * The Compatibility report's loading story, B then C (compatibility-loading-story, ADR-347 to 351), pure. The
 * Personal story's globe turns to both birthplaces and the Earth shrinks; the first birthday's sky settles on its
 * person's plate and the second fades in on its own; the two charts stand on one horizon; then the twelve houses
 * light on both plates at once while the report writes, and the screen holds. A frame carries its step, the grid's
 * words and every mark's place in the stage's units, so the screen only draws. Facts only: places, dates, signs,
 * houses with their word and object, never what they mean (ADR-347). Each chart keeps its own plate and nothing
 * joins the two: a house lights on both plates at the same moment instead (ADR-97, 349).
 */
import type { StoryInput } from "@/lib/build-story";
import { GRATICULE, orthographic, visiblePath, type LonLat, type Ring } from "@/lib/globe";
import { HOUSES, type HouseObjectId } from "@/lib/houses";
import { LAND_110M } from "@/lib/land-110m";
import type { Progress } from "@/lib/progress";
import { first } from "@/lib/share-card";
import { triadRowsOf, triadText } from "@/lib/triad-row";
import { NOT_DRAWN } from "@/components/report/pair-hero-layout";
import { SIGN_ORDER, norm360 } from "@/components/chart/wheel-geometry";
// The site's ease-out, as the Personal story moves: the artifact's moves start quick and settle.
import { ease } from "@/site/lib/sky";
import { PLANET_LABELS, type ChartData, type ChartPlanet } from "@/types/chart";

export interface PairInput {
  /** On the left. */
  a: StoryInput;
  b: StoryInput;
  /** `a`'s name first; each person is called by the first word of theirs. */
  names: readonly [string, string];
}

/** Where each step starts, in seconds: the spec's step table, third pass. The last step holds. */
export const PAIR_STEPS_S = [0, 13, 17, 24, 30, 96] as const;

/** Each house stays lit this long, so the twelve fill 30 to 96 s. */
export const HOUSE_S = 5.5;

/** How long the writing step takes to settle: the last house fades and its words come in. */
const SETTLE_S = 1.2;

/** From here on no frame changes but for the progress's words: reduced motion draws this one. */
export const PAIR_STILL_S = PAIR_STEPS_S[5] + SETTLE_S;

export type PairStepId = "places" | "first-sky" | "second-sky" | "side-by-side" | "houses" | "writing";

const STEP_IDS: readonly PairStepId[] = ["places", "first-sky", "second-sky", "side-by-side", "houses", "writing"];

/**
 * The artifact draws the story in a 360 × 740 phone frame and a 1000 × 600 desktop one; these are their stage
 * slots (24 to 66% of the height). The desktop view spreads the plates along a wide horizon, so it is a layout of
 * its own, not the phone's scaled.
 */
export type PairView = "phone" | "desktop";

export const PAIR_STAGE: Readonly<Record<PairView, { w: number; h: number }>> = {
  phone: { w: 360, h: 310.8 },
  desktop: { w: 1000, h: 252 },
};

/** The view whose box fits a stage of this shape: wider than twice its height reads the desktop layout. */
export function pairView(width: number, height: number): PairView {
  return height > 0 && width / height >= 2 ? "desktop" : "phone";
}

/** Text in the stage, in the stage's units. */
export interface PairText {
  text: string;
  x: number;
  y: number;
  size: number;
  font: "serif" | "sans" | "mono";
  tone: "paper" | "dim" | "brass";
  anchor: "start" | "middle" | "end";
  opacity: number;
}

/**
 * The globe of step 1, as the Personal story draws it: a ground disc with a line-coloured edge, the grid faint, the
 * coast in dim, the route and the places in brass. The grid, coast and route are clipped to the disc.
 */
export interface PairGlobe {
  cx: number;
  cy: number;
  r: number;
  opacity: number;
  grid: string;
  /** Empty once the Earth is too small for a coast. */
  land: string;
  landWidth: number;
  /** The dashed great circle from the first birthplace to the second. */
  route: { d: string; opacity: number } | null;
  /** The birthplaces' brass marks; their names are in the stage's texts. */
  places: { x: number; y: number; opacity: number }[];
}

/** One sign's stretch of a plate's band, with the word it shows. */
export interface PairSector {
  /** 0 Aries to 11 Pisces. */
  sign: number;
  d: string;
  /** The house being read: filled light indigo, its word in paper. A quiet one is indigo, its word light indigo. */
  lit: boolean;
  fillOpacity: number;
  /** The word sits here, turned along the band. */
  x: number;
  y: number;
  rotate: number;
  size: number;
  /** The sign, the house's word, or both while the plate turns to its rising sign and one gives way to the other. */
  words: { text: string; opacity: number }[];
}

export type PairBody =
  /** `big` is the Sun or the Moon, in paper; the rest are dim. */
  | { kind: "dot"; key: string; x: number; y: number; r: number; big: boolean; opacity: number }
  /** The Moon over a birth time that is not known to the minute: the arc it covered that day, in paper. */
  | { kind: "arc"; key: string; d: string; width: number; opacity: number };

/**
 * One person's chart, never another's (ADR-97): a ground disc, the band, brass ticks, a brass outer ring and a
 * line-coloured inner one. Draw the bases of plates under the horizon, the horizon, the bases of plates over it,
 * then every plate's bodies and marker.
 */
export interface PairPlate {
  /** 0 for `input.a`, 1 for `input.b`. */
  person: 0 | 1;
  cx: number;
  cy: number;
  r: number;
  /** The band's inner edge. */
  inner: number;
  opacity: number;
  /** The disc's fill: see-through once its horizon is drawn, opaque on a chart without one. */
  fillOpacity: number;
  /** A chart with no birth time has no horizon: its plate sits over the line, so the line never seems to cross it. */
  overHorizon: boolean;
  sectors: PairSector[];
  /** The sign boundaries, brass. */
  ticks: { x1: number; y1: number; x2: number; y2: number }[];
  /** The half below the horizon, darkened; null on a chart without one. */
  shade: { d: string; opacity: number } | null;
  bodies: PairBody[];
  /** The Ascendant's brass marker on the east, at the left; null on a chart without one. */
  marker: { x: number; y: number; r: number; dot: number; tail: number; stroke: number; opacity: number } | null;
}

export interface PairStage {
  w: number;
  h: number;
  globe: PairGlobe | null;
  plates: PairPlate[];
  /**
   * One horizon through both plates (ADR-113): a dotted brass line drawn out from the middle, fading at the stage's
   * ends, over a violet glow of radius `glow`. None when neither chart has a birth time.
   */
  horizon: { y: number; x1: number; x2: number; glow: number; width: number } | null;
  /** The pair's point on the horizon, between the plates. */
  centre: { x: number; y: number; r: number; dot: number; opacity: number } | null;
  /** Place names on the globe; names, birth dates and the Sun, Moon and Rising rows under the plates. */
  texts: PairText[];
}

export interface PairLine {
  text: string;
  /** place: a birthplace, its date and the person; distance: brass; date: the sky's date as it counts; when: under it. */
  role: "place" | "distance" | "date" | "when";
  opacity: number;
}

/** Each line keeps its row whatever its opacity, so a line fading in never moves the one above it. */
export interface PairLines {
  kind: "lines";
  align: "center";
  lines: PairLine[];
}

/** The house being read on both plates (C), or the sign when a birth time is missing. */
export interface PairHouse {
  kind: "house";
  align: "start" | "center";
  /** 1 to 12; null when the story reads signs. */
  house: number | null;
  object: HouseObjectId | null;
  /** "House 4 · Family tree", or "Sign 2 of 12". */
  label: string;
  /** The house's word, or the sign. */
  word: string;
  /** Each person's sign and planets in it: "Mira: Cancer · no planets". */
  rows: readonly [string, string];
  opacity: number;
  /** Twelve, one a house; `filled` once read, `reached` up to the one lit. */
  dots: { filled: boolean; reached: boolean }[];
  dotsOpacity: number;
}

export type PairDetail = PairLines | PairHouse;

export interface PairFrame {
  /** Index into `PAIR_STEPS_S`. */
  step: number;
  id: PairStepId;
  /**
   * The counter, title and subtitle. In a step's first 0.4 s they are still the last step's, fading out, so two
   * titles never sit on each other; then the new ones fade in.
   */
  caption: { counter: string; title: string; subtitle: string | null; opacity: number };
  detail: PairDetail | null;
  stage: PairStage;
}

const D2R = Math.PI / 180;
const clamp = (x: number, a = 0, b = 1): number => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number): number => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, p: number): number => a + (b - a) * p;
/** The short way round, so a plate or the globe never turns further than it must. */
const lerpAngle = (a: number, b: number, p: number): number => {
  let d = norm360(b - a);
  if (d > 180) d -= 360;
  return norm360(a + d * p);
};
const r2 = (n: number): number => Math.round(n * 100) / 100;
const r3 = (n: number): number => Math.round(n * 1000) / 1000;
const f1 = (n: number): string => n.toFixed(1);

/** The ten bodies the plates draw, as /compatibility's plates and the pair's house rows list them. */
const TEN = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;
type Body = (typeof TEN)[number];

/**
 * Mean daily motion in degrees, for the first sky's run on to the birthday as the Personal story runs its own: only
 * the run is drawn on these averages, and every body stops on the engine's degree.
 */
const MEAN: Record<Body, number> = {
  sun: 0.9856, moon: 13.176, mercury: 0.9856, venus: 0.9856, mars: 0.524,
  jupiter: 0.0831, saturn: 0.0335, uranus: 0.0117, neptune: 0.006, pluto: 0.004,
};

/** How far back the first sky starts, in days, before its bodies settle on the birthday. */
const RUN_DAYS = 120;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

interface Layout {
  w: number;
  h: number;
  /** A plate's radius beside the other. */
  R: number;
  /** The globe's radius, and the first sky's alone at the centre. */
  RC: number;
  cx: readonly [number, number];
  cy: number;
  /** The baseline of the names under the plates. */
  names: number;
  /** The band's words grow by this on the wide view. */
  boost: number;
  /** Text under the plates scales by this. */
  sz: number;
  placeSize: number;
  align: "start" | "center";
}

/** `pad` is the space over the plates and `gap` the space between a plate and its name. */
function layout(view: PairView, o: Omit<Layout, "w" | "h" | "cy" | "names"> & { pad: number; gap: number }): Layout {
  const { pad, gap, ...rest } = o;
  return { ...rest, ...PAIR_STAGE[view], cy: pad + o.R, names: pad + 2 * o.R + gap };
}

const LAYOUTS: Record<PairView, Layout> = {
  phone: layout("phone", { R: 78, RC: 128, pad: 10, gap: 22, cx: [90, 270], boost: 1, sz: 1, placeSize: 11, align: "start" }),
  desktop: layout("desktop", { R: 88, RC: 112, pad: 6, gap: 20, cx: [300, 700], boost: 1.3, sz: 1.1, placeSize: 13, align: "center" }),
};

type Look = Pick<PairText, "font" | "tone">;

function textAt(text: string, x: number, y: number, size: number, look: Look, opacity: number, anchor: PairText["anchor"] = "middle"): PairText {
  return { text, x: r2(x), y: r2(y), size: r2(size), ...look, anchor, opacity: r3(opacity) };
}

const PLACE: Look = { font: "sans", tone: "paper" };
const NAME: Look = { font: "serif", tone: "paper" };
const DATE: Look = { font: "mono", tone: "dim" };

interface Day {
  y: number;
  m: number;
  d: number;
}

const leap = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysIn = (y: number, m: number): number => (m === 2 ? (leap(y) ? 29 : 28) : m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31);

/** A real calendar date, or null: "1991-02-30" is refused, never read as 2 March (R16-05). */
function dayOf(iso: string): Day | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const day = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  return day.m >= 1 && day.m <= 12 && day.d >= 1 && day.d <= daysIn(day.y, day.m) ? day : null;
}

const compareDays = (p: Day, q: Day): number => p.y - q.y || p.m - q.m || p.d - q.d;

/** The great-circle distance between two birthplaces, in whole kilometres. */
export function kmApart(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const h = Math.sin(((b.lat - a.lat) * D2R) / 2) ** 2
    + Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.sin(((b.lon - a.lon) * D2R) / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(clamp(h))));
}

/**
 * How much later the second-born was born, in calendar years, months and days between two real "YYYY-MM-DD"
 * dates, in either order. A month counted from a day the later month lacks ends on that month's last day, so
 * 31 January to 28 February is one month. A date the calendar has no such day for throws.
 */
export function bornLater(a: string, b: string): { years: number; months: number; days: number } {
  const p = dayOf(a);
  const q = dayOf(b);
  if (!p || !q) throw new RangeError("bornLater takes two real dates as YYYY-MM-DD");
  const [from, to] = compareDays(p, q) <= 0 ? [p, q] : [q, p];
  let months = (to.y - from.y) * 12 + (to.m - from.m);
  let days = to.d - Math.min(from.d, daysIn(to.y, to.m));
  if (days < 0) {
    months -= 1;
    const y = to.m === 1 ? to.y - 1 : to.y;
    const m = to.m === 1 ? 12 : to.m - 1;
    days = daysIn(y, m) - Math.min(from.d, daysIn(y, m)) + to.d;
  }
  return { years: Math.floor(months / 12), months: months % 12, days };
}

const listOf = (items: readonly string[]): string =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** "1 year, 5 months and 12 days"; null on the same day. */
function gapWords(gap: { years: number; months: number; days: number }): string | null {
  const parts = ([[gap.years, "year"], [gap.months, "month"], [gap.days, "day"]] as const)
    .filter(([n]) => n > 0)
    .map(([n, unit]) => `${n} ${unit}${n > 1 ? "s" : ""}`);
  return parts.length ? listOf(parts) : null;
}

const longDate = (day: Day): string => `${day.d} ${MONTHS[day.m - 1]} ${day.y}`;

function daysBefore(day: Day, n: number): Day {
  let { y, m, d } = day;
  for (let i = 0; i < n; i++) {
    if (d > 1) {
      d -= 1;
      continue;
    }
    if (m > 1) m -= 1;
    else {
      m = 12;
      y -= 1;
    }
    d = daysIn(y, m);
  }
  return { y, m, d };
}

const thousands = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

interface Person {
  name: string;
  /** The place's first part, "Lisbon" of "Lisbon, Portugal", so it fits beside its point on the globe and in one line under it. */
  place: string;
  date: string;
  day: Day | null;
  time: string | null;
  /** The time came with a window; without a time, the story calls it rough instead of missing (MB-235). */
  rough: boolean;
  lat: number;
  lon: number;
  chart: ChartData;
  /** The Ascendant's longitude; null without a birth time (ADR-34). */
  asc: number | null;
  /** The sign of the 1st house. */
  ascSign: number;
}

interface Reading {
  house: number | null;
  object: HouseObjectId | null;
  label: string;
  word: string;
  /** The sign lit on each plate. */
  signs: readonly [number, number];
  rows: readonly [string, string];
}

interface Pair {
  people: readonly [Person, Person];
  /** Whose birthday came first: their sky draws first, on their own plate. */
  early: 0 | 1;
  km: number;
  gap: string | null;
  /** Some chart has no horizon, so the story reads signs, not houses. */
  blind: boolean;
  readings: Reading[];
  readouts: readonly [{ text: string; brass: boolean }[], { text: string; brass: boolean }[]];
  from: { lat: number; lon: number };
  to: { lat: number; lon: number };
}

const signOfLon = (lon: number): number => Math.floor(norm360(lon) / 30);

function signOf(p: ChartPlanet): number {
  const i = SIGN_ORDER.indexOf(p.sign as (typeof SIGN_ORDER)[number]);
  return i >= 0 ? i : signOfLon(p.absoluteDegree);
}

/** A body whose day's band runs over two signs has no one sign or house to be listed in (ADR-33). */
const unsure = (p: ChartPlanet): boolean => !!p.band && signOfLon(p.band.fromDegree) !== signOfLon(p.band.toDegree);

function bodiesWhere(chart: ChartData, keep: (p: ChartPlanet) => boolean): string {
  const names = TEN.flatMap((key) => {
    const p = chart.planets[key];
    return p && !unsure(p) && keep(p) ? [PLANET_LABELS[key] ?? key] : [];
  });
  return names.length ? listOf(names) : "no planets";
}

function minutesOf(time: string | null): number {
  const m = time ? /^(\d{1,2}):(\d{2})/.exec(time) : null;
  // The app keeps an unknown birth time at noon.
  return m ? Number(m[1]) * 60 + Number(m[2]) : 12 * 60;
}

function personOf(input: StoryInput, name: string): Person {
  const asc = input.chart.angles?.ascendant ?? null;
  const ascIndex = asc ? SIGN_ORDER.indexOf(asc.sign as (typeof SIGN_ORDER)[number]) : -1;
  return {
    name,
    place: input.birth.place.split(",")[0].trim() || input.birth.place.trim(),
    date: input.birth.date,
    day: dayOf(input.birth.date),
    time: input.birth.time,
    rough: input.birth.rough === true,
    lat: input.birth.lat,
    lon: input.birth.lon,
    chart: input.chart,
    asc: asc ? asc.absoluteDegree : null,
    ascSign: asc ? (ascIndex >= 0 ? ascIndex : signOfLon(asc.absoluteDegree)) : 0,
  };
}

function readPair(input: PairInput): Pair {
  const short = input.names.map((n) => first(n)) as [string, string];
  // Two people of one first name are told apart by their whole names.
  const names = short[0] === short[1] ? input.names.map((n) => n.trim()) : short;
  const people = [personOf(input.a, names[0]), personOf(input.b, names[1])] as const;
  const [A, B] = people;

  let early: 0 | 1 = 0;
  let gap: string | null = null;
  if (A.day && B.day) {
    const c = compareDays(A.day, B.day);
    early = c > 0 || (c === 0 && minutesOf(B.time) < minutesOf(A.time)) ? 1 : 0;
    gap = gapWords(bornLater(A.date, B.date));
  }

  const blind = A.asc === null || B.asc === null;
  const readings = Array.from({ length: 12 }, (_, i): Reading => {
    if (blind) {
      const sign = SIGN_ORDER[i];
      const row = (p: Person) => `${p.name}: ${sign} · ${bodiesWhere(p.chart, (b) => signOf(b) === i)}`;
      return { house: null, object: null, label: `Sign ${i + 1} of 12`, word: sign, signs: [i, i], rows: [row(A), row(B)] };
    }
    const house = HOUSES[i];
    const signA = (A.ascSign + i) % 12;
    const signB = (B.ascSign + i) % 12;
    const row = (p: Person, sign: number) => `${p.name}: ${SIGN_ORDER[sign]} · ${bodiesWhere(p.chart, (b) => b.house === i + 1)}`;
    return {
      house: house.n,
      object: house.object,
      label: `House ${house.n} · ${house.object}`,
      word: house.word,
      signs: [signA, signB],
      rows: [row(A, signA), row(B, signB)],
    };
  });

  const readout = (p: Person) =>
    triadRowsOf(p.chart, { blind: NOT_DRAWN }).map((row) => ({
      text: `${row.label} ${triadText(row, true)}`,
      brass: row.key === "rising" && row.at !== null,
    }));

  const older = people[early];
  const younger = people[1 - early];
  return {
    people,
    early,
    km: kmApart(A, B),
    gap,
    blind,
    readings,
    readouts: [readout(A), readout(B)],
    from: { lat: older.lat, lon: older.lon },
    to: { lat: younger.lat, lon: younger.lon },
  };
}

/** "Madrid · 2 October 1989 · Tomás", leaving out a part the record lacks. */
const joined = (...parts: (string | null)[]): string => parts.filter(Boolean).join(" · ");

function stepWords(step: number, pair: Pair, progress: Progress): { title: string; subtitle: string | null } {
  const older = pair.people[pair.early];
  const younger = pair.people[1 - pair.early];
  const [A, B] = pair.people;
  switch (step) {
    case 0: {
      const title = "Where you were each born";
      if (pair.km > 0) return { title, subtitle: `Two places, ${thousands(pair.km)} km apart.` };
      return { title, subtitle: A.place ? `You were both born in ${A.place}.` : "You were both born in the same place." };
    }
    case 1:
      return { title: `The sky when ${older.name} was born`, subtitle: "Each planet runs to where it stood that day." };
    case 2: {
      const title = `The sky when ${younger.name} was born`;
      if (!older.day || !younger.day) return { title, subtitle: null };
      return { title, subtitle: pair.gap ? `${younger.name} was born ${pair.gap} later.` : "You were both born on the same day." };
    }
    case 3: {
      const title = "Your two charts, side by side";
      // The artifact's line says each chart turns; a chart with no birth time has no rising sign to turn to.
      if (A.asc !== null && B.asc !== null) {
        return { title, subtitle: "Each chart turns to its rising sign. One horizon runs through both." };
      }
      // MB-235 provisional: a rough time is named as rough; a time nobody gave reads as today.
      const skip = (p: Person) => (p.rough ? `${p.name}'s birth time is rough, so we skip the rising sign.` : `${p.name} has no birth time, so no horizon.`);
      if (A.asc === null && B.asc === null) {
        return { title, subtitle: A.rough || B.rough ? `${skip(A)} ${skip(B)}` : "No birth times, so no horizon." };
      }
      const [seen, unseen] = A.asc !== null ? [A, B] : [B, A];
      return { title, subtitle: `${seen.name}'s chart turns to its rising sign. ${skip(unseen)}` };
    }
    case 4: {
      if (!pair.blind) return { title: "Reading your houses, side by side", subtitle: "One house at a time, on both charts." };
      const lack = (p: Person) => (p.rough ? `${p.name}'s birth time is rough` : `${p.name} has no birth time`);
      const why = A.asc === null && B.asc === null
        ? (A.rough || B.rough ? `${lack(A)} and ${lack(B)}` : "No birth times")
        : lack(A.asc === null ? A : B);
      return {
        title: "Reading your signs, side by side",
        subtitle: `One sign at a time, on both charts. ${why}, so we read signs, not houses.`,
      };
    }
    default:
      if (progress.complete) return { title: "Your report is ready", subtitle: "Opening it now." };
      // A failed report is not writing, so the held frame stops saying it is; the overlay puts the failure under it.
      if (progress.failed) return { title: "Your two charts, side by side", subtitle: null };
      return {
        title: "Now writing your report",
        // The screen's own Start reading button sits under it, so the line says why the door opened and no more.
        subtitle: progress.door ? "The first chapters are in." : "It opens here when it's ready.",
      };
  }
}

const [, S2, S3, S4, S5, S6] = PAIR_STEPS_S;

/** The artifact's globe moves were drawn over 8.8 s; the third pass gave step 1 thirteen, so they play slower. */
const GLOBE_PACE = 8.8 / S2;

/** Every multiple of `step` from `from` to `to`, widened out to the next one at each end. */
function multiples(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let k = Math.floor(from / step); k <= Math.ceil(to / step); k++) out.push(k * step);
  return out;
}

/**
 * The grid every 5° once the globe comes in close, so the zoom reads as a zoom. The whole grid is eleven thousand
 * points a frame, so only the lines that can cross the disc are built: those within `reach` degrees of its middle,
 * plus a margin wider than one 2° step, so each line runs on past the disc's edge.
 */
function fineGrid(lat0: number, lon0: number, reach: number): Ring[] {
  const span = Math.min(90, reach + 4);
  const lonSpan = Math.abs(lat0) + span >= 90 ? 180 : Math.asin(Math.sin(span * D2R) / Math.cos(lat0 * D2R)) / D2R;
  const lats = multiples(Math.max(-90, lat0 - span), Math.min(90, lat0 + span), 2);
  const lons = multiples(lon0 - lonSpan, lon0 + lonSpan, 2);
  const meridians = lonSpan >= 180 ? multiples(-180, 175, 5) : multiples(lon0 - lonSpan, lon0 + lonSpan, 5);
  const parallels = multiples(Math.max(-60, lat0 - span), Math.min(60, lat0 + span), 5).filter((lat) => Math.abs(lat) <= 60);
  return [
    ...meridians.map((lon) => lats.map((lat): LonLat => [lon, lat])),
    ...parallels.map((lat) => lons.map((lon): LonLat => [lon, lat])),
  ];
}

type Vec = readonly [number, number, number];
const vecOf = (p: { lat: number; lon: number }): Vec => [
  Math.cos(p.lat * D2R) * Math.cos(p.lon * D2R),
  Math.cos(p.lat * D2R) * Math.sin(p.lon * D2R),
  Math.sin(p.lat * D2R),
];

/** The central angle between two places, in degrees. */
function arcDegrees(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const p = vecOf(a);
  const q = vecOf(b);
  return Math.acos(clamp(p[0] * q[0] + p[1] * q[1] + p[2] * q[2], -1, 1)) / D2R;
}

/**
 * A point on the great circle from a to b, u from 0 to 1. Two places on opposite sides of the Earth have no one
 * way between them, so the nearer end stands in.
 */
function along(a: { lat: number; lon: number }, b: { lat: number; lon: number }, u: number): { lat: number; lon: number } {
  const w = arcDegrees(a, b) * D2R;
  if (Math.sin(w) < 1e-9) return u < 0.5 ? a : b;
  const p = vecOf(a);
  const q = vecOf(b);
  const s0 = Math.sin((1 - u) * w) / Math.sin(w);
  const s1 = Math.sin(u * w) / Math.sin(w);
  const v = [0, 1, 2].map((i) => s0 * p[i] + s1 * q[i]);
  return { lat: Math.asin(clamp(v[2] / Math.hypot(v[0], v[1], v[2]), -1, 1)) / D2R, lon: Math.atan2(v[1], v[0]) / D2R };
}

function globeAt(t: number, pair: Pair, L: Layout): { globe: PairGlobe | null; texts: PairText[]; lines: PairLine[] } {
  const g = t * GLOBE_PACE;
  const fadeOut = 1 - seg(g, 7.4, 8.0);
  const older = pair.people[pair.early];
  const younger = pair.people[1 - pair.early];
  const same = pair.km === 0;
  const placeLine = (p: Person) => joined(p.place, p.day ? longDate(p.day) : p.date, p.name);
  const lines: PairLine[] = [
    { text: placeLine(older), role: "place", opacity: r3(seg(g, 4.4, 5.0) * fadeOut) },
    { text: placeLine(younger), role: "place", opacity: r3(seg(g, 6.4, 7.0) * fadeOut) },
  ];
  if (!same) lines.push({ text: `${thousands(pair.km)} km apart`, role: "distance", opacity: r3(seg(g, 6.6, 7.2) * fadeOut) });

  const opacity = seg(g, 0, 0.6) * (1 - seg(g, 8.5, 8.9));
  if (opacity <= 0) return { globe: null, texts: [], lines };

  const w = arcDegrees(pair.from, pair.to);
  const mid = along(pair.from, pair.to, 0.5);
  const turn = ease(seg(g, 0.3, 3.0));
  // The two places end about two fifths of the disc apart. Places nearer than about 110 km stop at that zoom, where
  // the 1:110m coast still reads, and the Earth is never drawn smaller than the whole disc.
  const zoomTo = Math.max(L.RC, (0.42 * L.RC) / Math.sin(Math.max(w / 2, 0.5) * D2R));
  const zIn = ease(seg(g, 3.0, 4.6));
  const zOut = ease(seg(g, 7.2, 8.0));
  const shrink = ease(seg(g, 8.0, 8.8));
  const r = lerp(L.RC, 4, shrink);
  const rz = lerp(lerp(L.RC, zoomTo, zIn), r, zOut);
  const lat0 = lerp(20, mid.lat, turn);
  const lon0 = lerpAngle(40, mid.lon, turn);
  const project = orthographic({ lat0, lon0, r: rz });
  const cx = L.w / 2;
  const cy = L.h / 2;

  const arcU = ease(seg(g, 4.9, 6.5));
  let route: PairGlobe["route"] = null;
  if (arcU > 0 && zOut < 1 && !same) {
    const ring: LonLat[] = Array.from({ length: 41 }, (_, k) => {
      const q = along(pair.from, pair.to, (arcU * k) / 40);
      return [q.lon, q.lat];
    });
    route = { d: visiblePath(project, [ring], cx, cy), opacity: r3(1 - zOut) };
  }

  const places: PairGlobe["places"] = [];
  const texts: PairText[] = [];
  const marks = [
    { at: pair.from, name: older.place, o: seg(g, 4.3, 4.9) * (1 - zOut) },
    ...(same ? [] : [{ at: pair.to, name: younger.place, o: seg(g, 6.3, 6.9) * (1 - zOut) }]),
  ].map((m) => ({ ...m, p: project(m.at.lat, m.at.lon) }));
  // The western place is named on its left and the eastern on its right, so two names never sit on each other.
  const westX = Math.min(...marks.map((m) => m.p.x));
  for (const m of marks) {
    if (m.o <= 0 || !m.p.front) continue;
    const x = cx + m.p.x;
    const y = cy + m.p.y;
    const left = marks.length > 1 && m.p.x === westX;
    places.push({ x: r2(x), y: r2(y), opacity: r3(m.o) });
    if (m.name) texts.push(textAt(m.name, x + (left ? -12 : 12), y + 4, L.placeSize, PLACE, m.o, left ? "end" : "start"));
  }

  return {
    globe: {
      cx,
      cy,
      r: r2(r),
      opacity: r3(opacity),
      grid: visiblePath(project, rz > r * 2 ? fineGrid(lat0, lon0, Math.asin(r / rz) / D2R) : GRATICULE, cx, cy),
      land: r > 20 ? visiblePath(project, LAND_110M, cx, cy) : "",
      landWidth: r > 60 ? 1 : 0.6,
      route,
      places,
    },
    texts,
    lines,
  };
}

/**
 * SVG degrees, clockwise from +x: the plate's turn at east on the left and the zodiac running anticlockwise from
 * it, as every chart is drawn.
 */
const angleOf = (lon: number, rotation: number): number => 180 - norm360(lon - rotation);

function pointAt(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle * D2R), cy + r * Math.sin(angle * D2R)];
}

function sectorPath(cx: number, cy: number, r1: number, r2: number, rotation: number, lon0: number, span: number): string {
  const n = 10;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) pts.push(pointAt(cx, cy, r2, angleOf(lon0 + (span * i) / n, rotation)));
  for (let i = n; i >= 0; i--) pts.push(pointAt(cx, cy, r1, angleOf(lon0 + (span * i) / n, rotation)));
  return `M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L")}Z`;
}

function arcPath(cx: number, cy: number, r: number, rotation: number, from: number, to: number): string {
  const span = norm360(to - from);
  const n = Math.max(2, Math.ceil(span));
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const [x, y] = pointAt(cx, cy, r, angleOf(from + (span * i) / n, rotation));
    pts.push(`${f1(x)} ${f1(y)}`);
  }
  return `M${pts.join("L")}`;
}

/** Crowding moves a body inward, never around (R-3.1): each takes the outermost lane clear of the ones already placed. */
function lanes(lons: Partial<Record<Body, number>>, base: number, step: number, gap: number): Partial<Record<Body, number>> {
  const keys = (Object.keys(lons) as Body[]).sort((a, b) => (lons[a] ?? 0) - (lons[b] ?? 0));
  const placed: { r: number; lon: number }[] = [];
  const out: Partial<Record<Body, number>> = {};
  for (const key of keys) {
    const lon = lons[key] ?? 0;
    let r = base;
    while (placed.some((p) => Math.abs(p.r - r) < 1e-9 && Math.min(norm360(lon - p.lon), norm360(p.lon - lon)) < gap)) r -= step;
    out[key] = r;
    placed.push({ r, lon });
  }
  return out;
}

interface PlateSpec {
  person: 0 | 1;
  p: Person;
  cx: number;
  cy: number;
  r: number;
  boost: number;
  /** The longitude at east: 0° Aries until the plate turns to its rising sign. */
  rotation: number;
  opacity: number;
  /** 0 the band names the signs, 1 the houses; a chart with no horizon stays on its signs. */
  mix: number;
  topOpacity: number;
  dark: number;
  marker: number;
  /** Days before the birthday the bodies stand; 0 on the day. */
  daysBack: number;
  lit: { sign: number; o: number } | null;
}

function plateOf(s: PlateSpec): PairPlate {
  const { cx, cy, r } = s;
  const k = r / 76;
  const inner = r - 16 * k;
  const has = s.p.asc !== null;
  const mix = has ? s.mix : 0;
  const size = r2(4.6 * k * s.boost);

  const sectors = Array.from({ length: 12 }, (_, i): PairSector => {
    const house = has ? (i - s.p.ascSign + 12) % 12 : 0;
    const lit = s.lit && s.lit.sign === i ? s.lit.o : 0;
    const a = angleOf(i * 30 + 15, s.rotation);
    const [x, y] = pointAt(cx, cy, (r + inner) / 2, a);
    const emphasis = lit > 0 ? 1 : 0.62;
    const words: PairSector["words"] = [];
    if (mix < 1) words.push({ text: SIGN_ORDER[i], opacity: r3(emphasis * (1 - mix)) });
    if (mix > 0) words.push({ text: HOUSES[house].word, opacity: r3(emphasis * mix) });
    return {
      sign: i,
      d: sectorPath(cx, cy, inner, r, s.rotation, i * 30 + 0.5, 29),
      lit: lit > 0,
      fillOpacity: r3(lit > 0 ? 0.34 * lit + 0.05 : 0.05),
      x: r2(x),
      y: r2(y),
      rotate: r2(Math.sin(a * D2R) > 0.0001 ? a - 90 : a + 90),
      size,
      words,
    };
  });

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = angleOf(i * 30, s.rotation);
    const [x1, y1] = pointAt(cx, cy, inner, a);
    const [x2, y2] = pointAt(cx, cy, r + 4 * k, a);
    return { x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2) };
  });

  const settled = s.daysBack <= 0;
  const lons: Partial<Record<Body, number>> = {};
  for (const key of TEN) {
    const p = s.p.chart.planets[key];
    if (p) lons[key] = norm360(p.absoluteDegree - MEAN[key] * s.daysBack);
  }
  const radius = lanes(lons, r - 27 * k, 9 * k, 11);
  const bodies: PairBody[] = [];
  if (s.topOpacity > 0) {
    for (const key of TEN) {
      const lon = lons[key];
      const rr = radius[key];
      if (lon === undefined || rr === undefined) continue;
      const band = key === "moon" && settled ? s.p.chart.planets.moon?.band : undefined;
      if (band) {
        const d = arcPath(cx, cy, rr, s.rotation, band.fromDegree, band.toDegree);
        bodies.push({ kind: "arc", key, d, width: r2(3.6 * k), opacity: r3(0.55 * s.topOpacity) });
        continue;
      }
      const big = key === "sun" || key === "moon";
      const [x, y] = pointAt(cx, cy, rr, angleOf(lon, s.rotation));
      bodies.push({ kind: "dot", key, x: r2(x), y: r2(y), r: r2((big ? 4.4 : 3) * k), big, opacity: r3(s.topOpacity) });
    }
  }

  return {
    person: s.person,
    cx: r2(cx),
    cy: r2(cy),
    r: r2(r),
    inner: r2(inner),
    opacity: r3(s.opacity),
    fillOpacity: has && mix > 0.5 ? 0.6 : 1,
    overHorizon: !has,
    sectors,
    ticks,
    shade: has && s.dark > 0
      ? { d: `M${f1(cx - r)} ${f1(cy)}A${f1(r)} ${f1(r)} 0 0 0 ${f1(cx + r)} ${f1(cy)}Z`, opacity: r3(0.5 * s.dark * s.opacity) }
      : null,
    bodies,
    marker: has && s.marker > 0
      ? {
        x: r2(cx - r),
        y: r2(cy),
        r: r2(5 * k),
        dot: r2(1.6 * k),
        tail: r2(8 * k),
        stroke: r2(1.3 * k),
        opacity: r3(s.marker * s.topOpacity),
      }
      : null,
  };
}

/** The house being read at t, from 30 s on, and how lit it is: each fades in, holds, and gives way to the next. */
function houseAt(t: number): { i: number; o: number; done: boolean } {
  if (t >= S6) return { i: 11, o: clamp(1 - (t - S6) / SETTLE_S), done: true };
  const i = clamp(Math.floor((t - S5) / HOUSE_S), 0, 11);
  const u = t - S5 - i * HOUSE_S;
  return { i, o: Math.min(ease(clamp(u / 1.1)), i === 11 ? 1 : clamp((HOUSE_S - u) / 0.7)), done: false };
}

function platesAt(t: number, pair: Pair, L: Layout): Pick<PairStage, "plates" | "horizon" | "centre" | "texts"> {
  const olderSide = pair.early;
  const youngerSide = (1 - olderSide) as 0 | 1;
  const older = pair.people[olderSide];
  const younger = pair.people[youngerSide];
  const ringIn = ease(seg(t, S2 - 0.2, S2 + 1.2));
  const settle = ease(seg(t, S2 + 0.8, S2 + 3.6));
  const move = ease(seg(t, S3, S3 + 2.4));
  const turn1 = ease(seg(t, S3 + 1.4, S3 + 3.2));
  const fadeIn = ease(seg(t, S3 + 3.2, S3 + 5.4));
  const meet = ease(seg(t, S4, S4 + 2.4));
  const dark = seg(t, S4 + 1.6, S4 + 2.8);
  const marker = seg(t, S4 + 1.8, S4 + 2.6);
  const hl = ease(seg(t, S4 + 1.2, S4 + 2.6));
  const pt = seg(t, S4 + 2, S4 + 2.6);

  let lit: [PlateSpec["lit"], PlateSpec["lit"]] = [null, null];
  if (t >= S5) {
    const { i, o } = houseAt(t);
    const signs = pair.readings[i].signs;
    if (o > 0) lit = [{ sign: signs[0], o }, { sign: signs[1], o }];
  }

  const plates: PairPlate[] = [];
  const r = lerp(L.RC, L.R, move);
  plates.push(plateOf({
    person: olderSide,
    p: older,
    cx: lerp(L.w / 2, L.cx[olderSide], move),
    cy: lerp(L.h / 2, L.cy, move),
    r,
    boost: L.boost,
    rotation: older.asc !== null ? lerpAngle(0, older.asc, turn1) : 0,
    opacity: ringIn,
    mix: turn1,
    topOpacity: seg(t, S2 + 0.6, S2 + 1.2),
    dark,
    marker,
    daysBack: RUN_DAYS * (1 - settle),
    lit: lit[olderSide],
  }));
  if (fadeIn > 0) {
    plates.push(plateOf({
      person: youngerSide,
      p: younger,
      cx: L.cx[youngerSide],
      cy: L.cy,
      r: L.R,
      boost: L.boost,
      rotation: younger.asc !== null ? lerpAngle(0, younger.asc, meet) : 0,
      opacity: fadeIn,
      mix: meet,
      topOpacity: fadeIn,
      dark,
      marker,
      daysBack: 0,
      lit: lit[youngerSide],
    }));
  }
  plates.sort((x, y) => x.person - y.person);

  const k = L.R / 76;
  const anyHorizon = pair.people.some((p) => p.asc !== null);
  const half = (L.w / 2 - 6) * hl;
  const horizon = anyHorizon && hl > 0
    ? { y: L.cy, x1: r2(L.w / 2 - half), x2: r2(L.w / 2 + half), glow: r2(42 * k * hl), width: r2(1.2 * Math.min(k, 1.3)) }
    : null;
  const centre = anyHorizon && pt > 0
    ? { x: L.w / 2, y: L.cy, r: r2(7 * Math.min(k, 1.5)), dot: r2(2.6 * Math.min(k, 1.5)), opacity: r3(pt) }
    : null;

  const texts: PairText[] = [];
  const sz = L.sz;
  const nameAt = (side: 0 | 1, o: number) => textAt(pair.people[side].name, L.cx[side], L.names, 17 * sz, NAME, o);
  if (t >= S3 + 0.6 && t < S4 + 2.6) {
    const out = 1 - seg(t, S4 + 2, S4 + 2.6);
    for (const [side, o] of [[olderSide, seg(t, S3 + 2, S3 + 2.8)], [youngerSide, fadeIn]] as const) {
      if (o * out <= 0) continue;
      const p = pair.people[side];
      texts.push(nameAt(side, o * out));
      texts.push(textAt(p.day ? longDate(p.day) : p.date, L.cx[side], L.names + 16 * sz, 8.4 * sz, DATE, o * out));
    }
  }
  if (t >= S4 + 2) {
    const o = seg(t, S4 + 2.2, S4 + 3);
    for (const side of [0, 1] as const) {
      if (o <= 0) continue;
      texts.push(nameAt(side, o));
      pair.readouts[side].forEach((row, j) => {
        texts.push(textAt(row.text, L.cx[side], L.names + (15 + j * 12) * sz, 8.2 * sz, row.brass ? { ...DATE, tone: "brass" } : DATE, o));
      });
    }
  }
  return { plates, horizon, centre, texts };
}

function firstSkyLines(t: number, pair: Pair): PairLine[] {
  const older = pair.people[pair.early];
  const settle = ease(seg(t, S2 + 0.8, S2 + 3.6));
  const out = 1 - seg(t, S3, S3 + 0.6);
  const day = older.day ? longDate(daysBefore(older.day, Math.round(RUN_DAYS * (1 - settle)))) : older.date;
  return [
    { text: day, role: "date", opacity: r3(seg(t, S2 + 0.6, S2 + 1.2) * out) },
    { text: joined(older.place, older.time, older.name), role: "when", opacity: r3(seg(t, S2 + 2.6, S2 + 3.4) * out) },
  ];
}

function houseBlock(t: number, pair: Pair, L: Layout, opacity: number): PairHouse {
  const { i, o, done } = houseAt(t);
  const reading = pair.readings[i];
  return {
    kind: "house",
    align: L.align,
    house: reading.house,
    object: reading.object,
    label: reading.label,
    word: reading.word,
    rows: reading.rows,
    opacity: r3(opacity * o),
    dots: Array.from({ length: 12 }, (_, j) => ({ filled: j < i || (j === i && (o > 0.5 || done)), reached: j <= i })),
    dotsOpacity: r3(opacity),
  };
}

function stepAt(t: number): number {
  let i = 0;
  PAIR_STEPS_S.forEach((at, j) => {
    if (t >= at) i = j;
  });
  return i;
}

/**
 * The story at t seconds after the screen opened, for this pair and this report's progress, in the stage box of
 * `view`. Pure: the same three in, the same frame out; from `PAIR_STILL_S` on the frame holds.
 */
export function pairFrameAt(t: number, input: PairInput, progress: Progress, view: PairView = "phone"): PairFrame {
  const time = Number.isFinite(t) ? clamp(t, 0, PAIR_STILL_S) : t > 0 ? PAIR_STILL_S : 0;
  const L = LAYOUTS[view];
  const pair = readPair(input);
  const step = stepAt(time);
  const at = PAIR_STEPS_S[step];

  // The old caption leaves before the new one comes, so two titles never sit on each other.
  const leaving = step > 0 && time < at + 0.4;
  const shown = leaving ? step - 1 : step;
  const opacity = leaving ? 1 - seg(time, at, at + 0.4) : step === 0 ? seg(time, 0, 0.6) : ease(seg(time, at + 0.4, at + 1.2));
  const words = stepWords(shown, pair, progress);

  const stage: PairStage = { w: L.w, h: L.h, globe: null, plates: [], horizon: null, centre: null, texts: [] };
  let detail: PairDetail | null = null;
  // The Earth shrinks to a point as the first sky draws in, so for a moment both are on the stage.
  if (time < S2 + 0.3) {
    const g = globeAt(time, pair, L);
    stage.globe = g.globe;
    stage.texts.push(...g.texts);
    if (time < S2) detail = { kind: "lines", align: "center", lines: g.lines };
  }
  if (time >= S2 - 0.2) {
    const p = platesAt(time, pair, L);
    stage.plates = p.plates;
    stage.horizon = p.horizon;
    stage.centre = p.centre;
    stage.texts.push(...p.texts);
  }
  if (time >= S2 && time < S3 + 0.6) detail = { kind: "lines", align: "center", lines: firstSkyLines(time, pair) };
  else if (shown === 4) detail = houseBlock(leaving ? at - 0.01 : time, pair, L, opacity);

  return {
    step,
    id: STEP_IDS[step],
    caption: { counter: `Step ${shown + 1} of ${PAIR_STEPS_S.length}`, ...words, opacity: r3(opacity) },
    detail,
    stage,
  };
}
