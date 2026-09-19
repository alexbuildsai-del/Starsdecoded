// Natal chart calculation using astronomy-engine (Don Cross)
// Pure JS, no native deps. Truncated VSOP87 series plus USNO NOVAS C 3.1 methods,
// verified against NASA JPL Horizons; accurate to within ~1 arcminute.
import * as AstronomyModule from "astronomy-engine";

// astronomy-engine ships a CJS build with named exports (what esbuild bundles
// for production) and an ESM build that exposes only a default object (what
// Node's native loader picks, e.g. under the test runner). Accept either.
const Astronomy: typeof AstronomyModule =
  (AstronomyModule as unknown as { default?: typeof AstronomyModule }).default ?? AstronomyModule;

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const ELEMENTS: Record<string, "fire" | "earth" | "air" | "water"> = {
  Aries: "fire", Leo: "fire", Sagittarius: "fire",
  Taurus: "earth", Virgo: "earth", Capricorn: "earth",
  Gemini: "air", Libra: "air", Aquarius: "air",
  Cancer: "water", Scorpio: "water", Pisces: "water",
};

const MODALITIES: Record<string, "cardinal" | "fixed" | "mutable"> = {
  Aries: "cardinal", Cancer: "cardinal", Libra: "cardinal", Capricorn: "cardinal",
  Taurus: "fixed", Leo: "fixed", Scorpio: "fixed", Aquarius: "fixed",
  Gemini: "mutable", Virgo: "mutable", Sagittarius: "mutable", Pisces: "mutable",
};

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

function getSign(absoluteDegree: number): string {
  return SIGNS[Math.floor(normalizeAngle(absoluteDegree) / 30) % 12];
}

function getDegreeInSign(absoluteDegree: number): number {
  return normalizeAngle(absoluteDegree) % 30;
}

// Geocentric ecliptic longitude of a planet (apparent, with aberration)
function geocentricLongitude(body: AstronomyModule.Body, date: Date): number {
  const vec = Astronomy.GeoVector(body, date, true);
  return Astronomy.Ecliptic(vec).elon;
}

// Daily speed (degrees / day) by sampling positions 1 day apart, signed (negative = retrograde)
function planetSpeed(body: AstronomyModule.Body, date: Date): number {
  const dt = 0.5; // half-day on each side (1 day baseline)
  const before = new Date(date.getTime() - dt * 86400_000);
  const after = new Date(date.getTime() + dt * 86400_000);
  const lonA = geocentricLongitude(body, before);
  const lonB = geocentricLongitude(body, after);
  let diff = lonB - lonA;
  if (diff > 180) diff -= 360;
  else if (diff < -180) diff += 360;
  return diff;
}

function moonLongitude(date: Date): number {
  return Astronomy.EclipticGeoMoon(date).lon;
}

function moonSpeed(date: Date): number {
  const dt = 0.5;
  const before = new Date(date.getTime() - dt * 86400_000);
  const after = new Date(date.getTime() + dt * 86400_000);
  const lonA = moonLongitude(before);
  const lonB = moonLongitude(after);
  let diff = lonB - lonA;
  if (diff > 180) diff -= 360;
  else if (diff < -180) diff += 360;
  return diff;
}

// True obliquity of the ecliptic at a given date (mean + nutation, simplified mean)
function meanObliquity(date: Date): number {
  const T = Astronomy.MakeTime(date).tt / 36525;
  return 23.43929111 - (46.8150 / 3600) * T - (0.00059 / 3600) * T * T + (0.001813 / 3600) * T * T * T;
}

// Greenwich Mean Sidereal Time (degrees) using astronomy-engine
function greenwichSiderealTimeDeg(date: Date): number {
  return Astronomy.SiderealTime(date) * 15;
}

// Ascendant from LST + latitude + obliquity (Meeus Astronomical Algorithms, ch 13)
function calcAscendant(lstDeg: number, latitude: number, obliquity: number): number {
  const lstR = lstDeg * DEG;
  const latR = latitude * DEG;
  const epsR = obliquity * DEG;

  const numerator = Math.cos(lstR);
  const denominator = -(Math.sin(lstR) * Math.cos(epsR) + Math.tan(latR) * Math.sin(epsR));
  let asc = Math.atan2(numerator, denominator) * RAD;
  return normalizeAngle(asc);
}

// Midheaven (MC) from LST + obliquity
function calcMidheaven(lstDeg: number, obliquity: number): number {
  const lstR = lstDeg * DEG;
  const epsR = obliquity * DEG;
  const mc = Math.atan2(Math.sin(lstR), Math.cos(lstR) * Math.cos(epsR)) * RAD;
  return normalizeAngle(mc);
}

// Mean lunar node (true mean north node, IAU 1980)
function calcMeanNorthNode(date: Date): number {
  const T = Astronomy.MakeTime(date).tt / 36525;
  return normalizeAngle(
    125.04452
    - 1934.136261 * T
    + 0.0020708 * T * T
    + (T * T * T) / 450000,
  );
}

// Whole-sign house: which whole sign is the planet in, counting from Asc's sign as house 1
function calcWholeSignHouse(planetLon: number, ascendantLon: number): number {
  const ascSignIndex = Math.floor(normalizeAngle(ascendantLon) / 30);
  const planetSignIndex = Math.floor(normalizeAngle(planetLon) / 30);
  const diff = (planetSignIndex - ascSignIndex + 12) % 12;
  return diff + 1;
}

// House cusps using whole-sign system (each sign starts a new house)
function calcHouseCusps(ascendantLon: number): Record<string, { sign: string; degree: number }> {
  const houses: Record<string, { sign: string; degree: number }> = {};
  const ascSignIndex = Math.floor(normalizeAngle(ascendantLon) / 30);
  for (let i = 1; i <= 12; i++) {
    const cuspSignIndex = (ascSignIndex + i - 1) % 12;
    houses[i.toString()] = {
      sign: SIGNS[cuspSignIndex],
      degree: 0, // Whole sign cusps always at 0° of the sign
    };
  }
  return houses;
}

// Aspects between planets
interface AspectData {
  planet1: string;
  planet2: string;
  type: string;
  orb: number;
  applying: boolean;
}

/** Orb allowances in degrees, stated in every report's methodology box. */
export const ASPECT_ORBS = { conjunction: 8, opposition: 8, square: 6, trine: 6, sextile: 4 } as const;
export const EPHEMERIS = "astronomy-engine (Don Cross), tropical zodiac, mean lunar node";

/** Separation of two longitudes, 0 to 180. */
function separation(a: number, b: number): number {
  const d = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return d > 180 ? 360 - d : d;
}

/**
 * The Moon's aspects widen to its travel across a birth-time band: an aspect
 * holds if any point of the arc the Moon covered is within orb, and the orb
 * reported is the closest that arc comes.
 */
function calcAspects(positions: Record<string, number>, bands: Record<string, DegreeBand | undefined> = {}): AspectData[] {
  const aspectDefs = [
    { name: "conjunction", angle: 0, orb: ASPECT_ORBS.conjunction },
    { name: "opposition", angle: 180, orb: ASPECT_ORBS.opposition },
    { name: "square", angle: 90, orb: ASPECT_ORBS.square },
    { name: "trine", angle: 120, orb: ASPECT_ORBS.trine },
    { name: "sextile", angle: 60, orb: ASPECT_ORBS.sextile },
  ];

  const aspects: AspectData[] = [];
  const planets = Object.keys(positions);
  const samples = (name: string): number[] => {
    const band = bands[name];
    if (!band) return [positions[name]];
    const span = normalizeAngle(band.toDegree - band.fromDegree);
    const arc = span > 180 ? span - 360 : span;
    const n = Math.max(1, Math.ceil(Math.abs(arc) / 0.5));
    return Array.from({ length: n + 1 }, (_, k) => normalizeAngle(band.fromDegree + (arc * k) / n));
  };

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];
      const lon1 = positions[p1];
      const lon2 = positions[p2];
      const s1 = samples(p1), s2 = samples(p2);

      for (const aspect of aspectDefs) {
        let orb = Infinity;
        for (const a of s1) for (const b of s2) orb = Math.min(orb, Math.abs(separation(a, b) - aspect.angle));
        if (orb <= aspect.orb) {
          aspects.push({
            planet1: p1,
            planet2: p2,
            type: aspect.name,
            orb: Math.round(orb * 10) / 10,
            applying: lon1 < lon2,
          });
        }
      }
    }
  }

  return aspects;
}

/**
 * Bump when a field is added to NatalChartData so cached charts on profiles
 * are recomputed on next use (see profiles.ts). 3: the horizon status and the
 * birth-time band (ADR-33, ADR-34).
 */
export const CHART_VERSION = 3;

export type HorizonStatus = "known" | "approximate" | "unknown";

/**
 * One fact the birth hour decides, swept across the birth-time band at
 * two-minute steps. `value` is the centre time's; `holds` says it never
 * changed across the band; `flipsAt` are the local times inside the band at
 * which it changed, `values` the sequence it took. `holdsFrom` and `holdsTo`
 * bound the centre value's run within the birth day, for the readout.
 */
export interface HorizonFact {
  value: string;
  holds: boolean;
  flipsAt: string[];
  values: string[];
  holdsFrom: string;
  holdsTo: string;
}

export interface Horizon {
  status: HorizonStatus;
  ascendant: HorizonFact;
  midheaven: HorizonFact;
  sect: HorizonFact;
  moonSign: HorizonFact;
  sunSign: HorizonFact;
}

/** The arc a body covered across the birth-time band, absolute degrees. */
export interface DegreeBand {
  fromDegree: number;
  toDegree: number;
}

export interface PlanetPlacement {
  sign: string;
  degree: number;
  absoluteDegree: number;
  /** Whole-sign house. Absent when the horizon is unknown: there is no house to be in. */
  house?: number;
  retrograde: boolean;
  speed: number;
  /** Sun and Moon only, when the birth time is a band: where the body was at its two ends. */
  band?: DegreeBand;
}

export interface AngleData { sign: string; degree: number; absoluteDegree: number }

/**
 * A chart whose horizon is unknown carries no `angles`, `houses`,
 * `sunAltitude` or `hemisphereEmphasis` and no `house` on any body: they are
 * absent, not zero, so no consumer can read a house that does not exist
 * (R-4.6).
 */
export interface NatalChartData {
  chartVersion: number;
  datetimeUtc: string;
  julianDay: number;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  /** IANA zone the offset was derived from, when the profile carries one. */
  timezone?: string;
  /** Half-width of the birth-time band in minutes: 0 exact, 180 part of day, 720 unknown. */
  windowMinutes: number;
  horizon: Horizon;
  planets: Record<string, PlanetPlacement>;
  angles?: {
    ascendant: AngleData;
    midheaven: AngleData;
    descendant: AngleData;
    ic: AngleData;
  };
  houses?: Record<string, { sign: string; degree: number }>;
  aspects: AspectData[];
  elements: { fire: number; earth: number; air: number; water: number };
  modalities: { cardinal: number; fixed: number; mutable: number };
  dominance: {
    dominantPlanets: string[];
    dominantElement: string;
    dominantModality: string;
  };
  chartShape: string | null;
  hemisphereEmphasis?: {
    northern: number;
    southern: number;
    eastern: number;
    western: number;
  };
  /**
   * True altitude of the Sun's geometric centre at birth, in degrees, with no
   * refraction and no upper-limb convention. Positive is above the horizon.
   * The single input to sect. Absent when the horizon is unknown.
   */
  sunAltitude?: number;
}

/** A chart whose horizon holds: the angles and houses are present and typed so. */
export type DrawnChartData = NatalChartData & {
  angles: NonNullable<NatalChartData["angles"]>;
  houses: NonNullable<NatalChartData["houses"]>;
  sunAltitude: number;
};

export function hasHorizon(chart: NatalChartData): chart is DrawnChartData {
  return chart.angles !== undefined && chart.houses !== undefined && chart.sunAltitude !== undefined;
}

interface RawPosition {
  lon: number;
  speed: number;
  retrograde: boolean;
}

// ---------------------------------------------------------------------------
// The offset in force at birth (MB-48)
// ---------------------------------------------------------------------------

/** Hours east of UTC that `zone` kept at `instant`, from the platform's tz database, seconds kept. */
function zoneOffsetAt(zone: string, instant: Date): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hourCycle: "h23", era: "short",
    year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  });
  const parts: Record<string, string> = {};
  for (const p of f.formatToParts(instant)) if (p.type !== "literal") parts[p.type] = p.value;
  let year = Number(parts.year);
  if (parts.era && /^B/.test(parts.era)) year = 1 - year;
  const wall = new Date(0);
  wall.setUTCFullYear(year, Number(parts.month) - 1, Number(parts.day));
  wall.setUTCHours(Number(parts.hour) % 24, Number(parts.minute), Number(parts.second), 0);
  return (wall.getTime() - instant.getTime()) / 3600_000;
}

/**
 * The offset a wall-clock birth time had in `zone` on that date: summer time
 * on a summer birth, local mean time before standard time, fractions unrounded
 * (Warsaw 1867 is +1:24, so 1.4). Two rounds settle a guess made from the wall
 * clock into the instant it names.
 */
export function offsetAtBirth(zone: string, birthDate: string, birthTime: string): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour, minute] = birthTime.split(":").map(Number);
  const wall = new Date(0);
  wall.setUTCFullYear(year, month - 1, day);
  wall.setUTCHours(hour, minute, 0, 0);
  const first = zoneOffsetAt(zone, wall);
  const second = zoneOffsetAt(zone, new Date(wall.getTime() - first * 3600_000));
  return zoneOffsetAt(zone, new Date(wall.getTime() - second * 3600_000));
}

// ---------------------------------------------------------------------------
// The horizon as a status (ADR-33, ADR-34)
// ---------------------------------------------------------------------------

/** Minutes between sweep steps. Every flip time the product shows is on this grid. */
const SWEEP_STEP_MINUTES = 2;
const MINUTES_IN_DAY = 24 * 60;

/** Sign of the Sun and of the Moon at a UTC instant: the only two bodies that can change sign inside a day. */
function luminarySigns(date: Date): { sun: string; moon: string } {
  return { sun: getSign(geocentricLongitude(Astronomy.Body.Sun, date)), moon: getSign(moonLongitude(date)) };
}

function sunAltitudeAt(date: Date, observer: AstronomyModule.Observer): number {
  const eq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
  return Astronomy.Horizon(date, observer, eq.ra, eq.dec).altitude;
}

function hhmm(minuteOfDay: number): string {
  const m = Math.min(Math.max(minuteOfDay, 0), MINUTES_IN_DAY - 1);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

interface SweepPoint { minute: number; asc: string; mc: string; sect: string; moon: string; sun: string }

/**
 * Sweep the birth day around the centre time at two-minute steps. The band is
 * always sampled in full; outside it the sweep continues only as far as it
 * takes to see the centre value change, which bounds the readout's "holds
 * from ... to ...". A Sun or Moon far enough from a sign edge that it cannot
 * cross it in a day is read once and never re-sampled.
 */
function sweepHorizon(
  dayStartUtc: number,
  centreMinute: number,
  windowMinutes: number,
  latitude: number,
  longitude: number,
): Horizon {
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  const centreDate = new Date(dayStartUtc + centreMinute * 60_000);
  const sunLonCentre = normalizeAngle(geocentricLongitude(Astronomy.Body.Sun, centreDate));
  const moonLonCentre = normalizeAngle(moonLongitude(centreDate));
  // The Sun moves under 1.1° a day and the Moon under 15.5°, both forward. A
  // body that cannot reach a sign edge before the day's ends is read once.
  const back = centreMinute / MINUTES_IN_DAY, ahead = 1 - back;
  const cannotCross = (lon: number, dailyMotion: number) => {
    const d = getDegreeInSign(lon);
    return d - dailyMotion * back > 0.05 && d + dailyMotion * ahead < 29.95;
  };
  const sunFixed = cannotCross(sunLonCentre, 1.1);
  const moonFixed = cannotCross(moonLonCentre, 15.5);
  const fixedSun = getSign(sunLonCentre);
  const fixedMoon = getSign(moonLonCentre);

  const cache = new Map<number, SweepPoint>();
  const at = (minute: number): SweepPoint => {
    const hit = cache.get(minute);
    if (hit) return hit;
    const date = new Date(dayStartUtc + minute * 60_000);
    const lst = normalizeAngle(greenwichSiderealTimeDeg(date) + longitude);
    const obliquity = meanObliquity(date);
    const lum = sunFixed && moonFixed ? { sun: fixedSun, moon: fixedMoon } : luminarySigns(date);
    const point: SweepPoint = {
      minute,
      asc: getSign(calcAscendant(lst, latitude, obliquity)),
      mc: getSign(calcMidheaven(lst, obliquity)),
      sect: sunAltitudeAt(date, observer) > 0 ? "day" : "night",
      moon: moonFixed ? fixedMoon : lum.moon,
      sun: sunFixed ? fixedSun : lum.sun,
    };
    cache.set(minute, point);
    return point;
  };

  const bandStart = Math.max(0, centreMinute - windowMinutes);
  const bandEnd = Math.min(MINUTES_IN_DAY - 1, centreMinute + windowMinutes);
  const band: SweepPoint[] = [];
  for (let m = centreMinute; m >= bandStart; m -= SWEEP_STEP_MINUTES) band.unshift(at(m));
  for (let m = centreMinute + SWEEP_STEP_MINUTES; m <= bandEnd; m += SWEEP_STEP_MINUTES) band.push(at(m));
  const centre = at(centreMinute);

  const fact = (key: keyof Omit<SweepPoint, "minute">): HorizonFact => {
    const value = centre[key];
    const flipsAt: string[] = [];
    const values: string[] = [band[0][key]];
    for (let i = 1; i < band.length; i++) {
      if (band[i][key] !== band[i - 1][key]) {
        flipsAt.push(hhmm(band[i].minute));
        values.push(band[i][key]);
      }
    }
    // The centre value's run within the day: back to the flip into it, forward to the flip out of it.
    let from = centreMinute;
    while (from - SWEEP_STEP_MINUTES >= 0 && at(from - SWEEP_STEP_MINUTES)[key] === value) from -= SWEEP_STEP_MINUTES;
    let to = centreMinute;
    while (to + SWEEP_STEP_MINUTES < MINUTES_IN_DAY && at(to + SWEEP_STEP_MINUTES)[key] === value) to += SWEEP_STEP_MINUTES;
    const toEdge = to + SWEEP_STEP_MINUTES >= MINUTES_IN_DAY;
    return {
      value,
      holds: flipsAt.length === 0,
      flipsAt,
      values,
      holdsFrom: hhmm(from),
      holdsTo: toEdge ? "24:00" : hhmm(to + SWEEP_STEP_MINUTES),
    };
  };

  const ascendant = fact("asc");
  const midheaven = fact("mc");
  const sect = fact("sect");
  const moonSign = fact("moon");
  const sunSign = fact("sun");
  const allHold = ascendant.holds && midheaven.holds && sect.holds;
  const status: HorizonStatus = windowMinutes === 0 ? "known" : allHold ? "approximate" : "unknown";
  return { status, ascendant, midheaven, sect, moonSign, sunSign };
}

/** The sign covering the larger share of a swept band, when the centre sign is not the whole of it. */
function majoritySign(values: string[], flipsAt: string[], bandStart: number, bandEnd: number): string {
  if (values.length === 1) return values[0];
  const edges = [bandStart, ...flipsAt.map((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))), bandEnd + SWEEP_STEP_MINUTES];
  let best = values[0], bestSpan = -1;
  values.forEach((v, i) => {
    const span = edges[i + 1] - edges[i];
    if (span > bestSpan) { best = v; bestSpan = span; }
  });
  return best;
}

/**
 * The natal chart for a birth date, a birth time that may be a band, and a
 * place. `offsetOrZone` is hours east of UTC, or an IANA zone name from which
 * the offset in force at that instant is derived. `windowMinutes` is the
 * band's half-width around `birthTime`: 0 exact, 180 a part of the day, 720
 * unknown. The horizon is swept and recorded; when it does not hold, the
 * chart carries no angle or house at all.
 */
export function calculateNatalChart(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number,
  offsetOrZone: number | string,
  windowMinutes = 0,
): NatalChartData {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour, minute] = birthTime.split(":").map(Number);
  const timezone = typeof offsetOrZone === "string" ? offsetOrZone : undefined;
  const timezoneOffset = typeof offsetOrZone === "string" ? offsetAtBirth(offsetOrZone, birthDate, birthTime) : offsetOrZone;

  // Convert local birth time → UTC instant
  // timezoneOffset is hours east of UTC (e.g. CEST = +2)
  const dayStart = new Date(0);
  dayStart.setUTCFullYear(year, month - 1, day);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayStartUtc = dayStart.getTime() - timezoneOffset * 3600_000;
  const centreMinute = hour * 60 + minute;
  const utcMillis = dayStartUtc + centreMinute * 60_000;
  const date = new Date(utcMillis);

  const horizon = sweepHorizon(dayStartUtc, centreMinute, windowMinutes, latitude, longitude);
  const drawn = horizon.status !== "unknown";
  const bandStart = Math.max(0, centreMinute - windowMinutes);
  const bandEnd = Math.min(MINUTES_IN_DAY - 1, centreMinute + windowMinutes);

  const julianDay = Astronomy.MakeTime(date).tt + 2451545.0;

  // Planet bodies (geocentric)
  const bodyMap: Record<string, AstronomyModule.Body> = {
    sun: Astronomy.Body.Sun,
    mercury: Astronomy.Body.Mercury,
    venus: Astronomy.Body.Venus,
    mars: Astronomy.Body.Mars,
    jupiter: Astronomy.Body.Jupiter,
    saturn: Astronomy.Body.Saturn,
    uranus: Astronomy.Body.Uranus,
    neptune: Astronomy.Body.Neptune,
    pluto: Astronomy.Body.Pluto,
  };

  const rawPlanets: Record<string, RawPosition> = {};

  for (const [name, body] of Object.entries(bodyMap)) {
    const lon = geocentricLongitude(body, date);
    const speed = planetSpeed(body, date);
    rawPlanets[name] = {
      lon: normalizeAngle(lon),
      speed,
      retrograde: speed < 0,
    };
  }

  // Moon (uses dedicated function)
  {
    const lon = moonLongitude(date);
    const speed = moonSpeed(date);
    rawPlanets.moon = {
      lon: normalizeAngle(lon),
      speed,
      retrograde: false, // Moon is never retrograde
    };
  }

  // Chiron — astronomy-engine doesn't include it; fall back to a calibrated mean approximation
  // Period ~50.42y, mean longitude formula derived from JPL elements at J2000
  {
    const T = Astronomy.MakeTime(date).tt / 36525;
    // Heliocentric mean longitude of Chiron at J2000 ~ 226.7°, mean motion ~7.142°/year (geocentric approx)
    // Use simplified geocentric approximation by sampling difference between heliocentric and Earth's position
    const earthHelio = Astronomy.HelioVector(Astronomy.Body.Earth, date);
    // Simplified Chiron position (mean elements): a=13.71 AU, e=0.383, i=6.93°, Ω=209.4°, ω=339.4°, M0=187.4° at J2000
    // For the natal-chart use case (sign + house) a low-precision Keplerian solve is sufficient
    const a = 13.7081;
    const e = 0.38255;
    const inc = 6.9359 * DEG;
    const Omega = 209.4144 * DEG;
    const argPeri = 339.4143 * DEG;
    const M0 = 187.4119 * DEG;
    const n = (2 * Math.PI) / (50.42 * 365.25); // rad/day mean motion
    const daysSinceJ2000 = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400_000;
    let M = M0 + n * daysSinceJ2000;
    M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    // Solve Kepler's equation
    let E = M;
    for (let k = 0; k < 8; k++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    const x = a * (Math.cos(E) - e);
    const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
    // Rotate to ecliptic
    const cosO = Math.cos(Omega), sinO = Math.sin(Omega);
    const cosI = Math.cos(inc), sinI = Math.sin(inc);
    const cosW = Math.cos(argPeri), sinW = Math.sin(argPeri);
    const xEcl = (cosW * cosO - sinW * sinO * cosI) * x + (-sinW * cosO - cosW * sinO * cosI) * y;
    const yEcl = (cosW * sinO + sinW * cosO * cosI) * x + (-sinW * sinO + cosW * cosO * cosI) * y;
    const zEcl = (sinW * sinI) * x + (cosW * sinI) * y;
    // Geocentric: subtract Earth's heliocentric position
    const dx = xEcl - earthHelio.x;
    const dy = yEcl - earthHelio.y;
    const dz = zEcl - earthHelio.z;
    let lonChiron = Math.atan2(dy, dx) * RAD;
    lonChiron = normalizeAngle(lonChiron);
    rawPlanets.chiron = {
      lon: lonChiron,
      speed: 0.038, // approximate mean motion deg/day
      retrograde: false,
    };
  }

  // Mean lunar nodes
  const northNodeLon = calcMeanNorthNode(date);
  const southNodeLon = normalizeAngle(northNodeLon + 180);
  rawPlanets.north_node = { lon: northNodeLon, speed: -0.053, retrograde: true };
  rawPlanets.south_node = { lon: southNodeLon, speed: -0.053, retrograde: true };

  // Sidereal time + Asc/MC
  const gmst = greenwichSiderealTimeDeg(date);
  const lst = normalizeAngle(gmst + longitude);
  const obliquity = meanObliquity(date);
  const ascLon = calcAscendant(lst, latitude, obliquity);
  const mcLon = calcMidheaven(lst, obliquity);
  const descLon = normalizeAngle(ascLon + 180);
  const icLon = normalizeAngle(mcLon + 180);

  // The Sun and Moon across the band: where each was at the two ends. A sign
  // change inside the band reads as the sign covering the larger share; the
  // degree stays the centre time's.
  const bands: Record<string, DegreeBand | undefined> = {};
  if (windowMinutes > 0) {
    const from = new Date(dayStartUtc + bandStart * 60_000);
    const to = new Date(dayStartUtc + bandEnd * 60_000);
    bands.sun = { fromDegree: r2(normalizeAngle(geocentricLongitude(Astronomy.Body.Sun, from))), toDegree: r2(normalizeAngle(geocentricLongitude(Astronomy.Body.Sun, to))) };
    bands.moon = { fromDegree: r2(normalizeAngle(moonLongitude(from))), toDegree: r2(normalizeAngle(moonLongitude(to))) };
  }
  const signOverride: Record<string, string> = {
    sun: majoritySign(horizon.sunSign.values, horizon.sunSign.flipsAt, bandStart, bandEnd),
    moon: majoritySign(horizon.moonSign.values, horizon.moonSign.flipsAt, bandStart, bandEnd),
  };

  // Build planet objects, with whole-sign house assignments only when there is a horizon to count from.
  const planets: NatalChartData["planets"] = {};
  for (const [name, pos] of Object.entries(rawPlanets)) {
    planets[name] = {
      sign: signOverride[name] ?? getSign(pos.lon),
      degree: r2(getDegreeInSign(pos.lon)),
      absoluteDegree: r2(pos.lon),
      ...(drawn ? { house: calcWholeSignHouse(pos.lon, ascLon) } : {}),
      retrograde: pos.retrograde,
      speed: Math.round(pos.speed * 1000) / 1000,
      ...(bands[name] ? { band: bands[name] } : {}),
    };
  }

  // Whole-sign house cusps and the angles, only when the horizon holds.
  const houses = drawn ? calcHouseCusps(ascLon) : undefined;
  const angles: NatalChartData["angles"] | undefined = drawn ? {
    ascendant: { sign: getSign(ascLon), degree: r2(getDegreeInSign(ascLon)), absoluteDegree: r2(ascLon) },
    midheaven: { sign: getSign(mcLon), degree: r2(getDegreeInSign(mcLon)), absoluteDegree: r2(mcLon) },
    descendant: { sign: getSign(descLon), degree: r2(getDegreeInSign(descLon)), absoluteDegree: r2(descLon) },
    ic: { sign: getSign(icLon), degree: r2(getDegreeInSign(icLon)), absoluteDegree: r2(icLon) },
  } : undefined;

  // Sun altitude (geometric centre, no refraction) for sect.
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  const sunAltitude = drawn ? r2(sunAltitudeAt(date, observer)) : undefined;

  // Aspects (only for main 10 planets)
  const mainPlanets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  const mainPlanetLons: Record<string, number> = {};
  for (const name of mainPlanets) {
    mainPlanetLons[name] = rawPlanets[name].lon;
  }
  const aspects = calcAspects(mainPlanetLons, bands);

  // Element and modality distribution
  const elements = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalities = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const name of mainPlanets) {
    const sign = planets[name].sign;
    const el = ELEMENTS[sign];
    const mod = MODALITIES[sign];
    if (el) elements[el]++;
    if (mod) modalities[mod]++;
  }
  const dominantElement = Object.entries(elements).sort(([, a], [, b]) => b - a)[0][0];
  const dominantModality = Object.entries(modalities).sort(([, a], [, b]) => b - a)[0][0];

  // Dominant planets — those in angular houses (1, 4, 7, 10); a blind chart has none to count.
  const angularHouses = [1, 4, 7, 10];
  const dominantPlanets = mainPlanets
    .filter((p) => angularHouses.includes(planets[p].house ?? 0))
    .slice(0, 3);
  if (dominantPlanets.length === 0) dominantPlanets.push("sun");

  // Hemisphere emphasis, a count of houses, so only with a horizon.
  let hemisphereEmphasis: NatalChartData["hemisphereEmphasis"];
  if (drawn) {
    hemisphereEmphasis = { northern: 0, southern: 0, eastern: 0, western: 0 };
    for (const name of mainPlanets) {
      const h = planets[name].house ?? 0;
      if (h >= 7 && h <= 12) hemisphereEmphasis.southern++;
      else hemisphereEmphasis.northern++;
      if (h >= 1 && h <= 6) hemisphereEmphasis.eastern++;
      else hemisphereEmphasis.western++;
    }
  }

  // Chart shape (simplified — biggest gap in planetary distribution)
  const allLons = mainPlanets.map((p) => rawPlanets[p].lon).sort((a, b) => a - b);
  const maxGap = Math.max(...allLons.map((lon, i) => {
    const next = allLons[(i + 1) % allLons.length];
    const gap = i === allLons.length - 1 ? allLons[0] + 360 - lon : next - lon;
    return gap;
  }));
  let chartShape = "splash";
  if (maxGap > 180) chartShape = "bowl";
  else if (maxGap > 120) chartShape = "bundle";
  else if (maxGap > 60) chartShape = "locomotive";

  return {
    chartVersion: CHART_VERSION,
    ...(sunAltitude !== undefined ? { sunAltitude } : {}),
    datetimeUtc: date.toISOString(),
    julianDay: Math.round(julianDay * 10000) / 10000,
    latitude,
    longitude,
    timezoneOffset,
    ...(timezone ? { timezone } : {}),
    windowMinutes,
    horizon,
    planets,
    ...(angles ? { angles } : {}),
    ...(houses ? { houses } : {}),
    aspects,
    elements,
    modalities,
    dominance: {
      dominantPlanets,
      dominantElement,
      dominantModality,
    },
    chartShape,
    ...(hemisphereEmphasis ? { hemisphereEmphasis } : {}),
  };
}
