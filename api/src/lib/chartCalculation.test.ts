/**
 * Ephemeris regression tests. The pinned values were verified independently
 * against Meeus (Astronomical Algorithms) during the September 2026 engine
 * audit, so a change here means the engine drifted, not the test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHART_VERSION, calculateNatalChart, hasHorizon, offsetAtBirth } from "./chartCalculation.js";
import { chartFromFixture } from "./testFixtures.js";

const near = (actual: number, expected: number, tol: number, what: string) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${what}: expected ${expected} ± ${tol}, got ${actual}`);

test("March 2000 equinox: Sun at 0° Aries", () => {
  const c = calculateNatalChart("2000-03-20", "07:35", 0, 0, 0);
  const lon = c.planets.sun.absoluteDegree % 360;
  near(Math.min(lon, 360 - lon), 0, 0.05, "Sun longitude");
});

test("Marie Curie, Warsaw 1867-11-07 12:00 LMT: angles and nodes match Meeus", () => {
  const c = chartFromFixture("marie-curie");
  assert.ok(hasHorizon(c));
  assert.equal(c.angles.ascendant.sign, "Capricorn");
  near(c.angles.ascendant.degree, 12.1, 0.15, "Ascendant degree");
  assert.equal(c.angles.midheaven.sign, "Scorpio");
  near(c.angles.midheaven.degree, 18.6, 0.15, "MC degree");
  assert.equal(c.planets.north_node.sign, "Virgo");
  near(c.planets.north_node.degree, 11.0, 0.15, "North Node degree");
  assert.equal(c.planets.sun.sign, "Scorpio");
  near(c.planets.sun.degree, 14.5, 0.15, "Sun degree");
  assert.equal(c.planets.moon.sign, "Pisces");
  near(c.planets.moon.degree, 16.5, 0.3, "Moon degree");
});

test("Marie Curie: whole-sign houses from Capricorn rising", () => {
  const c = chartFromFixture("marie-curie");
  assert.ok(hasHorizon(c));
  assert.equal(c.houses["1"].sign, "Capricorn");
  assert.equal(c.houses["10"].sign, "Libra");
  assert.equal(c.houses["11"].sign, "Scorpio");
  for (const p of ["sun", "venus", "mars", "saturn"]) {
    assert.equal(c.planets[p].house, 11, `${p} should be in the 11th`);
  }
  assert.equal(c.planets.moon.house, 3);
  assert.equal(c.planets.north_node.house, 9);
});

test("Synthetic day and night fixtures put the Sun where expected", () => {
  const day = chartFromFixture("day-angular");
  const night = chartFromFixture("night-angular");
  assert.ok(hasHorizon(day) && hasHorizon(night));
  assert.equal(day.planets.sun.house, 10);
  assert.equal(night.planets.sun.house, 4);
  assert.ok(day.sunAltitude > 40, `day altitude ${day.sunAltitude}`);
  assert.ok(night.sunAltitude < -40, `night altitude ${night.sunAltitude}`);
});

test("Sun altitude: Marie Curie at noon in November in Warsaw is about 20 degrees up", () => {
  const c = chartFromFixture("marie-curie");
  assert.ok(hasHorizon(c));
  assert.ok(c.sunAltitude > 15 && c.sunAltitude < 25, `altitude ${c.sunAltitude}`);
  assert.equal(c.chartVersion, 3);
  assert.equal(CHART_VERSION, 3);
});

test("Whole-sign houses are latitude-independent: Reykjavik has twelve 30° houses", () => {
  const c = chartFromFixture("high-latitude");
  assert.ok(hasHorizon(c));
  for (let i = 1; i <= 12; i++) assert.equal(c.houses[String(i)].degree, 0);
  const first = c.houses["1"].sign;
  assert.equal(c.angles.ascendant.sign, first);
});

// ---------------------------------------------------------------------------
// The horizon as a status (ADR-33, ADR-34): the band is swept, never guessed.
// ---------------------------------------------------------------------------
const WARSAW = { lat: 52.2297, lon: 21.0122, offset: 1.4 };

test("Marie Curie at 12:00 exact: the horizon is known and Capricorn holds from 11:12 to 12:58", () => {
  const c = calculateNatalChart("1867-11-07", "12:00", WARSAW.lat, WARSAW.lon, WARSAW.offset, 0);
  assert.equal(c.horizon.status, "known");
  assert.equal(c.windowMinutes, 0);
  assert.deepEqual(c.horizon.ascendant, { value: "Capricorn", holds: true, flipsAt: [], values: ["Capricorn"], holdsFrom: "11:12", holdsTo: "12:58" });
  assert.equal(c.horizon.midheaven.value, "Scorpio");
  assert.equal(c.horizon.sect.value, "day");
  assert.ok(c.horizon.moonSign.holds && c.horizon.sunSign.holds);
  assert.ok(hasHorizon(c));
  assert.equal(c.planets.sun.band, undefined);
});

test("around noon, give or take an hour: three rising signs, flips at 11:12 and 12:58, horizon unknown", () => {
  const c = calculateNatalChart("1867-11-07", "12:00", WARSAW.lat, WARSAW.lon, WARSAW.offset, 60);
  assert.deepEqual(c.horizon.ascendant.values, ["Sagittarius", "Capricorn", "Aquarius"]);
  assert.deepEqual(c.horizon.ascendant.flipsAt, ["11:12", "12:58"]);
  assert.equal(c.horizon.ascendant.holds, false);
  assert.equal(c.horizon.status, "unknown");
  assert.ok(!("angles" in c), "a chart whose horizon does not hold carries no angles key");
});

test("the same birth as Afternoon: six rising signs and the five flips", () => {
  const c = calculateNatalChart("1867-11-07", "15:00", WARSAW.lat, WARSAW.lon, WARSAW.offset, 180);
  assert.deepEqual(c.horizon.ascendant.values, ["Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini"]);
  assert.deepEqual(c.horizon.ascendant.flipsAt, ["12:58", "14:06", "14:56", "15:46", "16:54"]);
  assert.equal(c.horizon.status, "unknown");
});

test("a rough time whose rising sign, Midheaven and sect all hold is approximate, and drawn", () => {
  const c = calculateNatalChart("1867-11-07", "12:00", WARSAW.lat, WARSAW.lon, WARSAW.offset, 20);
  assert.equal(c.horizon.status, "approximate");
  assert.ok(c.horizon.ascendant.holds && c.horizon.midheaven.holds && c.horizon.sect.holds);
  assert.ok(hasHorizon(c));
  assert.equal(c.angles.ascendant.sign, "Capricorn");
  assert.ok(c.planets.moon.band, "a banded Moon records its travel");
});

test("a blind chart has no angles, houses, sunAltitude or house fields at all, and the Moon is an arc", () => {
  const c = calculateNatalChart("1867-11-07", "12:00", WARSAW.lat, WARSAW.lon, WARSAW.offset, 720);
  assert.equal(c.horizon.status, "unknown");
  assert.equal(hasHorizon(c), false);
  for (const key of ["angles", "houses", "sunAltitude", "hemisphereEmphasis"]) assert.ok(!(key in c), `${key} must be absent, not zero`);
  for (const [name, p] of Object.entries(c.planets)) assert.ok(!("house" in p), `${name} carries a house`);
  assert.equal(c.planets.moon.sign, "Pisces");
  near(c.planets.moon.band!.fromDegree, 340.2, 0.15, "Moon at 00:00");
  near(c.planets.moon.band!.toDegree, 352.85, 0.15, "Moon at 23:59");
  assert.equal(c.horizon.sect.holds, false);
  assert.deepEqual(c.horizon.sect.values, ["night", "day", "night"]);
  assert.equal(c.planets.sun.degree, calculateNatalChart("1867-11-07", "12:00", WARSAW.lat, WARSAW.lon, WARSAW.offset).planets.sun.degree);
  assert.ok(c.aspects.length > 0);
});

test("a blind chart's stored shape survives JSON: no undefined keys reappear as null", () => {
  const c = JSON.parse(JSON.stringify(calculateNatalChart("1867-11-07", "12:00", WARSAW.lat, WARSAW.lon, WARSAW.offset, 720)));
  assert.ok(!("angles" in c) && !("houses" in c) && !("sunAltitude" in c));
});

// MB-48: the offset is the one in force at the birth instant, not today's.
test("offsetAtBirth: a summer birth entered in winter keeps the summer offset, and 1867 Warsaw is +1:24", () => {
  assert.equal(offsetAtBirth("Europe/Paris", "1990-07-01", "12:00"), 2);
  assert.equal(offsetAtBirth("Europe/Paris", "1990-01-15", "12:00"), 1);
  near(offsetAtBirth("Europe/Warsaw", "1867-11-07", "12:00"), 1.4, 1 / 60, "Warsaw LMT");
  assert.equal(offsetAtBirth("America/New_York", "1954-01-29", "04:30"), -5);
  const zoned = calculateNatalChart("1867-11-07", "12:00", WARSAW.lat, WARSAW.lon, "Europe/Warsaw", 0);
  const numeric = calculateNatalChart("1867-11-07", "12:00", WARSAW.lat, WARSAW.lon, 1.4, 0);
  assert.equal(zoned.timezone, "Europe/Warsaw");
  near(zoned.timezoneOffset, 1.4, 1 / 60, "derived offset");
  assert.ok(hasHorizon(zoned) && hasHorizon(numeric));
  near(zoned.angles.ascendant.absoluteDegree, numeric.angles.ascendant.absoluteDegree, 0.01, "same sky either way");
});
