/**
 * The sky search against NASA JPL Horizons itself (ADR-208, 251; acceptance 2 of Timeline and of its page). Every
 * longitude below is Horizons's own answer, fetched by hand on 2026-10-04 and never the engine's output copied back;
 * nothing is fetched when the tests run. The query is the Chiron script's with an hourly step, to
 * https://ssd.jpl.nasa.gov/api/horizons.api:
 *
 *   COMMAND='499' CENTER='500@399' EPHEM_TYPE='OBSERVER' QUANTITIES='31' TIME_TYPE='UT'
 *   START_TIME='2028-02-08 19:00' STOP_TIME='2028-02-09 04:00' STEP_SIZE='1 h' CSV_FORMAT='YES' OBJ_DATA='NO'
 *   EXTRA_PREC='YES'
 *
 * with COMMAND 10 the Sun, 301 the Moon, 199 Mercury, 299 Venus, 499 Mars, 599 Jupiter, 699 Saturn, 799 Uranus,
 * 899 Neptune, 999 Pluto. Quantity 31 is the apparent ecliptic longitude of date seen from the Earth's centre, the
 * place a chart reads. A pinned contact sits away from any turn, where a body's hour is sharp; a turn's hour is flat,
 * so turns carry a wider tolerance of their own.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateNatalChart, hasHorizon, type DrawnChartData } from "./chartCalculation.js";
import { eclipses, exactHits, inOrb, ingresses, longitudeAt, stations, type SkyBody } from "./transits.js";

interface Fixture {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset: number;
}

function chartOf(path: string): DrawnChartData {
  const f = JSON.parse(readFileSync(new URL(`../../../fixtures/${path}.json`, import.meta.url), "utf8")) as Fixture;
  const chart = calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset);
  assert.ok(hasHorizon(chart), `${path} has a horizon`);
  return chart;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const at = (iso: string): Date => new Date(iso);
const arc = (deg: number): number => ((((deg + 180) % 360) + 360) % 360) - 180;
const norm = (deg: number): number => ((deg % 360) + 360) % 360;

type Row = readonly [iso: string, lon: number];

/** When Horizons's line between two hourly rows meets `target`; within an hour a body's path is straight to well under a minute. */
function crossing([[isoA, lonA], [isoB, lonB]]: readonly [Row, Row], target: number): number {
  const share = arc(target - lonA) / arc(lonB - lonA);
  assert.ok(share >= 0 && share <= 1, `${target}° lies between Horizons's ${lonA}° and ${lonB}°`);
  return at(isoA).getTime() + share * (at(isoB).getTime() - at(isoA).getTime());
}

test("every body's place at the start of 2026 is Horizons's to within 18 arcseconds", () => {
  const horizons: Array<[SkyBody, number]> = [
    ["sun", 280.5685772],
    ["moon", 66.7156363],
    ["mercury", 268.6516112],
    ["venus", 279.2064734],
    ["mars", 282.6881475],
    ["jupiter", 111.3575894],
    ["saturn", 356.1672313],
    ["uranus", 57.9492508],
    ["neptune", 359.5068386],
    ["pluto", 302.7186024],
  ];
  for (const [body, lon] of horizons) {
    const off = Math.abs(arc(longitudeAt(body, at("2026-01-01T00:00:00Z")) - lon));
    assert.ok(off <= 0.005, `${body}: ${(off * 3600).toFixed(1)}″ from Horizons`);
  }
});

interface Contact {
  body: SkyBody;
  chart: string;
  point: "moon" | "jupiter" | "ascendant" | "midheaven";
  /** Degrees the contact's point lies ahead of the natal one: 0 conjunction, 90 square, 120 trine, 180 opposition. */
  angle: number;
  /** The doctrine's orb for the body (ADR-208), for the window the hit falls in. */
  orb: number;
  rows: readonly [Row, Row];
}

const CONTACTS: Contact[] = [
  {
    body: "pluto", chart: "sample-people/mira", point: "jupiter", angle: 180, orb: 1.5,
    rows: [["2026-02-09T16:00:00Z", 303.9688267], ["2026-02-09T17:00:00Z", 303.9701156]],
  },
  {
    body: "saturn", chart: "charts/audrey-hepburn", point: "midheaven", angle: 120, orb: 2,
    rows: [["2027-04-02T04:00:00Z", 16.9669229], ["2027-04-02T05:00:00Z", 16.9721706]],
  },
  {
    body: "uranus", chart: "charts/audrey-hepburn", point: "moon", angle: 90, orb: 1.5,
    rows: [["2027-06-08T01:00:00Z", 66.4492522], ["2027-06-08T02:00:00Z", 66.4516642]],
  },
  {
    body: "mars", chart: "sample-people/mira", point: "moon", angle: 0, orb: 1,
    rows: [["2028-02-08T23:00:00Z", 328.6310482], ["2028-02-09T00:00:00Z", 328.6640137]],
  },
  {
    body: "jupiter", chart: "charts/marie-curie", point: "ascendant", angle: 0, orb: 2,
    rows: [["2032-01-08T09:00:00Z", 282.0634695], ["2032-01-08T10:00:00Z", 282.0731025]],
  },
];

test("five contacts from 2026 to 2032 perfect within an hour of the hour Horizons crosses", () => {
  for (const c of CONTACTS) {
    const chart = chartOf(c.chart);
    const natal = c.point === "ascendant" || c.point === "midheaven" ? chart.angles[c.point] : chart.planets[c.point];
    const target = norm(natal.absoluteDegree + c.angle);
    const truth = crossing(c.rows, target);
    const what = `${c.body} ${c.angle}° from ${c.chart}'s ${c.point}`;
    const hits = exactHits(c.body, target, new Date(truth - 20 * DAY_MS), new Date(truth + 20 * DAY_MS));
    assert.equal(hits.length, 1, what);
    const minutes = (hits[0].getTime() - truth) / 60_000;
    assert.ok(Math.abs(minutes) <= 60, `${what}: ${minutes.toFixed(1)} minutes from Horizons`);
    const turns = stations(c.body, new Date(truth - 10 * DAY_MS), new Date(truth + 10 * DAY_MS));
    assert.deepEqual(turns, [], `${what} is ten days from a turn`);
    const [window] = inOrb(c.body, target, c.orb, hits[0], hits[0]);
    assert.ok(window.exact.some((d) => d.getTime() === hits[0].getTime()), `${what} is one of its window's exact passes`);
  }
});

test("turns fall within 30 minutes of Horizons for Mercury and Venus and within 2 hours for Jupiter to Pluto", () => {
  // Where a quartic through Horizons's longitudes, hourly over two days around Mercury's and four around Venus's,
  // two-hourly over eight to twelve days around the others, stops and turns.
  const turns: Array<[SkyBody, "retrograde" | "direct", string, number, number]> = [
    ["mercury", "retrograde", "2026-02-26T06:48:09Z", 352.5653, 30],
    ["venus", "retrograde", "2026-10-03T07:15:53Z", 218.4911, 30],
    ["jupiter", "direct", "2026-03-11T03:30:13Z", 105.0873, 120],
    ["saturn", "retrograde", "2026-07-26T19:53:35Z", 14.75, 120],
    ["pluto", "retrograde", "2026-05-06T15:19:21Z", 305.5095, 120],
  ];
  for (const [body, turnsTo, iso, lon, tolerance] of turns) {
    const found = stations(body, new Date(at(iso).getTime() - 10 * DAY_MS), new Date(at(iso).getTime() + 10 * DAY_MS));
    assert.equal(found.length, 1, body);
    const [s] = found;
    assert.equal(s.turns, turnsTo, body);
    const minutes = (s.at.getTime() - at(iso).getTime()) / 60_000;
    assert.ok(Math.abs(minutes) <= tolerance, `${body}: ${minutes.toFixed(1)} minutes from Horizons`);
    assert.ok(Math.abs(arc(s.lon - lon)) <= 0.005, `${body} turns at ${s.lon}°, Horizons ${lon}°`);
  }
});

test("moves into a new sign fall within an hour of Horizons, a move back marked retrograde", () => {
  const moves: Array<[SkyBody, string, boolean, readonly [Row, Row]]> = [
    ["mercury", "Pisces", true, [["2025-03-30T02:00:00Z", 0.0090698], ["2025-03-30T03:00:00Z", 359.9788185]]],
    ["saturn", "Aries", false, [["2026-02-14T00:00:00Z", 359.9991055], ["2026-02-14T01:00:00Z", 0.0036914]]],
    ["mercury", "Aries", false, [["2026-04-15T03:00:00Z", 359.9790035], ["2026-04-15T04:00:00Z", 0.0376141]]],
    ["uranus", "Gemini", false, [["2026-04-26T00:00:00Z", 59.9980523], ["2026-04-26T01:00:00Z", 60.0003184]]],
    ["jupiter", "Leo", false, [["2026-06-30T05:00:00Z", 119.9922231], ["2026-06-30T06:00:00Z", 120.0011308]]],
    ["mars", "Leo", false, [["2026-09-28T02:00:00Z", 119.9800173], ["2026-09-28T03:00:00Z", 120.0045349]]],
  ];
  for (const [body, sign, retrograde, rows] of moves) {
    const cusp = Math.round(rows[1][1] / 30) * 30;
    const truth = crossing(rows, cusp);
    const found = ingresses(body, new Date(truth - 2 * HOUR_MS), new Date(truth + 2 * HOUR_MS));
    assert.equal(found.length, 1, `${body} into ${sign}`);
    assert.equal(found[0].sign, sign);
    assert.equal(found[0].retrograde, retrograde, `${body} into ${sign} retrograde`);
    const minutes = (found[0].at.getTime() - truth) / 60_000;
    assert.ok(Math.abs(minutes) <= 60, `${body} into ${sign}: ${minutes.toFixed(1)} minutes from Horizons`);
  }
});

test("eclipses fall within 15 minutes of NASA's greatest eclipse", () => {
  // NASA's eclipse catalogue: the total lunar eclipse of 2026-03-03 and the total solar eclipse of 2026-08-12.
  const nasa: Array<["lunar" | "solar", string]> = [
    ["lunar", "2026-03-03T11:33:00Z"],
    ["solar", "2026-08-12T17:46:00Z"],
  ];
  for (const [kind, iso] of nasa) {
    const found = eclipses(new Date(at(iso).getTime() - DAY_MS), new Date(at(iso).getTime() + DAY_MS));
    assert.equal(found.length, 1, iso);
    assert.equal(found[0].kind, kind);
    const minutes = (found[0].at.getTime() - at(iso).getTime()) / 60_000;
    assert.ok(Math.abs(minutes) <= 15, `${kind} ${iso}: ${minutes} minutes from NASA`);
  }
});
