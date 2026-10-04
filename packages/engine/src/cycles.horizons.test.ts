/**
 * Life's cycles against NASA JPL Horizons itself (timeline-page acceptance 2), on five birth dates: Marie Curie and
 * Audrey Hepburn born before 1950, William and Marie Curie with a three-pass Saturn return. Every number below is
 * Horizons's own answer, read by hand on 2026-10-04 and never the engine's output copied back: the body's place at
 * the birth minute, how many times its daily places cross the cycle's point, and its places on the hour either side
 * of each crossing, so the minute it crosses is Horizons's, found here by a straight line between the two. Nothing
 * is fetched at test time. The query, to https://ssd.jpl.nasa.gov/api/horizons.api:
 *
 *   COMMAND='599' (Jupiter) '699' (Saturn) '799' (Uranus) '899' (Neptune) '999' (Pluto) CENTER='500@399'
 *   EPHEM_TYPE='OBSERVER' QUANTITIES='31' TIME_TYPE='UT' STEP_SIZE='1h' ('1m' at a birth, '1d' to count passes)
 *
 * astronomy-engine's series keep Jupiter and Saturn within a few arcseconds of Horizons, so their passes land within
 * the hour. From 1860 to 2100 they leave Uranus up to 11″ off, Pluto 9″ and Neptune 18″, and a cycle reads one body
 * twice, at birth and at the pass: at those planets' slow pace that is up to 70 minutes for Uranus and Pluto and
 * seven hours for Neptune, enough to move a Neptune pass near midnight to the next day.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateNatalChart } from "./chartCalculation.js";
import { lifeCycles, natalLongitudes, type CycleBody, type CycleId } from "./cycles.js";
import { DOCTRINE } from "./doctrine.js";

/** An hour, "YYYY-MM-DDTHH" UT, with Horizons's longitude at its start and at its end. */
type Hour = readonly [hour: string, before: number, after: number];

interface Pin {
  who: string;
  id: CycleId;
  /** Which time in a life: 0 the first. */
  nth: number;
  /** Horizons's longitude at the birth minute. */
  natal: number;
  /** How many times Horizons's daily longitudes cross the point. */
  count: number;
  passes: Hour[];
  start?: Hour;
  end?: Hour;
}

const PINS: Pin[] = [
  {
    who: "charts/marie-curie", id: "saturn-return", nth: 0, natal: 235.2748945, count: 3,
    passes: [["1896-12-13T21", 235.2745716, 235.2791814], ["1897-06-19T10", 235.2749284, 235.2725952], ["1897-09-04T13", 235.2747945, 235.2772541]],
  },
  { who: "charts/marie-curie", id: "jupiter-return", nth: 0, natal: 328.0049124, count: 1, passes: [["1879-03-16T18", 328.0047244, 328.0141263]] },
  { who: "charts/marie-curie", id: "uranus-opposition", nth: 0, natal: 102.7285907, count: 1, passes: [["1908-01-03T02", 282.7266188, 282.7291115]] },
  { who: "charts/audrey-hepburn", id: "saturn-return", nth: 0, natal: 270.0425794, count: 1, passes: [["1959-01-05T22", 270.040762, 270.0455786]] },
  { who: "charts/audrey-hepburn", id: "jupiter-return", nth: 0, natal: 50.7516374, count: 1, passes: [["1941-04-16T22", 50.7509795, 50.760412]] },
  { who: "charts/audrey-hepburn", id: "uranus-opposition", nth: 0, natal: 9.3431286, count: 1, passes: [["1970-10-05T06", 189.3405615, 189.3431945]] },
  { who: "charts/oprah-winfrey", id: "saturn-return", nth: 0, natal: 219.0445434, count: 1, passes: [["1983-11-15T07", 219.0407662, 219.0457035]] },
  {
    who: "charts/oprah-winfrey", id: "uranus-opposition", nth: 0, natal: 110.3144619, count: 3,
    passes: [["1993-02-16T12", 290.3124231, 290.3145125], ["1993-07-09T22", 290.3155557, 290.3138799], ["1993-12-09T07", 290.3140146, 290.3161791]],
  },
  {
    who: "charts/oprah-winfrey", id: "pluto-square", nth: 0, natal: 144.1510769, count: 3,
    passes: [["1992-12-18T05", 234.1499795, 234.1514507], ["1993-05-14T14", 234.1511025, 234.1499404], ["1993-10-15T14", 234.150886, 234.1523546]],
  },
  {
    who: "charts/oprah-winfrey", id: "neptune-square", nth: 0, natal: 206.062743, count: 3,
    passes: [["1996-02-06T23", 296.0616468, 296.0631413], ["1996-07-29T23", 296.0636075, 296.062507], ["1996-12-09T18", 296.0626594, 296.0639691]],
  },
  {
    who: "charts/william", id: "saturn-return", nth: 0, natal: 195.5070984, count: 3,
    passes: [["2010-12-12T14", 195.505486, 195.5085563], ["2011-03-13T03", 195.508816, 195.505988], ["2011-09-04T00", 195.5031577, 195.5076557]],
    start: ["2010-11-19T19", 193.5042058, 193.5083786],
    end: ["2011-09-21T16", 197.5032368, 197.508141],
  },
  {
    who: "charts/william", id: "pluto-square", nth: 0, natal: 204.1611519, count: 3,
    passes: [["2020-02-26T04", 294.1602671, 294.1613583], ["2020-06-27T23", 294.1614976, 294.1605475], ["2020-12-31T04", 294.1609148, 294.1622694]],
  },
  {
    who: "charts/william", id: "neptune-square", nth: 0, natal: 265.5435771, count: 3,
    passes: [["2023-03-27T07", 355.5434524, 355.5450132], ["2023-10-17T03", 355.5443914, 355.543408], ["2024-01-23T20", 355.5431331, 355.5442126]],
  },
  {
    who: "sample-people/mira", id: "saturn-return", nth: 0, natal: 303.7280299, count: 1,
    passes: [["2021-01-18T23", 303.7241987, 303.729151]],
    start: ["2020-04-24T08", 301.7273977, 301.7285308],
    end: ["2021-02-04T19", 305.7237582, 305.7286687],
  },
  { who: "sample-people/mira", id: "jupiter-return", nth: 2, natal: 123.9693432, count: 1, passes: [["2026-07-18T11", 123.9656227, 123.974813]] },
  {
    who: "sample-people/mira", id: "uranus-square", nth: 0, natal: 283.2946507, count: 3,
    passes: [["2014-04-16T20", 13.2925949, 13.2949257], ["2014-11-09T08", 13.2957751, 13.2944585], ["2015-02-01T10", 13.293913, 13.2953208]],
  },
];

const MINUTES: Record<Exclude<CycleBody, "north_node">, number> = { jupiter: 60, saturn: 60, uranus: 75, pluto: 75, neptune: 480 };

const HOUR_MS = 3_600_000;
const arc = (deg: number): number => ((((deg + 180) % 360) + 360) % 360) - 180;

/** The minute Horizons's line through an hour reaches `point`, or null if it does not reach it in that hour. */
function crossing([hour, before, after]: Hour, point: number): number | null {
  const a = arc(before - point);
  const b = arc(after - point);
  if (a === b || (a < 0) === (b < 0)) return null;
  return Date.parse(`${hour}:00:00Z`) + (HOUR_MS * a) / (a - b);
}

function lifeOf(who: string) {
  const f = JSON.parse(readFileSync(new URL(`../../../fixtures/${who}.json`, import.meta.url), "utf8"));
  const chart = calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset);
  return { natal: natalLongitudes(chart), birth: new Date(chart.datetimeUtc) };
}

test("five birth dates, one born before 1950 and one with a three-pass Saturn return", () => {
  const births = new Map(PINS.map((pin) => [pin.who, lifeOf(pin.who).birth]));
  assert.equal(births.size, 5);
  assert.ok([...births.values()].some((birth) => birth.getUTCFullYear() < 1950));
  assert.ok(PINS.some((pin) => pin.id === "saturn-return" && pin.count === 3));
});

for (const pin of PINS) {
  test(`${pin.who}: ${pin.id} ${pin.nth + 1}, its ${pin.count} pass${pin.count > 1 ? "es" : ""} against Horizons`, () => {
    const { natal, birth } = lifeOf(pin.who);
    const cycle = lifeCycles(natal, birth, { ids: [pin.id] })[pin.nth];
    const body = cycle.body as keyof typeof MINUTES;
    const bound = MINUTES[body];
    assert.ok(Math.abs(arc(natal[body]! - pin.natal)) * 3600 < 20, `the engine's ${body} at birth within 20″ of Horizons's`);
    assert.equal(cycle.passes, pin.count, "Horizons's own count of passes");
    const point = pin.natal + cycle.angle;
    const near = (engine: Date, horizons: number | null, what: string) => {
      assert.ok(horizons !== null, `Horizons crosses in the pinned hour for ${what}`);
      const minutes = (engine.getTime() - horizons) / 60_000;
      assert.ok(Math.abs(minutes) <= bound, `${what}: ${minutes.toFixed(0)} minutes from Horizons, over ${bound}`);
    };
    pin.passes.forEach((hour, k) => near(cycle.window.exact[k], crossing(hour, point), `pass ${k + 1}`));
    // The window's edges sit an orb either side of the point; the pinned hour says which side Horizons crossed.
    const orb = DOCTRINE.orbs[body];
    const edge = (hour: Hour) => crossing(hour, point - orb) ?? crossing(hour, point + orb);
    if (pin.start) near(cycle.window.start, edge(pin.start), "the window's start");
    if (pin.end) near(cycle.window.end, edge(pin.end), "the window's end");
  });
}
