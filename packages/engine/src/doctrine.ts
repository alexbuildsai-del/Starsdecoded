import { hasHorizon, type NatalChartData } from "./chartCalculation.js";
import { toneOf, type Tone } from "./tone.js";
import { eclipses, exactHits, inOrb, longitudeAt, speedAt, stations, type Eclipse, type InOrb } from "./transits.js";

/**
 * The doctrine (ADR-208): which sky events touch a chart. Everything Timeline
 * and its page may talk about is an event from here, and nothing else is:
 * sextiles, the Moon's moves and the minor bodies make no event. Chiron makes
 * none either until the Owner adds it (MB-189).
 */
export type Aspect = "conjunction" | "square" | "opposition" | "trine";
export type NatalTarget = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn" | "ascendant" | "midheaven";
export type ContactBody = "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto";
export type RetrogradeBody = "mercury" | "venus" | "mars";

const DAY = 86_400_000;

export const DOCTRINE = {
  bodies: ["mars", "jupiter", "saturn", "uranus", "neptune", "pluto"],
  orbs: { mars: 1, jupiter: 2, saturn: 2, uranus: 1.5, neptune: 1.5, pluto: 1.5 },
  aspects: {
    mars: ["conjunction", "square", "opposition"],
    jupiter: ["conjunction", "square", "opposition", "trine"],
    saturn: ["conjunction", "square", "opposition", "trine"],
    uranus: ["conjunction", "square", "opposition", "trine"],
    neptune: ["conjunction", "square", "opposition", "trine"],
    pluto: ["conjunction", "square", "opposition", "trine"],
  },
  angles: { conjunction: 0, square: 90, opposition: 180, trine: 120 },
  targets: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "ascendant", "midheaven"],
  /** Too loose to time without a birth time, so a blind chart has none of them (R-4.6). */
  horizonTargets: ["moon", "ascendant", "midheaven"],
  retrogrades: ["mercury", "venus", "mars"],
  /** An eclipse is near a natal point within this many degrees, and only then gets a reading. */
  eclipseNear: 3,
  /**
   * Days searched either side of a range for the stations of a retrograde that
   * touches it, so its start and end are real (reading 6). Mars's longest
   * retrograde runs about 81 days. A contact needs no margin: `inOrb` widens its
   * own search until every window it returns is whole.
   */
  retrogradeMargin: 90,
} as const satisfies {
  bodies: readonly ContactBody[];
  orbs: Record<ContactBody, number>;
  aspects: Record<ContactBody, readonly Aspect[]>;
  angles: Record<Aspect, number>;
  targets: readonly NatalTarget[];
  horizonTargets: readonly NatalTarget[];
  retrogrades: readonly RetrogradeBody[];
  eclipseNear: number;
  retrogradeMargin: number;
};

/**
 * A slow planet within orb of a natal point. `orb` is the doctrine's orb the
 * window was searched at; `house` is the natal point's whole-sign house, the
 * house its reading builds on (reading 10), null without a horizon.
 */
export interface ContactEvent {
  key: string;
  kind: "contact";
  body: ContactBody;
  aspect: Aspect;
  target: NatalTarget;
  orb: number;
  window: InOrb;
  house: number | null;
  tone: Tone;
}

/** From the station retrograde to the station direct, with the whole-sign houses it moves back through, in that order. */
export interface RetrogradeEvent {
  key: string;
  kind: "retrograde";
  body: RetrogradeBody;
  start: Date;
  end: Date;
  houses: number[];
  tone: Tone;
}

export interface EclipseEvent {
  key: string;
  kind: "eclipse";
  eclipse: Eclipse;
  house: number | null;
  near: { target: NatalTarget; orb: number } | null;
  tone: Tone | null;
}

export type SkyEvent = ContactEvent | RetrogradeEvent | EclipseEvent;

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const norm = (deg: number): number => ((deg % 360) + 360) % 360;
/** Signed shortest arc from b to a, -180 to 180. */
const arc = (a: number, b: number): number => {
  const d = norm(a - b);
  return d > 180 ? d - 360 : d;
};
const signOf = (lon: number): number => Math.floor(norm(lon) / 30) % 12;
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** UTC, so a key never moves with the reader's zone (reading 5). */
function ymd(at: Date): string {
  return at.toISOString().slice(0, 10).replace(/-/g, "");
}

interface NatalPoint {
  target: NatalTarget;
  lon: number;
  house: number | null;
}

interface Natal {
  points: NatalPoint[];
  /** Null on a blind chart: there is no house to be in (R-4.6). */
  houseOfSign: ((sign: number) => number) | null;
}

/**
 * Houses come from the chart's own signs, never from its rounded degrees, so a
 * body at 29.996° keeps the house the chart gave it.
 */
function natalOf(chart: NatalChartData): Natal {
  if (!hasHorizon(chart)) {
    const timed = DOCTRINE.horizonTargets as readonly NatalTarget[];
    const points = DOCTRINE.targets
      .filter((target) => !timed.includes(target))
      .map((target) => ({ target, lon: chart.planets[target].absoluteDegree, house: null }));
    return { points, houseOfSign: null };
  }
  const first = SIGNS.indexOf(chart.angles.ascendant.sign);
  const houseOfSign = (sign: number): number => ((sign - first + 12) % 12) + 1;
  const points = DOCTRINE.targets.map((target): NatalPoint => {
    if (target === "ascendant") return { target, lon: chart.angles.ascendant.absoluteDegree, house: 1 };
    if (target === "midheaven") {
      const mc = chart.angles.midheaven;
      return { target, lon: mc.absoluteDegree, house: houseOfSign(SIGNS.indexOf(mc.sign)) };
    }
    const planet = chart.planets[target];
    return { target, lon: planet.absoluteDegree, house: planet.house ?? houseOfSign(signOf(planet.absoluteDegree)) };
  });
  return { points, houseOfSign };
}

/** A square and a trine each have two places on the circle; a conjunction and an opposition one. */
function aspectPoints(lon: number, aspect: Aspect): number[] {
  const angle = DOCTRINE.angles[aspect];
  return angle === 0 || angle === 180 ? [norm(lon + angle)] : [norm(lon + angle), norm(lon - angle)];
}

function overlaps(start: Date, end: Date, from: Date, to: Date): boolean {
  return start.getTime() <= to.getTime() && end.getTime() >= from.getTime();
}

/** Where a window's planet perfects. `skyEvents` fills it from the chart; an event built elsewhere finds it again. */
const pointCache = new WeakMap<InOrb, number>();
function pointOf(event: ContactEvent): number {
  const cached = pointCache.get(event.window);
  if (cached !== undefined) return cached;
  const { start, exact } = event.window;
  // At an exact pass the planet stands on the point; with none, it came in a whole orb short of it.
  const point = exact.length
    ? longitudeAt(event.body, exact[0])
    : norm(longitudeAt(event.body, start) + Math.sign(speedAt(event.body, start)) * event.orb);
  pointCache.set(event.window, point);
  return point;
}

/**
 * Whether the planet is within orb at some instant from `from` to `to`. A
 * window can hold several passes with gaps between them, where a retrograde
 * took the planet out of orb and back, and a span inside a gap meets none.
 */
function onDuring(event: ContactEvent, from: number, to: number): boolean {
  const { body, orb, window } = event;
  const start = window.start.getTime();
  const end = window.end.getTime();
  if (start > to || end < from) return false;
  if (start >= from || end <= to) return true;
  if (window.exact.some((at) => at.getTime() >= from && at.getTime() <= to)) return true;
  const point = pointOf(event);
  const within = (at: number): boolean => Math.abs(arc(longitudeAt(body, new Date(at)), point)) <= orb;
  if (within(from) || within(to)) return true;
  // Out of orb at both ends, so a pass inside the span would have to cross the orb's edge within it.
  const a = new Date(from);
  const b = new Date(to);
  return exactHits(body, norm(point + orb), a, b).length > 0 || exactHits(body, norm(point - orb), a, b).length > 0;
}

const BODY_ORDER = DOCTRINE.bodies as readonly string[];
const TARGET_ORDER = DOCTRINE.targets as readonly string[];

function contactsIn(points: NatalPoint[], from: Date, to: Date): ContactEvent[] {
  const found: ContactEvent[] = [];
  for (const body of DOCTRINE.bodies) {
    const orb = DOCTRINE.orbs[body];
    for (const point of points) {
      for (const aspect of DOCTRINE.aspects[body]) {
        for (const at of aspectPoints(point.lon, aspect)) {
          for (const window of inOrb(body, at, orb, from, to)) {
            pointCache.set(window, at);
            const event: ContactEvent = {
              key: `contact.${body}.${aspect}.${point.target}.${ymd(window.exact[0] ?? window.start)}`,
              kind: "contact",
              body,
              aspect,
              target: point.target,
              orb,
              window,
              house: point.house,
              tone: toneOf({ kind: "contact", body, aspect }),
            };
            if (onDuring(event, from.getTime(), to.getTime())) found.push(event);
          }
        }
      }
    }
  }
  return found.sort(
    (a, b) =>
      a.window.start.getTime() - b.window.start.getTime() ||
      BODY_ORDER.indexOf(a.body) - BODY_ORDER.indexOf(b.body) ||
      TARGET_ORDER.indexOf(a.target) - TARGET_ORDER.indexOf(b.target),
  );
}

/** The signs from the station retrograde's back to the station direct's, as houses, in the order it moves through them. */
function housesBack(startLon: number, endLon: number, houseOfSign: Natal["houseOfSign"]): number[] {
  if (!houseOfSign) return [];
  const houses: number[] = [];
  for (let sign = signOf(startLon); ; sign = (sign + 11) % 12) {
    houses.push(houseOfSign(sign));
    if (sign === signOf(endLon)) return houses;
  }
}

function retrogradesIn(houseOfSign: Natal["houseOfSign"], from: Date, to: Date): RetrogradeEvent[] {
  const found: RetrogradeEvent[] = [];
  const margin = DOCTRINE.retrogradeMargin * DAY;
  for (const body of DOCTRINE.retrogrades) {
    const turns = stations(body, new Date(from.getTime() - margin), new Date(to.getTime() + margin));
    turns.forEach((station, i) => {
      const direct = turns[i + 1];
      if (station.turns !== "retrograde" || direct?.turns !== "direct") return;
      if (!overlaps(station.at, direct.at, from, to)) return;
      found.push({
        key: `retrograde.${body}.-.-.${ymd(station.at)}`,
        kind: "retrograde",
        body,
        start: station.at,
        end: direct.at,
        houses: housesBack(station.lon, direct.lon, houseOfSign),
        tone: toneOf({ kind: "retrograde" }),
      });
    });
  }
  return found.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function nearestPoint(points: NatalPoint[], lon: number): EclipseEvent["near"] {
  let near: EclipseEvent["near"] = null;
  for (const point of points) {
    const orb = Math.abs(arc(lon, point.lon));
    if (orb <= DOCTRINE.eclipseNear && (near === null || orb < near.orb)) near = { target: point.target, orb };
  }
  return near && { target: near.target, orb: round2(near.orb) };
}

function eclipsesIn(natal: Natal, from: Date, to: Date): EclipseEvent[] {
  return eclipses(from, to).map((eclipse): EclipseEvent => {
    const near = nearestPoint(natal.points, eclipse.lon);
    return {
      // The body slot names the body eclipsed, so every key's second part is a body.
      key: `eclipse.${eclipse.kind === "solar" ? "sun" : "moon"}.-.-.${ymd(eclipse.at)}`,
      kind: "eclipse",
      eclipse,
      house: natal.houseOfSign ? natal.houseOfSign(signOf(eclipse.lon)) : null,
      near,
      tone: toneOf({ kind: "eclipse", near }),
    };
  });
}

/**
 * Every event the doctrine names that touches the chart from `from` to `to`:
 * a contact while its planet is within orb, never in a gap between passes; a
 * retrograde between its stations; an eclipse at its greatest. Contacts come
 * first, the day contacts the page draws (ADR-251), then retrogrades, then
 * eclipses, each in time order. A contact's window is whole even where it runs
 * past the range, so its key is the same from any range that meets it.
 */
export function skyEvents(chart: NatalChartData, from: Date, to: Date): SkyEvent[] {
  const natal = natalOf(chart);
  return [...contactsIn(natal.points, from, to), ...retrogradesIn(natal.houseOfSign, from, to), ...eclipsesIn(natal, from, to)];
}

/**
 * The events in effect on the day that starts at `day` (the reader's local
 * midnight) and lasts 24 hours, by the same rules as `skyEvents`.
 */
export function inEffect<E extends SkyEvent>(events: readonly E[], day: Date): E[] {
  const dayStart = day.getTime();
  const dayEnd = dayStart + DAY;
  return events.filter((event) => {
    switch (event.kind) {
      case "contact":
        return onDuring(event, dayStart, dayEnd - 1);
      case "retrograde":
        return event.start.getTime() < dayEnd && event.end.getTime() >= dayStart;
      case "eclipse":
        return event.eclipse.at.getTime() >= dayStart && event.eclipse.at.getTime() < dayEnd;
    }
  });
}

/**
 * Whether an event gets a reading (reading 7, ADR-207, 210): every contact, a
 * retrograde crossing a known house, an eclipse near a natal point.
 */
export function readsAs(event: SkyEvent): boolean {
  switch (event.kind) {
    case "contact":
      return true;
    case "retrograde":
      return event.houses.length > 0;
    case "eclipse":
      return event.near !== null;
  }
}
