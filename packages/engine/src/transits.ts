/**
 * The sky search under Timeline and its page (ADR-208, 251): where a body is at any instant, and when it reaches a
 * point. Positions only, with no place and no horizon sweep, so an instant costs one ephemeris call (MB-125's path)
 * and the browser can run it: nothing here touches a Node API or the network. Every instant returned is a whole
 * UTC minute.
 */
import * as AstronomyModule from "astronomy-engine";

// Same guard as chartCalculation.ts: the CJS build has named exports, Node's own ESM loader only a default object.
const Astronomy: typeof AstronomyModule =
  (AstronomyModule as unknown as { default?: typeof AstronomyModule }).default ?? AstronomyModule;

export type SkyBody =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "north_node";

export const SKY_BODIES: readonly SkyBody[] = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "north_node",
];

/** From first entering the orb to last leaving it; a passage a retrograde splits stays one window. */
export interface InOrb {
  start: Date;
  end: Date;
  exact: Date[];
}

export interface Station {
  body: SkyBody;
  at: Date;
  turns: "retrograde" | "direct";
  lon: number;
}

export interface Ingress {
  body: SkyBody;
  at: Date;
  /** The sign entered, named as a chart names it. */
  sign: string;
  retrograde: boolean;
}

export interface Eclipse {
  kind: "solar" | "lunar";
  /** Greatest eclipse. */
  at: Date;
  /** Where the eclipsed body stands then: the Sun for a solar eclipse, the Moon for a lunar one. */
  lon: number;
}

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

const PLANETS: Record<Exclude<SkyBody, "moon" | "north_node">, AstronomyModule.Body> = {
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

/**
 * Degrees a day no body exceeds, either way: the engine's own fastest from 1600 to 2400, sampled every half day,
 * with room above it. A scan may skip every day on which the body could not reach the next point even at this
 * speed, which is what keeps a 90-year search quick without missing anything a daily scan would find.
 */
const TOP_SPEED: Record<SkyBody, number> = {
  sun: 1.07,
  moon: 16,
  mercury: 2.4,
  venus: 1.35,
  mars: 0.85,
  jupiter: 0.26,
  saturn: 0.14,
  uranus: 0.07,
  neptune: 0.042,
  pluto: 0.045,
  north_node: 0.055,
};

/**
 * The most days a body spends outside an orb between two passes of one window. To come back on the side it left by
 * it must turn round, so the gap falls within one retrograde and its shadow on one side: the engine's longest such
 * spell from 1800 to 2150, with a fifth more. The Sun and Moon never turn back and the mean node never turns
 * forward, so they have no such gap.
 */
const TURN_GAP_DAYS: Record<SkyBody, number> = {
  sun: 0,
  moon: 0,
  north_node: 0,
  mercury: 52,
  venus: 93,
  mars: 179,
  jupiter: 256,
  saturn: 288,
  uranus: 315,
  neptune: 328,
  pluto: 348,
};

/** Under a quarter of each body's shortest retrograde, 1800 to 2150: a turn and the turn back never share a step. */
const STATION_STEP_DAYS: Partial<Record<SkyBody, number>> = {
  mercury: 4,
  venus: 8,
  mars: 12,
  jupiter: 24,
  saturn: 24,
  uranus: 24,
  neptune: 24,
  pluto: 24,
};

const norm = (deg: number): number => ((deg % 360) + 360) % 360;
/** A signed arc, -180 to 180: how far past a point a longitude lies. */
const arc = (deg: number): number => norm(deg + 180) - 180;
const dayFloor = (ms: number): number => Math.floor(ms / DAY_MS) * DAY_MS;
const dayCeil = (ms: number): number => Math.ceil(ms / DAY_MS) * DAY_MS;
const toMinute = (ms: number): number => Math.round(ms / MINUTE_MS) * MINUTE_MS;

/** The mean node exactly as calculateNatalChart computes it, so a chart's node and Timeline's are the same point. */
function meanNode(at: Date): number {
  const T = Astronomy.MakeTime(at).tt / 36525;
  return norm(125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000);
}

/**
 * Apparent geocentric ecliptic longitude of date, the place a chart reads, computed the way calculateNatalChart
 * computes it; the mean node for `north_node`.
 */
export function longitudeAt(body: SkyBody, at: Date): number {
  if (body === "moon") return norm(Astronomy.EclipticGeoMoon(at).lon);
  if (body === "north_node") return meanNode(at);
  return norm(Astronomy.Ecliptic(Astronomy.GeoVector(PLANETS[body], at, true)).elon);
}

// An hour either side: short enough that a station's time does not lean, long enough to stay clear of rounding.
const SPEED_HALF_SPAN_MS = 3_600_000;

/** Degrees a day, negative while retrograde. */
export function speedAt(body: SkyBody, at: Date): number {
  const t = at.getTime();
  const before = longitudeAt(body, new Date(t - SPEED_HALF_SPAN_MS));
  const after = longitudeAt(body, new Date(t + SPEED_HALF_SPAN_MS));
  return (arc(after - before) * DAY_MS) / (2 * SPEED_HALF_SPAN_MS);
}

/** Where `g` changes sign between `a` and `b`, the bracket halved until it is under a minute. */
function bisect(g: (ms: number) => number, a: number, b: number, ga: number): number {
  while (b - a > MINUTE_MS) {
    const m = a + Math.floor((b - a) / 2);
    const gm = g(m);
    if (gm < 0 === ga < 0) {
      a = m;
      ga = gm;
    } else {
      b = m;
    }
  }
  return (a + b) / 2;
}

/** When `g` rises through zero between `a` and `b`, by astronomy-engine's own search; halving if it gives up. */
function searchRise(g: (ms: number) => number, a: number, b: number): number {
  try {
    const found = Astronomy.Search(
      (t) => g(t.date.getTime()),
      Astronomy.MakeTime(new Date(a)),
      Astronomy.MakeTime(new Date(b)),
      { iter_limit: 60 },
    );
    if (found) return found.date.getTime();
  } catch {
    // It throws a bare string past its iteration limit; the bracket still holds the crossing.
  }
  return bisect(g, a, b, g(a));
}

type Side = -1 | 0 | 1;

/** One stay inside the orb. A side is where the body stood as it crossed the edge; 0 where the scan cut it. */
interface Pass {
  start: number;
  end: number;
  enters: Side;
  leaves: Side;
  exact: number[];
}

const sideOf = (f: number): Side => (f < 0 ? -1 : 1);

/**
 * Every stay within `orb` of `target` between `lo` and `hi`, on a grid of UTC midnights, so two searches over
 * different ranges bracket a crossing by the same day and agree on it to the minute. A day is stepped over only
 * when the body could not reach the target or the orb's edge within it at its top speed. With `orb` 0 each pass is
 * a single exact hit.
 */
function passes(
  body: SkyBody,
  lon: (ms: number) => number,
  target: number,
  orb: number,
  lo: number,
  hi: number,
): Pass[] {
  const top = TOP_SPEED[body];
  const f = (ms: number): number => arc(lon(ms) - target);
  const edge = (ms: number): number => Math.abs(f(ms)) - orb;
  const out: Pass[] = [];
  let t = lo;
  let ft = f(t);
  let open: Pass | null = Math.abs(ft) <= orb ? { start: lo, end: hi, enters: 0, leaves: 0, exact: [] } : null;
  const close = (pass: Pass, at: number, side: Side): void => {
    pass.end = at;
    pass.leaves = side;
    out.push(pass);
    open = null;
  };
  while (t < hi) {
    const room = Math.min(Math.abs(ft), Math.abs(Math.abs(ft) - orb));
    const days = Math.max(1, Math.floor(room / top));
    const u = Math.min(t + days * DAY_MS, hi);
    const fu = f(u);
    if (days === 1) {
      const inAtT = Math.abs(ft) <= orb;
      const inAtU = Math.abs(fu) <= orb;
      // A sign change across a small arc is the target; one across nearly a whole turn is the far side.
      if (ft < 0 !== fu < 0 && Math.abs(fu - ft) < 180) {
        const c = bisect(f, t, u, ft);
        // A fast body can cross the whole orb inside one day; its edges then lie either side of the hit.
        const ec = orb > 0 ? edge(c) : 0;
        let pass = open;
        if (!pass) {
          const enters = ec < 0 ? bisect(edge, t, c, Math.abs(ft) - orb) : c;
          pass = { start: enters, end: hi, enters: sideOf(ft), leaves: 0, exact: [] };
          open = pass;
        }
        pass.exact.push(c);
        if (!inAtU) close(pass, ec < 0 ? bisect(edge, c, u, ec) : c, sideOf(fu));
      } else if (inAtT !== inAtU) {
        const at = bisect(edge, t, u, Math.abs(ft) - orb);
        if (open) close(open, at, sideOf(fu));
        else open = { start: at, end: hi, enters: sideOf(ft), leaves: 0, exact: [] };
      }
    }
    t = u;
    ft = fu;
  }
  if (open) out.push(open);
  return out;
}

interface Passage {
  start: number;
  end: number;
  exact: number[];
  openStart: boolean;
  openEnd: boolean;
  leaves: Side;
}

/** Passes join when the body came back on the side it left by: it turned round in between, so it is one passage. */
function passagesOf(list: Pass[]): Passage[] {
  const out: Passage[] = [];
  for (const pass of list) {
    const last = out[out.length - 1];
    if (last && last.leaves !== 0 && last.leaves === pass.enters) {
      last.end = pass.end;
      last.exact.push(...pass.exact);
      last.leaves = pass.leaves;
      last.openEnd = pass.leaves === 0;
    } else {
      out.push({
        start: pass.start,
        end: pass.end,
        exact: [...pass.exact],
        openStart: pass.enters === 0,
        openEnd: pass.leaves === 0,
        leaves: pass.leaves,
      });
    }
  }
  return out;
}

/** Every instant from `from` to `to` the body stands exactly on `target`: a daily scan, bisected to the minute. */
export function exactHits(body: SkyBody, target: number, from: Date, to: Date): Date[] {
  const a = from.getTime();
  const b = to.getTime();
  if (!(a <= b)) return [];
  return passes(body, (ms) => longitudeAt(body, new Date(ms)), target, 0, dayFloor(a), dayCeil(b))
    .flatMap((pass) => pass.exact)
    .map(toMinute)
    .filter((ms) => ms >= a && ms <= b)
    .map((ms) => new Date(ms));
}

// Far more than any passage needs; reaching it means the orb never closes, which a valid orb cannot do.
const MAX_WIDENINGS = 40;

/**
 * Every window within `orb` of `target` that touches `from` to `to`, each whole: its start, its end and every exact
 * pass are where they really are, outside the range if that is where they fall. The scan widens until no window it
 * keeps could have an earlier or later pass beyond what it has seen.
 */
export function inOrb(body: SkyBody, target: number, orb: number, from: Date, to: Date): InOrb[] {
  if (!(orb > 0 && orb <= 30)) throw new RangeError(`An orb is over 0 and at most 30 degrees, not ${orb}`);
  const a = from.getTime();
  const b = to.getTime();
  if (!(a <= b)) return [];
  const gap = TURN_GAP_DAYS[body] * DAY_MS;
  const widen = Math.max(gap, 60 * DAY_MS);
  // A wider scan steps on the same midnights and halves the same brackets, so each place is computed once.
  const seen = new Map<number, number>();
  const lon = (ms: number): number => {
    let deg = seen.get(ms);
    if (deg === undefined) {
      deg = longitudeAt(body, new Date(ms));
      seen.set(ms, deg);
    }
    return deg;
  };
  let lo = dayFloor(a - gap);
  let hi = dayCeil(b + gap);
  for (let round = 0; round <= MAX_WIDENINGS; round++) {
    const kept = passagesOf(passes(body, lon, target, orb, lo, hi)).filter((w) => w.start <= b && w.end >= a);
    if (kept.length === 0) return [];
    const first = kept[0];
    const last = kept[kept.length - 1];
    const early = first.openStart || first.start - lo < gap;
    const late = last.openEnd || hi - last.end < gap;
    if (!early && !late) {
      return kept.map((w) => ({
        start: new Date(toMinute(w.start)),
        end: new Date(toMinute(w.end)),
        exact: w.exact.map((ms) => new Date(toMinute(ms))),
      }));
    }
    if (early) lo -= widen;
    if (late) hi += widen;
  }
  throw new Error(`No whole window for ${body} within ${orb}° of ${target}°`);
}

/** Every turn between `from` and `to`, found by astronomy-engine's search for the moment the body's speed is zero. */
export function stations(body: SkyBody, from: Date, to: Date): Station[] {
  const step = STATION_STEP_DAYS[body];
  const a = from.getTime();
  const b = to.getTime();
  // The Sun and Moon only ever move forward and the mean node only back: none of them turns.
  if (step === undefined || !(a <= b)) return [];
  const stepMs = step * DAY_MS;
  const speed = (ms: number): number => speedAt(body, new Date(ms));
  const out: Station[] = [];
  let t = Math.floor(a / stepMs) * stepMs;
  let vt = speed(t);
  while (t < b) {
    const u = t + stepMs;
    const vu = speed(u);
    if (vt < 0 !== vu < 0) {
      const turns = vu < 0 ? "retrograde" : "direct";
      const rising = turns === "direct" ? speed : (ms: number) => -speed(ms);
      const ms = toMinute(searchRise(rising, t, u));
      if (ms >= a && ms <= b) out.push({ body, at: new Date(ms), turns, lon: longitudeAt(body, new Date(ms)) });
    }
    t = u;
    vt = vu;
  }
  return out;
}

/** Every move into a new sign between `from` and `to`, found by astronomy-engine's search for the sign's edge. */
export function ingresses(body: SkyBody, from: Date, to: Date): Ingress[] {
  const a = from.getTime();
  const b = to.getTime();
  if (!(a <= b)) return [];
  const top = TOP_SPEED[body];
  const lon = (ms: number): number => longitudeAt(body, new Date(ms));
  const out: Ingress[] = [];
  const end = dayCeil(b);
  let t = dayFloor(a);
  let lt = lon(t);
  while (t < end) {
    const room = Math.min(lt % 30, 30 - (lt % 30));
    const days = Math.max(1, Math.floor(room / top));
    const u = Math.min(t + days * DAY_MS, end);
    const lu = lon(u);
    const before = Math.floor(lt / 30) % 12;
    const after = Math.floor(lu / 30) % 12;
    if (days === 1 && before !== after) {
      const forward = (after - before + 12) % 12 === 1;
      const cusp = (forward ? after : before) * 30;
      const ms = toMinute(searchRise((m) => (forward ? 1 : -1) * arc(lon(m) - cusp), t, u));
      if (ms >= a && ms <= b) out.push({ body, at: new Date(ms), sign: SIGNS[after], retrograde: !forward });
    }
    t = u;
    lt = lu;
  }
  return out;
}

/** Every eclipse whose greatest moment falls between `from` and `to`, in order, from astronomy-engine's searches. */
export function eclipses(from: Date, to: Date): Eclipse[] {
  const a = from.getTime();
  const b = to.getTime();
  if (!(a <= b)) return [];
  const out: Eclipse[] = [];
  // The range is judged on the minute an eclipse is reported at, as stations and ingresses are, so an eclipse is always
  // inside a range that holds its own `at`.
  const keep = (kind: Eclipse["kind"], peak: Date): void => {
    const eclipsed = kind === "solar" ? "sun" : "moon";
    const at = toMinute(peak.getTime());
    if (at >= a && at <= b) out.push({ kind, at: new Date(at), lon: longitudeAt(eclipsed, peak) });
  };
  const last = b + 60_000;
  // The searches start from the new or full moon after the instant given, which can come hours before the eclipse's peak.
  const start = new Date(a - 3 * DAY_MS);
  let lunar = Astronomy.SearchLunarEclipse(start);
  while (lunar.peak.date.getTime() <= last) {
    keep("lunar", lunar.peak.date);
    lunar = Astronomy.NextLunarEclipse(lunar.peak);
  }
  let solar = Astronomy.SearchGlobalSolarEclipse(start);
  while (solar.peak.date.getTime() <= last) {
    keep("solar", solar.peak.date);
    solar = Astronomy.NextGlobalSolarEclipse(solar.peak);
  }
  return out.sort((x, y) => x.at.getTime() - y.at.getTime());
}
