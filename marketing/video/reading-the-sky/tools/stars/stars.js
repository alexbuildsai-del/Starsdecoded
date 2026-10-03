// Builds sky JSON for the explainer video from real catalogue data (d3-celestial / XHIP)
// and astronomy-engine 2.1.19. Positions are computed, never typed in.
const fs = require('fs');
const path = require('path');
const A = require('/home/user/Starsdecoded/node_modules/.pnpm/astronomy-engine@2.1.19/node_modules/astronomy-engine');

const DIR = __dirname;
const DATA = path.join(DIR, 'package', 'data');
const load = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const r2 = (x) => Math.round(x * 100) / 100;
const norm = (x) => ((x % 360) + 360) % 360;
const DEG = Math.PI / 180;

const stars6 = load('stars.6.json').features;
const names = load('starnames.json');
const conNames = Object.fromEntries(load('constellations.json').features.map((f) => [f.id, f.properties.name]));
const lines = load('constellations.lines.json').features;
const bounds = load('constellations.bounds.json').features;

const catalogue = stars6.map((f) => {
  const [lon, lat] = f.geometry.coordinates;
  const n = names[f.id];
  return {
    hip: f.id,
    ra: norm(lon), dec: lat,
    mag: Number(f.properties.mag),
    bv: f.properties.bv === '' || f.properties.bv == null ? null : Number(f.properties.bv),
    name: n && n.name ? n.name : undefined,
  };
});

function starOut(s, extra) {
  const o = { ...extra, mag: r2(s.mag) };
  if (s.bv != null && !Number.isNaN(s.bv)) o.bv = r2(s.bv);
  o.hip = s.hip;
  if (s.name) o.name = s.name;
  return o;
}

// ---------- a. London sunrise sky ----------
const TIME_A = A.MakeTime(new Date('2012-08-30T05:30:00Z'));
const LONDON = new A.Observer(51.5074, -0.1278, 0);
const rotEQJ_EQD = A.Rotation_EQJ_EQD(TIME_A);

function horFromEQJ(raDeg, dec, time, rot) {
  const v = A.VectorFromSphere(new A.Spherical(dec, raDeg, 1), time);
  const eqd = A.EquatorFromVector(A.RotateVector(rot, v));
  const h = A.Horizon(time, LONDON, eqd.ra, eqd.dec, 'normal');
  return { az: h.azimuth, alt: h.altitude };
}

const skyStars = [];
for (const s of catalogue) {
  if (!(s.mag < 5.0)) continue;
  const h = horFromEQJ(s.ra, s.dec, TIME_A, rotEQJ_EQD);
  if (h.alt > -2) skyStars.push(starOut(s, { az: r2(h.az), alt: r2(h.alt) }));
}

const bodies = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].map((b) => {
  const eq = A.Equator(b, TIME_A, LONDON, true, true);
  const h = A.Horizon(TIME_A, LONDON, eq.ra, eq.dec, 'normal');
  const ect = A.SphereFromVector(A.RotateVector(A.Rotation_EQJ_ECT(TIME_A), A.GeoVector(b, TIME_A, true)));
  const o = { body: b, az: r2(h.azimuth), alt: r2(h.altitude), eclLon: r2(norm(ect.lon)) };
  if (b !== 'Sun') o.mag = r2(A.Illumination(b, TIME_A).mag);
  return o;
});

// Ecliptic of date (true) to horizon, geometric (no refraction) for the ascendant.
const rotECT_HOR = A.CombineRotation(A.Rotation_ECT_EQD(TIME_A), A.Rotation_EQD_HOR(TIME_A, LONDON));
function eclToHor(lon, refraction) {
  const v = A.VectorFromSphere(new A.Spherical(0, lon, 1), TIME_A);
  return A.HorizonFromVector(A.RotateVector(rotECT_HOR, v), refraction);
}
const ecliptic = [];
for (let lon = 0; lon < 360; lon += 2) {
  const h = eclToHor(lon, 'normal');
  if (h.lat > -10) ecliptic.push({ lon, az: r2(norm(h.lon)), alt: r2(h.lat) });
}
// keep the polyline contiguous across lon 0/360: start just after the gap below alt -10
const gap = ecliptic.findIndex((p, i) => i > 0 && p.lon - ecliptic[i - 1].lon > 2);
if (gap > 0) ecliptic.push(...ecliptic.splice(0, gap));
const sunrise = A.SearchRiseSet('Sun', LONDON, +1, A.MakeTime(new Date('2012-08-30T00:00:00Z')), 1);

// Ascendant: ecliptic point on the eastern geometric horizon. Rising point = alt crosses 0
// going up as lon decreases... find lon with alt=0 and az in (0,180).
function altAt(lon) { return eclToHor(lon, '').lat; }
let asc = null;
for (let lon = 0; lon < 360; lon += 0.5) {
  const a1 = altAt(lon), a2 = altAt(lon + 0.5);
  if (Math.sign(a1) !== Math.sign(a2)) {
    let lo = lon, hi = lon + 0.5;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (Math.sign(altAt(m)) === Math.sign(altAt(lo))) lo = m; else hi = m; }
    const L = norm((lo + hi) / 2);
    const az = norm(eclToHor(L, '').lon);
    if (az < 180) asc = { lon: L, az };
  }
}
// Cross-check with the product engine's formula (Meeus, mean obliquity, GMST)
function engineAsc(date, lat, lng) {
  const T = A.MakeTime(date).tt / 36525;
  const eps = 23.43929111 - (46.815 / 3600) * T - (0.00059 / 3600) * T * T + (0.001813 / 3600) * T ** 3;
  const lst = norm(A.SiderealTime(date) * 15 + lng);
  const asc = Math.atan2(Math.cos(lst * DEG), -(Math.sin(lst * DEG) * Math.cos(eps * DEG) + Math.tan(lat * DEG) * Math.sin(eps * DEG))) / DEG;
  return norm(asc);
}
const engineAscLon = engineAsc(new Date('2012-08-30T05:30:00Z'), 51.5074, -0.1278);
const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const signOf = (l) => `${signs[Math.floor(norm(l) / 30)]} ${(norm(l) % 30).toFixed(2)}`;

const skyA = {
  meta: {
    place: 'London', lat: 51.5074, lon: -0.1278,
    utc: '2012-08-30T05:30:00Z', local: '2012-08-30 06:30 BST',
    frame: 'horizontal; az degrees from north through east; alt degrees with normal refraction',
    starLimitMag: 5.0, altFloor: -2,
    sunriseUtc: sunrise.date.toISOString(),
    eclipticNote: 'ordered contiguously along the visible arc; true ecliptic of date, points every 2 deg of longitude, alt > -10, refracted',
    source: 'stars: d3-celestial 0.7.35 stars.6.json (XHIP / Hipparcos, J2000, precessed to date, no proper motion); bodies: astronomy-engine 2.1.19',
  },
  ascendant: { eclLon: r2(asc.lon), sign: signOf(asc.lon), az: r2(asc.az), engineFormulaEclLon: r2(engineAscLon) },
  bodies, ecliptic, stars: skyStars,
};
fs.writeFileSync(path.join(DIR, 'sky_east_london.json'), JSON.stringify(skyA));

// ---------- b. ecliptic band ----------
const TIME_B = A.MakeTime(new Date('2012-08-30T00:00:00Z'));
const rotEQJ_ECT = A.Rotation_EQJ_ECT(TIME_B);
const rotECT_EQJ = A.Rotation_ECT_EQJ(TIME_B);
function toEct(raDeg, dec) {
  const s = A.SphereFromVector(A.RotateVector(rotEQJ_ECT, A.VectorFromSphere(new A.Spherical(dec, raDeg, 1), TIME_B)));
  return { lon: norm(s.lon), lat: s.lat };
}
const bandStars = [];
for (const s of catalogue) {
  if (!(s.mag < 5.5)) continue;
  const e = toEct(s.ra, s.dec);
  if (Math.abs(e.lat) <= 25) bandStars.push(starOut(s, { lon: r2(e.lon), lat: r2(e.lat) }));
}

// Split a polyline in ecliptic lon where it crosses 0/360, interpolating the cut point.
function splitWrap(pts) {
  const out = []; let cur = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], q = pts[i];
    let d = q[0] - p[0];
    if (Math.abs(d) > 180) {
      const up = d < 0; // p near 360, q near 0
      const qx = up ? q[0] + 360 : q[0] - 360;
      const edge = up ? 360 : 0;
      const t = (edge - p[0]) / (qx - p[0]);
      const lat = p[1] + t * (q[1] - p[1]);
      cur.push([edge, r2(lat)]); out.push(cur);
      cur = [[up ? 0 : 360, r2(lat)], q];
    } else cur.push(q);
  }
  out.push(cur);
  return out;
}

const ZODIAC = ['Psc', 'Ari', 'Tau', 'Gem', 'Cnc', 'Leo', 'Vir', 'Lib', 'Sco', 'Oph', 'Sgr', 'Cap', 'Aqr'];

// Ecliptic crossing: astronomy-engine Constellation() uses the IAU (Delporte 1930, B1875) boundaries.
const conAtLon = (lon) => {
  const v = A.RotateVector(rotECT_EQJ, A.VectorFromSphere(new A.Spherical(0, lon, 1), TIME_B));
  const eq = A.EquatorFromVector(v);
  return A.Constellation(eq.ra, eq.dec).symbol;
};
const STEP = 0.01;
const transitions = [];
let prev = conAtLon(0);
for (let i = 1; i <= 36000; i++) {
  const lon = i * STEP;
  const c = conAtLon(lon % 360);
  if (c !== prev) {
    let lo = lon - STEP, hi = lon;
    for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (conAtLon(m) === prev) lo = m; else hi = m; }
    transitions.push({ lon: norm((lo + hi) / 2), from: prev, to: c });
    prev = c;
  }
}
const crossings = transitions.map((t, i) => {
  const next = transitions[(i + 1) % transitions.length];
  const width = norm(next.lon - t.lon);
  return { con: t.to, name: conNames[t.to], enter: r2(t.lon), leave: r2(next.lon), width: r2(width) };
});

// Cross-check against d3-celestial constellations.bounds.json (J2000 polygons) via planar point-in-polygon.
function inPoly(ra, dec, ring) {
  // unwrap the ring continuously, then test the point at ra and ra +/- 360
  const xs = [ring[0][0]];
  for (let i = 1; i < ring.length; i++) { let d = ring[i][0] - ring[i - 1][0]; while (d > 180) d -= 360; while (d < -180) d += 360; xs.push(xs[i - 1] + d); }
  const test = (x) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = xs[i], yi = ring[i][1], xj = xs[j], yj = ring[j][1];
      if ((yi > dec) !== (yj > dec) && x < ((xj - xi) * (dec - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  return test(ra) || test(ra - 360) || test(ra + 360) || test(ra - 720);
}
const boundsBy = Object.fromEntries(bounds.map((f) => [f.id, f.geometry]));
function conFromBounds(lon) {
  const v = A.RotateVector(rotECT_EQJ, A.VectorFromSphere(new A.Spherical(0, lon, 1), TIME_B));
  const eq = A.EquatorFromVector(v);
  const ra = eq.ra * 15, dec = eq.dec;
  const hits = [];
  for (const [id, g] of Object.entries(boundsBy)) {
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    if (polys.some((p) => inPoly(ra, dec, p[0]))) hits.push(id);
  }
  return hits;
}
let mismatch = 0, maxMisRun = 0, run = 0, total = 0;
for (let lon = 0; lon < 360; lon += 0.05) {
  total++;
  const h = conFromBounds(lon);
  if (h.length !== 1 || h[0] !== conAtLon(lon)) { mismatch++; run += 0.05; maxMisRun = Math.max(maxMisRun, run); } else run = 0;
}

const conLines = lines.filter((f) => ZODIAC.includes(f.id)).map((f) => {
  const polylines = [];
  for (const ln of f.geometry.coordinates) {
    const pts = ln.map(([lon, lat]) => { const e = toEct(norm(lon), lat); return [r2(e.lon), r2(e.lat)]; });
    polylines.push(...splitWrap(pts));
  }
  const cr = crossings.filter((c) => c.con === f.id);
  return { con: f.id, name: conNames[f.id], eclipticSpans: cr.map(({ enter, leave, width }) => ({ enter, leave, width })), lines: polylines };
});

// March 2012 equinox
const eqx = A.Seasons(2012).mar_equinox;
const sunEct = A.SphereFromVector(A.RotateVector(A.Rotation_EQJ_ECT(eqx), A.GeoVector('Sun', eqx, true)));
const sunEq = A.Equator('Sun', eqx, new A.Observer(0, 0, 0), false, true);
const eqxCon = A.Constellation(sunEq.ra, sunEq.dec);

const named = (n) => bandStars.find((s) => s.name === n);
const skyB = {
  meta: {
    date: '2012-08-30T00:00:00Z',
    frame: 'true ecliptic and equinox of date; lon 0..360, lat degrees',
    starLimitMag: 5.5, latLimit: 25,
    linesNote: 'stick figures from d3-celestial constellations.lines.json, converted per vertex; polylines split at lon 0/360 with an interpolated cut point',
    crossingsNote: 'longitudes of date where the ecliptic crosses IAU constellation boundaries, from astronomy-engine Constellation() (IAU 1930 boundaries); cross-checked against d3-celestial constellations.bounds.json',
    source: 'stars: d3-celestial 0.7.35 (XHIP / Hipparcos, J2000, no proper motion applied)',
  },
  marchEquinox2012: { utc: eqx.date.toISOString(), sunEclLon: r2(norm(sunEct.lon)), sunRaHours: Number(sunEq.ra.toFixed(4)), sunDec: r2(sunEq.dec), constellation: eqxCon.symbol, constellationName: eqxCon.name },
  crossings, constellations: conLines, stars: bandStars,
};
fs.writeFileSync(path.join(DIR, 'ecliptic_band.json'), JSON.stringify(skyB));

// ---------- c. whole sky ----------
const whole = catalogue.filter((s) => s.mag < 4.5).map((s) => starOut(s, { ra: r2(s.ra), dec: r2(s.dec) }));
fs.writeFileSync(path.join(DIR, 'whole_sky.json'), JSON.stringify({
  meta: { frame: 'J2000 equatorial; ra degrees 0..360, dec degrees', starLimitMag: 4.5, source: 'd3-celestial 0.7.35 stars.6.json (XHIP / Hipparcos)' },
  stars: whole,
}));

// ---------- report ----------
console.log('counts: sky_east_london stars', skyStars.length, 'ecliptic pts', ecliptic.length, '| ecliptic_band stars', bandStars.length, '| whole_sky', whole.length);
console.log('bodies', JSON.stringify(bodies));
console.log('ascendant', JSON.stringify(skyA.ascendant));
console.log('Regulus', JSON.stringify(named('Regulus')), 'Spica', JSON.stringify(named('Spica')));
console.log('equinox', JSON.stringify(skyB.marchEquinox2012));
console.log('crossings'); for (const c of crossings) console.log(`  ${c.con} ${c.name.padEnd(12)} ${c.enter.toFixed(2).padStart(7)} -> ${c.leave.toFixed(2).padStart(7)}  width ${c.width.toFixed(2)}`);
console.log(`bounds.json cross-check: ${mismatch}/${total} samples differ, longest run ${maxMisRun.toFixed(2)} deg`);
console.log('stars without bv:', catalogue.filter((s) => s.bv == null || Number.isNaN(s.bv)).length, 'of', catalogue.length);
for (const f of ['sky_east_london.json', 'ecliptic_band.json', 'whole_sky.json']) console.log(f, fs.statSync(path.join(DIR, f)).size, 'bytes');
