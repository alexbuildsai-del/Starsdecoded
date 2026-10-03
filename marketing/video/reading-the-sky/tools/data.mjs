// Every number the film draws, computed here: the chart and the horizon sweep from the product's engine
// (through the marketing kit), the orbits from astronomy-engine (the engine's pin), the stars from
// d3-celestial's XHIP catalogue (prepared by stars.js). Writes shared/data/ch1.json.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { openWheels } from "../../../../.claude/skills/marketing/kit/wheel.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "..");
const require = createRequire(path.resolve(ROOT, "../../../packages/engine/package.json"));
const A = require("astronomy-engine");
const BIRTH = { date: "2012-08-30", time: "06:30", lat: 51.5074, lon: -0.1278, tz: "Europe/London" };
const two = (n) => String(n).padStart(2, "0");
const r2 = (x) => Math.round(x * 100) / 100;

const w = await openWheels();
const { svg, chart } = await w.wheel(BIRTH);
const asc = [];
for (let m = 0; m <= 6 * 60 + 30; m += 2) {
  const c = w.chart({ ...BIRTH, time: `${two(Math.floor(m / 60))}:${two(m % 60)}` });
  asc.push(r2(c.angles.ascendant.absoluteDegree));
}
// Each sign's rising time that day, from the Ascendant minute by minute over 24 hours.
const rising = {};
let prev = null, start = 0;
for (let m = 0; m <= 1440 * 2; m++) {
  const day = m < 1440 ? "2012-08-30" : "2012-08-31", mm = m % 1440;
  const sign = w.chart({ ...BIRTH, date: day, time: `${two(Math.floor(mm / 60))}:${two(mm % 60)}` }).angles.ascendant.sign;
  if (sign !== prev) { if (prev && start > 0 && !rising[prev]) rising[prev] = m - start; prev = sign; start = m; }
  if (Object.keys(rising).length === 12) break;
}
await w.close();

// Heliocentric ecliptic positions, a year up to the birth, every two days (AU, J2000 ecliptic).
const BODIES = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];
const t0 = A.MakeTime(new Date("2012-08-30T05:30:00Z"));
const helio = Object.fromEntries(BODIES.map((b) => [b, []]));
for (let d = -366; d <= 0; d += 2) {
  const t = t0.AddDays(d);
  for (const b of BODIES) { const v = A.Ecliptic(A.HelioVector(A.Body[b], t)); helio[b].push([r2(v.vec.x * 100) / 100, r2(v.vec.y * 100) / 100, r2(v.vec.z * 100) / 100]); }
}
// Geocentric ecliptic latitude at the birth, for the strip view.
const geo = {};
for (const b of ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]) {
  const e = b === "Moon" ? A.EclipticGeoMoon(t0) : A.Ecliptic(A.GeoVector(A.Body[b], t0, true));
  geo[b.toLowerCase()] = { lon: r2(e.elon ?? e.lon), lat: r2(e.elat ?? e.lat) };
}
const stars = JSON.parse(fs.readFileSync(path.join(HERE, "stars/ecliptic_band.json"), "utf8"));
const east = JSON.parse(fs.readFileSync(path.join(HERE, "stars/sky_east_london.json"), "utf8"));
const out = { birth: BIRTH, chart, ascEvery2Min: asc, risingMinutes: rising, helio, geo, stars, east };
fs.mkdirSync(path.join(ROOT, "shared/data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "shared/data/ch1.json"), JSON.stringify(out));
fs.writeFileSync(path.join(ROOT, "shared/data/wheel.html"), svg);
console.log("asc samples", asc.length, asc[0], asc.at(-1), "rising", rising, "geo", geo);
