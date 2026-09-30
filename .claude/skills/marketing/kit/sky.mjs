// Every sky fact a post states comes from here, never from memory. Same method as
// api/src/lib/chartCalculation.ts: astronomy-engine (pinned in package.json), tropical,
// true ecliptic of date; the Moon from EclipticGeoMoon.
//
//   node sky.mjs positions 2026-10-05T09:00Z
//   node sky.mjs events 2026-10-01 2026-11-30
//   node sky.mjs moon 1999-12-31T00:00Z 1999-12-31T23:59Z
//   node sky.mjs rising 1999-12-31T06:00Z 1999-12-31T12:00Z 51.5074 -0.1278
//   add --tz Europe/London to print local times too, --json for data
import * as M from "astronomy-engine";

const A = M.default ?? M;
export const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
export const ELEMENTS = ["fire", "earth", "air", "water"];
export const BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const BODY = { sun: A.Body.Sun, mercury: A.Body.Mercury, venus: A.Body.Venus, mars: A.Body.Mars, jupiter: A.Body.Jupiter, saturn: A.Body.Saturn, uranus: A.Body.Uranus, neptune: A.Body.Neptune, pluto: A.Body.Pluto };
const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;

const norm = (d) => ((d % 360) + 360) % 360;
const wrap180 = (d) => (d > 180 ? d - 360 : d < -180 ? d + 360 : d);
export const signOf = (lon) => SIGNS[Math.floor(norm(lon) / 30) % 12];
export const elementOf = (sign) => ELEMENTS[SIGNS.indexOf(sign) % 4];

export function lonOf(body, t) {
  const date = new Date(t);
  if (body === "moon") return norm(A.EclipticGeoMoon(date).lon);
  return norm(A.Ecliptic(A.GeoVector(BODY[body], date, true)).elon);
}

// "8°29′ Scorpio": degrees and whole minutes, as the product's wheel prints them.
export function fmt(lon) {
  const inSign = norm(lon) % 30;
  let deg = Math.floor(inSign), min = Math.round((inSign - deg) * 60);
  if (min === 60) { deg += 1; min = 0; }
  return `${deg}°${String(min).padStart(2, "0")}′ ${signOf(lon)}`;
}

// The product's retrograde flag: longitude 12 h after minus 12 h before.
const speed = (body, t, h = 12 * HOUR) => wrap180(lonOf(body, t + h) - lonOf(body, t - h));

export function positions(t) {
  return Object.fromEntries(BODIES.map((b) => {
    const lon = lonOf(b, t);
    return [b, { lon: Math.round(lon * 1000) / 1000, sign: signOf(lon), text: fmt(lon), retrograde: b !== "sun" && b !== "moon" && speed(b, t) < 0 }];
  }));
}

function bisect(f, a, b, tol = 1000) {
  const fa = f(a);
  while (b - a > tol) { const m = (a + b) / 2; if (f(m) === fa) a = m; else b = m; }
  return b;
}

export function ingresses(body, from, to) {
  const step = body === "moon" ? HOUR : 6 * HOUR, out = [];
  const idx = (t) => Math.floor(lonOf(body, t) / 30);
  for (let t = from; t < to; t += step) {
    const b = Math.min(t + step, to);
    if (idx(t) !== idx(b)) {
      const at = bisect(idx, t, b);
      out.push({ body, at, from: SIGNS[idx(t)], to: SIGNS[idx(b)], retrograde: speed(body, at) < 0 });
    }
  }
  return out;
}

// A station is found to the minute but reported by date: the planet is barely moving, so a time would claim false precision.
export function stations(body, from, to) {
  const out = [], dir = (t) => Math.sign(speed(body, t, 30 * MIN));
  for (let t = from; t < to; t += DAY) {
    if (dir(t) !== dir(t + DAY)) {
      const at = bisect(dir, t, t + DAY, MIN);
      out.push({ body, at, turns: dir(t + DAY) < 0 ? "retrograde" : "direct", text: fmt(lonOf(body, at)) });
    }
  }
  return out;
}

export function lunations(from, to) {
  const out = [];
  for (const [phase, target] of [["New Moon", 0], ["Full Moon", 180]]) {
    let t = new Date(from);
    for (;;) {
      const hit = A.SearchMoonPhase(target, t, (to - t.getTime()) / DAY);
      if (!hit || hit.date.getTime() >= to) break;
      const at = hit.date.getTime();
      out.push({ phase, at, text: fmt(lonOf("moon", at)) });
      t = new Date(at + DAY);
    }
  }
  return out.sort((x, y) => x.at - y.at);
}

export function events(from, to) {
  const slow = BODIES.filter((b) => b !== "moon");
  return [
    ...slow.flatMap((b) => ingresses(b, from, to).map((e) => ({ kind: "ingress", ...e }))),
    ...slow.filter((b) => b !== "sun").flatMap((b) => stations(b, from, to).map((e) => ({ kind: "station", ...e }))),
    ...lunations(from, to).map((e) => ({ kind: "lunation", ...e })),
  ].sort((x, y) => x.at - y.at);
}

// The eastern horizon's ecliptic degree: the standard formula on the engine's sidereal time and true obliquity.
export function ascendant(t, lat, lon) {
  const time = A.MakeTime(new Date(t)), r = Math.PI / 180;
  const ramc = norm(A.SiderealTime(time) * 15 + lon), eps = A.e_tilt(time).tobl;
  const y = Math.cos(ramc * r), x = -(Math.sin(eps * r) * Math.tan(lat * r) + Math.cos(eps * r) * Math.sin(ramc * r));
  return norm(Math.atan2(y, x) / r);
}

export function risingWindows(from, to, lat, lon) {
  const idx = (t) => Math.floor(ascendant(t, lat, lon) / 30);
  const cuts = [from];
  for (let t = from; t < to; t += 5 * MIN) {
    const b = Math.min(t + 5 * MIN, to);
    if (idx(t) !== idx(b)) cuts.push(bisect(idx, t, b));
  }
  cuts.push(to);
  return cuts.slice(0, -1).map((a, i) => ({ sign: SIGNS[idx(a + 1000)], from: a, to: cuts[i + 1] }));
}

const round = (t) => Math.round(t / MIN) * MIN;
// Sunrise and sunset on a local day, for the daylight band under a strip.
export function sunRiseSet(from, lat, lon) {
  const obs = new A.Observer(lat, lon, 0), start = A.MakeTime(new Date(from));
  const rise = A.SearchRiseSet(A.Body.Sun, obs, +1, start, 1), set = A.SearchRiseSet(A.Body.Sun, obs, -1, start, 1);
  return { rise: rise ? rise.date.getTime() : null, set: set ? set.date.getTime() : null };
}

const iso = (t) => new Date(round(t)).toISOString().slice(0, 16).replace("T", " ") + " UTC";
const hm = (t, tz) => new Intl.DateTimeFormat("en-GB", { timeZone: tz ?? "UTC", hour: "2-digit", minute: "2-digit" }).format(new Date(round(t)));
function local(t, tz) {
  if (!tz) return "";
  return " / " + new Intl.DateTimeFormat("en-GB", { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(new Date(round(t))) + ` ${tz}`;
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const json = process.argv.includes("--json");
  const tzAt = process.argv.indexOf("--tz");
  const tz = tzAt > 0 ? process.argv[tzAt + 1] : null;
  const [cmd, ...rest] = args.filter((a) => a !== tz);
  const T = (s) => Date.parse(/Z|[+-]\d\d:?\d\d$/.test(s) || s.length === 10 ? s : s + "Z");
  const print = (data, lines) => console.log(json ? JSON.stringify(data, null, 2) : lines.join("\n"));
  if (cmd === "positions") {
    const p = positions(T(rest[0]));
    print(p, Object.entries(p).map(([b, v]) => `${cap(b).padEnd(8)} ${v.text}${v.retrograde ? "  retrograde" : ""}`));
  } else if (cmd === "events") {
    const ev = events(T(rest[0]), T(rest[1]) + DAY);
    print(ev, ev.map((e) => e.kind === "ingress" ? `${iso(e.at)}${local(e.at, tz)}  ${cap(e.body)} enters ${e.to}${e.retrograde ? " (retrograde)" : ""}`
      : e.kind === "station" ? `${iso(e.at).slice(0, 10)}  ${cap(e.body)} turns ${e.turns} at ${e.text} (date only)`
      : `${iso(e.at)}${local(e.at, tz)}  ${e.phase} at ${e.text}`));
  } else if (cmd === "moon") {
    const from = T(rest[0]), to = T(rest[1]), ing = ingresses("moon", from, to);
    print({ start: fmt(lonOf("moon", from)), end: fmt(lonOf("moon", to)), ingresses: ing },
      [`Moon at start ${fmt(lonOf("moon", from))}, at end ${fmt(lonOf("moon", to))}`, ...ing.map((e) => `${iso(e.at)}${local(e.at, tz)}  Moon enters ${e.to}`)]);
  } else if (cmd === "rising") {
    const w = risingWindows(T(rest[0]), T(rest[1]), Number(rest[2]), Number(rest[3]));
    print(w, w.map((x) => `${x.sign.padEnd(12)} ${hm(x.from)} to ${hm(x.to)} UTC${tz ? `   ${hm(x.from, tz)} to ${hm(x.to, tz)} ${tz}` : ""}`));
  } else {
    console.log("usage: node sky.mjs positions|events|moon|rising ... [--tz Area/City] [--json]");
    process.exit(1);
  }
}
