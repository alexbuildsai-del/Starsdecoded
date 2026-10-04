import { hasHorizon, type NatalChartData } from "./chartCalculation.js";
import { DOCTRINE } from "./doctrine.js";
import { SKY_BODIES, inOrb, longitudeAt, type InOrb, type SkyBody } from "./transits.js";

/**
 * Life's long cycles, birth to 90 (ADR-208, 209): a slow body back at its place at birth, or a half or a quarter of
 * the way round, at the doctrine's orbs. A passage a retrograde splits stays one cycle with every exact date in it,
 * so a three-pass Saturn return is one cycle, not three.
 */

export type CycleId =
  | "jupiter-return"
  | "jupiter-opposition"
  | "saturn-return"
  | "saturn-opposition"
  | "saturn-square"
  | "node-return"
  | "node-opposition"
  | "uranus-return"
  | "uranus-opposition"
  | "uranus-square"
  | "neptune-square"
  | "pluto-square";

export type CycleBody = Extract<SkyBody, "jupiter" | "saturn" | "north_node" | "uranus" | "neptune" | "pluto">;

/** Slowest last, the order Life stacks their waves in. */
export const CYCLE_BODIES: readonly CycleBody[] = ["jupiter", "saturn", "north_node", "uranus", "neptune", "pluto"];

export type NatalLongitudes = Partial<Record<SkyBody, number>>;

export interface LifeCycle {
  /** `cycle.{id}.{yyyymmdd}`, the UTC day of the first exact pass, or of the window's start if none (reading 5). */
  key: string;
  id: CycleId;
  body: CycleBody;
  /** Whole years from birth to the first exact pass, or to the window's start if none. */
  age: number;
  /** From first entering the orb to last leaving it, with every exact pass between. */
  window: InOrb;
  passes: number;
  /** The kind comes more than once in a life, so its card can look back to the last one. */
  repeats: boolean;
  /** Degrees travelled since birth: 90 a first square, 270 a closing one, 360 a return, 720 the second. */
  angle: number;
}

interface Rule {
  body: CycleBody;
  /** Degrees on from the place at birth: 0 for a return, 180 an opposition, 90 and 270 the two squares. */
  points: readonly number[];
  repeats: boolean;
}

const RULES: Record<CycleId, Rule> = {
  "jupiter-return": { body: "jupiter", points: [0], repeats: true },
  "jupiter-opposition": { body: "jupiter", points: [180], repeats: true },
  "saturn-return": { body: "saturn", points: [0], repeats: true },
  "saturn-opposition": { body: "saturn", points: [180], repeats: true },
  "saturn-square": { body: "saturn", points: [90, 270], repeats: true },
  "node-return": { body: "north_node", points: [0], repeats: true },
  "node-opposition": { body: "north_node", points: [180], repeats: true },
  "uranus-return": { body: "uranus", points: [0], repeats: false },
  "uranus-opposition": { body: "uranus", points: [180], repeats: false },
  "uranus-square": { body: "uranus", points: [90, 270], repeats: true },
  "neptune-square": { body: "neptune", points: [90, 270], repeats: false },
  "pluto-square": { body: "pluto", points: [90, 270], repeats: false },
};

const CYCLE_IDS = Object.keys(RULES) as CycleId[];

interface Motion {
  orb: number;
  /** The node goes backwards round the zodiac, so its points are counted the way it goes. */
  direction: 1 | -1;
  /** Mean years for one round. */
  period: number;
}

/** The planets' orbs are the doctrine's (ADR-208); the node's 1° is Life's own. */
const MOTION: Record<CycleBody, Motion> = {
  jupiter: { orb: DOCTRINE.orbs.jupiter, direction: 1, period: 11.86 },
  saturn: { orb: DOCTRINE.orbs.saturn, direction: 1, period: 29.46 },
  north_node: { orb: 1, direction: -1, period: 18.61 },
  uranus: { orb: DOCTRINE.orbs.uranus, direction: 1, period: 84.02 },
  neptune: { orb: DOCTRINE.orbs.neptune, direction: 1, period: 164.8 },
  pluto: { orb: DOCTRINE.orbs.pluto, direction: 1, period: 247.9 },
};

/**
 * The four ages astrology knows by name, in the order Life shows them (ADR-209): each card heads its age with the
 * label and takes the reader's own dates from `lifeCycles`.
 */
export const KNOWN_AGES: readonly { id: CycleId; body: CycleBody; label: string }[] = [
  { id: "saturn-return", body: "saturn", label: "29" },
  { id: "jupiter-return", body: "jupiter", label: "every 12" },
  { id: "node-return", body: "north_node", label: "19 · 37" },
  { id: "uranus-opposition", body: "uranus", label: "early 40s" },
];

const DAY_MS = 86_400_000;
const YEAR_MS = 365.2425 * DAY_MS;
const MONTH_MS = YEAR_MS / 12;

const norm = (deg: number): number => ((deg % 360) + 360) % 360;
const utcDay = (at: Date): string => at.toISOString().slice(0, 10).replace(/-/g, "");

function addYears(at: Date, years: number): Date {
  const out = new Date(at.getTime());
  out.setUTCFullYear(at.getUTCFullYear() + years);
  return out;
}

/** Whole years from birth to an instant, a birthday counting from the hour of birth. */
export function ageAt(birth: Date, at: Date): number {
  const years = at.getUTCFullYear() - birth.getUTCFullYear();
  return at.getTime() < addYears(birth, years).getTime() ? years - 1 : years;
}

/**
 * A chart's bodies recomputed at its birth instant to full precision: the stored hundredth of a degree would move a
 * slow body's exact pass by hours. Without a horizon the Moon is left out, since in the day the birth could fall in
 * it moves up to 15° (R-4.6).
 */
export function natalLongitudes(chart: NatalChartData): NatalLongitudes {
  const at = new Date(chart.datetimeUtc);
  const out: NatalLongitudes = {};
  for (const body of SKY_BODIES) {
    if (body === "moon" && !hasHorizon(chart)) continue;
    out[body] = longitudeAt(body, at);
  }
  return out;
}

/** 12:00 UTC on a birth date: the finder's stand-in for a birth time it never asks for (reading 21). */
export function noonOf(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  const at = new Date(0);
  if (m) {
    at.setUTCFullYear(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    at.setUTCHours(12, 0, 0, 0);
  }
  if (!m || at.getUTCMonth() !== Number(m[2]) - 1 || at.getUTCDate() !== Number(m[3])) {
    throw new RangeError(`${ymd} is not a calendar date`);
  }
  return at;
}

/**
 * The six cycle bodies at 12:00 UTC on a birth date. None moves more than a quarter of a degree in a day, so the
 * finder's dates hold to the month without a birth time; the faster bodies are left out because theirs would not.
 */
export function noonLongitudes(ymd: string): NatalLongitudes {
  const at = noonOf(ymd);
  const out: NatalLongitudes = {};
  for (const body of CYCLE_BODIES) out[body] = longitudeAt(body, at);
  return out;
}

/** How far round its circle a body has come since birth, 0 to 1, the node counted backwards as it moves. */
export function roundProgress(body: CycleBody, natal: number, at: Date): number {
  return norm(MOTION[body].direction * (longitudeAt(body, at) - natal)) / 360;
}

/**
 * Every cycle whose window opens between birth and `untilAge` (90 unless given), oldest first, each window whole
 * even where it runs past the limit. `ids` limits the search to those cycles, which is what keeps the finder quick.
 */
export function lifeCycles(
  natal: NatalLongitudes,
  birth: Date,
  options: { untilAge?: number; ids?: CycleId[] } = {},
): LifeCycle[] {
  const until = addYears(birth, options.untilAge ?? 90);
  const cycles: LifeCycle[] = [];
  for (const id of new Set(options.ids ?? CYCLE_IDS)) {
    const { body, points, repeats } = RULES[id];
    const home = natal[body];
    if (home === undefined) continue;
    const { orb, direction, period } = MOTION[body];
    for (const point of points) {
      // Birth itself is a stay at the place of birth, so a return's search starts half a round later.
      const from = point === 0 ? new Date(birth.getTime() + (period / 2) * YEAR_MS) : birth;
      // One window per passage, in order, so the nth window of a point is the nth time the body reaches it.
      inOrb(body, norm(home + direction * point), orb, from, until).forEach((window, n) => {
        const anchor = window.exact[0] ?? window.start;
        cycles.push({
          key: `cycle.${id}.${utcDay(anchor)}`,
          id,
          body,
          age: ageAt(birth, anchor),
          window,
          passes: window.exact.length,
          repeats,
          angle: point + 360 * (point === 0 ? n + 1 : n),
        });
      });
    }
  }
  return cycles.sort((a, b) => a.window.start.getTime() - b.window.start.getTime() || a.id.localeCompare(b.id));
}

export interface Wave {
  body: CycleBody;
  points: { age: number; distance: number }[];
}

/**
 * Each cycle body's distance from its place at birth, 0 to 180°, once a month from birth to `untilAge`: a return
 * at the bottom of Life's wave, the opposite point at its top.
 */
export function waves(natal: NatalLongitudes, birth: Date, untilAge = 90): Wave[] {
  const months = Math.round(untilAge * 12);
  const out: Wave[] = [];
  for (const body of CYCLE_BODIES) {
    const home = natal[body];
    if (home === undefined) continue;
    const points: Wave["points"] = [];
    for (let m = 0; m <= months; m++) {
      const away = norm(longitudeAt(body, new Date(birth.getTime() + m * MONTH_MS)) - home);
      points.push({ age: Math.round((m / 12) * 1000) / 1000, distance: Math.round(Math.min(away, 360 - away) * 100) / 100 });
    }
    out.push({ body, points });
  }
  return out;
}
