// Natal chart calculation using astronomy-engine (Don Cross)
// Pure JS, no native deps, accurate to ~1 arcminute (NASA-grade port of JPL formulas)
import * as Astronomy from "astronomy-engine";

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

function getSign(absoluteDegree: number): string {
  return SIGNS[Math.floor(normalizeAngle(absoluteDegree) / 30) % 12];
}

function getDegreeInSign(absoluteDegree: number): number {
  return normalizeAngle(absoluteDegree) % 30;
}

// Geocentric ecliptic longitude of a planet (apparent, with aberration)
function geocentricLongitude(body: Astronomy.Body, date: Date): number {
  const vec = Astronomy.GeoVector(body, date, true);
  return Astronomy.Ecliptic(vec).elon;
}

// Daily speed (degrees / day) by sampling positions 1 day apart, signed (negative = retrograde)
function planetSpeed(body: Astronomy.Body, date: Date): number {
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

function calcAspects(positions: Record<string, number>): AspectData[] {
  const aspectDefs = [
    { name: "conjunction", angle: 0, orb: 8 },
    { name: "opposition", angle: 180, orb: 8 },
    { name: "square", angle: 90, orb: 6 },
    { name: "trine", angle: 120, orb: 6 },
    { name: "sextile", angle: 60, orb: 4 },
  ];

  const aspects: AspectData[] = [];
  const planets = Object.keys(positions);

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];
      const lon1 = positions[p1];
      const lon2 = positions[p2];
      let diff = Math.abs(lon1 - lon2);
      if (diff > 180) diff = 360 - diff;

      for (const aspect of aspectDefs) {
        const orb = Math.abs(diff - aspect.angle);
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

export interface NatalChartData {
  datetimeUtc: string;
  julianDay: number;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  planets: Record<string, {
    sign: string;
    degree: number;
    absoluteDegree: number;
    house: number;
    retrograde: boolean;
    speed: number;
  }>;
  angles: {
    ascendant: { sign: string; degree: number; absoluteDegree: number };
    midheaven: { sign: string; degree: number; absoluteDegree: number };
    descendant: { sign: string; degree: number; absoluteDegree: number };
    ic: { sign: string; degree: number; absoluteDegree: number };
  };
  houses: Record<string, { sign: string; degree: number }>;
  aspects: AspectData[];
  elements: { fire: number; earth: number; air: number; water: number };
  modalities: { cardinal: number; fixed: number; mutable: number };
  dominance: {
    dominantPlanets: string[];
    dominantElement: string;
    dominantModality: string;
  };
  chartShape: string | null;
  hemisphereEmphasis: {
    northern: number;
    southern: number;
    eastern: number;
    western: number;
  };
}

interface RawPosition {
  lon: number;
  speed: number;
  retrograde: boolean;
}

export function calculateNatalChart(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number,
  timezoneOffset: number,
): NatalChartData {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour, minute] = birthTime.split(":").map(Number);

  // Convert local birth time → UTC instant
  // timezoneOffset is hours east of UTC (e.g. CEST = +2)
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute, 0)
    - timezoneOffset * 3600_000;
  const date = new Date(utcMillis);

  const julianDay = Astronomy.MakeTime(date).tt + 2451545.0;

  // Planet bodies (geocentric)
  const bodyMap: Record<string, Astronomy.Body> = {
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

  // Build planet objects with whole-sign house assignments
  const planets: NatalChartData["planets"] = {};
  for (const [name, pos] of Object.entries(rawPlanets)) {
    const house = calcWholeSignHouse(pos.lon, ascLon);
    planets[name] = {
      sign: getSign(pos.lon),
      degree: Math.round(getDegreeInSign(pos.lon) * 100) / 100,
      absoluteDegree: Math.round(pos.lon * 100) / 100,
      house,
      retrograde: pos.retrograde,
      speed: Math.round(pos.speed * 1000) / 1000,
    };
  }

  // Whole-sign house cusps
  const houses = calcHouseCusps(ascLon);

  // Angles
  const angles: NatalChartData["angles"] = {
    ascendant: { sign: getSign(ascLon), degree: Math.round(getDegreeInSign(ascLon) * 100) / 100, absoluteDegree: Math.round(ascLon * 100) / 100 },
    midheaven: { sign: getSign(mcLon), degree: Math.round(getDegreeInSign(mcLon) * 100) / 100, absoluteDegree: Math.round(mcLon * 100) / 100 },
    descendant: { sign: getSign(descLon), degree: Math.round(getDegreeInSign(descLon) * 100) / 100, absoluteDegree: Math.round(descLon * 100) / 100 },
    ic: { sign: getSign(icLon), degree: Math.round(getDegreeInSign(icLon) * 100) / 100, absoluteDegree: Math.round(icLon * 100) / 100 },
  };

  // Aspects (only for main 10 planets)
  const mainPlanets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  const mainPlanetLons: Record<string, number> = {};
  for (const name of mainPlanets) {
    mainPlanetLons[name] = rawPlanets[name].lon;
  }
  const aspects = calcAspects(mainPlanetLons);

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

  // Dominant planets — those in angular houses (1, 4, 7, 10)
  const angularHouses = [1, 4, 7, 10];
  const dominantPlanets = mainPlanets
    .filter((p) => angularHouses.includes(planets[p].house))
    .slice(0, 3);
  if (dominantPlanets.length === 0) dominantPlanets.push("sun");

  // Hemisphere emphasis
  const hemisphereEmphasis = { northern: 0, southern: 0, eastern: 0, western: 0 };
  for (const name of mainPlanets) {
    const h = planets[name].house;
    if (h >= 7 && h <= 12) hemisphereEmphasis.southern++;
    else hemisphereEmphasis.northern++;
    if (h >= 1 && h <= 6) hemisphereEmphasis.eastern++;
    else hemisphereEmphasis.western++;
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
    datetimeUtc: date.toISOString(),
    julianDay: Math.round(julianDay * 10000) / 10000,
    latitude,
    longitude,
    timezoneOffset,
    planets,
    angles,
    houses,
    aspects,
    elements,
    modalities,
    dominance: {
      dominantPlanets,
      dominantElement,
      dominantModality,
    },
    chartShape,
    hemisphereEmphasis,
  };
}
