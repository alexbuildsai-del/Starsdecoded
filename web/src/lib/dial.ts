/**
 * The dial's arithmetic (ADR-207, readings 17 and 18): the frames it draws, built with the engine, and the geometry that
 * puts each body at its true degree. The dial draws only what a frame holds, so the page's hero (frames computed at
 * build) and Timeline (frames computed in the browser) are one drawing. Pure, so its promises are tested without a
 * browser.
 */
import {
  DOCTRINE, headlineOf, longitudeAt, speedAt, toneOf,
  type Aspect, type ContactEvent, type NatalTarget, type SkyBody, type Tone,
} from "@workspace/engine";
import type { DateOrder } from "@/lib/date-entry";
import { HOUSE_WORDS } from "@/lib/evidence-glossary";
import { SIGN_ORDER, norm360, pointAt, type Point } from "@/components/chart/wheel-geometry";

type ContactBody = ContactEvent["body"];

/** One day of the dial: where each body is, and what touches the chart that day. */
export interface DialFrame {
  /** The day, "YYYY-MM-DD", a UTC day; the bodies stand where they are at its noon. */
  date: string;
  bodies: { body: SkyBody; lon: number; retrograde: boolean; tone: Tone | null }[];
  /** Every doctrine contact in effect that day, the strongest tone first. */
  contacts: { body: ContactBody; target: NatalTarget; aspect: Aspect }[];
  /** Up to three of their headlines, in the same order and never the same line twice. */
  headlines: string[];
}

/** A natal point the dial draws inside, as the API's `NatalPoint` and the page's data carry it. */
export interface DialPoint {
  body: string;
  lon: number;
}

export interface DialAngles {
  ascendant: number;
  midheaven: number;
}

/** The chart as the dial reads it: what the API's Timeline views and the page's data both carry, so either can build frames. */
export interface DialNatal {
  points: readonly DialPoint[];
  angles: DialAngles | null;
}

const DAY_MS = 86_400_000;
const LAST_MINUTE_MS = DAY_MS - 60_000;
const MAX_HEADLINES = 3;

/** The strongest first, so a frame's first headline is the one a reader most needs to see. */
const TONE_RANK: Record<Tone, number> = { intense: 0, mixed: 1, easy: 2 };

/** Fastest inside, slowest outermost (Timeline's Now and ahead); a body not listed has no track and is not drawn. */
export const DIAL_ORDER: readonly SkyBody[] = [
  "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
];

function dayOf(from: string | Date): string {
  return typeof from === "string" ? from.slice(0, 10) : from.toISOString().slice(0, 10);
}

function midnightOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function noonOf(day: string): Date {
  return new Date(midnightOf(day) + DAY_MS / 2);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Signed shortest arc from b to a, -180 to 180. */
function arc(a: number, b: number): number {
  const d = norm360(a - b);
  return d > 180 ? d - 360 : d;
}

/** The stronger of two tones: a planet with an easy contact and an intense one reads intense, as both artifacts draw it. */
export function strongerTone(a: Tone | null, b: Tone | null): Tone | null {
  if (a === null) return b;
  if (b === null) return a;
  return TONE_RANK[a] <= TONE_RANK[b] ? a : b;
}

/**
 * The doctrine's targets on this chart and where they are. A chart with no horizon has no Ascendant, Midheaven or
 * natal Moon to time a contact to (R-4.6), as the doctrine reads it.
 */
function targetsOf(natal: DialNatal): { target: NatalTarget; lon: number }[] {
  const timed: readonly NatalTarget[] = DOCTRINE.horizonTargets;
  const found: { target: NatalTarget; lon: number }[] = [];
  for (const target of DOCTRINE.targets) {
    if (!natal.angles && timed.includes(target)) continue;
    const lon = target === "ascendant" ? natal.angles?.ascendant
      : target === "midheaven" ? natal.angles?.midheaven
      : natal.points.find((p) => p.body === target)?.lon;
    if (lon !== undefined) found.push({ target, lon });
  }
  return found;
}

function isContactBody(body: string): body is ContactBody {
  return (DOCTRINE.bodies as readonly string[]).includes(body);
}

/**
 * Only a planet that can touch the chart leaves a trail, as Timeline's artifact draws it: Mercury and Venus are on the
 * dial for their retrogrades, and over a range their way would ring the whole track.
 */
export function leavesTrail(body: string): boolean {
  return isContactBody(body);
}

/**
 * Frames for `days` days from `from`, all from the engine: each body's place and direction, the doctrine's contacts
 * with their tones and headlines. The page's hero builds Mars to Pluto over six months; Timeline Mercury to Pluto over
 * its range (7, 30 or 182 days). A contact is in effect on a day when the planet is within orb at its first or last
 * minute, as the doctrine's `inEffect` counts it, so a gap a retrograde opens inside a window draws no line.
 */
export function framesFor(
  natal: DialNatal,
  from: string | Date,
  days: number,
  bodies: readonly SkyBody[],
): DialFrame[] {
  const first = midnightOf(dayOf(from));
  const targets = targetsOf(natal);
  const movers = bodies.filter(isContactBody);
  const targetRank = (t: NatalTarget) => DOCTRINE.targets.indexOf(t);
  const slowRank = (b: ContactBody) => -DOCTRINE.bodies.indexOf(b);

  return Array.from({ length: Math.max(0, Math.floor(days)) }, (_, i) => {
    const dayStart = first + i * DAY_MS;
    const noon = new Date(dayStart + DAY_MS / 2);

    const on: { body: ContactBody; target: NatalTarget; aspect: Aspect; tone: Tone }[] = [];
    for (const body of movers) {
      const orb = DOCTRINE.orbs[body];
      const ends = [longitudeAt(body, new Date(dayStart)), longitudeAt(body, new Date(dayStart + LAST_MINUTE_MS))];
      for (const { target, lon } of targets) {
        for (const aspect of DOCTRINE.aspects[body]) {
          const angle = DOCTRINE.angles[aspect];
          if (ends.some((at) => Math.abs(Math.abs(arc(at, lon)) - angle) <= orb)) {
            on.push({ body, target, aspect, tone: toneOf({ kind: "contact", body, aspect }) });
          }
        }
      }
    }
    on.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone] || slowRank(a.body) - slowRank(b.body)
      || targetRank(a.target) - targetRank(b.target));

    const headlines: string[] = [];
    for (const c of on) {
      if (headlines.length === MAX_HEADLINES) break;
      const line = headlineOf({ kind: "contact", body: c.body, aspect: c.aspect, target: c.target });
      if (!headlines.includes(line)) headlines.push(line);
    }

    return {
      date: noon.toISOString().slice(0, 10),
      bodies: bodies.map((body) => ({
        body,
        lon: r2(norm360(longitudeAt(body, noon))),
        retrograde: speedAt(body, noon) < 0,
        tone: on.filter((c) => c.body === body).reduce<Tone | null>((t, c) => strongerTone(t, c.tone), null),
      })),
      contacts: on.map(({ body, target, aspect }) => ({ body, target, aspect })),
      headlines,
    };
  });
}

/** Whether any planet goes backwards on a day of these frames, which is when the R shows and its line is worth the room. */
export function anyRetrograde(frames: readonly DialFrame[]): boolean {
  return frames.some((f) => f.bodies.some((b) => b.retrograde));
}

/** The plate's units: a 500 square, the focus ring just outside it. */
export const DIAL = {
  size: 500,
  centre: 250,
  pad: 6,
  ring: 253,
  trackOuter: 238,
  trackInner: 164,
  trackStep: 14,
  bandOuter: 150,
  bandInner: 126,
  band: 138,
  point: 108,
  pointLabel: 86,
  disc: 11,
  render: 16,
} as const;

/**
 * A longitude's angle on the dial, counter-clockwise from the right: the Ascendant due east on the left, as every chart
 * draws it, or 0° Aries there when the chart has no horizon.
 */
export function dialAngle(lon: number, east: number): number {
  return norm360(180 + lon - east);
}

/** To the hundredth, so the prerendered dial and the hydrating one write the same attributes whatever a sine's last digit. */
export function dialAt(lon: number, r: number, east: number): Point {
  const p = pointAt(DIAL.centre, DIAL.centre, r, dialAngle(lon, east));
  return { x: r2(p.x), y: r2(p.y) };
}

/** Each body on its own track, slowest outermost; the tracks spread over the ring the dial keeps for them. */
export function trackRadii(bodies: readonly string[]): Record<string, number> {
  const ordered = DIAL_ORDER.filter((b) => bodies.includes(b));
  const step = ordered.length > 1
    ? Math.min(DIAL.trackStep, (DIAL.trackOuter - DIAL.trackInner) / (ordered.length - 1))
    : 0;
  const radii: Record<string, number> = {};
  ordered.forEach((b, i) => {
    radii[b] = r2(DIAL.trackOuter - (ordered.length - 1 - i) * step);
  });
  return radii;
}

export interface BandSegment {
  /** The segment's first longitude; it runs 30° on from there. */
  from: number;
  label: string;
}

/**
 * The ring inside the tracks. With a horizon it holds the whole-sign houses, each named by its word, since a house is
 * never a bare number (§9, ADR-98); without one it holds the twelve signs from 0° Aries, with no house to name (R-4.6).
 */
export function bandSegments(ascendant: number | null): BandSegment[] {
  if (ascendant === null) {
    return SIGN_ORDER.map((sign, i) => ({ from: i * 30, label: sign.toUpperCase() }));
  }
  const first = Math.floor(norm360(ascendant) / 30);
  return HOUSE_WORDS.map((word, i) => ({ from: ((first + i) % 12) * 30, label: word.toUpperCase() }));
}

/**
 * One body's way through frames `from` to `to`, on its track: the trail behind a body as it plays, or its path across
 * the whole range. A retrograde shows as the path doubling back on itself.
 */
export function trailPath(
  frames: readonly DialFrame[],
  body: string,
  r: number,
  east: number,
  from: number,
  to: number,
): string {
  let d = "";
  for (let i = Math.max(0, from); i <= Math.min(to, frames.length - 1); i++) {
    const place = frames[i].bodies.find((b) => b.body === body);
    if (!place) continue;
    const p = pointAt(DIAL.centre, DIAL.centre, r, dialAngle(place.lon, east));
    d += `${d ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  return d.includes("L") ? d : "";
}

export function clampDay(day: number, last: number): number {
  if (!Number.isFinite(day)) return 0;
  return Math.min(Math.max(0, Math.round(day)), Math.max(0, last));
}

/** Where Play starts: where the dial stands, or the range's first day once it has reached the end. */
export function playStart(day: number, last: number): number {
  const at = clampDay(day, last);
  return at >= last ? 0 : at;
}

/** A day a beat, or a week with reduced motion; it never runs past the range's end. */
export function playStep(day: number, last: number, reduced: boolean): number {
  return Math.min(Math.max(0, last), clampDay(day, last) + (reduced ? 7 : 1));
}

/** Slower over a short range, so a week takes about three seconds and six months about eleven. */
export function beatMs(frames: number, reduced: boolean): number {
  if (reduced) return 400;
  if (frames <= 10) return 420;
  if (frames <= 45) return 150;
  return 60;
}

/** The slider's keys, as a native range input answers them; any other key leaves the day alone. */
export function keyDay(key: string, day: number, last: number): number | null {
  const at = clampDay(day, last);
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return clampDay(at + 1, last);
    case "ArrowLeft":
    case "ArrowDown":
      return clampDay(at - 1, last);
    case "PageUp":
      return clampDay(at + 7, last);
    case "PageDown":
      return clampDay(at - 7, last);
    case "Home":
      return 0;
    case "End":
      return clampDay(last, last);
    default:
      return null;
  }
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/**
 * "Monday 5 October 2026", or "Monday, October 5, 2026" where the month comes first: the reader's order with the
 * site's English names and no clock time (reading 4). Written out rather than asked of Intl, whose English differs by
 * a comma between runtimes, so the prerender and the browser say the same day.
 */
export function dayWords(date: string, order: DateOrder): string {
  const at = noonOf(date);
  const weekday = WEEKDAYS[at.getUTCDay()];
  const month = MONTHS[at.getUTCMonth()];
  return order === "dmy"
    ? `${weekday} ${at.getUTCDate()} ${month} ${at.getUTCFullYear()}`
    : `${weekday}, ${month} ${at.getUTCDate()}, ${at.getUTCFullYear()}`;
}

/** The dial's words for one day: its date, then what touches the chart, as the drawing shows it. */
export function frameText(frame: DialFrame | undefined, order: DateOrder): string {
  if (!frame) return "";
  const said = frame.headlines.length ? frame.headlines.map((h) => `${h}.`).join(" ") : "A quiet day.";
  return `${dayWords(frame.date, order)}. ${said}`;
}
