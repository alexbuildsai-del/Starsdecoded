// Every number the trailer shows comes from here: the engine, for one stated moment and place (rule 1).
import { calculateNatalChart } from "@workspace/engine";
import { toChartData } from "@/site/lib/chart";
import { assignLanes, wheelRadii, degreesMinutes } from "@/components/chart/wheel-geometry";
import { HOUSE_WORDS } from "@/lib/evidence-glossary";
import type { ChartData } from "@/types/chart";

export const PLACE = { city: "Paris", lat: 48.8566, lon: 2.3522, zone: "Europe/Paris" };

const cache = new Map<string, ChartData>();
export function chartAt(date: string, time: string): ChartData {
  const key = `${date} ${time}`;
  let c = cache.get(key);
  if (!c) {
    c = toChartData(calculateNatalChart(date, time, PLACE.lat, PLACE.lon, PLACE.zone, 0));
    cache.set(key, c);
  }
  return c;
}

/** "09:00" from minutes after midnight. */
export const clock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(Math.floor(min % 60)).padStart(2, "0")}`;

/** The wheel's own turn (sky-now.ts tiltToAscendant): the Ascendant on the true horizon. */
export const tilt = (c: ChartData) => (c.angles ? c.angles.ascendant.absoluteDegree % 30 : 0);

// NatalWheel draws on a 600 plate inside a viewBox padded by 8.5% each side.
const PLATE = 600, PAD = PLATE * 0.085, VIEW = PLATE + 2 * PAD;

/** Where a body sits on a wheel drawn `size` px wide, from its centre: HorizonWheel's tilt by default, NatalWheel's none with `tilted` false. */
export function bodyOnWheel(c: ChartData, body: string, size: number, tilted = true): { x: number; y: number } {
  const r = wheelRadii(PLATE);
  const asc = c.angles?.ascendant.absoluteDegree ?? 0;
  const bodies = Object.entries(c.planets).filter(([, p]) => p && typeof p.absoluteDegree === "number");
  const lanes = assignLanes(bodies.map(([key, p]) => ({ key, absoluteDegree: p.absoluteDegree })), asc, { lanes: r.lanes, node: r.node, gap: PLATE * 0.01 });
  const n = lanes.find((l) => l.key === body);
  if (!n) return { x: 0, y: 0 };
  return polar(n.radius * (size / VIEW), n.theta - (tilted ? tilt(c) : 0));
}
/** The Ascendant's point on the wheel's rim, after the tilt: always due east, on the left. */
export function ascOnWheel(size: number) {
  return polar(wheelRadii(PLATE).signOuter * (size / VIEW), 180);
}
export function polar(r: number, thetaDeg: number) {
  const a = (thetaDeg * Math.PI) / 180;
  return { x: r * Math.cos(a), y: -r * Math.sin(a) };
}

const ORD = ["1ST", "2ND", "3RD", "4TH", "5TH", "6TH", "7TH", "8TH", "9TH", "10TH", "11TH", "12TH"];
export function reading(c: ChartData, body: "sun" | "moon") {
  const b = c.planets[body];
  return { degree: b.degree, sign: b.sign.toUpperCase(), house: b.house ? `${ORD[b.house - 1]} HOUSE · ${HOUSE_WORDS[b.house - 1]?.toUpperCase() ?? ""}` : "" };
}
export function rising(c: ChartData) {
  const a = c.angles!.ascendant;
  return { degree: a.degree, dm: degreesMinutes(a.degree), sign: a.sign.toUpperCase() };
}
export const ordinal = (n: number) => ORD[n - 1];

/** Saturn's longitude on a day, from the same engine. */
export const saturnOn = (date: string) => chartAt(date, "12:00").planets.saturn.absoluteDegree;

const iso = (d: Date) => d.toISOString().slice(0, 10);
/** The first exact Saturn return after a birth: a monthly scan, then daily inside the crossing month. */
export function saturnReturn(birthDate: string, natalSaturn: number): string {
  const birth = new Date(`${birthDate}T12:00:00Z`);
  let prev: number | null = null;
  for (let m = 12 * 25; m < 12 * 33; m++) {
    const d = new Date(birth); d.setUTCMonth(d.getUTCMonth() + m);
    const x = ((saturnOn(iso(d)) - natalSaturn + 540) % 360) - 180;
    if (prev !== null && prev < 0 && x >= 0 && Math.abs(x) < 20) {
      const from = new Date(d); from.setUTCMonth(from.getUTCMonth() - 1);
      for (let k = 0; k <= 32; k++) {
        const day = new Date(from); day.setUTCDate(day.getUTCDate() + k);
        const y = ((saturnOn(iso(day)) - natalSaturn + 540) % 360) - 180;
        if (y >= 0) return iso(day);
      }
    }
    prev = x;
  }
  return "";
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export const dayLine = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
